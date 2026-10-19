'use client';

import React from 'react';
import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

export interface KioskoChangePreference {
  method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'credit';
  pagoMovilData?: {
    bank: string;
    phone: string;
    clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
    clientIdNumber: string;
  };
}

export interface KioskoCashPaymentProps {
  totalVes: number;
  totalUsd: number;
  exchangeRate: number;
  currency: 'VES' | 'USD';
  amount: number;
  onCurrencyChange: (currency: 'VES' | 'USD') => void;
  onAmountChange: (amount: number) => void;
  onCoversChange?: (covers: boolean) => void;

  userProfileData?: {
    phone?: string;
    id_number?: string | null;
    id_type?: string | null;
    pago_movil_same_as_profile?: boolean;
  } | null;

  onChangePreference?: (pref: KioskoChangePreference) => void;

  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  innerBgColor: string;
  isSecondaryLight: boolean;
  safePrimary: string;
  formatPrice: (num: number) => string;
}

type ChangeMethod = 'cash_ves' | 'cash_usd' | 'pago_movil' | 'credit';

export default function KioskoCashPayment({
  totalVes,
  totalUsd,
  exchangeRate,
  currency,
  amount,
  onCurrencyChange,
  onAmountChange,
  onCoversChange,
  userProfileData,
  onChangePreference,
  textColor,
  mutedTextColor,
  borderColor,
  innerBgColor,
  isSecondaryLight,
  safePrimary,
  formatPrice,
}: KioskoCashPaymentProps) {
  // 🔥 Derivar isDarkBg de isSecondaryLight (el kiosko no lo pasa directo)
  const isDarkBg = !isSecondaryLight;

  const totalVesSafe = Number.isFinite(totalVes) && totalVes > 0 ? totalVes : 0;
  const totalUsdSafe =
    Number.isFinite(totalUsd) && totalUsd > 0
      ? totalUsd
      : exchangeRate > 0
        ? totalVesSafe / exchangeRate
        : 0;

  const paidVes =
    currency === 'USD' ? amount * (exchangeRate > 0 ? exchangeRate : 0) : amount;
  const paidUsd =
    currency === 'VES' ? (exchangeRate > 0 ? amount / exchangeRate : 0) : amount;

  const diffVes = paidVes - totalVesSafe;
  const changeVes = diffVes > 0 ? diffVes : 0;
  const missingVes = diffVes < 0 ? Math.abs(diffVes) : 0;

  const hasAmount = amount > 0;
  const covers = !hasAmount || diffVes >= -0.01;
  const isExact = hasAmount && Math.abs(diffVes) < 0.01;
  const hasChange = changeVes > 0.01;
  const hasMissing = missingVes > 0.01;

  const lastCoversRef = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (!onCoversChange) return;
    if (lastCoversRef.current === covers) return;
    lastCoversRef.current = covers;
    onCoversChange(covers);
  }, [covers, onCoversChange]);

  const isAuthenticated = !!userProfileData;
  const canUseCredit = isAuthenticated;

  const [changeMethod, setChangeMethod] = React.useState<ChangeMethod>('cash_ves');
  const [pmBank, setPmBank] = React.useState('');
  const [pmPhone, setPmPhone] = React.useState('');
  const [pmIdType, setPmIdType] = React.useState<'V' | 'E' | 'J' | 'G' | 'P'>('V');
  const [pmIdNumber, setPmIdNumber] = React.useState('');

  React.useEffect(() => {
    if (changeMethod !== 'pago_movil') return;
    if (!userProfileData?.pago_movil_same_as_profile) return;

    setPmPhone(userProfileData.phone || '');
    setPmIdNumber(userProfileData.id_number || '');
    setPmIdType(
      (userProfileData.id_type as 'V' | 'E' | 'J' | 'G' | 'P' | null) || 'V',
    );
  }, [changeMethod, userProfileData]);

  React.useEffect(() => {
    if (!hasChange) return;
    if (!onChangePreference) return;

    if (changeMethod === 'credit') {
      onChangePreference({ method: 'credit' });
    } else if (changeMethod === 'pago_movil') {
      onChangePreference({
        method: 'pago_movil',
        pagoMovilData: {
          bank: pmBank,
          phone: pmPhone,
          clientIdType: pmIdType,
          clientIdNumber: pmIdNumber,
        },
      });
    } else {
      onChangePreference({ method: changeMethod });
    }
  }, [
    hasChange,
    changeMethod,
    pmBank,
    pmPhone,
    pmIdType,
    pmIdNumber,
    onChangePreference,
  ]);

  React.useEffect(() => {
    if (!canUseCredit && changeMethod === 'credit') {
      setChangeMethod('cash_ves');
    }
  }, [canUseCredit, changeMethod]);

  const formatNumberEn = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatMoneyInCurrency = (vesValue: number, usdValue: number) => {
    if (currency === 'VES') return `Bs. ${formatPrice(vesValue)}`;
    return `$${formatNumberEn(usdValue)}`;
  };

  const MAX_AMOUNT = 10000000;
  const handleAmountChange = (raw: string) => {
    let cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1]) cleaned = parts[0] + '.' + parts[1].slice(0, 2);

    const parsed = parseFloat(cleaned);
    let safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    if (safe > MAX_AMOUNT) safe = MAX_AMOUNT;
    onAmountChange(Math.round(safe * 100) / 100);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: innerBgColor,
    borderColor: borderColor,
    color: textColor,
  };

  const labelStyle: React.CSSProperties = {
    color: mutedTextColor,
  };

  const methodOptions: Array<{ value: ChangeMethod; label: string }> = [
    { value: 'cash_ves', label: 'Efectivo Bs.' },
    { value: 'cash_usd', label: 'Efectivo USD' },
    { value: 'pago_movil', label: 'Pago Movil' },
  ];
  if (canUseCredit) {
    methodOptions.push({ value: 'credit', label: 'Saldo a favor' });
  }

  return (
    <div
      className="p-5 rounded-[2rem] border space-y-4"
      style={{
        backgroundColor: innerBgColor,
        borderColor: borderColor,
      }}
    >
      <h4 className="text-sm font-black uppercase tracking-wider" style={{ color: textColor }}>
        Pago en Efectivo
      </h4>

      <div>
        <label
          className="block text-[10px] font-bold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Moneda
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['VES', 'USD'] as const).map((cur) => {
            const active = currency === cur;
            return (
              <button
                key={cur}
                type="button"
                onClick={() => onCurrencyChange(cur)}
                className={`py-3 rounded-2xl text-sm font-bold border transition cursor-pointer ${
                  active ? 'shadow-md' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  borderColor: active ? safePrimary : borderColor,
                  backgroundColor: active ? `${safePrimary}15` : 'transparent',
                  color: active ? safePrimary : textColor,
                }}
              >
                {cur === 'VES' ? 'Bolivares (Bs.)' : 'Dolares (USD)'}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          className="block text-[10px] font-bold uppercase tracking-wider mb-2"
          style={labelStyle}
        >
          Con cuanto pagas?
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={hasAmount ? amount.toString() : ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={currency === 'VES' ? '0,00' : '0.00'}
            className="w-full px-4 py-3 rounded-2xl text-base border outline-none transition-all shadow-inner"
            style={inputStyle}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
            style={{ color: mutedTextColor }}
          >
            {currency === 'VES' ? 'Bs.' : 'USD'}
          </span>
        </div>
      </div>

      <div
        className="p-3 rounded-xl border space-y-1.5"
        style={{
          borderColor: borderColor,
          backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: mutedTextColor }}>Total a pagar</span>
          <span className="font-bold" style={{ color: textColor }}>
            {formatMoneyInCurrency(totalVesSafe, totalUsdSafe)}
            <span className="ml-1 text-[10px] font-semibold" style={{ color: mutedTextColor }}>
              ({currency === 'VES'
                ? `$${formatNumberEn(totalUsdSafe)}`
                : `Bs. ${formatPrice(totalVesSafe)}`})
            </span>
          </span>
        </div>

        {hasAmount && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: mutedTextColor }}>Entregas</span>
            <span className="font-bold" style={{ color: textColor }}>
              {formatMoneyInCurrency(paidVes, paidUsd)}
              <span className="ml-1 text-[10px] font-semibold" style={{ color: mutedTextColor }}>
                ({currency === 'VES'
                  ? `$${formatNumberEn(paidUsd)}`
                  : `Bs. ${formatPrice(paidVes)}`})
              </span>
            </span>
          </div>
        )}

        {hasChange && (
          <div
            className="flex items-center justify-between text-xs pt-1.5 border-t"
            style={{ borderColor: borderColor }}
          >
            <span className="font-bold" style={{ color: '#34d399' }}>
              Vuelto
            </span>
            <span className="font-black" style={{ color: '#34d399' }}>
              {formatMoneyInCurrency(
                changeVes,
                exchangeRate > 0 ? changeVes / exchangeRate : 0,
              )}
              <span className="ml-1 text-[10px] font-semibold" style={{ color: mutedTextColor }}>
                ({currency === 'VES'
                  ? `$${formatNumberEn(
                      exchangeRate > 0 ? changeVes / exchangeRate : 0,
                    )}`
                  : `Bs. ${formatPrice(changeVes)}`})
              </span>
            </span>
          </div>
        )}

        {hasMissing && (
          <>
            <div
              className="flex items-center justify-between text-xs pt-1.5 border-t"
              style={{ borderColor: borderColor }}
            >
              <span className="font-bold text-amber-400">Falta por pagar</span>
              <span className="font-black text-amber-400">
                {formatMoneyInCurrency(
                  missingVes,
                  exchangeRate > 0 ? missingVes / exchangeRate : 0,
                )}
                <span className="ml-1 text-[10px] font-semibold" style={{ color: mutedTextColor }}>
                  ({currency === 'VES'
                    ? `$${formatNumberEn(
                        exchangeRate > 0 ? missingVes / exchangeRate : 0,
                      )}`
                    : `Bs. ${formatPrice(missingVes)}`})
                </span>
              </span>
            </div>
            <p className="text-[10px] text-amber-400 font-medium pt-1">
              El monto entregado no cubre el total. Ajusta el monto para continuar.
            </p>
          </>
        )}

        {isExact && (
          <div
            className="flex items-center justify-between text-xs pt-1.5 border-t"
            style={{ borderColor: borderColor }}
          >
            <span className="font-bold" style={{ color: '#34d399' }}>
              Pago exacto
            </span>
            <span className="font-semibold text-[10px]" style={{ color: mutedTextColor }}>
              Sin vuelto
            </span>
          </div>
        )}

        {!hasAmount && (
          <p className="text-[10px] pt-1" style={{ color: mutedTextColor }}>
            Ingresa el monto que entregaras para ver el vuelto.
          </p>
        )}
      </div>

      {hasChange && (
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{
            borderColor: `${safePrimary}40`,
            backgroundColor: `${safePrimary}08`,
          }}
        >
          <div>
            <h5
              className="text-xs font-black uppercase tracking-wider"
              style={{ color: safePrimary }}
            >
              Como queres el vuelto?
            </h5>
            <p className="text-[10px] mt-0.5" style={{ color: mutedTextColor }}>
              Elegi como queres recibir Bs. {formatPrice(changeVes)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {methodOptions.map((opt) => {
              const active = changeMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChangeMethod(opt.value)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    active ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: active ? safePrimary : borderColor,
                    backgroundColor: active ? `${safePrimary}20` : 'transparent',
                    color: active ? safePrimary : textColor,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {changeMethod === 'credit' && (
            <div
              className="p-3 rounded-xl border text-[11px]"
              style={{
                borderColor: `${safePrimary}30`,
                backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                color: textColor,
              }}
            >
              Se acreditara <b>Bs. {formatPrice(changeVes)}</b> a tu cuenta como saldo a favor
              al confirmar el pedido.
            </div>
          )}

          {changeMethod === 'pago_movil' && (
            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>
                  Banco
                </label>
                <SearchableDropdown
                  value={pmBank}
                  onChange={(val) => setPmBank(val)}
                  options={[
                    { value: '', label: 'Seleccionar banco' },
                    ...BANK_LIST.map((b) => ({
                      value: b.code,
                      label: getBankLabel(b.code),
                    })),
                  ]}
                  placeholder="Seleccionar banco"
                  searchPlaceholder="Buscar banco..."
                  emptyMessage="No hay bancos"
                  primary={safePrimary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={borderColor}
                  searchable={true}
                  footerLabel={(n) => `${n} bancos`}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>
                  Telefono
                </label>
                <input
                  type="tel"
                  value={pmPhone}
                  onChange={(e) => setPmPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                  placeholder="04141234567"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={labelStyle}>
                  Cedula / RIF
                </label>
                <div className="flex gap-2">
                  <select
                    value={pmIdType}
                    onChange={(e) =>
                      setPmIdType(e.target.value as 'V' | 'E' | 'J' | 'G' | 'P')
                    }
                    className="px-2 py-2 rounded-xl text-xs border outline-none w-16"
                    style={inputStyle}
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                    <option value="J">J</option>
                    <option value="G">G</option>
                    <option value="P">P</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pmIdNumber}
                    onChange={(e) => setPmIdNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678"
                    className="flex-1 px-3 py-2 rounded-xl text-xs border outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              {userProfileData?.pago_movil_same_as_profile && (
                <p className="text-[10px]" style={{ color: mutedTextColor }}>
                  Cedula y telefono precargados desde tu perfil. Podes editarlos si queres.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
