// ============================================================
// ARCHIVO: apps/frontend/lib/roles.ts
// Helpers para verificar roles de usuario.
// ============================================================

export function isDriver(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.activeRole || '').toLowerCase();
  return role === 'repartidor';
}

export function isBuyer(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.activeRole || '').toLowerCase();
  return role === 'buyer' || role === 'comprador';
}

export function isSeller(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.activeRole || '').toLowerCase();
  return role === 'seller' || role === 'vendedor' || role === 'admin' || role === 'owner';
}

export function isProfessional(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.activeRole || '').toLowerCase();
  return role === 'profesional' || role === 'professional';
}

/**
 * 🔥 ¿Puede ver funcionalidades de comprador?
 * (Favoritos, "Mi Cuenta", buscar tiendas, etc.)
 *
 * Regla: TODOS excepto repartidor y profesional.
 * Esto cubre:
 *   - buyer / comprador (rol natural de comprador)
 *   - seller / vendedor (también navega tiendas)
 *   - admin / owner (también navega tiendas)
 *   - anónimos (user === null)
 *
 * NO cubre:
 *   - repartidor (solo panel de reparto)
 *   - profesional (solo panel de servicios)
 */
export function canSeeBuyerFeatures(user: any): boolean {
  if (!user) return true; // Anónimos pueden ver todo lo público
  return !isDriver(user) && !isProfessional(user);
}
