# Auth System Facilito

Documentación viva del sistema de autenticación.
Última actualización: 8 de octubre de 2026.

---

## 📌 Reglas de oro

1. **NUNCA** devolver `password`, `totpSecret`, `failedLoginAttempts`, `lockedUntil`, `emailVerifiedAt`, `lastLoginAt`, `lastLoginIp` al frontend. Usar `toPublicUser()`.
2. **NUNCA** decodificar JWT con `jwt.decode()` en un controller. Usar `req.user` (ya validado por `AuthGuard`/`JwtStrategy`).
3. **TODO** logout debe llamar a `performLogout()` de `lib/auth/logout.ts`. **NO** usar `localStorage.clear()`.
4. **TODO** request autenticado del frontend debe usar `apiFetch()` de `lib/api.ts`. **NO** usar `fetch` directo (excepto endpoints públicos explícitamente).
5. **TODO** error de auth debe ser **401**, no 400 ni 500. Los 401 activan el refresh automático.
6. **NUNCA** loguear tokens, passwords, ni secrets. Ni en `console.log` ni en `auth_events.metadata`.
7. **TODO** cambio de password/reset/2FA-disable debe **revocar todos los refresh tokens** del user.
8. **NUNCA** rotar `JWT_SECRET` sin doble validación (`_NEW` + `_OLD`) y ventana de 15 min.
9. **TODO** nuevo endpoint autenticado debe estar en `app.module.ts` en `AuthMiddleware.forRoutes` **o** tener `@UseGuards(AuthGuard('jwt'))`.
10. **TODA** acción sensible (login, reset, 2FA, cambio de rol) debe quedar registrada en `auth_events`.

---

## 🏗️ Arquitectura general

```
┌──────────────┐
│   Frontend   │
│  (Next.js)   │
└──────┬───────┘
       │ 1. POST /api/auth/login { email, password }
       │ 2. Guarda access_token + refresh_token en localStorage
       ▼
┌──────────────────────────────────────────┐
│   nginx (172.16.16.16:443)               │
│   - reescribe /api/ → /                  │
│   - proxy a backend (127.0.0.1:3000)     │
└──────┬───────────────────────────────────┘
       │ 3. Backend recibe /api/auth/login
       ▼
┌──────────────────────────────────────────┐
│   Backend (NestJS, puerto 3000)          │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  AuthService.login()           │     │
│   │   - throttle por cuenta        │     │
│   │   - check lock                 │     │
│   │   - bcrypt.compare             │     │
│   │   - si 2FA: requiresTwoFactor  │     │
│   │   - issue access + refresh     │     │
│   └────────────────────────────────┘     │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  TokenService                  │     │
│   │   - signAccess (15m)           │     │
│   │   - signRefresh (30d)          │     │
│   │   - signReset (15m)            │     │
│   │   - signVerify (24h)           │     │
│   └────────────────────────────────┘     │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  RefreshTokenService           │     │
│   │   - issue (SHA-256 hash)       │     │
│   │   - validate (detecta reuso)   │     │
│   │   - revoke / revokeAll         │     │
│   └────────────────────────────────┘     │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  AuditService                  │     │
│   │   - log(userId, eventType)     │     │
│   └────────────────────────────────┘     │
└──────┬───────────────────────────────────┘
       │ 4. Guarda refresh_token hasheado en DB
       ▼
┌──────────────────────────────────────────┐
│   PostgreSQL (facilito_db)               │
│   - users                                │
│   - refresh_tokens                       │
│   - auth_events                          │
│   - password_resets                      │
│   - email_verifications                  │
│   - backup_codes                         │
└──────────────────────────────────────────┘
```

### Rotación de tokens (diagrama)

```
LOGIN
  ├─ access_token (15 min, JWT_ACCESS_EXPIRES)
  └─ refresh_token (30 días, JWT_REFRESH_EXPIRES)
      └─ guardado en DB (SHA-256 hash + expiresAt)

REQUEST AUTENTICADO
  ├─ Authorization: Bearer <access_token>
  └─ si 401 → apiFetch intenta refresh

REFRESH (rotativo)
  ├─ POST /api/auth/refresh { refreshToken }
  ├─ valida firma + hash en DB
  ├─ revoca token viejo (setea revokedAt + replacedByTokenId)
  ├─ emite refresh_token NUEVO
  └─ emite access_token NUEVO

LOGOUT
  ├─ POST /api/auth/logout { refreshToken }
  ├─ revoca el refresh (o todos)
  └─ limpia localStorage (via performLogout)
```

