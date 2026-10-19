'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/DriversMap.tsx
// Mapa con todos los drivers del tenant. Leaflet + markers.
// ============================================================

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DriverItem } from './DeliveryTab';

// ============================================================
// ICONOS
// ============================================================

function makeDriverIcon(color: string) {
  return L.divIcon({
    html: `
      <div style="
        width:32px; height:32px;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const ICONS = {
  online: makeDriverIcon('#10b981'),
  busy: makeDriverIcon('#f59e0b'),
  paused: makeDriverIcon('#8b5cf6'),
  offline: makeDriverIcon('#94a3b8'),
};

// ============================================================
// COMPONENTE
// ============================================================

interface DriversMapProps {
  drivers: DriverItem[];
  primary: string;
  isDarkBg: boolean;
  textColor: string;
  height?: number;
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points.length]);

  return null;
}

export default function DriversMap({
  drivers,
  primary,
  isDarkBg,
  textColor,
  height = 500,
}: DriversMapProps) {
  // Solo drivers con coords
  const withCoords = useMemo(
    () =>
      drivers.filter(
        (d) =>
          d.currentLat != null &&
          d.currentLng != null &&
          Number.isFinite(Number(d.currentLat)) &&
          Number.isFinite(Number(d.currentLng)),
      ),
    [drivers],
  );

  const points: Array<[number, number]> = useMemo(
    () =>
      withCoords.map((d) => [
        Number(d.currentLat),
        Number(d.currentLng),
      ] as [number, number]),
    [withCoords],
  );

  const initialCenter: [number, number] =
    points.length > 0 ? points[0] : [10.4806, -66.9036];
  const initialZoom = points.length > 0 ? 13 : 11;

  return (
    <div
      className="rounded-2xl overflow-hidden border relative"
      style={{
        height,
        borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {withCoords.length === 0 ? (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            backgroundColor: isDarkBg
              ? 'rgba(255,255,255,0.02)'
              : 'rgba(0,0,0,0.02)',
          }}
        >
          <div className="text-center">
            <p
              className="text-xs opacity-60 font-bold"
              style={{ color: textColor }}
            >
              Sin posiciones disponibles
            </p>
            <p
              className="text-[10px] opacity-40 mt-1"
              style={{ color: textColor }}
            >
              Los drivers aparecerán acá cuando compartan ubicación.
            </p>
          </div>
        </div>
      ) : (
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />

          {withCoords.map((d) => {
            const status = d.status || 'offline';
            const icon = ICONS[status] || ICONS.offline;
            const name = d.user?.name || 'Driver';
            return (
              <Marker
                key={d.id}
                position={[Number(d.currentLat), Number(d.currentLng)]}
                icon={icon}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold">{name}</div>
                    <div className="opacity-70">
                      {d.vehicleType || 'n/d'}
                      {d.vehiclePlate ? ` · ${d.vehiclePlate}` : ''}
                    </div>
                    <div className="opacity-70 capitalize">
                      {status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <FitBounds points={points} />
        </MapContainer>
      )}

      {/* Leyenda flotante — colores del tenant */}
      <div
        className="absolute top-3 left-3 p-2.5 rounded-xl text-[10px] font-bold flex flex-col gap-1.5 border shadow-lg"
        style={{
          backgroundColor: isDarkBg
            ? `${primary}22`
            : `${primary}18`,
          borderColor: `${primary}55`,
          color: textColor,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <LegendRow color="#10b981" label="Online" />
        <LegendRow color="#f59e0b" label="En ruta" />
        <LegendRow color="#8b5cf6" label="Pausa" />
        <LegendRow color="#94a3b8" label="Offline" />
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
