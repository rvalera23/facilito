'use client';

import React, { useState, useEffect } from 'react';
import MultiplePagoMovil from './step-contact-account/MultiplePagoMovil';
import MultipleZelle from './step-contact-account/MultipleZelle';
import MultipleBinance from './step-contact-account/MultipleBinance';
import MultiplePaymentMethods from './step-contact-account/MultiplePaymentMethods';
import { COUNTRIES } from './step-contact-account/paymentConstants';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface StepContactAccountProps {
  data: {
    email: string;
    ownerName: string;
    countryCode: string;
    phone: string;
    currencies?: any;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    x_twitter?: string;
    threads?: string;
    linkedin?: string;
    specificConfig?: {
      paymentMethods?: {
        pagoMovilList?: Array<{ bank: string; operator: string; phone: string; idType: string; idNumber: string; phoneNumber?: string }>;
        zelleList?: Array<{ emailOrPhone: string; holderName: string }>;
        binanceList?: Array<{ payId: string; email: string }>;
        activePaymentMethods?: string[];
      };
      [key: string]: any;
    };
    // 🔥 Index signature para acceso dinámico con net.key
    [key: string]: any;
  };
  update: (fields: any) => void;
  next: () => void;
  back: () => void;
}

export default function StepContactAccount({ data, update, next, back }: StepContactAccountProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [useSameEmail, setUseSameEmail] = useState<boolean>(true);
  const [isLight, setIsLight] = useState<boolean>(false);

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
  const bgInput = isLight ? 'bg-slate-50 text-slate-900' : 'bg-transparent text-white';

  // 🔥 secondary dinámico del theme (se re-lee en cada render).
  // No usar getComputedStyle inline porque se evalúa una sola vez en el primer render.
  const [secondaryColor, setSecondaryColor] = useState<string>('');
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
      setSecondaryColor(v);
    };
    read();
    // Re-leer cuando el theme cambia
    window.addEventListener('themeChange', read);
    window.addEventListener('paletteChange', read);
    return () => {
      window.removeEventListener('themeChange', read);
      window.removeEventListener('paletteChange', read);
    };
  }, []);
  const backBtnClass = isLight 
    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300' 
    : 'bg-white/10 hover:bg-white/20 text-white border-white/15';
  const socialIconColor = isLight ? 'text-slate-700' : 'text-white/80';
  const inputClass = `w-full ${bgInput} border ${borderInput} rounded-xl px-3 py-2 text-xs outline-none ${textColor} shadow-xs transition-colors duration-500 placeholder:text-slate-400`;

  const SOCIAL_NETWORKS_CONFIG = [
    {
      key: 'instagram',
      name: 'Instagram',
      baseUrl: 'instagram.com/',
      placeholder: 'tu_negocio',
      icon: (
        <svg className={`w-4 h-4 ${socialIconColor}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
        </svg>
      )
    },
    {
      key: 'facebook',
      name: 'Facebook',
      baseUrl: 'facebook.com/',
      placeholder: 'tu_negocio',
      icon: (
        <svg className={`w-4 h-4 ${socialIconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      )
    },
    {
      key: 'tiktok',
      name: 'TikTok',
      baseUrl: 'tiktok.com/@',
      placeholder: 'tu_negocio',
      icon: (
        <svg className={`w-4 h-4 ${socialIconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z"/>
        </svg>
      )
    },
    {
      key: 'x_twitter',
      name: 'X (Twitter)',
      baseUrl: 'x.com/',
      placeholder: 'tu_negocio',
      icon: (
        <svg className={`w-4 h-4 ${socialIconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      key: 'threads',
      name: 'Threads',
      baseUrl: 'threads.net/@',
      placeholder: 'tu_negocio',
      icon: (
        <svg className={`w-4 h-4 ${socialIconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z"/>
        </svg>
      )
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      baseUrl: 'linkedin.com/in/',
      placeholder: 'tu-usuario',
      icon: (
        <svg className={`w-4 h-4 ${socialIconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/>
        </svg>
      )
    }
  ];

  const paymentMethods = data.specificConfig?.paymentMethods || {};
  
  // 🔥 ESTADO CON phoneNumber
  const [pagoMovilList, setPagoMovilList] = useState<Array<{ 
    bank: string; 
    operator: string; 
    phone: string; 
    idType: string; 
    idNumber: string;
    phoneNumber?: string;
  }>>(
    () => {
      if (paymentMethods.pagoMovilList?.length) {
        return paymentMethods.pagoMovilList.map((pm: any) => ({
          ...pm,
          phone: pm.phone ? pm.phone.replace(/\D/g, '').slice(0, 7) : '',
          operator: pm.operator ? pm.operator.replace(/^\+?58/, '') : '0414',
          phoneNumber: pm.phoneNumber || `${pm.operator || '0414'}${pm.phone || ''}`
        }));
      }
      return [{ bank: '0102', operator: '0414', phone: '', idType: 'V', idNumber: '', phoneNumber: '' }];
    }
  );

  const [zelleList, setZelleList] = useState<Array<{ emailOrPhone: string; holderName: string }>>(
    () => paymentMethods.zelleList?.length ? paymentMethods.zelleList : [{ emailOrPhone: '', holderName: '' }]
  );

  const [binanceList, setBinanceList] = useState<Array<{ payId: string; email: string }>>(
    () => paymentMethods.binanceList?.length ? paymentMethods.binanceList : [{ payId: '', email: '' }]
  );

  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(
    () => paymentMethods.activePaymentMethods?.length ? paymentMethods.activePaymentMethods : ['cash', 'pos']
  );

  // 🔥 Sincronizar con phoneNumber
  useEffect(() => {
    const newPaymentMethods = data.specificConfig?.paymentMethods || {};
    
    if (newPaymentMethods.pagoMovilList && JSON.stringify(newPaymentMethods.pagoMovilList) !== JSON.stringify(pagoMovilList)) {
      const cleanedList = newPaymentMethods.pagoMovilList.map((pm: any) => ({
        ...pm,
        phone: pm.phone ? pm.phone.replace(/\D/g, '').slice(0, 7) : '',
        operator: pm.operator ? pm.operator.replace(/^\+?58/, '') : '0414',
        phoneNumber: pm.phoneNumber || `${pm.operator || '0414'}${pm.phone || ''}`
      }));
      setPagoMovilList(cleanedList);
    }
    
    if (newPaymentMethods.zelleList && JSON.stringify(newPaymentMethods.zelleList) !== JSON.stringify(zelleList)) {
      setZelleList(newPaymentMethods.zelleList);
    }
    
    if (newPaymentMethods.binanceList && JSON.stringify(newPaymentMethods.binanceList) !== JSON.stringify(binanceList)) {
      setBinanceList(newPaymentMethods.binanceList);
    }

    if (newPaymentMethods.activePaymentMethods && 
        JSON.stringify(newPaymentMethods.activePaymentMethods) !== JSON.stringify(paymentMethodsList)) {
      setPaymentMethodsList(newPaymentMethods.activePaymentMethods);
    }
  }, [data.specificConfig]);

  const syncPaymentConfig = (pmList: any, zList: any, bList: any, pmMethodsList?: string[]) => {
    const methodsList = pmMethodsList || paymentMethodsList;
    update({
      specificConfig: {
        ...(data.specificConfig || {}),
        paymentMethods: {
          pagoMovilList: pmList,
          zelleList: zList,
          binanceList: bList,
          activePaymentMethods: methodsList
        }
      }
    });
    
    setPagoMovilList(pmList);
    setZelleList(zList);
    setBinanceList(bList);
    if (pmMethodsList) {
      setPaymentMethodsList(pmMethodsList);
    }
  };

  const rawCurrencies = data.currencies;
  let currencyList: string[] = [];
  if (Array.isArray(rawCurrencies)) {
    currencyList = rawCurrencies.map(c => typeof c === 'string' ? c.toUpperCase() : (c?.value || c?.name || '').toUpperCase());
  } else if (typeof rawCurrencies === 'string') {
    currencyList = [rawCurrencies.toUpperCase()];
  }

  const hasBolivares = currencyList.some(c => c.includes('VES') || c.includes('BOLÍVARES') || c.includes('BOLIVARES') || c.includes('BS'));
  const hasDolares = currencyList.some(c => c.includes('USD') || c.includes('DÓLARES') || c.includes('DOLARES') || c.includes('$'));

  useEffect(() => {
    let userEmail = data.email || '';
    if (!userEmail) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          userEmail = parsed.email || '';
        }
      } catch (e) {
        console.error("Error leyendo localStorage", e);
      }
    }
    if (userEmail) {
      setRegisteredEmail(userEmail);
      if (!data.email) {
        update({ email: userEmail });
      }
    }
  }, []);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setUseSameEmail(checked);
    if (checked) {
      update({ email: registeredEmail });
    } else {
      update({ email: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 [StepContactAccount] Iniciando handleSubmit');
    console.log('🔍 [StepContactAccount] pagoMovilList:', pagoMovilList);
    console.log('🔍 [StepContactAccount] zelleList:', zelleList);
    console.log('🔍 [StepContactAccount] binanceList:', binanceList);
    console.log('🔍 [StepContactAccount] paymentMethodsList:', paymentMethodsList);
    
    if (!data.ownerName?.trim() || !data.phone?.trim() || !data.email?.trim()) {
      alert('Por favor completa tu nombre, el correo y tu número de WhatsApp de contacto.');
      return;
    }

    if (hasBolivares) {
      for (let i = 0; i < pagoMovilList.length; i++) {
        const pm = pagoMovilList[i];
        const phoneDigits = pm.phone.replace(/\D/g, '');
        if (phoneDigits.length !== 7 || !pm.idNumber) {
          alert(`Por favor verifica el Pago Móvil #${i + 1}: el teléfono debe tener exactamente 7 dígitos (después del operador) y la cédula/RIF no puede estar vacía.`);
          return;
        }
      }
    }

    if (paymentMethodsList.length === 0) {
      alert('Por favor selecciona al menos un método de pago (Efectivo, Punto de Venta o Biopago).');
      return;
    }

    const updatedSpecificConfig = {
      ...(data.specificConfig || {}),
      paymentMethods: {
        pagoMovilList: pagoMovilList,
        zelleList: zelleList,
        binanceList: binanceList,
        activePaymentMethods: paymentMethodsList
      }
    };
    
    console.log('🔍 [StepContactAccount] Guardando specificConfig:', updatedSpecificConfig);
    
    update({ 
      specificConfig: updatedSpecificConfig,
      instagram: data.instagram || '',
      facebook: data.facebook || '',
      tiktok: data.tiktok || '',
      x_twitter: data.x_twitter || '',
      threads: data.threads || '',
      linkedin: data.linkedin || '',
    });
    
    syncPaymentConfig(pagoMovilList, zelleList, binanceList, paymentMethodsList);
    
    setTimeout(() => {
      console.log('🔍 [StepContactAccount] Datos guardados, avanzando al siguiente paso');
      next();
    }, 300);
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 animate-fadeIn transition-colors duration-500 ${textColor}`}>
      <div className="text-center space-y-1 mb-2">
        <h2 className={`text-2xl font-black tracking-tight ${textColor} transition-colors duration-500`}>Contacto y Métodos de Cobro</h2>
        <p className={`text-xs ${mutedTextColor} transition-colors duration-500`}>Paso 4: Configura canales de comunicación y pasarelas de pago para tu tienda y quiosco.</p>
      </div>

      <div className={`space-y-2 ${bgInput} p-3.5 rounded-2xl border ${borderInput} transition-colors duration-500`}>
        <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
          Correo Electrónico de la Tienda / Compras *
        </label>
        
        <div className="relative flex items-center">
          <input
            type="email"
            disabled
            value={registeredEmail}
            className={`w-full bg-transparent ${isLight ? 'text-slate-500 border-slate-300' : 'text-white/50 border-white/15'} border rounded-xl px-4 py-2.5 text-sm cursor-not-allowed select-none transition-colors duration-500`}
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
              className={`w-full ${bgInput} border ${borderInput} rounded-xl px-4 py-2 text-sm outline-none ${textColor} transition shadow-xs focus:ring-2`}
              style={{ 
                ['--tw-ring-color' as any]: 'var(--accent-color, #f97316)',
                borderColor: 'var(--accent-color, #f97316)'
              }}
              required={!useSameEmail}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
            Nombre del Propietario / Responsable *
          </label>
          <input
            type="text"
            placeholder="Ej. Mirtha Giron"
            value={data.ownerName || ''}
            onChange={(e) => update({ ownerName: e.target.value })}
            className={`w-full ${bgInput} border ${borderInput} rounded-2xl px-4 py-2.5 text-sm outline-none ${textColor} transition`}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
            onBlur={(e) => e.target.style.borderColor = ''}
            required
          />
        </div>

        <div className="space-y-1">
          <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
            WhatsApp Comercial / Contacto *
          </label>
          <div className="flex gap-2">
            <div className="w-[140px] flex-shrink-0">
              <SearchableDropdown
                value={data.countryCode || '+58'}
                onChange={(val) => update({ countryCode: val })}
                options={COUNTRIES.map((c) => ({
                  value: c.dialCode,
                  label: `${c.flag} ${c.dialCode}`,
                }))}
                placeholder="País"
                searchPlaceholder="Buscar país..."
                emptyMessage="No hay países"
                primary="var(--accent-color, #f97316)"
                textColor={isLight ? '#0f172a' : '#ffffff'}
                secondary={undefined}
                                                                isDarkBg={!isLight}
                borderColor={isLight ? 'rgba(148,163,184,0.4)' : 'rgba(255,255,255,0.15)'}
                searchable={true}
                footerLabel={(n) => `${n} países`}
              />
            </div>

            <input
              type="tel"
              placeholder="Ej. 4141234567"
              value={data.phone || ''}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                update({ phone: numericValue });
              }}
              className={`w-full ${bgInput} border ${borderInput} rounded-2xl px-4 py-2.5 text-sm outline-none ${textColor} transition tracking-wide font-medium`}
              style={{
                borderColor: data.phone && data.phone.length >= 7 && data.phone.length <= 10 ? 'var(--accent-color, #f97316)' : undefined,
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color, #f97316)'}
              onBlur={(e) => {
                if (data.phone && data.phone.length >= 7 && data.phone.length <= 10) {
                  e.target.style.borderColor = 'var(--accent-color, #f97316)';
                } else {
                  e.target.style.borderColor = '';
                }
              }}
              required
            />
          </div>
        </div>
      </div>

      <MultiplePaymentMethods
        list={paymentMethodsList}
        onUpdate={(list) => syncPaymentConfig(pagoMovilList, zelleList, binanceList, list)}
        textColor={textColor}
        primary="var(--accent-color, #f97316)"
        isLight={isLight}
        secondary={secondaryColor}
      />

      {hasBolivares && (
        <MultiplePagoMovil
          pagoMovilList={pagoMovilList}
          onUpdate={(list) => syncPaymentConfig(list, zelleList, binanceList)}
          textColor={textColor}
          primary="var(--accent-color, #f97316)"
          inputClass={inputClass}
          isLight={isLight}
          secondary={secondaryColor}
        />
      )}

      {hasDolares && (
        <MultipleZelle
          list={zelleList}
          onUpdate={(list) => syncPaymentConfig(pagoMovilList, list, binanceList)}
          textColor={textColor}
          primary="var(--accent-color, #f97316)"
          inputClass={inputClass}
          isLight={isLight}
          secondary={secondaryColor}
        />
      )}

      {hasDolares && (
        <MultipleBinance
          list={binanceList}
          onUpdate={(list) => syncPaymentConfig(pagoMovilList, zelleList, list)}
          textColor={textColor}
          primary="var(--accent-color, #f97316)"
          inputClass={inputClass}
          isLight={isLight}
          secondary={secondaryColor}
        />
      )}

      <div className={`space-y-2.5 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'} transition-colors duration-500`}>
        <div className="flex items-center justify-between">
          <label className={`block text-xs font-bold tracking-wider ${labelColor} transition-colors duration-500`}>
            Redes Sociales <span className={`text-[10px] ${mutedTextColor} font-normal`}>(Escribe solo tu usuario/slug)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {SOCIAL_NETWORKS_CONFIG.map((net: any) => (
            <div 
              key={net.key} 
              className={`flex items-center ${bgInput} rounded-xl border ${borderInput} overflow-hidden transition`}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color, #f97316)'}
              onBlur={(e) => e.currentTarget.style.borderColor = ''}
            >
              <div className={`flex items-center gap-1.5 px-3 ${isLight ? 'bg-slate-200/60 border-slate-300 text-slate-700' : 'bg-white/5 border-white/15 text-white/80'} border-r py-2 text-xs flex-shrink-0 select-none transition-colors duration-500`}>
                {net.icon}
                <span className="font-bold hidden sm:inline">{net.name}</span>
              </div>
              
              <div className="flex items-center w-full px-2.5 bg-transparent overflow-hidden">
                <span className={`text-[11px] ${mutedTextColor} select-none whitespace-nowrap pr-1`}>{net.baseUrl}</span>
                <input
                  type="text"
                  placeholder={net.placeholder}
                  value={data[net.key] || ''}
                  onChange={(e) => update({ [net.key]: e.target.value.trim() })}
                  className={`w-full bg-transparent py-2 text-xs outline-none border-none ring-0 focus:outline-none focus:ring-0 ${textColor} font-medium`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex space-x-3 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <button
          type="button"
          onClick={back}
          className={`w-1/3 font-bold py-3.5 rounded-2xl transition text-sm cursor-pointer border ${backBtnClass}`}
        >
          ← Atrás
        </button>
        <button
          type="submit"
          className="w-2/3 text-white font-bold py-3.5 rounded-2xl shadow-lg transition text-sm cursor-pointer"
          style={{ 
            backgroundColor: 'var(--accent-color, #f97316)',
            boxShadow: '0 10px 15px -3px var(--accent-color, #f97316)50' 
          }}
        >
          Siguiente Paso →
        </button>
      </div>
    </form>
  );
}