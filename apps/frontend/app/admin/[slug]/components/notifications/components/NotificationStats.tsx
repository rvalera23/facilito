// frontend/app/admin/[slug]/components/notifications/components/NotificationStats.tsx

import React from 'react';
import { Bell, AlertTriangle, Package, Calendar, Users, Eye } from 'lucide-react';
import type { NotificationStats as NotificationStatsType } from '../types';

interface NotificationStatsProps {
  stats: NotificationStatsType;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}

export const NotificationStats: React.FC<NotificationStatsProps> = ({
  stats,
  primary,
  textColor,
  isDarkBg,
}) => {
  const statCards = [
    {
      label: 'Total',
      value: stats.total,
      icon: Bell,
      color: primary,
    },
    {
      label: 'No leídas',
      value: stats.unread,
      icon: Eye,
      color: '#f59e0b',
    },
    {
      label: 'Acción requerida',
      value: stats.requiresAction,
      icon: AlertTriangle,
      color: '#ef4444',
    },
    {
      label: 'Clientes',
      value: stats.buyer,
      icon: Users,
      color: '#3b82f6',
    },
    {
      label: 'Vendedores',
      value: stats.seller,
      icon: Users,
      color: '#8b5cf6',
    },
    {
      label: 'Productos',
      value: stats.products,
      icon: Package,
      color: '#22c55e',
    },
    {
      label: 'Servicios',
      value: stats.services,
      icon: Calendar,
      color: '#06b6d4',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="p-3 rounded-xl border text-center"
          style={{
            borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <div className="flex items-center justify-center gap-1.5">
            <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
            <span className="text-lg font-bold" style={{ color: textColor }}>
              {stat.value}
            </span>
          </div>
          <p className={`text-[9px] ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
};