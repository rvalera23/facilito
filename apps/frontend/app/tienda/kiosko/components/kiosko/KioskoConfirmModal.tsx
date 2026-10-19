  'use client';

  import React, { useState, useEffect } from 'react';
  import { X, AlertTriangle, ShoppingBag, CheckCircle2, Loader2 } from 'lucide-react';
  import { useKioskContext } from './KioskStoreLayout';

  // 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO (Kiosco)
  const getProductPriceWithIVAAndDiscount = (product: any, exchangeRate: number) => {
    if (!product) return null;

    // ============================================================
    // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
    // ============================================================
    if (product?._pricing && typeof product._pricing === 'object') {
      const p = product._pricing;
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
    let pricesObj = product?.prices || product?.attributes?.prices || {};
    if (typeof pricesObj === 'string') {
      try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
    }

    let baseVes = Number(
      pricesObj?.VES ?? pricesObj?.ves ?? product?.priceVes ?? product?.price_ves ?? product?.price ?? product?.precio ?? 0
    );
    let baseUsd = Number(
      pricesObj?.USD ?? pricesObj?.usd ?? product?.priceUsd ?? product?.price_usd ?? product?.usd ?? 0
    );

    if (baseUsd === 0 && baseVes > 0 && exchangeRate > 0) {
      baseUsd = Math.round((baseVes / exchangeRate) * 100) / 100;
    }
    if (baseVes === 0 && baseUsd > 0 && exchangeRate > 0) {
      baseVes = Math.round((baseUsd * exchangeRate) * 100) / 100;
    }

    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

    const isOnSale = product?.onSale === true || product?.attributes?.onSale === true;
    let discountPercentage = Number(product?.discountPercentage || product?.attributes?.discountPercentage || 0);
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    const hasDiscount = isOnSale && discountPercentage > 0;

    let discountedBaseVes = baseVes;
    let discountedBaseUsd = baseUsd;
    let originalFinalVes = baseVes;
    let originalFinalUsd = baseUsd;

    if (hasDiscount) {
      const factor = 1 - discountPercentage / 100;
      if (ivaType === 'excluded') {
        originalFinalVes = baseVes * (1 + ivaRate / 100);
        originalFinalUsd = baseUsd * (1 + ivaRate / 100);
      } else if (ivaType === 'included') {
        originalFinalVes = baseVes;
        originalFinalUsd = baseUsd;
      } else {
        originalFinalVes = baseVes;
        originalFinalUsd = baseUsd;
      }
      discountedBaseVes = baseVes * factor;
      discountedBaseUsd = baseUsd * factor;
    }

    let ivaAmountVes = 0;
    let ivaAmountUsd = 0;
    let finalWithIVAVes = discountedBaseVes;
    let finalWithIVAUsd = discountedBaseUsd;

    if (ivaType === 'excluded') {
      ivaAmountVes = discountedBaseVes * (ivaRate / 100);
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalWithIVAVes = discountedBaseVes + ivaAmountVes;
      finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      ivaAmountVes = discountedBaseVes * (ivaRate / 100);
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalWithIVAVes = discountedBaseVes + ivaAmountVes;
      finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
    }

    const savingVes = Math.round((originalFinalVes - finalWithIVAVes) * 100) / 100;
    const savingUsd = Math.round((originalFinalUsd - finalWithIVAUsd) * 100) / 100;

    return {
      baseVes: Math.round(baseVes * 100) / 100,
      baseUsd: Math.round(baseUsd * 100) / 100,
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

interface KioskoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  confirmedData: boolean;
  setConfirmedData: (value: boolean) => void;
  cartItems: any[];
  customerName: string;
  customerPhone: string;
  finalVes: number;
  finalUsd: number;
  formatPrice: (num: number) => string;
  isSecondaryLight: boolean;
  safePrimary: string;
  secondary?: string;
  borderDynamic: string;
  resolvedTextMain: string;
  resolvedTextMuted: string;
  // 🔥 Pago en efectivo
  paymentMethod?: 'pagomovil' | 'efectivo' | 'pos';
  cashCurrency?: 'VES' | 'USD';
  cashAmount?: number;
}

export default function KioskoConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  confirmedData,
  setConfirmedData,
  cartItems,
  customerName,
  customerPhone,
  finalVes,
  finalUsd,
  formatPrice,
  isSecondaryLight,
  safePrimary,
  secondary,
  borderDynamic,
  resolvedTextMain,
  resolvedTextMuted,
  paymentMethod = 'pagomovil',
  cashCurrency = 'VES',
  cashAmount = 0,
}: KioskoConfirmModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    // 🔥 CONTEXTO PARA IVA Y COLORES
    const context = useKioskContext();
    const { kioskIvaInfo, primary, secondary: contextSecondary, isSecondaryLight: contextIsSecondaryLight, exchangeRate } = context || {};

    const ivaDisplayType = kioskIvaInfo?.displayType || 'Sin IVA';
    const ivaBadgeBg = kioskIvaInfo?.badgeBg || 'rgba(100,116,139,0.15)';
    const ivaBadgeColor = kioskIvaInfo?.badgeColor || '#64748b';
    const hasIVA = kioskIvaInfo?.totalIVA > 0 || kioskIvaInfo?.totalIvaType === 'included';

    useEffect(() => {
      if (isOpen) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    // 🔥 COLORES DINÁMICOS - HEREDADOS DEL CONTEXTO
    const isLight = isSecondaryLight !== undefined ? isSecondaryLight : (contextIsSecondaryLight || false);
    const bgColor = secondary || contextSecondary || (isLight ? '#ffffff' : '#0f172a');
    const overlayBg = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)';
    const itemBg = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
    const textColor = isLight ? '#0f172a' : '#ffffff';
    const mutedColor = isLight ? '#64748b' : '#94a3b8';
    const borderColor = borderDynamic || (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)');
    const primaryColor = safePrimary || primary || '#F59E0B';

    const getItemImage = (item: any): string | null => {
      if (!item) return null;
      const possibleImages = [
        item.image, item.coverImage, item.photo,
        ...(item.mediaUrls || []), ...(item.images || []),
        ...(item.existingImages || []), ...(item.fileUrls || []),
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
        } catch { return rawImg; }
      }

      if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) return rawImg;
      if (rawImg.includes('uploads/')) {
        const relativePath = rawImg.split('uploads/').pop();
        return `${cleanBase}/uploads/${relativePath}`;
      }
      const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
      return `${cleanBase}/uploads/${cleanPath}`;
    };

    const hasItems = cartItems && cartItems.length > 0;

    // 🔥 Obtener el total de IVA del contexto
    const totalBaseVes = kioskIvaInfo?.totalBaseVes || 0;
    const totalIVA = kioskIvaInfo?.totalIVA || 0;
    const totalIvaRate = kioskIvaInfo?.totalIvaRate || 16;

    // 🔥 CALCULAR DESCUENTO TOTAL
    let totalSavingVes = 0;
    let totalOriginalVes = 0;
    let hasAnyDiscount = false;
    let maxDiscountPercentage = 0;

    cartItems.forEach((item: any) => {
      const priceInfo = getProductPriceWithIVAAndDiscount(item, exchangeRate || 0);
      if (!priceInfo) return;
      const quantity = Number(item.quantity || 1);
      totalSavingVes += priceInfo.savingVes * quantity;
      totalOriginalVes += priceInfo.originalFinalVes * quantity;
      if (priceInfo.hasDiscount) {
        hasAnyDiscount = true;
        if (priceInfo.discountPercentage > maxDiscountPercentage) {
          maxDiscountPercentage = priceInfo.discountPercentage;
        }
      }
    });

      // 🔥 CÁLCULO DE VUELTO / FALTA (solo si el pago es en efectivo)
  const isCashPayment = paymentMethod === 'efectivo';
  const exchangeRateSafe = Number(exchangeRate) > 0 ? Number(exchangeRate) : 0;

  const cashPaidVes = isCashPayment
    ? cashCurrency === 'USD'
      ? cashAmount * exchangeRateSafe
      : cashAmount
    : 0;

  const cashDiffVes = isCashPayment ? cashPaidVes - finalVes : 0;
  const cashChangeVes = cashDiffVes > 0 ? cashDiffVes : 0;
  const cashMissingVes = cashDiffVes < 0 ? Math.abs(cashDiffVes) : 0;
  const hasCashChange = isCashPayment && cashChangeVes > 0.01;
  const hasCashMissing = isCashPayment && cashMissingVes > 0.01;
  const isCashExact =
    isCashPayment && cashAmount > 0 && Math.abs(cashDiffVes) < 0.01;

  const formatNumberEn = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatBothCash = (vesValue: number, usdValue: number) => {
    if (cashCurrency === 'VES') {
      return {
        primary: `Bs. ${formatPrice(vesValue)}`,
        secondary: `$${formatNumberEn(usdValue)}`,
      };
    }
    return {
      primary: `$${formatNumberEn(usdValue)}`,
      secondary: `Bs. ${formatPrice(vesValue)}`,
    };
  };

    return (
      <div 
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: overlayBg }}
      >
        <style jsx>{`
          @keyframes scaleIn { 0% { transform: scale(0.8) translateY(30px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
          @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
          .modal-enter { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .item-enter { animation: slideUp 0.4s ease forwards; opacity: 0; }
          .item-enter:nth-child(1) { animation-delay: 0.05s; }
          .item-enter:nth-child(2) { animation-delay: 0.1s; }
          .item-enter:nth-child(3) { animation-delay: 0.15s; }
          .item-enter:nth-child(4) { animation-delay: 0.2s; }
          .item-enter:nth-child(5) { animation-delay: 0.25s; }
          @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px ${primaryColor}40, 0 0 60px ${primaryColor}20; } 50% { box-shadow: 0 0 40px ${primaryColor}60, 0 0 80px ${primaryColor}30; } }
        `}</style>

        <div
          className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col modal-enter`}
          style={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
        >
          {/* HEADER */}
          <div
            className="px-8 py-6 border-b flex items-center justify-between"
            style={{ borderColor: borderColor, backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl flex items-center justify-center item-enter" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-xl font-black tracking-tight`} style={{ color: textColor }}>Confirmar Pedido</h2>
                <p className={`text-xs font-medium`} style={{ color: mutedColor }}>Revisa los detalles antes de continuar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95"
              style={{ backgroundColor: itemBg, borderColor: borderColor, color: textColor }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BODY */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* ADVERTENCIA */}
            <div
              className="p-4 rounded-2xl border flex items-start gap-3 item-enter"
              style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.2)' }}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className={`text-sm font-bold`} style={{ color: textColor }}>Revisa que todos los datos sean correctos</p>
                <p className={`text-xs`} style={{ color: mutedColor }}>Una vez confirmado, no podrás modificar esta orden desde el tótem.</p>
              </div>
            </div>

            {/* PRODUCTOS */}
            <div
              className="p-4 rounded-2xl border space-y-3 item-enter"
              style={{ backgroundColor: itemBg, borderColor: borderColor }}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-black uppercase tracking-wider`} style={{ color: mutedColor }}>
                  Productos ({cartItems.length})
                </h3>
                {hasIVA && cartItems.length > 0 && (
                  <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border`} style={{ backgroundColor: ivaBadgeBg, borderColor: `${ivaBadgeColor}30`, color: ivaBadgeColor }}>
                    {ivaDisplayType}
                  </span>
                )}
              </div>

              {hasItems ? (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {cartItems.map((item: any, idx: number) => {
                    const quantity = Number(item.quantity || 1);
                    const itemImage = getItemImage(item);

                    // 🔥 CALCULAR PRECIO CON IVA Y DESCUENTO
                    const priceInfo = getProductPriceWithIVAAndDiscount(item, exchangeRate || 0);
                    const hasDiscount = priceInfo?.hasDiscount || false;
                    const discountPercentage = priceInfo?.discountPercentage || 0;
                    const finalPriceVes = priceInfo?.finalWithIVAVes || 0;
                    const originalPriceVes = priceInfo?.originalFinalVes || 0;
                    const savingVes = priceInfo?.savingVes || 0;
                    const ivaRate = priceInfo?.ivaRate || 16;
                    const ivaType = priceInfo?.ivaType || 'excluded';
                    const basePriceVes = priceInfo?.discountedBaseVes || priceInfo?.baseVes || 0;

                    const totalItemVes = finalPriceVes * quantity;
                    const totalSaving = savingVes * quantity;

                    let ivaBadge = '';
                    if (ivaType === 'excluded') {
                      ivaBadge = `+${ivaRate}%`;
                    } else if (ivaType === 'included') {
                      ivaBadge = `IVA ${ivaRate}%`;
                    } else {
                      ivaBadge = 'Exento';
                    }

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-xl border"
                        style={{ borderColor: borderColor, backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' }}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden border shrink-0 flex items-center justify-center" style={{ borderColor: borderColor }}>
                          {itemImage ? (
                            <img src={itemImage} alt={item.name || item.title || 'Producto'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <ShoppingBag className="w-5 h-5 opacity-30" style={{ color: textColor }} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm truncate block`} style={{ color: textColor }}>
                              {item.name || item.title || 'Producto'}
                            </span>
                            {hasDiscount && (
                              <span 
                                className="px-2 py-0.5 rounded-lg text-[8px] font-black animate-pulse flex items-center gap-0.5"
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                }}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor" 
                                  className="w-3 h-3"
                                >
                                  <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                                </svg>
                                -{discountPercentage}%
                              </span>
                            )}
                            {ivaType !== 'exempt' && (
                              <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-white/60'}`}>
                                {ivaBadge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px]`} style={{ color: mutedColor }}>Cantidad: {quantity}</span>
                            {hasDiscount && totalSaving > 0 && (
                              <span className="text-[9px] font-medium text-emerald-400 flex items-center gap-0.5">
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor" 
                                  className="w-3 h-3"
                                  style={{ color: '#34d399' }}
                                >
                                  <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                                </svg>
                                Ahorro: Bs. {formatPrice(totalSaving)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {hasDiscount ? (
                            <>
                              <span className={`text-[10px] line-through opacity-50 block`} style={{ color: mutedColor }}>
                                Bs. {formatPrice(originalPriceVes * quantity)}
                              </span>
                              <span className={`font-bold text-sm block`} style={{ color: primaryColor }}>
                                Bs. {formatPrice(totalItemVes)}
                              </span>
                            </>
                          ) : (
                            <span className={`font-bold text-sm block`} style={{ color: primaryColor }}>
                              Bs. {formatPrice(totalItemVes)}
                            </span>
                          )}
                          {basePriceVes > 0 && (
                            <span className={`text-[9px]`} style={{ color: mutedColor }}>
                              Bs. {formatPrice(basePriceVes)} c/u (sin IVA)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`text-center py-6 text-xs ${mutedColor}`}>No hay productos seleccionados</div>
              )}
            </div>

            {/* 🔥 DESGLOSE DE IVA Y OFERTA */}
            {(hasIVA || hasAnyDiscount) && cartItems.length > 0 && (
              <div className="p-4 rounded-2xl border item-enter space-y-2" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                {/* 🔥 OFERTA - DESCUENTO APLICADO */}
                {hasAnyDiscount && totalSavingVes > 0 && (
                  <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.2)' }}>
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
                    <div className="flex items-center justify-between text-sm border-t pt-2 mt-2" style={{ borderColor: borderColor }}>
                      <span className="font-black uppercase" style={{ color: mutedColor }}>Total con descuento:</span>
                      <span className="text-lg font-black" style={{ color: '#34d399' }}>
                        Bs. {formatPrice(finalVes)}
                      </span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <span 
                        className="px-3 py-1 rounded-lg text-[10px] font-black animate-pulse flex items-center gap-1"
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          className="w-3.5 h-3.5"
                        >
                          <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                        </svg>
                        -{maxDiscountPercentage}% OFF
                      </span>
                    </div>
                  </div>
                )}

                {/* 🔥 IVA */}
                {hasIVA && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: mutedColor }}>Subtotal (sin IVA):</span>
                      <span className="font-medium" style={{ color: textColor }}>Bs. {formatPrice(totalBaseVes)}</span>
                    </div>
                    {totalIVA > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: mutedColor }}>IVA ({totalIvaRate}%):</span>
                        <span className="font-medium" style={{ color: textColor }}>Bs. {formatPrice(totalIVA)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: borderColor }}>
                      <span className="font-black uppercase" style={{ color: mutedColor }}>Total con IVA:</span>
                      <span className="text-xl font-black" style={{ color: primaryColor }}>Bs. {formatPrice(finalVes)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

          {/* 🔥 PAGO EN EFECTIVO — VUELTO / FALTA */}
          {isCashPayment && cashAmount > 0 && (
            <div
              className="p-4 rounded-2xl border item-enter space-y-2"
              style={{
                backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: mutedColor }}>Monto entregado</span>
                <span className="font-bold" style={{ color: textColor }}>
                  {(() => {
                    const paidVes = cashPaidVes;
                    const paidUsd = exchangeRateSafe > 0 ? paidVes / exchangeRateSafe : 0;
                    const d = formatBothCash(paidVes, paidUsd);
                    return (
                      <>
                        {d.primary}
                        <span className="ml-1 text-[10px] font-semibold" style={{ color: mutedColor }}>
                          ({d.secondary})
                        </span>
                      </>
                    );
                  })()}
                </span>
              </div>

              {hasCashChange && (() => {
                const d = formatBothCash(
                  cashChangeVes,
                  exchangeRateSafe > 0 ? cashChangeVes / exchangeRateSafe : 0,
                );
                return (
                  <div className="flex items-center justify-between text-sm pt-1.5 border-t" style={{ borderColor: borderColor }}>
                    <span className="font-bold" style={{ color: '#34d399' }}>
                      Vuelto
                    </span>
                    <span className="font-black" style={{ color: '#34d399' }}>
                      {d.primary}
                      <span className="ml-1 text-[10px] font-bold" style={{ color: isLight ? '#15803d' : '#4ade80' }}>
                        ({d.secondary})
                      </span>
                    </span>
                  </div>
                );
              })()}

              {hasCashMissing && (() => {
                const d = formatBothCash(
                  cashMissingVes,
                  exchangeRateSafe > 0 ? cashMissingVes / exchangeRateSafe : 0,
                );
                return (
                  <div className="flex items-center justify-between text-sm pt-1.5 border-t" style={{ borderColor: borderColor }}>
                    <span className="font-bold text-amber-400">Falta por pagar</span>
                    <span className="font-black text-amber-400">
                      {d.primary}
                      <span className="ml-1 text-[10px] font-semibold" style={{ color: mutedColor }}>
                        ({d.secondary})
                      </span>
                    </span>
                  </div>
                );
              })()}

              {isCashExact && (
                <div className="flex items-center justify-between text-sm pt-1.5 border-t" style={{ borderColor: borderColor }}>
                  <span className="font-bold" style={{ color: '#34d399' }}>
                    Pago exacto
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: mutedColor }}>
                    Sin vuelto
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TOTALES */}
          <div className="p-4 rounded-2xl border item-enter" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
            <div className="flex justify-between items-center">
              <span className={`font-black uppercase`} style={{ color: mutedColor }}>Total a Pagar:</span>
              <div className="text-right">
                <span className={`text-2xl font-black`} style={{ color: primaryColor }}>Bs. {formatPrice(finalVes)}</span>
                <span
                  className="text-xs block font-bold"
                  style={{ color: isLight ? '#15803d' : '#4ade80' }}
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
                onChange={(e) => setConfirmedData(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-2 cursor-pointer"
                style={{ accentColor: primaryColor }}
              />
              <span className={`text-sm`} style={{ color: mutedColor }}>
                Confirmo que los datos son correctos y deseo proceder con el pedido desde el Tótem de Autoservicio.
              </span>
            </label>
          </div>

          {/* FOOTER */}
          <div
            className="px-8 py-6 border-t flex items-center justify-end gap-4"
            style={{ borderColor: borderColor, backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-bold text-sm transition border cursor-pointer hover:opacity-80 active:scale-95"
              style={{ backgroundColor: itemBg, borderColor: borderColor, color: textColor }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!confirmedData || isSubmitting}
              className="px-8 py-3 rounded-2xl font-bold text-sm transition flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: confirmedData && !isSubmitting ? primaryColor : '#94a3b8',
                color: confirmedData && !isSubmitting ? '#ffffff' : '#64748b',
                animation: confirmedData && !isSubmitting ? 'pulseGlow 2s ease-in-out infinite' : 'none',
              }}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Procesando...</span></>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /><span>Confirmar Pedido</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }