// ============================================================
// ARCHIVO: components/LocationButton.tsx
// Botón de ubicación siempre disponible. Reemplaza la necesidad
// de que el banner sea la única entrada. Hereda theme.
// ============================================================
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X, ChevronDown, Loader2, Check, Monitor } from 'lucide-react';
import { useLocationContext } from '@/app/context/LocationContext';

interface Zone {
  city: string;
  state: string;
  count: number;
  latitude: number;
  longitude: number;
}

const ZONES_CACHE_KEY = 'facilito_zones_cache_v1';
const ZONES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

function loadCachedZones(): Zone[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ZONES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > ZONES_CACHE_TTL_MS) return null;
    return Array.isArray(parsed.zones) ? parsed.zones : null;
  } catch {
    return null;
  }
}

function saveCachedZones(zones: Zone[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ZONES_CACHE_KEY, JSON.stringify({ ts: Date.now(), zones }));
  } catch {
    // ignorar
  }
}

interface LocationButtonProps {
  compact?: boolean;
  isLight?: boolean;
  textColor?: string;
  mutedTextColor?: string;
  borderColor?: string;
  hoverBg?: string;
  dropdownBg?: string;
}

export default function LocationButton({
  compact = false,
  isLight = false,
  textColor,
  mutedTextColor,
  borderColor,
  hoverBg,
  dropdownBg,
}: LocationButtonProps) {
      const {
    location,
    isRequesting,
    isSyncing,
    persistenceMode,
    requestBrowserLocation,
    setManualLocation,
    clearLocation,
  } = useLocationContext();

  // Clases heredadas del header (con fallbacks coherentes)
  const resolvedTextColor = textColor ?? (isLight ? 'text-slate-900' : 'text-white');
  const resolvedMutedColor = mutedTextColor ?? (isLight ? 'text-slate-600' : 'text-slate-300');
  const resolvedBorderColor = borderColor ?? (isLight ? 'border-slate-200' : 'border-white/10');
  const resolvedHoverBg = hoverBg ?? (isLight ? 'hover:bg-black/5' : 'hover:bg-white/5');
  // 🔥 Estilo de fondo del dropdown: hereda el --bg-color del sitio
  // (matchea el fondo de la home, NO el secondary del palette).
  // Si el consumidor pasa `dropdownBg`, se respeta.
  const resolvedDropdownStyle = {
    backgroundColor:
      dropdownBg ||
      (isLight
        ? '#ffffff'
        : 'color-mix(in srgb, var(--bg-color, #0b0f19) 98%, transparent)'),
    borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    color: isLight ? '#0f172a' : '#f1f5f9',
  };

  const [isOpen, setIsOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>(() => loadCachedZones() ?? []);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Cargar zonas reales (solo si no hay caché fresca)
  useEffect(() => {
    if (zones.length > 0) return;

    let cancelled = false;
    setIsLoadingZones(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/geo/zones`)
      .then((r) => (r.ok ? r.json() : { zones: [] }))
      .then((data) => {
        if (cancelled) return;
        const list: Zone[] = Array.isArray(data?.zones) ? data.zones : [];
        setZones(list);
        if (list.length > 0) saveCachedZones(list);
      })
      .catch((err) => console.error('[LocationButton] Error cargando zonas:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerrar al click afuera
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  const zoneLabel =
    location?.zone || location?.city || (location ? 'Tu zona' : null);

  const handleUseGps = async () => {
    await requestBrowserLocation();
    setIsOpen(false);
  };

  const handlePickZone = (zone: Zone) => {
    setManualLocation({
      latitude: zone.latitude,
      longitude: zone.longitude,
      city: zone.city,
      zone: undefined,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    clearLocation();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-xl border ${resolvedBorderColor} ${resolvedHoverBg} font-bold transition-all cursor-pointer ${resolvedTextColor} ${
          compact ? 'px-2.5 py-2 text-[10px]' : 'px-3 py-2 text-xs'
        }`}
        style={{
          backgroundColor: isLight ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.25)',
        }}
        title={location ? `Ubicación: ${zoneLabel}` : 'Activar ubicación'}
      >
        <MapPin size={compact ? 12 : 13} strokeWidth={2.5} style={{ color: 'var(--accent-color, #ea580c)' }} />
        <span className="max-w-[110px] truncate">
          {location ? zoneLabel : 'Cerca de mí'}
        </span>
        <ChevronDown
          size={compact ? 10 : 11}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
          style={resolvedDropdownStyle}
        >
          {/* Encabezado */}
          <div
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${resolvedMutedColor} ${isLight ? 'border-slate-200' : 'border-white/10'}`}
          >
            {location ? `Ubicación actual: ${zoneLabel}` : 'Elige tu zona'}
          </div>

          {/* Botón "Usar mi ubicación" */}
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isRequesting}
            className={`w-full text-left px-3 py-2.5 text-xs font-bold ${resolvedHoverBg} transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait ${resolvedTextColor}`}
          >
            {isRequesting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Obteniendo...
              </>
            ) : (
              <>
                <MapPin size={12} strokeWidth={2.5} style={{ color: 'var(--accent-color, #ea580c)' }} />
                Usar mi ubicación actual
              </>
            )}
          </button>

          {/* Divisor */}
          <div className={`h-px mx-3 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />

          {/* Lista de zonas reales */}
          <ul className="max-h-56 overflow-y-auto">
            {isLoadingZones && zones.length === 0 ? (
              <li className={`px-3 py-3 text-xs flex items-center gap-2 ${resolvedMutedColor}`}>
                <Loader2 size={11} className="animate-spin" />
                Cargando zonas...
              </li>
            ) : zones.length === 0 ? (
              <li className={`px-3 py-3 text-xs ${resolvedMutedColor}`}>
                No hay zonas disponibles todavía.
              </li>
            ) : (
              zones.map((zone) => (
                <li key={zone.city}>
                  <button
                    type="button"
                    onClick={() => handlePickZone(zone)}
                    className={`w-full text-left px-3 py-2 text-xs font-medium ${resolvedHoverBg} transition ${resolvedTextColor} flex items-center justify-between gap-2 ${
                      zoneLabel === zone.city ? 'font-bold' : ''
                    }`}
                  >
                    <span className="truncate">{zone.city}</span>
                    <span className={`text-[10px] opacity-60 shrink-0`}>
                      {zone.count} {zone.count === 1 ? 'tienda' : 'tiendas'}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Botón quitar ubicación (solo si hay) */}
          {location && (
            <>
              <div
                className="h-px mx-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              />
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-left px-3 py-2.5 text-xs font-bold hover:bg-white/10 transition flex items-center gap-2 text-rose-400"
              >
                <X size={12} strokeWidth={2.5} />
                Quitar ubicación y ver todo
              </button>
            </>
          )}

          {/* Footer: dónde se guarda la ubicación */}
          <div
            className="h-px mx-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          />
          <div className={`px-3 py-2 flex items-center gap-2 text-[10px] ${resolvedMutedColor} opacity-80`}>
            {isSyncing ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : persistenceMode === 'account' ? (
              <>
                <Check
                  size={11}
                  strokeWidth={2.5}
                  style={{ color: 'var(--accent-color, #ea580c)' }}
                />
                <span>Guardada en tu cuenta</span>
              </>
            ) : (
              <>
                <Monitor size={11} strokeWidth={2.5} />
                <span>Solo en este dispositivo</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}