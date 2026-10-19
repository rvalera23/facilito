// /opt/facilito/apps/backend/src/modules/services/services.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceEntity } from './entities/service.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { CurrencyModule } from '../currency/currency.module'; // 🔥 AGREGAR ESTO
import { PricingModule } from '../pricing/pricing.module';   // 🔥 NUEVO


@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceEntity, TenantEntity]),
    TenantsModule,
    CurrencyModule, // 🔥 AGREGAR ESTO
    PricingModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}