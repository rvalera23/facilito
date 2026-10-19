'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, User, Phone, FileText, X, Users, CheckCircle2, AlertCircle, Clock as ClockIcon, DollarSign } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { formatUsd } from '@/lib/price-utils';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface ServiceBookingsTabProps {
  bookings: any[];
  tenant?: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onUpdateBooking?: (updatedBooking: any) => void;
}

// 🔥 Helper para obtener el label del estado
const getStatusLabel = (status: string): { label: string; color: string; bg: string; icon: React.ReactNode } => {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    'pending': { 
      label: 'Pendiente', 
      color: '#f59e0b', 
      bg: 'bg-amber-500/10',
      icon: <ClockIcon className="w-3 h-3" />
    },
    'confirmed': { 
      label: 'Confirmada', 
      color: '#10b981', 
      bg: 'bg-emerald-500/10',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    'in_progress': { 
      label: 'En curso', 
      color: '#3b82f6', 
      bg: 'bg-blue-500/10',
      icon: <Clock className="w-3 h-3" />
    },
    'completed': { 
      label: 'Completada', 
      color: '#8b5cf6', 
      bg: 'bg-purple-500/10',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    'cancelled': { 
      label: 'Cancelada', 
      color: '#ef4444', 
      bg: 'bg-red-500/10',
      icon: <X className="w-3 h-3" />
    },
    'no_show': { 
      label: 'No asistió', 
      color: '#6b7280', 
      bg: 'bg-gray-500/10',
      icon: <AlertCircle className="w-3 h-3" />
    },
  };
  return map[status] || { label: status || 'Pendiente', color: '#6b7280', bg: 'bg-gray-500/10', icon: <ClockIcon className="w-3 h-3" /> };
};

// 🔥 Helper para formatear fecha - CORREGIDO (UTC)
const formatDateTime = (date: string, time: string) => {
  if (!date) return 'Fecha no disponible';
  try {
    // 🔥 DESCOMPONER LA FECHA Y CREARLA EN UTC
    const parts = date.split('-');
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const tomorrowUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1));

    let dayStr = '';
    if (d.getTime() === todayUTC.getTime()) {
      dayStr = 'Hoy';
    } else if (d.getTime() === tomorrowUTC.getTime()) {
      dayStr = 'Mañana';
    } else {
      dayStr = d.toLocaleDateString('es-VE', { 
        day: '2-digit', 
        month: 'short',
        timeZone: 'UTC'
      });
    }

    return `${dayStr} - ${time || 'Horario flexible'}`;
  } catch {
    return `${date} - ${time || 'Horario flexible'}`;
  }
};

// 🔥 Helper para formatear duración
const formatDuration = (minutes: number | string) => {
  const mins = Number(minutes) || 0;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  }
  return `${mins}min`;
};

// 🔥 Helper para formatear precio
const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🔥 Helper para obtener el precio del booking (VES + USD + descuento)
const getBookingPrice = (booking: any): {
  priceVes: number;
  priceUsd: number;
  hasDiscount: boolean;
  discountPercentage: number;
  discountAmountVES: number;
  discountAmountUSD: number;
  originalPriceVES: number;
  originalPriceUSD: number;
} | null => {
  // 🔥 PRIORIDAD 1: `pricingSnapshot` del backend (Fase 5)
  if (booking.pricingSnapshot?.totalPriceVES !== undefined && booking.pricingSnapshot?.totalPriceVES !== null) {
    const ps = booking.pricingSnapshot;
    return {
      priceVes: Number(ps.totalPriceVES),
      priceUsd: Number(ps.totalPriceUSD || 0),
      hasDiscount: Boolean(ps.hasDiscount) && Number(ps.discountPercentage) > 0,
      discountPercentage: Number(ps.discountPercentage || 0),
      discountAmountVES: Number(ps.discountAmountVES || 0),
      discountAmountUSD: Number(ps.discountAmountUSD || 0),
      originalPriceVES: Number(ps.originalPriceVES || ps.totalPriceVES),
      originalPriceUSD: Number(ps.originalPriceUSD || ps.totalPriceUSD || 0),
    };
  }

  // 🔴 FALLBACK 1: priceVes / priceUsd (formato viejo)
  if (booking.priceVes !== undefined && booking.priceVes !== null) {
    const ves = Number(booking.priceVes);
    return {
      priceVes: ves,
      priceUsd: Number(booking.priceUsd || 0),
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      discountAmountUSD: 0,
      originalPriceVES: ves,
      originalPriceUSD: Number(booking.priceUsd || 0),
    };
  }

  // 🔴 FALLBACK 2: price (formato viejo, sin snapshot)
  if (booking.price !== undefined && booking.price !== null) {
    const ves = Number(booking.price);
    return {
      priceVes: ves,
      priceUsd: 0,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      discountAmountUSD: 0,
      originalPriceVES: ves,
      originalPriceUSD: 0,
    };
  }

  // 🔴 FALLBACK 3: service.price (precio del catálogo)
  if (booking.service?.price !== undefined && booking.service?.price !== null) {
    const ves = Number(booking.service.price);
    return {
      priceVes: ves,
      priceUsd: 0,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      discountAmountUSD: 0,
      originalPriceVES: ves,
      originalPriceUSD: 0,
    };
  }

  // 🔴 FALLBACK 4: attributes.prices.VES
  if (booking.attributes?.prices?.VES !== undefined && booking.attributes?.prices?.VES !== null) {
    const ves = Number(booking.attributes.prices.VES);
    const usd = Number(booking.attributes?.prices?.USD || 0);
    return {
      priceVes: ves,
      priceUsd: usd,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      discountAmountUSD: 0,
      originalPriceVES: ves,
      originalPriceUSD: usd,
    };
  }

  return null;
};

