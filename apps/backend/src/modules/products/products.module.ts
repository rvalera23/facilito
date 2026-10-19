// /opt/facilito/apps/backend/src/modules/products/products.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductEntity } from './entities/product.entity';
import { InventoryMovementEntity } from './entities/inventory-movement.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { CurrencyModule } from '../currency/currency.module'; // 🔥 AGREGAR ESTO
import { PricingModule } from '../pricing/pricing.module';


@Module({
  imports: [
TypeOrmModule.forFeature([ProductEntity, InventoryMovementEntity, TenantEntity]),
    TenantsModule,
    CurrencyModule, // 🔥 AGREGAR ESTO
        PricingModule,

  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}