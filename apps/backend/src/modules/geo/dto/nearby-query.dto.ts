// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/dto/nearby-query.dto.ts
// Validación de query params para endpoints /geo/nearby/*
// ==========================================

import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class NearbyQueryDto {
  /** Latitud del centro de búsqueda (obligatoria). */
  @Type(() => Number)
  @IsNumber({}, { message: 'lat debe ser un número' })
  @Min(-90, { message: 'lat debe ser >= -90' })
  @Max(90, { message: 'lat debe ser <= 90' })
  lat: number;

  /** Longitud del centro de búsqueda (obligatoria). */
  @Type(() => Number)
  @IsNumber({}, { message: 'lng debe ser un número' })
  @Min(-180, { message: 'lng debe ser >= -180' })
  @Max(180, { message: 'lng debe ser <= 180' })
  lng: number;

  /** Radio máximo en km. Default 25, máximo 200. */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(200)
  radiusKm?: number = 25;

  /** Cantidad máxima de resultados. Default 20, máximo 100. */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** Zona declarada del usuario (opcional, para el bonus "en tu zona"). */
  @IsString()
  @IsOptional()
  userZone?: string;

  /** Texto de búsqueda opcional (solo para /geo/nearby/search). */
  @IsString()
  @IsOptional()
  q?: string;
}
