// utils/statusConfig.tsx
import React from 'react';
import { Clock, CheckCircle2, Clock as ClockIcon, Ban, AlertCircle } from 'lucide-react';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface StatusConfig {
  label: string;
  bg: string;
  icon: React.ReactNode;
  textColor: string;
  color: string;
}

export const getStatusBadge = (status: string): StatusConfig => {
  const config: Record<string, StatusConfig> = {
    pending: {
      label: 'Pendiente',
      bg: 'bg-amber-500/20 border-amber-500/30',
      icon: <Clock className="w-3 h-3" />,
      textColor: 'text-amber-500',
      color: '#f59e0b'
    },
    confirmed: {
      label: 'Confirmada',
      bg: 'bg-blue-500/20 border-blue-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
      textColor: 'text-blue-500',
      color: '#3b82f6'
    },
    in_progress: {
      label: 'En progreso',
      bg: 'bg-purple-500/20 border-purple-500/30',
      icon: <ClockIcon className="w-3 h-3" />,
      textColor: 'text-purple-500',
      color: '#8b5cf6'
    },
    completed: {
      label: 'Completada',
      bg: 'bg-emerald-500/20 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />,
      textColor: 'text-emerald-500',
      color: '#10b981'
    },
    cancelled: {
      label: 'Cancelada',
      bg: 'bg-red-500/20 border-red-500/30',
      icon: <Ban className="w-3 h-3" />,
      textColor: 'text-red-500',
      color: '#ef4444'
    },
    no_show: {
      label: 'No asistió',
      bg: 'bg-gray-500/20 border-gray-500/30',
      icon: <AlertCircle className="w-3 h-3" />,
      textColor: 'text-gray-500',
      color: '#6b7280'
    },
  };
  return config[status] || config.pending;
};

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No asistió' },
];

export const FILTER_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
];