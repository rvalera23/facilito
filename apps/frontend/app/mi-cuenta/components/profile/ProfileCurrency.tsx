'use client';

import React from 'react';

const CURRENCIES = [
  { value: 'USD', label: 'Dólares ($)' },
  { value: 'VES', label: 'Bolívares (Bs.)' },
  { value: 'EUR', label: 'Euros (€)' },
  { value: 'CRYPTO', label: 'Criptomonedas' },
];

interface ProfileCurrencyProps {
  preferredCurrency: string;
  primary: string;
  textColor: string;
  onUpdate: (currency: string) => void;
}

export default function ProfileCurrency({
  preferredCurrency,
  primary,
  textColor,
  onUpdate,
}: ProfileCurrencyProps) {
  return (
    <div className="pt-2">
      <label className="block text-xs font-semibold mb-1.5 opacity-80" style={{ color: textColor }}>
        Moneda Preferida de Pago *
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CURRENCIES.map((cur) => {
          const isSelected = preferredCurrency === cur.value;
          return (
            <button
              key={cur.value}
              type="button"
              onClick={() => onUpdate(cur.value)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                isSelected
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-transparent border-black/10 dark:border-white/15 text-white/60 hover:bg-white/5'
              }`}
              style={isSelected ? { backgroundColor: primary, borderColor: primary } : {}}
            >
              {cur.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}