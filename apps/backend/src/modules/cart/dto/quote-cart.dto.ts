// apps/backend/src/modules/cart/dto/quote-cart.dto.ts

import {
  IsArray,
  IsString,
  IsInt,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================
 * 🔥 DTO: Cotizar un carrito de PRODUCTOS
 * ============================================================
 * 
 * Body esperado:
 * {
 *   "items": [
 *     { "productId": "uuid-1", "quantity": 2 },
 *     { "productId": "uuid-2", "quantity": 1 }
 *   ]
 * }
 * 
 * ⚠️ El frontend NO manda precios. Solo productId + quantity.
 * El backend calcula TODO con PricingService.
 * 
 * ============================================================
 */

export class QuoteCartItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class QuoteCartDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'El carrito debe tener al menos 1 producto' })
  @ArrayMaxSize(100, { message: 'El carrito no puede tener más de 100 items' })
  @ValidateNested({ each: true })
  @Type(() => QuoteCartItemDto)
  items: QuoteCartItemDto[];
}