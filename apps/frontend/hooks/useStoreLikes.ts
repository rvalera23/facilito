'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface UseStoreLikesProps {
  tenantId: string;
  userId?: string | null;
  initialLikes?: number;
  initialLiked?: boolean;
}

export function useStoreLikes({ 
  tenantId, 
  userId, 
  initialLikes = 0, 
  initialLiked = false 
}: UseStoreLikesProps) {
  const [likes, setLikes] = useState<number>(initialLikes);
  const [isLiked, setIsLiked] = useState<boolean>(initialLiked);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const fetchLikes = useCallback(async () => {
    if (!tenantId) {
      console.log('🔍 [useStoreLikes] No hay tenantId');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      
      console.log('🔍 [useStoreLikes] Fetching likes para tenant:', tenantId);
      
      const response = await fetch(`${API_BASE}/tenants/${tenantId}/likes`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 [useStoreLikes] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [useStoreLikes] Data:', data);
        
        setLikes(data.likesCount || 0);
        
        // 🔥 Si el backend devuelve userLiked, usarlo
        if (data.userLiked !== undefined) {
          setIsLiked(data.userLiked === true);
          console.log('🔍 [useStoreLikes] setIsLiked establecido a:', data.userLiked);
        } else {
          // 🔥 FALLBACK: Usar el valor de initialLiked
          setIsLiked(initialLiked);
          console.log('🔍 [useStoreLikes] Fallback - setIsLiked establecido a:', initialLiked);
        }
      } else {
        console.warn('🔍 [useStoreLikes] Response no ok:', response.status);
      }
    } catch (err) {
      console.error('Error fetching likes:', err);
      setError('Error al cargar los likes');
    } finally {
      setLoading(false);
    }
  }, [tenantId, initialLiked]);

  const toggleLike = useCallback(async () => {
    if (!tenantId || !userId) {
      console.warn('⚠️ Usuario no autenticado, no se puede dar like');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();

      // Optimistic update
      const newLiked = !isLiked;
      const newCount = newLiked ? likes + 1 : Math.max(0, likes - 1);
      setLikes(newCount);
      setIsLiked(newLiked);

      const response = await fetch(`${API_BASE}/tenants/${tenantId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        // Revertir en caso de error
        setLikes(likes);
        setIsLiked(isLiked);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al dar like');
      }

      const data = await response.json();
      console.log('🔍 [useStoreLikes] Toggle response:', data);
      setLikes(data.likesCount || 0);
      setIsLiked(data.liked || false);
    } catch (err) {
      console.error('Error toggling like:', err);
      setError('Error al procesar tu like');
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, likes, isLiked]);

  // 🔥 Cargar al montar - con dependencias correctas
  useEffect(() => {
    console.log('🔍 [useStoreLikes] useEffect ejecutado - tenantId:', tenantId);
    console.log('🔍 [useStoreLikes] useEffect - userId:', userId);
    if (tenantId) {
      fetchLikes();
    }
  }, [tenantId, userId, fetchLikes]);

  return {
    likes,
    isLiked,
    loading,
    error,
    toggleLike,
    refresh: fetchLikes,
  };
}