// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/dto/check-delivery.dto.ts
// Body de POST /geo/check-delivery.
// ==========================================

import { IsNumber, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CheckDeliveryDto {
  /** Latitud del comprador. */
  @IsNumber()
  @IsNotEmpty()
  buyerLat: number;

  /** Longitud del comprador. */
  @IsNumber()
  @IsNotEmpty()
  buyerLng: number;

  /** Slug del tenant al que se quiere pedir. */
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;

  /** Monto del carrito (opcional). Si viene, se valida contra deliveryMinOrder. */
  @IsNumber()
  @IsOptional()
  orderSubtotal?: number;
}