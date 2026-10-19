// AppointmentRow.tsx
'use client';

import React from 'react';
import { Clock, Phone, Store } from 'lucide-react';
import { Appointment } from './AppointmentsTab';
import { getStatusBadge } from './utils/statusConfig';
import { formatDate, formatTime, formatPrice } from './utils/formatters';
import { getPriceColors } from '@/lib/priceTokens';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { formatUsd } from '@/lib/price-utils';

interface AppointmentRowProps {
  appointment: Appointment;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
  columnWidths: Record<string, number>;
  onOpenModal: (appointment: Appointment) => void;
}

export const AppointmentRow: React.FC<AppointmentRowProps> = ({
  appointment,
  primary,
  textColor,
  isDarkBg,
  cardBorder,
  columnWidths,
  onOpenModal,
}) => {
  const statusBadge = getStatusBadge(appointment.status);
  const isCompleted = appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled';
  const priceColors = getPriceColors({ primary, isDarkBg });
  return (
    <tr
      className={`hover:bg-white/5 transition-colors group ${isCompleted ? 'opacity-75' : isCancelled ? 'opacity-50' : ''}`}
      style={{ borderBottom: `1px solid ${cardBorder}` }}
    >
      <td className="py-3 px-4 pl-5 align-middle" style={{ width: columnWidths.date }}>
        <div className="font-medium text-[11px]" style={{ color: textColor }}>
          {formatDate(appointment.bookingDate)}
        </div>
        <div className="text-[10px] opacity-60 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          <span className="opacity-50">({appointment.durationMinutes} min)</span>
        </div>
      </td>
      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.customer }}>
        <div className="font-medium text-[11px]" style={{ color: textColor }}>
          {appointment.customerName}
        </div>
        {appointment.customerPhone && (
          <div className="text-[10px] opacity-60 flex items-center gap-1">
            <Phone className="w-3 h-3" /> {formatPhoneDisplay(appointment.customerPhone)}
                      </div>
        )}
      </td>
      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.service }}>
        <div className="text-[11px] truncate" style={{ color: textColor }}>
          {appointment.service?.name || appointment.serviceName || 'Servicio'}
        </div>
        {appointment.tenantName && (
          <div className="text-[9px] opacity-50 flex items-center gap-1">
            <Store className="w-3 h-3" /> {appointment.tenantName}
          </div>
        )}
      </td>
      {/* 🔥 PRECIO: BS como principal (color primario), USD como secundario (verde) */}
      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.price }}>
        {appointment.priceVes ? (
          <>
            <div className="text-[11px] font-bold" style={{ color: priceColors.ves }}>
              Bs. {formatPrice(appointment.priceVes)}
            </div>
            {appointment.priceUsd && (
              <div className="text-[10px] font-medium" style={{ color: priceColors.foreign }}>
${formatUsd(appointment.priceUsd)} USD
              </div>
            )}
          </>
        ) : appointment.priceUsd ? (
          <div className="text-[11px] font-bold" style={{ color: priceColors.foreign }}>
${formatUsd(appointment.priceUsd)} USD
          </div>
        ) : (
          <div className="text-[10px] opacity-40">N/A</div>
        )}
      </td>
      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.professional }}>
        <div className="text-[11px] truncate" style={{ color: textColor }}>
          {appointment.professionalName || 'No asignado'}
        </div>
      </td>
      <td className="py-3 px-4 align-middle" style={{ width: columnWidths.status }}>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${statusBadge.bg}`}
          style={{
            color: statusBadge.color,
            borderColor: `${statusBadge.color}30`,
          }}
        >
          {statusBadge.icon}
          {statusBadge.label}
        </span>
      </td>
      <td className="py-3 px-4 pr-5 align-middle text-center" style={{ width: columnWidths.actions }}>
        <button
          type="button"
          onClick={() => onOpenModal(appointment)}
          className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer hover:opacity-80"
          style={{
            backgroundColor: `${primary}20`,
            color: primary,
          }}
        >
          Ver detalles
        </button>
      </td>
    </tr>
  );
};