text
# 📘 Documentación — Optimización de Performance Facilito (Sesión 2)

**Fecha:** 11/10/2026
**Contexto:** Segunda sesión de optimización de performance. Continuación de la sesión del mismo día que cerró Fases A–E + Pasos 1–3 + Tanda A.

---

## 🎯 Objetivo de la sesión

1. Cerrar el Paso 4 (imágenes) sin romper nada
2. Corregir bug de `pagoMovilList` que tumbaba Settings
3. Liberar disco (estaba al 95%, riesgo de caída)
4. Verificar que nginx cachea bien los uploads
5. Documentar todo para que la próxima sesión arranque donde terminamos

---

## ✅ Lo que se completó

### Bug 1 — `pagoMovilList is not defined` (CRÍTICO)

**Síntoma:**
Uncaught ReferenceError: pagoMovilList is not defined
at 4312.d2a782572e881ede.js

text

**Causa:** en `MultiplePagoMovil.tsx`, la prop estaba comentada en el destructuring pero se usaba en el cuerpo.

**Solución:** descomentar la prop `pagoMovilList` en el destructuring.

**Archivo modificado:**
- `app/admin/[slug]/components/settings/subcomponents/MultiplePagoMovil.tsx`

---

### Bug 2 — `<Image>` de Next rompía imágenes de `/uploads/` (CRÍTICO)

**Síntoma:**
GET https://172.16.16.16/_next/image?url=%2Fuploads%2F... 400 (Bad Request)

text

**Causa:** `<Image>` de Next no puede procesar URLs relativas (`/uploads/...`) sin `remotePatterns` o `unoptimized`.

**Solución:** reversión selectiva. Solo se revirtieron los archivos donde las imágenes NO se veían.

**Archivos revertidos a `<img>` (5):**
- `components/AvailableServiceSection.tsx`
- `app/tienda/[slug]/components/ServiceCatalog.tsx`
- `components/FavoritesDropdown.tsx`
- `components/GlobalSearch.tsx`
- `app/tienda/[slug]/components/RelatedStoresSection.tsx`

**Archivos que se dejaron con `<Image>` (funcionan bien):**
- `ServiceDetailModal.tsx`, `ProductDetailModal.tsx`, `FavoritesModal.tsx`
- `ProductCatalog.tsx`, `StoreFeaturedProducts.tsx`, `StoreHero.tsx`
- `PromoBanner.tsx`, `CartPaymentStep.tsx`, `CartItemsList.tsx`
- `OrderSuccessModal.tsx`, `AppointmentCheckout.tsx`
- `cards/ProductCard.tsx`, `cards/ServiceCard.tsx`, `StoreFooter.tsx`

**Excepción:** `TwoFactorSetup.tsx` (QR data URL, no aplica).

---

### Bug 3 — Disco al 95% (CRÍTICO)

**Síntoma:**
/dev/sda1 19G 17G 1011M 95% /

text

**Solución aplicada:**

| Acción | Comando | Liberado |
|---|---|---|
| VS Code Server viejo | `ls -t /root/.vscode-server/cli/servers/ \| tail -n +2 \| xargs -I {} rm -rf "{}"` | 4.7 GB |
| Cache de npm | `rm -rf /root/.npm/*` | 1.7 GB |
| Cache general | `rm -rf /root/.cache/*` | 311 MB |
| apt autoremove + clean | `apt autoremove -y && apt clean` | 110 MB |
| Journal systemd (7d) | `journalctl --vacuum-time=7d` | 725 MB |
| Logs facilito + nginx | `truncate -s 0 /var/log/facilito-*.log /var/log/nginx/*.log` | ~50 MB |
| SQLs viejos en backups | `ls -t *.sql \| tail -n +3 \| xargs rm` | ~2 MB |
| Backups en /root | `rm /root/backup_facilito_db_*.sql` | ~1 MB |

**Resultado:**
/dev/sda1 19G 9.0G 8.7G 52% /

text
**Liberado: 8 GB. Uso: 95% → 52%.**

---

### ✅ Verificado — Cache-Control de nginx

