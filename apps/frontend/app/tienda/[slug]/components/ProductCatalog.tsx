  'use client';

  import React, { useState, useMemo, useCallback, memo, useEffect, useRef, useDeferredValue } from 'react';
  import { Plus, Minus, CheckCircle2, Image as ImageIcon, Eye, ShoppingBag, Sparkles, Heart, TrendingUp, Star } from 'lucide-react';
  import Image from 'next/image';

  // ============================================================
  // 🔥 IMPORTAR UTILIDAD CENTRAL DE IMÁGENES
  // ============================================================
  import { getImageUrl, getAllImages as getImageUrls } from '@/lib/imageUtils';

  // 🔥 IMPORTAR CONTEXTO DE TASAS
  import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

  // 🔥 IMPORTAR TOP 10 SIDEBAR
  import Top10Sidebar from './Top10Sidebar';

  // 🔥 IMPORTAR FILTER SIDEBAR
  import FilterSidebar from './FilterSidebar';

  // ============================================================
  // 🔥 FUNCIONES UTILITARIAS DE PRECIOS (FUERA DEL COMPONENTE)
  // ============================================================

  const getProductPriceVes = (product: any, exchangeRate: number): number => {
    if (!product) return 0;
    
    if (product.priceUsd && Number(product.priceUsd) > 0) {
      return exchangeRate > 0 ? Number(product.priceUsd) * exchangeRate : Number(product.priceUsd);
    }
    if (product.prices?.USD && Number(product.prices.USD) > 0) {
      return exchangeRate > 0 ? Number(product.prices.USD) * exchangeRate : Number(product.prices.USD);
    }
    if (product.attributes?.prices?.USD && Number(product.attributes.prices.USD) > 0) {
      return exchangeRate > 0 ? Number(product.attributes.prices.USD) * exchangeRate : Number(product.attributes.prices.USD);
    }
    
    if (product.priceVes && Number(product.priceVes) > 0) {
      return Number(product.priceVes);
    }
    if (product.prices?.VES && Number(product.prices.VES) > 0) {
      return Number(product.prices.VES);
    }
    if (product.attributes?.prices?.VES && Number(product.attributes.prices.VES) > 0) {
      return Number(product.attributes.prices.VES);
    }
    
    if (product.price && Number(product.price) > 0) {
      const price = Number(product.price);
      const hasExplicitUsd = !!(product.priceUsd || product.prices?.USD || product.attributes?.prices?.USD);
      
      if (hasExplicitUsd && exchangeRate > 0) {
        return price * exchangeRate;
      }
      if (!hasExplicitUsd && price < 1000 && exchangeRate > 0) {
        return price * exchangeRate;
      }
      if (price > 1000) {
        return price;
      }
      return exchangeRate > 0 ? price * exchangeRate : price;
    }
    
    if (product.precio && Number(product.precio) > 0) {
      const price = Number(product.precio);
      const hasExplicitUsd = !!(product.priceUsd || product.prices?.USD);
      if (hasExplicitUsd && exchangeRate > 0) {
        return price * exchangeRate;
      }
      if (!hasExplicitUsd && price < 1000 && exchangeRate > 0) {
        return price * exchangeRate;
      }
      if (price > 1000) {
        return price;
      }
      return exchangeRate > 0 ? price * exchangeRate : price;
    }
    
    return 0;
  };

  const getProductPriceUsd = (product: any, exchangeRate: number): number => {
    if (!product) return 0;
    
    if (product.priceUsd && Number(product.priceUsd) > 0) {
      return Number(product.priceUsd);
    }
    if (product.prices?.USD && Number(product.prices.USD) > 0) {
      return Number(product.prices.USD);
    }
    if (product.attributes?.prices?.USD && Number(product.attributes.prices.USD) > 0) {
      return Number(product.attributes.prices.USD);
    }
    
    if (product.priceVes && Number(product.priceVes) > 0) {
      return exchangeRate > 0 ? Number(product.priceVes) / exchangeRate : Number(product.priceVes);
    }
    if (product.prices?.VES && Number(product.prices.VES) > 0) {
      return exchangeRate > 0 ? Number(product.prices.VES) / exchangeRate : Number(product.prices.VES);
    }
    if (product.attributes?.prices?.VES && Number(product.attributes.prices.VES) > 0) {
      return exchangeRate > 0 ? Number(product.attributes.prices.VES) / exchangeRate : Number(product.attributes.prices.VES);
    }
    
    if (product.price && Number(product.price) > 0) {
      const price = Number(product.price);
      const hasExplicitUsd = !!(product.priceUsd || product.prices?.USD || product.attributes?.prices?.USD);
      const hasExplicitVes = !!(product.priceVes || product.prices?.VES || product.attributes?.prices?.VES);
      
      if (hasExplicitUsd) {
        return price;
      }
      if (hasExplicitVes && exchangeRate > 0) {
        return price / exchangeRate;
      }
      if (price < 1000) {
        return price;
      }
      if (price > 1000 && exchangeRate > 0) {
        return price / exchangeRate;
      }
      return exchangeRate > 0 ? price / exchangeRate : price;
    }
    
    if (product.precio && Number(product.precio) > 0) {
      const price = Number(product.precio);
      const hasExplicitUsd = !!(product.priceUsd || product.prices?.USD);
      if (hasExplicitUsd) {
        return price;
      }
      if (price < 1000) {
        return price;
      }
      if (price > 1000 && exchangeRate > 0) {
        return price / exchangeRate;
      }
      return exchangeRate > 0 ? price / exchangeRate : price;
    }
    
    return 0;
  };

  const getProductIvaInfo = (product: any, exchangeRate: number) => {
    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);
    
    const basePriceVes = getProductPriceVes(product, exchangeRate);
    const basePriceUsd = getProductPriceUsd(product, exchangeRate);
    
    let ivaAmountVes = 0;
    let ivaAmountUsd = 0;
    let priceWithIVAVes = basePriceVes;
    let priceWithIVAUsd = basePriceUsd;
    
    if (ivaType === 'excluded') {
      ivaAmountVes = basePriceVes * (ivaRate / 100);
      ivaAmountUsd = basePriceUsd * (ivaRate / 100);
      priceWithIVAVes = basePriceVes + ivaAmountVes;
      priceWithIVAUsd = basePriceUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      ivaAmountVes = basePriceVes - (basePriceVes / (1 + ivaRate / 100));
      ivaAmountUsd = basePriceUsd - (basePriceUsd / (1 + ivaRate / 100));
      priceWithIVAVes = basePriceVes;
      priceWithIVAUsd = basePriceUsd;
    }
    
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
              ivaType === 'exempt' ? 'Exento' : `IVA ${ivaRate}% +`,
      displayShort: ivaType === 'included' ? 'IVA Inc.' : 
                    ivaType === 'exempt' ? 'Exento' : 'IVA +',
      badgeColor: ivaType === 'included' ? '#22c55e' : 
                  ivaType === 'exempt' ? '#64748b' : '#f59e0b',
      badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' : 
                ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
    };
  };

  const ProductCard = memo(({
    product,
    productId,
    qty,
    totalStock,
    remainingStock,
    resolvedImage,
    allImages,
    featuresList,
    prices,
    brand,
    category,
    isFavorite,
    ivaInfo,
    formattedVES,
    formattedBaseVES,
    isLight,
    isPrimaryLight,
    primary,
    textMainClass,
    mutedText,
    priceColor,
    innerCardBg,
    categoryBadge,
    featureBadge,
    cardBg,
    cardBgStyle,        // ✅ NUEVO
    cardHover,
    setPreviewProduct,
    handleQuantityChange,
    onToggleFavorite,
    formatVESPrice,
    compact = false,
    activeConversations = new Set(),
    onCategoryClick,  // ← NUEVA PROP
      priority = false,  // ✅ NUEVA PROP
    isUserDriver = false,  // 🔥 Los repartidores no pueden comprar
    isUserProfessional = false,  // 🔥 Los profesionales tampoco

  }: any) => {
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);    
  const usdDisplay = useMemo(() => {
    // 🔥 SI EL IVA ES EXCLUIDO, MOSTRAR EL PRECIO CON IVA INCLUIDO EN DÓLARES
    if (ivaInfo.ivaType === 'excluded' && ivaInfo.ivaRate > 0) {
      return ivaInfo.priceWithIVAUsd.toFixed(2);
    }
    // Si es incluido o exento, mostrar el precio base (que ya incluye o no tiene IVA)
    return typeof prices?.USD === 'string' ? prices.USD : String(prices?.USD || '0.00');
  }, [prices?.USD, ivaInfo]);

    const productName = useMemo(() => {
      return typeof product?.name === 'string' ? product.name : 
            typeof product?.nombre === 'string' ? product.nombre : 
            'Nombre del producto';
    }, [product?.name, product?.nombre]);

    const categoryDisplay = useMemo(() => typeof category === 'string' ? category : 'Categoría', [category]);
    const brandDisplay = useMemo(() => typeof brand === 'string' ? brand : '', [brand]);

    const displayImages = useMemo(() => {
      if (Array.isArray(allImages) && allImages.length > 0) {
        return allImages;
      }
      return resolvedImage ? [resolvedImage] : [];
    }, [allImages, resolvedImage]);

    const handleCardClick = useCallback(() => {
      setPreviewProduct?.(product);
    }, [product, setPreviewProduct]);

    const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite?.(productId);
    }, [productId, onToggleFavorite]);

    const handleAddToCart = useCallback(() => {
      if (totalStock > 0) {
        handleQuantityChange(productId, 1, totalStock);
      }
    }, [productId, totalStock, handleQuantityChange]);

    const handleDecrement = useCallback(() => {
      handleQuantityChange(productId, qty - 1, totalStock);
    }, [productId, qty, totalStock, handleQuantityChange]);

    const handleIncrement = useCallback(() => {
      if (qty < totalStock) {
        handleQuantityChange(productId, qty + 1, totalStock);
      }
    }, [productId, qty, totalStock, handleQuantityChange]);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    // 🔥 AUMENTAR ALTURA DE LA IMAGEN
    const imageHeight = compact ? '180px' : '240px';
    // 🔥 AUMENTAR PADDING
    const padding = compact ? 'p-3' : 'p-4';
    const borderRadius = compact ? 'rounded-xl' : 'rounded-2xl';

      return (<div 
    onClick={handleCardClick}
    className={`${borderRadius} ${padding} flex flex-col h-full overflow-hidden group cursor-pointer relative border ${cardBg} ${cardHover} ${
                        ivaInfo.discountInfo ? 'border-2' : ''
    }`}
    style={{
      contain: 'layout paint style',
      ...cardBgStyle,
      ...(ivaInfo.discountInfo ? { borderColor: primary } : {}),
      ...(ivaInfo.discountInfo ? { boxShadow: `0 0 12px -4px ${primary}30` } : {}),
      transition: 'transform 300ms ease, box-shadow 300ms ease',
      willChange: 'transform',
    }}
    onMouseEnter={(e) => {
      setIsHovered(true);
      e.currentTarget.style.transform = 'translateY(-6px)';
      e.currentTarget.style.boxShadow = `0 20px 40px -10px ${primary}40`;
    }}
    onMouseLeave={(e) => {
      setIsHovered(false);
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = ivaInfo.discountInfo
        ? `0 0 12px -4px ${primary}30`
        : '';
    }}
  >

        <div className="relative z-10 flex flex-col flex-1 justify-between gap-3">
                                <div 
    className={`relative w-full overflow-hidden border flex items-center justify-center shadow-inner ${borderRadius} ${innerCardBg} shrink-0`}
    style={{
      aspectRatio: '1/1',
      width: '100%',
      maxHeight: '320px',
      minHeight: imageHeight,
    }}
  >
    {resolvedImage && !imageError ? (
  <Image
    src={resolvedImage}
    alt={productName}
    fill
    sizes="(max-width: 640px) 50vw, 33vw"
    className="object-cover transition-opacity duration-300"
    onError={handleImageError}
    quality={60}
    priority={priority}
    loading={priority ? "eager" : "lazy"}
    placeholder="blur"
    blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4="
  />
    ) : (
              <div className={`flex flex-col items-center justify-center opacity-40 space-y-2 ${mutedText}`}>
                <ImageIcon className="w-10 h-10" />
                <span className="text-xs">Sin imagen</span>
              </div>
            )}

{remainingStock > 0 && isHovered && (
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl animate-in fade-in duration-200">
    <span
      className={`text-xs font-bold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 ${textMainClass}`}
      style={{
        backgroundColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)',
        borderColor: `${primary}40`,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <Eye className="w-4 h-4" />
      Ver detalles
    </span>
  </div>
)}

            <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1 max-w-[85%]">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onCategoryClick?.(categoryDisplay);
    }}
    className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm border cursor-pointer hover:opacity-80 transition ${categoryBadge}`}
  >
    {categoryDisplay}
  </button>
              {brandDisplay && (
                <span 
                  className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm"
                  style={{ backgroundColor: primary, color: isPrimaryLight ? '#030712' : '#ffffff' }}
                >
                  {brandDisplay}
                </span>
              )}
            </div>

  {ivaInfo.discountInfo && (
    <div className="absolute bottom-2 left-2 z-10">
      <span 
className="px-1.5 py-0.5 rounded-md text-[8px] font-bold shadow-sm border"

style={{
          backgroundColor: primary,
          borderColor: primary,
          color: isPrimaryLight ? '#030712' : '#ffffff',
        }}
      >
        -{ivaInfo.discountInfo.discountPercentage}% OFF
      </span>
    </div>
  )}



            <button
              type="button"
              onClick={handleFavoriteToggle}
className={`absolute top-2 right-2 z-20 p-2.5 rounded-full shadow-sm active:scale-90 border ${
                isLight 
                  ? 'bg-white/80 hover:bg-white text-slate-700 border-slate-200' 
                  : 'bg-black/60 hover:bg-black/80 text-slate-200 border-white/20'
              }`}
              aria-label="Favorito"
            >
              <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'text-rose-500 fill-rose-500' : `${mutedText} hover:opacity-100`}`} />
            </button>

            {remainingStock === 0 && (
<div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">

                <span className="text-white text-sm font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/30 bg-black/60">
                  Agotado
                </span>
              </div>
            )}
          </div>

          {!compact && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 min-h-[32px] shrink-0">
              {displayImages.slice(0, 4).map((imgUrl: string, imgIdx: number) => (
                <div 
                  key={imgIdx} 
                  style={imgIdx === 0 ? { borderColor: primary } : {}}
                  className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 shadow-sm ${
                    imgIdx === 0 
                      ? 'ring-1 ring-indigo-500/20' 
                      : isLight ? 'border-slate-300 bg-white/80 opacity-70' : 'border-white/15 bg-black/40 opacity-70'
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt="Thumbnail"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzMzMzMiLz48L3N2Zz4="
                  />
                </div>
              ))}
            </div>
          )}

          <div className="shrink-0">
            <h4 className={`font-black tracking-tight ${compact ? 'text-base' : 'text-lg sm:text-xl'} leading-tight line-clamp-2 ${textMainClass}`}>
              {productName}
            </h4>
            
            {!compact && (
              <div className="shrink-0 mt-1.5">
                {Array.isArray(featuresList) && featuresList.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {featuresList.slice(0, 2).map((feat: string, idx: number) => (
                      <span 
                        key={idx}
                        className={`text-[9px] px-2 py-1 rounded-lg flex items-center gap-1 border font-medium shadow-xs ${featureBadge}`}
                      >
                        <CheckCircle2 className={`w-3 h-3 ${mutedText}`} />
                        {typeof feat === 'string' ? feat.substring(0, 14) : String(feat).substring(0, 14)}
                        {typeof feat === 'string' && feat.length > 14 ? '…' : ''}
                      </span>
                    ))}
                    {featuresList.length > 2 && (
                      <span className={`text-[9px] px-2 py-1 rounded-lg font-medium ${mutedText}`}>
                        +{featuresList.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className={`text-[9px] px-2 py-1 rounded-lg flex items-center gap-1 border font-medium shadow-xs ${featureBadge}`}>
                    <CheckCircle2 className={`w-3 h-3 ${mutedText}`} />
                    Original
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 mb-2">
  <div className={`flex items-end justify-between gap-2 ${!compact ? 'border-t pt-3' : ''} ${
    isLight ? 'border-slate-200/80' : 'border-white/10'
  }`}>
    <div className="min-w-0 flex-1">
              {ivaInfo.discountInfo ? (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] line-through opacity-50" style={{ color: textMainClass }}>
          Bs. {formatVESPrice(ivaInfo.discountInfo.originalPrice)}
        </span>
        <span 
          className={`font-black tracking-tight ${compact ? 'text-base' : 'text-xl'}`}
          style={{ color: primary }}
        >
          Bs. {formatVESPrice(ivaInfo.discountInfo.finalPriceWithIVA)}
        </span>

      </div>
      
      {/* PRECIO EN USD (verde) */}
      <span 
        className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold`}
        style={{ 
          color: isLight ? '#065f46' : '#34d399'
        }}
      >
        (${Number(ivaInfo.discountInfo.finalPriceWithIVAUsd || 0).toFixed(2)})
      </span>
      
      {/* 🔥 IVA - SIEMPRE VISIBLE */}
      <div className={`${compact ? 'text-[8px]' : 'text-[9px]'} ${mutedText} opacity-60 leading-none mt-0.5`}>
        {ivaInfo.ivaType === 'included' ? (
          <>IVA {ivaInfo.ivaRate}% incluido</>
        ) : ivaInfo.ivaType === 'exempt' ? (
          <>Exento de IVA</>
        ) : (
          <>Base: Bs. {formatVESPrice(ivaInfo.basePriceVes)} + {ivaInfo.ivaRate}% IVA</>
        )}
      </div>
      

    </>
  ) : (
        <>
          <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} uppercase font-bold tracking-wider block ${mutedText}`}>
            {ivaInfo.ivaType === 'included' ? 'IVA Inc.' : ivaInfo.ivaType === 'exempt' ? 'Exento' : '+ IVA'}
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span 
              className={`font-black tracking-tight ${compact ? 'text-base' : 'text-xl'}`}
              style={{ color: primary }}
            >
              Bs. {formattedVES}
            </span>
            <span 
              className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold`}
              style={{ 
                color: isLight ? '#065f46' : '#34d399'
              }}
            >
              (${usdDisplay})
            </span>
          </div>
          {ivaInfo.ivaType === 'excluded' && ivaInfo.ivaRate > 0 && (
            <div className={`${compact ? 'text-[8px]' : 'text-[9px]'} ${mutedText} opacity-60 leading-none mt-0.5`}>
              Base: Bs. {formattedBaseVES} + {ivaInfo.ivaRate}%
            </div>
          )}
          {ivaInfo.ivaType === 'included' && (
            <div className={`${compact ? 'text-[8px]' : 'text-[9px]'} ${mutedText} opacity-60 leading-none mt-0.5`}>
              IVA {ivaInfo.ivaRate}% incluido
            </div>
          )}
        </>
      )}
    </div>

    <div className="text-right shrink-0">
      <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} uppercase font-bold tracking-wider block ${mutedText}`}>STOCK</span>
      <div className={`${compact ? 'text-[10px]' : 'text-sm'} font-bold px-2.5 py-1 rounded-lg border shadow-sm inline-flex items-center gap-1 ${
        isLight ? 'border-slate-200 bg-white/80 text-slate-800' : 'border-white/15 bg-black/40 text-slate-200'
      }`}>
        <span>{remainingStock > 0 ? remainingStock : '0'}</span>
      </div>
    </div>
  </div>

            <div className={`pt-2.5 mt-auto relative z-10`} onClick={(e) => e.stopPropagation()}>
                                                                {isUserDriver || isUserProfessional ? (
                // 🔥 Repartidores y profesionales no pueden comprar.
                <div className={`w-full ${compact ? 'py-2 px-3' : 'py-2.5 px-4'} rounded-xl text-[10px] font-bold text-center border ${isLight ? 'border-amber-500/30 bg-amber-500/10 text-amber-700' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                  {isUserDriver ? 'Los repartidores no pueden comprar' : 'Los profesionales no pueden comprar'}
                </div>
              ) : qty === 0 ? (
                <button
                  onClick={handleAddToCart}
                  disabled={totalStock <= 0}
                  style={totalStock <= 0 ? {} : { backgroundColor: primary }}
className={`w-full ${compact ? 'py-2 px-3' : 'py-2.5 px-4'} rounded-xl ${compact ? 'text-[10px]' : 'text-xs'} font-bold transition-transform flex items-center justify-center gap-2 shadow-lg tracking-wide ${
                      totalStock <= 0 
                      ? 'bg-slate-500/30 text-slate-400 cursor-not-allowed border border-white/5' 
                      : `${isPrimaryLight ? 'text-slate-950 font-black' : 'text-white'} hover:opacity-90 active:scale-95 cursor-pointer hover:shadow-xl`
                  }`}
                >
                  <ShoppingBag className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  {totalStock <= 0 ? 'Agotado' : compact ? 'Añadir' : 'Añadir al carrito'}
                </button>
              ) : (
                <div className={`flex items-center space-x-2 rounded-xl p-1.5 border w-full justify-between shadow-inner ${
                  isLight ? 'bg-white/80 border-slate-200' : 'bg-black/40 border-white/15'
                }`}>
                  <button
                    onClick={handleDecrement}
                    className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg flex items-center justify-center transition cursor-pointer shadow-sm border ${
                      isLight 
                        ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800' 
                        : 'border-white/15 bg-black/40 hover:bg-white/20 text-white'
                    }`}
                    aria-label="Restar"
                  >
                    <Minus className={compact ? "w-3 h-3" : "w-4 h-4"} />
                  </button>
                  
                  <span className={`font-black ${compact ? 'text-sm' : 'text-base'} ${textMainClass}`}>{qty}</span>
                  
                  <button
                    onClick={handleIncrement}
                    disabled={qty >= totalStock}
                    style={qty >= totalStock ? {} : { backgroundColor: primary }}
                    className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg flex items-center justify-center shadow-md transition border ${
                      qty >= totalStock 
                        ? 'opacity-40 cursor-not-allowed bg-slate-500/30 text-slate-400 border-white/5' 
                        : `${isPrimaryLight ? 'text-slate-950 font-black' : 'text-white'} cursor-pointer hover:opacity-90 active:scale-95 border-transparent`
                    }`}
                    aria-label="Sumar"
                  >
                    <Plus className={compact ? "w-3 h-3" : "w-4 h-4"} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  ProductCard.displayName = 'ProductCard';


  const mapPricingToIvaInfo = (pricing: any) => {
    if (!pricing || typeof pricing !== 'object') return null;

    const ivaType = pricing.ivaType || 'excluded';
    const ivaRate = Number(pricing.ivaRate || 0);

    // Badge colors (mismo criterio que `getIvaInfo` local)
    const badgeColor =
      ivaType === 'included' ? '#22c55e' :
      ivaType === 'exempt'   ? '#64748b' :
      '#f59e0b';

    const badgeBg =
      ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
      ivaType === 'exempt'   ? 'rgba(100,116,139,0.15)' :
      'rgba(251,191,36,0.15)';

    const display =
      ivaType === 'included' ? `IVA ${ivaRate}% Inc.` :
      ivaType === 'exempt'   ? 'Exento' :
      `IVA ${ivaRate}% +`;

    const displayShort =
      ivaType === 'included' ? 'IVA Inc.' :
      ivaType === 'exempt'   ? 'Exento' :
      'IVA +';

    // Construir discountInfo SOLO si hay descuento activo
    const discountInfo = pricing.hasDiscount
      ? {
          discountPercentage: pricing.discountPercentage || 0,
          originalPrice: pricing.originalPriceVES || 0,
          originalPriceUsd: pricing.originalPriceUSD || 0,
          finalPriceWithIVA: pricing.totalPriceVES || 0,
          finalPriceWithIVAUsd: pricing.totalPriceUSD || 0,
          savingVes: pricing.discountAmountVES || 0,
          savingUsd: pricing.discountAmountUSD || 0,
        }
      : null;

    return {
      ivaType,
      ivaRate,
      basePriceVes: pricing.basePriceVES || 0,
      basePriceUsd: pricing.basePriceUSD || 0,
      ivaAmountVes: pricing.taxAmountVES || 0,
      ivaAmountUsd: pricing.taxAmountUSD || 0,
      priceWithIVAVes: pricing.totalPriceVES || 0,
      priceWithIVAUsd: pricing.totalPriceUSD || 0,
      display,
      displayShort,
      badgeColor,
      badgeBg,
      discountInfo,
      // Metadata adicional (por si la quieres usar)
      _pricingSource: 'backend',
      _exchangeRateUsed: pricing.exchangeRateUsed,
      _calculatedAt: pricing.calculatedAt,
    };
  };



  function ProductCatalog({
        categories,
    selectedCategory,
    setSelectedCategory,
    primary,
    secondary,                // ✅ NUEVO
    isPrimaryLight,
    textMutedClass,
    filteredProducts,
    textMainClass,
    isSecondaryLight,
    cart,
    updateCartQty,
    removeFromCart,
    setPreviewProduct,
    favorites = [],
    onToggleFavorite,
    layout = 'grid',
    allProducts = [],
    isAuthenticated = false,
    userId = '',
    onApplyFilters = () => {},
    onClearFilters = () => {},
    filters = {},
    uniqueBrands = [],
    uniqueFeatures = [],
    searchQuery = '',
    setSearchQuery = () => {},
    isUserDriver = false,
    isUserProfessional = false,
  }: any) {

    const { rates, loading: ratesLoading } = useExchangeRateContext();
    const exchangeRate = rates.USD > 0 ? rates.USD : 0;

    // 🔥 ESTADO PARA CONVERSACIONES ACTIVAS
    const [activeConversations, setActiveConversations] = useState<Set<string>>(new Set());
    const [loadingConversations, setLoadingConversations] = useState(false);
    
    // ✅ REF PARA CONTROLAR SI YA SE CARGARON LAS CONVERSACIONES
    const conversationsLoadedRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

    // ✅ MEMOIZAR EL ESTADO DE AUTENTICACIÓN
    const isUserAuthenticated = useMemo(() => isAuthenticated && Boolean(userId), [isAuthenticated, userId]);

    // ✅ FUNCIÓN DE CARGA DE CONVERSACIONES - OPTIMIZADA CON ABORT CONTROLLER
    const loadActiveConversations = useCallback(async () => {
      // 🔥 NO CARGAR SI NO ESTÁ AUTENTICADO
      if (!isUserAuthenticated || !userId) {
        setActiveConversations(new Set());
        return;
      }

      // 🔥 VERIFICAR SI YA SE CARGARON PARA ESTE USUARIO
      const cacheKey = `${userId}`;
      if (conversationsLoadedRef.current === cacheKey) {
        return; // ✅ YA ESTÁN CARGADAS
      }

      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        setActiveConversations(new Set());
        return;
      }

      // ✅ CANCELAR PETICIÓN ANTERIOR SI EXISTE
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        setLoadingConversations(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL;

        const res = await fetch(`${apiBase}/chat/user/${userId}/conversations`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortControllerRef.current.signal,
        });

        if (res.ok) {
          const data = await res.json();
          // Extraer solo los IDs de productos que tienen conversaciones activas
          const activeProductIds = data
            .filter((conv: any) => conv.status === 'active' || conv.status === 'completed' || conv.status === 'pending')
            .map((conv: any) => conv.product?.id)
            .filter(Boolean);
          
          // ✅ ACTUALIZAR EN UNA SOLA VEZ
          setActiveConversations(new Set(activeProductIds));
          conversationsLoadedRef.current = cacheKey;
        } else {
          setActiveConversations(new Set());
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('⏹️ [ProductCatalog] Petición cancelada');
          return;
        }
        console.error('Error al cargar conversaciones activas:', error);
        setActiveConversations(new Set());
      } finally {
        setLoadingConversations(false);
        abortControllerRef.current = null;
      }
    }, [isUserAuthenticated, userId]);

    // ✅ CARGAR CONVERSACIONES SOLO CUANDO EL USUARIO CAMBIA
    useEffect(() => {
      if (isUserAuthenticated && userId) {
        loadActiveConversations();
      } else {
        setActiveConversations(new Set());
        conversationsLoadedRef.current = '';
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      }

      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      };
      // ✅ DEPENDENCIAS ESTRICTAS - SOLO userId y isUserAuthenticated
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isUserAuthenticated]);

    // ✅ RECARGAR CONVERSACIONES CUANDO EL USUARIO SE AUTENTICA
    useEffect(() => {
      if (isUserAuthenticated && userId) {
        // ✅ FORZAR RECARGA SOLO SI CAMBIÓ EL USUARIO
        const cacheKey = `${userId}`;
        if (conversationsLoadedRef.current !== cacheKey) {
          loadActiveConversations();
        }
      }
    }, [isUserAuthenticated, userId, loadActiveConversations]);



  const formatVESPrice = useCallback((amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '0,00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('es-VE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    console.log('🖱️ handleCategoryClick - Categoría clickeada:', category);
    // ✅ Llamar a setSelectedCategory directamente
    setSelectedCategory(category);
  }, [setSelectedCategory]);

    const getProductDescription = useCallback((item: any) => {
      if (!item) return '';
      const desc = item.description || item.desc || item.descripcion || item.summary || item.details || item.detalle || item.notes || item.nota || item.info || '';
      return typeof desc === 'string' ? desc : String(desc || '');
    }, []);

    const getProductFeatures = useCallback((item: any) => {
      const rawFeats = item?.features || item?.attributes || item?.tags || [];
      try {
        const parsed = typeof rawFeats === 'string' ? JSON.parse(rawFeats) : rawFeats;
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return Array.isArray(rawFeats) ? rawFeats : [];
      }
    }, []);

    const getProductPrices = useCallback((product: any) => {
      if (!product) return { VES: '0.00', USD: '0.00' };
      
      const vesVal = getProductPriceVes(product, exchangeRate);
      const usdVal = getProductPriceUsd(product, exchangeRate);
      
      let pricesObj = product?.prices || product?.attributes?.prices || {};
      if (typeof pricesObj === 'string') {
        try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
      }
      
      const eurVal = pricesObj?.EUR ?? pricesObj?.eur ?? product?.price_eur ?? null;
      const cryptoVal = pricesObj?.CRYPTO ?? pricesObj?.crypto ?? product?.price_crypto ?? null;

      return {
        VES: vesVal > 0 ? vesVal.toFixed(2) : '0.00',
        USD: usdVal > 0 ? usdVal.toFixed(2) : '0.00',
        EUR: eurVal !== null && !isNaN(Number(eurVal)) ? Number(eurVal).toFixed(2) : null,
        USDT: cryptoVal !== null && String(cryptoVal).trim() !== '' ? String(cryptoVal) : null,
      };
    }, [exchangeRate]);

    


  const getIvaInfo = useCallback((product: any, withDiscount: boolean = false) => {
    // 🔥 NUEVO: Si el producto trae `_pricing` del backend, usarlo
    if (product?._pricing && typeof product._pricing === 'object') {
      const mapped = mapPricingToIvaInfo(product._pricing);
      if (mapped) {
        return mapped;
      }
    }

    // 1. Obtener el precio que viene del producto (PUEDE ser con o sin IVA)
    const rawPriceVes = getProductPriceVes(product, exchangeRate);
    const rawPriceUsd = getProductPriceUsd(product, exchangeRate);
    
    // 2. Determinar tipo y tasa de IVA
    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);
    
    // 3. Calcular el precio BASE (sin IVA) según el tipo
    let basePriceVes = rawPriceVes;
    let basePriceUsd = rawPriceUsd;
    
    if (ivaType === 'included') {
      // 🔥 SI EL IVA ESTÁ INCLUIDO: el precio raw YA incluye IVA
      // Base = Precio / (1 + tasa%)
      basePriceVes = rawPriceVes / (1 + ivaRate / 100);
      basePriceUsd = rawPriceUsd / (1 + ivaRate / 100);
    }
    // Si es 'excluded' o 'exempt': el precio raw ES la base (sin IVA)
    
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
        
        // Guardar precio final original (sin descuento) para mostrar el ahorro
        let originalFinalVes = basePriceVes;
        let originalFinalUsd = basePriceUsd;
        
        if (ivaType === 'excluded') {
          originalFinalVes = basePriceVes * (1 + ivaRate / 100);
          originalFinalUsd = basePriceUsd * (1 + ivaRate / 100);
        } else if (ivaType === 'included') {
          // El precio final YA incluye IVA, es el precio raw original
          originalFinalVes = rawPriceVes;
          originalFinalUsd = rawPriceUsd;
        }
        // Exempt: el precio final es la base
        
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
        // Exempt: el precio final es la base
        
        discountInfo = {
          discountPercentage,
          originalPrice: Math.round(originalFinalVes * 100) / 100,
          originalPriceUsd: Math.round(originalFinalUsd * 100) / 100,
          finalPriceWithIVA: Math.round(discountedFinalVes * 100) / 100,
          finalPriceWithIVAUsd: Math.round(discountedFinalUsd * 100) / 100,
          savingVes: Math.round((originalFinalVes - discountedFinalVes) * 100) / 100,
          savingUsd: Math.round((originalFinalUsd - discountedFinalUsd) * 100) / 100,
        };
      }
    }
    
    // 5. Calcular el IVA sobre el precio base (con descuento o no)
    let ivaAmountVes = 0;
    let ivaAmountUsd = 0;
    let priceWithIVAVes = finalBaseVes;
    let priceWithIVAUsd = finalBaseUsd;
    
    if (ivaType === 'excluded') {
      // IVA NO incluido: se suma al precio base
      ivaAmountVes = finalBaseVes * (ivaRate / 100);
      ivaAmountUsd = finalBaseUsd * (ivaRate / 100);
      priceWithIVAVes = finalBaseVes + ivaAmountVes;
      priceWithIVAUsd = finalBaseUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      // IVA YA incluido: calcular cuánto es del total
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

      
    };

    
  }, [exchangeRate]);


    // 🔥 CREAR productsWithPrices CON LOS PRECIOS YA CALCULADOS (DESPUÉS de getIvaInfo)
    const productsWithPrices = useMemo(() => {
      if (!allProducts || allProducts.length === 0) return [];
      
      return allProducts.map((product: any) => {
        const ivaInfo = getIvaInfo(product, true);
        return {
          ...product,
          _priceInfo: {
            priceVes: ivaInfo.priceWithIVAVes,
            priceUsd: ivaInfo.priceWithIVAUsd,
            baseVes: ivaInfo.basePriceVes,
            baseUsd: ivaInfo.basePriceUsd,
            originalVes: ivaInfo.discountInfo?.originalPrice || ivaInfo.priceWithIVAVes,
            originalUsd: ivaInfo.discountInfo?.originalPriceUsd || ivaInfo.priceWithIVAUsd,
            hasDiscount: !!ivaInfo.discountInfo,
            discountPercentage: ivaInfo.discountInfo?.discountPercentage || 0,
            ivaType: ivaInfo.ivaType,
            ivaRate: ivaInfo.ivaRate,
            savingVes: ivaInfo.discountInfo?.savingVes || 0,
            savingUsd: ivaInfo.discountInfo?.savingUsd || 0,
          }
        };
      });
    }, [allProducts, exchangeRate, getIvaInfo]);

    const isAllCategory = useMemo(() => {
      return !selectedCategory || selectedCategory.toLowerCase() === 'todos';
    }, [selectedCategory]);



    const handleQuantityChange = useCallback((productId: string, newQty: number, maxStock: number) => {
      if (newQty <= 0) {
        removeFromCart?.(productId);
        return;
      }
      updateCartQty?.(productId, newQty, maxStock);
    }, [removeFromCart, updateCartQty]);

    const isLight = useMemo(() => isSecondaryLight, [isSecondaryLight]);

    const styles = useMemo(() => ({
      cardBg: isLight
        ? 'border-slate-200/60 shadow-sm'
        : 'border-white/10 shadow-sm',
      cardHover: isLight
        ? 'hover:shadow-md hover:shadow-slate-300/40'
        : 'hover:shadow-md hover:shadow-black/40',
      innerCardBg: isLight ? 'bg-white/70 border-slate-200/60' : 'bg-black/40 border-white/10',
      textColor: isLight ? 'text-slate-900' : 'text-white',
      mutedText: isLight ? 'text-slate-600' : 'text-slate-300',
      categoryBadge: isLight
        ? 'bg-white/90 border-slate-200 text-slate-800'
        : 'bg-black/70 border-white/20 text-white',
      featureBadge: isLight
        ? 'border-slate-200 bg-white/85 text-slate-700'
        : 'border-white/15 bg-black/40 text-slate-300',
      // 🔥 Fondo de la tarjeta: hereda del tema
      cardBgStyle: isLight
        ? { backgroundColor: 'rgba(255, 255, 255, 0.85)' }
        : { backgroundColor: secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)' },
    }), [isLight, secondary]);

    const formatCategoryName = useCallback((name: string) => {
      if (!name) return '';
      if (name.toLowerCase() === 'todos') return 'Todos';
      
      let formatted = name.replace(/[_]/g, ' ');
      formatted = formatted.toLowerCase();
      formatted = formatted.replace(/(^\w{1}|\.\s*\w{1}|\s\w{1})/g, (match) => {
        return match.toUpperCase();
      });
      
      const words = formatted.split(' ');
      const result = words.map((word, index) => {
        const lowerWords = ['y', 'de', 'la', 'el', 'los', 'las', 'en', 'con', 'sin', 'por', 'para'];
        if (index > 0 && lowerWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
      
      return result.join(' ');
    }, []);

  const renderedCategories = useMemo(() => {
    if (!categories || categories.length <= 1) return null;
    
    // 🔥 Color de fondo dinámico para categorías no seleccionadas (hereda del tema)
    const categoryBg = isLight 
      ? 'rgba(255, 255, 255, 0.40)' 
      : (secondary ? `${secondary}B3` : 'rgba(0, 0, 0, 0.70)');
    const categoryBgHover = isLight 
      ? 'rgba(255, 255, 255, 0.70)' 
      : (secondary ? `${secondary}E6` : 'rgba(0, 0, 0, 0.85)');
    
    return categories.map((cat: string) => {
      const isSelected = selectedCategory === cat;
      const displayName = formatCategoryName(cat);

      return (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          style={isSelected ? { backgroundColor: primary } : { backgroundColor: categoryBg }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = categoryBgHover;
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = categoryBg;
          }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-transform duration-200 cursor-pointer border ${(
            isSelected
              ? `${isPrimaryLight ? 'text-slate-950 font-black' : 'text-white'} border-transparent shadow-lg`
              : isLight
              ? 'border-slate-200/80 text-slate-700 hover:border-slate-300'
              : 'border-white/10 text-slate-300 hover:border-white/30'
          )}`}
        >
          {displayName}
        </button>
      );
    });
  }, [categories, selectedCategory, primary, isPrimaryLight, isLight, formatCategoryName, setSelectedCategory, secondary]);

    // ✅ MEMOIZAR PRODUCTOS RENDERIZADOS - DEPENDE DE activeConversations
    const renderedProducts = useMemo(() => {
      if (!filteredProducts || filteredProducts.length === 0) {
        // ✅ SKELETON CON ALTURA RESERVADA para evitar CLS mientras carga
        // Renderizamos 6 placeholders con la misma altura que las cards finales.
        // Cuando lleguen los productos, el layout ya está reservado → 0 CLS.
        return (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className={`rounded-2xl animate-pulse ${
                  isLight ? 'bg-slate-200/60' : 'bg-white/5'
                }`}
                style={{ aspectRatio: '1/1', minHeight: '280px' }}
              />
            ))}
          </>
        );
      }
  // ✅ SOLO RENDERIZAR PRIMEROS 20 PRODUCTOS
  const VISIBLE_PRODUCTS = 20;
  const visibleProducts = filteredProducts.slice(0, VISIBLE_PRODUCTS);

  return visibleProducts.map((product: any, index: number) => {  const productId = product.id || product._id;
    const currentCart = typeof cart === 'object' && cart !== null ? cart : {};
    const qty = currentCart[productId] || 0;
    const totalStock = Number(product.stock ?? product.existencias ?? 99);
    const remainingStock = Math.max(0, totalStock - qty);

    const resolvedImage = getImageUrl(product);
    const allImages = getImageUrls(product);
    const description = getProductDescription(product);
    const featuresList = getProductFeatures(product);
    const prices = getProductPrices(product);
    const brand = product?.brand || product?.marca || '';

    const rawCategory = product?.category || product?.categoria || 'Categoría';
    const category = formatCategoryName(rawCategory);

    const isFavorite = Array.isArray(favorites) 
      ? favorites.includes(productId) 
      : favorites instanceof Set ? favorites.has(productId) : false;

    const ivaInfo = getIvaInfo(product, true);
    const formattedVES = formatVESPrice(ivaInfo.priceWithIVAVes);
    const formattedBaseVES = formatVESPrice(ivaInfo.basePriceVes);

    // ✅ PRIMEROS 4 PRODUCTOS CON PRIORIDAD (LCP)
    const isPriority = index < 4;

    return (
      <ProductCard
        key={productId}
        product={product}
        productId={productId}
        qty={qty}
        totalStock={totalStock}
        remainingStock={remainingStock}
        resolvedImage={resolvedImage}
        allImages={allImages}
        featuresList={featuresList}
        prices={prices}
        brand={brand}
        category={category}
        isFavorite={isFavorite}
        ivaInfo={ivaInfo}
        formattedVES={formattedVES}
        formattedBaseVES={formattedBaseVES}
        isLight={isLight}
        isPrimaryLight={isPrimaryLight}
        primary={primary}
        textMainClass={textMainClass}
        mutedText={styles.mutedText}
        priceColor={styles.priceColor}
        innerCardBg={styles.innerCardBg}
        categoryBadge={styles.categoryBadge}
        featureBadge={styles.featureBadge}
        cardBg={styles.cardBg}
        cardBgStyle={styles.cardBgStyle}        // ✅ NUEVO
        cardHover={styles.cardHover}
        setPreviewProduct={setPreviewProduct}
        handleQuantityChange={handleQuantityChange}
        onToggleFavorite={onToggleFavorite}
        formatVESPrice={formatVESPrice}
        compact={layout === 'list-with-sidebar'}
        activeConversations={activeConversations}
        onCategoryClick={handleCategoryClick}
        priority={isPriority}  // ✅ NUEVA PROP
        isUserDriver={isUserDriver}
        isUserProfessional={isUserProfessional}
      />
    );
  });
    }, [
      filteredProducts,
      cart,
      getProductDescription,
      getProductFeatures,
      getProductPrices,
      formatCategoryName,
      formatVESPrice,
      getIvaInfo,
      isAllCategory,
      
      favorites,
      isLight,
      isPrimaryLight,
      primary,
      textMainClass,
      styles,
      setPreviewProduct,
      handleQuantityChange,
      onToggleFavorite,
      exchangeRate,
      layout,
      activeConversations, // ✅ AHORA SOLO SE ACTUALIZA CUANDO CAMBIA activeConversations
    ]);

    useEffect(() => {
      if (!ratesLoading && exchangeRate === 0) {
        console.warn('⚠️ [ProductCatalog] Tasa de cambio es 0, verificar ExchangeRateContext');
      }
    }, [exchangeRate, ratesLoading]);

    const safeAllProducts = useMemo(() => allProducts || [], [allProducts]);

    return (
      <div className="w-full">
        {categories && categories.length > 1 && (
          <div className="flex items-center space-x-2.5 overflow-x-auto pb-4 scrollbar-none w-full min-h-[60px]">
            {renderedCategories}
          </div>
        )}

  {layout === 'list-with-sidebar' ? (
  <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-start">
    {/* COLUMNA IZQUIERDA - PRODUCTOS FILTRADOS */}
    <div className="lg:col-span-4">
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full ${
        filteredProducts.length === 0
          ? 'min-h-[600px]'
          : filteredProducts.length <= 3
          ? 'min-h-[320px]'
          : filteredProducts.length <= 6
          ? 'min-h-[640px]'
          : 'min-h-[960px]'
      }`}>
        {renderedProducts}
      </div>
    </div>

    {/* 🔥 BARRA LATERAL DERECHA - FILTROS + MÁS POPULARES */}
    <div className="lg:col-span-2 space-y-4 min-h-[600px]" style={{ top: 'calc(4rem + 16px)' }}>
      {/* FILTROS AVANZADOS */}
  <FilterSidebar
    primary={primary}
    textMainClass={textMainClass}
    textMutedClass={textMutedClass}
    isLight={isLight}
    cardBgClass={styles.cardBg}
    onApplyFilters={onApplyFilters}   // ✅ PASAR LA FUNCIÓN DEL PADRE
    onClearFilters={onClearFilters}   // ✅ PASAR LA FUNCIÓN DEL PADRE
    products={safeAllProducts}
    categories={categories}
    brands={uniqueBrands}
    features={uniqueFeatures}
    initialFilters={filters}    
    searchQuery={searchQuery}         // ✅ PASAR ESTO
    onSearchChange={setSearchQuery}    // ✅ PASAR EL ESTADO ACTUAL
secondary={secondary}
  />

  <Top10Sidebar
    products={productsWithPrices}
    onProductClick={setPreviewProduct}
    primary={primary}
    secondary={secondary}                    // ✅ NUEVO
    textMainClass={textMainClass}
    textMutedClass={styles.mutedText}
    isLight={isLight}
  />
    </div>
  </div>
  ) : (
  
          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full ${
            filteredProducts.length === 0
              ? 'min-h-[600px]'
              : filteredProducts.length <= 3
              ? 'min-h-[320px]'
              : filteredProducts.length <= 6
              ? 'min-h-[640px]'
              : 'min-h-[960px]'
          }`}>
            {renderedProducts}
          </div>
        )}
      </div>
    );
}

export default React.memo(ProductCatalog);