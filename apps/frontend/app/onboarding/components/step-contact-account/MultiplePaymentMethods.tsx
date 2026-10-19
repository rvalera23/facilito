'use client';

import React, { useState, useEffect } from 'react';

interface MultiplePaymentMethodsProps {
  list: string[];
  onUpdate: (list: string[]) => void;
  textColor: string;
  primary: string;
  isLight: boolean;
  /** 🔥 Color secundario del theme (para fondo de cards). */
  secondary?: string;
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
];

export default function MultiplePaymentMethods({
  list,
  onUpdate,
  textColor,
  primary,
  isLight,
  secondary
}: MultiplePaymentMethodsProps) {
  const [items, setItems] = useState<string[]>(list);

  useEffect(() => {
    setItems(list);
  }, [list]);

  const toggleMethod = (methodId: string) => {
    let updated: string[];
    if (items.includes(methodId)) {
      updated = items.filter((id) => id !== methodId);
    } else {
      updated = [...items, methodId];
    }
    setItems(updated);
    onUpdate(updated);
  };

  // 🔥 Fondo transparente con borde sutil (como los inputs de Nombre/WhatsApp).
  // NO usar `secondary` ni `bg-white/5` que se ve gris azulado.
  // 🔥 SIN fondo. Solo borde. Como los inputs de Nombre/WhatsApp.
  const bgColor = '';
  return (
    <div
      className={`${bgColor} p-3.5 rounded-2xl border ${isLight ? 'border-slate-200' : 'border-white/15'} space-y-2 shadow-xs transition-colors duration-500`}
    >
            <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-md border ${isLight ? 'border-slate-200' : 'border-white/15'} flex items-center justify-center flex-shrink-0 ${textColor} ${isLight ? 'bg-slate-100' : 'bg-white/10'} shadow-xs`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className={`text-xs font-bold ${textColor}`}>Metodos de Pago Disponibles</span>
      </div>

      <p className={`text-[11px] opacity-60`} style={{ color: textColor }}>
        Selecciona los metodos de pago que deseas habilitar en tu tienda.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {AVAILABLE_METHODS.map((method) => {
          const isSelected = items.includes(method.id);

          return (
            <div
              key={method.id}
              onClick={() => toggleMethod(method.id)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 select-none ${
                isSelected
                  ? 'shadow-sm'
                  : 'opacity-60 hover:opacity-90'
              }`}
              style={{
                backgroundColor: isSelected ? `${primary}15` : 'transparent',
                borderColor: isSelected ? primary : (isLight ? 'rgba(226,232,240,1)' : 'rgba(255,255,255,0.15)'),
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ 
                  color: isSelected ? primary : textColor,
                  backgroundColor: isSelected
                    ? `${primary}20`
                    : (isLight ? 'rgba(226, 232, 240, 0.5)' : 'rgba(255, 255, 255, 0.05)')
                }}
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
                      isSelected ? 'border-transparent' : (isLight ? 'border-slate-300' : 'border-white/30')
                    }`}
                    style={{ backgroundColor: isSelected ? primary : 'transparent' }}
                  >
                    {isSelected && <span className="text-[10px] text-white font-bold">✓</span>}
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