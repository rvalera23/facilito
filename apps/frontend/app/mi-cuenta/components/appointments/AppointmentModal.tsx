// AppointmentModal.tsx
'use client';

import React from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  X,
  Store,
  DollarSign,
  CalendarDays,
  Award,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { Appointment } from './AppointmentsTab';
import { getStatusBadge } from './utils/statusConfig';
import { formatDateFull, formatTime, formatPrice } from './utils/formatters';
import { getPriceColors } from '@/lib/priceTokens';
import { formatUsd } from '@/lib/price-utils';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import OrderTrackingPanel from '@/components/tracking/OrderTrackingPanel';

interface AppointmentModalProps {
  appointment: Appointment;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
  cardBg: string;
  onClose: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  appointment,
  primary,
  textColor,
  isDarkBg,
  cardBorder,
  cardBg,
  onClose,
}) => {
  const statusBadge = getStatusBadge(appointment.status);
  const priceColors = getPriceColors({ primary, isDarkBg });

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-200"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 🔥 TRACKING EN VIVO (solo si es a domicilio y está activo) */}
        {(() => {
          const modality =
            appointment.serviceModality ||
            (appointment as any).attributes?.serviceModality ||
            'presencial';
          const isDomicilio = modality === 'domicilio';

          const activeTrackingStatuses = [
            'assigned',
            'accepted',
            'in_transit',
            'in_service',
          ];
          const isActive = activeTrackingStatuses.includes(
            (appointment.status || '').toLowerCase(),
          );

          if (!isDomicilio || !isActive) return null;

          return (
            <div className="mb-4">
              <OrderTrackingPanel
                orderId={appointment.id}
                trackingType="booking"
                safePrimary={primary}
                textMainClass="text-slate-100"
                textMutedClass="text-slate-400"
                mapHeight={280}
              />
            </div>
          );
        })()}

        {/* HEADER MODAL */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primary}20` }}>
              <Calendar className="w-4 h-4" style={{ color: primary }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: textColor }}>
                Detalle de la Cita
              </h3>
              <span className="text-[9px] opacity-40">#{appointment.id?.slice(0, 8) || 'N/A'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border hover:scale-105 transition"
            style={{ borderColor: cardBorder }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* BADGE DE ESTADO GRANDE */}
          <div className="flex items-center justify-center p-3 rounded-xl" style={{ backgroundColor: `${primary}10` }}>
            <span
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-2 ${statusBadge.bg} ${statusBadge.textColor}`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>

          {/* SERVICIO */}
          <div
            className="p-4 rounded-xl border"
            style={{
              borderColor: cardBorder,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 opacity-60" style={{ color: primary }} />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                Servicio
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: textColor }}>
              {appointment.service?.name || appointment.serviceName || 'Servicio'}
            </p>
            {appointment.tenantName && (
              <p className="text-[10px] opacity-50 flex items-center gap-1 mt-0.5" style={{ color: textColor }}>
                <Store className="w-3 h-3" />
                {appointment.tenantName}
              </p>
            )}
          </div>

          {/* CLIENTE */}
          <div
            className="p-4 rounded-xl border"
            style={{
              borderColor: cardBorder,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 opacity-60" style={{ color: primary }} />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                Cliente
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: textColor }}>
              {appointment.customerName}
            </p>
            <div className="flex items-center gap-3 text-xs opacity-60 mt-0.5 flex-wrap" style={{ color: textColor }}>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {formatPhoneDisplay(appointment.customerPhone)}
                              </span>
              {appointment.customerEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {appointment.customerEmail}
                </span>
              )}
            </div>
          </div>

          {/* FECHA Y HORA */}
          <div
            className="p-4 rounded-xl border"
            style={{
              borderColor: cardBorder,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 opacity-60" style={{ color: primary }} />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                Fecha y Hora
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium" style={{ color: textColor }}>
                {formatDateFull(appointment.bookingDate)}
              </p>
              <p className="text-sm flex items-center gap-2" style={{ color: textColor }}>
                <Clock className="w-4 h-4 opacity-60" />
                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                <span className="text-xs opacity-50">({appointment.durationMinutes} min)</span>
              </p>
            </div>
          </div>

          {/* PROFESIONAL */}
          {appointment.professionalName && (
            <div
              className="p-4 rounded-xl border"
              style={{
                borderColor: cardBorder,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 opacity-60" style={{ color: primary }} />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Profesional
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: textColor }}>
                {appointment.professionalName}
              </p>
            </div>
          )}

          {/* PRECIO - BS como principal, USD como secundario */}
          {(appointment.priceVes || appointment.priceUsd) && (
            <div
              className="p-4 rounded-xl border"
              style={{
                borderColor: cardBorder,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 opacity-60" style={{ color: primary }} />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Precio
                </span>
              </div>
              <div className="space-y-1">
                {appointment.priceVes && (
                  <p className="text-sm font-bold" style={{ color: priceColors.ves }}>
                    Bs. {formatPrice(appointment.priceVes)}
                  </p>
                )}
                {appointment.priceUsd && (
                  <p className="text-sm font-semibold" style={{ color: priceColors.foreign }}>
                    {formatUsd(appointment.priceUsd)} USD
                  </p>
                )}
              </div>
            </div>
          )}

          {/* NOTAS */}
          {appointment.notes && (
            <div
              className="p-4 rounded-xl border"
              style={{
                borderColor: cardBorder,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 opacity-60" style={{ color: primary }} />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Notas
                </span>
              </div>
              <p className="text-sm" style={{ color: textColor }}>
                {appointment.notes}
              </p>
            </div>
          )}

          {/* TIMESTAMP */}
          <div className="text-[9px] opacity-40 text-center space-y-0.5" style={{ color: textColor }}>
            <p>Creada: {new Date(appointment.createdAt).toLocaleString('es-VE')}</p>
            <p>ID: {appointment.id}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold border transition hover:opacity-70"
          style={{ borderColor: cardBorder, color: textColor }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};