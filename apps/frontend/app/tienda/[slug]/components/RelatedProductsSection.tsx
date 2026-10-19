'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';

// ============================================================
// 🔥 COMPONENTE PRINCIPAL - PRODUCTOS RELACIONADOS
// ============================================================
interface RelatedProductsSectionProps {
  textColorClass: string;
  mutedTextColorClass: string;
  primaryColor: string;
  secondaryColor?: string;
  isSecondaryLight: boolean;
  backgroundCardBg?: string;
  currentProductId?: string;
  currentProductCategory?: string;
  currentStoreId?: string;
  limit?: number;
  title?: string;
  subtitle?: string;
  getImageUrlFn?: (item: any) => string | null;
}

export default function RelatedProductsSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
  secondaryColor,
  isSecondaryLight,
  backgroundCardBg,
  currentProductId,
  currentProductCategory,
  currentStoreId,
  limit = 5,
  title = 'Productos relacionados',
  subtitle = 'Descubre productos similares en otras tiendas',
  getImageUrlFn,
}: RelatedProductsSectionProps) {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLight = isSecondaryLight;

  // 🔥 Cargar productos
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
const res = await apiFetch('/products/public/all?limit=20&offset=0');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          setAllProducts(items);
        }
      } catch (error) {
        console.error('Error cargando productos relacionados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  // 🔥 Filtrar productos relacionados
  // ✅ Solo muestra productos de la MISMA categoría. Si no hay, no muestra nada.
  const relatedProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];
    // ✅ Sin categoría actual → no mostrar nada (evita mostrar productos aleatorios)
    if (!currentProductCategory) return [];

    let filtered = [...allProducts];

    // Excluir el producto actual
    if (currentProductId) {
      filtered = filtered.filter(
        (p: any) => p.id !== currentProductId && p._id !== currentProductId
      );
    }

    // Excluir productos de la misma tienda
    if (currentStoreId) {
      filtered = filtered.filter((p: any) => {
        const tenantId = p.tenant?.id || p.tenant?._id;
        return tenantId !== currentStoreId;
      });
    }

    // ✅ SOLO de la misma categoría (sin fallback)
    filtered = filtered.filter((p: any) => {
      const cat = p.category || p.categoria;
      return cat === currentProductCategory;
    });

    return filtered.slice(0, limit);
  }, [allProducts, currentProductId, currentProductCategory, currentStoreId, limit]);

  const displayProducts = relatedProducts;
  const totalSlides = displayProducts.length;

  // 🔥 Responsive: detectar columnas
  const [slidesToShow, setSlidesToShow] = useState(4);

  useEffect(() => {
    const updateSlides = () => {
      const width = window.innerWidth;
      if (width < 640) setSlidesToShow(1);
      else if (width < 768) setSlidesToShow(2);
      else if (width < 1024) setSlidesToShow(3);
      else setSlidesToShow(4);
    };

    updateSlides();
    window.addEventListener('resize', updateSlides);
    return () => window.removeEventListener('resize', updateSlides);
  }, []);

  const visibleSlides = Math.min(slidesToShow, totalSlides);
  const effectiveSlides = slidesToShow;

  // 🔥 Autoplay
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

  // 🔥 Pausa al hover
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

  // Reset index si cambia el producto
  useEffect(() => {
    setCurrentIndex(0);
  }, [currentProductId]);

  if (isLoading || allProducts.length === 0 || relatedProducts.length === 0) {
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

  const borderColor = `${primaryColor}30`;

  // 🔥 Helper para formatear precio
  const formatPrice = (num: number | string | undefined): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(Number(value)) || Number(value) === 0) return '0,00';
    return Number(value).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 🔥 Obtener precio del producto
  const getProductPrice = (product: any) => {
    if (product._pricing) {
      return {
        ves: Number(product._pricing.totalPriceVES || 0),
        usd: Number(product._pricing.totalPriceUSD || 0),
      };
    }
    const prices = {
      ...(product.attributes?.prices || {}),
      ...(product.prices || {}),
    };
    let ves = Number(prices.VES || product.price || 0);
    let usd = Number(prices.USD || product.priceUsd || 0);
    return { ves, usd };
  };

  return (
    <div className="w-full py-2 mt-4">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: isLight
                  ? 'rgba(0,0,0,0.04)'
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              <ShoppingBag className="w-4 h-4" style={{ color: primaryColor }} />
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
            className="text-[9px] font-bold px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: isLight
                ? 'rgba(0,0,0,0.04)'
                : 'rgba(255,255,255,0.06)',
              color: mutedTextColorClass,
            }}
          >
            {displayProducts.length} productos
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
              style={{
                transform: `translateX(-${currentIndex * (100 / effectiveSlides)}%)`,
              }}
            >
                            {displayProducts.map((product) => {
                const productId = product.id || product._id;
                const productName = product.name || product.nombre || 'Producto';
                const tenantSlug = product.tenant?.slug;
                const storeHref = tenantSlug
                  ? `/tienda/${tenantSlug}?producto=${productId}`
                  : '#';

                // 🔥 Imagen procesada
                const processedImage = getImageUrlFn
                  ? getImageUrlFn(product)
                  : (() => {
                      try {
                        return getImageUrl(product);
                      } catch {
                        return product.coverImage || null;
                      }
                    })();

                const { ves, usd } = getProductPrice(product);

                // 🔥 Descuento
                const pricing = product._pricing || {};
                const hasDiscount =
                  Boolean(pricing.hasDiscount) &&
                  Number(pricing.discountPercentage) > 0;
                const discountPercentage = Number(pricing.discountPercentage || 0);
                const originalVes = Number(pricing.originalPriceVES || ves);

                // 🔥 Fondo dinámico de la card
                const cardBackground = isLight
                  ? 'rgba(255, 255, 255, 0.90)'
                  : secondaryColor
                  ? `${secondaryColor}D9`
                  : 'rgba(0, 0, 0, 0.85)';

                return (
                  <div
                    key={productId}
                    className="flex-shrink-0 px-2"
                    style={{ width: `${100 / effectiveSlides}%` }}
                  >
                    <Link
                      href={storeHref}
                      className="group relative p-2.5 rounded-[2rem] border transition-transform duration-300 hover:-translate-y-1.5 flex items-start overflow-hidden min-h-[88px]"
                                             style={{
                        backgroundColor: cardBackground,
                        borderColor: hasDiscount ? primaryColor : borderColor,
                        boxShadow: hasDiscount
                          ? `0 0 20px -5px ${primaryColor}30`
                          : `0 8px 20px -10px ${primaryColor}20`,
                        willChange: 'transform',
                      }}
                    >
                      {/* 🔥 Badge de descuento flotante */}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 z-20">
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-black shadow-md"
                            style={{
                              backgroundColor: primaryColor,
                              color: '#ffffff',
                            }}
                          >
                            -{discountPercentage}%
                          </span>
                        </div>
                      )}

                      <div className="relative z-10 flex gap-2 w-full">
                                                {/* Imagen */}
                        <div
                          className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden border shadow-md"
                                                     style={{
                            borderColor: `${primaryColor}40`,
                            backgroundColor: isLight
                              ? 'rgba(0,0,0,0.04)'
                              : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          {processedImage ? (
                            <img
                              src={processedImage}
                              alt={productName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              width="80"
                              height="80"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-40">
                              <ShoppingBag
                                className="w-6 h-6"
                                style={{ color: primaryColor }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          {/* 🔥 Nombre + tienda pegados arriba */}
                          <h3
                            className={`text-xs font-bold leading-tight ${textColorClass} group-hover:opacity-90 transition-opacity line-clamp-2`}
                                                        title={productName}
                          >
                            {productName.length > 40
                              ? productName.slice(0, 40) + '...'
                              : productName}
                          </h3>

                          {product.tenant?.name && (
                            <p
                              className={`text-[9px] font-medium ${mutedTextColorClass} line-clamp-1 mt-0.5`}
                              style={{ opacity: 0.85 }}
                            >
                              {product.tenant.name}
                            </p>
                          )}



                          {/* 🔥 Precio pegado abajo */}
                          <div>
                            {hasDiscount ? (
                              <div className="flex flex-col">
                                <span
                                  className={`text-[9px] line-through opacity-50 ${mutedTextColorClass}`}
                                >
                                  Bs. {formatPrice(originalVes)}
                                </span>
                                <div className="flex items-baseline gap-1 flex-wrap">
                                  <span
                                    className="text-sm font-black tracking-tight"
                                    style={{ color: primaryColor }}
                                  >
                                    Bs. {formatPrice(ves)}
                                  </span>
                                  {usd > 0 && (
                                    <span
                                      className="text-[9px] font-bold"
                                      style={{
                                        color: isLight ? '#065f46' : '#34d399',
                                      }}
                                    >
                                      (${usd.toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-baseline gap-1 flex-wrap">
                                <span
                                  className="text-sm font-black tracking-tight"
                                  style={{ color: primaryColor }}
                                >
                                  Bs. {formatPrice(ves)}
                                </span>
                                {usd > 0 && (
                                  <span
                                    className="text-[9px] font-bold"
                                    style={{
                                      color: isLight ? '#065f46' : '#34d399',
                                    }}
                                  >
                                    (${usd.toFixed(2)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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
                                    isLight
                    ? 'bg-white/95 border-slate-200 text-slate-700'
                    : 'bg-black/70 border-white/20 text-white'
                } border`}
                style={{ transform: 'translateY(-50%)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= totalSlides - visibleSlides}
                className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-transform hover:scale-110 disabled:opacity-25 disabled:cursor-not-allowed -mr-2 ${
                                    isLight
                    ? 'bg-white/95 border-slate-200 text-slate-700'
                    : 'bg-black/70 border-white/20 text-white'
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
            {Array.from({
              length: Math.ceil(totalSlides / visibleSlides),
            }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx * visibleSlides)}
                className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                  Math.floor(currentIndex / visibleSlides) === idx
                    ? 'w-6'
                    : 'w-1.5'
                }`}
                style={{
                  backgroundColor:
                    Math.floor(currentIndex / visibleSlides) === idx
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