---

## 🗄️ Tablas de DB

### `users` (campos de auth)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `email` | varchar(255) unique | Email del user |
| `password` | varchar(255) | Hash bcrypt (10 rounds) |
| `emailVerified` | boolean | default `false` |
| `emailVerifiedAt` | timestamptz | Cuándo se verificó |
| `failedLoginAttempts` | int | default `0`. Reset en login OK |
| `lockedUntil` | timestamptz | Bloqueo temporal por 5 fallos |
| `lastLoginAt` | timestamptz | Último login OK |
| `lastLoginIp` | varchar(45) | IP del último login |
| `totpSecret` | varchar | Secret TOTP encriptado con AES-256-GCM |
| `totpEnabled` | boolean | default `false` |

### `refresh_tokens`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `userId` | uuid FK | User dueño |
| `tokenHash` | varchar(64) | SHA-256 del token |
| `expiresAt` | timestamptz | 30 días desde emisión |
| `revokedAt` | timestamptz | Cuándo se revocó (rotación / logout) |
| `replacedByTokenId` | uuid | Apunta al token nuevo (rotación) |
| `lastUsedAt` | timestamptz | Última vez usado |
| `ip` | varchar(45) | IP del cliente |
| `userAgent` | text | User-Agent del cliente |
| `createdAt` | timestamptz | |

**Índices**: `(userId, expiresAt)`, `(tokenHash)`.

### `auth_events`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `userId` | uuid FK nullable | User (NULL si no existía) |
| `eventType` | varchar(50) | Uno de los tipos abajo |
| `ip` | varchar(45) | IP del cliente |
| `userAgent` | text | User-Agent del cliente |
| `metadata` | jsonb | Info adicional (reason, tenantId, etc.) |
| `createdAt` | timestamptz | |

**Eventos**:
- `login_success`, `login_failed`, `logout`
- `password_reset_requested`, `password_reset_completed`, `password_changed`
- `email_verified`
- `refresh_token_used`, `refresh_token_revoked`
- `2fa_enabled`, `2fa_disabled`, `2fa_verified`
- `account_locked`

### `password_resets`

Igual a `refresh_tokens` pero para reset de password: `id`, `userId`, `tokenHash`, `expiresAt` (15 min), `usedAt`, `ip`, `userAgent`, `createdAt`.

### `email_verifications`

Igual a `password_resets`: `id`, `userId`, `tokenHash`, `expiresAt` (24 h), `usedAt`, `ip`, `userAgent`, `createdAt`.

### `backup_codes`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `userId` | uuid FK | User |
| `codeHash` | varchar(64) | SHA-256 del código (ej. `A3F1-9K2B-...`) |
| `usedAt` | timestamptz | Cuándo se usó (uno solo) |
| `createdAt` | timestamptz | |

---

## 🔐 Flujos

### 1. Registro

```
POST /api/auth/register
  body: { name, email, password, role?, phone?, ... }
  ─────────────────────────────────────────────────
  1. Validar password policy (mín 8, mayús, minús, número)
  2. Verificar email no registrado
  3. bcrypt.hash(password, 10)
  4. INSERT users
  5. Enviar email de verificación (fire-and-forget)
  6. Devolver { access_token, user, tenant: null }
```

### 2. Login

```
POST /api/auth/login
  body: { email, password }
  ─────────────────────────────────────────────────
  1. Throttle por cuenta (5 / 15 min)
  2. Buscar tenant (para fallback de password legacy)
  3. Buscar user
  4. Si user no existe pero tenant sí → auto-crear user
  5. Si user.lockedUntil > now → 423 Locked
  6. Verificar password (bcrypt)
  7. Si falla:
     - user.failedLoginAttempts++
     - Si >= 5 → user.lockedUntil = now + 15 min
     - log auth_event 'login_failed'
     - throw 401
  8. Si user.totpEnabled → devolver { requiresTwoFactor, tempToken }
  9. Reset failedLoginAttempts, setear lastLoginAt
  10. Firmar access (15m) + refresh (30d)
  11. Guardar refresh hasheado en DB
  12. Devolver { access_token, refresh_token, user, tenant }
```

### 3. Login con 2FA (paso 2)

```
POST /api/auth/2fa/verify
  body: { tempToken, code }
  ─────────────────────────────────────────────────
  1. Parsear tempToken (userId:token:expiresAt)
  2. Buscar user
  3. Desencriptar totpSecret (AES-256-GCM)
  4. otplib.verify(code)
  5. Si OK → emitir access + refresh + user + tenant
  6. Si no → 401
```

