// ARCHIVO: backend/src/modules/notifications/dto/create-notification.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsObject, IsIn } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  userId: string;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  // 🔥 CAMPO NUEVO: bookingId para servicios/citas
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de notificación es obligatorio' })
  type: string;

  @IsString()
  @IsNotEmpty({ message: 'El título de la notificación es obligatorio' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'El mensaje de la notificación es obligatorio' })
  message: string;

  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  @IsIn(['buyer', 'seller'], { message: 'source debe ser "buyer" o "seller"' })
  source?: string;
}