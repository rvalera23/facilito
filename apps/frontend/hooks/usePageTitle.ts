'use client';

import { useEffect } from 'react';

interface UsePageTitleOptions {
  title?: string;
  tenantName?: string;
  slogan?: string;
  fallback?: string;
}

export function usePageTitle({ 
  title, 
  tenantName, 
  slogan, 
  fallback = 'facilitó — Crea tu negocio virtual en minutos' 
}: UsePageTitleOptions = {}) {
  useEffect(() => {
    // Si hay título específico, usarlo
    if (title) {
      document.title = title;
      return;
    }

    // Si hay tenantName, usarlo con el eslogan
    if (tenantName) {
      const fullTitle = slogan 
        ? `${tenantName} — ${slogan}`
        : `${tenantName} | facilitó`;
      document.title = fullTitle;
      return;
    }

    // Fallback
    document.title = fallback;
  }, [title, tenantName, slogan, fallback]);
}

// 🔥 FUNCIÓN PARA USAR DESDE CUALQUIER LUGAR (sin hook)
export const setPageTitle = (newTitle: string) => {
  if (typeof document !== 'undefined') {
    document.title = newTitle;
  }
};