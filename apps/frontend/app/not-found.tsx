// ==========================================
// ARCHIVO: apps/frontend/app/not-found.tsx
// ==========================================
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { APP_PALETTES } from './constants/palettes';
import { DEFAULT_THEME, getContrastTextColor } from '@/lib/branding';

const FACILITO_PALETTE = {
  id: 'facilito-default',
  name: DEFAULT_THEME.name,
  primary: DEFAULT_THEME.primaryColor,
  secondary: DEFAULT_THEME.secondaryColor,
  accent: DEFAULT_THEME.accentColor,
  background: DEFAULT_THEME.backgroundColor,
};

export default function NotFound() {
  const [isMounted, setIsMounted] = useState(false);
  const [activePalette, setActivePalette] = useState(FACILITO_PALETTE);

  // 🔥 Lee el tema real (tenant > facilito > default) + CSS vars como refuerzo.
  // Mismo patrón que app/error.tsx.
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

  // 🔥 Contraste consistente con el resto de la app.
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

        {/* 404 Gigante y elegante */}
        <h1 
          className="text-7xl sm:text-8xl font-black tracking-tighter mb-4 opacity-90"
          style={{ color: activePalette.primary }}
        >
          404
        </h1>

        <h2 className={`text-xl sm:text-2xl font-bold mb-3 ${textColorClass}`}>
          Página no encontrada
        </h2>

        <p className={`text-sm sm:text-base ${mutedTextColorClass} leading-relaxed mb-8`}>
          La página que buscas no existe o fue movida. Comprueba que la dirección sea correcta o regresa al inicio para continuar.
        </p>

        {/* Botón principal */}
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer text-white"
          style={{ 
            backgroundColor: activePalette.primary, 
            boxShadow: `0 10px 25px -5px ${activePalette.primary}50` 
          }}
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}