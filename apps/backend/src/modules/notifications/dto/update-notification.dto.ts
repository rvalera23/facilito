// ARCHIVO: backend/src/modules/notifications/dto/update-notification.dto.ts

import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @IsBoolean()
  @IsOptional()
  read?: boolean;
}