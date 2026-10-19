// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/PaymentBreakdown.types.ts
// ============================================================
// Tipos internos del componente <PaymentBreakdown />.
// No redefine los tipos del backend: los importa.
// ============================================================

import type {
  ChangeResolution,
  CreatePaymentBreakdownPayload,
  PaymentBreakdown,
  PaymentCurrency,
  PaymentMethodType,
} from '@/types/payment-breakdown';

// ------------------------------------------------------------
// MÉTODO DISPONIBLE (del tenant)
// ------------------------------------------------------------

export interface ActivePaymentMethod {
  id: string;
  type: PaymentMethodType;
  bankName: string | null;
  phone: string | null;
  ciRif: string | null;
  isActive: boolean;
}

// ------------------------------------------------------------
// ESTADO LOCAL DE UN MÉTODO DURANTE EL REPORTE
// ------------------------------------------------------------

export interface ReportMethodState {
  /** UUID del PaymentMethod del tenant. Null para 'cash'. */
  methodId: string | null;
  methodType: PaymentMethodType;
  /** Label que se mostrará al usuario (construido del banco). */
  methodLabelSnapshot: string;
  /** Monto en la moneda elegida. 0 = no activo. */
  amount: number;
  /** Moneda elegida (fija para métodos determinísticos). */
  currency: PaymentCurrency;
  /** Si el usuario activó este método (checkbox). */
  enabled: boolean;

  /** true si el monto fue autocompletado por el sistema. */
  isAutoFilled?: boolean;

  // Campos del checkout (opcionales según método)
  reference: string;
  bank: string;
  clientIdNumber: string;
  clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
  clientPhone: string;
  clientAccountType: string;
  senderEmail: string;
  proofUrl: string;
  notes: string;
}



// ------------------------------------------------------------
// PAYLOAD QUE SE ENVÍA AL BACKEND
// ------------------------------------------------------------

// Re-export del tipo compartido para mantener una sola fuente de verdad
export type {
  CreatePaymentBreakdownPayload,
  ChangeDeliveryMethod,
  ChangeDeliveryPreference,
  ChangeDeliveryPagoMovilPreference,
} from '@/types/payment-breakdown';

// ------------------------------------------------------------
// PROPS DEL COMPONENTE PRINCIPAL
// ------------------------------------------------------------

export interface PaymentBreakdownProps {
  // --- Datos de la orden ---
  totalVes: number;
  exchangeRate: number;

  // --- Métodos activos del tenant ---
  activeMethods: ActivePaymentMethod[];

  // --- Modo ---
  mode: 'report' | 'view';
  initialBreakdown?: PaymentBreakdown;

  // --- Permisos ---
  /** Solo el admin puede resolver el vuelto. */
  canResolveChange?: boolean;

  // --- Tema ---
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;

  /** Callbacks */
  onSubmit?: (payload: CreatePaymentBreakdownPayload) => Promise<void>;
  onResolveChange?: (
    resolution: ChangeResolution,
    notes?: string,
    deliveryMethod?: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other',
    deliveryPagoMovilData?: {
      bank: string;
      phone: string;
      clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
      clientIdNumber: string;
      reference?: string;
    },
  ) => Promise<void>;

  // --- Estado ---
  isSubmitting?: boolean;
  submitError?: string | null;

  // --- i18n mínima ---
  /** Si es true, no muestra el título "Desglose de pago". */
  hideTitle?: boolean;
}

// ------------------------------------------------------------
// HELPERS DE MONEDA
// ------------------------------------------------------------

/**
 * Moneda por defecto de cada método. Espejo de lo que hace el
 * backend en `getDefaultCurrencyForMethod`. Si el método no está
 * mapeado, cae a 'VES'.
 */
export const DEFAULT_CURRENCY_BY_METHOD: Record<
  PaymentMethodType,
  PaymentCurrency
> = {
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
 * Métodos donde el usuario puede elegir VES/USD manualmente.
 */
export const METHODS_WITH_SELECTABLE_CURRENCY: ReadonlyArray<PaymentMethodType> =
  ['cash', 'pos'];

export function getDefaultCurrencyForMethod(
  methodType: PaymentMethodType,
): PaymentCurrency {
  return DEFAULT_CURRENCY_BY_METHOD[methodType] ?? 'VES';
}

export function isCurrencySelectable(methodType: PaymentMethodType): boolean {
  return METHODS_WITH_SELECTABLE_CURRENCY.includes(methodType);
}

// ------------------------------------------------------------
// HELPERS DE LABELS
// ------------------------------------------------------------

/**
 * Labels en español del frontend. Reutiliza las etiquetas del
 * backend pero sin depender del archivo del backend.
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
 * Construye el label visible de un método, enriquecido con el
 * `bankName` cuando aplica. Mismo algoritmo que el backend.
 */
export function buildMethodLabel(
  methodType: PaymentMethodType,
  method?: ActivePaymentMethod | null,
): string {
  const baseLabel = METHOD_LABELS_ES[methodType] ?? methodType;
  if (!method) return baseLabel;

  const bank = (method.bankName ?? '').trim();
  if (!bank) return baseLabel;

  if (
    methodType === 'pago_movil' ||
    methodType === 'biopago' ||
    methodType === 'zelle' ||
    methodType === 'binance' ||
    methodType === 'paypal' ||
    methodType === 'pos'
  ) {
    return `${baseLabel} - ${bank}`;
  }

  if (methodType === 'crypto_wallet') {
    return `Wallet Cripto - ${bank}`;
  }

  return baseLabel;
}

// ------------------------------------------------------------
// VALIDACIÓN LOCAL (espejo del backend)
// ------------------------------------------------------------

/**
 * Required fields por método. Espejo del backend. Se valida
 * localmente para dar feedback inmediato al usuario sin ida y
 * vuelta al servidor.
 */
export const REQUIRED_FIELDS_BY_METHOD: Record<
  PaymentMethodType,
  ReadonlyArray<keyof ReportMethodState>
> = {
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

/**
 * Devuelve los errores de validación de un método, o [] si está OK.
 */
export function validateReportMethod(state: ReportMethodState): string[] {
  if (!state.enabled) return [];

  if (state.amount <= 0) {
    return ['El monto debe ser mayor a 0'];
  }

  const required = REQUIRED_FIELDS_BY_METHOD[state.methodType] ?? [];
  const missing: string[] = [];

  for (const field of required) {
    const value = state[field];
    const isEmptyString = typeof value === 'string' && value.trim() === '';
    const isNullish = value === null || value === undefined;
    if (isNullish || isEmptyString) {
      missing.push(field);
    }
  }

  if (missing.length === 0) return [];

  const LABELS: Record<string, string> = {
    reference: 'Referencia',
    bank: 'Banco',
    clientIdNumber: 'Cédula / RIF',
    clientPhone: 'Teléfono',
    clientAccountType: 'Tipo de cuenta',
    senderEmail: 'Correo del remitente',
  };

  return missing.map((f) => `Falta: ${LABELS[f] ?? f}`);
}


// ------------------------------------------------------------
// LÍMITES DE MONTO (para validación de inputs)
// ------------------------------------------------------------

export interface MethodLimitInfo {
  /** Monto máximo permitido para este método (VES). */
  maxAmountVes: number;
  /** Suma de los otros métodos activos (VES equivalente). */
  otherMethodsTotalVes: number;
}