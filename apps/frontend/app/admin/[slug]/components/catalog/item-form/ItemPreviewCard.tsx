'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PRODUCT_TAG_CATEGORIES } from '@/app/constants/itemCategories';

interface ItemPreviewCardProps {
  newItem: any;
  setNewItem?: React.Dispatch<React.SetStateAction<any>>;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

// Helper para determinar la tonalidad de verde según el brillo del tema (textColor)
const getAdaptiveGreenColor = (textColorValue: string): string => {
  if (!textColorValue) return '#22c55e';

  const str = textColorValue.trim().toLowerCase();

  if (str.startsWith('#')) {
    let hex = str.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#4ade80' : '#15803d';
    }
  }

  if (str.startsWith('rgb')) {
    const matches = str.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const r = Number(matches[0]);
      const g = Number(matches[1]);
      const b = Number(matches[2]);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#4ade80' : '#15803d';
    }
  }

  if (['black', '000', 'slate-900', 'gray-900', 'neutral-900'].some(k => str.includes(k))) {
    return '#15803d';
  }

  return '#4ade80';
};

// 🔥 Helper para obtener color de nombre
const getColorFromName = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'Negro': '#18181b',
    'Blanco': '#f8fafc',
    'Gris': '#94a3b8',
    'Plata': '#94a3b8',
    'Rojo': '#ef4444',
    'Azul': '#3b82f6',
    'Verde': '#10b981',
    'Amarillo': '#f59e0b',
    'Rosa': '#ec4899',
    'Morado': '#8b5cf6',
    'Naranja': '#f97316',
    'Marrón': '#92400e',
    'Beige': '#f5e6d3',
    'Dorado': '#f59e0b',
    'Plateado': '#94a3b8',
    'Único de Fábrica': '#cbd5e1',
  };
  
  const lowerName = colorName.toLowerCase();
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return '#94a3b8';
};

