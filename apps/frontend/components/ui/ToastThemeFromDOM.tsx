'use client';

import React, { useEffect, useState } from 'react';
import { ToastThemeProvider } from './ToastThemeProvider';

interface ToastThemeFromDOMProps {
  children: React.ReactNode;
}

/**
 * 🔥 Wrapper que lee el tema del tenant desde CSS variables del DOM
 * y se lo pasa a ToastThemeProvider.
 *
 * El tema se lee en el cliente (por eso 'use client') y se re-lee cuando
 * cambia `authChange` (login/logout) o cuando cambia el atributo `style` / `data-theme`
 * del <html>.
 */
export function ToastThemeFromDOM({ children }: ToastThemeFromDOMProps) {
  const [theme, setTheme] = useState({
    primary: '#F59E0B',
    textColor: '#FFFFFF',
    cardBg: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    isDarkBg: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readTheme = () => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);

      // 🔥 Leer los valores crudos (SIN fallback todavía)
      const bgColorRaw = styles.getPropertyValue('--bg-color').trim();
      const accentColor =
        styles.getPropertyValue('--accent-color').trim() || '#F59E0B';
      const textColorVar =
        styles.getPropertyValue('--text-color').trim();

      // 🔥 Si NO hay --bg-color, el sitio no definió un tema (admin/mi-cuenta sin tenant).
      //    En ese caso, asumimos TEMA CLARO por defecto (el diseño de Facilito es claro).
      //    El bug anterior era asumir OSCURO, que ponía texto blanco sobre fondo blanco.
      let isDark = false;
      if (bgColorRaw) {
        isDark = isDarkColor(bgColorRaw);
      }

      // 🔥 Prioridad del textColor:
      //   1. --text-color inyectado (tienda pública con tenant de color)
      //   2. Cálculo por bgColor (si hay --bg-color pero no --text-color)
      //   3. Fallback: si isDark → #fff, si no → #0f172a (claro)
      let textColor = textColorVar;
      if (!textColor) {
        textColor = isDark ? '#ffffff' : '#0f172a';
      }

      setTheme({
        primary: accentColor,
        textColor,
        cardBg: isDark
          ? 'rgba(15, 23, 42, 0.95)'
          : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.08)',
        isDarkBg: isDark,
      });
    };

    readTheme();

    // Re-leer cuando el tema cambia
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-theme'],
    });

    // Re-leer en login/logout
    window.addEventListener('authChange', readTheme);
    window.addEventListener('tenantFontChanged', readTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('authChange', readTheme);
      window.removeEventListener('tenantFontChanged', readTheme);
    };
  }, []);

  return <ToastThemeProvider {...theme}>{children}</ToastThemeProvider>;
}

/**
 * Detecta si un color (hex, rgb, hsl) es oscuro.
 */
function isDarkColor(color: string): boolean {
  if (!color) return false;

  const str = color.trim().toLowerCase();

  // Hex
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  // rgb(a)
  if (str.startsWith('rgb')) {
    const matches = str.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = Number(matches[0]);
      const g = Number(matches[1]);
      const b = Number(matches[2]);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    }
  }

  // Fallback: asumir CLARO (no oscuro) para no repetir el bug
  return false;
}