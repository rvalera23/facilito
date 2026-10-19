// ==========================================
// ARCHIVO: app/onboarding/components/StoreEmailSection.tsx
// ==========================================
'use client';

import React, { useState, useEffect } from 'react';

interface StoreEmailSectionProps {
  registeredEmail: string;
  useSameEmail: boolean;
  data: any;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  update: (fields: any) => void;
}

export default function StoreEmailSection({
  registeredEmail,
  useSameEmail,
  data,
  handleCheckboxChange,
  update,
}: StoreEmailSectionProps) {
  const [isLight, setIsLight] = useState<boolean>(false);

  // Lógica para detectar el brillo del fondo y adaptar colores dinámicamente
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
  const borderInput = isLight ? 'border-slate-300' : 'border-white/10';
  const bgInput = isLight ? 'bg-slate-50' : 'bg-slate-900/60';
  const cardBg = isLight ? 'bg-white/80' : 'bg-slate-900/40 backdrop-blur-md';

  return (
    <div className={`space-y-3 p-4 rounded-2xl border ${borderInput} ${cardBg} shadow-sm transition-colors duration-500 ${textColor}`}>
      <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
        Correo Electrónico de la Tienda / Compras *
      </label>
      
      <div className="relative flex items-center">
        <input
          type="email"
          disabled
          value={registeredEmail}
          className={`w-full ${isLight ? 'bg-slate-200/60 text-slate-500 border-slate-300' : 'bg-white/5 text-white/50 border-white/10'} border rounded-xl px-4 py-2.5 text-sm cursor-not-allowed select-none transition-colors duration-500`}
        />
        <span className={`absolute right-3 text-[10px] ${isLight ? 'bg-slate-300 text-slate-700' : 'bg-white/10 text-white/70'} px-2 py-1 rounded-md font-bold transition-colors duration-500`}>
          Registro
        </span>
      </div>

      <label className="flex items-center space-x-2.5 cursor-pointer pt-1 select-none">
        <input
          type="checkbox"
          checked={useSameEmail}
          onChange={handleCheckboxChange}
          className={`w-4 h-4 rounded ${borderInput} cursor-pointer`}
          style={{ accentColor: 'var(--accent-color, #f97316)' }}
        />
        <span className={`text-xs font-medium ${mutedTextColor} transition-colors duration-500`}>
          Usar este mismo correo para la atención y compras de la tienda
        </span>
      </label>

      {!useSameEmail && (
        <div className="pt-2 animate-fadeIn space-y-1">
          <label className="block text-xs font-semibold" style={{ color: 'var(--accent-color, #f97316)' }}>
            Indica el correo específico para la tienda:
          </label>
          <input
            type="email"
            placeholder="Ej. ventas@tutienda.com"
            value={data.email === registeredEmail ? '' : (data.email || '')}
            onChange={(e) => update({ email: e.target.value })}
            className={`w-full ${bgInput} border ${borderInput} rounded-xl px-4 py-2.5 text-sm outline-none ${textColor} transition shadow-xs focus:ring-2`}
            style={{ 
              ['--tw-ring-color' as any]: 'var(--accent-color, #f97316)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
            onBlur={(e) => e.target.style.borderColor = ''}
            required={!useSameEmail}
          />
        </div>
      )}
    </div>
  );
}