export default function ServiceBookingsTab({
  bookings,
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onUpdateBooking,
}: ServiceBookingsTabProps) {
  console.log('🔍 [ServiceBookingsTab] Componente montado con tenant:', tenant);
  console.log('🔍 [ServiceBookingsTab] tenant.id:', tenant?.id);
  console.log('🔍 [ServiceBookingsTab] tenant.tenantId:', tenant?.tenantId);
  console.log('🔍 [ServiceBookingsTab] tenant._id:', tenant?._id);
  console.log('🔍 [ServiceBookingsTab] Bookings iniciales:', bookings?.length || 0);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'date' | 'customer' | 'status' | 'price'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [localBookings, setLocalBookings] = useState<any[]>(bookings);

  useEffect(() => {
    console.log('🔄 [ServiceBookingsTab] Bookings actualizados:', bookings?.length || 0);
    setLocalBookings(bookings);
  }, [bookings]);

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    date: 100,
    customer: 120,
    service: 200,
    price: 120,
    professional: 90,
    status: 90,
    actions: 90,
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const tenantId = tenant?.id || tenant?.tenantId || tenant?._id;
  console.log('🔍 [ServiceBookingsTab] tenantId final:', tenantId);

  const subtleBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  // 🔥 OBTENER LA URL BASE DE LA API
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;
  console.log('🔍 [ServiceBookingsTab] API_BASE:', API_BASE);

  // 🔥 FUNCIÓN PARA ACTUALIZAR EL ESTADO DE UNA RESERVA
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    console.log('🔄 [updateBookingStatus] INICIO - bookingId:', bookingId, 'newStatus:', newStatus);
    console.log('🔄 [updateBookingStatus] tenantId:', tenantId);
    console.log('🔄 [updateBookingStatus] API_BASE:', API_BASE);
    
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token') || '';
      console.log('🔄 [updateBookingStatus] Token:', token ? '✅ Presente' : '❌ No hay token');
      
      const url = `${API_BASE}/bookings/${bookingId}/status`;
      console.log('🔄 [updateBookingStatus] URL completa:', url);
      
      const body = JSON.stringify({ 
        status: newStatus,
        tenantId: tenantId
      });
      console.log('🔄 [updateBookingStatus] Body:', body);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: body,
      });

      console.log('🔄 [updateBookingStatus] Response status:', response.status);
      console.log('🔄 [updateBookingStatus] Response ok:', response.ok);
      console.log('🔄 [updateBookingStatus] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [updateBookingStatus] Error response status:', response.status);
        console.error('❌ [updateBookingStatus] Error response text:', errorText);
        console.error('❌ [updateBookingStatus] Error response completo:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Error al actualizar el estado: ${response.status} - ${errorText}`);
      }

      const updated = await response.json();
      console.log('✅ [updateBookingStatus] Respuesta exitosa:', updated);
      
      setLocalBookings(prev => {
        console.log('🔄 [updateBookingStatus] Actualizando estado local de bookings');
        const updatedList = prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b);
        console.log('🔄 [updateBookingStatus] Bookings actualizados:', updatedList.length);
        return updatedList;
      });

      if (onUpdateBooking) {
        console.log('🔄 [updateBookingStatus] Llamando a onUpdateBooking');
        onUpdateBooking(updated);
      }

      if (selectedBooking && selectedBooking.id === bookingId) {
        console.log('🔄 [updateBookingStatus] Actualizando selectedBooking');
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }

      console.log('✅ [updateBookingStatus] Actualización completada exitosamente');
      return updated;
    } catch (error) {
      console.error('❌ [updateBookingStatus] Error capturado:', error);
      console.error('❌ [updateBookingStatus] Stack trace:', error instanceof Error ? error.stack : 'No stack disponible');
      return null;
    } finally {
      console.log('🔄 [updateBookingStatus] FIN - isUpdating = false');
      setIsUpdating(false);
    }
  };

  // 🔥 FILTRAR Y ORDENAR
  const filteredBookings = useMemo(() => {
    console.log('🔍 [filteredBookings] Recalculando filtros...');
    const result = localBookings.filter(b => {
      const matchesSearch = 
        (b.id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
         b.customerName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
         b.customerPhone?.includes(searchFilter) ||
         b.service?.name?.toLowerCase().includes(searchFilter.toLowerCase()));

      if (statusFilter === 'all') return matchesSearch;
      
      const status = (b.status || 'pending').toLowerCase();
      if (statusFilter === 'pending') return matchesSearch && status === 'pending';
      if (statusFilter === 'confirmed') return matchesSearch && status === 'confirmed';
      if (statusFilter === 'completed') return matchesSearch && (status === 'completed' || status === 'in_progress');
      if (statusFilter === 'cancelled') return matchesSearch && (status === 'cancelled' || status === 'no_show');
      
      return matchesSearch;
    });
    console.log('🔍 [filteredBookings] Resultados:', result.length);
    return result;
  }, [localBookings, searchFilter, statusFilter]);

  const sortedBookings = useMemo(() => {
    const sorted = [...filteredBookings];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'date') {
        valA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
        valB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
      } else if (sortField === 'customer') {
        valA = a.customerName || '';
        valB = b.customerName || '';
      } else if (sortField === 'status') {
        valA = a.status || '';
        valB = b.status || '';
} else if (sortField === 'price') {
  valA = getBookingPrice(a)?.priceVes || 0;
  valB = getBookingPrice(b)?.priceVes || 0;
}

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredBookings, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedBookings.slice(start, start + itemsPerPage);
  }, [sortedBookings, currentPage, itemsPerPage]);

  const handleSort = (field: 'date' | 'customer' | 'status' | 'price') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || 120
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(80, resizingRef.current.startWidth + delta);
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current!.colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleViewDetails = (booking: any) => {
    console.log('🔍 [handleViewDetails] Abriendo modal para booking:', booking.id);
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  if (!localBookings || localBookings.length === 0) {
    return (
      <div 
        className="p-8 rounded-3xl border shadow-xl text-center"
        style={{ 
          backgroundColor: cardBg,
          borderColor: subtleBorderColor,
          color: textColor
        }}
      >
        <div className="flex flex-col items-center gap-3 py-12">
          <Calendar className="w-16 h-16 opacity-20" />
          <p className="text-sm font-medium opacity-70">No hay citas registradas</p>
          <p className="text-xs opacity-40">Las reservas de tus clientes aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all duration-300"
      style={{ 
        backgroundColor: cardBg,
        borderColor: subtleBorderColor,
        color: textColor
      }}
    >
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkBg ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 9999px;
          margin: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')};
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)')};
        }
        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }
        .resizer:hover, .resizer:active {
          background-color: ${primary};
          opacity: 0.6;
        }
      `}</style>

      {/* TÍTULO */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
        <div>
          <h3 className="font-extrabold text-base tracking-tight" style={{ color: textColor }}>
            Gestión de Citas
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            Gestiona todas las reservas y citas de tus clientes.
          </p>
        </div>

        <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl self-start sm:self-auto" style={{ borderColor: subtleBorderColor, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)' }}>
          <span className="text-[11px] opacity-70">Total citas:</span>
          <span className="text-[11px] font-bold" style={{ color: primary }}>{localBookings.length}</span>
        </div>
      </div>

      {/* TABLA */}
      <div className="border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: subtleBorderColor }}>
        
        {/* Filtros */}
        <div className="p-4 sm:p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'pending', label: 'Pendientes' },
              { id: 'confirmed', label: 'Confirmadas' },
              { id: 'completed', label: 'Completadas' },
              { id: 'cancelled', label: 'Canceladas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm ${
                  statusFilter === tab.id 
                    ? 'text-white shadow-md' 
                    : 'bg-white/5 opacity-75 hover:opacity-100 hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: statusFilter === tab.id ? primary : undefined
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por cliente, servicio, ID..."
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none w-full transition"
              style={{ borderColor: subtleBorderColor, color: textColor }}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none"
                style={{ 
                  borderColor: subtleBorderColor,
                  backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)'
                }}
              >
                <th className="py-3 px-4 pl-5 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.date }} onClick={() => handleSort('date')}>
                  <div className="truncate">Fecha y Hora {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('date', e)} />
                </th>
                <th className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.customer }} onClick={() => handleSort('customer')}>
                  <div className="truncate">Cliente {sortField === 'customer' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('customer', e)} />
                </th>
                <th className="py-3 px-4 relative" style={{ width: columnWidths.service }}>
                  <div className="truncate">Servicio</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('service', e)} />
                </th>
                {/* 🔥 NUEVA COLUMNA: PRECIO */}
                <th className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.price }} onClick={() => handleSort('price')}>
                  <div className="truncate">Precio {sortField === 'price' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('price', e)} />
                </th>
                <th className="py-3 px-4 relative" style={{ width: columnWidths.professional }}>
                  <div className="truncate">Profesional</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('professional', e)} />
                </th>
                <th className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.status }} onClick={() => handleSort('status')}>
                  <div className="truncate">Estado {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('status', e)} />
                </th>
                <th className="py-3 px-4 pr-5 relative" style={{ width: columnWidths.actions }}>
                  <div className="truncate text-center">Acciones</div>
                  <div className="resizer" onMouseDown={(e) => handleMouseDown('actions', e)} />
                </th>
              </tr>
            </thead>
            <tbody className="text-xs" style={{ borderColor: subtleBorderColor }}>
              {paginatedBookings.length > 0 ? (
                paginatedBookings.map((b: any, idx: number) => {
                  const statusInfo = getStatusLabel(b.status);
                  const bookingId = b.id || idx;
const price = getBookingPrice(b);

                  return (
                    <tr key={bookingId} className="hover:bg-white/5 transition-colors group" style={{ borderBottom: `1px solid ${subtleBorderColor}` }}>
                      <td className="py-3 px-4 pl-5 align-middle" style={{ width: columnWidths.date }}>
                        <div className="font-medium text-[11px]" style={{ color: textColor }}>
                          {formatDateTime(b.bookingDate, b.startTime)}
                        </div>
                        <div className="text-[10px] opacity-60">{formatDuration(b.durationMinutes || 60)}</div>
                      </td>
                      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.customer }}>
                        <div className="font-medium text-[11px]" style={{ color: textColor }}>
                          {b.customerName || 'Cliente no identificado'}
                        </div>
                        {b.customerPhone && (
                          <div className="text-[10px] opacity-60 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {formatPhoneDisplay(b.customerPhone)}                          </div>

                        )}
                      </td>
                      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.service }}>
                        <div className="text-[11px] truncate" style={{ color: textColor }}>
                          {b.service?.name || 'Servicio no especificado'}
                        </div>
                        {b.service?.category && (
                          <div className="text-[9px] opacity-50">{b.service.category}</div>
                        )}
                      </td>
                      {/* 🔥 NUEVA CELDA: PRECIO */}
<td className="py-3 px-4 align-middle" style={{ width: columnWidths.price }}>
  {price ? (
    <div>
      {price.hasDiscount && (
        <div
          className="text-[9px] line-through opacity-50"
          style={{ color: textColor }}
        >
          Bs. {formatPrice(price.originalPriceVES)}
        </div>
      )}
      <div className="text-[11px] font-bold" style={{ color: primary }}>
        Bs. {formatPrice(price.priceVes)}
        {price.hasDiscount && (
          <span
            className="ml-1 px-1 py-0.5 rounded text-[8px] font-black align-middle"
            style={{ backgroundColor: primary, color: '#ffffff' }}
          >
            -{price.discountPercentage}%
          </span>
        )}
      </div>
      {price.priceUsd > 0 && (
        <div 
          className="text-[10px]"
          style={{ color: isDarkBg ? '#4ade80' : '#16a34a' }}
        >
          ${formatUsd(price.priceUsd)}
        </div>
      )}
    </div>
  ) : (
    <div className="text-[11px] opacity-50">N/A</div>
  )}
</td>
                      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.professional }}>
                        <div className="text-[11px] truncate" style={{ color: textColor }}>
                          {b.professional?.name || 'No asignado'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.status }}>
                        <span 
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${statusInfo.bg}`}
                          style={{ 
                            color: statusInfo.color,
                            borderColor: `${statusInfo.color}30`
                          }}
                        >
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 pr-5 align-middle text-center" style={{ width: columnWidths.actions }}>
                        <button
                          type="button"
                          onClick={() => handleViewDetails(b)}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer hover:opacity-80"
                          style={{ 
                            backgroundColor: `${primary}20`,
                            color: primary
                          }}
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center opacity-60 font-medium">
                    No se encontraron citas con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador */}
        <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs select-none" style={{ borderColor: subtleBorderColor }}>
          <div className="opacity-75 text-[11px]">
            <span>
              Mostrando <strong className="font-semibold">{filteredBookings.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a <strong className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredBookings.length)}</strong> de <strong className="font-semibold">{filteredBookings.length}</strong> citas
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="opacity-70">Ver:</span>
              <div className="w-[80px]">
                <SearchableDropdown
                  value={String(itemsPerPage)}
                  onChange={(val) => {
                    setItemsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '20', label: '20' },
                    { value: '50', label: '50' },
                  ]}
                  placeholder={String(itemsPerPage)}
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={subtleBorderColor || (isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}
                  searchable={false}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: subtleBorderColor }}
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-[11px] font-semibold opacity-95">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: subtleBorderColor }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal de detalle */}
      {isModalOpen && selectedBooking && (
        <ServiceBookingDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          booking={selectedBooking}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onStatusChange={updateBookingStatus}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE: ServiceBookingDetailModal
// ============================================================
interface ServiceBookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onStatusChange: (id: string, status: string) => Promise<any>;
  isUpdating: boolean;
}

function ServiceBookingDetailModal({
  isOpen,
  onClose,
  booking,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onStatusChange,
  isUpdating,
}: ServiceBookingDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)');
  
  const statusInfo = getStatusLabel(booking.status);
  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'in_progress', label: 'En curso' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'no_show', label: 'No asistió' },
  ];

  // 🔥 Obtener precio + descuento para el modal
  const getModalPrice = (booking: any): {
    priceVes: number;
    hasDiscount: boolean;
    discountPercentage: number;
    discountAmountVES: number;
    originalPriceVES: number;
  } | null => {
    // 🔥 PRIORIDAD 1: pricingSnapshot del backend (Fase 5)
    if (booking.pricingSnapshot?.totalPriceVES !== undefined && booking.pricingSnapshot?.totalPriceVES !== null) {
      const ps = booking.pricingSnapshot;
      return {
        priceVes: Number(ps.totalPriceVES),
        hasDiscount: Boolean(ps.hasDiscount) && Number(ps.discountPercentage) > 0,
        discountPercentage: Number(ps.discountPercentage || 0),
        discountAmountVES: Number(ps.discountAmountVES || 0),
        originalPriceVES: Number(ps.originalPriceVES || ps.totalPriceVES),
      };
    }

    // 🔴 FALLBACKS (flujo viejo)
    const plain = (ves: number) => ({
      priceVes: ves,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      originalPriceVES: ves,
    });
    if (booking.priceVes !== undefined && booking.priceVes !== null) return plain(Number(booking.priceVes));
    if (booking.price !== undefined && booking.price !== null) return plain(Number(booking.price));
    if (booking.service?.price !== undefined && booking.service?.price !== null) return plain(Number(booking.service.price));
    if (booking.attributes?.prices?.VES !== undefined && booking.attributes?.prices?.VES !== null) return plain(Number(booking.attributes.prices.VES));
    return null;
  };

  const modalPrice = getModalPrice(booking);
  const formatPriceModal = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleStatusChange = async (status: string) => {
    console.log('🔄 [Modal] Cambiando estado a:', status);
    console.log('🔄 [Modal] Booking ID:', booking.id);
    const result = await onStatusChange(booking.id, status);
    console.log('🔄 [Modal] Resultado:', result);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div 
        className="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ 
          backgroundColor: cardBg,
          borderColor: borderDynamic,
          color: textColor
        }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: borderDynamic }}>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>Detalle de la Cita</span>
            <h3 className="text-sm font-bold" style={{ color: textColor }}>Reserva #{booking.id?.slice(0, 8)}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Información de la cita */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-3 rounded-xl border`} style={{ borderColor: borderDynamic }}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Fecha y Hora</span>
              <p className="text-sm font-bold" style={{ color: textColor }}>
                {formatDateTime(booking.bookingDate, booking.startTime)}
              </p>
              <p className="text-xs opacity-60">{formatDuration(booking.durationMinutes || 60)}</p>
            </div>
            <div className={`p-3 rounded-xl border`} style={{ borderColor: borderDynamic }}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Estado</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span 
                  className={`text-sm font-bold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${statusInfo.bg}`}
                  style={{ 
                    color: statusInfo.color,
                    borderColor: `${statusInfo.color}30`
                  }}
                >
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              </div>
            </div>
            {/* 🔥 NUEVO: Precio en el modal */}
            <div className={`p-3 rounded-xl border`} style={{ borderColor: borderDynamic }}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Precio</span>
              {modalPrice !== null ? (
                modalPrice.hasDiscount ? (
                  <div>
                    <p className="text-[10px] line-through opacity-50" style={{ color: textColor }}>
                      Bs. {formatPriceModal(modalPrice.originalPriceVES)}
                    </p>
                    <p className="text-sm font-bold flex items-center gap-1.5 flex-wrap" style={{ color: primary }}>
                      Bs. {formatPriceModal(modalPrice.priceVes)}
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-black"
                        style={{ backgroundColor: primary, color: '#ffffff' }}
                      >
                        -{modalPrice.discountPercentage}%
                      </span>
                    </p>
                    <p className="text-[9px] font-bold text-emerald-500 mt-0.5">
                      Ahorró Bs. {formatPriceModal(modalPrice.discountAmountVES)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold" style={{ color: primary }}>
                    Bs. {formatPriceModal(modalPrice.priceVes)}
                  </p>
                )
              ) : (
                <p className="text-sm font-bold opacity-50" style={{ color: textColor }}>
                  N/A
                </p>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className={`p-4 rounded-xl border space-y-2`} style={{ borderColor: borderDynamic }}>
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Cliente
            </span>
            <p className="font-bold" style={{ color: textColor }}>{booking.customerName || 'No especificado'}</p>
            {booking.customerPhone && (
              <p className="text-xs opacity-60 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {formatPhoneDisplay(booking.customerPhone)}
                              </p>
            )}
            {booking.customerEmail && (
              <p className="text-xs opacity-60">{booking.customerEmail}</p>
            )}
          </div>

          {/* Servicio y Profesional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-3 rounded-xl border`} style={{ borderColor: borderDynamic }}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Servicio
              </span>
              <p className="text-sm font-bold" style={{ color: textColor }}>
                {booking.service?.name || 'No especificado'}
              </p>
              {booking.service?.category && (
                <p className="text-xs opacity-60">{booking.service.category}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl border`} style={{ borderColor: borderDynamic }}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Profesional
              </span>
              <p className="text-sm font-bold" style={{ color: textColor }}>
                {booking.professional?.name || 'No asignado'}
              </p>
            </div>
          </div>

          {/* Notas */}
          {booking.notes && (
            <div className={`p-3 rounded-xl border`} style={{ borderColor: borderDynamic }}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Notas adicionales
              </span>
              <p className="text-xs opacity-80 mt-1">{booking.notes}</p>
            </div>
          )}

          {/* Cambiar estado */}
          <div className="pt-3 border-t" style={{ borderColor: borderDynamic }}>
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 block mb-2">Cambiar Estado</span>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((opt) => {
                const isSelected = booking.status === opt.value;
                const optStatusInfo = getStatusLabel(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    disabled={isUpdating || isSelected}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer inline-flex items-center gap-1.5 ${
                      isSelected 
                        ? 'text-white shadow-sm' 
                        : `opacity-60 hover:opacity-100 ${isDarkBg ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                      backgroundColor: isSelected ? optStatusInfo.color : 'transparent',
                      borderColor: isSelected ? 'transparent' : borderDynamic,
                      color: isSelected ? '#ffffff' : textColor
                    }}
                  >
                    {optStatusInfo.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0" style={{ borderColor: borderDynamic }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-xl text-xs font-semibold border hover:opacity-80 transition"
            style={{ borderColor: borderDynamic, color: textColor }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}