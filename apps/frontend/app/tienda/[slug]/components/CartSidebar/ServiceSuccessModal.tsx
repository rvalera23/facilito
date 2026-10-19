'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, X, Calendar, Smartphone, CreditCard, 
  Banknote, Sparkles, Printer, Phone, 
  Star, User, BadgeCheck, CalendarDays, Briefcase, Clock, MapPin, FileText
} from 'lucide-react';

import { generateReceiptHTML, type ReceiptItem, type ReceiptIvaBreakdown } from '@/app/utils/generateReceiptHTML';

interface ServiceSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerReference?: string;
    totalAmount: number;
    totalAmountVes: number;
    paymentMethodUsed?: string;
    paymentReference?: string;
    bankSource?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    serviceName?: string;
    serviceImage?: string;
    durationMinutes?: number;
    modality?: string;
    notes?: string;
    createdAt?: string;
    /** 🔥 Moneda del pago en efectivo (si aplica). */
    cashCurrency?: 'VES' | 'USD';
    /** 🔥 Monto entregado por el cliente en efectivo (si aplica). */
    cashAmount?: number;
    /** 🔥 Campos de descuento (si el servicio tenía oferta). */
    hasDiscount?: boolean;
    discountPercentage?: number;
    discountAmountVES?: number;
    discountAmountUSD?: number;
    originalPriceVES?: number;
    originalPriceUSD?: number;
    /** Items del pedido (opcional, por compatibilidad con otros flujos). */
    items?: Array<{
      name?: string;
      image?: string;
      durationMinutes?: number;
      modality?: string;
      [key: string]: any;
    }>;
  };
  tenant?: {
    name?: string;
    rif?: string;
    taxId?: string;
    address?: string;
    phone?: string;
    email?: string;
    [key: string]: any;
  } | null;
  primary: string;
    secondary: string;
  isSecondaryLight: boolean;
  textMainClass: string;
  textMutedClass: string;
  exchangeRate?: number;
}

const quantitySafe = (item: any): number => {
  const q = Number(item?.quantity);
  return isNaN(q) || q <= 0 ? 1 : q;
};


const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  cash: 'Efectivo',
  pos: 'Punto de Venta',
  biopago: 'Biopago',
  binance: 'Binance Pay',
  transferencia: 'Transferencia Bancaria',
};

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

const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPaymentMethod = (method?: string): string => {
  const safeMethod = method || '';
  if (!safeMethod) return 'No especificado';
  const normalized = safeMethod.toLowerCase().trim().replace(/_/g, '_');
  return PAYMENT_METHOD_LABELS[normalized as keyof typeof PAYMENT_METHOD_LABELS] || safeMethod.charAt(0).toUpperCase() + safeMethod.slice(1);
};

// SONIDO "BUBBLE"
const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      
      const notes = [
        { freq: 523.25, dur: 0.12 },
        { freq: 659.25, dur: 0.12 },
        { freq: 783.99, dur: 0.12 },
        { freq: 1046.50, dur: 0.25 },
        { freq: 1318.51, dur: 0.30 },
        { freq: 1567.98, dur: 0.40 },
      ];
      
      notes.forEach((n, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = n.freq;
        
        const startTime = ctx.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0.15, startTime + n.dur * 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.dur);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + n.dur);
      });
      
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 2093.00;
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }, 350);
    }
  } catch (e) {
    console.log('🔇 Sonido no disponible');
  }
};

