// ============================================================
// ARCHIVO: backend/src/modules/orders/types/payment-breakdown.type.ts
// ============================================================
// Tipos canónicos del sistema de pagos mixtos con cálculo de
// vuelto. Snapshot-first: el backend escribe, el frontend lee.
//
// IMPORTANTE:
//   - El enum PaymentMethodType es ESPEJO del frontend
//     (frontend/app/tienda/[slug]/utils/paymentMethods.ts).
//     Si se agrega/elimina un método, actualizar AMBOS.
//   - El backend acepta 3 tipos adicionales que el frontend
//     todavía no ofrece: 'paypal', 'crypto_wallet', 'zimli'.
//     Esto es ADITIVO y permite reportar pagos con esos
//     métodos aunque el comprador no los vea.
//   - El redondeo reutiliza round2/round4 de pricing.types.
// ============================================================

import { round2, round4 } from '../../pricing/types/pricing.types';

// ------------------------------------------------------------
// MÉTODOS DE PAGO
// ------------------------------------------------------------

/**
 * Métodos de pago canónicos del sistema.
 *
 * Espejo de `PaymentMethodType` del frontend + 3 extras:
 *   - 'paypal'         : ya existe en payment_methods (legacy)
 *   - 'crypto_wallet'  : ya existe en payment_methods
 *   - 'zimli'          : ya existe en payment_methods (solo lectura)
 */
export type PaymentMethodType =
  | 'cash'
  | 'pago_movil'
  | 'zelle'
  | 'pos'
  | 'biopago'
  | 'binance'
  | 'paypal'
  | 'crypto_wallet'
  | 'zimli';

export type PaymentCurrency = 'VES' | 'USD';


// ------------------------------------------------------------
// MAPA DE BANCOS VENEZOLANOS (código → nombre)
// ------------------------------------------------------------
// Espejo del frontend (paymentConstants.ts / VENEZUELAN_BANKS).
// Necesario porque el frontend guarda en `bankName` el CÓDIGO
// del banco ("0102"), no el nombre.
// ------------------------------------------------------------

export const VENEZUELAN_BANKS: Record<string, string> = {
  '0102': 'Banco de Venezuela',
  '0104': 'Banco Provincial',
  '0105': 'Banco Mercantil',
  '0108': 'Banco Provincial',
  '0114': 'Bancaribe',
  '0115': 'Banco Exterior',
  '0128': 'Banco Caroní',
  '0134': 'Banesco',
  '0137': 'Banco Sofitasa',
  '0138': 'Banco Plaza',
  '0146': 'Banco del Sur',
  '0151': 'BFC',
  '0156': '100% Banco',
  '0157': 'Del Sur',
  '0163': 'Banco del Tesoro',
  '0166': 'Banco Agrícola de Venezuela',
  '0168': 'Bancrecer',
  '0169': 'Mi Banco',
  '0171': 'Banco Activo',
  '0172': 'Bancamiga',
  '0173': 'Banco Nacional de Crédito',
  '0174': 'Banplus',
  '0175': 'Banco Bicentenario',
  '0176': 'Banco de la Fuerza Armada',
  '0177': 'Banfanb',
  '0191': 'BNC',
};

/**
 * Convierte un código de banco ("0102") en su nombre legible.
 * Si el banco no está en el mapa, devuelve el código tal cual.
 */
export function resolveBankName(codeOrName: string | null | undefined): string {
  if (!codeOrName) return '';
  const trimmed = String(codeOrName).trim();
  if (!trimmed) return '';
  return VENEZUELAN_BANKS[trimmed] ?? trimmed;
}

/**
 * Catálogo backend: qué moneda usa cada método por defecto.
 * El frontend puede override para 'cash' y 'pos' (selección manual).
 */
export const DEFAULT_CURRENCY_BY_METHOD: Record<PaymentMethodType, PaymentCurrency> = {
  cash: 'VES',
  pago_movil: 'VES',
  zelle: 'USD',
  pos: 'VES',
  biopago: 'VES',
  binance: 'USD',
  paypal: 'USD',
  crypto_wallet: 'USD',
  zimli: 'VES',
};

/**
 * Métodos donde el frontend puede elegir VES o USD manualmente.
 * El resto usa la moneda por defecto sin preguntar.
 */
