'use client';

import { useState, useEffect, useCallback } from 'react';

export function useBrands(tenantId?: string) {
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const fetchBrands = useCallback(async () => {
    if (!tenantId) {
      setBrands([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // 🔥 Obtener todas las marcas únicas de los productos del tenant
      const response = await fetch(`${API_BASE}/products/tenant/${tenantId}/brands`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBrands(Array.isArray(data) ? data : data.brands || []);
      } else {
        setError('Error al cargar marcas');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching brands:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, API_BASE]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return { brands, loading, error, refresh: fetchBrands };
}