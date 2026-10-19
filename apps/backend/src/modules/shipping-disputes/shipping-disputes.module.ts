// ARCHIVO: apps/backend/src/modules/shipping-disputes/shipping-disputes.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingDisputeEntity } from './entities/shipping-dispute.entity';
import { ShippingDisputesService } from './shipping-disputes.service';
import { ShippingDisputesController } from './shipping-disputes.controller';
import { ShippingDisputesScheduler } from './shipping-disputes.scheduler';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingDisputeEntity]),
    OrdersModule,
    NotificationsModule,
    AuthModule,
    AccountModule,
  ],
  controllers: [ShippingDisputesController],
  providers: [ShippingDisputesService, ShippingDisputesScheduler],
  exports: [ShippingDisputesService],
})
export class ShippingDisputesModule {}