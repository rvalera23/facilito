// ============================================================
// ARCHIVO: app/context/LocationContext.tsx
// Contexto de ubicación del usuario.
//
// Comportamiento:
//   - Sin login: ubicación guardada solo en localStorage.
//   - Con login: ubicación sincronizada con el backend,
//     con localStorage como caché/fallback.
//
// Al loguearse: si el backend no tiene ubicación pero sí
// había una guardada en modo anónimo, se promueve al backend.
// ============================================================
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiFetch } from '@/lib/api';

const ANON_STORAGE_KEY = 'facilito_user_location';
const DISMISS_KEY = 'facilito_location_banner_dismissed_until';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type PersistenceMode = 'account' | 'device';

export interface UserLocation {
  latitude: number;
  longitude: number;
  source: 'gps' | 'manual';
  city?: string | null;
  zone?: string | null;
  timestamp: number;
}

interface LocationContextValue {
  location: UserLocation | null;
  isRequesting: boolean;
  error: string | null;
  isBannerDismissed: boolean;
  persistenceMode: PersistenceMode;
  isSyncing: boolean;
  requestBrowserLocation: () => Promise<UserLocation | null>;
  setManualLocation: (params: {
    latitude: number;
    longitude: number;
    city?: string;
    zone?: string;
  }) => Promise<UserLocation>;
  clearLocation: () => Promise<void>;
  dismissBanner: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function isFresh(ts: number): boolean {
  return Date.now() - ts < TTL_MS;
}

function getLoggedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem('token');
    const raw = window.localStorage.getItem('user');
    if (!token || !raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

function loadAnonymous(): UserLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ANON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserLocation;
    if (parsed && typeof parsed.timestamp === 'number' && isFresh(parsed.timestamp)) {
      return parsed;
    }
    window.localStorage.removeItem(ANON_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function saveAnonymous(loc: UserLocation | null) {
  if (typeof window === 'undefined') return;
  try {
    if (loc) {
      window.localStorage.setItem(ANON_STORAGE_KEY, JSON.stringify(loc));
    } else {
      window.localStorage.removeItem(ANON_STORAGE_KEY);
    }
  } catch {
    // ignorar
  }
}

function isBannerCurrentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [persistenceMode, setPersistenceMode] = useState<PersistenceMode>('device');

  // Ref para evitar loops de sincronización
  const lastSyncedUserIdRef = useRef<string | null>(null);

  // ------------------------------------------------------------------------
  // Sincronización con el backend (solo usuarios logueados)
  // ------------------------------------------------------------------------

  const syncFromBackend = useCallback(async (userId: string) => {
    setIsSyncing(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/me/location');
      if (res.status === 401) {
        // Token inválido/expirado. Volvemos a modo anónimo.
        lastSyncedUserIdRef.current = null;
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        // El backend tiene ubicación. La usamos.
        const loc: UserLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          source: data.geoSource === 'gps' ? 'gps' : 'manual',
          city: null,
          zone: null,
          timestamp: data.geoUpdatedAt ? new Date(data.geoUpdatedAt).getTime() : Date.now(),
        };
        setLocation(loc);
        saveAnonymous(loc); // caché por si después logout
      } else {
        // Backend no tiene ubicación. ¿Hay anónima para promover?
        const anon = loadAnonymous();
        if (anon) {
          const putRes = await apiFetch('/api/auth/me/location', {
            method: 'PUT',
            body: JSON.stringify({
              latitude: anon.latitude,
              longitude: anon.longitude,
              geoPrecision: anon.source === 'gps' ? 'exact' : 'city',
              geoSource: anon.source,
            }),
          });
          if (putRes.ok) {
            setLocation(anon);
            saveAnonymous(anon);
          } else {
            // Si falla el PUT, igual usamos la anónima localmente.
            setLocation(anon);
          }
        } else {
          setLocation(null);
        }
      }
    } catch (err) {
      console.error('[LocationContext] Error sincronizando con backend:', err);
      // Fallback: usar localStorage
      const anon = loadAnonymous();
      setLocation(anon);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ------------------------------------------------------------------------
  // Carga inicial + re-sincronización al login/logout
  // ------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const load = () => {
      const userId = getLoggedUserId();

      if (userId) {
        setPersistenceMode('account');
        // Evitar re-sync si ya sincronizamos con este mismo user
        if (lastSyncedUserIdRef.current !== userId) {
          lastSyncedUserIdRef.current = userId;
          void syncFromBackend(userId);
        }
      } else {
        setPersistenceMode('device');
        lastSyncedUserIdRef.current = null;
        setLocation(loadAnonymous());
      }
    };

    // Carga inicial
    load();
    setIsBannerDismissed(isBannerCurrentlyDismissed());

    // Re-cargar al login/logout
    const onAuthChange = () => load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') load();
    };

    window.addEventListener('authChange', onAuthChange);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('authChange', onAuthChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [syncFromBackend]);

  // ------------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------------

  const persistLocation = useCallback(
    async (loc: UserLocation) => {
      setLocation(loc);
      saveAnonymous(loc);

      // Si está logueado, sincronizar con backend
      const userId = getLoggedUserId();
      if (userId) {
        try {
          await apiFetch('/api/auth/me/location', {
            method: 'PUT',
            body: JSON.stringify({
              latitude: loc.latitude,
              longitude: loc.longitude,
              geoPrecision: loc.source === 'gps' ? 'exact' : 'city',
              geoSource: loc.source,
            }),
          });
        } catch (err) {
          console.error('[LocationContext] Error guardando en backend:', err);
        }
      }
    },
    [],
  );

  const requestBrowserLocation = useCallback(async (): Promise<UserLocation | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return null;
    }

    setIsRequesting(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'gps',
            city: null,
            zone: null,
            timestamp: Date.now(),
          };
          await persistLocation(loc);
          setIsRequesting(false);
          resolve(loc);
        },
        (err) => {
          let msg = 'No pudimos obtener tu ubicación.';
          if (err.code === err.PERMISSION_DENIED) msg = 'Permiso de ubicación denegado.';
          else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Ubicación no disponible.';
          else if (err.code === err.TIMEOUT) msg = 'Se agotó el tiempo para obtener la ubicación.';
          setError(msg);
          setIsRequesting(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }, [persistLocation]);

  const setManualLocation = useCallback(
    async (params: { latitude: number; longitude: number; city?: string; zone?: string }) => {
      const loc: UserLocation = {
        latitude: params.latitude,
        longitude: params.longitude,
        source: 'manual',
        city: params.city ?? null,
        zone: params.zone ?? null,
        timestamp: Date.now(),
      };
      await persistLocation(loc);
      setError(null);
      return loc;
    },
    [persistLocation],
  );

  const clearLocation = useCallback(async () => {
    setLocation(null);
    saveAnonymous(null);

    const userId = getLoggedUserId();
    if (userId) {
      try {
        await apiFetch('/api/auth/me/location', { method: 'DELETE' });
      } catch (err) {
        console.error('[LocationContext] Error borrando en backend:', err);
      }
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_TTL_MS));
      } catch {
        // ignorar
      }
    }
  }, []);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      isRequesting,
      error,
      isBannerDismissed,
      persistenceMode,
      isSyncing,
      requestBrowserLocation,
      setManualLocation,
      clearLocation,
      dismissBanner,
    }),
    [
      location,
      isRequesting,
      error,
      isBannerDismissed,
      persistenceMode,
      isSyncing,
      requestBrowserLocation,
      setManualLocation,
      clearLocation,
      dismissBanner,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationContext debe usarse dentro de <LocationProvider>');
  }
  return ctx;
}