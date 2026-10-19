'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, X, Package, Calendar, Smartphone, CreditCard, 
  Banknote, Sparkles, PartyPopper, Printer, Building2, Phone, 
  Star, User, Clock, BadgeCheck, Gift, Image as ImageIcon
} from 'lucide-react';
import { useKioskContext } from './KioskStoreLayout';
import { generateReceiptHTML, type ReceiptItem, type ReceiptIvaBreakdown } from '@/app/utils/generateReceiptHTML';
// 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO
// 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO (CORREGIDA)
// 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO (CORREGIDA)
const quantitySafe = (item: any): number => {
  const q = Number(item?.quantity);
  return isNaN(q) || q <= 0 ? 1 : q;
};

const getProductPriceWithIVAAndDiscount = (item: any, exchangeRate: number) => {
  if (!item) return null;

  // ============================================================
  // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
  // ============================================================
  if (item?._pricing && typeof item._pricing === 'object') {
    const p = item._pricing;
    const ivaType = p.ivaType || 'excluded';
    const ivaRate = Number(p.ivaRate || 0);
    const hasDiscount = p.hasDiscount === true;
    const discountPercentage = Number(p.discountPercentage || 0);

    return {
      baseVes: Number(p.basePriceVES || 0),
      baseUsd: Number(p.basePriceUSD || 0),
      discountedBaseVes: Number(p.subtotalVES || p.basePriceVES || 0),
      discountedBaseUsd: Number(p.subtotalUSD || p.basePriceUSD || 0),
      finalWithIVAVes: Number(p.totalPriceVES || 0),
      finalWithIVAUsd: Number(p.totalPriceUSD || 0),
      originalFinalVes: Number(p.originalPriceVES || 0),
      originalFinalUsd: Number(p.originalPriceUSD || 0),
      savingVes: Number(p.discountAmountVES || 0),
      savingUsd: Number(p.discountAmountUSD || 0),
      ivaType,
      ivaRate,
      hasDiscount,
      discountPercentage,
      displayBadge: hasDiscount ? `-${discountPercentage}% 🔥` : '',
      isOnSale: hasDiscount,
    };
  }

  // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
  // 1. Obtener precio BASE (sin IVA)
  let pricesObj = item?.prices || item?.attributes?.prices || {};
  if (typeof pricesObj === 'string') {
    try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
  }

  let baseVes = Number(
    pricesObj?.VES ?? pricesObj?.ves ?? item?.priceVes ?? item?.price_ves ?? item?.price ?? item?.precio ?? 0
  );
  let baseUsd = Number(
    pricesObj?.USD ?? pricesObj?.usd ?? item?.priceUsd ?? item?.price_usd ?? item?.usd ?? 0
  );

  if (baseUsd === 0 && baseVes > 0 && exchangeRate > 0) {
    baseUsd = Math.round((baseVes / exchangeRate) * 100) / 100;
  }
  if (baseVes === 0 && baseUsd > 0 && exchangeRate > 0) {
    baseVes = Math.round((baseUsd * exchangeRate) * 100) / 100;
  }

  const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);

  const isOnSale = item?.onSale === true || item?.attributes?.onSale === true;
  let discountPercentage = Number(item?.discountPercentage || item?.attributes?.discountPercentage || 0);
  discountPercentage = Math.min(100, Math.max(0, discountPercentage));
  const hasDiscount = isOnSale && discountPercentage > 0;

  // 🔥 CORRECCIÓN: Extraer base si el IVA está incluido
  let baseSinIVAVes = baseVes;
  let baseSinIVAUsd = baseUsd;
  let originalFinalVes = baseVes;
  let originalFinalUsd = baseUsd;

  if (ivaType === 'included') {
    // 🔥 REGLA #2: Si IVA incluido, extraer base = precio / (1 + ivaRate/100)
    baseSinIVAVes = baseVes / (1 + ivaRate / 100);
    baseSinIVAUsd = baseUsd / (1 + ivaRate / 100);
    originalFinalVes = baseVes; // El precio original ya tiene IVA
    originalFinalUsd = baseUsd;
  } else if (ivaType === 'excluded') {
    // 🔥 REGLA #2: Si IVA excluido, base = precio (ya es sin IVA)
    baseSinIVAVes = baseVes;
    baseSinIVAUsd = baseUsd;
    originalFinalVes = baseVes * (1 + ivaRate / 100);
    originalFinalUsd = baseUsd * (1 + ivaRate / 100);
  } else {
    // Exento
    baseSinIVAVes = baseVes;
    baseSinIVAUsd = baseUsd;
    originalFinalVes = baseVes;
    originalFinalUsd = baseUsd;
  }

  // 🔥 REGLA #3: Aplicar descuento a la BASE (sin IVA)
  let discountedBaseVes = baseSinIVAVes;
  let discountedBaseUsd = baseSinIVAUsd;

  if (hasDiscount) {
    const factor = 1 - discountPercentage / 100;
    discountedBaseVes = baseSinIVAVes * factor;
    discountedBaseUsd = baseSinIVAUsd * factor;
  }

  // 🔥 Calcular IVA sobre la base con descuento
  let ivaAmountVes = 0;
  let ivaAmountUsd = 0;
  let finalWithIVAVes = discountedBaseVes;
  let finalWithIVAUsd = discountedBaseUsd;

  if (ivaType === 'excluded') {
    // IVA NO incluido: se suma al final
    ivaAmountVes = discountedBaseVes * (ivaRate / 100);
    ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
    finalWithIVAVes = discountedBaseVes + ivaAmountVes;
    finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
  } else if (ivaType === 'included') {
    // IVA YA incluido: el precio final es base + IVA
    ivaAmountVes = discountedBaseVes * (ivaRate / 100);
    ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
    finalWithIVAVes = discountedBaseVes + ivaAmountVes;
    finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
  }
  // Si es 'exempt': finalWithIVA = base (sin IVA)

  // 🔥 Calcular ahorro basado en el precio ORIGINAL con IVA
  const savingVes = Math.round((originalFinalVes - finalWithIVAVes) * 100) / 100;
  const savingUsd = Math.round((originalFinalUsd - finalWithIVAUsd) * 100) / 100;

  return {
    baseVes: Math.round(baseSinIVAVes * 100) / 100,
    baseUsd: Math.round(baseSinIVAUsd * 100) / 100,
    discountedBaseVes: Math.round(discountedBaseVes * 100) / 100,
    discountedBaseUsd: Math.round(discountedBaseUsd * 100) / 100,
    finalWithIVAVes: Math.round(finalWithIVAVes * 100) / 100,
    finalWithIVAUsd: Math.round(finalWithIVAUsd * 100) / 100,
    originalFinalVes: Math.round(originalFinalVes * 100) / 100,
    originalFinalUsd: Math.round(originalFinalUsd * 100) / 100,
    savingVes,
    savingUsd,
    ivaType,
    ivaRate,
    hasDiscount,
    discountPercentage,
    displayBadge: hasDiscount ? `-${discountPercentage}% 🔥` : '',
    isOnSale: hasDiscount,
  };
};

