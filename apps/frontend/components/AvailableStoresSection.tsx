'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { StoreCard } from './cards/StoreCard';
import { formatNicheLabel } from '@/lib/niches';
import NearbyEmptyState from './cards/NearbyEmptyState';
import { useNearby } from '@/hooks/useNearby';
import { useLocationContext } from '@/app/context/LocationContext';
import { useTenantsContext } from '@/app/context/TenantsContext';
import { MapPin } from 'lucide-react';
import { NICHE_CATEGORIES_MAP, PRESET_CATEGORIES } from '@/app/constants/nicheData';


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
// 🔥 FORMATEAR NICHO
// ============================================================



// ============================================================
// 🔥 COMPONENTE DE FILTRO DE ESTADO
// ============================================================
const StatusFilter = memo(({ 
  filterStatus, 
  setFilterStatus, 
  primaryColor, 
  mutedTextColorClass 
}: any) => {
  const filterOptions = useMemo(() => [
    { value: 'todos', label: 'Todos', color: primaryColor },
    { value: 'abierto', label: 'Abierto', color: '#10b981', dot: 'bg-emerald-500' },
    { value: 'cerrado', label: 'Cerrado', color: '#ef4444', dot: 'bg-rose-500' },
  ], [primaryColor]);

  return (
    <div className="flex items-center gap-3 border-t border-slate-500/10 pt-4">
      <span className={`text-[10px] font-medium ${mutedTextColorClass}`}>
        Estado:
      </span>
      <div className="flex items-center gap-1 rounded-full p-0.5 border"
           style={{
             backgroundColor: `${primaryColor}10`,
             borderColor: `${primaryColor}20`,
           }}>
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilterStatus(option.value as 'todos' | 'abierto' | 'cerrado')}
            className={`px-3 py-1 rounded-full text-[9px] font-medium transition-colors duration-200 flex items-center gap-1 ${
              filterStatus === option.value 
                ? 'text-white' 
                : `${mutedTextColorClass} hover:opacity-100`
            }`}
            style={{
              backgroundColor: filterStatus === option.value ? option.color : 'transparent',
            }}
          >
            {option.dot && <span className={`w-1 h-1 rounded-full ${option.dot} inline-block`}></span>}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});

StatusFilter.displayName = 'StatusFilter';

