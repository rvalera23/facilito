// frontend/app/admin/[slug]/components/conversations/hooks/useOrderActions.ts

import { useState, useCallback } from 'react';
import { API_BASE } from '../constants';

interface UseOrderActionsOptions {
  tenantId: string;
  onOrderUpdated?: (order: any) => void;
  onRefresh?: () => void;
}

export function useOrderActions({ tenantId, onOrderUpdated, onRefresh }: UseOrderActionsOptions) {
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  // 🔥 SOLO ACCIONES DEL ADMIN: Verificar pago y actualizar estado
  const verifyPayment = useCallback(async (orderId: string) => {
    setIsProcessing(prev => ({ ...prev, [orderId]: true }));
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        if (onOrderUpdated) onOrderUpdated(updatedOrder);
        if (onRefresh) onRefresh();
        return updatedOrder;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al verificar pago');
        return null;
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Error de conexión');
      return null;
    } finally {
      setIsProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  }, [onOrderUpdated, onRefresh]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    setIsProcessing(prev => ({ ...prev, [orderId]: true }));
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        if (onOrderUpdated) onOrderUpdated(updatedOrder);
        if (onRefresh) onRefresh();
        return updatedOrder;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al actualizar estado');
        return null;
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Error de conexión');
      return null;
    } finally {
      setIsProcessing(prev => ({ ...prev, [orderId]: false }));
    }
  }, [onOrderUpdated, onRefresh]);

  return {
    verifyPayment,
    updateOrderStatus,
    isProcessing,
    error,
  };
}