import React, { useState, useEffect } from 'react';
import { COUNTRIES } from './paymentConstants';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface OwnerInfoSectionProps {
  data: any;
  update: (fields: any) => void;
}

// Mapeo de códigos de país a máximos de dígitos
const COUNTRY_DIGIT_LIMITS: Record<string, { min: number; max: number }> = {
  '+58': { min: 7, max: 10 },   // Venezuela
  '+1': { min: 7, max: 10 },    // Estados Unidos y Canadá
  '+52': { min: 7, max: 10 },   // México
  '+54': { min: 7, max: 10 },   // Argentina
  '+57': { min: 7, max: 10 },   // Colombia
  '+56': { min: 7, max: 9 },    // Chile
  '+51': { min: 7, max: 9 },    // Perú
  '+593': { min: 7, max: 10 },  // Ecuador
  '+55': { min: 8, max: 11 },   // Brasil
};

// Mapeo de códigos de país a ejemplos de formato
const COUNTRY_PHONE_EXAMPLES: Record<string, string> = {
  '+58': '4141234567',
  '+1': '5551234567',
  '+52': '5512345678',
  '+54': '9112345678',
  '+57': '3211234567',
  '+56': '912345678',
  '+51': '987654321',
  '+593': '991234567',
  '+55': '11912345678',
};

export default function OwnerInfoSection({ data, update }: OwnerInfoSectionProps) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  const [countryCode, setCountryCode] = useState(data.countryCode || '+58');
  const [phoneError, setPhoneError] = useState<string>('');

  // Obtener límites según el país
  const getPhoneLimits = (code: string) => {
    return COUNTRY_DIGIT_LIMITS[code] || { min: 7, max: 10 };
  };

  const { min, max } = getPhoneLimits(countryCode);

  // Actualizar país cuando cambie
  // ⚠️ Ahora recibe el string directo (SearchableDropdown no expone el event)
  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    update({ countryCode: newCode });

    // Limpiar error y teléfono si cambia de país
    setPhoneError('');
  };

  // Validar al perder foco
  const handlePhoneBlur = () => {
    const phone = data.phone || '';
    if (phone.length > 0 && phone.length < min) {
      setPhoneError(`El número debe tener al menos ${min} dígitos`);
    } else if (phone.length > max) {
      setPhoneError(`El número no puede tener más de ${max} dígitos`);
    } else {
      setPhoneError('');
    }
  };

  // Obtener el ejemplo según el país
  const getPlaceholder = () => {
    const example = COUNTRY_PHONE_EXAMPLES[countryCode] || '1234567890';
    return `Ej. ${example}`;
  };

  // 🔥 FUNCIÓN PARA FORMATEAR NÚMERO CON PUNTOS
  const formatPhoneNumber = (value: string): string => {
    if (!value) return '';
    // Solo dígitos
    const digits = value.replace(/\D/g, '');
    // Formatear con puntos cada 3 dígitos
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // 🔥 FUNCIÓN PARA LIMPIAR FORMATO Y OBTENER SOLO DÍGITOS
  const getRawPhone = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="block text-xs font-bold tracking-wider text-slate-700">
          Nombre del Propietario / Responsable *
        </label>
        <input
          type="text"
          placeholder="Ej. Mirtha Giron"
          value={data.ownerName || ''}
          onChange={(e) => update({ ownerName: e.target.value })}
          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none text-slate-900 transition shadow-xs focus:ring-2 focus:ring-opacity-20"
          style={{ 
            '--tw-ring-color': 'var(--accent-color, #f97316)',
          } as React.CSSProperties}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-color, #f97316)';
            e.target.style.boxShadow = '0 0 0 3px var(--accent-color, #f97316)20';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '';
            e.target.style.boxShadow = '';
          }}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold tracking-wider text-slate-700">
          WhatsApp Comercial / Contacto *
        </label>
        <div className="flex gap-2">
          <div className="flex-shrink-0 w-[115px]">
            <SearchableDropdown
              value={countryCode}
              onChange={handleCountryChange}
              options={COUNTRIES.map((c) => ({
                value: c.dialCode,
                label: `${c.flag ? `${c.flag} ` : ''}${c.dialCode}`,
              }))}
              placeholder="País"
              searchPlaceholder="Buscar país..."
              emptyMessage="No hay países"
              primary="var(--accent-color, #f97316)"
              textColor="#0f172a"
              isDarkBg={false}
              borderColor="rgba(148,163,184,0.4)"
              searchable={true}
              footerLabel={(n) => `${n} países`}
            />
          </div>

          <div className="flex-1 relative">
            <input
              type="tel"
              placeholder={getPlaceholder()}
              value={data.phone ? formatPhoneNumber(data.phone) : ''}
              onChange={(e) => {
                // 🔥 OBTENER SOLO DÍGITOS DEL VALOR FORMATEADO
                const rawValue = getRawPhone(e.target.value);
                
                // 🔥 LIMITAR AL MÁXIMO DEL PAÍS
                const limitedValue = rawValue.slice(0, max);
                
                // 🔥 VALIDAR MÍNIMO
                if (limitedValue.length > 0 && limitedValue.length < min) {
                  setPhoneError(`Mínimo ${min} dígitos requeridos`);
                } else if (limitedValue.length > max) {
                  setPhoneError(`Máximo ${max} dígitos permitidos`);
                } else {
                  setPhoneError('');
                }
                
                // 🔥 GUARDAR SOLO DÍGITOS
                update({ phone: limitedValue });
              }}
              onBlur={handlePhoneBlur}
              className={`w-full bg-white border rounded-2xl px-4 py-2.5 text-sm outline-none text-slate-900 transition tracking-wide font-medium shadow-xs focus:ring-2 focus:ring-opacity-20 ${
                phoneError ? 'border-red-500 focus:border-red-500' : 'border-slate-200'
              }`}
              style={{ 
                '--tw-ring-color': phoneError ? '#ef4444' : 'var(--accent-color, #f97316)',
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = phoneError ? '#ef4444' : 'var(--accent-color, #f97316)';
                e.target.style.boxShadow = `0 0 0 3px ${phoneError ? '#ef444420' : 'var(--accent-color, #f97316)20'}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = phoneError ? '#ef4444' : '';
                e.target.style.boxShadow = '';
              }}
              maxLength={max + Math.floor(max / 3)} // Permite puntos
              required
              aria-invalid={!!phoneError}
            />
            
            {/* Indicador de validación */}
            {data.phone && data.phone.length > 0 && !phoneError && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {/* Mensaje de ayuda dinámico */}
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-[10px] ${phoneError ? 'text-red-500' : 'text-slate-400'} transition-colors duration-200`}>
            {phoneError || `Entre ${min} y ${max} dígitos`}
          </p>
          {data.phone && data.phone.length > 0 && !phoneError && (
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Válido
            </span>
          )}
        </div>
      </div>
    </div>
  );
}