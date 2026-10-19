'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface UseStoreRatingProps {
  tenantId: string;
  userId?: string | null;
  initialRating?: number | null;
  initialAvg?: number;
  initialCount?: number;
}

export function useStoreRating({ 
  tenantId, 
  userId, 
  initialRating = null,
  initialAvg = 0,
  initialCount = 0,
}: UseStoreRatingProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [ratingAvg, setRatingAvg] = useState<number>(initialAvg);
  const [ratingCount, setRatingCount] = useState<number>(initialCount);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  // 🔥 Obtener valoración de la tienda
  const fetchRating = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/tenants/${tenantId}/rating`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRatingAvg(data.ratingAvg || 0);
        setRatingCount(data.ratingCount || 0);
        if (data.userRating !== undefined && data.userRating !== null) {
          setRating(data.userRating);
        }
      }
    } catch (err) {
      console.error('Error fetching rating:', err);
      setError('Error al cargar la valoración');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // 🔥 Enviar valoración
  const submitRating = useCallback(async (newRating: number, comment?: string) => {
    if (!tenantId || !userId) {
      console.warn('⚠️ Usuario no autenticado, no se puede valorar');
      return;
    }

    if (newRating < 1 || newRating > 5) {
      setError('La valoración debe ser entre 1 y 5 estrellas');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();

      // 🔥 Optimistic update
      const oldRating = rating;
      setRating(newRating);

      const response = await fetch(`${API_BASE}/tenants/${tenantId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, rating: newRating, comment }),
      });

      if (!response.ok) {
        // 🔥 Revertir en caso de error
        setRating(oldRating);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al valorar');
      }

      const data = await response.json();
      setRating(newRating);
      setRatingAvg(data.ratingAvg || 0);
      setRatingCount(data.ratingCount || 0);
    } catch (err) {
      console.error('Error submitting rating:', err);
      setError('Error al enviar tu valoración');
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, rating]);

  // 🔥 Cargar al montar
  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  return {
    rating,
    ratingAvg,
    ratingCount,
    loading,
    error,
    submitRating,
    refresh: fetchRating,
  };
}