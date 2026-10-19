  'use client';

  import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
  import { 
    Filter, X, Tag, Package, SlidersHorizontal, Calendar, ChevronDown, ChevronUp, 
    DollarSign, Clock, ShoppingBag, Star, Shield, Award, Building2, Users,
    TrendingUp, Heart, Zap, Sparkles, Gift, Truck, CheckCircle2, AlertCircle
  } from 'lucide-react';
  import SearchableDropdown from '@/components/ui/SearchableDropdown';

  // ============================================================
  // 🔥 FILTRO AVANZADO - ESTRUCTURA PROFUNDA
  // ============================================================

  export interface FilterState {
    minPriceUsd: number | null;
    maxPriceUsd: number | null;
    minPriceVes: number | null;
    maxPriceVes: number | null;
    minPriceEur: number | null;
    maxPriceEur: number | null;
    minPriceCrypto: number | null;
    maxPriceCrypto: number | null;
    onlyOnSale: boolean;
    minDiscountPercentage: number | null;
    maxDiscountPercentage: number | null;
    startDate: string | null;
    endDate: string | null;
    dateField: 'createdAt' | 'updatedAt' | 'publishedAt';
    selectedCategories: string[];
    selectedBrands: string[];
    selectedConditions: string[];
    selectedWarranties: string[];
    selectedFeatures: string[];
    matchAllFeatures: boolean;
    serviceModalities: string[];
    minDuration: number | null;
    maxDuration: number | null;
    selectedCertifications: string[];
    selectedMaterials: string[];
    sortBy: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular' | 
            'discount_desc' | 'rating_desc' | 'name_asc' | 'name_desc';
  }


  // ============================================================
  // 🔥 COMPONENTES MEMOIZADOS
  // ============================================================

  // ✅ SECTION HEADER MEMOIZADO
  const SectionHeader = memo(({ 
    icon: Icon, 
    title, 
    section, 
    badge,
    isActive,
    onToggle,
    primary,
    textMutedClass,
    textMainClass,
    isLight,
  }: { 
    icon: any; 
    title: string; 
    section: string; 
    badge?: number;
    isActive: boolean;
    onToggle: (section: string) => void;
    primary: string;
    textMutedClass: string;
    textMainClass: string;
    isLight: boolean;
  }) => (
    <button
      type="button"
      onClick={() => onToggle(section)}
      className="w-full flex items-center justify-between py-2 text-left group hover:opacity-80 transition"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 opacity-60" style={{ color: primary }} />
        <span className={`text-[9px] font-bold uppercase tracking-wider ${textMutedClass}`}>
          {title}
        </span>
        {badge !== undefined && badge > 0 && (
          <span 
            className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: primary, color: isLight ? '#030712' : '#ffffff' }}
          >
            {badge}
          </span>
        )}
      </div>
      <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isActive ? 'rotate-180' : ''}`} />
    </button>
  ));

  SectionHeader.displayName = 'SectionHeader';

  // ✅ SECTION CONTENT MEMOIZADO
  const SectionContent = memo(({ children, isActive }: { children: React.ReactNode; isActive: boolean }) => (
    <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${isActive ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
       <div className="pt-2 pb-3 space-y-3">
        {children}
      </div>
    </div>
  ));

  SectionContent.displayName = 'SectionContent';

  // ✅ RANGE INPUT MEMOIZADO
  const RangeInput = memo(({ 
    label, 
    minKey, 
    maxKey, 
    minVal, 
    maxVal, 
    step = 1,
    prefix = '',
    suffix = '',
    onFilterChange,
    textMainClass,
    textMutedClass,
    isLight,
    borderDynamic,
  }: {
    label: string;
    minKey: string;
    maxKey: string;
    minVal: number | null;
    maxVal: number | null;
    step?: number;
    prefix?: string;
    suffix?: string;
    onFilterChange: (key: string, value: any) => void;
    textMainClass: string;
    textMutedClass: string;
    isLight: boolean;
    borderDynamic: string;
  }) => (
    <div>
      <label className={`text-[8px] font-medium uppercase tracking-wider block ${textMutedClass}`}>
        {label}
      </label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          step={step}
          min={0}
          placeholder={`${prefix}Min`}
          value={minVal ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            onFilterChange(minKey, val);
          }}
          className={`w-1/2 px-2.5 py-1.5 rounded-lg border text-xs outline-none transition ${textMainClass}`}
          style={{
            backgroundColor: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
            borderColor: borderDynamic,
          }}
        />
        <span className={`text-xs ${textMutedClass}`}>—</span>
        <input
          type="number"
          step={step}
          min={0}
          placeholder={`${prefix}Max`}
          value={maxVal ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            onFilterChange(maxKey, val);
          }}
          className={`w-1/2 px-2.5 py-1.5 rounded-lg border text-xs outline-none transition ${textMainClass}`}
          style={{
            backgroundColor: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
            borderColor: borderDynamic,
          }}
        />
      </div>
    </div>
  ));

  RangeInput.displayName = 'RangeInput';

  // ✅ TOGGLE BUTTON MEMOIZADO
  const ToggleButton = memo(({ 
    label, 
    checked, 
    onChange, 
    icon: Icon,
    textMainClass,
    primary,
  }: { 
    label: string; 
    checked: boolean; 
    onChange: (val: boolean) => void;
    icon?: any;
    textMainClass: string;
    primary: string;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded cursor-pointer"
        style={{ accentColor: primary }}
      />
      <span className={`text-[10px] font-medium ${textMainClass}`}>
        <span className="inline-flex items-center gap-1">
          {Icon && <Icon className="w-3 h-3" style={{ color: primary }} />}
          {label}
        </span>
      </span>
    </label>
  ));

  ToggleButton.displayName = 'ToggleButton';

  // ✅ CHIP SELECT MEMOIZADO
  const ChipSelect = memo(<T extends string>({
    items,
    selected,
    onChange,
    label,
    textMutedClass,
    textMainClass,
    primary,
    borderDynamic,
    isLight,
  }: {
    items: T[];
    selected: T[];
    onChange: (val: T[]) => void;
    label: string;
    textMutedClass: string;
    textMainClass: string;
    primary: string;
    borderDynamic: string;
    isLight: boolean;
  }) => (
    <div>
      <label className={`text-[8px] font-medium uppercase tracking-wider block ${textMutedClass}`}>
        {label} ({selected.length}/{items.length})
      </label>
      <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
        {items.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                const updated = isSelected 
                  ? selected.filter(s => s !== item)
                  : [...selected, item];
                onChange(updated);
              }}
              className={`text-[8px] px-2 py-0.5 rounded-full transition whitespace-nowrap ${
                isSelected
                  ? 'text-white font-bold'
                  : `${textMutedClass} border`
              }`}
              style={{
                ...(isSelected ? { backgroundColor: primary } : { borderColor: borderDynamic }),
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  ));

  ChipSelect.displayName = 'ChipSelect';

  // ============================================================
  // 🔥 COMPONENTE PRINCIPAL
  // ============================================================

  export default function FilterSidebar({
    primary,
    textMainClass,
    textMutedClass,
    isLight,
    cardBgClass = '',
    onApplyFilters,
    onClearFilters,
    products = [],
    categories = [],
    brands = [],
    features = [],
    className = '',
    initialFilters = {},
    searchQuery = '',         // ✅ NUEVO
    onSearchChange,           // ✅ NUEVO
    secondary,                // ✅ NUEVO: color del tema para fondos
  }: FilterSidebarProps) {
    
    const [filters, setFilters] = useState<FilterState>({
      minPriceUsd: null,
      maxPriceUsd: null,
      minPriceVes: null,
      maxPriceVes: null,
      minPriceEur: null,
      maxPriceEur: null,
      minPriceCrypto: null,
      maxPriceCrypto: null,
      onlyOnSale: false,
      minDiscountPercentage: null,
      maxDiscountPercentage: null,
      startDate: null,
      endDate: null,
      dateField: 'createdAt',
      selectedBrands: [],
      selectedConditions: [],
      selectedWarranties: [],
      selectedFeatures: [],
      matchAllFeatures: false,
      serviceModalities: [],
      minDuration: null,
      maxDuration: null,
      selectedCertifications: [],
      selectedMaterials: [],
      sortBy: 'newest',
      ...initialFilters,
    });

    const [isExpanded, setIsExpanded] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // 🔥 ESTADO LOCAL PARA LA BÚSQUEDA (permite escribir)
const [localSearch, setLocalSearch] = useState(searchQuery || '');

// Sincronizar con cambios externos
useEffect(() => {
  setLocalSearch(searchQuery || '');
}, [searchQuery]);

    // 🔥 QUITADO: useEffect que disparaba setState en cada cambio de initialFilters.
    // El useState ya inicializa con ...initialFilters. Este useEffect causaba
    // re-renders en cascada cuando el padre re-renderizaba.

    const borderDynamic = useMemo(() => 
      isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', 
      [isLight]
    );

    // ✅ TOGGLE EXPAND - AHORA EN EL WRAPPER
    const toggleExpand = useCallback(() => {
      setIsExpanded(prev => !prev);
    }, []);

    const toggleSection = useCallback((section: string) => {
      setActiveSection(prev => prev === section ? null : section);
    }, []);

    // ============================================================
    // 🔥 ANÁLISIS PROFUNDO DE DATOS (MEMOIZADO)
    // ============================================================

    const analysis = useMemo(() => {
      const result = {
        priceUsd: { min: 0, max: 0, avg: 0 },
        priceVes: { min: 0, max: 0, avg: 0 },
        priceEur: { min: 0, max: 0, avg: 0 },
        priceCrypto: { min: 0, max: 0, avg: 0 },
        discount: { min: 0, max: 0, avg: 0 },
        duration: { min: 0, max: 0, avg: 0 },
        brands: new Set<string>(),
        conditions: new Set<string>(),
        warranties: new Set<string>(),
        serviceModalities: new Set<string>(),
        certifications: new Set<string>(),
        materials: new Set<string>(),
        features: new Set<string>(),
        onSale: 0,
      };

      products.forEach(p => {
        const usd = p.priceUsd || p.prices?.USD || 0;
        if (usd > 0) {
          result.priceUsd.min = Math.min(result.priceUsd.min, usd);
          result.priceUsd.max = Math.max(result.priceUsd.max, usd);
          result.priceUsd.avg += usd;
        }

        const ves = p.priceVes || p.prices?.VES || 0;
        if (ves > 0) {
          result.priceVes.min = Math.min(result.priceVes.min, ves);
          result.priceVes.max = Math.max(result.priceVes.max, ves);
          result.priceVes.avg += ves;
        }

        const eur = p.prices?.EUR || 0;
        if (eur > 0) {
          result.priceEur.min = Math.min(result.priceEur.min, eur);
          result.priceEur.max = Math.max(result.priceEur.max, eur);
          result.priceEur.avg += eur;
        }

        const crypto = p.prices?.CRYPTO || p.prices?.USDT || 0;
        if (crypto > 0) {
          result.priceCrypto.min = Math.min(result.priceCrypto.min, crypto);
          result.priceCrypto.max = Math.max(result.priceCrypto.max, crypto);
          result.priceCrypto.avg += crypto;
        }

        const onSale = p.onSale === true || p.attributes?.onSale === true;
        if (onSale) result.onSale++;

        const discount = Number(p.discountPercentage || p.attributes?.discountPercentage || 0);
        if (discount > 0) {
          result.discount.min = Math.min(result.discount.min, discount);
          result.discount.max = Math.max(result.discount.max, discount);
          result.discount.avg += discount;
        }

        const duration = Number(p.durationMinutes || p.attributes?.durationMinutes || 0);
        if (duration > 0) {
          result.duration.min = Math.min(result.duration.min, duration);
          result.duration.max = Math.max(result.duration.max, duration);
          result.duration.avg += duration;
        }

        const brand = p.brand || p.marca || '';
        if (brand) result.brands.add(brand);

        const condition = p.condition || p.attributes?.condition || '';
        if (condition) result.conditions.add(condition);

        const warranty = p.warranty || p.attributes?.warranty || '';
        if (warranty) result.warranties.add(warranty);

        const modality = p.serviceModality || p.attributes?.serviceModality || '';
        if (modality) result.serviceModalities.add(modality);

        const certs = p.certifications || p.attributes?.certifications || [];
        if (Array.isArray(certs)) certs.forEach(c => result.certifications.add(c));

        const materials = p.materials || p.attributes?.materials || [];
        if (Array.isArray(materials)) materials.forEach(m => result.materials.add(m));

        const feats = p.features || p.attributes?.features || p.tags || [];
        if (Array.isArray(feats)) feats.forEach(f => result.features.add(f));
      });

      const count = products.length || 1;
      result.priceUsd.avg = Math.round((result.priceUsd.avg / count) * 100) / 100;
      result.priceVes.avg = Math.round((result.priceVes.avg / count) * 100) / 100;
      result.priceEur.avg = Math.round((result.priceEur.avg / count) * 100) / 100;
      result.priceCrypto.avg = Math.round((result.priceCrypto.avg / count) * 100) / 100;
      result.discount.avg = Math.round((result.discount.avg / count) * 100) / 100;
      result.duration.avg = Math.round((result.duration.avg / count) * 100) / 100;

      return result;
    }, [products]);

    // 🔥 FILTRAR PRODUCTOS LOCALMENTE POR BÚSQUEDA
const filteredProducts = useMemo(() => {
  if (!localSearch.trim()) return products;
  
  const query = localSearch.toLowerCase().trim();
  return products.filter((product: any) => {
    const name = product.name?.toLowerCase() || '';
    const description = product.description?.toLowerCase() || '';
    const category = product.category?.toLowerCase() || '';
    const brand = product.brand?.toLowerCase() || '';
    
    return name.includes(query) || 
           description.includes(query) || 
           category.includes(query) || 
           brand.includes(query);
  });
}, [products, localSearch]);

    // ============================================================
    // 🔥 HANDLERS
    // ============================================================

    const handleFilterChange = useCallback(<K extends keyof FilterState>(
      key: K,
      value: FilterState[K]
    ) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleApply = useCallback(() => {
      onApplyFilters(filters);
    }, [filters, onApplyFilters]);

    const handleClear = useCallback(() => {
      const cleared: FilterState = {
        minPriceUsd: null,
        maxPriceUsd: null,
        minPriceVes: null,
        maxPriceVes: null,
        minPriceEur: null,
        maxPriceEur: null,
        minPriceCrypto: null,
        maxPriceCrypto: null,
        onlyOnSale: false,
        minDiscountPercentage: null,
        maxDiscountPercentage: null,
        startDate: null,
        endDate: null,
        dateField: 'createdAt',
        selectedBrands: [],
        selectedConditions: [],
        selectedWarranties: [],
        selectedFeatures: [],
        matchAllFeatures: false,
        serviceModalities: [],
        minDuration: null,
        maxDuration: null,
        selectedCertifications: [],
        selectedMaterials: [],
        sortBy: 'newest',
      };
      setFilters(cleared);
      onClearFilters();
    }, [onClearFilters]);

    const hasActiveFilters = useMemo(() => {
      return Object.values(filters).some(v => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'boolean') return v === true;
        if (v === null || v === undefined) return false;
        if (v === 'all') return false;
        if (v === 'newest') return false;
        if (typeof v === 'string' && v === '') return false;
        return true;
      });
    }, [filters]);

    const activeFiltersCount = useMemo(() => {
      let count = 0;
      if (filters.minPriceUsd !== null || filters.maxPriceUsd !== null) count++;
      if (filters.minPriceVes !== null || filters.maxPriceVes !== null) count++;
      if (filters.minPriceEur !== null || filters.maxPriceEur !== null) count++;
      if (filters.minPriceCrypto !== null || filters.maxPriceCrypto !== null) count++;
      if (filters.onlyOnSale) count++;
      if (filters.minDiscountPercentage !== null || filters.maxDiscountPercentage !== null) count++;
      if (filters.startDate !== null || filters.endDate !== null) count++;
      if (filters.selectedBrands.length > 0) count++;
      if (filters.selectedConditions.length > 0) count++;
      if (filters.selectedWarranties.length > 0) count++;
      if (filters.selectedFeatures.length > 0) count++;
      if (filters.serviceModalities.length > 0) count++;
      if (filters.minDuration !== null || filters.maxDuration !== null) count++;
      if (filters.selectedCertifications.length > 0) count++;
      if (filters.selectedMaterials.length > 0) count++;
      if (filters.sortBy !== 'newest') count++;
      return count;
    }, [filters]);

    // ============================================================
    // 🔥 RENDER
    // ============================================================
     return (
    <>
      {/* 🔥 BARRA DE BÚSQUEDA - CONTENEDOR INDEPENDIENTE ARRIBA */}
      <div 
        className={`flex items-center gap-2 p-2.5 rounded-xl border mb-2.5 transition-colors focus-within:ring-2 focus-within:ring-offset-0 ${
                    isLight 
            ? 'border-slate-200/60' 
            : 'border-white/10'
        }`}
        style={{ 
          borderColor: borderDynamic,
          backgroundColor: isLight 
            ? 'rgba(255, 255, 255, 0.85)' 
            : `${secondary ? secondary + 'D9' : 'rgba(0, 0, 0, 0.85)'}`,
          '--tw-ring-color': primary,
        } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4 flex-shrink-0 opacity-40" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
<input
  type="text"
  value={localSearch}
  onChange={(e) => {
    const value = e.target.value;
    setLocalSearch(value);
    // Solo notificar al padre si existe la función
    if (typeof onSearchChange === 'function') {
      onSearchChange(value);
    }
  }}
  placeholder="Buscar productos por nombre..."
  className={`w-full bg-transparent border-0 outline-none text-xs font-medium placeholder:opacity-40 ${textMainClass}`}
  style={{ color: textMainClass }}
/>
{localSearch && (
  <button
    type="button"
    onClick={() => {
      setLocalSearch('');
      if (typeof onSearchChange === 'function') {
        onSearchChange('');
      }
    }}
    className="flex-shrink-0 p-0.5 rounded-full opacity-40 hover:opacity-100 transition"
  >
    <X className="w-3 h-3" />
  </button>
)}
      </div>

      {/* 🔥 CONTENEDOR DE FILTROS */}
      <div 
        className={`rounded-2xl p-4 border ${
          isLight 
            ? 'border-slate-200/60 shadow-lg shadow-slate-200/20' 
            : 'border-white/10 shadow-lg shadow-black/40'
        } ${cardBgClass} ${className}`}
        style={{
          position: 'relative',
          backgroundColor: isLight 
            ? 'rgba(255, 255, 255, 0.85)' 
            : `${secondary ? secondary + 'D9' : 'rgba(0, 0, 0, 0.85)'}`,
        }}
      >
        {/* ✅ HEADER - AHORA TODO EL WRAPPER ES CLICKEABLE */}
        <div 
          className="flex items-center gap-2.5 pb-2.5 border-b cursor-pointer select-none"
          style={{ borderColor: borderDynamic }}
          onClick={toggleExpand}
        >
          <div 
            className="p-1.5 rounded-xl flex-shrink-0 transition-colors"
            style={{ 
              backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
            }}
          >
            <Filter className="w-4 h-4" style={{ color: primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-black tracking-tight ${textMainClass}`}>
              Filtros
            </span>
            <span className={`text-[8px] block leading-none ${textMutedClass}`}>
              {hasActiveFilters 
                ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} activo${activeFiltersCount > 1 ? 's' : ''} · ${products.length} productos`
                : `${products.length} productos · Ningún filtro aplicado`}
            </span>
          </div>
          {/* ✅ INDICADOR DE EXPANSIÓN */}
          <div 
            className={`flex-shrink-0 p-1 rounded-full transition-colors duration-300 ${
              isLight 
                ? 'bg-slate-100 text-slate-700' 
                : 'bg-white/10 text-slate-300'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* CONTENIDO */}
        <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-2 pt-3">            
            {/* ============================================================
                📊 SECCIÓN: RESULTADOS RÁPIDOS
                ============================================================ */}
            <div 
              className="grid grid-cols-2 gap-1.5 p-2 rounded-xl border mb-2"
              style={{ borderColor: borderDynamic }}
            >
              <div className="text-center">
                <span className={`text-[7px] uppercase block ${textMutedClass}`}>Productos</span>
                <span className={`text-xs font-bold ${textMainClass}`}>{products.length}</span>
              </div>
              <div className="text-center">
                <span className={`text-[7px] uppercase block ${textMutedClass}`}>En oferta</span>
                <span className={`text-xs font-bold ${textMainClass}`}>{analysis.onSale}</span>
              </div>
            </div>

            {/* ============================================================
                💰 SECCIÓN: PRECIOS
                ============================================================ */}
            <div className="border-b" style={{ borderColor: borderDynamic }}>
              <SectionHeader
                icon={DollarSign}
                title="Precios"
                section="prices"
                isActive={activeSection === 'prices'}
                onToggle={toggleSection}
                primary={primary}
                textMutedClass={textMutedClass}
                textMainClass={textMainClass}
                isLight={isLight}
              />
              <SectionContent isActive={activeSection === 'prices'}>
                <RangeInput
                  label="USD"
                  minKey="minPriceUsd"
                  maxKey="maxPriceUsd"
                  minVal={filters.minPriceUsd}
                  maxVal={filters.maxPriceUsd}
                  step={0.01}
                  prefix="$"
                  onFilterChange={handleFilterChange}
                  textMainClass={textMainClass}
                  textMutedClass={textMutedClass}
                  isLight={isLight}
                  borderDynamic={borderDynamic}
                />
                <RangeInput
                  label="VES (Bs.)"
                  minKey="minPriceVes"
                  maxKey="maxPriceVes"
                  minVal={filters.minPriceVes}
                  maxVal={filters.maxPriceVes}
                  step={0.01}
                  prefix="Bs. "
                  onFilterChange={handleFilterChange}
                  textMainClass={textMainClass}
                  textMutedClass={textMutedClass}
                  isLight={isLight}
                  borderDynamic={borderDynamic}
                />
                <RangeInput
                  label="EUR"
                  minKey="minPriceEur"
                  maxKey="maxPriceEur"
                  minVal={filters.minPriceEur}
                  maxVal={filters.maxPriceEur}
                  step={0.01}
                  prefix="€"
                  onFilterChange={handleFilterChange}
                  textMainClass={textMainClass}
                  textMutedClass={textMutedClass}
                  isLight={isLight}
                  borderDynamic={borderDynamic}
                />
                <RangeInput
                  label="USDT / CRYPTO"
                  minKey="minPriceCrypto"
                  maxKey="maxPriceCrypto"
                  minVal={filters.minPriceCrypto}
                  maxVal={filters.maxPriceCrypto}
                  step={0.01}
                  prefix="$"
                  onFilterChange={handleFilterChange}
                  textMainClass={textMainClass}
                  textMutedClass={textMutedClass}
                  isLight={isLight}
                  borderDynamic={borderDynamic}
                />
              </SectionContent>
            </div>

            {/* ============================================================
                🏷️ SECCIÓN: OFERTAS Y DESCUENTOS
                ============================================================ */}
            <div className="border-b" style={{ borderColor: borderDynamic }}>
              <SectionHeader
                icon={Tag}
                title="Ofertas y Descuentos"
                section="discounts"
                badge={analysis.onSale}
                isActive={activeSection === 'discounts'}
                onToggle={toggleSection}
                primary={primary}
                textMutedClass={textMutedClass}
                textMainClass={textMainClass}
                isLight={isLight}
              />
              <SectionContent isActive={activeSection === 'discounts'}>
                <ToggleButton
                  label="Solo productos en oferta"
                  checked={filters.onlyOnSale}
                  onChange={(val) => handleFilterChange('onlyOnSale', val)}
                  icon={Tag}
                  textMainClass={textMainClass}
                  primary={primary}
                />
                
                <RangeInput
                  label="Porcentaje de descuento"
                  minKey="minDiscountPercentage"
                  maxKey="maxDiscountPercentage"
                  minVal={filters.minDiscountPercentage}
                  maxVal={filters.maxDiscountPercentage}
                  step={1}
                  suffix="%"
                  onFilterChange={handleFilterChange}
                  textMainClass={textMainClass}
                  textMutedClass={textMutedClass}
                  isLight={isLight}
                  borderDynamic={borderDynamic}
                />
                
                <div className="flex justify-between text-[8px] opacity-50">
                  <span>0%</span>
                  <span>{analysis.discount.max}%</span>
                </div>
              </SectionContent>
            </div>

            {/* ============================================================
                🏷️ SECCIÓN: MARCAS, CONDICIONES Y GARANTÍAS
                ============================================================ */}
            <div className="border-b" style={{ borderColor: borderDynamic }}>
              <SectionHeader
                icon={Building2}
                title="Marcas y Condiciones"
                section="brands"
                isActive={activeSection === 'brands'}
                onToggle={toggleSection}
                primary={primary}
                textMutedClass={textMutedClass}
                textMainClass={textMainClass}
                isLight={isLight}
              />
              <SectionContent isActive={activeSection === 'brands'}>
                {Array.from(analysis.brands).length > 0 && (
                  <ChipSelect
                    items={Array.from(analysis.brands)}
                    selected={filters.selectedBrands}
                    onChange={(val) => handleFilterChange('selectedBrands', val)}
                    label="Marcas"
                    textMutedClass={textMutedClass}
                    textMainClass={textMainClass}
                    primary={primary}
                    borderDynamic={borderDynamic}
                    isLight={isLight}
                  />
                )}
                
                {Array.from(analysis.conditions).length > 0 && (
                  <ChipSelect
                    items={Array.from(analysis.conditions)}
                    selected={filters.selectedConditions}
                    onChange={(val) => handleFilterChange('selectedConditions', val)}
                    label="Condiciones"
                    textMutedClass={textMutedClass}
                    textMainClass={textMainClass}
                    primary={primary}
                    borderDynamic={borderDynamic}
                    isLight={isLight}
                  />
                )}
                
                {Array.from(analysis.warranties).length > 0 && (
                  <ChipSelect
                    items={Array.from(analysis.warranties)}
                    selected={filters.selectedWarranties}
                    onChange={(val) => handleFilterChange('selectedWarranties', val)}
                    label="Garantías"
                    textMutedClass={textMutedClass}
                    textMainClass={textMainClass}
                    primary={primary}
                    borderDynamic={borderDynamic}
                    isLight={isLight}
                  />
                )}
              </SectionContent>
            </div>

            {/* ============================================================
                🏷️ SECCIÓN: FEATURES / TAGS
                ============================================================ */}
            {Array.from(analysis.features).length > 0 && (
              <div className="border-b" style={{ borderColor: borderDynamic }}>
                <SectionHeader
                  icon={Sparkles}
                  title="Etiquetas y Características"
                  section="features"
                  isActive={activeSection === 'features'}
                  onToggle={toggleSection}
                  primary={primary}
                  textMutedClass={textMutedClass}
                  textMainClass={textMainClass}
                  isLight={isLight}
                />
                <SectionContent isActive={activeSection === 'features'}>
                  <ChipSelect
                    items={Array.from(analysis.features)}
                    selected={filters.selectedFeatures}
                    onChange={(val) => handleFilterChange('selectedFeatures', val)}
                    label="Etiquetas"
                    textMutedClass={textMutedClass}
                    textMainClass={textMainClass}
                    primary={primary}
                    borderDynamic={borderDynamic}
                    isLight={isLight}
                  />
                  
                  <ToggleButton
                    label="Coincidir con todas las etiquetas"
                    checked={filters.matchAllFeatures}
                    onChange={(val) => handleFilterChange('matchAllFeatures', val)}
                    textMainClass={textMainClass}
                    primary={primary}
                  />
                </SectionContent>
              </div>
            )}

            {/* ============================================================
                ⏱️ SECCIÓN: SERVICIOS
                ============================================================ */}
            {(Array.from(analysis.serviceModalities).length > 0 || analysis.duration.max > 0) && (
              <div className="border-b" style={{ borderColor: borderDynamic }}>
                <SectionHeader
                  icon={Clock}
                  title="Servicios"
                  section="services"
                  isActive={activeSection === 'services'}
                  onToggle={toggleSection}
                  primary={primary}
                  textMutedClass={textMutedClass}
                  textMainClass={textMainClass}
                  isLight={isLight}
                />
                <SectionContent isActive={activeSection === 'services'}>
                  {Array.from(analysis.serviceModalities).length > 0 && (
                    <ChipSelect
                      items={Array.from(analysis.serviceModalities)}
                      selected={filters.serviceModalities}
                      onChange={(val) => handleFilterChange('serviceModalities', val)}
                      label="Modalidades"
                      textMutedClass={textMutedClass}
                      textMainClass={textMainClass}
                      primary={primary}
                      borderDynamic={borderDynamic}
                      isLight={isLight}
                    />
                  )}
                  
                  {analysis.duration.max > 0 && (
                    <RangeInput
                      label="Duración (minutos)"
                      minKey="minDuration"
                      maxKey="maxDuration"
                      minVal={filters.minDuration}
                      maxVal={filters.maxDuration}
                      step={5}
                      suffix=" min"
                      onFilterChange={handleFilterChange}
                      textMainClass={textMainClass}
                      textMutedClass={textMutedClass}
                      isLight={isLight}
                      borderDynamic={borderDynamic}
                    />
                  )}

                  {Array.from(analysis.certifications).length > 0 && (
                    <ChipSelect
                      items={Array.from(analysis.certifications)}
                      selected={filters.selectedCertifications}
                      onChange={(val) => handleFilterChange('selectedCertifications', val)}
                      label="Certificaciones"
                      textMutedClass={textMutedClass}
                      textMainClass={textMainClass}
                      primary={primary}
                      borderDynamic={borderDynamic}
                      isLight={isLight}
                    />
                  )}

                  {Array.from(analysis.materials).length > 0 && (
                    <ChipSelect
                      items={Array.from(analysis.materials)}
                      selected={filters.selectedMaterials}
                      onChange={(val) => handleFilterChange('selectedMaterials', val)}
                      label="Materiales / Equipamiento"
                      textMutedClass={textMutedClass}
                      textMainClass={textMainClass}
                      primary={primary}
                      borderDynamic={borderDynamic}
                      isLight={isLight}
                    />
                  )}
                </SectionContent>
              </div>
            )}

            {/* ============================================================
                📊 SECCIÓN: ORDENAR
                ============================================================ */}
            <div className="border-b" style={{ borderColor: borderDynamic }}>
              <SectionHeader
                icon={SlidersHorizontal}
                title="Ordenar"
                section="sort"
                isActive={activeSection === 'sort'}
                onToggle={toggleSection}
                primary={primary}
                textMutedClass={textMutedClass}
                textMainClass={textMainClass}
                isLight={isLight}
              />
              <SectionContent isActive={activeSection === 'sort'}>
                <SearchableDropdown
                  value={filters.sortBy}
                  onChange={(val) => handleFilterChange('sortBy', val as FilterState['sortBy'])}
                  options={[
                    { value: 'newest', label: 'Más recientes' },
                    { value: 'oldest', label: 'Más antiguos' },
                    { value: 'popular', label: 'Más populares' },
                    { value: 'price_asc', label: 'Precio: menor a mayor' },
                    { value: 'price_desc', label: 'Precio: mayor a menor' },
                    { value: 'discount_desc', label: 'Mayor descuento' },
                    { value: 'rating_desc', label: 'Mejor calificación' },
                    { value: 'name_asc', label: 'Nombre: A-Z' },
                    { value: 'name_desc', label: 'Nombre: Z-A' },
                  ]}
                  placeholder="Ordenar"
                  primary={primary}
                  textColor={isLight ? '#1a1a2e' : '#e2e8f0'}
                  isDarkBg={!isLight}
                  borderColor={borderDynamic}
                  searchable={false}
                />
              </SectionContent>
            </div>

            {/* ============================================================
                🔥 BOTONES DE ACCIÓN
                ============================================================ */}
            <div 
              className="flex items-center gap-2 pt-3 border-t" 
              style={{ borderColor: borderDynamic }}
            >
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-bold transition hover:opacity-90 active:scale-95"
                style={{ 
                  backgroundColor: primary, 
                  color: isLight ? '#030712' : '#ffffff' 
                }}
              >
                Aplicar {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className={`flex-shrink-0 w-10 h-10 rounded-xl text-[10px] font-bold transition hover:opacity-80 flex items-center justify-center ${
                  isLight 
                    ? 'bg-slate-100 text-slate-700' 
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Badge de filtros activos */}
            {hasActiveFilters && (
              <div className="text-center pt-1">
                <span 
                  className={`text-[8px] font-medium px-2 py-0.5 rounded-full ${textMutedClass}`}
                  style={{
                    backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};