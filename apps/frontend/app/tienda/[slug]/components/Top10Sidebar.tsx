'use client';

import React, { useMemo, useCallback, memo } from 'react';
import { Award, Star, TrendingUp, Crown, Medal, ShoppingBag, BarChart3, Flame, Trophy } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

// ============================================================
// 🔥 SUBCOMPONENTE DE ITEM INDIVIDUAL (MEMOIZADO)
// ============================================================
const Top10Item = memo(({
  product,
  rank,
  primary,
  textMainClass,
  textMutedClass,
  isLight,
  onProductClick,
  getImageUrlFn,
  formatPriceFn,
}: any) => {
  const imageUrl = useMemo(() => getImageUrlFn(product), [product, getImageUrlFn]);
  const productName = useMemo(() => product.name || product.nombre || 'Producto', [product]);
  
  // 🔥 USAR _priceInfo DE ProductCatalog SI EXISTE, SI NO, USAR DATOS DIRECTOS
  const priceInfo = useMemo(() => {
    // Si el producto ya tiene _priceInfo (calculado por ProductCatalog), usarlo
    if (product._priceInfo) {
      return product._priceInfo;
    }
    
    // Fallback: usar datos directos del producto
    return {
      priceVes: Number(product.prices?.VES || product.priceVes || product.price || 0),
      priceUsd: Number(product.prices?.USD || product.priceUsd || 0),
      originalVes: Number(product.prices?.VES || product.priceVes || product.price || 0),
      originalUsd: Number(product.prices?.USD || product.priceUsd || 0),
      hasDiscount: false,
      discountPercentage: 0,
      ivaType: product?.ivaType || 'excluded',
      ivaRate: Number(product?.ivaRate || 16),
      savingVes: 0,
      savingUsd: 0,
    };
  }, [product]);
  
  const {
    priceVes,
    priceUsd,
    originalVes,
    originalUsd,
    hasDiscount,
    discountPercentage,
    savingVes,
    savingUsd,
  } = priceInfo;

  const sales = useMemo(() => Number(product.soldCount || product.sales || 0), [product]);
  const isOutOfStock = useMemo(() => (product.stock || 0) <= 0, [product.stock]);

  const formattedPrice = useMemo(() => formatPriceFn(priceVes), [priceVes, formatPriceFn]);
  const formattedOriginalVes = useMemo(() => formatPriceFn(originalVes), [originalVes, formatPriceFn]);
  const formattedPriceUsd = useMemo(() => formatPriceFn(priceUsd), [priceUsd, formatPriceFn]);

  const rankConfig = useMemo(() => {
    if (rank === 1) {
      return {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        icon: Crown,
        label: '1',
      };
    }
    if (rank === 2) {
      return {
        color: '#94a3b8',
        bgColor: 'rgba(148, 163, 184, 0.15)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        icon: Medal,
        label: '2',
      };
    }
    if (rank === 3) {
      return {
        color: '#cd7f32',
        bgColor: 'rgba(205, 127, 50, 0.15)',
        borderColor: 'rgba(205, 127, 50, 0.3)',
        icon: Flame,
        label: '3',
      };
    }
    return {
      color: isLight ? '#94a3b8' : '#64748b',
      bgColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
      borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
      icon: Trophy,
      label: `#${rank}`,
    };
  }, [rank, isLight]);

  const RankIcon = rankConfig.icon;

  const handleClick = useCallback(() => {
    onProductClick?.(product);
  }, [product, onProductClick]);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
className={`group flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors duration-200 ${
  isLight
    ? 'hover:bg-black/5 active:bg-black/10'
    : 'hover:bg-white/5 active:bg-white/10'
}`}
    >
      {/* Ranking */}
      <div 
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
        style={{
          backgroundColor: rankConfig.bgColor,
          border: `1px solid ${rankConfig.borderColor}`,
          color: rankConfig.color,
        }}
      >
        {RankIcon ? <RankIcon className="w-3.5 h-3.5" /> : rankConfig.label}
      </div>

      {/* Imagen */}
      <div 
        className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
        style={{
          backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
          border: `1px solid ${rankConfig.borderColor}`,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            loading="lazy"
            className="w-full h-full object-cover"
            width="48"
            height="48"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <ShoppingBag className="w-4 h-4" />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-[6px] font-bold uppercase text-white px-1.5 py-0.5 rounded border border-white/30 bg-black/60 tracking-wider">
              Agotado
            </span>
          </div>
        )}
        
        {/* 🔥 BADGE DE OFERTA EN LA IMAGEN */}
        {hasDiscount && (
          <div className="absolute bottom-0.5 right-0.5 z-10">
            <span 
              className="px-1 py-0.5 rounded text-[6px] font-bold border"
              style={{
                backgroundColor: primary,
                borderColor: primary,
                color: isLight ? '#030712' : '#ffffff',
              }}
            >
              -{discountPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* Información */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-tight line-clamp-1 ${textMainClass}`}>
          {productName}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {hasDiscount ? (
            <>
              {/* Precio original tachado */}
              <span className={`text-[9px] line-through opacity-50 ${textMutedClass}`}>
                Bs. {formattedOriginalVes}
              </span>
              {/* Precio con descuento */}
              <span 
                className={`text-sm font-black`} 
                style={{ color: primary }}
              >
                Bs. {formattedPrice}
              </span>
              {/* 🔥 SVG DE FUEGO + PORCENTAJE */}
              <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold" style={{ color: textMutedClass }}>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-2.5 h-2.5"
                  style={{ color: '#f97316' }}
                >
                  <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                  <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                </svg>
                -{discountPercentage}%
              </span>
            </>
          ) : (
            <>
              <span 
                className={`text-sm font-black`} 
                style={{ color: primary }}
              >
                Bs. {formattedPrice}
              </span>
            </>
          )}
          
          {/* PRECIO EN USD - VERDE */}
          {priceUsd > 0 && (
            <span 
              className="text-[10px] font-semibold"
              style={{ color: isLight ? '#15803d' : '#4ade80' }}
            >
              ${formattedPriceUsd}
            </span>
          )}
          {sales > 0 && (
            <span className={`text-[9px] flex items-center gap-0.5 ${textMutedClass}`}>
              <Star className="w-2.5 h-2.5" style={{ color: primary, opacity: 0.5 }} />
              <span className="font-medium">{sales}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

Top10Item.displayName = 'Top10Item';

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
export default function Top10Sidebar({
  products = [],
  onProductClick,
  primary,
  secondary,                 // ✅ NUEVO: color del tema para fondos
  textMainClass,
  textMutedClass,
  isLight = false,
  getImageUrlFn = getImageUrl,
  title = 'Más Populares',
  subtitle = 'Los productos con más ventas',
  maxItems = 5,
  showEmptyState = true,
  className = '',
}: any) {
  const formatPriceFn = useCallback((num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value) || value === 0) return '0,00';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const topProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    // 🔥 ORDENAR POR OPERACIONES (ventas) - LOS MÁS VENDIDOS PRIMERO
    const sorted = [...products].sort((a, b) => {
      const salesA = Number(a.soldCount || a.sales || 0);
      const salesB = Number(b.soldCount || b.sales || 0);
      return salesB - salesA;
    });

    return sorted.slice(0, maxItems);
  }, [products, maxItems]);

  if (topProducts.length === 0) {
    if (!showEmptyState) return null;
    
    return (
      <div 
        className={`rounded-2xl p-4 border ${
          isLight 
            ? 'border-slate-200/60' 
            : 'border-white/10'
        } ${className}`}
        style={{
          backgroundColor: isLight 
            ? 'rgba(255, 255, 255, 0.85)' 
            : (secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)'),
        }}
      >
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b" style={{ borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
          <div 
            className="p-1.5 rounded-xl"
            style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: primary }} />
          </div>
          <span className={`text-sm font-black ${textMainClass}`}>{title}</span>
        </div>
        <div className={`text-center py-8 ${textMutedClass}`}>
          <div className="opacity-40 mb-2">
            <TrendingUp className="w-10 h-10 mx-auto" />
          </div>
          <p className="text-xs font-medium">Sin productos destacados</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-2xl p-4 border ${
        isLight 
          ? 'border-slate-200/60 shadow-lg shadow-slate-200/20'  
          : 'border-white/10 shadow-lg shadow-black/40'
      } ${className}`}
      style={{
        backgroundColor: isLight 
          ? 'rgba(255, 255, 255, 0.85)' 
          : (secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)'),
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b" style={{ borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
        <div 
          className="p-1.5 rounded-xl flex-shrink-0"
          style={{ 
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          }}
        >
          <BarChart3 className="w-4 h-4" style={{ color: primary }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-black tracking-tight ${textMainClass}`}>
            {title}
          </span>
          <span className={`text-[8px] block leading-none ${textMutedClass}`}>
            {subtitle}
          </span>
        </div>
        <div 
          className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold ${
            isLight 
              ? 'bg-slate-100 text-slate-700' 
              : 'bg-white/10 text-slate-300'
          }`}
        >
          Top {topProducts.length}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-0.5">
        {topProducts.map((product: any, idx: number) => (
          <Top10Item
            key={product.id || product._id || `top-${idx}`}
            product={product}
            rank={idx + 1}
            primary={primary}
            textMainClass={textMainClass}
            textMutedClass={textMutedClass}
            isLight={isLight}
            onProductClick={onProductClick}
            getImageUrlFn={getImageUrlFn}
            formatPriceFn={formatPriceFn}
          />
        ))}
      </div>
    </div>
  );
}