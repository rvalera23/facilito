'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// 🔥 Estados temporales calculados en el frontend. NUNCA se guardan en la DB.
// Reflejan la relación entre ahora y el horario del turno.
export type TimeStatus =
  | 'waiting'      // Falta > 15 min
  | 'soon'         // Falta ≤ 15 min
  | 'now'          // Dentro de [start, start + duration]
  | 'in_progress'  // [start + duration, start + duration + 15min]  (gracia)
  | 'late'         // (fin, fin + 4h]
  | 'expired'      // > fin + 4h
  | 'completed'    // status de negocio = completed
  | 'cancelled'    // status de negocio = cancelled
  | 'no_show';     // status de negocio = no_show

interface Turno {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  timeStatus: TimeStatus;
  // 🔥 Remaining: positivo = falta / en curso, negativo = cuánto pasó del fin
  remainingTime: number;
  turnNumber?: string | null;
  professionalName?: string | null;
  professionalId?: string | null;
}


// ============================================================
// 🔥 CÁLCULO DE TIMESTATUS — Función pura, testeable, sin side effects
// ============================================================
//
// Recibe un booking (crudo o transformado) y devuelve:
//   - timeStatus: el estado temporal según el reloj
//   - remainingTime: minutos. Positivo = falta / en curso, negativo = pasó
//
// Reglas (estándar de industria):
//   waiting      → falta > 15 min
//   soon         → falta ≤ 15 min
//   now          → dentro de [start, start + duration]
//   in_progress  → (start + duration, start + duration + 15min]
//   late         → (fin, fin + 4h]
//   expired      → > fin + 4h
//
// Los estados de negocio (completed, cancelled, no_show) mandan por encima
// del cálculo temporal: si el booking ya está cerrado, se respeta ese estado.

const SOON_THRESHOLD_MIN = 15;
const IN_PROGRESS_GRACE_MIN = 15;
const LATE_TO_EXPIRED_HOURS = 4;

export function computeTimeStatus(
  booking: any,
  now: Date = new Date(),
): { timeStatus: TimeStatus; remainingTime: number } {
  const businessStatus = String(booking?.status || '').toLowerCase();

  // 🔥 Estados de negocio cerrados → mandan por encima del cálculo temporal
  if (businessStatus === 'completed') return { timeStatus: 'completed', remainingTime: 0 };
  if (businessStatus === 'cancelled') return { timeStatus: 'cancelled', remainingTime: 0 };
  if (businessStatus === 'no_show')   return { timeStatus: 'no_show',   remainingTime: 0 };

  // Combinar bookingDate (YYYY-MM-DD) + startTime (HH:MM[:SS]) como fecha local
  const bookingDate = booking?.bookingDate;
  const startTime = booking?.startTime;

  if (!bookingDate || !startTime) {
    return { timeStatus: 'waiting', remainingTime: 0 };
  }

  // Parsear fecha y hora
  const datePart = String(bookingDate).split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const timeParts = String(startTime).split(':').map(Number);
  const [hours, minutes] = timeParts;

  if ([year, month, day, hours, minutes].some(n => Number.isNaN(n))) {
    return { timeStatus: 'waiting', remainingTime: 0 };
  }

  const tStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const durationMin = Number(booking?.durationMinutes) || 60;
  const tEnd = new Date(tStart.getTime() + durationMin * 60_000);

  const nowMs = now.getTime();
  const startMs = tStart.getTime();
  const endMs = tEnd.getTime();

  const minutesUntilStart = (startMs - nowMs) / 60_000;
  const minutesSinceEnd = (nowMs - endMs) / 60_000;
  const minutesUntilEnd = (endMs - nowMs) / 60_000;

  // 🔥 Aún no empieza
  if (nowMs < startMs) {
    if (minutesUntilStart <= SOON_THRESHOLD_MIN) {
      return { timeStatus: 'soon', remainingTime: Math.round(minutesUntilStart) };
    }
    return { timeStatus: 'waiting', remainingTime: Math.round(minutesUntilStart) };
  }

  // 🔥 Dentro de la ventana
  if (nowMs <= endMs) {
    return { timeStatus: 'now', remainingTime: Math.round(minutesUntilEnd) };
  }

  // 🔥 Ya terminó. Aplicamos gracia
  if (minutesSinceEnd <= IN_PROGRESS_GRACE_MIN) {
    return { timeStatus: 'in_progress', remainingTime: -Math.round(minutesSinceEnd) };
  }

  // 🔥 Después de la gracia, todavía puede ser 'late' o 'expired'
  const minutesSinceEndTotal = minutesSinceEnd;
  if (minutesSinceEndTotal <= LATE_TO_EXPIRED_HOURS * 60) {
    return { timeStatus: 'late', remainingTime: -Math.round(minutesSinceEndTotal) };
  }

  return { timeStatus: 'expired', remainingTime: -Math.round(minutesSinceEndTotal) };
}

