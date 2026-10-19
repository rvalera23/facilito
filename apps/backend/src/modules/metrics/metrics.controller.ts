// ==========================================
// ARCHIVO: apps/backend/src/modules/metrics/metrics.controller.ts
// Métricas básicas para observabilidad.
// ==========================================

import { Controller, Get, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  /**
   * GET /metrics/delivery
   * Métricas operativas de delivery.
   */
  @Get('delivery')
  async getDeliveryMetrics(@Query('tenantId') tenantId?: string) {
    const params: any[] = [];
    let tenantFilter = '';
    if (tenantId) {
      params.push(tenantId);
      tenantFilter = `AND o."tenantId" = $1`;
    }

    // Drivers: total, online, por status
    const driversByStatus: Array<{ status: string; count: string }> =
      await this.dataSource.query(
        `SELECT status, COUNT(*)::text AS count
           FROM delivery_drivers
          GROUP BY status`,
      );

    // Drivers propios vs pool
    const driversOwnership: Array<{ scope: string; count: string }> =
      await this.dataSource.query(
        `SELECT
            CASE WHEN tenant_id IS NULL THEN 'pool' ELSE 'tenant' END AS scope,
            COUNT(*)::text AS count
           FROM delivery_drivers
          GROUP BY scope`,
      );

    // Assignments por estado
    const assignmentsByStatus: Array<{ status: string; count: string }> =
      await this.dataSource.query(
        `SELECT a.status, COUNT(*)::text AS count
           FROM delivery_assignments a
           JOIN orders o ON o.id = a.order_id
          WHERE 1=1 ${tenantFilter}
          GROUP BY a.status`,
        params,
      );

    // Órdenes de delivery activas (no completadas/canceladas)
    const activeOrdersRows: Array<{ count: string }> =
      await this.dataSource.query(
        `SELECT COUNT(*)::text AS count
           FROM orders o
          WHERE o."orderType" = 'delivery'
            AND o.status NOT IN ('COMPLETED', 'CANCELLED')
            ${tenantFilter}`,
        params,
      );

    // Órdenes con delivery local calculado (fee > 0 o fee = 0 explícito)
    const ordersWithDeliveryFeeRows: Array<{ count: string }> =
      await this.dataSource.query(
        `SELECT COUNT(*)::text AS count
           FROM orders o
          WHERE o.delivery_fee_calculated IS NOT NULL
            ${tenantFilter}`,
        params,
      );

    // Zonas activas por tenant (si hay tenantId)
    let zonesActiveCount = 0;
    if (tenantId) {
      const zonesRows: Array<{ count: string }> = await this.dataSource.query(
        `SELECT COUNT(*)::text AS count
           FROM delivery_zones
          WHERE tenant_id = $1 AND is_active = true`,
        [tenantId],
      );
      zonesActiveCount = Number(zonesRows?.[0]?.count ?? 0);
    } else {
      const zonesRows: Array<{ count: string }> = await this.dataSource.query(
        `SELECT COUNT(*)::text AS count
           FROM delivery_zones
          WHERE is_active = true`,
      );
      zonesActiveCount = Number(zonesRows?.[0]?.count ?? 0);
    }

    return {
      generatedAt: new Date().toISOString(),
      tenantId: tenantId || null,
      redis: {
        connected: this.redis.isReady(),
      },
      drivers: {
        byStatus: driversByStatus.reduce(
          (acc, row) => ({ ...acc, [row.status]: Number(row.count) }),
          {},
        ),
        byOwnership: driversOwnership.reduce(
          (acc, row) => ({ ...acc, [row.scope]: Number(row.count) }),
          {},
        ),
      },
      assignments: {
        byStatus: assignmentsByStatus.reduce(
          (acc, row) => ({ ...acc, [row.status]: Number(row.count) }),
          {},
        ),
      },
      orders: {
        activeDelivery: Number(activeOrdersRows?.[0]?.count ?? 0),
        withDeliveryFee: Number(ordersWithDeliveryFeeRows?.[0]?.count ?? 0),
      },
      zones: {
        active: zonesActiveCount,
      },
    };
  }
}
