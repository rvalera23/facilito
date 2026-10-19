'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, CreditCard, ArrowRight, ChevronUp, Trash2, Plus, Minus, X, Image as ImageIcon, Package, ChevronDown } from 'lucide-react';
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
  let pricesObj = product?.prices || product?.attributes?.prices || {};
  if (typeof pricesObj === 'string') {
    try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
  }

  // 🔥 PRECIO EN VES (BASE, SIN IVA) - INDEPENDIENTE
  let baseVes = Number(
    pricesObj?.VES ?? pricesObj?.ves ?? product?.priceVes ?? product?.price_ves ?? product?.price ?? product?.precio ?? 0
  );
  
  // 🔥 PRECIO EN USD (BASE, SIN IVA) - INDEPENDIENTE
  let baseUsd = Number(
    pricesObj?.USD ?? pricesObj?.usd ?? product?.priceUsd ?? product?.price_usd ?? product?.usd ?? 0
  );

  // ❌ ELIMINADO: NO CONVERTIR MONEDAS

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

  // 🔥 CALCULAR PRECIO ORIGINAL (SIN DESCUENTO) CON IVA PARA MOSTRAR TACHADO
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

  // 🔥 CALCULAR IVA SEGÚN EL TIPO
  if (ivaType === 'excluded') {
    // IVA NO incluido: se suma al precio base
    ivaAmountVes = discountedBaseVes * (ivaRate / 100);
    ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
    finalWithIVAVes = discountedBaseVes + ivaAmountVes;
    finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
  } else if (ivaType === 'included') {
    // 🔥 IVA INCLUIDO: el precio YA incluye IVA, NO sumar IVA otra vez
    finalWithIVAVes = discountedBaseVes;
    finalWithIVAUsd = discountedBaseUsd;
    ivaAmountVes = 0;
    ivaAmountUsd = 0;
  } else {
    // EXENTO: sin IVA
    finalWithIVAVes = discountedBaseVes;
    finalWithIVAUsd = discountedBaseUsd;
    ivaAmountVes = 0;
    ivaAmountUsd = 0;
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

export default function KioskoCart({
  cartItems = [],
  updateCartQty,
  removeFromCart,
  onProceedToPay,
  subtotal,
  subtotalVes,
  primary,
  secondary,
  isSecondaryLight,
}: any) {

  // 🔥 HOOKS SIEMPRE AL PRINCIPIO DEL COMPONENTE
  const context = useKioskContext();

  const [isOpen, setIsOpen] = useState(false);
  const [animateItems, setAnimateItems] = useState<{ [key: string]: boolean }>({});
  const [isCleaning, setIsCleaning] = useState(false);

  const safePrimary = primary || '#F59E0B';
  const totalItemsCount = cartItems.reduce((acc: number, i: any) => acc + Number(i.quantity || 1), 0);

  // 🔥 FUNCIÓN PARA CALCULAR IVA DEL CARRITO - CORREGIDA
  // 🔥 FUNCIÓN PARA CALCULAR IVA DEL CARRITO - CORREGIDA
  const calculateCartIVA = (items: any[]) => {
    let totalBaseVes = 0;
    let totalIVA = 0;
    let totalWithIVAVes = 0;
    let hasIncluded = false;
    let hasExcluded = false;
    let maxRate = 0;

    items.forEach((item: any) => {
      const quantity = Number(item?.quantity || 1);

      // ============================================================
      // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
      // ============================================================
      if (item?._pricing && typeof item._pricing === 'object') {
        const p = item._pricing;
        const ivaType = p.ivaType || 'excluded';
        const ivaRate = Number(p.ivaRate || 0);
        const basePriceVES = Number(p.basePriceVES || 0);
        const taxAmountVES = Number(p.taxAmountVES || 0);
        const totalPriceVES = Number(p.totalPriceVES || 0);

        totalBaseVes += basePriceVES * quantity;
        totalIVA += taxAmountVES * quantity;
        totalWithIVAVes += totalPriceVES * quantity;

        if (ivaType === 'included') hasIncluded = true;
        else if (ivaType === 'excluded') hasExcluded = true;

        if (ivaType !== 'exempt' && ivaRate > maxRate) {
          maxRate = ivaRate;
        }
        return; // saltar flujo viejo
      }

      // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
      const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
      const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
      
      let basePriceVes = 0;
      let pricesObj = item?.prices || item?.attributes?.prices || {};
      if (typeof pricesObj === 'string') {
        try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
      }
      
      basePriceVes = Number(
        pricesObj?.VES ?? pricesObj?.ves ?? item?.priceVes ?? item?.price_ves ?? item?.price ?? item?.precio ?? 0
      );
      
      if (basePriceVes === 0) {
        let usdPrice = Number(pricesObj?.USD ?? pricesObj?.usd ?? item?.priceUsd ?? item?.price_usd ?? 0);
                if (usdPrice > 0 && context?.exchangeRate && context.exchangeRate > 0) {
          basePriceVes = usdPrice * context.exchangeRate;
        }
      }

      let ivaAmount = 0;
      let priceWithIVA = basePriceVes;
      
      if (ivaType === 'excluded') {
        ivaAmount = basePriceVes * (ivaRate / 100);
        priceWithIVA = basePriceVes + ivaAmount;
        hasExcluded = true;
      } else if (ivaType === 'included') {
        ivaAmount = basePriceVes - (basePriceVes / (1 + ivaRate / 100));
        priceWithIVA = basePriceVes;
        hasIncluded = true;
      } else {
        ivaAmount = 0;
        priceWithIVA = basePriceVes;
      }

      totalBaseVes += (basePriceVes - ivaAmount) * quantity;
      totalIVA += ivaAmount * quantity;
      totalWithIVAVes += priceWithIVA * quantity;

      if (ivaType !== 'exempt' && ivaRate > maxRate) {
        maxRate = ivaRate;
      }
    });

    let displayType = '';
    let badgeBg = '';
    let badgeColor = '';

    if (hasIncluded && hasExcluded) {
      displayType = `IVA Mixto (${maxRate}%)`;
      badgeBg = 'rgba(139,92,246,0.15)';
      badgeColor = '#8b5cf6';
    } else if (hasIncluded) {
      displayType = `IVA ${maxRate}% Incluido`;
      badgeBg = 'rgba(34,197,94,0.15)';
      badgeColor = '#22c55e';
    } else if (hasExcluded && totalIVA > 0) {
      displayType = `IVA ${maxRate}% No Incluido`;
      badgeBg = 'rgba(251,191,36,0.15)';
      badgeColor = '#f59e0b';
    } else if (totalIVA === 0 && totalBaseVes > 0) {
      displayType = 'Exento de IVA';
      badgeBg = 'rgba(100,116,139,0.15)';
      badgeColor = '#64748b';
    } else {
      displayType = 'Sin IVA';
      badgeBg = 'rgba(100,116,139,0.15)';
      badgeColor = '#64748b';
    }

    return {
      totalBaseVes: Math.round(totalBaseVes * 100) / 100,
      totalIVA: Math.round(totalIVA * 100) / 100,
      totalWithIVAVes: Math.round(totalWithIVAVes * 100) / 100,
      displayType,
      badgeBg,
      badgeColor,
      totalIvaRate: maxRate,
      hasIVA: totalIVA > 0 || hasIncluded,
    };
  };

  // 🔥 FUNCIÓN PARA OBTENER PRECIOS DEL PRODUCTO - CON IVA INCLUIDO
  // 🔥 FUNCIÓN PARA OBTENER PRECIOS DEL PRODUCTO - CON IVA INCLUIDO
  const getProductPrices = (product: any) => {
    if (!product) return { VES: 0, USD: 0 };

    // ============================================================
    // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
    // ============================================================
    if (product?._pricing && typeof product._pricing === 'object') {
      const p = product._pricing;
      return {
        VES: Number(p.totalPriceVES || 0),
        USD: Number(p.totalPriceUSD || 0),
      };
    }

    // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
    let pricesObj = product?.prices || product?.attributes?.prices || {};

    if (typeof pricesObj === 'string') {
      try {
        pricesObj = JSON.parse(pricesObj);
      } catch {
        pricesObj = {};
      }
    }

    let vesVal = Number(
      pricesObj?.VES ??
      pricesObj?.ves ??
      product?.priceVes ??
      product?.price_ves ??
      product?.price ??
      product?.precio ??
      0
    );

    let usdVal = Number(
      pricesObj?.USD ??
      pricesObj?.usd ??
      product?.priceUsd ??
      product?.price_usd ??
      product?.usd ??
      0
    );

    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

    if (usdVal === 0 && vesVal > 0 && context?.exchangeRate && context.exchangeRate > 0) {
      usdVal = Math.round((vesVal / context.exchangeRate) * 100) / 100;
    }

    if (vesVal === 0 && usdVal > 0 && context?.exchangeRate && context.exchangeRate > 0) {
      vesVal = Math.round((usdVal * context.exchangeRate) * 100) / 100;
    }

    let priceWithIVAVes = vesVal;
    let priceWithIVAUsd = usdVal;

    if (ivaType === 'included') {
      priceWithIVAVes = vesVal;
      priceWithIVAUsd = usdVal;
    } else if (ivaType === 'excluded') {
      priceWithIVAVes = vesVal * (1 + ivaRate / 100);
      priceWithIVAUsd = usdVal * (1 + ivaRate / 100);
    } else {
      priceWithIVAVes = vesVal;
      priceWithIVAUsd = usdVal;
    }

    return {
      VES: Math.round(priceWithIVAVes * 100) / 100,
      USD: Math.round(priceWithIVAUsd * 100) / 100,
    };
  };

  // 🔥 CALCULAR IVA DEL CARRITO
  const ivaInfo = calculateCartIVA(cartItems);
  
  const finalVes = ivaInfo.totalWithIVAVes || subtotalVes || 0;
  
  let finalUsd = 0;
  
  if (context?.exchangeRate && context.exchangeRate > 0) {
    finalUsd = Math.round((finalVes / context.exchangeRate) * 100) / 100;
  }
  
  if (finalUsd === 0 && cartItems.length > 0) {
    let totalUsdFromItems = 0;
    cartItems.forEach((item: any) => {
      const prices = getProductPrices(item);
      const quantity = Number(item.quantity || 1);
      
      const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
      const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
      let priceWithIVAUsd = prices.USD;
      
      if (ivaType === 'excluded') {
        const ivaAmount = prices.USD * (ivaRate / 100);
        priceWithIVAUsd = prices.USD + ivaAmount;
      }
      
      totalUsdFromItems += priceWithIVAUsd * quantity;
    });
    finalUsd = Math.round(totalUsdFromItems * 100) / 100;
  }

  // 🔥 ANIMACIONES
  useEffect(() => {
    cartItems.forEach((item: any) => {
      const id = item.id || item._id;
      setAnimateItems(prev => ({ ...prev, [id]: true }));
      const timer = setTimeout(() => {
        setAnimateItems(prev => ({ ...prev, [id]: false }));
      }, 300);
      return () => clearTimeout(timer);
    });
  }, [cartItems]);

  useEffect(() => {
    const handleCleaning = () => {
      setIsCleaning(true);
      setTimeout(() => setIsCleaning(false), 500);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cartCleaning', handleCleaning);
      return () => window.removeEventListener('cartCleaning', handleCleaning);
    }
  }, []);

  const formatPrice = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getItemImage = (item: any) => {
    if (!item) return null;
    const possibleImages = [
      item.coverImage,
      item.image,
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

  // 🔥 COLORES
  const textColorValue = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedTextColorValue = isSecondaryLight ? '#64748b' : '#94a3b8';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const modalBgColor = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');
  const itemBgColor = isSecondaryLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';

  const modalStyle = {
    backgroundColor: modalBgColor,
    borderColor: borderColor,
    color: textColorValue,
  };

  // 🔥 MODAL CON TAMAÑO FIJO Y SCROLL INTERNO
// 🔥 MODAL - Overlay más claro
const dynamicModalOverlay = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 select-none';
  // 🔥 CONTENIDO DEL CARRITO
  const cartContent = (
    <div className={`transition-all duration-500 ${isCleaning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} flex flex-col flex-1 min-h-0`}>
      <div className="overflow-y-auto py-2 space-y-2 pr-2 flex-1" style={{ maxHeight: 'calc(60vh - 200px)' }}>
        {cartItems.length === 0 ? (
          <div className={`py-20 text-center text-xl font-bold italic opacity-70`} style={{ color: mutedTextColorValue }}>
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: safePrimary }} />
            Tu carrito está vacío. <br/>Selecciona productos del catálogo táctil.
          </div>
        ) : (
          cartItems.map((item: any, index: number) => {
            const itemId = item.id || item._id || `item-${index}`;
            const stockMax = Number(item.stock ?? 99);
            const isAnimating = animateItems[itemId];
            
            const prices = getProductPrices(item);
            const itemPriceVes = prices.VES;
            const itemPriceUsd = prices.USD;

            const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
            const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
            
            let displayPriceVes = itemPriceVes;
            let ivaBadge = '';
            
            if (ivaType === 'excluded') {
              displayPriceVes = itemPriceVes;
              ivaBadge = `+${ivaRate}%`;
            } else if (ivaType === 'included') {
              displayPriceVes = itemPriceVes;
              ivaBadge = `IVA ${ivaRate}%`;
            } else {
              displayPriceVes = itemPriceVes;
              ivaBadge = 'Exento';
            }

            const lineTotalVes = displayPriceVes * Number(item.quantity || 1);
            const lineTotalUsd = itemPriceUsd * Number(item.quantity || 1);

            const imageUrl = getItemImage(item);
            const productName = item.name || item.title || 'Producto';

            return (
              <div 
                key={itemId}
                className={`p-3 rounded-[2rem] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg transition-all duration-300 ${
                  isAnimating ? 'scale-105' : ''
                }`}
                style={{
                  backgroundColor: isAnimating ? `${safePrimary}15` : itemBgColor,
                  borderColor: isAnimating ? `${safePrimary}40` : borderColor,
                  transform: isAnimating ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border flex items-center justify-center shrink-0" style={{ borderColor: borderColor }}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={productName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 opacity-40" style={{ color: textColorValue }} />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className={`font-bold text-sm tracking-tight block`} style={{ color: textColorValue }}>
                      {productName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium opacity-70 block`} style={{ color: mutedTextColorValue }}>
                        Bs. {formatPrice(displayPriceVes)} c/u
                      </span>
                      {ivaType !== 'exempt' && (
                        <span 
                          className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${isSecondaryLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-white/60'}`}
                        >
                          {ivaBadge}
                        </span>
                      )}
                    </div>
                    {stockMax <= 3 && (
                      <span className="text-[8px] font-extrabold uppercase" style={{ color: safePrimary }}>
                        ¡Últimas {stockMax} unidades!
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right min-w-[70px]">
                    <span className={`font-bold text-base block`} style={{ color: safePrimary }}>
                      Bs. {formatPrice(lineTotalVes)}
                    </span>
                    <span className={`text-[10px] font-medium opacity-70 block`} style={{ color: mutedTextColorValue }}>
                      (${lineTotalUsd.toFixed(2)})
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <div 
                      className={`flex items-center space-x-1 rounded-xl p-1 border`}
                      style={{
                        backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                        borderColor: borderColor
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateCartQty(itemId, item.quantity - 1, stockMax)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer hover:bg-white/10 active:scale-95"
                        style={{ backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                      >
                        <Minus className="w-3.5 h-3.5" style={{ color: textColorValue }} />
                      </button>
                      <span className={`text-base font-black px-2`} style={{ color: textColorValue }}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(itemId, item.quantity + 1, stockMax)}
                        disabled={item.quantity >= stockMax}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${item.quantity >= stockMax ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-95'}`}
                        style={{ backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
                      >
                        <Plus className="w-3.5 h-3.5" style={{ color: textColorValue }} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart ? removeFromCart(itemId) : updateCartQty(itemId, 0, stockMax)}
                      className="p-2 rounded-xl hover:bg-rose-500/10 transition cursor-pointer hover:scale-110"
                      style={{ color: '#f43f5e' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 border-t space-y-3 flex-shrink-0" style={{ borderColor: borderColor }}>
        {ivaInfo.hasIVA && cartItems.length > 0 && (
          <div className="flex items-center justify-end px-2">
            <span 
              className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border`}
              style={{
                backgroundColor: ivaInfo.badgeBg,
                borderColor: `${ivaInfo.badgeColor}30`,
                color: ivaInfo.badgeColor
              }}
            >
              {ivaInfo.displayType}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between px-2">
          <span className={`font-black text-lg uppercase tracking-wider opacity-80`} style={{ color: isSecondaryLight ? '#475569' : '#94a3b8' }}>
            Total a Pagar:
          </span>
          <div className="text-right">
            <span className={`font-black text-2xl sm:text-3xl tracking-tight block`} style={{ color: safePrimary }}>
              Bs. {formatPrice(finalVes)}
            </span>
            <span className={`text-sm font-bold opacity-70 block`} style={{ color: mutedTextColorValue }}>
              (${finalUsd.toFixed(2)})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            onProceedToPay();
          }}
          disabled={cartItems.length === 0}
          className={`w-full py-4 rounded-[2.5rem] text-lg font-black uppercase tracking-wider transition flex items-center justify-center gap-3 shadow-2xl ${cartItems.length === 0 ? 'opacity-50 cursor-not-allowed border' : 'hover:opacity-95 active:scale-95 cursor-pointer'}`}
          style={{
            backgroundColor: cartItems.length === 0 ? 'rgba(100,116,139,0.3)' : safePrimary,
            color: cartItems.length === 0 ? '#94a3b8' : (isSecondaryLight ? '#0f172a' : '#ffffff'),
            borderColor: cartItems.length === 0 ? borderColor : 'transparent'
          }}
        >
          <CreditCard className="w-5 h-5" />
          <span>Proceder al Pago Seguro</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // 🔥 DETERMINAR COLOR DE FUENTE PARA EL BOTÓN SEGÚN EL TEMA
  const buttonTextColor = isSecondaryLight ? '#0f172a' : '#ffffff';

  return (
    <>
      {/* 🔥 BOTÓN FLOTANTE - IZQUIERDA, MÁS PEQUEÑO, FUENTE ADAPTABLE */}
      <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-xl flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 group"
          style={{
            backgroundColor: secondary || (isSecondaryLight ? '#ffffff' : '#0f172a'),
            borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
            color: buttonTextColor,
            boxShadow: `0 0 30px ${safePrimary}25`,
          }}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" style={{ color: safePrimary }} />
            {totalItemsCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center animate-pulse"
                style={{
                  backgroundColor: safePrimary,
                  color: isSecondaryLight ? '#0f172a' : '#ffffff',
                }}
              >
                {totalItemsCount}
              </span>
            )}
          </div>
          <span className={`font-bold text-xs tracking-wide`} style={{ color: buttonTextColor }}>
            {totalItemsCount > 0 ? `Orden (${totalItemsCount})` : 'Tu Orden'}
          </span>
          <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-1" style={{ color: safePrimary }} />
        </button>
      </div>

{/* 🔥 MODAL DEL CARRITO - TAMAÑO FIJO CON SCROLL INTERNO */}
{isOpen && (
  <div className={dynamicModalOverlay} onClick={() => setIsOpen(false)}>
    <div 
      className="w-full max-w-2xl mx-4 rounded-3xl border shadow-2xl flex flex-col max-h-[80vh] p-4 sm:p-6 animate-slide-up"
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: modalBgColor,
        borderColor: `${safePrimary}30`,
        boxShadow: `0 0 60px ${safePrimary}15`,
        color: textColorValue,
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b flex-shrink-0" style={{ borderColor: borderColor }}>
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-inner border"
            style={{ 
              backgroundColor: `${safePrimary}25`, 
              borderColor: `${safePrimary}30`,
              boxShadow: `0 0 60px ${safePrimary}15`,
            }}
          >
            <ShoppingBag className="w-5 h-5" style={{ color: safePrimary }} />
          </div>
          <div>
            <h3 className={`font-black text-xl sm:text-2xl tracking-tight`} style={{ color: textColorValue }}>
              Tu Orden Actual
            </h3>
            <p className={`text-[10px] font-medium opacity-80`} style={{ color: mutedTextColorValue }}>
              Terminal de Autoservicio - Resumen de Productos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className={`text-[10px] font-black px-3 py-1 rounded-2xl border flex items-center gap-1.5`}
            style={{
              backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
              borderColor: borderColor,
              color: textColorValue
            }}
          >
            <Package className="w-3.5 h-3.5" style={{ color: safePrimary }} />
            {totalItemsCount}
          </span>
          {ivaInfo.hasIVA && cartItems.length > 0 && (
            <span 
              className={`text-[8px] font-bold px-2 py-0.5 rounded-full border`}
              style={{
                backgroundColor: ivaInfo.badgeBg,
                borderColor: `${ivaInfo.badgeColor}30`,
                color: ivaInfo.badgeColor
              }}
            >
              {ivaInfo.displayType}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-2xl transition cursor-pointer hover:scale-105"
            style={{ 
              backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
              color: textColorValue
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONTENIDO DEL CARRITO */}
      {cartContent}
    </div>
  </div>
)}

      {/* ANIMACIONES ADICIONALES */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </>
  );
}