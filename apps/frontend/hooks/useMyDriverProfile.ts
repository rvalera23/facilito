'use client';

// ============================================================
// ARCHIVO: apps/frontend/hooks/useMyDriverProfile.ts
// Hook del repartidor:
//   1. Fetch del perfil (/delivery/drivers/me).
//   2. Toggle online/offline.
//   3. Lista de assignments activos con polling 15s.
//   4. Envío de GPS periódico cuando está online.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type DriverStatus = 'offline' | 'online' | 'busy' | 'paused';

export interface MyDriver {
  id: string;
  userId: string;
  tenantId: string | null;
  status: DriverStatus;
  currentLat: number | null;
  currentLng: number | null;
  lastSeenAt: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  maxActiveOrders: number;
  ratingAvg: string;
  ratingCount: number;
  isVerified: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    phone_is_whatsapp: boolean;
    id_number: string | null;
    id_type: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface AssignmentWithOrder {
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
  order?: {
    id: string;
    customerName: string;
    customerPhone: string | null;
    customerAddress: string | null;
    tenantId: string;
    status: string;
    totalAmount: string;
    totalAmountVes: string | null;
    deliveryFeeCalculated: number | null;
    deliveryDistanceKm: number | null;
    deliveryEtaMinutes: number | null;
  };
}

interface UseMyDriverProfileOptions {
  /** Intervalo de envío de GPS en ms. Default: 15000 (15s). */
  gpsIntervalMs?: number;
  /** Intervalo de polling para assignments. Default: 15000 (15s). */
  pollingMs?: number;
  /** Si false, no envía GPS. */
  enabled?: boolean;
}

interface UseMyDriverProfileReturn {
  driver: MyDriver | null;
  assignments: AssignmentWithOrder[];
  loading: boolean;
  error: string | null;
  /** Cambia entre online/offline/busy/paused. */
  setStatus: (status: DriverStatus) => Promise<void>;
  /** Recarga el perfil + assignments manualmente. */
  refresh: () => Promise<void>;
  /** Actualiza el estado de una assignment (accepted, picked_up, delivered, etc). */
  updateAssignmentStatus: (
    assignmentId: string,
    status: string,
  ) => Promise<void>;
  /**
   * Actualiza los datos de contacto del repartidor (self-service).
   * Solo `phone` y `phone_is_whatsapp`. El resto lo edita el admin.
   */
  updateProfile: (updates: {
    phone?: string | null;
    phone_is_whatsapp?: boolean;
  }) => Promise<void>;

  /** Sube el avatar del repartidor (self-service). */
  uploadMyAvatar: (file: File) => Promise<{ avatarUrl: string }>;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useMyDriverProfile({
  gpsIntervalMs = 15000,
  pollingMs = 15000,
  enabled = true,
}: UseMyDriverProfileOptions = {}): UseMyDriverProfileReturn {
  const [driver, setDriver] = useState<MyDriver | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gpsTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // ---------------- Fetch perfil ----------------
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/drivers/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('No autenticado');
        }
        if (res.status === 403) {
          throw new Error('No tenés acceso como repartidor');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setDriver(data);
      return data as MyDriver | null;
    } catch (err: any) {
      setError(err?.message || 'Error cargando perfil');
      return null;
    }
  }, []);

  // ---------------- Fetch assignments ----------------
  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/delivery/drivers/me/assignments`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) {
        if (res.status === 404) {
          setAssignments([]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // Silencioso, no queremos pisar el error del perfil
    }
  }, []);

  // ---------------- Refresh completo ----------------
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchProfile(), fetchAssignments()]);
    setLoading(false);
  }, [fetchProfile, fetchAssignments]);

  // ---------------- Load inicial ----------------
  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  // ---------------- Polling de assignments ----------------
  useEffect(() => {
    if (!enabled) return;
    if (!driver) return;
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = window.setInterval(() => {
      fetchAssignments();
      // También refrescamos perfil cada tanto por si cambian los datos
      fetchProfile();
    }, pollingMs);
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [enabled, driver?.id, pollingMs, fetchAssignments, fetchProfile]);

  // ---------------- Envío de GPS cuando está online ----------------
  useEffect(() => {
    if (!enabled) return;
    if (!driver) return;

    const isOnline = driver.status === 'online' || driver.status === 'busy';

    if (!isOnline) {
      if (gpsTimerRef.current) {
        window.clearInterval(gpsTimerRef.current);
        gpsTimerRef.current = null;
      }
      return;
    }

    // No hay geolocation (SSR)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await fetch(
              `${API_BASE}/delivery/drivers/${driver.id}/location`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeaders(),
                },
                body: JSON.stringify({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              },
            );
          } catch {
            // Silencioso
          }
        },
        () => {
          // Silencioso
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    };

    // Enviar inmediatamente
    sendLocation();

    // Y después cada N ms
    gpsTimerRef.current = window.setInterval(sendLocation, gpsIntervalMs);

    return () => {
      if (gpsTimerRef.current) {
        window.clearInterval(gpsTimerRef.current);
        gpsTimerRef.current = null;
      }
    };
  }, [enabled, driver?.id, driver?.status, gpsIntervalMs]);

  // ---------------- Acciones ----------------
  const setStatus = useCallback(
    async (status: DriverStatus) => {
      if (!driver) return;
      try {
        const res = await fetch(
          `${API_BASE}/delivery/drivers/${driver.id}`,
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
        const updated = await res.json();
        setDriver(updated);
      } catch (err: any) {
        setError(err?.message || 'Error actualizando estado');
        throw err;
      }
    },
    [driver],
  );

  const updateAssignmentStatus = useCallback(
    async (assignmentId: string, status: string) => {
      try {
        const res = await fetch(
          `${API_BASE}/delivery/assignments/${assignmentId}/status`,
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
        // Actualizar la lista local
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId ? { ...a, status } : a,
          ),
        );
        // Si fue delivered/cancelled, la sacamos de la lista
        if (status === 'delivered' || status === 'cancelled' || status === 'rejected') {
          setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        }
      } catch (err: any) {
        setError(err?.message || 'Error actualizando assignment');
        throw err;
      }
    },
    [],
  );

  // ---------------- Update perfil (self-service) ----------------
  // Fase 2.5: solo phone + phone_is_whatsapp. El resto lo edita el admin.
  const updateProfile = useCallback(
    async (updates: {
      phone?: string | null;
      phone_is_whatsapp?: boolean;
    }) => {
      try {
        const res = await apiFetch('/delivery/drivers/me/contact', {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `HTTP ${res.status}`);
        }
        const updated = await res.json();
        setDriver(updated);
      } catch (err: any) {
        setError(err?.message || 'Error actualizando contacto');
        throw err;
      }
    },
    [],
  );

  // Fase 2.5: subir avatar self-service.
  const uploadMyAvatar = useCallback(
    async (file: File): Promise<{ avatarUrl: string }> => {
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await apiFetch('/delivery/drivers/me/avatar', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        // Refrescar el driver para que el avatar aparezca en toda la app
        await refresh();
        return data;
      } catch (err: any) {
        setError(err?.message || 'Error subiendo avatar');
        throw err;
      }
    },
    [refresh],
  );

  return {
    driver,
    assignments,
    loading,
    error,
    setStatus,
    refresh,
    updateAssignmentStatus,
    updateProfile,
    uploadMyAvatar,
  };
}
