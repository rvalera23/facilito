'use client';

// ============================================================
// ARCHIVO: apps/frontend/hooks/useDeliverySocket.ts
// Cliente WebSocket del namespace /delivery.
// Autentica con el token del localStorage y se suscribe a una orden.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface DriverPosition {
  driverId: string;
  lat: number;
  lng: number;
  at: string;
}

export interface EtaUpdate {
  orderId: string;
  assignmentId: string;
  distanceKm: number | null;
  etaMinutes: number | null;
  at: string;
}

export interface DriverNearby {
  orderId: string;
  assignmentId: string;
  distanceM: number | null;
  at: string;
}

export interface AssignmentUpdate {
  assignmentId: string;
  orderId: string;
  driverId?: string | null;
  status: string;
  at: string;
}

interface UseDeliverySocketOptions {
  /** Orden a la que suscribirse (opcional). */
  orderId?: string | null;
  /** driverId del propio usuario si es repartidor (para unirse al room). */
  driverId?: string | null;
  /** tenantId si es admin del tenant (para unirse al room). */
  tenantId?: string | null;
  /** Si false, no conecta (por ej. no autenticado). */
  enabled?: boolean;
}

interface UseDeliverySocketReturn {
  connected: boolean;
  authenticated: boolean;
  error: string | null;
  driverPosition: DriverPosition | null;
  etaUpdate: EtaUpdate | null;
  driverNearby: DriverNearby | null;
  assignmentUpdate: AssignmentUpdate | null;
  /** Vuelve a conectarse manualmente si hubo error. */
  reconnect: () => void;
}

export function useDeliverySocket({
  orderId,
  driverId,
  tenantId,
  enabled = true,
}: UseDeliverySocketOptions): UseDeliverySocketReturn {
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null);
  const [etaUpdate, setEtaUpdate] = useState<EtaUpdate | null>(null);
  const [driverNearby, setDriverNearby] = useState<DriverNearby | null>(null);
  const [assignmentUpdate, setAssignmentUpdate] = useState<AssignmentUpdate | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const orderIdRef = useRef<string | null>(orderId ?? null);

  // Mantener orderId actualizado
  useEffect(() => {
    orderIdRef.current = orderId ?? null;
  }, [orderId]);

  const connect = useCallback(() => {
    // No conectar si no está habilitado o no estamos en el browser
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const token = window.localStorage.getItem('token');
    if (!token) {
      setError('No hay token de sesión');
      return;
    }

    // Si ya hay una conexión activa, no duplicar
    if (socketRef.current?.connected) {
      return;
    }

    setError(null);

    const socket = io(`${WS_BASE}/delivery`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('authenticate', {
        token,
        driverId: driverId ?? null,
        tenantId: tenantId ?? null,
      });
    });

    socket.on('authenticated', () => {
      setAuthenticated(true);
      setError(null);

      // Si hay una orden a la que suscribirse, lo hacemos ahora
      if (orderIdRef.current) {
        socket.emit('track_order', { orderId: orderIdRef.current });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setAuthenticated(false);
    });

    socket.on('error', (data: any) => {
      setError(data?.message || 'Error de WebSocket');
    });

    socket.on('driver_location', (data: DriverPosition) => {
      setDriverPosition(data);
    });

    socket.on('eta_update', (data: EtaUpdate) => {
      setEtaUpdate(data);
    });

    socket.on('driver_nearby', (data: DriverNearby) => {
      setDriverNearby(data);
    });

    socket.on('assignment_update', (data: AssignmentUpdate) => {
      setAssignmentUpdate(data);
    });
  }, [enabled, driverId, tenantId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setAuthenticated(false);
    }
  }, []);

  // Conectar al montar (si está habilitado)
  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }
    connect();
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cuando cambia el orderId, re-suscribirse
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !authenticated) return;

    // Untrack de la orden anterior si la hubiera (best-effort)
    // No tenemos ref de la anterior, así que solo trackeamos la nueva.
    if (orderId) {
      socket.emit('track_order', { orderId });
    }
  }, [orderId, authenticated]);

  return {
    connected,
    authenticated,
    error,
    driverPosition,
    etaUpdate,
    driverNearby,
    assignmentUpdate,
    reconnect: connect,
  };
}
