'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, User, Phone, FileText, X, CheckCircle2, AlertCircle, Clock as ClockIcon, Mail, MapPin, CalendarDays, Star, Ban, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderFullPage } from '@/components/ui/Loader';
import { formatPhoneDisplay } from '@/lib/formatPhone';
interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNotes?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  service?: {
    id: string;
    name: string;
    category?: string;
    durationMinutes?: number;
  };
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    priceUsd?: number | string;
    priceVes?: number | string;
  };
  // 🔥 NUEVO: snapshot de pricing guardado al crear la reserva (Fase 5)
  pricingSnapshot?: {
    basePriceUSD?: number;
    basePriceVES?: number;
    totalPriceUSD?: number;
    totalPriceVES?: number;
    taxAmountUSD?: number;
    taxAmountVES?: number;
    ivaType?: string;
    ivaRate?: number;
    durationMinutes?: number;
    exchangeRateUsed?: number;
    exchangeRateSource?: string;
    calculatedAt?: string;
    // 🔥 CAMPOS DE DESCUENTO
    hasDiscount?: boolean;
    discountPercentage?: number;
    discountAmountUSD?: number;
    discountAmountVES?: number;
    originalPriceUSD?: number;
    originalPriceVES?: number;
  } | null;
  // 🔥 paymentMetadata de la orden asociada (efectivo VES/USD)
  paymentMetadata?: {
    cashCurrency?: 'VES' | 'USD';
    cashAmount?: number;
    [key: string]: any;
  } | null;
}

