// ARCHIVO: apps/backend/src/modules/shipping-disputes/dto/create-dispute.dto.ts

import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const DISPUTE_REASONS = [
  'not_received',
  'wrong_item',
  'damaged',
  'late',
] as const;

export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export class CreateDisputeDto {
  @IsString()
  orderId: string;

  @IsIn(DISPUTE_REASONS as unknown as string[])
  reason: DisputeReason;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  buyerMessage?: string;
}