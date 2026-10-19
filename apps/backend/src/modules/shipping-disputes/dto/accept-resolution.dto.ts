// ARCHIVO: apps/backend/src/modules/shipping-disputes/dto/accept-resolution.dto.ts

import { IsBoolean } from 'class-validator';

export class AcceptResolutionDto {
  @IsBoolean()
  accepted: boolean;
}