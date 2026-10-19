'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================
// 🔥 HOOK: Items pendientes de reseñar (para el comprador)
// ============================================================
// Trae las órdenes completadas del usuario y, cruzando contra
// sus reseñas existentes, devuelve solo los items sin reseña.

export interface PendingReviewItem {
  orderId: string;
  orderCreatedAt: string;
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  itemId: string;
  itemType: 'product' | 'service';
  itemName: string;
  itemCoverImage: string | null;
  quantity: number;
}

interface UsePendingReviewsOptions {
  /** Lista de items ya reseñados: `${itemType}:${itemId}` */
  reviewedKeys: Set<string>;
  enabled?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function usePendingReviews({
  reviewedKeys,
  enabled = true,
}: UsePendingReviewsOptions) {
  const [items, setItems] = useState<PendingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const fetchOrders = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token =
        localStorage.getItem('token') || localStorage.getItem('access_token');

      if (!token) {
        throw new Error('No autenticado');
      }

      const res = await fetch(`${API_BASE}/api/account/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      const orders: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
        ? data.orders
        : [];

      if (!isMountedRef.current) return;

      // 🔥 Filtrar órdenes completadas y expandir items sin reseña
      const pending: PendingReviewItem[] = [];

      for (const order of orders) {
        const status = String(order.status || '').toUpperCase();
        const isCompleted =
          status === 'COMPLETED' ||
          status === 'COMPLETADA' ||
          status === 'PAGADO' ||
          status === 'APROBADO';

        if (!isCompleted) continue;
        if (!Array.isArray(order.items)) continue;

        for (const item of order.items) {
          const itemId =
            item.productId || item.serviceId || item.id || item._id;
          if (!itemId) continue;

          const itemType: 'product' | 'service' =
            item.type === 'service' || item.serviceId ? 'service' : 'product';

          const key = `${itemType}:${itemId}`;

          // Si ya tiene reseña, saltar
          if (reviewedKeys.has(key)) continue;

          pending.push({
            orderId: order.id,
            orderCreatedAt: order.createdAt,
            tenantId: order.tenantId,
            tenantName:
              order.tenantName ||
              order.tenant?.name ||
              order.store?.name ||
              undefined,
            tenantSlug:
              order.tenantSlug ||
              order.tenant?.slug ||
              order.store?.slug ||
              undefined,
            itemId,
            itemType,
            itemName:
              item.name ||
              item.productName ||
              item.title ||
              'Artículo',
            itemCoverImage:
              item.coverImage || item.image || item.mediaUrls?.[0] || null,
            quantity: Number(item.quantity || item.qty || 1),
          });
        }
      }

      setItems(pending);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('❌ [usePendingReviews]', err);
      setError(err?.message || 'Error al cargar pendientes');
      setItems([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [enabled, reviewedKeys]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchOrders();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrders]);

  const total = useMemo(() => items.length, [items]);

  return {
    items,
    total,
    loading,
    error,
    refresh: fetchOrders,
  };
}