// apps/backend/src/modules/cart/cart.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';

import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { CurrencyService } from '../currency/currency.service';
import { PricingService } from '../pricing/pricing.service';
import {
  ItemPricing,
  CartTotals,
  ExchangeRates,
} from '../pricing/types/pricing.types';

import { QuoteCartDto } from './dto/quote-cart.dto';
import { QuoteServiceDto } from './dto/quote-service.dto';

/**
 * ============================================================
 * 🔥 CART SERVICE
 * ============================================================
 * 
 * Orquesta la cotización de un carrito:
 * 
 * 1. Recibe [{ productId, quantity }]
 * 2. Carga los productos de la DB
 * 3. Pide las tasas del día a CurrencyService
 * 4. Llama a PricingService para calcular cada item
 * 5. Suma los totales
 * 6. Devuelve el response con warnings (si hay productos faltantes)
 * 
 * ⚠️ NO crea órdenes. Solo cotiza.
 * 
 * ============================================================
 */

export interface CartQuoteResponse extends CartTotals {
  warnings: CartQuoteWarning[];
}

export interface CartQuoteWarning {
  type: 'product_removed' | 'product_unavailable' | 'stock_insufficient';
  message: string;
  productId: string;
}

export interface ServiceQuoteResponse {
  items: ItemPricing[];
  totals: CartTotals;
  warnings: CartQuoteWarning[];
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,

    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,

    private readonly currencyService: CurrencyService,
    private readonly pricingService: PricingService,
  ) {}

  // ============================================================
  // 🔥 COTIZAR CARRITO DE PRODUCTOS
  // ============================================================

  async quoteCart(dto: QuoteCartDto): Promise<CartQuoteResponse> {
    this.logger.log(
      `Cotizando carrito con ${dto.items.length} items únicos`,
    );

    // --- 1. Obtener tasas del día ---
    const rates = await this.getRatesOrThrow();
    const exchangeRateSource = 'BCV via DolarApi';

    // --- 2. Cargar todos los productos de una sola query ---
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productRepository.find({
      where: {
        id: In(productIds),
        deletedAt: IsNull(),
      },
    });

    // --- 3. Indexar por ID para búsqueda rápida ---
    const productMap = new Map<string, ProductEntity>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    // --- 4. Calcular cada item ---
    const itemPricings: ItemPricing[] = [];
    const warnings: CartQuoteWarning[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);

      // Producto no existe o fue eliminado
      if (!product) {
        warnings.push({
          type: 'product_removed',
          message: `El producto ${item.productId} ya no está disponible`,
          productId: item.productId,
        });
        continue;
      }

      // Producto no está publicado / activo
      if (product.isActive === false || product.status !== 'published') {
        warnings.push({
          type: 'product_unavailable',
          message: `"${product.name}" no está disponible actualmente`,
          productId: product.id,
        });
        continue;
      }

      // Calcular precio
      const pricing = this.pricingService.computeProductPricing(
        product,
        item.quantity,
        rates,
        exchangeRateSource,
      );

      // No se pudo calcular (sin precio)
      if (!pricing) {
        warnings.push({
          type: 'product_unavailable',
          message: `"${product.name}" no tiene un precio válido configurado`,
          productId: product.id,
        });
        continue;
      }

      // Stock insuficiente (solo warning, no bloquea)
      if (typeof product.stock === 'number' && product.stock < item.quantity) {
        warnings.push({
          type: 'stock_insufficient',
          message: `Solo quedan ${product.stock} unidades de "${product.name}"`,
          productId: product.id,
        });
      }

      itemPricings.push(pricing);
    }

    // --- 5. Sumar totales ---
    const totals = this.pricingService.computeCartTotals(itemPricings);

    // --- 6. Devolver ---
    return {
      ...totals,
      warnings,
    };
  }

  // ============================================================
  // 🔥 COTIZAR RESERVA DE SERVICIO
  // ============================================================

  async quoteService(dto: QuoteServiceDto): Promise<ServiceQuoteResponse> {
    this.logger.log(
      `Cotizando servicio ${dto.serviceId} para ${dto.appointmentDate} ${dto.appointmentTime}`,
    );

    // --- 1. Obtener tasas del día ---
    const rates = await this.getRatesOrThrow();
    const exchangeRateSource = 'BCV via DolarApi';

    // --- 2. Cargar el servicio ---
    const service = await this.serviceRepository.findOne({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new BadRequestException(
        `El servicio ${dto.serviceId} no existe o fue eliminado`,
      );
    }

    if (service.isActive === false || service.status !== 'published') {
      throw new BadRequestException(
        `"${service.name}" no está disponible actualmente`,
      );
    }

    // --- 3. Calcular precio ---
    const pricing = this.pricingService.computeServicePricing(
      service,
      dto.quantity,
      rates,
      exchangeRateSource,
    );

    if (!pricing) {
      throw new BadRequestException(
        `"${service.name}" no tiene un precio válido configurado`,
      );
    }

    // --- 4. Sumar totales ---
    const totals = this.pricingService.computeCartTotals([pricing]);

    // --- 5. Devolver ---
    return {
      items: [pricing],
      totals,
      warnings: [],
    };
  }

  // ============================================================
  // 🔥 HELPERS PRIVADOS
  // ============================================================

  /**
   * Obtiene las tasas del día o lanza una excepción clara.
   */
  private async getRatesOrThrow(): Promise<ExchangeRates> {
    try {
      const result = await this.currencyService.getRates();

      if (!result || !result.success || !result.rates) {
        throw new Error('Respuesta de tasas inválida');
      }

      const usd = Number(result.rates.USD);

      if (!usd || usd <= 0) {
        throw new Error(`Tasa USD inválida: ${usd}`);
      }

      return {
        USD: usd,
        EUR: Number(result.rates.EUR) || 0,
        CRYPTO: Number(result.rates.CRYPTO || result.rates.USD) || usd,
        IVA: Number(result.rates.IVA || 16),
      };
    } catch (error) {
      this.logger.error('No se pudieron obtener las tasas del día', error);
      throw new BadRequestException(
        'No se pudieron obtener las tasas de cambio del día. Intenta más tarde.',
      );
    }
  }
}