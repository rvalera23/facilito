'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { useTenantsContext } from '@/app/context/TenantsContext';
// ============================================================
// 🔥 FUNCIÓN PARA VERIFICAR HORARIO DE LA TIENDA
// ============================================================
const checkIfStoreIsOpen = (specificConfig: any) => {
  if (!specificConfig || typeof specificConfig !== 'object') {
    return { isOpen: true, label: 'Abierto' };
  }

  const isManuallyClosed = 
    specificConfig.is_manually_closed === true || 
    specificConfig.is_manually_closed === 'true' || 
    specificConfig.isManuallyClosed === true ||
    specificConfig.isManuallyClosed === 'true';

  if (isManuallyClosed) {
    return { isOpen: false, label: 'Cerrado' };
  }

  const daysMap: Record<string, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const now = new Date();
  const currentDayKey = daysMap[now.getDay()];
  const schedule = specificConfig.schedule || {};
  const todayConfig = schedule[currentDayKey];

  if (!todayConfig || todayConfig.closed) {
    return { isOpen: false, label: 'Cerrado' };
  }

  const parseTimeToMinutes = (timeValue: any, meridiemValue: any) => {
    if (!timeValue) return null;

    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      const parts = timeValue.split(':');
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) || 0;
      
      if (timeValue.toLowerCase().includes('pm') && h < 12) h += 12;
      if (timeValue.toLowerCase().includes('am') && h === 12) h = 0;
      
      return h * 60 + m;
    }

    if (typeof timeValue !== 'undefined' && meridiemValue) {
      let h = parseInt(timeValue, 10);
      const m = 0;
      const mer = String(meridiemValue).trim().toUpperCase();

      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;

      return h * 60 + m;
    }

    return null;
  };

  const openStr = todayConfig.open || todayConfig.openTime || specificConfig.open || '08:00';
  const closeStr = todayConfig.close || todayConfig.closeTime || specificConfig.close || '17:00';

  const openTimeMinutes = parseTimeToMinutes(openStr, todayConfig.openMeridiem || specificConfig.openMeridiem) ?? 480;
  const closeTimeMinutes = parseTimeToMinutes(closeStr, todayConfig.closeMeridiem || specificConfig.closeMeridiem) ?? 1020;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  if (currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes) {
    return { isOpen: true, label: 'Abierto' };
  } else {
    return { isOpen: false, label: 'Cerrado' };
  }
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL - TIENDAS RELACIONADAS
// ============================================================
interface RelatedStoresSectionProps {
  textColorClass: string;
  mutedTextColorClass: string;
  primaryColor: string;
  secondaryColor: string;
  isSecondaryLight: boolean;
  backgroundCardBg: string;
  currentStoreId?: string;
  currentStoreNiche?: string;
  currentStoreCategory?: string;
  limit?: number;
  excludeCurrentStore?: boolean;
  title?: string;
  subtitle?: string;
  // ✅ NUEVA PROP: getImageUrl desde el padre
  getImageUrl?: (item: any) => string | null;
}

