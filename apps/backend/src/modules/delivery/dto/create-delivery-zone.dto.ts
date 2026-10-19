// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/dto/create-delivery-zone.dto.ts
// Body para POST /delivery/zones/:tenantId
// ==========================================

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Un anillo de coordenadas: [[lng, lat], [lng, lat], ...].
 * El primer y último punto deben coincidir (anillo cerrado).
 */
class PolygonGeometryDto {
  @IsString()
  @IsNotEmpty()
  type: 'Polygon';

  @IsArray()
  @ArrayMinSize(1)
  coordinates: number[][][];
}

export class CreateDeliveryZoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PolygonGeometryDto)
  polygon: PolygonGeometryDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}