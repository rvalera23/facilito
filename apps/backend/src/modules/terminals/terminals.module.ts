import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminalsService } from './terminals.service';
import { TerminalsController } from './terminals.controller';
import { Terminal } from './entities/terminal.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { PaymentMethod } from '../tenants/entities/payment-method.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ServiceEntity } from '../services/entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Terminal,
      OrderEntity,
      TenantEntity,
      PaymentMethod,
      BookingEntity,
      ServiceEntity,
    ]),
  ],
  controllers: [TerminalsController],
  providers: [TerminalsService],
  exports: [TerminalsService],
})
export class TerminalsModule {}