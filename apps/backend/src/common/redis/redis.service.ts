// ==========================================
// ARCHIVO: apps/backend/src/common/redis/redis.service.ts
// Wrapper global de Redis. Provee get/set JSON, TTL, y helpers.
// Si Redis no está disponible, todos los métodos fallan en silencio
// (devuelven null / no hacen nada) para no romper la app.
// ==========================================

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private connected = false;

  async onModuleInit() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);

    try {
      const client = createClient({
        socket: {
          host,
          port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.warn(
                'Redis: demasiados intentos de reconexión, me detengo.',
              );
              return new Error('Redis reconnect limit reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      client.on('error', (err) => {
        // No spamear: logueamos solo el mensaje
        this.logger.warn(`Redis error: ${err?.message || err}`);
        this.connected = false;
      });

      client.on('connect', () => {
        this.logger.log(`Redis conectado a ${host}:${port}`);
        this.connected = true;
      });

      client.on('end', () => {
        this.logger.warn('Redis: conexión cerrada');
        this.connected = false;
      });

      await client.connect();
      this.client = client as RedisClientType;
    } catch (err: any) {
      this.logger.warn(
        `Redis no disponible (${host}:${port}): ${err?.message || err}. La app seguirá funcionando sin caché.`,
      );
      this.client = null;
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        await this.client.quit();
      }
    } catch {
      // ignorar
    }
  }

  isReady(): boolean {
    return this.connected && this.client != null;
  }

  // ============================================================
  // JSON helpers
  // ============================================================

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isReady()) return;
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client!.set(key, payload, { EX: ttlSeconds });
      } else {
        await this.client!.set(key, payload);
      }
    } catch (err: any) {
      this.logger.warn(`Redis setJson falló (${key}): ${err?.message || err}`);
    }
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;
    try {
      const raw = await this.client!.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err: any) {
      this.logger.warn(`Redis getJson falló (${key}): ${err?.message || err}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis del falló (${key}): ${err?.message || err}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    try {
      const n = await this.client!.exists(key);
      return n > 0;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Sets (para índices de drivers online por tenant, etc.)
  // ============================================================

  async sAdd(key: string, member: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.sAdd(key, member);
    } catch (err: any) {
      this.logger.warn(`Redis sAdd falló (${key}): ${err?.message || err}`);
    }
  }

  async sRem(key: string, member: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.sRem(key, member);
    } catch (err: any) {
      this.logger.warn(`Redis sRem falló (${key}): ${err?.message || err}`);
    }
  }

  async sMembers(key: string): Promise<string[]> {
    if (!this.isReady()) return [];
    try {
      return await this.client!.sMembers(key);
    } catch {
      return [];
    }
  }

  // ============================================================
  // Helpers específicos de delivery
  // ============================================================

  /** Cachea la posición del driver. TTL por defecto: 30s. */
  async setDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
    ttlSeconds: number = 30,
  ): Promise<void> {
    await this.setJson(
      `driver:loc:${driverId}`,
      { lat, lng, at: new Date().toISOString() },
      ttlSeconds,
    );
  }

  async getDriverLocation(
    driverId: string,
  ): Promise<{ lat: number; lng: number; at: string } | null> {
    return this.getJson(`driver:loc:${driverId}`);
  }

  async delDriverLocation(driverId: string): Promise<void> {
    await this.del(`driver:loc:${driverId}`);
  }

  /** Índice de drivers online por tenant (para búsquedas rápidas). */
  private tenantOnlineKey(tenantId: string | null): string {
    return tenantId ? `tenant:drivers_online:${tenantId}` : 'pool:drivers_online';
  }

  async markDriverOnline(driverId: string, tenantId: string | null): Promise<void> {
    await this.sAdd(this.tenantOnlineKey(tenantId), driverId);
  }

  async markDriverOffline(driverId: string, tenantId: string | null): Promise<void> {
    await this.sRem(this.tenantOnlineKey(tenantId), driverId);
  }

  async listOnlineDrivers(tenantId: string | null): Promise<string[]> {
    return this.sMembers(this.tenantOnlineKey(tenantId));
  }

  // ============================================================
  // Helpers específicos de profesionales (servicios a domicilio)
  // ============================================================

  /** Cachea la posición del profesional. TTL por defecto: 30s. */
  async setProfessionalLocation(
    professionalId: string,
    lat: number,
    lng: number,
    ttlSeconds: number = 30,
  ): Promise<void> {
    await this.setJson(
      `professional:loc:${professionalId}`,
      { lat, lng, at: new Date().toISOString() },
      ttlSeconds,
    );
  }

  async getProfessionalLocation(
    professionalId: string,
  ): Promise<{ lat: number; lng: number; at: string } | null> {
    return this.getJson(`professional:loc:${professionalId}`);
  }

  async delProfessionalLocation(professionalId: string): Promise<void> {
    await this.del(`professional:loc:${professionalId}`);
  }

  /** Índice de profesionales online por tenant. */
  private tenantOnlineProfessionalsKey(tenantId: string | null): string {
    return tenantId
      ? `tenant:professionals_online:${tenantId}`
      : 'pool:professionals_online';
  }

  async markProfessionalOnline(
    professionalId: string,
    tenantId: string | null,
  ): Promise<void> {
    await this.sAdd(this.tenantOnlineProfessionalsKey(tenantId), professionalId);
  }

  async markProfessionalOffline(
    professionalId: string,
    tenantId: string | null,
  ): Promise<void> {
    await this.sRem(this.tenantOnlineProfessionalsKey(tenantId), professionalId);
  }

  async listOnlineProfessionals(tenantId: string | null): Promise<string[]> {
    return this.sMembers(this.tenantOnlineProfessionalsKey(tenantId));
  }
}
