# Sistema de Disputas PRO — Facilito

**Versión:** 1.0
**Fecha:** 13/10/2026
**Stack:** Next.js 16 + NestJS + PostgreSQL + nginx + Docker
**Estado:** Producción, probado end-to-end

---

## 1. Resumen ejecutivo

Sistema completo de gestión de reclamos de encomiendas (shipping), con:
- Auto-resolución por reglas (Opción A: sin super-admin, sin intervención humana).
- Notificaciones in-app en cada transición.
- Auditoría completa en `auth_events`.
- Reembolsos automáticos a `user_credits`.
- Coherencia de estado: no se puede completar una orden con envío pendiente.
- Timeline visible para comprador y vendedor.
- Cron job de auto-progresión (cada hora).

**Alcance:** solo `fulfillment='shipping'` (productos con encomienda).
**No aplica a:** `bookings` (servicios), `delivery` (local), `pickup` (retiro).

---

## 2. Modelo de datos

### Tabla `shipping_disputes`

```sql
CREATE TABLE shipping_disputes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  reason varchar(50) NOT NULL,
  buyer_message text,
  evidence_urls jsonb DEFAULT '[]'::jsonb,

  status varchar(30) NOT NULL DEFAULT 'open',

  seller_response text,
  seller_responded_at timestamptz,
  resolution_type varchar(30),
  resolution_amount_usd numeric(10,2),
  resolution_notes text,

  escalated_at timestamptz,
  escalated_reason text,

  auto_resolved_at timestamptz,
  auto_resolved_by varchar(30),

  resolved_at timestamptz,
  resolution_accepted_at timestamptz,
  resolution_accepted_by_buyer boolean,

  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipping_disputes_order  ON shipping_disputes(order_id);
CREATE INDEX idx_shipping_disputes_status ON shipping_disputes(status);
CREATE INDEX idx_shipping_disputes_tenant ON shipping_disputes(tenant_id);
CREATE INDEX idx_shipping_disputes_buyer  ON shipping_disputes(buyer_id);

CREATE UNIQUE INDEX uq_open_dispute_per_order
  ON shipping_disputes(order_id)
  WHERE status NOT IN (
    'resolved_buyer','resolved_seller',
    'auto_resolved_buyer','auto_resolved_seller','closed'
  );
```

### Máquina de estados

```
[open] buyer reporta
  ↓ (5 días hábiles si seller no responde → escalated)
[seller_responded] seller responde
  ├─→ [resolved_buyer] buyer acepta oferta
  ├─→ [resolved_seller] seller presenta proof_of_delivery válida
  └─→ [escalated] buyer rechaza / auto-escalado por timeout
        ↓ (5 días hábiles si seller no resuelve)
      [auto_resolved_buyer] + refund automático vía creditUser
```

### Razones válidas
- `not_received` — No recibió el pedido
- `wrong_item` — Producto equivocado
- `damaged` — Producto dañado
- `late` — Llegó tarde

### Tipos de resolución
- `refund` — Reembolso (requiere `amountUsd`)
- `replacement` — Reemplazo
- `proof_of_delivery` — Prueba de entrega (cierra a favor del seller)

### Plazos (días hábiles, sin feriados VE)
- Reporte habilitado: `selectedAt + MAX(estimatedDays) + 3 días hábiles`
- Vendedor responde: **5 días hábiles** o auto-escalado
- Vendedor en escalado: **5 días hábiles** para resolver o auto-refund
- Comprador acepta/rechaza: **3 días hábiles** o aceptación automática

---

## 3. Backend

### Estructura de módulos

```
apps/backend/src/modules/shipping-disputes/
├── entities/shipping-dispute.entity.ts
├── dto/
│   ├── create-dispute.dto.ts
│   ├── respond-dispute.dto.ts
│   ├── escalate-dispute.dto.ts
│   ├── resolve-dispute.dto.ts
│   └── accept-resolution.dto.ts
├── shipping-disputes.controller.ts
├── shipping-disputes.service.ts
├── shipping-disputes.scheduler.ts
└── shipping-disputes.module.ts
```

