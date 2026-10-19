// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/geo.controller.ts
// Endpoints de descubrimiento por cercanía.
// ==========================================

import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GeoService } from './geo.service';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { UpdateTenantLocationDto } from './dto/update-tenant-location.dto';
import { CheckDeliveryDto } from './dto/check-delivery.dto';
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  /**
   * GET /geo/nearby/tenants
   * Tiendas ordenadas por cercanía al punto (lat, lng).
   */
  @Get('nearby/tenants')
  async nearbyTenants(@Query() query: NearbyQueryDto) {
    return this.geoService.findNearbyTenants({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm ?? 25,
      limit: query.limit ?? 20,
      userZone: query.userZone ?? null,
    });
  }

  /**
   * GET /geo/nearby/products
   * Productos de tiendas cercanas al punto (lat, lng).
   */
  @Get('nearby/products')
  async nearbyProducts(@Query() query: NearbyQueryDto) {
    return this.geoService.findNearbyProducts({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm ?? 25,
      limit: query.limit ?? 20,
      userZone: query.userZone ?? null,
    });
  }

  /**
   * GET /geo/nearby/services
   * Servicios de tiendas cercanas al punto (lat, lng).
   */
  @Get('nearby/services')
  async nearbyServices(@Query() query: NearbyQueryDto) {
    return this.geoService.findNearbyServices({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm ?? 25,
      limit: query.limit ?? 20,
      userZone: query.userZone ?? null,
    });
  }

  /**
   * PATCH /geo/tenants/:slug/location
   * Actualiza el pin del tenant.
   */
  @Patch('tenants/:slug/location')
  async updateTenantLocation(
    @Param('slug') slug: string,
    @Body() dto: UpdateTenantLocationDto,
  ) {
    const updated = await this.geoService.updateTenantLocation({
      slug,
      latitude: dto.latitude,
      longitude: dto.longitude,
      geoPrecision: dto.latitude === null ? null : dto.geoPrecision,
      geoSource: dto.geoSource ?? 'pin',
    });
    if (!updated) {
      throw new BadRequestException(`Tenant "${slug}" no encontrado`);
    }

    return updated;
  }
  
  /**
   * GET /geo/zones
   * Devuelve las zonas reales (agrupadas por ciudad) donde hay tiendas.
   * No requiere lat/lng. Sirve para que el frontend muestre las zonas
   * existentes en el dropdown de ubicación.
   */
  @Get('zones')
  async listZones() {
    return this.geoService.findZones();
  }

  /**
   * POST /geo/check-delivery
   * Body: { buyerLat, buyerLng, tenantSlug, orderSubtotal? }
   * Devuelve si el tenant puede entregar al punto, el costo y el ETA.
   */
  @Post('check-delivery')
  async checkDelivery(@Body() dto: CheckDeliveryDto) {
    return this.geoService.checkDelivery({
      buyerLat: dto.buyerLat,
      buyerLng: dto.buyerLng,
      tenantSlug: dto.tenantSlug,
      orderSubtotal: dto.orderSubtotal,
    });
  }
}
