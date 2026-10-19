// hooks/useUnifiedOrders.ts

import { useState, useMemo } from 'react';

// 🔥 FUNCIÓN PARA DETECTAR EL TIPO DE ORDEN (PRODUCTO, SERVICIO O MIXTO) - SIN CAMBIOS
const getOrderMainType = (order: any): 'product' | 'service' | 'mixed' => {
  if (!order) return 'product';
  
  let hasProduct = false;
  let hasService = false;
  
  if (order.serviceDetails) {
    hasService = true;
  }
  
  if (order.serviceId) {
    hasService = true;
  }
  
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    for (const item of order.items) {
      if (item.itemType === 'product' || 
          item.type === 'product' || 
          (item.category && !item.serviceModality) ||
          item.productId) {
        hasProduct = true;
      }
      
      if (item.itemType === 'service' || 
          item.type === 'service' || 
          item.serviceModality || 
          item.serviceId ||
          item.serviceDetails) {
        hasService = true;
      }
    }
  }
  
  if (order.type === 'service' || order.itemType === 'service') {
    hasService = true;
  }
  
  if (order.type === 'product' || order.itemType === 'product') {
    hasProduct = true;
  }
  
  if (hasProduct && hasService) return 'mixed';
  if (hasService) return 'service';
  return 'product';
};

// 🔥 OBTENER TOTAL EN VES - SOLO LEE, NO RECALCULA
const getOrderTotalVes = (order: any): number => {
  if (!order) return 0;
  
  // 🔥 1. Si es cita (appointment)
  if (order._sourceType === 'appointment') {
    if (order.priceVes) return Number(order.priceVes);
    if (order.price) return Number(order.price);
    if (order.total) return Number(order.total);
    if (order.totalAmountVes) return Number(order.totalAmountVes);
    return 0;
  }
  
  // 🔥 2. Si es orden de producto
  if (order.totalAmountVes) return Number(order.totalAmountVes);
  if (order.totalVes) return Number(order.totalVes);
  if (order.total) return Number(order.total);
  
  return 0;
};

export const useUnifiedOrders = (orders: any[] = []) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'total' | 'id'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // 🔥 ESTADÍSTICAS - SOLO LEE, NO RECALCULA
  const stats = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    
    let totalProductOrders = 0;
    let totalServiceOrders = 0;
    let totalMixedOrders = 0;
    let totalUsd = 0;
    let totalVes = 0;

    safeOrders.forEach((o) => {
      const status = (o?.status || '').toLowerCase().trim();
      if (status.includes('canc') || status.includes('rechaz')) return;

      const mainType = getOrderMainType(o);
      
      // 🔥 LEER, NO RECALCULAR
      totalUsd += Number(o?.totalAmount || o?.total || o?.price || 0);
      totalVes += getOrderTotalVes(o);

      if (mainType === 'service') totalServiceOrders++;
      else if (mainType === 'product') totalProductOrders++;
      else if (mainType === 'mixed') totalMixedOrders++;
    });

    return {
      totalOrders: safeOrders.length,
      totalProductOrders,
      totalServiceOrders,
      totalMixedOrders,
      totalSpent: { usd: totalUsd, ves: totalVes },
    };
  }, [orders]);

  // 🔥 FILTRADO
  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    return safeOrders.filter(o => {
      const matchesSearch = 
        (String(o.id || o._id || '').toLowerCase().includes(searchFilter.toLowerCase()) || 
         String(o.paymentMethodUsed || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
         String(o.paymentReference || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
         (Array.isArray(o.items) && o.items.some((item: any) => 
           (item.name || item.productName || item.title || '').toLowerCase().includes(searchFilter.toLowerCase())
         )));
      
      const orderStatus = (o.status || 'pendiente').toLowerCase();
      let matchesStatus = true;

      if (statusFilter === 'pending') {
        matchesStatus = orderStatus.includes('pend') || orderStatus.includes('por_verificar');
      } else if (statusFilter === 'completed') {
        matchesStatus = orderStatus.includes('complet') || orderStatus.includes('pagado') || orderStatus.includes('aprobado');
      } else if (statusFilter === 'cancelled') {
        matchesStatus = orderStatus.includes('canc') || orderStatus.includes('rechaz');
      }

      const mainType = getOrderMainType(o);
      let matchesType = true;
      
      if (typeFilter === 'product') {
        matchesType = mainType === 'product';
      } else if (typeFilter === 'service') {
        matchesType = mainType === 'service';
      } else if (typeFilter === 'mixed') {
        matchesType = mainType === 'mixed';
      }

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchFilter, statusFilter, typeFilter]);

  // ORDENAMIENTO
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'date') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (sortField === 'total') {
        valA = getOrderTotalVes(a);
        valB = getOrderTotalVes(b);
      } else if (sortField === 'id') {
        valA = String(a.id || a._id || '');
        valB = String(b.id || b._id || '');
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortField, sortDirection]);

  // PAGINACIÓN
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(start, start + itemsPerPage);
  }, [sortedOrders, currentPage, itemsPerPage]);

  const handleSort = (field: 'date' | 'total' | 'id') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const summary = useMemo(() => ({
    total: stats.totalOrders,
    products: stats.totalProductOrders,
    services: stats.totalServiceOrders,
    mixed: stats.totalMixedOrders,
  }), [stats]);

  return {
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    sortField,
    sortDirection,
    handleSort,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    totalPages,
    filteredOrders,
    sortedOrders,
    paginatedOrders,
    totalItems: sortedOrders.length,
    stats,
    summary,
  };
};