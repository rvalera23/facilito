// frontend/app/admin/[slug]/components/orders/components/hooks/useOrderActions.ts

import { useState, useCallback } from 'react';

interface UseOrderActionsProps {
  apiBase: string;
  tenantId: string;
  onOrderUpdated?: (order: any) => void;
}

// 🔥 FUNCIÓN PARA DISPARAR EVENTOS GLOBALES
const triggerGlobalRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('globalRefresh'));
    window.dispatchEvent(new Event('notificationUpdate'));
  }
};

export function useOrderActions({ apiBase, tenantId, onOrderUpdated }: UseOrderActionsProps) {
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    console.log('🔴 [useOrderActions] INICIO:', { orderId, newStatus, tenantId });

    if (!orderId) {
      console.error('❌ ID de orden no proporcionado');
      return { success: false, error: 'ID de orden no proporcionado' };
    }

    if (!tenantId) {
      console.error('❌ tenantId no proporcionado');
      return { success: false, error: 'tenantId no disponible' };
    }

    setIsUpdating(prev => ({ ...prev, [orderId]: true }));

    try {
      const token = localStorage.getItem('token');
      
      // 🔥 PRIMERO OBTENER LA ORDEN ACTUAL COMPLETA (CON IMÁGENES)
      const getResponse = await fetch(`${apiBase}/orders/${orderId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      let currentOrder = null;
      if (getResponse.ok) {
        currentOrder = await getResponse.json();
        console.log('📦 Orden actual con imágenes:', currentOrder);
      }

      const url = `${apiBase}/orders/${orderId}/status`;
      console.log('📡 [useOrderActions] Fetching:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus, tenantId }),
      });

      const data = await response.json();
      console.log('📡 [useOrderActions] Response:', data);

      setIsUpdating(prev => ({ ...prev, [orderId]: false }));

      if (!response.ok) {
        console.error('❌ Error en la respuesta:', data);
        return { success: false, error: data?.message || 'Error al actualizar' };
      }

      console.log('✅ Orden actualizada correctamente:', data);

      const orderData = data.order || data;
      
      // 🔥 MERGE: PRESERVAR IMÁGENES DE LA ORDEN ACTUAL
      let mergedOrder = orderData;
      
      if (currentOrder && currentOrder.items) {
        const mergedItems = orderData.items?.map((newItem: any, index: number) => {
          const oldItem = currentOrder.items?.[index] || {};
          return {
            ...newItem,
            // Preservar propiedades de imagen
            coverImage: newItem.coverImage || oldItem.coverImage,
            image: newItem.image || oldItem.image,
            photo: newItem.photo || oldItem.photo,
            img: newItem.img || oldItem.img,
            mediaUrls: newItem.mediaUrls || oldItem.mediaUrls,
            images: newItem.images || oldItem.images,
            existingImages: newItem.existingImages || oldItem.existingImages,
            // Preservar CUALQUIER propiedad que contenga 'image' o 'photo'
            ...Object.keys(oldItem)
              .filter(key => 
                key.toLowerCase().includes('image') || 
                key.toLowerCase().includes('photo') || 
                key.toLowerCase().includes('img') ||
                key.toLowerCase().includes('media') ||
                key.toLowerCase().includes('file') ||
                key.toLowerCase().includes('cover')
              )
              .reduce((acc, key) => {
                if (!newItem[key] && oldItem[key]) {
                  acc[key] = oldItem[key];
                }
                return acc;
              }, {} as Record<string, any>),
          };
        }) || currentOrder.items;
        
        mergedOrder = {
          ...orderData,
          items: mergedItems,
        };
      }

      if (onOrderUpdated) {
        onOrderUpdated(mergedOrder);
      }

      // Disparar eventos globales
      triggerGlobalRefresh();

      return { success: true, data: mergedOrder };

    } catch (error: any) {
      console.error('❌ Error en updateOrderStatus:', error);
      setIsUpdating(prev => ({ ...prev, [orderId]: false }));
      return { success: false, error: error?.message || 'Error desconocido' };
    }
  }, [apiBase, tenantId, onOrderUpdated]);

  return {
    updateOrderStatus,
    isUpdating,
    error,
    clearError: () => setError(null),
  };
}