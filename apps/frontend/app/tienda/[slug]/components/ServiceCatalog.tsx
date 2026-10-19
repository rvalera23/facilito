'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import TurnosRecientes from './TurnosRecientes';

interface ServiceCatalogProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  primary: string;
  isPrimaryLight: boolean;
  textMutedClass: string;
  filteredProducts: any[];
  textMainClass: string;
  isSecondaryLight: boolean;
  selectedService: any;
  setSelectedService: (service: any) => void;
  setSidebarOpen: (open: boolean) => void;
  onOpenCheckout?: (service: any) => void;
  onOpenDetail?: (service: any) => void;
  tenantConfig?: any;
  tenantId?: string;
  professionals?: any[]; // ✅ AGREGADO - Recibe profesionales desde page.tsx
  /** Resuelve la URL de una imagen. El padre puede pasarla por compatibilidad. */
  getImageUrl?: (item: any) => string | null;
  /** Lista de IDs de favoritos del usuario */
  favorites?: string[];
  /** Callback para togglear favorito. Recibe ID y tipo ('service') */
  onToggleFavorite?: (serviceId: string, itemType: 'service') => void;
  /** 🔥 Bloqueo para repartidores */
  isUserDriver?: boolean;
  /** 🔥 Bloqueo para profesionales */
  isUserProfessional?: boolean;
}

const SvgClock = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m-4-8a8 8 0 110 16 8 8 0 010-16z" />
  </svg>
);

