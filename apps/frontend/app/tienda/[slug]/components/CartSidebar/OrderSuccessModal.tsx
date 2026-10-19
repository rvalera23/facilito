'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  CheckCircle2, X, Package, Calendar, Smartphone, CreditCard, 
  Banknote, Sparkles, Printer, Phone, 
  Star, User, BadgeCheck, MapPin,
  Mail, Lock, Image as ImageIcon,
  ExternalLink, Briefcase, CalendarDays, Receipt, Truck
} from 'lucide-react';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { generateReceiptHTML, type ReceiptItem, type ReceiptIvaBreakdown } from '@/app/utils/generateReceiptHTML';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { getBankName } from '@/lib/venezuelanBanks';
interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    totalAmount: number;
    totalAmountVes?: number;
    paymentMethodUsed?: string;
    paymentReference?: string;
    paymentProof?: string;
    bankSource?: string;
    clientIdNumber?: string;
    clientIdType?: string;
    clientPhone?: string;
    items: Array<{ 
      name: string; 
      quantity: number; 
      price?: number; 
      priceVes?: number;
      priceUsd?: number;
      image?: string;
      type?: 'product' | 'service';
      durationMinutes?: number;
      ivaType?: string;
      ivaRate?: number;
      prices?: any;
      discountInfo?: {
        discountPercentage: number;
        originalVES: number;
        originalUSD: number;
        discountedVES: number;
        discountedUSD: number;
      };
    }>;
    createdAt?: string;
    type?: 'product' | 'service';
    appointmentDate?: string;
    appointmentTime?: string;
    selectedDelivery?: string;
    /** Moneda del pago en efectivo (si aplica). */
    cashCurrency?: 'VES' | 'USD';
    /** Monto entregado por el cliente en efectivo (si aplica). */
    cashAmount?: number;
    /** 🔥 Monto aplicado como saldo a favor (si aplica). */
    creditAppliedVes?: number;
    /** 🔥 Monto aplicado como saldo a favor en USD. */
    creditAppliedUsd?: number;
    /** 🔥 VUELTO: detalle completo (resolución + preferencia + monto). */
    change?: {
      amountVes: number;
      amountUsd: number;
      currency: 'VES' | 'USD';
      resolution: 'pending' | 'delivered' | 'credit' | 'rounded' | 'cancelled';
      resolutionNotes?: string;
      creditCreated?: boolean;
      deliveryPreference?: {
        method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
        pagoMovilData?: {
          bank: string;
          phone: string;
          clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
          clientIdNumber: string;
        };
        notes?: string;
      };
      deliveryMethod?: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
      deliveryPagoMovilData?: {
        bank: string;
        phone: string;
        clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
        clientIdNumber: string;
        reference?: string;
      };
    } | null;
    delivery?: {
      company: string;
      companyName: string;
      cost: number;
      costUsd?: number;
      costVes?: number;
      exchangeRate?: number;
      estimatedDays: string;
      address?: string;
      selected?: boolean;
    };
    /** 🔥 FULFILLMENT (estándar UCP) */
    fulfillment?: 'delivery' | 'pickup' | 'shipping';
    localDelivery?: {
      fee: number | null;
      distanceKm: number | null;
      etaMinutes: number | null;
    } | null;
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

