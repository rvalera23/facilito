'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface IvaContextType {
  showIVA: boolean;
  toggleIVA: () => void;
  setShowIVA: (value: boolean) => void;
  isLoading: boolean;
}

const IvaContext = createContext<IvaContextType | undefined>(undefined);

export function IvaProvider({ children }: { children: ReactNode }) {
  const [showIVA, setShowIVA] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar preferencia desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('showIVA');
      if (saved !== null) {
        setShowIVA(saved === 'true');
      }
    } catch (e) {
      console.error('Error al cargar preferencia de IVA:', e);
    }
    setIsLoading(false);
  }, []);

  // Guardar preferencia cuando cambia
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('showIVA', String(showIVA));
      } catch (e) {
        console.error('Error al guardar preferencia de IVA:', e);
      }
    }
  }, [showIVA, isLoading]);

  const toggleIVA = () => setShowIVA(prev => !prev);

  return (
    <IvaContext.Provider value={{ showIVA, toggleIVA, setShowIVA, isLoading }}>
      {children}
    </IvaContext.Provider>
  );
}

export function useIVA() {
  const context = useContext(IvaContext);
  if (context === undefined) {
    throw new Error('useIVA debe usarse dentro de un IvaProvider');
  }
  return context;
}