### Helpers

```
apps/backend/src/common/utils/business-days.util.ts
  - isBusinessDay(date): boolean
  - addBusinessDays(date, n): Date          (soporta n negativo)
  - businessDaysBetween(a, b): number
  - VE_HOLIDAYS: feriados 2025-2026 hardcodeados
```

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/shipping-disputes` | Autenticado | Buyer abre disputa |
| GET | `/shipping-disputes/my-cases` | Autenticado | Buyer lista sus casos |
| GET | `/shipping-disputes/tenant/:tenantId` | Autenticado + ownership | Admin/seller lista casos del tenant |
| GET | `/shipping-disputes/can-report/:orderId` | Autenticado | ¿Puede reportar? |
| GET | `/shipping-disputes/order/:orderId` | Autenticado | Disputa de una orden |
| GET | `/shipping-disputes/:id` | Autenticado | Detalle |
| PATCH | `/shipping-disputes/:id/respond` | Autenticado + ownership | Seller responde |
| PATCH | `/shipping-disputes/:id/escalate` | Autenticado + ownership | Buyer escala |
| PATCH | `/shipping-disputes/:id/resolve` | Autenticado + ownership | Seller resuelve |
| PATCH | `/shipping-disputes/:id/accept` | Autenticado + ownership | Buyer acepta/rechaza |
| POST | `/shipping-disputes/admin/trigger-cron` | `@Roles('admin','seller','owner')` | Fuerza cron (testing) |

**Ownership:** el service valida `assertOwnership(tenantId, user)` — permitido si:
- `user.role ∈ ['admin', 'seller', 'owner']` (del JWT)
- O `user.tenantId === tenantId` (del JWT)

### Scheduler (cron cada hora)

`@Cron(CronExpression.EVERY_HOUR, { name: 'autoProgressDisputes' })`

**3 reglas:**

1. **Auto-escalado:** `open` con `created_at > 5 días hábiles` → `escalated`.
   - Notifica al seller.
   - Audita `dispute_escalated` (con `autoEscalated: true`).

2. **Auto-refund:** `escalated` con `escalated_at > 5 días hábiles` → `auto_resolved_buyer`.
   - Refund vía `accountService.creditUser(buyerId, tenantId, order.totalAmount)`.
   - Marca `auto_resolved_at`, `auto_resolved_by='system_seller_timeout'`.
   - Notifica a buyer y seller.
   - Audita `dispute_auto_resolved` con `{amountUsd, reason: 'seller_timeout'}`.

3. **Auto-aceptación:** `seller_responded` con `refund`/`replacement` y `seller_responded_at > 3 días hábiles` sin respuesta del buyer → `auto_resolved_buyer`.
   - Si es refund, acredita el saldo.
   - Marca `auto_resolved_by='system_buyer_no_accept'`.
   - Audita `dispute_auto_resolved` con `{amountUsd, reason: 'buyer_no_accept'}`.

**Idempotencia:** cada regla chequea `autoResolvedAt` y `resolvedAt` antes de actuar. Si corre dos veces, la segunda no encuentra disputas elegibles.

### Notificaciones (5 eventos)

Método `NotificationsService.createShippingDisputeNotification(dispute, event, target)`.

| Evento | Target | Título | Mensaje |
|---|---|---|---|
| `opened` | seller | Nuevo reclamo de envío | El comprador reportó un problema: {reason}. |
| `seller_responded` | buyer | El vendedor respondió tu reclamo | El vendedor envió una respuesta a tu reclamo. Revisá los detalles. |
| `escalated` | seller | Reclamo escalado | El comprador escaló el reclamo: {reason}. Tenés 5 días hábiles para resolverlo. |
| `resolved` | buyer | Reclamo resuelto | (varía según resolutionType) |
| `auto_resolved` | both | Reclamo resuelto automáticamente | El vendedor no respondió a tiempo. Se procesó el reembolso automático. |

Tipos (`type`) en DB:
- `shipping_dispute_opened_seller`
- `shipping_dispute_seller_responded_buyer`
- `shipping_dispute_escalated_seller`
- `shipping_dispute_resolved_buyer`
- `shipping_dispute_auto_resolved_buyer` / `_seller`

### Auditoría (`auth_events`)

EventTypes nuevos en `AuthEventType`:

- `dispute_opened`
- `dispute_responded`
- `dispute_escalated`
- `dispute_resolved`
- `dispute_auto_resolved`
- `order_completed_with_pending_shipping`

Cada evento incluye `metadata` con `{disputeId, orderId, tenantId, reason?}`.

### Coherencia de estado (Feature 4.d)

En `orders.service.ts::updateStatus(id, status, options?)`:

- Si `newStatus === 'COMPLETED'` y la orden tiene `fulfillment='shipping'` y `delivery.status !== 'delivered'`:
  - **Bloquea** con 400 si no viene `{force: true}`.
  - **Permite + audita** `order_completed_with_pending_shipping` si viene `{force: true}`.

Controller actualizado:
```typescript
@Patch(':id/status')
updateStatus(
  @Param('id') id: string,
  @Body() body: { status: string; force?: boolean },
  @Req() req: any,
) { ... }
```

---

## 4. Frontend

### Admin

**`ShippingDetailModal.tsx`:**
- Inputs editables: `trackingNumber`, `trackingUrl`.
- Botón "Guardar tracking" con loading + toast.
- Sincronización automática al abrir el modal.
- Usa `${API_BASE}/orders/:id/delivery` con `fetch`.

**`useShippingActions.ts`:**
- Método nuevo `updateDeliveryTracking(orderId, trackingNumber, trackingUrl)`.

**`ShippingAndDeliveryTab.tsx`:**
- 3 segmentos: `Encomiendas` | `Repartidores` | `Reclamos`.
- Persistido en localStorage (`admin_shipping_delivery_segment`).
- Render condicional + modal de detalle.

**`shipping/disputes/SellerDisputesTab.tsx`:**
- Lista de disputas del tenant (fetch `GET /shipping-disputes/tenant/:tenantId`).
- Resumen de abiertos + escalados.
- Empty state con `EmptyState`.

**`shipping/disputes/SellerDisputeDetailModal.tsx`:**
- Modo `view` / `respond` / `resolve`.
- Timeline inline (created → responded → escalated → resolved).
- Acciones: "Responder" (si `open`), "Resolver" (si `seller_responded` o `escalated`).
- Tipos de resolución: `proof_of_delivery`, `refund` (con monto), `replacement`.

### Buyer (Mi Cuenta)

**`mi-cuenta/components/shipping/BuyerShippingDetailModal.tsx`:**
- Link externo si hay `trackingUrl`.
- Botón "Reportar problema" si `canReport.canReport === true`.
- Hint con `canReport.reason` si no puede reportar.
- Integración con `ReportDisputeModal` vía `onReportIssue`.

**`mi-cuenta/components/disputes/ReportDisputeModal.tsx`:**
- Selector de motivo (4 opciones).
- Textarea (10-2000 chars).
- Aviso de plazos.
- POST `/shipping-disputes`.
- Manejo de errores con toast.

**`mi-cuenta/components/disputes/BuyerDisputesTab.tsx`:**
- Contenedor `p-6 rounded-3xl border shadow-xl` + header "Mis Reclamos".
- Fetch `GET /shipping-disputes/my-cases`.
- Empty state con `EmptyState`.
- Cards clickeables → abre el modal de detalle.

**`mi-cuenta/components/disputes/BuyerDisputeDetailModal.tsx`:**
- Timeline inline.
- Acciones condicionales: aceptar/rechazar oferta, escalar.
- Botones POST a `/accept` y `/escalate`.

**`mi-cuenta/page.tsx`:**
- Tab `'reclamos'` en `VALID_MI_CUENTA_TABS`.
- Estado `selectedDispute`.
- Render de `BuyerDisputesTab` + `BuyerDisputeDetailModal`.

**`mi-cuenta/AccountSidebar.tsx`:**
- Item "Mis reclamos" con icono `AlertTriangle`, entre "Envíos" y "Citas".

**`mi-cuenta/AccountHeader.tsx`:**
- Entrada `reclamos` en `tabConfig` con título "Mis Reclamos" + subtítulo.

### Otros

**`mi-cuenta/components/security/SessionsList.tsx`:** **NO se tocó.** Se usa en Admin (Settings → Seguridad) y en Mi Cuenta (tab Seguridad). La estética de la tab Seguridad de Mi Cuenta se resuelve con un wrapper `p-6 rounded-3xl` en `page.tsx`, sin tocar el componente compartido.

---

## 5. Bugs encontrados y arreglados

### Bug 1 — `JwtStrategy` no exponía `tenantId` ni el `role` del JWT

**Síntoma:** `RolesGuard` y `assertOwnership` daban 403 aunque el JWT tuviera los datos correctos.

**Causa:** `validate()` devolvía la entity de `User` (que NO tiene `tenantId`), ignorando el payload del JWT.

**Fix:** en `jwt.strategy.ts`:
```typescript
return {
  ...user,
  role: payload.role || user.role,
  activeRole: payload.activeRole || payload.role || user.role,
  tenantId: payload.tenantId || (user as any).tenantId || null,
  tenantSlug: payload.tenantSlug || (user as any).tenantSlug || null,
};
```

**Impacto del fix:** arregló 3 bugs en distintos lugares (shipping-disputes, delivery-drivers, cualquier endpoint que use `req.user.tenantId`).

### Bug 2 — Entity `ShippingDisputeEntity` con `?: string` en columnas nullable

**Síntoma:** `DataTypeNotSupportedError: Data type "Object" in "ShippingDisputeEntity.buyerId"`.

**Causa:** TypeORM no puede inferir el tipo de columna si el campo es `?: string | null` (union con `null`). Infiere `Object`.

**Fix:** en la entity:
```typescript
@Column({ name: 'buyer_id', type: 'uuid', nullable: true })
buyerId: string | null;   // sin `?`, con `type: 'uuid'`
```

**Regla aprendida:** para columnas nullable en TypeORM + Postgres, declarar `type` explícito y usar `T | null` sin `?`.

### Bug 3 — El `role` en la DB no coincide con el `role` del JWT

**Síntoma:** el user aparece como `buyer` en la DB pero su JWT dice `seller` (porque tiene tienda).

**Impacto:** `@Roles('buyer')` rechazaba al user. `isBuyer(user)` en el frontend fallaba.

**Fix parcial:** se removieron los `@Roles('buyer')` de los 5 endpoints de shipping-disputes. El ownership real ya está validado en el service.

**Deuda técnica:** el diseño de "buyer con tienda se promueve a seller en el JWT" sigue causando fricción en otros lugares del proyecto. Pendiente de un pase de hardening global.

---

## 6. Testing end-to-end ejecutado

### Flujo completo probado ✅

```
[1] Buyer (nanafarrera1@gmail.com) → POST /shipping-disputes
    status: open
    ✅ Notifica al seller.
    ✅ Audita dispute_opened.

