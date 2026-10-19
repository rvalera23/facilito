'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { NICHE_CATEGORIES_MAP, PRESET_CATEGORIES } from '@/app/constants/nicheData';
import { useToast } from '@/components/ui/useToast';

interface BasicInfoSectionProps {
  newItem: any;
  setNewItem: React.Dispatch<React.SetStateAction<any>>;
  textColor: string;
  inputBgClass: string;
  primary: string;
  currencies?: string[];
  style?: React.CSSProperties;
  editingId?: string | null;
  tenantConfig?: any;
  isDarkBg?: boolean;
  secondary?: string;
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

// Capitaliza texto
const formatFriendlyText = (text: string) => {
  if (!text) return 'General';
  return text
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      const lowerWords = ['en', 'de', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'por', 'para', 'con', 'sin'];
      if (lowerWords.includes(word.toLowerCase()) && word.length <= 3) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Iconos
const SearchIcon = ({ color }: { color: string }) => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronIcon = ({ color, open }: { color: string; open: boolean }) => (
  <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function BasicInfoSection({
  newItem = {},
  setNewItem,
  textColor,
  inputBgClass,
  primary,
  currencies = ['VES', 'USD', 'EUR', 'CRYPTO'],
  style,
  editingId,
  tenantConfig = {},
  isDarkBg = false,
  secondary = '#ffffff',
}: BasicInfoSectionProps) {
  
  const { showToast } = useToast();

  const [rates, setRates] = useState<Record<string, number>>({ 
    VES: 1, 
    USD: 0, 
    EUR: 0, 
    CRYPTO: 0,
    IVA: 16
  });

  const [loadingRate, setLoadingRate] = useState<boolean>(true);
  const [rateError, setRateError] = useState<string | null>(null);
const [categorySearch, setCategorySearch] = useState<string>('');
// 🔥 Estado de foco por input de precio (para formatear solo al desenfocar)
const [focusedPriceField, setFocusedPriceField] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const symbols: Record<string, string> = { VES: 'Bs.', USD: '$', EUR: '€', CRYPTO: 'USDT' };

  // 🔥 COLORES ADAPTATIVOS
  const greenColor = getAdaptiveGreenColor(textColor);
  const primaryColor = primary;

  // ESTILOS DINÁMICOS
  const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
  const dropdownBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const dropdownItemHover = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const dropdownItemSelected = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' 
    : 'http://localhost:3000');

  // Obtener tasas del BCV en tiempo real (incluyendo IVA)
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    async function loadLiveRates() {
      try {
        setLoadingRate(true);
        setRateError(null);
        
        const response = await fetch(`${apiBase}/currency/rates`);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success && data?.rates) {
          const usdRate = Number(data.rates.USD);
          const eurRate = Number(data.rates.EUR);
          const cryptoRate = Number(data.rates.CRYPTO || data.rates.USD);
          const ivaRate = Number(data.rates.IVA || 16);
          
          if (usdRate > 0 && eurRate > 0) {
            if (isMounted) {
              setRates({
                VES: 1,
                USD: usdRate,
                EUR: eurRate,
                CRYPTO: cryptoRate,
                IVA: ivaRate
              });
              setRateError(null);
              console.log('Tasas del BCV cargadas:', { USD: usdRate, EUR: eurRate, IVA: ivaRate });
              
              if (ivaRate > 0 && !newItem?.ivaRate) {
                setNewItem((prev: any) => ({
                  ...prev,
                  ivaRate: ivaRate
                }));
              }
              
              if (newItem?.prices?.VES || newItem?.prices?.USD) {
                const currentVes = Number(newItem?.prices?.VES || 0);
                const currentUsd = Number(newItem?.prices?.USD || 0);
                
                if (currentVes > 0 && currentUsd === 0) {
                  const newUsd = Number((currentVes / usdRate).toFixed(2));
                  setNewItem((prev: any) => ({
                    ...prev,
                    prices: {
                      ...prev?.prices,
                      USD: newUsd,
                      EUR: Number((currentVes / eurRate).toFixed(2)),
                      CRYPTO: Number((currentVes / cryptoRate).toFixed(2))
                    }
                  }));
                }
              }
            }
          } else {
            throw new Error('Tasas inválidas del BCV');
          }
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      } catch (error) {
        console.error('Error al obtener tasas del BCV:', error);
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Reintentando (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(loadLiveRates, 2000 * retryCount);
          return;
        }
        
        if (isMounted) {
          setRateError('No se pudieron obtener las tasas del BCV. Verifica tu conexión.');
          setRates({ VES: 1, USD: 0, EUR: 0, CRYPTO: 0, IVA: 16 });
        }
      } finally {
        if (isMounted) {
          setLoadingRate(false);
        }
      }
    }

    loadLiveRates();

    const interval = setInterval(loadLiveRates, 5 * 60 * 1000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiBase]);

  const globalItemType = tenantConfig?.itemType || newItem?.itemType || 'product';

  useEffect(() => {
    if (newItem?.itemType !== globalItemType && typeof setNewItem === 'function') {
      setNewItem((prev: any) => {
        if ((prev || {}).itemType === globalItemType) return prev;
        return { ...(prev || {}), itemType: globalItemType };
      });
    }
  }, []);

  const getStoreNiche = () => {
    const rawNiche = tenantConfig?.niche || tenantConfig?.category || tenantConfig?.businessType || '';
    return String(rawNiche).toLowerCase().trim();
  };

  const storeNicheStr = getStoreNiche();

const getAllAvailableCategories = useMemo(() => {
  // 🔥 OBTENER TODAS LAS CATEGORÍAS DE TODOS LOS NICHOS
  const allCategories = new Set<string>();
  
  // 1. Agregar PRESET_CATEGORIES
  PRESET_CATEGORIES.forEach(cat => allCategories.add(cat));
  
  // 2. Agregar TODAS las categorías de TODOS los nichos
  Object.values(NICHE_CATEGORIES_MAP).forEach(categories => {
    categories.forEach(cat => allCategories.add(cat));
  });
  
  // 3. Convertir a array y ordenar alfabéticamente
  const result = Array.from(allCategories).sort();
  
  console.log(`📊 [BasicInfoSection] Total categorías: ${result.length}`);
  
  return result;
}, []);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return getAllAvailableCategories;
    const searchLower = categorySearch.toLowerCase().trim();
    return getAllAvailableCategories.filter(cat => 
      formatFriendlyText(cat).toLowerCase().includes(searchLower) ||
      cat.toLowerCase().includes(searchLower)
    );
  }, [getAllAvailableCategories, categorySearch]);

  const displayNicheName = storeNicheStr ? formatFriendlyText(storeNicheStr) : 'General';

  const handleCurrencyChange = (currencyKey: string, val: string) => {
    if (loadingRate) {
      showToast({
        variant: 'warning',
        message: 'Espera a que se carguen las tasas del BCV',
      });
      return;
    }
    
    if (rates.USD === 0 || rates.EUR === 0) {
      showToast({
        variant: 'warning',
        message: 'No hay tasas de cambio disponibles. No se pueden calcular precios.',
      });
      return;
    }

    const numericVal = val === '' ? 0 : Number(val);

    setNewItem((prev: any) => {
      const currentPrices = prev?.prices || { VES: 0, USD: 0, EUR: 0, CRYPTO: 0 };
      const updatedPrices = { ...currentPrices };

      const rateUSD = rates['USD'];
      const rateEUR = rates['EUR'];
      const rateCRYPTO = rates['CRYPTO'] || rateUSD;

      if (currencyKey === 'VES') {
        updatedPrices.VES = numericVal;
        updatedPrices.USD = Number((numericVal / rateUSD).toFixed(2));
        updatedPrices.EUR = Number((numericVal / rateEUR).toFixed(2));
        updatedPrices.CRYPTO = Number((numericVal / rateCRYPTO).toFixed(2));
      } 
      else if (currencyKey === 'USD') {
        updatedPrices.USD = numericVal;
        updatedPrices.VES = Number((numericVal * rateUSD).toFixed(2));
        updatedPrices.EUR = Number(((numericVal * rateUSD) / rateEUR).toFixed(2));
        updatedPrices.CRYPTO = Number((numericVal * rateUSD / rateCRYPTO).toFixed(2));
      }
      else if (currencyKey === 'EUR') {
        updatedPrices.EUR = numericVal;
        updatedPrices.VES = Number((numericVal * rateEUR).toFixed(2));
        updatedPrices.USD = Number(((numericVal * rateEUR) / rateUSD).toFixed(2));
        updatedPrices.CRYPTO = Number(((numericVal * rateEUR) / rateCRYPTO).toFixed(2));
      }
      else if (currencyKey === 'CRYPTO') {
        updatedPrices.CRYPTO = numericVal;
        updatedPrices.VES = Number((numericVal * rateCRYPTO).toFixed(2));
        updatedPrices.USD = Number(((numericVal * rateCRYPTO) / rateUSD).toFixed(2));
        updatedPrices.EUR = Number(((numericVal * rateCRYPTO) / rateEUR).toFixed(2));
      }

      return {
        ...prev,
        price: updatedPrices.VES,
        prices: updatedPrices
      };
    });
  };

  const cleanInputBg = inputBgClass.replace(/text-\w+-\d+/g, '').replace(/text-white/g, '');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasValidRates = rates.USD > 0 && rates.EUR > 0;

  // TIPO DE IVA - El usuario puede elegir el tipo
  const ivaType = newItem?.ivaType || 'excluded';
  const ivaRate = rates.IVA || 16;

  // Función para actualizar el tipo de IVA
  const updateIvaType = (type: string) => {
    setNewItem((prev: any) => ({
      ...prev,
      ivaType: type,
    }));
  };

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

  const formatNum = (num: number) => {
    return formatNumber(num);
  };

  return (
    <div className="space-y-4">
      {/* Modo de Tienda Configurado */}
      <div 
        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border opacity-75 select-none bg-transparent" 
        style={{ ...style, borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: textColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>
            Modo de Tienda Configurado:
          </span>
        </div>
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md" style={{ color: primary, backgroundColor: `${primary}20` }}>
          <span className="text-[10px] font-extrabold uppercase">
            {globalItemType === 'service' ? 'Catálogo de Servicios Agendables' : 'Catálogo de Productos Físicos'}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          {globalItemType === 'service' ? 'Nombre del Servicio *' : 'Nombre del Artículo *'}
        </label>
        <input
          type="text"
          required
          placeholder={globalItemType === 'service' ? "Ej. Consulta especializada..." : "Ej. Producto o ropa..."}
          value={newItem?.name || ''}
          onChange={(e) => {
            if (typeof setNewItem === 'function') {
              setNewItem((prev: any) => ({ ...(prev || {}), name: e.target.value }));
            }
          }}
          className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition bg-transparent`}
          style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)', color: textColor }}
        />
      </div>

            {/* 🔥 FASE K: Canales de venta (solo productos) */}
      {globalItemType !== 'service' && (
        <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Canales de Venta
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Kiosco */}
            <button
              type="button"
              onClick={() => {
                if (typeof setNewItem === 'function') {
                  setNewItem((prev: any) => ({
                    ...(prev || {}),
                    availableKiosk: !(prev?.availableKiosk ?? true),
                  }));
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                (newItem?.availableKiosk ?? true)
                  ? 'border-2 shadow-md'
                  : 'opacity-60 hover:opacity-80'
              }`}
              style={{
                borderColor: (newItem?.availableKiosk ?? true)
                  ? primary
                  : (style?.borderColor || 'rgba(128,128,128,0.2)'),
                backgroundColor: (newItem?.availableKiosk ?? true)
                  ? `${primary}15`
                  : 'transparent',
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    borderColor: (newItem?.availableKiosk ?? true) ? primary : textColor,
                    backgroundColor: (newItem?.availableKiosk ?? true) ? primary : 'transparent',
                  }}
                >
                  {(newItem?.availableKiosk ?? true) && (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div
                    className="text-xs font-bold"
                    style={{ color: (newItem?.availableKiosk ?? true) ? primary : textColor }}
                  >
                    Disponible en kiosco
                  </div>
                  <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                    Visible en el POS presencial
                  </div>
                </div>
              </div>
            </button>

            {/* Tienda online */}
            <button
              type="button"
              onClick={() => {
                if (typeof setNewItem === 'function') {
                  setNewItem((prev: any) => ({
                    ...(prev || {}),
                    availableOnline: !(prev?.availableOnline ?? true),
                  }));
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                (newItem?.availableOnline ?? true)
                  ? 'border-2 shadow-md'
                  : 'opacity-60 hover:opacity-80'
              }`}
              style={{
                borderColor: (newItem?.availableOnline ?? true)
                  ? primary
                  : (style?.borderColor || 'rgba(128,128,128,0.2)'),
                backgroundColor: (newItem?.availableOnline ?? true)
                  ? `${primary}15`
                  : 'transparent',
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    borderColor: (newItem?.availableOnline ?? true) ? primary : textColor,
                    backgroundColor: (newItem?.availableOnline ?? true) ? primary : 'transparent',
                  }}
                >
                  {(newItem?.availableOnline ?? true) && (
                    <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div
                    className="text-xs font-bold"
                    style={{ color: (newItem?.availableOnline ?? true) ? primary : textColor }}
                  >
                    Disponible en tienda online
                  </div>
                  <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                    Visible en el catálogo web
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${globalItemType === 'service' ? 'sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
        <div className="space-y-1" ref={dropdownRef}>
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Categoría ({displayNicheName}) * <span className="text-[9px] font-normal opacity-60">({filteredCategories.length} disponibles)</span>
          </label>
          
          <div className="relative">
            <div 
              className="w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition cursor-text flex items-center justify-between bg-transparent"
              style={{ 
                borderColor: style?.borderColor || (isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'), 
                color: textColor 
              }}
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            >
              <span className={newItem?.category ? '' : 'opacity-50'}>
                {newItem?.category ? formatFriendlyText(newItem.category) : 'Buscar o seleccionar categoría...'}
              </span>
              <ChevronIcon color={textColor} open={isCategoryDropdownOpen} />
            </div>

            {isCategoryDropdownOpen && (
              <div 
                className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl max-h-72 overflow-hidden flex flex-col"
                style={{ 
                  backgroundColor: dropdownBg,
                  borderColor: dropdownBorder,
                }}
              >
                <div className="p-2 border-b" style={{ borderColor: dropdownBorder }}>
                  <div className="relative flex items-center gap-2">
                    <SearchIcon color={mutedText} />
                    <input
                      type="text"
                      placeholder="Filtrar categorías..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none border-none bg-transparent"
                      style={{ 
                        color: textColor,
                        backgroundColor: 'transparent',
                        boxShadow: 'none'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredCategories.length === 0 ? (
                    <div className="px-3.5 py-4 text-center text-xs opacity-60" style={{ color: textColor }}>
                      No se encontraron categorías
                    </div>
                  ) : (
                    filteredCategories.map((cat) => {
                      const isSelected = newItem?.category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (typeof setNewItem === 'function') {
                              setNewItem((prev: any) => ({ ...(prev || {}), category: cat }));
                            }
                            setCategorySearch('');
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="w-full px-3.5 py-2.5 text-xs text-left transition flex items-center justify-between hover:opacity-80"
                          style={{ 
                            color: isSelected ? primary : textColor,
                            backgroundColor: isSelected ? dropdownItemSelected : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = dropdownItemHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <span>{formatFriendlyText(cat)}</span>
                          {isSelected && <CheckIcon color={primary} />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="px-3.5 py-1.5 border-t text-[9px] opacity-50" style={{ 
                  borderColor: dropdownBorder,
                  color: textColor 
                }}>
                  {filteredCategories.length} categorías
                </div>
              </div>
            )}
          </div>
        </div>

        {globalItemType === 'service' && (
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
              Duración (Minutos) *
            </label>
            <input
              type="number"
              min="1"
              step="5"
              placeholder="Ej. 30, 60..."
              value={newItem?.durationMinutes ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (typeof setNewItem === 'function') {
                  setNewItem((prev: any) => ({ 
                    ...(prev || {}), 
                    durationMinutes: val === '' ? '' : Number(val) 
                  }));
                }
              }}
              className="w-full border rounded-xl px-3.5 py-3 text-xs outline-none transition bg-transparent"
              style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)', color: textColor }}
            />
          </div>
        )}
      </div>
{/* PRECIOS */}
<div className="space-y-2">
  <div className="flex justify-between items-center">
    <label className="block text-[11px] font-bold tracking-wider opacity-80" style={{ color: textColor }}>
      Precios (Moneda Principal: Bs.) *
    </label>
    <span className={`text-[9px] font-bold ${loadingRate ? 'animate-pulse' : ''}`} style={{ color: textColor }}>
      {loadingRate ? (
        'Cargando tasas del BCV...'
      ) : rateError ? (
        <span style={{ color: '#ef4444' }}>Error: {rateError}</span>
      ) : hasValidRates ? (
        `USD: ${rates.USD} | EUR: ${rates.EUR} | IVA: ${rates.IVA}%`
      ) : (
        <span style={{ color: '#ef4444' }}>SIN TASAS</span>
      )}
    </span>
  </div>
  
  {!hasValidRates && !loadingRate && (
    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
      No hay tasas de cambio disponibles. Los precios no se pueden calcular correctamente.
      <button 
        type="button"
        onClick={() => window.location.reload()}
        className="ml-2 underline hover:opacity-80"
      >
        Reintentar
      </button>
    </div>
  )}
  
  {/* 🔥 VES - INPUT EDITABLE CON COLOR PRIMARIO */}
  <div className="border p-2.5 rounded-xl bg-transparent" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
    <span className="text-[9px] font-bold uppercase opacity-80 block" style={{ color: textColor }}>
      {loadingRate ? 'Cargando tasas...' : 'Bolívares (VES) - Moneda Principal'}
    </span>
    <div className="flex items-center gap-2 mt-0.5">
      <span className="text-xs font-black" style={{ color: primaryColor }}>Bs.</span>
      <input
        type="text"
        inputMode="decimal"
        disabled={loadingRate || !hasValidRates}
        placeholder="0,00"
        value={newItem?.prices?.VES !== undefined && newItem?.prices?.VES !== null && newItem?.prices?.VES !== ''
          ? (focusedPriceField === 'VES'
              ? String(newItem.prices.VES).replace('.', ',')
              : formatNum(Number(newItem.prices.VES)))
          : ''}
        onFocus={() => setFocusedPriceField('VES')}
        onBlur={() => setFocusedPriceField(null)}
        onChange={(e) => {
          const rawValue = e.target.value.replace(/[^\d,.]/g, '');
          const numericValue = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
          if (!isNaN(numericValue) && numericValue >= 0) {
            handleCurrencyChange('VES', String(numericValue));
          } else if (rawValue === '' || rawValue === '0') {
            handleCurrencyChange('VES', '0');
          }
        }}
        className="w-full bg-transparent text-xs font-black outline-none"
        style={{ color: primaryColor }}
      />
    </div>
  </div>

  {/* 🔥 USD, EUR, CRYPTO - COLOR VERDE ADAPTATIVO */}
  <div className="grid grid-cols-3 gap-2 pt-1">
    {['USD', 'EUR', 'CRYPTO'].map((curr) => {
      const calculatedValue = newItem?.prices?.[curr] !== undefined ? newItem.prices[curr] : '';
      return (
        <div key={curr} className="border p-2 rounded-xl bg-transparent" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
          <span className="text-[9px] font-bold uppercase opacity-80 block" style={{ color: textColor }}>
            {curr} ({symbols[curr]}) <span className="font-normal opacity-50">(Referencia)</span>
          </span>
          <input
            type="text"
            inputMode="decimal"
            disabled={loadingRate || !hasValidRates}
            value={
              calculatedValue !== '' && calculatedValue !== null && calculatedValue !== undefined
                ? (focusedPriceField === curr
                    ? String(calculatedValue).replace('.', ',')
                    : formatNum(Number(calculatedValue)))
                : ''
            }
            onFocus={() => setFocusedPriceField(curr)}
            onBlur={() => setFocusedPriceField(null)}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^\d,.]/g, '');
              const numericValue = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
              if (!isNaN(numericValue) && numericValue >= 0) {
                handleCurrencyChange(curr, String(numericValue));
              } else if (rawValue === '' || rawValue === '0') {
                handleCurrencyChange(curr, '0');
              }
            }}
            className="w-full bg-transparent text-xs font-black outline-none mt-0.5"
            style={{ color: greenColor }}
            placeholder="0,00"
          />
        </div>
      );
    })}
  </div>
</div>

      {/* IVA - IMPUESTO AL VALOR AGREGADO */}
      <div className="space-y-3 pt-3 border-t" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            Impuesto (IVA) - Tasa {ivaRate}% (Definida por Ley)
          </label>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${
            ivaType === 'exempt' 
              ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' 
              : ivaType === 'included' 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {ivaType === 'exempt' 
              ? 'Exento de IVA' 
              : ivaType === 'included' 
                ? `IVA Incluido (${ivaRate}%)` 
                : `IVA No Incluido (${ivaRate}%)`}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tipo de IVA - EL USUARIO ELIGE EL TIPO */}
          <div className="space-y-1.5 col-span-2">
            <span className="text-[10px] font-semibold opacity-70" style={{ color: textColor }}>
              Tipo de IVA
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'included', label: 'IVA Incluido', desc: 'El precio ya incluye IVA' },
                { value: 'excluded', label: 'IVA No incluido', desc: 'Se suma IVA al precio' },
                { value: 'exempt', label: 'Exento de IVA', desc: 'Producto sin IVA' }
              ].map((option) => {
                const isSelected = ivaType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      updateIvaType(option.value);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-2 shadow-md' 
                        : 'opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      borderColor: isSelected ? primary : (style?.borderColor || 'rgba(128,128,128,0.2)'),
                      backgroundColor: isSelected ? `${primary}15` : 'transparent'
                    }}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold" style={{ color: isSelected ? primary : textColor }}>
                        {option.label}
                      </div>
                      <div className="text-[9px] opacity-50" style={{ color: textColor }}>
                        {option.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Información de la tasa fija desde el backend */}
        <div className="p-3 rounded-xl border bg-transparent flex items-center justify-between" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: textColor }}>Tasa de IVA aplicada:</span>
            <span className="text-xs font-bold" style={{ color: primaryColor }}>{ivaRate}%</span>
          </div>
          <span className="text-[9px] opacity-50" style={{ color: textColor }}>
            {loadingRate ? 'Cargando tasa...' : 'Tasa obtenida del BCV (no modificable)'}
          </span>
        </div>

        {/* 🔥 DESGLOSE DEL IVA EN VES Y USD */}
        {(() => {
          // Obtener precios en VES y USD
          const vesPrice = Number(newItem?.prices?.VES || 0);
          const usdPrice = Number(newItem?.prices?.USD || 0);
          
          // Si no hay precio, no mostrar nada
          if (vesPrice === 0 && usdPrice === 0) {
            return (
              <div className="p-3 rounded-xl border bg-transparent" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
                <span className="text-xs opacity-50" style={{ color: textColor }}>
                  Ingresa un precio para ver el desglose del IVA
                </span>
              </div>
            );
          }

          // Calcular IVA en VES
          let ivaAmountVes = 0;
          let priceWithIVAVes = vesPrice;
          let ivaAmountUsd = 0;
          let priceWithIVAUsd = usdPrice;

          if (ivaType === 'excluded') {
            ivaAmountVes = vesPrice * (ivaRate / 100);
            priceWithIVAVes = vesPrice + ivaAmountVes;
            ivaAmountUsd = usdPrice * (ivaRate / 100);
            priceWithIVAUsd = usdPrice + ivaAmountUsd;
          } else if (ivaType === 'included') {
            ivaAmountVes = vesPrice - (vesPrice / (1 + ivaRate / 100));
            priceWithIVAVes = vesPrice;
            ivaAmountUsd = usdPrice - (usdPrice / (1 + ivaRate / 100));
            priceWithIVAUsd = usdPrice;
          } else {
            // Exento
            ivaAmountVes = 0;
            priceWithIVAVes = vesPrice;
            ivaAmountUsd = 0;
            priceWithIVAUsd = usdPrice;
          }

          return (
            <div className="p-4 rounded-xl border bg-transparent space-y-2" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
              {/* Título del desglose */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Desglose del Precio con IVA
                </span>
                <span className="text-[9px] font-medium" style={{ color: ivaType === 'exempt' ? '#94a3b8' : (ivaType === 'included' ? '#34d399' : '#f59e0b') }}>
                  {ivaType === 'exempt' ? 'Exento de IVA' : ivaType === 'included' ? 'IVA Incluido' : 'IVA No Incluido'}
                </span>
              </div>

              {/* 🔥 DESGLOSE EN VES - Precio base y IVA en blanco, total en PRIMARIO */}
              <div className="space-y-1 p-2 rounded-lg" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-60" style={{ color: textColor }}>Precio base (VES):</span>
                  <span className="font-medium" style={{ color: textColor }}>Bs. {formatNum(vesPrice)}</span>
                </div>
                {ivaType !== 'exempt' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-60" style={{ color: textColor }}>IVA ({ivaRate}%):</span>
                    <span className="font-medium" style={{ color: textColor }}>
                      Bs. {formatNum(ivaAmountVes)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
                  <span style={{ color: textColor }}>Precio con IVA (VES):</span>
                  <span style={{ color: primaryColor }}>Bs. {formatNum(priceWithIVAVes)}</span>
                </div>
              </div>

              {/* 🔥 DESGLOSE EN USD - Precio base en VERDE, IVA en VERDE CLARO, total en VERDE */}
              {usdPrice > 0 && (
                <div className="space-y-1 p-2 rounded-lg" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-60" style={{ color: textColor }}>Precio base (USD):</span>
                    <span className="font-medium" style={{ color: greenColor }}>${formatNum(usdPrice)}</span>
                  </div>
                  {ivaType !== 'exempt' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-60" style={{ color: textColor }}>IVA ({ivaRate}%):</span>
                      <span className="font-medium" style={{ color: '#4ade80' }}>
                        ${formatNum(ivaAmountUsd)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: style?.borderColor || 'rgba(128,128,128,0.2)' }}>
                    <span style={{ color: textColor }}>Precio con IVA (USD):</span>
                    <span style={{ color: greenColor }}>${formatNum(priceWithIVAUsd)}</span>
                  </div>
                </div>
              )}

              {/* Resumen para Exento */}
              {ivaType === 'exempt' && (
                <div className="text-xs opacity-60 text-center pt-1" style={{ color: textColor }}>
                  Este producto está exento de IVA según la ley
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}