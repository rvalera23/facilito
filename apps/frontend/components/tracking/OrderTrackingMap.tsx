'use client';

// ============================================================
// ARCHIVO: apps/frontend/components/tracking/OrderTrackingMap.tsx
// Mapa Leaflet para tracking de una orden.
// Muestra driver, destino y polilínea.
// ============================================================

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icono custom del driver (SVG inline para no depender de imágenes)
const driverIcon = L.divIcon({
  html: `
    <div style="
      width:36px; height:36px;
      background:#10b981;
      border:3px solid white;
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="15" cy="5" r="1"/>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Icono custom del destino
const destIcon = L.divIcon({
  html: `
    <div style="
      width:32px; height:32px;
      background:#ef4444;
      border:3px solid white;
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface OrderTrackingMapProps {
  /** Posición actual del driver. Si null, no se muestra el marker. */
  driverPosition: { lat: number; lng: number } | null;
  /** Posición del destino. */
  destinationPosition: { lat: number; lng: number } | null;
  /** Altura del mapa en px. Default 320. */
  height?: number;
  /** Nombre del driver (para el popup). */
  driverName?: string | null;
}

/**
 * Subcomponente interno: mueve el mapa cuando cambia la posición del driver.
 */
function MapRecenter({
  driverPosition,
  destinationPosition,
}: {
  driverPosition: { lat: number; lng: number } | null;
  destinationPosition: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (driverPosition) {
      points.push([driverPosition.lat, driverPosition.lng]);
    }
    if (destinationPosition) {
      points.push([destinationPosition.lat, destinationPosition.lng]);
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, driverPosition?.lat, driverPosition?.lng, destinationPosition?.lat, destinationPosition?.lng]);

  return null;
}

export default function OrderTrackingMap({
  driverPosition,
  destinationPosition,
  height = 320,
  driverName,
}: OrderTrackingMapProps) {
  // Centro inicial: driver si lo hay, sino destino, sino Caracas.
  const initialCenter: [number, number] = useMemo(() => {
    if (driverPosition) return [driverPosition.lat, driverPosition.lng];
    if (destinationPosition) return [destinationPosition.lat, destinationPosition.lng];
    return [10.4806, -66.9036];
  }, []);

  const initialZoom = driverPosition || destinationPosition ? 15 : 12;

  const line: [number, number][] = useMemo(() => {
    if (!driverPosition || !destinationPosition) return [];
    return [
      [driverPosition.lat, driverPosition.lng],
      [destinationPosition.lat, destinationPosition.lng],
    ];
  }, [driverPosition?.lat, driverPosition?.lng, destinationPosition?.lat, destinationPosition?.lng]);

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10"
      style={{ height }}
    >
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

        {driverPosition && (
          <Marker
            position={[driverPosition.lat, driverPosition.lng]}
            icon={driverIcon}
          >
            <Popup>
              <div className="text-xs font-bold">
                {driverName || 'Tu repartidor'}
              </div>
            </Popup>
          </Marker>
        )}

        {destinationPosition && (
          <Marker
            position={[destinationPosition.lat, destinationPosition.lng]}
            icon={destIcon}
          >
            <Popup>
              <div className="text-xs font-bold">Destino</div>
            </Popup>
          </Marker>
        )}

        {line.length === 2 && (
          <Polyline
            positions={line}
            pathOptions={{
              color: '#10b981',
              weight: 3,
              opacity: 0.7,
              dashArray: '8 6',
            }}
          />
        )}

        <MapRecenter
          driverPosition={driverPosition}
          destinationPosition={destinationPosition}
        />
      </MapContainer>
    </div>
  );
}
