
// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/dto/update-tenant-location.dto.ts
// Body para PATCH /tenants/:slug/location
// ==========================================

import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const PRECISIONS = ['exact', 'street', 'city', 'region'] as const;
const SOURCES = ['pin', 'geocoded', 'manual', 'gps'] as const;

export class UpdateTenantLocationDto {
  /**
   * Si latitude es null, se está "limpiando" la ubicación del tenant.
   * Permitimos null explícito para que el dueño pueda salir del ranking.
   */
  @ValidateIf((o) => o.latitude !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number | null;

  @ValidateIf((o) => o.longitude !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number | null;

  @ValidateIf((o) => o.latitude !== null)
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