interface BookingsTabProps {
  tenant: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onRefresh?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// ============================================================
// 🔥 COMPONENTE: DatePicker personalizado
// ============================================================

const DatePicker = ({ 
  value, 
  onChange, 
  borderDynamic, 
  textColor, 
  isDarkBg, 
  placeholder,
  className,
  primary,
  minDate
}: any) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState<string>(value || '');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      const selected = new Date(dateStr);
      selected.setHours(0, 0, 0, 0);
      if (selected < min) {
        showToast({
          variant: 'warning',
          message: 'No puedes seleccionar una fecha pasada',
        });
        return;
      }
    }
    
    setSelectedDate(dateStr);
    onChange(dateStr);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const changeYear = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(newDate.getFullYear() + delta);
    setViewDate(newDate);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  const bgColor = isDarkBg ? '#1e293b' : '#ffffff';
  const selectedBg = primary || '#3b82f6';

  const isDateEnabled = (dateStr: string): boolean => {
    if (!minDate) return true;
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    const selected = new Date(dateStr);
    selected.setHours(0, 0, 0, 0);
    return selected >= min;
  };

  return (
    <div className={`relative ${className || ''}`}>
      <div
        ref={inputRef}
        className="border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer flex items-center justify-between min-w-[140px]"
        style={{ 
          borderColor: borderDynamic, 
          color: textColor,
          backgroundColor: 'transparent'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ opacity: selectedDate ? 1 : 0.4 }}>
          {selectedDate ? formatDate(selectedDate) : placeholder || 'Seleccionar fecha'}
        </span>
        <span className="opacity-40" style={{ color: textColor }}>
          <Calendar className="w-4 h-4" />
        </span>
      </div>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute z-50 mt-1 rounded-xl border shadow-xl p-4 min-w-[280px]"
          style={{
            backgroundColor: bgColor,
            borderColor: borderDynamic,
            boxShadow: isDarkBg 
              ? '0 8px 32px rgba(0,0,0,0.5)' 
              : '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => changeYear(-1)} className="p-1 rounded hover:opacity-70 transition" style={{ color: textColor }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => changeMonth(-1)} className="p-1 rounded hover:opacity-70 transition" style={{ color: textColor }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-bold" style={{ color: textColor }}>
              {months[month]} {year}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(1)} className="p-1 rounded hover:opacity-70 transition" style={{ color: textColor }}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => changeYear(1)} className="p-1 rounded hover:opacity-70 transition" style={{ color: textColor }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[9px] font-bold opacity-50 py-1" style={{ color: textColor }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="text-center text-[10px] py-1" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const isEnabled = isDateEnabled(dateStr);

              return (
                <button
                  key={day}
                  onClick={() => isEnabled && handleDateSelect(day)}
                  disabled={!isEnabled}
                  className={`text-center text-xs py-1.5 rounded-lg transition cursor-pointer hover:opacity-80 ${
                    isSelected ? 'text-white font-bold' : ''
                  } ${!isEnabled ? 'opacity-20 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: isSelected ? selectedBg : 'transparent',
                    color: isSelected ? '#ffffff' : textColor,
                    ...(isToday && !isSelected ? { 
                      border: `1px solid ${borderDynamic}`,
                      fontWeight: 'bold'
                    } : {}),
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
            <button
              onClick={() => {
                setSelectedDate('');
                onChange('');
                setIsOpen(false);
              }}
              className="text-[9px] opacity-50 hover:opacity-100 transition"
              style={{ color: textColor }}
            >
              Limpiar fecha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================

export default function BookingsTab({
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onRefresh,
}: BookingsTabProps) {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { registerComponent, unregisterComponent } = useAppRefreshContext();

  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  const fetchBookings = async () => {
    if (!tenant?.id) {
      console.warn('⚠️ [BookingsTab] No hay tenant.id disponible:', tenant);
      setLoading(false);
      return;
    }

    console.log('📅 [BookingsTab] Fetching bookings para tenant:', tenant.id);
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE}/bookings/tenant/${tenant.id}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📅 [BookingsTab] Datos recibidos:', data);
        
        if (Array.isArray(data)) {
          setBookings(data);
          if (onRefresh) onRefresh();
        } else if (data?.data && Array.isArray(data.data)) {
          setBookings(data.data);
        } else {
          console.warn('⚠️ [BookingsTab] Formato de datos inesperado:', data);
          setBookings([]);
          setError('Formato de datos inesperado del servidor');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [BookingsTab] Error en la respuesta:', response.status, errorText);
        setError(`Error ${response.status}: ${errorText || 'Error al cargar las reservas'}`);
      }
    } catch (err) {
      console.error('❌ [BookingsTab] Error de conexión:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const componentId = 'bookings-tab-admin';
    
    const refreshBookings = async () => {
      console.log('🔄 [BookingsTab] Refrescando reservas...');
      await fetchBookings();
    };

    registerComponent(componentId, refreshBookings);
    
    return () => {
      unregisterComponent(componentId);
    };
  }, [tenant?.id]);

  useEffect(() => {
    console.log('📅 [BookingsTab] useEffect inicial - tenant:', tenant);
    fetchBookings();
  }, [tenant?.id]);

  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔔 [BookingsTab] Evento globalRefresh recibido');
      fetchBookings();
    };

    const handleNotificationUpdate = () => {
      console.log('🔔 [BookingsTab] Evento notificationUpdate recibido');
      fetchBookings();
    };

    window.addEventListener('globalRefresh', handleRefresh);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);

    return () => {
      window.removeEventListener('globalRefresh', handleRefresh);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
    };
  }, []);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(true);

    try {
      const token = localStorage.getItem('token');
const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
  method: 'PATCH',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, tenantId: tenant.id }),
      });

      if (response.ok) {
        setBookings(prev =>
          prev.map(b =>
            b.id === bookingId ? { ...b, status: newStatus as any } : b
          )
        );
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: newStatus as any });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globalRefresh'));
          window.dispatchEvent(new Event('notificationUpdate'));
        }
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Fecha no disponible';
  try {
    const parts = dateStr.split('-');
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return d.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
};

const formatDateFull = (dateStr: string) => {
  if (!dateStr) return 'Fecha no disponible';
  try {
    const parts = dateStr.split('-');
    const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
};

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'p.m.' : 'a.m.';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

const getBookingPrice = (booking: any) => {
  // 🔥 PRIORIDAD 1: pricingSnapshot del backend (Fase 5)
  if (booking.pricingSnapshot?.totalPriceVES !== undefined && booking.pricingSnapshot?.totalPriceVES !== null) {
    const ps = booking.pricingSnapshot;
    return {
      priceVes: Number(ps.totalPriceVES),
      priceUsd: Number(ps.totalPriceUSD || 0),
      hasDiscount: Boolean(ps.hasDiscount) && Number(ps.discountPercentage) > 0,
      discountPercentage: Number(ps.discountPercentage || 0),
      discountAmountVES: Number(ps.discountAmountVES || 0),
      originalPriceVES: Number(ps.originalPriceVES || ps.totalPriceVES),
    };
  }

  // 🔴 FALLBACK 1: metadata (formato viejo)
  const priceVesMeta = Number(booking.metadata?.priceVes || 0);
  const priceUsdMeta = Number(booking.metadata?.priceUsd || 0);
  if (priceVesMeta || priceUsdMeta) {
    return {
      priceVes: priceVesMeta,
      priceUsd: priceUsdMeta,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      originalPriceVES: priceVesMeta,
    };
  }

  // 🔴 FALLBACK 2: priceVes directo (formato viejo)
  const priceVesDirect = Number(booking.priceVes || 0);
  const priceUsdDirect = Number(booking.priceUsd || 0);
  if (priceVesDirect || priceUsdDirect) {
    return {
      priceVes: priceVesDirect,
      priceUsd: priceUsdDirect,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      originalPriceVES: priceVesDirect,
    };
  }

  // 🔴 FALLBACK 3: service.price
  const servicePrice = Number(booking.service?.price || 0);
  if (servicePrice > 0) {
    return {
      priceVes: servicePrice,
      priceUsd: 0,
      hasDiscount: false,
      discountPercentage: 0,
      discountAmountVES: 0,
      originalPriceVES: servicePrice,
    };
  }

  return null;
};

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
      pending: { 
        label: 'Pendiente', 
        bg: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
        icon: <Clock className="w-3 h-3" />
      },
      confirmed: { 
        label: 'Confirmada', 
        bg: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        icon: <CheckCircle2 className="w-3 h-3" />
      },
      in_progress: { 
        label: 'En progreso', 
        bg: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
        icon: <Clock className="w-3 h-3" />
      },
      completed: { 
        label: 'Completada', 
        bg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
        icon: <CheckCircle2 className="w-3 h-3" />
      },
      cancelled: { 
        label: 'Cancelada', 
        bg: 'bg-red-500/20 text-red-500 border-red-500/30',
        icon: <X className="w-3 h-3" />
      },
      no_show: { 
        label: 'No asistió', 
        bg: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
        icon: <AlertCircle className="w-3 h-3" />
      },
    };
    return config[status] || config.pending;
  };

  if (loading) {
    return (
      <div
        className="p-6 rounded-3xl border shadow-xl"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor
        }}
      >
        <LoaderFullPage
          message="Cargando reservas..."
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-6 rounded-3xl border shadow-xl flex flex-col items-center justify-center h-64 text-center gap-4"
        style={{ 
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor
        }}
      >
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className={`text-sm ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
        <Button
          variant="primary"
          size="md"
          onClick={fetchBookings}
          primary={primary}
          borderColor={cardBorder}
          textColor={textColor}
          cardBg={cardBg}
          isDarkBg={isDarkBg}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        color: textColor,
      }}
    >
      {/* 🔥 Estilos de scrollbar delgado y elegante para el modal */}
      <style jsx global>{`
        .custom-modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-modal-scroll::-webkit-scrollbar-track {
          background: ${isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};
          border-radius: 9999px;
          margin: 8px 0;
        }
        .custom-modal-scroll::-webkit-scrollbar-thumb {
          background: ${isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .custom-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: ${primary};
        }
        .custom-modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkBg ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} transparent;
        }
      `}</style>

      {/* HEADER */}
      <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: cardBorder }}>
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
            Gestión de Reservas
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            {bookings.length} reservas en total
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBookings}
            className="p-2 rounded-xl border hover:opacity-70 transition"
            style={{ borderColor: cardBorder, color: textColor }}
            title="Refrescar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl" style={{ borderColor: cardBorder }}>
            <Calendar className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[10px] opacity-70" style={{ color: textColor }}>
              {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'pending', label: 'Pendientes' },
          { id: 'confirmed', label: 'Confirmadas' },
          { id: 'completed', label: 'Completadas' },
          { id: 'cancelled', label: 'Canceladas' },
        ].map((tab) => {
          const count = counts[tab.id] || 0;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                isActive
                  ? 'text-white border-transparent shadow-sm'
                  : `opacity-70 hover:opacity-100 ${isDarkBg ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-black/5'}`
              }`}
              style={{
                backgroundColor: isActive ? primary : 'transparent',
                borderColor: isActive ? 'transparent' : cardBorder,
              }}
            >
              {tab.label} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 🔥 TABLA DE RESERVAS - ESTILO ACTUALIZADO COMO ServiceInventoryHeader */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-12 h-12" />}
          message={
            filter === 'all'
              ? 'No hay reservas registradas.'
              : `No hay reservas ${filter === 'pending' ? 'pendientes' : filter === 'confirmed' ? 'confirmadas' : filter === 'completed' ? 'completadas' : 'canceladas'}.`
          }
          primary={primary}
          textColor={textColor}
          borderColor={cardBorder}
          cardBg={cardBg}
          isDarkBg={isDarkBg}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: cardBorder }}>
          <table className="w-full text-left">
            <thead>
              {/* 🔥 HEADER CORREGIDO - MISMO ESTILO QUE ServiceInventoryHeader */}
              <tr 
                className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none"
                style={{ 
                  borderColor: cardBorder, 
                  backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)' 
                }}
              >
                <th className="py-2.5 px-3 relative truncate font-bold" style={{ width: '12%' }}>
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 relative truncate font-bold" style={{ width: '5%' }}>
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 relative truncate font-bold" style={{ width: '12%' }}>
                  <div className="flex items-center gap-1">
                    <span>Hora</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 relative truncate font-bold" style={{ width: '20%' }}>
                  <div className="flex items-center gap-1">
                    <span>Servicio</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 relative truncate font-bold" style={{ width: '10%' }}>
                  <div className="flex items-center gap-1">
                    <span>Estado</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 relative truncate font-bold" style={{ width: '10%' }}>
                  <div className="flex items-center gap-1">
                    <span>Precio</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 relative truncate font-bold text-right" style={{ width: '5%' }}>
                  <div className="flex items-center gap-1 justify-end">
                    <span>Acciones</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const statusBadge = getStatusBadge(booking.status);
                return (
                  <tr
                    key={booking.id}
                    className="border-b hover:bg-white/5 transition cursor-pointer text-[11px]"
                    style={{ borderColor: cardBorder }}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-medium" style={{ color: textColor }}>
                        {booking.customerName}
                      </div>
                      <div className="text-[10px] opacity-60" style={{ color: textColor }}>
                        {formatPhoneDisplay(booking.customerPhone)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3" style={{ color: textColor }}>
                      {formatDate(booking.bookingDate)}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: textColor }}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </td>
                    <td className="py-2.5 px-3" style={{ color: textColor }}>
                      {booking.service?.name || 'Sin servicio'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold border flex items-center gap-1 w-fit ${statusBadge.bg}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </td>
<td className="py-2.5 px-3">
  {(() => {
    const price = getBookingPrice(booking);
    return price ? (
      <div>
        {price.hasDiscount && (
          <div
            className="text-[9px] line-through opacity-50"
            style={{ color: textColor }}
          >
            Bs. {price.originalPriceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
        <div 
          className="font-semibold flex items-center gap-1 flex-wrap" 
          style={{ color: primary }}
        >
          Bs. {price.priceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {price.hasDiscount && (
            <span
              className="px-1 py-0.5 rounded text-[8px] font-black"
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
            ${price.priceUsd.toFixed(2)}
          </div>
        )}
      </div>
    ) : <span className="opacity-50" style={{ color: textColor }}>Sin precio</span>;
  })()}
</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateBookingStatus(booking.id, 'confirmed');
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-500 transition"
                              title="Confirmar"
                              disabled={updatingStatus}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateBookingStatus(booking.id, 'cancelled');
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition"
                              title="Cancelar"
                              disabled={updatingStatus}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateBookingStatus(booking.id, 'completed');
                            }}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-500 transition"
                            title="Completar"
                            disabled={updatingStatus}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'no_show') && (
                          <span className="text-[9px] opacity-40">
                            {booking.status === 'completed' ? 'Completada' : 'Cancelada'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DETALLES */}
      {isModalOpen && selectedBooking && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 my-auto custom-modal-scroll"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              color: textColor,
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primary}20` }}>
                  <Calendar className="w-4 h-4" style={{ color: primary }} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: textColor }}>
                    Detalle de la Reserva
                  </h3>
                  <span className="text-[9px] opacity-50">#{selectedBooking.id?.slice(0, 8) || 'N/A'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl border hover:scale-105 transition"
                style={{ borderColor: cardBorder }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border" style={{ borderColor: cardBorder, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 opacity-60" style={{ color: primary }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                    Datos del Cliente
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] opacity-50 block">Nombre completo</span>
                    <span className="text-sm font-medium" style={{ color: textColor }}>
                      {selectedBooking.customerName}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[9px] opacity-50 block">Teléfono</span>
                    <span className="text-sm flex items-center gap-1.5" style={{ color: textColor }}>
                      <Phone className="w-3.5 h-3.5 opacity-40" />
                      {formatPhoneDisplay(selectedBooking.customerPhone)}
                                          </span>
                  </div>
                  
                  {selectedBooking.customerEmail && (
                    <div>
                      <span className="text-[9px] opacity-50 block">Correo electrónico</span>
                      <span className="text-sm flex items-center gap-1.5" style={{ color: textColor }}>
                        <Mail className="w-3.5 h-3.5 opacity-40" />
                        {selectedBooking.customerEmail}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border" style={{ borderColor: cardBorder, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 opacity-60" style={{ color: primary }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                    Detalles de la Reserva
                  </span>
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                    <div>
                      <span className="text-[9px] opacity-50 block">Fecha</span>
                      <span className="text-sm font-medium" style={{ color: textColor }}>
                        {formatDateFull(selectedBooking.bookingDate)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 opacity-40" />
                    <div>
                      <span className="text-[9px] opacity-50 block">Horario</span>
                      <span className="text-sm font-medium" style={{ color: textColor }}>
                        {formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}
                        <span className="text-xs opacity-50 ml-1">
                          ({selectedBooking.durationMinutes} min)
                        </span>
                      </span>
                    </div>
                  </div>

                  {selectedBooking.service && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 opacity-40" />
                      <div>
                        <span className="text-[9px] opacity-50 block">Servicio</span>
                        <span className="text-sm font-medium" style={{ color: textColor }}>
                          {selectedBooking.service.name}
                        </span>
                        {selectedBooking.service.category && (
                          <span className="text-[10px] opacity-50 ml-1">
                            ({selectedBooking.service.category})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {getBookingPrice(selectedBooking) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 opacity-40" />
                      <div>
                        <span className="text-[9px] opacity-50 block">Precio pagado</span>
                        {getBookingPrice(selectedBooking)!.hasDiscount ? (
                          <>
                            <span className="text-[10px] line-through opacity-50 block" style={{ color: textColor }}>
                              Bs. {getBookingPrice(selectedBooking)!.originalPriceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-sm font-medium flex items-center gap-1.5 flex-wrap" style={{ color: textColor }}>
                              Bs. {getBookingPrice(selectedBooking)!.priceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-black"
                                style={{ backgroundColor: primary, color: '#ffffff' }}
                              >
                                -{getBookingPrice(selectedBooking)!.discountPercentage}%
                              </span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 block">
                              Ahorró Bs. {getBookingPrice(selectedBooking)!.discountAmountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-medium" style={{ color: textColor }}>
                            Bs. {getBookingPrice(selectedBooking)!.priceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {getBookingPrice(selectedBooking)!.priceUsd > 0 && ` ($${getBookingPrice(selectedBooking)!.priceUsd.toFixed(2)})`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 🔥 DETALLE DE PAGO EN EFECTIVO */}
                  {selectedBooking.paymentMetadata?.cashCurrency && (
                    <div className="p-3 rounded-xl border space-y-1.5 mt-2" style={{ borderColor: cardBorder, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-3.5 h-3.5 opacity-60" style={{ color: primary }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                          Detalle de Pago en Efectivo
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: textColor, opacity: 0.6 }}>Pagó en</span>
                        <span className="font-bold" style={{ color: textColor }}>
                          {selectedBooking.paymentMetadata.cashCurrency === 'VES' ? 'Bolívares (Bs.)' : 'Dólares (USD)'}
                        </span>
                      </div>

                      {selectedBooking.paymentMetadata.cashAmount !== undefined && selectedBooking.paymentMetadata.cashAmount > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: textColor, opacity: 0.6 }}>Entregó</span>
                          <span className="font-bold" style={{ color: textColor }}>
                            {selectedBooking.paymentMetadata.cashCurrency === 'USD'
                              ? `$${Number(selectedBooking.paymentMetadata.cashAmount).toFixed(2)}`
                              : `Bs. ${Number(selectedBooking.paymentMetadata.cashAmount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                        </div>
                      )}

                      {getBookingPrice(selectedBooking) && (
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: textColor, opacity: 0.6 }}>Total</span>
                          <span className="font-bold" style={{ color: textColor }}>
                            Bs. {getBookingPrice(selectedBooking)!.priceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Vuelto o falta por pagar */}
                      {(() => {
                        const cashAmount = selectedBooking.paymentMetadata?.cashAmount;
                        const currency = selectedBooking.paymentMetadata?.cashCurrency;
                        const rate = Number(selectedBooking.pricingSnapshot?.exchangeRateUsed || 0);
                        const price = getBookingPrice(selectedBooking);
                        if (!cashAmount || cashAmount <= 0 || !price) return null;

                        const paidInVes = currency === 'USD' && rate > 0
                          ? cashAmount * rate
                          : cashAmount;

                        const diff = paidInVes - price.priceVes;

                        if (diff > 0.01) {
                          return (
                            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: cardBorder }}>
                              <span className="font-bold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                                Vuelto pendiente de entregar
                              </span>
                              <span className="font-black" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                                Bs. {diff.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        }
                        if (diff < -0.01) {
                          return (
                            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: cardBorder }}>
                              <span className="font-bold" style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}>
                                Falta por pagar
                              </span>
                              <span className="font-black" style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}>
                                Bs. {Math.abs(diff).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] opacity-50 block">Estado</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 w-fit ${getStatusBadge(selectedBooking.status).bg}`}>
                        {getStatusBadge(selectedBooking.status).icon}
                        {getStatusBadge(selectedBooking.status).label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(selectedBooking.customerNotes || selectedBooking.notes) && (
                <div className="p-4 rounded-xl border" style={{ borderColor: cardBorder, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 opacity-60" style={{ color: primary }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                      Notas
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: textColor }}>
                    {selectedBooking.customerNotes || selectedBooking.notes || 'Sin notas adicionales'}
                  </p>
                </div>
              )}

              <div className="text-[9px] opacity-40 space-y-0.5">
                <div>Creada: {new Date(selectedBooking.createdAt).toLocaleString('es-VE')}</div>
                {selectedBooking.updatedAt && (
                  <div>Última actualización: {new Date(selectedBooking.updatedAt).toLocaleString('es-VE')}</div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t" style={{ borderColor: cardBorder }}>
              {selectedBooking.status === 'pending' && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => {
                      updateBookingStatus(selectedBooking.id, 'confirmed');
                      setIsModalOpen(false);
                    }}
                    disabled={updatingStatus}
                    loading={updatingStatus}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    primary={primary}
                    borderColor={cardBorder}
                    textColor={textColor}
                    cardBg={cardBg}
                    isDarkBg={isDarkBg}
                  >
                    Confirmar Reserva
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="md"
                    onClick={() => {
                      updateBookingStatus(selectedBooking.id, 'cancelled');
                      setIsModalOpen(false);
                    }}
                    disabled={updatingStatus}
                    icon={<X className="w-4 h-4" />}
                    primary={primary}
                    borderColor={cardBorder}
                    textColor={textColor}
                    cardBg={cardBg}
                    isDarkBg={isDarkBg}
                  >
                    Cancelar
                  </Button>
                </>
              )}
              {selectedBooking.status === 'confirmed' && (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    updateBookingStatus(selectedBooking.id, 'completed');
                    setIsModalOpen(false);
                  }}
                  disabled={updatingStatus}
                  loading={updatingStatus}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  primary={primary}
                  borderColor={cardBorder}
                  textColor={textColor}
                  cardBg={cardBg}
                  isDarkBg={isDarkBg}
                >
                  Marcar como Completada
                </Button>
              )}
              {(selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled' || selectedBooking.status === 'no_show') && (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setIsModalOpen(false)}
                  primary={primary}
                  borderColor={cardBorder}
                  textColor={textColor}
                  cardBg={cardBg}
                  isDarkBg={isDarkBg}
                >
                  Cerrar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}