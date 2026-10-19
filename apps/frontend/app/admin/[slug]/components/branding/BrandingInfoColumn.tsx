'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { searchAddress, reverseGeocode } from '@/lib/geo-search';
import { SOCIAL_NETWORKS_CONFIG } from '../../../../onboarding/components/step-contact-account/paymentConstants';
import { PRODUCT_NICHES, SERVICE_NICHES, NICHE_CATEGORIES_MAP } from '../../../../constants/nicheData';
import { useToast } from '@/components/ui/useToast';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

// DESPUÉS - Usar el LocationMap simple que ya funciona
const LocationMap = dynamic(
  () => import('@/app/onboarding/components/LocationMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-xs text-slate-400" style={{ height: '250px' }}>
        <div className="flex flex-col items-center gap-2">
          <svg className="w-6 h-6 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Cargando mapa interactivo...</span>
        </div>
      </div>
    )
  }
);


const CURRENCIES = [
  { value: 'USD', label: 'Dólares ($)' },
  { value: 'VES', label: 'Bolívares (Bs.)' },
  { value: 'EUR', label: 'Euros (€)' },
  { value: 'CRYPTO', label: 'USDT' },
];

const COUNTRIES = [
  { name: 'Venezuela', dialCode: '+58', flag: 've' },
  { name: 'Estados Unidos', dialCode: '+1', flag: 'us' },
  { name: 'Canadá', dialCode: '+1', flag: 'ca' },
  { name: 'México', dialCode: '+52', flag: 'mx' },
  { name: 'Argentina', dialCode: '+54', flag: 'ar' },
  { name: 'Colombia', dialCode: '+57', flag: 'co' },
  { name: 'España', dialCode: '+34', flag: 'es' },
  { name: 'Chile', dialCode: '+56', flag: 'cl' },
  { name: 'Perú', dialCode: '+51', flag: 'pe' },
  { name: 'Ecuador', dialCode: '+593', flag: 'ec' },
  { name: 'Panamá', dialCode: '+507', flag: 'pa' },
  { name: 'Costa Rica', dialCode: '+506', flag: 'cr' },
];


interface BrandingInfoColumnProps {
  brandConfig: any;
  setBrandConfig: React.Dispatch<React.SetStateAction<any>>;
  handleSocialChange: (network: string, value: string) => void;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  inputClass: string;
  // 🔥 NUEVO: necesarios para SearchableDropdown
  primary: string;
  isDarkBg: boolean;
}

// 🔥 LIMPIAR EMOJIS DE LOS NICHOS
const cleanNicheLabel = (label: string) => {
  return label.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '').trim();
};

// 🔥 OBTENER ÍCONO SOCIAL
const getSocialIcon = (key: string) => {
  switch (key) {
    case 'instagram':
      return <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
    case 'facebook':
      return <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
    case 'tiktok':
      return <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z"/></svg>;
    case 'x_twitter':
      return <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'threads':
      return <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z"/></svg>;
    case 'linkedin':
      return <svg className="w-4 h-4 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>;
    default:
      return null;
  }
};

