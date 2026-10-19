  'use client';

  // ============================================================
  // ARCHIVO: apps/frontend/hooks/useOrderTracking.ts
  // Tracking unificado de una orden:
  //   1. Fetch inicial: assignment + ETA.
  //   2. WebSocket para actualizaciones en vivo.
  //   3. Polling fallback cada 15s si el WS no conecta.
  // ============================================================

  import { useEffect, useMemo, useState } from 'react';
  import { apiFetch } from '@/lib/api';
  import {
    useDeliverySocket,
    DriverPosition,
    EtaUpdate,
    DriverNearby,
    AssignmentUpdate,
  } from './useDeliverySocket';

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  export interface AssignmentData {
    id: string;
    orderId: string;
    driverId: string | null;
    status: string;
    assignedAt: string | null;
    acceptedAt: string | null;
    pickedUpAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    driver?: {
      id: string;
      userId: string;
      status: string;
      currentLat: number | null;
      currentLng: number | null;
      vehicleType: string | null;
      vehiclePlate: string | null;
      user?: {
        id: string;
        name: string;
        phone: string | null;
        avatarUrl: string | null;
      };
    } | null;
    order?: {
      id: string;
      customerName: string;
      tenantId: string;
      status: string;
      totalAmount: string;
      deliveryFeeCalculated: number | null;
      deliveryDistanceKm: number | null;
      deliveryEtaMinutes: number | null;
    };
  }

  export interface LiveEtaData {
    assignmentId: string;
    orderId: string;
    driverId: string | null;
    driverLat: number | null;
    driverLng: number | null;
    destinationLat: number | null;
    destinationLng: number | null;
    distanceKm: number | null;
    etaMinutes: number | null;
    isNearby: boolean;
    nearbyThresholdM: number;
    at: string;
  }

  interface UseOrderTrackingOptions {
    /** ID de la orden o booking a trackear. */
    orderId: string | null | undefined;
    /** Si false, no hace nada. */
    enabled?: boolean;
    /**
     * Tipo de tracking:
     *   - 'order'   → orden de producto (repartidor)
     *   - 'booking' → booking de servicio (profesional)
     * Default: 'order'
     */
    trackingType?: 'order' | 'booking';
  }

  interface UseOrderTrackingReturn {
    loading: boolean;
    error: string | null;
    assignment: AssignmentData | null;
    eta: LiveEtaData | null;
    driverPosition: DriverPosition | null;
    /** Última distancia reportada por el WS. Cae a `eta.distanceKm` si no hay. */
    liveDistanceKm: number | null;
    /** Últimos minutos reportados por el WS. Cae a `eta.etaMinutes` si no hay. */
    liveEtaMinutes: number | null;
    /** True cuando el WS reporta `driver_nearby` reciente (<2 min). */
    isNearby: boolean;
    /** Distancia en metros del último `driver_nearby` (si lo hay). */
    nearbyDistanceM: number | null;
    /** Estado actual de la assignment (fallback a `assignment.status`). */
    status: string | null;
    /** Recargar manualmente. */
    refresh: () => void;
  }

  export function useOrderTracking({
    orderId,
    enabled = true,
    trackingType = 'order',
  }: UseOrderTrackingOptions): UseOrderTrackingReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignment, setAssignment] = useState<AssignmentData | null>(null);
    const [eta, setEta] = useState<LiveEtaData | null>(null);
    const [tick, setTick] = useState(0);

    // WS del delivery
    const ws = useDeliverySocket({
      orderId,
      enabled: enabled && Boolean(orderId),
    });

    // Fetch inicial: assignment + eta
    useEffect(() => {
      if (!enabled || !orderId) {
        setAssignment(null);
        setEta(null);
        setError(null);
        return;
      }

      let cancelled = false;

      (async () => {
        setLoading(true);
        setError(null);

        try {
          // 1. Assignment (endpoint público de tracking — válido para buyer/admin/repartidor)
          //    trackingType = 'order'   → /delivery/tracking/order/:id
          //    trackingType = 'booking' → /delivery/tracking/booking/:id
          const assignmentRes = await apiFetch(
            `/delivery/tracking/${trackingType}/${orderId}`,
          );

          if (cancelled) return;

          if (!assignmentRes.ok) {
            if (assignmentRes.status === 404) {
              // No hay assignment (orden sin delivery asignado)
              setAssignment(null);
              setEta(null);
              setLoading(false);
              return;
            }
            throw new Error(`HTTP ${assignmentRes.status}`);
          }

          const assignmentData: AssignmentData | null = await assignmentRes.json();
          if (cancelled) return;
          setAssignment(assignmentData);

          // 2. ETA (solo si hay assignment)
          // Usa el endpoint público de tracking (válido para buyer/admin/repartidor).
          if (assignmentData?.id) {
            const etaRes = await apiFetch(
              `/delivery/tracking/${trackingType}/${orderId}/eta`,
            );
            if (cancelled) return;
            if (etaRes.ok) {
              const etaData: LiveEtaData = await etaRes.json();
              setEta(etaData);
            }
          }
        } catch (err: any) {
          if (cancelled) return;
          setError(err?.message || 'Error cargando tracking');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [orderId, enabled, tick, trackingType]);
    
    // Polling fallback: si el WS no conecta en 3s, refresca cada 15s
    useEffect(() => {
      if (!enabled || !orderId) return;
      if (ws.connected && ws.authenticated) return;

      const timeout = setTimeout(() => {
        // Después de 3s, empujamos un tick cada 15s
        const interval = setInterval(() => {
          setTick((t) => t + 1);
        }, 15000);

        // Guardar el interval para limpiarlo
        (ws as any)._pollingInterval = interval;
      }, 3000);

      return () => {
        clearTimeout(timeout);
        const interval = (ws as any)._pollingInterval;
        if (interval) clearInterval(interval);
      };
    }, [enabled, orderId, ws.connected, ws.authenticated]);

    // Valores finales (con fallback de WS → fetch → null)
    const liveDistanceKm = useMemo(() => {
      if (ws.etaUpdate?.distanceKm != null) return ws.etaUpdate.distanceKm;
      return eta?.distanceKm ?? null;
    }, [ws.etaUpdate?.distanceKm, eta?.distanceKm]);

    const liveEtaMinutes = useMemo(() => {
      if (ws.etaUpdate?.etaMinutes != null) return ws.etaUpdate.etaMinutes;
      return eta?.etaMinutes ?? null;
    }, [ws.etaUpdate?.etaMinutes, eta?.etaMinutes]);

    const status = useMemo(() => {
      if (ws.assignmentUpdate?.status) return ws.assignmentUpdate.status;
      return assignment?.status ?? null;
    }, [ws.assignmentUpdate?.status, assignment?.status]);

    // "Nearby" es válido por 2 minutos desde el último evento
    const isNearby = useMemo(() => {
      if (ws.driverNearby?.at) {
        const at = new Date(ws.driverNearby.at).getTime();
        if (Date.now() - at < 2 * 60 * 1000) return true;
      }
      return eta?.isNearby ?? false;
    }, [ws.driverNearby?.at, eta?.isNearby]);

    const refresh = () => setTick((t) => t + 1);

    return {
      loading,
      error,
      assignment,
      eta,
      driverPosition: ws.driverPosition,
      liveDistanceKm,
      liveEtaMinutes,
      isNearby,
      nearbyDistanceM: ws.driverNearby?.distanceM ?? null,
      status,
      refresh,
    };
  }


