// ==========================================
// ARCHIVO: app/onboarding/components/StepBuyerGeneralInfo.tsx
// ==========================================
'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { searchAddress, reverseGeocode } from '@/lib/geo-search';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';


const LocationMap = dynamic(() => import('./LocationMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-transparent border-2 border-white/10 rounded-2xl flex items-center justify-center text-xs text-current/40">Cargando mapa interactivo...</div>
});


const BUYER_CURRENCIES = [
  { value: 'USD', label: 'Dólares ($)' },
  { value: 'VES', label: 'Bolívares (Bs.)' },
  { value: 'EUR', label: 'Euros (€)' },
  { value: 'CRYPTO', label: 'USDT' },
];

// 🔥 LISTA DE PAÍSES CON CÓDIGOS DE ÁREA Y BANDERAS - CON CLAVES ÚNICAS
const COUNTRIES = [
  { name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', format: '(###) ###-####', key: 've' },
  { name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####', key: 'us' },
  { name: 'Canadá', dialCode: '+1', flag: '🇨🇦', format: '(###) ###-####', key: 'ca' },
  { name: 'México', dialCode: '+52', flag: '🇲🇽', format: '## #### ####', key: 'mx' },
  { name: 'Argentina', dialCode: '+54', flag: '🇦🇷', format: '### ###-####', key: 'ar' },
  { name: 'Colombia', dialCode: '+57', flag: '🇨🇴', format: '### ### ####', key: 'co' },
  { name: 'España', dialCode: '+34', flag: '🇪🇸', format: '### ### ###', key: 'es' },
  { name: 'Chile', dialCode: '+56', flag: '🇨🇱', format: '### ### ####', key: 'cl' },
  { name: 'Perú', dialCode: '+51', flag: '🇵🇪', format: '### ### ###', key: 'pe' },
  { name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', format: '## ### ####', key: 'ec' },
  { name: 'Panamá', dialCode: '+507', flag: '🇵🇦', format: '### ####', key: 'pa' },
  { name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', format: '#### ####', key: 'cr' },
];

interface StepBuyerGeneralInfoProps {
  data: {
    userId?: string;
    fullName: string;
    phone: string;
    deliveryCity: string;
    preferredCurrency: string;
    state: string;
    municipality: string;
    latitude: number | null;
    longitude: number | null;
    idNumber?: string;
    idType?: 'V' | 'E' | 'J' | 'G';
    pagoMovilSameAsProfile?: boolean;
  };
  update: (fields: Partial<StepBuyerGeneralInfoProps['data']>) => void;
  next: () => void;
  prev?: () => void;
}

export default function StepBuyerGeneralInfo({ data, update, next, prev }: StepBuyerGeneralInfoProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  // 🔥 Detectar si el fondo es claro u oscuro (mismo patrón que StepContactAccount)
  const [isLight, setIsLight] = useState<boolean>(false);
  useEffect(() => {
    const checkBackgroundBrightness = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setIsLight(brightness > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  const [selectedCurrency, setSelectedCurrency] = useState(data.preferredCurrency || '');
    const [loadingGps, setLoadingGps] = useState(false);
  const [searchingQuery, setSearchingQuery] = useState(data.deliveryCity || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 ESTADO LOCAL PARA EL TELÉFONO CON FORMATO
  const [countryCode, setCountryCode] = useState('+58');
  const [localPhone, setLocalPhone] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const isInternalUpdate = useRef(false);

  // 🔥 ESTADO LOCAL PARA CÉDULA + FLAG PAGO MÓVIL
  const [idType, setIdType] = useState<'V' | 'E' | 'J' | 'G'>(
    (data.idType as any) || 'V'
  );
  const [idNumber, setIdNumber] = useState<string>(data.idNumber || '');
  const [pagoMovilSameAsProfile, setPagoMovilSameAsProfile] = useState<boolean>(
    Boolean(data.pagoMovilSameAsProfile)
  );

  useEffect(() => {
    if (!data.fullName && (data as any).name) {
      update({ fullName: (data as any).name });
    }
  }, [data, update]);

  // 🔥 EFECTO PARA SINCRONIZAR EL TELÉFONO CON LA PROP
  useEffect(() => {
    if (!isInternalUpdate.current && data.phone) {
      const match = data.phone.match(/^(\+\d+)\s*(.*)/);
      if (match) {
        const code = match[1];
        const number = match[2].replace(/\s/g, '');
        const countryExists = COUNTRIES.some(c => c.dialCode === code);
        
        if (countryExists) {
          setCountryCode(code);
          setLocalPhone(number);
          const formatted = formatPhoneNumber(number, code);
          setDisplayPhone(formatted);
          return;
        }
      }
      
      const digits = data.phone.replace(/\D/g, '');
      if (digits) {
        setLocalPhone(digits);
        const formatted = formatPhoneNumber(digits, countryCode);
        setDisplayPhone(formatted);
      }
    }
  }, [data.phone, countryCode]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 FUNCIÓN PARA FORMATEAR EL NÚMERO SEGÚN EL PAÍS
  const formatPhoneNumber = (value: string, dialCode: string) => {
    const digits = value.replace(/\D/g, '');
    const country = COUNTRIES.find(c => c.dialCode === dialCode);
    if (!country) return digits;

    const format = country.format;
    let formatted = '';
    let digitIndex = 0;

    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
      if (format[i] === '#') {
        formatted += digits[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }

    return formatted;
  };

  // 🔥 MANEJAR CAMBIO DE PAÍS
  const handleCountryChange = (dialCode: string) => {
    setCountryCode(dialCode);
    setLocalPhone('');
    setDisplayPhone('');
    isInternalUpdate.current = true;
    update({ phone: dialCode });
    setTimeout(() => { isInternalUpdate.current = false; }, 0);
  };

  // 🔥 MANEJAR CAMBIO DE NÚMERO DE TELÉFONO
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setLocalPhone(digits);
    const formatted = formatPhoneNumber(digits, countryCode);
    setDisplayPhone(formatted);
    
    const fullPhone = `${countryCode} ${digits}`.trim();
    update({ phone: fullPhone });
  };

  const handleSearchLocation = (query: string) => {
    setSearchingQuery(query);
    update({ deliveryCity: query });

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
          })),
        );
      } catch (err) {
        console.error('Error en searchAddress:', err);
        setSuggestions([]);
      }
      setIsSearching(false);
    }, 300);
  };

  const handleSelectSuggestion = (item: any) => {
    const state = item.address?.state || item.state || 'Miranda';
    const municipality = item.address?.county || item.address?.municipality || item.municipality || 'Municipio';
    const city = item.address?.city || item.address?.town || item.city || item.display_name;
    const lat = item.lat ? parseFloat(item.lat) : 10.4795;
    const lon = item.lon ? parseFloat(item.lon) : -66.5329;

    const finalName = item.display_name || city;
    setSearchingQuery(finalName);
    update({ state, municipality, deliveryCity: finalName, latitude: lat, longitude: lon });
    setSuggestions([]);
  };

  const handleMapPointSelect = async (lat: number, lng: number) => {
    update({ latitude: lat, longitude: lng });
    setSearchingQuery('Buscando dirección legible...');

    try {
      const result = await reverseGeocode(lat, lng);
      setSearchingQuery(result.display_name);
      update({
        state: result.state || '',
        municipality: result.municipality || '',
        deliveryCity: result.display_name,
      });
    } catch (err) {
      console.error('Error en reverseGeocode:', err);
      setSearchingQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleGetLocation = () => {
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
      (error) => {
        setLoadingGps(false);
        alert('No pudimos obtener tu ubicación GPS automática.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.fullName?.trim()) {
      alert('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!data.phone?.trim()) {
      alert('Por favor ingresa tu número de teléfono.');
      return;
    }
    if (!selectedCurrency) {
      alert('Por favor selecciona una moneda preferida.');
      return;
    }
    if (!idNumber.trim() || idNumber.replace(/\D/g, '').length < 6) {
      alert('Por favor ingresa una cédula válida (mínimo 6 dígitos).');
      return;
    }
    if (!searchingQuery.trim() || searchingQuery.includes('Lat:')) {
      alert('Por introduce o selecciona una zona de entrega válida.');
      return;
    }

    setIsSubmitting(true);

    update({ 
      fullName: data.fullName,
      phone: data.phone,
      deliveryCity: searchingQuery,
      preferredCurrency: selectedCurrency,
      state: data.state || 'Miranda',
      municipality: data.municipality || 'Municipio Zamora',
      latitude: data.latitude,
      longitude: data.longitude,
      idNumber: idNumber || '',
      idType: idType,
      pagoMovilSameAsProfile: pagoMovilSameAsProfile,
    });

    setIsSubmitting(false);
    next();
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fadeIn space-y-6 text-current">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-black tracking-tight text-current">
          Configura tu Perfil de Comprador
        </h1>
        <p className="text-current/60 text-xs">
          Paso 1: Información básica de contacto, moneda y zona de entrega general.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-4">
                   <div className="space-y-1"></div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-current/80 mb-1.5">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Robert Pérez"
              value={data.fullName || ''}
              onChange={(e) => update({ fullName: e.target.value })}
              className="w-full bg-transparent border-2 border-current/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 outline-none text-current transition placeholder:text-current/30"
              style={{ '--tw-ring-color': 'var(--accent-color, #f97316)', borderColor: data.fullName ? 'var(--accent-color, #f97316)' : undefined } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-current/80 mb-1.5">
              Número de Teléfono / WhatsApp *
            </label>
            
            {/* 🔥 SELECTOR DE CÓDIGO DE PAÍS CON ESTILO Y BANDERAS - CLAVES ÚNICAS */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-[140px]">
                <SearchableDropdown
                  value={countryCode}
                  onChange={handleCountryChange}
                  options={COUNTRIES.map((c) => ({
                    value: c.dialCode,
                    label: `${c.flag} ${c.dialCode}`,
                  }))}
                  placeholder="País"
                  searchPlaceholder="Buscar país..."
                  emptyMessage="No hay países"
                  primary="var(--accent-color, #f97316)"
                  textColor={isLight ? '#0f172a' : '#ffffff'}
                  isDarkBg={!isLight}
                  borderColor={isLight ? 'rgba(148,163,184,0.4)' : 'rgba(255,255,255,0.15)'}
                  searchable={true}
                  footerLabel={(n) => `${n} países`}
                />
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  required
                  placeholder="Ej. 412 1234567"
                  value={displayPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full bg-transparent border-2 border-current/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 outline-none text-current transition placeholder:text-current/30"
                  style={{ 
                    '--tw-ring-color': 'var(--accent-color, #f97316)', 
                    borderColor: displayPhone ? 'var(--accent-color, #f97316)' : undefined 
                  } as React.CSSProperties}
                  maxLength={20}
                />
              </div>
            </div>

            {/* 🔥 INDICADOR DEL FORMATO ACTUAL */}
            <div className="flex justify-end mt-1">
              <span className="text-[9px] text-current/30">
                Formato: {COUNTRIES.find(c => c.dialCode === countryCode)?.format || '(###) ###-####'}
              </span>
            </div>
          </div>
          {/* 🔥 CÉDULA + FLAG PAGO MÓVIL */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-current/80 mb-1.5">
              Cédula de Identidad *
            </label>
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-[100px]">
                <SearchableDropdown
                  value={idType}
                  onChange={(val) => setIdType(val as 'V' | 'E' | 'J' | 'G')}
                  options={[
                    { value: 'V', label: 'V' },
                    { value: 'E', label: 'E' },
                    { value: 'J', label: 'J' },
                    { value: 'G', label: 'G' },
                  ]}
                  placeholder="Tipo"
                  primary="var(--accent-color, #f97316)"
                  textColor={isLight ? '#0f172a' : '#ffffff'}
                  isDarkBg={!isLight}
                  borderColor={isLight ? 'rgba(148,163,184,0.4)' : 'rgba(255,255,255,0.15)'}
                  searchable={false}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="Ej. 12345678"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="w-full bg-transparent border-2 border-current/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 outline-none text-current transition placeholder:text-current/30"
                  style={{
                    '--tw-ring-color': 'var(--accent-color, #f97316)',
                    borderColor: idNumber ? 'var(--accent-color, #f97316)' : undefined,
                  } as React.CSSProperties}
                  maxLength={9}
                />
              </div>
            </div>
            <p className="text-[9px] text-current/40 mt-1">
              Solo números (sin puntos ni guiones).
            </p>
          </div>

          {/* 🔥 CHECK PAGO MÓVIL */}
          <label className="flex items-start gap-3 p-3 rounded-2xl border-2 border-current/10 cursor-pointer transition hover:bg-current/5">
                      <input
              type="checkbox"
              checked={pagoMovilSameAsProfile}
              onChange={(e) => setPagoMovilSameAsProfile(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer flex-shrink-0"
              style={{ accentColor: 'var(--accent-color, #f97316)' }}
            />
            <div className="flex-1">
              <span className="block text-xs font-bold text-current">
                Usar estos mismos datos para Pago Móvil Personal
              </span>
              <span className="block text-[10px] text-current/60 mt-0.5">
                Al comprar con Pago Móvil, tu teléfono y cédula se completarán automáticamente.
              </span>
            </div>
          </label>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold tracking-wider text-current/85">
                Ajusta tu Pin de Macro-Ubicación en el Mapa (Haz clic para moverlo) *
              </label>
              <span 
                className="text-[10px] font-mono transition-colors duration-500"
                style={{ color: 'var(--accent-color, #f97316)' }}
              >
                {data.latitude && data.longitude ? `Lat: ${data.latitude.toFixed(4)}, Lng: ${data.longitude.toFixed(4)}` : 'Sin coordenadas fijas'}
              </span>
            </div>
            <LocationMap lat={data.latitude} lng={data.longitude} onLocationSelect={handleMapPointSelect} />
          </div>

          <div className="space-y-3 relative pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold tracking-wider text-current/80">
                Ciudad / Zona de Entrega Frecuente *
              </label>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loadingGps}
                className="text-xs bg-transparent text-current/80 font-bold px-3 py-1.5 rounded-2xl transition flex items-center space-x-1.5 border border-current/10 hover:bg-current/5 cursor-pointer"
              >
                <span>{loadingGps ? 'Localizando GPS...' : 'Usar mi GPS actual'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ej. Guatire, Miranda, Caracas..."
                value={searchingQuery}
                onChange={(e) => handleSearchLocation(e.target.value)}
                className="w-full bg-transparent border-2 border-current/10 rounded-2xl px-4 py-3 text-sm outline-none text-current transition focus:ring-2 placeholder:text-current/30"
                style={{ '--tw-ring-color': 'var(--accent-color, #f97316)', borderColor: searchingQuery ? 'var(--accent-color, #f97316)' : undefined } as React.CSSProperties}
              />
              {isSearching && (
                <span 
                  className="absolute right-4 top-3.5 text-xs animate-pulse font-bold transition-colors duration-500"
                  style={{ color: 'var(--accent-color, #f97316)' }}
                >
                  Buscando...
                </span>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-current/5 backdrop-blur-xl border border-current/10 rounded-2xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-4 py-2.5 text-xs text-current/80 transition border-b border-current/5 last:border-none cursor-pointer hover:bg-current/10 hover:text-current"
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold tracking-wider text-current/80 mb-1.5">
              Moneda Preferida de Pago *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUYER_CURRENCIES.map((cur) => {
                const isSelected = selectedCurrency === cur.value;
                return (
                  <button
                    key={cur.value}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(cur.value);
                      update({ preferredCurrency: cur.value });
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-transparent border-current/10 text-current/80 hover:bg-current/5'
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: 'var(--accent-color, #f97316)', borderColor: 'var(--accent-color, #f97316)' }
                        : {}
                    }
                  >
                    <span>{cur.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-4 border-t border-current/10">
        {prev && (
          <button
            type="button"
            onClick={prev}
            disabled={isSubmitting}
            className="w-1/3 bg-current/15 hover:bg-current/20 text-current font-bold py-4 rounded-2xl transition text-sm cursor-pointer border border-current/15"
          >
            ← Atrás
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${prev ? 'w-2/3' : 'w-full'} text-white font-bold py-4 rounded-2xl shadow-lg transition text-sm cursor-pointer flex items-center justify-center space-x-2 transition-colors duration-500`}
          style={{ 
            backgroundColor: 'var(--accent-color, #f97316)', 
            boxShadow: '0 10px 25px -5px var(--accent-color, #f97316)50' 
          }}
        >
          <span>{isSubmitting ? 'Guardando...' : 'Siguiente Paso →'}</span>
        </button>
      </div>
    </form>
  );
}