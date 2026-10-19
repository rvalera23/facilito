// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/geo.service.ts
// Lógica de cálculo de cercanía (Haversine) y consultas SQL.
// ==========================================

import { Injectable, Logger } from '@nestjs/common';
import { VE_CITIES, VeCity, DEFAULT_MAX_DISTANCE_KM } from './data/ve-cities';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CheckDeliveryResult,
  GeoPrecision,
  NearbyItem,
  NearbyResponse,
  ProximityInfo,
} from './types/geo.types';

const EARTH_RADIUS_KM = 6371;

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // CÁLCULO EN MEMORIA
  // ============================================================

  haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  // ============================================================
  // FORMATEO DEL LABEL
  // ============================================================

  formatDistanceLabel(
    distanceKm: number | null,
    precision: GeoPrecision,
    fallbackPlace?: string | null,
  ): string {
    if (precision === 'city' || precision === 'region') {
      return fallbackPlace ? `en ${fallbackPlace}` : 'cerca';
    }
    if (distanceKm === null) {
      return 'cerca';
    }
    if (precision === 'exact') {
      if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
      }
      return `${distanceKm.toFixed(1)} km`;
    }
    const rounded = Math.max(0.5, Math.round(distanceKm * 2) / 2);
    return `${rounded.toFixed(1)} km`;
  }

  buildProximity(
    distanceKm: number | null,
    precision: GeoPrecision,
    fallbackPlace: string | null,
    itemZone: string | null,
    userZone: string | null,
  ): ProximityInfo {
    const zoneMatch =
      !!userZone &&
      !!itemZone &&
      userZone.trim().toLowerCase() === itemZone.trim().toLowerCase();

    return {
      distanceKm,
      distanceLabel: this.formatDistanceLabel(
        distanceKm,
        precision,
        fallbackPlace,
      ),
      precision,
      zoneMatch,
    };
  }

  // ============================================================
  // CONSULTAS SQL — placeholders posicionales $n
  // ============================================================

  async findNearbyTenants(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
    userZone?: string | null;
  }): Promise<NearbyResponse<any>> {
    const { lat, lng, radiusKm, limit, userZone } = params;

    const sql = `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.niche,
        t.slogan,
        t.description,
        t.logo_url        AS "logoUrl",
        t.banner_url      AS "bannerUrl",
        t.favicon_url     AS "faviconUrl",
        t.primary_color   AS "primaryColor",
        t.secondary_color AS "secondaryColor",
        t.accent_color    AS "accentColor",
        t.background_color AS "backgroundColor",
        t.font_family     AS "fontFamily",
        t.work_modality   AS "workModality",
        t.model_type      AS "modelType",
        t.city,
        t.zone,
        t.address,
        t.latitude,
        t.longitude,
        t.geo_precision   AS "geoPrecision",
        t.geo_source      AS "geoSource",
        t.specific_config AS "specificConfig",
        t.likes_count     AS "likesCount",
        t.rating_avg      AS "ratingAvg",
        t.rating_count    AS "ratingCount",
        t.has_security_pin AS "hasSecurityPin",
        t.hero_layout     AS "heroLayout",
        ${EARTH_RADIUS_KM} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.latitude))
          ))
        ) AS distance_km
      FROM tenants t
      WHERE t.latitude IS NOT NULL
        AND t.longitude IS NOT NULL
        AND ${EARTH_RADIUS_KM} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($3)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($4)) +
            sin(radians($3)) * sin(radians(t.latitude))
          ))
        ) <= $5
      ORDER BY distance_km ASC
      LIMIT $6
    `;

    const rows = await this.dataSource.query(sql, [
      lat,
      lng,
      lat,
      lng,
      radiusKm,
      limit,
    ]);

    const items: NearbyItem<any>[] = rows.map((row: any) => {
      const distanceKm = Number(row.distance_km);
      const precision = (row.geoPrecision || 'city') as GeoPrecision;
      const proximity = this.buildProximity(
        distanceKm,
        precision,
        row.city || row.zone || null,
        row.zone || null,
        userZone || null,
      );
      const { distance_km, ...clean } = row;
      return { ...clean, ...proximity };
    });

    return {
      items,
      meta: {
        count: items.length,
        center: { latitude: lat, longitude: lng },
        radiusKm,
        userZone: userZone || null,
      },
    };
  }

  async findNearbyProducts(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
    userZone?: string | null;
  }): Promise<NearbyResponse<any>> {
    const { lat, lng, radiusKm, limit, userZone } = params;

    const sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.brand,
        p.condition,
        p."coverImage",
        p."mediaUrls",
        p.attributes,
        p."onSale",
        p."discountPercentage",
        p.stock,
        p."tenantId",
        t.name            AS tenant_name,
        t.slug            AS tenant_slug,
        t.logo_url        AS tenant_logo_url,
        t.banner_url      AS tenant_banner_url,
        t.city            AS tenant_city,
        t.zone            AS tenant_zone,
        t.primary_color   AS tenant_primary_color,
        t.model_type      AS tenant_model_type,
        t.geo_precision   AS tenant_geo_precision,
        ${EARTH_RADIUS_KM} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.latitude))
          ))
        ) AS distance_km
      FROM products p
      INNER JOIN tenants t ON t.id = p."tenantId"
      WHERE t.latitude IS NOT NULL
        AND t.longitude IS NOT NULL
        AND ${EARTH_RADIUS_KM} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($3)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($4)) +
            sin(radians($3)) * sin(radians(t.latitude))
          ))
        ) <= $5
      ORDER BY distance_km ASC
      LIMIT $6
    `;

    const rows = await this.dataSource.query(sql, [
      lat,
      lng,
      lat,
      lng,
      radiusKm,
      limit,
    ]);

    const items: NearbyItem<any>[] = rows.map((row: any) => {
      const distanceKm = Number(row.distance_km);
      const precision = (row.tenant_geo_precision || 'city') as GeoPrecision;
      const proximity = this.buildProximity(
        distanceKm,
        precision,
        row.tenant_city || row.tenant_zone || null,
        row.tenant_zone || null,
        userZone || null,
      );
      const {
        distance_km,
        tenant_name,
        tenant_slug,
        tenant_logo_url,
        tenant_banner_url,
        tenant_city,
        tenant_zone,
        tenant_primary_color,
        tenant_model_type,
        tenant_geo_precision,
        ...clean
      } = row;

      return {
        ...clean,
        tenant: {
          name: tenant_name,
          slug: tenant_slug,
          logoUrl: tenant_logo_url,
          bannerUrl: tenant_banner_url,
          city: tenant_city,
          zone: tenant_zone,
          primaryColor: tenant_primary_color,
          modelType: tenant_model_type,
        },
        ...proximity,
      };
    });

    return {
      items,
      meta: {
        count: items.length,
        center: { latitude: lat, longitude: lng },
        radiusKm,
        userZone: userZone || null,
      },
    };
  }

  async findNearbyServices(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
    userZone?: string | null;
  }): Promise<NearbyResponse<any>> {
    const { lat, lng, radiusKm, limit, userZone } = params;

    const sql = `
      SELECT
        s.id,
        s.name,
        s.description,
        s.price,
        s.durationminutes AS "durationMinutes",
        s.category,
        s.brand,
        s.condition,
        s.coverimage      AS "coverImage",
        s.mediaurls       AS "mediaUrls",
        s.attributes,
        s.requiresbooking AS "requiresBooking",
        s.status,
        s.isactive        AS "isActive",
        s.tenantid,
        t.name            AS tenant_name,
        t.slug            AS tenant_slug,
        t.logo_url        AS tenant_logo_url,
        t.banner_url      AS tenant_banner_url,
        t.city            AS tenant_city,
        t.zone            AS tenant_zone,
        t.primary_color   AS tenant_primary_color,
        t.model_type      AS tenant_model_type,
        t.geo_precision   AS tenant_geo_precision,
        ${EARTH_RADIUS_KM} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(t.latitude))
          ))
        ) AS distance_km
      FROM services s
      INNER JOIN tenants t ON t.id = s.tenantid
      WHERE t.latitude IS NOT NULL
        AND t.longitude IS NOT NULL
        AND ${EARTH_RADIUS_KM} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($3)) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($4)) +
            sin(radians($3)) * sin(radians(t.latitude))
          ))
        ) <= $5
      ORDER BY distance_km ASC
      LIMIT $6
    `;

    const rows = await this.dataSource.query(sql, [
      lat,
      lng,
      lat,
      lng,
      radiusKm,
      limit,
    ]);

    const items: NearbyItem<any>[] = rows.map((row: any) => {
      const distanceKm = Number(row.distance_km);
      const precision = (row.tenant_geo_precision || 'city') as GeoPrecision;
      const proximity = this.buildProximity(
        distanceKm,
        precision,
        row.tenant_city || row.tenant_zone || null,
        row.tenant_zone || null,
        userZone || null,
      );
      const {
        distance_km,
        tenant_name,
        tenant_slug,
        tenant_logo_url,
        tenant_banner_url,
        tenant_city,
        tenant_zone,
        tenant_primary_color,
        tenant_model_type,
        tenant_geo_precision,
        ...clean
      } = row;

      return {
        ...clean,
        tenant: {
          name: tenant_name,
          slug: tenant_slug,
          logoUrl: tenant_logo_url,
          bannerUrl: tenant_banner_url,
          city: tenant_city,
          zone: tenant_zone,
          primaryColor: tenant_primary_color,
          modelType: tenant_model_type,
        },
        ...proximity,
      };
    });

    return {
      items,
      meta: {
        count: items.length,
        center: { latitude: lat, longitude: lng },
        radiusKm,
        userZone: userZone || null,
      },
    };
  }
  // ============================================================
  // ACTUALIZAR UBICACIÓN DE UN TENANT
  // ============================================================

  /**
   * Actualiza lat/lng/precisión/origen de un tenant.
   * Si latitude es null, limpia toda la metadata geo del tenant.
   * Devuelve el tenant actualizado o null si no existe.
   */
  async updateTenantLocation(params: {
    slug: string;
    latitude: number | null;
    longitude: number | null;
    geoPrecision: string | null;
    geoSource: string | null;
  }) {
    const { slug, latitude, longitude, geoPrecision, geoSource } = params;

    const result = await this.dataSource.query(
      `
      UPDATE tenants
      SET latitude       = $1,
          longitude      = $2,
          geo_precision  = $3,
          geo_source     = $4,
          geo_updated_at = now()
      WHERE slug = $5
      RETURNING id, slug, name, latitude, longitude,
                geo_precision, geo_source, geo_updated_at
      `,
      [latitude, longitude, geoPrecision, geoSource, slug],
    );
    // TypeORM devuelve [rows, rowCount] para UPDATE + RETURNING.
    // rows es result[0], rowCount es result[1].
    const rows = Array.isArray(result) && Array.isArray(result[0])
      ? result[0]
      : result;

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
      geoPrecision: row.geo_precision,
      geoSource: row.geo_source,
      geoUpdatedAt: row.geo_updated_at,
    };
  }
  // ============================================================
  // ASIGNAR CIUDAD A UN PUNTO (diccionario VE)
  // ============================================================

  /**
   * Encuentra la ciudad más cercana del diccionario venezolano.
   * Devuelve null si la distancia supera `maxKm` (por defecto 25 km).
   */
  getClosestCity(
    latitude: number,
    longitude: number,
    maxKm: number = DEFAULT_MAX_DISTANCE_KM,
  ): VeCity | null {
    let closest: VeCity | null = null;
    let closestDist = Infinity;

    for (const city of VE_CITIES) {
      const d = this.haversineKm(latitude, longitude, city.latitude, city.longitude);
      if (d < closestDist) {
        closestDist = d;
        closest = city;
      }
    }

    if (!closest || closestDist > maxKm) {
      return null;
    }
    return closest;
  }

  // ============================================================
  // ZONAS REALES (clusters de tenants por ciudad del diccionario)
  // ============================================================

  /**
   * Agrupa los tenants con geo por ciudad del diccionario.
   * Devuelve zonas ordenadas por count desc.
   * No hay hardcodeo: si una tienda nueva cae en una ciudad
   * nueva, aparece automáticamente.
   */
  async findZones(): Promise<{
    zones: Array<{
      city: string;
      state: string;
      count: number;
      latitude: number;
      longitude: number;
    }>;
  }> {
    const sql = `
      SELECT slug, name, latitude, longitude
      FROM tenants
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
    `;

    const rows: Array<{ slug: string; name: string; latitude: string; longitude: string }> =
      await this.dataSource.query(sql);

    // Agrupar por METRO (área metropolitana) del diccionario
    const groups = new Map<
      string,
      { city: string; state: string; count: number; latSum: number; lngSum: number }
    >();

    for (const row of rows) {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const city = this.getClosestCity(lat, lng);
      if (!city) continue; // fuera del rango de 25 km de cualquier ciudad conocida

      const key = city.metro;
            const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        existing.latSum += lat;
        existing.lngSum += lng;
      } else {
        groups.set(key, {
          city: city.metro,
          state: city.state,
          count: 1,
          latSum: lat,
          lngSum: lng,
        });
      }
    }

    const zones = Array.from(groups.values())
      .map((g) => ({
        city: g.city,
        state: g.state,
        count: g.count,
        latitude: Math.round((g.latSum / g.count) * 1e6) / 1e6,
        longitude: Math.round((g.lngSum / g.count) * 1e6) / 1e6,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.city.localeCompare(b.city);
      });

    return { zones };
  }

  // ============================================================
  // CHECK DELIVERY
  // Calcula si un tenant puede entregar a un punto dado,
  // y cuánto costaría / cuánto tardaría.
  // ============================================================
  async checkDelivery(params: {
    buyerLat: number;
    buyerLng: number;
    tenantSlug: string;
    orderSubtotal?: number;
  }): Promise<CheckDeliveryResult> {
    const { buyerLat, buyerLng, tenantSlug, orderSubtotal } = params;

    // 1) Traer el tenant por slug con los campos que necesitamos
    const rows: Array<{
      id: string;
      slug: string;
      name: string;
      latitude: string | number | null;
      longitude: string | number | null;
      delivery_base_fee: string | number;
      delivery_per_km_fee: string | number;
      delivery_min_order: string | number;
      delivery_max_radius_km: string | number | null;
      delivery_prep_time_min: number;
      delivery_avg_speed_kmh: number;
      accepts_pickup: boolean;
      delivery_local_enabled: boolean;
    }> = await this.dataSource.query(
      `SELECT id, slug, name,
              latitude, longitude,
              delivery_base_fee, delivery_per_km_fee, delivery_min_order,
              delivery_max_radius_km, delivery_prep_time_min, delivery_avg_speed_kmh,
              accepts_pickup, delivery_local_enabled
         FROM tenants
        WHERE slug = $1
        LIMIT 1`,
      [tenantSlug],
    );

    if (!rows.length) {
      return {
        canDeliver: false,
        distanceKm: null,
        fee: null,
        etaMinutes: null,
        reason: 'no_tenant_coords',
        tenant: null,
        pickupAvailable: false,
      };
    }

    const t = rows[0];

    const tenantLat = t.latitude != null ? Number(t.latitude) : null;
    const tenantLng = t.longitude != null ? Number(t.longitude) : null;

    const baseFee = Number(t.delivery_base_fee ?? 0);
    const perKmFee = Number(t.delivery_per_km_fee ?? 0);
    const minOrder = Number(t.delivery_min_order ?? 0);
    const maxRadius = t.delivery_max_radius_km != null
      ? Number(t.delivery_max_radius_km)
      : null;
    const prepTime = Number(t.delivery_prep_time_min ?? 15);
    const avgSpeed = Number(t.delivery_avg_speed_kmh ?? 20);
    const acceptsPickup = Boolean(t.accepts_pickup);
    const deliveryLocalEnabled = Boolean(t.delivery_local_enabled);

    const tenantInfo = {
      slug: t.slug,
      name: t.name,
      acceptsPickup,
    };

    // 2) Validar coords del tenant
    if (tenantLat == null || tenantLng == null) {
      return {
        canDeliver: false,
        distanceKm: null,
        fee: null,
        etaMinutes: null,
        reason: 'no_tenant_coords',
        tenant: tenantInfo,
        pickupAvailable: acceptsPickup,
      };
    }

    // 2b) Validar que la tienda tenga habilitado el delivery local
    if (!deliveryLocalEnabled) {
      return {
        canDeliver: false,
        distanceKm: null,
        fee: null,
        etaMinutes: null,
        reason: 'no_delivery_config',
        tenant: tenantInfo,
        pickupAvailable: acceptsPickup,
      };
    }

    // 3) Validar coords del comprador
    if (!Number.isFinite(buyerLat) || !Number.isFinite(buyerLng)) {
      return {
        canDeliver: false,
        distanceKm: null,
        fee: null,
        etaMinutes: null,
        reason: 'no_buyer_coords',
        tenant: tenantInfo,
        pickupAvailable: acceptsPickup,
      };
    }

    // 4) Calcular distancia con haversine reutilizando el método existente
    const distanceKm = this.haversineKm(buyerLat, buyerLng, tenantLat, tenantLng);
    const distanceRounded = Math.round(distanceKm * 100) / 100;

    // 5) Buscar zona de delivery activa que contenga el punto.
    //    Si existe, la zona manda sobre el radio global.
    const zoneRows: Array<{
      id: string;
      name: string;
      polygon: any;
      fee: string | number;
      min_order_amount: string | number;
      priority: number;
    }> = await this.dataSource.query(
      `SELECT id, name, polygon, fee, min_order_amount, priority
         FROM delivery_zones
        WHERE tenant_id = $1
          AND is_active = true
        ORDER BY priority DESC, fee ASC, created_at ASC`,
      [t.id],
    );

    type ZoneHit = {
      id: string;
      name: string;
      fee: number;
      minOrderAmount: number;
      priority: number;
    };

    let matchedZone: ZoneHit | null = null;
    for (const z of zoneRows) {
      const poly = z.polygon;
      if (!poly || poly.type !== 'Polygon') continue;
      const rings = poly.coordinates;
      if (!Array.isArray(rings) || rings.length === 0) continue;
      const ring = rings[0];
      if (!Array.isArray(ring) || ring.length < 3) continue;

      // Ray-casting
      let inside = false;
      const x = buyerLng;
      const y = buyerLat;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = Number(ring[i][0]);
        const yi = Number(ring[i][1]);
        const xj = Number(ring[j][0]);
        const yj = Number(ring[j][1]);
        const intersect =
          yi > y !== yj > y &&
          x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) {
        matchedZone = {
          id: z.id,
          name: z.name,
          fee: Number(z.fee ?? 0),
          minOrderAmount: Number(z.min_order_amount ?? 0),
          priority: Number(z.priority ?? 0),
        };
        break; // ya están ordenadas por prioridad/fee
      }
    }

    // 5b) Si hay zona, validar min_order_amount de la zona.
    if (
      matchedZone &&
      orderSubtotal != null &&
      matchedZone.minOrderAmount > 0 &&
      orderSubtotal < matchedZone.minOrderAmount
    ) {
      return {
        canDeliver: false,
        distanceKm: distanceRounded,
        fee: null,
        etaMinutes: null,
        reason: 'below_min_order',
        tenant: tenantInfo,
        pickupAvailable: acceptsPickup,
      };
    }

    // 5c) Si no hay zona, validar radio global (comportamiento legacy).
    if (!matchedZone && maxRadius != null && distanceKm > maxRadius) {
      return {
        canDeliver: false,
        distanceKm: distanceRounded,
        fee: null,
        etaMinutes: null,
        reason: 'out_of_range',
        tenant: tenantInfo,
        pickupAvailable: acceptsPickup,
      };
    }

    // 6) Validar monto mínimo (solo si viene orderSubtotal)
    if (
      orderSubtotal != null &&
      minOrder > 0 &&
      orderSubtotal < minOrder
    ) {
      return {
        canDeliver: false,
        distanceKm: distanceRounded,
        fee: null,
        etaMinutes: null,
        reason: 'below_min_order',
        tenant: tenantInfo,
        pickupAvailable: acceptsPickup,
      };
    }

    // 7) Calcular fee:
    //    - Si hay zona → fee fijo de la zona
    //    - Si no hay zona → base + per_km * distancia (comportamiento legacy)
    const feeRaw = matchedZone
      ? matchedZone.fee
      : baseFee + perKmFee * distanceKm;
    const fee = Math.round(feeRaw * 100) / 100;

    // 8) Calcular ETA: prep + (distance / avgSpeed) * 60 minutos
    const travelMinutes = avgSpeed > 0 ? (distanceKm / avgSpeed) * 60 : 0;
    const etaMinutes = Math.max(1, Math.round(prepTime + travelMinutes));

    return {
      canDeliver: true,
      distanceKm: distanceRounded,
      fee,
      etaMinutes,
      reason: 'ok',
      tenant: tenantInfo,
      pickupAvailable: acceptsPickup,
    };
  }
}