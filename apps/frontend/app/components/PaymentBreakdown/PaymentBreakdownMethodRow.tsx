// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/PaymentBreakdownMethodRow.tsx
// ============================================================
// Fila de un método de pago en el desglose.
//
// Modo 'report': el usuario activa el método con un checkbox,
// ingresa monto, moneda (si aplica) y campos específicos.
//
// Modo 'view': muestra los datos ya reportados en solo lectura.
// ============================================================

'use client';

import React from 'react';
import type { PaymentMethodType } from '@/types/payment-breakdown';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { MethodIcon } from './MethodIcons';
import {
  METHOD_LABELS_ES,
  isCurrencySelectable,
  type ActivePaymentMethod,
  type ReportMethodState,
} from './PaymentBreakdown.types';
import type {
  ChangeDeliveryPreference,
  ChangeDeliveryMethod,
} from '@/types/payment-breakdown';

// ------------------------------------------------------------
// PROPS: MODO REPORT
// ------------------------------------------------------------

interface ReportModeProps {
  mode: 'report';
  method: ActivePaymentMethod;
  state: ReportMethodState;
  onChange: (next: ReportMethodState) => void;
  disabled?: boolean;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
  cardBg: string;
  error?: string | null;
  /** Monto máximo permitido en VES para este método. */
  maxAmountVes?: number;
  /** Solo el primer método cash activo muestra el bloque de entrega del vuelto. */
  showChangeDeliveryBlock?: boolean;
  /** Preferencia de entrega actual (leída del padre). */
  changeDeliveryPreference?: ChangeDeliveryPreference;
  /** Callback para actualizar la preferencia. */
  onChangeDeliveryPreference?: (pref: ChangeDeliveryPreference | undefined) => void;
  // 🔥 NUEVO: para el botón "Exacto"
  totalVes?: number;
  exchangeRate?: number;
}

// ------------------------------------------------------------
// PROPS: MODO VIEW
// ------------------------------------------------------------

interface ViewModeProps {
  mode: 'view';
  methodType: PaymentMethodType;
  methodLabel: string;
  amount: number;
  currency: 'VES' | 'USD';
  reference?: string;
  bank?: string;
  clientIdNumber?: string;
  clientPhone?: string;
  clientAccountType?: string;
  senderEmail?: string;
  notes?: string;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
  cardBg: string;
}

type Props = ReportModeProps | ViewModeProps;

export function PaymentBreakdownMethodRow(props: Props) {
  if (props.mode === 'report') return <ReportRow {...props} />;
  return <ViewRow {...props} />;
}

// ------------------------------------------------------------
// MODO REPORT
// ------------------------------------------------------------

