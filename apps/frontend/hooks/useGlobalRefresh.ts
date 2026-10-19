// frontend/hooks/useGlobalRefresh.ts

'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UseGlobalRefreshOptions {
  /** ID único del componente para debugging */
  id: string;
  /** Función que se ejecutará en cada refresco */
  onRefresh: () => Promise<void> | void;
  /** Eventos específicos a escuchar (opcional) */
  events?: string[];
  /** Si está habilitado */
  enabled?: boolean;
}

/**
 * 🔥 HOOK PARA SUSCRIBIR CUALQUIER COMPONENTE AL REFRESCO GLOBAL
 * 
 * USO:
 * useGlobalRefresh({
 *   id: 'OrderList',
 *   onRefresh: fetchOrders,
 *   events: ['orderCreated', 'orderUpdated']
 * });
 */
export function useGlobalRefresh({
  id,
  onRefresh,
  events = [],
  enabled = true,
}: UseGlobalRefreshOptions) {
  const isMounted = useRef(true);
  const refreshFn = useRef(onRefresh);

  // Mantener la función actualizada
  useEffect(() => {
    refreshFn.current = onRefresh;
  }, [onRefresh]);

  const executeRefresh = useCallback(async () => {
    if (!enabled || !isMounted.current) return;
    try {
      await refreshFn.current();
    } catch (error) {
      console.error(`❌ [${id}] Error en refresh:`, error);
    }
  }, [id, enabled]);

  // Registrar eventos
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Escuchar eventos globales (siempre activos)
    const handleGlobalRefresh = () => executeRefresh();
    const handleNotificationUpdate = () => executeRefresh();

    // Escuchar eventos específicos
    const handleCustomEvent = () => executeRefresh();

    // Registrar listeners globales
    window.addEventListener('globalRefresh', handleGlobalRefresh);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);

    // Registrar eventos específicos
    events.forEach(eventName => {
      window.addEventListener(eventName, handleCustomEvent);
    });

    console.log(`✅ [${id}] Suscrito a refresco global`);

    return () => {
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleCustomEvent);
      });
      console.log(`🗑️ [${id}] Desuscrito de refresco global`);
    };
  }, [id, events, enabled, executeRefresh]);

  // Función para disparar refresh manual
  const triggerRefresh = useCallback(() => {
    executeRefresh();
  }, [executeRefresh]);

  return { triggerRefresh };
}

/**
 * 🔥 FUNCIÓN GLOBAL PARA DISPARAR REFRESCO DESDE CUALQUIER LUGAR
 * 
 * USO:
 * triggerGlobalRefresh('orderCreated', { orderId: '123' });
 */
export const triggerGlobalRefresh = (eventName?: string, data?: any) => {
  if (typeof window === 'undefined') return;
  
  // Siempre disparar globalRefresh
  window.dispatchEvent(new CustomEvent('globalRefresh', { detail: data }));
  
  // Disparar evento específico si se proporciona
  if (eventName) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    console.log(`🔄 [triggerGlobalRefresh] Disparado: ${eventName}`);
  }
};

/**
 * 🔥 FUNCIÓN PARA DISPARAR ACTUALIZACIÓN DE NOTIFICACIONES
 */
export const triggerNotificationUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('notificationUpdate'));
  console.log('🔔 [triggerNotificationUpdate] Notificaciones actualizadas');
};