export default function RelatedStoresSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
  secondaryColor,
  isSecondaryLight,
  backgroundCardBg,
  currentStoreId,
  currentStoreNiche,
  currentStoreCategory,
  limit = 5,
  excludeCurrentStore = true,
  title = 'Tiendas relacionadas',
  subtitle = 'Descubre otros comercios en la misma categoría',
  getImageUrl, // ✅ RECIBIR DEL PADRE
}: RelatedStoresSectionProps) {
  const [allStores, setAllStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLight = isSecondaryLight;
    const { tenants: allTenants, isLoading: tenantsLoading } = useTenantsContext();

  useEffect(() => {
    if (tenantsLoading) {
      setIsLoading(true);
      return;
    }

    const filtered = allTenants.filter((store: any) => {
      const modelType = store.model_type || store.modelType || store.work_modality || store.workModality;
      return modelType !== 'service';
    });

    setAllStores(filtered);
    setIsLoading(false);
  }, [allTenants, tenantsLoading]);

  // 🔥 FILTRAR TIENDAS RELACIONADAS
  const relatedStores = useMemo(() => {
    let filtered = [...allStores];

    if (excludeCurrentStore && currentStoreId) {
      filtered = filtered.filter(store => store.id !== currentStoreId && store._id !== currentStoreId);
    }

    filtered = filtered.map(store => {
      let relevanceScore = 0;
      
      if (currentStoreNiche && store.niche === currentStoreNiche) {
        relevanceScore += 10;
      }
      
      if (currentStoreCategory && store.category === currentStoreCategory) {
        relevanceScore += 8;
      }
      
      if (currentStoreNiche && store.niche) {
        const nicheWords = currentStoreNiche.toLowerCase().split(/[_\-\s]+/);
        const storeNicheWords = store.niche.toLowerCase().split(/[_\-\s]+/);
        const commonWords = nicheWords.filter(w => storeNicheWords.includes(w));
        relevanceScore += commonWords.length * 2;
      }
      
      return { ...store, relevanceScore };
    });

    filtered = filtered.filter(store => (store.relevanceScore || 0) > 0);
    filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return filtered.slice(0, limit);
  }, [allStores, currentStoreId, currentStoreNiche, currentStoreCategory, excludeCurrentStore, limit]);

const displayStores = relatedStores;
const totalSlides = displayStores.length;

// 🔥 RESPONSIVE: DETECTAR COLUMNAS SEGÚN TAMAÑO DE PANTALLA
const [slidesToShow, setSlidesToShow] = useState(4);

useEffect(() => {
  const updateSlides = () => {
    const width = window.innerWidth;
    if (width < 640) {
      setSlidesToShow(1); // móvil: 1 columna
    } else if (width < 768) {
      setSlidesToShow(2); // tablet pequeña: 2 columnas
    } else if (width < 1024) {
      setSlidesToShow(3); // tablet: 3 columnas
    } else {
      setSlidesToShow(4); // escritorio: 4 columnas
    }
  };

  updateSlides();
  window.addEventListener('resize', updateSlides);
  return () => window.removeEventListener('resize', updateSlides);
}, []);

const visibleSlides = slidesToShow;
const effectiveSlides = slidesToShow;

  useEffect(() => {
    if (totalSlides > visibleSlides) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % (totalSlides - visibleSlides + 1));
      }, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalSlides, visibleSlides]);

  useEffect(() => {
    if (isHovered && intervalRef.current) {
      clearInterval(intervalRef.current);
    } else if (!isHovered && totalSlides > visibleSlides) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % (totalSlides - visibleSlides + 1));
      }, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, totalSlides, visibleSlides]);

  if (isLoading || allStores.length === 0 || relatedStores.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(totalSlides - visibleSlides, prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.min(index, totalSlides - visibleSlides));
  };

  const borderColor = isLight ? `${primaryColor}30` : `${primaryColor}30`;

  return (
    <div className="w-full py-2 mt-4">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }}
            >
              <Store className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div>
              <span className={`text-[13px] font-black tracking-tight ${textColorClass}`}>
                {title}
              </span>
              <span className={`text-[9px] block ${mutedTextColorClass}`}>
                {subtitle}
              </span>
            </div>
          </div>
          <span 
            className={`text-[9px] font-bold px-3 py-1.5 rounded-full`}
            style={{ 
              backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              color: mutedTextColorClass
            }}
          >
            {displayStores.length} tiendas
          </span>
        </div>

        {/* Carrusel */}
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
style={{ transform: `translateX(-${currentIndex * (100 / effectiveSlides)}%)` }}
            >
              {displayStores.map((store) => {
                const storeId = store.id || store._id;
                const specificConfig = store.specific_config || store.specificConfig || {};
                const status = checkIfStoreIsOpen(specificConfig);
                
                const storeBanner = store.bannerImage || store.bannerUrl || store.banner;
                const processedBanner = getImageUrl && storeBanner
                  ? getImageUrl({ banner: storeBanner })
                  : storeBanner;
                const processedLogo = getImageUrl
                  ? getImageUrl({ logo: store.logoUrl })
                  : store.logoUrl;

                return (
                  <div 
                    key={storeId}
                    className="flex-shrink-0 px-2"
style={{ width: `${100 / effectiveSlides}%` }}                  >
                    <Link
                      href={`/tienda/${store.slug}`}
                      className="group relative p-4 rounded-[2rem] border transition-transform duration-300 hover:-translate-y-1.5 flex flex-col overflow-hidden h-[120px]"
                                            style={{
                        backgroundColor: backgroundCardBg,
                        borderColor: borderColor,
                        boxShadow: `0 8px 20px -10px ${primaryColor}20`,
                        willChange: 'transform',
                                            }}
                    >
                      {processedBanner && (
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                          <div 
                            className="absolute inset-0 w-full h-full bg-cover bg-right opacity-10"
                                                        style={{ backgroundImage: `url(${processedBanner})` }} 
                          />
                          <div 
                            className="absolute inset-0 w-full h-full"
                            style={{ 
                              background: `linear-gradient(270deg, ${backgroundCardBg} 30%, ${backgroundCardBg}bb 70%, ${backgroundCardBg}66 100%)` 
                            }}
                          />
                        </div>
                      )}

                      <div className="absolute top-2 right-3 z-20">
                        <span 
                          className={`text-[7px] font-bold uppercase tracking-wider ${
                            status?.isOpen ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {status?.label || 'Abierto'}
                        </span>
                      </div>

                      <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex items-start space-x-2.5">
                        <div 
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border shadow-md"
                                                    style={{ 
                            borderColor: `${primaryColor}50`, 
                            backgroundColor: backgroundCardBg,
                          }}
                        >
                          {processedLogo ? (
                            <img
                              src={processedLogo}
                              alt={store.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              width="36"
                              height="36"
                            />
                          ) : (
                            <span className="font-black text-sm" style={{ color: primaryColor }}>
                              {store.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                          <div className="flex-1 min-w-0">
                            <h3 
                              className={`text-sm font-bold leading-tight ${textColorClass} group-hover:opacity-90 transition-opacity mb-1.5`}
                                                            title={store.name}
                            >
                              {store.name?.length > 25 ? store.name.slice(0, 25) + '...' : store.name}
                            </h3>
                            {store.slogan ? (
                              <p 
                                className={`text-[10px] font-medium leading-snug ${mutedTextColorClass} line-clamp-1`} 
                                style={{ opacity: 0.85 }}
                                title={store.slogan}
                              >
                                {store.slogan}
                              </p>
                            ) : (
                              <p className={`text-[10px] font-medium ${mutedTextColorClass}`} style={{ opacity: 0.6 }}>
                                tienda/{store.slug}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="relative z-10 mt-auto border-t border-slate-500/10 pt-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-wide transition-opacity duration-300 group-hover:opacity-85" style={{ color: primaryColor }}>
                            Visitar tienda &rarr;
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controles de navegación */}
          {totalSlides > visibleSlides && (
            <>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-transform hover:scale-110 disabled:opacity-25 disabled:cursor-not-allowed -ml-2 ${
                                    isLight ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-black/70 border-white/20 text-white'
                } border`}
                style={{ transform: 'translateY(-50%)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= totalSlides - visibleSlides}
                className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-transform hover:scale-110 disabled:opacity-25 disabled:cursor-not-allowed -mr-2 ${
                                    isLight ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-black/70 border-white/20 text-white'
                } border`}
                style={{ transform: 'translateY(-50%)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Indicadores de paginación */}
        {totalSlides > visibleSlides && (
          <div className="flex justify-center gap-1.5 pt-3">
            {Array.from({ length: Math.ceil(totalSlides / visibleSlides) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx * visibleSlides)}
                className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                  Math.floor(currentIndex / visibleSlides) === idx 
                    ? 'w-6' 
                    : 'w-1.5'
                }`}
                style={{
                  backgroundColor: Math.floor(currentIndex / visibleSlides) === idx 
                    ? primaryColor 
                    : isLight 
                      ? 'rgba(0,0,0,0.12)' 
                      : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}