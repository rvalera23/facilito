// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/PaymentBreakdownSummary.tsx
// ============================================================
// Resumen de totales del desglose:
//   - Total pagado en Bs. (equivalente)
//   - Total de la orden
//   - Falta por pagar (si status='partial' o 'unpaid')
//   - Vuelto (si status='overpaid')
//   - Status badge
//
// Se usa en ambos modos (report y view). En modo report, los
// valores vienen calculados en el componente padre; en modo view,
// vienen del breakdown que devolvió el backend.
// ============================================================

'use client';

import React from 'react';
import type { PaymentBreakdownStatus } from '@/types/payment-breakdown';
import { formatAmount, formatDualAmount } from './formatHelpers';

interface Props {
  /** Status del pago. */
  status: PaymentBreakdownStatus;

  /** Total de la orden en Bs. (siempre presente). */
  totalVes: number;

  /** Tasa de cambio (para mostrar equivalente USD). */
  exchangeRate: number;

  /** Total pagado (equivalente en Bs.). */
  paidEquivalentVes: number;

  /** Total pagado solo en Bs. (informativo). */
  paidVes?: number;

  /** Total pagado solo en USD (informativo). */
  paidUsd?: number;

  /** Falta por pagar en Bs. (0 si no aplica). */
  remainingVes: number;

  /** Vuelto en Bs. (0 si no aplica). */
  changeVes: number;

  /** Vuelto en USD (informativo). */
  changeUsd?: number;

  /** Tema. */
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;

  /** Si el breakdown ya fue resuelto por el admin. */
  changeResolution?:
    | 'pending'
    | 'delivered'
    | 'credit'
    | 'rounded'
    | 'cancelled';

  /** Cómo se entregó el vuelto (si está resuelto). */
  deliveryMethod?: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';

  /** Datos de entrega por Pago Móvil (si aplica). */
  deliveryPagoMovilData?: {
    bank: string;
    phone: string;
    clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
    clientIdNumber: string;
    reference?: string;
  };
}

