/**
 * Fase 6.3 — Whitelist de campos seguros del user para devolver al frontend.
 *
 * NUNCA devolver:
 *   - password (hash bcrypt)
 *   - totpSecret
 *   - failedLoginAttempts / lockedUntil (detalles internos)
 *   - emailVerifiedAt / lastLoginAt / lastLoginIp (timestamps internos)
 *
 * Pero sí devolvemos flags booleanos útiles: emailVerified, totpEnabled.
 */
export function toPublicUser(user: any): any {
  if (!user) return null;

  const {
    password,
    totpSecret,
    failedLoginAttempts,
    lockedUntil,
    emailVerifiedAt,
    lastLoginAt,
    lastLoginIp,
    tenant,
    ...safe
  } = user;

  return {
    ...safe,
    emailVerified: !!user.emailVerified,
    totpEnabled: !!user.totpEnabled,
  };
}
