'use client';

import React, { useMemo } from 'react';
// ============================================================
// ICONOS SVG LOCALES (heredan color con `currentColor`)
// ============================================================
const Calendar = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const Clock = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const User = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const Phone = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPin = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const FileText = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const X = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CreditCard = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const CheckCircle2 = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircle = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const Building2 = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M9 21V9h6v12" />
    <path d="M9 13h6M9 17h6" />
  </svg>
);

const Sparkles = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
  </svg>
);
import { useKioskContext } from './KioskStoreLayout';

// ============================================================
// 🔥 SIDEBAR DE SERVICIO (DESKTOP)
// ============================================================
// Análogo a KioskoCartSidebar pero para servicios.
// - Presentacional: recibe todo por props.
// - El modal (calendario + datos) lo maneja el page.tsx.
// - Muestra el resumen del servicio seleccionado y el progreso.
// - El botón "Elegir fecha y hora" dispara onOpenModal.
// - El botón "Continuar al Pago" (cuando todo está completo) llama
//   directamente a onProceedToPay.

interface KioskoServiceCartSidebarProps {
  // Servicio
  selectedService: any;
  onClearService: () => void;

  // Datos de la cita (vienen del modal)
  appointmentDate: string;
  appointmentTime: string;
  professionals?: any[];
  selectedProfessionalId?: string;

  // Datos del cliente (vienen del modal)
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerReference?: string;

  // Totales
  totalVes: number;
  totalUsd: number;

  // Acciones
  onOpenModal: () => void;
  onProceedToPay: () => void;
}

const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatTimeAMPM = (time: string): string => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatDateLabel = (date: string): string => {
  if (!date) return '';
  try {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return date;
  }
};

