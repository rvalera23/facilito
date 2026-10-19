import { apiFetch } from '@/lib/api';

/**
 * Fase 6.5 — Logout unificado.
 *
 * 1. Notifica al backend para revocar el refresh_token (fire-and-forget).
 * 2. Limpia localStorage / sessionStorage.
 * 3. Redirige a `/`.
 *
 * Se puede llamar desde cualquier lugar. No requiere estar dentro de AuthContext.
 */
export async function performLogout(options?: {
  redirectTo?: string;
  skipBackend?: boolean;
}): Promise<void> {
  const { redirectTo = '/', skipBackend = false } = options || {};

  // 1. Notificar al backend (no bloqueante)
  if (!skipBackend && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        // No await: fire-and-forget
        apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken, all: false }),
        }).catch(() => {});
      } catch {
        // Silencioso
      }
    }
  }

  // 2. Limpiar storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('tenant');
      localStorage.removeItem('userName');
      // 🔥 Limpiar themes del user que se va para que NO contaminen
      // al próximo user que se loguee en el mismo navegador.
      // El theme se restaura al hacer login desde el backend.
      localStorage.removeItem('user_theme');
      localStorage.removeItem('app_theme');
      localStorage.removeItem('user_palette');
      localStorage.removeItem('user_font');
      // No hacemos localStorage.clear() para no borrar preferencias
      // (theme, paletas, filtros de notifs, etc.).
    } catch {}

    // 3. Evento global para que otros componentes reaccionen.
    //    🔥 Disparamos `authChange` (sin "d") porque es el nombre que
    //    Header.tsx y page.tsx están escuchando.
    //    También disparamos `storage` para forzar re-sync entre pestañas.
    window.dispatchEvent(new Event('authChange'));
    window.dispatchEvent(new CustomEvent('authChanged')); // compatibilidad
    window.dispatchEvent(new Event('userChange'));
  }

  // 4. Redirigir (con recarga completa para forzar reset de estado)
  if (typeof window !== 'undefined' && redirectTo) {
    // Si ya estamos en esa ruta, forzamos un reload manual
    // para que todos los useEffect/useState se reinicien.
    if (window.location.pathname === redirectTo) {
      window.location.reload();
    } else {
      window.location.href = redirectTo;
    }
  }
}