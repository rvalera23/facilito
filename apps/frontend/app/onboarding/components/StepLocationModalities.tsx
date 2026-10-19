'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { searchAddress, reverseGeocode } from '@/lib/geo-search';

const LocationMap = dynamic(() => import('./LocationMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-transparent border-2 border-current/10 rounded-2xl flex items-center justify-center text-xs text-current/40">Cargando mapa interactivo...</div>
});


interface StepLocationModalitiesProps {
  data: {
    modalities: string;
    state: string;
    municipality: string;
    city: string;
    locationType: string;
    street: string;
    houseNumber: string;
    reference: string;
    address: string;
    deliveryFee: string;
    latitude: number | null;
    longitude: number | null;
  };
  update: (fields: Partial<StepLocationModalitiesProps['data']>) => void;
  next: () => void;
  prev: () => void;
}

export default function StepLocationModalities({ data, update, next, prev }: StepLocationModalitiesProps) {
  const [loadingGps, setLoadingGps] = useState(false);
  const [searchingQuery, setSearchingQuery] = useState(data.city || data.address || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchLocation = (query: string) => {
    setSearchingQuery(query);
    update({ city: query });

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
    update({ state, municipality, city: finalName, latitude: lat, longitude: lon });
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
        city: result.display_name,
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
    if (!searchingQuery.trim() || searchingQuery.includes('Lat:')) {
      alert('Por favor introduce o selecciona una zona geográfica base válida.');
      return;
    }

    // 🔥 OBTENER LA MODALIDAD DESDE data.modalities (viene del paso anterior)
    const modality = data.modalities || 'local';
    const hasPhysicalStore = modality === 'local' || modality === 'hybrid';

    let fullStructuredAddress = '';
    if (!hasPhysicalStore) {
      const modalityLabel = modality === 'remote' ? '100% Remoto' : 'Solo Delivery';
      fullStructuredAddress = `[${modalityLabel}] Zona de Operación: ${searchingQuery}`;
    } else {
      const modalityLabel = modality === 'hybrid' ? 'Híbrido (Local + Envio)' : 'Local Físico';
      fullStructuredAddress = `[${modalityLabel}] Zona: ${searchingQuery}, Calle/Vía: ${data.street || 'N/A'}, Nro: ${data.houseNumber || 'N/A'}, Ref: ${data.reference || 'N/A'}`;
    }

    update({ address: fullStructuredAddress });
    next();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn text-current transition-colors duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-current transition-colors duration-500">
          Ubicación y Cobertura
        </h1>
        <p className="text-xs text-current/60 transition-colors duration-500">
          Paso 2: Ajusta tu punto exacto en el mapa y define tu ubicación.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-xs font-bold tracking-wider text-current/80 transition-colors duration-500">
            Ajusta tu Pin en el Mapa (Haz clic para moverlo) *
          </label>
          <span 
            className="text-[10px] font-mono"
            style={{ color: 'var(--accent-color, #f97316)' }}
          >
            {data.latitude && data.longitude ? `Lat: ${data.latitude.toFixed(4)}, Lng: ${data.longitude.toFixed(4)}` : 'Sin coordenadas fijas'}
          </span>
        </div>
        <LocationMap lat={data.latitude} lng={data.longitude} onLocationSelect={handleMapPointSelect} />
      </div>

      <div className="space-y-3 relative">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold tracking-wider text-current/80 transition-colors duration-500">
            Buscar Zona, Municipio o Urbanización *
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
            placeholder="Ej. Guatire, Miranda, Caracas..."
            value={searchingQuery}
            onChange={(e) => handleSearchLocation(e.target.value)}
            className="w-full bg-transparent border-2 border-current/10 rounded-2xl px-4 py-2.5 text-sm focus:ring-2 outline-none text-current transition placeholder:text-current/30"
            style={{ '--tw-ring-color': 'var(--accent-color, #f97316)', borderColor: searchingQuery ? 'var(--accent-color, #f97316)' : undefined } as React.CSSProperties}
          />
          {isSearching && (
            <span 
              className="absolute right-4 top-3.5 text-xs animate-pulse font-bold"
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

      {/* 🔥 DATOS DE DIRECCIÓN FÍSICA - SIEMPRE VISIBLE */}
      <div className="space-y-3 p-4 rounded-2xl border border-current/10">
        <p className="text-xs font-bold text-current/70">Datos de tu ubicación</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-current/80 mb-1">Calle / Avenida</label>
            <input
              type="text"
              value={data.street || ''}
              onChange={(e) => update({ street: e.target.value })}
              className="w-full bg-transparent border border-current/10 rounded-xl px-3 py-2 text-xs focus:ring-2 outline-none text-current transition placeholder:text-current/30"
              placeholder="Calle Principal"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-current/80 mb-1">Número</label>
            <input
              type="text"
              value={data.houseNumber || ''}
              onChange={(e) => update({ houseNumber: e.target.value })}
              className="w-full bg-transparent border border-current/10 rounded-xl px-3 py-2 text-xs focus:ring-2 outline-none text-current transition placeholder:text-current/30"
              placeholder="Nro."
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold tracking-wider text-current/80 mb-1">Referencia</label>
          <input
            type="text"
            value={data.reference || ''}
            onChange={(e) => update({ reference: e.target.value })}
            className="w-full bg-transparent border border-current/10 rounded-xl px-3 py-2 text-xs focus:ring-2 outline-none text-current transition placeholder:text-current/30"
            placeholder="Cerca de... (opcional)"
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-4 border-t border-current/10">
        <button
          type="button"
          onClick={prev}
          className="w-1/3 bg-current/15 hover:bg-current/20 text-current font-bold py-4 rounded-2xl transition text-sm cursor-pointer border border-current/15"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          className="w-2/3 text-white font-bold py-4 rounded-2xl shadow-lg transition text-sm cursor-pointer"
          style={{ 
            backgroundColor: 'var(--accent-color, #f97316)', 
            boxShadow: '0 10px 25px -5px var(--accent-color, #f97316)50' 
          }}
        >
          Siguiente Paso →
        </button>
      </div>
    </form>
  );
}