'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// 🔥 HOOK: Reviews del tenant (para el admin)
// ============================================================
// Lista todas las reviews de un tenant con filtros opcionales.
// También permite responder a una review.

export interface ReviewUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface TenantReview {
  id: string;
  tenantId: string;
  itemType: 'product' | 'service';
  itemId: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  ownerResponse: string | null;
  ownerRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
}

export interface TenantReviewsFilters {
  rating?: number | null;
  hasResponse?: boolean | null;
  itemId?: string;
  itemType?: 'product' | 'service';
}

interface UseTenantReviewsOptions {
  tenantId: string;
  limit?: number;
  filters?: TenantReviewsFilters;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function useTenantReviews({
  tenantId,
  limit = 30,
  filters = {},
}: UseTenantReviewsOptions) {
  const [reviews, setReviews] = useState<TenantReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // 🔥 Construir query string según filtros
  const buildQueryString = useCallback(
    (offset: number = 0) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      if (filters.rating != null) {
        params.set('rating', String(filters.rating));
      }
      if (filters.hasResponse === true) {
        params.set('hasResponse', 'true');
      } else if (filters.hasResponse === false) {
        params.set('hasResponse', 'false');
      }
      if (filters.itemId) {
        params.set('itemId', filters.itemId);
      }
      if (filters.itemType) {
        params.set('itemType', filters.itemType);
      }

      return params.toString();
    },
    [limit, filters.rating, filters.hasResponse, filters.itemId, filters.itemType],
  );

  // ============================================================
  // 🔥 FETCH: lista de reviews del tenant
  // ============================================================
  const fetchReviews = useCallback(
    async (append: boolean = false, offset: number = 0) => {
      if (!tenantId) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      setError(null);

      try {
        const token =
          localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!token) {
          throw new Error('No autenticado');
        }

        const qs = buildQueryString(offset);
        const url = `${API_BASE}/reviews/tenant/${tenantId}?${qs}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const list: TenantReview[] = Array.isArray(data?.reviews) ? data.reviews : [];
        const totalCount: number = Number(data?.total) || 0;

        if (!isMountedRef.current) return;

        if (append) {
          setReviews((prev) => [...prev, ...list]);
        } else {
          setReviews(list);
        }
        setTotal(totalCount);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.error('❌ [useTenantReviews] fetchReviews:', err);
        setError(err.message || 'Error al cargar reseñas');
      } finally {
        if (isMountedRef.current) {
          if (append) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [tenantId, buildQueryString],
  );

  // ============================================================
  // 🔥 RESPONDER: agregar/editar respuesta del dueño
  // ============================================================
  const respondToReview = useCallback(
    async (reviewId: string, response: string) => {
      if (!tenantId) throw new Error('No hay tenantId');
      if (!response.trim()) throw new Error('La respuesta no puede estar vacía');

      setSubmitting(true);
      setError(null);

      try {
        const token =
          localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!token) throw new Error('No autenticado');

        const url = `${API_BASE}/reviews/${reviewId}/respond`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tenantId, response: response.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Error al responder la reseña');
        }

        // Actualizar la review en el state local
        if (isMountedRef.current) {
          setReviews((prev) =>
            prev.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    ownerResponse: data.ownerResponse,
                    ownerRespondedAt: data.ownerRespondedAt,
                  }
                : r,
            ),
          );
        }

        return data as TenantReview;
      } catch (err: any) {
        console.error('❌ [useTenantReviews] respondToReview:', err);
        throw err;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [tenantId],
  );

  // ============================================================
  // 🔥 Cargar más (paginación)
  // ============================================================
  const loadMore = useCallback(() => {
    if (loadingMore) return;
    if (reviews.length >= total) return;
    fetchReviews(true, reviews.length);
  }, [loadingMore, reviews.length, total, fetchReviews]);

  const hasMore = reviews.length < total;

  // ============================================================
  // 🔥 Refrescar manualmente
  // ============================================================
  const refresh = useCallback(() => {
    fetchReviews(false, 0);
  }, [fetchReviews]);

  // ============================================================
  // 🔥 Efecto: cargar al montar / cuando cambian tenantId o filtros
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;

    if (tenantId) {
      fetchReviews(false, 0);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [tenantId, fetchReviews]);

  // ============================================================
  // 🔥 Contadores (para el header)
  // ============================================================
  const stats = {
    total,
    withResponse: reviews.filter((r) => !!r.ownerResponse).length,
    withoutResponse: reviews.filter((r) => !r.ownerResponse).length,
    averageRating:
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10,
          ) / 10
        : 0,
  };

  return {
    // Datos
    reviews,
    total,
    stats,

    // Estados
    loading,
    loadingMore,
    submitting,
    error,
    hasMore,

    // Acciones
    respondToReview,
    loadMore,
    refresh,
  };
}