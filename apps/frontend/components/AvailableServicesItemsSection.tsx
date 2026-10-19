'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { useNearby } from '@/hooks/useNearby';
import { useLocationContext } from '@/app/context/LocationContext';
import { MapPin } from 'lucide-react';
import NearbyEmptyState from './cards/NearbyEmptyState';
import { DistanceBadge } from '@/components/cards/DistanceBadge';

// ============================================================
// HELPERS
// ============================================================
const formatPrice = (num: number): string => {
  if (isNaN(num) || num <= 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCategoryLabel = (cat: string): string => {
  if (!cat || cat === 'todos') return 'Todos los servicios';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
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
// CARD DE SERVICIO (idéntica a app/servicios/page.tsx)
// ============================================================
const ServiceCard = ({
  service,
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  exchangeRate,
  isLight,
  proximity,
}: any) => {
  const imageUrl = useMemo(() => {
    try {
      return getImageUrl({
        coverImage: service.coverImage,
        mediaUrls: service.mediaUrls,
      });
    } catch {
      return service.coverImage || null;
    }
  }, [service.coverImage, service.mediaUrls]);

  const duration = formatDuration(service.durationMinutes);
  const tenantSlug = service.tenant?.slug;
  const storeHref = tenantSlug ? `/tienda/${tenantSlug}?servicio=${service.id}` : '#';

  return (
    <Link
      href={storeHref}
      className="group relative p-3 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderColor: `${primaryColor}30`,
        boxShadow: `0 15px 35px -10px ${primaryColor}12`,
      }}
    >
      <div
        className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2.5 border"
        style={{ borderColor: `${primaryColor}20`, backgroundColor: 'rgba(0,0,0,0.05)' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">🗓️</span>
          </div>
        )}

        {/* 🔥 CERCANÍA */}
        {proximity && (
          <div className="absolute top-2 left-2 z-10">
            <DistanceBadge proximity={proximity} primaryColor={primaryColor} />
          </div>
        )}

        {duration && (
          <div
            className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          >
            ⏱ {duration}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <h3 className={`text-xs font-bold leading-tight ${textColorClass} line-clamp-2`}>
          {service.name}
        </h3>

        {service.tenant?.name && (
          <p className={`text-[10px] font-medium ${mutedTextColorClass} truncate`} style={{ opacity: 0.75 }}>
            {service.tenant.name}
          </p>
        )}

        {service.category && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider self-start px-1.5 py-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            {service.category}
          </span>
        )}

        <div className="mt-auto pt-2 flex items-baseline gap-1.5">
          <span className="text-sm font-black" style={{ color: primaryColor }}>
            Bs. {formatPrice(Number(service.price) || 0)}
          </span>
        </div>
      </div>
    </Link>
  );
};

// ============================================================
// 🔥 SIDEBAR DE CATEGORÍAS
// ============================================================
const CategorySidebar = ({
  categories,
  selectedCategory,
  onSelect,
  searchInput,
  onSearchChange,
  primaryColor,
  mutedTextColorClass,
  totalServices,
}: any) => {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div
        className="p-4 rounded-3xl border space-y-4"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderColor: `${primaryColor}20`,
        }}
      >
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${mutedTextColorClass}`}>
            Buscar
          </label>
          <div className="relative">
            <span
              className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none opacity-50"
              style={{ color: primaryColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border outline-none transition-all"
              style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderColor: `${primaryColor}20`,
              }}
            />
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${mutedTextColorClass}`}>
            Categorías
          </label>
          <div className="flex flex-col gap-0.5 max-h-[400px] overflow-y-auto pr-1">
            <button
              onClick={() => onSelect('todos')}
              className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${
                selectedCategory === 'todos' ? 'font-bold' : ''
              }`}
              style={{
                backgroundColor: selectedCategory === 'todos' ? `${primaryColor}20` : 'transparent',
                color: selectedCategory === 'todos' ? primaryColor : undefined,
              }}
            >
              <span className="truncate">Todos</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: selectedCategory === 'todos' ? primaryColor : 'rgba(255,255,255,0.08)',
                  color: selectedCategory === 'todos' ? '#fff' : undefined,
                }}
              >
                {totalServices}
              </span>
            </button>

            {categories.map((cat: { name: string; count: number }) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => onSelect(cat.name)}
                  className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${
                    isSelected ? 'font-bold' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${primaryColor}20` : 'transparent',
                    color: isSelected ? primaryColor : undefined,
                  }}
                >
                  <span className="truncate">{formatCategoryLabel(cat.name)}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isSelected ? primaryColor : 'rgba(255,255,255,0.08)',
                      color: isSelected ? '#fff' : undefined,
                    }}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
function AvailableServicesItemsSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
  secondaryColor,            // ✅ Recibido del padre (por compatibilidad)
  backgroundCardBg,
  isLight = false,
}: any) {
  const { rates } = useExchangeRateContext();
  const exchangeRate = rates.USD > 0 ? rates.USD : 0;

  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [totalServices, setTotalServices] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const { location, clearLocation } = useLocationContext();
  const nearby = useNearby<any>('services', { radiusKm: 100, limit: 100 });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        if (nearby.isActive) {
          if (nearby.items) {
            setServices(nearby.items);
            setVisibleCount(8);
            setIsLoading(false);
          } else if (nearby.isLoading) {
            setIsLoading(true);
          } else if (nearby.error) {
const res = await apiFetch('/services/public/all?limit=12&offset=0');
            if (res.ok) {
              const data = await res.json();
              const items = Array.isArray(data?.items) ? data.items : [];
              const cats = Array.isArray(data?.categories) ? data.categories : [];
              setServices(items);
              setCategories(cats);
              setTotalServices(Number(data?.total) || items.length);
            }
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        const res = await apiFetch('/services/public/all?limit=12&offset=0');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          const cats = Array.isArray(data?.categories) ? data.categories : [];

          setServices(items);
          setCategories(cats);
          setTotalServices(Number(data?.total) || items.length);
        }
      } catch (error) {
        console.error('Error cargando servicios:', error);
      } finally {
        if (!nearby.isActive || !nearby.isLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchServices();
  }, [nearby.isActive, nearby.items, nearby.isLoading, nearby.error]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return services.filter((s) => {
      const matchesCategory =
        selectedCategory === 'todos' || s.category === selectedCategory;

      const matchesSearch =
        !query ||
        s.name?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.tenant?.name?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  const visibleServices = useMemo(() => {
    return filteredServices.slice(0, visibleCount);
  }, [filteredServices, visibleCount]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setVisibleCount(8);
  }, []);

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setVisibleCount(8);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  }, []);

  const handleShowLess = useCallback(() => {
    setVisibleCount(8);
  }, []);

  const hasMore = visibleServices.length < filteredServices.length;
  const hasServices = filteredServices.length > 0;

  if (isLoading) {
    return (
      <section className="w-full py-12 px-6 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: primaryColor }}
              />
              <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                Cargando servicios...
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (services.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <span
            className="text-xs font-bold uppercase tracking-[0.25em] block mb-2"
            style={{ color: primaryColor }}
          >
            Catálogo de servicios
          </span>
          <h2 className={`text-3xl sm:text-5xl font-black tracking-tight ${textColorClass} mb-3`}>
            ¿Buscas un profesional o servicio?
          </h2>
          <p className={`text-sm sm:text-base ${mutedTextColorClass} font-medium leading-relaxed max-w-3xl`}>
            Encuentra y agenda servicios específicos de profesionales de toda la comunidad.
          </p>
        </div>
        {nearby.isActive && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{
                backgroundColor: `${primaryColor}15`,
                borderColor: `${primaryColor}40`,
                color: primaryColor,
              }}
            >
              <MapPin size={11} strokeWidth={2.5} />
              Mostrando servicios cerca de ti
              {nearby.radiusKm ? ` · ${nearby.radiusKm} km` : ''}
              {location?.city || location?.zone ? ` · Tú: ${location.city || location.zone}` : ''}
            </span>
            <button
              type="button"
              onClick={() => clearLocation()}
              className={`text-[10px] font-semibold underline-offset-2 hover:underline ${mutedTextColorClass}`}
            >
              Ver todos
            </button>
          </div>
        )}

        <button
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          className="lg:hidden w-full mb-4 px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2"
          style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {mobileFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`${mobileFiltersOpen ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}>
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={handleCategorySelect}
              searchInput={searchQuery}
              onSearchChange={handleSearchChange}
              primaryColor={primaryColor}
              mutedTextColorClass={mutedTextColorClass}
              totalServices={totalServices}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 transition-all duration-300">
              {hasServices ? (
                visibleServices.map((service, index) => {
                  const tenantSlug = service.tenant?.slug;
                  const storeHref = tenantSlug
                    ? `/tienda/${tenantSlug}?servicio=${service.id}`
                    : '#';
                  return (
                    <Link
                      key={service.id || service._id}
                      href={storeHref}
                      className="block"
                    >
                      <ServiceCard
                        service={service}
                        primaryColor={primaryColor}
                        textColorClass={textColorClass}
                        mutedTextColorClass={mutedTextColorClass}
                        exchangeRate={exchangeRate}
                        isLight={isLight}
                        proximity={nearby.applyProximity(service)}
                      />
                    </Link>
                  );
                })
              ) : nearby.isActive ? (
                <NearbyEmptyState
                  itemLabel="servicios"
                  primaryColor={primaryColor}
                  textColorClass={textColorClass}
                  mutedTextColorClass={mutedTextColorClass}
                />
              ) : (
                <div className="col-span-full py-16 text-center">
                  <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                    No se encontraron servicios que coincidan con tu búsqueda.
                  </p>
                </div>
              )}
            </div>

            {hasServices && (
              <div className="flex flex-col items-center gap-3 mt-8">
                <p className={`text-[11px] font-medium ${mutedTextColorClass}`}>
                  Mostrando {visibleServices.length} de {filteredServices.length} servicios
                </p>

                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      className="px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
                      style={{
                        backgroundColor: primaryColor,
                        color: '#ffffff',
                        boxShadow: `0 8px 25px -5px ${primaryColor}40`,
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      Ver más servicios
                    </button>
                  )}

                  {visibleCount > 8 && (
                    <button
                      onClick={handleShowLess}
                      className="px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 border"
                      style={{
                        borderColor: `${primaryColor}30`,
                        color: mutedTextColorClass,
                      }}
                    >
                      Mostrar menos
                    </button>
                  )}

                  <Link
                    href={
                      selectedCategory === 'todos'
                        ? '/servicios'
                        : `/servicios?category=${encodeURIComponent(selectedCategory)}`
                    }
                    className="px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 border flex items-center gap-2"
                    style={{
                      borderColor: `${primaryColor}30`,
                      color: primaryColor,
                    }}
                  >
                    Ver catálogo completo →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default React.memo(AvailableServicesItemsSection);