interface KioskoSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    id: string;
    customerName: string;
    customerPhone?: string;
    totalAmount: number;
    totalAmountVes: number;
    paymentMethodUsed: string;
    paymentReference?: string;
    bankSource?: string;
    clientPhone?: string;
    clientIdNumber?: string;
    clientIdType?: string;
    clientAccountType?: string;
    items: any[];
    createdAt: string;
    isPagoMovil?: boolean;
    isEfectivo?: boolean;
    isPOS?: boolean;
    hasDiscount?: boolean;
    totalSavingVes?: number;
    totalDiscountPercentage?: number;
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
}

export default function KioskoSuccessModal({
  isOpen,
  onClose,
  orderData,
  tenant,
  primary,
  secondary,
  isSecondaryLight,
  textMainClass,
  textMutedClass,
}: KioskoSuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; rotation: number; speed: number; shape: 'circle' | 'square' | 'triangle' }>>([]);

  // 🔥 CONTEXTO PARA IVA
  const context = useKioskContext();
  const { kioskIvaInfo, exchangeRate } = context || {};



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

      // 🔥 Items transformados
      const receiptItems: ReceiptItem[] = (orderData.items || []).map((item: any) => {
        const priceInfo = getProductPriceWithIVAAndDiscount(item, exchangeRate || 0);
        const qty = quantitySafe(item);

        if (priceInfo) {
          const totalVes = priceInfo.finalWithIVAVes * qty;
          const unitPrice = priceInfo.finalWithIVAVes;

          return {
            name: item.name || 'Producto',
            quantity: qty,
            unitPriceVes: unitPrice,
            totalVes: totalVes,
            ivaType: priceInfo.ivaType as 'included' | 'excluded' | 'exempt',
            ivaRate: priceInfo.ivaRate,
            ivaAmount: (totalVes - priceInfo.discountedBaseVes * qty),
          };
        }

        // Fallback
        const priceVes = Number(item.priceVes ?? item.price ?? 0);
        return {
          name: item.name || 'Producto',
          quantity: qty,
          unitPriceVes: priceVes,
          totalVes: priceVes * qty,
          ivaType: 'excluded' as const,
          ivaRate: 16,
          ivaAmount: priceVes * qty * 0.16,
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

        customerName: orderData.customerName || 'Cliente Kiosko',
        customerIdType: orderData.clientIdType || null,
        customerIdNumber: orderData.clientIdNumber || null,
        customerPhone: orderData.customerPhone || null,
        customerEmail: null,
        customerAddress: null,

        items: receiptItems,

        subtotalBaseVes: ivaInfo.totalBaseVes,
        ivaBreakdown,
        totalExemptVes: 0,
        totalIvaVes: ivaInfo.totalIVA,
        totalVes: orderData.totalAmountVes || 0,
        totalUsd: exchangeRate && exchangeRate > 0 ? (orderData.totalAmountVes || 0) / exchangeRate : (orderData.totalAmount || 0),
        exchangeRate: exchangeRate || 0,

        paymentMethod: orderData.paymentMethodUsed || null,
        paymentReference: orderData.paymentReference || null,
        bankSource: orderData.bankSource || null,
      });

      // 🔥 Abrir ventana nueva
      const win = window.open('', '_blank', 'width=900,height=1200');
      if (!win) {
        alert('No se pudo abrir la ventana. Verificá que no esté bloqueado el popup.');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (error) {
      console.error('❌ [KioskoSuccessModal] Error al generar el comprobante:', error);
      alert('No se pudo generar el comprobante. Intentá de nuevo.');
    }
  };


  // 🔥 FUNCIÓN PARA CALCULAR IVA Y DESCUENTO DESDE LOS ITEMS
  const calculateIVAAndDiscountFromItems = (items: any[]) => {
    let totalBaseVes = 0;
    let totalIVA = 0;
    let totalWithIVAVes = 0;
    let totalSavingVes = 0;
    let totalOriginalVes = 0;
    let totalIvaType = 'excluded';
    let totalIvaRate = 0;
    let hasMixedIVA = false;
    let hasIncludedIVA = false;
    let hasExcludedIVA = false;
    let hasAnyDiscount = false;
    let maxDiscountPercentage = 0;

    items.forEach((item: any) => {
      const quantity = Number(item.quantity || 1);
      
      // 🔥 USAR LA FUNCIÓN CON IVA Y DESCUENTO
      const priceInfo = getProductPriceWithIVAAndDiscount(item, exchangeRate || 0);
      
      if (priceInfo) {
        const finalPriceVes = priceInfo.finalWithIVAVes;
        const baseSinIVA = priceInfo.discountedBaseVes;
        const ivaAmount = priceInfo.finalWithIVAVes - priceInfo.discountedBaseVes;
        const saving = priceInfo.savingVes;
        
        totalBaseVes += baseSinIVA * quantity;
        totalIVA += ivaAmount * quantity;
        totalWithIVAVes += finalPriceVes * quantity;
        totalSavingVes += saving * quantity;
        totalOriginalVes += priceInfo.originalFinalVes * quantity;
        
        if (priceInfo.hasDiscount) {
          hasAnyDiscount = true;
          if (priceInfo.discountPercentage > maxDiscountPercentage) {
            maxDiscountPercentage = priceInfo.discountPercentage;
          }
        }
        
        const ivaType = priceInfo.ivaType || 'excluded';
        if (ivaType === 'included') hasIncludedIVA = true;
        else if (ivaType === 'excluded') hasExcludedIVA = true;
        
        if (ivaType !== 'exempt' && priceInfo.ivaRate > 0) {
          totalIvaRate = Math.max(totalIvaRate, priceInfo.ivaRate);
        }
      } else {
        // 🔥 FALLBACK: usar el precio directo del item
        const priceVes = Number(item.priceVes ?? item.price ?? 0);
        const ivaType = item?.ivaType || 'excluded';
        const ivaRate = Number(item?.ivaRate || 16);
        
        let baseSinIVA = priceVes;
        let ivaAmount = 0;
        
        if (ivaType === 'excluded') {
          ivaAmount = priceVes * (ivaRate / 100);
          baseSinIVA = priceVes;
        } else if (ivaType === 'included') {
          ivaAmount = priceVes - (priceVes / (1 + ivaRate / 100));
          baseSinIVA = priceVes - ivaAmount;
        }
        
        totalBaseVes += baseSinIVA * quantity;
        totalIVA += ivaAmount * quantity;
        totalWithIVAVes += priceVes * quantity;
        
        if (ivaType === 'included') hasIncludedIVA = true;
        else if (ivaType === 'excluded') hasExcludedIVA = true;
        
        if (ivaType !== 'exempt' && ivaRate > 0) {
          totalIvaRate = Math.max(totalIvaRate, ivaRate);
        }
      }
    });

    hasMixedIVA = hasIncludedIVA && hasExcludedIVA;

    let displayType = 'Sin IVA';
    let badgeBg = 'rgba(100,116,139,0.15)';
    let badgeColor = '#64748b';

    if (hasMixedIVA) {
      displayType = `IVA Mixto (${totalIvaRate}%)`;
      badgeBg = 'rgba(139,92,246,0.15)';
      badgeColor = '#8b5cf6';
    } else if (hasIncludedIVA && totalIVA > 0) {
      displayType = `IVA ${totalIvaRate}% Incluido`;
      badgeBg = 'rgba(34,197,94,0.15)';
      badgeColor = '#22c55e';
    } else if (hasExcludedIVA && totalIVA > 0) {
      displayType = `IVA ${totalIvaRate}% No Incluido`;
      badgeBg = 'rgba(251,191,36,0.15)';
      badgeColor = '#f59e0b';
    } else if (totalIVA === 0 && items.length > 0) {
      displayType = 'Exento de IVA';
      badgeBg = 'rgba(100,116,139,0.15)';
      badgeColor = '#64748b';
    }

    return {
      totalBaseVes: Math.round(totalBaseVes * 100) / 100,
      totalIVA: Math.round(totalIVA * 100) / 100,
      totalWithIVAVes: Math.round(totalWithIVAVes * 100) / 100,
      totalSavingVes: Math.round(totalSavingVes * 100) / 100,
      totalOriginalVes: Math.round(totalOriginalVes * 100) / 100,
      totalIvaType,
      totalIvaRate,
      hasMixedIVA,
      displayType,
      badgeBg,
      badgeColor,
      hasIVA: totalIVA > 0 || hasIncludedIVA,
      hasDiscount: hasAnyDiscount,
      maxDiscountPercentage: maxDiscountPercentage,
    };
  };

  // 🔥 USAR IVA DEL CONTEXTO O CALCULAR DESDE LOS ITEMS
  const ivaInfo = kioskIvaInfo || calculateIVAAndDiscountFromItems(orderData.items || []);

  // 🔥 INFORMACIÓN DEL IVA Y DESCUENTO
  const ivaDisplayType = ivaInfo?.displayType || 'Sin IVA';
  const ivaBadgeBg = ivaInfo?.badgeBg || 'rgba(100,116,139,0.15)';
  const ivaBadgeColor = ivaInfo?.badgeColor || '#64748b';
  const hasIVA = ivaInfo?.hasIVA || false;
  const hasDiscount = ivaInfo?.hasDiscount || orderData.hasDiscount || false;
  const totalBaseVes = ivaInfo?.totalBaseVes || 0;
  const totalIVA = ivaInfo?.totalIVA || 0;
  const totalIvaRate = ivaInfo?.totalIvaRate || 0;
  const totalSavingVes = ivaInfo?.totalSavingVes || orderData.totalSavingVes || 0;
  const totalOriginalVes = ivaInfo?.totalOriginalVes || 0;
  const maxDiscountPercentage = ivaInfo?.maxDiscountPercentage || orderData.totalDiscountPercentage || 0;

  // 🔥 FUNCIÓN PARA FORMATEAR TELÉFONO
  const formatPhone = (phone: string): string => {
    if (!phone) return 'No especificado';
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) return clean;
    if (clean.length === 7) return `0414${clean}`;
    if (clean.length < 7) return `0414${clean.padStart(7, '0')}`;
    if (clean.length === 8 || clean.length === 9) return `0${clean}`;
    return phone;
  };

  // 🔥 FUNCIÓN PARA OBTENER IMAGEN DEL PRODUCTO
  const getItemImage = (item: any): string | null => {
    if (!item) return null;
    const possibleImages = [
      item.image,
      item.coverImage,
      item.photo,
      ...(item.mediaUrls || []),
      ...(item.images || []),
      ...(item.existingImages || []),
      ...(item.fileUrls || []),
      ...(item.photos || []),
    ].filter(Boolean);

    if (possibleImages.length === 0) return null;

    let rawImg = possibleImages[0];
    if (typeof rawImg !== 'string') rawImg = String(rawImg);
    rawImg = rawImg.trim();
    if (!rawImg) return null;

    rawImg = rawImg.replace(/\\/g, '/');

    const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
    const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      try {
        const urlObj = new URL(rawImg);
        if (urlObj.port && urlObj.port !== '3000') {
          return `${cleanBase}${urlObj.pathname}`;
        }
        return rawImg;
      } catch (e) {
        return rawImg;
      }
    }

    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) {
      return rawImg;
    }

    if (rawImg.includes('uploads/')) {
      const relativePath = rawImg.split('uploads/').pop();
      return `${cleanBase}/uploads/${relativePath}`;
    }

    const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
    return `${cleanBase}/uploads/${cleanPath}`;
  };

  // 🔥 GENERAR SONIDO DE ÉXITO
  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const durations = [0.15, 0.15, 0.15, 0.3];
        
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + durations[i]);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + durations[i]);
        });
      }
    } catch (e) {
      console.log('🔇 Sonido no disponible');
    }
  };

  // 🔥 GENERAR CONFETI
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setShowButtons(false);
      
      setTimeout(() => playSuccessSound(), 200);
      
      const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#eab308', '#06b6d4'];
      const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
      const newConfetti = [];
      
      for (let i = 0; i < 120; i++) {
        newConfetti.push({
          id: i,
          x: 5 + Math.random() * 90,
          y: -10 - Math.random() * 30,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 6 + Math.random() * 12,
          rotation: Math.random() * 360,
          speed: 1.5 + Math.random() * 4,
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

  const modalBg = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');
  const itemBg = isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedColor = isSecondaryLight ? '#64748b' : '#94a3b8';

  const isPagoMovil = orderData.isPagoMovil || orderData.paymentMethodUsed === 'pagomovil';
  const isEfectivo = orderData.isEfectivo || orderData.paymentMethodUsed === 'efectivo';
  const isPOS = orderData.isPOS || orderData.paymentMethodUsed === 'pos';

  const getMethodIcon = () => {
    if (isPagoMovil) return <Smartphone className="w-5 h-5" style={{ color: '#34d399' }} />;
    if (isEfectivo) return <Banknote className="w-5 h-5" style={{ color: '#fbbf24' }} />;
    if (isPOS) return <CreditCard className="w-5 h-5" style={{ color: '#60a5fa' }} />;
    return <CreditCard className="w-5 h-5" style={{ color: '#94a3b8' }} />;
  };

  const getMethodLabel = () => {
    if (isPagoMovil) return 'PagoMóvil';
    if (isEfectivo) return 'Efectivo en Caja';
    if (isPOS) return 'Punto de Venta';
    return orderData.paymentMethodUsed || 'No especificado';
  };

  const getSuccessMessage = () => {
    if (isPagoMovil) {
      return 'Tu PagoMóvil ha sido reportado exitosamente. La tienda verificará tu pago.';
    }
    if (isEfectivo) {
      return 'Has pagado en efectivo. Tu orden está confirmada y en proceso.';
    }
    if (isPOS) {
      return 'Has pagado con tarjeta en el punto de venta. Tu orden está confirmada.';
    }
    return 'Tu orden ha sido registrada exitosamente.';
  };

  // 🔥 CALCULAR TOTALES PARA EL MODAL
  const finalVes = orderData.totalAmountVes || 0;
  
  let finalUsd = 0;
  if (exchangeRate && exchangeRate > 0) {
    finalUsd = Math.round((finalVes / exchangeRate) * 100) / 100;
  } else if (orderData.totalAmount > 0) {
    finalUsd = orderData.totalAmount;
  } else {
    finalUsd = finalVes;
  }

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* CONFETI ANIMADO */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confetti.map((piece) => {
          const animationName = piece.shape === 'circle' ? 'confettiFallCircle' : 'confettiFall';
          return (
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
                animationName: animationName,
                animationDuration: `${piece.speed}s`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
                animationDelay: `${Math.random() * 0.8}s`,
                opacity: 0.95,
                boxShadow: `0 0 10px ${piece.color}40`,
              }}
            />
          );
        })}
      </div>

      <style jsx>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(1080deg) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes confettiFallCircle {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(720deg) scale(0.2);
            opacity: 0;
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px ${primary}40, 0 0 60px ${primary}20, 0 0 100px ${primary}10;
          }
          50% {
            box-shadow: 0 0 40px ${primary}60, 0 0 80px ${primary}30, 0 0 120px ${primary}15;
          }
        }
        @keyframes scaleIn {
          0% {
            transform: scale(0.7) translateY(40px) rotate(-2deg);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes slideUp {
          0% {
            transform: translateY(30px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes bounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        .modal-enter {
          animation: scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .item-enter {
          animation: slideUp 0.6s ease forwards;
          opacity: 0;
        }
        .item-enter:nth-child(1) { animation-delay: 0.05s; }
        .item-enter:nth-child(2) { animation-delay: 0.1s; }
        .item-enter:nth-child(3) { animation-delay: 0.15s; }
        .item-enter:nth-child(4) { animation-delay: 0.2s; }
        .item-enter:nth-child(5) { animation-delay: 0.25s; }
        .item-enter:nth-child(6) { animation-delay: 0.3s; }
        .item-enter:nth-child(7) { animation-delay: 0.35s; }
        .item-enter:nth-child(8) { animation-delay: 0.4s; }
        .bounce-enter {
          animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .shimmer-text {
          background: linear-gradient(90deg, ${primary}, ${primary}80, ${primary});
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div 
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col modal-enter"
        style={{
          backgroundColor: modalBg,
          borderColor: borderColor,
          color: textColor,
        }}
      >
        {/* HEADER - FIJO */}
        <div
          className="px-8 py-6 border-b relative overflow-hidden shrink-0"
          style={{
            borderColor: borderColor,
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
          }}
        >
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${primary}66 0%, transparent 70%)`,
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
                <BadgeCheck 
                  className="w-8 h-8" 
                  style={{ color: primary }}
                  strokeWidth={2.5}
                />
              </div>
              <div className="min-w-0">
                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 flex-wrap`} style={{ color: textColor }}>
                  <span className="shimmer-text truncate">¡Pedido Completado!</span>
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
              className="p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 hover:bg-white/10 shrink-0"
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

        {/* BODY - SCROLLABLE */}
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
                  {isPagoMovil ? 'Pago Reportado' : 'Pago Confirmado'}
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

          {/* 🔥 BANNER DE OFERTA APLICADA */}
          {hasDiscount && totalSavingVes > 0 && (
            <div 
              className="p-4 rounded-2xl border item-enter flex items-center gap-4"
              style={{ 
                backgroundColor: 'rgba(239,68,68,0.12)', 
                borderColor: 'rgba(239,68,68,0.2)' 
              }}
            >
              <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-8 h-8"
                  style={{ color: '#ef4444' }}
                >
                  <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                  <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: textColor }}>
                  ¡Oferta aplicada!
                </p>
                <p className="text-xs" style={{ color: mutedColor }}>
                  Ahorraste Bs. {formatPrice(totalSavingVes)}
                </p>
              </div>
              <span 
                className="px-3 py-1.5 rounded-lg text-sm font-black animate-pulse flex items-center gap-1"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4"
                >
                  <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                </svg>
                -{maxDiscountPercentage}% OFF
              </span>
            </div>
          )}

          {/* DETALLES DE LA ORDEN */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cliente</span>
              <p className={`font-bold text-sm truncate flex items-center gap-1`} style={{ color: textColor }}>
                <User className="w-3.5 h-3.5 opacity-60 shrink-0" />
                <span className="truncate">{orderData.customerName || 'Cliente Kiosko'}</span>
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Productos</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Package className="w-3.5 h-3.5 opacity-60 shrink-0" />
                {orderData.items.length} items
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Fecha</span>
              <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" />
                {new Date(orderData.createdAt).toLocaleString('es-VE')}
              </p>
            </div>

            {isPagoMovil && orderData.customerPhone && (
              <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Teléfono</span>
                <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                  <Phone className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  {formatPhone(orderData.customerPhone)}
                </p>
              </div>
            )}

            {(isPagoMovil || isPOS) && orderData.clientIdNumber && (
              <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cédula</span>
                <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                  <User className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  {orderData.clientIdType || 'V'}-{orderData.clientIdNumber}
                </p>
              </div>
            )}

            {isPOS && orderData.clientAccountType && (
              <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Tipo de Cuenta</span>
                <p className={`font-bold text-sm flex items-center gap-1`} style={{ color: textColor }}>
                  <CreditCard className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  {orderData.clientAccountType}
                </p>
              </div>
            )}
          </div>

          {/* 🔥 BADGE DE IVA */}
          {hasIVA && orderData.items.length > 0 && (
            <div className="flex justify-end">
              <span 
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border`}
                style={{
                  backgroundColor: ivaBadgeBg,
                  borderColor: `${ivaBadgeColor}30`,
                  color: ivaBadgeColor
                }}
              >
                {ivaDisplayType}
              </span>
            </div>
          )}

          {/* 🔥 DESGLOSE DE IVA Y OFERTA */}
          {(hasIVA || hasDiscount) && orderData.items.length > 0 && (
            <div
              className="p-4 rounded-2xl border item-enter space-y-2"
              style={{
                backgroundColor: `${primary}10`,
                borderColor: `${primary}30`,
              }}
            >
              {/* 🔥 OFERTA - DESCUENTO APLICADO */}
              {hasDiscount && totalSavingVes > 0 && (
                <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.15)' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: mutedColor }}>Precio original:</span>
                    <span className="font-medium line-through" style={{ color: mutedColor }}>
                      Bs. {formatPrice(totalOriginalVes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: mutedColor }}>Descuento aplicado:</span>
                    <span className="font-bold" style={{ color: '#ef4444' }}>
                      -Bs. {formatPrice(totalSavingVes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-2 mt-1" style={{ borderColor: borderColor }}>
                    <span className="font-black uppercase text-xs" style={{ color: mutedColor }}>Total con descuento:</span>
                    <span className="text-base font-black" style={{ color: '#34d399' }}>
                      Bs. {formatPrice(finalVes)}
                    </span>
                  </div>
                </div>
              )}

              {/* 🔥 IVA */}
              {hasIVA && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: mutedColor }}>Subtotal (sin IVA):</span>
                    <span className="font-medium" style={{ color: textColor }}>
                      Bs. {formatPrice(totalBaseVes)}
                    </span>
                  </div>
                  {totalIVA > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: mutedColor }}>
                        IVA ({totalIvaRate || 16}%):
                      </span>
                      <span className="font-medium" style={{ color: textColor }}>
                        Bs. {formatPrice(totalIVA)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: borderColor }}>
                    <span className="font-black uppercase" style={{ color: mutedColor }}>Total con IVA:</span>
                    <span className="text-xl font-black" style={{ color: primary }}>
                      Bs. {formatPrice(finalVes)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* MÉTODO DE PAGO */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between item-enter flex-wrap gap-2`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${primary}15` }}>
                {getMethodIcon()}
              </div>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Método de Pago</span>
                <p className={`font-bold capitalize text-sm`} style={{ color: textColor }}>
                  {getMethodLabel()}
                </p>
              </div>
            </div>
            {isPagoMovil && orderData.paymentReference && (
              <div className="text-right">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Referencia</span>
                <p className={`font-bold font-mono text-sm`} style={{ color: textColor }}>{orderData.paymentReference}</p>
              </div>
            )}
          </div>

          {/* 🔥 SOLO PARA PAGOMÓVIL */}
          {isPagoMovil && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Banco Emisor</span>
                  <p className={`font-bold text-sm flex items-center gap-2`} style={{ color: textColor }}>
                    <Building2 className="w-4 h-4 opacity-60" />
                    {orderData.bankSource || 'No especificado'}
                  </p>
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Teléfono Afiliado</span>
                  <p className={`font-bold text-sm flex items-center gap-2`} style={{ color: textColor }}>
                    <Phone className="w-4 h-4 opacity-60" />
                    {formatPhone(orderData.clientPhone || orderData.customerPhone || 'No especificado')}
                  </p>
                </div>
              </div>
              {orderData.clientIdNumber && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: borderColor }}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cédula</span>
                  <p className={`font-bold text-sm flex items-center gap-2`} style={{ color: textColor }}>
                    <User className="w-4 h-4 opacity-60" />
                    {orderData.clientIdType || 'V'}-{orderData.clientIdNumber}
                  </p>
                </div>
              )}
              {orderData.paymentReference && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: borderColor }}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Referencia</span>
                  <p className={`font-bold font-mono text-sm`} style={{ color: textColor }}>
                    {orderData.paymentReference}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 🔥 SOLO PARA EFECTIVO */}
          {isEfectivo && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: `${primary}20` }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: primary }} />
                </div>
                <div>
                  <p className={`font-bold text-sm`} style={{ color: textColor }}>
                    Pago en efectivo confirmado en caja
                  </p>
                  <p className={`text-xs ${textMutedClass}`}>
                    Tu orden está siendo preparada para entrega
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 🔥 VUELTO: mostrar cómo se entrega el vuelto al cliente */}
          {isEfectivo && (orderData as any).change && Number((orderData as any).change.amountVes || 0) > 0 && (
            <div
              className={`p-3.5 rounded-xl border item-enter space-y-2`}
              style={{
                backgroundColor: 'rgba(52,211,153,0.10)',
                borderColor: 'rgba(52,211,153,0.30)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4" style={{ color: '#34d399' }} />
                  <span className={`text-xs font-black uppercase tracking-wider`} style={{ color: '#34d399' }}>
                    Tu Vuelto
                  </span>
                </div>
                <span className="text-base font-black" style={{ color: '#34d399' }}>
                  Bs. {formatPrice(Number((orderData as any).change.amountVes))}
                </span>
              </div>

              {(() => {
                const change = (orderData as any).change;
                const pref = change.deliveryPreference;
                const method = pref?.method || change.deliveryMethod;
                if (!method && change.resolution !== 'credit') return null;

                if (change.resolution === 'credit' || method === 'credit') {
                  return (
                    <p className="text-xs" style={{ color: textColor }}>
                      Lo dejaste como <b>saldo a favor</b>. Ya está acreditado en tu cuenta.
                    </p>
                  );
                }

                if (method === 'cash_ves') {
                  return (
                    <p className="text-xs" style={{ color: textColor }}>
                      Retiralo en <b>efectivo (bolívares)</b> en caja al confirmar.
                    </p>
                  );
                }
                if (method === 'cash_usd') {
                  return (
                    <p className="text-xs" style={{ color: textColor }}>
                      Retiralo en <b>efectivo (dólares)</b> en caja al confirmar.
                    </p>
                  );
                }
                if (method === 'pago_movil') {
                  const pm = pref?.pagoMovilData || change.deliveryPagoMovilData || {};
                  return (
                    <div className="text-xs space-y-0.5" style={{ color: textColor }}>
                      <p className="font-bold">Te lo enviaremos por Pago Móvil a:</p>
                      {pm.bank && <div><b>Banco:</b> {pm.bank}</div>}
                      {pm.phone && <div><b>Teléfono:</b> {pm.phone}</div>}
                      {pm.clientIdNumber && (
                        <div><b>Cédula:</b> {pm.clientIdType || 'V'}-{pm.clientIdNumber}</div>
                      )}
                    </div>
                  );
                }
                return (
                  <p className="text-xs" style={{ color: textColor }}>
                    Forma elegida: <b>{method}</b>
                  </p>
                );
              })()}
            </div>
          )}

          {/* 🔥 SOLO PARA POS */}
          {isPOS && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: `${primary}08`, borderColor: `${primary}30` }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: `${primary}20` }}>
                  <CreditCard className="w-6 h-6" style={{ color: primary }} />
                </div>
                <div>
                  <p className={`font-bold text-sm`} style={{ color: textColor }}>
                    Pago con tarjeta confirmado en punto de venta
                  </p>
                  <p className={`text-xs ${textMutedClass}`}>
                    Tu orden está siendo preparada para entrega
                  </p>
                </div>
              </div>
              {(orderData.clientIdNumber || orderData.clientAccountType) && (
                <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-4" style={{ borderColor: borderColor }}>
                  {orderData.clientIdNumber && (
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Cédula</span>
                      <p className={`font-bold text-sm`} style={{ color: textColor }}>
                        {orderData.clientIdType || 'V'}-{orderData.clientIdNumber}
                      </p>
                    </div>
                  )}
                  {orderData.clientAccountType && (
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Tipo de Cuenta</span>
                      <p className={`font-bold text-sm`} style={{ color: textColor }}>
                        {orderData.clientAccountType}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TOTAL */}
          <div
            className={`p-4 rounded-2xl border item-enter`}
            style={{
              backgroundColor: `${primary}12`,
              borderColor: `${primary}30`,
            }}
          >
            <div className="flex justify-between items-center">
              <span className={`font-black uppercase tracking-wider text-sm flex items-center gap-2 ${textMutedClass}`}>
                <Gift className="w-4 h-4" style={{ color: primary }} />
                Total Pagado
              </span>
              <div className="text-right">
                <span className={`text-2xl sm:text-3xl font-black`} style={{ color: primary }}>
                  Bs. {formatPrice(finalVes)}
                </span>
                <span
                  className="text-[10px] block font-bold"
                  style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}
                >
                  (${finalUsd.toFixed(2)} USD)
                </span>
              </div>
            </div>
          </div>

          {/* 🔥 LISTA DE PRODUCTOS */}
          {orderData.items.length > 0 && (
            <div className={`p-3.5 rounded-xl border item-enter`} style={{ backgroundColor: itemBg, borderColor: borderColor }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 opacity-60 shrink-0" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Productos</span>
                  <span className={`text-[9px] ${textMutedClass}`}>({orderData.items.length} items)</span>
                </div>
                {hasIVA && orderData.items.length > 0 && (
                  <span 
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border`}
                    style={{
                      backgroundColor: ivaBadgeBg,
                      borderColor: `${ivaBadgeColor}30`,
                      color: ivaBadgeColor
                    }}
                  >
                    {ivaDisplayType}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {orderData.items.map((item, idx) => {
                  const quantity = item.quantity || 1;
                  
                  // 🔥 USAR LA FUNCIÓN CON IVA Y DESCUENTO
                  const priceInfo = getProductPriceWithIVAAndDiscount(item, exchangeRate || 0);
                  
                  let displayPriceVes = 0;
                  let originalPriceVes = 0;
                  let hasItemDiscount = false;
                  let discountPercent = 0;
                  let ivaBadgeItem = '';
                  let ivaTypeItem = item?.ivaType || 'excluded';
                  let ivaRateItem = Number(item?.ivaRate || 16);
                  
                  if (priceInfo) {
                    displayPriceVes = priceInfo.finalWithIVAVes;
                    originalPriceVes = priceInfo.originalFinalVes;
                    hasItemDiscount = priceInfo.hasDiscount;
                    discountPercent = priceInfo.discountPercentage;
                    ivaTypeItem = priceInfo.ivaType;
                    ivaRateItem = priceInfo.ivaRate;
                    
                    if (ivaTypeItem === 'excluded') {
                      ivaBadgeItem = `+${ivaRateItem}%`;
                    } else if (ivaTypeItem === 'included') {
                      ivaBadgeItem = `IVA ${ivaRateItem}%`;
                    } else {
                      ivaBadgeItem = 'Exento';
                    }
                  } else {
                    // 🔥 FALLBACK: usar el precio directo del item
                    displayPriceVes = Number(item.priceVes ?? item.price ?? 0);
                    originalPriceVes = displayPriceVes;
                    
                    if (ivaTypeItem === 'excluded') {
                      ivaBadgeItem = `+${ivaRateItem}%`;
                    } else if (ivaTypeItem === 'included') {
                      ivaBadgeItem = `IVA ${ivaRateItem}%`;
                    } else {
                      ivaBadgeItem = 'Exento';
                    }
                  }
                  
                  const totalDisplayVes = displayPriceVes * quantity;
                  const totalOriginalVesItem = originalPriceVes * quantity;
                  const itemImage = getItemImage(item);
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 p-2 rounded-xl border" 
                      style={{ 
                        borderColor: borderColor, 
                        backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' 
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center" style={{ borderColor: borderColor }}>
                        {itemImage ? (
                          <img 
                            src={itemImage} 
                            alt={item.name || 'Producto'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 opacity-30" style={{ color: textColor }} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm truncate block`} style={{ color: textColor }}>
                            {item.name || 'Producto'}
                          </span>
                          {hasItemDiscount && (
                            <span 
                              className="px-1.5 py-0.5 rounded-lg text-[7px] font-black flex items-center gap-0.5"
                              style={{
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                              }}
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="currentColor" 
                                className="w-2.5 h-2.5"
                              >
                                <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                              </svg>
                              -{discountPercent}%
                            </span>
                          )}
                          {ivaTypeItem !== 'exempt' && (
                            <span 
                              className={`text-[7px] font-bold px-1 py-0.5 rounded-full ${
                                isSecondaryLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-white/60'
                              }`}
                            >
                              {ivaBadgeItem}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] ${textMutedClass}`}>
                          Cantidad: {quantity}
                        </span>
                      </div>
                      
                      <div className="text-right shrink-0">
                        {hasItemDiscount && originalPriceVes > displayPriceVes ? (
                          <>
                            <span className={`text-[9px] line-through opacity-50 block`} style={{ color: mutedColor }}>
                              Bs. {formatPrice(totalOriginalVesItem)}
                            </span>
                            <span className={`font-bold text-sm block`} style={{ color: primary }}>
                              Bs. {formatPrice(totalDisplayVes)}
                            </span>
                          </>
                        ) : (
                          <span className={`font-bold text-sm block`} style={{ color: primary }}>
                            Bs. {formatPrice(totalDisplayVes)}
                          </span>
                        )}
                        {displayPriceVes > 0 && (
                          <span className={`text-[9px] ${textMutedClass}`}>
                            Bs. {formatPrice(displayPriceVes)} c/u
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
            <span className={`opacity-50 ${textMutedClass}`}>¡Gracias por tu compra!</span>
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
              <span>Finalizar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}