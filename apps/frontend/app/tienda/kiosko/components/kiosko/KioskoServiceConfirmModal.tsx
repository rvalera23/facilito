'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar, CheckCircle2, Loader2, Clock, User, Phone, MapPin, FileText } from 'lucide-react';
import { useKioskContext } from './KioskStoreLayout';

interface KioskoServiceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  confirmedData: boolean;
  setConfirmedData: (value: boolean) => void;
  selectedService: any;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerReference?: string;
  appointmentDate: string;
  appointmentTime: string;
  finalVes: number;
  finalUsd: number;
  formatPrice: (num: number) => string;
  isSecondaryLight: boolean;
  safePrimary: string;
  secondary?: string;
  borderDynamic: string;
  resolvedTextMain: string;
  resolvedTextMuted: string;
}

// 🔥 HELPER: Formatear fecha legible
const formatDateReadable = (dateStr: string): string => {
  if (!dateStr) return 'Fecha no seleccionada';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export default function KioskoServiceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  confirmedData,
  setConfirmedData,
  selectedService,
  customerName,
  customerPhone,
  customerAddress = '',
  customerReference = '',
  appointmentDate,
  appointmentTime,
  finalVes,
  finalUsd,
  formatPrice,
  isSecondaryLight,
  safePrimary,
  secondary,
  borderDynamic,
  resolvedTextMain,
  resolvedTextMuted,
}: KioskoServiceConfirmModalProps) {
  const { backgroundStyle } = useKioskContext();
  const [isVisible, setIsVisible] = useState(false);

  console.log('🔍 [KioskoServiceConfirmModal] ===== INICIALIZACIÓN =====');
  console.log('🔍 [KioskoServiceConfirmModal] selectedService:', selectedService?.name);
  console.log('🔍 [KioskoServiceConfirmModal] finalVes:', finalVes);
  console.log('🔍 [KioskoServiceConfirmModal] finalUsd:', finalUsd);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 🔥 COLORES DINÁMICOS - TODOS HEREDADOS
  const modalBg = secondary || backgroundStyle;
  const itemBg = isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
  const overlayBg = isSecondaryLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)';
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedColor = isSecondaryLight ? '#64748b' : '#94a3b8';

  const durationMinutes = selectedService?.durationMinutes || selectedService?.duration || 60;
  const modality = selectedService?.serviceModality || selectedService?.attributes?.serviceModality || 'Presencial';

  return (
    <div 
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: overlayBg }}
    >
      <style jsx>{`
        @keyframes scaleIn {
          0% { transform: scale(0.8) translateY(30px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .modal-enter {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .item-enter {
          animation: slideUp 0.4s ease forwards;
          opacity: 0;
        }
        .item-enter:nth-child(1) { animation-delay: 0.05s; }
        .item-enter:nth-child(2) { animation-delay: 0.1s; }
        .item-enter:nth-child(3) { animation-delay: 0.15s; }
        .item-enter:nth-child(4) { animation-delay: 0.2s; }
        .item-enter:nth-child(5) { animation-delay: 0.25s; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px ${safePrimary}40, 0 0 60px ${safePrimary}20; }
          50% { box-shadow: 0 0 40px ${safePrimary}60, 0 0 80px ${safePrimary}30; }
        }
      `}</style>

      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col modal-enter`}
        style={{
          backgroundColor: modalBg,
          borderColor: borderDynamic,
          color: textColor,
        }}
      >
        {/* HEADER */}
        <div
          className="px-8 py-6 border-b flex items-center justify-between"
          style={{
            borderColor: borderDynamic,
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl flex items-center justify-center item-enter"
              style={{ backgroundColor: `${safePrimary}15`, color: safePrimary }}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl font-black tracking-tight`} style={{ color: textColor }}>
                Confirmar Cita
              </h2>
              <p className={`text-xs font-medium`} style={{ color: mutedColor }}>
                Revisa los detalles antes de confirmar
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              console.log('🔙 [KioskoServiceConfirmModal] Cerrando modal');
              onClose();
            }}
            className="p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95"
            style={{
              backgroundColor: itemBg,
              borderColor: borderDynamic,
              color: textColor,
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ADVERTENCIA */}
          <div
            className="p-4 rounded-2xl border flex items-start gap-3 item-enter"
            style={{
              backgroundColor: 'rgba(234,179,8,0.08)',
              borderColor: 'rgba(234,179,8,0.2)',
            }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className={`text-sm font-bold`} style={{ color: textColor }}>
                Revisa que todos los datos sean correctos
              </p>
              <p className={`text-xs`} style={{ color: mutedColor }}>
                Una vez confirmado, no podrás modificar esta cita desde el tótem.
              </p>
            </div>
          </div>

          {/* 🔥 RESUMEN DEL SERVICIO */}
          <div
            className="p-4 rounded-2xl border space-y-3 item-enter"
            style={{
              backgroundColor: itemBg,
              borderColor: borderDynamic,
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-black uppercase tracking-wider`} style={{ color: mutedColor }}>
                Servicio
              </h3>
              <span 
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full border`}
                style={{
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  borderColor: 'rgba(34,197,94,0.3)',
                  color: '#22c55e'
                }}
              >
                ✓ Exento de IVA
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ 
              borderColor: borderDynamic, 
              backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' 
            }}>
              <div>
                <span className={`font-bold block ${textColor}`}>
                  {selectedService?.name || 'Servicio'}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-xs flex items-center gap-1 ${mutedColor}`}>
                    <Clock className="w-3 h-3" />
                    {durationMinutes} min
                  </span>
                  <span className={`text-xs ${mutedColor}`}>•</span>
                  <span className={`text-xs ${mutedColor}`}>{modality}</span>
                </div>
                {appointmentDate && appointmentTime && (
                  <div className={`text-xs flex items-center gap-1 mt-1 ${mutedColor}`}>
                    <Calendar className="w-3 h-3" />
                    {formatDateReadable(appointmentDate)} a las {appointmentTime}
                  </div>
                )}
              </div>
              <span className={`font-bold text-lg`} style={{ color: safePrimary }}>
                Bs. {formatPrice(finalVes)}
              </span>
            </div>
          </div>
          {/* 🔥 DATOS DEL CLIENTE */}
          <div
            className="p-4 rounded-2xl border space-y-3 item-enter"
            style={{
              backgroundColor: itemBg,
              borderColor: borderDynamic,
            }}
          >
            <h3 className={`text-sm font-black uppercase tracking-wider`} style={{ color: mutedColor }}>
              Datos del Cliente
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 opacity-40" style={{ color: mutedColor }} />
                <span className={`font-medium ${textColor}`}>{customerName || 'No especificado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 opacity-40" style={{ color: mutedColor }} />
                <span className={`font-medium ${textColor}`}>{customerPhone || 'No especificado'}</span>
              </div>
              {customerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 opacity-40 mt-0.5" style={{ color: mutedColor }} />
                  <span className={`font-medium ${textColor}`}>{customerAddress}</span>
                </div>
              )}
              {customerReference && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 opacity-40 mt-0.5" style={{ color: mutedColor }} />
                  <span className={`font-medium ${textColor}`}>{customerReference}</span>
                </div>
              )}
            </div>
          </div>

          {/* 🔥 TOTAL - SERVICIO EXENTO DE IVA */}
          <div
            className="p-4 rounded-2xl border item-enter"
            style={{
              backgroundColor: `${safePrimary}10`,
              borderColor: `${safePrimary}30`,
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className={`font-black uppercase`} style={{ color: mutedColor }}>
                  Total a Pagar:
                </span>
                <span className={`text-[9px] block`} style={{ color: '#22c55e' }}>
                  ✓ Exento de IVA
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black`} style={{ color: safePrimary }}>
                  Bs. {formatPrice(finalVes)}
                </span>
                <span
                  className="text-xs block font-bold"
                  style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}
                >
                  (${finalUsd.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          {/* CHECKBOX DE CONFIRMACIÓN */}
          <label className="flex items-start gap-3 cursor-pointer item-enter">
            <input
              type="checkbox"
              checked={confirmedData}
              onChange={(e) => {
                console.log('🔍 [KioskoServiceConfirmModal] Checkbox cambiado:', e.target.checked);
                setConfirmedData(e.target.checked);
              }}
              className="mt-1 w-5 h-5 rounded border-2 cursor-pointer"
              style={{ accentColor: safePrimary }}
            />
            <span className={`text-sm`} style={{ color: mutedColor }}>
              Confirmo que los datos son correctos y deseo proceder con la cita desde el Tótem de Autoservicio.
            </span>
          </label>
        </div>

        {/* FOOTER */}
        <div
          className="px-8 py-6 border-t flex items-center justify-end gap-4"
          style={{
            borderColor: borderDynamic,
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
          }}
        >
          <button
            onClick={() => {
              console.log('🔙 [KioskoServiceConfirmModal] Cancelando');
              onClose();
            }}
            className="px-6 py-3 rounded-2xl font-bold text-sm transition border cursor-pointer hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: itemBg,
              borderColor: borderDynamic,
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              console.log('✅ [KioskoServiceConfirmModal] Confirmando cita');
              onConfirm();
            }}
            disabled={!confirmedData || isSubmitting}
            className="px-8 py-3 rounded-2xl font-bold text-sm transition flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: confirmedData && !isSubmitting ? safePrimary : '#94a3b8',
              color: confirmedData && !isSubmitting ? '#ffffff' : '#64748b',
              cursor: confirmedData && !isSubmitting ? 'pointer' : 'not-allowed',
              animation: confirmedData && !isSubmitting ? 'pulseGlow 2s ease-in-out infinite' : 'none',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Cita</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}