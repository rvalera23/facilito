// ============================================================
// ARCHIVO: lib/geo-search.ts
// Helper compartido para búsqueda de direcciones y zonas.
//
// - Usa Nominatim (OSM) para búsqueda libre de direcciones.
// - Fallback a /geo/zones (zonas reales con tiendas) si falla.
// - Cero listas hardcodeadas.
// ============================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL;

export interface GeoSearchResult {
  display_name: string;
  lat: number;
  lon: number;
  state?: string;
  municipality?: string;
  city?: string;
  source: 'nominatim' | 'zones';
}

interface GeoZone {
  city: string;
  state: string;
  count: number;
  latitude: number;
  longitude: number;
}

// Cache de zonas para no repetir fetches
let zonesCache: GeoZone[] | null = null;
let zonesCacheTs = 0;
const ZONES_TTL_MS = 5 * 60 * 1000; // 5 min

async function fetchZones(): Promise<GeoZone[]> {
  if (zonesCache && Date.now() - zonesCacheTs < ZONES_TTL_MS) {
    return zonesCache;
  }
  try {
    const res = await fetch(`${API_BASE}/geo/zones`);
    if (!res.ok) return [];
    const data = await res.json();
    const zones: GeoZone[] = Array.isArray(data?.zones) ? data.zones : [];
    zonesCache = zones;
    zonesCacheTs = Date.now();
    return zones;
  } catch {
    return [];
  }
}

/**
 * Búsqueda principal: consulta Nominatim y devuelve resultados
 * listos para usar en un dropdown de sugerencias.
 */
export async function searchAddress(query: string): Promise<GeoSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  let nominatimResults: GeoSearchResult[] = [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q,
      )}&countrycodes=ve&addressdetails=1&limit=5`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'FacilitoApp/1.0' } },
    );
    if (res.ok) {
      const data = await res.json();
      nominatimResults = (Array.isArray(data) ? data : []).map((item: any) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        state: item.address?.state,
        municipality: item.address?.county || item.address?.municipality,
        city: item.address?.city || item.address?.town || item.address?.village,
        source: 'nominatim' as const,
      }));
    }
  } catch {
    // ignorar
  }

  if (nominatimResults.length > 0) return nominatimResults;

  // Fallback: buscar en zonas reales con tiendas
  const zones = await fetchZones();
  const qLower = q.toLowerCase();
  const matches = zones
    .filter((z) => z.city.toLowerCase().includes(qLower))
    .map<GeoSearchResult>((z) => ({
      display_name: `${z.city}, ${z.state}, Venezuela (${z.count} tienda${z.count === 1 ? '' : 's'})`,
      lat: z.latitude,
      lon: z.longitude,
      state: z.state,
      municipality: undefined,
      city: z.city,
      source: 'zones',
    }));

  return matches;
}

/**
 * Geocodificación inversa: lat/lng → dirección legible.
 * Fallback: buscar la zona más cercana en /geo/zones.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  display_name: string;
  state?: string;
  municipality?: string;
  city?: string;
  source: 'nominatim' | 'zones';
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'FacilitoApp/1.0' } },
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      return {
        display_name:
          data.display_name ||
          `${addr.city || addr.town || addr.village || ''}, ${addr.state || ''}`.trim(),
        state: addr.state,
        municipality: addr.county || addr.municipality,
        city: addr.city || addr.town || addr.village || addr.suburb,
        source: 'nominatim',
      };
    }
  } catch {
    // ignorar
  }

  // Fallback: zona más cercana del diccionario real
  const zones = await fetchZones();
  if (zones.length === 0) {
    return { display_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, source: 'zones' };
  }

  let nearest = zones[0];
  let nearestDist = Infinity;
  for (const z of zones) {
    const d = Math.hypot(z.latitude - lat, z.longitude - lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = z;
    }
  }

  return {
    display_name: `${nearest.city}, ${nearest.state}, Venezuela`,
    state: nearest.state,
    city: nearest.city,
    source: 'zones',
  };
}