export default function ServiceSuccessModal({
  isOpen,
  onClose,
  orderData,
  tenant,
  primary,
  secondary,
  isSecondaryLight,
  textMainClass,
  textMutedClass,
  exchangeRate: propExchangeRate,
}: ServiceSuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; rotation: number; speed: number; shape: 'circle' | 'square' | 'triangle' }>>([]);


  // 🔥 Imprimir comprobante
  const handlePrintReceipt = () => {
    try {
      // 🔥 Usar el receiptNumber de la DB si existe, sino generar uno temporal
      const receiptNumber = (orderData as any).receiptNumber || (() => {
        const prefix = 'FC';
        const year = new Date().getFullYear();
        const orderIdShort = String(orderData.id).slice(-5).toUpperCase();
        return `${prefix}-${year}-${orderIdShort}`;
      })();

      const totalVesForReceipt = orderData.totalAmountVes || orderData.totalAmount || 0;
      const ivaRateForService = 0;

      const receiptItems: ReceiptItem[] = [
        {
          name: orderData.serviceName || 'Servicio',
          quantity: 1,
          unitPriceVes: totalVesForReceipt,
          totalVes: totalVesForReceipt,
          ivaType: 'exempt',
          ivaRate: ivaRateForService,
          ivaAmount: 0,
        },
      ];

      const ivaBreakdown: ReceiptIvaBreakdown[] = [];

      const html = generateReceiptHTML({
        receiptNumber,
        issuedAt: new Date(),

        tenantName: tenant?.name || 'Mi Negocio',
        tenantRif: tenant?.rif || tenant?.taxId || null,
        tenantAddress: tenant?.address || null,
        tenantPhone: tenant?.phone || null,
        tenantEmail: tenant?.email || null,

        customerName: orderData.customerName || 'Consumidor final',
        customerIdType: null,
        customerIdNumber: null,
        customerPhone: orderData.customerPhone || null,
        customerEmail: orderData.customerEmail || null,
        customerAddress: orderData.customerAddress || null,

        items: receiptItems,

        subtotalBaseVes: totalVesForReceipt,
        ivaBreakdown,
        totalExemptVes: totalVesForReceipt,
        totalIvaVes: 0,
        totalVes: totalVesForReceipt,
        totalUsd: exchangeRate > 0 ? totalVesForReceipt / exchangeRate : 0,
        exchangeRate: exchangeRate,

        paymentMethod: orderData.paymentMethodUsed || null,
        paymentReference: orderData.paymentReference || null,
        bankSource: orderData.bankSource || null,
      });

      const win = window.open('', '_blank', 'width=900,height=1200');
      if (!win) {
        alert('No se pudo abrir la ventana. Verificá que no esté bloqueado el popup.');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (error) {
      console.error('❌ [ServiceSuccessModal] Error al generar el comprobante:', error);
      alert('No se pudo generar el comprobante. Intentá de nuevo.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setShowButtons(false);
      
      setTimeout(() => playSuccessSound(), 200);
      
      const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#eab308', '#06b6d4'];
      const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
      const newConfetti = [];
      
      for (let i = 0; i < 80; i++) {
        newConfetti.push({
          id: i,
          x: 5 + Math.random() * 90,
          y: -10 - Math.random() * 30,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 6 + Math.random() * 12,
          rotation: Math.random() * 360,
          speed: 1.5 + Math.random() * 3.5,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
        });
      }
      setConfetti(newConfetti);
      
      const timer = setTimeout(() => setShowButtons(true), 2500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setConfetti([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalBg = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');
  const itemBg = isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedColor = isSecondaryLight ? '#64748b' : '#94a3b8';

  // 🔥 DATOS DEL SERVICIO
  const serviceName = orderData.serviceName || orderData.items?.[0]?.name || 'Servicio';
  const serviceImage = orderData.serviceImage || orderData.items?.[0]?.image || null;
  const durationMinutes = orderData.durationMinutes || orderData.items?.[0]?.durationMinutes || 60;
  const modality = orderData.modality || orderData.items?.[0]?.modality || 'Presencial';
  const notes = orderData.customerReference || orderData.notes || '';

  // 🔥 TOTALES
  const totalVes = orderData.totalAmountVes || orderData.totalAmount || 0;
  const exchangeRate = propExchangeRate || 0;
  const totalUsd = exchangeRate > 0 ? totalVes / exchangeRate : orderData.totalAmount || 0;

  // 🔥 DESCUENTO
  const hasDiscount = Boolean(orderData.hasDiscount) && Number(orderData.discountPercentage) > 0;
  const discountPercentage = Number(orderData.discountPercentage || 0);
  const discountAmountVES = Number(orderData.discountAmountVES || 0);
  const originalPriceVES = Number(orderData.originalPriceVES || totalVes);

  const isPagoMovil = orderData.paymentMethodUsed?.toLowerCase().includes('pago') || 
                      orderData.paymentMethodUsed?.toLowerCase().includes('movil');

  const getMethodIcon = () => {
    const method = orderData.paymentMethodUsed?.toLowerCase() || '';
    if (method.includes('pago') || method.includes('movil')) return <Smartphone className="w-5 h-5" style={{ color: '#34d399' }} />;
    if (method.includes('efectivo') || method.includes('cash')) return <Banknote className="w-5 h-5" style={{ color: '#fbbf24' }} />;
    if (method.includes('pos') || method.includes('punto')) return <CreditCard className="w-5 h-5" style={{ color: '#60a5fa' }} />;
    return <CreditCard className="w-5 h-5" style={{ color: '#94a3b8' }} />;
  };

  const getSuccessMessage = () => {
    return 'Tu cita ha sido reservada exitosamente. Te esperamos.';
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.8)',
      }}
    >
      {/* CONFETI */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute"
            style={{
              left: `${piece.x}%`,
              top: `${piece.y}%`,
              width: `${piece.size}px`,
              height: `${piece.size * (piece.shape === 'square' ? 1 : 0.6)}px`,
              backgroundColor: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'square' ? '0' : '50% 50% 0 50%',
              transform: `rotate(${piece.rotation}deg)`,
              animationName: 'confettiFall',
              animationDuration: `${piece.speed}s`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              animationDelay: `${Math.random() * 0.8}s`,
              opacity: 0.95,
              boxShadow: `0 0 10px ${piece.color}40`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(calc(100vh + 100px)) rotate(1080deg) scale(0.3); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px ${primary}40, 0 0 60px ${primary}20, 0 0 100px ${primary}10; }
          50% { box-shadow: 0 0 40px ${primary}60, 0 0 80px ${primary}30, 0 0 120px ${primary}15; }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.7) translateY(40px) rotate(-2deg); opacity: 0; }
          100% { transform: scale(1) translateY(0) rotate(0deg); opacity: 1; }
        }
        @keyframes slideUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .modal-enter { animation: scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .item-enter { animation: slideUp 0.6s ease forwards; opacity: 0; }
        .item-enter:nth-child(1) { animation-delay: 0.05s; }
        .item-enter:nth-child(2) { animation-delay: 0.1s; }
        .item-enter:nth-child(3) { animation-delay: 0.15s; }
        .item-enter:nth-child(4) { animation-delay: 0.2s; }
        .item-enter:nth-child(5) { animation-delay: 0.25s; }
        .bounce-enter { animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .shimmer-text {
          background: linear-gradient(90deg, ${primary}, ${primary}80, ${primary});
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col modal-enter`}
        style={{
          backgroundColor: modalBg,
          borderColor: borderColor,
          color: textColor,
        }}
      >
        {/* HEADER */}
        <div
          className="px-8 py-5 border-b relative overflow-hidden shrink-0"
          style={{
            borderColor: borderColor,
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
          }}
        >
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${primary}44 0%, transparent 70%)`,
              animation: 'pulseGlow 2s ease-in-out infinite',
            }}
          />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shrink-0 bounce-enter"
                style={{ 
                  backgroundColor: `${primary}20`,
                  border: `3px solid ${primary}50`,
                  animation: 'pulseGlow 1.5s ease-in-out infinite',
                }}
              >
                <CalendarDays className="w-8 h-8" style={{ color: primary }} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight`} style={{ color: textColor }}>
                    <span className="shimmer-text">¡Cita Confirmada!</span>
                  </h2>
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
                  <Sparkles className="w-6 h-6 text-yellow-400 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
                </div>
                <p className={`text-sm font-medium flex items-center gap-2 ${textMutedClass} truncate`}>
                  <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: primary }} />
                  <span className="truncate">{getSuccessMessage()}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 hover:bg-white/10 shrink-0"
              style={{
                backgroundColor: itemBg,
                borderColor: borderColor,
                color: textColor,
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* NÚMERO DE ORDEN */}
          <div
            className="p-5 rounded-2xl border text-center relative overflow-hidden item-enter"
            style={{
              backgroundColor: `${primary}08`,
              borderColor: `${primary}30`,
            }}
          >
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${primary}88 0%, transparent 70%)`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-1">
                <CheckCircle2 className="w-7 h-7 bounce-enter" style={{ color: primary }} />
                <span className={`text-xs font-bold uppercase tracking-wider ${textMutedClass}`}>
                  Reserva Confirmada
                </span>
                <Star className="w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
              <h3 className={`text-2xl sm:text-3xl font-black tracking-tight`} style={{ color: primary }}>
                #{String(orderData.id).slice(-8).toUpperCase()}
              </h3>
              <p className={`text-xs ${textMutedClass} mt-1 flex items-center justify-center gap-1`}>
                <span>Guarda este número para cualquier consulta</span>
              </p>
            </div>
          </div>

          {/* DETALLES DE LA CITA */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cliente</span>
              <p className={`font-bold text-sm truncate flex items-center gap-1`} style={{ color: textColor }}>
                <User className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{orderData.customerName || 'Cliente'}</span>
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Servicio</span>
              <p className={`font-bold text-sm flex items-center gap-1 truncate`} style={{ color: textColor }}>
                <Briefcase className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{serviceName}</span>
                {hasDiscount && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0"
                    style={{ backgroundColor: primary, color: '#ffffff' }}
                  >
                    -{discountPercentage}%
                  </span>
                )}
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Fecha</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{formatDateReadable(orderData.appointmentDate || '')}</span>
                              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Hora</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span>{orderData.appointmentTime || 'No seleccionada'}</span>
              </p>
            </div>
          </div>

          {/* DURACIÓN Y MODALIDAD */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Duración</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span>{durationMinutes} min</span>
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Modalidad</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <MapPin className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span>{modality}</span>
              </p>
            </div>
          </div>

          {/* NOTAS / DIRECCIÓN */}
          {orderData.customerAddress && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 opacity-60 shrink-0" style={{ color: mutedColor }} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Dirección</span>
              </div>
              <p className={`text-sm font-semibold break-words whitespace-normal`} style={{ color: textColor }}>
                {orderData.customerAddress}
              </p>
            </div>
          )}

          {notes && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 opacity-60 shrink-0" style={{ color: mutedColor }} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Notas</span>
              </div>
              <p className={`text-sm font-semibold break-words whitespace-normal`} style={{ color: textColor }}>
                {notes}
              </p>
            </div>
          )}

          {/* MÉTODO DE PAGO */}
          <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${primary}15` }}>
                {getMethodIcon()}
              </div>
              <div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Método de Pago</span>
                <p className={`font-bold capitalize text-sm`} style={{ color: textColor }}>
                  {formatPaymentMethod(orderData.paymentMethodUsed)}
                </p>
              </div>
            </div>
            
            {isPagoMovil && orderData.paymentReference && (
              <div className={`mt-2 pt-2 border-t`} style={{ borderColor: borderColor }}>
                <span className={`text-[8px] font-bold uppercase tracking-wider ${textMutedClass}`}>Referencia</span>
                <p className={`text-xs font-semibold font-mono`} style={{ color: textColor }}>
                  {orderData.paymentReference}
                </p>
              </div>
            )}

            {/* 🔥 DETALLE DE PAGO EN EFECTIVO */}
            {(orderData.paymentMethodUsed?.toLowerCase().includes('cash') ||
              orderData.paymentMethodUsed?.toLowerCase().includes('efectivo')) &&
              (orderData.cashCurrency || (orderData.cashAmount && orderData.cashAmount > 0)) && (
                <div
                  className="mt-2 pt-2 border-t space-y-1"
                  style={{ borderColor: borderColor }}
                >
                  {orderData.cashCurrency && (
                    <div className="flex items-center justify-between text-xs">
                      <span className={textMutedClass}>Pagaste en</span>
                      <span className="font-bold" style={{ color: textColor }}>
                        {orderData.cashCurrency === 'VES' ? 'Bolívares (Bs.)' : 'Dólares (USD)'}
                      </span>
                    </div>
                  )}

                  {orderData.cashAmount !== undefined && orderData.cashAmount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className={textMutedClass}>Entregaste</span>
                      <span className="font-bold" style={{ color: textColor }}>
                        {orderData.cashCurrency === 'USD'
                          ? `$${Number(orderData.cashAmount).toFixed(2)}`
                          : `Bs. ${formatPrice(Number(orderData.cashAmount))}`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className={textMutedClass}>Total</span>
                    <span className="font-bold" style={{ color: textColor }}>
                      Bs. {formatPrice(totalVes)}
                    </span>
                  </div>

                  {/* Vuelto o falta por pagar */}
                  {(() => {
                    if (!orderData.cashAmount || orderData.cashAmount <= 0) return null;
                    if (!exchangeRate || exchangeRate <= 0) return null;

                    const paidInVes =
                      orderData.cashCurrency === 'USD'
                        ? Number(orderData.cashAmount) * exchangeRate
                        : Number(orderData.cashAmount);

                    const diff = paidInVes - totalVes;

                    if (diff > 0.01) {
                      return (
                        <div
                          className="flex items-center justify-between text-xs pt-1 border-t"
                          style={{ borderColor: borderColor }}
                        >
                          <span
                            className="font-bold"
                            style={{
                              color: isSecondaryLight ? '#15803d' : '#4ade80',
                            }}
                          >
                            Vuelto estimado
                          </span>
                          <span
                            className="font-black"
                            style={{
                              color: isSecondaryLight ? '#15803d' : '#4ade80',
                            }}
                          >
                            Bs. {formatPrice(diff)}
                          </span>
                        </div>
                      );
                    }

                    if (diff < -0.01) {
                      return (
                        <div
                          className="flex items-center justify-between text-xs pt-1 border-t"
                          style={{ borderColor: borderColor }}
                        >
                          <span
                            className="font-bold"
                            style={{
                              color: isSecondaryLight ? '#b45309' : '#fbbf24',
                            }}
                          >
                            Falta por pagar
                          </span>
                          <span
                            className="font-black"
                            style={{
                              color: isSecondaryLight ? '#b45309' : '#fbbf24',
                            }}
                          >
                            Bs. {formatPrice(Math.abs(diff))}
                          </span>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              )}
          </div>

          {/* 🔥 TOTAL - SIN IVA (EXENTO) */}
          <div
            className="p-4 rounded-2xl border item-enter"
            style={{
              backgroundColor: `${primary}12`,
              borderColor: `${primary}30`,
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className={`font-black uppercase ${textMutedClass}`}>Total Pagado</span>
                <span className={`text-[9px] block`} style={{ color: '#22c55e' }}>✓ Exento de IVA</span>
              </div>
              <div className="text-right">
                {hasDiscount && (
                  <span className={`text-xs line-through opacity-50 block`} style={{ color: mutedColor }}>
                    Bs. {formatPrice(originalPriceVES)}
                  </span>
                )}
                <span className={`text-2xl font-black`} style={{ color: primary }}>
                  Bs. {formatPrice(totalVes)}
                </span>
                <span className={`text-[10px] block ${textMutedClass}`}>
                  (${totalUsd.toFixed(2)} USD)
                </span>
                {exchangeRate > 0 && (
                  <span className={`text-[8px] block opacity-50 ${textMutedClass}`}>
                    Tasa: 1 USD = Bs. {exchangeRate.toFixed(2)}
                  </span>
                )}
                {hasDiscount && discountAmountVES > 0 && (
                  <span className="text-[10px] font-bold block text-emerald-500 mt-0.5">
                    Ahorras Bs. {formatPrice(discountAmountVES)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className={`px-8 py-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 transition-all duration-700 shrink-0 ${
            showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{
            borderColor: borderColor,
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
          }}
        >
          <div className="flex items-center gap-2 text-xs">
            <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: primary }} />
            <span className={`opacity-50 ${textMutedClass}`}>¡Gracias por tu reserva!</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handlePrintReceipt}
                            className="px-5 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 border cursor-pointer hover:opacity-80 active:scale-95"
              style={{
                borderColor: borderColor,
                color: textColor,
                backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
              }}
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimir</span>
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-8 py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-xl hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: primary,
                color: '#ffffff',
                boxShadow: `0 10px 25px -5px ${primary}50`,
              }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}