// 🔥 COMPONENTE PARA CAMPOS DINÁMICOS (extraído de ThemesTab)
const CustomFieldItem = React.memo(({ 
  field, 
  index, 
  onFieldChange, 
  onRemoveField,
  cardBorder,
  itemBg,
  textColor,
  inputClass
}: any) => {
  return (
    <div 
      className="flex flex-col sm:flex-row items-center gap-2 p-3 rounded-xl border"
      style={{ borderColor: cardBorder, backgroundColor: itemBg }}
    >
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        <input
          type="text"
          placeholder="Título (ej. Reembolso)"
          value={field.key || ''}
          onChange={(e) => onFieldChange(index, 'key', e.target.value)}
          className={inputClass}
          style={{ color: textColor }}
        />
        <input
          type="text"
          placeholder="Valor (ej. Sin Políticas)"
          value={field.value || ''}
          onChange={(e) => onFieldChange(index, 'value', e.target.value)}
          className={inputClass}
          style={{ color: textColor }}
        />
      </div>
      <button
        type="button"
        onClick={() => onRemoveField(index)}
        className="px-3 py-2 rounded-xl text-xs bg-red-500/20 text-red-500 hover:bg-red-500/30 transition cursor-pointer shrink-0"
        title="Eliminar campo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});
CustomFieldItem.displayName = 'CustomFieldItem';

// 🔥 COMPONENTE PRINCIPAL MEMOIZADO
export default React.memo(function BrandingInfoColumn({
  brandConfig,
  setBrandConfig,
  handleSocialChange,
  cardBg,
  cardBorder,
  textColor,
  inputClass,
  primary,
  isDarkBg,
}: BrandingInfoColumnProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  const [loadingGps, setLoadingGps] = useState(false);
  const [searchingQuery, setSearchingQuery] = useState(brandConfig?.city || brandConfig?.address || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

// 🔥 OBTENER TODOS LOS NICHOS DE PRODUCTOS (incluyendo alias)
const uniqueNichos = useMemo(() => {
  // 1. Obtener todos los nichos de PRODUCT_NICHES
  const productNichos = PRODUCT_NICHES.map(n => ({ 
    label: n.label, 
    value: n.value
  }));
  
  // 2. Obtener TODOS los nichos de NICHE_CATEGORIES_MAP
  const allNicheKeys = Object.keys(NICHE_CATEGORIES_MAP);
  const productNicheValues = new Set(PRODUCT_NICHES.map(n => n.value));
  
  // 3. Nichos principales desde NICHE_CATEGORIES_MAP
  const nicheMapNichos = allNicheKeys
    .filter(key => productNicheValues.has(key))
    .map(key => ({
      label: key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: key
    }));
  
  // 4. Alias adicionales
  const allProductAliases = [
    'tecnologia', 'electronica', 'celulares', 'ropa', 'moda', 
    'hogar', 'decoracion', 'cocina', 'ferreteria', 'construccion',
    'belleza', 'salud', 'deportes', 'fitness', 'juguetes', 
    'mascotas', 'autopartes', 'comida'
  ];
  
  const aliasNichos = allNicheKeys
    .filter(key => allProductAliases.includes(key) && !productNicheValues.has(key))
    .map(key => ({
      label: key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      value: key
    }));
  
  // 5. Combinar y ordenar
  const allCombined = [...productNichos, ...nicheMapNichos, ...aliasNichos];
  const unique = allCombined.filter(
    (niche, index, self) => index === self.findIndex((n) => n.value === niche.value)
  );
  unique.sort((a, b) => a.label.localeCompare(b.label));
  
  return unique;
}, []);

  // 🔥 ESTADO PARA EL FILTRO DE BÚSQUEDA DE NICHOS
  const [nicheSearchTerm, setNicheSearchTerm] = useState('');
  const [isNicheDropdownOpen, setIsNicheDropdownOpen] = useState(false);
  const nicheDropdownRef = useRef<HTMLDivElement>(null);

  // 🔥 FILTRAR NICHOS POR TÉRMINO DE BÚSQUEDA
  const filteredNichos = useMemo(() => {
    return uniqueNichos.filter((niche) => {
      const cleanLabel = cleanNicheLabel(niche.label);
      return cleanLabel.toLowerCase().includes(nicheSearchTerm.toLowerCase());
    });
  }, [uniqueNichos, nicheSearchTerm]);

  // 🔥 CERRAR DROPDOWN AL HACER CLICK FUERA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nicheDropdownRef.current && !nicheDropdownRef.current.contains(event.target as Node)) {
        setIsNicheDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 DETECTAR CUANDO EL MAPA ES VISIBLE PARA CARGARLO Y FORZAR REFLOW
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsMapVisible(true);
            observer.disconnect();
            
            // 🔥 FORZAR REFLOW PARA QUE EL MAPA SE RENDERICE BIEN
            setTimeout(() => {
              if (mapContainerRef.current) {
                mapContainerRef.current.style.height = '250px';
                window.dispatchEvent(new Event('resize'));
              }
            }, 150);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCurrencyToggle = useCallback((currValue: string) => {
    const currentCurrencies = Array.isArray(brandConfig?.currencies) ? brandConfig.currencies : [];
    let updated;
    if (currentCurrencies.includes(currValue)) {
      updated = currentCurrencies.filter((c: string) => c !== currValue);
    } else {
      updated = [...currentCurrencies, currValue];
    }
    setBrandConfig((prev: any) => ({ ...prev, currencies: updated }));
  }, [brandConfig?.currencies, setBrandConfig]);

  const selectedCurrencies = useMemo(() => 
    Array.isArray(brandConfig?.currencies) ? brandConfig.currencies : [],
    [brandConfig?.currencies]
  );

  const handleMapPointSelect = useCallback(async (lat: number, lng: number) => {
    setBrandConfig((prev: any) => ({ ...prev, latitude: lat, longitude: lng }));
    setSearchingQuery('Buscando dirección legible...');

    try {
      const result = await reverseGeocode(lat, lng);
      setSearchingQuery(result.display_name);
      setBrandConfig((prev: any) => ({
        ...prev,
        state: result.state || '',
        city: result.display_name,
        latitude: lat,
        longitude: lng,
      }));
    } catch (err) {
      console.error('Error en reverseGeocode:', err);
      setSearchingQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, [setBrandConfig]);

  const handleSearchLocation = useCallback((query: string) => {
    setSearchingQuery(query);
    setBrandConfig((prev: any) => ({ ...prev, city: query }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddress(query);
        setSuggestions(
          results.map((r) => ({
            display_name: r.display_name,
            lat: r.lat,
            lon: r.lon,
            address: {
              state: r.state,
              county: r.municipality,
              city: r.city,
            },
            __source: r.source,
          })),
        );
      } catch (err) {
        console.error('Error en searchAddress:', err);
        setSuggestions([]);
      }
      setIsSearching(false);
    }, 300);
  }, [setBrandConfig]);

  const handleSelectSuggestion = useCallback((item: any) => {
    const state = item.address?.state || item.state || 'Miranda';
    const lat = item.lat ? parseFloat(item.lat) : 10.4795;
    const lon = item.lon ? parseFloat(item.lon) : -66.5329;
    const finalName = item.display_name || state;

    setSearchingQuery(finalName);
    setBrandConfig((prev: any) => ({ 
      ...prev, 
      state, 
      city: finalName, 
      latitude: lat, 
      longitude: lon 
    }));
    setSuggestions([]);
  }, [setBrandConfig]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await handleMapPointSelect(position.coords.latitude, position.coords.longitude);
        setLoadingGps(false);
      },
      () => {
        setLoadingGps(false);
        alert('No pudimos obtener tu ubicación GPS automática.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleMapPointSelect]);

  // 🔥 MEMOIZAR COORDENADAS DEL MAPA PARA EVITAR RE-RENDERIZADOS
  const mapCoordinates = useMemo(() => {
    const lat = typeof brandConfig?.latitude === 'number' && !isNaN(brandConfig.latitude)
      ? brandConfig.latitude
      : null;
    const lng = typeof brandConfig?.longitude === 'number' && !isNaN(brandConfig.longitude)
      ? brandConfig.longitude
      : null;
    return { lat, lng };
  }, [brandConfig?.latitude, brandConfig?.longitude]);

  // 🔥 RENDERIZAR EL MAPA SOLO CUANDO ES VISIBLE - CORREGIDO
  const renderMap = useMemo(() => {
    if (!isMapVisible) {
      return (
        <div className="w-full h-48 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-xs text-slate-400" style={{ height: '250px' }}>
          <div className="flex flex-col items-center gap-2">
            <svg className="w-6 h-6 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Cargando mapa...</span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ height: '250px', width: '100%', minHeight: '250px' }}>
        <LocationMap
          key={`map-${mapCoordinates.lat ?? 'null'}-${mapCoordinates.lng ?? 'null'}`}
          lat={mapCoordinates.lat}
          lng={mapCoordinates.lng}
          onLocationSelect={handleMapPointSelect}
        />
      </div>
    );
  }, [isMapVisible, mapCoordinates.lat, mapCoordinates.lng, handleMapPointSelect]);

  // 🔥 FUNCIONES PARA CAMPOS DINÁMICOS
  const handleCustomFieldChange = useCallback((index: number, field: string, value: string) => {
    const customFields = [...(brandConfig?.customFields || [])];
    if (!customFields[index]) {
      customFields[index] = { key: '', value: '' };
    }
    customFields[index] = { ...customFields[index], [field]: value };
    setBrandConfig((prev: any) => ({ ...prev, customFields }));
  }, [brandConfig?.customFields, setBrandConfig]);

  const addCustomField = useCallback(() => {
    const customFields = [...(brandConfig?.customFields || []), { key: '', value: '' }];
    setBrandConfig((prev: any) => ({ ...prev, customFields }));
  }, [brandConfig?.customFields, setBrandConfig]);

  const removeCustomField = useCallback((index: number) => {
    const customFields = (brandConfig?.customFields || []).filter((_: any, i: number) => i !== index);
    setBrandConfig((prev: any) => ({ ...prev, customFields }));
  }, [brandConfig?.customFields, setBrandConfig]);

  return (
    <div className="space-y-6">
      {/* Información del Comercio */}
      <div 
        className="backdrop-blur-sm border p-6 rounded-3xl space-y-5 shadow-lg transition-all"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        <div className="border-b border-black/5 dark:border-white/10 pb-3">
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
            Información del Comercio
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            Sincronización de datos comerciales, canal de contacto y ubicación física mediante mapa.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Nombre Comercial
            </label>
            <input
              type="text"
              value={brandConfig?.name || ''}
              onChange={(e) => setBrandConfig((prev: any) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
              style={{ color: textColor }}
              placeholder="Ej. Mi Comercio"
              required
            />
          </div>

          {/* 🔥 NICHO / CATEGORÍA - CON FILTRO DE BÚSQUEDA Y ESTILOS HEREDADOS */}
          <div ref={nicheDropdownRef}>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Categoría
            </label>
            
            {/* SELECTOR PERSONALIZADO CON ESTILOS HEREDADOS */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNicheDropdownOpen(!isNicheDropdownOpen)}
                className={`${inputClass} w-full cursor-pointer flex items-center justify-between text-left`}
                style={{ color: textColor }}
              >
                <span className="truncate">
                  {brandConfig?.niche 
                    ? cleanNicheLabel(uniqueNichos.find(n => n.value === brandConfig.niche)?.label || brandConfig.niche)
                    : 'Selecciona una categoría...'}
                </span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2 ${isNicheDropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24"
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {isNicheDropdownOpen && (
                <div 
                  className="absolute z-50 mt-1 w-full rounded-2xl shadow-2xl overflow-hidden max-h-72 flex flex-col"
                  style={{ 
                    backgroundColor: cardBg, 
                    border: `1px solid ${cardBorder}`,
                    color: textColor
                  }}
                >
                  {/* BARRA DE BÚSQUEDA */}
                  <div className="p-2" style={{ borderBottom: `1px solid ${cardBorder}` }}>
                    <input
                      type="text"
                      placeholder="Buscar categoría..."
                      value={nicheSearchTerm}
                      onChange={(e) => setNicheSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none border transition"
                      style={{
                        backgroundColor: cardBg,
                        color: textColor,
                        border: `1px solid ${cardBorder}`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* LISTA DE NICHOS FILTRADOS */}
                  <div className="overflow-y-auto flex-1 py-1">
                    {filteredNichos.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-center opacity-50" style={{ color: textColor }}>
                        No se encontraron categorías
                      </div>
                    ) : (
                      filteredNichos.map((niche) => {
                        const isSelected = brandConfig?.niche === niche.value;
                        const cleanLabel = cleanNicheLabel(niche.label);
                        return (
                          <button
                            key={niche.value}
                            type="button"
                            onClick={() => {
                              setBrandConfig((prev: any) => ({ ...prev, niche: niche.value }));
                              setIsNicheDropdownOpen(false);
                              setNicheSearchTerm('');
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs transition border-b last:border-none cursor-pointer flex items-center justify-between"
                            style={{
                              color: isSelected ? '#f97316' : textColor,
                              backgroundColor: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                              borderColor: cardBorder,
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <span>{cleanLabel}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 text-orange-500 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* CONTADOR DE RESULTADOS */}
                  <div className="p-2" style={{ 
                    borderTop: `1px solid ${cardBorder}`,
                    backgroundColor: cardBg,
                  }}>
                    <span className="text-[10px] opacity-50" style={{ color: textColor }}>
                      {filteredNichos.length} categoría{filteredNichos.length !== 1 ? 's' : ''} disponible{filteredNichos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] opacity-50 mt-1" style={{ color: textColor }}>
              Define la categoría principal de tu negocio para una mejor clasificación.
            </p>
          </div>

          {/* 🔥 DESCRIPCIÓN DEL NEGOCIO */}
          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Descripción del Negocio
            </label>
            <textarea
              rows={3}
              value={brandConfig?.description || ''}
              onChange={(e) => setBrandConfig((prev: any) => ({ ...prev, description: e.target.value }))}
              className={`${inputClass} resize-none`}
              style={{ color: textColor }}
              placeholder="Describe tu negocio, qué ofreces y qué te hace especial..."
            />
            <p className="text-[10px] opacity-50 mt-1" style={{ color: textColor }}>
              Una descripción clara ayuda a los clientes a entender mejor tu negocio.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Eslogan / Frase Lema
            </label>
            <input
              type="text"
              value={brandConfig?.slogan || ''}
              onChange={(e) => setBrandConfig((prev: any) => ({ ...prev, slogan: e.target.value }))}
              className={inputClass}
              style={{ color: textColor }}
              placeholder="Ej. Calidad al mejor precio"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Correo de Contacto
            </label>
            <input
              type="email"
              value={brandConfig?.email || ''}
              onChange={(e) => setBrandConfig((prev: any) => ({ ...prev, email: e.target.value }))}
              className={inputClass}
              style={{ color: textColor }}
              placeholder="contacto@tienda.com"
            />
          </div>

          {/* 🔥 RIF - Registro de Información Fiscal con selector de tipo */}
          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              RIF (Registro de Información Fiscal)
            </label>
            <div className="flex gap-2">
              {/* Selector de tipo */}
              <div className="w-[100px] shrink-0">
                <SearchableDropdown
                  value={brandConfig?.rifType || 'J'}
                  onChange={(newType) => {
                    setBrandConfig((prev: any) => {
                      const currentRif = prev?.rif || '';
                      const numberPart = currentRif.replace(/^[VGJE]-\d+$/, '').replace(/^[VGJE]-/, '');
                      return { 
                        ...prev, 
                        rifType: newType,
                        rif: numberPart ? `${newType}-${numberPart}` : newType,
                      };
                    });
                  }}
                  options={[
                    { value: 'V', label: 'V - Natural' },
                    { value: 'J', label: 'J - Jurídico' },
                    { value: 'G', label: 'G - Gubernamental' },
                    { value: 'E', label: 'E - Extranjero' },
                  ]}
                  placeholder="J"
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={cardBorder}
                  searchable={false}
                />
              </div>

              {/* Campo de número de RIF */}
              <div className="flex-1">
                <input
                  type="text"
                  value={(() => {
                    const rif = brandConfig?.rif || '';
                    const type = brandConfig?.rifType || 'J';
                    if (rif && /^[VGJE]-\d+$/.test(rif)) {
                      return rif.replace(/^[VGJE]-/, '');
                    }
                    return rif.replace(/^[VGJE]-/, '');
                  })()}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/\D/g, '');
                    const type = brandConfig?.rifType || 'J';
                    const formattedRif = numbers ? `${type}-${numbers}` : type;
                    setBrandConfig((prev: any) => ({ 
                      ...prev, 
                      rif: formattedRif
                    }));
                  }}
                  className={inputClass}
                  style={{ color: textColor }}
                  placeholder="12345678-9"
                />
              </div>
            </div>
            <p className="text-[9px] opacity-40 mt-1" style={{ color: textColor }}>
              Selecciona el tipo y luego escribe solo los números (el sistema formatea automáticamente)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
                Código
              </label>
             <SearchableDropdown
  value={brandConfig?.country_code ?? brandConfig?.countryCode ?? '+58'}
  onChange={(val) => setBrandConfig((prev: any) => ({ ...prev, country_code: val, countryCode: val }))}
  options={COUNTRIES.map((c) => ({
    value: c.dialCode,
    label: `${c.dialCode} (${c.name})`,
  }))}
  placeholder="+58"
  searchPlaceholder="Buscar país..."
  emptyMessage="No hay países"
  primary={primary}
  textColor={textColor}
  isDarkBg={isDarkBg}
  borderColor={cardBorder}
  searchable={true}
  footerLabel={(n) => `${n} países`}
/>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
                Teléfono
              </label>
<input
  type="text"
  value={brandConfig?.phone ?? ''}
  onChange={(e) => {
    // 🔥 Permitir números, espacios y guiones exactamente como el usuario escribe
    const value = e.target.value;
    setBrandConfig((prev: any) => ({ ...prev, phone: value }));
  }}
  className={inputClass}
  style={{ color: textColor }}
  placeholder="0412 1234567"
/>
            </div>
          </div>

          {/* MAPA INTERACTIVO Y BUSCADOR DE ZONA */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold opacity-85" style={{ color: textColor }}>
                Ajusta tu Pin en el Mapa *
              </label>
              <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400">
                {brandConfig?.latitude && brandConfig?.longitude 
                  ? `Lat: ${brandConfig.latitude.toFixed(4)}, Lng: ${brandConfig.longitude.toFixed(4)}` 
                  : 'Sin coordenadas fijas'}
              </span>
            </div>
            
            <div 
              ref={mapContainerRef} 
              className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
              style={{ height: '250px', width: '100%', minHeight: '250px' }}
            >
              {renderMap}
            </div>
          </div>

          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold opacity-85" style={{ color: textColor }}>
                Zona o Ciudad Seleccionada *
              </label>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loadingGps}
                className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 text-slate-700 dark:text-slate-300 font-bold px-3 py-1 rounded-xl transition flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <span>{loadingGps ? 'Localizando GPS...' : 'Usar mi GPS actual'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ej. Guatire, Miranda, Caracas..."
                value={searchingQuery}
                onChange={(e) => handleSearchLocation(e.target.value)}
                className={inputClass}
                style={{ color: textColor }}
              />
              {isSearching && (
                <span className="absolute right-4 top-3 text-xs text-orange-600 animate-pulse font-bold">Buscando...</span>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600 transition border-b border-slate-100 dark:border-slate-800/60 last:border-none cursor-pointer"
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Dirección Exacta o Referencia
            </label>
            <textarea
              rows={2}
              value={brandConfig?.address || ''}
              onChange={(e) => setBrandConfig((prev: any) => ({ ...prev, address: e.target.value }))}
              className={`${inputClass} resize-none`}
              style={{ color: textColor }}
              placeholder="Calle, Edificio/Local, Nivel..."
            />
          </div>

          {/* Selector de Monedas */}
          <div>
            <label className="block text-xs font-semibold opacity-85 mb-1.5" style={{ color: textColor }}>
              Monedas Aceptadas
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CURRENCIES.map((cur) => {
                const isSelected = selectedCurrencies.includes(cur.value);
                return (
                  <button
                    key={cur.value}
                    type="button"
                    onClick={() => handleCurrencyToggle(cur.value)}
                    className="py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 shadow-sm"
                    style={{
                      backgroundColor: isSelected ? 'var(--color-primary, #f97316)' : cardBg,
                      borderColor: isSelected ? 'var(--color-primary, #f97316)' : cardBorder,
                      color: isSelected ? '#ffffff' : textColor,
                    }}
                  >
                    <span>{cur.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🔥🔥🔥 NUEVA SECCIÓN: INFORMACIÓN ADICIONAL (CAMPOS DINÁMICOS) 🔥🔥🔥 */}
          <div className="space-y-3 pt-4 border-t" style={{ borderColor: cardBorder }}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold" style={{ color: textColor }}>
                  Información Adicional
                </h4>
                <p className="text-[10px] opacity-70" style={{ color: textColor }}>
                  Añade información extra que quieras mostrar en tu tienda (garantía, tiempos, políticas, etc.)
                </p>
              </div>
              <button
                type="button"
                onClick={addCustomField}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80"
                style={{ color: textColor, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: cardBorder }}
              >
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Añadir Campo
                </span>
              </button>
            </div>

            {(!brandConfig?.customFields || brandConfig.customFields.length === 0) ? (
              <div 
                className="p-4 rounded-xl border border-dashed text-center text-xs opacity-60"
                style={{ borderColor: cardBorder, color: textColor }}
              >
                <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: textColor }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No hay campos adicionales configurados.</p>
                <p className="text-[9px] opacity-50 mt-1">Agrega información como: Garantía, Tiempos de entrega, Políticas, etc.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {brandConfig.customFields.map((field: any, index: number) => (
                  <CustomFieldItem
                    key={index}
                    field={field}
                    index={index}
                    onFieldChange={handleCustomFieldChange}
                    onRemoveField={removeCustomField}
                    cardBorder={cardBorder}
                    itemBg="rgba(255,255,255,0.03)"
                    textColor={textColor}
                    inputClass={inputClass}
                  />
                ))}
              </div>
            )}

            {brandConfig?.customFields && brandConfig.customFields.length > 0 && (
              <div className="pt-2">
                <p className="text-[9px] opacity-40" style={{ color: textColor }}>
                  {brandConfig.customFields.length} campo{brandConfig.customFields.length !== 1 ? 's' : ''} configurado{brandConfig.customFields.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Redes Sociales unificadas con SOCIAL_NETWORKS_CONFIG */}
      <div 
        className="backdrop-blur-sm border p-6 rounded-3xl space-y-4 shadow-lg transition-all"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        <div className="border-b border-black/5 dark:border-white/10 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
              Redes Sociales
            </h3>
            <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
              Escribe solo tu usuario o slug (el sistema completa la URL automáticamente).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
          {SOCIAL_NETWORKS_CONFIG?.map((net: any) => (
            <div 
              key={net.key} 
              className="bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-black/10 dark:border-white/15 space-y-2 transition shadow-xs"
            >
              {/* Cabecera de la red social */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2" style={{ color: textColor }}>
                  {getSocialIcon(net.key)}
                  <span className="font-bold text-xs">{net.name}</span>
                </div>
                <span className="text-[10px] font-mono opacity-50 truncate max-w-[150px]" style={{ color: textColor }}>
                  {net.baseUrl}
                </span>
              </div>
              
              {/* Input completamente libre para escribir y visualizar */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={net.placeholder}
                  value={brandConfig?.[net.key] || ''}
                  onChange={(e) => {
                    const cleanVal = e.target.value.trim();
                    setBrandConfig((prev: any) => ({
                      ...prev,
                      [net.key]: cleanVal
                    }));
                    if (typeof handleSocialChange === 'function') {
                      handleSocialChange(net.key, cleanVal);
                    }
                  }}
                  className="w-full bg-black/10 dark:bg-white/10 px-3.5 py-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-orange-500 font-medium transition"
                  style={{ color: textColor }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});