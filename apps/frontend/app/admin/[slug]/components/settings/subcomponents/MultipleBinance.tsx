'use client';

import React from 'react';

interface MultipleBinanceProps {
  config: {
    payId: string;
    email: string;
  };
  onChange: (config: any) => void;
  textColor: string;
  primary: string;
  inputClass: string;
  isDarkBg?: boolean;
}

export default function MultipleBinance({
  config,
  onChange,
  textColor,
  primary,
  inputClass,
  isDarkBg = false
}: MultipleBinanceProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const isComplete = config.payId && config.payId.trim() !== '' && config.email && config.email.trim() !== '';

  const bgColor = isDarkBg ? 'bg-white/5' : 'bg-black/5';

  return (
    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Binance Pay (USDT)
        </h4>
        {isComplete && (
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Configurado
          </span>
        )}
      </div>

      <div 
        className={`p-4 rounded-xl border space-y-3 ${!isComplete ? 'opacity-80' : ''}`}
        style={{ 
          borderColor: `${primary}30`,
          backgroundColor: bgColor
        }}
      >
        <p className="text-[11px] opacity-65" style={{ color: textColor }}>
          Configura los datos necesarios para aceptar pagos con Binance Pay (USDT).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
              Pay ID *
            </label>
            <input
              type="text"
              value={config.payId || ''}
              onChange={(e) => handleChange('payId', e.target.value)}
              placeholder="Ej. 123456789"
              className={inputClass}
              style={{ 
                color: textColor,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1 opacity-75" style={{ color: textColor }}>
              Correo Asociado *
            </label>
            <input
              type="email"
              value={config.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className={inputClass}
              style={{ 
                color: textColor,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                borderColor: isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
          </div>
        </div>

        {!isComplete && (
          <p className="text-[10px] font-medium flex items-center gap-1.5" style={{ color: primary }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Completa todos los campos para habilitar este método de pago.
          </p>
        )}
      </div>
    </div>
  );
}