const SvgCalendar = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SvgCheckCircle = ({ className = "w-3 h-3", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SvgMapPin = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SvgUsers = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SvgBuilding2 = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const SvgSparkles = ({ className = "w-4 h-4", color = "currentColor" }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.75 12l-1.5 2.25" />
  </svg>
);

const SvgStar = ({ className = "w-4 h-4", filled = false, color = "currentColor", style }: { className?: string; filled?: boolean; color?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} fill={filled ? color : "none"} stroke={color} strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const formatVESPrice = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('es-VE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const getServicePrices = (service: any) => {
  // ============================================================
  // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
  // Los servicios son exempt (sin IVA) pero pueden tener descuento
  // ============================================================
  if (service?._pricing && typeof service._pricing === 'object') {
    const p = service._pricing;
    return {
      VES: Number(p.totalPriceVES || 0),
      USD: Number(p.totalPriceUSD || 0),
      // 🔥 Campos de descuento
      hasDiscount: Boolean(p.hasDiscount),
      discountPercentage: Number(p.discountPercentage || 0),
      discountAmountVES: Number(p.discountAmountVES || 0),
      discountAmountUSD: Number(p.discountAmountUSD || 0),
      originalPriceVES: Number(p.originalPriceVES || p.totalPriceVES || 0),
      originalPriceUSD: Number(p.originalPriceUSD || p.totalPriceUSD || 0),
      basePriceVES: Number(p.basePriceVES || p.totalPriceVES || 0),
      basePriceUSD: Number(p.basePriceUSD || p.totalPriceUSD || 0),
    };
  }

  // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
  let pricesObj = service?.prices;

  if (typeof pricesObj === 'string') {
    try {
      pricesObj = JSON.parse(pricesObj);
    } catch {
      pricesObj = {};
    }
  }

  const vesVal = Number(
    pricesObj?.VES ?? 
    pricesObj?.ves ?? 
    service?.price ?? 
    service?.precio ?? 
    service?.price_ves ?? 
    0
  );

  let usdVal = Number(
    pricesObj?.USD ?? 
    pricesObj?.usd ?? 
    service?.priceUsd ?? 
    service?.price_usd ?? 
    service?.usd ?? 
    service?.attributes?.prices?.USD ?? 
    0
  );

  return {
    VES: !isNaN(vesVal) ? vesVal : 0,
    USD: !isNaN(usdVal) ? usdVal : 0,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmountVES: 0,
    discountAmountUSD: 0,
    originalPriceVES: !isNaN(vesVal) ? vesVal : 0,
    originalPriceUSD: !isNaN(usdVal) ? usdVal : 0,
    basePriceVES: !isNaN(vesVal) ? vesVal : 0,
    basePriceUSD: !isNaN(usdVal) ? usdVal : 0,
  };
};

export default function ServiceCatalog({
  categories,
  selectedCategory,
  setSelectedCategory,
  primary,
  isPrimaryLight,
  textMutedClass,
  filteredProducts,
  textMainClass,
  isSecondaryLight,
  selectedService,
  setSelectedService,
  setSidebarOpen,
  onOpenCheckout,
  onOpenDetail,
  tenantConfig,
  tenantId,
  professionals = [], // ✅ RECIBIR PROFESSIONALS DESDE page.tsx
  favorites = [],
  onToggleFavorite,
  isUserDriver = false,
  isUserProfessional = false,
  secondary,                    // ✅ NUEVO: color del tema para fondos
}: ServiceCatalogProps & { secondary?: string }) {

  // ❌ ELIMINADA la carga interna de profesionales
  // ✅ Ahora usa directamente 'professionals' que viene de page.tsx

  // 🔥 Helper: verificar si un servicio está en favoritos
  const isFavorite = (serviceId: string): boolean => {
    if (!serviceId || !Array.isArray(favorites)) return false;
    return favorites.includes(serviceId);
  };

  const getItemImage = (item: any) => {
    if (!item) return null;
    let rawImg = '';

    if (typeof item.coverImage === 'string' && item.coverImage.trim() !== '') {
      rawImg = item.coverImage;
    } else if (typeof item.image === 'string' && item.image.trim() !== '') {
      rawImg = item.image;
    } else if (typeof item.photo === 'string' && item.photo.trim() !== '') {
      rawImg = item.photo;
    } else if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
      const first = item.mediaUrls[0];
      if (typeof first === 'string' && first.trim() !== '') rawImg = first;
      else if (first?.url) rawImg = first.url;
      else if (first?.path) rawImg = first.path;
    } else {
      const directImages = item.images || item.existingImages || item.fileUrls || item.photos || item.files;
      if (Array.isArray(directImages) && directImages.length > 0) {
        const first = directImages[0];
        if (typeof first === 'string' && first.trim() !== '') rawImg = first;
        else if (first?.url) rawImg = first.url;
        else if (first?.path) rawImg = first.path;
        else if (first instanceof File || first instanceof Blob) return URL.createObjectURL(first);
      }
    }

    if (!rawImg) return null;
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

  const getServiceDescription = (item: any) => {
    if (!item) return '';
    return (
      item.description ||
      item.desc ||
      item.descripcion ||
      item.summary ||
      item.details ||
      item.detalle ||
      item.notes ||
      item.nota ||
      item.info ||
      ''
    );
  };

  const getServiceDuration = (item: any) => {
    return item?.durationMinutes || item?.duration || item?.duracion || item?.tiempo || null;
  };

  const getServiceFeatures = (item: any) => {
    const rawFeats = item?.features || item?.attributes || item?.tags || [];
    return Array.isArray(rawFeats) ? rawFeats : [];
  };

  const getServiceRating = (item: any) => {
    const rating = item?.rating || item?.calificacion || item?.stars || 0;
    return typeof rating === 'number' ? rating : parseFloat(rating) || 0;
  };

  const getServiceReviews = (item: any) => {
    return item?.reviewsCount || item?.resenas || item?.reviews || 0;
  };

  const formatDuration = (minutes: number | string) => {
    const mins = Number(minutes) || 0;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<SvgStar key={`full-${i}`} className="w-3.5 h-3.5" filled={true} color={primary} />);
    }
    if (hasHalfStar) {
      stars.push(<SvgStar key="half" className="w-3.5 h-3.5" filled={true} color={primary} style={{ opacity: 0.5 }} />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<SvgStar key={`empty-${i}`} className="w-3.5 h-3.5" filled={false} color={isSecondaryLight ? '#94a3b8' : '#475569'} />);
    }

    return stars;
  };

  const handleSelectService = (service: any) => {
    if (onOpenDetail) {
      onOpenDetail(service);
      return;
    }

    if (onOpenCheckout) {
      onOpenCheckout(service);
      return;
    }

    const serviceId = service.id || service._id;
    const currentSelectedId = selectedService?.id || selectedService?._id;
    const isSelected = currentSelectedId === serviceId;

    if (isSelected) {
      setSelectedService(null);
      setSidebarOpen(false);
    } else {
      setSelectedService(service);
      setSidebarOpen(true);
    }
  };

  const borderDynamic = isSecondaryLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

  // 🔥 Fondo dinámico para las cards (hereda del tema)
  const cardBgStyle = isSecondaryLight
    ? { backgroundColor: 'rgba(255, 255, 255, 0.90)' }
    : { backgroundColor: secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)' };

  const cardBgSoftStyle = isSecondaryLight
    ? { backgroundColor: 'rgba(255, 255, 255, 0.40)' }
    : { backgroundColor: secondary ? `${secondary}99` : 'rgba(0, 0, 0, 0.60)' };
      const uniqueCategories = categories.length > 1 ? [...new Set(categories)] : [];

  // Obtener modalidad
  const getModalityInfo = (modality: string) => {
    const modalityConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      'Presencial': { 
        icon: <SvgBuilding2 className="w-3.5 h-3.5" />, 
        label: 'Presencial',
        color: '#3b82f6'
      },
      'Online / Virtual': { 
        icon: <SvgUsers className="w-3.5 h-3.5" />, 
        label: 'Virtual',
        color: '#8b5cf6'
      },
      'A Domicilio': { 
        icon: <SvgMapPin className="w-3.5 h-3.5" />, 
        label: 'A Domicilio',
        color: '#f59e0b'
      },
      'Híbrido': { 
        icon: <SvgSparkles className="w-3.5 h-3.5" />, 
        label: 'Híbrido',
        color: '#ec4899'
      },
    };
    return modalityConfig[modality] || modalityConfig['Presencial'];
  };

  return (
    <div className="space-y-6 w-full">
      {/* Filtros de categoría */}
      {uniqueCategories.length > 1 && (
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 scrollbar-none">

          {uniqueCategories.map((cat: string) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={isSelected ? { backgroundColor: primary } : cardBgSoftStyle}
className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-transform duration-200 cursor-pointer border ${
                    isSelected
                    ? `${isPrimaryLight ? 'text-slate-950 font-black' : 'text-white'} border-transparent shadow-lg shadow-black/15`
                    : isSecondaryLight
                    ? 'border-slate-200/80 text-slate-700 hover:bg-white/70 shadow-sm'
                    : 'border-white/15 text-slate-300 hover:bg-white/10 shadow-sm'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: Servicios en tarjetas visuales (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {filteredProducts.length === 0 ? (
            <div 
              className={`rounded-2xl p-12 text-center text-xs italic border ${
                isSecondaryLight 
                  ? 'border-slate-200 text-slate-600 shadow-sm' 
                  : 'border-white/10 text-slate-400 shadow-lg'
              }`}
              style={isSecondaryLight 
                ? { backgroundColor: 'rgba(255, 255, 255, 0.40)' } 
                : { backgroundColor: secondary ? `${secondary}99` : 'rgba(0, 0, 0, 0.60)' }
              }
            >
              No se encontraron servicios disponibles en esta categoría.
            </div>
          ) : (
            filteredProducts.map((service: any) => {
              const serviceId = service.id || service._id;
              const resolvedImage = getItemImage(service);
              const description = getServiceDescription(service);
              const duration = getServiceDuration(service);
              const featuresList = getServiceFeatures(service);
              const rating = getServiceRating(service);
              const reviews = getServiceReviews(service);
              const prices = getServicePrices(service);

              const includes = service?.includes || service?.attributes?.includes || '';
              const modality = service?.serviceModality || service?.attributes?.serviceModality || 'Presencial';
              const maxCapacity = service?.maxCapacity || service?.attributes?.maxCapacity || 0;

              const formattedVES = formatVESPrice(prices.VES);
              const modalityInfo = getModalityInfo(modality);

              // Determinar si el servicio tiene imagen
              const hasImage = !!resolvedImage;

              return (
                <div
                  key={serviceId}
className={`rounded-2xl border transition-transform duration-300 overflow-hidden ${

  prices.hasDiscount ? 'border-2' : ''
                  } ${
                    isSecondaryLight
                      ? 'border-slate-200/80 hover:bg-white shadow-md'
                      : 'border-white/15 hover:bg-white/5 shadow-lg'
                  }`}
                  style={{
                    ...(isSecondaryLight 
                      ? { backgroundColor: 'rgba(255, 255, 255, 0.90)' } 
                      : { backgroundColor: secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)' }
                    ),
                    ...(prices.hasDiscount ? { borderColor: primary } : {}),
...(prices.hasDiscount ? { boxShadow: `0 0 12px -4px ${primary}30` } : {}),

}}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                    
                    {/* Columna de imagen - 4 columnas en desktop */}
                    <div className="md:col-span-4 h-52 md:h-auto relative overflow-hidden">
                      {hasImage ? (
                        <>
<img
  src={resolvedImage}
  alt={service.name || 'Servicio'}
  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
  loading="lazy"
  decoding="async"
  fetchPriority="low"
  onError={(e) => {
    const target = e.target as HTMLElement;
    target.style.display = 'none';
  }}
/>
                          {/* Overlay con badge de categoría */}
                          {service.category && (
                            <div className="absolute top-3 left-3">
                              <span 
className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md"

style={{ 
                                  backgroundColor: isSecondaryLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                                  color: isSecondaryLight ? '#1e293b' : '#f1f5f9',
                                  border: `1px solid ${isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`
                                }}
                              >
                                {service.category}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center opacity-40 bg-gradient-to-br from-slate-700/20 to-slate-900/20">
                          <SvgBuilding2 className="w-12 h-12" />
                          <span className="text-[10px] mt-2">Sin imagen</span>
                        </div>
                      )}

                                            {/* 🔥 BADGE DE DESCUENTO (esquina inferior izquierda) */}
                      {prices.hasDiscount && (
                        <div className="absolute bottom-3 left-3 z-10">
                                                   <span 
                            className="px-2 py-1 rounded-md text-[10px] font-black shadow-lg border"
                            style={{
                              backgroundColor: primary,
                              borderColor: primary,
                              color: isPrimaryLight ? '#030712' : '#ffffff',
                            }}
                          >
                            -{prices.discountPercentage}% OFF
                          </span>
                        </div>
                      )}


                      {/* 🔥 BOTÓN DE FAVORITO (esquina superior derecha) */}
                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(serviceId, 'service');
                          }}
                          title={isFavorite(serviceId) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-transform cursor-pointer shadow-sm hover:scale-110 active:scale-95 ${
                              isFavorite(serviceId)
                              ? 'bg-rose-500/90 border border-rose-300/40'
                              : isSecondaryLight
                              ? 'bg-white/85 border border-slate-200 hover:bg-white'
                              : 'bg-black/60 border border-white/20 hover:bg-black/80'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              isFavorite(serviceId)
                                ? 'text-white fill-white'
                                : isSecondaryLight
                                ? 'text-slate-700'
                                : 'text-white'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Columna de contenido - 8 columnas en desktop */}
                    <div className="md:col-span-8 p-5 md:p-6 flex flex-col">
                      
                      {/* Header: Nombre y rating */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-lg md:text-xl tracking-tight ${textMainClass} leading-tight`}>
                            {service.name || 'Servicio sin nombre'}
                          </h3>
                        </div>
                        {(rating > 0 || reviews > 0) && (
                          <div className="flex items-center gap-2 flex-shrink-0 bg-slate-100/50 dark:bg-white/5 px-3 py-1 rounded-full">
                            <span className="text-sm font-bold" style={{ color: primary }}>
                              {rating.toFixed(1)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {renderStars(rating)}
                            </div>
                            <span className={`text-[10px] ${textMutedClass}`}>
                              ({reviews})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadatos: Duración, Modalidad, Cupos */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {duration && (
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${textMutedClass}`}>
                            <SvgClock className="w-3.5 h-3.5" />
                            {formatDuration(duration)}
                          </span>
                        )}
                        <span 
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full"
                          style={{ 
                            color: modalityInfo.color,
                            backgroundColor: `${modalityInfo.color}15`
                          }}
                        >
                          {modalityInfo.icon}
                          {modalityInfo.label}
                        </span>
                        {maxCapacity > 0 && (
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${textMutedClass}`}>
                            <SvgUsers className="w-3.5 h-3.5" />
                            {maxCapacity} cupos
                          </span>
                        )}
                      </div>

                      {/* Descripción */}
                      {description && (
                        <div className={`text-sm leading-relaxed mb-3 ${textMutedClass} line-clamp-2`}>
                          {description}
                        </div>
                      )}

                      {/* Características / Features */}
                      {featuresList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {featuresList.slice(0, 4).map((feat: string, idx: number) => (
                            <span 
                              key={idx}
                              className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                                isSecondaryLight 
                                  ? 'bg-slate-100 text-slate-700 border-slate-200' 
                                  : 'bg-white/5 text-slate-300 border-white/10'
                              }`}
                            >
                              <SvgCheckCircle className="w-2.5 h-2.5 opacity-60" />
                              {feat}
                            </span>
                          ))}
                          {featuresList.length > 4 && (
                            <span className={`text-[10px] px-2.5 py-1 rounded-full ${textMutedClass}`}>
                              +{featuresList.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Incluye */}
                      {includes && (
                        <div className={`text-xs flex items-center gap-1.5 mb-3 ${textMutedClass}`}>
                          <span className="text-emerald-500 text-base">✓</span>
                          <span className="font-medium">Incluye:</span> {includes}
                        </div>
                      )}

                      {/* Footer: Precio y botón */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-3 border-t" style={{ borderColor: borderDynamic }}>
                      <div>
  <span className={`text-[9px] uppercase font-bold tracking-wider block ${textMutedClass}`}>Precio</span>
  
  {prices.hasDiscount ? (
    // 🔥 CON DESCUENTO: precio original tachado + precio final + badge
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs line-through opacity-50 ${textMutedClass}`}>
          Bs. {formatVESPrice(prices.originalPriceVES)}
        </span>
        <span className="font-black text-2xl" style={{ color: primary }}>
          Bs. {formattedVES}
        </span>

      </div>
      
      <span className="text-xs font-bold" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
        (${prices.USD.toFixed(2)} USD)
      </span>
      

    </>
  ) : (
    // 🔴 SIN DESCUENTO: precio normal
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-black text-2xl" style={{ color: primary }}>
        Bs. {formattedVES}
      </span>
      
      <span className="text-xs font-bold" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
        (${prices.USD.toFixed(2)} USD)
      </span>
    </div>
  )}
</div>
                        
                        {isUserDriver || isUserProfessional ? (
                          <div className={`px-5 py-2.5 rounded-xl text-xs font-bold border ${
                            isSecondaryLight
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          }`}>
                            {isUserDriver ? 'Los repartidores no pueden reservar' : 'Los profesionales no pueden reservar'}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectService(service);
                            }}
className={`px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-transform duration-200 cursor-pointer active:scale-95 ${
                                isPrimaryLight ? 'text-slate-950' : 'text-white'
                            }`}
                            style={{ backgroundColor: primary }}
                          >
                            <SvgCalendar className="w-4 h-4" />
                            Reservar ahora
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* COLUMNA DERECHA: Turnos Recientes (1/3) */}
        <div className="lg:col-span-1">
          <TurnosRecientes
            tenantId={tenantId || ''}
            primary={primary}
            textMainClass={textMainClass}
            textMutedClass={textMutedClass}
            isSecondaryLight={isSecondaryLight}
            cardBgClass={isSecondaryLight ? 'border-slate-200/80 shadow-sm' : 'border-white/15 shadow-lg'}
            secondary={secondary}
            onTurnoClick={(turno) => {
              console.log('🔄 [ServiceCatalog] Turno clickeado:', turno);
            }}
            professionals={professionals}
          />
        </div>

      </div>
    </div>
  );
}