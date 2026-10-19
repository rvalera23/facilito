// apps/backend/src/modules/pricing/types/pricing.types.ts

// ============================================================
// 🔥 TIPOS DEL SISTEMA DE PRICING
// ============================================================
// Este archivo define el CONTRATO del sistema de precios.
// Todos los cálculos usan estos tipos.
// ============================================================

/**
 * Tasas de cambio del BCV (vienen de CurrencyService)
 */
export interface ExchangeRates {
  USD: number;      // ej: 820.50
  EUR: number;      // ej: 958.31
  CRYPTO: number;   // ej: 820.50
  IVA: number;      // ej: 16 (porcentaje fijo por ley)
}

/**
 * Fuente de la tasa (para auditoría)
 */
export interface ExchangeRateSource {
  provider: string;   // ej: 'BCV via DolarApi'
  fetchedAt: string;  // ISO timestamp
}

/**
 * Tipo de IVA (según el producto)
 */
export type IvaType = 'included' | 'excluded' | 'exempt';

/**
 * Tipo de item (producto o servicio)
 */
export type ItemKind = 'product' | 'service';

/**
 * Tipo de IVA general de un carrito
 */
export type CartIvaType = IvaType | 'mixed';

// ============================================================
// 🔥 ITEM PRICING - Precio calculado de UN item
// ============================================================
// Este objeto es el RESULTADO de calcular un producto o servicio.
// Se congela en la orden y nunca se recalcula.
//
// SEMÁNTICA DE CAMPOS (crítica):
//
//   basePriceVES       = base CON descuento, SIN IVA
//                        → es el "subtotal" real del item
//                        → sobre este monto se calcula el IVA
//
//   basePriceOriginal  = base SIN descuento, SIN IVA
//                        → para mostrar el "precio tachado"
//                        → NO es lo que se cobra
//
//   taxAmount          = IVA calculado sobre basePrice (con descuento)
//
//   totalPrice         = basePrice + taxAmount
//                        → es lo que el cliente paga por el item
//
//   discountAmount     = basePriceOriginal - basePrice
//                        → cuánto se ahorró el cliente
//
//   originalPrice      = basePriceOriginal + taxAmountOriginal
//                        → precio "antes del descuento", CON IVA
//                        → para mostrar tachado en el frontend
// ============================================================

export interface ItemPricing {
  // --- Identificación ---
  kind: ItemKind;
  id: string;
  name: string;
  image?: string;
  sku?: string;

  // --- Cantidad ---
  quantity: number;

  // --- Base CON descuento, SIN IVA (lo que se cobra como subtotal) ---
  basePriceUSD: number;
  basePriceVES: number;

  // --- Base SIN descuento, SIN IVA (para mostrar tachado) ---
  basePriceOriginalUSD: number;
  basePriceOriginalVES: number;

  // --- Descuento ---
  hasDiscount: boolean;
  discountPercentage: number;      // 0-100
  discountAmountUSD: number;       // ahorro unitario en base
  discountAmountVES: number;
  originalPriceUSD: number;        // base sin descuento + IVA (para tachar)
  originalPriceVES: number;

  // --- IVA ---
  ivaType: IvaType;
  ivaRate: number;                 // ej: 16
  taxAmountUSD: number;            // IVA unitario
  taxAmountVES: number;

  // --- Totales unitarios (base con descuento + IVA) ---
  totalPriceUSD: number;
  totalPriceVES: number;

  // --- Totales por cantidad ---
  subtotalUSD: number;             // basePrice × quantity
  subtotalVES: number;
  totalUSD: number;                // totalPrice × quantity
  totalVES: number;

  // --- Metadata de la cotización ---
  exchangeRateUsed: number;
  exchangeRateSource: string;
  calculatedAt: string;            // ISO timestamp

  // --- Extras según tipo ---
  durationMinutes?: number;        // solo servicios
  stock?: number;                  // solo productos
}

// ============================================================
// 🔥 CART TOTALS - Suma de un carrito
// ============================================================
// Suma los ItemPricing ya calculados. NO recalcula nada.
// ============================================================

export interface CartTotals {
  // --- Items ---
  items: ItemPricing[];

  // --- Subtotales (suma de basePrice × quantity) ---
  // Es la base CON descuento, SIN IVA.
  subtotalUSD: number;
  subtotalVES: number;

  // --- Base SIN descuento (para mostrar tachado) ---
  subtotalOriginalUSD: number;
  subtotalOriginalVES: number;

  // --- Descuentos (suma de discountAmount × quantity) ---
  totalDiscountUSD: number;
  totalDiscountVES: number;

  // --- IVA (suma de taxAmount × quantity) ---
  totalTaxUSD: number;
  totalTaxVES: number;

  // --- Totales finales (suma de totalPrice × quantity) ---
  totalUSD: number;
  totalVES: number;

  // --- Metadata general ---
  ivaType: CartIvaType;            // 'included' | 'excluded' | 'exempt' | 'mixed'
  ivaRate: number;                 // la tasa más alta del carrito
  hasIVA: boolean;
  hasMixedIVA: boolean;
  hasExemptItems: boolean;

  // --- Metadata de la cotización ---
  exchangeRateUsed: number;
  exchangeRateSource: string;
  calculatedAt: string;
}

// ============================================================
// 🔥 CONSTANTES
// ============================================================

export const DEFAULT_IVA_RATE = 16;
export const DEFAULT_CURRENCY = 'USD';

// ============================================================
// 🔥 HELPERS DE REDONDEO
// ============================================================

/**
 * Redondea a 2 decimales (formato de moneda).
 * Se usa SOLO al construir el response JSON.
 * Internamente se trabaja con precisión completa.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Redondea a 4 decimales (para tasas y valores intermedios).
 */
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Redondea a 6 decimales (para el USD ancla).
 */
export function round6(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}