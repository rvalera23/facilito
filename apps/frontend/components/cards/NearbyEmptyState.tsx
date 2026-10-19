// ============================================================
// ARCHIVO: components/cards/NearbyEmptyState.tsx
// Estado vacío cuando el usuario está en modo cercanía y no
// hay resultados en su zona. Le ofrece quitarla o cambiarla.
// ============================================================
'use client';

import React from 'react';
import { MapPinOff, X, Compass } from 'lucide-react';
import { useLocationContext } from '@/app/context/LocationContext';

interface NearbyEmptyStateProps {
  itemLabel: string; // 'tiendas', 'productos', 'servicios', 'profesionales'
  primaryColor: string;
  textColorClass: string;
  mutedTextColorClass: string;
  onOpenChangeZone?: () => void; // opcional: si el botón "cambiar zona" está disponible
}

export default function NearbyEmptyState({
  itemLabel,
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  onOpenChangeZone,
}: NearbyEmptyStateProps) {
  const { location, clearLocation } = useLocationContext();
  const zone = location?.city || location?.zone || 'tu zona';

  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: `${primaryColor}15`,
          color: primaryColor,
        }}
      >
        <MapPinOff size={26} strokeWidth={2} />
      </div>

      <h3 className={`text-lg font-bold mb-1.5 ${textColorClass}`}>
        No encontramos {itemLabel} en {zone}
      </h3>
      <p className={`text-sm max-w-md ${mutedTextColorClass} leading-relaxed`}>
        Prueba ampliando el radio de búsqueda o cambiando de zona. También puedes
        quitar la ubicación y ver todo lo disponible.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={() => clearLocation()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition hover:scale-105"
          style={{
            borderColor: `${primaryColor}40`,
            color: primaryColor,
          }}
        >
          <X size={13} strokeWidth={2.5} />
          Quitar ubicación y ver todo
        </button>

        {onOpenChangeZone && (
          <button
            type="button"
            onClick={onOpenChangeZone}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition hover:scale-105"
            style={{
              backgroundColor: primaryColor,
              color: '#ffffff',
            }}
          >
            <Compass size={13} strokeWidth={2.5} />
            Cambiar zona
          </button>
        )}
      </div>
    </div>
  );
}