// ==========================================
// ARCHIVO: app/onboarding/components/StepRoleSelection.tsx
// ==========================================
'use client';

import React, { useState, useEffect } from 'react';
// ARRIBA
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface StepRoleSelectionProps {
  data?: {
    name?: string;
    email?: string;
  };
  onNext: (role: string) => void;
  onUserRegistered: (userData: any) => void;
  activePalette: {
    primary: string;
  };
  textColorClass: string;
  mutedTextColorClass: string;
  isLight: boolean;
  cardBgStyle: string;
}

export default function StepRoleSelection({ 
  data, 
  onNext, 
  onUserRegistered, 
  activePalette,
  textColorClass,
  mutedTextColorClass,
  isLight,
  cardBgStyle 
}: StepRoleSelectionProps) {
  // Cambiamos el estado local para controlar las vistas internas de este paso
  const [stepView, setStepView] = useState<'form' | 'roles'>('form');
  
  const [name, setName] = useState(data?.name || '');
  const [email, setEmail] = useState(data?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'exists'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const savedUserName = data?.name || name || '';

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle');
      return;
    }

    const checkEmail = async () => {
      setEmailStatus('checking');
      try {
        const res = await fetch(`${API_URL}/api/auth/check-email?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const resData = await res.json();
          setEmailStatus(resData.exists || resData.registered ? 'exists' : 'available');
        } else {
          setEmailStatus('idle');
        }
      } catch {
        setEmailStatus('idle');
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // 🔥 Misma política que el backend (password-policy.ts):
  // mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número.
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const PASSWORD_MESSAGE =
    'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';

  const validatePassword = (pass: string) => {
    if (!PASSWORD_REGEX.test(pass)) {
      return PASSWORD_MESSAGE;
    }
    return null;
  };

const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  const passError = validatePassword(password);
  if (passError) {
    setError(passError);
    return;
  }
  if (emailStatus === 'exists') {
    setError('El correo electrónico ya se encuentra registrado.');
    return;
  }

  setLoading(true);

  try {
    // ✅ CREAR ID TEMPORAL (NO REGISTRA EN BD)
    const tempId = 'temp_' + Date.now();
    localStorage.setItem('temp_userId', tempId);

    const tempUserData = {
      id: tempId,        // ✅ AHORA TIENE ID
      userId: tempId,    // ✅ AHORA TIENE USERID
      name,
      email,
      password,
    };

    console.log('[DEBUG StepRoleSelection] Datos con ID:', tempUserData);
    
    onUserRegistered(tempUserData);
    setStepView('roles');
  } catch (err: any) {
    console.error('[CRITICAL ERROR StepRoleSelection]', err);
    setError(err.message || 'Error al procesar los datos');
  } finally {
    setLoading(false);
  }
};


  // 🔥 SIN fondo. Transparente, solo borde. Como Nombre/WhatsApp del paso 4.
  const inputBg = 'transparent';
  const inputBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  // Vista 1: Formulario de Registro (Nombre, Email, Contraseña)
  if (stepView === 'form') {
    return (
      <div className="max-w-md w-full mx-auto animate-fadeIn p-4 relative">
        <div className="text-center mb-8 relative z-10">
          <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${textColorClass}`}>
            Crea tu cuenta
          </h2>

          <p className={`text-sm ${mutedTextColorClass} leading-relaxed max-w-xs mx-auto`}>
            Ingresa tus datos básicos para comenzar el proceso de configuración.
          </p>

          {name.trim() && (
            <p className="text-xs font-bold pt-3 animate-fadeIn" style={{ color: activePalette.primary }}>
              ¡Hola, {name.trim()}!
            </p>
          )}
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-4 relative z-10">
          {error && (
            <div 
              className="p-3 text-sm rounded-xl text-center border animate-shake"
              style={{ 
                backgroundColor: isLight ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: isLight ? '#b91c1c' : '#fca5a5'
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label className={`block text-xs font-semibold tracking-wide mb-1.5 ${textColorClass}`}>
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                // 🔥 Capitalizar cada palabra: "juan pérez" → "Juan Pérez"
                const raw = e.target.value;
                const formatted = raw
                  .toLowerCase()
                  .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
                setName(formatted);
              }}
              autoComplete="name"
              spellCheck={false}
              autoCapitalize="words"
              className={`w-full px-4 py-3 text-sm rounded-xl ${textColorClass} outline-none transition-all duration-200`}
              style={{ 
                backgroundColor: inputBg, 
                border: `1px solid ${inputBorder}`
              }}
              onFocus={(e) => {
                e.target.style.borderColor = activePalette.primary;
                e.target.style.boxShadow = `0 0 0 3px ${activePalette.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = inputBorder;
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Ej. José Rodriguez"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className={`block text-xs font-semibold tracking-wide ${textColorClass}`}>
                Correo Electrónico
              </label>
              {emailStatus === 'available' && <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">✓ Disponible</span>}
              {emailStatus === 'exists' && <span className="text-xs text-red-500 font-bold flex items-center gap-1">✕ Ya registrado</span>}
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                // 🔥 Forzar minúscula SIEMPRE (ignora CapsLock/Shift)
                setEmail(e.target.value.toLowerCase());
              }}
              autoComplete="email"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className={`w-full px-4 py-3 text-sm rounded-xl ${textColorClass} outline-none transition-all duration-200`}
              style={{ 
                backgroundColor: inputBg, 
                border: `1px solid ${inputBorder}`
              }}
              onFocus={(e) => {
                e.target.style.borderColor = activePalette.primary;
                e.target.style.boxShadow = `0 0 0 3px ${activePalette.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = inputBorder;
                e.target.style.boxShadow = 'none';
              }}
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold tracking-wide mb-1.5 ${textColorClass}`}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className={`w-full pl-4 pr-12 py-3 text-sm rounded-xl ${textColorClass} outline-none transition-all duration-200`}
                style={{ 
                  backgroundColor: inputBg, 
                  border: `1px solid ${inputBorder}`
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = activePalette.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${activePalette.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = inputBorder;
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${mutedTextColorClass} hover:${textColorClass} cursor-pointer focus:outline-none transition-colors p-1`}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 🔥 Barra de complejidad (mismo componente que el perfil) */}
            {password && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || emailStatus === 'exists'}
            className="w-full py-3.5 px-6 text-white text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-50 hover:opacity-95 active:scale-[0.99] mt-6 shadow-lg"
            style={{ 
              backgroundColor: activePalette.primary,
              boxShadow: `0 10px 25px -5px ${activePalette.primary}50`
            }}
          >
            {loading ? 'Validando...' : 'Continuar al siguiente paso'}
          </button>
        </form>
      </div>
    );
  }

  // Vista 2: Selección de Rol (Comprador / Vendedor)
  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-fadeIn w-full max-w-4xl mx-auto py-6 px-4">
      <div className="text-center space-y-2">
        {savedUserName && (
          <p className="text-xs font-bold mb-2 tracking-wide uppercase" style={{ color: activePalette.primary }}>
            Excelente, {savedUserName}.
          </p>
        )}
        <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${textColorClass}`}>
                    ¿Cómo quieres empezar en facil<span style={{ color: activePalette.primary }}>i</span>to?
                  
                  </h2>
        <p className={`${mutedTextColorClass} text-sm max-w-sm mx-auto`}>
          Elige tu rol ideal para adaptar la experiencia a tus necesidades:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
        
        {/* Opción Comprador */}
        <button
          onClick={() => onNext('buyer')}
          className="group relative p-10 sm:p-12 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.03] text-left space-y-6 cursor-pointer backdrop-blur-2xl overflow-hidden flex flex-col justify-between"
          style={{ 
            backgroundColor: cardBgStyle, 
            borderColor: `${activePalette.primary}35`,
            boxShadow: `0 25px 50px -15px ${activePalette.primary}15`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = activePalette.primary;
            e.currentTarget.style.boxShadow = `0 30px 60px -15px ${activePalette.primary}35`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${activePalette.primary}35`;
            e.currentTarget.style.boxShadow = `0 25px 50px -15px ${activePalette.primary}15`;
          }}
        >
          <div 
            className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-10 group-hover:opacity-25 transition-all duration-700 pointer-events-none"
            style={{ backgroundColor: activePalette.primary }}
          />

          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-inner relative z-10 border"
            style={{ backgroundColor: `${activePalette.primary}10`, borderColor: `${activePalette.primary}30`, color: activePalette.primary }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${activePalette.primary}15`, color: activePalette.primary }}>
              Experiencia de consumo
            </div>
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${textColorClass}`}>Quiero Comprar</h3>
            <p className={`text-base ${mutedTextColorClass} leading-relaxed`}>
              Busca productos, compara precios y gestiona tus pedidos fácilmente con una interfaz optimizada.
            </p>
          </div>

          <div className="pt-2 relative z-10 flex items-center gap-2 text-sm font-bold transition-transform group-hover:translate-x-1" style={{ color: activePalette.primary }}>
            <span>Elegir comprador</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>

        {/* Opción Vendedor */}
        <button
          onClick={() => onNext('seller')}
          className="group relative p-10 sm:p-12 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.03] text-left space-y-6 cursor-pointer backdrop-blur-2xl overflow-hidden flex flex-col justify-between"
          style={{ 
            backgroundColor: cardBgStyle, 
            borderColor: `${activePalette.primary}35`,
            boxShadow: `0 25px 50px -15px ${activePalette.primary}15`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = activePalette.primary;
            e.currentTarget.style.boxShadow = `0 30px 60px -15px ${activePalette.primary}35`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${activePalette.primary}35`;
            e.currentTarget.style.boxShadow = `0 25px 50px -15px ${activePalette.primary}15`;
          }}
        >
          <div 
            className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-10 group-hover:opacity-25 transition-all duration-700 pointer-events-none"
            style={{ backgroundColor: activePalette.primary }}
          />

          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-inner relative z-10 border"
            style={{ backgroundColor: `${activePalette.primary}10`, borderColor: `${activePalette.primary}30`, color: activePalette.primary }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${activePalette.primary}15`, color: activePalette.primary }}>
              Gestión comercial
            </div>
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${textColorClass}`}>Quiero Vender</h3>
            <p className={`text-base ${mutedTextColorClass} leading-relaxed`}>
              Crea tu tienda virtual, gestiona tu inventario con atributos dinámicos y recibe pagos directos.
            </p>
          </div>

          <div className="pt-2 relative z-10 flex items-center gap-2 text-sm font-bold transition-transform group-hover:translate-x-1" style={{ color: activePalette.primary }}>
            <span>Elegir vendedor</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>

      </div>
    </div>
  );
}