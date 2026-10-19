// ============================================================
// ARCHIVO: app/tiendas/page.tsx
// Directorio global de tiendas (productos + servicios) con
// descubrimiento por cercanía.
// ============================================================
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DEFAULT_THEME } from '@/lib/branding';
import { useNearby } from '@/hooks/useNearby';
import { useLocationContext } from '@/app/context/LocationContext';
import { useTenantsContext } from '@/app/context/TenantsContext';
import { MapPin } from 'lucide-react';
import { StoreCard } from '@/components/cards/StoreCard';
import NearbyEmptyState from '@/components/cards/NearbyEmptyState';
import { NICHE_CATEGORIES_MAP } from '../constants/nicheData';
import { formatNicheLabel } from '@/lib/niches';

type StoreFilter = 'todas' | 'product' | 'service';

// ============================================================
// SIDEBAR
// ============================================================
const StoreSidebar = ({
  niches,
  selectedNiche,
  onSelectNiche,
  selectedType,
  onSelectType,
  searchInput,
  onSearchChange,
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  totalStores,
}: any) => {
  const typeOptions: { value: StoreFilter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'product', label: 'Productos' },
    { value: 'service', label: 'Servicios' },
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-24 lg:self-start">
      <div
        className="p-5 rounded-3xl border space-y-5"
        style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderColor: `${primaryColor}20`,
        }}
      >
        {/* BUSCAR */}
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
              placeholder="Buscar tienda..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-all ${textColorClass}`}
              style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderColor: `${primaryColor}20` }}
            />
          </div>
        </div>

        {/* TIPO */}
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${mutedTextColorClass}`}>
            Tipo
          </label>
          <div className="flex flex-col gap-0.5">
            {typeOptions.map((opt) => {
              const isSelected = selectedType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onSelectType(opt.value)}
                  className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition ${
                    isSelected ? 'font-bold' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${primaryColor}20` : 'transparent',
                    color: isSelected ? primaryColor : undefined,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* NICHOS */}
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${mutedTextColorClass}`}>
            Categorías
          </label>
          <div className="flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto pr-1">
            <button
              onClick={() => onSelectNiche('todos')}
              className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${
                selectedNiche === 'todos' ? 'font-bold' : ''
              }`}
              style={{
                backgroundColor: selectedNiche === 'todos' ? `${primaryColor}20` : 'transparent',
                color: selectedNiche === 'todos' ? primaryColor : undefined,
              }}
            >
              <span className="truncate">Todas</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: selectedNiche === 'todos' ? primaryColor : 'rgba(255,255,255,0.08)',
                  color: selectedNiche === 'todos' ? '#fff' : undefined,
                }}
              >
                {totalStores}
              </span>
            </button>

            {niches.map((niche: string) => {
              const isSelected = selectedNiche === niche;
              return (
                <button
                  key={niche}
                  onClick={() => onSelectNiche(niche)}
                  className={`text-left text-xs font-medium px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 ${
                    isSelected ? 'font-bold' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${primaryColor}20` : 'transparent',
                    color: isSelected ? primaryColor : undefined,
                  }}
                >
                  <span className="truncate">{formatNicheLabel(niche)}</span>
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
function TiendasContent() {
  const searchParams = useSearchParams();

  // 🔒 TEMA POR DEFECTO
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

  const initialNiche = searchParams.get('niche') || 'todos';
  const initialType = (searchParams.get('type') as StoreFilter) || 'todas';
  const initialSearch = searchParams.get('search') || '';

  const { location } = useLocationContext();
  const nearby = useNearby<any>('tenants', { radiusKm: 100, limit: 100 });
  const { tenants: allTenants, isLoading: tenantsLoading } = useTenantsContext();

  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState(initialNiche);
  const [selectedType, setSelectedType] = useState<StoreFilter>(initialType);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Cargar tiendas
  useEffect(() => {
    try {
      // 1. Si hay ubicación, usamos /geo/nearby/tenants (ya ordenados)
      if (nearby.isActive) {
        if (nearby.items) {
          setStores(nearby.items);
          setIsLoading(false);
        } else if (nearby.isLoading) {
          setIsLoading(true);
        } else if (nearby.error) {
          // Fallback: usar los tenants del Context.
          setStores(allTenants);
          setIsLoading(false);
        }
        return;
      }

      // 2. Sin ubicación: usar el Context.
      if (tenantsLoading) {
        setIsLoading(true);
        return;
      }

      setStores(allTenants);
      setIsLoading(false);
    } catch (e) {
      console.error('Error cargando tiendas:', e);
      setIsLoading(false);
    }
  }, [nearby.isActive, nearby.items, nearby.isLoading, nearby.error, allTenants, tenantsLoading]);

  // Actualizar URL (useEffect separado, solo depende de los filtros)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedNiche !== 'todos') url.searchParams.set('niche', selectedNiche);
    else url.searchParams.delete('niche');
    if (selectedType !== 'todas') url.searchParams.set('type', selectedType);
    else url.searchParams.delete('type');
    if (debouncedSearch.trim()) url.searchParams.set('search', debouncedSearch.trim());
    else url.searchParams.delete('search');
    window.history.replaceState({}, '', url.toString());
  }, [selectedNiche, selectedType, debouncedSearch]);
  // Nichos únicos
  const niches = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) {
      if (s.niche) set.add(s.niche);
    }
    return Array.from(set).sort();
  }, [stores]);

  // Filtrado
  const filteredStores = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return stores.filter((store) => {
      const modelType = store.model_type || store.modelType || store.work_modality || store.workModality;
      const matchesType =
        selectedType === 'todas' ||
        (selectedType === 'service' && modelType === 'service') ||
        (selectedType === 'product' && modelType !== 'service');

      const matchesNiche = selectedNiche === 'todos' || store.niche === selectedNiche;

      const matchesSearch =
        !q ||
        store.name?.toLowerCase().includes(q) ||
        store.slogan?.toLowerCase().includes(q) ||
        store.slug?.toLowerCase().includes(q);

      return matchesType && matchesNiche && matchesSearch;
    });
  }, [stores, selectedType, selectedNiche, debouncedSearch]);

  const hasStores = filteredStores.length > 0;

  return (
    <div
      className={`min-h-screen flex flex-col ${textColorClass} relative transition-colors duration-500`}
      style={{ backgroundColor: activeBg }}
    >
      <Header />

      <main className="flex-1 w-full px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {/* BREADCRUMB / HEADER */}
          <div className="mb-6">
            <Link
              href="/"
              className={`text-xs font-medium ${mutedTextColorClass} hover:opacity-100 opacity-70 transition`}
            >
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">
              Directorio de tiendas
            </h1>
            <p className={`text-sm ${mutedTextColorClass} mt-1`}>
              {stores.length} tienda{stores.length !== 1 ? 's' : ''} en la comunidad
            </p>
          </div>

          {/* BOTÓN FILTROS MOBILE */}
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
            {/* SIDEBAR */}
            <div className={mobileFiltersOpen ? 'block' : 'hidden lg:block'}>
              <StoreSidebar
                niches={niches}
                selectedNiche={selectedNiche}
                onSelectNiche={setSelectedNiche}
                selectedType={selectedType}
                onSelectType={setSelectedType}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                primaryColor={primaryColor}
                textColorClass={textColorClass}
                mutedTextColorClass={mutedTextColorClass}
                totalStores={stores.length}
              />
            </div>

            {/* ÁREA PRINCIPAL */}
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

              {/* HEADER DE RESULTADOS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {selectedType === 'todas'
                      ? 'Todas las tiendas'
                      : selectedType === 'service'
                        ? 'Tiendas de servicios'
                        : 'Tiendas de productos'}
                  </h2>
                  <p className={`text-xs ${mutedTextColorClass} mt-0.5`}>
                    {filteredStores.length} resultado{filteredStores.length !== 1 ? 's' : ''}
                    {debouncedSearch && ` para "${debouncedSearch}"`}
                  </p>
                </div>
              </div>

              {/* GRID */}
              {isLoading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                      style={{ borderColor: primaryColor }}
                    />
                    <p className={`text-sm font-medium ${mutedTextColorClass}`}>Cargando tiendas...</p>
                  </div>
                </div>
              ) : !hasStores ? (
                nearby.isActive ? (
                  <NearbyEmptyState
                    itemLabel="tiendas"
                    primaryColor={primaryColor}
                    textColorClass={textColorClass}
                    mutedTextColorClass={mutedTextColorClass}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                    <span className="text-5xl opacity-30">🏬</span>
                    <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                      No se encontraron tiendas que coincidan con tu búsqueda.
                    </p>
                    {(selectedNiche !== 'todos' || selectedType !== 'todas' || searchInput) && (
                      <button
                        onClick={() => {
                          setSelectedNiche('todos');
                          setSelectedType('todas');
                          setSearchInput('');
                        }}
                        className="mt-2 text-xs font-bold px-4 py-2 rounded-full"
                        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                )
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredStores.map((store) => (
                      <StoreCard
                        key={store.id || store.slug}
                        store={store}
                        primaryColor={primaryColor}
                        textColorClass={textColorClass}
                        mutedTextColorClass={mutedTextColorClass}
                        backgroundCardBg={isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.02)'}
                        proximity={nearby.applyProximity(store)}
                      />
                    ))}
                  </div>

                  <p className={`text-center text-[11px] mt-6 ${mutedTextColorClass}`}>
                    Mostrando {filteredStores.length} de {stores.length} tiendas
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
// WRAPPER
// ============================================================
export default function TiendasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <TiendasContent />
    </Suspense>
  );
}