export const METHODS_WITH_SELECTABLE_CURRENCY: ReadonlyArray<PaymentMethodType> = [
  'cash',
  'pos',
];

/**
 * Alias legacy → tipo canónico. Tolerante a variaciones
 * históricas en `paymentMethodUsed` y en `payment_methods.type`.
 */
const PAYMENT_METHOD_ALIASES: Record<string, PaymentMethodType> = {
  // cash
  cash: 'cash',
  efectivo: 'cash',
  'efectivo en caja': 'cash',
  // pago_movil
  pago_movil: 'pago_movil',
  pagomovil: 'pago_movil',
  'pago móvil': 'pago_movil',
  pago_movil_: 'pago_movil',
  // zelle
  zelle: 'zelle',
  // pos
  pos: 'pos',
  punto: 'pos',
  'punto de venta': 'pos',
  // biopago
  biopago: 'biopago',
  // binance
  binance: 'binance',
  'binance pay': 'binance',
  // paypal
  paypal: 'paypal',
  // crypto_wallet
  crypto_wallet: 'crypto_wallet',
  wallet: 'crypto_wallet',
  // zimli
  zimli: 'zimli',
};

/**
 * Normaliza un string crudo al tipo canónico.
 * Devuelve null si no se reconoce.
 */
export function normalizePaymentMethodType(
  raw: string | null | undefined,
): PaymentMethodType | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return PAYMENT_METHOD_ALIASES[key] ?? null;
}

/**
 * Devuelve la moneda por defecto para un método.
 * Si el método no está en el catálogo, cae a 'VES'.
 */
export function getDefaultCurrencyForMethod(
  methodType: PaymentMethodType,
): PaymentCurrency {
  return DEFAULT_CURRENCY_BY_METHOD[methodType] ?? 'VES';
}

// ------------------------------------------------------------
// ENTRADA DE MÉTODO
// ------------------------------------------------------------

/**
 * Una entrada del desglose. Guarda:
 *   - methodId: FK lógica a payment_methods.id (null para 'cash')
 *   - methodType: enum canónico
 *   - methodLabelSnapshot: label congelado al momento del pago
 *   - todos los campos de checkoutFields como opcionales
 *     (el DTO valida los required por método)
 */
export interface PaymentMethodEntry {
  methodId: string | null;
  methodType: PaymentMethodType;
  methodLabelSnapshot: string;

  amount: number;
  currency: PaymentCurrency;

  // --- Datos del checkout (todos opcionales) ---
  reference?: string;
  bank?: string;
  clientIdNumber?: string;
  clientIdType?: 'V' | 'E' | 'J' | 'G' | 'P';
  clientPhone?: string;
  clientAccountType?: string;
  senderEmail?: string;
  proofUrl?: string;
  notes?: string;
}

// ------------------------------------------------------------
// TOTALES
// ------------------------------------------------------------

export interface PaymentBreakdownTotals {
  /** Suma de métodos en VES (solo moneda VES). */
  paidVes: number;

  /** Suma de métodos en USD (solo moneda USD). */
  paidUsd: number;

  /** Todo convertido a VES usando exchangeRateAtPayment. */
  paidEquivalentVes: number;
}

// ------------------------------------------------------------
// VUELTO
// ------------------------------------------------------------

export type ChangeResolution =
  | 'pending'    // vuelto pendiente, admin lo dará después
  | 'delivered'  // vuelto ya entregado
  | 'credit'     // convertido a saldo a favor (Fase 5)
  | 'rounded'    // cliente acepta perder el vuelto
  | 'cancelled'; // no hay vuelto, no hay pago

// ------------------------------------------------------------
// MÉTODO DE ENTREGA DEL VUELTO
// ------------------------------------------------------------

/**
 * Cómo se le entrega el vuelto al cliente.
 *   - 'cash_ves'   : billetes/monedas en Bs.
 *   - 'cash_usd'   : billetes en USD (poco común).
 *   - 'pago_movil' : transferencia Pago Móvil al cliente.
 *   - 'other'      : cualquier otro método.
 */
export type ChangeDeliveryMethod =
  | 'cash_ves'
  | 'cash_usd'
  | 'pago_movil'
  | 'other';

/**
 * Datos del cliente para entregarle el vuelto por Pago Móvil.
 * Solo aplica cuando deliveryMethod === 'pago_movil'.
 */
