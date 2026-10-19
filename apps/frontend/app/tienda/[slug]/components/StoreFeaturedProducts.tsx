  'use client';

  import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
  import Image from 'next/image';
  import { ChevronLeft, ChevronRight, Award, Star } from 'lucide-react';

  // ============================================================
  // 🚀 FUNCIONES UTILITARIAS (FUERA DEL COMPONENTE)
  // ============================================================

  // 🔥 Formateo de precios (puro, sin dependencias)
  const formatPrice = (num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value) || value === 0) return '0,00';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 🔥 Obtener precios (pura)
  const getProductPrices = (product: any) => {
    let pricesObj = product?.prices;

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
      product?.price ?? 
      product?.precio ?? 
      product?.price_ves ?? 
      0
    );

    const usdVal = Number(
      pricesObj?.USD ?? 
      pricesObj?.usd ?? 
      product?.priceUsd ?? 
      product?.price_usd ?? 
      product?.usd ?? 
      product?.attributes?.prices?.USD ?? 
      0
    );

    return {
      VES: !isNaN(vesVal) ? vesVal : 0,
      USD: !isNaN(usdVal) ? usdVal : 0,
    };
  };

  // 🔥 Obtener IVA (pura)
  const getIvaInfo = (product: any) => {
    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);
    
    const basePrice = Number(product?.prices?.VES || product?.price || 0);
    let ivaAmount = 0;
    let priceWithIVA = basePrice;

    if (ivaType === 'excluded') {
      ivaAmount = basePrice * (ivaRate / 100);
      priceWithIVA = basePrice + ivaAmount;
    } else if (ivaType === 'included') {
      ivaAmount = basePrice - (basePrice / (1 + ivaRate / 100));
      priceWithIVA = basePrice;
    }

    return {
      ivaType,
      ivaRate,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100,
      priceWithIVA: Math.round(priceWithIVA * 100) / 100,
    };
  };

  // ============================================================
  // 🚀 SUBCOMPONENTE DE PRODUCTO INDIVIDUAL (MEMOIZADO)
  // ============================================================
