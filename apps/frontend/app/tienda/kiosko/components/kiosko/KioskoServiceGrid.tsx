'use client';

import React, { useState, useMemo } from 'react';
import { useKioskContext } from './KioskStoreLayout';

interface KioskoServiceGridProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  primary: string;
  isPrimaryLight: boolean;
  textMutedClass: string;
  filteredServices: any[];
  textMainClass: string;
  isSecondaryLight: boolean;
  onSelectService: (service: any) => void;
  selectedServiceId?: string;
  exchangeRate?: number;
  getImageUrl?: (item: any) => string | null;
}

// ============================================================
// HELPERS DE FORMATO
// ============================================================

const formatDuration = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
};

const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============================================================
// HELPERS DE COLOR
// ============================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ensureContrast(color: string, bgColor: string, minRatio = 3): string {
  const fgLum = getLuminance(color);
  const bgLum = getLuminance(bgColor);
  const ratio = fgLum > bgLum ? (fgLum + 0.05) / (bgLum + 0.05) : (bgLum + 0.05) / (fgLum + 0.05);
  if (ratio >= minRatio) return color;
  const bgIsLight = bgLum > 0.5;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const target = bgIsLight ? { r: 20, g: 20, b: 20 } : { r: 245, g: 245, b: 245 };
  const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const mixed = {
    r: mix(rgb.r, target.r, 0.6),
    g: mix(rgb.g, target.g, 0.6),
    b: mix(rgb.b, target.b, 0.6),
  };
  return `#${[mixed.r, mixed.g, mixed.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ============================================================
// ICONOS SVG LOCALES
// ============================================================

const IconClock = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCalendar = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconCheckCircle = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconUsers = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconBuilding = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M9 21V9h6v12" />
    <path d="M9 13h6M9 17h6" />
  </svg>
);

const IconMapPin = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconSparkles = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
  </svg>
);

// ============================================================
// COMPONENTE
// ============================================================

export default function KioskoServiceGrid({
  categories,
  selectedCategory,
  setSelectedCategory,
  primary,
  isPrimaryLight,
  textMutedClass,
  filteredServices,
  textMainClass,
  isSecondaryLight,
  onSelectService,
  selectedServiceId,
  exchangeRate = 1,
  getImageUrl: getImageUrlProp,
}: KioskoServiceGridProps) {
  const { tenant, getImageUrl: contextGetImageUrl } = useKioskContext();

  const safePrimary = primary || '#F59E0B';

  // ============================================================
  // COLORES CON CONTRASTE GARANTIZADO
  // ============================================================
  // Igual que en la cartelera: si el primary no contrasta con el fondo
  // del panel, se ajusta hasta que se lea. Sin perder la identidad.
  // ============================================================
  const panelSolidBg = isSecondaryLight ? '#ffffff' : '#0a0e18';
  const accentReadable = ensureContrast(safePrimary, panelSolidBg, 3.5);

  const textColor = isSecondaryLight ? 'text-slate-900' : 'text-white';
  const mutedText = isSecondaryLight ? 'text-slate-600' : 'text-slate-300';

  // Panel sólido para el borde derecho de acento
  const cardBg = isSecondaryLight
    ? 'bg-white/90 border-slate-200/70 shadow-xl backdrop-blur-md'
    : 'bg-black/40 border-white/10 text-white shadow-2xl backdrop-blur-md';

  const innerCardBg = isSecondaryLight
    ? 'bg-white/50 border-slate-200/60'
    : 'bg-black/30 border-white/10';

  const categoryBadge = isSecondaryLight
    ? 'bg-white/80 border-slate-200 text-slate-800'
    : 'bg-black/60 border-white/20 text-white';

  const uniqueCategories = categories.length > 1 ? [...new Set(categories)] : [];

  // ============================================================
  // PRECIOS
  // ============================================================
  const getServicePrices = useMemo(() => {
    return (service: any): { VES: number; USD: number } => {
      if (!service) return { VES: 0, USD: 0 };

      const attrs = service?.attributes || {};
      let pricesObj = attrs.prices || service?.prices || {};

      if (typeof pricesObj === 'string') {
        try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
      }

      const vesVal = Number(
        pricesObj?.VES ??
        pricesObj?.ves ??
        attrs.price_ves ??
        service?.price_ves ??
        service?.price ??
        0
      );

      let usdVal = Number(
        pricesObj?.USD ??
        pricesObj?.usd ??
        attrs.priceUsd ??
        attrs.usdReference ??
        service?.priceUsd ??
        service?.price_usd ??
        0
      );

      if (usdVal === 0 && vesVal > 0 && exchangeRate > 0) {
        usdVal = Math.round((vesVal / exchangeRate) * 100) / 100;
      }

      let finalVes = vesVal;
      if (vesVal === 0 && usdVal > 0 && exchangeRate > 0) {
        finalVes = Math.round((usdVal * exchangeRate) * 100) / 100;
      }

      return { VES: finalVes, USD: usdVal };
    };
  }, [exchangeRate]);

  // ============================================================
  // IMAGEN
  // ============================================================
  const getServiceImage = (service: any): string | null => {
    if (!service) return null;

    if (getImageUrlProp && typeof getImageUrlProp === 'function') {
      try {
        const result = getImageUrlProp(service);
        if (result) return result;
      } catch (e) {}
    }

    if (contextGetImageUrl && typeof contextGetImageUrl === 'function') {
      try {
        const result = contextGetImageUrl(service);
        if (result) return result;
      } catch (e) {}
    }

    const possibleImages = [
      service.coverImage,
      service.image,
      service.photo,
      ...(service.mediaUrls || []),
      ...(service.images || []),
      ...(service.existingImages || []),
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

    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) return rawImg;
    if (rawImg.includes('uploads/')) {
      const relativePath = rawImg.split('uploads/').pop();
      return `${cleanBase}/uploads/${relativePath}`;
    }
    const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
    return `${cleanBase}/uploads/${cleanPath}`;
  };

  // ============================================================
  // MODALIDAD
  // ============================================================
  // El color lo dicta el tenant (accentReadable). Lo que diferencia
  // cada modalidad es el ícono + el label, no el color.
  // ============================================================
  const getModalityInfo = (modality: string): { icon: React.ReactNode; label: string } => {
    const configs: Record<string, { icon: React.ReactNode; label: string }> = {
      'Presencial': { icon: <IconBuilding className="w-3.5 h-3.5" />, label: 'Presencial' },
      'Online / Virtual': { icon: <IconSparkles className="w-3.5 h-3.5" />, label: 'Virtual' },
      'A Domicilio': { icon: <IconMapPin className="w-3.5 h-3.5" />, label: 'A Domicilio' },
      'Híbrido': { icon: <IconSparkles className="w-3.5 h-3.5" />, label: 'Híbrido' },
    };
    return configs[modality] || configs['Presencial'];
  };

  return (
    <div className="w-full max-w-none px-3 sm:px-6 py-4 space-y-6 select-none">

      {/* CATEGORÍAS */}
      {uniqueCategories.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none w-full">
          {uniqueCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={isSelected ? { backgroundColor: accentReadable, color: '#fff' } : {}}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border backdrop-blur-md ${
                  isSelected
                    ? 'border-transparent shadow-lg'
                    : isSecondaryLight
                    ? 'bg-white/40 border-slate-200/80 text-slate-700 hover:bg-white/70'
                    : 'bg-white/10 border-white/15 text-slate-300 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
        {filteredServices.length === 0 ? (
          <div className={`col-span-2 rounded-2xl p-12 text-center text-xs italic backdrop-blur-md border shadow-xl ${
            isSecondaryLight
              ? 'bg-white/60 border-slate-200/80 text-slate-900 shadow-slate-200/50'
              : 'bg-black/40 border-white/15 text-slate-100 shadow-black/40'
          }`}>
            No se encontraron servicios disponibles en esta categoría.
          </div>
        ) : (
          filteredServices.map((service: any) => {
            const serviceId = service.id || service._id;
            const imageUrl = getServiceImage(service);
            const prices = getServicePrices(service);
            const duration = service.durationMinutes || service.duration || 60;
            const modality = service.serviceModality || service.attributes?.serviceModality || 'Presencial';
            const modalityInfo = getModalityInfo(modality);
            const isSelected = selectedServiceId === serviceId;
            const category = service?.category || service?.categoria || '';

            return (
              <div
                key={serviceId}
                className={`rounded-2xl p-4 md:p-5 flex flex-col transition-all duration-300 overflow-hidden group relative border w-full ${cardBg} ${
                  isSelected ? 'scale-[1.02]' : ''
                } hover:shadow-2xl hover:scale-[1.02]`}
                style={{
                  borderColor: isSelected ? `${accentReadable}66` : undefined,
                  boxShadow: isSelected ? `0 8px 32px ${accentReadable}33` : undefined,
                }}
                onClick={() => onSelectService(service)}
              >
                <div className="space-y-3 relative z-10 w-full">

                  {/* IMAGEN */}
<div className={`relative w-full aspect-[16/9] overflow-hidden border flex items-center justify-center rounded-xl ${innerCardBg}`}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={service.name || service.nombre || 'Servicio'}
                        className="w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Sin+Imagen';
                        }}
                      />
                    ) : (
                      <div className={`flex flex-col items-center justify-center opacity-40 space-y-2 ${mutedText}`}>
                        <IconCalendar className="w-10 h-10" />
                        <span className="text-xs font-bold">Sin imagen</span>
                      </div>
                    )}

                    {/* BADGE CATEGORÍA */}
                    {category && (
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm border backdrop-blur-md ${categoryBadge}`}>
                          {category}
                        </span>
                      </div>
                    )}

                    {/* BADGE DURACIÓN */}
                    {duration && (
                      <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
                        <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm border flex items-center gap-1 ${
                          isSecondaryLight
                            ? 'bg-white/80 border-slate-200 text-slate-700'
                            : 'bg-black/60 border-white/20 text-white'
                        }`}>
                          <IconClock className="w-3 h-3" />
                          {formatDuration(duration)}
                        </span>
                      </div>
                    )}

                    {/* INDICADOR SELECCIÓN */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 pointer-events-none">
                        <span
                          className="text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5"
                          style={{ backgroundColor: accentReadable }}
                        >
                          <IconCheckCircle className="w-3.5 h-3.5" />
                          <span>Seleccionado</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* TÍTULO */}
                  <div className="space-y-0.5">
                    <h3 className={`font-extrabold tracking-tight leading-tight text-base sm:text-lg ${textColor} line-clamp-1`}>
                      {service.name || service.nombre || 'Servicio sin nombre'}
                    </h3>
                  </div>

                  {/* ESPECIFICACIONES */}
                  <div className={`space-y-1.5 pt-1 ${isSecondaryLight ? 'border-t border-slate-200/60' : ''}`}>
                    <div className="flex items-center gap-3 text-xs">
                      <div className={`flex items-center gap-1.5 ${mutedText}`}>
                        <IconClock className="w-3.5 h-3.5" />
                        <span className="font-medium">{formatDuration(duration)}</span>
                      </div>
                      <span className={`w-px h-4 ${isSecondaryLight ? 'bg-slate-300/40' : 'bg-white/20'}`} />
                      <div
                        className="flex items-center gap-1.5 font-medium"
                        style={{ color: accentReadable }}
                      >
                        {modalityInfo.icon}
                        <span>{modalityInfo.label}</span>
                      </div>
                    </div>

                    {service.description && (
                      <p className={`text-[10px] sm:text-xs font-medium line-clamp-2 ${mutedText}`}>
                        {service.description}
                      </p>
                    )}

                    {service.professionalName && (
                      <div className={`flex items-center gap-1.5 text-[10px] ${mutedText}`}>
                        <IconUsers className="w-3 h-3" />
                        <span className="font-medium">{service.professionalName}</span>
                      </div>
                    )}
                  </div>

                  {/* PRECIO */}
                  <div className={`pt-2 flex flex-col gap-1 border-t ${isSecondaryLight ? 'border-slate-200/60' : 'border-white/10'}`}>
                    <span className={`text-[8px] uppercase font-extrabold tracking-wider block opacity-70 ${mutedText}`}>
                      PRECIO
                    </span>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="font-extrabold tracking-tight text-lg sm:text-xl"
                          style={{ color: accentReadable }}
                        >
                          Bs. {formatPrice(prices.VES)}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold ${mutedText}`}>
                          (${Number(prices.USD).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÓN SELECCIONAR */}
                <div
                  className={`mt-3 pt-3 border-t relative z-10 w-full ${isSecondaryLight ? 'border-slate-200/60' : 'border-white/10'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onSelectService(service)}
                    style={{ backgroundColor: accentReadable }}
                    className="w-full py-3 px-4 rounded-xl text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-md tracking-wide text-white hover:opacity-95 active:scale-95 cursor-pointer"
                  >
                    <IconCalendar className="w-4 h-4" />
                    <span>Seleccionar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}