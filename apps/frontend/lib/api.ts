const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// ============================================================
// TOKEN HELPERS
// ============================================================
// Hoy el login guarda el access token bajo 'token' Y 'access_token'
// (para compat con código viejo que lee cualquiera de los dos).
// El refresh_token se guarda bajo 'refresh_token'.

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

function saveTokens(access: string, refresh?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', access);
  localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// ============================================================
// REFRESH DEDUPLICADO
// ============================================================
// Si varias requests reciben 401 al mismo tiempo, no queremos
// disparar N llamadas a /auth/refresh. Todas esperan a la misma.

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) {
        // Refresh inválido/expirado/revocado → limpiar y forzar re-login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('authChange'));
        }
        return null;
      }

      const data = await res.json();
      saveTokens(data.access_token, data.refresh_token);
      return data.access_token as string;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================================
// apiFetch — wrapper con refresh automático en 401
// ============================================================
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  _retry = false,
): Promise<Response> {
  const headers = new Headers(options.headers);
  const isFormDataBody =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const response = await fetch(url, { ...options, headers });

  // 401 + tenemos refresh + no es un reintento → intentar refresh
  if (
    response.status === 401 &&
    !_retry &&
    getRefreshToken() &&
    // Evitar loop en los propios endpoints de auth
    !normalizedPath.includes('/auth/login') &&
    !normalizedPath.includes('/auth/refresh') &&
    !normalizedPath.includes('/auth/register')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Reintentar UNA sola vez con el token nuevo
      const retryHeaders = new Headers(options.headers);
      if (!isFormDataBody && !retryHeaders.has('Content-Type')) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      return apiFetch(path, { ...options, headers: retryHeaders }, true);
    }
  }

  return response;
}