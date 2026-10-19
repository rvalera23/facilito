// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/geo.module.ts
// ==========================================

import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
