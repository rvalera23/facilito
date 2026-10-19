'use client';

// ============================================================
// ARCHIVO: apps/frontend/hooks/useDeliveryCheck.ts
// Hook que consulta POST /geo/check-delivery.
// Devuelve fee, distancia, ETA y canDeliver para un (buyer, tenant).
// Cachea el resultado mientras los inputs no cambien.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type CheckDeliveryReason =
  | 'ok'
  | 'no_tenant_coords'
  | 'no_buyer_coords'
  | 'out_of_range'
  | 'below_min_order'
  | 'no_delivery_config'
  | 'accepts_pickup_only'
  | null;

export interface CheckDeliveryResult {
  canDeliver: boolean;
  distanceKm: number | null;
  fee: number | null;
  etaMinutes: number | null;
  reason: CheckDeliveryReason;
  tenant: {
    slug: string;
    name: string;
    acceptsPickup: boolean;
  } | null;
  pickupAvailable: boolean;
}

export interface UseDeliveryCheckOptions {
  tenantSlug: string | null | undefined;
  buyerLat: number | null | undefined;
  buyerLng: number | null | undefined;
  orderSubtotal?: number | null;
  /** Si es false, no consulta (por ej. cuando el comprador eligió pickup). */
  enabled?: boolean;
}

export interface UseDeliveryCheckResult {
  result: CheckDeliveryResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDeliveryCheck({
  tenantSlug,
  buyerLat,
  buyerLng,
  orderSubtotal,
  enabled = true,
}: UseDeliveryCheckOptions): UseDeliveryCheckResult {
  const [result, setResult] = useState<CheckDeliveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Evitar race conditions: guardamos el request más reciente
  const reqIdRef = useRef(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Validaciones previas
    if (!enabled) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (!tenantSlug) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (
      buyerLat == null ||
      buyerLng == null ||
      !Number.isFinite(Number(buyerLat)) ||
      !Number.isFinite(Number(buyerLng))
    ) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    const reqId = ++reqIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const body: Record<string, unknown> = {
          buyerLat: Number(buyerLat),
          buyerLng: Number(buyerLng),
          tenantSlug,
        };
        if (orderSubtotal != null && Number.isFinite(Number(orderSubtotal))) {
          body.orderSubtotal = Number(orderSubtotal);
        }

        const res = await fetch(`${API_BASE}/geo/check-delivery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        // Si mientras tanto se disparó otro request, ignorar este
        if (reqId !== reqIdRef.current) return;

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
        }

        const data = (await res.json()) as CheckDeliveryResult;

        if (reqId !== reqIdRef.current) return;

        setResult(data);
        setError(null);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (reqId !== reqIdRef.current) return;
        setError(err?.message || 'Error consultando delivery');
        setResult(null);
      } finally {
        if (reqId === reqIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [tenantSlug, buyerLat, buyerLng, orderSubtotal, enabled, tick]);

  return { result, loading, error, refresh };
}