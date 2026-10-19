'use client';

import React, { useState } from 'react';
import { Heart, Image as ImageIcon, Eye, Store } from 'lucide-react';
import { useFavorites } from '@/app/tienda/[slug]/hooks/useFavorites';
import { getPriceColors } from '@/lib/priceTokens';
import { formatUsd } from '@/lib/price-utils';
import { useRouter } from 'next/navigation';

interface FavoritesTabProps {
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantSlug?: string;
  onOpenProductDetail?: (product: any) => void;
  ivaRate?: number;
}

export default function FavoritesTab({
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantSlug,
  onOpenProductDetail,
  ivaRate = 16,
}: FavoritesTabProps) {
  const router = useRouter();
  const { favorites, favoriteProducts, toggleFavorite, loading, favoritesCount } = useFavorites();

  const [selectedCategory, setSelectedCategory] = useState('all');

  // Extraer categorías únicas
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    favoriteProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [favoriteProducts]);

  // Filtrar productos por categoría
  const filteredProducts = React.useMemo(() => {
    if (selectedCategory === 'all') return favoriteProducts;
    return favoriteProducts.filter(p => p.category === selectedCategory);
  }, [favoriteProducts, selectedCategory]);

  // 🔥 SOLO REDIRIGE - SIN CÁLCULOS
  const handleProductClick = (product: any) => {
    const itemId = product.id || product._id;
    const itemType = product._itemType || 'product';
    const productTenantSlug = product.tenantSlug || product.tenant?.slug;

    if (!itemId) return;

    if (onOpenProductDetail) {
      onOpenProductDetail(product);
      return;
    }

    // 🔥 Servicios van con ?servicio=, productos con ?producto=
    const queryKey = itemType === 'service' ? 'servicio' : 'producto';

    if (productTenantSlug) {
      router.push(`/tienda/${productTenantSlug}?${queryKey}=${itemId}`);
      return;
    }

    if (tenantSlug) {
      router.push(`/tienda/${tenantSlug}?${queryKey}=${itemId}`);
      return;
    }

    const currentSlug = window.location.pathname.split('/tienda/')[1]?.split('/')[0];
    if (currentSlug) {
      router.push(`/tienda/${currentSlug}?${queryKey}=${itemId}`);
    }
  };

  const getItemImage = (item: any) => {
    if (!item) return null;
    let rawImg = '';

    if (typeof item.coverImage === 'string' && item.coverImage.trim() !== '') {
      rawImg = item.coverImage;
    } else if (typeof item.image === 'string' && item.image.trim() !== '') {
      rawImg = item.image;
    } else if (typeof item.photo === 'string' && item.photo.trim() !== '') {
      rawImg = item.photo;
    } else if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
      const first = item.mediaUrls[0];
      if (typeof first === 'string' && first.trim() !== '') rawImg = first;
      else if (first?.url) rawImg = first.url;
      else if (first?.path) rawImg = first.path;
    } else {
      const directImages = item.images || item.existingImages || item.fileUrls || item.photos || item.files;
      if (Array.isArray(directImages) && directImages.length > 0) {
        const first = directImages[0];
        if (typeof first === 'string' && first.trim() !== '') rawImg = first;
        else if (first?.url) rawImg = first.url;
        else if (first?.path) rawImg = first.path;
      }
    }

    if (!rawImg) return null;
    if (typeof rawImg !== 'string') rawImg = String(rawImg);
    rawImg = rawImg.trim();
    if (!rawImg) return null;

    rawImg = rawImg.replace(/\\/g, '/');

    const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
    const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      try {
        const urlObj = new URL(rawImg);
        if (urlObj.port && urlObj.port !== '3000') {
          return `${cleanBase}${urlObj.pathname}`;
        }
        return rawImg;
      } catch (e) {
        return rawImg;
      }
    }

    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) {
      return rawImg;
    }

    if (rawImg.includes('uploads/')) {
      const relativePath = rawImg.split('uploads/').pop();
      return `${cleanBase}/uploads/${relativePath}`;
    }

    const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
    return `${cleanBase}/uploads/${cleanPath}`;
  };

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

    let usdVal = Number(
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

const getIvaInfo = (item: any, withDiscount: boolean = true) => {
  if (!item) return null;

  const isService = item._itemType === 'service';

  // ============================================================
  // 🔥 SERVICIOS: siempre exempt, sin IVA, sin descuento
  // ============================================================
  if (isService && item?._pricing && typeof item._pricing === 'object') {
    const p = item._pricing;
    const totalVes = Number(p.totalPriceVES || 0);
    const totalUsd = Number(p.totalPriceUSD || 0);

    return {
      ivaType: 'exempt',
      ivaRate: 0,
      basePriceVes: totalVes,
      basePriceUsd: totalUsd,
      ivaAmountVes: 0,
      ivaAmountUsd: 0,
      priceWithIVAVes: totalVes,
      priceWithIVAUsd: totalUsd,
      display: 'Exento',
      displayShort: 'Servicio',
      badgeColor: '#6366f1',
      badgeBg: 'rgba(99,102,241,0.15)',
      discountInfo: null,
      hasDiscount: false,
      _pricingSource: 'backend',
    };
  }

  // ============================================================
  // 🔥 PRODUCTOS: `_pricing` del backend
  // ============================================================
  if (item?._pricing && typeof item._pricing === 'object') {
    const p = item._pricing;

    const ivaType = p.ivaType || 'excluded';
    const ivaRate = Number(p.ivaRate || 0);
    const hasDiscount = p.hasDiscount === true;
    const discountPercentage = Number(p.discountPercentage || 0);

    const priceWithIVAVes = Number(p.totalPriceVES || 0);
    const priceWithIVAUsd = Number(p.totalPriceUSD || 0);
    const ivaAmountVes = Number(p.taxAmountVES || 0);
    const ivaAmountUsd = Number(p.taxAmountUSD || 0);
    const basePriceVes = Number(p.basePriceVES || 0);
    const basePriceUsd = Number(p.basePriceUSD || 0);

    const discountInfo = hasDiscount ? {
      discountPercentage,
      originalPrice: Number(p.originalPriceVES || 0),
      originalPriceUsd: Number(p.originalPriceUSD || 0),
      finalPriceWithIVA: Number(p.totalPriceVES || 0),
      finalPriceWithIVAUsd: Number(p.totalPriceUSD || 0),
      savingVes: Number(p.originalPriceVES || 0) - Number(p.totalPriceVES || 0),
    } : null;

    return {
      ivaType,
      ivaRate,
      basePriceVes: Math.round(basePriceVes * 100) / 100,
      basePriceUsd: Math.round(basePriceUsd * 100) / 100,
      ivaAmountVes: Math.round(ivaAmountVes * 100) / 100,
      ivaAmountUsd: Math.round(ivaAmountUsd * 100) / 100,
      priceWithIVAVes: Math.round(priceWithIVAVes * 100) / 100,
      priceWithIVAUsd: Math.round(priceWithIVAUsd * 100) / 100,
      display: ivaType === 'included' ? `IVA ${ivaRate}% Inc.` :
               ivaType === 'exempt'   ? 'Exento' : `IVA ${ivaRate}% +`,
      displayShort: ivaType === 'included' ? 'IVA Inc.' :
                    ivaType === 'exempt'   ? 'Exento' : 'IVA +',
      badgeColor: ivaType === 'included' ? '#22c55e' :
                   ivaType === 'exempt'  ? '#64748b' : '#f59e0b',
      badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
                ivaType === 'exempt'  ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
      discountInfo,
      hasDiscount,
      _pricingSource: 'backend',
    };
  }


  // 🔴 PRIORIDAD 2: flujo viejo (solo si NO hay _pricing)
  const product = item;
  // 1. Obtener precios base - BUSCAR EN TODAS LAS UBICACIONES
  let rawPriceVes = 0;
  let rawPriceUsd = 0;
  
  // Buscar en prices.VES / prices.USD
  if (product.prices) {
    if (typeof product.prices === 'object') {
      rawPriceVes = Number(product.prices.VES ?? product.prices.ves ?? 0);
      rawPriceUsd = Number(product.prices.USD ?? product.prices.usd ?? 0);
    }
  }
  
  // Si no hay, buscar en attributes.prices
  if (rawPriceVes === 0 && rawPriceUsd === 0 && product.attributes?.prices) {
    rawPriceVes = Number(product.attributes.prices.VES ?? product.attributes.prices.ves ?? 0);
    rawPriceUsd = Number(product.attributes.prices.USD ?? product.attributes.prices.usd ?? 0);
  }
  
  // Buscar campos directos
  if (rawPriceVes === 0) {
    rawPriceVes = Number(product.priceVes ?? product.price_ves ?? product.price ?? product.precio ?? 0);
  }
  
  if (rawPriceUsd === 0) {
    rawPriceUsd = Number(product.priceUsd ?? product.price_usd ?? product.usd ?? 0);
  }
  
  // 🔥 SI HAY USD PERO NO VES, O VICEVERSA, ESTABLECER AMBOS
  if (rawPriceUsd > 0 && rawPriceVes === 0) {
    // Solo tenemos USD, usar como base
    rawPriceVes = rawPriceUsd; // Temporal, se convertirá después
  }
  
  if (rawPriceVes > 0 && rawPriceUsd === 0) {
    // Solo tenemos VES, usar como base
    rawPriceUsd = rawPriceVes; // Temporal, se convertirá después
  }
  
  // 2. Determinar tipo y tasa de IVA
  const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);
  
  // 3. Calcular precio BASE (sin IVA)
  let basePriceVes = rawPriceVes;
  let basePriceUsd = rawPriceUsd;
  
  if (ivaType === 'included') {
    // Si el IVA está incluido, extraer la base
    basePriceVes = rawPriceVes / (1 + ivaRate / 100);
    basePriceUsd = rawPriceUsd / (1 + ivaRate / 100);
  }
  // Si es 'excluded' o 'exempt', el precio raw ES la base
  
  // 4. Aplicar descuento al precio BASE (sin IVA)
  let finalBaseVes = basePriceVes;
  let finalBaseUsd = basePriceUsd;
  let discountInfo = null;
  
  if (withDiscount) {
    const isOnSale = product?.onSale === true || product?.attributes?.onSale === true;
    let discountPercentage = Number(product?.discountPercentage || product?.attributes?.discountPercentage || 0);
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    
    if (isOnSale && discountPercentage > 0) {
      const discountFactor = 1 - discountPercentage / 100;
      
      // Guardar precio original
      let originalFinalVes = basePriceVes;
      let originalFinalUsd = basePriceUsd;
      
      if (ivaType === 'excluded') {
        originalFinalVes = basePriceVes * (1 + ivaRate / 100);
        originalFinalUsd = basePriceUsd * (1 + ivaRate / 100);
      } else if (ivaType === 'included') {
        originalFinalVes = rawPriceVes;
        originalFinalUsd = rawPriceUsd;
      }
      
      // Aplicar descuento a la base
      finalBaseVes = basePriceVes * discountFactor;
      finalBaseUsd = basePriceUsd * discountFactor;
      
      // Calcular precio final con descuento
      let discountedFinalVes = finalBaseVes;
      let discountedFinalUsd = finalBaseUsd;
      
      if (ivaType === 'excluded') {
        discountedFinalVes = finalBaseVes * (1 + ivaRate / 100);
        discountedFinalUsd = finalBaseUsd * (1 + ivaRate / 100);
      } else if (ivaType === 'included') {
        discountedFinalVes = finalBaseVes * (1 + ivaRate / 100);
        discountedFinalUsd = finalBaseUsd * (1 + ivaRate / 100);
      }
      
      discountInfo = {
        discountPercentage,
        originalPrice: Math.round(originalFinalVes * 100) / 100,
        originalPriceUsd: Math.round(originalFinalUsd * 100) / 100,
        finalPriceWithIVA: Math.round(discountedFinalVes * 100) / 100,
        finalPriceWithIVAUsd: Math.round(discountedFinalUsd * 100) / 100,
        savingVes: Math.round((originalFinalVes - discountedFinalVes) * 100) / 100,
      };
    }
  }
  
  // 5. Calcular IVA sobre el precio base (con descuento o no)
  let ivaAmountVes = 0;
  let ivaAmountUsd = 0;
  let priceWithIVAVes = finalBaseVes;
  let priceWithIVAUsd = finalBaseUsd;
  
  if (ivaType === 'excluded') {
    ivaAmountVes = finalBaseVes * (ivaRate / 100);
    ivaAmountUsd = finalBaseUsd * (ivaRate / 100);
    priceWithIVAVes = finalBaseVes + ivaAmountVes;
    priceWithIVAUsd = finalBaseUsd + ivaAmountUsd;
  } else if (ivaType === 'included') {
    ivaAmountVes = finalBaseVes * (ivaRate / 100);
    ivaAmountUsd = finalBaseUsd * (ivaRate / 100);
    priceWithIVAVes = finalBaseVes + ivaAmountVes;
    priceWithIVAUsd = finalBaseUsd + ivaAmountUsd;
  }
  // ivaType === 'exempt': no se agrega IVA
  
  return {
    ivaType,
    ivaRate,
    basePriceVes: Math.round(finalBaseVes * 100) / 100,
    basePriceUsd: Math.round(finalBaseUsd * 100) / 100,
    ivaAmountVes: Math.round(ivaAmountVes * 100) / 100,
    ivaAmountUsd: Math.round(ivaAmountUsd * 100) / 100,
    priceWithIVAVes: Math.round(priceWithIVAVes * 100) / 100,
    priceWithIVAUsd: Math.round(priceWithIVAUsd * 100) / 100,
    display: ivaType === 'included' ? `IVA ${ivaRate}% Inc.` : 
             ivaType === 'exempt' ? 'Exento' : `IVA ${ivaRate}% +`,
    displayShort: ivaType === 'included' ? 'IVA Inc.' : 
                  ivaType === 'exempt' ? 'Exento' : 'IVA +',
    badgeColor: ivaType === 'included' ? '#22c55e' : 
                 ivaType === 'exempt' ? '#64748b' : '#f59e0b',
    badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' : 
              ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
    discountInfo: discountInfo,
    hasDiscount: !!discountInfo,
  };
};

  const getProductReference = (item: any) => {
    return (
      item?.itemId ||
      item?.sku ||
      item?.code ||
      item?.codigo ||
      item?.inventoryId ||
      item?.reference ||
      item?.referencia ||
      ''
    );
  };

  const formatPrice = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const subtleBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');
  const priceColors = getPriceColors({ primary, isDarkBg });

  if (loading) {
    return (
      <div 
        className="p-8 rounded-3xl border shadow-xl text-center"
        style={{ backgroundColor: cardBg, borderColor: subtleBorderColor, color: textColor }}
      >
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  return (
<div 
  className="p-6 rounded-3xl border shadow-xl space-y-6 w-full"
  style={{ backgroundColor: cardBg, borderColor: subtleBorderColor, color: textColor }}
>
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
        <div>
          <h3 className="font-extrabold text-base tracking-tight" style={{ color: textColor }}>
            Mis Favoritos
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            {favoritesCount} productos guardados en tu lista de deseos
          </p>
        </div>
      </div>

      {/* Filtros de categoría */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'text-white shadow-md'
                : 'bg-white/5 opacity-75 hover:opacity-100 hover:bg-white/10'
            }`}
            style={{ backgroundColor: selectedCategory === 'all' ? primary : undefined }}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'text-white shadow-md'
                  : 'bg-white/5 opacity-75 hover:opacity-100 hover:bg-white/10'
              }`}
              style={{ backgroundColor: selectedCategory === cat ? primary : undefined }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid de productos favoritos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: textColor }} />
            <p className="text-sm font-medium opacity-70" style={{ color: textColor }}>
              {favoritesCount === 0 ? 'No tienes productos en favoritos' : 'No hay productos en esta categoría'}
            </p>
            <p className="text-xs opacity-40 mt-1" style={{ color: textColor }}>
              {favoritesCount === 0 ? 'Explora las tiendas y guarda tus productos favoritos' : 'Prueba con otra categoría'}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const productId = product.id || product._id;
            const itemType = product._itemType || 'product';
            const isService = itemType === 'service';
            const resolvedImage = getItemImage(product);
            const ivaInfo = getIvaInfo(product, true);
            const reference = getProductReference(product);
            const totalStock = Number(product.stock ?? product.existencias ?? 99);
            const duration = Number(product.durationMinutes || 0);
            const productTenantSlug = product.tenantSlug || product.tenant?.slug;

            return (
              <div
                key={productId}
                className="border rounded-2xl p-4 transition-all hover:scale-[1.02] flex flex-col cursor-pointer"
                style={{ borderColor: subtleBorderColor, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)' }}
                onClick={() => handleProductClick(product)}
              >
                {/* Imagen */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden border flex items-center justify-center" style={{ borderColor: subtleBorderColor }}>
                  {resolvedImage ? (
                    <img
                      src={resolvedImage}
                      alt={product.name || product.nombre || 'Producto'}
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.target.src = 'https://placehold.co/400x400?text=Sin+Imagen';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 opacity-40" style={{ color: textColor }} />
                  )}

                  {/* Botón quitar de favoritos */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 🔥 Mandar el tipo explícito
                      toggleFavorite(productId, itemType);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full backdrop-blur-md shadow-md transition hover:scale-110 border"
                    style={{
                      backgroundColor: isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                      borderColor: subtleBorderColor,
                    }}
                    title="Quitar de favoritos"
                  >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  </button>

                  {/* Categoría y badge de oferta */}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    {isService && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg backdrop-blur-md border"
                        style={{
                          borderColor: 'rgba(99,102,241,0.4)',
                          backgroundColor: 'rgba(99,102,241,0.85)',
                          color: '#ffffff',
                        }}
                      >
                        Servicio
                      </span>
                    )}
                    {product.category && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg backdrop-blur-md border" style={{ borderColor: subtleBorderColor, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', color: textColor }}>
                        {product.category}
                      </span>
                    )}
                    {ivaInfo?.hasDiscount && ivaInfo.discountInfo && (
                      <span 
                        className="text-[9px] font-bold px-2 py-1 rounded-lg backdrop-blur-md border"
                        style={{
                          backgroundColor: primary,
                          borderColor: primary,
                          color: '#ffffff',
                        }}
                      >
                        -{ivaInfo.discountInfo.discountPercentage}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 pt-3 space-y-1.5">
                  <h4 className="font-bold text-sm line-clamp-1" style={{ color: textColor }}>
                    {product.name || product.nombre || 'Producto'}
                  </h4>
                  {reference && (
                    <span className="text-[10px] font-medium opacity-60" style={{ color: textColor }}>
                      {reference}
                    </span>
                  )}

                  {/* 🔥 PRECIO CON IVA Y DESCUENTO */}
                  {ivaInfo ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {/* BADGE DE IVA */}
                        <span 
                          className="text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: ivaInfo.badgeBg,
                            color: ivaInfo.badgeColor
                          }}
                        >
                          {ivaInfo.displayShort}
                        </span>
                        
                        {/* PRECIO CON DESCUENTO O NORMAL */}
                        {ivaInfo.hasDiscount && ivaInfo.discountInfo ? (
                          <>
                            <span className="text-[10px] line-through opacity-50" style={{ color: textColor }}>
                              Bs. {formatPrice(ivaInfo.discountInfo.originalPrice)}
                            </span>
                            <span className="font-black text-base" style={{ color: primary }}>
                              Bs. {formatPrice(ivaInfo.priceWithIVAVes)}
                            </span>
                            <span className="text-[10px] font-semibold" style={{ color: priceColors.foreign }}>
                                                            (${formatUsd(ivaInfo.priceWithIVAUsd)})
                            </span>
                            <span 
                              className="px-1.5 py-0.5 rounded text-[7px] font-bold"
                              style={{
                                backgroundColor: isDarkBg ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
                                color: isDarkBg ? '#f87171' : '#991b1b',
                              }}
                            >
                              -{ivaInfo.discountInfo.discountPercentage}%
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-black text-base" style={{ color: primary }}>
                              Bs. {formatPrice(ivaInfo.priceWithIVAVes)}
                            </span>
                            <span className="text-[10px] font-semibold" style={{ color: priceColors.foreign }}>
                                                            (${formatUsd(ivaInfo.priceWithIVAUsd)})
                            </span>
                          </>
                        )}
                      </div>

                      {/* DESGLOSE DE IVA */}
                      {ivaInfo.ivaType === 'excluded' && ivaInfo.ivaRate > 0 && (
                        <div className="text-[8px] opacity-50 leading-none" style={{ color: textColor }}>
                          Base: Bs. {formatPrice(ivaInfo.basePriceVes)} + {ivaInfo.ivaRate}% IVA
                        </div>
                      )}
                      {ivaInfo.ivaType === 'included' && ivaInfo.ivaRate > 0 && (
                        <div className="text-[8px] opacity-50 leading-none" style={{ color: textColor }}>
                          IVA {ivaInfo.ivaRate}% incluido
                        </div>
                      )}
                      {ivaInfo.ivaType === 'exempt' && (
                        <div className="text-[8px] opacity-50 leading-none" style={{ color: textColor }}>
                          Exento de IVA
                        </div>
                      )}
                      {ivaInfo.hasDiscount && ivaInfo.discountInfo && (
                        <div className="text-[8px] text-emerald-500 font-medium leading-none">
                          Ahorro: Bs. {formatPrice(ivaInfo.discountInfo.savingVes)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-black text-base" style={{ color: primary }}>
                        Bs. 0,00
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium opacity-50" style={{ color: textColor }}>
                      {isService
                        ? (duration > 0
                            ? `⏱ ${duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}` : `${duration}min`}`
                            : 'Servicio')
                        : `Stock: ${totalStock}`}
                    </span>
                    {productTenantSlug && (
                      <span className="text-[9px] font-medium opacity-50 flex items-center gap-1" style={{ color: textColor }}>
                        <Store className="w-3 h-3" />
                        {productTenantSlug}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón Ver Artículo / Reservar */}
                <div className="pt-3 border-t mt-2" style={{ borderColor: subtleBorderColor }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                    style={{ backgroundColor: primary }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95 cursor-pointer text-white"
                  >
                    <Eye className="w-4 h-4" />
                    {isService ? 'Ver y Reservar' : 'Ver Artículo'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer con total */}
      {favoritesCount > 0 && (
        <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3" style={{ borderColor: subtleBorderColor }}>
          <span className="text-xs opacity-60" style={{ color: textColor }}>
            {favoritesCount} productos en favoritos
          </span>
        </div>
      )}
    </div>
  );
}