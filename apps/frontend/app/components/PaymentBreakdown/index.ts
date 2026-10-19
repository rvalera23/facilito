// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/index.ts
// ============================================================
// Punto de entrada del módulo. Permite importar así:
//   import { PaymentBreakdown } from '@/app/components/PaymentBreakdown';
// ============================================================

export { PaymentBreakdown } from './PaymentBreakdown';

export type {
  ActivePaymentMethod,
  CreatePaymentBreakdownPayload,
  PaymentBreakdownProps,
  ReportMethodState,
} from './PaymentBreakdown.types';

export {
  buildMethodLabel,
  getDefaultCurrencyForMethod,
  isCurrencySelectable,
  validateReportMethod,
  METHOD_LABELS_ES,
  DEFAULT_CURRENCY_BY_METHOD,
  METHODS_WITH_SELECTABLE_CURRENCY,
  REQUIRED_FIELDS_BY_METHOD,
} from './PaymentBreakdown.types';

export {
  formatAmount,
  formatDualAmount,
  formatInCurrency,
  formatUsd,
} from './formatHelpers';