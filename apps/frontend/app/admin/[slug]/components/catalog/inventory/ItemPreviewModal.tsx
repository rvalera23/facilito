  'use client';

  import React, { useState, useEffect, useMemo, useRef } from 'react';
  import { createPortal } from 'react-dom';
  import { PRODUCT_TAG_CATEGORIES, SERVICE_TAG_CATEGORIES } from '@/app/constants/itemCategories';
  import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
  import { getFirstImage, getAllImages } from '@/lib/imageUtils';
  import { getPriceColors } from '@/lib/priceTokens';

  interface ItemPreviewModalProps {
    previewProduct: any;
    setPreviewProduct: (product: any) => void;
    primary: string;
    secondary?: string;
    textColor: string;
    isDarkBg: boolean;
    onAddToCart?: (product: any, quantity: number, selectedOptions: { color?: string; variant?: string }) => void;
  }

  export default function ItemPreviewModal({
    previewProduct,
    setPreviewProduct,
    primary,
    secondary,
    textColor,
    isDarkBg,
    onAddToCart,
  }: ItemPreviewModalProps) {
    const [mounted, setMounted] = useState(false);
    const [previewSelectedImageIndex, setPreviewSelectedImageIndex] = useState<number>(0);
    const [isZoomedModalOpen, setIsZoomedModalOpen] = useState(false);
    const [quantity, setQuantity] = useState<number>(1);
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedVariant, setSelectedVariant] = useState<string>('');

    const [isHovering, setIsHovering] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const { rates, loading: ratesLoading } = useExchangeRateContext();

    // 🔥 LOG PARA VER QUÉ LLEGA AL MODAL
    useEffect(() => {
      if (previewProduct) {
        console.log('🔍 [ItemPreviewModal] previewProduct recibido:', {
          id: previewProduct?.id,
          name: previewProduct?.name,
          ivaType: previewProduct?.ivaType,
          ivaRate: previewProduct?.ivaRate,
          'attributes.ivaType': previewProduct?.attributes?.ivaType,
          'attributes.ivaRate': previewProduct?.attributes?.ivaRate,
          prices: previewProduct?.prices,
          onSale: previewProduct?.onSale,
          discountPercentage: previewProduct?.discountPercentage,
        });
      }
    }, [previewProduct]);

    const formatPrice = (num: number | string): string => {
      const value = typeof num === 'string' ? parseFloat(num) : num;
      if (isNaN(value) || value === 0) return '0,00';
      return value.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const isService = previewProduct?.itemType === 'service' || previewProduct?.isService === true;

    const getTagCategories = () => {
      return isService ? SERVICE_TAG_CATEGORIES : PRODUCT_TAG_CATEGORIES;
    };

    const groupedTags = useMemo(() => {
      if (!previewProduct?.features) return {};
      
      const features = Array.isArray(previewProduct.features) 
        ? previewProduct.features 
        : (typeof previewProduct.features === 'string' ? JSON.parse(previewProduct.features) : []);
      
      if (!Array.isArray(features) || features.length === 0) return {};
      
      const categories = getTagCategories();
      const result: Record<string, string[]> = {};
      
      Object.keys(categories).forEach(key => {
        result[key] = [];
      });
      
      features.forEach((feature: string) => {
        for (const [key, cat] of Object.entries(categories)) {
          if (cat.tags.includes(feature)) {
            if (!result[key]) result[key] = [];
            result[key].push(feature);
            break;
          }
        }
      });
      
      return Object.fromEntries(
        Object.entries(result).filter(([_, tags]) => tags.length > 0)
      );
    }, [previewProduct]);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      setPreviewSelectedImageIndex(0);
      setQuantity(1);
      setSelectedColor('');
      setSelectedVariant('');
      setIsHovering(false);
    }, [previewProduct]);

    const allImages = useMemo(() => {
      if (!previewProduct) return [];
      const images = getAllImages(previewProduct);
      return Array.from(new Set(images)).slice(0, 10);
    }, [previewProduct]);

    const mainImage = useMemo(() => {
      return getFirstImage(previewProduct);
    }, [previewProduct]);

    if (!previewProduct || !mounted) return null;

    const currentImg = allImages[previewSelectedImageIndex] || allImages[0] || null;

    const productCode = previewProduct.itemId || previewProduct.sku || previewProduct.code || previewProduct.codigo || previewProduct.inventoryId || '';

    // 🔥 PRECIOS EN BOLÍVARES
    const priceVes = Number(previewProduct?.prices?.VES ?? previewProduct?.price ?? 0);
    let priceUsd = Number(previewProduct?.prices?.USD ?? 0);
    let priceEur = Number(previewProduct?.prices?.EUR ?? 0);
    const priceCrypto = Number(previewProduct?.prices?.CRYPTO ?? 0);

    // 🔥 IVA - OBTENER DEL PRODUCTO
    const ivaType = previewProduct?.ivaType || previewProduct?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(previewProduct?.ivaRate || previewProduct?.attributes?.ivaRate || 16);

    // 🔥 OFERTA/DESCUENTO
    const isOnSale = previewProduct?.onSale === true || previewProduct?.attributes?.onSale === true;
    let discountPercentage = Number(previewProduct?.discountPercentage || previewProduct?.attributes?.discountPercentage || 0);
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    const hasDiscount = isOnSale && discountPercentage > 0;

    // 🔥 CALCULAR IVA EN BOLÍVARES - CORREGIDO
    let basePriceVes = 0;
    let ivaAmountVes = 0;
    let priceWithIVAVes = 0;

    // 🔥 PRECIO ORIGINAL (SIN DESCUENTO) PARA EL CÁLCULO DEL IVA
    let originalPriceVes = priceVes;

    if (ivaType === 'excluded') {
      basePriceVes = originalPriceVes;
      ivaAmountVes = basePriceVes * (ivaRate / 100);
      priceWithIVAVes = basePriceVes + ivaAmountVes;
    } else if (ivaType === 'included') {
      priceWithIVAVes = originalPriceVes;
      basePriceVes = priceWithIVAVes / (1 + ivaRate / 100);
      ivaAmountVes = priceWithIVAVes - basePriceVes;
    } else {
      basePriceVes = originalPriceVes;
      ivaAmountVes = 0;
      priceWithIVAVes = basePriceVes;
    }

    // 🔥 APLICAR DESCUENTO AL PRECIO FINAL
    let discountedPriceWithIVAVes = priceWithIVAVes;
    let discountedBasePriceVes = basePriceVes;
    let savingVes = 0;

    if (hasDiscount) {
      discountedPriceWithIVAVes = priceWithIVAVes * (1 - discountPercentage / 100);
      discountedBasePriceVes = basePriceVes * (1 - discountPercentage / 100);
      savingVes = priceWithIVAVes - discountedPriceWithIVAVes;
    }

    // 🔥 CALCULAR USD Y EUR CON IVA - USANDO TASAS DEL CONTEXTO
    const rateUSD = rates.USD || 0;
    
    // Precios CON descuento en USD y EUR
    const priceWithIVAUsd = rateUSD > 0 ? discountedPriceWithIVAVes / rateUSD : 0;
    const priceWithIVAEur = (rateUSD > 0 && rates.EUR > 0) ? (discountedPriceWithIVAVes / rates.EUR) : 0;

    // Precios ORIGINALES (sin descuento) en USD y EUR para mostrar tachados
    const originalPriceUsd = rateUSD > 0 ? priceWithIVAVes / rateUSD : 0;
    const originalPriceEur = (rateUSD > 0 && rates.EUR > 0) ? (priceWithIVAVes / rates.EUR) : 0;

    // Si no hay USD pero hay VES, calcular USD con la tasa del contexto
    if (priceUsd === 0 && priceVes > 0 && rateUSD > 0) {
      priceUsd = Number((priceVes / rateUSD).toFixed(2));
    }

    if (priceEur === 0 && priceUsd > 0 && rates.EUR > 0 && rateUSD > 0) {
      priceEur = Number((priceUsd * (rateUSD / rates.EUR)).toFixed(2));
    }

    const stock = Number(previewProduct?.stock ?? previewProduct?.inventory ?? 999);
    const brand = previewProduct?.brand || previewProduct?.marca || '';
    const category = previewProduct?.category || previewProduct?.categoria || 'General';
    const warranty = previewProduct?.warranty || previewProduct?.garantia || '';
    const condition = previewProduct?.condition || previewProduct?.condicion || '';

    const model = previewProduct?.model || previewProduct?.modelo || '';
    const weight = previewProduct?.weight || previewProduct?.peso || previewProduct?.weightValue || '';
    const dimensions = previewProduct?.dimensions || previewProduct?.medidas || '';

    const colorsList = previewProduct?.colors || previewProduct?.colores || [];
    const variantsList = previewProduct?.variants || previewProduct?.variantes || [];

    const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
    const priceColors = getPriceColors({ primary, isDarkBg });
    const priceColor = priceColors.foreign;
    
    const textStyle = {
      color: isDarkBg ? '#e2e8f0' : '#1e293b',
    };

    const mutedTextStyle = {
      color: isDarkBg ? '#94a3b8' : '#475569',
    };

    const descriptionTextColor = isDarkBg ? '#e2e8f0' : '#1e293b';
    const descriptionOpacity = 0.9;

    const containerStyle = { 
      backgroundColor: secondary || (isDarkBg ? '#0f172a' : '#ffffff'), 
      borderColor: borderDynamic, 
      color: textStyle.color 
    };
    
    const dynamicSubCardStyle = {
      backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderColor: borderDynamic,
      color: textStyle.color
    };

    const tagStyle = {
      backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      borderColor: isDarkBg ? '#475569' : '#cbd5e1',
      color: isDarkBg ? '#e2e8f0' : '#1e293b',
    };

    let parsedAttributes: any = {};
    try {
      parsedAttributes = typeof previewProduct.atributos === 'string' 
        ? JSON.parse(previewProduct.atributos) 
        : (previewProduct.atributos || previewProduct.attributes || {});
    } catch (e) {
      parsedAttributes = {};
    }

    const handleAddToCartAction = () => {
      if (onAddToCart) {
        onAddToCart(previewProduct, quantity, { color: selectedColor, variant: selectedVariant });
      }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageContainerRef.current) return;
      const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setMousePos({ x, y });
    };

    const getIvaInfoVes = () => {
      return {
        ivaType,
        ivaRate,
        ivaAmount: Math.round(ivaAmountVes * 100) / 100,
        basePrice: Math.round(discountedBasePriceVes * 100) / 100,
        priceWithIVA: Math.round(discountedPriceWithIVAVes * 100) / 100,
        originalPrice: Math.round(priceWithIVAVes * 100) / 100,
        saving: Math.round(savingVes * 100) / 100,
        hasDiscount,
        discountPercentage,
        display: ivaType === 'included' ? `IVA Incluido (${ivaRate}%)` : 
                ivaType === 'exempt' ? 'Exento de IVA' : `IVA No Incluido (${ivaRate}%)`,
        displayShort: ivaType === 'included' ? 'IVA Inc.' : 
                      ivaType === 'exempt' ? 'Exento' : 'IVA +',
      };
    };

    const ivaInfoVes = getIvaInfoVes();

    console.log('✅ [ItemPreviewModal] IVA Info final:', ivaInfoVes);
    console.log('📡 [ItemPreviewModal] Tasa USD:', rateUSD);
    console.log('🏷️ [ItemPreviewModal] Descuento:', { hasDiscount, discountPercentage, savingVes });

    const modalContent = (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
        <div 
          className={`w-full max-w-5xl rounded-3xl border shadow-2xl flex flex-col my-auto max-h-[92vh] transition-all overflow-hidden`}
          style={containerStyle}
        >
          <div 
            className="px-6 py-4 border-b flex items-center justify-between shrink-0"
            style={{ borderColor: borderDynamic, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primary }}></span>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>
                  {isService ? 'Vista Previa del Servicio' : 'Vista Previa del Producto'}
                </span>
                <h3 className="text-sm sm:text-base font-bold" style={textStyle}>
                  {isService ? 'Detalle del Servicio' : 'Detalle del Producto'}
                </h3>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setPreviewProduct(null)} 
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95`}
              style={dynamicSubCardStyle}
            >
              ✕
            </button>
          </div>

          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              <div className="md:col-span-5 space-y-4">
                <div 
                  ref={imageContainerRef}
                  className="aspect-square rounded-3xl border overflow-hidden flex items-center justify-center relative group cursor-crosshair shadow-inner select-none"
                  style={dynamicSubCardStyle}
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  onClick={() => currentImg && setIsZoomedModalOpen(true)}
                >
  {/* 🔥 BADGE DE DESCUENTO - CON ESTILO MEJORADO (como el indicador pero con más presencia) */}
  {hasDiscount && (
    <div className="absolute top-3 right-3 z-10">
      <div 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-lg border"
        style={{
          backgroundColor: isDarkBg ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
          borderColor: isDarkBg ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.2)',
        }}
      >
        {/* SVG del fuego */}
        <svg 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-4 h-4"
          style={{ color: '#f97316' }}
        >
          <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
          <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
        </svg>
        
        {/* Porcentaje y OFF */}
        <span 
          className="text-xs font-black tracking-tight"
          style={{ color: isDarkBg ? '#ffffff' : '#1e293b' }}
        >
          -{discountPercentage}% OFF
        </span>
      </div>
    </div>
  )}

                  {currentImg ? (
                    <>
                      <img 
                        src={currentImg} 
                        alt={previewProduct.name || previewProduct.title || 'Imagen del producto'} 
                        className={`w-full h-full object-cover transition-opacity duration-200 ${isHovering ? 'opacity-0' : 'opacity-100'}`} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Error+Carga+Imagen';
                        }}
                      />

                      {isHovering && (
                        <div 
                          className="absolute inset-0 pointer-events-none bg-no-repeat z-10"
                          style={{
                            backgroundImage: `url(${currentImg})`,
                            backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
                            backgroundSize: '220%',
                          }}
                        />
                      )}

                      <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10 z-20 pointer-events-none opacity-80 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 7.5v6m3-3h-6" />
                        </svg>
                        Mueve el cursor para hacer zoom (Clic para abrir pantalla completa)
                      </div>
                    </>
                  ) : (
                    <span className="text-xs opacity-40 text-center px-4" style={textStyle}>
                      Sin imagen disponible
                    </span>
                  )}
                </div>

                {allImages.length > 1 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {allImages.map((imgUrl: string, idx: number) => {
                      const isSelected = idx === previewSelectedImageIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewSelectedImageIndex(idx)}
                          className={`w-16 h-16 rounded-2xl border overflow-hidden shrink-0 transition-all relative group cursor-pointer ${isSelected ? 'ring-2 shadow-md scale-105' : 'opacity-60 hover:opacity-100'}`}
                          style={{ borderColor: isSelected ? primary : borderDynamic }}
                        >
                          <img src={imgUrl} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="md:col-span-7 space-y-5">
                <div className="space-y-3">
  {/* 🔥 BADGES */}
  <div className="flex items-center gap-2 flex-wrap">
    <span className="px-3 py-1 rounded-xl text-[10px] font-bold border uppercase tracking-wider" style={{ ...dynamicSubCardStyle, ...textStyle }}>
      {category}
    </span>
    {brand && (
      <span className="px-3 py-1 rounded-xl text-[10px] font-extrabold text-white shadow-xs" style={{ backgroundColor: primary }}>
        {brand}
      </span>
    )}
    {condition && (
      <span className="px-3 py-1 rounded-xl text-[10px] font-medium border" style={{ borderColor: borderDynamic, color: textStyle.color }}>
        {condition}
      </span>
    )}
    {/* ❌ ELIMINADO: badge de SKU */}
    {warranty && (
      <span className="px-3 py-1 rounded-xl text-[10px] font-medium border text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
        Garantía: {warranty}
      </span>
    )}
    {/* 🔥 BADGE DE IVA */}
    {ivaType !== 'exempt' && (
      <span 
        className={`px-2 py-0.5 rounded-lg text-[9px] font-medium border ${
          ivaType === 'included' 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }`}
      >
        {ivaInfoVes.displayShort}
      </span>
    )}
    {ivaType === 'exempt' && (
      <span className="px-2 py-0.5 rounded-lg text-[9px] font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">
        Exento
      </span>
    )}
    {/* 🔥 INDICADOR DE DESCUENTO - SIN BADGE, ESTILO MINIMALISTA */}
    {hasDiscount && (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: textColor }}>
        <svg 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-3.5 h-3.5"
          style={{ color: '#f97316' }}
        >
          <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
          <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
        </svg>
        <span>-{discountPercentage}% OFF</span>
      </span>
    )}
    {/* 🔥 INDICADOR DE TASA DISPONIBLE */}
    {rateUSD === 0 && !ratesLoading && (
      <span className="px-2 py-0.5 rounded-lg text-[9px] font-medium border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        ⚠️ Sin tasa
      </span>
    )}
    {ratesLoading && (
      <span className="px-2 py-0.5 rounded-lg text-[9px] font-medium border bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">
        Cargando...
      </span>
    )}
  </div>

                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight break-words" style={textStyle}>
                    {previewProduct.name || previewProduct.title || 'Nombre del producto'}
                  </h1>
                  
                  {/* 🔥 PRECIO CON IVA - CON SOPORTE PARA DESCUENTOS */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-2 border-y" style={{ borderColor: borderDynamic }}>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>PRECIO FINAL</span>
                      <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                        {hasDiscount ? (
                          <>
                            {/* PRECIO TACHADO */}
                            <span className="text-sm line-through opacity-50" style={mutedTextStyle}>
                              Bs. {formatPrice(ivaInfoVes.originalPrice)}
                            </span>
                            {/* PRECIO CON DESCUENTO - USA primary (heredado) */}
                            <span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: primary }}>
                              Bs. {formatPrice(ivaInfoVes.priceWithIVA)}
                            </span>
                            <span className="text-xs font-medium opacity-70" style={mutedTextStyle}>
                              {ivaType === 'included' ? 'IVA Incluido' : ivaType === 'exempt' ? 'Exento' : `+ ${ivaRate}% IVA`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: primary }}>
                              Bs. {formatPrice(ivaInfoVes.priceWithIVA)}
                            </span>
                            <span className="text-xs font-medium opacity-70" style={mutedTextStyle}>
                              {ivaType === 'included' ? 'IVA Incluido' : ivaType === 'exempt' ? 'Exento' : `+ ${ivaRate}% IVA`}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold mt-1">
                        {rateUSD > 0 ? (
                          <>
                            <span className="font-black" style={{ color: priceColor }}>${formatPrice(priceWithIVAUsd)} USD</span>
                            <span className="opacity-40" style={mutedTextStyle}>/</span>
                            <span className="font-black" style={{ color: priceColor }}>€{formatPrice(priceWithIVAEur)} EUR</span>
                          </>
                        ) : (
                          <span className="text-yellow-500 text-[10px]">Tasa de cambio no disponible</span>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>Disponibilidad</span>
                      <span className="text-xs font-semibold mt-0.5 inline-block" style={textStyle}>
                        {stock > 0 ? `${stock} unidades disponibles` : 'Agotado'}
                      </span>
                    </div>
                  </div>

                  {/* 🔥 DESGLOSE DEL PRECIO EN BOLÍVARES - CON SOPORTE PARA DESCUENTOS */}
                  {(ivaType !== 'exempt' && ivaRate > 0 && priceVes > 0) || hasDiscount ? (
                    <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: borderDynamic }}>
                      <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>Desglose del precio</span>
                      <div className="flex flex-col gap-1 text-xs">
                        {/* Precio base */}
                        <div className="flex items-center justify-between">
                          <span style={mutedTextStyle}>Precio base:</span>
                          <span className="font-medium" style={textStyle}>
                            Bs. {formatPrice(ivaInfoVes.basePrice)}
                          </span>
                        </div>
                        
                        {/* IVA */}
                        {ivaType !== 'exempt' && ivaRate > 0 && (
                          <div className="flex items-center justify-between">
                            <span style={mutedTextStyle}>IVA ({ivaRate}%):</span>
                            <span className="font-medium" style={{ color: ivaType === 'included' ? priceColor : '#f59e0b' }}>
                              {ivaType === 'included' ? `Bs. ${formatPrice(ivaInfoVes.ivaAmount)} (incluido)` : `Bs. ${formatPrice(ivaInfoVes.ivaAmount)}`}
                            </span>
                          </div>
                        )}
                        
                        {/* Descuento */}
                        {hasDiscount && ivaInfoVes.saving > 0 && (
                          <div className="flex items-center justify-between text-emerald-500 font-medium">
                            <span>Descuento (-{discountPercentage}%):</span>
                            <span>- Bs. {formatPrice(ivaInfoVes.saving)}</span>
                          </div>
                        )}
                        
                        {/* Total */}
                        <div className="flex items-center justify-between font-bold pt-1 border-t" style={{ borderColor: borderDynamic }}>
                          <span style={textStyle}>Total con IVA:</span>
                          <span style={{ color: hasDiscount ? primary : primary }}>
                            Bs. {formatPrice(ivaInfoVes.priceWithIVA)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* 🔥 PRECIOS DE REFERENCIA CON IVA */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>Precios de referencia (con IVA)</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                        style={dynamicSubCardStyle}
                      >
                        <span className="text-[10px] uppercase font-bold" style={mutedTextStyle}>USD:</span>
                        <span className="font-black" style={{ color: priceColor }}>
                          {rateUSD > 0 ? `$${formatPrice(priceWithIVAUsd)}` : 'N/D'}
                        </span>
                      </div>
                      <div
                        className="px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                        style={dynamicSubCardStyle}
                      >
                        <span className="text-[10px] uppercase font-bold" style={mutedTextStyle}>EUR:</span>
                        <span className="font-black" style={{ color: priceColor }}>
                          {rateUSD > 0 && rates.EUR > 0 ? `€${formatPrice(priceWithIVAEur)}` : 'N/D'}
                        </span>
                      </div>
                      <div
                        className="px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                        style={dynamicSubCardStyle}
                      >
                        <span className="text-[10px] uppercase font-bold" style={mutedTextStyle}>USDT:</span>
                        <span className="font-black" style={{ color: priceColor }}>
                          {rateUSD > 0 ? `$${formatPrice(priceWithIVAUsd)}` : 'N/D'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 🔥 CARACTERÍSTICAS - TAGS */}
                  {Object.keys(groupedTags).length > 0 && (
                    <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
                      <span className="text-[10px] uppercase font-bold tracking-wider block" style={textStyle}>
                        {isService ? 'Características del Servicio' : 'Características del Producto'}
                      </span>
                      {Object.entries(groupedTags).map(([key, tags]) => {
                        const catConfig = getTagCategories()[key as keyof ReturnType<typeof getTagCategories>];
                        if (!catConfig) return null;
                        return (
                          <div key={key} className="space-y-1.5">
                            <span className="text-[10px] font-semibold block" style={textStyle}>
                              {catConfig.label}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag: string) => (
                                <span
                                  key={`${key}-${tag}`}
                                  className="px-2 py-0.5 rounded-lg text-[9px] font-medium border"
                                  style={tagStyle}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 🔥 ATRIBUTOS FÍSICOS */}
                  {(model || (weight && weight !== '0 kg' && weight !== '0') || dimensions) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                      {model && (
                        <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                          <span className="font-bold text-[8px] uppercase tracking-wider mb-0.5" style={mutedTextStyle}>Modelo</span> 
                          <span className="font-semibold text-xs truncate" style={textStyle}>{model}</span>
                        </div>
                      )}
                      {weight && weight !== '0 kg' && weight !== '0' && (
                        <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                          <span className="font-bold text-[8px] uppercase tracking-wider mb-0.5" style={mutedTextStyle}>Peso</span> 
                          <span className="font-semibold text-xs truncate" style={textStyle}>{weight}</span>
                        </div>
                      )}
                      {dimensions && (
                        <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                          <span className="font-bold text-[8px] uppercase tracking-wider mb-0.5" style={mutedTextStyle}>Medidas</span> 
                          <span className="font-semibold text-xs truncate" style={textStyle}>{dimensions}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 🔥 COLORES */}
                {!isService && Array.isArray(colorsList) && colorsList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>Color seleccionado: <strong style={{ color: primary }}>{selectedColor || 'Ninguno'}</strong></span>
                    <div className="flex flex-wrap gap-2">
                      {colorsList.map((col: string, cIdx: number) => {
                        const isSelected = selectedColor === col;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => setSelectedColor(col)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${isSelected ? 'ring-2 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                            style={{
                              borderColor: isSelected ? primary : borderDynamic,
                              backgroundColor: isSelected ? `${primary}20` : 'transparent',
                              color: textStyle.color
                            }}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🔥 VARIANTES */}
                {!isService && Array.isArray(variantsList) && variantsList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>Variante / Opción</span>
                    <div className="flex flex-wrap gap-2">
                      {variantsList.map((v: string, vIdx: number) => {
                        const isSelected = selectedVariant === v;
                        return (
                          <button
                            key={vIdx}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${isSelected ? 'ring-2 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                            style={{
                              borderColor: isSelected ? primary : borderDynamic,
                              backgroundColor: isSelected ? `${primary}20` : 'transparent',
                              color: textStyle.color
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🔥 DESCRIPCIÓN */}
                {previewProduct.description && (
                  <div className="space-y-2 pt-2 border-t" style={{ borderColor: borderDynamic }}>
                    <span className="text-[10px] uppercase font-bold tracking-wider block" style={mutedTextStyle}>Descripción detallada</span>
                    <p 
                      className="text-sm leading-relaxed whitespace-pre-line"
                      style={{ 
                        color: descriptionTextColor,
                        opacity: descriptionOpacity,
                        fontWeight: 400,
                        letterSpacing: 'normal'
                      }}
                    >
                      {previewProduct.description}
                    </p>
                  </div>
                )}

                {/* 🔥 BOTÓN DE CARRITO */}
                {onAddToCart && (
                  <div className="pt-5 border-t flex items-center gap-3 sm:gap-4" style={{ borderColor: borderDynamic }}>
                    <div className="flex items-center border rounded-2xl overflow-hidden shrink-0 shadow-xs" style={dynamicSubCardStyle}>
                      <button 
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3.5 py-3 text-xs font-bold hover:opacity-75 transition cursor-pointer"
                        style={textStyle}
                      >
                        -
                      </button>
                      <span className="px-3 py-3 text-xs font-black" style={textStyle}>{quantity}</span>
                      <button 
                        type="button"
                        onClick={() => setQuantity(stock > 0 && quantity >= stock ? quantity : quantity + 1)}
                        className="px-3.5 py-3 text-xs font-bold hover:opacity-75 transition cursor-pointer"
                        style={textStyle}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddToCartAction}
                      disabled={stock <= 0}
                      className="flex-1 py-3.5 px-5 rounded-2xl text-white text-xs font-bold shadow-lg transition-all cursor-pointer hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: primary }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                      </svg>
                      {stock > 0 ? `Añadir al carrito (Bs. ${formatPrice(ivaInfoVes.priceWithIVA * quantity)})` : 'Producto Agotado'}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {isZoomedModalOpen && currentImg && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in" onClick={() => setIsZoomedModalOpen(false)}>
            <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
              <button 
                type="button" 
                onClick={() => setIsZoomedModalOpen(false)} 
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
              >
                ✕
              </button>
              <img src={currentImg} alt="Zoom Imagen Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10" />
            </div>
          </div>
        )}
      </div>
    );

    return createPortal(modalContent, document.body);
  }