[2] Seller (abastosol@gmail.com) → PATCH /:id/respond
    status: seller_responded
    ✅ Notifica al buyer.
    ✅ Audita dispute_responded.

[3] Buyer → PATCH /:id/accept {accepted: false}
    status: escalated
    ✅ Notifica al seller.
    ✅ Audita dispute_resolved (accepted: false).

[4] Cron (forzado) → auto_resolve
    status: auto_resolved_buyer
    resolution_type: refund
    resolution_amount_usd: 11.55
    ✅ creditUser → user_credits.balance = 11.55
    ✅ Notifica a buyer + seller.
    ✅ Audita dispute_auto_resolved (reason: seller_timeout).
```

### Flujo de coherencia de estado probado ✅

```
[1] PATCH /orders/:id/status {status: 'COMPLETED'} sin force
    → 400 "No se puede completar la orden: el envío sigue en tránsito o pendiente..."

[2] PATCH /orders/:id/status {status: 'COMPLETED', force: true}
    → 200, status='COMPLETED'
    ✅ Audita order_completed_with_pending_shipping.
```

---

## 7. Deuda técnica anotada

### Alta prioridad

1. **`@Roles('buyer')` en 5 endpoints de shipping-disputes** — bloquea a users con tienda (JWT `seller`). Fix propuesto: quitar el `@Roles`, delegar a ownership.
2. **El patrón "buyer con tienda → JWT seller"** afecta a múltiples partes del proyecto. Requiere auditoría global.

### Media prioridad

3. **`acceptResolution` audita `dispute_resolved` aunque el caso pase a `escalated`** — semánticamente raro. Considerar `dispute_escalated` cuando `accepted=false`.
4. **`trigger-cron` sin rate limit** — protegido por rol, pero podría abusarse.
5. **Notificaciones sin agrupación** — múltiples eventos al mismo user saturan la bandeja.

### Baja prioridad

6. **Feriados VE hardcodeados 2025-2026** — agregar 2027+ cuando corresponda.
7. **No hay exportación de reclamos** — feature para futuro.
8. **No hay adjuntar evidencia** (upload) en el reporte del buyer — `evidence_urls` existe en el schema pero no se usa.

---

## 8. Reglas de oro (aplicadas)

- ✅ Cero emojis en UI.
- ✅ SVG heredados (lucide-react).
- ✅ Colores heredados del tenant (`primary`, `secondary`, `textColor`, `isDarkBg`).
- ✅ `apiFetch` en el frontend autenticado.
- ✅ `performLogout` para logout.
- ✅ Errores de auth → 401/403.
- ✅ Auditoría de acciones sensibles en `auth_events`.
- ✅ Sin archivos huérfanos.
- ✅ Reutilización de componentes existentes (`EmptyState`, `Button`, `ConfirmDialog`, `useToast`).
- ✅ No se tocó `bookings` (dominio de servicios).
- ✅ No se tocó `nginx`, `next.config.ts`, `.env.local`, `package.json`, systemd.

---

## 9. Comandos útiles

### Rebuild

```bash
# Backend
/opt/facilito/rebuild-backend.sh

