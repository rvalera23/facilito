// frontend/hooks/useNotificationsCount.ts

import { useState, useEffect, useRef, useCallback } from 'react';

export function useNotificationsCount(
  userId: string,
  sourceType: 'user' | 'tenant' = 'user',
  tenantId?: string
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // 🔥 USAR REFS PARA ALMACENAR LOS VALORES MÁS RECIENTES
  const userIdRef = useRef(userId);
  const tenantIdRef = useRef(tenantId);
  const sourceTypeRef = useRef(sourceType);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  // 🔥 ACTUALIZAR REFS CUANDO CAMBIEN LAS PROPS
  useEffect(() => {
    userIdRef.current = userId;
    tenantIdRef.current = tenantId;
    sourceTypeRef.current = sourceType;
    console.log('🔍 [useNotificationsCount] Props actualizadas:', { userId, tenantId, sourceType });
  }, [userId, tenantId, sourceType]);

  // 🔥 FUNCIÓN PARA OBTENER EL CONTADOR (usa REFS siempre)
  const fetchCount = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const currentTenantId = tenantIdRef.current;
    const currentSourceType = sourceTypeRef.current;

    console.log('🔍 [useNotificationsCount] ===== INICIO fetchCount =====');
    console.log('🔍 [useNotificationsCount] userId (ref):', currentUserId);
    console.log('🔍 [useNotificationsCount] sourceType (ref):', currentSourceType);
    console.log('🔍 [useNotificationsCount] tenantId (ref):', currentTenantId);
    console.log('🔍 [useNotificationsCount] isFetchingRef.current:', isFetchingRef.current);
    console.log('🔍 [useNotificationsCount] isMountedRef.current:', isMountedRef.current);

    if (isFetchingRef.current) {
      console.log('⛔ [useNotificationsCount] Ya hay una petición en curso, cancelando...');
      return;
    }

    if (!currentUserId) {
      console.log('⛔ [useNotificationsCount] userId vacío, cancelando...');
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    if (!isMountedRef.current) {
      console.log('⛔ [useNotificationsCount] Componente desmontado, cancelando...');
      return;
    }

    isFetchingRef.current = true;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⛔ [useNotificationsCount] No hay token, cancelando...');
        if (isMountedRef.current) {
          setLoading(false);
        }
        isFetchingRef.current = false;
        return;
      }

      let url = '';
      if (currentSourceType === 'tenant' && currentTenantId) {
        url = `${apiBase}/notifications/tenant/${currentTenantId}/unread/count?source=seller`;
      } else {
        url = `${apiBase}/notifications/user/${currentUserId}/unread/count?source=buyer`;
      }

      console.log(`🔔 [useNotificationsCount] Fetching: ${url}`);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log(`🔔 [useNotificationsCount] Response status: ${res.status}`);

      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        console.log('🔔 [useNotificationsCount] Data recibida:', data);
        
        const count = data.count || data.unreadCount || 0;
        console.log(`🔔 [useNotificationsCount] ✅ Nuevo contador: ${count}`);
        
        setUnreadCount(count);
      } else if (res.status === 404) {
        console.error('❌ [useNotificationsCount] Endpoint no encontrado (404):', url);
        if (isMountedRef.current) {
          setUnreadCount(0);
        }
      } else {
        console.error(`❌ [useNotificationsCount] Error HTTP ${res.status}:`, url);
        if (isMountedRef.current) {
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('❌ [useNotificationsCount] Error en fetchCount:', error);
      if (isMountedRef.current) {
        setUnreadCount(0);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
      console.log('🔍 [useNotificationsCount] ===== FIN fetchCount =====');
    }
  }, [apiBase]);

  // 🔥 CARGA INICIAL - SIEMPRE ejecutar
  useEffect(() => {
    console.log('🔍 [useNotificationsCount] ===== useEffect CARGA INICIAL =====');
    isMountedRef.current = true;
    
    // 🔥 SIEMPRE ejecutar fetchCount, incluso si userId está vacío (el fetch lo manejará)
    fetchCount();

    // 🔥 POLLING: Actualizar cada 30 segundos (respaldo)
    const intervalId = setInterval(() => {
      if (isMountedRef.current && !isFetchingRef.current) {
        console.log('🔄 [useNotificationsCount] Polling: actualizando contador...');
        fetchCount();
      }
    }, 30000);

    return () => {
      console.log('🔍 [useNotificationsCount] ===== Desmontando componente =====');
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔥 ESCUCHAR EVENTOS GLOBALES - SIEMPRE activo
  useEffect(() => {
    console.log('🔍 [useNotificationsCount] ===== useEffect EVENTOS =====');
    
    const handleRefresh = () => {
      console.log('🔔 [useNotificationsCount] Evento recibido, refrescando...');
      if (isMountedRef.current && !isFetchingRef.current) {
        fetchCount();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current && !isFetchingRef.current) {
        console.log('👁️ [useNotificationsCount] Pestaña visible, refrescando...');
        fetchCount();
      }
    };

    // Escuchar múltiples eventos
    window.addEventListener('notificationUpdate', handleRefresh);
    window.addEventListener('globalRefresh', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🔍 [useNotificationsCount] ===== Eliminando eventos =====');
      window.removeEventListener('notificationUpdate', handleRefresh);
      window.removeEventListener('globalRefresh', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCount]);

  // 🔥 EXPONER unreadCount para debug en consola
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__unreadCount = unreadCount;
      console.log(`📊 [useNotificationsCount] window.__unreadCount = ${unreadCount}`);
    }
  }, [unreadCount]);

  return { unreadCount, loading, refresh: fetchCount };
}