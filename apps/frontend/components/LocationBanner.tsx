// ============================================================
// ARCHIVO: components/LocationBanner.tsx
// Banner de consentimiento para descubrimiento por cercanía.
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, X, Loader2, ChevronDown } from 'lucide-react';
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
  } catch {}
}

interface LocationBannerProps {
  primaryColor: string;
  textColorClass: string;
  mutedTextColorClass: string;
  backgroundCardBg: string;
  isLight?: boolean;
}

export default function LocationBanner({
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  backgroundCardBg,
  isLight = false,
}: LocationBannerProps) {
  const {
    location,
    isRequesting,
    error,
    isBannerDismissed,
    persistenceMode,
    requestBrowserLocation,
    setManualLocation,
    dismissBanner,
  } = useLocationContext();

  const [showManual, setShowManual] = useState(false);
  const [zones, setZones] = useState<Zone[]>(() => loadCachedZones() ?? []);
  const [isLoadingZones, setIsLoadingZones] = useState(false);

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
      .catch((err) => console.error('[LocationBanner] Error cargando zonas:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingZones(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si ya hay ubicación, no mostramos banner.
  if (location) return null;
  // Si fue descartado recientemente, no mostramos.
  if (isBannerDismissed) return null;

  const borderColor = `${primaryColor}30`;
  const isLightLocal = isLight;

  const handleUseGps = async () => {
    const loc = await requestBrowserLocation();
    if (loc) {
      // éxito: el banner desaparece solo porque location ya no es null
    }
  };

  const handlePickZone = (zone: Zone) => {
    setManualLocation({
      latitude: zone.latitude,
      longitude: zone.longitude,
      city: zone.city,
      zone: undefined,
    });
  };

  return (
    <div className="w-full px-6 pt-6 pb-2 relative z-20">
      <div
        className="max-w-7xl mx-auto rounded-2xl border backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl"
        style={{
          backgroundColor: backgroundCardBg,
          borderColor,
          boxShadow: `0 15px 35px -10px ${primaryColor}12`,
        }}
      >
        <div className="flex items-start sm:items-center gap-3 flex-wrap">
          {/* Ícono */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            <MapPin size={16} strokeWidth={2.5} />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-[200px]">
            <p className={`text-[13px] sm:text-sm font-bold ${textColorClass} leading-tight`}>
              ¿Quieres ver lo que está cerca de ti?
            </p>
            <p className={`text-[11px] sm:text-xs ${mutedTextColorClass} mt-0.5`}>
              {persistenceMode === 'account'
                ? 'Se guardará en tu cuenta para no volver a pedirla.'
                : 'Compartimos tu ubicación solo con tu permiso. Puedes desactivarlo cuando quieras.'}
            </p>
            {error && (
              <p className="text-[11px] text-rose-500 mt-1">{error}</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleUseGps}
              disabled={isRequesting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-wait"
              style={{
                backgroundColor: primaryColor,
                color: isLightLocal ? '#030712' : '#ffffff',
              }}
            >
              {isRequesting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Obteniendo...
                </>
              ) : (
                <>
                  <MapPin size={12} strokeWidth={2.5} />
                  Usar mi ubicación
                </>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition hover:scale-105"
                style={{
                  borderColor: `${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                Escribir mi zona
                <ChevronDown size={12} className={`transition-transform ${showManual ? 'rotate-180' : ''}`} />
              </button>

              {showManual && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl z-30 overflow-hidden"
                  style={{
                    backgroundColor: backgroundCardBg,
                    borderColor,
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b"
                       style={{ color: primaryColor, borderColor: `${primaryColor}15` }}>
                    Elige tu zona
                  </div>
                  <ul className="max-h-64 overflow-y-auto">
                    {isLoadingZones && zones.length === 0 ? (
                      <li className={`px-3 py-3 text-xs flex items-center gap-2 ${mutedTextColorClass}`}>
                        <Loader2 size={11} className="animate-spin" />
                        Cargando zonas...
                      </li>
                    ) : zones.length === 0 ? (
                      <li className={`px-3 py-3 text-xs ${mutedTextColorClass}`}>
                        No hay zonas disponibles todavía.
                      </li>
                    ) : (
                      zones.map((zone) => (
                        <li key={zone.city}>
                          <button
                            type="button"
                            onClick={() => handlePickZone(zone)}
                            className={`w-full text-left px-3 py-2 text-xs font-medium hover:opacity-80 transition ${textColorClass} flex items-center justify-between gap-2`}
                          >
                            <span className="truncate">{zone.city}</span>
                            <span className="text-[10px] opacity-50 shrink-0">
                              {zone.count} {zone.count === 1 ? 'tienda' : 'tiendas'}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={dismissBanner}
              className="inline-flex items-center gap-1 px-2 py-2 rounded-xl text-[11px] font-semibold opacity-70 hover:opacity-100 transition"
              style={{ color: mutedTextColorClass }}
              title="Ocultar por 7 días"
            >
              Ver todo
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}