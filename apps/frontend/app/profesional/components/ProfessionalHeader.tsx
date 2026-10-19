'use client';

// ============================================================
// ARCHIVO: app/profesional/components/ProfessionalHeader.tsx
// Header del profesional. Mismo patrón que RepartidorHeader.
// ============================================================

import React from 'react';
import type { ProfessionalTab } from './ProfessionalSidebar';

interface ProfessionalHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  status: string;
  activeTab: ProfessionalTab;
  textColor: string;
  primary: string;
  secondary: string;
  isDarkBg: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TAB_TITLES: Record<
  ProfessionalTab,
  { title: string; subtitle: string; icon: React.ReactNode }
> = {
  citas: {
    title: 'Citas activas',
    subtitle: 'Gestioná tus citas, confirmá asistencias y contactá al cliente.',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  historial: {
    title: 'Historial',
    subtitle: 'Revisá las citas que ya completaste o cancelaste.',
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
    subtitle: 'Tus datos, especialidades y estadísticas como profesional.',
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

export default function ProfessionalHeader({
  userName,
  avatarUrl,
  status,
  activeTab,
  textColor,
  primary,
  secondary,
  isDarkBg,
}: ProfessionalHeaderProps) {
  const rawAvatar = avatarUrl;
  const resolvedAvatar = rawAvatar
    ? rawAvatar.startsWith('http')
      ? rawAvatar
      : `${API_BASE}${rawAvatar}`
    : null;

  const formattedUserName = userName
    ? userName.charAt(0).toUpperCase() + userName.slice(1)
    : 'Profesional';

  const isOnline = status === 'online' || status === 'active';
  const statusLabel = isOnline ? 'Disponible' : 'No disponible';
  const statusColor = isOnline ? '#10b981' : '#64748b';

  const currentInfo = TAB_TITLES[activeTab] || TAB_TITLES.citas;

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