### 4. Refresh

```
POST /api/auth/refresh
  body: { refreshToken }
  ─────────────────────────────────────────────────
  1. Verificar firma con JWT_REFRESH_SECRET
  2. Buscar hash en refresh_tokens
  3. Si no existe → 401
  4. Si ya tiene revokedAt → 401 + revocar TODA la cadena (robo detectado)
  5. Si expiró → 401
  6. Emitir refresh NUEVO
  7. Revocar el viejo (setear revokedAt + replacedByTokenId)
  8. Emitir access NUEVO
```

### 5. Logout

```
POST /api/auth/logout
  body: { refreshToken?, all? }
  ─────────────────────────────────────────────────
  Si all=true o no refreshToken → revocar TODOS los refresh del user
  Si refreshToken → revocar solo ese
  ─────────────────────────────────────────────────
  El frontend llama performLogout():
    1. apiFetch('/auth/logout') (fire-and-forget)
    2. Limpia localStorage (tokens + user + tenant + userName)
    3. Dispara evento 'authChanged'
    4. Redirige a /
```

### 6. Reset password

```
PASO 1: POST /api/auth/forgot-password
  body: { email }
  ─────────────────────────────────────────────────
  1. Throttle por cuenta (3 / hora)
  2. Si email existe:
     - Firmar reset JWT (15 min, JWT_RESET_SECRET)
     - Guardar hash en password_resets
     - Enviar email con link APP_URL/reset-password?token=...
  3. Siempre devolver 200 (no revelar si existe)

PASO 2: POST /api/auth/reset-password
  body: { token, newPassword }
  ─────────────────────────────────────────────────
  1. Verificar JWT con JWT_RESET_SECRET
  2. Buscar hash en password_resets (no usado, no expirado)
  3. Validar password policy
  4. bcrypt.hash(newPassword, 10)
  5. UPDATE users.password
  6. Marcar token como usado
  7. Revocar TODOS los refresh del user
  8. log 'password_reset_completed'
```

### 7. Verificación de email

```
PASO 1: POST /api/auth/send-verification (autenticado)
  ─────────────────────────────────────────────────
  1. Throttle por cuenta (3 / hora)
  2. Si user.emailVerified → devolver 200 con emailVerified: true
  3. Firmar verify JWT (24 h, JWT_VERIFY_SECRET)
  4. Guardar hash en email_verifications
  5. Enviar email con link APP_URL/verify-email?token=...

PASO 2: GET /api/auth/verify-email?token=...
  ─────────────────────────────────────────────────
  1. Verificar JWT con JWT_VERIFY_SECRET
  2. Buscar hash en email_verifications (no usado, no expirado)
  3. UPDATE users SET emailVerified=true, emailVerifiedAt=now
  4. Marcar token como usado
  5. log 'email_verified'
```

### 8. 2FA setup

```
PASO 1: POST /api/auth/2fa/setup (autenticado)
  ─────────────────────────────────────────────────
  1. Si user.totpEnabled → 400
  2. otplib.generateSecret()
  3. Encriptar con AES-256-GCM (ENCRYPTION_KEY)
  4. Guardar en users.totpSecret (NO activar todavía)
  5. Generar 10 backup codes
  6. Hashear con SHA-256 y guardar en backup_codes
  7. Devolver { secret, qrCodeDataUrl, backupCodes }

PASO 2: POST /api/auth/2fa/verify-setup (autenticado)
  body: { code }
  ─────────────────────────────────────────────────
  1. Desencriptar totpSecret
  2. otplib.verify(code)
  3. Si OK → user.totpEnabled = true
  4. log '2fa_enabled'

PASO 3: POST /api/auth/2fa/disable (autenticado)
  body: { code }
  ─────────────────────────────────────────────────
  1. Verificar code
  2. user.totpEnabled = false, totpSecret = null
  3. DELETE backup_codes del user
  4. log '2fa_disabled'
```

### 9. Sesiones activas

```
GET /api/auth/sessions
  headers: { Authorization: Bearer ..., X-Refresh-Token: <actual> }
  ─────────────────────────────────────────────────
  1. Listar refresh_tokens no revocados, no expirados
  2. Parsear userAgent → browser/os/device legibles
  3. Marcar isCurrent si tokenHash matchea
  4. Devolver array

DELETE /api/auth/sessions/:id
  ─────────────────────────────────────────────────
  Revocar un refresh específico (solo del mismo user)

DELETE /api/auth/sessions
  headers: { X-Refresh-Token: <actual> }
  ─────────────────────────────────────────────────
  Revocar TODOS excepto el actual
```

