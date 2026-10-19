// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/PaymentBreakdown.tsx
// ============================================================
// Componente principal del desglose de pagos mixtos.
//
// Modo 'report': el usuario reporta un pago mixto (varios métodos
// a la vez). Se calculan totales y vuelto en tiempo real.
//
// Modo 'view': se muestra el desglose que ya reportó (o que
// reportó el cliente, si lo ve el admin).
//
// Snapshot-first: en modo view, el componente NO recalcula nada.
// Los totales y el vuelto vienen del breakdown del backend.
// ============================================================

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type {
  PaymentBreakdown,
  ChangeResolution,
} from '@/types/payment-breakdown';
import {
  buildMethodLabel,
  getDefaultCurrencyForMethod,
  validateReportMethod,
  type ActivePaymentMethod,
  type CreatePaymentBreakdownPayload,
  type PaymentBreakdownProps,
  type ReportMethodState,
} from './PaymentBreakdown.types';
import type { ChangeDeliveryPreference } from '@/types/payment-breakdown';
import { PaymentBreakdownMethodRow } from './PaymentBreakdownMethodRow';
import { PaymentBreakdownSummary } from './PaymentBreakdownSummary';
import { PaymentBreakdownChangeResolver } from './PaymentBreakdownChangeResolver';

export function PaymentBreakdown({
  totalVes,
  exchangeRate,
  activeMethods,
  mode,
  initialBreakdown,
  canResolveChange = false,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  cardBg,
  onSubmit,
  onResolveChange,
  isSubmitting,
  submitError,
  hideTitle,
}: PaymentBreakdownProps & {
  borderColor: string;
  cardBg: string;
}) {
  // ------------------------------------------------------------
  // ESTADO: report mode
  // ------------------------------------------------------------

  const [reportStates, setReportStates] = useState<ReportMethodState[]>(() =>
    buildInitialReportStates(activeMethods),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  // 🔥 Preferencia de entrega del vuelto (a nivel del pago completo)
  const [changeDeliveryPreference, setChangeDeliveryPreference] = useState<
    ChangeDeliveryPreference | undefined
  >(undefined);

  

  // Sincronizar si cambian los métodos activos
  useEffect(() => {
    setReportStates(buildInitialReportStates(activeMethods));
    // Si cambian los métodos activos, invalidar la preferencia de entrega
    setChangeDeliveryPreference(undefined);
  }, [activeMethods]);

  // ------------------------------------------------------------
  // ¿HAY VUELTO? (para mostrar el bloque de preferencia)
  // ------------------------------------------------------------
  // Mostramos el bloque solo si:
  //   1. El comprador activó un método `cash`.
  //   2. El total pagado supera el total de la orden (hay vuelto).
  // ------------------------------------------------------------

  const hasCashMethodEnabled = useMemo(
    () =>
      reportStates.some(
        (s) => s.enabled && s.methodType === 'cash' && s.amount > 0,
      ),
    [reportStates],
  );

  const hasOverpay = useMemo(() => {
    const safeRate = exchangeRate > 0 ? exchangeRate : 0;
    let paidVes = 0;
    let paidUsd = 0;
    for (const s of reportStates) {
      if (!s.enabled || s.amount <= 0) continue;
      if (s.currency === 'VES') paidVes += s.amount;
      else if (s.currency === 'USD') paidUsd += s.amount;
    }
    const paidEquivalentVes = paidVes + paidUsd * safeRate;
    return paidEquivalentVes > totalVes + 0.01;
  }, [reportStates, exchangeRate, totalVes]);

  const showChangeDeliveryBlock = hasCashMethodEnabled && hasOverpay;

  // ------------------------------------------------------------
  // CÁLCULO EN TIEMPO REAL (solo report mode)
  // ------------------------------------------------------------

  const reportTotals = useMemo(() => {
    if (mode !== 'report') return null;

    const safeRate = exchangeRate > 0 ? exchangeRate : 0;

    let paidVes = 0;
    let paidUsd = 0;

    for (const state of reportStates) {
      if (!state.enabled || state.amount <= 0) continue;
      if (state.currency === 'VES') paidVes += state.amount;
      else if (state.currency === 'USD') paidUsd += state.amount;
    }

    const paidEquivalentVes = paidVes + paidUsd * safeRate;
    const diffVes = paidEquivalentVes - totalVes;

    let status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
    if (paidEquivalentVes <= 0) status = 'unpaid';
    else if (Math.abs(diffVes) < 0.01) status = 'paid';
    else if (diffVes < 0) status = 'partial';
    else status = 'overpaid';

    return {
      paidVes,
      paidUsd,
      paidEquivalentVes,
      remainingVes: diffVes < 0 ? Math.abs(diffVes) : 0,
      changeVes: diffVes > 0 ? diffVes : 0,
      changeUsd: safeRate > 0 && diffVes > 0 ? diffVes / safeRate : 0,
      status,
    };
  }, [mode, reportStates, totalVes, exchangeRate]);

  // ------------------------------------------------------------
  // VALIDACIÓN
  // ------------------------------------------------------------

  const validationErrors = useMemo(() => {
    if (mode !== 'report') return new Map<number, string>();

    const map = new Map<number, string>();
    reportStates.forEach((state, index) => {
      const errors = validateReportMethod(state);
      if (errors.length > 0) {
        map.set(index, errors.join('. '));
      }
    });
    return map;
  }, [mode, reportStates]);

  const hasActiveMethods = reportStates.some(
    (s) => s.enabled && s.amount > 0,
  );
  const hasValidationErrors = validationErrors.size > 0;
  const canSubmit =
    hasActiveMethods && !hasValidationErrors && !isSubmitting && !!onSubmit;

  // ------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------

  const handleStateChange = (index: number, next: ReportMethodState) => {
    setLocalError(null);
    setReportStates((prev) => {
      const copy = [...prev];
      const prevState = copy[index];

      // 🔥 Detectar si el usuario está activando el método por primera vez
      //    o si ya estaba activo (cambio en campos secundarios).
      const wasEnabled = prevState?.enabled === true;
      const isEnabling = !wasEnabled && next.enabled === true;

      // 🔥 Detectar edición manual del monto.
      const amountChanged =
        prevState?.amount !== next.amount;

      // 🔥 Detectar desactivación.
      const isDisabling = wasEnabled && next.enabled === false;

      let finalState: ReportMethodState = { ...next };

      // CASO 1: Activar un método → autocompletar con el restante
      if (
        isEnabling &&
        finalState.amount === 0 &&
        finalState.currency
      ) {
        const safeRate = exchangeRate > 0 ? exchangeRate : 0;

        // Sumar lo que ya está pagado en OTROS métodos activos
        const otherMethodsEquivalentVes = copy.reduce(
          (acc, otherState, otherIndex) => {
            if (otherIndex === index) return acc;
            if (!otherState?.enabled || otherState.amount <= 0) return acc;
            if (otherState.currency === 'VES') return acc + otherState.amount;
            if (otherState.currency === 'USD')
              return acc + otherState.amount * safeRate;
            return acc;
          },
          0,
        );

        const remainingVes = Math.max(0, totalVes - otherMethodsEquivalentVes);

        // Si hay algo que pagar, autocompletar
        if (remainingVes > 0) {
          const amountInMethodCurrency =
            finalState.currency === 'USD' && safeRate > 0
              ? remainingVes / safeRate
              : remainingVes;

          finalState = {
            ...finalState,
            amount: Math.round(amountInMethodCurrency * 100) / 100,
            isAutoFilled: true,
          };
        }
      }

      // CASO 2: El usuario editó el monto manualmente
      if (amountChanged && !finalState.isAutoFilled) {
        // Marcar como editado manualmente (para no sobreescribir después)
        finalState = {
          ...finalState,
          isAutoFilled: false,
        };
      }

      // CASO 3: Desactivar → limpiar flag y monto
      if (isDisabling) {
        finalState = {
          ...finalState,
          amount: 0,
          isAutoFilled: false,
        };
      }

      copy[index] = finalState;
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!onSubmit || !canSubmit) return;
    setLocalError(null);

    const enabledStates = reportStates.filter(
      (s) => s.enabled && s.amount > 0,
    );

    const payload: CreatePaymentBreakdownPayload = {
      methods: enabledStates.map((s) => ({
        methodId: s.methodId,
        methodType: s.methodType,
        amount: s.amount,
        currency: s.currency,
        reference: s.reference.trim() || undefined,
        bank: s.bank.trim() || undefined,
        clientIdNumber: s.clientIdNumber.trim() || undefined,
        clientIdType: s.clientIdType || undefined,
        clientPhone: s.clientPhone.trim() || undefined,
        clientAccountType: s.clientAccountType.trim() || undefined,
        senderEmail: s.senderEmail.trim() || undefined,
        proofUrl: s.proofUrl.trim() || undefined,
        notes: s.notes.trim() || undefined,
      })),
      // 🔥 Preferencia de entrega del vuelto (si hay y aplica)
      changeDeliveryPreference:
        showChangeDeliveryBlock && changeDeliveryPreference
          ? changeDeliveryPreference
          : undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al reportar el pago';
      setLocalError(message);
    }
  };

  // ------------------------------------------------------------
  // RENDER: modo view
  // ------------------------------------------------------------

  if (mode === 'view') {
    if (!initialBreakdown) {
      return (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{
            borderColor,
            backgroundColor: cardBg,
            color: textColor,
            opacity: 0.7,
          }}
        >
          No hay desglose de pago registrado para esta orden.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {!hideTitle && (
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: primary }}
            >
              Desglose de pago
            </div>
            <div
              className="text-[11px] mt-0.5"
              style={{ color: textColor, opacity: 0.6 }}
            >
              Reportado el{' '}
              {new Date(initialBreakdown.reportedAt).toLocaleString('es-VE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {initialBreakdown.methods.map((entry, index) => (
            <PaymentBreakdownMethodRow
              key={`${entry.methodType}-${entry.methodId ?? index}`}
              mode="view"
              methodType={entry.methodType}
              methodLabel={entry.methodLabelSnapshot}
              amount={entry.amount}
              currency={entry.currency}
              reference={entry.reference}
              bank={entry.bank}
              clientIdNumber={entry.clientIdNumber}
              clientPhone={entry.clientPhone}
              clientAccountType={entry.clientAccountType}
              senderEmail={entry.senderEmail}
              notes={entry.notes}
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderColor}
              cardBg={cardBg}
            />
          ))}
        </div>

        <PaymentBreakdownSummary
          status={initialBreakdown.status}
          totalVes={totalVes}
          exchangeRate={exchangeRate}
          paidEquivalentVes={initialBreakdown.totals.paidEquivalentVes}
          paidVes={initialBreakdown.totals.paidVes}
          paidUsd={initialBreakdown.totals.paidUsd}
          remainingVes={
            initialBreakdown.status === 'partial' ||
            initialBreakdown.status === 'unpaid'
              ? Math.max(
                  0,
                  totalVes - initialBreakdown.totals.paidEquivalentVes,
                )
              : 0
          }
          changeVes={initialBreakdown.change.amountVes}
          changeUsd={initialBreakdown.change.amountUsd}
          changeResolution={initialBreakdown.change.resolution}
          deliveryMethod={initialBreakdown.change.deliveryMethod}
          deliveryPagoMovilData={
            initialBreakdown.change.deliveryPagoMovilData
          }
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          borderColor={borderColor}
        />

        {initialBreakdown.change.amountVes > 0 && (
          <PaymentBreakdownChangeResolver
            changeVes={initialBreakdown.change.amountVes}
            exchangeRate={exchangeRate}
            currentResolution={initialBreakdown.change.resolution}
            canResolve={canResolveChange && !!onResolveChange}
            deliveryPreference={
              (initialBreakdown.change as any).deliveryPreference
            }
            deliveryMethod={(initialBreakdown.change as any).deliveryMethod}
            deliveryPagoMovilData={
              (initialBreakdown.change as any).deliveryPagoMovilData
            }
            primary={primary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            borderColor={borderColor}
            cardBg={cardBg}
            isSubmitting={isSubmitting}
            onSubmit={async (
              resolution,
              notes,
              deliveryMethod,
              deliveryPagoMovilData,
            ) => {
              if (!onResolveChange) return;
              await onResolveChange(
                resolution,
                notes,
                deliveryMethod,
                deliveryPagoMovilData,
              );
            }}
          />
        )}
      </div>
    );
  }

  // ------------------------------------------------------------
  // RENDER: modo report
  // ------------------------------------------------------------

  const displayError = submitError || localError;

  return (
    <div className="space-y-3">
      {!hideTitle && (
        <div>
          <div
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: primary }}
          >
            Desglose de pago
          </div>
          <div
            className="text-[11px] mt-0.5"
            style={{ color: textColor, opacity: 0.6 }}
          >
            Puedes combinar varios métodos. El sistema calcula el vuelto
            automáticamente.
          </div>
        </div>
      )}

      <div className="space-y-2">
        {activeMethods.length === 0 && (
          <div
            className="rounded-2xl border p-4 text-sm text-center"
            style={{
              borderColor,
              backgroundColor: cardBg,
              color: textColor,
              opacity: 0.6,
            }}
          >
            Este comercio no tiene métodos de pago configurados.
          </div>
        )}

        {activeMethods.map((method, index) => {
          // 🔥 Calcular el máximo permitido para este método:
          //    - El total * 5 (límite global razonable)
          //    - Menos la suma de los OTROS métodos activos
          //    Así el usuario no puede ingresar más de lo razonable.
          const safeRate = exchangeRate > 0 ? exchangeRate : 0;
          const otherMethodsEquivalentVes = reportStates.reduce(
            (acc, otherState, otherIndex) => {
              if (otherIndex === index) return acc;
              if (!otherState.enabled || otherState.amount <= 0) return acc;
              if (otherState.currency === 'VES') return acc + otherState.amount;
              if (otherState.currency === 'USD')
                return acc + otherState.amount * safeRate;
              return acc;
            },
            0,
          );

          const HARD_LIMIT_VES = Math.max(totalVes * 5, 0);
          const remainingHardLimit = Math.max(
            0,
            HARD_LIMIT_VES - otherMethodsEquivalentVes,
          );

          // 🔥 El bloque de preferencia solo se muestra en el PRIMER
          // método cash activo, para no duplicarlo.
          const isFirstCashEnabled =
            method.type === 'cash' &&
            reportStates[index]?.enabled === true &&
            !reportStates.slice(0, index).some(
              (s) => s.methodType === 'cash' && s.enabled,
            );

          return (
            <PaymentBreakdownMethodRow
              key={`${method.type}-${method.id}`}
              mode="report"
              method={method}
              state={reportStates[index]}
              onChange={(next) => handleStateChange(index, next)}
              disabled={isSubmitting}
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderColor}
              cardBg={cardBg}
              error={validationErrors.get(index) ?? null}
              maxAmountVes={remainingHardLimit}
              showChangeDeliveryBlock={showChangeDeliveryBlock && isFirstCashEnabled}
              changeDeliveryPreference={changeDeliveryPreference}
              onChangeDeliveryPreference={setChangeDeliveryPreference}
              totalVes={totalVes}
              exchangeRate={exchangeRate}
            />
          );
        })}
      </div>

      {reportTotals && (
        <PaymentBreakdownSummary
          status={reportTotals.status}
          totalVes={totalVes}
          exchangeRate={exchangeRate}
          paidEquivalentVes={reportTotals.paidEquivalentVes}
          paidVes={reportTotals.paidVes}
          paidUsd={reportTotals.paidUsd}
          remainingVes={reportTotals.remainingVes}
          changeVes={reportTotals.changeVes}
          changeUsd={reportTotals.changeUsd}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          borderColor={borderColor}
        />
      )}

      {displayError && (
        <div
          className="rounded-xl p-3 text-xs"
          style={{
            backgroundColor: isDarkBg
              ? 'rgba(248,113,113,0.15)'
              : 'rgba(185,28,28,0.08)',
            color: isDarkBg ? '#f87171' : '#b91c1c',
          }}
        >
          {displayError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canSubmit ? primary : borderColor,
          color: '#ffffff',
        }}
      >
        {isSubmitting ? 'Reportando...' : 'Reportar Pago'}
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function buildInitialReportStates(
  activeMethods: ActivePaymentMethod[],
): ReportMethodState[] {
  return activeMethods.map((method) => ({
    methodId: method.id,
    methodType: method.type,
    methodLabelSnapshot: buildMethodLabel(method.type, method),
    amount: 0,
    currency: getDefaultCurrencyForMethod(method.type),
    enabled: false,
    reference: '',
    bank: '',
    clientIdNumber: '',
    clientIdType: 'V',
    clientPhone: '',
    clientAccountType: '',
    senderEmail: '',
    proofUrl: '',
    notes: '',
  }));
}

export default PaymentBreakdown;