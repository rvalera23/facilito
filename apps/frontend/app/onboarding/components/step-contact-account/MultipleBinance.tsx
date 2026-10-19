'use client';

import React, { useState, useEffect } from 'react';

interface BinanceAccount {
  payId: string;
  email: string;
}

interface MultipleBinanceProps {
  list?: BinanceAccount[]; // 🔥 Hacer opcional
  onUpdate: (list: BinanceAccount[]) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isLight: boolean;
  /** 🔥 Color secundario del theme (para fondo de cards). */
  secondary?: string;
}

export default function MultipleBinance({
  list = [], // 🔥 Valor por defecto
  onUpdate,
  textColor,
  primary,
  inputClass,
  isLight,
  secondary
}: MultipleBinanceProps) {
  const [items, setItems] = useState<BinanceAccount[]>(list);

  useEffect(() => {
    setItems(list || []);
  }, [list]);

  const addItem = () => {
    const updated = [...items, { payId: '', email: '' }];
    setItems(updated);
    onUpdate(updated);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      const updated = [{ payId: '', email: '' }];
      setItems(updated);
      onUpdate(updated);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onUpdate(updated);
  };

  const updateItem = (index: number, field: keyof BinanceAccount, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
    onUpdate(updated);
  };

  const bgColor = '';
    return (
    <div 
      className={`${bgColor} p-3.5 rounded-2xl border ${isLight ? 'border-slate-200' : 'border-white/15'} space-y-2 shadow-xs transition-colors duration-500`}
      onFocus={(e) => e.currentTarget.style.borderColor = primary}
      onBlur={(e) => e.currentTarget.style.borderColor = ''}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md border ${isLight ? 'border-slate-200' : 'border-white/15'} flex items-center justify-center flex-shrink-0 ${textColor} ${isLight ? 'bg-slate-100' : 'bg-white/10'} shadow-xs`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2l8 8-8 8-8-8 8-8z" />
              <path d="M12 8l4 4-4 4-4-4 4-4z" />
            </svg>
          </div>
          <span className={`text-xs font-bold ${textColor}`}>Binance Pay (USDT)</span>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 cursor-pointer border"
          style={{ 
            backgroundColor: `${primary}15`,
            color: primary,
            borderColor: `${primary}40`
          }}
        >
          + Agregar cuenta
        </button>
      </div>

      {items.length === 0 ? (
        <div 
          className="p-4 rounded-xl text-center text-xs opacity-60"
          style={{ 
            border: `1px dashed ${primary}40`,
            color: textColor
          }}
        >
          No hay cuentas Binance configuradas.
        </div>
      ) : (
        items.map((item, index) => (
          <div 
            key={index}
            className={`p-3.5 ${bgColor} rounded-xl border ${isLight ? 'border-slate-200' : 'border-white/10'} space-y-2.5 relative shadow-xs transition-colors duration-500`}
          >
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
              >
                ✕ Eliminar
              </button>
            )}

            <span className={`text-[11px] font-bold opacity-60 block`} style={{ color: textColor }}>
              Cuenta #{index + 1}
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label className={`block text-[10px] font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'} mb-1 transition-colors duration-500`}>
                  Pay ID *
                </label>
                <input
                  type="text"
                  placeholder="Ej. 123456789"
                  value={item.payId || ''}
                  onChange={(e) => updateItem(index, 'payId', e.target.value)}
                  className={`w-full ${inputClass}`}
                  style={{ color: textColor }}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'} mb-1 transition-colors duration-500`}>
                  Correo Asociado *
                </label>
                <input
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={item.email || ''}
                  onChange={(e) => updateItem(index, 'email', e.target.value)}
                  className={`w-full ${inputClass}`}
                  style={{ color: textColor }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}