# Frontend
/opt/facilito/rebuild.sh
```

### DB

```bash
# Conectar a Postgres
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db
```

### Ver disputas

```bash
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c "
SELECT id, order_id, status, reason, created_at, escalated_at, auto_resolved_at
FROM shipping_disputes ORDER BY created_at DESC LIMIT 10;"
```

### Forzar cron (testing)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "urbanstyle@gmail.com", "password": "123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:3000/shipping-disputes/admin/trigger-cron \
  -H "Authorization: Bearer $TOKEN"
```

### Ver eventos de auditoría

```bash
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c "
SELECT \"eventType\", metadata, \"createdAt\"
FROM auth_events
WHERE \"eventType\" LIKE 'dispute_%' OR \"eventType\" LIKE 'order_completed%'
ORDER BY \"createdAt\" DESC LIMIT 20;"
```

### Ver notificaciones de disputas

```bash
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c "
SELECT userid, type, title, message, createdat
FROM notifications
WHERE type LIKE 'shipping_dispute_%'
ORDER BY createdat DESC LIMIT 20;"
```

---

## 10. Archivos clave

### Backend (nuevos)

- `apps/backend/src/modules/shipping-disputes/entities/shipping-dispute.entity.ts`
- `apps/backend/src/modules/shipping-disputes/dto/*.ts` (5 DTOs)
- `apps/backend/src/modules/shipping-disputes/shipping-disputes.controller.ts`
- `apps/backend/src/modules/shipping-disputes/shipping-disputes.service.ts`
- `apps/backend/src/modules/shipping-disputes/shipping-disputes.scheduler.ts`
- `apps/backend/src/modules/shipping-disputes/shipping-disputes.module.ts`
- `apps/backend/src/common/utils/business-days.util.ts`

