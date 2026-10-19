// frontend/app/context/ExchangeRateContext.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface ExchangeRates {
  USD: number;
  EUR: number;
  IVA: number;
}

interface ExchangeRateContextType {
  rates: ExchangeRates;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  refetch: () => Promise<void>;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export const ExchangeRateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { rates, loading, error, lastUpdate, refetch } = useExchangeRate();
  
  return (
    <ExchangeRateContext.Provider value={{ rates, loading, error, lastUpdate, refetch }}>
      {children}
    </ExchangeRateContext.Provider>
  );
};

export const useExchangeRateContext = (): ExchangeRateContextType => {
  const context = useContext(ExchangeRateContext);
  if (!context) {
    throw new Error('useExchangeRateContext must be used within ExchangeRateProvider');
  }
  return context;
};