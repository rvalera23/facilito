import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryModule } from '../delivery/delivery.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsScheduler } from './bookings.scheduler';
import { BookingEntity } from './entities/booking.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { ServiceEntity } from '../services/entities/service.entity';
import { ProfessionalEntity } from '../professionals/entities/professional.entity'; 
import { CurrencyModule } from '../currency/currency.module';
import { PricingModule } from '../pricing/pricing.module';
import { TurnNumberService } from './turn-number.service';
import { TurnCounterEntity } from './entities/turn-counter.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      TenantEntity,
      ProfessionalEntity, 
      ServiceEntity,
      TurnCounterEntity,
      OrderEntity,
    ]),
    TenantsModule,
    CurrencyModule,
    PricingModule,
    NotificationsModule,
    DeliveryModule,  // 🔥 NUEVO: para inyectar ProfessionalAssignmentsService
  ],
  controllers: [BookingsController],
providers: [
  BookingsService,
  BookingsScheduler,
  TurnNumberService,
],
exports: [BookingsService, TurnNumberService],
})
export class BookingsModule {}