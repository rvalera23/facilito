'use client';

import React, { useState, useEffect } from 'react';
import { PHONE_OPERATORS, ID_TYPES } from '@/app/onboarding/components/step-contact-account/paymentConstants';
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
  isDarkBg?: boolean;
}

export default function MultiplePagoMovil({
  pagoMovilList,
  onUpdate,
  textColor,
  primary,
  inputClass,
  isDarkBg = false
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

  const bgColor = isDarkBg ? 'bg-white/5' : 'bg-black/5';
  const inputClassWithoutFull = inputClass.replace(/w-full/g, '').trim();

  return (
    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Cuentas de Pago Móvil (VES)
        </h4>
        <button
          type="button"
          onClick={addPagoMovil}
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
          No hay cuentas de Pago Móvil configuradas.
        </div>
      ) : (
        list.map((pm, index) => {
          return (
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
                  {(!pm.phone || !pm.idNumber) && (
                    <span className="text-[10px] font-semibold" style={{ color: primary }}>
                      (Completa los datos)
                    </span>
                  )}
                </div>
                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePagoMovil(index)}
                    className="text-rose-500 hover:text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition"
                  >
                    ✕ Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
                    Banco *
                  </label>
                  <SearchableDropdown
                    value={pm.bank || '0102'}
                    onChange={(val) => updatePagoMovilItem(index, 'bank', val)}
                    options={BANK_LIST.map((bank) => ({
                      value: bank.code,
                      label: getBankLabel(bank.code),
                    }))}
                    placeholder="Banco"
                    searchPlaceholder="Buscar banco..."
                    emptyMessage="No hay bancos"
                    primary={primary}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                    searchable={true}
                    footerLabel={(n) => `${n} bancos`}
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
                    Teléfono Afiliado (7 dígitos) *
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <div className="w-[100px] flex-shrink-0">
                      <SearchableDropdown
                        value={pm.operator || '0414'}
                        onChange={(val) => updatePagoMovilItem(index, 'operator', val)}
                        options={PHONE_OPERATORS.map((op) => ({
                          value: op.code,
                          label: op.code,
                        }))}
                        placeholder="0414"
                        primary={primary}
                        textColor={textColor}
                        isDarkBg={isDarkBg}
                        searchable={false}
                      />
                    </div>
                    
                    <input
                      type="text"
                      value={pm.phone || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                        updatePagoMovilItem(index, 'phone', val);
                      }}
                      placeholder="1234567"
                      className={`${inputClassWithoutFull} flex-1 min-w-[120px] text-sm border border-black/10 dark:border-white/15 rounded-xl px-3 py-2.5 outline-none focus:border-black/30 dark:focus:border-white/40 transition`}
                      style={{ color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                    />
                  </div>
                  <div className="text-[10px] opacity-50 mt-1 text-center" style={{ color: textColor }}>
                    Formato: {pm.operator || '0414'}{pm.phone || '1234567'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
                    Tipo de Documento *
                  </label>
                  <SearchableDropdown
                    value={pm.idType || 'V'}
                    onChange={(val) => updatePagoMovilItem(index, 'idType', val)}
                    options={ID_TYPES.map((idType) => ({
                      value: idType.code,
                      label: idType.label,
                    }))}
                    placeholder="Tipo"
                    primary={primary}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                    searchable={false}
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
                    Número de Cédula / RIF *
                  </label>
                  <input
                    type="text"
                    value={pm.idNumber || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      updatePagoMovilItem(index, 'idNumber', val);
                    }}
                     placeholder="Ej. 18714469"
                    className={inputClass}
                    style={{
                      color: textColor,
                      backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}