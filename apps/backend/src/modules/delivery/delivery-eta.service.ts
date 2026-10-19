// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery-eta.service.ts
// Cálculo de ETA en vivo + ruta greedy + proximidad.
// ==========================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryAssignmentEntity,
} from './entities/delivery-assignment.entity';
import { DeliveryDriverEntity } from './entities/delivery-driver.entity';

const EARTH_RADIUS_KM = 6371;

export interface LiveEtaResult {
  assignmentId: string;
  orderId: string;
  driverId: string | null;
  driverLat: number | null;
  driverLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  isNearby: boolean;      // true si <500m
  nearbyThresholdM: number;
  at: string;
}

export interface RouteStop {
  assignmentId: string;
  orderId: string;
  customerName: string | null;
  destinationLat: number;
  destinationLng: number;
  distanceFromPrevKm: number;
  status: string;
}

export interface RouteResult {
  driverId: string;
  driverLat: number | null;
  driverLng: number | null;
  stops: RouteStop[];
  totalDistanceKm: number;
}

@Injectable()
export class DeliveryEtaService {
  private readonly logger = new Logger(DeliveryEtaService.name);

  constructor(
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignmentsRepository: Repository<DeliveryAssignmentEntity>,
    @InjectRepository(DeliveryDriverEntity)
    private readonly driversRepository: Repository<DeliveryDriverEntity>,
  ) {}

  // ============================================================
  // HELPERS
  // ============================================================

