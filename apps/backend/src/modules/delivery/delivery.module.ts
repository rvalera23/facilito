// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery.module.ts
// ==========================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryDriversController } from './delivery-drivers.controller';
import { DeliveryDriversService } from './delivery-drivers.service';
import { ProfessionalAssignmentsController } from './professional-assignments.controller';
import { ProfessionalAssignmentsService } from './professional-assignments.service';
import { DeliveryGateway } from './delivery.gateway';
import { DeliveryEtaService } from './delivery-eta.service';
import { DeliveryOwnershipService } from './delivery-ownership.service';
import { DeliveryZoneEntity } from './entities/delivery-zone.entity';
import { DeliveryDriverEntity } from './entities/delivery-driver.entity';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { ProfessionalAssignmentEntity } from './entities/professional-assignment.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ProfessionalEntity } from '../professionals/entities/professional.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryZoneEntity,
      DeliveryDriverEntity,
      DeliveryAssignmentEntity,
      ProfessionalAssignmentEntity,
      BookingEntity,
      ProfessionalEntity,  // 🔥 NUEVO: repositorio que inyecta ProfessionalAssignmentsService
    ]),
  ],
  controllers: [
    DeliveryController,
    DeliveryDriversController,
    ProfessionalAssignmentsController,  // 🔥 NUEVO
  ],
  providers: [
    DeliveryService,
    DeliveryDriversService,
    ProfessionalAssignmentsService,  // 🔥 NUEVO
    DeliveryGateway,
    DeliveryEtaService,
    DeliveryOwnershipService,
  ],
  exports: [
    DeliveryService,
    DeliveryDriversService,
    ProfessionalAssignmentsService,  // 🔥 NUEVO: para BookingsModule
    DeliveryGateway,
    DeliveryEtaService,
    DeliveryOwnershipService,
  ],
})
export class DeliveryModule {}