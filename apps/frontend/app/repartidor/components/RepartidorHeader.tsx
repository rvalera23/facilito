'use client';

// ============================================================
// ARCHIVO: app/repartidor/components/RepartidorHeader.tsx
// Header del repartidor. Mismo estilo que AccountHeader/AdminHeader.
// ============================================================

import React from 'react';
import type { RepartidorTab } from './RepartidorSidebar';

interface RepartidorHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  status: string;
  activeTab: RepartidorTab;
  textColor: string;
  primary: string;
  secondary: string;
  isDarkBg: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TAB_TITLES: Record<
  RepartidorTab,
  { title: string; subtitle: string; icon: React.ReactNode }
> = {
  pedidos: {
    title: 'Pedidos activos',
    subtitle: 'Recibí pedidos, actualizá su estado y enviá tu ubicación.',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    ),
  },
  historial: {
    title: 'Historial',
    subtitle: 'Revisá los pedidos que ya entregaste.',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  perfil: {
    title: 'Mi perfil',
    subtitle: 'Tus datos, vehículo y estadísticas como repartidor.',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
};

export default function RepartidorHeader({
  userName,
  avatarUrl,
  status,
  activeTab,
  textColor,
  primary,
  secondary,
  isDarkBg,
}: RepartidorHeaderProps) {
  const rawAvatar = avatarUrl;
  const resolvedAvatar = rawAvatar
    ? rawAvatar.startsWith('http')
      ? rawAvatar
      : `${API_BASE}${rawAvatar}`
    : null;

  const formattedUserName = userName
    ? userName.charAt(0).toUpperCase() + userName.slice(1)
    : 'Repartidor';

  const isOnline = status === 'online' || status === 'busy';
  const statusLabel = isOnline ? 'En línea' : 'Desconectado';
  const statusColor = isOnline ? '#10b981' : '#64748b';

  const currentInfo = TAB_TITLES[activeTab] || TAB_TITLES.pedidos;

  return (
    <header
      className="relative overflow-hidden border p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl transition-all duration-300"
      style={{
        backgroundColor: secondary,
        borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        color: textColor,
      }}
    >
      <div
        className="absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-500"
        style={{ backgroundColor: primary }}
      />

      <div className="relative z-10 space-y-1 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[11px] font-medium tracking-wide opacity-75"
            style={{ color: textColor }}
          >
            {formattedUserName}
          </span>

          <span style={{ color: textColor, opacity: 0.3 }} className="text-[11px]">
            •
          </span>

          <span
            className="text-[11px] font-medium tracking-wide"
            style={{ color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        <div className="space-y-0.5">
          <h2
            className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2"
            style={{ color: textColor }}
          >
            <span
              className="inline-flex items-center justify-center opacity-90"
              style={{ color: primary }}
            >
              {currentInfo.icon}
            </span>
            {currentInfo.title}
          </h2>

          <p
            className="text-xs font-normal leading-relaxed opacity-70 pt-0.5"
            style={{ color: textColor }}
          >
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-end self-start md:self-center shrink-0">
        {resolvedAvatar ? (
          <img
            src={resolvedAvatar}
            alt={formattedUserName}
            className="w-12 h-12 rounded-2xl object-cover border shadow-md transition-transform duration-300 hover:scale-105"
            style={{ borderColor: primary + '40' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-lg transition-transform duration-300 hover:scale-105"
            style={{
              backgroundColor: primary,
              color: '#ffffff',
            }}
          >
            {formattedUserName.charAt(0)}
          </div>
        )}
      </div>
    </header>
  );
}
