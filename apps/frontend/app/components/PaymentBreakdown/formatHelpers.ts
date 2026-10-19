// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/formatHelpers.ts
// ============================================================
// Helpers de formato de montos. Reutilizables en todo el
// componente <PaymentBreakdown />.
// ============================================================

/**
 * Formatea un monto con separador de miles y 2 decimales.
 * Ej: 9603.02 → "9.603,02"
 */
export function formatAmount(num: number): string {
  if (!Number.isFinite(num)) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un monto en Bs. con equivalente en USD entre paréntesis.
 * Ej: formatDualAmount(9603.02, 854.20) → "Bs. 9.603,02 ($11,24 USD)"
 *
 * Si no hay tasa disponible (exchangeRate <= 0), devuelve solo Bs.
 */
export function formatDualAmount(
  amountVes: number,
  exchangeRate: number,
): string {
  const ves = formatAmount(amountVes);
  if (!exchangeRate || exchangeRate <= 0) {
    return `Bs. ${ves}`;
  }
  const usd = formatAmount(amountVes / exchangeRate);
  return `Bs. ${ves} ($${usd} USD)`;
}

/**
 * Formatea solo el monto en USD sin prefijo Bs.
 * Ej: formatUsd(11.24) → "$11,24"
 */
export function formatUsd(amountUsd: number): string {
  if (!Number.isFinite(amountUsd)) return '$0,00';
  return `$${formatAmount(amountUsd)}`;
}

/**
 * Formatea el monto en la moneda indicada, con prefijo correcto.
 * Para VES usa "Bs." y para USD usa "$".
 */
export function formatInCurrency(
  amount: number,
  currency: 'VES' | 'USD',
): string {
  if (!Number.isFinite(amount)) {
    return currency === 'VES' ? 'Bs. 0,00' : '$0,00';
  }
  const formatted = formatAmount(amount);
  return currency === 'VES' ? `Bs. ${formatted}` : `$${formatted}`;
}