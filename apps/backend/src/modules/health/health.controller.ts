// ==========================================
// ARCHIVO: apps/backend/src/modules/health/health.controller.ts
// Endpoints de health check. Sin autenticación (público).
// ==========================================

import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  /**
   * GET /health
   * Estado general del servicio.
   */
  @Get()
  async getHealth() {
    const uptimeSec = Math.floor((Date.now() - this.startedAt) / 1000);
    return {
      status: 'ok',
      uptimeSec,
      timestamp: new Date().toISOString(),
      service: 'facilito-backend',
    };
  }

  /**
   * GET /health/db
   */
  @Get('db')
  async getDbHealth() {
    try {
      const rows: any[] = await this.dataSource.query('SELECT 1 AS ok');
      const ok = rows?.[0]?.ok === 1;
      return {
        status: ok ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'error',
        error: err?.message || String(err),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * GET /health/redis
   */
  @Get('redis')
  async getRedisHealth() {
    const ready = this.redis.isReady();
    if (!ready) {
      return {
        status: 'unavailable',
        connected: false,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      status: 'ok',
      connected: true,
      timestamp: new Date().toISOString(),
    };
  }
}
