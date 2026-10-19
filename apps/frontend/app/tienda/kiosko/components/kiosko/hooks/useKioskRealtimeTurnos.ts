'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface KioskTurno {
  id: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  timeStatus: 'now' | 'soon' | 'waiting' | 'late' | 'completed';
  remainingTime: number;
  turnNumber?: string | null;
  professionalName?: string | null;
}

interface UseKioskRealtimeTurnosProps {
  tenantId: string;
  refreshInterval?: number;
  maxTurnos?: number;
}

const getTimeStatus = (order: any, bookingDate: string, startTime: string, endTime: string): KioskTurno['timeStatus'] => {
  if (order.status === 'cancelled' || order.status === 'CANCELLED') return 'completed';
  if (order.status === 'completed' || order.status === 'COMPLETED') return 'completed';

  const now = new Date();
  const start = new Date(`${bookingDate}T${startTime}`);
  const end = new Date(`${bookingDate}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'waiting';
  if (now >= start && now < end) return 'now';
  if (now < start) return start.getTime() - now.getTime() <= 60 * 60 * 1000 ? 'soon' : 'waiting';
  return 'late';
};

export function useKioskRealtimeTurnos({
  tenantId,
  refreshInterval = 5,
  maxTurnos = 10,
}: UseKioskRealtimeTurnosProps) {
  const [turnos, setTurnos] = useState<KioskTurno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTurnos = useCallback(async () => {
    if (!tenantId) {
      setTurnos([]);
      setActiveCount(0);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/orders/tenant/${tenantId}/kiosk`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);
      const orders = await response.json();
      const serviceOrders = (Array.isArray(orders) ? orders : []).filter((order: any) =>
        order.orderType === 'service' || order.serviceDetails ||
        order.items?.some((item: any) => item.type === 'service' || item.serviceId),
      );

      const kioskTurnos = serviceOrders.slice(0, maxTurnos).map((order: any) => {
        const item = order.items?.find((entry: any) => entry.type === 'service' || entry.serviceId) || order.items?.[0] || {};
        const details = order.serviceDetails || {};
        const rawBookingDate = details.date || order.appointmentDate || item.appointmentDate || order.createdAt || '';
        const bookingDate = String(rawBookingDate).split('T')[0];
        const startTime = details.time || order.appointmentTime || item.appointmentTime || '09:00';
        const durationMinutes = Number(details.duration || item.durationMinutes || 60);
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date(0);
        endDate.setHours(hours, minutes + durationMinutes, 0, 0);
        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
        const timeStatus = getTimeStatus(order, bookingDate, startTime, endTime);

        return {
          id: order.id || order._id,
          customerName: order.customerName || 'Cliente',
          serviceName: item.name || 'Servicio',
          bookingDate,
          startTime,
          endTime,
          durationMinutes,
          status: order.status || 'PENDING',
          timeStatus,
          remainingTime: timeStatus === 'soon' ? Math.max(0, Math.ceil((new Date(`${bookingDate}T${startTime}`).getTime() - Date.now()) / 60000)) : 0,
          turnNumber: order.turnNumber || null,
          professionalName: details.professionalName || item.professionalName || null,
        };
      });

      setTurnos(kioskTurnos);
      setActiveCount(kioskTurnos.filter((turno) => turno.timeStatus === 'now' || turno.timeStatus === 'soon' || turno.timeStatus === 'waiting').length);
      setError(null);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, [tenantId, maxTurnos]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchTurnos();
  }, [fetchTurnos]);

  useEffect(() => {
    fetchTurnos();
    intervalRef.current = setInterval(fetchTurnos, refreshInterval * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTurnos, refreshInterval]);

  return { turnos, loading, error, activeCount, refresh };
}