---

## 🌐 Endpoints

### Públicos (sin auth)

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/auth/check-email?email=` | ¿Existe el email? |
| `POST` | `/api/auth/register` | Registro inicial |
| `POST` | `/api/auth/login` | Login (1 paso o 2 si 2FA) |
| `POST` | `/api/auth/refresh` | Refrescar access token |
| `POST` | `/api/auth/forgot-password` | Solicitar reset |
| `POST` | `/api/auth/reset-password` | Resetear con token |
| `POST` | `/api/auth/2fa/verify` | Verificar 2FA (login) |
| `POST` | `/api/auth/2fa/backup-code` | Login con backup code |
| `GET` | `/api/auth/verify-email?token=` | Verificar email |

### Autenticados (`@UseGuards(AuthGuard('jwt'))`)

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/auth/context` | Contexto del user actual |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `POST` | `/api/auth/change-password` | Cambiar password (actual) |
| `POST` | `/api/auth/send-verification` | Reenviar email de verificación |
| `POST` | `/api/auth/2fa/setup` | Iniciar setup 2FA |
| `POST` | `/api/auth/2fa/verify-setup` | Confirmar setup 2FA |
| `POST` | `/api/auth/2fa/disable` | Desactivar 2FA |
| `GET` | `/api/auth/2fa/status` | ¿Tiene 2FA activo? |
| `GET` | `/api/auth/sessions` | Listar sesiones |
| `DELETE` | `/api/auth/sessions/:id` | Revocar una sesión |
| `DELETE` | `/api/auth/sessions` | Revocar todas menos la actual |
| `GET/PUT/DELETE` | `/api/auth/me/location` | Ubicación del user |

### Rate limits

| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /api/auth/login` (por IP) | 5 | 1 min |
| `POST /api/auth/login` (por cuenta) | 5 | 15 min |
| `POST /api/auth/forgot-password` | 3 | 1 hora |
| `POST /api/auth/send-verification` | 3 | 1 hora |
| `POST /api/auth/2fa/verify` | 10 | 1 min |
| Global (por IP) | 60 | 1 min |

---

## 🔧 Variables de entorno

| Variable | Descripción | Largo |
|---|---|---|
| `JWT_SECRET` | Firma de access tokens | 96 hex (48 bytes) |
| `JWT_REFRESH_SECRET` | Firma de refresh tokens | 96 hex |
| `JWT_RESET_SECRET` | Firma de tokens de reset | 96 hex |
| `JWT_VERIFY_SECRET` | Firma de tokens de verificación | 96 hex |
| `ENCRYPTION_KEY` | AES-256-GCM para `totpSecret` | 64 hex (32 bytes) |
| `JWT_ACCESS_EXPIRES` | Vida del access | `15m` |
| `JWT_REFRESH_EXPIRES` | Vida del refresh | `30d` |
| `RESEND_API_KEY` | API key de Resend (vacío → loguea) | - |
| `RESEND_FROM_EMAIL` | From de los emails | - |
| `APP_URL` | URL pública para links | `https://172.16.16.16` |
| `CORS_ORIGINS` | Orígenes permitidos | CSV |