### Backend (modificados)

- `apps/backend/src/app.module.ts` — registro del módulo.
- `apps/backend/src/modules/auth/entities/auth-event.entity.ts` — 6 eventTypes nuevos.
- `apps/backend/src/modules/notifications/notifications.service.ts` — `createShippingDisputeNotification`.
- `apps/backend/src/modules/orders/orders.service.ts` — `updateStatus` con coherencia.
- `apps/backend/src/modules/orders/orders.controller.ts` — `force` en body.
- `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` — fix de `tenantId` + `role`.

### Frontend admin (nuevos)

- `apps/frontend/app/admin/[slug]/components/shipping/disputes/SellerDisputesTab.tsx`
- `apps/frontend/app/admin/[slug]/components/shipping/disputes/SellerDisputeDetailModal.tsx`

### Frontend admin (modificados)

- `apps/frontend/app/admin/[slug]/components/shipping/ShippingDetailModal.tsx`
- `apps/frontend/app/admin/[slug]/components/shipping/hooks/useShippingActions.ts`
- `apps/frontend/app/admin/[slug]/components/shipping/ShippingAndDeliveryTab.tsx`

### Frontend buyer (nuevos)

- `apps/frontend/app/mi-cuenta/components/disputes/ReportDisputeModal.tsx`
- `apps/frontend/app/mi-cuenta/components/disputes/BuyerDisputesTab.tsx`
- `apps/frontend/app/mi-cuenta/components/disputes/BuyerDisputeDetailModal.tsx`

