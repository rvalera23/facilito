'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
// ============================================================
// 🔥 HOOK: Mis reseñas (para el comprador)
// ============================================================
// Lista todas las reseñas que el usuario logueado dejó.
// Trae el producto/servicio populado para mostrar la card.

export interface ReviewItemInfo {
  id: string;
  name: string;
  coverImage: string | null;
  mediaUrls: string[];
  type: 'product' | 'service';
}

export interface MyReview {
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
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  item: ReviewItemInfo;
}

interface UseMyReviewsOptions {
  limit?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function useMyReviews({ limit = 20 }: UseMyReviewsOptions = {}) {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // ============================================================
  // 🔥 FETCH: mis reseñas
  // ============================================================
  const fetchReviews = useCallback(
    async (append: boolean = false, offset: number = 0) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      setError(null);

      try {
        const res = await apiFetch(`/reviews/user/me?limit=${limit}&offset=${offset}`);

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const list: MyReview[] = Array.isArray(data?.reviews) ? data.reviews : [];
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
        console.error('❌ [useMyReviews] fetchReviews:', err);
        setError(err.message || 'Error al cargar tus reseñas');
      } finally {
        if (isMountedRef.current) {
          if (append) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [limit],
  );


    // ============================================================
  // 🔥 CREAR review nueva
  // ============================================================
  const createReview = useCallback(
    async (payload: {
      tenantId: string;
      itemId: string;
      itemType: 'product' | 'service';
      rating: number;
      title?: string;
      comment?: string;
    }) => {
      setSubmitting(true);
      setError(null);

      try {
        const res = await apiFetch('/reviews', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: payload.tenantId,
            itemId: payload.itemId,
            itemType: payload.itemType,
            rating: payload.rating,
            title: payload.title || null,
            comment: payload.comment || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Error al crear la reseña');
        }

        // El backend devuelve la review con user populado pero SIN item.
        // El item lo completa quien llama al hook antes de guardarla en el state.
        if (isMountedRef.current) {
          setTotal((prev) => prev + 1);
        }

        return data;
      } catch (err: any) {
        console.error('❌ [useMyReviews] createReview:', err);
        throw err;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [],
  );


  // ============================================================
  // 🔥 EDITAR review propia
  // ============================================================
  const updateReview = useCallback(
    async (reviewId: string, rating: number, title: string, comment: string) => {
      setSubmitting(true);
      setError(null);

      try {
        const res = await apiFetch(`/reviews/${reviewId}`, {
          method: 'PATCH',
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

        // Actualizar en el state local
        if (isMountedRef.current) {
          setReviews((prev) =>
            prev.map((r) => (r.id === reviewId ? { ...r, ...data } : r)),
          );
        }

        return data as MyReview;
      } catch (err: any) {
        console.error('❌ [useMyReviews] updateReview:', err);
        throw err;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [],
  );

  // ============================================================
  // 🔥 ELIMINAR review propia (soft delete)
  // ============================================================
  const deleteReview = useCallback(async (reviewId: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch(`/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Error al eliminar la reseña');
      }

      // Quitar del state local
      if (isMountedRef.current) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setTotal((prev) => Math.max(0, prev - 1));
      }

      return data;
    } catch (err: any) {
      console.error('❌ [useMyReviews] deleteReview:', err);
      throw err;
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  }, []);

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
  // 🔥 Efecto: cargar al montar
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;
    fetchReviews(false, 0);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchReviews]);

  // ============================================================
  // 🔥 Stats (para el header)
  // ============================================================
  const stats = {
    total,
    averageRating:
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10,
          ) / 10
        : 0,
    withResponse: reviews.filter((r) => !!r.ownerResponse).length,
  };

  return {
    reviews,
    total,
    stats,

    loading,
    loadingMore,
    submitting,
    error,
    hasMore,

    createReview,
    updateReview,
    deleteReview,
    loadMore,
    refresh,
  };
}