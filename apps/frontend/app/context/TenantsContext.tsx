// app/context/TenantsContext.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useTenants, Tenant } from '@/hooks/useTenants';

interface TenantsContextType {
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TenantsContext = createContext<TenantsContextType | undefined>(undefined);

export const TenantsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { tenants, isLoading, error, refresh } = useTenants();

  return (
    <TenantsContext.Provider value={{ tenants, isLoading, error, refresh }}>
      {children}
    </TenantsContext.Provider>
  );
};

export const useTenantsContext = (): TenantsContextType => {
  const context = useContext(TenantsContext);
  if (!context) {
    throw new Error('useTenantsContext must be used within TenantsProvider');
  }
  return context;
};