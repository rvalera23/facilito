// frontend/hooks/useAppTheme.ts

'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_THEME } from '@/lib/branding';



// 🔥 CLAVES SEPARADAS
const TENANT_THEME_KEY = 'tenant_theme';
const USER_THEME_KEY = 'user_theme';

export const useAppTheme = (themeData?: any, pathname?: string) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  // Detectar contexto por URL
  const isMiCuenta = typeof window !== 'undefined' 
    ? (window.location.pathname === '/mi-cuenta' || window.location.pathname?.startsWith('/mi-cuenta/'))
    : (pathname === '/mi-cuenta' || pathname?.startsWith('/mi-cuenta/'));

  const isAdmin = typeof window !== 'undefined'
    ? (window.location.pathname?.startsWith('/admin/') || window.location.pathname === '/admin')
    : (pathname?.startsWith('/admin/') || pathname === '/admin');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 🔥 SI ES MI CUENTA: leer de user_theme
    if (isMiCuenta) {
      const saved = localStorage.getItem(USER_THEME_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTheme({
            primaryColor: parsed.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: parsed.secondaryColor || DEFAULT_THEME.secondaryColor,
            accentColor: parsed.accentColor || DEFAULT_THEME.accentColor,
            backgroundColor: parsed.backgroundColor || DEFAULT_THEME.backgroundColor,
            name: parsed.name || DEFAULT_THEME.name,
          });
        } catch {}
      }
      return;
    }

    // 🔥 SI ES ADMIN: leer de tenant_theme
    if (isAdmin) {
      const saved = localStorage.getItem(TENANT_THEME_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTheme({
            primaryColor: parsed.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: parsed.secondaryColor || DEFAULT_THEME.secondaryColor,
            accentColor: parsed.accentColor || DEFAULT_THEME.accentColor,
            backgroundColor: parsed.backgroundColor || DEFAULT_THEME.backgroundColor,
            name: parsed.name || DEFAULT_THEME.name,
          });
        } catch {}
      }
      return;
    }

    // 🔥 PÁGINA PÚBLICA: usar siempre DEFAULT_THEME
    setTheme(DEFAULT_THEME);
  }, [isMiCuenta, isAdmin]);

  // 🔥 Función para actualizar el tema según el contexto
  const updateTheme = (newTheme: any) => {
    if (typeof window === 'undefined') return;

    if (isMiCuenta) {
      localStorage.setItem(USER_THEME_KEY, JSON.stringify(newTheme));
      window.dispatchEvent(new CustomEvent('userThemeChange'));
    } else if (isAdmin) {
      localStorage.setItem(TENANT_THEME_KEY, JSON.stringify(newTheme));
      window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { detail: newTheme }));
    } else {
      console.warn('No se puede guardar tema en página pública');
    }

    setTheme(newTheme);
  };

  return {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    name: theme.name,
    currentTheme: theme,
    updateTheme,
    getCurrentTheme: () => theme,
    isMiCuenta,
    isAdmin,
  };
};