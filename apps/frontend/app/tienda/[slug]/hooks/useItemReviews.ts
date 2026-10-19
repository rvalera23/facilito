'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// 🔥 HOOK: Reviews de productos y servicios
// ============================================================
// Consume los endpoints de /reviews. Sigue el mismo patrón que
// useFavorites: lee token/userId de localStorage, manda Bearer.

export interface ReviewUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ItemReview {
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

export interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CanReviewResult {
  canReview: boolean;
  reason?: string;
  orderId?: string;
  existingReviewId?: string;
}

interface UseItemReviewsOptions {
  tenantId: string;
  itemId: string;
  itemType: 'product' | 'service';
  /** Cuántas reviews traer por página. Default: 10 */
  limit?: number;
}

export function useItemReviews({
  tenantId,
  itemId,
  itemType,
  limit = 10,
}: UseItemReviewsOptions) {
  const [reviews, setReviews] = useState<ItemReview[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ReviewSummary>({
    averageRating: 0,
    totalCount: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [canReviewResult, setCanReviewResult] = useState<CanReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // 🔥 API base + auth (mismo patrón que useFavorites)
  const getApiBase = useCallback(() => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    );
  }, []);

  const getAuthData = useCallback(() => {
    if (typeof window === 'undefined') return { userId: null, token: null };
    try {
      const userStr = localStorage.getItem('user');
      const token =
        localStorage.getItem('token') || localStorage.getItem('access_token');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?.sub || user?.userId || user?._id;
      return { userId: userId || null, token: token || null };
    } catch {
      return { userId: null, token: null };
    }
  }, []);

  // ============================================================
  // 🔥 FETCH: lista de reviews
  // ============================================================
  const fetchReviews = useCallback(
    async (append: boolean = false, offset: number = 0) => {
      if (!tenantId || !itemId || !itemType) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      setError(null);

      try {
        const apiBase = getApiBase();
        const url = `${apiBase}/reviews/item/${itemId}?tenantId=${tenantId}&itemType=${itemType}&limit=${limit}&offset=${offset}`;

        const res = await fetch(url, { cache: 'no-store' });

        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }

        const data = await res.json();
        const list: ItemReview[] = Array.isArray(data?.reviews) ? data.reviews : [];
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
        console.error('❌ [useItemReviews] fetchReviews:', err);
        setError(err.message || 'Error al cargar reseñas');
      } finally {
        if (isMountedRef.current) {
          if (append) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [tenantId, itemId, itemType, limit, getApiBase],
  );

  // ============================================================
  // 🔥 FETCH: resumen (promedio + distribución)
  // ============================================================
  const fetchSummary = useCallback(async () => {
    if (!tenantId || !itemId || !itemType) return;

    try {
      const apiBase = getApiBase();
      const url = `${apiBase}/reviews/item/${itemId}/summary?tenantId=${tenantId}&itemType=${itemType}`;

      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data: ReviewSummary = await res.json();

      if (!isMountedRef.current) return;

      setSummary({
        averageRating: Number(data?.averageRating) || 0,
        totalCount: Number(data?.totalCount) || 0,
        distribution: {
          5: Number(data?.distribution?.[5]) || 0,
          4: Number(data?.distribution?.[4]) || 0,
          3: Number(data?.distribution?.[3]) || 0,
          2: Number(data?.distribution?.[2]) || 0,
          1: Number(data?.distribution?.[1]) || 0,
        },
      });
    } catch (err) {
      console.error('❌ [useItemReviews] fetchSummary:', err);
    }
  }, [tenantId, itemId, itemType, getApiBase]);

  // ============================================================
  // 🔥 FETCH: can-review (requiere auth)
  // ============================================================
  const fetchCanReview = useCallback(async () => {
    if (!tenantId || !itemId || !itemType) return;

    const { userId, token } = getAuthData();
    if (!userId || !token) {
      setCanReviewResult(null);
      return;
    }

    try {
      const apiBase = getApiBase();
      const url = `${apiBase}/reviews/item/${itemId}/can-review?tenantId=${tenantId}&itemType=${itemType}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        // Si falla (401, etc), simplemente no hay info de can-review
        setCanReviewResult(null);
        return;
      }

      const data: CanReviewResult = await res.json();
      if (!isMountedRef.current) return;
      setCanReviewResult(data);
    } catch (err) {
      console.error('❌ [useItemReviews] fetchCanReview:', err);
      setCanReviewResult(null);
    }
  }, [tenantId, itemId, itemType, getApiBase, getAuthData]);

  // ============================================================
  // 🔥 CREAR review
  // ============================================================
  const createReview = useCallback(
    async (rating: number, title: string, comment: string) => {
      const { token } = getAuthData();
      if (!token) {
        throw new Error('Necesitás iniciar sesión para dejar una reseña');
      }

      setSubmitting(true);
      setError(null);

      try {
        const apiBase = getApiBase();
        const url = `${apiBase}/reviews`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tenantId,
            itemId,
            itemType,
            rating,
            title: title || null,
            comment: comment || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Error al crear la reseña');
        }

        // Refrescar lista + summary + can-review
        await Promise.all([
          fetchReviews(false, 0),
          fetchSummary(),
          fetchCanReview(),
        ]);

        return data as ItemReview;
      } catch (err: any) {
        console.error('❌ [useItemReviews] createReview:', err);
        throw err;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [tenantId, itemId, itemType, getApiBase, getAuthData, fetchReviews, fetchSummary, fetchCanReview],
  );

  // ============================================================
  // 🔥 EDITAR review propia
  // ============================================================
  const updateOwnReview = useCallback(
    async (reviewId: string, rating: number, title: string, comment: string) => {
      const { token } = getAuthData();
      if (!token) throw new Error('Necesitás iniciar sesión');

      setSubmitting(true);
      setError(null);

      try {
        const apiBase = getApiBase();
        const url = `${apiBase}/reviews/${reviewId}`;

        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating,
            title: title || null,
            comment: comment || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Error al actualizar la reseña');
        }

        await Promise.all([fetchReviews(false, 0), fetchSummary()]);
        return data as ItemReview;
      } catch (err: any) {
        console.error('❌ [useItemReviews] updateOwnReview:', err);
        throw err;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [getApiBase, getAuthData, fetchReviews, fetchSummary],
  );

  // ============================================================
  // 🔥 ELIMINAR review propia (soft delete)
  // ============================================================
  const deleteOwnReview = useCallback(
    async (reviewId: string) => {
      const { token } = getAuthData();
      if (!token) throw new Error('Necesitás iniciar sesión');

      setSubmitting(true);
      setError(null);

      try {
        const apiBase = getApiBase();
        const url = `${apiBase}/reviews/${reviewId}`;

        const res = await fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Error al eliminar la reseña');
        }

        await Promise.all([fetchReviews(false, 0), fetchSummary()]);
        return data;
      } catch (err: any) {
        console.error('❌ [useItemReviews] deleteOwnReview:', err);
        throw err;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [getApiBase, getAuthData, fetchReviews, fetchSummary],
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
  // 🔥 EFECTO: cargar al montar / cuando cambian los IDs
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;

    if (tenantId && itemId && itemType) {
      fetchReviews(false, 0);
      fetchSummary();
      fetchCanReview();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [tenantId, itemId, itemType, fetchReviews, fetchSummary, fetchCanReview]);

  return {
    // Datos
    reviews,
    total,
    summary,
    canReviewResult,

    // Estados
    loading,
    loadingMore,
    submitting,
    error,
    hasMore,

    // Acciones
    createReview,
    updateOwnReview,
    deleteOwnReview,
    loadMore,
    refresh: () => {
      fetchReviews(false, 0);
      fetchSummary();
      fetchCanReview();
    },
  };
}