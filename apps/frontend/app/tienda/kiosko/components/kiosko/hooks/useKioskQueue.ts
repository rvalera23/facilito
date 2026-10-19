'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// ============================================================
// TIPOS
// ============================================================
export interface QueueNowItem {
  turnNumber: string;
  serviceName: string;
  professionalName: string | null;
  startTime: string;
  endTime: string;
  remainingMinutes: number;
}

export interface QueueNextItem {
  turnNumber: string;
  serviceName: string;
  startTime: string;
  durationMinutes: number;
}

export interface QueueWaiting {
  count: number;
  estimatedMinutes: number;
}

export interface QueueUpcomingItem {
  time: string;
  name: string;
  turnNumber: string;
}

export interface QueueUpcomingDay {
  date: string;
  items: QueueUpcomingItem[];
}

export interface QueueResponse {
  now: QueueNowItem[];
  next: QueueNextItem[];
  waiting: QueueWaiting;
  upcoming: QueueUpcomingDay[];
  updatedAt: string;
}

// ============================================================
// HOOK useKioskQueue
// ============================================================
// Consume `/terminals/kiosk/:token/queue` con polling.
// Recibe el token y la config del kiosko como props, porque
// la cartelera ya no vive dentro del KioskStoreLayout (que es
// quien provee el KioskContext). Antes leía del contexto, pero
// eso rompía cuando la cartelera se renderizaba fuera del layout.
// ============================================================
interface UseKioskQueueOptions {
  token: string | null | undefined;
  settings?: {
    queue?: {
      enabled?: boolean;
      refreshIntervalSeconds?: number;
    };
  } | null;
  refreshIntervalSeconds?: number;
}

export function useKioskQueue({
  token,
  settings,
  refreshIntervalSeconds,
}: UseKioskQueueOptions) {
  const enabled = settings?.queue?.enabled !== false; // default true
  const refreshSeconds =
    refreshIntervalSeconds ??
    settings?.queue?.refreshIntervalSeconds ??
    5;

  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    if (!token) {
      setError('Token de kiosko no disponible');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/terminals/kiosk/${encodeURIComponent(token)}/queue`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const json: QueueResponse = await response.json();
      setData(json);
      setError(null);
      hasLoadedOnceRef.current = true;
    } catch (err: any) {
      if (!hasLoadedOnceRef.current) {
        setError(err?.message || 'Error de conexión con el servidor');
      } else {
        console.warn('[useKioskQueue] fetch falló, manteniendo dato previo:', err?.message);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (!enabled || !token) {
      setLoading(false);
      return;
    }

    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, refreshSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, token, refreshSeconds, fetchQueue]);

  return {
    now: data?.now ?? [],
    next: data?.next ?? [],
    waiting: data?.waiting ?? { count: 0, estimatedMinutes: 0 },
    upcoming: data?.upcoming ?? [],
    updatedAt: data?.updatedAt ?? null,
    loading,
    error,
    refresh,
  };
}