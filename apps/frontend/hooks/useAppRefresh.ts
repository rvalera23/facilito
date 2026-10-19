// frontend/hooks/useAppRefresh.ts

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAppRefreshProps {
  enabled?: boolean;
  interval?: number; // en milisegundos
  onRefresh?: () => Promise<void>;
}

export function useAppRefresh({
  enabled = true,
  interval = 30000, // 30 segundos por defecto
  onRefresh,
}: UseAppRefreshProps = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 🔥 FUNCIÓN DE REFRESCO
  const refresh = useCallback(async () => {
    if (isRefreshing || !enabled || !isMountedRef.current) return;

    setIsRefreshing(true);
    try {
      console.log('🔄 [useAppRefresh] Refrescando datos globales...');
      
      if (onRefresh) {
        await onRefresh();
      }
      
      setLastRefresh(new Date());
      
      // 🔥 DISPARAR EVENTO GLOBAL PARA QUE OTROS COMPONENTES SE ACTUALICEN
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appRefresh', { 
          detail: { timestamp: new Date().toISOString() }
        }));
      }
    } catch (error) {
      console.error('❌ [useAppRefresh] Error en refresh:', error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [enabled, isRefreshing, onRefresh]);

  // 🔥 INICIAR POLLING
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!enabled) return;

    // Ejecutar refresh inmediato al montar
    refresh();

    // Configurar intervalo
    intervalRef.current = setInterval(refresh, interval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh]);

  // 🔥 ESCUCHAR EVENTOS DE REFRESCO MANUAL
  useEffect(() => {
    const handleManualRefresh = () => {
      refresh();
    };

    window.addEventListener('manualRefresh', handleManualRefresh);
    window.addEventListener('notificationUpdate', handleManualRefresh);

    return () => {
      window.removeEventListener('manualRefresh', handleManualRefresh);
      window.removeEventListener('notificationUpdate', handleManualRefresh);
    };
  }, [refresh]);

  return {
    refresh,
    isRefreshing,
    lastRefresh,
  };
}