// hooks/useTenants.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  niche?: string;
  slogan?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  modelType?: string;
  model_type?: string;
  workModality?: string;
  work_modality?: string;
  specificConfig?: any;
  specific_config?: any;
  city?: string;
  zone?: string;
  ratingAvg?: number;
  ratingCount?: number;
  likesCount?: number;
  [key: string]: any;
}

interface UseTenantsReturn {
  tenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================
// 🔥 CACHE A NIVEL DE MÓDULO
// ============================================================
// Una sola promesa compartida entre todos los consumers.
// Así, si dos componentes se montan al mismo tiempo, solo se
// hace UN fetch a /tenants.
// ============================================================

type TenantsCache = {
  data: Tenant[] | null;
  promise: Promise<Tenant[]> | null;
  timestamp: number;
  error: string | null;
};

const CACHE_TTL_MS = 60_000;

const cache: TenantsCache = {
  data: null,
  promise: null,
  timestamp: 0,
  error: null,
};

function isCacheValid(): boolean {
  if (!cache.data) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

async function fetchTenants(): Promise<Tenant[]> {
  const res = await apiFetch('/tenants');
  if (!res.ok) {
    throw new Error(`GET /tenants falló con status ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.tenants || [];
  return list;
}

function getTenantsPromise(): Promise<Tenant[]> {
  if (cache.promise) return cache.promise;

  if (isCacheValid() && cache.data) {
    return Promise.resolve(cache.data);
  }

  cache.promise = fetchTenants()
    .then((list) => {
      cache.data = list;
      cache.timestamp = Date.now();
      cache.error = null;
      cache.promise = null;
      return list;
    })
    .catch((err) => {
      cache.error = err?.message || 'Error cargando tenants';
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}

export function invalidateTenants() {
  cache.data = null;
  cache.promise = null;
  cache.timestamp = 0;
  cache.error = null;
}

// ============================================================
// 🔥 HOOK
// ============================================================
export function useTenants(): UseTenantsReturn {
  const [tenants, setTenants] = useState<Tenant[]>(() => cache.data || []);
  const [isLoading, setIsLoading] = useState<boolean>(!cache.data);
  const [error, setError] = useState<string | null>(cache.error);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (isCacheValid() && cache.data) {
      setTenants(cache.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const list = await getTenantsPromise();
      if (!mountedRef.current) return;
      setTenants(list);
      setError(null);
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err?.message || 'Error cargando tenants');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    invalidateTenants();
    await load();
  }, [load]);

  return { tenants, isLoading, error, refresh };
}