// ============================================================
// ARCHIVO: components/cards/ProductCard.tsx
// Card reutilizable de producto, con soporte opcional de cercanía.
// ============================================================
'use client';

import React, { useState, useMemo, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl, getAllImages } from '@/lib/imageUtils';
import { DistanceBadge } from './DistanceBadge';

export const formatCategoryLabel = (cat: string): string => {
    if (!cat || cat === 'todos') return 'Todos';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

/**
 * 🔥 Trunca un texto a un máximo de caracteres (con "..." si excede)
 */
const truncateText = (text: string, maxLength: number = 90): string => {
  if (!text) return '';
  const clean = String(text).trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trimEnd() + '…';
};


// ============================================================
// 🔥 UTILIDADES DE PRECIO E IVA (reutilizadas de la tienda)
// ============================================================
const getProductPriceVes = (product: any, exchangeRate: number): number => {
  if (!product) return 0;
  if (product.priceUsd && Number(product.priceUsd) > 0) {
    return exchangeRate > 0 ? Number(product.priceUsd) * exchangeRate : Number(product.priceUsd);
  }
  if (product.prices?.USD && Number(product.prices.USD) > 0) {
    return exchangeRate > 0 ? Number(product.prices.USD) * exchangeRate : Number(product.prices.USD);
  }
  if (product.attributes?.prices?.USD && Number(product.attributes.prices.USD) > 0) {
    return exchangeRate > 0 ? Number(product.attributes.prices.USD) * exchangeRate : Number(product.attributes.prices.USD);
  }
  if (product.priceVes && Number(product.priceVes) > 0) return Number(product.priceVes);
  if (product.prices?.VES && Number(product.prices.VES) > 0) return Number(product.prices.VES);
  if (product.attributes?.prices?.VES && Number(product.attributes.prices.VES) > 0) return Number(product.attributes.prices.VES);
  if (product.price && Number(product.price) > 0) {
    const price = Number(product.price);
    const hasExplicitUsd = !!(product.priceUsd || product.prices?.USD || product.attributes?.prices?.USD);
    if (hasExplicitUsd && exchangeRate > 0) return price * exchangeRate;
    if (!hasExplicitUsd && price < 1000 && exchangeRate > 0) return price * exchangeRate;
    if (price > 1000) return price;
    return exchangeRate > 0 ? price * exchangeRate : price;
  }
  return 0;
};

const getProductPriceUsd = (product: any, exchangeRate: number): number => {
  if (!product) return 0;
  if (product.priceUsd && Number(product.priceUsd) > 0) return Number(product.priceUsd);
  if (product.prices?.USD && Number(product.prices.USD) > 0) return Number(product.prices.USD);
  if (product.attributes?.prices?.USD && Number(product.attributes.prices.USD) > 0) return Number(product.attributes.prices.USD);
  if (product.priceVes && Number(product.priceVes) > 0) {
    return exchangeRate > 0 ? Number(product.priceVes) / exchangeRate : Number(product.priceVes);
  }
  if (product.prices?.VES && Number(product.prices.VES) > 0) {
    return exchangeRate > 0 ? Number(product.prices.VES) / exchangeRate : Number(product.prices.VES);
  }
  if (product.attributes?.prices?.VES && Number(product.attributes.prices.VES) > 0) {
    return exchangeRate > 0 ? Number(product.attributes.prices.VES) / exchangeRate : Number(product.attributes.prices.VES);
  }
  if (product.price && Number(product.price) > 0) {
    const price = Number(product.price);
    const hasExplicitUsd = !!(product.priceUsd || product.prices?.USD || product.attributes?.prices?.USD);
    if (hasExplicitUsd) return price;
    if (price < 1000) return price;
    if (price > 1000 && exchangeRate > 0) return price / exchangeRate;
    return exchangeRate > 0 ? price / exchangeRate : price;
  }
  return 0;
};

const getIvaInfo = (product: any, exchangeRate: number, withDiscount: boolean = true) => {
  const rawPriceVes = getProductPriceVes(product, exchangeRate);
  const rawPriceUsd = getProductPriceUsd(product, exchangeRate);
  const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

  let basePriceVes = rawPriceVes;
  let basePriceUsd = rawPriceUsd;
  if (ivaType === 'included') {
    basePriceVes = rawPriceVes / (1 + ivaRate / 100);
    basePriceUsd = rawPriceUsd / (1 + ivaRate / 100);
  }

  let finalBaseVes = basePriceVes;
  let finalBaseUsd = basePriceUsd;
  let discountInfo: any = null;

  if (withDiscount) {
    const isOnSale = product?.onSale === true || product?.attributes?.onSale === true;
    let discountPercentage = Number(product?.discountPercentage || product?.attributes?.discountPercentage || 0);
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    if (isOnSale && discountPercentage > 0) {
      const discountFactor = 1 - discountPercentage / 100;
      let originalFinalVes = basePriceVes;
      let originalFinalUsd = basePriceUsd;
      if (ivaType === 'excluded') {
        originalFinalVes = basePriceVes * (1 + ivaRate / 100);
        originalFinalUsd = basePriceUsd * (1 + ivaRate / 100);
      } else if (ivaType === 'included') {
        originalFinalVes = rawPriceVes;
        originalFinalUsd = rawPriceUsd;
      }
      finalBaseVes = basePriceVes * discountFactor;
      finalBaseUsd = basePriceUsd * discountFactor;
      let discountedFinalVes = finalBaseVes;
      let discountedFinalUsd = finalBaseUsd;
      if (ivaType === 'excluded' || ivaType === 'included') {
        discountedFinalVes = finalBaseVes * (1 + ivaRate / 100);
        discountedFinalUsd = finalBaseUsd * (1 + ivaRate / 100);
      }
      discountInfo = {
        discountPercentage,
        originalPrice: Math.round(originalFinalVes * 100) / 100,
        originalPriceUsd: Math.round(originalFinalUsd * 100) / 100,
        finalPriceWithIVA: Math.round(discountedFinalVes * 100) / 100,
        finalPriceWithIVAUsd: Math.round(discountedFinalUsd * 100) / 100,
        savingVes: Math.round((originalFinalVes - discountedFinalVes) * 100) / 100,
        savingUsd: Math.round((originalFinalUsd - discountedFinalUsd) * 100) / 100,
      };
    }
  }

  let ivaAmountVes = 0;
  let ivaAmountUsd = 0;
  let priceWithIVAVes = finalBaseVes;
  let priceWithIVAUsd = finalBaseUsd;
  if (ivaType === 'excluded' || ivaType === 'included') {
    ivaAmountVes = finalBaseVes * (ivaRate / 100);
    ivaAmountUsd = finalBaseUsd * (ivaRate / 100);
    priceWithIVAVes = finalBaseVes + ivaAmountVes;
    priceWithIVAUsd = finalBaseUsd + ivaAmountUsd;
  }

  return {
    ivaType,
    ivaRate,
    basePriceVes: Math.round(finalBaseVes * 100) / 100,
    basePriceUsd: Math.round(finalBaseUsd * 100) / 100,
    ivaAmountVes: Math.round(ivaAmountVes * 100) / 100,
    ivaAmountUsd: Math.round(ivaAmountUsd * 100) / 100,
    priceWithIVAVes: Math.round(priceWithIVAVes * 100) / 100,
    priceWithIVAUsd: Math.round(priceWithIVAUsd * 100) / 100,
    display: ivaType === 'included' ? `IVA ${ivaRate}% Inc.` : ivaType === 'exempt' ? 'Exento' : `IVA ${ivaRate}% +`,
    displayShort: ivaType === 'included' ? 'IVA Inc.' : ivaType === 'exempt' ? 'Exento' : 'IVA +',
    badgeColor: ivaType === 'included' ? '#22c55e' : ivaType === 'exempt' ? '#64748b' : '#f59e0b',
    badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' : ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
    discountInfo,
  };
};

// ============================================================
// Card de Producto
// ============================================================
export const ProductCard = memo(({
  product,
  primary,
  secondary,                 // ✅ NUEVO
  isLight,
  isPrimaryLight,
  textMainClass,
  mutedText,
  cardBg,
  cardHover,
  innerCardBg,
  categoryBadge,
  featureBadge,
  exchangeRate,
  onCategoryClick,
  priority = false,
  proximity,
}: any) => {
  const [imageError, setImageError] = useState(false);

  // 🔥 Fondo dinámico de la card (hereda del tema)
  const cardBgStyle = useMemo(() => {
    if (isLight) return { backgroundColor: 'rgba(255, 255, 255, 0.80)' };
    return { backgroundColor: secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)' };
  }, [isLight, secondary]);

  const resolvedImage = useMemo(() => {
    try {
      return getImageUrl({ coverImage: product.coverImage, mediaUrls: product.mediaUrls });
    } catch {
      return product.coverImage || null;
    }
  }, [product.coverImage, product.mediaUrls]);

  const allImages = useMemo(() => {
    try {
      return getAllImages(product);
    } catch {
      return resolvedImage ? [resolvedImage] : [];
    }
  }, [product, resolvedImage]);

  const productName = product?.name || product?.nombre || 'Producto';
  const brand = product?.brand || product?.marca || '';
  const rawCategory = product?.category || product?.categoria || 'Categoría';
  const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);

  const featuresList = useMemo(() => {
    const raw = product?.features || product?.attributes || [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }, [product?.features, product?.attributes]);

  const ivaInfo = useMemo(() => getIvaInfo(product, exchangeRate, true), [product, exchangeRate]);

  const formatVESPrice = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '0,00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formattedVES = formatVESPrice(ivaInfo.priceWithIVAVes);
  const formattedBaseVES = formatVESPrice(ivaInfo.basePriceVes);

  const usdDisplay = useMemo(() => {
    if (ivaInfo.ivaType === 'excluded' && ivaInfo.ivaRate > 0) {
      return ivaInfo.priceWithIVAUsd.toFixed(2);
    }
    return ivaInfo.priceWithIVAUsd.toFixed(2);
  }, [ivaInfo]);

  return (
    <div
      className={`rounded-2xl p-4 flex flex-col transition-all duration-200 overflow-hidden group cursor-pointer relative border ${cardBg} ${cardHover} ${
        ivaInfo.discountInfo ? 'border-2' : ''
      }`}
      style={{
        contain: 'layout paint style',
        ...cardBgStyle,             // ✅ NUEVO
        ...(ivaInfo.discountInfo ? { borderColor: primary } : {}),
        ...(ivaInfo.discountInfo ? { boxShadow: `0 0 30px -5px ${primary}40` } : {}),
      }}
    >
      <div className="relative z-10 flex flex-col space-y-3">
        <div
          className={`relative w-full overflow-hidden border flex items-center justify-center shadow-inner rounded-2xl ${innerCardBg} shrink-0`}
          style={{ aspectRatio: '1/1', width: '100%', maxHeight: '320px', minHeight: '240px' }}
        >
          {resolvedImage && !imageError ? (
            <Image
              src={resolvedImage}
              alt={productName}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-opacity duration-300"
              onError={() => setImageError(true)}
              quality={60}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className={`flex flex-col items-center justify-center opacity-40 space-y-2 ${mutedText}`}>
              <span className="text-3xl">📦</span>
              <span className="text-xs">Sin imagen</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm rounded-2xl">
<span className="text-xs font-bold px-5 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 bg-white/90 text-slate-900">
  Ver detalles
</span>
          </div>

          <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1 max-w-[85%]">
            {proximity && (
              <DistanceBadge proximity={proximity} primaryColor={primary} />
            )}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCategoryClick?.(category); }}
                            className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm border cursor-pointer hover:opacity-80 transition ${categoryBadge}`}
            >
              {category}
            </button>
            {brand && (
              <span
                className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm"
                style={{ backgroundColor: primary, color: isPrimaryLight ? '#030712' : '#ffffff' }}
              >
                {brand}
              </span>
            )}
          </div>

          {ivaInfo.discountInfo && (
            <div className="absolute bottom-2 left-2 z-10">
              <span
                className="px-1.5 py-0.5 rounded-md text-[8px] font-bold backdrop-blur-sm shadow-sm border"
                style={{ backgroundColor: primary, borderColor: primary, color: isPrimaryLight ? '#030712' : '#ffffff' }}
              >
                -{ivaInfo.discountInfo.discountPercentage}% OFF
              </span>
            </div>
          )}

          {Number(product?.stock ?? product?.existencias ?? 99) <= 0 && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl">
              <span className="text-white text-sm font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/30 bg-black/60">
                Agotado
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-h-[32px] shrink-0">
          {allImages.slice(0, 4).map((imgUrl: string, imgIdx: number) => (
            <div
              key={imgIdx}
              style={{ contain: 'layout paint', ...(imgIdx === 0 ? { borderColor: primary } : {}) }}
              className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 shadow-sm ${
                imgIdx === 0
                  ? 'ring-1 ring-indigo-500/20'
                  : isLight ? 'border-slate-300 bg-white/80 opacity-70' : 'border-white/15 bg-black/40 opacity-70'
              }`}
            >
              <Image
                src={imgUrl}
                alt="Thumbnail"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                loading="lazy"
                quality={60}
              />
                                        </div>
          ))}
        </div>

        <div className="shrink-0">
          <h4 className={`font-black tracking-tight text-lg sm:text-xl leading-tight line-clamp-2 ${textMainClass}`}>
            {productName}
          </h4>

          {/* 🔥 Nombre de la tienda */}
          {product.tenant?.name && (
            <p
              className={`text-[10px] font-medium ${mutedText} truncate mt-1`}
              style={{ opacity: 0.75 }}
            >
              {product.tenant.name}
            </p>
          )}
        </div>

        <div className="shrink-0">
          <div className={`flex items-end justify-between gap-2 border-t pt-3 ${isLight ? 'border-slate-200/80' : 'border-white/10'}`}>
            <div className="min-w-0 flex-1">
              {ivaInfo.discountInfo ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] line-through opacity-50" style={{ color: textMainClass }}>
                      Bs. {formatVESPrice(ivaInfo.discountInfo.originalPrice)}
                    </span>
                    <span className="font-black tracking-tight text-xl" style={{ color: primary }}>
                      Bs. {formatVESPrice(ivaInfo.discountInfo.finalPriceWithIVA)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: textMainClass }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" style={{ color: '#f97316' }}>
                        <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                        <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                      </svg>
                      -{ivaInfo.discountInfo.discountPercentage}%
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: isLight ? '#065f46' : '#34d399' }}>
                    (${Number(ivaInfo.discountInfo.finalPriceWithIVAUsd || 0).toFixed(2)})
                  </span>
                  <div className={`text-[9px] ${mutedText} opacity-60 leading-none mt-0.5`}>
                    {ivaInfo.ivaType === 'included' ? (
                      <>IVA {ivaInfo.ivaRate}% incluido</>
                    ) : ivaInfo.ivaType === 'exempt' ? (
                      <>Exento de IVA</>
                    ) : (
                      <>Base: Bs. {formatVESPrice(ivaInfo.basePriceVes)} + {ivaInfo.ivaRate}% IVA</>
                    )}
                  </div>
                  <div className="text-[9px] text-emerald-500 font-medium mt-0.5">
                    Ahorro: Bs. {formatVESPrice(ivaInfo.discountInfo.savingVes)}
                  </div>
                </>
              ) : (
                <>
                  <span className={`text-[9px] uppercase font-bold tracking-wider block ${mutedText}`}>
                    {ivaInfo.ivaType === 'included' ? 'IVA Inc.' : ivaInfo.ivaType === 'exempt' ? 'Exento' : '+ IVA'}
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-black tracking-tight text-xl" style={{ color: primary }}>
                      Bs. {formattedVES}
                    </span>
                    <span className="text-xs font-bold" style={{ color: isLight ? '#065f46' : '#34d399' }}>
                      (${usdDisplay})
                    </span>
                  </div>
                  {ivaInfo.ivaType === 'excluded' && ivaInfo.ivaRate > 0 && (
                    <div className={`text-[9px] ${mutedText} opacity-60 leading-none mt-0.5`}>
                      Base: Bs. {formattedBaseVES} + {ivaInfo.ivaRate}%
                    </div>
                  )}
                  {ivaInfo.ivaType === 'included' && (
                    <div className={`text-[9px] ${mutedText} opacity-60 leading-none mt-0.5`}>
                      IVA {ivaInfo.ivaRate}% incluido
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className={`text-[9px] uppercase font-bold tracking-wider block ${mutedText}`}>STOCK</span>
              <div className={`text-sm font-bold px-2.5 py-1 rounded-lg border shadow-sm inline-flex items-center gap-1 ${
                isLight ? 'border-slate-200 bg-white/80 text-slate-800' : 'border-white/15 bg-black/40 text-slate-200'
              }`}>
                <span>{Number(product?.stock ?? product?.existencias ?? 99) > 0 ? Number(product?.stock ?? product?.existencias ?? 99) : '0'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
