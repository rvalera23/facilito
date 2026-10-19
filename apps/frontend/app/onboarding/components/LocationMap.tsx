'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 🔥 CORREGIR EL ÍCONO POR DEFECTO DE LEAFLET
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 🔥 ASIGNAR EL ÍCONO POR DEFECTO A TODOS LOS MARCADORES
L.Marker.prototype.options.icon = defaultIcon;

interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

// 🔥 COMPONENTE PARA ACTUALIZAR LA VISTA DEL MAPA
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

// 🔥 COMPONENTE PARA MANEJAR EVENTOS DE CLICK EN EL MAPA
function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationMap({ lat, lng, onLocationSelect }: LocationMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // 🔥 MOSTRAR LOADING MIENTRAS EL COMPONENTE SE MONTA EN EL CLIENTE
  if (!isMounted) {
    return (
      <div className="w-full h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-xs text-slate-400">
        Cargando mapa...
      </div>
    );
  }

  const defaultLat = lat ?? 10.4795;
  const defaultLng = lng ?? -66.5329;
  const position: [number, number] = [defaultLat, defaultLng];

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative" style={{ zIndex: 0 }}>
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
        <MapEvents onLocationSelect={onLocationSelect} />
        <ChangeView center={position} />
      </MapContainer>
    </div>
  );
}