// ============================================================
// 🔥 COMPONENTE DE NICHOS
// ============================================================
const NichesList = memo(({ 
  niches, 
  selectedNiche, 
  onSelect, 
  primaryColor, 
  textColorClass 
}: any) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-500/10 pt-6">
      {niches.map((niche: string) => {
        const isSelected = selectedNiche === niche;
        const label = niche === 'todos' ? 'Todos' : formatNicheLabel(niche);

        return (
          <button
            key={niche}
            onClick={() => onSelect(niche)}
            className="px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors duration-200 border shadow-sm cursor-pointer flex-shrink-0"
            style={{
              backgroundColor: isSelected ? primaryColor : 'transparent',
              borderColor: isSelected ? primaryColor : `${primaryColor}25`,
              color: isSelected ? '#ffffff' : textColorClass,
              opacity: isSelected ? 1 : 0.6,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
});

NichesList.displayName = 'NichesList';

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
function AvailableStoresSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
  backgroundCardBg,
}: any) {
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'abierto' | 'cerrado'>('todos');
const [visibleCount, setVisibleCount] = useState<number>(8);
  const { location, clearLocation } = useLocationContext();
  const nearby = useNearby<any>('tenants', { radiusKm: 100, limit: 100 });
  const { tenants: allTenants, isLoading: tenantsLoading } = useTenantsContext();
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const filterStores = (items: any[]) =>
      items.filter((store: any) => {
        const modelType = store.model_type || store.modelType || store.work_modality || store.workModality;
        return modelType !== 'service';
      });

    try {
      // 1. Si hay ubicación activa, usamos nearby.
      if (nearby.isActive) {
        if (nearby.items) {
          setStores(filterStores(nearby.items));
          setVisibleCount(4);
          setIsLoading(false);
        } else if (nearby.isLoading) {
          setIsLoading(true);
        } else if (nearby.error) {
          // Fallback: usar los tenants del Context.
          setStores(filterStores(allTenants));
          setVisibleCount(4);
          setIsLoading(false);
        }
        return;
      }

      // 2. Sin ubicación: usar el Context.
      if (tenantsLoading) {
        setIsLoading(true);
        return;
      }

      setStores(filterStores(allTenants));
      setVisibleCount(4);
      setIsLoading(false);
    } catch (err) {
      console.error('Error cargando tiendas:', err);
      setIsLoading(false);
    }
  }, [nearby.isActive, nearby.items, nearby.isLoading, nearby.error, allTenants, tenantsLoading]);
const niches = useMemo(() => {
  const nicheSet = new Set<string>();
  nicheSet.add('todos');
  
  // 🔥 Solo nichos que tienen tiendas asociadas
  for (const store of stores) {
    if (store.niche) {
      nicheSet.add(store.niche);
    }
  }
  
  return Array.from(nicheSet);
}, [stores]);

  const filteredStores = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return stores.filter((store) => {
      const matchesNiche = selectedNiche === 'todos' || store.niche === selectedNiche;
      
      const matchesSearch = 
        !query || 
        store.name?.toLowerCase().includes(query) || 
        store.slogan?.toLowerCase().includes(query) || 
        store.slug?.toLowerCase().includes(query);

      const specificConfig = store.specific_config || store.specificConfig || {};
      const status = checkIfStoreIsOpen(specificConfig);

      const matchesStatus = 
        filterStatus === 'todos' || 
        (filterStatus === 'abierto' && status.isOpen) ||
        (filterStatus === 'cerrado' && !status.isOpen);

      return matchesNiche && matchesSearch && matchesStatus;
    });
  }, [stores, selectedNiche, searchQuery, filterStatus]);

  const visibleStores = useMemo(() => {
    return filteredStores.slice(0, visibleCount);
  }, [filteredStores, visibleCount]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(4);
  }, []);

  const handleNicheSelect = useCallback((niche: string) => {
    setSelectedNiche(niche);
    setVisibleCount(4);
  }, []);

  const handleFilterStatusChange = useCallback((status: 'todos' | 'abierto' | 'cerrado') => {
    setFilterStatus(status);
    setVisibleCount(4);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  }, []);

  const handleShowLess = useCallback(() => {
    setVisibleCount(4);
  }, []);

  const hasMoreStores = visibleStores.length < filteredStores.length;
  const hasStoresToShow = filteredStores.length > 0;

  if (isLoading) {
    return (
<section className="w-full py-12 px-6 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: primaryColor }}></div>
              <p className={`text-sm font-medium ${mutedTextColorClass}`}>Cargando tiendas...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 px-6 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <span 
                className="text-xs font-bold uppercase tracking-[0.25em] block mb-2"
                style={{ color: primaryColor }}
              >
                Directorio activo
              </span>
              <h2 className={`text-3xl sm:text-5xl font-black tracking-tight ${textColorClass} mb-3`}>
                Tiendas y comercios
              </h2>
              <p className={`text-sm sm:text-base ${mutedTextColorClass} font-medium leading-relaxed`}>
                Explora los emprendimientos y negocios creados por nuestra comunidad.
              </p>
            </div>

            <div className="relative w-full lg:w-80 flex-shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none opacity-50" style={{ color: primaryColor }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Buscar tienda..."
                className={`w-full pl-10 pr-9 py-2.5 rounded-full text-xs sm:text-sm border outline-none transition-colors duration-300 shadow-xs ${textColorClass}`}
                style={{
                  backgroundColor: backgroundCardBg,
                  borderColor: `${primaryColor}30`,
                }}
              />
            </div>
          </div>

          <NichesList
            niches={niches}
            selectedNiche={selectedNiche}
            onSelect={handleNicheSelect}
            primaryColor={primaryColor}
            textColorClass={textColorClass}
          />

          <StatusFilter
            filterStatus={filterStatus}
            setFilterStatus={handleFilterStatusChange}
            primaryColor={primaryColor}
            mutedTextColorClass={mutedTextColorClass}
          />

          {nearby.isActive && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  borderColor: `${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                <MapPin size={11} strokeWidth={2.5} />
                Mostrando tiendas cerca de ti
                {nearby.radiusKm ? ` · ${nearby.radiusKm} km` : ''}
                {location?.city || location?.zone ? ` · Tú: ${location.city || location.zone}` : ''}
              </span>
              <button
                type="button"
                onClick={() => clearLocation()}
                className={`text-[10px] font-semibold underline-offset-2 hover:underline ${mutedTextColorClass}`}
              >
                Ver todas
              </button>
            </div>
          )}
        </div>

<div className="flex flex-col">
  {/* Grid de tarjetas */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    {hasStoresToShow ? (
      visibleStores.map((store) => (
        <StoreCard
          key={store.id || store.slug}
          store={store}
          primaryColor={primaryColor}
          textColorClass={textColorClass}
          mutedTextColorClass={mutedTextColorClass}
          backgroundCardBg={backgroundCardBg}
          proximity={nearby.applyProximity(store)}
        />
      ))
    ) : nearby.isActive ? (
      <NearbyEmptyState
        itemLabel="tiendas"
        primaryColor={primaryColor}
        textColorClass={textColorClass}
        mutedTextColorClass={mutedTextColorClass}
      />
    ) : (
      <div className="col-span-full py-16 text-center">
        <p className={`text-sm font-medium ${mutedTextColorClass}`}>
          No se encontraron tiendas que coincidan con tu búsqueda.
        </p>
      </div>
    )}
  </div>

  {/* 🔥 Botón pegado a las tarjetas - SIN espacio extra */}
  {hasStoresToShow && (
  <div className="flex flex-col items-center gap-3 mt-6">
      <p className={`text-[11px] font-medium ${mutedTextColorClass}`}>
        Mostrando {visibleStores.length} de {filteredStores.length} tiendas
        {filterStatus !== 'todos' && ` • ${filterStatus === 'abierto' ? 'Abiertas' : 'Cerradas'}`}
      </p>

      {(hasMoreStores || visibleCount > 4) && (
        <div className="flex items-center gap-3">
          {hasMoreStores && (
            <button
              onClick={handleLoadMore}
              className="px-6 py-2.5 rounded-full text-xs font-bold transition-transform duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
              style={{
                backgroundColor: primaryColor,
                color: '#ffffff',
                boxShadow: `0 8px 25px -5px ${primaryColor}40`,
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              Ver más tiendas
            </button>
          )}

          {visibleCount > 4 && (
            <button
              onClick={handleShowLess}
              className="px-6 py-2.5 rounded-full text-xs font-bold transition-transform duration-300 hover:scale-105 border"
              style={{
                borderColor: `${primaryColor}30`,
                color: mutedTextColorClass,
              }}
            >
              Mostrar menos
            </button>
          )}
        </div>
      )}

      {/* 🔥 NUEVO: Botón destacado "Ver todas las tiendas" */}
      <Link
        href="/tiendas?type=product"
                className="mt-2 px-7 py-3 rounded-full text-sm font-bold transition-transform duration-300 hover:scale-105 shadow-xl flex items-center gap-2 border-2"
        style={{
          borderColor: primaryColor,
          color: primaryColor,
          backgroundColor: 'transparent',
        }}
      >
        Ver todas las tiendas del directorio
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </Link>
    </div>
  )}
</div>

      </div>
    </section>
  );
}

export default React.memo(AvailableStoresSection);