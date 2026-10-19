// ARCHIVO: backend/src/modules/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { EnhancedNotificationService } from './enhanced-notification.service'; // 🆕 NUEVO
import { NotificationEntity } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      User,
      OrderEntity,
      TenantEntity,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,           // ✅ EXISTENTE - SIN CAMBIOS
    NotificationsGateway,           // ✅ EXISTENTE - SIN CAMBIOS
    EnhancedNotificationService,    // 🆕 NUEVO - EXTENSIÓN MEJORADA
  ],
  exports: [
    NotificationsService,           // ✅ EXISTENTE - Para compatibilidad
    NotificationsGateway,           // ✅ EXISTENTE - Para compatibilidad
    EnhancedNotificationService,    // 🆕 NUEVO - Para usar el sistema mejorado
  ],
})
export class NotificationsModule {}