// frontend/app/admin/[slug]/components/shipping/hooks/useShippingActions.ts

import { useState } from 'react';
import { API_BASE } from '../constants';
import { ShippingOrder } from '../types';

interface UseShippingActionsProps {
  onRefresh?: () => void;
  onOrderUpdated?: (order: ShippingOrder) => void;
}

export function useShippingActions({ onRefresh, onOrderUpdated }: UseShippingActionsProps = {}) {
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  // 🔥 FUNCIÓN PARA ACTUALIZAR ESTADO DE ENVÍO
  const updateDeliveryStatus = async (orderId: string, status: string) => {
    setIsUpdating(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const token = localStorage.getItem('token');
      
      // Obtenemos la orden completa para preservar los atributos existentes
      const fetchResponse = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!fetchResponse.ok) {
        throw new Error('No se pudo obtener la orden');
      }
      
      const order = await fetchResponse.json();

      // 🔥 El delivery vive en `paymentMetadata.delivery` (backend).
      // Fallbacks para órdenes viejas.
      const currentDelivery =
        order.paymentMetadata?.delivery ||
        order.attributes?.delivery ||
        order.delivery ||
        {};

      // 🔥 Usar el endpoint dedicado `PATCH /orders/:id/delivery`
      // (no existe `PATCH /orders/:id` genérico).
      const response = await fetch(`${API_BASE}/orders/${orderId}/delivery`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentDelivery,
          status,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        
        if (onOrderUpdated) {
          onOrderUpdated(updated);
        }
        
        if (onRefresh) {
          onRefresh();
        }
        
        // Disparar eventos globales
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globalRefresh'));
          window.dispatchEvent(new Event('notificationUpdate'));
        }
        
        return updated;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error al actualizar estado de envío:', error);
      throw error;
    } finally {
      setIsUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // 🔥 FUNCIÓN PARA ACTUALIZAR TRACKING NUMBER + URL
  const updateDeliveryTracking = async (
    orderId: string,
    trackingNumber: string,
    trackingUrl: string,
  ) => {
    setIsUpdating(prev => ({ ...prev, [orderId]: true }));

    try {
      const token = localStorage.getItem('token');

      const fetchResponse = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!fetchResponse.ok) {
        throw new Error('No se pudo obtener la orden');
      }

      const order = await fetchResponse.json();

      const currentDelivery =
        order.paymentMetadata?.delivery ||
        order.attributes?.delivery ||
        order.delivery ||
        {};

      const response = await fetch(`${API_BASE}/orders/${orderId}/delivery`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentDelivery,
          trackingNumber: trackingNumber.trim(),
          trackingUrl: trackingUrl.trim(),
        }),
      });

      if (response.ok) {
        const updated = await response.json();

        if (onOrderUpdated) {
          onOrderUpdated(updated);
        }
        if (onRefresh) {
          onRefresh();
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globalRefresh'));
          window.dispatchEvent(new Event('notificationUpdate'));
        }

        return updated;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar tracking');
      }
    } catch (error) {
      console.error('Error al actualizar tracking:', error);
      throw error;
    } finally {
      setIsUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return {
    updateDeliveryStatus,
    updateDeliveryTracking,
    isUpdating,
  };
}