```bash
grep -n "uploads\|expires\|Cache-Control" /etc/nginx/sites-available/facilito
Output:

text
48:    location /uploads/ {
49:        alias /opt/facilito/apps/backend/public/uploads/;
50:        expires 1y;
51:        add_header Cache-Control "public, max-age=31536000, immutable" always;
52:    }
✅ nginx ya tiene el cache-control ideal. No tocar.

📋 Estado final del roadmap completo
Fase	Estado
Fase A — TenantsContext	✅
Fase B — useNearby con cache	✅
Fase C — services/public/all payload	✅
Fase D — Eliminado backdrop-blur masivo	✅
Fase E — Fixes sintaxis/tipos	✅
Paso 1 — ProductCatalog isHovered	✅
Paso 2 — StoreFeaturedProducts tipos	✅
Paso 3 (3.1–3.8)	✅
Tanda A (A.1–A.7)	✅
Bug 1 — pagoMovilList	✅
Bug 2 — Image en URLs relativas	✅
Bug 3 — Disco 95% → 52%	✅
Paso 4.1 — nginx cache-control	✅
Paso 4.2 — Migración img selectiva	✅
🚨 Reglas de oro (nuevas)
Sobre next/image
<Image> de Next solo funciona con URLs absolutas (https://...) o archivos en public/.

URLs relativas (/uploads/...) rompen <Image> con error 400.

Si la imagen se ve → no tocar. Si no se ve → revertir a <img>.

No migrar todo por migrar. Evaluar caso por caso.

Sobre el bug de runtime
ignoreBuildErrors: true no salva errores de runtime.

Siempre hacer grep -rn "variable" antes de comentar/descomentar props.

Probar en el navegador después de cada cambio.

Sobre el disco
Monitorear df -h / regularmente. Si pasa 80%, limpiar.

VS Code Server acumula versiones viejas. Limpiar cada 2-3 meses.

journalctl --vacuum-time=7d es seguro y libera GB.

Nunca docker volume prune (puede borrar Postgres).

Backup antes de tocar, pero con espacio libre.

Sobre nginx
Ya tiene expires 1y + immutable en /uploads/. No tocar.

Los uploads pesados no afectan performance después de la primera visita.

🛠️ Próximos pasos
Paso 5 (pendiente) — Tanda B: modales/carrito
Limpiar transition-all y backdrop-blur residuales en modales y carrito. Bajo impacto, solo consistencia.

Archivos candidatos: CartSidebar/*, FavoritesModal.tsx, PromoPopup.tsx, StoreChatModal.tsx, AppointmentSidebar.tsx.

Paso 6 (opcional) — Medir performance real
javascript
const resources = performance.getEntriesByType('resource');
const apiOnly = resources
  .filter(r => r.name && r.name.includes('/api/'))
  .map(r => ({
    endpoint: r.name.split('/api/')[1]?.split('?')[0] || r.name,
    size: Math.round((r.transferSize || 0) / 1024) + 'KB',
    ms: Math.round(r.duration),
  }))
  .sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
console.table(apiOnly);
const totalKB = apiOnly.reduce((s, r) => s + parseFloat(r.size), 0);
console.log('📈 TOTAL API:', apiOnly.length, 'requests,', Math.round(totalKB), 'KB');
Paso 7 (opcional) — Limpieza final de disco
bash
cd /opt/facilito/backups/
md5sum uploads-20261009*.tar.gz  # si los 3 son iguales → borrar 2
docker system prune -f
pnpm store prune
📊 Mediciones de referencia
Home
Endpoint	Antes	Después
tenants ×2	18 KB	9 KB (1)
services/public/all	115 KB	2 KB
products/public/all	20 KB (2 req)	8 KB (1 req)
geo/nearby/*	4-6 × 50 KB	0
TOTAL	1170 KB / 81 req	19 KB / 16 req
Disco
Métrica	Antes	Después
Usado	17 GB	9.0 GB
Libre	1 GB	8.7 GB
Uso	95%	52%
🎓 Cómo arrancar el próximo chat
text
Estoy siguiendo la documentación de optimización de performance de Facilito
(sesión del 11/10/2026, sesión 2). Ya cerré Fases A-E, Pasos 1-4, Tanda A,
y los 3 bugs críticos. Ahora quiero avanzar con:
[OPCIÓN 1] Tanda B
[OPCIÓN 2] Medir performance
[OPCIÓN 3] Limpieza final de disco
[OPCIÓN 4] Otra cosa: ___
⚠️ Notas importantes
typescript: { ignoreBuildErrors: true } está activo.

NO usar Turbopack (package.json tiene --webpack).

NO tocar la DB.

NO tocar sin razón: nginx, next.config.ts, .env.local, package.json, systemd, backend/.env.

Siempre rebuild.sh + Ctrl+Shift+R.

Si tocás backend → rebuild-backend.sh.

Antes de pg_dump → verificar df -h / con al menos 2 GB libres.

VS Code Server acumula versiones viejas.

Los uploads pesados no afectan performance.

<Image> de Next solo sirve con URLs absolutas.

Fin de la documentación de la Sesión 2.
