// apps/backend/src/modules/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { CurrencyModule } from '../currency/currency.module';
import { PricingModule } from '../pricing/pricing.module';

/**
 * ============================================================
 * 🔥 CART MODULE
 * ============================================================
 * 
 * Módulo que expone los endpoints de cotización.
 * 
 * Dependencias:
 * - TypeORM: para acceder a ProductEntity y ServiceEntity
 * - CurrencyModule: para obtener las tasas del día
 * - PricingModule: para calcular los precios
 * 
 * ============================================================
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ServiceEntity]),
    CurrencyModule,
    PricingModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}