'use client';

// ============================================================
// ARCHIVO: app/profesional/components/AvailabilityToggle.tsx
// Toggle grande online/offline para el profesional.
// Mismo patrón que DriverStatusToggle del módulo repartidor.
// ============================================================

import React, { useState } from 'react';
import { Power, Loader2 } from 'lucide-react';
import type { ProfessionalStatus } from '@/hooks/useMyProfessionalProfile';

interface AvailabilityToggleProps {
  status: ProfessionalStatus;
  onChange: (next: ProfessionalStatus) => Promise<void>;
  disabled?: boolean;
  /** 🔥 Color primario del tenant. */
  primary?: string;
  /** 🔥 Color de texto secundario del tenant. */
  textMuted?: string;
  /** 🔥 NUEVO: cantidad de citas activas (para bloquear offline). */
  activeBookings?: number;
}

export default function AvailabilityToggle({
  status,
  onChange,
  disabled = false,
  primary = '#ea580c',
  textMuted = '#94a3b8',
  activeBookings = 0,
}: AvailabilityToggleProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const isOnline = status === 'online';

  // 🔥 REGLA CRÍTICA: no podés pasar a offline si tenés citas activas.
  const cannotGoOffline = isOnline && activeBookings > 0;

  const handleClick = async () => {
    if (disabled || isSwitching) return;

    // 🔥 Bloqueo: si intenta pasar a offline con citas activas, alerta
    if (cannotGoOffline) {
      alert(
        `No podés desconectarte: tenés ${activeBookings} cita(s) activa(s).\n\n` +
        `Terminá tus citas o pedile al administrador que reasigne antes de ponerte no disponible.`
      );
      return;
    }

    setIsSwitching(true);
    try {
      await onChange(isOnline ? 'offline' : 'online');
    } finally {
      setIsSwitching(false);
    }
  };

  // Colores: online = primary del tenant, offline = gris neutro
  const onlineColor = primary;
  const offlineColor = '#64748b';
  const accent = isOnline ? onlineColor : offlineColor;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isSwitching || cannotGoOffline}
      className="w-full rounded-3xl border shadow-xl p-5 flex items-center justify-between gap-4 transition active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        borderColor: `${accent}50`,
        backgroundColor: `${accent}15`,
      }}
      title={cannotGoOffline 
        ? `Tenés ${activeBookings} cita(s) activa(s). Terminá primero.` 
        : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: accent, color: 'white' }}
        >
          {isSwitching ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Power className="w-6 h-6" />
          )}
        </div>
        <div className="text-left">
          <div className="text-sm font-black" style={{ color: accent }}>
            {isOnline ? 'Estás disponible' : 'Estás no disponible'}
          </div>
          <div
            className="text-[11px] mt-0.5"
            style={{ color: cannotGoOffline ? '#f59e0b' : textMuted }}
          >
            {cannotGoOffline
              ? `⚠️ Tenés ${activeBookings} cita(s) activa(s). Terminá primero.`
              : isOnline
                ? 'Recibiendo citas y reservas'
                : 'Toca para activarte y recibir citas'}
          </div>
        </div>
      </div>

      <div className="relative shrink-0">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: accent }}
        />
        {isOnline && (
          <div
            className="absolute inset-0 w-3 h-3 rounded-full animate-ping"
            style={{ backgroundColor: accent, opacity: 0.6 }}
          />
        )}
      </div>
    </button>
  );
}
