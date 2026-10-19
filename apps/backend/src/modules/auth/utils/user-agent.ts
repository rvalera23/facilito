/**
 * Parser simple de User-Agent.
 * No pretende ser perfecto, solo lo suficiente para mostrar algo legible
 * ("Chrome en Windows", "Safari en iPhone", etc.).
 */
export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  label: string;
} {
  if (!ua) {
    return { browser: 'Desconocido', os: 'Desconocido', device: 'unknown', label: 'Desconocido' };
  }

  const u = ua.toLowerCase();

  // ---- OS ----
  let os = 'Desconocido';
  let device: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';

  if (u.includes('iphone')) {
    os = 'iPhone';
    device = 'mobile';
  } else if (u.includes('ipad')) {
    os = 'iPad';
    device = 'tablet';
  } else if (u.includes('android')) {
    os = 'Android';
    device = u.includes('mobile') ? 'mobile' : 'tablet';
  } else if (u.includes('windows')) {
    os = 'Windows';
    device = 'desktop';
  } else if (u.includes('mac os') || u.includes('macintosh')) {
    os = 'macOS';
    device = 'desktop';
  } else if (u.includes('linux')) {
    os = 'Linux';
    device = 'desktop';
  }

  // ---- Browser ----
  let browser = 'Desconocido';
  if (u.includes('edg/')) browser = 'Edge';
  else if (u.includes('opr/') || u.includes('opera')) browser = 'Opera';
  else if (u.includes('chrome') && !u.includes('edg/')) browser = 'Chrome';
  else if (u.includes('firefox')) browser = 'Firefox';
  else if (u.includes('safari') && !u.includes('chrome')) browser = 'Safari';

  return {
    browser,
    os,
    device,
    label: `${browser} en ${os}`,
  };
}
