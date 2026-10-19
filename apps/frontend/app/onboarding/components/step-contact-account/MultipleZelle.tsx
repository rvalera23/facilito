'use client';

import React, { useState, useEffect } from 'react';

interface ZelleAccount {
  emailOrPhone: string;
  holderName: string;
}

interface MultipleZelleProps {
  list: ZelleAccount[];
  onUpdate: (list: ZelleAccount[]) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isLight: boolean;
  /** 🔥 Color secundario del theme (para fondo de cards). */
  secondary?: string;
}

export default function MultipleZelle({
  list,
  onUpdate,
  textColor,
  primary,
  inputClass,
  isLight,
  secondary
}: MultipleZelleProps) {
  const [items, setItems] = useState<ZelleAccount[]>(list);

  useEffect(() => {
    setItems(list);
  }, [list]);

  const addItem = () => {
    const updated = [...items, { emailOrPhone: '', holderName: '' }];
    setItems(updated);
    onUpdate(updated);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      const updated = [{ emailOrPhone: '', holderName: '' }];
      setItems(updated);
      onUpdate(updated);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onUpdate(updated);
  };

  const updateItem = (index: number, field: keyof ZelleAccount, value: string) => {
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className={`text-xs font-bold ${textColor}`}>Zelle (USD)</span>
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

      {items.map((item, index) => (
        <div 
          key={index}
          className={`p-3 rounded-xl border ${isLight ? 'border-slate-200' : 'border-white/10'} space-y-2 relative ${bgColor}`}
        >
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
            >
              ✕ Eliminar
            </button>
          )}

          <span className={`text-[11px] font-bold opacity-60 block`} style={{ color: textColor }}>
            Cuenta #{index + 1}
          </span>

          <input
            type="text"
            placeholder="Correo o Telefono Zelle"
            value={item.emailOrPhone}
            onChange={(e) => updateItem(index, 'emailOrPhone', e.target.value)}
            className={`w-full ${inputClass}`}
            style={{ color: textColor }}
          />
          <input
            type="text"
            placeholder="Titular de la cuenta"
            value={item.holderName}
            onChange={(e) => updateItem(index, 'holderName', e.target.value)}
            className={`w-full ${inputClass}`}
            style={{ color: textColor }}
          />
        </div>
      ))}
    </div>
  );
}