'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Calendar, Clock, User, Phone, MapPin, FileText, CalendarDays } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/formatPhone';

interface ServiceConfirmModalProps {
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
  textColor: string;
  mutedColor: string;
  overlayBg: string;
  itemBg: string;
}

// 🔥 HELPER: Formatear fecha legible - CORREGIDO (UTC)
const formatDateReadable = (dateStr: string): string => {
  if (!dateStr) return 'Fecha no seleccionada';
  try {
    // 🔥 DESCOMPONER LA FECHA Y CREARLA EN UTC PARA EVITAR DESFASE
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    // Crear fecha en UTC
    const d = new Date(Date.UTC(year, month, day));
    
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
};

export default function ServiceConfirmModal({
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
  textColor,
  mutedColor,
  overlayBg,
  itemBg,
}: ServiceConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const durationMinutes = selectedService?.durationMinutes || selectedService?.duration || 60;
  const modality = selectedService?.serviceModality || selectedService?.attributes?.serviceModality || 'Presencial';
  const modalBg = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');

  // 🔥 DESCUENTO desde _pricing del backend
  const p = selectedService?._pricing || {};
  const hasDiscount = Boolean(p.hasDiscount) && Number(p.discountPercentage) > 0;
  const discountPercentage = Number(p.discountPercentage || 0);
  const originalPriceVES = Number(p.originalPriceVES || p.totalPriceVES || 0);
  const discountAmountVES = Number(p.discountAmountVES || 0);

  return (
    <div 
      className={`fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        backgroundColor: overlayBg,
        backdropFilter: 'blur(4px)'
      }}
    >
      <style jsx>{`
        @keyframes scaleIn {
          0% { transform: scale(0.85) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          0% { transform: translateY(15px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .modal-enter { animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .item-enter { animation: slideUp 0.35s ease forwards; opacity: 0; }
        .item-enter:nth-child(1) { animation-delay: 0.03s; }
        .item-enter:nth-child(2) { animation-delay: 0.06s; }
        .item-enter:nth-child(3) { animation-delay: 0.09s; }
        .item-enter:nth-child(4) { animation-delay: 0.12s; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px ${safePrimary}40, 0 0 60px ${safePrimary}20; }
          50% { box-shadow: 0 0 40px ${safePrimary}60, 0 0 80px ${safePrimary}30; }
        }
      `}</style>

      <div 
        className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border space-y-5 modal-enter"
        style={{ 
          backgroundColor: modalBg,
          borderColor: borderDynamic,
          color: textColor,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-4 item-enter" style={{ borderColor: borderDynamic }}>
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${safePrimary}15` }}
            >
              <Calendar className="w-5 h-5" style={{ color: safePrimary }} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight" style={{ color: textColor }}>
                Confirmar Cita
              </h3>
              <p className={`text-xs font-medium`} style={{ color: mutedColor }}>
                Revisa los detalles de tu reserva
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition hover:scale-105 active:scale-95 ${
              isSecondaryLight ? 'hover:bg-black/5' : 'hover:bg-white/5'
            }`}
            style={{ color: textColor }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DATOS DEL CLIENTE */}
        <div className={`p-4 rounded-xl border space-y-2 item-enter`} style={{ backgroundColor: itemBg, borderColor: borderDynamic }}>
          <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2`} style={{ color: mutedColor }}>
            <User className="w-4 h-4 opacity-40" />
            Datos del Cliente
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 opacity-40" />
              <div>
                <span className={`text-[9px] block`} style={{ color: mutedColor }}>Nombre</span>
                <span className={`text-sm font-bold`} style={{ color: textColor }}>
                  {customerName || 'No especificado'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 opacity-40" />
              <div>
                <span className={`text-[9px] block`} style={{ color: mutedColor }}>Teléfono</span>
                <span className={`text-sm font-bold`} style={{ color: textColor }}>
                  {customerPhone ? formatPhoneDisplay(customerPhone) : 'No especificado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 SERVICIO A CONTRATAR */}
        <div className={`p-4 rounded-xl border space-y-3 item-enter`} style={{ backgroundColor: itemBg, borderColor: borderDynamic }}>
          <div className="flex items-center justify-between">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2`} style={{ color: mutedColor }}>
              <CalendarDays className="w-4 h-4 opacity-40" />
              Servicio a contratar
            </h4>
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

          <div className="flex justify-between items-center">
            <div>
              <span className={`font-bold block`} style={{ color: textColor }}>
                {selectedService?.name || 'Servicio'}
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-xs flex items-center gap-1`} style={{ color: mutedColor }}>
                  <Clock className="w-3 h-3" />
                  {durationMinutes} min
                </span>
                <span className={`text-xs`} style={{ color: mutedColor }}>•</span>
                <span className={`text-xs`} style={{ color: mutedColor }}>{modality}</span>
                {hasDiscount && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: safePrimary, color: '#ffffff' }}
                  >
                    -{discountPercentage}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {hasDiscount && (
                <span className={`text-[10px] line-through opacity-50 block`} style={{ color: mutedColor }}>
                  Bs. {formatPrice(originalPriceVES)}
                </span>
              )}
              <span className={`font-bold text-lg`} style={{ color: safePrimary }}>
                Bs. {formatPrice(finalVes)}
              </span>
            </div>
          </div>

          {/* FECHA Y HORA */}
          {appointmentDate && (
            <div className="flex items-center gap-4 pt-2 text-sm border-t" style={{ borderColor: borderDynamic }}>
              <Calendar className="w-4 h-4 opacity-40" />
              <span className={`font-medium`} style={{ color: textColor }}>
                {formatDateReadable(appointmentDate)}
              </span>
              {appointmentTime && (
                <>
                  <Clock className="w-4 h-4 opacity-40" />
                  <span className={`font-medium`} style={{ color: textColor }}>
                    {appointmentTime}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 🔥 TOTAL - SERVICIO EXENTO DE IVA */}
        <div className={`flex items-center justify-between border-t pt-4 item-enter`} style={{ borderColor: borderDynamic }}>
          <div>
            <span className={`font-bold text-sm`} style={{ color: textColor }}>Total a Pagar</span>
            <span className={`text-[9px] block`} style={{ color: '#22c55e' }}>✓ Exento de IVA</span>
          </div>
          <div className="text-right">
            {hasDiscount && (
              <span className={`text-xs line-through opacity-50 block`} style={{ color: mutedColor }}>
                Bs. {formatPrice(originalPriceVES)}
              </span>
            )}
            <span className="font-black text-xl tracking-tight block" style={{ color: safePrimary }}>
              Bs. {formatPrice(finalVes)}
            </span>
            <span className={`text-xs font-medium`} style={{ color: mutedColor }}>
              (${finalUsd.toFixed(2)} USD)
            </span>
            {hasDiscount && discountAmountVES > 0 && (
              <span className="text-[10px] font-bold block text-emerald-500">
                Ahorras Bs. {formatPrice(discountAmountVES)}
              </span>
            )}
          </div>
        </div>

        {/* CHECKBOX */}
        <div className="flex items-start gap-3 pt-2 item-enter">
          <input
            type="checkbox"
            id="confirm-service-data"
            checked={confirmedData}
            onChange={(e) => setConfirmedData(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0"
            style={{ accentColor: safePrimary }}
          />
          <label htmlFor="confirm-service-data" className="text-sm font-medium cursor-pointer leading-relaxed" style={{ color: textColor }}>
            He verificado los datos de la reserva y confirmo que deseo realizar el pedido.
          </label>
        </div>

        {/* BOTONES */}
        <div className="flex gap-3 pt-2 item-enter">
          <button
            onClick={onClose}
            className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition hover:opacity-80 active:scale-95 ${
              isSecondaryLight 
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmedData || isSubmitting}
            style={{ 
              backgroundColor: confirmedData && !isSubmitting ? safePrimary : 'rgba(100,116,139,0.3)',
              animation: confirmedData && !isSubmitting ? 'pulseGlow 2s ease-in-out infinite' : 'none',
            }}
            className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 ${
              confirmedData && !isSubmitting ? 'text-white' : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Procesando...' : 'Confirmar Cita'}
          </button>
        </div>
      </div>
    </div>
  );
}