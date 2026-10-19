'use client';

import React, { useState, useEffect } from 'react';

interface ZelleAccount {
  emailOrPhone: string;
  holderName: string;
}

interface MultipleZelleProps {
  zelleList: ZelleAccount[];
  onUpdate: (list: ZelleAccount[]) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isDarkBg?: boolean;
}

export default function MultipleZelle({
  zelleList,
  onUpdate,
  textColor,
  primary,
  inputClass,
  isDarkBg = false
}: MultipleZelleProps) {
  const [list, setList] = useState<ZelleAccount[]>(zelleList);

  useEffect(() => {
    setList(zelleList);
  }, [zelleList]);

  const addZelle = () => {
    const updatedList = [
      ...list,
      { emailOrPhone: '', holderName: '' }
    ];
    setList(updatedList);
    onUpdate(updatedList);
  };

  const removeZelle = (index: number) => {
    if (list.length <= 1) {
      const updatedList = [{ emailOrPhone: '', holderName: '' }];
      setList(updatedList);
      onUpdate(updatedList);
      return;
    }
    const updatedList = list.filter((_, i) => i !== index);
    setList(updatedList);
    onUpdate(updatedList);
  };

  const updateZelleItem = (index: number, field: keyof ZelleAccount, value: string) => {
    const updatedList = [...list];
    updatedList[index] = { ...updatedList[index], [field]: value };
    setList(updatedList);
    onUpdate(updatedList);
  };

  const bgColor = isDarkBg ? 'bg-white/5' : 'bg-black/5';

  return (
    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Cuentas Zelle (USD)
        </h4>
        <button
          type="button"
          onClick={addZelle}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-80 whitespace-nowrap"
          style={{ 
            backgroundColor: `${primary}20`,
            color: primary,
            border: `1px solid ${primary}40`
          }}
        >
          + Agregar cuenta
        </button>
      </div>

      {list.length === 0 ? (
        <div 
          className="p-4 rounded-xl text-center text-xs opacity-60"
          style={{ 
            border: `1px dashed ${primary}40`,
            backgroundColor: bgColor,
            color: textColor
          }}
        >
          No hay cuentas Zelle configuradas.
        </div>
      ) : (
        list.map((item, index) => (
          <div 
            key={index}
            className="p-4 rounded-xl border space-y-3"
            style={{ 
              borderColor: `${primary}30`,
              backgroundColor: bgColor,
              color: textColor
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold opacity-60" style={{ color: textColor }}>
                  Cuenta #{index + 1}
                </span>
                {(!item.emailOrPhone || !item.holderName) && (
                  <span className="text-[10px] font-semibold" style={{ color: primary }}>
                    (Completa los datos)
                  </span>
                )}
              </div>
              {list.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeZelle(index)}
                  className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
                >
                  ✕ Eliminar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
                  Correo o Teléfono Zelle *
                </label>
                <input
                  type="text"
                  value={item.emailOrPhone || ''}
                  onChange={(e) => updateZelleItem(index, 'emailOrPhone', e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className={inputClass}
                  style={{ color: textColor }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
                  Titular de la cuenta *
                </label>
                <input
                  type="text"
                  value={item.holderName || ''}
                  onChange={(e) => updateZelleItem(index, 'holderName', e.target.value)}
                  placeholder="Nombre del titular"
                  className={inputClass}
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