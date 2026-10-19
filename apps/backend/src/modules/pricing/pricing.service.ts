// apps/backend/src/modules/pricing/pricing.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import {
  ExchangeRates,
  ItemPricing,
  CartTotals,
  IvaType,
  CartIvaType,
  DEFAULT_IVA_RATE,
  round2,
  round4,
} from './types/pricing.types';

/**
 * ============================================================
 * 🔥 PRICING SERVICE
 * ============================================================
 *
 * Motor de cálculo de precios. Función PURA.
 *
 * REGLAS MATEMÁTICAS (críticas):
 *
 * 1. El USD es el ANCLA. El VES se calcula con la tasa del día.
 *
 * 2. El descuento se aplica SIEMPRE sobre la BASE (sin IVA).
 *
 * 3. IVA 'excluded':
 *      baseOriginal      = precioUSD
 *      baseConDescuento  = baseOriginal × (1 - desc%)
 *      taxAmount         = baseConDescuento × (ivaRate / 100)
 *      totalPrice        = baseConDescuento + taxAmount
 *
 * 4. IVA 'included':
 *      baseOriginal      = precioUSD / (1 + ivaRate / 100)
 *      baseConDescuento  = baseOriginal × (1 - desc%)
 *      taxAmount         = baseConDescuento × (ivaRate / 100)
 *      totalPrice        = baseConDescuento + taxAmount
 *
 * 5. IVA 'exempt':
 *      baseOriginal      = precioUSD
 *      baseConDescuento  = baseOriginal × (1 - desc%)
 *      taxAmount         = 0
 *      totalPrice        = baseConDescuento
 *
 * 6. SEMÁNTICA DE CAMPOS DEVUELTOS:
 *      basePriceVES          = base CON descuento, SIN IVA (lo que se cobra)
 *      basePriceOriginalVES  = base SIN descuento, SIN IVA (para tachar)
 *      taxAmountVES          = IVA sobre la base con descuento
 *      totalPriceVES         = base con descuento + IVA
 *      discountAmountVES     = baseOriginal - baseConDescuento
 *      originalPriceVES      = baseOriginal + IVA sobre baseOriginal (para tachar)
 *
 * 7. Redondeo: solo al construir el response, no en pasos intermedios.
 *
 * ESTE SERVICIO NO TOCA LA DB NI HACE LLAMADAS HTTP.
 * Recibe los objetos ya cargados y devuelve el cálculo.
 *
 * ============================================================
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  // ============================================================
  // 🔥 CALCULAR PRECIO DE UN PRODUCTO
  // ============================================================

  /**
   * Calcula el precio de un producto.
   * Devuelve null si el producto no tiene precio válido.
   */
  computeProductPricing(
    product: ProductEntity,
    quantity: number,
    rates: ExchangeRates,
    exchangeRateSource: string = 'BCV via DolarApi',
  ): ItemPricing | null {
    // --- Validaciones básicas ---
    if (!product) return null;
    if (!rates || rates.USD <= 0) {
      this.logger.error(
        `computeProductPricing: tasa USD inválida (${rates?.USD})`,
      );
      return null;
    }

    // --- Obtener USD ancla ---
    const anchoredUSD = this.getProductAnchoredUSD(product);
    if (anchoredUSD === null || anchoredUSD <= 0) {
      this.logger.warn(
        `Producto ${product.id} sin precio USD válido. Ignorando.`,
      );
      return null;
    }

    // --- Obtener tipo y tasa de IVA ---
    const ivaType: IvaType = this.normalizeIvaType(product.ivaType);
    const ivaRate = this.normalizeIvaRate(product.ivaRate, rates.IVA);

    // --- Obtener descuento activo ---
    const discountPercentage = this.getActiveDiscountPercentage(product);

    // --- Calcular base SIN descuento, SIN IVA (USD) ---
    const basePriceOriginalUSD = this.extractBaseFromUSD(
      anchoredUSD,
      ivaType,
      ivaRate,
    );

    // --- Aplicar descuento sobre la base ---
    const hasDiscount = discountPercentage > 0;
    const discountFactor = hasDiscount ? 1 - discountPercentage / 100 : 1;
    const basePriceUSD = basePriceOriginalUSD * discountFactor;

    // --- Calcular IVA sobre la base CON descuento (USD) ---
    const taxAmountUSD = this.calculateTax(basePriceUSD, ivaType, ivaRate);

    // --- Precio final unitario CON descuento + IVA (USD) ---
    const totalPriceUSD = basePriceUSD + taxAmountUSD;

    // --- Descuento unitario (USD, sobre la base sin IVA) ---
    const discountAmountUSD = basePriceOriginalUSD - basePriceUSD;

    // --- Precio "original" CON IVA sin descuento (USD, para mostrar tachado) ---
    const taxAmountOriginalUSD = this.calculateTax(
      basePriceOriginalUSD,
      ivaType,
      ivaRate,
    );
    const originalPriceUSD = basePriceOriginalUSD + taxAmountOriginalUSD;

    // --- Convertir a VES con la tasa del día ---
    const basePriceVES = basePriceUSD * rates.USD;
    const basePriceOriginalVES = basePriceOriginalUSD * rates.USD;
    const taxAmountVES = taxAmountUSD * rates.USD;
    const totalPriceVES = totalPriceUSD * rates.USD;
    const discountAmountVES = discountAmountUSD * rates.USD;
    const originalPriceVES = originalPriceUSD * rates.USD;

    // --- Totales por cantidad ---
    const subtotalUSD = basePriceUSD * quantity;
    const subtotalVES = basePriceVES * quantity;
    const totalUSD = totalPriceUSD * quantity;
    const totalVES = totalPriceVES * quantity;

    // --- Construir resultado (redondeado al final) ---
    return {
      kind: 'product',
      id: product.id,
      name: product.name,
      image: product.coverImage || undefined,
      sku: product.itemId || undefined,
      quantity,

      basePriceUSD: round2(basePriceUSD),
      basePriceVES: round2(basePriceVES),
      basePriceOriginalUSD: round2(basePriceOriginalUSD),
      basePriceOriginalVES: round2(basePriceOriginalVES),

      hasDiscount,
      discountPercentage: round2(discountPercentage),
      discountAmountUSD: round2(discountAmountUSD),
      discountAmountVES: round2(discountAmountVES),
      originalPriceUSD: round2(originalPriceUSD),
      originalPriceVES: round2(originalPriceVES),

      ivaType,
      ivaRate,
      taxAmountUSD: round2(taxAmountUSD),
      taxAmountVES: round2(taxAmountVES),

      totalPriceUSD: round2(totalPriceUSD),
      totalPriceVES: round2(totalPriceVES),

      subtotalUSD: round2(subtotalUSD),
      subtotalVES: round2(subtotalVES),
      totalUSD: round2(totalUSD),
      totalVES: round2(totalVES),

      exchangeRateUsed: round4(rates.USD),
      exchangeRateSource,
      calculatedAt: new Date().toISOString(),

      stock: product.stock,
    };
  }

  // ============================================================
  // 🔥 CALCULAR PRECIO DE UN SERVICIO
  // ============================================================

  /**
   * Calcula el precio de un servicio.
   * Los servicios NO tienen IVA ni descuento.
   */
  computeServicePricing(
    service: ServiceEntity,
    quantity: number,
    rates: ExchangeRates,
    exchangeRateSource: string = 'BCV via DolarApi',
  ): ItemPricing | null {
    if (!service) return null;
    if (!rates || rates.USD <= 0) {
      this.logger.error(
        `computeServicePricing: tasa USD inválida (${rates?.USD})`,
      );
      return null;
    }

    // --- Obtener USD ancla ---
    const anchoredUSD = this.getServiceAnchoredUSD(service);
    if (anchoredUSD === null || anchoredUSD <= 0) {
      this.logger.warn(
        `Servicio ${service.id} sin precio USD válido. Ignorando.`,
      );
      return null;
    }

    // --- Servicios: SIEMPRE exempt (sin IVA). Solo aplicamos descuento si está activo ---
    const ivaType: IvaType = 'exempt';
    const ivaRate = 0;
    const discountPercentage = this.getActiveDiscountPercentage(service);
    const hasDiscount = discountPercentage > 0;

    // --- Base = precio USD ancla (sin IVA porque es exempt) ---
    const basePriceOriginalUSD = anchoredUSD;

    // --- Aplicar descuento sobre la base ---
    const discountFactor = hasDiscount ? 1 - discountPercentage / 100 : 1;
    const basePriceUSD = basePriceOriginalUSD * discountFactor;

    // --- Sin IVA porque es exempt ---
    const taxAmountUSD = 0;
    const totalPriceUSD = basePriceUSD;

    // --- Descuento unitario (USD) ---
    const discountAmountUSD = basePriceOriginalUSD - basePriceUSD;

    // --- Precio "original" sin IVA (para tachar) ---
    const originalPriceUSD = basePriceOriginalUSD;

    // --- Convertir a VES ---
    const basePriceVES = basePriceUSD * rates.USD;
    const basePriceOriginalVES = basePriceOriginalUSD * rates.USD;
    const taxAmountVES = 0;
    const totalPriceVES = totalPriceUSD * rates.USD;
    const discountAmountVES = discountAmountUSD * rates.USD;
    const originalPriceVES = originalPriceUSD * rates.USD;

    // --- Totales por cantidad ---
    const subtotalUSD = basePriceUSD * quantity;
    const subtotalVES = basePriceVES * quantity;
    const totalUSD = totalPriceUSD * quantity;
    const totalVES = totalPriceVES * quantity;

    return {
      kind: 'service',
      id: service.id,
      name: service.name,
      image: service.coverImage || undefined,
      sku: service.itemId || undefined,
      quantity,

      basePriceUSD: round2(basePriceUSD),
      basePriceVES: round2(basePriceVES),
      basePriceOriginalUSD: round2(basePriceOriginalUSD),
      basePriceOriginalVES: round2(basePriceOriginalVES),

      hasDiscount,
      discountPercentage: round2(discountPercentage),
      discountAmountUSD: round2(discountAmountUSD),
      discountAmountVES: round2(discountAmountVES),
      originalPriceUSD: round2(originalPriceUSD),
      originalPriceVES: round2(originalPriceVES),

      ivaType,
      ivaRate,
      taxAmountUSD: round2(taxAmountUSD),
      taxAmountVES: round2(taxAmountVES),

      totalPriceUSD: round2(totalPriceUSD),
      totalPriceVES: round2(totalPriceVES),

      subtotalUSD: round2(subtotalUSD),
      subtotalVES: round2(subtotalVES),
      totalUSD: round2(totalUSD),
      totalVES: round2(totalVES),

      exchangeRateUsed: round4(rates.USD),
      exchangeRateSource,
      calculatedAt: new Date().toISOString(),

      durationMinutes: service.durationMinutes,
    };
  }

  // ============================================================
  // 🔥 SUMAR UN CARRITO
  // ============================================================

  /**
   * Suma los ItemPricing ya calculados.
   * NO recalcula NADA. Solo suma.
   */
  computeCartTotals(items: ItemPricing[]): CartTotals {
    if (!items || items.length === 0) {
      const now = new Date().toISOString();
      return {
        items: [],
        subtotalUSD: 0,
        subtotalVES: 0,
        subtotalOriginalUSD: 0,
        subtotalOriginalVES: 0,
        totalDiscountUSD: 0,
        totalDiscountVES: 0,
        totalTaxUSD: 0,
        totalTaxVES: 0,
        totalUSD: 0,
        totalVES: 0,
        ivaType: 'exempt',
        ivaRate: 0,
        hasIVA: false,
        hasMixedIVA: false,
        hasExemptItems: false,
        exchangeRateUsed: 0,
        exchangeRateSource: '',
        calculatedAt: now,
      };
    }

    // --- Acumuladores ---
    let subtotalUSD = 0;
    let subtotalVES = 0;
    let subtotalOriginalUSD = 0;
    let subtotalOriginalVES = 0;
    let totalDiscountUSD = 0;
    let totalDiscountVES = 0;
    let totalTaxUSD = 0;
    let totalTaxVES = 0;
    let totalUSD = 0;
    let totalVES = 0;

    let hasIncluded = false;
    let hasExcluded = false;
    let hasExempt = false;
    let maxIvaRate = 0;

    for (const item of items) {
      subtotalUSD += item.subtotalUSD;
      subtotalVES += item.subtotalVES;
      subtotalOriginalUSD += item.basePriceOriginalUSD * item.quantity;
      subtotalOriginalVES += item.basePriceOriginalVES * item.quantity;
      totalDiscountUSD += item.discountAmountUSD * item.quantity;
      totalDiscountVES += item.discountAmountVES * item.quantity;
      totalTaxUSD += item.taxAmountUSD * item.quantity;
      totalTaxVES += item.taxAmountVES * item.quantity;
      totalUSD += item.totalUSD;
      totalVES += item.totalVES;

      if (item.ivaType === 'included') hasIncluded = true;
      if (item.ivaType === 'excluded') hasExcluded = true;
      if (item.ivaType === 'exempt') hasExempt = true;
      if (item.ivaRate > maxIvaRate) maxIvaRate = item.ivaRate;
    }

    // --- Determinar tipo de IVA general ---
    const ivaType = this.resolveCartIvaType(
      hasIncluded,
      hasExcluded,
      hasExempt,
    );

    const hasMixedIVA =
      (hasIncluded && hasExcluded) ||
      (hasIncluded && hasExempt) ||
      (hasExcluded && hasExempt);

    // --- Usar la tasa y la fuente del primer item ---
    const exchangeRateUsed = items[0].exchangeRateUsed;
    const exchangeRateSource = items[0].exchangeRateSource;

    return {
      items,
      subtotalUSD: round2(subtotalUSD),
      subtotalVES: round2(subtotalVES),
      subtotalOriginalUSD: round2(subtotalOriginalUSD),
      subtotalOriginalVES: round2(subtotalOriginalVES),
      totalDiscountUSD: round2(totalDiscountUSD),
      totalDiscountVES: round2(totalDiscountVES),
      totalTaxUSD: round2(totalTaxUSD),
      totalTaxVES: round2(totalTaxVES),
      totalUSD: round2(totalUSD),
      totalVES: round2(totalVES),
      ivaType,
      ivaRate: maxIvaRate,
      hasIVA: hasIncluded || hasExcluded,
      hasMixedIVA,
      hasExemptItems: hasExempt,
      exchangeRateUsed,
      exchangeRateSource,
      calculatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 🔥 HELPERS PRIVADOS
  // ============================================================

  /**
   * Obtiene el USD ancla de un producto, con fallbacks en cascada.
   */
  private getProductAnchoredUSD(product: ProductEntity): number | null {
    // 1. Preferido: attributes.prices.USD
    const fromPrices = this.safeNumber(product.attributes?.prices?.USD);
    if (fromPrices !== null && fromPrices > 0) return fromPrices;

    // 2. Fallback: attributes.usdReference
    const fromRef = this.safeNumber(product.attributes?.usdReference);
    if (fromRef !== null && fromRef > 0) return fromRef;

    // 3. Fallback: product.price si parece USD (< 1000)
    const price = this.safeNumber(product.price);
    if (price !== null && price > 0 && price < 1000) return price;

    // 4. Fallback: product.price si es VES (> 1000) → no podemos convertir aquí
    if (price !== null && price > 0) {
      this.logger.warn(
        `Producto ${product.id}: price=${price} parece VES pero no hay USD ancla.`,
      );
      return null;
    }

    return null;
  }

  /**
   * Obtiene el USD ancla de un servicio.
   */
  private getServiceAnchoredUSD(service: ServiceEntity): number | null {
    const attrs = service.attributes || {};

    const fromPrices = this.safeNumber(attrs?.prices?.USD);
    if (fromPrices !== null && fromPrices > 0) return fromPrices;

    const fromRef = this.safeNumber(attrs?.usdReference);
    if (fromRef !== null && fromRef > 0) return fromRef;

    const price = this.safeNumber(service.price);
    if (price !== null && price > 0 && price < 1000) return price;

    if (price !== null && price > 0) {
      this.logger.warn(
        `Servicio ${service.id}: price=${price} parece VES pero no hay USD ancla.`,
      );
      return null;
    }

    return null;
  }

  /**
   * Extrae la base SIN IVA desde el precio en USD ancla.
   *
   * - included: el precio ya incluye IVA → base = precio / (1 + tasa)
   * - excluded: el precio es base → base = precio
   * - exempt:   sin IVA → base = precio
   */
  private extractBaseFromUSD(
    priceUSD: number,
    ivaType: IvaType,
    ivaRate: number,
  ): number {
    if (ivaType === 'included' && ivaRate > 0) {
      return priceUSD / (1 + ivaRate / 100);
    }
    return priceUSD;
  }

  /**
   * Calcula el monto de IVA sobre una base.
   *
   * - included: IVA = base × tasa / 100
   * - excluded: IVA = base × tasa / 100
   * - exempt:   0
   */
  private calculateTax(
    base: number,
    ivaType: IvaType,
    ivaRate: number,
  ): number {
    if (ivaType === 'exempt') return 0;
    if (ivaRate <= 0) return 0;
    return base * (ivaRate / 100);
  }

  /**
   * Normaliza el tipo de IVA del producto.
   */
  private normalizeIvaType(raw: any): IvaType {
    const s = String(raw || 'excluded').toLowerCase().trim();
    if (s === 'included') return 'included';
    if (s === 'exempt') return 'exempt';
    return 'excluded';
  }

  /**
   * Normaliza la tasa de IVA del producto.
   */
  private normalizeIvaRate(raw: any, fallback: number): number {
    const n = this.safeNumber(raw);
    if (n === null || n < 0) {
      return this.safeNumber(fallback) ?? DEFAULT_IVA_RATE;
    }
    return n;
  }

  /**
   * Determina el porcentaje de descuento activo HOY.
   * Tiene en cuenta onSale, discountPercentage y las fechas.
   */
  private getActiveDiscountPercentage(entity: ProductEntity | ServiceEntity): number {
    const product = entity as any;
    if (product.onSale !== true) return 0;

    const rawPct = this.safeNumber(product.discountPercentage);
    if (rawPct === null || rawPct <= 0) return 0;

    const pct = Math.min(100, Math.max(0, rawPct));

    const now = new Date();
    const start = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const end = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;

    if (start && start > now) return 0;
    if (end && end < now) return 0;

    return pct;
  }

  /**
   * Determina el tipo de IVA general de un carrito.
   */
  private resolveCartIvaType(
    hasIncluded: boolean,
    hasExcluded: boolean,
    hasExempt: boolean,
  ): CartIvaType {
    const count = [hasIncluded, hasExcluded, hasExempt].filter(Boolean).length;

    if (count === 0) return 'exempt';
    if (count === 1) {
      if (hasIncluded) return 'included';
      if (hasExcluded) return 'excluded';
      return 'exempt';
    }
    return 'mixed';
  }

  /**
   * Convierte un valor a number de forma segura.
   */
  private safeNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (isNaN(n) || !isFinite(n)) return null;
    return n;
  }
}