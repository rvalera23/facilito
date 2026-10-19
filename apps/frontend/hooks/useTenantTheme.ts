// frontend/hooks/useTenantTheme.ts
// ============================================================
// 🔥 Hook compartido para cargar el tema del tenant
// ============================================================
// Usado por /profesional y /repartidor para heredar los colores
// y fuente de la tienda a la que pertenecen.
//
// Fuente de verdad: GET /tenants/:id (backend).
// Fallback: DEFAULT_THEME.
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_THEME } from '@/lib/branding';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontWeight: number;
  name: string;
}

const DEFAULT_TENANT_THEME: TenantTheme = {
  primaryColor: DEFAULT_THEME.primaryColor,
  secondaryColor: DEFAULT_THEME.secondaryColor,
  accentColor: DEFAULT_THEME.accentColor,
  backgroundColor: DEFAULT_THEME.backgroundColor,
  fontFamily: 'Quicksand',
  fontWeight: 400,
  name: 'Facilito',
};

/**
 * Calcula si el texto debe ser claro u oscuro según el fondo.
 */
export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#ffffff';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
}

/**
 * Carga el tema del tenant desde el backend.
 *
 * @param tenantId - UUID del tenant. Si es null/undefined, no fetchea.
 * @returns Theme + derivados (textColor, textMuted, borderDynamic, cardBg)
 */
export function useTenantTheme(tenantId: string | null | undefined) {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_TENANT_THEME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTheme = useCallback(async () => {
    if (!tenantId) {
      setTheme(DEFAULT_TENANT_THEME);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const res = await fetch(`${API_BASE}/tenants/${tenantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const tenant = await res.json();

      const nextTheme: TenantTheme = {
        primaryColor:
          tenant?.primaryColor ||
          tenant?.primary_color ||
          DEFAULT_THEME.primaryColor,
        secondaryColor:
          tenant?.secondaryColor ||
          tenant?.secondary_color ||
          DEFAULT_THEME.secondaryColor,
        accentColor:
          tenant?.accentColor ||
          tenant?.accent_color ||
          DEFAULT_THEME.accentColor,
        backgroundColor:
          tenant?.backgroundColor ||
          tenant?.background_color ||
          DEFAULT_THEME.backgroundColor,
        fontFamily:
          tenant?.fontFamily || tenant?.font_family || 'Quicksand',
        fontWeight: Number(tenant?.fontWeight || tenant?.font_weight || 400),
        name: tenant?.name || 'Mi Tienda',
      };

      setTheme(nextTheme);
    } catch (err: any) {
      console.warn(
        '[useTenantTheme] No se pudo cargar el tema del tenant:',
        err?.message,
      );
      setError(err?.message || 'Error cargando tema');
      // Mantener el default en caso de error (no romper el panel).
      setTheme(DEFAULT_TENANT_THEME);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Carga inicial + recarga cuando cambia el tenantId.
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // 🔥 Reaccionar a cambios de tema en vivo (si el admin lo cambia).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleThemeUpdate = () => {
      loadTheme();
    };

    window.addEventListener('tenantThemeUpdated', handleThemeUpdate);
    window.addEventListener('storage', handleThemeUpdate);

    return () => {
      window.removeEventListener('tenantThemeUpdated', handleThemeUpdate);
      window.removeEventListener('storage', handleThemeUpdate);
    };
  }, [loadTheme]);

  // 🔥 Aplicar la fuente al <body> cuando cambia (mismo patrón que mi-cuenta).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!theme.fontFamily) return;

    const family = theme.fontFamily;

    // Cargar Google Font si no es Quicksand
    if (family !== 'Quicksand') {
      const fontId = `font-${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          family,
        )}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    }

    const fontStack =
      family === 'Quicksand'
        ? 'var(--font-quicksand), Quicksand, sans-serif'
        : `'${family}', sans-serif`;

    document.documentElement.style.fontFamily = fontStack;
    document.body.style.fontFamily = fontStack;
  }, [theme.fontFamily]);

  // ---- Derivados ----
  const textColor = getContrastTextColor(theme.backgroundColor);
  const isDarkBg = textColor === '#ffffff';

  // Texto secundario y bordes (hex, no clases Tailwind)
  const textMuted = isDarkBg ? '#94a3b8' : '#64748b';

  // Borde dinámico para contenedores
  const borderDynamic = isDarkBg
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(0,0,0,0.08)';

  // Fondo de cards internas
  const cardBg = isDarkBg
    ? 'rgba(0,0,0,0.25)'
    : 'rgba(255,255,255,0.6)';

  return {
    // Tema crudo
    theme,

    // Colores principales
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    accent: theme.accentColor,
    background: theme.backgroundColor,

    // Derivados de layout
    textColor,
    textMuted,
    isDarkBg,
    borderDynamic,
    cardBg,

    // Tipografía
    fontFamily: theme.fontFamily,
    fontWeight: theme.fontWeight,
    name: theme.name,

    // Estado
    loading,
    error,
    reload: loadTheme,
  };
}