function ReportRow({
  method,
  state,
  onChange,
  disabled,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  cardBg,
  error,
  maxAmountVes,
  showChangeDeliveryBlock,
  changeDeliveryPreference,
  onChangeDeliveryPreference,
  totalVes,        // 🔥 NUEVO
  exchangeRate,    // 🔥 NUEVO
}: ReportModeProps) {
  const label = METHOD_LABELS_ES[method.type] ?? method.type;
  const subtitle = method.bankName
    ? method.bankName
    : method.ciRif
      ? method.ciRif
      : method.phone
        ? method.phone
        : null;

  const selectableCurrency = isCurrencySelectable(method.type);

  const handleToggle = () => {
    if (disabled) return;
    onChange({
      ...state,
      enabled: !state.enabled,
      amount: state.enabled ? 0 : state.amount,
    });
  };

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(',', '.');
    let parsed = parseFloat(cleaned);

    if (!Number.isFinite(parsed) || parsed < 0) {
      parsed = 0;
    }

    // 🔥 Aplicar techo de monto (si se pasó maxAmountVes)
    if (typeof maxAmountVes === 'number' && maxAmountVes >= 0 && parsed > maxAmountVes) {
      parsed = maxAmountVes;
    }

    // Redondear a 2 decimales para evitar valores como 0.1 + 0.2 = 0.30000000000000004
    parsed = Math.round(parsed * 100) / 100;

    onChange({
      ...state,
      amount: parsed,
    });
  };

  const setField = <K extends keyof ReportMethodState>(
    key: K,
    value: ReportMethodState[K],
  ) => {
    onChange({ ...state, [key]: value });
  };

  return (
    <div
      className="rounded-2xl border transition-all"
      style={{
        borderColor: state.enabled ? primary : borderColor,
        backgroundColor: state.enabled
          ? isDarkBg
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(0,0,0,0.02)'
          : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: state.enabled
              ? `${primary}20`
              : isDarkBg
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
            color: state.enabled ? primary : textColor,
          }}
        >
          <MethodIcon type={method.type} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold truncate"
            style={{ color: textColor }}
          >
            {label}
          </div>
          {subtitle && (
            <div
              className="text-[11px] opacity-60 truncate"
              style={{ color: textColor }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
          style={{
            borderColor: state.enabled ? primary : borderColor,
            backgroundColor: state.enabled ? primary : 'transparent',
          }}
        >
          {state.enabled && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>

      {state.enabled && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                style={{ color: textColor }}
              >
                Monto
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={state.amount > 0 ? state.amount.toString() : ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0,00"
                  disabled={disabled}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: cardBg,
                    borderColor:
                      typeof maxAmountVes === 'number' &&
                      state.amount >= maxAmountVes &&
                      maxAmountVes > 0
                        ? 'rgba(251,191,36,0.5)'
                        : borderColor,
                    color: textColor,
                  }}
                />
                {/* 🔥 BOTÓN EXACTO - SOLO PARA EFECTIVO */}
                {method.method === 'cash' && (
                  <button
                    type="button"
                    onClick={() => {
                      const exactAmount = state.currency === 'USD'
                        ? (typeof totalVes === 'number' ? totalVes : 0) / (exchangeRate > 0 ? exchangeRate : 1)
                        : (typeof totalVes === 'number' ? totalVes : 0);
                      const rounded = Math.round(exactAmount * 100) / 100;
                      setField('amount', rounded);
                    }}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition cursor-pointer hover:opacity-90 active:scale-95 whitespace-nowrap"
                    style={{
                      backgroundColor: `${primary}15`,
                      borderColor: primary,
                      color: primary,
                    }}
                    title="Pagar con el monto exacto"
                  >
                    Exacto
                  </button>
                )}
              </div>
              {typeof maxAmountVes === 'number' &&
                maxAmountVes > 0 &&
                state.amount >= maxAmountVes && (
                  <p
                    className="text-[10px] mt-1 font-medium"
                    style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}
                  >
                    Monto máximo permitido alcanzado
                  </p>
                )}
            </div>

            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
                style={{ color: textColor }}
              >
                Moneda
              </label>
              {selectableCurrency ? (
                <SearchableDropdown
                  value={state.currency}
                  onChange={(val) => setField('currency', val as 'VES' | 'USD')}
                  options={[
                    { value: 'VES', label: 'VES' },
                    { value: 'USD', label: 'USD' },
                  ]}
                  placeholder="VES"
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={borderColor}
                  secondary={cardBg}
                  searchable={false}
                  disabled={disabled}
                />
              ) : (
                <div
                  className="px-3 py-2 rounded-xl text-sm border text-center"
                  style={{
                    backgroundColor: cardBg,
                    borderColor,
                    color: textColor,
                    opacity: 0.7,
                  }}
                >
                  {state.currency}
                </div>
              )}
            </div>
          </div>

          <MethodFields
            state={state}
            setField={setField}
            disabled={disabled}
            textColor={textColor}
            cardBg={cardBg}
            borderColor={borderColor}
            primary={primary}
            isDarkBg={isDarkBg}
          />

          {/* 🔥 Preferencia de entrega del vuelto (solo primer cash, si aplica) */}
          {showChangeDeliveryBlock && onChangeDeliveryPreference && (
            <ChangeDeliveryPreferenceBlock
              preference={changeDeliveryPreference}
              onChange={onChangeDeliveryPreference}
              disabled={disabled}
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderColor}
              cardBg={cardBg}
            />
          )}

          {error && (
            <div className="text-[11px] text-rose-500 font-medium">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// BLOQUE: PREFERENCIA DE ENTREGA DEL VUELTO
// ------------------------------------------------------------

interface ChangeDeliveryPreferenceBlockProps {
  preference?: ChangeDeliveryPreference;
  onChange: (pref: ChangeDeliveryPreference | undefined) => void;
  disabled?: boolean;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
  cardBg: string;
}

function ChangeDeliveryPreferenceBlock({
  preference,
  onChange,
  disabled,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  cardBg,
}: ChangeDeliveryPreferenceBlockProps) {
  const selectedMethod: ChangeDeliveryMethod = preference?.method ?? 'cash_ves';
  const pmBank = preference?.pagoMovilData?.bank ?? '';
  const pmPhone = preference?.pagoMovilData?.phone ?? '';
  const pmIdType = preference?.pagoMovilData?.clientIdType ?? 'V';
  const pmIdNumber = preference?.pagoMovilData?.clientIdNumber ?? '';

  const update = (patch: Partial<ChangeDeliveryPreference>) => {
    onChange({
      method: selectedMethod,
      pagoMovilData: preference?.pagoMovilData,
      notes: preference?.notes,
      ...patch,
    });
  };

  const updatePm = (
    patch: Partial<NonNullable<ChangeDeliveryPreference['pagoMovilData']>>,
  ) => {
    const current = preference?.pagoMovilData ?? {
      bank: '',
      phone: '',
      clientIdType: 'V' as const,
      clientIdNumber: '',
    };
    onChange({
      method: 'pago_movil',
      pagoMovilData: { ...current, ...patch },
      notes: preference?.notes,
    });
  };

  const inputStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderColor,
    color: textColor,
  };

  return (
    <div
      className="mt-2 p-3 rounded-xl border space-y-2"
      style={{
        borderColor: `${primary}40`,
        backgroundColor: `${primary}08`,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-bold"
        style={{ color: primary }}
      >
        ¿Cómo querés que te devolvamos el vuelto?
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
          const active = selectedMethod === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ method: opt.value })}
              disabled={disabled}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer disabled:opacity-50"
              style={{
                borderColor: active ? primary : borderColor,
                backgroundColor: active ? `${primary}20` : 'transparent',
                color: active ? primary : textColor,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {selectedMethod === 'pago_movil' && (
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
              onChange={(e) => updatePm({ bank: e.target.value })}
              disabled={disabled}
              placeholder="Banesco"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
              style={inputStyle}
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
              onChange={(e) => updatePm({ phone: e.target.value })}
              disabled={disabled}
              placeholder="04141234567"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
              style={inputStyle}
            />
          </div>
          <div className="col-span-2">
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
                    updatePm({
                      clientIdType: val as 'V' | 'E' | 'J' | 'G' | 'P',
                    })
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
                  disabled={disabled}
                />
              </div>
              <input
                type="text"
                value={pmIdNumber}
                onChange={(e) => updatePm({ clientIdNumber: e.target.value })}
                disabled={disabled}
                placeholder="12345678"
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// CAMPOS ESPECÍFICOS POR MÉTODO
// ------------------------------------------------------------

interface MethodFieldsProps {
  state: ReportMethodState;
  setField: <K extends keyof ReportMethodState>(
    key: K,
    value: ReportMethodState[K],
  ) => void;
  disabled?: boolean;
  textColor: string;
  cardBg: string;
  borderColor: string;
  primary: string;
  isDarkBg: boolean;
}

function MethodFields(props: MethodFieldsProps) {
  const { state, setField, disabled, textColor, cardBg, borderColor, primary, isDarkBg } = props;

  const inputStyle: React.CSSProperties = {
    backgroundColor: cardBg,
    borderColor,
    color: textColor,
  };

  const inputClass =
    'w-full px-3 py-2 rounded-xl text-sm border outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const renderInput = (
    key: keyof ReportMethodState,
    label: string,
    placeholder?: string,
    type: 'text' | 'email' | 'tel' = 'text',
  ) => (
    <div>
      <label
        className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
        style={{ color: textColor }}
      >
        {label}
      </label>
      <input
        type={type}
        value={(state[key] as string) ?? ''}
        onChange={(e) => setField(key, e.target.value as never)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClass}
        style={inputStyle}
      />
    </div>
  );

  switch (state.methodType) {
    case 'cash':
      return null;

    case 'pago_movil':
      return (
        <div className="grid grid-cols-2 gap-2">
          {renderInput('reference', 'Referencia', '1234')}
          {renderInput('bank', 'Banco emisor', 'Banesco')}
          {renderInput('clientIdNumber', 'Cédula / RIF', 'V-12345678')}
          {renderInput('clientPhone', 'Teléfono', '0414-1234567', 'tel')}
        </div>
      );

    case 'zelle':
      return (
        <div className="grid grid-cols-2 gap-2">
          {renderInput(
            'senderEmail',
            'Correo del remitente',
            'tu@email.com',
            'email',
          )}
          {renderInput('reference', 'Referencia', 'ID de transacción')}
        </div>
      );

    case 'pos':
      return (
        <div className="grid grid-cols-2 gap-2">
          {renderInput('clientIdNumber', 'Cédula / RIF', 'V-12345678')}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Tipo de cuenta
            </label>
            <SearchableDropdown
              value={state.clientAccountType ?? ''}
              onChange={(val) => setField('clientAccountType', val)}
              options={[
                { value: '', label: 'Selecciona...' },
                { value: 'CORRIENTE', label: 'Corriente' },
                { value: 'AHORRO', label: 'Ahorro' },
              ]}
              placeholder="Selecciona..."
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderColor}
              searchable={false}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case 'biopago':
      return (
        <div className="grid grid-cols-2 gap-2">
          {renderInput('clientIdNumber', 'Cédula / RIF', 'V-12345678')}
          {renderInput('bank', 'Banco', 'Banesco')}
        </div>
      );

    case 'binance':
    case 'paypal':
    case 'crypto_wallet':
    case 'zimli':
    default:
      return (
        <div className="grid grid-cols-2 gap-2">
          {renderInput('reference', 'Referencia', 'ID o hash')}
        </div>
      );
  }
}

// ------------------------------------------------------------
// MODO VIEW
// ------------------------------------------------------------

function ViewRow({
  methodType,
  methodLabel,
  amount,
  currency,
  reference,
  bank,
  clientIdNumber,
  clientPhone,
  clientAccountType,
  senderEmail,
  notes,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  cardBg,
}: ViewModeProps) {
  const label = methodLabel || METHOD_LABELS_ES[methodType] || methodType;
  const currencySymbol = currency === 'VES' ? 'Bs.' : '$';
  const currencyFormatted = amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const details: Array<{ key: string; label: string; value: string }> = [];
  if (reference) details.push({ key: 'ref', label: 'Referencia', value: reference });
  if (bank) details.push({ key: 'bank', label: 'Banco', value: bank });
  if (clientIdNumber)
    details.push({ key: 'ci', label: 'Cédula/RIF', value: clientIdNumber });
  if (clientPhone)
    details.push({ key: 'phone', label: 'Teléfono', value: clientPhone });
  if (clientAccountType)
    details.push({
      key: 'acc',
      label: 'Tipo cuenta',
      value: clientAccountType,
    });
  if (senderEmail)
    details.push({ key: 'email', label: 'Correo', value: senderEmail });
  if (notes) details.push({ key: 'notes', label: 'Notas', value: notes });

  return (
    <div
      className="rounded-2xl border p-3 space-y-2"
      style={{
        borderColor,
        backgroundColor: isDarkBg
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(0,0,0,0.01)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${primary}20`,
            color: primary,
          }}
        >
          <MethodIcon type={methodType} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold truncate"
            style={{ color: textColor }}
          >
            {label}
          </div>
          {bank && (
            <div
              className="text-[11px] opacity-60 truncate"
              style={{ color: textColor }}
            >
              {bank}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-bold" style={{ color: primary }}>
            {currencySymbol} {currencyFormatted}
          </div>
          <div
            className="text-[10px] uppercase tracking-wider opacity-60"
            style={{ color: textColor }}
          >
            {currency}
          </div>
        </div>
      </div>

      {details.length > 0 && (
        <div
          className="pt-2 border-t grid grid-cols-2 gap-1.5"
          style={{ borderColor }}
        >
          {details.map((d) => (
            <div key={d.key} className="text-[11px]">
              <span className="opacity-60" style={{ color: textColor }}>
                {d.label}:{' '}
              </span>
              <span className="font-medium" style={{ color: textColor }}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="hidden" aria-hidden="true">
        {cardBg}
      </div>
    </div>
  );
}