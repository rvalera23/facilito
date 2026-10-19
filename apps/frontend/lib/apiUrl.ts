// ============================================================
// 🔥 UTILIDAD CENTRAL PARA URLs DE API
// Todas las funciones de URL deben pasar por acá.
// Es IDEMPOTENTE: no importa cuántas veces la llames,
// el resultado es siempre el mismo.
// ============================================================

/**
 * Colapsa múltiples `/api` consecutivos en uno solo.
 * Ejemplos:
 *   /api/uploads/x       → /api/uploads/x      (sin cambios)
 *   /api/api/uploads/x   → /api/uploads/x
 *   /api/api/api/x       → /api/x
 */
function collapseApiSegments(path: string): string {
  // Matchea uno o más segmentos `/api` consecutivos y los reemplaza por uno.
  // Usamos un loop por si la regex con lookahead no es soportada en algún motor.
  let out = path;
  let prev = '';
  // Iterar hasta que no haya más cambios (defensa extra, normalmente 1 pasada alcanza)
  while (out !== prev) {
    prev = out;
    out = out.replace(/(?:\/api)+(?=\/|$)/g, '/api');
  }
  return out;
}

/**
 * Normaliza un path de API para que:
 * 1. SIEMPRE empiece con un solo `/api/`
 * 2. NUNCA tenga `/api/api/api/...`
 * 3. Si es URL absoluta (http://...), extraiga solo el path
 * 4. Deje pasar blobs y data URLs sin tocar
 *
 * @example
 * normalizeApiPath('/uploads/file.png')          // → '/api/uploads/file.png'
 * normalizeApiPath('/api/uploads/file.png')      // → '/api/uploads/file.png'
 * normalizeApiPath('/api/api/uploads/file.png')  // → '/api/uploads/file.png'
 * normalizeApiPath('https://ip/api/api/x.png')   // → '/api/x.png'
 * normalizeApiPath('blob:http://...')            // → 'blob:http://...'
 */
export function normalizeApiPath(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (!str) return '';

  // Blobs y data URLs se devuelven tal cual
  if (str.startsWith('blob:') || str.startsWith('data:')) return str;

  // 🔥 PASO 1: Si es URL absoluta, extraer solo el path
  let path = str;
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const url = new URL(str);
      path = url.pathname + (url.search || '');
    } catch {
      path = str.replace(/^https?:\/\/[^\/]+/, '');
    }
  }

  // 🔥 PASO 2: Asegurar que empiece con '/'
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // 🔥 PASO 3: Colapsar TODOS los `/api` consecutivos en UNO solo.
  // Esta es la corrección real: la regex anterior `/^(\/api)+/`
  // no matcheaba `/api/api/` (faltaba el `/` entre segmentos).
  path = collapseApiSegments(path);

  // 🔥 PASO 4: Si el path NO empieza con `/api/`, prefijarlo.
  // (Acá path ya tiene los /api colapsados. Si el path original venía
  //  con /api, ya está. Si venía pelado como /uploads/x, hay que agregarlo.)
  if (!path.startsWith('/api/')) {
    if (path === '/api') {
      path = '/api/';
    } else if (path === '/') {
      path = '/api/';
    } else {
      path = '/api' + (path.startsWith('/') ? path : '/' + path);
    }
  }

  return path;
}

/**
 * Convierte un path relativo de API a URL absoluta usando el origin actual.
 * Es idempotente: si ya es absoluta, la devuelve tal cual (pero con el
 * path limpio de `/api` duplicados).
 */
export function toAbsoluteApiUrl(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (!str) return '';

  // Blobs y data URLs
  if (str.startsWith('blob:') || str.startsWith('data:')) return str;

  // 🔥 Si es absoluta, preservar origin + search + hash, pero limpiar el pathname
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const url = new URL(str);
      const cleanPath = collapseApiSegments(url.pathname);
      return `${url.origin}${cleanPath}${url.search || ''}${url.hash || ''}`;
    } catch {
      // Fallback si URL.parse falla
      return collapseApiSegments(str);
    }
  }

  // Relativa: normalizar + prefijar con origin
  const normalized = normalizeApiPath(str);
  if (!normalized) return '';

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
}
// force-rebuild-1792109462
