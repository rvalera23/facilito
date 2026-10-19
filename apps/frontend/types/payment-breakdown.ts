// ============================================================
// ARCHIVO: frontend/types/payment-breakdown.ts
// ============================================================
// Tipo espejo del backend. Se mantiene sincronizado con
// backend/src/modules/orders/types/payment-breakdown.type.ts.
//
// El frontend NO recalcula nada. Solo lee lo que el backend
// ya calculó (snapshot-first).
//
// IMPORTANTE: el enum PaymentMethodType del backend tiene 9
// valores; el frontend solo ofrece 6 al comprador. Los otros 3
// (paypal, crypto_wallet, zimli) son para reportes del admin.
// ============================================================

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

export type PaymentBreakdownStatus =
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'overpaid';

export type ChangeResolution =
  | 'pending'
  | 'delivered'
  | 'credit'
  | 'rounded'
  | 'cancelled';

export interface PaymentMethodEntry {
  methodId: string | null;
  methodType: PaymentMethodType;
  methodLabelSnapshot: string;

  amount: number;
  currency: PaymentCurrency;

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

export interface PaymentBreakdownTotals {
  paidVes: number;
  paidUsd: number;
  paidEquivalentVes: number;
}

export interface PaymentBreakdownChange {
  amountVes: number;
  amountUsd: number;
  currency: PaymentCurrency;
  resolution: ChangeResolution;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  creditCreated?: boolean;

  /** Cómo el comprador pidió que le devuelvan el vuelto (opcional). */
  deliveryPreference?: ChangeDeliveryPreference;

  /** Cómo el admin efectivamente entregó el vuelto. */
  deliveryMethod?: ChangeDeliveryMethod;

  /** Datos de la entrega por Pago Móvil (si aplica). */
  deliveryPagoMovilData?: ChangeDeliveryPagoMovilData;
}

export interface PaymentBreakdown {
  methods: PaymentMethodEntry[];
  totals: PaymentBreakdownTotals;
  change: PaymentBreakdownChange;
  status: PaymentBreakdownStatus;
  exchangeRateAtPayment: number;
  reportedAt: string;
  reportedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
}


// ------------------------------------------------------------
// PAYLOAD QUE SE ENVÍA AL BACKEND
// ------------------------------------------------------------

/**
 * Payload para POST /orders/:id/payment-breakdown.
 * El cliente NO manda totals, change ni status. El backend los calcula.
 */
export interface CreatePaymentBreakdownPayload {
  methods: Array<{
    methodId: string | null;
    methodType: PaymentMethodType;
    amount: number;
    currency: PaymentCurrency;
    reference?: string;
    bank?: string;
    clientIdNumber?: string;
    clientIdType?: 'V' | 'E' | 'J' | 'G' | 'P';
    clientPhone?: string;
    clientAccountType?: string;
    senderEmail?: string;
    proofUrl?: string;
    notes?: string;
  }>;
  changeResolution?: ChangeResolution;
  changeResolutionNotes?: string;
  /** Preferencia del comprador para recibir el vuelto. */
  changeDeliveryPreference?: ChangeDeliveryPreference;
}


// ------------------------------------------------------------
// PREFERENCIA DE ENTREGA DEL VUELTO
// ------------------------------------------------------------

export type ChangeDeliveryMethod =
  | 'cash_ves'
  | 'cash_usd'
  | 'pago_movil'
  | 'other';

export interface ChangeDeliveryPagoMovilPreference {
  bank: string;
  phone: string;
  clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
  clientIdNumber: string;
}

export interface ChangeDeliveryPreference {
  method: ChangeDeliveryMethod;
  pagoMovilData?: ChangeDeliveryPagoMovilPreference;
  notes?: string;
}

/**
 * Datos de la entrega efectiva por Pago Móvil.
 * Se llena cuando el admin resuelve la entrega del vuelto
 * vía `deliveryMethod === 'pago_movil'`.
 * Incluye `reference` (número de transacción que hizo el comercio).
 */
export interface ChangeDeliveryPagoMovilData {
  bank: string;
  phone: string;
  clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
  clientIdNumber: string;
  reference?: string;
}