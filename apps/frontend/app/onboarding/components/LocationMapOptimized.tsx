  'use client';

  import React, { useEffect, useState, useMemo, memo, useRef, useCallback } from 'react';
  import L from 'leaflet';

  // 🔥 ÍCONO POR DEFECTO - MEMOIZADO
  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  interface LocationMapOptimizedProps {
    lat: number | null;
    lng: number | null;
    onLocationSelect: (lat: number, lng: number) => void;
    height?: string | number; // 🔥 NUEVA PROP PARA ALTURA PERSONALIZADA
  }

  // 🔥 COMPONENTE INTERNO QUE SOLO SE RENDERIZA CUANDO CAMBIAN LAS COORDENADAS
  const MapContent = memo(({ 
    position, 
    onLocationSelect,
    height = '300px'
  }: { 
    position: [number, number]; 
    onLocationSelect: (lat: number, lng: number) => void;
    height?: string | number;
  }) => {
    const [MapComponent, setMapComponent] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
      const loadMap = async () => {
        try {
          const { MapContainer, TileLayer, Marker, useMap, useMapEvents } = await import('react-leaflet');
          
          const ChangeView = ({ center }: { center: [number, number] }) => {
            const map = useMap();
            useEffect(() => {
              if (map && map._container) {
                mapRef.current = map;
                const timer = setTimeout(() => {
                  try {
                    if (map && map.invalidateSize) {
                      map.invalidateSize();
                    }
                    if (map && map.setView) {
                      map.setView(center, map.getZoom(), { animate: true });
                    }
                  } catch (error) {
                    console.warn('Error al actualizar el mapa:', error);
                  }
                }, 200);
                return () => clearTimeout(timer);
              }
            }, [center, map]);
            return null;
          };

          const MapEvents = () => {
            const map = useMapEvents({
              click(e) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
              },
            });
            return null;
          };

          L.Marker.prototype.options.icon = defaultIcon;

          setMapComponent(() => (props: any) => (
            <MapContainer
              center={position}
              zoom={13}
              scrollWheelZoom={false}
              style={{ 
                width: '100%', 
                height: '100%',
                minHeight: typeof height === 'number' ? `${height}px` : height,
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="z-0"
              ref={(ref: any) => {
                if (ref) {
                  mapRef.current = ref;
                }
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={position} />
              <MapEvents />
              <ChangeView center={position} />
            </MapContainer>
          ));
        } catch (error) {
          console.error('Error loading map:', error);
        }
      };

      loadMap();
    }, [position, onLocationSelect, height]);

    if (!MapComponent) {
      return (
        <div 
          className="w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-400 animate-pulse"
          style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Cargando mapa...</span>
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        className="relative w-full"
        style={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: '200px'
        }}
      >
        <MapComponent />
      </div>
    );
  });

  MapContent.displayName = 'MapContent';

  // 🔥 COMPONENTE PRINCIPAL MEMOIZADO
  const LocationMapOptimized = memo(function LocationMapOptimized({ 
    lat, 
    lng, 
    onLocationSelect,
    height = '300px' // 🔥 ALTURA POR DEFECTO
  }: LocationMapOptimizedProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [key, setKey] = useState(0);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
      setIsMounted(true);
      const timer = setTimeout(() => {
        setHasLoaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      if (lat && lng && hasLoaded) {
        setKey(prev => prev + 1);
      }
    }, [lat, lng, hasLoaded]);

    const position = useMemo<[number, number]>(() => {
      const defaultLat = lat ?? 10.4795;
      const defaultLng = lng ?? -66.5329;
      return [defaultLat, defaultLng];
    }, [lat, lng]);

    const handleLocationSelect = useCallback((lat: number, lng: number) => {
      onLocationSelect(lat, lng);
    }, [onLocationSelect]);

    if (!isMounted || !hasLoaded) {
      return (
        <div 
          className="w-full bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-xs text-slate-400"
          style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Preparando mapa...</span>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={key}
        className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative"
      >
        <MapContent 
          position={position} 
          onLocationSelect={handleLocationSelect}
          height={height}
        />
      </div>
    );
  });

  LocationMapOptimized.displayName = 'LocationMapOptimized';

  export default LocationMapOptimized;