'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DEFAULT_THEME } from '@/lib/branding';
import { APP_PALETTES } from '../constants/palettes';
import { apiFetch } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import { useNearby } from '@/hooks/useNearby';
import { useLocationContext } from '@/app/context/LocationContext';
import { MapPin } from 'lucide-react';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
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
// CARD DE SERVICIO
// ============================================================
const ServiceCard = ({ service, primaryColor, textColorClass, mutedTextColorClass, proximity }: any) => {
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

        {/* 🔥 CERCANÍA - Arriba izquierda */}
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
// SIDEBAR
// ============================================================
const CategorySidebar = ({
  categories,
  selectedCategory,
  onSelect,
  searchInput,
  onSearchChange,
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  totalServices,
}: any) => {
  return (
    <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-24 lg:self-start">
      <div
        className="p-5 rounded-3xl border space-y-5"
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-all ${textColorClass}`}
                            style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderColor: `${primaryColor}20` }}
            />
          </div>
        </div>

        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${mutedTextColorClass}`}>
            Categorías
          </label>
          <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto pr-1">
            <button
              onClick={() => onSelect('todos')}
              className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${selectedCategory === 'todos' ? 'font-bold' : ''}`}
              style={{
                backgroundColor: selectedCategory === 'todos' ? `${primaryColor}20` : 'transparent',
                color: selectedCategory === 'todos' ? primaryColor : undefined,
              }}
            >
              <span className="truncate">Todos los servicios</span>
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
                  className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${isSelected ? 'font-bold' : ''}`}
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
// CONTENIDO
// ============================================================
function ServiciosContent() {
  const searchParams = useSearchParams();

  // 🔒 FORZAR TEMA POR DEFECTO DE FACILITO
  const activePalette = {
    id: 'facilito-default',
    name: DEFAULT_THEME.name,
    primary: DEFAULT_THEME.primaryColor,
    secondary: DEFAULT_THEME.secondaryColor,
    accent: DEFAULT_THEME.accentColor,
    background: DEFAULT_THEME.backgroundColor,
  };
  const primaryColor = activePalette.primary;
  const activeBg = activePalette.background;

  const isLightBackground = (colorHex?: string): boolean => {
    if (!colorHex) return false;
    const hex = colorHex.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  };

  const isLight = isLightBackground(activeBg);
  const textColorClass = isLight ? 'text-slate-900' : 'text-slate-100';
  const mutedTextColorClass = isLight ? 'text-slate-600' : 'text-slate-300';

  // 🔒 FORZAR variables CSS del tema por defecto
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', activePalette.primary);
    root.style.setProperty('--secondary-color', activePalette.secondary);
    root.style.setProperty('--accent-glow', activePalette.accent);
    root.style.setProperty('--bg-color', activePalette.background);
    root.style.setProperty('--color-primary', activePalette.primary);
    root.style.setProperty('--primary-color', activePalette.primary);
    root.style.setProperty('--color-secondary', activePalette.secondary);
    root.style.setProperty('--color-background', activePalette.background);
    root.style.setProperty('--background-color', activePalette.background);
  }, []);

  const initialCategory = searchParams.get('category') || 'todos';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'recent';

  const { location } = useLocationContext();
  const nearby = useNearby<any>('services', { radiusKm: 100, limit: 100 });

  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [offset, setOffset] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const LIMIT = 24;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setOffset(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiFetch('/services/public/all?limit=1&offset=0');
        if (res.ok) {
          const data = await res.json();
          const cats = Array.isArray(data?.categories) ? data.categories : [];
          setCategories(cats);
          setTotalAll(Number(data?.total) || 0);
        }
      } catch (e) {
        console.error('Error cargando categorías:', e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(LIMIT));
        params.set('offset', '0');
        if (selectedCategory !== 'todos') params.set('category', selectedCategory);
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (sort) params.set('sort', sort);

        const res = await apiFetch(`/services/public/all?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setServices(Array.isArray(data?.items) ? data.items : []);
          setTotal(Number(data?.total) || 0);
          setOffset(LIMIT);
        }
      } catch (e) {
        console.error('Error cargando servicios:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const url = new URL(window.location.href);
    if (selectedCategory !== 'todos') url.searchParams.set('category', selectedCategory);
    else url.searchParams.delete('category');
    if (debouncedSearch.trim()) url.searchParams.set('search', debouncedSearch.trim());
    else url.searchParams.delete('search');
    if (sort && sort !== 'recent') url.searchParams.set('sort', sort);
    else url.searchParams.delete('sort');
    window.history.replaceState({}, '', url.toString());
  }, [selectedCategory, debouncedSearch, sort]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(LIMIT));
      params.set('offset', String(offset));
      if (selectedCategory !== 'todos') params.set('category', selectedCategory);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (sort) params.set('sort', sort);

      const res = await apiFetch(`/services/public/all?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = Array.isArray(data?.items) ? data.items : [];
        setServices((prev) => [...prev, ...newItems]);
        setOffset((prev) => prev + LIMIT);
      }
    } catch (e) {
      console.error('Error cargando más servicios:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, selectedCategory, debouncedSearch, sort]);

  const hasMore = services.length < total;

  // 🔥 ORDENAR POR CERCANÍA SI HAY UBICACIÓN
  const sortedServices = useMemo(() => {
    if (!nearby.isActive || !nearby.items || nearby.items.length === 0) {
      return services;
    }
    const distanceMap = new Map<string, number>();
    for (const item of nearby.items as any[]) {
      const key = item?.id || item?._id;
      if (key && typeof item.distanceKm === 'number') {
        distanceMap.set(String(key), item.distanceKm);
      }
    }
    return [...services].sort((a, b) => {
      const da = distanceMap.get(String(a.id || a._id));
      const db = distanceMap.get(String(b.id || b._id));
      if (da !== undefined && db !== undefined) return da - db;
      if (da !== undefined) return -1;
      if (db !== undefined) return 1;
      return 0;
    });
  }, [services, nearby.isActive, nearby.items]);

  return (
    <div 
      className={`min-h-screen flex flex-col ${textColorClass} relative transition-colors duration-500`}
      style={{ backgroundColor: activeBg }}
    >
      <Header />

      <main className="flex-1 w-full px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className={`text-xs font-medium ${mutedTextColorClass} hover:opacity-100 opacity-70 transition`}
            >
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">
              Catálogo de servicios
            </h1>
            <p className={`text-sm ${mutedTextColorClass} mt-1`}>
              {totalAll} servicio{totalAll !== 1 ? 's' : ''} de toda la comunidad
            </p>
          </div>

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
            <div className={mobileFiltersOpen ? 'block' : 'hidden lg:block'}>
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                primaryColor={primaryColor}
                textColorClass={textColorClass}
                mutedTextColorClass={mutedTextColorClass}
                totalServices={totalAll}
              />
            </div>

            <div className="flex-1 min-w-0">
              {/* CHIP DE CERCANÍA */}
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
                    Ordenado por cercanía
                    {nearby.radiusKm ? ` · ${nearby.radiusKm} km` : ''}
                    {location?.city || location?.zone ? ` · Tú: ${location.city || location.zone}` : ''}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {formatCategoryLabel(selectedCategory)}
                  </h2>
                  <p className={`text-xs ${mutedTextColorClass} mt-0.5`}>
                    {total} resultado{total !== 1 ? 's' : ''}
                    {debouncedSearch && ` para "${debouncedSearch}"`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${mutedTextColorClass} hidden sm:block`}>
                    Ordenar:
                  </label>
                  <div className="w-[180px]">
                    <SearchableDropdown
                      value={sort}
                      onChange={(val) => setSort(val)}
                      options={[
                        { value: 'recent', label: 'Más recientes' },
                        { value: 'price_asc', label: 'Menor precio' },
                        { value: 'price_desc', label: 'Mayor precio' },
                        { value: 'name_asc', label: 'Nombre A-Z' },
                      ]}
                      placeholder="Ordenar"
                      primary={primaryColor}
                      textColor={isLight ? '#0f172a' : '#f1f5f9'}
                      isDarkBg={!isLight}
                      searchable={false}
                    />
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                      style={{ borderColor: primaryColor }}
                    />
                    <p className={`text-sm font-medium ${mutedTextColorClass}`}>Cargando servicios...</p>
                  </div>
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                  <span className="text-5xl opacity-30">🗓️</span>
                  <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                    No se encontraron servicios que coincidan con tu búsqueda.
                  </p>
                  {(selectedCategory !== 'todos' || searchInput) && (
                    <button
                      onClick={() => {
                        setSelectedCategory('todos');
                        setSearchInput('');
                      }}
                      className="mt-2 text-xs font-bold px-4 py-2 rounded-full"
                      style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {sortedServices.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        primaryColor={primaryColor}
                        textColorClass={textColorClass}
                        mutedTextColorClass={mutedTextColorClass}
                        proximity={nearby.applyProximity(service)}
                      />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="flex justify-center mt-10">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 flex items-center gap-2"
                        style={{
                          backgroundColor: primaryColor,
                          color: '#ffffff',
                          boxShadow: `0 8px 25px -5px ${primaryColor}40`,
                        }}
                      >
                        {isLoadingMore ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Cargando...
                          </>
                        ) : (
                          <>Cargar más servicios</>
                        )}
                      </button>
                    </div>
                  )}

                  <p className={`text-center text-[11px] mt-6 ${mutedTextColorClass}`}>
                    Mostrando {services.length} de {total} servicios
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============================================================
// WRAPPER con Suspense
// ============================================================
export default function ServiciosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ServiciosContent />
    </Suspense>
  );
}