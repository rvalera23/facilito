// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/types/geo.types.ts
// Tipos compartidos del módulo geo.
// ==========================================

/**
 * Precisión de la ubicación de un recurso (tenant, sucursal, etc.).
 * Determina cómo se muestra la distancia al usuario:
 *   - exact  → "350 m" o "1.2 km"
 *   - street → "1.5 km"
 *   - city   → "en Caracas" (sin distancia)
 *   - region → "en Miranda" (sin distancia)
 */
export type GeoPrecision = 'exact' | 'street' | 'city' | 'region';

/**
 * Origen de la ubicación. Sirve para auditar y para decidir confianza.
 *   - pin      → el dueño marcó el punto en un mapa
 *   - geocoded → derivado de una dirección por un geocoder automático
 *   - manual   → ingresado a mano por un humano sin mapa
 *   - gps      → capturado por el navegador del usuario
 */
export type GeoSource = 'pin' | 'geocoded' | 'manual' | 'gps';

/**
 * Punto geográfico simple.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Metadatos de ubicación que puede llevar cualquier recurso geolocalizable.
 */
export interface GeoMetadata {
  latitude: number | null;
  longitude: number | null;
  geoPrecision: GeoPrecision | null;
  geoSource: GeoSource | null;
  geoUpdatedAt: Date | null;
}

/**
 * Resultado de un cálculo de cercanía para un item.
 * El backend es la única fuente de verdad del label.
 */
export interface ProximityInfo {
  distanceKm: number | null;
  distanceLabel: string;
  precision: GeoPrecision;
  zoneMatch: boolean;
}

/**
 * Envoltorio genérico: cualquier item + su info de cercanía.
 */
export type NearbyItem<T> = T & ProximityInfo;

/**
 * Respuesta estándar de los endpoints /geo/nearby/*.
 */
export interface NearbyResponse<T> {
  items: NearbyItem<T>[];
  meta: {
    count: number;
    center: GeoPoint;
    radiusKm: number;
    userZone: string | null;
  };
}


/**
 * Resultado del cálculo de delivery para un par (buyer, tenant).
 * Lo devuelve POST /geo/check-delivery.
 *
 *   canDeliver  → true si la tienda puede entregar al punto
 *   distanceKm  → distancia haversine en km (null si no hay coords)
 *   fee         → costo de envío calculado (null si no se puede)
 *   etaMinutes  → minutos estimados de entrega (null si no se puede)
 *   reason      → motivo del rechazo (null si canDeliver=true)
 */
export interface CheckDeliveryResult {
  canDeliver: boolean;
  distanceKm: number | null;
  fee: number | null;
  etaMinutes: number | null;
  reason:
    | 'ok'
    | 'no_tenant_coords'
    | 'no_buyer_coords'
    | 'out_of_range'
    | 'below_min_order'
    | 'no_delivery_config'
    | 'accepts_pickup_only'
    | null;
  tenant: {
    slug: string;
    name: string;
    acceptsPickup: boolean;
  } | null;
  /** True si la tienda acepta retiro en local (fallback cuando no se puede entregar). */
  pickupAvailable: boolean;
}
