// ARCHIVO: apps/backend/src/modules/tenants/dto/store-rating.dto.ts

import { IsUUID, IsNotEmpty, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class StoreRatingDto {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  userId: string;

  @IsInt()
  @Min(1, { message: 'La valoración debe ser al menos 1 estrella' })
  @Max(5, { message: 'La valoración no puede ser mayor a 5 estrellas' })
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}