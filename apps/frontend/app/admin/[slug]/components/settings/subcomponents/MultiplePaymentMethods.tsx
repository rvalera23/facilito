'use client';

import React from 'react';

interface MultiplePaymentMethodsProps {
  specificConfig: any;
  onChangeConfig: (newConfig: any) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isDarkBg?: boolean;
}

const AVAILABLE_METHODS = [
  {
    id: 'cash',
    label: 'Efectivo',
    description: 'Pago en físico al recibir o retirar',
    svgIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    )
  },
  {
    id: 'pos',
    label: 'Punto de Venta',
    description: 'Tarjetas de débito o crédito locales',
    svgIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M8 6h8M8 10h8M8 14h4" />
      </svg>
    )
  },
  {
    id: 'pago_movil',
    label: 'Pago Móvil',
    description: 'Transferencias bancarias inmediatas',
    svgIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect width="14" height="20" x="5" y="2" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    )
  },
  {
    id: 'biopago',
    label: 'Biopago',
    description: 'Sistema biométrico de pago',
    svgIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 11c0 3.5-2.5 6-5 6s-5-2.5-5-6a5 5 0 0 1 10 0z" />
        <path d="M12 11c0 3.5 2.5 6 5 6s5-2.5 5-6a5 5 0 0 0-10 0z" />
        <path d="M12 2v3M12 19v3" />
      </svg>
    )
  },
  {
    id: 'zelle',
    label: 'Zelle',
    description: 'Pagos internacionales en USD',
    svgIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10zM2 12h20" />
      </svg>
    )
  },
  {
    id: 'binance',
    label: 'Binance Pay',
    description: 'Criptomonedas y USDT',
    svgIcon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 2l8 8-8 8-8-8 8-8z" />
        <path d="M12 8l4 4-4 4-4-4 4-4z" />
      </svg>
    )
  },
];

export default function MultiplePaymentMethods({
  specificConfig,
  onChangeConfig,
  textColor,
  primary,
  inputClass,
  isDarkBg = false
}: MultiplePaymentMethodsProps) {

  const activeMethods: string[] = specificConfig?.activePaymentMethods || ['pago_movil', 'cash'];
  const bgColor = isDarkBg ? 'bg-white/5' : 'bg-black/5';

  const handleToggleMethod = (methodId: string) => {
    let updated: string[];
    if (activeMethods.includes(methodId)) {
      updated = activeMethods.filter((id) => id !== methodId);
    } else {
      updated = [...activeMethods, methodId];
    }

    onChangeConfig({
      ...specificConfig,
      activePaymentMethods: updated,
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-black/10 dark:border-white/10">
      {/* TÍTULO */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Métodos de Pago Disponibles
        </h4>
        <p className="text-[11px] opacity-65 mt-0.5" style={{ color: textColor }}>
          Selecciona cuáles métodos de pago deseas habilitar y mostrar en tu tienda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_METHODS.map((method) => {
          const isSelected = activeMethods.includes(method.id);

          return (
            <div
              key={method.id}
              onClick={() => handleToggleMethod(method.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 select-none ${
                isSelected
                  ? `shadow-sm ${bgColor}`
                  : 'bg-black/[0.02] dark:bg-white/[0.02] opacity-60 hover:opacity-90'
              }`}
              style={{
                borderColor: isSelected ? primary : 'rgba(0,0,0,0.1)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0"
                style={{ color: isSelected ? primary : textColor }}
              >
                {method.svgIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate" style={{ color: textColor }}>
                    {method.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition shrink-0 ${
                      isSelected ? 'border-transparent' : 'border-black/30 dark:border-white/30'
                    }`}
                    style={{ backgroundColor: isSelected ? primary : 'transparent' }}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-[10px] opacity-70 mt-0.5 truncate" style={{ color: textColor }}>
                  {method.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}