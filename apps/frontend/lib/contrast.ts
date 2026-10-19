// lib/contrast.ts

/**
 * Devuelve true si el color hex es oscuro (necesita texto claro).
 * Luminancia relativa WCAG 2.1. Soporta #rgb y #rrggbb.
 */
export function isDarkColor(hex: string | null | undefined): boolean {
  if (!hex) return false;
  let clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return false;

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L < 0.5;
}

/**
 * Color de texto de alto contraste para un fondo dado.
 */
export function getContrastText(
  bgHex: string | null | undefined,
): '#000000' | '#ffffff' {
  return isDarkColor(bgHex) ? '#ffffff' : '#000000';
}

/**
 * Color de texto secundario (para texto con opacidad sobre fondo).
 */
export function getContrastTextMuted(
  bgHex: string | null | undefined,
): string {
  return isDarkColor(bgHex) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
}