// ============================================================
// 🔥 LEER PRICING DE LOS ITEMS (backend = fuente de verdad)
// ============================================================
// Cada item ya trae `_pricing` del backend. Solo leemos.
// Cero cálculos. Cero IVA local. Cero conversiones.
// ============================================================
const calculateIvaInfo = (items: any[], exchangeRate: number) => {
  if (!items || items.length === 0) {
    return {
      totalBaseVes: 0,
      totalIVA: 0,
      totalWithIVAVes: 0,
      displayType: 'Sin IVA',
      badgeBg: 'rgba(100,116,139,0.15)',
      badgeColor: '#64748b',
      totalIvaType: 'exempt',
      totalIvaRate: 0,
      isExempt: true,
      isMixed: false,
      hasIvaProducts: false,
      hasExemptProducts: true,
    };
  }

  let totalBaseVes = 0;
  let totalIVA = 0;
  let totalWithIVAVes = 0;
  let hasIncluded = false;
  let hasExcluded = false;
  let hasExempt = false;
  let maxRate = 0;

  items.forEach((item: any) => {
    const quantity = Number(item?.quantity || 1);
    const p = item?._pricing || {};

    const pBaseVES  = Number(p.basePriceVES || 0);
    const pTaxVES   = Number(p.taxAmountVES || 0);
    const pTotalVES = Number(p.totalPriceVES || 0);
    const pIvaType  = p.ivaType || 'excluded';
    const pIvaRate  = Number(p.ivaRate || 0);

    totalBaseVes    += pBaseVES  * quantity;
    totalIVA        += pTaxVES   * quantity;
    totalWithIVAVes += pTotalVES * quantity;

    if (pIvaType === 'included') hasIncluded = true;
    else if (pIvaType === 'excluded') hasExcluded = true;
    else hasExempt = true;

    if (pIvaType !== 'exempt' && pIvaRate > maxRate) {
      maxRate = pIvaRate;
    }
  });

  let displayType = '';
  let badgeBg = '';
  let badgeColor = '';
  let isExempt = false;
  let isMixed = false;
  let finalIvaType: 'included' | 'excluded' | 'exempt' = 'exempt';

  if (hasIncluded && hasExcluded) {
    displayType = `IVA Mixto (${maxRate}%)`;
    badgeBg = 'rgba(139,92,246,0.15)';
    badgeColor = '#8b5cf6';
    finalIvaType = 'included';
    isMixed = true;
  } else if (hasIncluded) {
    displayType = `IVA ${maxRate}% Incluido`;
    badgeBg = 'rgba(34,197,94,0.15)';
    badgeColor = '#22c55e';
    finalIvaType = 'included';
  } else if (hasExcluded && totalIVA > 0) {
    displayType = `IVA ${maxRate}% No Incluido`;
    badgeBg = 'rgba(251,191,36,0.15)';
    badgeColor = '#f59e0b';
    finalIvaType = 'excluded';
  } else if (hasExempt && !hasIncluded && !hasExcluded) {
    displayType = 'Exento de IVA';
    badgeBg = 'rgba(100,116,139,0.15)';
    badgeColor = '#64748b';
    finalIvaType = 'exempt';
    isExempt = true;
  } else {
    displayType = 'Sin IVA';
    badgeBg = 'rgba(100,116,139,0.15)';
    badgeColor = '#64748b';
    finalIvaType = 'exempt';
    isExempt = true;
  }

  return {
    totalBaseVes: Math.round(totalBaseVes * 100) / 100,
    totalIVA: Math.round(totalIVA * 100) / 100,
    totalWithIVAVes: Math.round(totalWithIVAVes * 100) / 100,
    displayType,
    badgeBg,
    badgeColor,
    totalIvaType: finalIvaType,
    totalIvaRate: maxRate,
    isExempt,
    isMixed,
    hasIvaProducts: hasIncluded || hasExcluded,
    hasExemptProducts: hasExempt,
    hasDiscount: items.some((i: any) => i?._pricing?.hasDiscount),
  };
};
// ============================================================
// 🔥 LEER PRICING DE UN ITEM (backend = fuente de verdad)
// ============================================================
const getItemIvaInfo = (item: any, exchangeRate: number) => {
  const p = item?._pricing || {};
  const quantity = Number(item?.quantity || 1);
  const ivaType = p.ivaType || 'excluded';
  const ivaRate = Number(p.ivaRate || 0);

  const basePriceVES = Number(p.basePriceVES || 0);
  const taxAmountVES = Number(p.taxAmountVES || 0);
  const totalPriceVES = Number(p.totalPriceVES || 0);
  const totalPriceUSD = Number(p.totalPriceUSD || 0);

  return {
    ivaType,
    ivaRate,
    ivaAmount: Math.round(taxAmountVES * 100) / 100,
    basePrice: Math.round(basePriceVES * 100) / 100,
    priceWithIVA: Math.round(totalPriceVES * 100) / 100,
    priceUsd: Math.round(totalPriceUSD * 100) / 100,
    totalIVA: Math.round(taxAmountVES * quantity * 100) / 100,
    totalWithIVA: Math.round(totalPriceVES * quantity * 100) / 100,
    display: ivaType === 'included' ? `IVA Inc. (${ivaRate}%)` :
             ivaType === 'exempt'   ? 'Exento' : `IVA + (${ivaRate}%)`,
    badgeColor: ivaType === 'included' ? '#22c55e' :
                ivaType === 'exempt'   ? '#64748b' : '#f59e0b',
    badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
             ivaType === 'exempt'   ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
  };
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

const getItemImage = (item: any): string | null => {
  if (!item) return null;
  
  const possibleImages = [
    item.image,
    item.coverImage,
    item.photo,
    item.images?.[0],
    item.mediaUrls?.[0],
    item.fileUrls?.[0],
  ];
  
  for (const img of possibleImages) {
    if (img && typeof img === 'string' && img.trim() !== '') {
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      if (img.startsWith('/')) {
        return `${apiBase}${img}`;
      }
      if (img.includes('uploads/')) {
        const clean = img.replace(/^\/+/, '');
        return `${apiBase}/${clean}`;
      }
      return `${apiBase}/uploads/${img}`;
    }
  }
  
  return null;
};

export default function OrderSuccessModal({
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
}: OrderSuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; rotation: number; speed: number; shape: 'circle' | 'square' | 'triangle' }>>([]);


  // 🔥 Imprimir comprobante
  const handlePrintReceipt = () => {
    try {
      // 🔥 Prefijo del negocio (2 letras)
      const tenantNameForPrefix = (orderData.customerName ? '' : '') + '';
      // El nombre del negocio viene desde el componente padre.
      // Como no lo tenemos directo acá, usamos un fallback.
      // En producción se puede pasar como prop.
      // 🔥 Usar el receiptNumber de la DB si existe, sino generar uno temporal
      const receiptNumber = (orderData as any).receiptNumber || (() => {
        const prefix = 'FC';
        const year = new Date().getFullYear();
        const orderIdShort = String(orderData.id).slice(-5).toUpperCase();
        return `${prefix}-${year}-${orderIdShort}`;
      })();

      // 🔥 Items transformados al formato del receipt
      const receiptItems: ReceiptItem[] = (orderData.items || []).map((item: any) => {
        const itemIvaInfo = getItemIvaInfo(item, exchangeRate);
        const itemTotalVes = itemIvaInfo.totalWithIVA;
        const unitPrice = quantitySafe(item) > 0 ? itemTotalVes / quantitySafe(item) : itemTotalVes;

        return {
          name: item.name || 'Item',
          quantity: quantitySafe(item),
          unitPriceVes: unitPrice,
          totalVes: itemTotalVes,
          ivaType: itemIvaInfo.ivaType as 'included' | 'excluded' | 'exempt',
          ivaRate: itemIvaInfo.ivaRate,
          ivaAmount: itemIvaInfo.totalIVA,
        };
      });

      // 🔥 Desglose de IVA
      const ivaBreakdown: ReceiptIvaBreakdown[] = [];
      if (ivaInfo.totalIVA > 0 && ivaInfo.totalIvaRate > 0) {
        ivaBreakdown.push({
          rate: ivaInfo.totalIvaRate,
          base: ivaInfo.totalBaseVes,
          amount: ivaInfo.totalIVA,
        });
      }

      // 🔥 Generar HTML
      const html = generateReceiptHTML({
        receiptNumber,
        issuedAt: new Date(),
        tenantName: tenant?.name || 'Mi Negocio',
        tenantRif: tenant?.rif || tenant?.taxId || null,
        tenantAddress: tenant?.address || null,
        tenantPhone: tenant?.phone || null,
        tenantEmail: tenant?.email || null,

        customerName: orderData.customerName || 'Consumidor final',
        customerIdType: orderData.clientIdType || null,
        customerIdNumber: orderData.clientIdNumber || null,
        customerPhone: orderData.customerPhone || null,
        customerEmail: orderData.customerEmail || null,
        customerAddress: orderData.customerAddress || null,

        items: receiptItems,

        subtotalBaseVes: ivaInfo.totalBaseVes,
        ivaBreakdown,
        totalExemptVes: ivaInfo.isExempt ? ivaInfo.totalBaseVes : 0,
        totalIvaVes: ivaInfo.totalIVA,
        totalVes: totalWithIVAVes,
        totalUsd: totalUsd,
        exchangeRate: exchangeRate,

        deliveryCostVes: deliveryCostVes > 0 ? deliveryCostVes : undefined,
        deliveryCompany: deliveryCompanyName || null,

        paymentMethod: orderData.paymentMethodUsed || null,
        paymentReference: orderData.paymentReference || null,
        bankSource: orderData.bankSource || null,
      });

      // 🔥 Abrir ventana nueva e inyectar el HTML
      const win = window.open('', '_blank', 'width=900,height=1200');
      if (!win) {
        alert('No se pudo abrir la ventana. Verificá que no esté bloqueado el popup.');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (error) {
      console.error('❌ [OrderSuccessModal] Error al generar el comprobante:', error);
      alert('No se pudo generar el comprobante. Intentá de nuevo.');
    }
  };

  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
  const { rates, loading: ratesLoading } = useExchangeRateContext();
  
  // 🔥 TASA DE CAMBIO DINÁMICA - PRIORIDAD: prop > contexto > 0
  const exchangeRate = propExchangeRate && propExchangeRate > 0 
    ? propExchangeRate 
    : (rates.USD > 0 ? rates.USD : 0);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setShowButtons(false);
      
      setTimeout(() => playSuccessSound(), 200);
      
      const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#eab308', '#06b6d4', '#a855f7', '#34d399'];
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

  const modalBg = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');
  const itemBg = isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedColor = isSecondaryLight ? '#64748b' : '#94a3b8';

  const isService = orderData.type === 'service' || 
                    (orderData.items && orderData.items.some((item: any) => item.type === 'service'));

  const totalItems = orderData.items?.length || 0;

  // CALCULAR IVA DEL CARRITO CON TASA DINÁMICA
  const ivaInfo = calculateIvaInfo(orderData.items || [], exchangeRate);

  // VERIFICAR SI HAY DESCUENTO
  const hasDiscount = orderData.items?.some((item: any) => item.discountInfo) || false;

  // VERIFICAR SI HAY ENVÍO
  const hasLocalDelivery = orderData.fulfillment === 'delivery' && !!orderData.localDelivery;
  const hasShippingDelivery = orderData.fulfillment === 'shipping'
    && !!(orderData.delivery || orderData.selectedDelivery);
  const hasPickup = !hasLocalDelivery && !hasShippingDelivery;
  const hasDelivery = hasLocalDelivery || hasShippingDelivery;
  const deliveryInfo = orderData.delivery || null;
  const localDeliveryInfo = orderData.localDelivery || null;
  const deliveryCompanyName = hasLocalDelivery
    ? 'Delivery local'
    : (deliveryInfo?.companyName || orderData.selectedDelivery || 'Mensajería');

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
    if (isService) {
      return 'Tu cita ha sido reservada exitosamente. Te esperamos.';
    }
    const method = orderData.paymentMethodUsed?.toLowerCase() || '';
    if (method.includes('pago') || method.includes('movil')) {
      return 'Tu PagoMóvil ha sido reportado exitosamente. La tienda verificará tu pago.';
    }
    return 'Tu orden ha sido registrada exitosamente.';
  };

  // ============================================================
  // 🔥 TOTALES DE LA ORDEN (backend = fuente de verdad)
  // ============================================================
  // Los items ya traen `_pricing` del backend.
  // El total ya viene en `orderData.totalAmountVes`.
  // No recalculamos nada.
  // ============================================================
  const totalWithIVAVes = Number(orderData.totalAmountVes || ivaInfo.totalWithIVAVes || 0);
  const deliveryCostVes = !isService && Number(deliveryInfo?.exchangeRate) > 0
    ? Number(deliveryInfo?.costVes || 0)
    : 0;
  const totalOrderVes = totalWithIVAVes;
  const totalUsd = Number(orderData.totalAmount || 0);
  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.8)',
      }}
    >
      {/* CONFETI - ÚNICO EFECTO */}
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
        .item-enter:nth-child(6) { animation-delay: 0.3s; }
        .item-enter:nth-child(7) { animation-delay: 0.35s; }
        .item-enter:nth-child(8) { animation-delay: 0.4s; }
        .bounce-enter { animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .shimmer-text {
          background: linear-gradient(90deg, ${primary}, ${primary}80, ${primary});
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* MODAL */}
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
                {isService ? (
                  <CalendarDays className="w-8 h-8" style={{ color: primary }} strokeWidth={2.5} />
                ) : (
                  <BadgeCheck className="w-8 h-8" style={{ color: primary }} strokeWidth={2.5} />
                )}
              </div>
              <div className="min-w-0">
                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 flex-wrap`} style={{ color: textColor }}>
                  <span className="shimmer-text truncate">{isService ? '¡Cita Confirmada!' : '¡Pedido Completado!'}</span>
                  <Sparkles className="w-6 h-6 text-yellow-400 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
                </h2>
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
                  {isService ? 'Reserva Confirmada' : 'Pago Confirmado'}
                </span>
              </div>
              <h3 className={`text-2xl sm:text-3xl font-black tracking-tight`} style={{ color: primary }}>
                #{String(orderData.id).slice(-8).toUpperCase()}
              </h3>
              <p className={`text-xs ${textMutedClass} mt-1 flex items-center justify-center gap-1`}>
                <span>Guarda este número para cualquier consulta</span>
              </p>
            </div>
          </div>

          {/* DETALLES DE LA ORDEN */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cliente</span>
              <p className={`font-bold text-sm truncate flex items-center gap-1`} style={{ color: textColor }}>
                <User className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{orderData.customerName || 'Cliente'}</span>
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>
                {isService ? 'Servicios' : 'Productos'}
              </span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                {isService ? (
                  <Briefcase className="w-3.5 h-3.5 opacity-60 shrink-0" />
                ) : (
                  <Package className="w-3.5 h-3.5 opacity-60 shrink-0" />
                )}
                {totalItems} {isService ? 'servicio' : totalItems === 1 ? 'producto' : 'productos'}
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Fecha</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{orderData.createdAt ? new Date(orderData.createdAt).toLocaleDateString('es-VE') : 'Fecha reciente'}</span>
              </p>
            </div>
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Teléfono</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Phone className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{orderData.customerPhone ? formatPhoneDisplay(orderData.customerPhone) : 'No especificado'}</span>
              </p>
            </div>
          </div>

          {/* CORREO */}
          {orderData.customerEmail && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-60 shrink-0" />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Correo</span>
                <Lock className="w-3 h-3 shrink-0" style={{ color: mutedColor }} />
              </div>
              <p className={`text-sm font-semibold`} style={{ color: textColor }}>
                {orderData.customerEmail}
              </p>
            </div>
          )}

          {/* SECCIÓN DE ENVÍO — siempre visible, con 3 casos */}
          {(
            <div
              className={`p-3.5 rounded-xl border item-enter`}
              style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 shrink-0" style={{ color: primary }} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>
                  {hasLocalDelivery
                    ? 'Delivery Local'
                    : hasShippingDelivery
                    ? 'Envío por Encomienda'
                    : 'Retiro en Tienda'}
                </span>
              </div>

              {/* CASO 1: RETIRO EN TIENDA */}
              {hasPickup && (
                <div className="space-y-1.5">
                  <p className={`text-sm font-semibold`} style={{ color: textColor }}>
                    Retirás tu pedido en el local.
                  </p>
                  <p className={`text-[10px]`} style={{ color: mutedColor }}>
                    La tienda te avisará cuando esté listo para retirar.
                  </p>
                </div>
              )}

              {/* CASO 2: DELIVERY LOCAL */}
              {hasLocalDelivery && localDeliveryInfo && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {localDeliveryInfo.distanceKm != null && (
                      <span className="font-semibold" style={{ color: textColor }}>
                        {localDeliveryInfo.distanceKm.toFixed(2)} km
                      </span>
                    )}
                    {localDeliveryInfo.fee != null && localDeliveryInfo.fee > 0 && (
                      <>
                        <span className={`text-[10px] ${textMutedClass}`}>·</span>
                        <span className="font-bold" style={{ color: primary }}>
                          ${Number(localDeliveryInfo.fee).toFixed(2)}
                        </span>
                      </>
                    )}
                    {localDeliveryInfo.fee === 0 && (
                      <>
                        <span className={`text-[10px] ${textMutedClass}`}>·</span>
                        <span className="font-bold" style={{ color: primary }}>
                          Gratis
                        </span>
                      </>
                    )}
                    {localDeliveryInfo.etaMinutes != null && (
                      <>
                        <span className={`text-[10px] ${textMutedClass}`}>·</span>
                        <span className={`text-[11px]`} style={{ color: mutedColor }}>
                          {localDeliveryInfo.etaMinutes} min
                        </span>
                      </>
                    )}
                  </div>

                  {orderData.customerAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" style={{ color: mutedColor }} />
                      <p className={`text-sm font-semibold break-words whitespace-normal`} style={{ color: textColor }}>
                        {orderData.customerAddress}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CASO 3: ENCOMIENDA */}
              {hasShippingDelivery && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold`} style={{ color: textColor }}>
                      {deliveryCompanyName}
                    </span>
                    {deliveryInfo?.estimatedDays && (
                      <span className={`text-[10px] ${textMutedClass}`}>
                        ({deliveryInfo.estimatedDays})
                      </span>
                    )}
                  </div>

                  {orderData.customerAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" style={{ color: mutedColor }} />
                      <p className={`text-sm font-semibold break-words whitespace-normal`} style={{ color: textColor }}>
                        {orderData.customerAddress}
                      </p>
                    </div>
                  )}

                  {deliveryInfo?.costUsd === null ? (
                    <div className={`text-[10px] font-bold inline-block px-2 py-0.5 rounded`}
                         style={{
                           backgroundColor: 'rgba(251,191,36,0.15)',
                           color: '#f59e0b',
                           border: '1px solid rgba(251,191,36,0.3)',
                         }}>
                      Cobro a destino
                    </div>
                  ) : (deliveryInfo?.costVes !== undefined && deliveryInfo.costVes > 0) && (
                    <div className={`text-[10px] font-medium ${textMutedClass}`}>
                      Costo de envío:{' '}
                      <span style={{ color: primary }}>Bs. {formatPrice(deliveryInfo.costVes)}</span>
                      <span className={`ml-1 font-semibold`} style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
                        (${Number(deliveryInfo.costUsd || 0).toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FECHA/HORA DE CITA */}
          {isService && (orderData.appointmentDate || orderData.appointmentTime) && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 opacity-60 shrink-0" />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cita Programada</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {orderData.appointmentDate && (
                  <span className={`text-sm font-semibold`} style={{ color: textColor }}>
                    {formatDateReadable(orderData.appointmentDate)}
                  </span>
                )}
                {orderData.appointmentTime && (
                  <span className={`text-xs ${textMutedClass}`}>
                    Hora: {orderData.appointmentTime}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MÉTODO DE PAGO */}
          <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
            <div className="flex items-center gap-3 mb-2">
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

            {/* 🔥 DETALLE DE PAGO EN EFECTIVO */}
            {(orderData.paymentMethodUsed?.toLowerCase().includes('cash') ||
              orderData.paymentMethodUsed?.toLowerCase().includes('efectivo')) &&
              (orderData.cashCurrency || (orderData.cashAmount && orderData.cashAmount > 0)) && (
                <div
                  className={`mt-2 pt-2 border-t space-y-1`}
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
                      Bs. {formatPrice(totalOrderVes)}
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

                    const diff = paidInVes - totalOrderVes;

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

            {isPagoMovil && (
              <div className={`mt-2 pt-2 border-t grid grid-cols-2 gap-2`} style={{ borderColor: borderColor }}>
                {orderData.clientIdType && orderData.clientIdNumber && (
                  <div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cédula</span>
                    <p className={`text-xs font-semibold`} style={{ color: textColor }}>
                      {orderData.clientIdType}-{orderData.clientIdNumber}
                    </p>
                  </div>
                )}
                {orderData.clientPhone && (
                  <div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${textMutedClass}`}>Teléfono</span>
                    <p className={`text-xs font-semibold`} style={{ color: textColor }}>
                      {formatPhoneDisplay(orderData.clientPhone)}
                    </p>
                  </div>
                )}
                {orderData.bankSource && (
                  <div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${textMutedClass}`}>Banco</span>
                    <p className={`text-xs font-semibold`} style={{ color: textColor }}>
                      {orderData.bankSource}
                    </p>
                  </div>
                )}
                {orderData.paymentReference && (
                  <div className="col-span-2">
                    <span className={`text-[8px] font-bold uppercase tracking-wider ${textMutedClass}`}>Referencia</span>
                    <p className={`text-xs font-semibold font-mono`} style={{ color: textColor }}>
                      {orderData.paymentReference}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🔥 BLOQUE DE VUELTO (si aplica) */}
          {orderData.change && Number(orderData.change.amountVes) > 0 && (
            <div
              className="p-4 rounded-2xl border item-enter space-y-2"
              style={{
                backgroundColor:
                  orderData.change.resolution === 'credit'
                    ? 'rgba(34,197,94,0.08)'
                    : orderData.change.resolution === 'pending'
                    ? 'rgba(251,191,36,0.08)'
                    : `${primary}10`,
                borderColor:
                  orderData.change.resolution === 'credit'
                    ? 'rgba(34,197,94,0.3)'
                    : orderData.change.resolution === 'pending'
                    ? 'rgba(251,191,36,0.3)'
                    : `${primary}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles
                  className="w-4 h-4 shrink-0"
                  style={{
                    color:
                      orderData.change.resolution === 'credit'
                        ? '#22c55e'
                        : orderData.change.resolution === 'pending'
                        ? '#f59e0b'
                        : primary,
                  }}
                />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>
                  Vuelto
                </span>
              </div>

              {/* CASO A: SALDO A FAVOR */}
              {orderData.change.resolution === 'credit' && (
                <div className="space-y-1">
                  <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
                    Bs. {formatPrice(Number(orderData.change.amountVes))} acreditados a tu cuenta
                  </p>
                  <p className={`text-[11px] ${textMutedClass}`}>
                    El saldo a favor ya está disponible para tu próxima compra en esta tienda.
                  </p>
                  <p className={`text-[10px] ${textMutedClass}`}>
                    También podés verlo en{' '}
                    <span className="font-bold" style={{ color: primary }}>
                      Mi Cuenta → Saldo a favor
                    </span>
                    .
                  </p>
                </div>
              )}

              {/* CASO B: PENDIENTE + PAGO MÓVIL */}
              {orderData.change.resolution === 'pending' &&
                orderData.change.deliveryPreference?.method === 'pago_movil' && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                      Recibirás Bs. {formatPrice(Number(orderData.change.amountVes))} por Pago Móvil
                    </p>
                    <div className={`text-[11px] space-y-0.5 ${textMutedClass}`}>
                      {orderData.change.deliveryPreference.pagoMovilData?.bank && (
                        <div>
                          <b>Banco:</b>{' '}
                          {getBankName(orderData.change.deliveryPreference.pagoMovilData.bank)}
                        </div>
                      )}
                      {orderData.change.deliveryPreference.pagoMovilData?.phone && (
                        <div>
                          <b>Teléfono:</b>{' '}
                          {orderData.change.deliveryPreference.pagoMovilData.phone}
                        </div>
                      )}
                      {orderData.change.deliveryPreference.pagoMovilData?.clientIdNumber && (
                        <div>
                          <b>Cédula:</b>{' '}
                          {orderData.change.deliveryPreference.pagoMovilData.clientIdType || 'V'}-
                          {orderData.change.deliveryPreference.pagoMovilData.clientIdNumber}
                        </div>
                      )}
                    </div>
                    <p className={`text-[10px] italic ${textMutedClass}`}>
                      La tienda procesará el vuelto al confirmar tu pedido.
                    </p>
                  </div>
                )}

              {/* CASO C: PENDIENTE + EFECTIVO Bs. */}
              {orderData.change.resolution === 'pending' &&
                (orderData.change.deliveryPreference?.method === 'cash_ves' ||
                 !orderData.change.deliveryPreference) && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                      Recibirás Bs. {formatPrice(Number(orderData.change.amountVes))} en efectivo
                    </p>
                    <p className={`text-[11px] ${textMutedClass}`}>
                      La tienda te lo entregará al confirmar o recibir tu pedido.
                    </p>
                  </div>
                )}

              {/* CASO D: PENDIENTE + EFECTIVO USD */}
              {orderData.change.resolution === 'pending' &&
                orderData.change.deliveryPreference?.method === 'cash_usd' && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                      Recibirás ${Number(orderData.change.amountUsd || 0).toFixed(2)} en efectivo USD
                    </p>
                    <p className={`text-[11px] ${textMutedClass}`}>
                      (Equivalente a Bs. {formatPrice(Number(orderData.change.amountVes))})
                    </p>
                    <p className={`text-[10px] ${textMutedClass}`}>
                      La tienda te lo entregará al confirmar tu pedido.
                    </p>
                  </div>
                )}

              {/* CASO E: PENDIENTE + OTHER */}
              {orderData.change.resolution === 'pending' &&
                orderData.change.deliveryPreference?.method === 'other' && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                      Recibirás Bs. {formatPrice(Number(orderData.change.amountVes))} por otro método
                    </p>
                    {orderData.change.deliveryPreference.notes && (
                      <p className={`text-[11px] italic ${textMutedClass}`}>
                        &quot;{orderData.change.deliveryPreference.notes}&quot;
                      </p>
                    )}
                    <p className={`text-[10px] ${textMutedClass}`}>
                      Coordiná con la tienda al recibir tu pedido.
                    </p>
                  </div>
                )}

              {/* CASO F: REDONDEO */}
              {orderData.change.resolution === 'rounded' && (
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${textMutedClass}`}>
                    Aceptaste el redondeo
                  </p>
                  <p className={`text-[11px] ${textMutedClass}`}>
                    El vuelto de Bs. {formatPrice(Number(orderData.change.amountVes))} quedó a favor
                    de la tienda.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LISTA DE PRODUCTOS CON IVA Y DESCUENTO */}
          {orderData.items && orderData.items.length > 0 && (
            <div className={`p-4 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <div className="flex items-center gap-2 mb-3">
                {isService ? (
                  <Briefcase className="w-4 h-4 opacity-60 shrink-0" />
                ) : (
                  <Package className="w-4 h-4 opacity-60 shrink-0" />
                )}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>
                  {isService ? 'Servicio' : 'Productos'}
                </span>
                <span className={`text-[9px] font-medium ${textMutedClass}`}>({totalItems} {isService ? 'servicio' : 'items'})</span>
                {hasDiscount && (
                  <span 
                    className="ml-auto px-2 py-0.5 rounded text-[8px] font-bold animate-pulse"
                    style={{
                      backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
                      color: isSecondaryLight ? '#991b1b' : '#f87171',
                    }}
                  >
                    ¡Oferta aplicada!
                  </span>
                )}
                <span 
                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full`}
                  style={{
                    backgroundColor: ivaInfo.badgeBg,
                    color: ivaInfo.badgeColor
                  }}
                >
                  {ivaInfo.displayType}
                </span>
              </div>
              
              <div className="space-y-3">
                {orderData.items.map((item, idx) => {
                  const quantity = item.quantity || 1;
                  const itemIvaInfo = getItemIvaInfo(item, exchangeRate);
                  const itemImage = getItemImage(item);
                  const isItemService = item.type === 'service';
                  const hasItemDiscount = !!item.discountInfo;
                  
                  const itemTotalVes = itemIvaInfo.totalWithIVA;
                  const itemTotalUsd = exchangeRate > 0 ? itemTotalVes / exchangeRate : 0;
                  
                  // 🔥 Calcular precio original con descuento
                  let originalPrice = 0;
                  if (hasItemDiscount) {
                    originalPrice = item.discountInfo.originalVES * quantity;
                  }
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 py-2 ${idx !== orderData.items.length - 1 ? 'border-b' : ''}`} 
                      style={{ borderColor: borderColor }}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center" style={{ borderColor: borderColor }}>
                        {itemImage ? (
                          <Image
                            src={itemImage}
                            alt={item.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            quality={70}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          isItemService ? (
                            <CalendarDays className="w-5 h-5 opacity-30" style={{ color: mutedColor }} />
                          ) : (
                            <ImageIcon className="w-5 h-5 opacity-30" style={{ color: mutedColor }} />
                          )
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm truncate`} style={{ color: textColor }}>
                            {item.name}
                          </span>
                          {hasItemDiscount && (
                            <span 
                              className="px-1.5 py-0.5 rounded text-[7px] font-bold"
                              style={{
                                backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
                                color: isSecondaryLight ? '#991b1b' : '#f87171',
                              }}
                            >
                              -{item.discountInfo.discountPercentage}%
                            </span>
                          )}
                          {itemIvaInfo.ivaType !== 'exempt' && (
                            <span 
                              className={`text-[7px] font-bold px-1 py-0.5 rounded-full shrink-0`}
                              style={{
                                backgroundColor: itemIvaInfo.badgeBg,
                                color: itemIvaInfo.badgeColor
                              }}
                            >
                              {itemIvaInfo.ivaType === 'included' ? 'IVA Inc.' : 'IVA +'}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] ${textMutedClass}`}>
                          {isItemService ? 'Servicio' : `Cant: ${quantity}`}
                        </span>
                        {isItemService && item.durationMinutes && (
                          <span className={`text-[9px] ${textMutedClass} block`}>
                            ⏱ {item.durationMinutes} min
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {hasItemDiscount && (
                          <span className={`text-[9px] line-through opacity-50 block`} style={{ color: mutedColor }}>
                            Bs. {formatPrice(originalPrice)}
                          </span>
                        )}
                        <span className={`font-bold text-sm block`} style={{ color: primary }}>
                          Bs. {formatPrice(itemTotalVes)}
                        </span>
                        {itemTotalUsd > 0 && (
                          <span
                            className="text-[9px] font-bold"
                            style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}
                          >
                            ${itemTotalUsd.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DESGLOSE DE IVA */}
          <div
            className={`p-4 rounded-2xl border item-enter space-y-2`}
            style={{
              backgroundColor: `${primary}12`,
              borderColor: `${primary}30`,
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className={`${textMutedClass}`}>Subtotal (sin IVA):</span>
              <span className={`font-bold`} style={{ color: textColor }}>
                Bs. {formatPrice(ivaInfo.totalBaseVes)}
              </span>
            </div>
            
            {ivaInfo.totalIVA > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className={`${textMutedClass}`}>
                  IVA {ivaInfo.totalIvaRate > 0 ? `(${ivaInfo.totalIvaRate}%)` : ''}:
                </span>
                <span className={`font-bold`} style={{ color: textColor }}>
                  Bs. {formatPrice(ivaInfo.totalIVA)}
                </span>
              </div>
            )}

            {hasDiscount && (
              <div className="flex items-center justify-between text-sm">
                <span className={`text-emerald-500`}>Descuento aplicado:</span>
                <span className={`font-bold`} style={{ color: '#22c55e' }}>
                  -Bs. {formatPrice((ivaInfo.totalBaseVes + ivaInfo.totalIVA) - (Number(orderData.totalAmountVes || 0) - deliveryCostVes))}
                </span>
              </div>
            )}

            {/* 🔥 SALDO A FAVOR APLICADO */}
            {Number(orderData.creditAppliedVes || 0) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Saldo a favor aplicado:
                </span>
                <span className={`font-bold`} style={{ color: '#22c55e' }}>
                  -Bs. {formatPrice(Number(orderData.creditAppliedVes))}
                  {Number(orderData.creditAppliedUsd || 0) > 0 && (
                    <span className="ml-1 text-[10px] font-semibold">
                      (-${Number(orderData.creditAppliedUsd).toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
            )}

            {deliveryInfo?.costUsd === null ? (
              <div className="flex items-center justify-between text-sm">
                <span className={`${textMutedClass}`}>
                  Envío ({deliveryCompanyName}):
                </span>
                <span
                  className="font-bold text-[10px] px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgba(251,191,36,0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(251,191,36,0.3)',
                  }}
                >
                  Cobro a destino
                </span>
              </div>
            ) : (deliveryInfo?.costVes !== undefined && deliveryInfo.costVes > 0) && (
              <div className="flex items-center justify-between text-sm">
                <span className={`${textMutedClass}`}>
                  Envío ({deliveryCompanyName}):
                </span>
                <span className={`font-bold`} style={{ color: textColor }}>
                  Bs. {formatPrice(deliveryInfo.costVes)}
                  <span className={`text-[10px] font-semibold ml-1`} style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
                    (${Number(deliveryInfo.costUsd || 0).toFixed(2)})
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: borderColor }}>
              <span className={`font-black uppercase ${textMutedClass}`}>Total Pagado</span>
              <div className="text-right">
                <span className={`text-2xl font-black`} style={{ color: primary }}>
                  Bs. {formatPrice(totalWithIVAVes)}
                </span>
                <span
                  className="text-[10px] block font-bold"
                  style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}
                >
                  (${totalUsd.toFixed(2)} USD)
                </span>
                {exchangeRate > 0 && (
                  <span className={`text-[8px] block opacity-50 ${textMutedClass}`}>
                    Tasa: 1 USD = Bs. {exchangeRate.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* COMPROBANTE */}
          {orderData.paymentProof && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primary }} />
                  <span className={`text-xs font-medium`} style={{ color: primary }}>
                    Comprobante de pago subido
                  </span>
                </div>
                <a 
                  href={orderData.paymentProof} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`text-[10px] hover:underline flex items-center gap-1.5 ${textMutedClass}`}
                  style={{ color: primary }}
                >
                  Ver comprobante
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
              </div>
            </div>
          )}
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
            <span className={`opacity-50 ${textMutedClass}`}>¡Gracias por tu {isService ? 'reserva' : 'compra'}!</span>
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
              <span>{isService ? 'Entendido' : 'Finalizar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}