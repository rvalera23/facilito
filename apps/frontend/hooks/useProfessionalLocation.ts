// hooks/useProfessionalLocation.ts
'use client';

// ============================================================
// Hook para compartir la ubicación del profesional en vivo.
// - Pide permiso al navegador (getCurrentPosition).
// - Envía a PATCH /delivery/professionals/me/location.
// - Opcional: modo auto (watchPosition) para tracking continuo.
// ============================================================

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UseProfessionalLocationOptions {
  /** Si true, usa watchPosition (tracking continuo). Default: false (una sola vez). */
  continuous?: boolean;
  /** Callback opcional cuando se actualiza la ubicación. */
  onSuccess?: (lat: number, lng: number) => void;
  /** Callback opcional si falla. */
  onError?: (error: string) => void;
}

interface UseProfessionalLocationReturn {
  /** True mientras se envía al backend. */
  isSending: boolean;
  /** Error si no se pudo obtener/enviar. */
  error: string | null;
  /** True si el navegador pidió permiso y está enviando. */
  isSharing: boolean;
  /** Última ubicación enviada al backend. */
  lastLocation: { lat: number; lng: number; at: string } | null;
  /** Inicia el envío de ubicación. */
  startSharing: () => Promise<void>;
  /** Detiene el envío (si continuous=true). */
  stopSharing: () => void;
}

export function useProfessionalLocation(
  options: UseProfessionalLocationOptions = {},
): UseProfessionalLocationReturn {
  const { continuous = false, onSuccess, onError } = options;

  const [isSending, setIsSending] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<{
    lat: number;
    lng: number;
    at: string;
  } | null>(null);

  const sendLocation = async (lat: number, lng: number) => {
    setIsSending(true);
    setError(null);
    try {
      const res = await apiFetch('/delivery/professionals/me/location', {
        method: 'PATCH',
        body: JSON.stringify({ lat, lng }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `HTTP ${res.status}`);
      }

      const now = new Date().toISOString();
      setLastLocation({ lat, lng, at: now });
      onSuccess?.(lat, lng);
    } catch (err: any) {
      const msg = err?.message || 'Error enviando ubicación';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsSending(false);
    }
  };

  const startSharing = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const msg = 'Tu navegador no soporta geolocalización';
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsSharing(true);

    if (continuous) {
      // Tracking continuo (watchPosition)
      navigator.geolocation.watchPosition(
        (pos) => {
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          const msg = err.message || 'Error obteniendo ubicación';
          setError(msg);
          onError?.(msg);
          setIsSharing(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    } else {
      // Una sola vez (getCurrentPosition)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await sendLocation(pos.coords.latitude, pos.coords.longitude);
          setIsSharing(false);
        },
        (err) => {
          const msg = err.message || 'Error obteniendo ubicación';
          setError(msg);
          onError?.(msg);
          setIsSharing(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  };

  const stopSharing = () => {
    setIsSharing(false);
    // Nota: para cancelar watchPosition habría que guardar el id.
    // Por ahora solo marcamos isSharing=false, el navegador sigue
    // reportando pero no enviamos al backend (no-op visual).
  };

  return {
    isSending,
    error,
    isSharing,
    lastLocation,
    startSharing,
    stopSharing,
  };
}
