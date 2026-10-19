// ==========================================
// ARCHIVO: apps/frontend/app/error.tsx
// ==========================================
// Página de error para rutas individuales.
// Next.js la usa automáticamente cuando una ruta tira una excepción.
// NO necesita importación manual.
// Ver: https://nextjs.org/docs/app/api-reference/file-conventions/error
// ==========================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { APP_PALETTES } from './constants/palettes';
import { DEFAULT_THEME, getContrastTextColor } from '@/lib/branding';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const FACILITO_PALETTE = {
  id: 'facilito-default',
  name: DEFAULT_THEME.name,
  primary: DEFAULT_THEME.primaryColor,
  secondary: DEFAULT_THEME.secondaryColor,
  accent: DEFAULT_THEME.accentColor,
  background: DEFAULT_THEME.backgroundColor,
};

export default function Error({ error, reset }: ErrorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activePalette, setActivePalette] = useState(FACILITO_PALETTE);

  // 🔥 Lee el tema real (tenant > facilito > default) + CSS vars como refuerzo.
  // Orden de prioridad:
  //   1. CSS vars en <html> (--primary-color, --bg-color) — las setea el
  //      layout del tenant al renderizar; es la fuente más fresca.
  //   2. localStorage.tenant_theme — paleta editada por el admin del tenant.
  //   3. localStorage.selected_app_theme — paleta Facilito elegida.
  //   4. FACILITO_PALETTE — default.
  const readTheme = (): typeof FACILITO_PALETTE => {
    if (typeof window === 'undefined') return FACILITO_PALETTE;

    const readVar = (name: string): string | null => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      return v || null;
    };

    const cssPrimary = readVar('--primary-color') || readVar('--color-primary');
    const cssBackground =
      readVar('--bg-color') || readVar('--background-color');
    const cssAccent = readVar('--accent-color');
    const cssSecondary = readVar('--secondary-color');

    if (cssPrimary) {
      return {
        id: 'tenant-css',
        name: 'Tenant',
        primary: cssPrimary,
        secondary: cssSecondary || '#ffffff',
        accent: cssAccent || cssPrimary,
        background: cssBackground || '#ffffff',
      };
    }

    try {
      const tenantRaw = localStorage.getItem('tenant_theme');
      if (tenantRaw) {
        const t = JSON.parse(tenantRaw);
        if (t?.primaryColor) {
          return {
            id: 'tenant-ls',
            name: t.name || 'Tenant',
            primary: t.primaryColor,
            secondary: t.secondaryColor || '#ffffff',
            accent: t.accentColor || t.primaryColor,
            background: t.backgroundColor || '#ffffff',
          };
        }
      }
    } catch {}

    try {
      const savedId = localStorage.getItem('selected_app_theme');
      if (savedId) {
        const found = APP_PALETTES.find((p) => p.id === savedId);
        if (found) return found;
      }
    } catch {}

    return FACILITO_PALETTE;
  };

  useEffect(() => {
    setIsMounted(true);
    setActivePalette(readTheme());

    const syncTheme = () => {
      setActivePalette(readTheme());
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener('themeChange', syncTheme);
    window.addEventListener('tenantThemeUpdated', syncTheme);
    window.addEventListener('userThemeChange', syncTheme);
    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('themeChange', syncTheme);
      window.removeEventListener('tenantThemeUpdated', syncTheme);
      window.removeEventListener('userThemeChange', syncTheme);
    };
  }, []);

  useEffect(() => {
    // Log para debug (útil en dev y en prod para Sentry, etc.)
    console.error('[Error Boundary]', error);
  }, [error]);

  // 🔥 Contraste consistente con el resto de la app.
  // getContrastTextColor devuelve '#0f172a' (oscuro) o '#ffffff' (claro).
  const contrastColor = getContrastTextColor(activePalette.background);
  const isLight = contrastColor === '#0f172a';
  const textColorClass = isLight ? 'text-slate-900' : 'text-slate-100';
  const mutedTextColorClass = isLight ? 'text-slate-600' : 'text-slate-400';

  if (!isMounted) {
    return (
      <div
        className="min-h-screen flex flex-col bg-slate-950 text-slate-100"
        style={{ backgroundColor: FACILITO_PALETTE.background }}
      />
    );
  }

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center ${textColorClass} relative transition-colors duration-500 overflow-hidden px-6`}
      style={{ backgroundColor: activePalette.background }}
    >
      {/* Aura luminosa de fondo sutil */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 transition-all duration-700"
          style={{ backgroundColor: activePalette.primary }}
        />
      </div>

      <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center">

        {/* Logo minimalista superior */}
        <Link href="/" className="text-xl font-black tracking-tight mb-8 inline-block">
          facil<span style={{ color: activePalette.primary }}>i</span>to
        </Link>

        {/* Ícono de alerta SVG (sin emoji) */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            backgroundColor: `${activePalette.primary}20`,
            border: `2px solid ${activePalette.primary}40`,
          }}
        >
          <svg
            className="w-10 h-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: activePalette.primary }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black tracking-tighter mb-4 opacity-90"
          style={{ color: activePalette.primary }}
        >
          Ups
        </h1>

        <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${textColorClass}`}>
          Algo salió mal
        </h2>

        <p className={`text-sm sm:text-base ${mutedTextColorClass} leading-relaxed mb-8`}>
          No pudimos cargar esta sección. Probá de nuevo en unos segundos. Si el problema sigue, volvé al inicio.
        </p>

        {/* Bloque de debug solo en dev */}
        {isDev && error?.message && (
          <div
            className="w-full mb-6 p-4 rounded-xl border text-left text-xs font-mono overflow-auto max-h-32"
            style={{
              backgroundColor: `${activePalette.primary}10`,
              borderColor: `${activePalette.primary}30`,
              color: activePalette.primary,
            }}
          >
            <strong>Debug:</strong> {error.message}
            {error.digest && <div className="mt-1 opacity-70">Digest: {error.digest}</div>}
          </div>
        )}

        {/* Botones */}
        <div className="w-full flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="flex-1 sm:flex-none inline-flex items-center justify-center font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer text-white"
            style={{
              backgroundColor: activePalette.primary,
              boxShadow: `0 10px 25px -5px ${activePalette.primary}50`,
            }}
          >
            Reintentar
          </button>

          <Link
            href="/"
            className="flex-1 sm:flex-none inline-flex items-center justify-center font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer border"
            style={{
              borderColor: `${activePalette.primary}40`,
              color: activePalette.primary,
            }}
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}