// apps/backend/src/modules/cart/cart.controller.ts

import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

import { CartService } from './cart.service';
import { QuoteCartDto } from './dto/quote-cart.dto';
import { QuoteServiceDto } from './dto/quote-service.dto';

/**
 * ============================================================
 * 🔥 CART CONTROLLER
 * ============================================================
 * 
 * Endpoints PÚBLICOS para cotizar carritos.
 * NO crean órdenes. NO modifican nada. Solo calculan.
 * 
 * - POST /cart/quote          → cotiza productos
 * - POST /cart/service-quote  → cotiza una reserva de servicio
 * 
 * ============================================================
 */

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ============================================================
  // 🔥 COTIZAR CARRITO DE PRODUCTOS
  // ============================================================

  /**
   * POST /cart/quote
   * 
   * Body:
   * {
   *   "items": [
   *     { "productId": "uuid-1", "quantity": 2 },
   *     { "productId": "uuid-2", "quantity": 1 }
   *   ]
   * }
   * 
   * Response:
   * {
   *   "items": [...],
   *   "subtotalUSD": ...,
   *   "subtotalVES": ...,
   *   "totalUSD": ...,
   *   "totalVES": ...,
   *   "ivaType": "included",
   *   "exchangeRateUsed": 820,
   *   "calculatedAt": "2026-09-10T...",
   *   "warnings": [...]
   * }
   */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async quote(@Body() dto: QuoteCartDto) {
    return this.cartService.quoteCart(dto);
  }

  // ============================================================
  // 🔥 COTIZAR RESERVA DE SERVICIO
  // ============================================================

  /**
   * POST /cart/service-quote
   * 
   * Body:
   * {
   *   "serviceId": "uuid-service",
   *   "appointmentDate": "2026-09-15",
   *   "appointmentTime": "10:30",
   *   "quantity": 1
   * }
   * 
   * Response:
   * {
   *   "items": [...],
   *   "totals": {...},
   *   "warnings": []
   * }
   */
  @Post('service-quote')
  @HttpCode(HttpStatus.OK)
  async serviceQuote(@Body() dto: QuoteServiceDto) {
    return this.cartService.quoteService(dto);
  }
}