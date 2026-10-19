  'use client';

  // ============================================================
  // ARCHIVO: app/profesional/components/AppointmentCard.tsx
  // Card de una cita asignada al profesional.
  // Mismo patrón que AssignmentCard del módulo repartidor.
  // ============================================================

  import React, { useState } from 'react';
  import {
    MapPin,
    Phone,
    Clock,
    Calendar,
    CheckCircle2,
    XCircle,
    Loader2,
    User as UserIcon,
    Play,
    Ban,
    FileText,
    Timer,
  } from 'lucide-react';
  import type { BookingWithService } from '@/hooks/useMyProfessionalProfile';
import { useProfessionalLocation } from '@/hooks/useProfessionalLocation';

  interface AppointmentCardProps {
    booking: BookingWithService;
    onUpdateStatus: (bookingId: string, status: string) => Promise<void>;
    /** 🔥 Color primario del tenant. */
    primary: string;
    /** 🔥 Color de acento del tenant. */
    accent: string;
    /** 🔥 Color de texto principal. */
    textColor: string;
    /** 🔥 Color de texto secundario. */
    textMuted: string;
    /** 🔥 Fondo de la card. */
    cardBg: string;
    /** 🔥 Color del borde dinámico. */
    borderDynamic: string;
  }

  const STATUS_LABELS: Record<
    string,
    { label: string; getColors: (primary: string, accent: string) => { color: string; bg: string } }
  > = {
    pending: {
      label: 'Nueva',
      getColors: () => ({ color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' }),
    },
    confirmed: {
      label: 'Confirmada',
      getColors: (primary) => ({ color: primary, bg: `${primary}20` }),
    },
    in_progress: {
      label: 'En curso',
      getColors: (_p, accent) => ({ color: accent, bg: `${accent}20` }),
    },
    completed: {
      label: 'Completada',
      getColors: () => ({ color: '#10b981', bg: 'rgba(16,185,129,0.15)' }),
    },
    cancelled: {
      label: 'Cancelada',
      getColors: () => ({ color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }),
    },
    no_show: {
      label: 'No asistió',
      getColors: () => ({ color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }),
    },
  };

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-VE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  function isToday(dateStr: string): boolean {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  export default function AppointmentCard({
    booking,
    onUpdateStatus,
    primary,
    accent,
    textColor,
    textMuted,
    cardBg,
    borderDynamic,
  }: AppointmentCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { isSending, error: locationError, startSharing } = useProfessionalLocation();

    const statusInfo =
      (STATUS_LABELS[booking.status] || STATUS_LABELS.pending).getColors(
        primary,
        accent,
      );
    const statusLabel =
      (STATUS_LABELS[booking.status] || STATUS_LABELS.pending).label;
    const service = booking.service;
    const isUrgent = isToday(booking.bookingDate);

    const handleAction = async (nextStatus: string) => {
      setIsLoading(nextStatus);
      try {
        await onUpdateStatus(booking.id, nextStatus);
      } finally {
        setIsLoading(null);
      }
    };

    // Acciones según estado actual
    const actions: Array<{
      status: string;
      label: string;
      color: string;
      icon: any;
    }> = [];

    if (booking.status === 'pending') {
      actions.push({
        status: 'confirmed',
        label: 'Aceptar',
        color: primary,
        icon: CheckCircle2,
      });
      actions.push({
        status: 'cancelled',
        label: 'Rechazar',
        color: '#ef4444',
        icon: XCircle,
      });
    } else if (booking.status === 'confirmed') {
      actions.push({
        status: 'in_progress',
        label: 'Iniciar',
        color: accent,
        icon: Play,
      });
      actions.push({
        status: 'no_show',
        label: 'No asistió',
        color: '#f59e0b',
        icon: Ban,
      });
    } else if (booking.status === 'in_progress') {
      actions.push({
        status: 'completed',
        label: 'Completar',
        color: '#10b981',
        icon: CheckCircle2,
      });
    }

    const phone = booking.customerPhone;
    const address =
      booking.metadata?.customerAddress ||
      booking.metadata?.address ||
      null;
    const customerName = booking.customerName || 'Cliente';
    const notes = booking.notes;

    return (
      <div
        className="rounded-3xl border backdrop-blur-sm shadow-xl overflow-hidden"
        style={{ backgroundColor: cardBg, borderColor: borderDynamic }}
      >
        {/* Header con estado + fecha */}
        <div
          className="p-4 border-b flex items-center justify-between gap-2"
          style={{ borderColor: borderDynamic }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
            >
              {statusLabel}
            </span>
            {isUrgent && (
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full animate-pulse"
                style={{ backgroundColor: `${accent}25`, color: accent }}
              >
                HOY
              </span>
            )}
            <span
              className="text-[10px] font-mono"
              style={{ color: textMuted }}
            >
              #{booking.id?.slice(0, 8) || 'N/A'}
            </span>
          </div>
          {booking.durationMinutes != null && (
            <div
              className="flex items-center gap-1 text-[11px] font-bold shrink-0"
              style={{ color: primary }}
            >
              <Timer className="w-3 h-3" />
              {booking.durationMinutes} min
            </div>
          )}
        </div>

        {/* Fecha + hora */}
        <div className="px-4 pt-4 flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: textColor }}
          >
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">{formatDate(booking.bookingDate)}</span>
          </div>
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: textColor }}
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="font-mono">
              {booking.startTime?.slice(0, 5) || '--:--'} –{' '}
              {booking.endTime?.slice(0, 5) || '--:--'}
            </span>
          </div>
        </div>

        {/* Info del servicio */}
        {service?.name && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ backgroundColor: primary }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: textMuted }}
                >
                  Servicio
                </div>
                <div
                  className="text-sm font-bold truncate"
                  style={{ color: textColor }}
                >
                  {service.name}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info del cliente */}
        <div className="p-4 space-y-3">
          {/* Nombre */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-bold truncate"
                style={{ color: textColor }}
              >
                {customerName}
              </div>
            </div>
          </div>

          {/* Dirección (solo si existe) */}
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span
                className="text-xs leading-relaxed"
                style={{ color: textColor }}
              >
                {address}
              </span>
            </div>
          )}

          {/* Teléfono + botón llamar */}
          {phone && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs" style={{ color: textColor }}>
                  {phone}
                </span>
              </div>
              <a
                href={`tel:${phone}`}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-400 text-[11px] font-bold hover:bg-blue-500/25 transition"
              >
                Llamar
              </a>
            </div>
          )}

          {/* Notas */}
          {notes && (
            <div
              className="flex items-start gap-2 pt-1 border-t"
              style={{ borderColor: borderDynamic }}
            >
              <FileText
                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                style={{ color: textMuted }}
              />
              <span
                className="text-[11px] italic leading-relaxed"
                style={{ color: textMuted }}
              >
                {notes}
              </span>
            </div>
          )}
        </div>

        {/* 🔥 Compartir ubicación (solo si está en camino o en servicio) */}
        {(booking.status === 'in_transit' || booking.status === 'in_service') && (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={() => startSharing()}
              disabled={isSending}
              className="w-full rounded-2xl py-2.5 px-3 text-xs font-bold border transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
              style={{
                borderColor: `${primary}50`,
                color: primary,
                backgroundColor: `${primary}10`,
              }}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              {isSending ? 'Enviando ubicación...' : 'Compartir ubicación'}
            </button>
            {locationError && (
              <p className="text-[10px] text-rose-500 mt-1 text-center">
                {locationError}
              </p>
            )}
          </div>
        )}

        {/* Botones de acción */}
        {actions.length > 0 && (
          <div className="p-4 pt-0 flex gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              const loading = isLoading === action.status;
              return (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => handleAction(action.status)}
                  disabled={isLoading !== null}
                  className="flex-1 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-white transition flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                  style={{ backgroundColor: action.color }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
