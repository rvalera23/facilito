'use client';

import React, { useMemo, useState, useEffect } from 'react';

interface DiscountSectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  textColor: string;
  primary: string;
  isDarkBg: boolean;
  style?: React.CSSProperties;
  isService?: boolean;
}

// 🔥 ICONOS SVG
const FireIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 6v12a1.5 1.5 0 001.5 1.5z" />
  </svg>
);

// 🔥 SVG DE FUEGO RELLENO (para badges minimalistas)
const FireFillIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="w-4 h-4 shrink-0"
    style={{ color: '#f97316' }}
  >
    <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
    <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
  </svg>
);

// 🔥 SVG DE RAYO RELLENO (para badges minimalistas)
const BoltFillIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="w-4 h-4 shrink-0"
    style={{ color: '#fbbf24' }}
  >
    <path d="M11.983 1.907a.75.75 0 01.742.743l.015 7.5h6.75a.75.75 0 01.507 1.307l-10.5 9.75a.75.75 0 01-1.244-.69l.015-7.5H2.517a.75.75 0 01-.507-1.307l10.5-9.75a.75.75 0 01.473-.153z" />
  </svg>
);

export default function DiscountSection({
  newItem = {},
  setNewItem,
  textColor,
  primary,
  isDarkBg,
  style,
  isService = false,
}: DiscountSectionProps) {
  const [showDateRange, setShowDateRange] = useState(false);

  // 🔍 Debug - monitorear cambios en newItem
  useEffect(() => {
    console.log('🔍 [DiscountSection] newItem actualizado:', {
      onSale: newItem?.onSale,
      discountPercentage: newItem?.discountPercentage,
      hasDiscount: newItem?.onSale === true && (newItem?.discountPercentage || 0) > 0,
    });
  }, [newItem]);

  // 🔥 hasDiscount = onSale activo Y descuento > 0
  const hasDiscount = newItem?.onSale === true && (newItem?.discountPercentage || 0) > 0;
  
  // 🔥 isOnSale = solo el toggle está activo (muestra el campo de descuento)
  const isOnSale = newItem?.onSale === true;
  
  const discountPercentage = Math.min(100, Math.max(0, Number(newItem?.discountPercentage || 0)));
  
  // Calcular precios con descuento (solo para vista previa)
  const previewPrices = useMemo(() => {
    const vesPrice = Number(newItem?.prices?.VES || 0);
    const usdPrice = Number(newItem?.prices?.USD || 0);
    
    if (!hasDiscount || vesPrice === 0) {
      return { discountedVES: 0, discountedUSD: 0, savingVES: 0, savingUSD: 0 };
    }
    
    const discountedVES = vesPrice * (1 - discountPercentage / 100);
    const discountedUSD = usdPrice * (1 - discountPercentage / 100);
    const savingVES = vesPrice - discountedVES;
    const savingUSD = usdPrice - discountedUSD;
    
    return {
      discountedVES: Math.round(discountedVES * 100) / 100,
      discountedUSD: Math.round(discountedUSD * 100) / 100,
      savingVES: Math.round(savingVES * 100) / 100,
      savingUSD: Math.round(savingUSD * 100) / 100,
    };
  }, [newItem?.prices?.VES, newItem?.prices?.USD, hasDiscount, discountPercentage]);

  // Calcular IVA sobre el precio con descuento (solo vista previa)
  // ⚠️ NO aplica a servicios (no tienen IVA)
  const ivaPreview = useMemo(() => {
    if (isService) return null;
    if (!hasDiscount || previewPrices.discountedVES === 0) return null;
    
    const ivaType = newItem?.ivaType || 'excluded';
    const ivaRate = Number(newItem?.ivaRate || 16);
    
    let ivaAmountVES = 0;
    let priceWithIVAVES = previewPrices.discountedVES;
    let ivaAmountUSD = 0;
    let priceWithIVAUSD = previewPrices.discountedUSD;
    
    if (ivaType === 'excluded') {
      ivaAmountVES = previewPrices.discountedVES * (ivaRate / 100);
      priceWithIVAVES = previewPrices.discountedVES + ivaAmountVES;
      ivaAmountUSD = previewPrices.discountedUSD * (ivaRate / 100);
      priceWithIVAUSD = previewPrices.discountedUSD + ivaAmountUSD;
    } else if (ivaType === 'included') {
      ivaAmountVES = previewPrices.discountedVES - (previewPrices.discountedVES / (1 + ivaRate / 100));
      priceWithIVAVES = previewPrices.discountedVES;
      ivaAmountUSD = previewPrices.discountedUSD - (previewPrices.discountedUSD / (1 + ivaRate / 100));
      priceWithIVAUSD = previewPrices.discountedUSD;
    }
    
    return {
      ivaAmountVES: Math.round(ivaAmountVES * 100) / 100,
      ivaAmountUSD: Math.round(ivaAmountUSD * 100) / 100,
      priceWithIVAVES: Math.round(priceWithIVAVES * 100) / 100,
      priceWithIVAUSD: Math.round(priceWithIVAUSD * 100) / 100,
      ivaType,
      ivaRate,
    };
  }, [hasDiscount, previewPrices, newItem?.ivaType, newItem?.ivaRate, isService]);

  const inputBorderColor = style?.borderColor || (isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)');
  const subtleBorderColor = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // 🔥 COLORES DINÁMICOS
  const vesPriceColor = isDarkBg ? '#4ade80' : '#15803d';
  const usdReferenceColor = isDarkBg ? '#86efac' : '#166534';
  
  // 🔥 COLOR DEL TOGGLE DESHABILITADO
  const toggleDisabledColor = isDarkBg ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.5)';
  const toggleEnabledColor = primary;
  
  // 🔥 FUNCIÓN PARA FORMATEAR NÚMEROS CON SEPARADOR DE MILES
  const formatNumber = (num: number) => {
    if (isNaN(num) || num === 0) return '0.00';
    // Redondear a 2 decimales
    const rounded = Math.round(num * 100) / 100;
    // Separar parte entera y decimal
    const parts = rounded.toFixed(2).split('.');
    // Formatear parte entera con separador de miles (punto)
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    // Unir con la parte decimal
    return integerPart + ',' + parts[1];
  };

  // Formatear número (versión simplificada para compatibilidad)
  const formatNum = (num: number) => {
    return formatNumber(num);
  };

  // 🔥 MANEJAR TOGGLE
  const handleToggleOffer = () => {
    setNewItem((prev: any) => {
      const currentOnSale = prev?.onSale === true;
      const newState = !currentOnSale;
      
      return {
        ...prev,
        onSale: newState,
        discountPercentage: newState ? (prev?.discountPercentage || 0) : 0,
      };
    });
  };

  // 🔥 MANEJAR CAMBIO DE DESCUENTO
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numValue = Number(rawValue);
    const val = Math.min(100, Math.max(0, isNaN(numValue) ? 0 : numValue));
    
    setNewItem((prev: any) => ({
      ...prev,
      discountPercentage: val,
    }));
  };

  // 🔥 Renderizar badge minimalista según el estado
  const renderStatusBadge = () => {
    if (hasDiscount) {
      return (
        <span 
          className="inline-flex items-center gap-1 font-semibold"
          style={{ 
            color: textColor,
            fontSize: '11px'
          }}
        >
          <FireFillIcon />
          {discountPercentage}% OFF
        </span>
      );
    }
    if (isOnSale) {
      return (
        <span 
          className="inline-flex items-center gap-1 font-semibold"
          style={{ 
            color: textColor,
            fontSize: '11px',
            opacity: 0.6
          }}
        >
        
          Sin descuento
        </span>
      );
    }
    return (
      <span 
        className="inline-flex items-center gap-1 font-medium"
        style={{ 
          color: textColor,
          fontSize: '11px',
          opacity: 0.4
        }}
      >
        Sin oferta
      </span>
    );
  };

  return (
    <div className="space-y-3 pt-3 border-t" style={{ borderColor: inputBorderColor }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon />
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Oferta / Descuento
          </label>
        </div>
        {/* 🔥 BADGE MINIMALISTA - IGUAL QUE EN LA TABLA */}
        {renderStatusBadge()}
      </div>

      {/* Toggle de Oferta */}
      <div className="flex items-center gap-4 p-3 rounded-xl border bg-transparent" style={{ borderColor: inputBorderColor }}>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-medium" style={{ color: textColor }}>Activar Oferta</span>
          <button
            type="button"
            onClick={handleToggleOffer}
            className="relative w-12 h-6 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: isOnSale ? toggleEnabledColor : toggleDisabledColor,
            }}
          >
            <span 
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-md ${
                isOnSale ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        
        {/* 🔥 EL CAMPO DE DESCUENTO APARECE SIEMPRE QUE EL TOGGLE ESTÁ ACTIVO */}
        {isOnSale && (
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60" style={{ color: textColor }}>Descuento:</span>
            <div className="relative flex items-center w-24">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="0"
                value={discountPercentage}
                onChange={handleDiscountChange}
                className="w-full border rounded-xl px-3 py-2 text-xs outline-none bg-transparent pr-6"
                style={{ borderColor: inputBorderColor, color: textColor }}
              />
              <span className="absolute right-2 text-xs font-bold" style={{ color: textColor }}>%</span>
            </div>
          </div>
        )}
      </div>

      {/* Fechas de la oferta (opcional) */}
      {isOnSale && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDateRange(!showDateRange)}
            className="text-[10px] opacity-60 hover:opacity-100 transition flex items-center gap-1.5"
            style={{ color: textColor }}
          >
            <CalendarIcon />
            {showDateRange ? 'Ocultar fechas' : 'Programar fechas de oferta'}
            {showDateRange ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>

          {showDateRange && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border bg-transparent" style={{ borderColor: inputBorderColor }}>
              <div className="space-y-1">
                <label className="text-[9px] opacity-60 block" style={{ color: textColor }}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={newItem?.discountStartDate?.split('T')[0] || ''}
                  onChange={(e) => {
                    setNewItem((prev: any) => ({
                      ...prev,
                      discountStartDate: e.target.value || null,
                    }));
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs outline-none bg-transparent"
                  style={{ borderColor: inputBorderColor, color: textColor }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] opacity-60 block" style={{ color: textColor }}>
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={newItem?.discountEndDate?.split('T')[0] || ''}
                  onChange={(e) => {
                    setNewItem((prev: any) => ({
                      ...prev,
                      discountEndDate: e.target.value || null,
                    }));
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs outline-none bg-transparent"
                  style={{ borderColor: inputBorderColor, color: textColor }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista previa del precio con descuento - SOLO cuando hay descuento > 0 */}
      {hasDiscount && newItem?.prices?.VES > 0 && (
        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: inputBorderColor }}>
          {/* Título */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5" style={{ color: textColor }}>
              <FireIcon />
              Vista previa del precio con descuento
            </span>
            {/* 🔥 BADGE MINIMALISTA */}
            <span 
              className="inline-flex items-center gap-1 font-semibold"
              style={{ 
                color: textColor,
                fontSize: '11px'
              }}
            >
              <FireFillIcon />
              {discountPercentage}% OFF
            </span>
          </div>

          {/* Precio original vs con descuento */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-60" style={{ color: textColor }}>Precio original:</span>
              <span className="line-through opacity-50" style={{ color: textColor }}>
                Bs. {formatNum(newItem.prices.VES)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs font-bold">
              <span style={{ color: textColor }}>Precio con descuento:</span>
              <span style={{ color: primary }}>
                Bs. {formatNum(previewPrices.discountedVES)}
              </span>
            </div>

            {newItem?.prices?.USD > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-60" style={{ color: textColor }}>En USD:</span>
                <span className="font-medium" style={{ color: vesPriceColor }}>
                  ${formatNum(previewPrices.discountedUSD)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: inputBorderColor }}>
              <span className="opacity-60 flex items-center gap-1" style={{ color: textColor }}>
                <SaveIcon />
                Ahorro:
              </span>
              <span className="font-bold" style={{ color: primary }}>
                Bs. {formatNum(previewPrices.savingVES)} 
                {newItem?.prices?.USD > 0 && ` ($${formatNum(previewPrices.savingUSD)})`}
              </span>
            </div>
          </div>

          {/* 🔥 DESGLOSE CON IVA (solo para productos, NO para servicios) */}
          {!isService && ivaPreview && ivaPreview.ivaRate > 0 && (
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: inputBorderColor }}>
              <div className="flex items-center justify-between text-[10px] opacity-60" style={{ color: textColor }}>
                <span>IVA ({ivaPreview.ivaRate}%) aplicado al precio con descuento:</span>
                <span className="font-medium" style={{ 
                  color: ivaPreview.ivaType === 'included' ? vesPriceColor : usdReferenceColor
                }}>
                  Bs. {formatNum(ivaPreview.ivaAmountVES)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: inputBorderColor }}>
                <span style={{ color: textColor }}>Precio final (con IVA):</span>
                <span style={{ color: primary }}>
                  Bs. {formatNum(ivaPreview.priceWithIVAVES)}
                </span>
              </div>
              {ivaPreview.ivaAmountUSD > 0 && (
                <div className="flex items-center justify-between text-[10px] opacity-60" style={{ color: textColor }}>
                  <span>IVA en USD:</span>
                  <span className="font-medium" style={{ color: vesPriceColor }}>
                    ${formatNum(ivaPreview.ivaAmountUSD)}
                  </span>
                </div>
              )}
              {ivaPreview.priceWithIVAUSD > 0 && (
                <div className="flex items-center justify-between text-[10px] opacity-60" style={{ color: textColor }}>
                  <span>Total en USD:</span>
                  <span className="font-medium" style={{ color: vesPriceColor }}>
                    ${formatNum(ivaPreview.priceWithIVAUSD)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 🔥 BADGE DE DESCUENTO MINIMALISTA */}
          {discountPercentage > 0 && (
            <div className="flex items-center justify-center pt-1">
              <span 
                className="inline-flex items-center gap-1 font-semibold"
                style={{ 
                  color: textColor,
                  fontSize: '11px'
                }}
              >
                <FireFillIcon />
                {discountPercentage}% OFF
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mensaje cuando no hay precio */}
      {isOnSale && !newItem?.prices?.VES && (
        <div 
          className="p-3 rounded-xl border flex items-center gap-2"
          style={{
            borderColor: isDarkBg ? 'rgba(251,191,36,0.3)' : 'rgba(245,158,11,0.25)',
            backgroundColor: isDarkBg ? 'rgba(251,191,36,0.08)' : 'rgba(245,158,11,0.04)',
          }}
        >
          <BoltIcon />
          <span className="text-xs" style={{ color: isDarkBg ? '#fbbf24' : '#92400e' }}>
            Ingresa un precio en la sección de precios para ver el descuento aplicado.
          </span>
        </div>
      )}
    </div>
  );
}  