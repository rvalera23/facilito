import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsMeController } from './professionals-me.controller';
import { ProfessionalEntity } from './entities/professional.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { CurrencyModule } from '../currency/currency.module';
import { User } from '../auth/entities/user.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { AuthModule } from '../auth/auth.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfessionalEntity, TenantEntity, User, BookingEntity]),
    TenantsModule,
    CurrencyModule,
    AuthModule,
    PassportModule,
  ],
  controllers: [ProfessionalsMeController, ProfessionalsController],
      providers: [ProfessionalsService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}