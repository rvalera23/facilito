// lib/priceTokens.ts
// ============================================================
// 🔥 TOKENS SEMÁNTICOS DE PRECIO
// ------------------------------------------------------------
// Regla única en TODO el proyecto:
//   - Bolívares (VES)     → color PRIMARIO del tenant
//   - Divisas (USD/EUR/USDT) → VERDE #15803d (light) / #4ade80 (dark)//
// Cualquier sitio que pinte un precio DEBE usar estos tokens.
// Si no los usa, es un bug de consistencia visual.
// ============================================================

import type { CSSProperties } from 'react';

export interface PriceColorTheme {
  /** Color primario del tenant (se usa para bolívares) */
  primary: string;
  /** true = fondo oscuro, false = fondo claro */
  isDarkBg: boolean;
}

export interface PriceColors {
  /** Bolívares (VES) → color primario */
  ves: string;
  /** Divisas (USD/EUR/USDT) → verde */
  foreign: string;
  /** Divisas en contexto secundario (labels como "USD:", "EUR:") */
  foreignMuted: string;
  /** true si el tema es oscuro (útil para lógica extra) */
  isDarkBg: boolean;
}

// ============================================================
// 🟢 VERDES DE DIVISA — DEFINIDOS UNA SOLA VEZ EN TODO EL PROYECTO
// ============================================================
// Light theme → verde oscuro (contraste sobre fondo blanco)
// Dark theme  → verde claro  (contraste sobre fondo oscuro)
const FOREIGN_GREEN = {
  light: '#15803d', // green-700 (verde oscuro para fondos claros)
  dark:  '#4ade80', // green-400 (verde claro para fondos oscuros)
} as const;

// Versión atenuada para labels tipo "USD:" / "EUR:" (no el número)
const FOREIGN_GREEN_MUTED = {
  light: 'rgba(21, 128, 61, 0.65)',  // green-700 al 65%
  dark:  'rgba(74, 222, 128, 0.65)', // green-400 al 65%
} as const;

// ============================================================
// 🔥 FUNCIÓN PRINCIPAL
// ============================================================
/**
 * Devuelve los colores semánticos de precio para un tema dado.
 *
 * @example
 * const priceColors = getPriceColors({ primary, isDarkBg });
 * <span style={{ color: priceColors.ves }}>Bs. 1.234,56</span>
 * <span style={{ color: priceColors.foreign }}>$ 12.34</span>
 */
export function getPriceColors(theme: PriceColorTheme): PriceColors {
  const { primary, isDarkBg } = theme;
  return {
    ves: primary,
    foreign: isDarkBg ? FOREIGN_GREEN.dark : FOREIGN_GREEN.light,
    foreignMuted: isDarkBg ? FOREIGN_GREEN_MUTED.dark : FOREIGN_GREEN_MUTED.light,
    isDarkBg,
  };
}

// ============================================================
// 🔥 HELPERS DE ESTILO (azúcar sintáctico)
// ============================================================

/**
 * Estilo listo para usar en un `<span style={priceStyle('ves', colors)}>`
 */
export function priceStyle(
  kind: 'ves' | 'foreign' | 'foreignMuted',
  colors: PriceColors
): CSSProperties {
  return { color: colors[kind] };
}

/**
 * Igual que `priceStyle` pero con `fontWeight` y `opacity` opcionales.
 * Útil para labels tipo "USD:" que quieres atenuados.
 */
export function priceLabelStyle(
  kind: 'ves' | 'foreign' | 'foreignMuted',
  colors: PriceColors,
  opts?: { opacity?: number; fontWeight?: number | string }
): CSSProperties {
  const style: CSSProperties = { color: colors[kind] };
  if (opts?.opacity !== undefined) style.opacity = opts.opacity;
  if (opts?.fontWeight !== undefined) style.fontWeight = opts.fontWeight;
  return style;
}

// ============================================================
// 📌 CONSTANTES EXPORTADAS (por si necesitas el hex directo)
// ============================================================
export const PRICE_FOREIGN_GREEN = FOREIGN_GREEN;
export const PRICE_FOREIGN_GREEN_MUTED = FOREIGN_GREEN_MUTED;