export default function ItemPreviewCard({
  newItem = {},
  setNewItem,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: ItemPreviewCardProps) {
  const name = newItem?.name || 'Nombre del producto';
  const category = newItem?.category || 'Categoria';
  const brand = newItem?.brand || '';
  const condition = newItem?.condition || '';
  const weight = newItem?.weight || '';
  const dimensions = newItem?.dimensions || '';
  const warranty = newItem?.warranty || '';
  const model = newItem?.model || newItem?.attributes?.model || '';
  
  // 🔥 OBTENER COLORES DEL PRODUCTO (soporte para múltiples colores)
  const productColors: string[] = useMemo(() => {
    if (Array.isArray(newItem?.colors) && newItem.colors.length > 0) {
      return newItem.colors;
    }
    if (newItem?.color && typeof newItem.color === 'string' && newItem.color.trim()) {
      return [newItem.color];
    }
    return [];
  }, [newItem?.colors, newItem?.color]);
  
  // 🔥 PRECIOS BASE
  const priceVes = newItem?.prices?.VES !== undefined && newItem?.prices?.VES !== '' 
    ? Number(newItem.prices.VES) 
    : 0;
  const priceUsd = newItem?.prices?.USD !== undefined && newItem?.prices?.USD !== '' 
    ? Number(newItem.prices.USD) 
    : 0;
  const priceEur = newItem?.prices?.EUR !== undefined && newItem?.prices?.EUR !== '' 
    ? Number(newItem.prices.EUR) 
    : 0;
  const priceCrypto = newItem?.prices?.CRYPTO !== undefined && newItem?.prices?.CRYPTO !== '' 
    ? Number(newItem.prices.CRYPTO) 
    : 0;
  
  const stock = newItem?.stock ?? '0';

  // 🔥 DESCUENTO Y OFERTA
  const isOnSale = newItem?.onSale === true;
  const discountPercentage = Math.min(100, Math.max(0, Number(newItem?.discountPercentage || 0)));
  const hasDiscount = isOnSale && discountPercentage > 0;

  // 🔥 IVA - OBTENER DEL PRODUCTO
  const ivaType = newItem?.ivaType || newItem?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(newItem?.ivaRate || newItem?.attributes?.ivaRate || 16);

  // 🔥 CALCULAR PRECIOS CON DESCUENTO (BASE)
  const basePriceVes = priceVes;
  const basePriceUsd = priceUsd;
  
  // Precio con descuento aplicado (sin IVA aún)
  const discountedPriceVes = hasDiscount ? basePriceVes * (1 - discountPercentage / 100) : basePriceVes;
  const discountedPriceUsd = hasDiscount ? basePriceUsd * (1 - discountPercentage / 100) : basePriceUsd;

  // 🔥 CALCULAR IVA SOBRE EL PRECIO CON DESCUENTO
  let ivaAmountVes = 0;
  let priceWithIVAVes = discountedPriceVes;
  let ivaAmountUsd = 0;
  let priceWithIVAUsd = discountedPriceUsd;

  if (ivaType === 'excluded') {
    ivaAmountVes = discountedPriceVes * (ivaRate / 100);
    priceWithIVAVes = discountedPriceVes + ivaAmountVes;
    ivaAmountUsd = discountedPriceUsd * (ivaRate / 100);
    priceWithIVAUsd = discountedPriceUsd + ivaAmountUsd;
  } else if (ivaType === 'included') {
    ivaAmountVes = discountedPriceVes - (discountedPriceVes / (1 + ivaRate / 100));
    priceWithIVAVes = discountedPriceVes;
    ivaAmountUsd = discountedPriceUsd - (discountedPriceUsd / (1 + ivaRate / 100));
    priceWithIVAUsd = discountedPriceUsd;
  } else {
    // 🔥 EXENTO - sin IVA
    ivaAmountVes = 0;
    priceWithIVAVes = discountedPriceVes;
    ivaAmountUsd = 0;
    priceWithIVAUsd = discountedPriceUsd;
  }

  // 🔥 CALCULAR EUR CON IVA
  const rateUSD = 784.66;
  const priceWithIVAEur = priceWithIVAUsd / 1.1674;

  // 🔥 FUNCIÓN PARA FORMATEAR PRECIOS
  const formatPrice = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 🔥 INFORMACIÓN DE IVA PARA MOSTRAR
  const ivaInfo = {
    ivaType,
    ivaRate,
    ivaAmount: Math.round(ivaAmountVes * 100) / 100,
    basePrice: Math.round(basePriceVes * 100) / 100,
    priceWithIVA: Math.round(priceWithIVAVes * 100) / 100,
    display: ivaType === 'included' ? `IVA Incluido (${ivaRate}%)` : 
             ivaType === 'exempt' ? 'Exento de IVA' : `IVA No Incluido (${ivaRate}%)`,
    displayShort: ivaType === 'included' ? 'IVA Inc.' : 
                  ivaType === 'exempt' ? 'Exento' : 'IVA +',
  };

  const adaptiveGreen = getAdaptiveGreenColor(textColor);

  // 🔥 CORREGIDO: OBTENER IMÁGENES SIN DUPLICADOS
  const validImages: string[] = useMemo(() => {
    const allImages: string[] = [];

    // 1. 🔥 PRIORIDAD 1: existingImages (URLs del servidor y blobs)
    if (Array.isArray(newItem?.existingImages)) {
      newItem.existingImages.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) {
          allImages.push(img);
        }
      });
    }

    // 2. 🔥 PRIORIDAD 2: mediaUrls (URLs del servidor)
    if (Array.isArray(newItem?.mediaUrls)) {
      newItem.mediaUrls.forEach((url: any) => {
        if (typeof url === 'string' && url.trim()) {
          if (!allImages.includes(url)) {
            allImages.push(url);
          }
        }
      });
    }

    // 3. 🔥 PRIORIDAD 3: images (fallback)
    if (Array.isArray(newItem?.images)) {
      newItem.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) {
          if (!allImages.includes(img)) {
            allImages.push(img);
          }
        } else if (img?.url && typeof img.url === 'string') {
          if (!allImages.includes(img.url)) {
            allImages.push(img.url);
          }
        }
      });
    }

    // 4. 🔥 PRIORIDAD 4: files SOLO si no hay existingImages o mediaUrls
    if (allImages.length === 0 && Array.isArray(newItem?.files)) {
      newItem.files.forEach((f: any) => {
        if (f instanceof File) {
          const url = URL.createObjectURL(f);
          allImages.push(url);
        } else if (f?.url && typeof f.url === 'string') {
          if (!allImages.includes(f.url)) {
            allImages.push(f.url);
          }
        } else if (typeof f === 'string') {
          if (!allImages.includes(f)) {
            allImages.push(f);
          }
        }
      });
    }

    // 5. 🔥 CoverImage (si existe y no está en la lista)
    if (newItem?.coverImage && typeof newItem.coverImage === 'string' && newItem.coverImage.trim()) {
      const coverExists = allImages.some(img => img === newItem.coverImage);
      if (!coverExists) {
        allImages.unshift(newItem.coverImage);
      }
    }

    // 🔥 ELIMINAR DUPLICADOS usando Set y filtrar valores vacíos
    const uniqueImages = Array.from(new Set(allImages.filter(Boolean)));

    // Limitar a 7 imágenes
    return uniqueImages.slice(0, 7);
  }, [newItem?.existingImages, newItem?.mediaUrls, newItem?.images, newItem?.files, newItem?.coverImage]);

  const [selectedImage, setSelectedImage] = useState<string>('');

  // 🔥 Actualizar imagen seleccionada cuando cambian las imágenes
  useEffect(() => {
    if (validImages.length === 0) {
      setSelectedImage('');
      return;
    }

    if (newItem?.coverImage && typeof newItem.coverImage === 'string' && validImages.includes(newItem.coverImage)) {
      setSelectedImage(newItem.coverImage);
      return;
    }

    if (selectedImage && validImages.includes(selectedImage)) {
      return;
    }

    setSelectedImage(validImages[0]);
  }, [validImages, newItem?.coverImage]);

  // 🔥 AGRUPAR TAGS POR CATEGORÍA
  const groupedTags = useMemo(() => {
    if (!newItem?.features) return {};
    
    const features = Array.isArray(newItem.features) 
      ? newItem.features 
      : (typeof newItem.features === 'string' ? JSON.parse(newItem.features) : []);
    
    if (!Array.isArray(features) || features.length === 0) return {};
    
    const categories = PRODUCT_TAG_CATEGORIES;
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
  }, [newItem?.features]);

  const [modalImg, setModalImg] = useState<string | null>(null);
  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  const priceColor = primary;
  const greenPriceColor = getAdaptiveGreenColor(textColor);

  // 🔥 Obtener color del badge de IVA según el tipo
  const getIvaBadgeStyles = () => {
    if (ivaType === 'included') {
      return {
        bg: isDarkBg ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.4)',
        text: isDarkBg ? '#34d399' : '#065f46',
        label: 'IVA Inc.'
      };
    } else if (ivaType === 'exempt') {
      return {
        bg: isDarkBg ? 'rgba(100, 116, 139, 0.25)' : 'rgba(100, 116, 139, 0.15)',
        border: 'rgba(100, 116, 139, 0.4)',
        text: isDarkBg ? '#94a3b8' : '#475569',
        label: 'Exento'
      };
    } else {
      return {
        bg: isDarkBg ? 'rgba(251, 191, 36, 0.25)' : 'rgba(251, 191, 36, 0.15)',
        border: 'rgba(251, 191, 36, 0.4)',
        text: isDarkBg ? '#fbbf24' : '#92400e',
        label: 'IVA +'
      };
    }
  };

  const ivaBadge = getIvaBadgeStyles();

  return (
    <div className="space-y-4" style={{ color: textColor }}>
      <div className="flex items-center justify-between">
        <span 
          className="text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-full border shadow-sm"
          style={{ 
            backgroundColor: `${primary}15`, 
            color: primary, 
            borderColor: `${primary}30` 
          }}
        >
          Vista Previa en Vivo (Producto)
        </span>
        <span className="text-[10px] opacity-75">
          Asi lo vera tu cliente
        </span>
      </div>

      <div 
        className="border rounded-3xl p-5 space-y-4 shadow-2xl transition-all relative overflow-hidden backdrop-blur-md"
        style={{
          backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
          borderColor: borderDynamic,
          color: textColor
        }}
      >
        {/* IMAGEN PRINCIPAL */}
        <div className="space-y-2.5">
          <div 
            className="w-full h-40 rounded-2xl bg-black/30 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer group"
            onClick={() => selectedImage && setModalImg(selectedImage)}
          >
            {selectedImage ? (
              <>
                <img 
                  src={selectedImage} 
                  alt={name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full flex items-center justify-center';
                      fallback.innerHTML = `<span className="text-[10px] opacity-40">📷</span>`;
                      parent.appendChild(fallback);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md">
                    Zoom
                  </span>
                </div>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <span className="text-[10px] opacity-40 mt-1">Sin imagen cargada</span>
              </>
            )}

            <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap z-10 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10">
                {category}
              </span>
              {brand && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-md" style={{ backgroundColor: primary }}>
                  {brand}
                </span>
              )}
              {condition && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/40 backdrop-blur-md text-white border border-white/10">
                  {condition}
                </span>
              )}
              {/* 🔥 BADGE DE IVA */}
              <span 
                className="px-2 py-0.5 rounded-md text-[9px] font-bold border"
                style={{
                  backgroundColor: ivaBadge.bg,
                  borderColor: ivaBadge.border,
                  color: ivaBadge.text
                }}
              >
                {ivaBadge.label}
              </span>
            </div>

            {/* 🔥 BADGE DE DESCUENTO EN LA ESQUINA SUPERIOR DERECHA */}
            {hasDiscount && (
              <div className="absolute top-3 right-3 z-10 pointer-events-none">
                <span 
                  className="px-2.5 py-1 rounded-md text-[11px] font-extrabold shadow-lg"
                  style={{
                    backgroundColor: isDarkBg ? '#ef4444' : '#dc2626',
                    color: '#ffffff',
                  }}
                >
                  -{discountPercentage}%
                </span>
              </div>
            )}
          </div>

          {/* GALERIA DE MINIATURAS */}
          {validImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
              {validImages.map((img, idx) => (
                <div key={`${img}-${idx}`} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-12 h-12 rounded-xl border-2 overflow-hidden transition-all duration-300 block ${
                      selectedImage === img
                        ? 'border-current scale-105 shadow-md opacity-100'
                        : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ color: selectedImage === img ? primary : 'transparent' }}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx}`} 
                      className="w-full h-full object-cover pointer-events-none"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span className="text-[8px] opacity-40">📷</span>`;
                        }
                      }}
                    />
                  </button>
                  {idx === 0 && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-extrabold px-1 rounded bg-black/80 text-white tracking-tighter uppercase whitespace-nowrap border border-white/20">
                      Portada
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NOMBRE Y DESCRIPCION */}
        <div className="space-y-1.5">
          <h4 className="text-base font-black tracking-tight truncate">
            {name}
          </h4>
          <p className="text-xs opacity-75 line-clamp-2">
            {newItem?.description || 'Aqui aparecera la descripcion detallada del producto...'}
          </p>
        </div>



        {/* 🔥 PRECIO CON IVA Y DESCUENTO */}
        <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: borderDynamic }}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Precio Final</span>
              <div className="flex items-baseline gap-1.5">
                {/* 🔥 PRECIO EN BOLÍVARES - COLOR PRIMARY */}
                <span className="text-lg font-black" style={{ color: priceColor }}>
                  Bs. {formatPrice(priceWithIVAVes)}
                </span>
                {/* 🔥 PRECIO EN USD - COLOR VERDE */}
                <span className="text-xs font-semibold opacity-75" style={{ color: greenPriceColor }}>
                  (${formatPrice(priceWithIVAUsd)})
                </span>
              </div>
              {/* 🔥 MOSTRAR DESCUENTO APLICADO */}
              {hasDiscount && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] opacity-50 line-through" style={{ color: textColor }}>
                    Bs. {formatPrice(basePriceVes + (ivaType === 'excluded' ? basePriceVes * (ivaRate / 100) : 0))}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    -{discountPercentage}%
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Disponibilidad</span>
              <span 
                className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                style={{ 
                  borderColor: borderDynamic,
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                }}
              >
                {stock} en stock
              </span>
            </div>
          </div>

          {/* 🔥 DESGLOSE DEL IVA - CORREGIDO PARA EXENTO */}
          {ivaType !== 'exempt' && ivaRate > 0 && priceVes > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] pt-1 border-t" style={{ borderColor: borderDynamic }}>
              <span className="opacity-50">Base:</span>
              {/* 🔥 PRECIO BASE - COLOR BLANCO */}
              <span className="font-medium" style={{ color: textColor }}>Bs. {formatPrice(basePriceVes)}</span>
              <span className="opacity-30">+</span>
              <span className="opacity-50">IVA ({ivaRate}%):</span>
              {/* 🔥 IVA - COLOR BLANCO */}
              <span className="font-medium" style={{ color: textColor }}>
                Bs. {formatPrice(ivaAmountVes)}
              </span>
              <span className="opacity-30">=</span>
              {/* 🔥 TOTAL - COLOR PRIMARY */}
              <span className="font-bold" style={{ color: priceColor }}>
                Bs. {formatPrice(priceWithIVAVes)}
              </span>
              <span className="text-[8px] opacity-40 ml-1">
                {ivaType === 'included' ? '(IVA incluido)' : '(IVA no incluido)'}
              </span>
            </div>
          )}

          {/* 🔥 PARA EXENTO - Mostrar mensaje diferente */}
          {ivaType === 'exempt' && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] pt-1 border-t" style={{ borderColor: borderDynamic }}>
              <span className="opacity-50">Precio:</span>
              {/* 🔥 TOTAL - COLOR PRIMARY */}
              <span className="font-bold" style={{ color: priceColor }}>Bs. {formatPrice(priceWithIVAVes)}</span>
              <span className="text-[8px] opacity-40 ml-1">(Exento de IVA)</span>
            </div>
          )}

          {/* 🔥 PRECIOS EN OTRAS MONEDAS CON IVA - VERDE */}
          {priceWithIVAUsd > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] pt-1 border-t" style={{ borderColor: borderDynamic }}>
              <span className="opacity-50">Referencia:</span>
              <span className="font-medium" style={{ color: greenPriceColor }}>${formatPrice(priceWithIVAUsd)} USD</span>
              <span className="opacity-30">|</span>
              <span className="font-medium" style={{ color: greenPriceColor }}>€{formatPrice(priceWithIVAEur)} EUR</span>
            </div>
          )}
        </div>

        {/* TAGS / CARACTERÍSTICAS */}
        {Object.keys(groupedTags).length > 0 && (
          <div className="pt-3 border-t space-y-3" style={{ borderColor: borderDynamic }}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">
              Características del Producto
            </span>
            {Object.entries(groupedTags).map(([key, tags]) => {
              const catConfig = PRODUCT_TAG_CATEGORIES[key as keyof typeof PRODUCT_TAG_CATEGORIES];
              if (!catConfig) return null;
              return (
                <div key={key} className="space-y-1">
                  <span className="text-[9px] font-medium opacity-50 block" style={{ color: textColor }}>
                    {catConfig.label}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag: string) => (
                      <span
                        key={`${key}-${tag}`}
                        className="px-2 py-0.5 rounded-lg text-[9px] font-medium border"
                        style={{
                          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          borderColor: borderDynamic,
                          color: textColor,
                          opacity: 0.85
                        }}
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

        {/* ATRIBUTOS ADICIONALES */}
        {(weight || dimensions || warranty || model || productColors.length > 0) && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: borderDynamic }}>
            {model && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Modelo:</span>
                <span className="text-xs font-medium">{model}</span>
              </div>
            )}
            {productColors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Colores:</span>
                <div className="flex gap-1">
                  {productColors.slice(0, 3).map((color, idx) => {
                    const isGradient = color.includes('linear-gradient');
                    const bgColor = isGradient 
                      ? color 
                      : (color.startsWith('#') ? color : getColorFromName(color));
                    return (
                      <span 
                        key={idx}
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ background: bgColor }}
                        title={color}
                      />
                    );
                  })}
                  {productColors.length > 3 && (
                    <span className="text-[9px] font-medium opacity-60 ml-0.5">
                      +{productColors.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
            {weight && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Peso:</span>
                <span className="text-xs font-medium">{weight}</span>
              </div>
            )}
            {dimensions && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Talla:</span>
                <span className="text-xs font-medium">{dimensions}</span>
              </div>
            )}
            {warranty && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Garantía:</span>
                <span className="text-xs font-medium">{warranty}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE ZOOM */}
      {modalImg && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setModalImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setModalImg(null)}
              className="absolute -top-10 right-0 text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cerrar
            </button>
            <img 
              src={modalImg} 
              alt="Zoom Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'flex items-center justify-center w-full h-full text-white/40 text-sm';
                  fallback.textContent = '📷 Imagen no disponible';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}