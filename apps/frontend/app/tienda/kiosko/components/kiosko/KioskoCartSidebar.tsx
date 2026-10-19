'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, CreditCard, ArrowRight, Trash2, Plus, Minus, X, Image as ImageIcon, Package, Tag } from 'lucide-react';
import { useKioskContext } from './KioskStoreLayout';

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
      displayBadge: hasDiscount ? `-${discountPercentage}%` : '',
      isOnSale: hasDiscount,
    };
  }

  // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
  let pricesObj = product?.prices || product?.attributes?.prices || {};
  if (typeof pricesObj === 'string') {
    try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
  }

  // 🔥 OBTENER PRECIO BASE EN VES (SIN IVA)
  let baseVes = Number(
    pricesObj?.VES ?? pricesObj?.ves ?? product?.priceVes ?? product?.price_ves ?? product?.price ?? product?.precio ?? 0
  );
  
  // 🔥 OBTENER PRECIO BASE EN USD (SIN IVA) - INDEPENDIENTE
  let baseUsd = Number(
    pricesObj?.USD ?? pricesObj?.usd ?? product?.priceUsd ?? product?.price_usd ?? product?.usd ?? 0
  );

  // ❌ ELIMINAR CONVERSIONES ENTRE MONEDAS
  // NO se debe convertir VES ↔ USD

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

  // 🔥 CALCULAR PRECIO ORIGINAL (CON IVA) PARA MOSTRAR TACHADO
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

  // 🔥 APLICAR DESCUENTO A LA BASE (SIN IVA)
  if (hasDiscount) {
    const factor = 1 - discountPercentage / 100;
    discountedBaseVes = baseVes * factor;
    discountedBaseUsd = baseUsd * factor;
  }

  // 🔥 CALCULAR IVA SOBRE LA BASE CON DESCUENTO
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
    // 🔥 IVA INCLUIDO: el precio YA incluye IVA
    // El precio base ya es el precio con IVA
    finalWithIVAVes = discountedBaseVes;
    finalWithIVAUsd = discountedBaseUsd;
    ivaAmountVes = 0;
    ivaAmountUsd = 0;
  } else {
    // EXENTO
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
    displayBadge: hasDiscount ? `-${discountPercentage}%` : '',
    isOnSale: hasDiscount,
  };
};

