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
  if (!cat || cat === 'todos') return 'Todos los productos';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
};

// ============================================================
// CARD DE PRODUCTO (idéntica a app/productos/page.tsx)
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
    if (product.prices?.USD && Number(product.prices.USD) > 0) {
      return Number(product.prices.USD);
    }
    if (product.attributes?.prices?.USD && Number(product.attributes.prices.USD) > 0) {
      return Number(product.attributes.prices.USD);
    }
    if (product.priceUsd && Number(product.priceUsd) > 0) {
      return Number(product.priceUsd);
    }
    const priceVes = Number(product.price) || 0;
    if (priceVes > 0 && exchangeRate > 0) {
      return priceVes / exchangeRate;
    }
    return priceVes;
  }, [product.prices, product.attributes, product.priceUsd, product.price, exchangeRate]);

  // 🔥 DESCUENTO
  const hasDiscount = product.onSale === true && discountPercentage > 0;

  // 🔥 CÁLCULO
  const calculation = useMemo(() => {
    let baseUsd = basePriceUsd;

    if (ivaType === 'included') {
      baseUsd = basePriceUsd / (1 + ivaRate / 100);
    }

    let discountedBaseUsd = baseUsd;
    if (hasDiscount) {
      discountedBaseUsd = baseUsd * (1 - discountPercentage / 100);
    }

    let ivaAmountUsd = 0;
    let finalUsd = discountedBaseUsd;

    if (ivaType === 'excluded') {
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalUsd = discountedBaseUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalUsd = discountedBaseUsd + ivaAmountUsd;
    }

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
      className="group relative p-3 rounded-3xl border transition-transform duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col overflow-hidden"
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

        {/* 🔥 CERCANÍA */}
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
              <div className={`text-[10px] line-through ${mutedTextColorClass}`} style={{ opacity: 0.5 }}>
                Bs. {formatPrice(calculation.originalVes)}
              </div>
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
            </>
          ) : (
            <>
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
  totalProducts,
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
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border outline-none transition-colors"
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
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
function AvailableProductsSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
  secondaryColor,            // ✅ Recibido del padre (no se usa pero queda por compatibilidad)
  backgroundCardBg,
  isLight = false,
}: any) {
  const { rates } = useExchangeRateContext();
  const exchangeRate = rates.USD > 0 ? rates.USD : 0;

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const { location, clearLocation } = useLocationContext();
  const nearby = useNearby<any>('products', { radiusKm: 100, limit: 100 });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (nearby.isActive) {
          if (nearby.items) {
            setProducts(nearby.items);
            setVisibleCount(8);
            setIsLoading(false);
          } else if (nearby.isLoading) {
            setIsLoading(true);
          } else if (nearby.error) {
const res = await apiFetch('/products/public/all?limit=12&offset=0');
            if (res.ok) {
              const data = await res.json();
              const items = Array.isArray(data?.items) ? data.items : [];
              const cats = Array.isArray(data?.categories) ? data.categories : [];
              setProducts(items);
              setCategories(cats);
              setTotalProducts(Number(data?.total) || items.length);
            }
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
const res = await apiFetch('/products/public/all?limit=12&offset=0');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          const cats = Array.isArray(data?.categories) ? data.categories : [];

          setProducts(items);
          setCategories(cats);
          setTotalProducts(Number(data?.total) || items.length);
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        if (!nearby.isActive || !nearby.isLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchProducts();
  }, [nearby.isActive, nearby.items, nearby.isLoading, nearby.error]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'todos' || p.category === selectedCategory;

      const matchesSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tenant?.name?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

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

  const hasMore = visibleProducts.length < filteredProducts.length;
  const hasProducts = filteredProducts.length > 0;

  const viewAllHref =
    selectedCategory === 'todos'
      ? '/productos'
      : `/productos?category=${encodeURIComponent(selectedCategory)}`;

  if (isLoading) {
    return (
      <section className="w-full py-12 px-6 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: primaryColor }}
              ></div>
              <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                Cargando productos y articulos...
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <span
            className="text-xs font-bold uppercase tracking-[0.25em] block mb-2"
            style={{ color: primaryColor }}
          >
            Catálogo de productos y articulos
          </span>
          <h2 className={`text-3xl sm:text-5xl font-black tracking-tight ${textColorClass} mb-3`}>
            Que deseas comprar hoy?
          </h2>
          <p className={`text-sm sm:text-base ${mutedTextColorClass} font-medium leading-relaxed max-w-3xl`}>
            Explora productos y articulos de todas las tiendas de la comunidad.
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
              Mostrando productos y articulos cerca de ti
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

        {/* LAYOUT 2 COLUMNAS */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* SIDEBAR */}
          <div className={`${mobileFiltersOpen ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}>
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={handleCategorySelect}
              searchInput={searchQuery}
              onSearchChange={handleSearchChange}
              primaryColor={primaryColor}
              mutedTextColorClass={mutedTextColorClass}
              totalProducts={totalProducts}
            />
          </div>

          {/* GRID */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {hasProducts ? (
                visibleProducts.map((product, index) => {
                  const tenantSlug = product.tenant?.slug;
                  const storeHref = tenantSlug
                    ? `/tienda/${tenantSlug}?producto=${product.id}`
                    : '#';

                  return (
                    <Link
                      key={product.id || product._id}
                      href={storeHref}
                      className="block"
                    >
                      <ProductCard
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
                    </Link>
                  );
                })
              ) : nearby.isActive ? (
                <NearbyEmptyState
                  itemLabel="productos"
                  primaryColor={primaryColor}
                  textColorClass={textColorClass}
                  mutedTextColorClass={mutedTextColorClass}
                />
              ) : (
                <div className="col-span-full py-16 text-center">
                  <p className={`text-sm font-medium ${mutedTextColorClass}`}>
                    No se encontraron productos que coincidan con tu búsqueda.
                  </p>
                </div>
              )}
            </div>

            {hasProducts && (
              <div className="flex flex-col items-center gap-3 mt-8">
                <p className={`text-[11px] font-medium ${mutedTextColorClass}`}>
                  Mostrando {visibleProducts.length} de {filteredProducts.length} productos
                </p>

                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {hasMore && (
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      Ver más productos
                    </button>
                  )}

                  {visibleCount > 8 && (
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

                  <Link
                    href={viewAllHref}
                    className="px-6 py-2.5 rounded-full text-xs font-bold transition-transform duration-300 hover:scale-105 border flex items-center gap-2"
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

export default React.memo(AvailableProductsSection);