  private haversineKm(
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

  /**
   * Devuelve las coords del local (tenant) a partir de la orden.
   */
  private async getTenantCoords(
    tenantId: string,
  ): Promise<{ lat: number; lng: number; avgSpeed: number; prepTime: number } | null> {
    const rows: any[] = await this.driversRepository.manager.query(
      `SELECT latitude, longitude, delivery_avg_speed_kmh, delivery_prep_time_min
         FROM tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    if (r.latitude == null || r.longitude == null) return null;
    return {
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      avgSpeed: Number(r.delivery_avg_speed_kmh ?? 20),
      prepTime: Number(r.delivery_prep_time_min ?? 15),
    };
  }

  /**
   * Devuelve el destino del comprador a partir de la orden.
   * Hoy no tenemos lat/lng del comprador en orders.
   * Fallback: usar tenant coords (no es ideal, pero es lo que hay).
   */
  private async getOrderDestination(
    orderId: string,
  ): Promise<{ lat: number; lng: number } | null> {
    // Por ahora devolvemos null. En el futuro, cuando orders tenga buyer_lat/lng,
    // esta función los va a devolver.
    const rows: any[] = await this.driversRepository.manager.query(
      `SELECT buyer_lat, buyer_lng
         FROM orders WHERE id = $1 LIMIT 1`,
      [orderId],
    ).catch(() => []);
    if (!rows.length) return null;
    const r = rows[0];
    if (r.buyer_lat == null || r.buyer_lng == null) return null;
    return { lat: Number(r.buyer_lat), lng: Number(r.buyer_lng) };
  }

  // ============================================================
  // ETA EN VIVO
  // ============================================================

  async computeLiveEta(
    assignmentId: string,
    nearbyThresholdM: number = 500,
  ): Promise<LiveEtaResult> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: { driver: true, order: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    const driver = assignment.driver;
    const order = assignment.order;
    const tenantId = order?.tenantId;

    const driverLat = driver?.currentLat ?? null;
    const driverLng = driver?.currentLng ?? null;
    const driverId = driver?.id ?? null;

    // Si no hay driver → todo null
    if (!driver || driverLat == null || driverLng == null) {
      return {
        assignmentId,
        orderId: assignment.orderId,
        driverId,
        driverLat,
        driverLng,
        destinationLat: null,
        destinationLng: null,
        distanceKm: null,
        etaMinutes: null,
        isNearby: false,
        nearbyThresholdM,
        at: new Date().toISOString(),
      };
    }

    // Resolver destino: primero intentar coords del comprador; fallback: coords del local
    let dest = await this.getOrderDestination(assignment.orderId);
    let tenantCoords: any = null;
    if (tenantId) {
      tenantCoords = await this.getTenantCoords(tenantId);
    }
    if (!dest && tenantCoords) {
      dest = { lat: tenantCoords.lat, lng: tenantCoords.lng };
    }

    if (!dest) {
      return {
        assignmentId,
        orderId: assignment.orderId,
        driverId,
        driverLat,
        driverLng,
        destinationLat: null,
        destinationLng: null,
        distanceKm: null,
        etaMinutes: null,
        isNearby: false,
        nearbyThresholdM,
        at: new Date().toISOString(),
      };
    }

    // Distancia driver → destino
    const distanceKm = this.haversineKm(
      driverLat,
      driverLng,
      dest.lat,
      dest.lng,
    );

    // ETA = prep_time + distance / avg_speed * 60
    // Si ya está picked_up, no sumamos prep_time.
    const prepTime =
      assignment.status === 'picked_up' || assignment.status === 'accepted'
        ? 0
        : tenantCoords?.prepTime ?? 15;
    const avgSpeed = tenantCoords?.avgSpeed ?? 20;
    const travelMinutes = avgSpeed > 0 ? (distanceKm / avgSpeed) * 60 : 0;
    const etaMinutes = Math.max(1, Math.round(prepTime + travelMinutes));

    const isNearby = distanceKm * 1000 <= nearbyThresholdM;

    return {
      assignmentId,
      orderId: assignment.orderId,
      driverId,
      driverLat,
      driverLng,
      destinationLat: dest.lat,
      destinationLng: dest.lng,
      distanceKm: Math.round(distanceKm * 100) / 100,
      etaMinutes,
      isNearby,
      nearbyThresholdM,
      at: new Date().toISOString(),
    };
  }

  // ============================================================
  // RUTA GREEDY (nearest-neighbor)
  // ============================================================

  async computeRouteForDriver(driverId: string): Promise<RouteResult> {
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    const assignments = await this.assignmentsRepository.find({
      where: { driverId },
      relations: { order: true },
      order: { createdAt: 'ASC' },
    });

    // Solo assignments activos (assigned, accepted, picked_up)
    const active = assignments.filter((a) =>
      ['assigned', 'accepted', 'picked_up'].includes(a.status),
    );

    // Resolver destino de cada uno
    const stops: Array<{
      assignmentId: string;
      orderId: string;
      customerName: string | null;
      lat: number;
      lng: number;
      status: string;
    }> = [];

    for (const a of active) {
      let dest = await this.getOrderDestination(a.orderId);
      if (!dest && a.order?.tenantId) {
        const tc = await this.getTenantCoords(a.order.tenantId);
        if (tc) dest = { lat: tc.lat, lng: tc.lng };
      }
      if (dest) {
        stops.push({
          assignmentId: a.id,
          orderId: a.orderId,
          customerName: a.order?.customerName ?? null,
          lat: dest.lat,
          lng: dest.lng,
          status: a.status,
        });
      }
    }

    // Greedy nearest-neighbor desde la posición actual del driver
    const orderedStops: RouteStop[] = [];
    let currentLat = driver.currentLat ?? null;
    let currentLng = driver.currentLng ?? null;
    let totalDistanceKm = 0;

    const remaining = [...stops];

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      if (currentLat == null || currentLng == null) {
        bestIdx = 0;
      } else {
        for (let i = 0; i < remaining.length; i++) {
          const d = this.haversineKm(
            currentLat,
            currentLng,
            remaining[i].lat,
            remaining[i].lng,
          );
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
      }

      const chosen = remaining.splice(bestIdx, 1)[0];
      const distFromPrev =
        currentLat != null && currentLng != null
          ? Math.round(bestDist * 100) / 100
          : 0;

      orderedStops.push({
        assignmentId: chosen.assignmentId,
        orderId: chosen.orderId,
        customerName: chosen.customerName,
        destinationLat: chosen.lat,
        destinationLng: chosen.lng,
        distanceFromPrevKm: distFromPrev,
        status: chosen.status,
      });

      totalDistanceKm += distFromPrev;
      currentLat = chosen.lat;
      currentLng = chosen.lng;
    }

    return {
      driverId,
      driverLat: driver.currentLat ?? null,
      driverLng: driver.currentLng ?? null,
      stops: orderedStops,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    };
  }

  // ============================================================
  // PROXIMIDAD PARA NOTIFICACIONES
  // ============================================================

  async isDriverNearby(
    assignmentId: string,
    thresholdM: number = 500,
  ): Promise<{ isNearby: boolean; distanceM: number | null }> {
    try {
      const eta = await this.computeLiveEta(assignmentId, thresholdM);
      if (eta.distanceKm == null) {
        return { isNearby: false, distanceM: null };
      }
      const distanceM = eta.distanceKm * 1000;
      return { isNearby: eta.isNearby, distanceM: Math.round(distanceM) };
    } catch {
      return { isNearby: false, distanceM: null };
    }
  }
}