export default function KioskoCartSidebar({
  cartItems = [],
  updateCartQty,
  removeFromCart,
  onProceedToPay,
  subtotal,
  subtotalVes,
  primary,
  secondary,
  isSecondaryLight,
  formatPrice,
}: any) {

  const context = useKioskContext();
  const safePrimary = primary || '#F59E0B';
  const totalItemsCount = cartItems.reduce((acc: number, i: any) => acc + Number(i.quantity || 1), 0);

const calculateCartIVA = (items: any[]) => {
  let totalBaseVes = 0;
  let totalIVA = 0;
  let totalWithIVAVes = 0;
  let hasIncluded = false;
  let hasExcluded = false;
  let maxRate = 0;

  items.forEach((item: any) => {
    const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
    
    // 🔥 USAR EL PRECIO QUE YA VIENE CON IVA DEL PRODUCTO
    const priceInfo = getProductPriceWithIVAAndDiscount(item, context?.exchangeRate || 0);
    if (!priceInfo) return;
    
    const quantity = Number(item?.quantity || 1);
    
    // 🔥 PRECIO FINAL CON IVA Y DESCUENTO (YA CALCULADO)
    const priceWithIVA = priceInfo.finalWithIVAVes;
    const basePrice = priceInfo.discountedBaseVes;
    
    // 🔥 EXTRAER EL IVA DEL PRECIO FINAL
    let ivaAmount = 0;
    if (ivaType === 'excluded') {
      ivaAmount = basePrice * (ivaRate / 100);
      hasExcluded = true;
    } else if (ivaType === 'included') {
      // EL PRECIO YA INCLUYE IVA
      ivaAmount = priceWithIVA - basePrice;
      hasIncluded = true;
    } else {
      ivaAmount = 0;
    }

    totalBaseVes += basePrice * quantity;
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

  const ivaInfo = calculateCartIVA(cartItems);
  
  const finalVes = ivaInfo.totalWithIVAVes || subtotalVes || 0;
  
// 🔥 CALCULAR finalUsd DIRECTAMENTE DESDE LOS ITEMS (NO CONVERTIR DESDE VES)
let finalUsd = 0;
if (cartItems.length > 0) {
  cartItems.forEach((item: any) => {
    const quantity = Number(item.quantity || 1);
    const priceInfo = getProductPriceWithIVAAndDiscount(item, context?.exchangeRate || 0);
    if (priceInfo) {
      finalUsd += priceInfo.finalWithIVAUsd * quantity;
    }
  });
  finalUsd = Math.round(finalUsd * 100) / 100;
}

  // 🔥 CALCULAR AHORRO TOTAL
  let totalSavingVes = 0;
  let hasAnyDiscount = false;
  let maxDiscount = 0;

  cartItems.forEach((item: any) => {
    const priceInfo = getProductPriceWithIVAAndDiscount(item, context?.exchangeRate || 0);
    if (priceInfo?.hasDiscount) {
      hasAnyDiscount = true;
      totalSavingVes += priceInfo.savingVes * (item.quantity || 1);
      if (priceInfo.discountPercentage > maxDiscount) {
        maxDiscount = priceInfo.discountPercentage;
      }
    }
  });

  const getItemImage = (item: any) => {
    if (!item) return null;
    const possibleImages = [
      item.coverImage, item.image, item.photo,
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

  const textColorValue = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedTextColorValue = isSecondaryLight ? '#64748b' : '#94a3b8';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const itemBgColor = isSecondaryLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';

  const formatPriceLocal = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatFn = formatPrice || formatPriceLocal;

  return (
<div 
  className="rounded-3xl border pt-4 pb-5 px-5 shadow-xl backdrop-blur-md flex flex-col mt-3 sm:mt-6 overflow-hidden"
  style={{
    backgroundColor: secondary
      ? (isSecondaryLight ? 'rgba(255,255,255,0.9)' : `${secondary}E6`)
      : (isSecondaryLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.7)'),
          borderColor: borderColor,
    color: textColorValue,
    borderRadius: '24px',
    // 🔥 Altura máxima del sidebar = viewport - top sticky (90) - margen (20)
    maxHeight: 'calc(100vh - 130px)',
  }}
>
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: borderColor }}>
        <div className="flex items-center gap-2">
          <div 
            className="p-2 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${safePrimary}20`, color: safePrimary }}
          >
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-black text-lg tracking-tight`} style={{ color: textColorValue }}>
              Tu Orden
            </h3>
            <p className={`text-xs font-medium`} style={{ color: mutedTextColorValue }}>
              {totalItemsCount} productos
            </p>
          </div>
        </div>
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
      </div>

      {/* LISTA DE PRODUCTOS — scroll interno limitado */}
      <div
        className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2 pr-1 scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {cartItems.length === 0 ? (
          <div className={`py-12 text-center text-sm font-medium opacity-60`} style={{ color: mutedTextColorValue }}>
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: safePrimary }} />
            Tu carrito está vacío
          </div>
        ) : (
          cartItems.map((item: any, index: number) => {
            const itemId = item.id || item._id || `item-${index}`;
            const stockMax = Number(item.stock ?? 99);
            const quantity = Number(item.quantity || 1);
            
            const priceInfo = getProductPriceWithIVAAndDiscount(item, context?.exchangeRate || 0);
            const hasDiscount = priceInfo?.hasDiscount || false;
            const discountPercentage = priceInfo?.discountPercentage || 0;
            const finalPriceVes = priceInfo?.finalWithIVAVes || 0;
            const finalPriceUsd = priceInfo?.finalWithIVAUsd || 0;
            const originalPriceVes = priceInfo?.originalFinalVes || 0;
            const savingVes = priceInfo?.savingVes || 0;
            
            const lineTotalVes = finalPriceVes * quantity;
            const lineTotalUsd = finalPriceUsd * quantity;
            const totalSaving = savingVes * quantity;

            const imageUrl = getItemImage(item);
            const productName = item.name || item.title || 'Producto';

            return (
              <div 
                key={itemId}
                className="p-3 rounded-xl border flex items-center gap-3 transition-all"
                style={{
                  backgroundColor: itemBgColor,
                  borderColor: borderColor,
                }}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center" style={{ borderColor: borderColor }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 opacity-40" style={{ color: textColorValue }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-sm truncate`} style={{ color: textColorValue }}>
                      {productName}
                    </span>
                    {hasDiscount && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[7px] font-black flex items-center gap-0.5"
                        style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        -{discountPercentage}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasDiscount ? (
                      <>
                        <span className={`text-[9px] line-through opacity-50`} style={{ color: mutedTextColorValue }}>
                          Bs. {formatFn(originalPriceVes)}
                        </span>
                        <span className={`font-bold text-sm`} style={{ color: safePrimary }}>
                          Bs. {formatFn(finalPriceVes)}
                        </span>
                      </>
                    ) : (
                      <span className={`font-bold text-sm`} style={{ color: safePrimary }}>
                        Bs. {formatFn(finalPriceVes)}
                      </span>
                    )}
                    <span className={`text-[9px] font-medium opacity-60`} style={{ color: mutedTextColorValue }}>
                      (${finalPriceUsd.toFixed(2)})
                    </span>
                  </div>
                  {hasDiscount && totalSaving > 0 && (
                    <div className="text-[8px] font-medium flex items-center gap-0.5" style={{ color: '#34d399' }}>
                      <Tag className="w-2.5 h-2.5" />
                      Ahorro: Bs. {formatFn(totalSaving)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div 
                    className={`flex items-center rounded-lg p-0.5 border`}
                    style={{
                      backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                      borderColor: borderColor
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => updateCartQty?.(itemId, quantity - 1, stockMax)}
                      className="w-7 h-7 rounded-md flex items-center justify-center transition hover:bg-white/10 active:scale-95"
                    >
                      <Minus className="w-3 h-3" style={{ color: textColorValue }} />
                    </button>
                    <span className={`text-sm font-black px-1.5`} style={{ color: textColorValue }}>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty?.(itemId, quantity + 1, stockMax)}
                      disabled={quantity >= stockMax}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition ${quantity >= stockMax ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 active:scale-95'}`}
                    >
                      <Plus className="w-3 h-3" style={{ color: textColorValue }} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart?.(itemId)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                    style={{ color: '#f43f5e' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER DEL CARRITO — fijo abajo, no encoge */}
      <div
        className="pt-4 border-t space-y-3 flex-shrink-0"
        style={{
          borderColor: borderColor,
          marginBottom: '-5px',
          paddingBottom: '5px'
        }}
      >
            {hasAnyDiscount && totalSavingVes > 0 && (
          <div className="flex items-center justify-between p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#34d399' }}>
              <Tag className="w-3.5 h-3.5" />
              Ahorro:
            </span>
            <span className="font-bold text-sm" style={{ color: '#34d399' }}>
              Bs. {formatFn(totalSavingVes)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className={`font-black text-sm uppercase tracking-wider opacity-70`} style={{ color: mutedTextColorValue }}>
            Total:
          </span>
          <div className="text-right">
            <span className={`font-black text-xl`} style={{ color: safePrimary }}>
              Bs. {formatFn(finalVes)}
            </span>
            <span className={`text-[10px] font-medium block opacity-60`} style={{ color: mutedTextColorValue }}>
              (${finalUsd.toFixed(2)})
            </span>
          </div>
        </div>

<button
  type="button"
  onClick={() => {
    if (cartItems.length > 0) {
      onProceedToPay?.();
    }
  }}
  disabled={cartItems.length === 0}
  className={`w-full py-4 rounded-2xl text-base font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xl ${
    cartItems.length === 0 
      ? 'opacity-50 cursor-not-allowed border' 
      : 'hover:opacity-95 active:scale-95 cursor-pointer'
  }`}
  style={{
    backgroundColor: cartItems.length === 0 ? 'rgba(100,116,139,0.3)' : safePrimary,
    color: cartItems.length === 0 ? '#94a3b8' : (isSecondaryLight ? '#0f172a' : '#ffffff'),
    borderColor: cartItems.length === 0 ? borderColor : 'transparent',
    borderRadius: '16px', // ← Agrega esto
  }}
>
          <span>PAGAR</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}