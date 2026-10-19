// apps/backend/src/modules/orders/dto/create-order.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsObject,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================
 * 🔥 DTO DEL ITEM DE LA ORDEN
 * ============================================================
 *
 * El frontend solo manda:
 *   - productId o serviceId
 *   - quantity
 *
 * El backend calcula TODO lo demás con PricingService:
 *   - precios (base, IVA, total)
 *   - descuentos (si aplica)
 *   - tipo y tasa de IVA (según el producto)
 *
 * El frontend NO puede mandar precios. Si los manda, se ignoran.
 * ============================================================
 */
class OrderItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsNumber()
  @Min(1, { message: 'La cantidad mínima es 1' })
  @IsOptional()
  quantity?: number;

  // ============================================================
  // 🔥 CAMPOS OPCIONALES DE CONTEXTO (solo para servicios)
  // ============================================================
  @IsString()
  @IsOptional()
  appointmentDate?: string;

  @IsString()
  @IsOptional()
  appointmentTime?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  type?: string;

  // ============================================================
  // ⚠️ CAMPOS IGNORADOS POR EL BACKEND
  // ============================================================
  // Estos campos se aceptan por compatibilidad (si el frontend viejo
  // los manda), pero el backend NO los usa. El backend recalcula
  // todo con PricingService.
  //
  // NO agregar nuevos campos de precios aquí.
  // ============================================================
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  priceUsd?: number;

  @IsNumber()
  @IsOptional()
  priceVes?: number;

  @IsString()
  @IsOptional()
  ivaType?: string;

  @IsNumber()
  @IsOptional()
  ivaRate?: number;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsOptional()
  mediaUrls?: string[];
}

/**
 * ============================================================
 * 🔥 DTO DE DELIVERY
 * ============================================================
 */
class DeliveryDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsNumber()
  @IsOptional()
  costUsd?: number;

  @IsNumber()
  @IsOptional()
  costVes?: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  estimatedDays?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  trackingUrl?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  selected?: boolean;
}

/**
 * ============================================================
 * 🔥 DTO DE CREACIÓN DE ORDEN
 * ============================================================
 *
 * IMPORTANTE:
 * - El frontend NO manda totales.
 * - El backend calcula TODO con PricingService.
 * - Los campos `subtotal`, `tax`, `discount`, `totalAmount`,
 *   `totalUsd`, `totalVes` NO EXISTEN en este DTO.
 * - Si un cliente viejo los manda, simplemente se ignoran.
 * ============================================================
 */
export class CreateOrderDto {
  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  orderType?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  customerName: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsNotEmpty({ message: 'La orden debe contener al menos un producto o servicio' })
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  paymentMethodUsed?: string;

  @IsString()
  @IsOptional()
  bankSource?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  clientIdNumber?: string;

  @IsString()
  @IsOptional()
  clientIdType?: string;

  @IsString()
  @IsOptional()
  clientPhone?: string;

  @IsString()
  @IsOptional()
  clientAccountType?: string;

  @IsString()
  @IsOptional()
  senderEmail?: string;

  @IsString()
  @IsOptional()
  @IsIn(['web', 'kiosk', 'admin', 'buyer'], { message: 'source debe ser web, kiosk, admin o buyer' })
  source?: string;

  @IsObject()
  @IsOptional()
  serviceDetails?: {
    date: string;
    time: string;
    duration: number;
    notes?: string;
    professionalId?: string;
    professionalName?: string;
  };

  @ValidateNested()
  @Type(() => DeliveryDto)
  @IsOptional()
  delivery?: DeliveryDto;

  // ============================================================
  // 🔥 DELIVERY LOCAL (facilito)
  // ============================================================
  // Coords del comprador. Si vienen y fulfillment !== 'pickup',
  // el backend calcula delivery local con GeoService.checkDelivery().
  // ============================================================
  @IsNumber()
  @IsOptional()
  buyerLat?: number;

  @IsNumber()
  @IsOptional()
  buyerLng?: number;

  @IsString()
  @IsOptional()
  @IsIn(['delivery', 'pickup', 'shipping'], { message: "fulfillment debe ser 'delivery', 'pickup' o 'shipping'" })
  fulfillment?: string;

  // ============================================================
  // 🔥 SALDO A FAVOR
  // ============================================================
  // Si es true, el service aplica el saldo del usuario al total
  // de la orden (descuenta del totalAmountVes y del user_credits).
  // ============================================================
  @IsBoolean()
  @IsOptional()
  applyCreditBalance?: boolean;
}