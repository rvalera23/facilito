// ==========================================
// ARCHIVO: apps/backend/src/modules/auth/dto/update-user-location.dto.ts
// Body para PUT /api/auth/me/location
// ==========================================

import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

const PRECISIONS = ['exact', 'street', 'city', 'region'] as const;
const SOURCES = ['pin', 'geocoded', 'manual', 'gps'] as const;

export class UpdateUserLocationDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsIn(PRECISIONS, {
    message: `geoPrecision debe ser uno de: ${PRECISIONS.join(', ')}`,
  })
  geoPrecision: (typeof PRECISIONS)[number];

  @IsOptional()
  @IsIn(SOURCES, {
    message: `geoSource debe ser uno de: ${SOURCES.join(', ')}`,
  })
  geoSource?: (typeof SOURCES)[number];
}