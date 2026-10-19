// ============================================================
// ARCHIVO: components/cards/ServiceCard.tsx
// Card reutilizable de servicio, con soporte opcional de cercanía.
// ============================================================
'use client';

import React, { useState, useMemo, memo } from 'react';
import Image from 'next/image';
import { getImageUrl, getAllImages } from '@/lib/imageUtils';
import { DistanceBadge } from './DistanceBadge';

// 🔥 HELPERS
// ============================================================
export const formatCategoryLabel = (cat: string): string => {
    if (!cat || cat === 'todos') return 'Todos';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

const formatPrice = (num: number): string => {
  if (isNaN(num) || num <= 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDuration = (minutes: number | string): string => {
  const mins = Number(minutes) || 0;
  if (mins <= 0) return '';
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${mins}min`;
};


// ============================================================
// 🔥 CARD DE SERVICIO (mismo estilo que la tienda)
// ============================================================
export const ServiceCard = memo(({
  service,
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
  onCategoryClick,
  priority = false,
  exchangeRate = 0,
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
      return getImageUrl({ coverImage: service.coverImage, mediaUrls: service.mediaUrls });
    } catch {
      return service.coverImage || null;
    }
  }, [service.coverImage, service.mediaUrls]);

  const allImages = useMemo(() => {
    try {
      return getAllImages(service);
    } catch {
      return resolvedImage ? [resolvedImage] : [];
    }
  }, [service, resolvedImage]);

  const serviceName = service?.name || service?.nombre || 'Servicio';
  const rawCategory = service?.category || service?.categoria || 'Servicio';
  const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);

  const originalPrice = Number(service.price) || 0;
  const discountPercentage = Number(service.discountPercentage) || 0;
  const hasDiscount = service.onSale && discountPercentage > 0;
  const finalPrice = hasDiscount ? originalPrice * (1 - discountPercentage / 100) : originalPrice;
  const saving = originalPrice - finalPrice;
  // 🔥 Precio en USD (asumiendo que service.price está en Bs)
  const finalPriceUsd = useMemo(() => {
    if (service?.priceUsd && Number(service.priceUsd) > 0) return Number(service.priceUsd);
    if (service?.prices?.USD && Number(service.prices.USD) > 0) return Number(service.prices.USD);
    if (finalPrice > 0 && exchangeRate > 0) {
      const val = finalPrice / exchangeRate;
      return isNaN(val) ? 0 : val;
    }
    return 0;
  }, [service?.priceUsd, service?.prices?.USD, finalPrice, exchangeRate]);

  const duration = formatDuration(service.durationMinutes);

  return (
    <div
      className={`rounded-2xl p-4 flex flex-col transition-all duration-400 overflow-hidden group cursor-pointer relative border ${cardBg} ${cardHover} ${
        hasDiscount ? 'border-2' : ''
      }`}
      style={{
        ...cardBgStyle,             // ✅ NUEVO
        ...(hasDiscount ? { borderColor: primary } : {}),
        ...(hasDiscount ? { boxShadow: `0 0 30px -5px ${primary}40` } : {}),
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
              alt={serviceName}
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
              <span className="text-3xl">🗓️</span>
              <span className="text-xs">Sin imagen</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm rounded-2xl">
            <span className="text-xs font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 bg-white/90 text-slate-900">
              Ver detalles
            </span>
          </div>

          <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1 max-w-[85%]">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCategoryClick?.(category); }}
              className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm border cursor-pointer hover:opacity-80 transition ${categoryBadge}`}
            >
              {category}
            </button>
          </div>

          {hasDiscount && (
            <div className="absolute bottom-2 left-2 z-10">
              <span
                className="px-1.5 py-0.5 rounded-md text-[8px] font-bold backdrop-blur-sm shadow-sm border"
                style={{ backgroundColor: primary, borderColor: primary, color: isPrimaryLight ? '#030712' : '#ffffff' }}
              >
                -{Math.round(discountPercentage)}% OFF
              </span>
            </div>
          )}

          {duration && (
            <div className="absolute top-2 right-2 z-10">
              <span
                className="px-2 py-1 rounded-md text-[9px] font-bold text-white shadow-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
              >
                ⏱ {duration}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-h-[32px] shrink-0">
          {allImages.slice(0, 4).map((imgUrl: string, imgIdx: number) => (
            <div
              key={imgIdx}
              style={imgIdx === 0 ? { borderColor: primary } : {}}
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
            {serviceName}
          </h4>

          {service.tenant?.name && (
            <p className={`text-[10px] font-medium ${mutedText} truncate mt-1`} style={{ opacity: 0.75 }}>
              {service.tenant.name}
            </p>
          )}

          {/* 🔥 Etiqueta "Servicio" oculta */}
        </div>

        <div className="shrink-0">
          <div className={`flex items-end justify-between gap-2 border-t pt-3 ${isLight ? 'border-slate-200/80' : 'border-white/10'}`}>
            <div className="min-w-0 flex-1">
              {hasDiscount ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] line-through opacity-50" style={{ color: textMainClass }}>
                      Bs. {formatPrice(originalPrice)}
                    </span>
                    <span className="font-black tracking-tight text-xl" style={{ color: primary }}>
                      Bs. {formatPrice(finalPrice)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: textMainClass }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" style={{ color: '#f97316' }}>
                        <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                        <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                      </svg>
                      -{Math.round(discountPercentage)}%
                    </span>
                  </div>
                  {finalPriceUsd > 0 && (
                    <span className="text-xs font-bold" style={{ color: isLight ? '#065f46' : '#34d399' }}>
                      (${finalPriceUsd.toFixed(2)})
                    </span>
                  )}
                  <div className="text-[9px] text-emerald-500 font-medium mt-0.5">
                    Ahorro: Bs. {formatPrice(saving)}
                  </div>
                </>
              ) : (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-black tracking-tight text-xl" style={{ color: primary }}>
                    Bs. {formatPrice(finalPrice)}
                  </span>
                  {finalPriceUsd > 0 && (
                    <span className="text-xs font-bold" style={{ color: isLight ? '#065f46' : '#34d399' }}>
                      (${finalPriceUsd.toFixed(2)})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {duration && (
                <div className="text-right">
                  <span className={`text-[9px] uppercase font-bold tracking-wider block ${mutedText}`}>DURACIÓN</span>
                  <div className={`text-sm font-bold px-2.5 py-1 rounded-lg border shadow-sm inline-flex items-center gap-1 ${
                    isLight ? 'border-slate-200 bg-white/80 text-slate-800' : 'border-white/15 bg-black/40 text-slate-200'
                  }`}>
                    <span>{duration}</span>
                  </div>
                </div>
              )}
              {proximity && (
                <DistanceBadge proximity={proximity} primaryColor={primary} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ServiceCard.displayName = 'ServiceCard';