**Generar nuevo secreto**:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # 96 hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # 64 hex
```

---

## 🔄 Rotación de `JWT_SECRET`

**Cuándo rotar**:
- Sospecha de filtración
- Cada 6-12 meses por política
- Cuando un dev con acceso se va del equipo

**Procedimiento** (sin cortar sesiones):

### 1. Generar el nuevo
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Agregar al `.env` (NO borrar el actual)
```
JWT_SECRET_NEW=<nuevo>
JWT_SECRET_OLD=<el-actual>
```
**Ojo**: durante la rotación, `JWT_SECRET` **no debe existir**. El código prioriza `_NEW`, después `JWT_SECRET`, después `_OLD`.

### 3. Rebuild + restart
```bash
cd /opt/facilito/apps/backend
pnpm build 2>&1 | tail -5
systemctl restart facilito-backend.service
```

### 4. Verificar doble validación
```bash
# Token nuevo (firmado con _NEW) → 200
# Token viejo (firmado con _OLD) → 200
# Token basura → 401
```

### 5. Esperar 15 minutos (vida del access token)

### 6. Consolidar
En el `.env`:
```
JWT_SECRET=<el-nuevo>
```
**Borrar** `JWT_SECRET_NEW` y `JWT_SECRET_OLD`.

### 7. Rebuild + restart

### 8. Verificar
- Token nuevo → 200
- Token viejo → 401 (ya no valida)

---

## 🛡️ Políticas

### Password policy
Regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número

### Bloqueo temporal
- 5 intentos fallidos consecutivos → `lockedUntil = now + 15 min`
- Se resetea en login OK
- Se ignora si `user.failedLoginAttempts < 5`

### Refresh token
- Vida: 30 días
- Se guarda **hasheado** (SHA-256), no en claro
- **Rotativo**: cada refresh emite uno nuevo
- **Detección de reuso**: si un token ya revocado se intenta usar, se revoca **toda** la cadena del user

### 2FA (TOTP)
- `totpSecret` encriptado con AES-256-GCM
- Ventana de 30 segundos
- 10 backup codes por user, uno por uso

---

## 🐛 Troubleshooting

### Login da 500
**Causa más probable**: `JWT_SECRET` no está definido en `.env`.
**Fix**: verificar que `.env` tenga `JWT_SECRET=...` (96 hex).

### Login da 401 y el password es correcto
**Causa**: cuenta bloqueada por intentos fallidos.
**Fix**:
```bash
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c \
  "UPDATE users SET \"failedLoginAttempts\"=0, \"lockedUntil\"=NULL WHERE email='X';"
```

### Token válido da 401 en `/api/account/*`
**Causa**: el endpoint usa `jwt.decode` en vez de `req.user`, o falta `@UseGuards(AuthGuard('jwt'))`.
**Fix**: revisar que el controller use `extractUserId(req)` de `req.user` y tenga el guard a nivel clase.

### El frontend no refresca el token automáticamente
**Causa**: el componente usa `fetch` directo en vez de `apiFetch`.
**Fix**: migrar a `apiFetch` (ver Fase 6.4).

### 2FA no acepta el código
**Causa 1**: la hora del server está desincronizada.
**Fix**: `timedatectl set-ntp true` o `systemctl restart systemd-timesyncd`.
**Causa 2**: el `totpSecret` no se desencripta (ENCRYPTION_KEY cambió).
**Fix**: desactivar 2FA por SQL:
```bash
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c \
  "UPDATE users SET \"totpEnabled\"=false, \"totpSecret\"=NULL WHERE email='X';"
```

### Logout no revoca el refresh token
**Causa**: el código usa `localStorage.clear()` en vez de `performLogout()`.
**Fix**: usar `performLogout` de `lib/auth/logout.ts`.

### Email no se envía
**Causa**: `RESEND_API_KEY` vacío → modo dev.
**Comportamiento**: el link se loguea a la consola del backend.
**Fix**: para producción, configurar Resend y setear `RESEND_API_KEY`.

### Rotación de JWT_SECRET rompió las sesiones
**Causa**: no se usó doble validación (`_NEW` + `_OLD`).
**Fix**: no rotar sin el procedimiento completo.

---

## 📚 Referencias

- **Fase 1** — Fundaciones: refresh tokens + rate limiting + auditoría
- **Fase 2** — Reset password con email
- **Fase 3** — Verificación de email
- **Fase 4** — 2FA (TOTP)
- **Fase 5** — Sesiones activas
- **Fase 6** — Hardening (Helmet, CORS, whitelist, migración a apiFetch, rotación de secretos)

**Archivos clave**:
- `apps/backend/src/modules/auth/auth.service.ts` — Lógica principal
- `apps/backend/src/modules/auth/auth.controller.ts` — Endpoints
- `apps/backend/src/modules/auth/token.service.ts` — Firma/validación de JWT
- `apps/backend/src/modules/auth/refresh-token.service.ts` — Rotación
- `apps/backend/src/modules/auth/two-factor.service.ts` — TOTP
- `apps/backend/src/modules/auth/audit.service.ts` — Eventos
- `apps/backend/src/modules/auth/email.service.ts` — Emails (Resend)
- `apps/frontend/lib/api.ts` — `apiFetch` con interceptor de refresh
- `apps/frontend/lib/auth/logout.ts` — `performLogout` unificado
- `apps/frontend/components/ProfileSecurity.tsx` — Cambio password + 2FA
- `apps/frontend/components/SessionsList.tsx` — Lista de sesiones activas


