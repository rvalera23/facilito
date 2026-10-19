// ARCHIVO: apps/backend/src/modules/shipping-disputes/dto/resolve-dispute.dto.ts

import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const RESOLUTION_TYPES = [
  'refund',
  'replacement',
  'proof_of_delivery',
] as const;

export type ResolutionType = (typeof RESOLUTION_TYPES)[number];

export class ResolveDisputeDto {
  @IsIn(RESOLUTION_TYPES as unknown as string[])
  type: ResolutionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  amountUsd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}