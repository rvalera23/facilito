// ARCHIVO: backend/src/modules/orders/orders.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderEntity } from './entities/order.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { UserCredit } from '../account/entities/user-credit.entity'; // 🔥 NUEVO
import { TenantsModule } from '../tenants/tenants.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CurrencyModule } from '../currency/currency.module'; // 🔥 IMPORTAR CurrencyModule
import { PricingModule } from '../pricing/pricing.module'; // 🔥 IMPORTAR PricingModule
import { ReceiptsModule } from '../receipts/receipts.module'; // 🔥 RECEIPTS
import { AccountModule } from '../account/account.module';
import { GeoModule } from '../geo/geo.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      ProductEntity,
      ServiceEntity,
      TenantEntity,
      UserCredit, // 🔥 NUEVO
    ]),
    TenantsModule,
    forwardRef(() => NotificationsModule),
    CurrencyModule, // 🔥 AGREGAR CurrencyModule AQUÍ
    PricingModule,
    ReceiptsModule, // 🔥 RECEIPTS
    AccountModule, // 🔥 NUEVO: para acreditar saldo a favor
    GeoModule, // 🔥 DELIVERY LOCAL: cálculo de fee/ETA por cercanía y zonas
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}