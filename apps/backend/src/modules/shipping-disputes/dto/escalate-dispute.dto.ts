// ARCHIVO: apps/backend/src/modules/shipping-disputes/dto/escalate-dispute.dto.ts

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EscalateDisputeDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}