const FeaturedProductItem = memo(({ 
  product,
  rank,
  isLight,
  textMainClass,
  textMutedClass,
  primary,
  borderDynamic,
  rankColors,
  onProductClick,
  getImageUrlFn,
  formatPriceFn,
  getProductPricesFn,
  getIvaInfoFn,
  exchangeRate,
}: any) => {
    // ✅ MEMOIZAR TODOS LOS CÁLCULOS
    const ivaInfo = useMemo(() => getIvaInfoFn(product), [product, getIvaInfoFn]);
    const prices = useMemo(() => getProductPricesFn(product), [product, getProductPricesFn]);
    const priceWithIVA = useMemo(() => ivaInfo.priceWithIVA, [ivaInfo]);
    
    const imageUrl = useMemo(() => getImageUrlFn(product), [product, getImageUrlFn]);
    
    const formattedPrice = useMemo(() => formatPriceFn(priceWithIVA), [priceWithIVA, formatPriceFn]);
    
// 🔥 CALCULAR USD CON IVA - CORREGIDO
const priceWithIVAUsd = useMemo(() => {
  // Si tenemos USD explícito en el producto
  if (prices.USD > 0) {
    // Si el IVA es INCLUIDO, el precio USD ya incluye IVA (no sumar nada)
    if (ivaInfo.ivaType === 'included') {
      return prices.USD;
    }
    // Si es EXCLUIDO, sumar el IVA
    if (ivaInfo.ivaType === 'excluded') {
      return prices.USD * (1 + (ivaInfo.ivaRate / 100));
    }
    // EXENTO - sin IVA
    return prices.USD;
  }
  
  // Si no hay USD explícito pero tenemos tasa, convertir desde VES
  if (priceWithIVA > 0 && exchangeRate > 0) {
    return priceWithIVA / exchangeRate;
  }
  
  return 0;
}, [prices.USD, ivaInfo.ivaType, ivaInfo.ivaRate, priceWithIVA, exchangeRate]);

const formattedUSD = useMemo(() => 
  priceWithIVAUsd > 0 ? formatPriceFn(priceWithIVAUsd) : '0,00',
  [priceWithIVAUsd, formatPriceFn]
);

    const isOutOfStock = useMemo(() => (product.stock || 0) <= 0, [product.stock]);
    const salesCount = useMemo(() => Number(product.soldCount || product.sales || 0), [product.soldCount, product.sales]);
    const productName = useMemo(() => product.name || 'Producto', [product.name]);

    // ✅ HANDLER MEMOIZADO
    const handleClick = useCallback(() => {
      onProductClick?.(product);
    }, [product, onProductClick]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onProductClick?.(product);
      }
    }, [product, onProductClick]);

    // ✅ RANK COLOR MEMOIZADO
    const rankColor = useMemo(() => {
      return rank < 4 ? rankColors[rank-1] : textMutedClass;
    }, [rank, rankColors, textMutedClass]);

    return (
      <div 
        className="flex-shrink-0 px-1 sm:px-1.5"
        style={{ width: `${100 / 5}%` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
<div 
className={`rounded-xl overflow-hidden cursor-pointer p-1.5 sm:p-2.5 border hover:bg-current/5 transition-colors duration-200 ${
      isLight 
      ? 'bg-white/80 shadow-sm hover:shadow-md border-slate-200/60' 
      : 'bg-black/40 shadow-md hover:shadow-lg border-white/10'
  }`}
  style={{
    height: 'auto',
    minHeight: '60px',
    maxHeight: '80px',
    display: 'flex',
    flexDirection: 'column',
  }}
>
          <div className="flex items-center gap-1.5 sm:gap-2.5 h-full">
            {/* Ranking */}
            <div 
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-black flex-shrink-0"
              style={{
                backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                color: rankColor
              }}
            >
              #{rank}
            </div>

            <div 
              className="relative rounded-lg overflow-hidden shrink-0"
              style={{ 
                borderColor: borderDynamic,
                borderWidth: '1px',
                borderStyle: 'solid',
                width: '32px',
                height: '32px',
                minWidth: '32px',
                minHeight: '32px',
                maxWidth: '32px',
                maxHeight: '32px',
                backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
              }}
            >
              {imageUrl ? (
                <Image 
                  src={imageUrl} 
                  alt={productName}
                  width={32}
                  height={32}
                  sizes="32px"
                  quality={60}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-30">
                  <span className="text-[5px]">Sin img</span>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-[4px] sm:text-[5px] font-bold uppercase text-white px-1 py-0.5 rounded border border-white/30 bg-black/60">
                    Agotado
                  </span>
                </div>
              )}
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className={`text-[8px] sm:text-[10px] font-bold truncate ${textMainClass}`}>
                {productName}
              </h4>
<div className="flex flex-wrap items-center gap-0.5 sm:gap-1.5 mt-0.5">
  <span className={`text-[8px] sm:text-[10px] font-black whitespace-nowrap`} style={{ color: primary }}>
    Bs. {formattedPrice}
  </span>
  {/* 🔥 PRECIO EN USD - VERDE COQUETOSO */}
  {priceWithIVAUsd > 0 && (
    <span 
      className="text-[6px] sm:text-[8px] font-semibold whitespace-nowrap"
      style={{ color: isLight ? '#15803d' : '#4ade80' }}
    >
      ${formattedUSD}
    </span>
  )}
</div>
              {salesCount > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Star className="w-1.5 h-1.5 sm:w-2 sm:h-2" style={{ color: primary, opacity: 0.6 }} />
                  <span className={`text-[5px] sm:text-[6px] font-medium ${textMutedClass} opacity-60`}>
                    {salesCount} ventas
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  FeaturedProductItem.displayName = 'FeaturedProductItem';

  // ============================================================
  // 🚀 COMPONENTE PRINCIPAL (MEMOIZADO)
  // ============================================================
  const StoreFeaturedProducts = memo(({
    primary,
    secondary,
    textMainClass,
    textMutedClass,
    isSecondaryLight,
    products = [],
    onProductClick,
    getImageUrl,
  }: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const isLight = isSecondaryLight;

    // 🔥 MEMOIZAR FUNCIONES PARA PASAR COMO PROPS
    const formatPriceFn = useCallback(formatPrice, []);
    const getProductPricesFn = useCallback(getProductPrices, []);
    const getIvaInfoFn = useCallback(getIvaInfo, []);

    // 🔥 DETECTAR TAMAÑO DE PANTALLA PARA SLIDES VISIBLES
    const [visibleSlides, setVisibleSlides] = useState(5);

    useEffect(() => {
      const updateVisibleSlides = () => {
        const width = window.innerWidth;
        if (width < 480) {
          setVisibleSlides(2); // Móvil pequeño: 2 productos
        } else if (width < 640) {
          setVisibleSlides(3); // Móvil grande: 3 productos
        } else if (width < 1024) {
          setVisibleSlides(4); // Tablet: 4 productos
        } else {
          setVisibleSlides(5); // Desktop: 5 productos
        }
      };

      updateVisibleSlides();
      window.addEventListener('resize', updateVisibleSlides);
      return () => window.removeEventListener('resize', updateVisibleSlides);
    }, []);

    // 🔥 MEMOIZAR PRODUCTOS DESTACADOS
    const displayProducts = useMemo(() => {
      if (!products || products.length === 0) return [];

      const availableProducts = products.filter((p: any) => (p.stock || 0) > 0);      
      const processedProducts = availableProducts
        .map((p: any) => {
          const ivaInfo = getIvaInfoFn(p);
          const prices = getProductPricesFn(p);
          return {
            ...p,
            _ivaInfo: ivaInfo,
            _prices: prices,
            _priceWithIVA: ivaInfo.priceWithIVA,
            _formattedPrice: formatPriceFn(ivaInfo.priceWithIVA),
            _formattedUSD: (prices.USD * (1 + (ivaInfo.ivaRate / 100))).toFixed(2),
            _salesCount: Number(p.soldCount || p.sales || 0),
          };
        });

      const featuredProducts = processedProducts
        .filter((p: any) => p._salesCount > 0)
        .sort((a: any, b: any) => b._salesCount - a._salesCount)
        .slice(0, 10);

      return featuredProducts.length > 0 ? featuredProducts : processedProducts.slice(0, 10);
    }, [products, getIvaInfoFn, getProductPricesFn, formatPriceFn]);

    const totalSlides = displayProducts.length;

    // ✅ AUTO-PLAY CON INTERVAL
    useEffect(() => {
      if (totalSlides <= visibleSlides) return;

      if (!isHovered) {
        // 🔥 INTERVALO MÁS LARGO EN MOBILE PARA REDUCIR RE-RENDERS
        const delay = typeof window !== 'undefined' && window.innerWidth < 768 ? 12000 : 5000;
        intervalRef.current = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % (totalSlides - visibleSlides + 1));
        }, delay);
      }

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [totalSlides, visibleSlides, isHovered]);

    const borderDynamic = useMemo(() => 
      isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
      [isLight]
    );

    const rankColors = useMemo(() => 
      ['#f59e0b', '#94a3b8', '#cd7f32', primary, primary],
      [primary]
    );

    const handlePrev = useCallback(() => {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }, []);

    const handleNext = useCallback(() => {
      setCurrentIndex(prev => Math.min(totalSlides - visibleSlides, prev + 1));
    }, [totalSlides, visibleSlides]);

    const goToSlide = useCallback((index: number) => {
      setCurrentIndex(Math.min(index, totalSlides - visibleSlides));
    }, [totalSlides, visibleSlides]);

    // ✅ EVITAR RENDER SI NO HAY PRODUCTOS
    if (displayProducts.length === 0) {
      return null;
    }

    return (
      <div className="w-full py-2 mt-2 sm:mt-4">
        <div className="w-full px-2 sm:px-4 md:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div 
                className="p-1 sm:p-1.5 rounded-lg"
                style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }}
              >
                <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: primary }} />
              </div>
              <div>
                <span className={`text-[9px] sm:text-[11px] font-black tracking-tight ${textMainClass}`}>
                  Más Vendidos
                </span>
                <span className={`text-[6px] sm:text-[8px] block ${textMutedClass}`}>
                  Los productos más populares
                </span>
              </div>
            </div>
            <span 
              className={`text-[6px] sm:text-[8px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full`}
              style={{ 
                backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                color: textMutedClass
              }}
            >
              Top {displayProducts.length}
            </span>
          </div>

          {/* Carrusel */}
          <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * (100 / visibleSlides)}%)` }}
              >
                {displayProducts.map((product: any, idx: number) => (
                                    <FeaturedProductItem
                    key={product.id || product._id || `product-${idx}`}
                    product={product}
                    rank={idx + 1}
                    isLight={isLight}
                    textMainClass={textMainClass}
                    textMutedClass={textMutedClass}
                    primary={primary}
                    borderDynamic={borderDynamic}
                    rankColors={rankColors}
                    onProductClick={onProductClick}
                    getImageUrlFn={getImageUrl}
                    formatPriceFn={formatPriceFn}
                    getProductPricesFn={getProductPricesFn}
                    getIvaInfoFn={getIvaInfoFn}
                  />
                ))}
              </div>
            </div>

            {totalSlides > visibleSlides && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 disabled:opacity-25 disabled:cursor-not-allowed -ml-1 sm:-ml-1.5 ${
                    isLight ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-black/70 border-white/20 text-white'
                  } border z-10`}
                  style={{ transform: 'translateY(-50%)' }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= totalSlides - visibleSlides}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 disabled:opacity-25 disabled:cursor-not-allowed -mr-1 sm:-mr-1.5 ${
                    isLight ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-black/70 border-white/20 text-white'
                  } border z-10`}
                  style={{ transform: 'translateY(-50%)' }}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </>
            )}
          </div>

          {totalSlides > visibleSlides && (
            <div className="flex justify-center gap-1 sm:gap-1.5 pt-1.5 sm:pt-2">
              {Array.from({ length: Math.ceil(totalSlides / visibleSlides) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx * visibleSlides)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    Math.floor(currentIndex / visibleSlides) === idx 
                      ? 'w-3 sm:w-5' 
                      : 'w-1.5 sm:w-1.5'
                  }`}
                  style={{
                    backgroundColor: Math.floor(currentIndex / visibleSlides) === idx 
                      ? primary 
                      : isLight 
                        ? 'rgba(0,0,0,0.12)' 
                        : 'rgba(255,255,255,0.12)',
                  }}
                  aria-label={`Ir a slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  });

  StoreFeaturedProducts.displayName = 'StoreFeaturedProducts';

  export default StoreFeaturedProducts;