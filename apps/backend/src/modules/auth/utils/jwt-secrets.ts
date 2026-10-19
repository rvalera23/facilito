/**
 * Fase 6.7 — Helper para rotación de JWT_SECRET.
 *
 * Devuelve los secretos en orden de prioridad:
 *   1. JWT_SECRET_NEW (durante rotación)
 *   2. JWT_SECRET (normal)
 *   3. JWT_SECRET_OLD (durante rotación)
 *
 * Uso:
 *   - Para FIRMAR: usar `getJwtSigningSecret()` (el primero).
 *   - Para VERIFICAR: usar `getJwtSecrets()` (array, prueba todos).
 */

const FALLBACK = 'tu_secreto_super_seguro';

export function getJwtSecrets(): string[] {
  const secrets: string[] = [];

  if (process.env.JWT_SECRET_NEW) secrets.push(process.env.JWT_SECRET_NEW);
  if (process.env.JWT_SECRET) secrets.push(process.env.JWT_SECRET);
  if (process.env.JWT_SECRET_OLD) secrets.push(process.env.JWT_SECRET_OLD);

  if (secrets.length === 0) secrets.push(FALLBACK);

  return secrets;
}

export function getJwtSigningSecret(): string {
  return getJwtSecrets()[0];
}

/**
 * Verifica un token probando cada secreto en orden.
 * Devuelve el payload si alguno valida, o `null` si ninguno.
 */
export function verifyJwtWithFallback(
  token: string,
  jwt: any,
): any {
  const secrets = getJwtSecrets();

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch {}
  }

  return null;
}
