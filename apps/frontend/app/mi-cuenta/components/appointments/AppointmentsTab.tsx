// AppointmentsTab.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import { StatsCards } from './StatsCards';
import { UpcomingAppointment } from './UpcomingAppointment';
import { AppointmentTable } from './AppointmentTable';
import { AppointmentModal } from './AppointmentModal';
import { normalizeAppointment } from './utils/normalizeAppointment';

export interface Appointment {
  id: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  service?: {
    id: string;
    name: string;
  };
  createdAt: string;
  tenantId: string;
  professional?: string | null;
  professionalName?: string | null;
  priceVes?: number;
  priceUsd?: number;
  tenantName?: string;
  tenantSlug?: string;
  coverImage?: string | null;
}

interface AppointmentsTabProps {
  userId: string;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantId?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AppointmentsTab({
  userId,
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantId,
}: AppointmentsTabProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'date' | 'customer' | 'service' | 'price' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const subtleBorderColor = useMemo(() => 
    isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    [isDarkBg]
  );

  const cardBg = useMemo(() => 
    secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    [secondary, isDarkBg]
  );

  const { registerComponent, unregisterComponent } = useAppRefreshContext();

  const fetchAppointments = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/account/appointments`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawAppointments = Array.isArray(data) ? data : (data.appointments || data.data || []);
        const normalized = rawAppointments.map((raw: any) => normalizeAppointment(raw, tenantId));
        setAppointments(normalized);
      } else {
        setError('Error al cargar tus citas');
      }
    } catch (err) {
      console.error('❌ Error al cargar citas:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [userId]);

  useEffect(() => {
    const componentId = 'appointments-tab-buyer';
    
    const refreshAppointments = async () => {
      console.log('🔄 [AppointmentsTab] Refrescando citas...');
      await fetchAppointments();
    };

    registerComponent(componentId, refreshAppointments);
    
    return () => {
      unregisterComponent(componentId);
    };
  }, [userId]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log('🔔 [AppointmentsTab] Evento globalRefresh recibido');
      fetchAppointments();
    };

    const handleNotificationUpdate = () => {
      console.log('🔔 [AppointmentsTab] Evento notificationUpdate recibido');
      fetchAppointments();
    };

    window.addEventListener('globalRefresh', handleGlobalRefresh);
    window.addEventListener('notificationUpdate', handleNotificationUpdate);

    return () => {
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
    };
  }, []);

  const counts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    
    const upcoming = appointments
      .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no_show')
      .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())[0];
    
    return { total, pending, completed, cancelled, upcoming };
  }, [appointments]);

  const handleOpenModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  if (loading) {
    return (
      <div 
        className="p-6 rounded-3xl border shadow-xl flex items-center justify-center h-64"
        style={{ 
          backgroundColor: cardBg,
          borderColor: subtleBorderColor,
          color: textColor
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: primary }} />
          <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>Cargando tus citas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-6 rounded-3xl border shadow-xl flex flex-col items-center justify-center h-64 text-center gap-4"
        style={{ 
          backgroundColor: cardBg,
          borderColor: subtleBorderColor,
          color: textColor
        }}
      >
        <AlertCircle className="w-10 h-10 opacity-40" style={{ color: primary }} />
        <p className={`text-sm ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
        <button
          type="button"
          onClick={fetchAppointments}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: primary }}
        >
          Reintentar
        </button>
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
      `}</style>

      {/* HEADER */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
        <div>
          <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2" style={{ color: textColor }}>
            Mis Citas
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            {appointments.length} citas en total • {stats.pending} pendientes
          </p>
        </div>

        <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl self-start sm:self-auto" style={{ borderColor: subtleBorderColor, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)' }}>
          <Calendar className="w-3.5 h-3.5 opacity-60" />
          <span className="text-[10px] opacity-70" style={{ color: textColor }}>
            {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS */}
      {appointments.length > 0 && (
        <StatsCards
          stats={stats}
          cardBorder={subtleBorderColor}
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      )}

      {/* PRÓXIMA CITA */}
      {stats.upcoming && (
        <UpcomingAppointment
          appointment={stats.upcoming}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onOpenModal={handleOpenModal}
        />
      )}

      {/* TABLA DE CITAS */}
      <div className="border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: subtleBorderColor }}>
        <AppointmentTable
          appointments={appointments}
          filter={filter}
          setFilter={setFilter}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          sortField={sortField}
          setSortField={setSortField}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          cardBorder={subtleBorderColor}
          onOpenModal={handleOpenModal}
          counts={counts}
        />
      </div>

      {/* MODAL DE DETALLES */}
      {isModalOpen && selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          cardBorder={subtleBorderColor}
          cardBg={cardBg}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}