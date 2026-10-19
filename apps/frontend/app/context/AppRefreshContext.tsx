'use client';

import React, { createContext, useContext, ReactNode, useRef, useCallback, useEffect, useState } from 'react';

interface AppRefreshContextProps {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  registerComponent: (id: string, refreshFn: () => Promise<void>) => void;
  unregisterComponent: (id: string) => void;
  triggerRefresh: (eventName?: string, data?: any) => void;
}

// 🔥 CONTEXTO CON FUNCIONES VACÍAS POR DEFECTO (NO LANZA ERROR)
const defaultContext: AppRefreshContextProps = {
  refresh: async () => {},
  isRefreshing: false,
  lastRefresh: null,
  registerComponent: () => {},
  unregisterComponent: () => {},
  triggerRefresh: () => {},
};

const AppRefreshContext = createContext<AppRefreshContextProps>(defaultContext);

interface AppRefreshProviderProps {
  children: ReactNode;
  enabled?: boolean;
  interval?: number;
  onRefresh?: () => Promise<void>;
}

export function AppRefreshProvider({
  children,
  enabled = true,
  interval = 30000,
  onRefresh,
}: AppRefreshProviderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const componentsRef = useRef<Map<string, () => Promise<void>>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const registerComponent = useCallback((id: string, refreshFn: () => Promise<void>) => {
    if (!componentsRef.current.has(id)) {
      componentsRef.current.set(id, refreshFn);
      console.log(`🔔 [AppRefresh] Componente registrado: ${id} (${componentsRef.current.size} total)`);
    }
  }, []);

  const unregisterComponent = useCallback((id: string) => {
    componentsRef.current.delete(id);
    console.log(`🔔 [AppRefresh] Componente desregistrado: ${id} (${componentsRef.current.size} restantes)`);
  }, []);

  const refreshAll = useCallback(async () => {
    if (isRefreshing || !enabled || !isMounted.current) return;

    setIsRefreshing(true);
    console.log(`🔄 [AppRefresh] Refrescando ${componentsRef.current.size} componentes...`);

    try {
      if (onRefresh) {
        await onRefresh();
      }

      const promises = Array.from(componentsRef.current.values()).map(fn => fn());
      await Promise.allSettled(promises);

      setLastRefresh(new Date());

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appRefresh', {
          detail: { timestamp: new Date().toISOString() }
        }));
        window.dispatchEvent(new CustomEvent('globalRefresh'));
      }

      console.log('✅ [AppRefresh] Todos los componentes refrescados');
    } catch (error) {
      console.error('❌ [AppRefresh] Error en refresh:', error);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [enabled, isRefreshing, onRefresh]);

  const triggerRefresh = useCallback((eventName: string = 'globalRefresh', data?: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
      if (eventName !== 'globalRefresh') {
        window.dispatchEvent(new CustomEvent('globalRefresh', { detail: data }));
      }
    }
    refreshAll();
  }, [refreshAll]);

  // Iniciar polling
  useEffect(() => {
    isMounted.current = true;

    if (!enabled) return;

    refreshAll();

    intervalRef.current = setInterval(refreshAll, interval);

    const handleManualRefresh = () => {
      refreshAll();
    };

    window.addEventListener('manualRefresh', handleManualRefresh);
    window.addEventListener('globalRefresh', handleManualRefresh);
    window.addEventListener('notificationUpdate', handleManualRefresh);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('manualRefresh', handleManualRefresh);
      window.removeEventListener('globalRefresh', handleManualRefresh);
      window.removeEventListener('notificationUpdate', handleManualRefresh);
    };
  }, [enabled, interval, refreshAll]);

  return (
    <AppRefreshContext.Provider
      value={{
        refresh: refreshAll,
        isRefreshing,
        lastRefresh,
        registerComponent,
        unregisterComponent,
        triggerRefresh,
      }}
    >
      {children}
    </AppRefreshContext.Provider>
  );
}

// 🔥🔥🔥 HOOK SEGURO - NUNCA LANZA ERROR 🔥🔥🔥
export function useAppRefreshContext(): AppRefreshContextProps {
  const context = useContext(AppRefreshContext);
  // ✅ SI NO HAY CONTEXTO, DEVUELVE FUNCIONES VACÍAS EN LUGAR DE LANZAR ERROR
  if (context === undefined) {
    console.warn('⚠️ [useAppRefreshContext] Usado fuera de AppRefreshProvider - devolviendo funciones vacías');
    return defaultContext;
  }
  return context;
}