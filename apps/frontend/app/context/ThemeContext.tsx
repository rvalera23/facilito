// frontend/app/context/ThemeContext.tsx

'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  currentTheme: any;
  updateTheme: (theme: any) => void;
  syncFromTenant: (tenant: any) => any;
  syncFromUser: (user: any) => any;
  getCurrentTheme: () => any;
}

// 🔥 TEMA VACÍO PARA MI CUENTA Y ONBOARDING - CON LOS COLORES DE APP_PALETTES[0]
const EMPTY_THEME: ThemeContextType = {
  primaryColor: '#ea580c',
  secondaryColor: '#0f172a',
  accentColor: '#fbbf24',
  backgroundColor: '#0b0f19',
  currentTheme: null,
  updateTheme: () => {},
  syncFromTenant: () => null,
  syncFromUser: () => null,
  getCurrentTheme: () => null,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  
  // 🔥 DETECTAR MI CUENTA Y ONBOARDING - ANTES DE EJECUTAR CUALQUIER HOOK
  const isMiCuenta = useMemo(() => {
    return pathname === '/mi-cuenta' || pathname?.startsWith('/mi-cuenta/');
  }, [pathname]);

  const isOnboarding = useMemo(() => {
    return pathname === '/onboarding' || pathname?.startsWith('/onboarding/');
  }, [pathname]);

  console.log('🔍 [ThemeProvider] isMiCuenta:', isMiCuenta, 'isOnboarding:', isOnboarding, 'pathname:', pathname);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 🔥 SI ES MI CUENTA O ONBOARDING: TEMA VACÍO - NO EJECUTAR useAppTheme
  if (isMiCuenta || isOnboarding) {
    console.log('⏭️ [ThemeProvider] Mi Cuenta o Onboarding detectado - usando EMPTY_THEME');
    return (
      <ThemeContext.Provider value={EMPTY_THEME}>
        {children}
      </ThemeContext.Provider>
    );
  }

  // 🔥 SI NO ESTAMOS EN CLIENTE: TEMA VACÍO (SSR)
  if (!isClient) {
    return (
      <ThemeContext.Provider value={EMPTY_THEME}>
        {children}
      </ThemeContext.Provider>
    );
  }

  // ✅ RESTO DE LA APP: USA useAppTheme NORMAL
  console.log('🔧 [ThemeProvider] Usando useAppTheme para:', pathname);
  const theme = useAppTheme(undefined, pathname);

  return (
    <ThemeContext.Provider value={theme as ThemeContextType}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn('⚠️ useTheme usado fuera de ThemeProvider');
    return EMPTY_THEME;
  }
  return context;
}