'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { DEFAULT_THEME } from '@/lib/branding';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { APP_PALETTES } from '../constants/palettes';
import { apiFetch } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import { useNearby } from '@/hooks/useNearby';
import { useLocationContext } from '@/app/context/LocationContext';
import { MapPin } from 'lucide-react';
import { DistanceBadge } from '@/components/cards/DistanceBadge';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
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
  if (!cat || cat === 'todos') return 'Todos los productos';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

// ============================================================
// CARD DE PRODUCTO
// ============================================================
const ProductCard = ({
  product,
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  exchangeRate,
  isLight,
  ivaType = 'excluded',
  ivaRate = 16,
  discountPercentage = 0,
  proximity,
}: any) => {
  // 🔥 IMAGEN
  const imageUrl = useMemo(() => {
    try {
      return getImageUrl({
        coverImage: product.coverImage,
        mediaUrls: product.mediaUrls,
      });
    } catch {
      return product.coverImage || null;
    }
  }, [product.coverImage, product.mediaUrls]);

  // 🔥 PRECIO BASE EN USD
  const basePriceUsd = useMemo(() => {
    // Prioridad 1: prices.USD del backend
    if (product.prices?.USD && Number(product.prices.USD) > 0) {
      return Number(product.prices.USD);
    }
    // Prioridad 2: attributes.prices.USD
    if (product.attributes?.prices?.USD && Number(product.attributes.prices.USD) > 0) {
      return Number(product.attributes.prices.USD);
    }
    // Prioridad 3: priceUsd directo
    if (product.priceUsd && Number(product.priceUsd) > 0) {
      return Number(product.priceUsd);
    }
    // Prioridad 4: convertir VES a USD con la tasa
    const priceVes = Number(product.price) || 0;
    if (priceVes > 0 && exchangeRate > 0) {
      return priceVes / exchangeRate;
    }
    // Fallback: usar price tal cual
    return priceVes;
  }, [product.prices, product.attributes, product.priceUsd, product.price, exchangeRate]);

  // 🔥 DESCUENTO
  const hasDiscount = product.onSale === true && discountPercentage > 0;

  // 🔥 CÁLCULO: precio base (sin IVA), precio con IVA, precio con descuento
  const calculation = useMemo(() => {
    // 1. Precio base (el que viene del backend, SIN IVA)
    let baseUsd = basePriceUsd;

    // Si el IVA es "included", el precio base REAL es: precio / (1 + ivaRate/100)
    if (ivaType === 'included') {
      baseUsd = basePriceUsd / (1 + ivaRate / 100);
    }

    // 2. Aplicar descuento al precio base
    let discountedBaseUsd = baseUsd;
    if (hasDiscount) {
      discountedBaseUsd = baseUsd * (1 - discountPercentage / 100);
    }

    // 3. Calcular IVA sobre el precio con descuento
    let ivaAmountUsd = 0;
    let finalUsd = discountedBaseUsd;

    if (ivaType === 'excluded') {
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalUsd = discountedBaseUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalUsd = discountedBaseUsd + ivaAmountUsd;
    }
    // exempt: no suma IVA

    // 4. Convertir a VES
    const finalVes = exchangeRate > 0 ? finalUsd * exchangeRate : 0;
    const originalVes = hasDiscount
      ? (ivaType === 'included'
          ? basePriceUsd
          : basePriceUsd * (1 + ivaRate / 100)) * (exchangeRate > 0 ? exchangeRate : 1)
      : 0;

    return {
      baseUsd,
      finalUsd,
      finalVes,
      originalVes,
      originalUsd: hasDiscount
        ? (ivaType === 'included' ? basePriceUsd : basePriceUsd * (1 + ivaRate / 100))
        : 0,
    };
  }, [basePriceUsd, ivaType, ivaRate, hasDiscount, discountPercentage, exchangeRate]);

  // 🔥 FORMATO
  const formatPrice = (num: number): string => {
    if (isNaN(num) || num <= 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 🔥 BADGE DE IVA
  const ivaBadge = useMemo(() => {
    if (ivaType === 'included') {
      return { label: `IVA ${ivaRate}% Inc.`, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
    }
    if (ivaType === 'exempt') {
      return { label: 'Exento', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
    }
    return { label: `+ ${ivaRate}% IVA`, color: '#f59e0b', bg: 'rgba(251,191,36,0.15)' };
  }, [ivaType, ivaRate]);

  const tenantSlug = product.tenant?.slug;
  const storeHref = tenantSlug ? `/tienda/${tenantSlug}?producto=${product.id}` : '#';

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
      {/* IMAGEN */}
      <div
        className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2.5 border"
        style={{ borderColor: `${primaryColor}20`, backgroundColor: 'rgba(0,0,0,0.05)' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">📦</span>
          </div>
        )}

        {/* 🔥 CERCANÍA - Arriba izquierda (prioridad sobre descuento) */}
        {proximity && (
          <div className="absolute top-2 left-2 z-10">
            <DistanceBadge proximity={proximity} primaryColor={primaryColor} />
          </div>
        )}

        {hasDiscount && (
          <div
            className={`absolute top-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-lg ${
              proximity ? 'right-2' : 'left-2'
            }`}
            style={{ backgroundColor: '#ef4444' }}
          >
            -{Math.round(discountPercentage)}%
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* NOMBRE */}
        <h3
          className={`text-xs font-bold leading-tight ${textColorClass} line-clamp-2`}
          title={product.name}
        >
          {product.name || 'Producto'}
        </h3>

        {/* TIENDA */}
        {product.tenant?.name && (
          <p
            className={`text-[10px] font-medium ${mutedTextColorClass} truncate`}
            style={{ opacity: 0.75 }}
          >
            {product.tenant.name}
          </p>
        )}

        {/* BADGE IVA */}
        <span
          className="text-[9px] font-semibold uppercase tracking-wider self-start px-1.5 py-0.5 rounded-full mt-0.5"
          style={{
            backgroundColor: ivaBadge.bg,
            color: ivaBadge.color,
            border: `1px solid ${ivaBadge.color}30`,
          }}
        >
          {ivaBadge.label}
        </span>

        {/* PRECIOS */}
        <div className="mt-auto pt-2">
          {hasDiscount ? (
            <>
              {/* Precio original tachado */}
              <div className={`text-[10px] line-through ${mutedTextColorClass}`} style={{ opacity: 0.5 }}>
                Bs. {formatPrice(calculation.originalVes)}
              </div>
              {/* Precio final VES + USD al lado */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-black" style={{ color: primaryColor }}>
                  Bs. {formatPrice(calculation.finalVes)}
                </span>
                <span
                  className="text-[10px] font-bold"
style={{ color: isLight ? '#065f46' : '#34d399' }}
                >
                  (${calculation.finalUsd.toFixed(2)})
                </span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold" style={{ color: '#f97316' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                    <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                    <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                  </svg>
                  -{Math.round(discountPercentage)}%
                </span>
              </div>
              {/* Desglose de IVA */}
              {ivaType === 'included' ? (
                <div className={`text-[9px] ${mutedTextColorClass} opacity-60 leading-none mt-0.5`}>
                  IVA {ivaRate}% incluido
                </div>
              ) : ivaType === 'exempt' ? (
                <div className={`text-[9px] ${mutedTextColorClass} opacity-60 leading-none mt-0.5`}>
                  Exento de IVA
                </div>
              ) : (
                <div className={`text-[9px] ${mutedTextColorClass} opacity-60 leading-none mt-0.5`}>
                  Base: Bs. {formatPrice(calculation.baseUsd * exchangeRate)} + {ivaRate}% IVA
                </div>
              )}
              {/* Ahorro */}
              <div className="text-[9px] text-emerald-500 font-medium mt-0.5">
                Ahorro: Bs. {formatPrice(calculation.originalVes - calculation.finalVes)}
              </div>
            </>
          ) : (
            <>
              {/* Precio VES + USD al lado */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-black" style={{ color: primaryColor }}>
                  Bs. {formatPrice(calculation.finalVes)}
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: isLight ? '#065f46' : '#34d399' }}
                                  >
                  (${calculation.finalUsd.toFixed(2)})
                </span>
              </div>
              {/* Desglose de IVA */}
              {ivaType === 'excluded' && ivaRate > 0 && (
                <div className={`text-[9px] ${mutedTextColorClass} opacity-60 leading-none mt-0.5`}>
                  Base: Bs. {formatPrice(calculation.baseUsd * exchangeRate)} + {ivaRate}%
                </div>
              )}
              {ivaType === 'included' && (
                <div className={`text-[9px] ${mutedTextColorClass} opacity-60 leading-none mt-0.5`}>
                  IVA {ivaRate}% incluido
                </div>
              )}
              {ivaType === 'exempt' && (
                <div className={`text-[9px] ${mutedTextColorClass} opacity-60 leading-none mt-0.5`}>
                  Exento de IVA
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

// ============================================================
// SIDEBAR DE CATEGORÍAS
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
  totalProducts,
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
        {/* BÚSQUEDA */}
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
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-all ${textColorClass}`}
              style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderColor: `${primaryColor}20`,
              }}
            />
          </div>
        </div>

        {/* CATEGORÍAS */}
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${mutedTextColorClass}`}>
            Categorías
          </label>
          <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto pr-1">
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
              <span className="truncate">Todos los productos</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: selectedCategory === 'todos' ? primaryColor : 'rgba(255,255,255,0.08)',
                  color: selectedCategory === 'todos' ? '#fff' : undefined,
                }}
              >
                {totalProducts}
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
// CONTENIDO PRINCIPAL
// ============================================================
function ProductosContent() {
  const searchParams = useSearchParams();
  const { rates } = useExchangeRateContext();
  const exchangeRate = rates.USD > 0 ? rates.USD : 0;

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

  // 🔒 FORZAR variables CSS del tema por defecto en el <html>
  // (para que Header y Footer también lo hereden)
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

    // Restaurar al salir (opcional)
    return () => {
      // No restauramos porque la home lo re-aplicará al volver
    };
  }, []);

  const initialCategory = searchParams.get('category') || 'todos';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'recent';

  const [products, setProducts] = useState<any[]>([]);
    const { location } = useLocationContext();
  const nearby = useNearby<any>('products', { radiusKm: 100, limit: 100 });
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

  // Debounce búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setOffset(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Cargar categorías una vez (con contador global)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiFetch('/products/public/all?limit=1&offset=0');
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

  // Cargar productos cuando cambian filtros
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

        const res = await apiFetch(`/products/public/all?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data?.items) ? data.items : []);
          setTotal(Number(data?.total) || 0);
          setOffset(LIMIT);
        }
      } catch (e) {
        console.error('Error cargando productos:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    // Actualizar URL
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

      const res = await apiFetch(`/products/public/all?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = Array.isArray(data?.items) ? data.items : [];
        setProducts((prev) => [...prev, ...newItems]);
        setOffset((prev) => prev + LIMIT);
      }
    } catch (e) {
      console.error('Error cargando más productos:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, selectedCategory, debouncedSearch, sort]);

  const hasMore = products.length < total;

  // 🔥 ORDENAR POR CERCANÍA SI HAY UBICACIÓN
  const sortedProducts = useMemo(() => {
    if (!nearby.isActive || !nearby.items || nearby.items.length === 0) {
      return products;
    }
    const distanceMap = new Map<string, number>();
    for (const item of nearby.items as any[]) {
      const key = item?.id || item?._id;
      if (key && typeof item.distanceKm === 'number') {
        distanceMap.set(String(key), item.distanceKm);
      }
    }
    return [...products].sort((a, b) => {
      const da = distanceMap.get(String(a.id || a._id));
      const db = distanceMap.get(String(b.id || b._id));
      if (da !== undefined && db !== undefined) return da - db;
      if (da !== undefined) return -1;
      if (db !== undefined) return 1;
      return 0;
    });
  }, [products, nearby.isActive, nearby.items]);

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
              Catálogo de productos
            </h1>
            <p className={`text-sm ${mutedTextColorClass} mt-1`}>
              {totalAll} producto{totalAll !== 1 ? 's' : ''} de todas las tiendas
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
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                primaryColor={primaryColor}
                textColorClass={textColorClass}
                mutedTextColorClass={mutedTextColorClass}
                totalProducts={totalAll}
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
                        { value: 'discount', label: 'Mayor descuento' },
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

              {/* GRID */}
              {isLoading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                      style={{ borderColor: primaryColor }}
                    />
                    <p className={`text-sm font-medium ${mutedTextColorClass}`}>Cargando productos...</p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                  <span className="text-5xl opacity-30">📦</span>
                  <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                    No se encontraron productos que coincidan con tu búsqueda.
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
                    {sortedProducts.map((product) => (                      <ProductCard
                        key={product.id}
                        product={product}
                        primaryColor={primaryColor}
                        textColorClass={textColorClass}
                        mutedTextColorClass={mutedTextColorClass}
                        exchangeRate={exchangeRate}
                        isLight={isLight}
                        ivaType={product?.ivaType || product?.attributes?.ivaType || 'excluded'}
                        ivaRate={Number(product?.ivaRate || product?.attributes?.ivaRate || 16)}
                        discountPercentage={Number(product?.discountPercentage) || 0}
                        proximity={nearby.applyProximity(product)}
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
                          <>Cargar más productos</>
                        )}
                      </button>
                    </div>
                  )}

                  <p className={`text-center text-[11px] mt-6 ${mutedTextColorClass}`}>
                    Mostrando {products.length} de {total} productos
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
export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ProductosContent />
    </Suspense>
  );
}