export interface ChangeDeliveryPagoMovilData {
  bank: string;
  phone: string;
  clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
  clientIdNumber: string;
  /** Referencia de la transferencia hecha por el comercio. */
  reference?: string;
}

/**
 * Preferencia del comprador: cómo quiere que le devuelvan el vuelto.
 * El comprador la deja al reportar el pago, cuando hay vuelto.
 * El admin puede respetarla o cambiarla.
 */
export interface ChangeDeliveryPreference {
  method: ChangeDeliveryMethod;
  /** Datos de Pago Móvil (solo si method === 'pago_movil'). */
  pagoMovilData?: ChangeDeliveryPagoMovilData;
  /** Notas libres del comprador. */
  notes?: string;
}

export interface PaymentBreakdownChange {
  /** Vuelto calculado en Bs. (siempre presente, 0 si no aplica). */
  amountVes: number;

  /** Vuelto calculado en USD (referencia informativa). */
  amountUsd: number;

  /** Moneda en la que se resuelve el vuelto. Default 'VES'. */
  currency: PaymentCurrency;

  resolution: ChangeResolution;

  resolutionNotes?: string;

  /** ISO timestamp de resolución. */
  resolvedAt?: string;

  /** userId que resolvió. */
  resolvedBy?: string;

  /** true si ya se creó el crédito en Customer (Fase 5). */
  creditCreated?: boolean;

  // ------------------------------------------------------------
  // NUEVO: ENTREGA DEL VUELTO
  // ------------------------------------------------------------

  /**
   * Cómo el comprador quiere que le devuelvan el vuelto.
   * Lo deja al reportar el pago (si hay vuelto).
   */
  deliveryPreference?: ChangeDeliveryPreference;

  /**
   * Cómo el admin efectivamente entregó el vuelto.
   * Se llena cuando el admin resuelve la entrega.
   */
  deliveryMethod?: ChangeDeliveryMethod;

  /**
   * Datos de la entrega por Pago Móvil.
   * Solo aplica cuando deliveryMethod === 'pago_movil'.
   */
  deliveryPagoMovilData?: ChangeDeliveryPagoMovilData;
}

// ------------------------------------------------------------
// ESTADO Y BREAKDOWN COMPLETO
// ------------------------------------------------------------

export type PaymentBreakdownStatus =
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'overpaid';

export interface PaymentBreakdown {
  methods: PaymentMethodEntry[];

  totals: PaymentBreakdownTotals;

  change: PaymentBreakdownChange;

  status: PaymentBreakdownStatus;

  /** Tasa BCV usada al momento del reporte (snapshot, round4). */
  exchangeRateAtPayment: number;

  /** ISO timestamp del reporte. */
  reportedAt: string;

  /** userId del que reportó. */
  reportedBy: string;

  /** userId del admin que verificó (opcional). */
  verifiedBy?: string;
  verifiedAt?: string;
}

// ------------------------------------------------------------
// HELPERS DE CÁLCULO
// ------------------------------------------------------------

export interface ComputeBreakdownInput {
  methods: PaymentMethodEntry[];
  totalVes: number;
  exchangeRate: number;
}

export interface ComputedBreakdown {
  totals: PaymentBreakdownTotals;
  change: Pick<PaymentBreakdownChange, 'amountVes' | 'amountUsd' | 'currency'>;
  status: PaymentBreakdownStatus;
  /** Falta por pagar en Bs. (0 si no aplica). */
  remainingVes: number;
}

/**
 * Calcula totales, vuelto y status a partir de los métodos.
 *
 * Reglas:
 *   - paidVes = suma de amount en VES
 *   - paidUsd = suma de amount en USD
 *   - paidEquivalentVes = paidVes + paidUsd * exchangeRate
 *   - Si paidEquivalentVes === 0 → 'unpaid'
 *   - Si |diff| < 0.01 → 'paid'
 *   - Si diff < 0 → 'partial'
 *   - Si diff > 0 → 'overpaid'
 *   - El vuelto SIEMPRE se expresa en VES (default).
 */
