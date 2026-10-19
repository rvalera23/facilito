// UpcomingAppointment.tsx
import React from 'react';
import { Calendar, Clock, User, DollarSign, CalendarCheck, ChevronRight } from 'lucide-react';
import { Appointment } from './AppointmentsTab';
import { getStatusBadge } from './utils/statusConfig';
import { formatDate, formatTime, formatPrice } from './utils/formatters';
import { getPriceColors } from '@/lib/priceTokens';
import { formatUsd } from '@/lib/price-utils';

interface UpcomingAppointmentProps {
  appointment: Appointment;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  onOpenModal: (appointment: Appointment) => void;
}

export const UpcomingAppointment: React.FC<UpcomingAppointmentProps> = ({
  appointment: a,
  primary,
  textColor,
  isDarkBg,
  onOpenModal,
}) => {
  const statusBadge = getStatusBadge(a.status);
  const priceColors = getPriceColors({ primary, isDarkBg });

  return (
    <div
      className="p-4 rounded-2xl border-2 flex items-center gap-4 cursor-pointer group transition hover:shadow-lg"
      style={{ borderColor: primary, backgroundColor: `${primary}10` }}
      onClick={() => onOpenModal(a)}
    >
      <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: `${primary}25` }}>
        <CalendarCheck className="w-5 h-5" style={{ color: primary }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] uppercase tracking-wider font-bold opacity-50" style={{ color: textColor }}>
          Próxima Cita
        </p>
        <p className="font-bold text-sm truncate" style={{ color: textColor }}>
          {a.service?.name || a.serviceName || 'Servicio'}
        </p>
        <div className="flex items-center gap-3 text-[10px] opacity-70 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(a.bookingDate)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(a.startTime)}
          </span>
          {a.professionalName && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {a.professionalName}
            </span>
          )}
          {/* 🔥 PRECIO PRINCIPAL EN BS */}
          {a.priceVes && (
            <span className="flex items-center gap-1 font-semibold" style={{ color: priceColors.ves }}>
              Bs. {formatPrice(a.priceVes)}
            </span>
          )}
          {/* 🔥 PRECIO SECUNDARIO EN USD */}
          {a.priceUsd && (
            <span className="flex items-center gap-1 font-semibold" style={{ color: priceColors.foreign }}>
              <DollarSign className="w-3 h-3" />
{formatUsd(a.priceUsd)} USD
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border flex items-center gap-0.5 ${statusBadge.bg} ${statusBadge.textColor}`}>
            {statusBadge.icon}
            {statusBadge.label}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition" />
    </div>
  );
};