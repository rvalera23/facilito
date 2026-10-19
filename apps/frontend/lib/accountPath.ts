// ============================================================
// ARCHIVO: apps/frontend/lib/accountPath.ts
// Decide a dónde mandar al usuario al hacer click en "Mi Cuenta"
// según su rol.
//
// 🔥 IMPORTANTE:
// - Este path es para el PERFIL PERSONAL del usuario.
// - El panel de ADMIN de la tienda se accede con el botón
//   "Panel de Control" (ícono LayoutDashboard) que tiene su
//   propia ruta `/admin/{slug}` en el header.
// ============================================================

export function getAccountPath(user: any): string {
  if (!user) return '/mi-cuenta';

  const role = (user.role || user.activeRole || '').toLowerCase();

  // 🔥 Roles operativos → su panel específico
  if (role === 'repartidor') {
    return '/repartidor';
  }
  if (role === 'profesional') {
    return '/profesional';
  }

  // 🔥 TODOS los demás roles (seller, admin, owner, buyer)
  // van a su perfil personal. Aunque seas dueño de tienda,
  // tenés perfil de comprador.
  return '/mi-cuenta';
}