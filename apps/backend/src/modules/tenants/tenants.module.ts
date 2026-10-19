// apps/backend/src/modules/tenants/tenants.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { GeoModule } from '../geo/geo.module';
import { TenantsController } from './tenants.controller';
import { TenantPaymentConfigService } from './tenant-payment-config.service';
import { Tenant } from './entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { UserTenant } from './entities/user-tenant.entity';
import { StoreLike } from './entities/store-like.entity';
import { StoreRating } from './entities/store-rating.entity';
import { UploadController } from './upload.controller';
import { CleanupService } from './cleanup.service';
import { AuthModule } from '../auth/auth.module'; // ✅ NUEVO

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      PaymentMethod,
      UserTenant,
      StoreLike,
      StoreRating,
    ]),
    forwardRef(() => AuthModule), // ✅ NUEVO
    GeoModule,
  ],
  controllers: [
    TenantsController,
    UploadController,
  ],
  providers: [
    TenantsService,
    TenantPaymentConfigService,
    CleanupService,
  ],
  exports: [
    TenantsService,
    TenantPaymentConfigService,
  ],
})
export class TenantsModule {}