### Frontend buyer (modificados)

- `apps/frontend/app/mi-cuenta/components/shipping/BuyerShippingDetailModal.tsx`
- `apps/frontend/app/mi-cuenta/components/shipping/BuyerShippingTab.tsx`
- `apps/frontend/app/mi-cuenta/page.tsx`
- `apps/frontend/app/mi-cuenta/AccountSidebar.tsx`
- `apps/frontend/app/mi-cuenta/AccountHeader.tsx`

---

## 11. Cómo extender

### Agregar un nuevo motivo de disputa

1. Agregar al array `DISPUTE_REASONS` en `create-dispute.dto.ts`.
2. Agregar label en `REASON_LABELS` del frontend (todos los modales).
3. Agregar label en `createShippingDisputeNotification` (service de notificaciones).

### Agregar un nuevo estado

1. Agregar al flujo en `shipping-disputes.service.ts`.
2. Agregar al `STATUS_LABELS` en todos los modales frontend.
3. Agregar al array `activeStatuses` en `create` si debe bloquear la creación de una nueva disputa.

### Modificar plazos

1. Editar los días en `shipping-disputes.scheduler.ts` (`addBusinessDays(now, -5)`).
2. Editar el `assertCanReport` en `shipping-disputes.service.ts` (grace de 3 días).

### Agregar feriados

1. Editar `VE_HOLIDAYS` en `business-days.util.ts`.
2. Formato `YYYY-MM-DD`.

---

## 12. Contacto / referencias

- Manual Facilito v1.5 (comandos, rutas, scripts).
- Auth System Facilito (auth, tokens, 2FA).
- Este documento (`DISPUTES-PRO.md`).

---

**Fin del documento.**
