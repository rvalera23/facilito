// ARCHIVO: apps/backend/src/modules/shipping-disputes/dto/respond-dispute.dto.ts

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RespondDisputeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  response: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}