  'use client';

  import React, { useState, useRef, useEffect } from 'react';
  import { Plus, Minus, CheckCircle2, Image as ImageIcon, ShoppingBag, Sparkles, Package, ChevronDown, ChevronRight } from 'lucide-react';
  import { useKioskContext } from './KioskStoreLayout';
  import { useDragScroll } from '@/hooks/useDragScroll';
  import { getPriceColors } from '@/lib/priceTokens';

  // 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO (Kiosco)
  // 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO (Kiosco)
  const getProductPriceWithIVAAndDiscount = (product: any, exchangeRate: number) => {
    if (!product) return null;

    // ============================================================
    // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
    // ============================================================
    if (product?._pricing && typeof product._pricing === 'object') {
      const p = product._pricing;
      const ivaType = p.ivaType || 'excluded';
      const ivaRate = Number(p.ivaRate || 0);
      const hasDiscount = p.hasDiscount === true;
      const discountPercentage = Number(p.discountPercentage || 0);

      return {
        baseVes: Number(p.basePriceVES || 0),
        baseUsd: Number(p.basePriceUSD || 0),
        discountedBaseVes: Number(p.subtotalVES || p.basePriceVES || 0),
        discountedBaseUsd: Number(p.subtotalUSD || p.basePriceUSD || 0),
        finalWithIVAVes: Number(p.totalPriceVES || 0),
        finalWithIVAUsd: Number(p.totalPriceUSD || 0),
        originalFinalVes: Number(p.originalPriceVES || 0),
        originalFinalUsd: Number(p.originalPriceUSD || 0),
        ivaType,
        ivaRate,
        hasDiscount,
        discountPercentage,
        isOnSale: hasDiscount,
      };
    }

    // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
    let pricesObj = product?.prices || product?.attributes?.prices || {};
    if (typeof pricesObj === 'string') {
      try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
    }

    let baseVes = Number(
      pricesObj?.VES ?? pricesObj?.ves ?? product?.priceVes ?? product?.price_ves ?? product?.price ?? product?.precio ?? 0
    );
    let baseUsd = Number(
      pricesObj?.USD ?? pricesObj?.usd ?? product?.priceUsd ?? product?.price_usd ?? product?.usd ?? 0
    );

    if (baseUsd === 0 && baseVes > 0 && exchangeRate > 0) {
      baseUsd = Math.round((baseVes / exchangeRate) * 100) / 100;
    }
    if (baseVes === 0 && baseUsd > 0 && exchangeRate > 0) {
      baseVes = Math.round((baseUsd * exchangeRate) * 100) / 100;
    }

    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

    const isOnSale = product?.onSale === true || product?.attributes?.onSale === true;
    let discountPercentage = Number(product?.discountPercentage || product?.attributes?.discountPercentage || 0);
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    const hasDiscount = isOnSale && discountPercentage > 0;

    let discountedBaseVes = baseVes;
    let discountedBaseUsd = baseUsd;
    let originalFinalVes = baseVes;
    let originalFinalUsd = baseUsd;

    if (hasDiscount) {
      const factor = 1 - discountPercentage / 100;
      if (ivaType === 'excluded') {
        originalFinalVes = baseVes * (1 + ivaRate / 100);
        originalFinalUsd = baseUsd * (1 + ivaRate / 100);
      } else if (ivaType === 'included') {
        originalFinalVes = baseVes;
        originalFinalUsd = baseUsd;
      } else {
        originalFinalVes = baseVes;
        originalFinalUsd = baseUsd;
      }
      discountedBaseVes = baseVes * factor;
      discountedBaseUsd = baseUsd * factor;
    }

    let ivaAmountVes = 0;
    let ivaAmountUsd = 0;
    let finalWithIVAVes = discountedBaseVes;
    let finalWithIVAUsd = discountedBaseUsd;

    if (ivaType === 'excluded') {
      ivaAmountVes = discountedBaseVes * (ivaRate / 100);
      ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
      finalWithIVAVes = discountedBaseVes + ivaAmountVes;
      finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      // 🔥 IVA INCLUIDO: el precio base YA incluye IVA
      // Extraer el IVA del precio (no sumarlo)
      ivaAmountVes = discountedBaseVes - (discountedBaseVes / (1 + ivaRate / 100));
      ivaAmountUsd = discountedBaseUsd - (discountedBaseUsd / (1 + ivaRate / 100));
      finalWithIVAVes = discountedBaseVes;   // el precio no cambia
      finalWithIVAUsd = discountedBaseUsd;
    }

    return {
      baseVes: Math.round(baseVes * 100) / 100,
      baseUsd: Math.round(baseUsd * 100) / 100,
      discountedBaseVes: Math.round(discountedBaseVes * 100) / 100,
      discountedBaseUsd: Math.round(discountedBaseUsd * 100) / 100,
      finalWithIVAVes: Math.round(finalWithIVAVes * 100) / 100,
      finalWithIVAUsd: Math.round(finalWithIVAUsd * 100) / 100,
      originalFinalVes: Math.round(originalFinalVes * 100) / 100,
      originalFinalUsd: Math.round(originalFinalUsd * 100) / 100,
      ivaType,
      ivaRate,
      hasDiscount,
      discountPercentage,
      isOnSale: hasDiscount,
    };
  };

  export default function KioskoGrid({
    categories = [],
    selectedCategory,
    setSelectedCategory,
    primary,
    secondary,
    isPrimaryLight = false,
    textMutedClass = '',
    filteredProducts = [],
    textMainClass = '',
    isSecondaryLight = false,
    cart = {},
    updateCartQty,
    removeFromCart,
    exchangeRate = 0,
    setPreviewProduct,
    isCartSidebar = false,
  }: any) {

    const context = useKioskContext();
    const { primary: contextPrimary } = context;

    const [showAllCategories, setShowAllCategories] = useState(false);
    const categoriesScrollRef = useDragScroll<HTMLDivElement>({ threshold: 5 });

    const formatPrice = (num: number): string => {
      if (isNaN(num) || num === 0) return '0,00';
      return num.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
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

    const handleQuantityChange = (productOrId: any, newQty: number, maxStock: number) => {
      const productId = typeof productOrId === 'string' 
        ? productOrId 
        : (productOrId?.id || productOrId?._id);
      
      if (!productId) {
        console.warn('⚠️ [KioskoGrid] No se pudo obtener ID del producto');
        return;
      }

      if (newQty <= 0) {
        if (typeof removeFromCart === 'function') {
          removeFromCart(productId);
          return;
        }
      }
      
      if (typeof updateCartQty === 'function') {
        updateCartQty(productId, newQty, maxStock);
      }
    };

    const safePrimary = primary || contextPrimary || '#0D9488';

    const textColorMain = isSecondaryLight ? 'text-slate-900' : 'text-white';
    const textMutedDynamic = isSecondaryLight ? 'text-slate-600' : 'text-slate-300';
    
    const priceColors = getPriceColors({ primary: safePrimary, isDarkBg: !isSecondaryLight });
    
    const cardBgClass = isSecondaryLight 
      ? `bg-white/90 border-slate-200/70 text-slate-900 shadow-xl backdrop-blur-md` 
      : `bg-black/40 border-white/10 text-white shadow-2xl backdrop-blur-md`;
      
    const innerCardBg = isSecondaryLight ? 'bg-white/50 border-slate-200/60' : 'bg-black/30 border-white/10';

    // Categorías a mostrar (todas o solo las primeras 6)
    const displayedCategories = showAllCategories ? categories : categories.slice(0, 6);
    const hasMoreCategories = categories.length > 6;

    return (
  <div className="w-full h-full flex flex-col select-none m-0 px-0 overflow-visible pt-2">
  {/* 🔥 CATEGORÍAS - AHORA ARRIBA DE TODO, EN FILA HORIZONTAL */}
  {categories && categories.length > 1 && (
    <div className="w-full px-3 sm:px-6 pt-2 pb-4 flex-shrink-0">
      <div className="w-full max-w-full">
        {/* FILA PRINCIPAL DE CATEGORÍAS (drag & drop, sin scrollbar) */}
        <div
          ref={categoriesScrollRef}
          className="flex flex-nowrap items-center gap-2 w-full overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing select-none touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {displayedCategories.map((cat: any) => {
            const catName = typeof cat === 'string' ? cat : cat.name || cat.id || cat;
            const isSelected = selectedCategory === catName || selectedCategory === cat.id;
            return (
              <button
                key={catName}
                type="button"
                onClick={() => setSelectedCategory(catName)}
                style={isSelected ? { backgroundColor: safePrimary } : {}}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isSelected
                    ? 'text-white border-transparent shadow-md'
                    : isSecondaryLight 
                      ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm' 
                      : 'bg-black/40 border-white/15 text-slate-200 hover:bg-black/70 backdrop-blur-md'
                }`}
              >
                {isSelected && <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="truncate max-w-[100px]">{catName}</span>
              </button>
            );
          })}
          
          {hasMoreCategories && !showAllCategories && (
            <button
              type="button"
              onClick={() => setShowAllCategories(true)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                isSecondaryLight 
                  ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm' 
                  : 'bg-black/40 border-white/15 text-slate-200 hover:bg-black/70 backdrop-blur-md'
              }`}
            >
              <span>Ver más</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
        </div>
        
        {/* CATEGORÍAS DESPLEGADAS */}
        {showAllCategories && hasMoreCategories && (
          <div className="mt-3 flex flex-wrap items-center gap-2 w-full animate-fadeIn">
            {categories.slice(6).map((cat: any) => {
              const catName = typeof cat === 'string' ? cat : cat.name || cat.id || cat;
              const isSelected = selectedCategory === catName || selectedCategory === cat.id;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategory(catName)}
                  style={isSelected ? { backgroundColor: safePrimary } : {}}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    isSelected
                      ? 'text-white border-transparent shadow-md'
                      : isSecondaryLight 
                        ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm' 
                        : 'bg-black/40 border-white/15 text-slate-200 hover:bg-black/70 backdrop-blur-md'
                  }`}
                >
                  {isSelected && <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate max-w-[100px]">{catName}</span>
                </button>
              );
            })}
            
            <button
              type="button"
              onClick={() => setShowAllCategories(false)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                isSecondaryLight 
                  ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm' 
                  : 'bg-black/40 border-white/15 text-slate-200 hover:bg-black/70 backdrop-blur-md'
              }`}
            >
              <span>Ver menos</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
  )}

{/* 🔥 GRID DE PRODUCTOS - OCUPA TODO EL ANCHO DISPONIBLE */}
<div className="w-full px-0 sm:px-0 flex-1 overflow-visible pt-3 sm:pt-4">
      <div className={`w-full grid gap-3 md:gap-4 pr-2 sm:pr-3 ${
    isCartSidebar 
      ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3' 
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
  }`}>
            {filteredProducts.map((product: any) => {
              const productId = product.id || product._id;
              const currentCart = typeof cart === 'object' && cart !== null ? cart : {};
              
              const cartItem = currentCart[productId];
              const qty = typeof cartItem === 'object' 
                ? cartItem?.quantity || 0 
                : cartItem || 0;
              
              const totalStock = Number(product.stock ?? product.existencias ?? 99);
              const isInCart = qty > 0;

              const resolvedImage = getItemImage(product);
              const category = product?.category || product?.categoria || '';

              const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
              const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);
              
              let ivaBadge = '';
              let ivaBadgeColor = '';
              let ivaBadgeBg = '';
              
              if (ivaType === 'excluded') {
                ivaBadge = `+${ivaRate}%`;
                ivaBadgeColor = '#f59e0b';
                ivaBadgeBg = 'rgba(251,191,36,0.15)';
              } else if (ivaType === 'included') {
                ivaBadge = `IVA ${ivaRate}%`;
                ivaBadgeColor = '#22c55e';
                ivaBadgeBg = 'rgba(34,197,94,0.15)';
              } else {
                ivaBadge = 'Exento';
                ivaBadgeColor = '#64748b';
                ivaBadgeBg = 'rgba(100,116,139,0.15)';
              }

              const priceInfo = getProductPriceWithIVAAndDiscount(product, context?.exchangeRate || 0);
              const hasDiscount = priceInfo?.hasDiscount || false;
              const discountPercentage = priceInfo?.discountPercentage || 0;
              const finalPriceVes = priceInfo?.finalWithIVAVes || 0;
              const finalPriceUsd = priceInfo?.finalWithIVAUsd || 0;
              const originalPriceVes = priceInfo?.originalFinalVes || 0;
              const isIvaExcluded = priceInfo?.ivaType === 'excluded';
              const ivaRateLocal = priceInfo?.ivaRate || 16;
              const basePrice = priceInfo?.discountedBaseVes || priceInfo?.baseVes || 0;

              return (
<div 
  key={productId} 
  className={`relative rounded-2xl p-4 md:p-5 flex flex-col transition-all duration-300 group border w-full h-auto ${
    cardBgClass
  } hover:shadow-2xl hover:scale-[1.02] hover:z-30`}
  style={{
    borderWidth: isInCart ? '2px' : '1px',
    borderColor: isInCart ? safePrimary : hasDiscount ? 'rgba(239,68,68,0.3)' : undefined,
    boxShadow: isInCart ? `0 0 30px ${safePrimary}25` : hasDiscount ? '0 0 30px rgba(239,68,68,0.05)' : undefined,
  }}
>
                  {/* BADGE DE AGREGADO */}
                  {isInCart && (
                    <div className="absolute -top-2 -right-2 z-20">
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-lg"
                        style={{
                          backgroundColor: safePrimary,
                          color: '#ffffff',
                          boxShadow: `0 0 20px ${safePrimary}40`,
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {qty}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2.5 relative z-10 w-full">
                    
                    <div 
                      className={`relative w-full aspect-square overflow-hidden border flex items-center justify-center rounded-xl ${innerCardBg}`}
                    >
                      {resolvedImage ? (
                        <img 
                          src={resolvedImage} 
                          alt={product.name || product.nombre || 'Producto'} 
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Sin+Imagen';
                          }}
                        />
                      ) : (
                        <div className={`flex flex-col items-center justify-center opacity-40 space-y-2 ${textMutedDynamic}`}>
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-xs font-bold">Sin imagen</span>
                        </div>
                      )}

                      {category && (
                        <div className="absolute top-2 left-2 z-10 pointer-events-none">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm border backdrop-blur-md ${
                            isSecondaryLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-black/80 border-white/20 text-white'
                          }`}>
                            {category}
                          </span>
                        </div>
                      )}

                      {hasDiscount && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <span 
                            className="px-2 py-1 rounded-lg text-[10px] font-extrabold"
                            style={{
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              boxShadow: '0 0 20px rgba(239,68,68,0.4)',
                            }}
                          >
                            -{discountPercentage}%
                          </span>
                        </div>
                      )}

                      {totalStock > 0 && totalStock <= 3 && (
                        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                          <span className="text-[8px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/90 text-white shadow-lg backdrop-blur-sm">
                            Ultimas {totalStock}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className={`font-extrabold tracking-tight leading-tight text-base sm:text-lg ${textColorMain} break-words`}>
                      {product.name || product.nombre || 'Nombre del producto'}
                    </h3>

                    <div className={`pt-1.5 flex flex-col gap-0.5 border-t ${isSecondaryLight ? 'border-slate-200/60' : 'border-white/10'}`}>
                      <span className={`text-[7px] uppercase font-extrabold tracking-wider block opacity-70 ${textMutedDynamic}`}>PRECIO</span>
                      
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          {hasDiscount ? (
                            <>
                              <span className={`text-[10px] line-through opacity-50 ${textMutedDynamic}`}>
                                Bs. {formatPrice(originalPriceVes)}
                              </span>
                              <span className={`font-extrabold tracking-tight text-lg sm:text-xl transition-colors`} style={{ color: priceColors.ves }}>
                                Bs. {formatPrice(finalPriceVes)}
                              </span>
                              <span className={`text-[10px] font-bold`} style={{ color: priceColors.foreign }}>
                                (${finalPriceUsd.toFixed(2)})
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={`font-extrabold tracking-tight text-lg sm:text-xl transition-colors`} style={{ color: priceColors.ves }}>
                                Bs. {formatPrice(finalPriceVes)}
                              </span>
                              <span className={`text-[10px] font-bold`} style={{ color: priceColors.foreign }}>
                                (${finalPriceUsd.toFixed(2)})
                              </span>
                            </>
                          )}
                        </div>
                        
                        {ivaType !== 'exempt' && (
                          <span 
                            className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full border transition-all ${
                              isSecondaryLight 
                                ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}
                            style={{
                              backgroundColor: ivaBadgeBg,
                              borderColor: `${ivaBadgeColor}30`,
                              color: ivaBadgeColor
                            }}
                          >
                            {ivaBadge}
                          </span>
                        )}
                        {ivaType === 'exempt' && (
                          <span 
                            className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full border ${
                              isSecondaryLight 
                                ? 'bg-slate-200 text-slate-600 border-slate-300' 
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            Exento
                          </span>
                        )}
                      </div>

                      {isIvaExcluded && (
                        <div className={`text-[7px] opacity-60 ${textMutedDynamic}`}>
                          Base: Bs. {formatPrice(basePrice)} + {ivaRateLocal}% IVA
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`mt-2.5 pt-2.5 border-t relative z-10 w-full ${isSecondaryLight ? 'border-slate-200/60' : 'border-white/10'}`} onClick={(e) => e.stopPropagation()}>
                    {totalStock <= 0 ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-md tracking-wide bg-slate-800/40 text-slate-500 cursor-not-allowed border border-white/5"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Agotado</span>
                      </button>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(productId, 1, totalStock)}
                        style={{ backgroundColor: safePrimary }}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-md tracking-wide text-white hover:opacity-95 active:scale-95 cursor-pointer hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        <ShoppingBag className="w-4 h-4 transition-transform group-hover:scale-110" />
                        <span>Añadir</span>
                      </button>
                    ) : (
                      <div className={`flex items-center space-x-2 rounded-xl p-1 border w-full justify-between shadow-inner ${innerCardBg}`}>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(productId, qty - 1, totalStock)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer shadow-sm border active:scale-90 hover:scale-105 ${
                            isSecondaryLight ? 'bg-white/80 border-slate-200 text-slate-800 hover:bg-white' : 'bg-black/50 border-white/15 text-white hover:bg-black/80'
                          }`}
                          aria-label="Restar"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex flex-col items-center">
                          <span className={`font-extrabold text-sm ${textColorMain}`}>{qty}</span>
                          <span className={`text-[7px] font-medium opacity-60 ${textMutedDynamic}`}>
                            / {totalStock}
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (qty < totalStock) handleQuantityChange(productId, qty + 1, totalStock);
                          }}
                          disabled={qty >= totalStock}
                          style={qty >= totalStock ? {} : { backgroundColor: safePrimary }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition border active:scale-90 hover:scale-105 ${
                            qty >= totalStock 
                              ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-white/5' 
                              : 'text-white font-extrabold cursor-pointer hover:opacity-90 border-transparent'
                          }`}
                          aria-label="Sumar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }

          .group:hover .group-hover\\:scale-105 {
            transform: scale(1.05);
          }

          button, img, .transition-all {
            will-change: transform, opacity, box-shadow;
          }

          .break-words {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
        `}</style>
      </div>
    );
  }