export default function KioskoServiceCartSidebar({
  selectedService,
  onClearService,
  appointmentDate,
  appointmentTime,
  professionals = [],
  selectedProfessionalId = '',
  customerName,
  customerPhone,
  customerAddress = '',
  customerReference = '',
  totalVes,
  totalUsd,
  onOpenModal,
  onProceedToPay,
}: KioskoServiceCartSidebarProps) {
const { primary, secondary, isSecondaryLight, accentReadable: contextAccent } = useKioskContext();

const safePrimary = primary || '#F59E0B';
const accentReadable = contextAccent || safePrimary;

  const textColorValue = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedTextColorValue = isSecondaryLight ? '#64748b' : '#94a3b8';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const itemBgColor = isSecondaryLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';

  const hasService = !!selectedService;
  const hasSchedule = hasService && !!appointmentDate && !!appointmentTime;
  const hasCustomer = hasService && !!customerName.trim() && !!customerPhone.trim();

  const isReadyToPay = hasService && hasSchedule && hasCustomer;

  // Nombre del profesional seleccionado (si hay)
  const professionalName = useMemo(() => {
    if (!selectedProfessionalId) return null;
    const found = (professionals || []).find(
      (p: any) => (p.id || p._id) === selectedProfessionalId,
    );
    return found?.name || found?.fullName || null;
  }, [selectedProfessionalId, professionals]);

  const durationMinutes = Number(
    selectedService?.durationMinutes || selectedService?.duration || 60,
  );

  return (
    <div
className="rounded-3xl border pt-4 pb-5 px-5 shadow-xl backdrop-blur-md flex flex-col overflow-hidden"
      style={{
backgroundColor: secondary
  ? (isSecondaryLight ? 'rgba(255,255,255,0.9)' : `${secondary}E6`)
  : (isSecondaryLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.7)'),
          borderColor,
        color: textColorValue,
        borderRadius: '24px',
      }}
    >
      {/* HEADER */}
      <div
        className="flex items-center justify-between pb-4 border-b"
        style={{ borderColor }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-xl flex items-center justify-center"
style={{ backgroundColor: `${accentReadable}20`, color: accentReadable }}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg tracking-tight" style={{ color: textColorValue }}>
              Tu Cita
            </h3>
            <p className="text-xs font-medium" style={{ color: mutedTextColorValue }}>
              {hasService ? '1 servicio' : 'Sin servicio'}
            </p>
          </div>
        </div>

        {/* Badge de estado del flujo */}
{hasService && (
  <span
    className="text-[8px] font-bold px-2 py-0.5 rounded-full border"
    style={{
      backgroundColor: isReadyToPay
        ? `${accentReadable}20`
        : 'rgba(251,191,36,0.15)',
      borderColor: isReadyToPay
        ? `${accentReadable}50`
        : 'rgba(251,191,36,0.3)',
      color: isReadyToPay ? accentReadable : '#f59e0b',
    }}
  >
    {isReadyToPay ? 'Listo para pagar' : 'Incompleto'}
  </span>
)}
      </div>

      {/* BODY — LISTA / RESUMEN */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
        {!hasService ? (
          <div
            className="py-12 text-center text-sm font-medium opacity-60"
            style={{ color: mutedTextColorValue }}
          >
<Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: accentReadable }} />
            Selecciona un servicio del catálogo
          </div>
        ) : (
          <>
            {/* 🔥 CARD DEL SERVICIO */}
            <div
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: itemBgColor,
                borderColor,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg shrink-0 flex items-center justify-center"
style={{ backgroundColor: `${accentReadable}20`, color: accentReadable }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className="font-bold text-sm block truncate"
                    style={{ color: textColorValue }}
                  >
                    {selectedService.name || selectedService.nombre || 'Servicio'}
                  </span>

                  <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: mutedTextColorValue }}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {durationMinutes} min
                    </span>
                    {selectedService.serviceModality && (
                      <>
                        <span className="w-px h-3 bg-current opacity-30" />
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {selectedService.serviceModality}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClearService}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                  style={{ color: '#f43f5e' }}
                  title="Quitar servicio"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 🔥 FECHA Y HORA (o botón para elegir) */}
            {!hasSchedule ? (
              <button
                type="button"
                onClick={onOpenModal}
                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
style={{
  backgroundColor: `${accentReadable}10`,
  borderColor: `${accentReadable}40`,
  color: accentReadable,
}}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-bold">Elegir fecha y hora</span>
                </div>
                <span className="text-xs opacity-70">→</span>
              </button>
            ) : (
              <div
                className="p-3 rounded-xl border"
                style={{ backgroundColor: itemBgColor, borderColor }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: textColorValue }}>
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-bold">{formatDateLabel(appointmentDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: textColorValue }}>
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-bold">{formatTimeAMPM(appointmentTime)}</span>
                    </div>
                    {professionalName && (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: mutedTextColorValue }}>
                        <User className="w-3 h-3" />
                        <span>{professionalName}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenModal}
                    className="text-[10px] font-bold underline opacity-70 hover:opacity-100 cursor-pointer shrink-0"
style={{ color: accentReadable }}
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}

            {/* 🔥 DATOS DEL CLIENTE (o botón para completar) */}
            {!hasCustomer ? (
              <button
                type="button"
                onClick={onOpenModal}
                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  backgroundColor: `${safePrimary}10`,
                  borderColor: `${safePrimary}40`,
                  color: safePrimary,
                }}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-bold">Completar tus datos</span>
                </div>
                <span className="text-xs opacity-70">→</span>
              </button>
            ) : (
              <div
                className="p-3 rounded-xl border space-y-1"
                style={{ backgroundColor: itemBgColor, borderColor }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-60" style={{ color: mutedTextColorValue }}>
                    Datos del cliente
                  </span>
                  <button
                    type="button"
                    onClick={onOpenModal}
                    className="text-[10px] font-bold underline opacity-70 hover:opacity-100 cursor-pointer"
                    style={{ color: safePrimary }}
                  >
                    Editar
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: textColorValue }}>
                  <User className="w-3 h-3 opacity-70 shrink-0" />
                  <span className="font-medium truncate">{customerName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: textColorValue }}>
                  <Phone className="w-3 h-3 opacity-70 shrink-0" />
                  <span className="font-medium">{customerPhone}</span>
                </div>

                {customerReference && (
                  <div className="flex items-start gap-1.5 text-[11px]" style={{ color: mutedTextColorValue }}>
                    <FileText className="w-3 h-3 opacity-70 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{customerReference}</span>
                  </div>
                )}
              </div>
            )}

            {/* 🔥 AVISO SI FALTA ALGO */}
            {!isReadyToPay && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl border text-[11px]"
                style={{
                  backgroundColor: 'rgba(251,191,36,0.08)',
                  borderColor: 'rgba(251,191,36,0.25)',
                  color: '#f59e0b',
                }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {!hasSchedule
                    ? 'Falta elegir fecha y hora de la cita.'
                    : 'Faltan tus datos de contacto.'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="pt-4 border-t space-y-3" style={{ borderColor }}>
        {/* Total */}
        <div className="flex items-center justify-between">
          <span
            className="font-black text-sm uppercase tracking-wider opacity-70"
            style={{ color: mutedTextColorValue }}
          >
            Total:
          </span>
          <div className="text-right">
            <span
              className="font-black text-xl"
style={{ color: hasService ? accentReadable : mutedTextColorValue }}
            >
              Bs. {hasService ? formatPrice(totalVes) : '0,00'}
            </span>
            <span
              className="text-[10px] font-medium block opacity-60"
              style={{ color: mutedTextColorValue }}
            >
              (${hasService ? totalUsd.toFixed(2) : '0.00'})
            </span>
          </div>
        </div>

        {/* Botón principal */}
        <button
          type="button"
          onClick={() => {
            if (!hasService) return;
            if (!isReadyToPay) {
              onOpenModal();
              return;
            }
            onProceedToPay();
          }}
          disabled={!hasService}
          className={`w-full py-4 rounded-2xl text-base font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xl ${
            !hasService
              ? 'opacity-50 cursor-not-allowed border'
              : 'hover:opacity-95 active:scale-95 cursor-pointer'
          }`}
          style={{
backgroundColor: !hasService
  ? 'rgba(100,116,139,0.3)'
  : accentReadable,
            color: !hasService
              ? '#94a3b8'
              : isSecondaryLight
              ? '#0f172a'
              : '#ffffff',
            borderColor: !hasService ? borderColor : 'transparent',
            borderRadius: '16px',
          }}
        >
          <span>
            {!hasService
              ? 'Selecciona un servicio'
              : isReadyToPay
              ? 'Pagar'
              : 'Completar datos'}
          </span>
          {isReadyToPay ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <CreditCard className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}