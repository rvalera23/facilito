// frontend/hooks/useNotificationsCount.ts

import { useState, useEffect, useCallback, useRef } from 'react';

export function useNotificationsCount(
  userId: string, 
  sourceType: 'user' | 'tenant' = 'user', 
  tenantId?: string
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔥 REFS PARA GUARDAR VALORES QUE NO DEBEN CAUSAR RE-RENDER
  const userIdRef = useRef(userId);
  const sourceTypeRef = useRef(sourceType);
  const tenantIdRef = useRef(tenantId);

  // 🔥 ACTUALIZAR REFS CUANDO CAMBIAN
  useEffect(() => {
    userIdRef.current = userId;
    sourceTypeRef.current = sourceType;
    tenantIdRef.current = tenantId;
  }, [userId, sourceType, tenantId]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // 🔥 FUNCIÓN DE REFRESH - SIN DEPENDENCIAS EXTERNAS
  const refresh = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const currentSourceType = sourceTypeRef.current;
    const currentTenantId = tenantIdRef.current;

    if (!currentUserId || !isMountedRef.current || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const token = localStorage.getItem('token');
      
      let url = '';
      if (currentSourceType === 'tenant' && currentTenantId) {
        url = `${API_BASE}/notifications/tenant/${currentTenantId}/unread-count`;
      } else {
        url = `${API_BASE}/notifications/user/${currentUserId}/unread-count`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        setUnreadCount(data.count || data.unreadCount || 0);
      }
    } catch (error) {
      // Silencioso en producción
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [API_BASE]); // 🔥 SOLO DEPENDE DE API_BASE

  // 🔥 CARGA INICIAL - SOLO UNA VEZ
  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // 🔥 SIN DEPENDENCIAS

  // 🔥 POLLING CADA 30 SEGUNDOS
  useEffect(() => {
    if (!userId) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        refresh();
      }
    }, 30000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [userId]); // 🔥 SOLO DEPENDE DE userId

  // 🔥 ESCUCHAR EVENTOS - SIN DEPENDENCIAS PROBLEMÁTICAS
  useEffect(() => {
    const handleUpdate = () => {
      if (isMountedRef.current) {
        refresh();
      }
    };

    window.addEventListener('notificationUpdate', handleUpdate);

    return () => {
      window.removeEventListener('notificationUpdate', handleUpdate);
    };
  }, []); // 🔥 SIN DEPENDENCIAS - SOLO UNA VEZ

  return { unreadCount, loading, refresh };
}