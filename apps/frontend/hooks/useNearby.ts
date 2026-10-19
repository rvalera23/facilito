// ============================================================
// ARCHIVO: hooks/useNearby.ts
// Hook que trae items cercanos si hay ubicación del usuario.
// Si no hay ubicación, devuelve null y el caller usa su fetch habitual.
//
// 🔥 CACHE A NIVEL DE MÓDULO
// Cada combinación (type + lat + lng + zone + radiusKm + limit) tiene
// su propia promesa. Si dos componentes piden lo mismo al mismo tiempo,
// comparten la misma promesa y solo se hace UN request al backend.
// ============================================================
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useLocationContext } from '@/app/context/LocationContext';

export type NearbyType = 'tenants' | 'products' | 'services';

export interface ProximityInfo {
  distanceKm: number | null;
  distanceLabel: string;
  precision: 'exact' | 'street' | 'city' | 'region';
  zoneMatch: boolean;
}

interface NearbyResult<T> {
  items: T[];
  meta: {
    count: number;
    center: { latitude: number; longitude: number };
    radiusKm: number;
    userZone: string | null;
  };
}

interface UseNearbyReturn<T> {
  items: T[] | null;
  isLoading: boolean;
  error: string | null;
  isActive: boolean;
  radiusKm: number;
  applyProximity: (item: T) => ProximityInfo | undefined;
}

const DEFAULT_RADIUS_KM = 100;
const DEFAULT_LIMIT = 50;
const CACHE_TTL_MS = 60_000; // 1 minuto

// ============================================================
// 🔥 CACHE A NIVEL DE MÓDULO
// ============================================================
// key = `${type}|${lat}|${lng}|${zone}|${radiusKm}|${limit}`
// value = { promise, data, timestamp, error }

type CacheEntry = {
  promise: Promise<NearbyResult<any>> | null;
  data: NearbyResult<any> | null;
  timestamp: number;
  error: string | null;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(
  type: NearbyType,
  lat: number,
  lng: number,
  zone: string | null | undefined,
  radiusKm: number,
  limit: number,
): string {
  return `${type}|${lat.toFixed(6)}|${lng.toFixed(6)}|${zone || ''}|${radiusKm}|${limit}`;
}

function isCacheValid(entry: CacheEntry | undefined): boolean {
  if (!entry || !entry.data) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

function fetchNearby<T>(
  type: NearbyType,
  latitude: number,
  longitude: number,
  zone: string | null | undefined,
  radiusKm: number,
  limit: number,
): Promise<NearbyResult<T>> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radiusKm: String(radiusKm),
    limit: String(limit),
  });
  if (zone) params.set('userZone', zone);

  return apiFetch(`/geo/nearby/${type}?${params.toString()}`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: NearbyResult<T>) => ({
      items: Array.isArray(data?.items) ? data.items : [],
      meta: data?.meta || {
        count: 0,
        center: { latitude, longitude },
        radiusKm,
        userZone: zone || null,
      },
    }));
}

function getOrCreateEntry<T>(
  type: NearbyType,
  latitude: number,
  longitude: number,
  zone: string | null | undefined,
  radiusKm: number,
  limit: number,
): CacheEntry {
  const key = cacheKey(type, latitude, longitude, zone, radiusKm, limit);
  const existing = cache.get(key);

  if (existing?.promise) return existing;
  if (isCacheValid(existing)) return existing!;

  const entry: CacheEntry = existing || {
    promise: null,
    data: null,
    timestamp: 0,
    error: null,
  };

  entry.promise = fetchNearby(type, latitude, longitude, zone, radiusKm, limit)
    .then((result) => {
      entry.data = result;
      entry.timestamp = Date.now();
      entry.error = null;
      entry.promise = null;
      return result;
    })
    .catch((err) => {
      entry.error = err?.message || 'Error cargando resultados cercanos';
      entry.promise = null;
      throw err;
    });

  cache.set(key, entry);
  return entry;
}

export function invalidateNearby(type?: NearbyType) {
  if (!type) {
    cache.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(`${type}|`)) {
      cache.delete(key);
    }
  }
}

// ============================================================
// 🔥 HOOK
// ============================================================
export function useNearby<T extends { id?: string; _id?: string; slug?: string }>(
  type: NearbyType,
  options?: { radiusKm?: number; limit?: number; enabled?: boolean },
): UseNearbyReturn<T> {
  const { location } = useLocationContext();
  const radiusKm = options?.radiusKm ?? DEFAULT_RADIUS_KM;
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const enabled = options?.enabled !== false;

  const [items, setItems] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = !!(enabled && location);

  // Ref para evitar setState en componente desmontado
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Valores primitivos para deps
  const lat = location?.latitude ?? null;
  const lng = location?.longitude ?? null;
  const zone = location?.zone ?? null;

  useEffect(() => {
    if (!isActive || lat === null || lng === null) {
      setItems(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const entry = getOrCreateEntry(type, lat, lng, zone, radiusKm, limit);

    if (entry.data) {
      // Ya hay datos en cache, los usamos de una.
      setItems(entry.data.items as T[]);
      setIsLoading(false);
      return;
    }

    entry.promise
      ?.then((result) => {
        if (!mountedRef.current) return;
        setItems(result.items as T[]);
        setError(null);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err?.message || 'No pudimos cargar los resultados cercanos.');
        setItems(null);
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });
  }, [isActive, lat, lng, zone, type, radiusKm, limit]);

  // Mapa de id -> proximity para consultar en O(1)
  const proximityMap = useMemo(() => {
    const map = new Map<string, ProximityInfo>();
    if (!items) return map;
    for (const item of items as any[]) {
      const key = item?.id || item?._id || item?.slug;
      if (!key) continue;
      map.set(String(key), {
        distanceKm: item?.distanceKm ?? null,
        distanceLabel: item?.distanceLabel ?? '',
        precision: item?.precision ?? 'city',
        zoneMatch: !!item?.zoneMatch,
      });
    }
    return map;
  }, [items]);

  const applyProximity = (item: T): ProximityInfo | undefined => {
    const key = (item as any)?.id || (item as any)?._id || (item as any)?.slug;
    if (!key) return undefined;
    return proximityMap.get(String(key));
  };

  return {
    items,
    isLoading,
    error,
    isActive,
    radiusKm,
    applyProximity,
  };
}