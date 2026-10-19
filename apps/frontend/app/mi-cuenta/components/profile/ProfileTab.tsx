'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { reverseGeocode } from '@/lib/geo-search';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { Button } from '@/components/ui/Button';
import ProfileSecurity from '@/components/ProfileSecurity';
import { performLogout } from '@/lib/auth/logout';
import { apiFetch } from '@/lib/api';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
// IMPORTAR EL MAPA DE FORMA DINÁMICA (SSR: false)
const LocationMap = dynamic(
  () => import('@/app/onboarding/components/LocationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 bg-transparent border-2 border-gray-300 dark:border-white/10 rounded-2xl flex items-center justify-center text-xs text-gray-500 dark:text-white/40">
        Cargando mapa interactivo...
      </div>
    ),
  }
);


// 🔥 LISTA DE PAÍSES PARA TELÉFONO
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

// 🔥 FUNCIÓN PARA FORMATEAR TELÉFONO
const formatPhoneNumber = (value: string, dialCode: string) => {
  const digits = value.replace(/\D/g, '');
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

interface ProfileTabProps {
  user: any;
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onUpdateUser?: (updatedData: any) => void;
  onDeleteAccount?: () => void;
}

export default function ProfileTab({
  user,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onUpdateUser,
  onDeleteAccount,
}: ProfileTabProps) {
  // 🔥 Estilo dinámico para los <option> (heredan el tema del tenant).
  const optionStyle = useThemedOptionStyle();

  // TODOS LOS CAMPOS
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+58');
  const [displayPhone, setDisplayPhone] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const isInternalUpdate = useRef(false);
  const [email, setEmail] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [state, setState] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('V');
  const [pagoMovilSameAsProfile, setPagoMovilSameAsProfile] = useState(false);
  
  // CAMPOS DE UBICACIÓN DEL MAPA
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // Dirección detallada
  const [addressType, setAddressType] = useState<'Casa' | 'Local' | 'Oficina'>('Casa');
  const [zone, setZone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [reference, setReference] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // FUNCIÓN PARA CONVERTIR A NÚMERO DE FORMA SEGURA
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? null : num;
  };

  // Sincronizar con el usuario
  useEffect(() => {
    if (user) {
      console.log('🔄 Usuario recibido:', user);

      // Parsear dirección
      const parseAddress = (address: string) => {
        if (!address) {
          return { type: 'Casa' as const, zone: '', street: '', number: '', reference: '' };
        }
        const match = address.match(/^(Casa|Local|Oficina):\s*(.*?),\s*(.*?),\s*(.*?)(?:\s*-\s*Ref:\s*(.*))?$/i);
        if (match) {
          return {
            type: match[1] as 'Casa' | 'Local' | 'Oficina',
            zone: match[2]?.trim() || '',
            street: match[3]?.trim() || '',
            number: match[4]?.trim() || '',
            reference: match[5]?.trim() || '',
          };
        }
        return { type: 'Casa' as const, zone: address || '', street: '', number: '', reference: '' };
      };

      const parsed = parseAddress(user.address || '');

      setFullName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setDeliveryCity(user.deliveryCity || user.city || '');
      setState(user.state || '');
      setMunicipality(user.municipality || '');
      setPreferredCurrency(user.preferredCurrency || 'USD');
      
      setLatitude(toNumber(user.latitude ?? user.lat ?? null));
      setLongitude(toNumber(user.longitude ?? user.lng ?? null));
      
      setAddressType(parsed.type);
      setZone(parsed.zone);
      setStreet(parsed.street);
      setNumber(parsed.number);
      setReference(parsed.reference);

      // 🔥 Cédula + flag Pago Móvil
      setIdNumber(user.id_number || '');
      setIdType(user.id_type || 'V');
      setPagoMovilSameAsProfile(Boolean(user.pago_movil_same_as_profile));
    }
  }, [user]);

  // 🔥 EFECTO PARA SINCRONIZAR EL TELÉFONO CON EL FORMATO
  useEffect(() => {
    if (!isInternalUpdate.current && phone) {
      const match = phone.match(/^(\+\d+)\s*(.*)/);
      if (match) {
        const code = match[1];
        const number = match[2].replace(/\s/g, '');
        const countryExists = COUNTRIES.some(c => c.dialCode === code);
        
        if (countryExists) {
          setCountryCode(code);
          setLocalPhone(number);
          const formatted = formatPhoneNumber(number, code);
          setDisplayPhone(formatted);
          return;
        }
      }
      
      const digits = phone.replace(/\D/g, '');
      if (digits) {
        setLocalPhone(digits);
        const formatted = formatPhoneNumber(digits, countryCode);
        setDisplayPhone(formatted);
      }
    }
  }, [phone, countryCode]);

  // 🔥 MANEJAR CAMBIO DE PAÍS
  const handleCountryChange = (dialCode: string) => {
    setCountryCode(dialCode);
    setLocalPhone('');
    setDisplayPhone('');
    isInternalUpdate.current = true;
    setPhone(dialCode);
    setTimeout(() => { isInternalUpdate.current = false; }, 0);
  };

  // 🔥 MANEJAR CAMBIO DE NÚMERO DE TELÉFONO
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setLocalPhone(digits);
    const formatted = formatPhoneNumber(digits, countryCode);
    setDisplayPhone(formatted);
    const fullPhone = `${countryCode} ${digits}`.trim();
    setPhone(fullPhone);
  };

  // FUNCIÓN PARA OBTENER DIRECCIÓN DESDE COORDENADAS
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);

    try {
      const result = await reverseGeocode(lat, lng);
      setDeliveryCity(result.display_name);
      if (result.state) setState(result.state);
      if (result.municipality) setMunicipality(result.municipality);
      console.log('📍 Ubicación actualizada:', result);
    } catch (err) {
      console.error('Error en reverseGeocode:', err);
    }
  };

  // MANEJAR SELECCIÓN EN EL MAPA
  const handleMapPointSelect = async (lat: number, lng: number) => {
    await fetchAddressFromCoords(lat, lng);
  };

  // Detectar cambios
  const hasChanges = () => {
    if (!user) return false;
    
    const parsed = user.address ? (() => {
      const match = user.address.match(/^(Casa|Local|Oficina):\s*(.*?),\s*(.*?),\s*(.*?)(?:\s*-\s*Ref:\s*(.*))?$/i);
      if (match) {
        return {
          type: match[1] as 'Casa' | 'Local' | 'Oficina',
          zone: match[2]?.trim() || '',
          street: match[3]?.trim() || '',
          number: match[4]?.trim() || '',
          reference: match[5]?.trim() || '',
        };
      }
      return { type: 'Casa' as const, zone: user.address || '', street: '', number: '', reference: '' };
    })() : { type: 'Casa' as const, zone: '', street: '', number: '', reference: '' };

    const userLat = toNumber(user.latitude ?? user.lat ?? null);
    const userLng = toNumber(user.longitude ?? user.lng ?? null);

    return (
      fullName !== (user.name || '') ||
      phone !== (user.phone || '') ||
      deliveryCity !== (user.deliveryCity || user.city || '') ||
      state !== (user.state || '') ||
      municipality !== (user.municipality || '') ||
      preferredCurrency !== (user.preferredCurrency || 'USD') ||
      latitude !== userLat ||
      longitude !== userLng ||
      addressType !== parsed.type ||
      zone !== parsed.zone ||
      street !== parsed.street ||
      number !== parsed.number ||
      reference !== parsed.reference ||
      idNumber !== (user.id_number || '') ||
      idType !== (user.id_type || 'V') ||
      pagoMovilSameAsProfile !== Boolean(user.pago_movil_same_as_profile) ||
      false
    );
  };

  // Guardar
  const saveProfile = async () => {
    if (!hasChanges()) {
      setErrorMsg('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');


    try {
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
      const token = localStorage.getItem('token') || '';

      const fullAddress = `${addressType}: ${zone || municipality || deliveryCity}, ${street || 'Dirección'}, ${number || 'N/A'}${reference ? ` - Ref: ${reference}` : ''}`;

      const payload: any = {
        name: fullName,
        phone: phone,
        city: deliveryCity,
        address: fullAddress,
        deliveryCity: deliveryCity,
        state: state,
        municipality: municipality,
        preferredCurrency: preferredCurrency,
        latitude: latitude,
        longitude: longitude,
        id_number: idNumber || null,
        id_type: idType || 'V',
        pago_movil_same_as_profile: Boolean(pagoMovilSameAsProfile),
      };

      console.log('📤 Enviando payload:', payload);

      const res = await apiFetch('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      console.log('📥 Respuesta:', responseText);

      if (res.ok) {
        let updatedUser;
        try {
          updatedUser = JSON.parse(responseText);
        } catch {
          updatedUser = { message: responseText };
        }

        setSuccessMsg('¡Tus datos se han actualizado con éxito!');
        setShowSuccessModal(true);

        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }

        // Actualizar localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.name = fullName;
            parsed.phone = phone;
            parsed.deliveryCity = deliveryCity;
            parsed.state = state;
            parsed.municipality = municipality;
            parsed.preferredCurrency = preferredCurrency;
            parsed.address = fullAddress;
            parsed.latitude = latitude;
            parsed.longitude = longitude;
            parsed.id_number = idNumber || null;
            parsed.id_type = idType || 'V';
            parsed.pago_movil_same_as_profile = Boolean(pagoMovilSameAsProfile);
            localStorage.setItem('user', JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('userUpdated'));
          } catch (err) {}
        }

        setSaving(false);
      } else {
        setErrorMsg(responseText || 'Error al actualizar los datos.');
        setSaving(false);
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setErrorMsg('Error de conexión con el servidor.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmationText !== (user?.email || 'eliminar')) {
      setErrorMsg('El correo electrónico no coincide para confirmar la eliminación.');
      return;
    }

    setDeleting(true);
    try {
      const res = await apiFetch('/api/account/profile', {
        method: 'DELETE',
      });

      if (res.ok || res.status === 200) {
        if (onDeleteAccount) {
          onDeleteAccount();
        } else {
          performLogout();
        }
      } else {
        setErrorMsg('Error al eliminar la cuenta.');
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
      setDeleting(false);
    }
  };

  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)');

  // INPUTS CON BORDES VISIBLES EN AMBOS MODOS
  const inputClass = isDarkBg 
    ? `w-full bg-transparent border border-white/20 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-white/40 transition placeholder:text-white/30 text-white`
    : `w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-gray-500 transition placeholder:text-gray-400 text-gray-800`;

  const disabledInputClass = isDarkBg 
    ? `w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs cursor-not-allowed font-medium opacity-60 text-white`
    : `w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs cursor-not-allowed font-medium opacity-70 text-gray-600`;

  const CURRENCIES = [
    { value: 'USD', label: 'Dólares ($)' },
    { value: 'VES', label: 'Bolívares (Bs.)' },
    { value: 'EUR', label: 'Euros (€)' },
    { value: 'CRYPTO', label: 'Criptomonedas' },
  ];

  const addressTypes = ['Casa', 'Local', 'Oficina'] as const;

  if (!user) {
    return <div className="p-6 text-center opacity-60">Cargando perfil...</div>;
  }

  return (
    // 🔥 AÑADIR SCROLL INTERNO - ESTE ES EL CAMBIO CLAVE
    <div className="w-full h-full overflow-y-auto pr-2">
      <div
        className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-[background-color,border-color,box-shadow,color]"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        {/* HEADER CON SEPARADOR */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
          <div>
            <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
              Información Personal
            </h3>
            <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
              Actualiza tus datos de contacto, dirección de entrega y contraseña.
            </p>
          </div>
          <div 
            className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" 
            style={{ borderColor: cardBorder, color: textColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs rounded-xl text-center font-semibold animate-fadeIn">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          {/* NOMBRE */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Tu nombre completo"
            />
          </div>

          {/* TELÉFONO / WHATSAPP CON FORMATO */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
              Teléfono / WhatsApp *
            </label>
            
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-[110px]">
                <select
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={inputClass}
                  style={{ color: textColor }}
                >
                  {COUNTRIES.map((c, index) => (
                    <option key={`${c.dialCode}-${index}`} value={c.dialCode} style={optionStyle}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
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
              <span className={`text-[9px] opacity-40 ${isDarkBg ? 'text-white' : 'text-gray-600'}`}>
                Formato: {COUNTRIES.find(c => c.dialCode === countryCode)?.format || '(###) ###-####'}
              </span>
              {displayPhone && (
                <span className={`text-[9px] opacity-40 ${isDarkBg ? 'text-white' : 'text-gray-600'}`}>
                  {displayPhone.replace(/\D/g, '').length} dígitos
                </span>
              )}
            </div>
          </div>
          {/* EMAIL */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
              Correo Electrónico
            </label>
            <input
              type="text"
              disabled
              value={email}
              className={disabledInputClass}
            />
          </div>

          {/* 🔥 CÉDULA + FLAG PAGO MÓVIL */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80" style={{ color: textColor }}>
              Cédula de Identidad
            </label>
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-[90px]">
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className={inputClass}
                  style={{ color: textColor }}
                >
                  <option value="V" style={optionStyle}>V</option>
                  <option value="E" style={optionStyle}>E</option>
                  <option value="J" style={optionStyle}>J</option>
                  <option value="G" style={optionStyle}>G</option> </select>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 12345678"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className={inputClass}
                  style={{ color: textColor }}
                  maxLength={9}
                />
              </div>
            </div>
            <p className={`text-[9px] opacity-40 mt-1 ${isDarkBg ? 'text-white' : 'text-gray-600'}`}>
              Solo números (sin puntos ni guiones).
            </p>
          </div>

          {/* 🔥 CHECK PAGO MÓVIL */}
          <label
            className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition"
            style={{
              borderColor: pagoMovilSameAsProfile ? primary : cardBorder,
              backgroundColor: pagoMovilSameAsProfile ? `${primary}10` : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={pagoMovilSameAsProfile}
              onChange={(e) => setPagoMovilSameAsProfile(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer flex-shrink-0"
              style={{ accentColor: primary }}
            />
            <div className="flex-1">
              <span className="block text-xs font-bold" style={{ color: textColor }}>
                Usar estos mismos datos para Pago Móvil Personal
              </span>
              <span className={`block text-[10px] mt-0.5 ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
                Al comprar con Pago Móvil, tu teléfono y cédula se completarán automáticamente.
              </span>
            </div>
          </label>

          {/* MAPA Y UBICACIÓN */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-3" style={{ color: textColor }}>
              Ubicación y Zona de Entrega
            </h4>

            <div className="space-y-3">
              {/* Coordenadas */}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono opacity-60 ${isDarkBg ? 'text-white' : 'text-gray-700'}`}>
                  {latitude !== null && longitude !== null
                    ? `📍 Lat: ${Number(latitude).toFixed(4)}, Lng: ${Number(longitude).toFixed(4)}`
                    : '📍 Sin coordenadas seleccionadas'}
                </span>
              </div>

              {/* MAPA INTERACTIVO */}
              <div className={`relative w-full rounded-2xl overflow-hidden border ${isDarkBg ? 'border-white/15' : 'border-gray-300'}`}>
                <LocationMap 
                  lat={latitude} 
                  lng={longitude} 
                  onLocationSelect={handleMapPointSelect}
                />
              </div>

              {/* CIUDAD */}
              <div>
                <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                  Ciudad / Zona de Entrega
                </label>
                <input
                  type="text"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className={inputClass}
                  placeholder="Haz clic en el mapa para seleccionar"
                />
              </div>

              {/* Estado y Municipio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                    Estado
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputClass}
                    placeholder="Selecciona en el mapa"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                    Municipio
                  </label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className={inputClass}
                    placeholder="Selecciona en el mapa"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MONEDA PREFERIDA */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80" style={{ color: textColor }}>
              Moneda Preferida
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CURRENCIES.map((cur) => {
                const isSelected = preferredCurrency === cur.value;
                return (
                  <button
                    key={cur.value}
                    type="button"
                    onClick={() => setPreferredCurrency(cur.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : `bg-transparent ${isDarkBg ? 'hover:bg-white/5 border-white/15 text-white/60' : 'hover:bg-gray-100 border-gray-300 text-gray-700'}`
                    }`}
                    style={isSelected ? { backgroundColor: primary, borderColor: primary, color: '#ffffff' } : {}}
                  >
                    {cur.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIRECCIÓN DETALLADA */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-3" style={{ color: textColor }}>
              Dirección Detallada
            </h4>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {addressTypes.map((type) => {
                const isSelected = addressType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAddressType(type)}
                    className={`py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : `bg-transparent ${isDarkBg ? 'hover:bg-white/5 border-white/15 text-white/60' : 'hover:bg-gray-100 border-gray-300 text-gray-700'}`
                    }`}
                    style={isSelected ? { backgroundColor: primary, borderColor: primary, color: '#ffffff' } : {}}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                  Zona / Urbanización
                </label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Ej. Urb. Los Bucares"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                  Calle / Avenida
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ej. Av. Principal"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                  Nro. Casa / Apto
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ej. #45 o Apto 2B"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1 opacity-70" style={{ color: textColor }}>
                  Punto de Referencia
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej. Cerca de la panadería"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* SEGURIDAD */}
          <div className="pt-2 border-t" style={{ borderColor: cardBorder }}>
            <ProfileSecurity
              textColor={textColor}
              inputClass={inputClass}
              isDarkBg={isDarkBg}
              primary={primary}
            onLogout={() => {
              performLogout();
            }}
            />
          </div>
        </div>

        {/* BOTONES */}
        <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: cardBorder }}>
          <Button
            variant="outline-danger"
            size="lg"
            onClick={() => setShowDeleteModal(true)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
            primary={primary}
            borderColor={cardBorder}
            textColor={textColor}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
          >
            Eliminar mi Cuenta
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={saveProfile}
            disabled={saving || !hasChanges()}
            loading={saving}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            }
            primary={primary}
            borderColor={cardBorder}
            textColor={textColor}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
          >
            {saving ? 'Guardando...' : hasChanges() ? 'Guardar Cambios' : 'Sin Cambios'}
          </Button>
        </div>

        {/* 🔥 MODAL DE ÉXITO (canónico) */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="¡Cambios guardados!"
          message={successMsg || 'Tus datos se han actualizado correctamente en el sistema.'}
          primary={primary}
          borderColor={cardBorder}
          cardBg={cardBg}
          textColor={textColor}
          isDarkBg={isDarkBg}
          accentColor="#22c55e"
          autoCloseMs={0}
          closeLabel="Aceptar"
        />

        {/* MODAL DE ELIMINACIÓN */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
              className="w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 text-center"
              style={{ backgroundColor: cardBg, borderColor: 'rgba(244,63,94,0.3)', color: textColor }}
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-rose-500">¿Estás completamente seguro?</h3>
                <p className="text-xs opacity-80">
                  Esta acción es irreversible. Se eliminará tu perfil y todo tu historial asociado.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-left">
                <label className="block text-[11px] font-semibold opacity-80" style={{ color: textColor }}>
                  Para confirmar, escribe tu correo electrónico: <span className="font-bold text-rose-500">{user?.email}</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder={user?.email}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-center gap-3 pt-4 border-t" style={{ borderColor: cardBorder }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-100 opacity-80 ${
                    isDarkBg ? 'border-white/20 text-white/60 hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmationText !== (user?.email || '') || deleting}
                  onClick={handleDelete}
                  className="flex-1 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}