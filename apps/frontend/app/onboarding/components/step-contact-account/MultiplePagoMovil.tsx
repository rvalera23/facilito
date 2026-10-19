'use client';

import React, { useState, useEffect } from 'react';
import { PHONE_OPERATORS, ID_TYPES } from './paymentConstants';
import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface MultiplePagoMovilProps {
  pagoMovilList: Array<{ 
    bank: string; 
    operator: string; 
    phone: string; 
    idType: string; 
    idNumber: string;
    phoneNumber?: string;
  }>;
  onUpdate: (list: Array<{ 
    bank: string; 
    operator: string; 
    phone: string; 
    idType: string; 
    idNumber: string;
    phoneNumber?: string;
  }>) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isLight: boolean;
  /** 🔥 Color secundario del theme (para fondo de cards). */
  secondary?: string;
}

export default function MultiplePagoMovil({
  pagoMovilList,
  onUpdate,
  textColor,
  primary,
  inputClass,
  isLight,
  secondary
}: MultiplePagoMovilProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  const VALID_OPERATORS = ['0414', '0416', '0424', '0412', '0410', '0426', '0418'];

  const extractOperatorAndPhone = (fullNumber: string): { operator: string; phone: string } => {
    if (!fullNumber) {
      return { operator: '0414', phone: '' };
    }
    let clean = fullNumber.replace(/^\+?58/, '').replace(/[\s\-()]/g, '');
    for (const op of VALID_OPERATORS) {
      if (clean.startsWith(op)) {
        const phone = clean.replace(op, '').slice(0, 7);
        return { operator: op, phone: phone };
      }
    }
    return { operator: '0414', phone: clean.slice(-7) };
  };

  const fixOperator = (pm: any) => {
    let operator = pm.operator || '0414';
    let phone = pm.phone || '';
    let phoneNumber = pm.phoneNumber || '';

    if (!VALID_OPERATORS.includes(operator)) {
      if (phoneNumber && phoneNumber.length > 0) {
        const extracted = extractOperatorAndPhone(phoneNumber);
        if (VALID_OPERATORS.includes(extracted.operator)) {
          operator = extracted.operator;
          phone = extracted.phone;
        }
      } else if (phone && phone.length >= 7) {
        const fullNumber = phone.length > 7 ? phone : `${operator}${phone}`;
        const extracted = extractOperatorAndPhone(fullNumber);
        if (VALID_OPERATORS.includes(extracted.operator)) {
          operator = extracted.operator;
          phone = extracted.phone;
        }
      }
      if (!VALID_OPERATORS.includes(operator)) {
        operator = '0414';
      }
    }

    return { operator, phone, phoneNumber: `${operator}${phone}` };
  };

  const processItem = (pm: any) => {
    if (pm.phoneNumber && pm.phoneNumber.length > 0) {
      const { operator, phone } = extractOperatorAndPhone(pm.phoneNumber);
      return {
        bank: pm.bankCode || pm.bank || '0102',
        operator: operator,
        phone: phone,
        idType: pm.idType || 'V',
        idNumber: pm.idNumber || '',
        phoneNumber: pm.phoneNumber
      };
    }
    
    const fixed = fixOperator(pm);
    
    return {
      bank: pm.bank || '0102',
      operator: fixed.operator,
      phone: fixed.phone,
      idType: pm.idType || 'V',
      idNumber: pm.idNumber || '',
      phoneNumber: fixed.phoneNumber
    };
  };

  const [list, setList] = useState(() => {
    if (pagoMovilList?.length) {
      return pagoMovilList.map((pm: any) => processItem(pm));
    }
    return [{ bank: '0102', operator: '0414', phone: '', idType: 'V', idNumber: '', phoneNumber: '' }];
  });

  useEffect(() => {
    if (pagoMovilList?.length) {
      const cleanedList = pagoMovilList.map((pm: any) => processItem(pm));
      setList(cleanedList);
    } else {
      setList([{ bank: '0102', operator: '0414', phone: '', idType: 'V', idNumber: '', phoneNumber: '' }]);
    }
  }, [pagoMovilList]);

  const addPagoMovil = () => {
    const newItem = { 
      bank: '0102', 
      operator: '0414', 
      phone: '', 
      idType: 'V', 
      idNumber: '',
      phoneNumber: ''
    };
    const updatedList = [...list, newItem];
    setList(updatedList);
    onUpdate(updatedList);
  };

  const removePagoMovil = (index: number) => {
    if (list.length <= 1) {
      const defaultItem = { 
        bank: '0102', 
        operator: '0414', 
        phone: '', 
        idType: 'V', 
        idNumber: '',
        phoneNumber: ''
      };
      setList([defaultItem]);
      onUpdate([defaultItem]);
      return;
    }
    const updatedList = list.filter((_, i) => i !== index);
    setList(updatedList);
    onUpdate(updatedList);
  };

  const updatePagoMovilItem = (index: number, field: string, value: string) => {
    const updatedList = [...list];
    
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 7);
    }
    if (field === 'operator') {
      value = value.replace(/^\+?58/, '');
    }
    
    const current = updatedList[index];
    updatedList[index] = { ...current, [field]: value };
    
    const updated = updatedList[index];
    updatedList[index] = {
      ...updated,
      phoneNumber: `${updated.operator}${updated.phone}`
    };
    
    setList(updatedList);
    onUpdate(updatedList);
  };

  // 🔥 Fondo transparente con borde sutil (como los inputs de Nombre/WhatsApp).
  // NO usar `secondary` ni `bg-white/5` que se ve gris azulado.
  // 🔥 SIN fondo. Solo borde.
  const bgColor = '';
  const inputClassWithoutFull = inputClass.replace(/w-full/g, '').trim();

  return (
    <div
      className={`${bgColor} p-3.5 rounded-2xl border ${isLight ? 'border-slate-200' : 'border-white/15'} space-y-2 shadow-xs transition-colors duration-500`}
    >
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md border ${isLight ? 'border-slate-200' : 'border-white/15'} flex items-center justify-center flex-shrink-0 ${textColor} ${isLight ? 'bg-slate-100' : 'bg-white/10'} shadow-xs`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect width="20" height="14" x="2" y="5" rx="2"/>
              <line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
          </div>
          <span className={`text-xs font-bold ${textColor}`}>Cuentas de Pago Móvil (VES)</span>
        </div>
        <button
          type="button"
          onClick={addPagoMovil}
          className="font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 cursor-pointer border whitespace-nowrap"
          style={{ 
            backgroundColor: `${primary}15`,
            color: primary,
            borderColor: `${primary}40`
          }}
        >
          + Agregar cuenta
        </button>
      </div>

      {list.map((pm, index) => (
        <div 
          key={index} 
          className={`p-3.5 ${bgColor} rounded-xl border ${isLight ? 'border-slate-200' : 'border-white/10'} space-y-2.5 relative shadow-xs transition-colors duration-500`}
          onFocus={(e) => e.currentTarget.style.borderColor = primary}
          onBlur={(e) => e.currentTarget.style.borderColor = ''}
        >
          {list.length > 1 && (
            <button
              type="button"
              onClick={() => removePagoMovil(index)}
              className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
            >
              ✕ Eliminar
            </button>
          )}

          <span className={`text-[11px] font-bold opacity-60 block transition-colors duration-500`} style={{ color: textColor }}>
            Cuenta #{index + 1}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className={`block text-[10px] font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'} mb-1 transition-colors duration-500`}>
                Banco Destino *
              </label>
              <SearchableDropdown
                value={pm.bank}
                onChange={(val) => updatePagoMovilItem(index, 'bank', val)}
                options={BANK_LIST.map((bank) => ({
                  value: bank.code,
                  label: getBankLabel(bank.code),
                }))}
                placeholder="Banco"
                searchPlaceholder="Buscar banco..."
                emptyMessage="No hay bancos"
                primary={primary}
                textColor={isLight ? '#0f172a' : '#ffffff'}
                    secondary={undefined}
                                    isDarkBg={!isLight}
                borderColor={isLight ? 'rgba(203,213,225,0.8)' : 'rgba(255,255,255,0.15)'}
                searchable={true}
                footerLabel={(n) => `${n} bancos`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'} mb-1 transition-colors duration-500`}>
                Teléfono Afiliado (7 dígitos) *
              </label>
              <div className="flex gap-1.5 items-center">
                <div className="w-[80px] flex-shrink-0">
                  <SearchableDropdown
                    value={pm.operator || '0414'}
                    onChange={(val) => updatePagoMovilItem(index, 'operator', val)}
                    options={PHONE_OPERATORS.map((op) => ({
                      value: op.code,
                      label: op.code,
                    }))}
                    placeholder="0414"
                    primary={primary}
                    textColor={isLight ? '#0f172a' : '#ffffff'}
                secondary={undefined}
                                    isDarkBg={!isLight}
                    borderColor={isLight ? 'rgba(203,213,225,0.8)' : 'rgba(255,255,255,0.15)'}
                    searchable={false}
                  />
                </div>
                
                <input
                  type="text"
                  maxLength={7}
                  placeholder="1234567"
                  value={pm.phone || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                    updatePagoMovilItem(index, 'phone', val);
                  }}
                  className={`${inputClassWithoutFull} flex-1 min-w-[120px] text-sm border ${isLight ? 'border-slate-300' : 'border-white/15'} rounded-xl px-3 py-2.5 outline-none focus:border-black/30 dark:focus:border-white/40 transition`}
                  style={{ color: textColor, backgroundColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)' }}
                />
              </div>
              <div className="text-[10px] opacity-50 mt-1 text-center" style={{ color: textColor }}>
                Formato: {pm.operator || '0414'}{pm.phone || '1234567'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className={`block text-[10px] font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'} mb-1 transition-colors duration-500`}>
                Tipo de Identidad *
              </label>
              <SearchableDropdown
                value={pm.idType}
                onChange={(newIdType) => {
                  if (newIdType === 'J') {
                    const currentNumber = pm.idNumber.replace(/[^0-9]/g, '');
                    updatePagoMovilItem(index, 'idType', newIdType);
                    if (currentNumber) {
                      updatePagoMovilItem(index, 'idNumber', `J${currentNumber}`);
                    } else {
                      updatePagoMovilItem(index, 'idNumber', 'J');
                    }
                  } else {
                    const currentNumber = pm.idNumber.replace(/[^0-9]/g, '');
                    updatePagoMovilItem(index, 'idType', newIdType);
                    updatePagoMovilItem(index, 'idNumber', currentNumber);
                  }
                }}
                options={ID_TYPES.map((idType) => ({
                  value: idType.code,
                  label: idType.label,
                }))}
                placeholder="Tipo"
                primary={primary}
                textColor={isLight ? '#0f172a' : '#ffffff'}
                    secondary={undefined}
                                    isDarkBg={!isLight}
                borderColor={isLight ? 'rgba(203,213,225,0.8)' : 'rgba(255,255,255,0.15)'}
                searchable={false}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-semibold ${isLight ? 'text-slate-700' : 'text-white/70'} mb-1 transition-colors duration-500`}>
                Número de Cédula o RIF *
              </label>
              <input
                type="text"
                placeholder={pm.idType === 'J' ? 'J-123456789' : 'Ej. 18.714.459'}
                value={pm.idNumber || ''}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  if (pm.idType === 'J') {
                    const cleaned = rawValue.replace(/[^0-9J]/gi, '');
                    let finalValue = cleaned;
                    if (cleaned.toLowerCase().includes('j')) {
                      const numbers = cleaned.replace(/[^0-9]/g, '');
                      finalValue = `J${numbers}`;
                    } else {
                      const numbers = cleaned.replace(/[^0-9]/g, '');
                      finalValue = numbers ? `J${numbers}` : 'J';
                    }
                    updatePagoMovilItem(index, 'idNumber', finalValue);
                    return;
                  }
                  const digits = rawValue.replace(/[^0-9]/g, '').slice(0, 10);
                  updatePagoMovilItem(index, 'idNumber', digits);
                }}
                className={`w-full ${inputClass}`}
                style={{ color: textColor }}
                required
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}