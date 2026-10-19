// hooks/useOrders.ts

import { useState, useMemo } from 'react';

export const useOrders = (orders: any[] = []) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'total' | 'id'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

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

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchFilter, statusFilter]);

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'date') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (sortField === 'total') {
        valA = Number(a.totalAmount || a.total || 0);
        valB = Number(b.totalAmount || b.total || 0);
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

  return {
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
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
  };
};