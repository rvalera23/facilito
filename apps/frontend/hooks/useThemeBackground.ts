// frontend/hooks/useThemeBackground.ts
// ============================================================
// 🔥 Hook centralizado para leer el fondo del tema actual
// ============================================================
// Usado por modales, dropdowns, popups.
// Lee la CSS var `--bg-color` (que setean los containers
// principales: home, admin, tienda, mi-cuenta).
//
// Es reactivo a eventos de tema: themeChange, tenantThemeUpdated,
// paletteChange.
// ============================================================

'use client';

import { useState, useEffect } from 'react';

/**
 * Devuelve el color de fondo del tema actual.
 *
 * @param fallbackColor - Color a usar si no hay CSS var (ej: '#0f172a')
 * @param isDarkBg - Si el tema es oscuro (para fallback '#0f172a' vs '#ffffff')
 * @returns { bgColor }
 */
export function useThemeBackground(
  fallbackColor?: string,
  isDarkBg?: boolean,
): string {
  const defaultFallback =
    fallbackColor || (isDarkBg ? '#0f172a' : '#ffffff');

  const [bgColor, setBgColor] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultFallback;
    const css = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-color')
      .trim();
    return css || defaultFallback;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBg = () => {
      const css = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-color')
        .trim();
      setBgColor(css || defaultFallback);
    };

    updateBg();

    window.addEventListener('themeChange', updateBg);
    window.addEventListener('tenantThemeUpdated', updateBg);
    window.addEventListener('paletteChange', updateBg);
    window.addEventListener('storage', updateBg);

    return () => {
      window.removeEventListener('themeChange', updateBg);
      window.removeEventListener('tenantThemeUpdated', updateBg);
      window.removeEventListener('paletteChange', updateBg);
      window.removeEventListener('storage', updateBg);
    };
  }, [defaultFallback]);

  return bgColor;
}