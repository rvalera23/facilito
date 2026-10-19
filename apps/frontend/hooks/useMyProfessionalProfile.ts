'use client';

// ============================================================
// ARCHIVO: apps/frontend/hooks/useMyProfessionalProfile.ts
// Hook del profesional (servicios):
//   1. Fetch del perfil (/professionals/me).
//   2. Toggle online/offline (PATCH /professionals/:id).
//   3. Lista de bookings activos con polling 30s.
//   4. Separación automática activos vs historial.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type ProfessionalStatus = 'offline' | 'online';

export interface MyProfessional {
  id: string;
  userId: string | null;
  tenantId: string;
  name: string;
  description: string | null;
  specialties: string[];
  serviceIds: string[];
  rating: number;
  reviewsCount: number;
  isActive: boolean;
  status: 'active' | 'inactive';
  mediaUrls: string[];
  coverImage: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface BookingWithService {
  id: string;
  serviceId: string;
  professionalId: string | null;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  metadata: any;
  pricingSnapshot: any | null;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    name: string;
    description: string | null;
    coverImage: string | null;
    mediaUrls: string[];
    durationMinutes: number;
  };
  tenant?: { id: string; name: string; slug: string };
}

interface UseMyProfessionalProfileOptions {
  pollingMs?: number;
  enabled?: boolean;
}

interface UseMyProfessionalProfileReturn {
  professional: MyProfessional | null;
  bookings: BookingWithService[];
  history: BookingWithService[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setAvailability: (status: ProfessionalStatus) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: string) => Promise<void>;
}

// Estados que van al listado "activo" (arriba en la UI)
const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress'];

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useMyProfessionalProfile({
  pollingMs = 30000,
  enabled = true,
}: UseMyProfessionalProfileOptions = {}): UseMyProfessionalProfileReturn {
  const [professional, setProfessional] = useState<MyProfessional | null>(null);
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [history, setHistory] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);

  // ---------------- Fetch perfil ----------------
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/professionals/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('No autenticado');
        if (res.status === 403) throw new Error('No tenés acceso como profesional');
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setProfessional(data);
      return data as MyProfessional | null;
    } catch (err: any) {
      setError(err?.message || 'Error cargando perfil');
      return null;
    }
  }, []);

  // ---------------- Fetch bookings ----------------
  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/professionals/me/bookings`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setBookings([]);
          setHistory([]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data: BookingWithService[] = await res.json();
      const all = Array.isArray(data) ? data : [];
      const active = all.filter((b) => ACTIVE_STATUSES.includes(b.status));
      const past = all.filter((b) => !ACTIVE_STATUSES.includes(b.status));

      // Ordenar activos: por fecha + hora ascendente (más próximos primero)
      active.sort((a, b) => {
        const ka = `${a.bookingDate} ${a.startTime}`;
        const kb = `${b.bookingDate} ${b.startTime}`;
        return ka.localeCompare(kb);
      });

      // Ordenar historial: más recientes primero
      past.sort((a, b) => {
        const ka = `${a.bookingDate} ${a.startTime}`;
        const kb = `${b.bookingDate} ${b.startTime}`;
        return kb.localeCompare(ka);
      });

      setBookings(active);
      setHistory(past);
    } catch (err: any) {
      // Silencioso, no pisamos el error del perfil
    }
  }, []);

  // ---------------- Refresh completo ----------------
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchProfile(), fetchBookings()]);
    setLoading(false);
  }, [fetchProfile, fetchBookings]);

  // ---------------- Load inicial ----------------
  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  // ---------------- Polling ----------------
  useEffect(() => {
    if (!enabled) return;
    if (!professional) return;

    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = window.setInterval(() => {
      fetchBookings();
    }, pollingMs);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, professional?.id, pollingMs, fetchBookings]);


  // ---------------- Escuchar notificaciones (refresco reactivo) ----------------
  useEffect(() => {
    if (!enabled) return;
    if (!professional) return;

    const handleNotificationUpdate = () => {
      // Cuando llega una notificación nueva (WebSocket o evento global),
      // refrescamos la lista de bookings sin que el user recargue.
      fetchBookings();
    };

    window.addEventListener('notificationUpdate', handleNotificationUpdate);
    window.addEventListener('globalRefresh', handleNotificationUpdate);

    return () => {
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      window.removeEventListener('globalRefresh', handleNotificationUpdate);
    };
  }, [enabled, professional?.id, fetchBookings]);

  // ---------------- Acciones ----------------

  /**
   * Cambia entre online/offline.
   * Usa el PATCH /professionals/:id del controller público actual.
   * Enviamos isActive + status para que el backend actualice ambos.
   */
  const setAvailability = useCallback(
    async (status: ProfessionalStatus) => {
      if (!professional) return;
      try {
        const isActive = status === 'online';
        const res = await fetch(
          `${API_BASE}/professionals/me/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              isActive,
              status: isActive ? 'active' : 'inactive',
              tenantId: professional.tenantId,
            }),
          },
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `HTTP ${res.status}`);
        }
        const updated = await res.json();
        setProfessional((prev) => (prev ? { ...prev, ...updated } : updated));
      } catch (err: any) {
        setError(err?.message || 'Error actualizando disponibilidad');
        throw err;
      }
    },
    [professional],
  );

  /**
   * Cambia el status de un booking (accepted, in_progress, completed, etc.).
   * Usa el PATCH /bookings/:id/status ya existente.
   */
  const updateBookingStatus = useCallback(
    async (bookingId: string, status: string) => {
      try {
        const res = await fetch(
          `${API_BASE}/bookings/${bookingId}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ status }),
          },
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `HTTP ${res.status}`);
        }
        // Refrescar lista
        await fetchBookings();
      } catch (err: any) {
        setError(err?.message || 'Error actualizando booking');
        throw err;
      }
    },
    [fetchBookings],
  );

  return {
    professional,
    bookings,
    history,
    loading,
    error,
    refresh,
    setAvailability,
    updateBookingStatus,
  };
}