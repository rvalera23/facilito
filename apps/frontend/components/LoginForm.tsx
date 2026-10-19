'use client';

import { useState, useEffect, useRef } from 'react';

interface LoginFormProps {
  onSuccess: (data: any) => void;
  onOpenForgotPassword: () => void;
  textColorClass: string;
  mutedTextColorClass: string;
  labelColorClass: string;
  inputBg: string;
  inputBorder: string;
  primaryColor: string;
  backgroundColor: string;
  isLight: boolean;
  secondaryColor?: string;
  brandName?: string;
  brandLogoUrl?: string | null;
  hideExtras?: boolean;   // 🔥 NUEVO: oculta forgot + remember + registro (kiosco)
}

const COMMON_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'protonmail.com'];

export default function LoginForm({ 
  onSuccess, 
  onOpenForgotPassword,
  textColorClass,
  mutedTextColorClass,
  labelColorClass,
  inputBg: inputBgProp,
  inputBorder: inputBorderProp,
  primaryColor,
  backgroundColor,
  isLight,
  secondaryColor,
  brandName = 'facilito',
  brandLogoUrl = null,
  hideExtras = false,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'not-found' | 'exists'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 Fase 4: 2FA
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [filteredDomains, setFilteredDomains] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!email.includes('@')) {
      setShowDomainSuggestions(false);
      setFilteredDomains([]);
      setSelectedSuggestionIndex(-1);
      return;
    }

    const parts = email.split('@');
    const prefix = parts[0] || '';
    const domain = parts[1] || '';

    setEmailPrefix(prefix);
    setEmailDomain(domain);

    if (domain) {
      const filtered = COMMON_DOMAINS.filter(d => d.startsWith(domain.toLowerCase()));
      setFilteredDomains(filtered);
      setShowDomainSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setFilteredDomains(COMMON_DOMAINS);
      setShowDomainSuggestions(true);
      setSelectedSuggestionIndex(-1);
    }
  }, [email]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDomainSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDomainSuggestions || filteredDomains.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < filteredDomains.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(filteredDomains[selectedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowDomainSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDomainSuggestions, filteredDomains, selectedSuggestionIndex]);

  const applySuggestion = (domain: string) => {
    const newEmail = `${emailPrefix}@${domain}`;
    setEmail(newEmail);
    setShowDomainSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setFilteredDomains([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleSuggestionClick = (domain: string) => {
    applySuggestion(domain);
  };

  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionRefs.current[selectedSuggestionIndex]) {
      suggestionRefs.current[selectedSuggestionIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedSuggestionIndex]);

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle');
      return;
    }

    const checkEmailExists = async () => {
      setEmailStatus('checking');
      try {
        const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/auth/check-email?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setEmailStatus(data.exists || data.registered ? 'exists' : 'not-found');
        } else {
          setEmailStatus('idle');
        }
      } catch {
        setEmailStatus('idle');
      }
    };

    const timer = setTimeout(checkEmailExists, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Credenciales inválidas');

      // 🔥 Fase 4: 2FA requerido → pasamos al segundo paso
      if (data.requiresTwoFactor && data.tempToken) {
        setRequiresTwoFactor(true);
        setTempToken(data.tempToken);
        setTotpCode('');
        setError('');
        return;
      }

      if (data.user && data.user.role) {
        data.user.role = data.user.role.toLowerCase();
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Fase 4: verificar código 2FA (TOTP o backup code)
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';

      const endpoint = showBackupInput ? '/api/auth/2fa/backup-code' : '/api/auth/2fa/verify';
      const body = showBackupInput
        ? { tempToken, backupCode }
        : { tempToken, code: totpCode };

      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'Código inválido');
      }

      if (data.user && data.user.role) {
        data.user.role = data.user.role.toLowerCase();
      }

      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setRequiresTwoFactor(false);
    setTempToken('');
    setTotpCode('');
    setBackupCode('');
    setShowBackupInput(false);
    setError('');
  };

  // 🔥 Si estamos en modo 2FA, mostramos una UI distinta
  if (requiresTwoFactor) {
    const subText = isLight ? 'text-slate-600' : 'text-slate-400';
    const lblText = isLight ? 'text-slate-800' : 'text-slate-300';

    return (
      <form onSubmit={handleVerify2FA} className="space-y-4">
        <div className="flex flex-col items-center justify-center pb-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: `${primaryColor}22` }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke={primaryColor}
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <span className={`text-[11px] ${subText} mt-0.5 text-center`}>
            Ingresá el código de tu app de autenticación
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        {!showBackupInput ? (
          <>
            <div>
              <label className={`block text-xs font-bold ${lblText} mb-1`}>
                Código de 6 dígitos
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                placeholder="000000"
                className={`w-full px-3.5 py-2.5 border ${inputBorderProp} rounded-xl ${textColorClass} outline-none transition-all text-center text-2xl font-mono tracking-[0.5em]`}
                style={{ backgroundColor: inputBgProp, '--tw-ring-color': primaryColor } as React.CSSProperties}              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <div className="text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowBackupInput(true);
                  setError('');
                }}
                className={`${subText} hover:underline cursor-pointer`}
              >
                ¿Perdiste tu dispositivo?
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={`block text-xs font-bold ${lblText} mb-1`}>
                Código de respaldo
              </label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                autoFocus
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className={`w-full px-3.5 py-2.5 border ${inputBorderProp} rounded-xl ${textColorClass} outline-none transition-all text-center font-mono tracking-wider text-sm`}
                style={{ backgroundColor: inputBgProp, '--tw-ring-color': primaryColor } as React.CSSProperties}
                              />
              <p className={`text-[10px] ${subText} mt-1 text-center`}>
                Formato: XXXX-XXXX-XXXX-XXXX
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !backupCode}
              className="w-full py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Verificando...' : 'Usar código de respaldo'}
            </button>

            <div className="text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowBackupInput(false);
                  setError('');
                }}
                className={`${subText} hover:underline cursor-pointer`}
              >
                Volver al código de 6 dígitos
              </button>
            </div>
          </>
        )}

        <div className="text-center text-xs pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={handleBackToPassword}
            className={`${subText} hover:underline cursor-pointer`}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center justify-center pb-2">
        {brandLogoUrl ? (
          <img
            src={brandLogoUrl}
            alt={brandName}
            className="h-12 w-auto object-contain mb-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : brandName.toLowerCase() === 'facilito' ? (
          // 🔥 Branding por defecto de la plataforma con la "í" coloreada
          <span
            className={`text-2xl font-black tracking-tight ${textColorClass} transition-colors duration-500`}
          >
            facil<span style={{ color: primaryColor }}>i</span>to
          </span>
        ) : (
          <span
            className={`text-2xl font-black tracking-tight ${textColorClass} transition-colors duration-500`}
          >
            {brandName}
          </span>
        )}
        <span className={`text-[11px] ${mutedTextColorClass} mt-0.5 transition-colors duration-500`}>
          Inicia sesión en tu cuenta
        </span>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl text-center">{error}</div>}

      <div className="relative" ref={containerRef}>
        <div className="flex justify-between items-center mb-1">
          <label className={`block text-xs font-bold ${labelColorClass} transition-colors duration-500`}>Correo Electrónico</label>
          {emailStatus === 'not-found' && <span className="text-[10px] text-amber-500 font-semibold">No registrado</span>}
          {emailStatus === 'exists' && <span className="text-[10px] text-emerald-500 font-semibold">Registrado</span>}
        </div>
        <input
          ref={inputRef}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => {
            if (email.includes('@')) {
              const parts = email.split('@');
              const domain = parts[1] || '';
              if (domain) {
                const filtered = COMMON_DOMAINS.filter(d => d.startsWith(domain.toLowerCase()));
                if (filtered.length > 0) {
                  setFilteredDomains(filtered);
                  setShowDomainSuggestions(true);
                }
              } else {
                setFilteredDomains(COMMON_DOMAINS);
                setShowDomainSuggestions(true);
              }
            }
          }}
          className={`w-full px-3.5 py-2.5 text-xs border ${inputBorderProp} rounded-xl ${textColorClass} outline-none transition-all focus:ring-2`}
          style={{ backgroundColor: inputBgProp, '--tw-ring-color': primaryColor } as React.CSSProperties}
          placeholder="tu@correo.com"
        />

        {showDomainSuggestions && filteredDomains.length > 0 && (
          <div 
            className="absolute z-50 w-full mt-1 rounded-lg shadow-xl border overflow-hidden"
            style={{ 
              backgroundColor: backgroundColor,
              borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
            }}
          >
            {filteredDomains.map((domain, index) => (
              <div
                key={domain}
                ref={el => { suggestionRefs.current[index] = el; }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(domain);
                }}
                className={`px-3 py-1.5 text-[10px] cursor-pointer transition-colors flex items-center justify-between`}
                style={{ 
                  backgroundColor: selectedSuggestionIndex === index ? primaryColor : 'transparent',
                  color: selectedSuggestionIndex === index ? '#ffffff' : isLight ? '#0f172a' : '#f1f5f9',
                }}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
              >
                <span>{emailPrefix}@{domain}</span>
                <span className="text-[9px]" style={{ opacity: selectedSuggestionIndex === index ? 0.7 : 0.3 }}>↵</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className={`block text-xs font-bold ${labelColorClass} transition-colors duration-500`}>Contraseña</label>
          {!hideExtras && (
            <button
              type="button"
              onClick={onOpenForgotPassword}
              className="text-[11px] hover:underline font-medium cursor-pointer transition-colors"
              style={{ color: primaryColor }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full pl-3.5 pr-10 py-2.5 text-xs border ${inputBorderProp} rounded-xl ${textColorClass} outline-none transition-all focus:ring-2`}
            style={{ backgroundColor: inputBgProp, '--tw-ring-color': primaryColor } as React.CSSProperties}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${mutedTextColorClass} hover:${textColorClass} cursor-pointer focus:outline-none transition-colors p-1`}
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
      </div>

      {!hideExtras && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-2 cursor-pointer accent-current"
            style={{ 
              accentColor: primaryColor,
              borderColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            }}
          />
          <label htmlFor="rememberMe" className={`ml-2 text-xs ${mutedTextColorClass} cursor-pointer select-none`}>
            Recordarme
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? 'Procesando...' : 'Iniciar Sesión'}
      </button>

      {!hideExtras && (
        <div className="text-center pt-2">
          <p className={`text-xs ${mutedTextColorClass}`}>
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => {
                window.location.href = '/onboarding';
              }}
              className="font-bold hover:underline cursor-pointer transition-colors"
              style={{ color: primaryColor }}
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      )}
    </form>
  );
}