export function computePaymentBreakdown(
  input: ComputeBreakdownInput,
): ComputedBreakdown {
  const { methods, totalVes, exchangeRate } = input;

  const safeRate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 0;

  let paidVes = 0;
  let paidUsd = 0;

  for (const m of methods) {
    const amount = Number(m.amount) || 0;
    if (m.currency === 'VES') paidVes += amount;
    else if (m.currency === 'USD') paidUsd += amount;
  }

  const paidEquivalentVes = paidVes + paidUsd * safeRate;
  const diffVes = paidEquivalentVes - Number(totalVes || 0);

  let status: PaymentBreakdownStatus;
  if (paidEquivalentVes <= 0) status = 'unpaid';
  else if (Math.abs(diffVes) < 0.01) status = 'paid';
  else if (diffVes < 0) status = 'partial';
  else status = 'overpaid';

  const changeVes = diffVes > 0 ? diffVes : 0;
  const changeUsd = safeRate > 0 ? changeVes / safeRate : 0;

  return {
    totals: {
      paidVes: round2(paidVes),
      paidUsd: round2(paidUsd),
      paidEquivalentVes: round2(paidEquivalentVes),
    },
    change: {
      amountVes: round2(changeVes),
      amountUsd: round4(changeUsd),
      currency: 'VES',
    },
    status,
    remainingVes: diffVes < 0 ? round2(Math.abs(diffVes)) : 0,
  };
}

/**
 * Construye el label congelado a partir del tipo y el PaymentMethod.
 * Si el método no tiene datos adicionales, devuelve solo el label genérico.
 */
export function buildMethodLabelSnapshot(
  methodType: PaymentMethodType,
  paymentMethod?: { bankName?: string | null; phone?: string | null } | null,
): string {
  const baseLabel = METHOD_LABELS_ES[methodType] ?? methodType;

  // Solo enriquecemos para métodos que muestran banco/cuenta
  if (!paymentMethod) return baseLabel;

  // 🔥 Traducir código de banco ("0102") → nombre ("Banco de Venezuela")
  const bank = resolveBankName(paymentMethod.bankName);

  // pago_movil: "Pago Móvil - Banesco"
  if (methodType === 'pago_movil' && bank) {
    return `${baseLabel} - ${bank}`;
  }

  // biopago: "Biopago - Banesco"
  if (methodType === 'biopago' && bank) {
    return `${baseLabel} - ${bank}`;
  }

  // zelle: "Zelle - holderName" (o email si no hay holder)
  if (methodType === 'zelle' && bank) {
    return `${baseLabel} - ${bank}`;
  }

  // binance: "Binance Pay - email" (holder)
  if (methodType === 'binance' && bank) {
    return `${baseLabel} - ${bank}`;
  }

  // paypal: "PayPal - holderName"
  if (methodType === 'paypal' && bank) {
    return `${baseLabel} - ${bank}`;
  }

  // crypto_wallet: "Wallet Cripto - Red"
  if (methodType === 'crypto_wallet' && bank) {
    return `Wallet Cripto - ${bank}`;
  }

  // pos: "Punto de Venta - Corriente" (bankName guarda accountType)
  if (methodType === 'pos' && bank) {
    return `${baseLabel} - ${bank}`;
  }

  return baseLabel;
}

/**
 * Labels en español del backend. Espejo parcial del frontend,
 * pero el backend no depende del frontend.
 */
export const METHOD_LABELS_ES: Record<PaymentMethodType, string> = {
  cash: 'Efectivo',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  pos: 'Punto de Venta',
  biopago: 'Biopago',
  binance: 'Binance Pay',
  paypal: 'PayPal',
  crypto_wallet: 'Wallet Cripto',
  zimli: 'Zimli',
};

/**
 * Campos required por método (para validación en el DTO).
 * Espejo parcial de PAYMENT_METHODS_CONFIG.checkoutFields.required.
 */
export const REQUIRED_FIELDS_BY_METHOD: Record<PaymentMethodType, ReadonlyArray<keyof PaymentMethodEntry>> = {
  cash: [],
  pago_movil: ['clientIdNumber', 'clientPhone', 'bank', 'reference'],
  zelle: ['senderEmail', 'reference'],
  pos: ['clientIdNumber', 'clientAccountType'],
  biopago: ['clientIdNumber', 'bank'],
  binance: ['reference'],
  paypal: ['reference'],
  crypto_wallet: ['reference'],
  zimli: ['reference'],
};