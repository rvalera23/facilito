// frontend/lib/branding.ts
//
// 🔥 FUENTE ÚNICA DE VERDAD para los colores por defecto de facilitó.
// Si algún día hay que cambiar el branding, se cambia SOLO acá.
// Todos los módulos (home, admin, mi-cuenta, tienda, onboarding) importan de acá.
//
// Valores alineados con el default de `useAppTheme` (home pública).

export const DEFAULT_THEME = {
  primaryColor: '#ea580c',      // Naranja de marca (Tailwind orange-600)
  secondaryColor: '#0f172a',    // Azul oscuro (fondos secundarios)
  accentColor: '#fbbf24',       // Ámbar (acentos, highlights)
  backgroundColor: '#0b0f19',   // Casi negro azulado (fondo principal)
  name: 'facilito',
} as const;

export type BrandTheme = typeof DEFAULT_THEME;

// ============================================================
// 🔥 UTILIDADES DE CONTRASTE
// ============================================================
// Dado un color de fondo (hex), devuelve el color de texto
// que mejor contrasta (claro u oscuro).
//
// Algoritmo: YIQ. Umbral: 128.
// - Brillos >= 128 → texto oscuro (#0f172a)
// - Brillos <  128 → texto claro  (#ffffff)
// ============================================================
export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';

  let cleanHex = hexColor.replace('#', '');

  // Soporte para hex de 3 dígitos (#abc → #aabbcc)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (cleanHex.length !== 6) return '#ffffff';

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Si algún canal es NaN, fallback a blanco
  if ([r, g, b].some((v) => Number.isNaN(v))) return '#ffffff';

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 128 ? '#0f172a' : '#ffffff';
}