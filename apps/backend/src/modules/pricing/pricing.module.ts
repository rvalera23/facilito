// apps/backend/src/modules/pricing/pricing.module.ts

import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';

/**
 * ============================================================
 * 🔥 PRICING MODULE
 * ============================================================
 * 
 * Módulo que expone el PricingService.
 * 
 * El PricingService es PURO (no depende de DB ni de otros servicios),
 * así que este módulo no importa nada más.
 * 
 * Otros módulos (OrdersModule, CartModule, etc.) pueden importar
 * este módulo para usar el PricingService.
 * 
 * ============================================================
 */
@Module({
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}