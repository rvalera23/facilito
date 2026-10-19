// ==========================================
// ARCHIVO: apps/backend/src/common/redis/redis.module.ts
// Módulo GLOBAL. Disponible en toda la app sin importar.
// ==========================================

import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
