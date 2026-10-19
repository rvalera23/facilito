'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// 🔥 HOOK: Plantillas de respuesta rápida (para el admin)
// ============================================================

export interface QuickReply {
  id: string;
  tenantId: string;
  label: string;
  text: string;
  category: string | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function useQuickReplies() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  // ============================================================
  // 🔥 FETCH
  // ============================================================
  const fetchReplies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('No autenticado');

      const res = await fetch(`${API_BASE}/quick-replies`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      if (!isMountedRef.current) return;
      setReplies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('❌ [useQuickReplies] fetch:', err);
      setError(err.message || 'Error al cargar plantillas');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // ============================================================
  // 🔥 CREATE
  // ============================================================
  const createReply = useCallback(
    async (data: { label: string; text: string; category?: string }) => {
      setSubmitting(true);
      try {
        const token = getToken();
        if (!token) throw new Error('No autenticado');

        const res = await fetch(`${API_BASE}/quick-replies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Error al crear');

        if (isMountedRef.current) {
          setReplies((prev) => [...prev, json]);
        }
        return json as QuickReply;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [],
  );

  // ============================================================
  // 🔥 UPDATE
  // ============================================================
  const updateReply = useCallback(
    async (
      id: string,
      data: { label?: string; text?: string; category?: string },
    ) => {
      setSubmitting(true);
      try {
        const token = getToken();
        if (!token) throw new Error('No autenticado');

        const res = await fetch(`${API_BASE}/quick-replies/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Error al actualizar');

        if (isMountedRef.current) {
          setReplies((prev) => prev.map((r) => (r.id === id ? json : r)));
        }
        return json as QuickReply;
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [],
  );

  // ============================================================
  // 🔥 DELETE
  // ============================================================
  const deleteReply = useCallback(async (id: string) => {
    setSubmitting(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No autenticado');

      const res = await fetch(`${API_BASE}/quick-replies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Error al eliminar');
      }

      if (isMountedRef.current) {
        setReplies((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  }, []);

  // ============================================================
  // 🔥 INIT
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;
    fetchReplies();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchReplies]);

  return {
    replies,
    loading,
    submitting,
    error,
    refresh: fetchReplies,
    createReply,
    updateReply,
    deleteReply,
  };
}