// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery.service.ts
// CRUD de zonas de delivery + point-in-polygon.
// ==========================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryZoneEntity,
  GeoPolygon,
} from './entities/delivery-zone.entity';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

export interface ZoneMatch {
  zone: DeliveryZoneEntity;
  inside: boolean;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(DeliveryZoneEntity)
    private readonly zonesRepository: Repository<DeliveryZoneEntity>,
  ) {}

  // ============================================================
  // VALIDACIÓN DE POLÍGONO
  // ============================================================

  /**
   * Verifica que el GeoJSON sea un Polygon con anillo cerrado
   * (primer y último punto iguales) y al menos 4 puntos (3 + cierre).
   */
  private validatePolygon(polygon: GeoPolygon): void {
    if (!polygon || polygon.type !== 'Polygon') {
      throw new BadRequestException('polygon.type debe ser "Polygon"');
    }
    if (
      !Array.isArray(polygon.coordinates) ||
      polygon.coordinates.length === 0
    ) {
      throw new BadRequestException('polygon.coordinates vacío o inválido');
    }

    const ring = polygon.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new BadRequestException(
        'El anillo del polígono debe tener al menos 4 puntos (3 + cierre)',
      );
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (
      !Array.isArray(first) ||
      first.length < 2 ||
      !Array.isArray(last) ||
      last.length < 2
    ) {
      throw new BadRequestException('Cada punto debe ser [lng, lat]');
    }
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new BadRequestException(
        'El anillo del polígono debe estar cerrado (primer punto = último punto)',
      );
    }

    // Validar que cada punto sea numérico
    for (const pt of ring) {
      if (
        !Array.isArray(pt) ||
        pt.length < 2 ||
        !Number.isFinite(Number(pt[0])) ||
        !Number.isFinite(Number(pt[1]))
      ) {
        throw new BadRequestException(
          'Cada punto del polígono debe ser [lng, lat] numéricos',
        );
      }
    }
  }

  // ============================================================
  // POINT-IN-POLYGON (ray casting)
  // ============================================================
  // Referencia: https://en.wikipedia.org/wiki/Point_in_polygon
  // El punto se da en (lat, lng), pero el polígono está en (lng, lat).
  // Coordenadas:
  //   x = lng, y = lat
  // ============================================================

  isPointInPolygon(
    lat: number,
    lng: number,
    polygon: GeoPolygon,
  ): boolean {
    if (!polygon || polygon.type !== 'Polygon') return false;
    const rings = polygon.coordinates;
    if (!Array.isArray(rings) || rings.length === 0) return false;

    // Regla estándar GeoJSON: el primer anillo es el exterior,
    // los siguientes son huecos. Acá solo soportamos el exterior.
    const ring = rings[0];
    if (!Array.isArray(ring) || ring.length < 3) return false;

    const x = lng;
    const y = lat;
    let inside = false;

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

    return inside;
  }

  // ============================================================
  // CRUD
  // ============================================================

  async create(
    tenantId: string,
    dto: CreateDeliveryZoneDto,
  ): Promise<DeliveryZoneEntity> {
    this.validatePolygon(dto.polygon as GeoPolygon);

    const zone = this.zonesRepository.create({
      tenantId,
      name: dto.name,
      polygon: dto.polygon as GeoPolygon,
      fee: dto.fee ?? 0,
      minOrderAmount: dto.minOrderAmount ?? 0,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.zonesRepository.save(zone);
  }

  async findAllByTenant(tenantId: string): Promise<DeliveryZoneEntity[]> {
    return this.zonesRepository.find({
      where: { tenantId },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async findOne(
    tenantId: string,
    zoneId: string,
  ): Promise<DeliveryZoneEntity> {
    const zone = await this.zonesRepository.findOne({
      where: { id: zoneId, tenantId },
    });
    if (!zone) {
      throw new NotFoundException('Zona de delivery no encontrada');
    }
    return zone;
  }

  async update(
    tenantId: string,
    zoneId: string,
    dto: UpdateDeliveryZoneDto,
  ): Promise<DeliveryZoneEntity> {
    const zone = await this.findOne(tenantId, zoneId);

    if (dto.polygon !== undefined) {
      this.validatePolygon(dto.polygon as GeoPolygon);
      zone.polygon = dto.polygon as GeoPolygon;
    }
    if (dto.name !== undefined) zone.name = dto.name;
    if (dto.fee !== undefined) zone.fee = dto.fee;
    if (dto.minOrderAmount !== undefined) zone.minOrderAmount = dto.minOrderAmount;
    if (dto.priority !== undefined) zone.priority = dto.priority;
    if (dto.isActive !== undefined) zone.isActive = dto.isActive;

    return this.zonesRepository.save(zone);
  }

  async remove(tenantId: string, zoneId: string): Promise<void> {
    const zone = await this.findOne(tenantId, zoneId);
    await this.zonesRepository.remove(zone);
  }

  // ============================================================
  // MATCH: dado un punto, devolver la zona activa que lo contiene
  // ============================================================
  // Reglas:
  //   1) Solo zonas is_active = true.
  //   2) Si varias zonas contienen el punto, gana la de mayor priority.
  //   3) Empate de priority: gana la de menor fee.
  // ============================================================

  async findZoneForPoint(
    tenantId: string,
    lat: number,
    lng: number,
  ): Promise<DeliveryZoneEntity | null> {
    const zones = await this.zonesRepository.find({
      where: { tenantId, isActive: true },
      order: { priority: 'DESC', fee: 'ASC', createdAt: 'ASC' },
    });

    for (const zone of zones) {
      if (this.isPointInPolygon(lat, lng, zone.polygon)) {
        return zone;
      }
    }

    return null;
  }
}