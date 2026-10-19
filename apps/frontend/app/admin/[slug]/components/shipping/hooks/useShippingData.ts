// frontend/app/admin/[slug]/components/shipping/hooks/useShippingData.ts

import { useState, useMemo } from 'react';
import { ShippingOrder, ShippingStats } from '../types';

interface UseShippingDataProps {
  orders: ShippingOrder[];
}

// 🔥 HELPER: leer el delivery desde el lugar correcto
// El backend lo guarda en `paymentMetadata.delivery`.
// Los fallbacks a `attributes.delivery` y `order.delivery` se mantienen
// por compatibilidad con órdenes viejas que pudieran tener otra forma.
function getDelivery(order: any): any {
  return (
    order?.paymentMetadata?.delivery ||
    order?.attributes?.delivery ||
    order?.delivery ||
    {}
  );
}

export function useShippingData({ orders }: UseShippingDataProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 🔥 FILTRAR SOLO ÓRDENES CON DELIVERY
  const deliveryOrders = useMemo(() => {
    return orders.filter((order: ShippingOrder) => {
      const delivery = getDelivery(order);
      const isSelected = delivery?.selected === true || delivery?.selected === 'true';
      // Es orden de delivery si tiene el flag selected activo,
      // o si tiene algún dato de delivery guardado.
      return isSelected || Boolean(delivery.company);
    });
  }, [orders]);

  // 🔥 OBTENER EMPRESAS ÚNICAS PARA FILTRO
  const uniqueCompanies = useMemo(() => {
    const companies = deliveryOrders
      .map((o: ShippingOrder) => getDelivery(o).company)
      .filter(Boolean);
    return [...new Set(companies)];
  }, [deliveryOrders]);

  // 🔥 FILTRAR ÓRDENES
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((order: ShippingOrder) => {
      const delivery = getDelivery(order);
      const deliveryStatus = delivery.status || order.status || 'PENDING';

      // Filtro por estado
      if (filterStatus !== 'all' && deliveryStatus !== filterStatus) {
        return false;
      }

      // Filtro por empresa
      if (filterCompany !== 'all' && delivery.company !== filterCompany) {
        return false;
      }

      // Búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customer = order.customerName?.toLowerCase() || '';
        const tracking = delivery.trackingNumber?.toLowerCase() || '';
        const orderId = order.id?.toLowerCase() || '';
        if (!customer.includes(query) && !tracking.includes(query) && !orderId.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [deliveryOrders, filterStatus, filterCompany, searchQuery]);

  // 🔥 ESTADÍSTICAS
  const stats = useMemo((): ShippingStats => {
    const total = deliveryOrders.length;

    const pending = deliveryOrders.filter((o: ShippingOrder) => {
      const status = getDelivery(o).status || o.status || 'PENDING';
      return status === 'PENDING' || status === 'pending' || status === 'por_enviar';
    }).length;

    const inTransit = deliveryOrders.filter((o: ShippingOrder) => {
      const status = getDelivery(o).status || o.status || 'PENDING';
      return status === 'in_transit' || status === 'IN_TRANSIT' || status === 'en_transito';
    }).length;

    const delivered = deliveryOrders.filter((o: ShippingOrder) => {
      const status = getDelivery(o).status || o.status || 'PENDING';
      return status === 'COMPLETED' || status === 'completed' || status === 'delivered' || status === 'entregado';
    }).length;

    const cancelled = deliveryOrders.filter((o: ShippingOrder) => {
      const status = getDelivery(o).status || o.status || 'PENDING';
      return status === 'CANCELLED' || status === 'cancelled' || status === 'cancelado';
    }).length;

    return { total, pending, inTransit, delivered, cancelled };
  }, [deliveryOrders]);

  return {
    deliveryOrders,
    filteredOrders,
    stats,
    filterStatus,
    setFilterStatus,
    filterCompany,
    setFilterCompany,
    searchQuery,
    setSearchQuery,
    uniqueCompanies,
  };
}