// ==========================================
// ARCHIVO: app/onboarding/components/step-contact-account/PaymentMethods.tsx
// ==========================================
'use client';

import React, { useState, useEffect } from 'react';
import { PHONE_OPERATORS, ID_TYPES } from './paymentConstants';
import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface PaymentMethodsProps {
  hasBolivares: boolean;
  hasDolares: boolean;
  pagoMovilList: Array<{ bank: string; operator: string; phone: string; idType: string; idNumber: string }>;
  zelle: { emailOrPhone: string; holderName: string };
  paypal: { emailOrLink: string; holderName: string };
  addPagoMovil: () => void;
  removePagoMovil: (index: number) => void;
  updatePagoMovilItem: (index: number, field: string, value: string) => void;
  updateZelleConfig: (subfield: string, value: string) => void;
  updatePaypalConfig: (subfield: string, value: string) => void;
}

export default function PaymentMethods({
  hasBolivares,
  hasDolares,
  pagoMovilList,
  zelle,
  paypal,
  addPagoMovil,
  removePagoMovil,
  updatePagoMovilItem,
  updateZelleConfig,
  updatePaypalConfig,
}: PaymentMethodsProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  const [isLight, setIsLight] = useState<boolean>(false);
  // Lógica para detectar el brillo del fondo y adaptar colores dinámicamente de forma idéntica
  useEffect(() => {
    const checkBackgroundBrightness = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setIsLight(brightness > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-white/60';
  const labelColor = isLight ? 'text-slate-800' : 'text-white/80';
  const borderInput = isLight ? 'border-slate-300' : 'border-white/15';
  
  // Fondo de input explícito adaptado para evitar grises no deseados en modo oscuro
  const bgInput = isLight ? 'bg-slate-50 text-slate-900' : 'bg-transparent text-white';
  
  const subCardBg = isLight ? 'bg-white' : 'bg-white/5 backdrop-blur-md';

  return (
    <div className={`space-y-4 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-white/10'} transition-colors duration-500 ${textColor}`}>
      <div>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
          Métodos de Cobro del Negocio <span className="text-[10px] font-normal" style={{ color: 'var(--accent-color, #f97316)' }}>(Sincronizado con el Paso 1)</span>
        </label>
        <p className={`text-[11px] ${mutedTextColor} transition-colors duration-500`}>Configura los datos de cobro habilitados para los métodos de pago de tu tienda.</p>
      </div>

      {hasBolivares && (
        <div 
          className="border rounded-2xl p-3.5 flex items-start gap-2.5 transition-colors duration-500"
          style={{ 
            backgroundColor: isLight ? 'var(--accent-color, #f97316)10' : 'var(--accent-color, #f97316)15',
            borderColor: 'var(--accent-color, #f97316)30',
            color: isLight ? '#1e293b' : '#f1f5f9'
          }}
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-color, #f97316)' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div className="text-xs leading-relaxed">
            <strong className="block font-bold" style={{ color: 'var(--accent-color, #f97316)' }}>Aviso Legal / Comercial (BCV):</strong>
            Todos los precios de tu tienda web y quiosco se calcularán y mantendrán anclados de forma automática a la tasa oficial del <span className="font-semibold">Banco Central de Venezuela (BCV)</span>.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {hasBolivares && (
          <div className={`${subCardBg} p-4 rounded-2xl border ${borderInput} space-y-3 shadow-xs transition-colors duration-500`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold ${textColor} flex items-center gap-1.5 transition-colors duration-500`}>
                <svg className={`w-4 h-4 ${mutedTextColor}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
                Cuentas de Pago Móvil (VES)
              </span>

              <button
                type="button"
                onClick={addPagoMovil}
                className="font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 cursor-pointer border"
                style={{ 
                  backgroundColor: isLight ? 'var(--accent-color, #f97316)15' : 'var(--accent-color, #f97316)20',
                  color: 'var(--accent-color, #f97316)',
                  borderColor: 'var(--accent-color, #f97316)40'
                }}
              >
                + Añadir otro Pago Móvil
              </button>
            </div>

            {pagoMovilList?.map((pm: any, index: number) => (
              <div 
                key={index} 
                className={`p-3.5 ${subCardBg} rounded-xl border ${borderInput} space-y-2.5 relative shadow-xs transition-colors duration-500`}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color, #f97316)'}
                onBlur={(e) => e.currentTarget.style.borderColor = ''}
              >
                {pagoMovilList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePagoMovil(index)}
                    className="absolute top-2.5 right-2.5 text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 transition cursor-pointer"
                  >
                    ✕ Eliminar
                  </button>
                )}

                <span className={`text-[11px] font-bold ${mutedTextColor} block transition-colors duration-500`}>Cuenta #{index + 1}</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[10px] font-semibold ${labelColor} mb-1 transition-colors duration-500`}>Banco Destino *</label>
                    <SearchableDropdown
                      value={pm.bank}
                      onChange={(val) => updatePagoMovilItem(index, 'bank', val)}
                      options={(BANK_LIST || []).map((bank: any) => ({
                        value: bank.code,
                        label: getBankLabel(bank.code),
                      }))}
                      placeholder="Banco"
                      searchPlaceholder="Buscar banco..."
                      emptyMessage="No hay bancos"
                      primary="var(--accent-color, #f97316)"
                      textColor={isLight ? '#0f172a' : '#ffffff'}
                      isDarkBg={!isLight}
                      borderColor={isLight ? 'rgba(203,213,225,0.8)' : 'rgba(255,255,255,0.15)'}
                      searchable={true}
                      footerLabel={(n) => `${n} bancos`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-semibold ${labelColor} mb-1 transition-colors duration-500`}>Teléfono Móvil (7 dígitos) *</label>
                    <div className="flex gap-1.5">
                      <div className="w-[90px] flex-shrink-0">
                        <SearchableDropdown
                          value={pm.operator}
                          onChange={(val) => updatePagoMovilItem(index, 'operator', val)}
                          options={(PHONE_OPERATORS || []).map((op: any) => ({
                            value: op.code,
                            label: op.code,
                          }))}
                          placeholder="0414"
                          primary="var(--accent-color, #f97316)"
                          textColor={isLight ? '#0f172a' : '#ffffff'}
                          isDarkBg={!isLight}
                          borderColor={isLight ? 'rgba(203,213,225,0.8)' : 'rgba(255,255,255,0.15)'}
                          searchable={false}
                        />
                      </div>
                      <input
                        type="text"
                        maxLength={7}
                        placeholder="1234567"
                        value={pm.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                          updatePagoMovilItem(index, 'phone', val);
                        }}
                        className={`w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} font-medium tracking-wider shadow-xs transition-colors duration-500 placeholder:text-slate-400`}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
                        onBlur={(e) => e.target.style.borderColor = ''}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[10px] font-semibold ${labelColor} mb-1 transition-colors duration-500`}>Tipo de Identidad *</label>
                    <SearchableDropdown
                      value={pm.idType}
                      onChange={(val) => updatePagoMovilItem(index, 'idType', val)}
                      options={(ID_TYPES || []).map((idType: any) => ({
                        value: idType.code,
                        label: idType.label,
                      }))}
                      placeholder="Tipo"
                      primary="var(--accent-color, #f97316)"
                      textColor={isLight ? '#0f172a' : '#ffffff'}
                      isDarkBg={!isLight}
                      borderColor={isLight ? 'rgba(203,213,225,0.8)' : 'rgba(255,255,255,0.15)'}
                      searchable={false}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-semibold ${labelColor} mb-1 transition-colors duration-500`}>Número de Cédula o RIF *</label>
                    <input
                      type="text"
                      placeholder="Ej. 12345678"
                      value={pm.idNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updatePagoMovilItem(index, 'idNumber', val);
                      }}
                      className={`w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} font-medium shadow-xs transition-colors duration-500 placeholder:text-slate-400`}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
                      onBlur={(e) => e.target.style.borderColor = ''}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hasDolares && (
            <>
              {/* Zelle */}
              <div 
                className={`${subCardBg} p-3.5 rounded-2xl border ${borderInput} space-y-2 shadow-xs transition-colors duration-500`}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color, #f97316)'}
                onBlur={(e) => e.currentTarget.style.borderColor = ''}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md border ${borderInput} flex items-center justify-center flex-shrink-0 ${textColor} ${isLight ? 'bg-slate-100' : 'bg-white/10'} shadow-xs`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-bold ${textColor}`}>Zelle (USD)</span>
                </div>
                <input
                  type="text"
                  placeholder="Correo o Teléfono Zelle"
                  value={zelle?.emailOrPhone || ''}
                  onChange={(e) => updateZelleConfig('emailOrPhone', e.target.value)}
                  className={`w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} shadow-xs transition-colors duration-500 placeholder:text-slate-400`}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
                  onBlur={(e) => e.target.style.borderColor = ''}
                />
                <input
                  type="text"
                  placeholder="Titular de la cuenta"
                  value={zelle?.holderName || ''}
                  onChange={(e) => updateZelleConfig('holderName', e.target.value)}
                  className={`w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} shadow-xs transition-colors duration-500 placeholder:text-slate-400`}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
                  onBlur={(e) => e.target.style.borderColor = ''}
                />
              </div>

              {/* PayPal */}
              <div 
                className={`${subCardBg} p-3.5 rounded-2xl border ${borderInput} space-y-2 shadow-xs transition-colors duration-500`}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color, #f97316)'}
                onBlur={(e) => e.currentTarget.style.borderColor = ''}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md border ${borderInput} flex items-center justify-center flex-shrink-0 ${textColor} ${isLight ? 'bg-slate-100' : 'bg-white/10'} shadow-xs`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-bold ${textColor}`}>PayPal (USD / EUR)</span>
                </div>
                <input
                  type="text"
                  placeholder="Correo o Enlace de PayPal.me"
                  value={paypal?.emailOrLink || ''}
                  onChange={(e) => updatePaypalConfig('emailOrLink', e.target.value)}
                  className={`w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} shadow-xs transition-colors duration-500 placeholder:text-slate-400`}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
                  onBlur={(e) => e.target.style.borderColor = ''}
                />
                <input
                  type="text"
                  placeholder="Titular de la cuenta"
                  value={paypal?.holderName || ''}
                  onChange={(e) => updatePaypalConfig('holderName', e.target.value)}
                  className={`w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} shadow-xs transition-colors duration-500 placeholder:text-slate-400`}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
                  onBlur={(e) => e.target.style.borderColor = ''}
                />
              </div>
            </>
          )}
        </div>

        {!hasBolivares && !hasDolares && (
          <div className={`${subCardBg} border ${borderInput} p-4 rounded-xl text-center text-xs ${mutedTextColor} transition-colors duration-500`}>
            No has seleccionado monedas de cobro en el Paso 1. Regresa al paso anterior si deseas activar métodos de pago automatizados.
          </div>
        )}
      </div>
    </div>
  );
}