export function PaymentBreakdownSummary({
  status,
  totalVes,
  exchangeRate,
  paidEquivalentVes,
  paidVes,
  paidUsd,
  remainingVes,
  changeVes,
  changeUsd,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  changeResolution,
  deliveryMethod,
  deliveryPagoMovilData,
}: Props) {
  const statusConfig = getStatusConfig(status, isDarkBg);

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{
        borderColor,
        backgroundColor: isDarkBg
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(0,0,0,0.01)',
      }}
    >
      {/* Badge de status */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-wider font-extrabold"
          style={{ color: textColor, opacity: 0.6 }}
        >
          Estado del pago
        </span>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: statusConfig.bg,
            color: statusConfig.color,
          }}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Total de la orden */}
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: textColor, opacity: 0.7 }}>
          Total de la orden
        </span>
        <span className="font-semibold" style={{ color: textColor }}>
          {formatDualAmount(totalVes, exchangeRate)}
        </span>
      </div>

      {/* Total pagado */}
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: textColor, opacity: 0.7 }}>Total pagado</span>
        <span className="font-semibold" style={{ color: primary }}>
          {formatDualAmount(paidEquivalentVes, exchangeRate)}
        </span>
      </div>

      {/* Desglose de monedas si hay ambos */}
      {paidVes !== undefined &&
        paidUsd !== undefined &&
        paidVes > 0 &&
        paidUsd > 0 && (
          <div
            className="text-[11px] flex items-center justify-between pl-4"
            style={{ color: textColor, opacity: 0.6 }}
          >
            <span>
              Bs. {formatAmount(paidVes)} + USD {formatAmount(paidUsd)}
            </span>
          </div>
        )}

      {/* Falta por pagar */}
      {remainingVes > 0 && (
        <div
          className="flex items-center justify-between text-sm pt-2 border-t"
          style={{ borderColor }}
        >
          <span
            className="font-semibold"
            style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}
          >
            Falta por pagar
          </span>
          <span
            className="font-bold"
            style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}
          >
            {formatDualAmount(remainingVes, exchangeRate)}
          </span>
        </div>
      )}

      {/* Vuelto */}
      {changeVes > 0 && (
        <div
          className="flex items-center justify-between text-sm pt-2 border-t"
          style={{ borderColor }}
        >
          <span
            className="font-semibold"
            style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}
          >
            {changeResolution === 'pending'
              ? 'Vuelto pendiente'
              : changeResolution === 'delivered'
                ? 'Vuelto entregado'
                : changeResolution === 'credit'
                  ? 'Vuelto como saldo a favor'
                  : changeResolution === 'rounded'
                    ? 'Vuelto redondeado'
                    : changeResolution === 'cancelled'
                      ? 'Vuelto cancelado'
                      : 'Vuelto'}
          </span>
          <div className="text-right">
            <div
              className="font-bold"
              style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}
            >
              {formatDualAmount(changeVes, exchangeRate)}
            </div>
            {changeUsd !== undefined && changeUsd > 0 && exchangeRate > 0 && (
              <div
                className="text-[10px]"
                style={{ color: textColor, opacity: 0.5 }}
              >
                ≈ USD {formatAmount(changeUsd)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔥 Cómo se entregó el vuelto (solo si está resuelto) */}
      {changeResolution === 'delivered' && deliveryMethod && (
        <div
          className="pt-2 border-t space-y-1"
          style={{ borderColor }}
        >
          <div
            className="flex items-center justify-between text-sm"
          >
            <span
              className="font-semibold"
              style={{ color: textColor, opacity: 0.7 }}
            >
              Entrega del vuelto
            </span>
            <span
              className="font-bold"
              style={{ color: textColor }}
            >
              {deliveryMethod === 'cash_ves'
                ? 'Efectivo Bs.'
                : deliveryMethod === 'cash_usd'
                  ? 'Efectivo USD'
                  : deliveryMethod === 'pago_movil'
                    ? 'Pago Móvil'
                    : 'Otro'}
            </span>
          </div>
          {deliveryMethod === 'pago_movil' && deliveryPagoMovilData && (
            <div
              className="text-[11px] space-y-0.5 pl-1"
              style={{ color: textColor, opacity: 0.7 }}
            >
              <div>
                <span style={{ opacity: 0.7 }}>Banco:</span>{' '}
                {deliveryPagoMovilData.bank}
              </div>
              <div>
                <span style={{ opacity: 0.7 }}>Teléfono:</span>{' '}
                {deliveryPagoMovilData.phone}
              </div>
              <div>
                <span style={{ opacity: 0.7 }}>Cédula:</span>{' '}
                {deliveryPagoMovilData.clientIdType}-
                {deliveryPagoMovilData.clientIdNumber}
              </div>
              {deliveryPagoMovilData.reference && (
                <div>
                  <span style={{ opacity: 0.7 }}>Referencia:</span>{' '}
                  {deliveryPagoMovilData.reference}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// CONFIG DE STATUS
// ------------------------------------------------------------

function getStatusConfig(status: PaymentBreakdownStatus, isDarkBg: boolean) {
  switch (status) {
    case 'unpaid':
      return {
        label: 'Sin pagar',
        color: isDarkBg ? '#f87171' : '#b91c1c',
        bg: isDarkBg ? 'rgba(248,113,113,0.15)' : 'rgba(185,28,28,0.12)',
      };
    case 'partial':
      return {
        label: 'Pago parcial',
        color: isDarkBg ? '#fbbf24' : '#b45309',
        bg: isDarkBg ? 'rgba(251,191,36,0.15)' : 'rgba(180,83,9,0.12)',
      };
    case 'paid':
      return {
        label: 'Pagado',
        color: isDarkBg ? '#4ade80' : '#15803d',
        bg: isDarkBg ? 'rgba(74,222,128,0.15)' : 'rgba(21,128,61,0.12)',
      };
    case 'overpaid':
      return {
        label: 'Pago con vuelto',
        color: isDarkBg ? '#60a5fa' : '#1d4ed8',
        bg: isDarkBg ? 'rgba(96,165,250,0.15)' : 'rgba(29,78,216,0.12)',
      };
  }
}