'use client';

import React, { createContext, useContext } from 'react';

export interface ToastTheme {
  primary: string;
  textColor: string;
  cardBg: string;
  borderColor: string;
  isDarkBg: boolean;
}

// 🔥 Tema por defecto (fallback si no hay ToastThemeProvider montado)
const DEFAULT_TOAST_THEME: ToastTheme = {
  primary: '#f97316',
  textColor: '#ffffff',
  cardBg: 'rgba(15, 23, 42, 0.95)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  isDarkBg: true,
};

const ToastThemeContext = createContext<ToastTheme>(DEFAULT_TOAST_THEME);

export function ToastThemeProvider({
  children,
  primary,
  textColor,
  cardBg,
  borderColor,
  isDarkBg,
}: {
  children: React.ReactNode;
} & ToastTheme) {
  const value: ToastTheme = { primary, textColor, cardBg, borderColor, isDarkBg };
  return (
    <ToastThemeContext.Provider value={value}>
      {children}
    </ToastThemeContext.Provider>
  );
}

export function useToastTheme(): ToastTheme {
  return useContext(ToastThemeContext);
}