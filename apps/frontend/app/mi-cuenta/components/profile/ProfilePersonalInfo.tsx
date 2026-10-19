'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface ProfilePersonalInfoProps {
  fullName: string;
  phone: string;
  email: string;
  idNumber?: string;
  idType?: string;
  pagoMovilSameAsProfile?: boolean;
  textColor: string;
  inputClass: string;
  disabledInputClass: string;
  onUpdate: (field: string, value: any) => void;
  // 🔥 NUEVO: necesarios para SearchableDropdown
  primary: string;
  isDarkBg: boolean;
  borderColor: string;
}

// 🔥 LISTA DE PAÍSES CON CÓDIGOS DE ÁREA
const COUNTRIES = [
  { name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', format: '(###) ###-####' },
  { name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####' },
  { name: 'Canadá', dialCode: '+1', flag: '🇨🇦', format: '(###) ###-####' },
  { name: 'México', dialCode: '+52', flag: '🇲🇽', format: '## #### ####' },
  { name: 'Argentina', dialCode: '+54', flag: '🇦🇷', format: '### ###-####' },
  { name: 'Colombia', dialCode: '+57', flag: '🇨🇴', format: '### ### ####' },
  { name: 'España', dialCode: '+34', flag: '🇪🇸', format: '### ### ###' },
  { name: 'Chile', dialCode: '+56', flag: '🇨🇱', format: '### ### ####' },
  { name: 'Perú', dialCode: '+51', flag: '🇵🇪', format: '### ### ###' },
  { name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', format: '## ### ####' },
  { name: 'Panamá', dialCode: '+507', flag: '🇵🇦', format: '### ####' },
  { name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', format: '#### ####' },
];

export default function ProfilePersonalInfo({
  fullName = '',
  phone = '',
  email = '',
  idNumber = '',
  idType = 'V',
  pagoMovilSameAsProfile = false,
  textColor,
  inputClass,
  disabledInputClass,
  onUpdate,
  primary,
  isDarkBg,
  borderColor,
}: ProfilePersonalInfoProps) {
  // 🔥 Estilo dinámico para los <option> (heredan el tema del tenant).
  const optionStyle = useThemedOptionStyle();

  // 🔥 ESTADO LOCAL PARA EL CÓDIGO DE PAÍS
  const [countryCode, setCountryCode] = useState('+58');
  const [localPhone, setLocalPhone] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const isInternalUpdate = useRef(false);

  // 🔥 ESTADO LOCAL PARA CÉDULA
  const [localIdType, setLocalIdType] = useState<string>(idType || 'V');
  const [localIdNumber, setLocalIdNumber] = useState<string>(idNumber || '');

  // 🔥 Sincronizar cédula cuando cambia desde fuera
  useEffect(() => {
    setLocalIdType(idType || 'V');
    setLocalIdNumber(idNumber || '');
  }, [idType, idNumber]);

  // 🔥 FUNCIÓN PARA FORMATEAR EL NÚMERO SEGÚN EL PAÍS (PRESERVANDO EL 0)
  const formatPhoneNumber = (value: string, dialCode: string) => {
    // 🔥 NUEVO: No eliminar el 0 inicial si es Venezuela
    let digits = value.replace(/\D/g, '');
    
    // Si es Venezuela y el número tiene 11 dígitos (con 0), preservar el 0
    if (dialCode === '+58' && digits.length === 11 && digits.startsWith('0')) {
      // No hacemos nada, preservamos el 0
    } else if (dialCode === '+58' && digits.length === 10 && !digits.startsWith('0')) {
      // Si no tiene 0, lo añadimos para visualización
      digits = '0' + digits;
    }
    
    const country = COUNTRIES.find(c => c.dialCode === dialCode);
    if (!country) return digits;

    const format = country.format;
    let formatted = '';
    let digitIndex = 0;

    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
      if (format[i] === '#') {
        formatted += digits[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }

    return formatted;
  };

  // 🔥 FUNCIÓN PARA EXTRAER SOLO DÍGITOS (PERO PRESERVANDO EL 0 INICIAL)
  const getRawDigits = (value: string) => {
    // No usar replace(/\D/g, '') directamente porque pierde el 0
    // Mejor: extraer dígitos pero preservar el 0 inicial si existe
    const digits = value.replace(/\D/g, '');
    // Si el valor original empieza con 0, preservarlo
    if (value.trim().startsWith('0') && digits.length > 0) {
      return '0' + digits;
    }
    return digits;
  };

  // 🔥 MANEJAR CAMBIO DE PAÍS
  const handleCountryChange = (dialCode: string) => {
    setCountryCode(dialCode);
    setLocalPhone('');
    setDisplayPhone('');
    isInternalUpdate.current = true;
    onUpdate('phone', dialCode);
    setTimeout(() => { isInternalUpdate.current = false; }, 0);
  };

  // 🔥 MANEJAR CAMBIO DE NÚMERO DE TELÉFONO
  const handlePhoneChange = (value: string) => {
    // Extraer dígitos pero preservar el 0
    const digits = getRawDigits(value);
    
    setLocalPhone(digits);
    const formatted = formatPhoneNumber(digits, countryCode);
    setDisplayPhone(formatted);
    
    // Guardar el número completo
    const fullPhone = `${countryCode} ${digits}`.trim();
    console.log('🔵 Guardando teléfono:', fullPhone);
    onUpdate('phone', fullPhone);
  };

  // 🔥 EFECTO PARA SINCRONIZAR CON LA PROP CUANDO CAMBIA DESDE FUERA
  useEffect(() => {
    if (!isInternalUpdate.current && phone) {
      const match = phone.match(/^(\+\d+)\s*(.*)/);
      if (match) {
        const code = match[1];
        let number = match[2].replace(/\s/g, '');
        const countryExists = COUNTRIES.some(c => c.dialCode === code);
        
        if (countryExists) {
          setCountryCode(code);
          setLocalPhone(number);
          
          // 🔥 NUEVO: Formatear el número para mostrar (preservando el 0)
          const formatted = formatPhoneNumber(number, code);
          setDisplayPhone(formatted);
          return;
        }
      }
      
      // Si no hay código de país, solo mostrar los dígitos
      const digits = getRawDigits(phone);
      if (digits) {
        setLocalPhone(digits);
        const formatted = formatPhoneNumber(digits, countryCode);
        setDisplayPhone(formatted);
      }
    }
  }, [phone, countryCode]);

  // 🔥 SINCRONIZAR CON FULLNAME PARA QUE EL INPUT DE PRUEBA FUNCIONE
  const [testValue, setTestValue] = React.useState(fullName);
  useEffect(() => {
    setTestValue(fullName);
  }, [fullName]);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
        Datos Personales
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
            Nombre Completo *
          </label>
          <input
            type="text"
            value={fullName || ''}
            onChange={(e) => {
              console.log('🔴 onChange NOMBRE:', e.target.value);
              onUpdate('fullName', e.target.value);
            }}
            className={inputClass}
            style={{ color: textColor }}
            placeholder="Tu nombre completo"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
            Teléfono / WhatsApp *
          </label>
          
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-[110px]">
              <SearchableDropdown
                value={countryCode}
                onChange={(val) => handleCountryChange(val)}
                options={COUNTRIES.map((c) => ({
                  value: c.dialCode,
                  label: `${c.flag} ${c.dialCode}`,
                }))}
                placeholder="País"
                searchPlaceholder="Buscar país..."
                emptyMessage="No hay países"
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={borderColor}
                searchable={true}
                footerLabel={(n) => `${n} países`}
              />
            </div>

            <div className="flex-1">
              <input
                type="text"
                value={displayPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Ej. 412 1234567"
                className={inputClass}
                style={{ color: textColor }}
                maxLength={20}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-[9px] opacity-40" style={{ color: textColor }}>
              Formato: {COUNTRIES.find(c => c.dialCode === countryCode)?.format || '(###) ###-####'}
            </span>
            {localPhone && (
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                {localPhone.length} dígitos
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
          Correo Electrónico <span className="text-[10px] font-normal opacity-60">(Identificador único inmutable)</span>
        </label>
        <input
          type="text"
          disabled
          value={email || ''}
          className={disabledInputClass}
          style={{ color: textColor }}
        />
      </div>

      {/* 🔥 CÉDULA + FLAG PAGO MÓVIL */}
      <div>
        <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
          Cédula de Identidad
        </label>
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-[90px]">
            <SearchableDropdown
              value={localIdType}
              onChange={(val) => {
                setLocalIdType(val);
                onUpdate('id_type', val);
              }}
              options={[
                { value: 'V', label: 'V' },
                { value: 'E', label: 'E' },
                { value: 'J', label: 'J' },
                { value: 'G', label: 'G' },
              ]}
              placeholder="V"
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderColor}
              searchable={false}
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej. 12345678"
              value={localIdNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                setLocalIdNumber(digits);
                onUpdate('id_number', digits);
              }}
              className={inputClass}
              style={{ color: textColor }}
              maxLength={9}
            />
          </div>
        </div>
        <p className="text-[9px] opacity-40 mt-1" style={{ color: textColor }}>
          Solo números (sin puntos ni guiones).
        </p>
      </div>

      <label
        className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition"
        style={{
          borderColor: pagoMovilSameAsProfile ? 'var(--accent-color, #f97316)' : 'rgba(255,255,255,0.15)',
          backgroundColor: pagoMovilSameAsProfile ? 'rgba(249,115,22,0.06)' : 'transparent',
        }}
      >
        <input
          type="checkbox"
          checked={pagoMovilSameAsProfile}
          onChange={(e) => onUpdate('pago_movil_same_as_profile', e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded cursor-pointer flex-shrink-0"
          style={{ accentColor: 'var(--accent-color, #f97316)' }}
        />
        <div className="flex-1">
          <span className="block text-xs font-bold" style={{ color: textColor }}>
            Usar estos mismos datos para Pago Móvil Personal
          </span>
          <span className="block text-[10px] opacity-60 mt-0.5" style={{ color: textColor }}>
            Al comprar con Pago Móvil, tu teléfono y cédula se completarán automáticamente.
          </span>
        </div>
      </label>
    </div>
  );
}