// apps/backend/src/modules/cart/dto/quote-service.dto.ts

import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================
 * 🔥 DTO: Cotizar una RESERVA DE SERVICIO
 * ============================================================
 * 
 * Body esperado:
 * {
 *   "serviceId": "uuid-service",
 *   "appointmentDate": "2026-09-15",
 *   "appointmentTime": "10:30",
 *   "quantity": 1,
 *   "professionalId": "uuid-prof"  // opcional
 * }
 * 
 * ⚠️ El frontend NO manda precios. Solo serviceId + fecha/hora.
 * El backend calcula TODO con PricingService.
 * 
 * ============================================================
 */

export class QuoteServiceDto {
  @IsString()
  serviceId: string;

  @IsDateString()
  appointmentDate: string; // formato ISO: "2026-09-15"

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'appointmentTime debe estar en formato HH:MM (24 horas)',
  })
  appointmentTime: string; // formato "HH:MM"

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number = 1;

  @IsOptional()
  @IsString()
  professionalId?: string;
}