interface UseRealtimeTurnosProps {
  tenantId: string;
  refreshInterval?: number;
  maxTurnos?: number;
}

export function useRealtimeTurnos({
  tenantId,
  refreshInterval = 30,
  maxTurnos = 10,
}: UseRealtimeTurnosProps) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 🔥 FUNCIÓN PARA OBTENER TURNOS
  const fetchTurnos = useCallback(async () => {
    if (!tenantId) {
      console.warn('⚠️ [useRealtimeTurnos] No hay tenantId');
      setTurnos([]);
      setLoading(false);
      return;
    }

    console.log('📅 [useRealtimeTurnos] Fetching bookings para tenant:', tenantId);
    
    try {
      const token = localStorage.getItem('token');
      // 🔥 Filtro por source: el admin/tienda solo ve bookings creados desde la web.
      // Los bookings del kiosco (autopago físico) van por su propio canal.
      const url = `${API_BASE}/bookings/tenant/${tenantId}?source=web`;
      console.log('📅 [useRealtimeTurnos] URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      console.log('📅 [useRealtimeTurnos] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📅 [useRealtimeTurnos] Datos recibidos:', data);
        console.log('📅 [useRealtimeTurnos] Cantidad:', data?.length || 0);
        
        // 🔥 TRANSFORMAR BOOKINGS A TURNOS
        // 🔥 TRANSFORMAR BOOKINGS A TURNOS CON CÁLCULO DE TIMESTATUS EN VIVO
        const now = new Date();
        const turnosData = (Array.isArray(data) ? data : []).map((booking: any) => {
          const { timeStatus, remainingTime } = computeTimeStatus(booking, now);

          return {
            id: booking.id || `booking-${Date.now()}`,
            customerName: booking.customerName || 'Cliente',
            customerPhone: booking.customerPhone || '',
            serviceName: booking.service?.name || 'Servicio',
            bookingDate: booking.bookingDate || now.toISOString().split('T')[0],
            startTime: booking.startTime || '09:00',
            endTime: booking.endTime || '10:00',
            durationMinutes: booking.durationMinutes || 60,
            status: booking.status || 'pending',
            timeStatus,
            remainingTime,
            turnNumber: booking.turnNumber || null,
            professionalName: booking.professional?.name || null,
            professionalId: booking.professional?.id || booking.professionalId || null,
          };
        });

        console.log('📅 [useRealtimeTurnos] Turnos transformados:', turnosData.length);
        
        setTurnos(turnosData.slice(0, maxTurnos));
        setActiveCount(turnosData.filter(t => t.status === 'confirmed' || t.status === 'pending').length);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error('❌ [useRealtimeTurnos] Error:', response.status, errorText);
        setTurnos([]);
        setError(`Error ${response.status}: ${errorText || 'Error al cargar los turnos'}`);
      }
    } catch (error) {
      console.error('❌ [useRealtimeTurnos] Error de conexión:', error);
      setTurnos([]);
      setError('Error de conexión con el servidor');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [tenantId, maxTurnos]);

  // 🔥 REFRESCAR MANUALMENTE
  const refresh = useCallback(() => {
    setLoading(true);
    fetchTurnos();
  }, [fetchTurnos]);

  // 🔥 INICIALIZAR
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    fetchTurnos();

    // 🔥 INTERVALO DE REFRESCO (fetch a la API)
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchTurnos();
        }
      }, refreshInterval * 1000);
    }

    // 🔥 INTERVALO DE RECÁLCULO (sin fetch, solo re-calcula timeStatus según el reloj)
    // Esto asegura que si la pestaña queda abierta 4 horas, el badge cambie solo
    // aunque no haya cambios en la DB.
    const recomputeInterval = setInterval(() => {
      if (!isMountedRef.current) return;

      setTurnos((prev) => {
        if (prev.length === 0) return prev;
        const now = new Date();
        let changed = false;
        const next = prev.map((t) => {
          const { timeStatus, remainingTime } = computeTimeStatus(t, now);
          if (t.timeStatus !== timeStatus || t.remainingTime !== remainingTime) {
            changed = true;
            return { ...t, timeStatus, remainingTime };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }, 60_000); // cada 60 segundos

    // 🔥 ESCUCHAR EVENTOS GLOBALES
    const handleGlobalRefresh = () => {
      console.log('🔄 [useRealtimeTurnos] Evento globalRefresh recibido');
      fetchTurnos();
    };
    const handleNotificationUpdate = () => {
      console.log('🔄 [useRealtimeTurnos] Evento notificationUpdate recibido');
      fetchTurnos();
    };

    window.addEventListener('globalRefresh', handleGlobalRefresh);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearInterval(recomputeInterval);
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
    };
  }, [tenantId, refreshInterval, fetchTurnos]);

  return { turnos, loading, error, activeCount, refresh };
}