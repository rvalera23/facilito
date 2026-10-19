// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/PaymentBreakdownChangeResolver.tsx
// ============================================================
// Selector de resolución del vuelto. Solo lo usa el admin.
//
// 4 acciones mutuamente excluyentes:
//   - Entregar vuelto (delivered)
//   - Convertir a saldo a favor (credit)
//   - Aceptar redondeo (rounded)
//   - Cancelar el pago (cancelled)
//
// Una vez resuelto, no se puede volver atrás.
// ============================================================

'use client';

import React, { useState } from 'react';
import type { ChangeResolution } from '@/types/payment-breakdown';
import { formatAmount } from './formatHelpers';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface Props {
  changeVes: number;
  exchangeRate: number;
  currentResolution: ChangeResolution;
  canResolve: boolean;

  /** Cómo el comprador pidió que le devuelvan el vuelto (opcional). */
  deliveryPreference?: {
    method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
    pagoMovilData?: {
      bank: string;
      phone: string;
      clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
      clientIdNumber: string;
    };
    notes?: string;
  };

  /** Cómo se entregó el vuelto (una vez resuelto). */
  deliveryMethod?: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
  deliveryPagoMovilData?: {
    bank: string;
    phone: string;
    clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
    clientIdNumber: string;
    reference?: string;
  };

  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
  cardBg: string;

  isSubmitting?: boolean;
  onSubmit: (
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
}

export function PaymentBreakdownChangeResolver({
  changeVes,
  exchangeRate,
  currentResolution,
  canResolve,
  deliveryPreference,
  deliveryMethod,
  deliveryPagoMovilData,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  cardBg,
  isSubmitting,
  onSubmit,
}: Props) {
  const [selected, setSelected] = useState<ChangeResolution | null>(null);
  const [notes, setNotes] = useState('');

  // 🔥 Estado para el método de entrega del vuelto
  const [selectedDelivery, setSelectedDelivery] = useState<
    'cash_ves' | 'cash_usd' | 'pago_movil' | 'other'
  >(deliveryPreference?.method ?? 'cash_ves');

  // 🔥 Estado para los datos de Pago Móvil (si elige entregar por PM)
  const [pmBank, setPmBank] = useState(
    deliveryPreference?.pagoMovilData?.bank ?? '',
  );
  const [pmPhone, setPmPhone] = useState(
    deliveryPreference?.pagoMovilData?.phone ?? '',
  );
  const [pmIdType, setPmIdType] = useState<'V' | 'E' | 'J' | 'G' | 'P'>(
    deliveryPreference?.pagoMovilData?.clientIdType ?? 'V',
  );
  const [pmIdNumber, setPmIdNumber] = useState(
    deliveryPreference?.pagoMovilData?.clientIdNumber ?? '',
  );
  const [pmReference, setPmReference] = useState('');

  // Si ya está resuelto (no 'pending'), se muestra como resuelto.
  const isResolved = currentResolution !== 'pending';

  if (isResolved) {
    return (
      <div
        className="rounded-2xl border p-4 space-y-2"
        style={{
          borderColor,
          backgroundColor: isDarkBg
            ? 'rgba(74,222,128,0.08)'
            : 'rgba(21,128,61,0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDarkBg ? '#4ade80' : '#15803d'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span
            className="text-sm font-bold"
            style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}
          >
            Vuelto resuelto
          </span>
        </div>
        <div className="text-[11px]" style={{ color: textColor, opacity: 0.7 }}>
          {describeResolution(currentResolution)}
        </div>

        {/* 🔥 Método de entrega (si aplica) */}
        {currentResolution === 'delivered' && deliveryMethod && (
          <div
            className="text-[11px] pt-1 border-t"
            style={{ borderColor, color: textColor, opacity: 0.85 }}
          >
            <div className="font-bold">
              Entregado vía:{' '}
              {deliveryMethod === 'cash_ves'
                ? 'Efectivo Bs.'
                : deliveryMethod === 'cash_usd'
                  ? 'Efectivo USD'
                  : deliveryMethod === 'pago_movil'
                    ? 'Pago Móvil'
                    : 'Otro'}
            </div>
            {deliveryMethod === 'pago_movil' && deliveryPagoMovilData && (
              <div className="mt-1 space-y-0.5" style={{ opacity: 0.8 }}>
                <div>
                  <b>Banco:</b> {deliveryPagoMovilData.bank}
                </div>
                <div>
                  <b>Teléfono:</b> {deliveryPagoMovilData.phone}
                </div>
                <div>
                  <b>Cédula:</b> {deliveryPagoMovilData.clientIdType}-
                  {deliveryPagoMovilData.clientIdNumber}
                </div>
                {deliveryPagoMovilData.reference && (
                  <div>
                    <b>Referencia:</b> {deliveryPagoMovilData.reference}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!canResolve) {
    // No puede resolver: solo se muestra info
    return (
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor, backgroundColor: cardBg }}
      >
        <div
          className="text-[11px]"
          style={{ color: textColor, opacity: 0.7 }}
        >
          El vuelto de Bs. {formatAmount(changeVes)} está pendiente. Solo el
          administrador puede resolverlo.
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!selected || isSubmitting) return;
    try {
      // 🔥 Si la resolución es 'delivered', incluir el método de entrega
      if (selected === 'delivered') {
        const pmData =
          selectedDelivery === 'pago_movil'
            ? {
                bank: pmBank.trim(),
                phone: pmPhone.trim(),
                clientIdType: pmIdType,
                clientIdNumber: pmIdNumber.trim(),
                reference: pmReference.trim() || undefined,
              }
            : undefined;

        await onSubmit(
          selected,
          notes.trim() || undefined,
          selectedDelivery,
          pmData,
        );
      } else {
        await onSubmit(selected, notes.trim() || undefined);
      }
    } catch {
      // El padre maneja el error
    }
  };

  const options: Array<{
    value: ChangeResolution;
    label: string;
    description: string;
  }> = [
    {
      value: 'delivered',
      label: 'Entregar vuelto',
      description: 'Se entrega el vuelto al cliente ahora.',
    },
    {
      value: 'credit',
      label: 'Convertir a saldo a favor',
      description: 'Se acredita al cliente para su próxima compra.',
    },
    {
      value: 'rounded',
      label: 'Aceptar redondeo',
      description: 'El cliente acepta perder el vuelto.',
    },
    {
      value: 'cancelled',
      label: 'Cancelar pago',
      description: 'El pago se cancela y la orden no procede.',
    },
  ];

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ borderColor, backgroundColor: cardBg }}
    >
      <div>
        <div
          className="text-[10px] uppercase tracking-wider font-extrabold mb-1"
          style={{ color: textColor, opacity: 0.6 }}
        >
          Resolución del vuelto
        </div>
        <div className="text-sm font-bold" style={{ color: primary }}>
          Bs. {formatAmount(changeVes)}
          {exchangeRate > 0 && (
            <span
              className="text-[11px] ml-2 font-medium"
              style={{ color: textColor, opacity: 0.6 }}
            >
              ≈ USD {formatAmount(changeVes / exchangeRate)}
            </span>
          )}
        </div>
      </div>

      {/* 🔥 Preferencia del comprador (si existe) */}
      {deliveryPreference && (
        <div
          className="p-2.5 rounded-xl border"
          style={{
            borderColor: `${primary}40`,
            backgroundColor: `${primary}10`,
            color: textColor,
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider font-bold mb-1"
            style={{ color: primary }}
          >
            El comprador pidió:
          </div>
          <div className="text-[11px]">
            {deliveryPreference.method === 'cash_ves'
              ? 'Efectivo Bs.'
              : deliveryPreference.method === 'cash_usd'
                ? 'Efectivo USD'
                : deliveryPreference.method === 'pago_movil'
                  ? 'Pago Móvil'
                  : 'Otro'}
          </div>
          {deliveryPreference.method === 'pago_movil' &&
            deliveryPreference.pagoMovilData && (
              <div className="text-[10px] mt-1 space-y-0.5" style={{ opacity: 0.8 }}>
                <div>
                  <b>Banco:</b> {deliveryPreference.pagoMovilData.bank}
                </div>
                <div>
                  <b>Teléfono:</b> {deliveryPreference.pagoMovilData.phone}
                </div>
                <div>
                  <b>Cédula:</b>{' '}
                  {deliveryPreference.pagoMovilData.clientIdType}-
                  {deliveryPreference.pagoMovilData.clientIdNumber}
                </div>
              </div>
            )}
          {deliveryPreference.notes && (
            <div className="text-[10px] mt-1 italic" style={{ opacity: 0.7 }}>
              "{deliveryPreference.notes}"
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              disabled={isSubmitting}
              className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: active ? primary : borderColor,
                backgroundColor: active
                  ? `${primary}15`
                  : isDarkBg
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(0,0,0,0.01)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: active ? primary : borderColor,
                  }}
                >
                  {active && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: primary }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-bold"
                    style={{ color: textColor }}
                  >
                    {opt.label}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: textColor, opacity: 0.6 }}
                  >
                    {opt.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 🔥 Método de entrega del vuelto (solo si resolution='delivered') */}
      {selected === 'delivered' && (
        <div
          className="p-3 rounded-xl border space-y-2"
          style={{
            borderColor,
            backgroundColor: isDarkBg
              ? 'rgba(255,255,255,0.02)'
              : 'rgba(0,0,0,0.01)',
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider font-bold"
            style={{ color: textColor, opacity: 0.6 }}
          >
            ¿Cómo se entrega el vuelto?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { value: 'cash_ves', label: 'Efectivo Bs.' },
                { value: 'cash_usd', label: 'Efectivo USD' },
                { value: 'pago_movil', label: 'Pago Móvil' },
                { value: 'other', label: 'Otro' },
              ] as const
            ).map((opt) => {
              const active = selectedDelivery === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDelivery(opt.value)}
                  disabled={isSubmitting}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer disabled:opacity-50"
                  style={{
                    borderColor: active ? primary : borderColor,
                    backgroundColor: active ? `${primary}15` : 'transparent',
                    color: active ? primary : textColor,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Campos de Pago Móvil (si elige PM) */}
          {selectedDelivery === 'pago_movil' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label
                  className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Banco
                </label>
                <input
                  type="text"
                  value={pmBank}
                  onChange={(e) => setPmBank(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Banesco"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                  style={{
                    backgroundColor: isDarkBg
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)',
                    borderColor,
                    color: textColor,
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={pmPhone}
                  onChange={(e) => setPmPhone(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="04141234567"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                  style={{
                    backgroundColor: isDarkBg
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)',
                    borderColor,
                    color: textColor,
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Cédula / RIF
                </label>
                <div className="flex gap-1">
                  <div className="w-[70px] flex-shrink-0">
                    <SearchableDropdown
                      value={pmIdType}
                      onChange={(val) =>
                        setPmIdType(val as 'V' | 'E' | 'J' | 'G' | 'P')
                      }
                      options={[
                        { value: 'V', label: 'V' },
                        { value: 'E', label: 'E' },
                        { value: 'J', label: 'J' },
                        { value: 'G', label: 'G' },
                        { value: 'P', label: 'P' },
                      ]}
                      placeholder="V"
                      primary={primary}
                      textColor={textColor}
                      isDarkBg={isDarkBg}
                      borderColor={borderColor}
                      searchable={false}
                      disabled={isSubmitting}
                    />
                  </div>
                  <input
                    type="text"
                    value={pmIdNumber}
                    onChange={(e) => setPmIdNumber(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="12345678"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: isDarkBg
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)',
                      borderColor,
                      color: textColor,
                    }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1"
                  style={{ color: textColor }}
                >
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={pmReference}
                  onChange={(e) => setPmReference(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="1234"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                  style={{
                    backgroundColor: isDarkBg
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)',
                    borderColor,
                    color: textColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label
          className="block text-[10px] uppercase tracking-wider font-bold mb-1"
          style={{ color: textColor, opacity: 0.6 }}
        >
          Notas (opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          placeholder="Motivo o comentario"
          className="w-full px-3 py-2 rounded-xl text-sm border outline-none transition-all disabled:opacity-50"
          style={{
            backgroundColor: isDarkBg
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
            borderColor,
            color: textColor,
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selected || isSubmitting}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: selected ? primary : borderColor,
          color: '#ffffff',
        }}
      >
        {isSubmitting ? 'Guardando...' : 'Confirmar resolución'}
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// DESCRIPCIÓN DE LA RESOLUCIÓN
// ------------------------------------------------------------

function describeResolution(resolution: ChangeResolution): string {
  switch (resolution) {
    case 'delivered':
      return 'El vuelto fue entregado al cliente.';
    case 'credit':
      return 'El vuelto fue acreditado como saldo a favor del cliente.';
    case 'rounded':
      return 'El cliente aceptó el redondeo.';
    case 'cancelled':
      return 'El pago fue cancelado.';
    case 'pending':
      return 'El vuelto está pendiente de resolución.';
  }
}