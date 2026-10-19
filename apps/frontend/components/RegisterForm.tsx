// ==========================================
// ARCHIVO: components/RegisterForm.tsx
// ==========================================
'use client';

import { useState, useEffect } from 'react';

interface RegisterFormProps {
  onSuccess: (data: any, isRegister: boolean) => void;
  // Añadimos estas props para poder controlar el comportamiento desde el Onboarding
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

export default function RegisterForm({ 
  onSuccess, 
  title = "Crea una nueva cuenta", 
  subtitle = "Empieza a usar facilitó",
  buttonText = "Crear Cuenta" 
}: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'exists'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLight, setIsLight] = useState<boolean>(false);

  useEffect(() => {
    const checkBackgroundBrightness = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          setIsLight((r * 299 + g * 587 + b * 114) / 1000 > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailStatus('idle');
      return;
    }

    const checkEmail = async () => {
      setEmailStatus('checking');
      try {
        const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
        const res = await fetch(`${apiBase}/api/auth/check-email?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setEmailStatus(data.exists || data.registered ? 'exists' : 'available');
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

  const validatePassword = (pass: string) => {
    if (pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (/(.)\1{2,}/.test(pass)) return 'La contraseña no puede contener tantos caracteres repetidos.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
      const response = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en el registro');

      onSuccess(data, true);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-slate-400';
  const labelColor = isLight ? 'text-slate-800' : 'text-slate-300';
  const inputBg = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.25)';
  const inputBorder = isLight ? 'border-slate-900/20' : 'border-white/15';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center justify-center pb-2">
        <span className={`text-2xl font-black tracking-tight ${textColor} transition-colors duration-500`}>
                    facil<span style={{ color: 'var(--accent-color, #F59E0B)' }}>i</span>to
                  </span>
        <span className={`text-[11px] ${mutedTextColor} mt-0.5 transition-colors duration-500`}>{title}</span>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl text-center">{error}</div>}
      
      <div>
        <label className={`block text-xs font-bold ${labelColor} mb-1 transition-colors duration-500`}>Nombre Completo</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3.5 py-2.5 text-xs border ${inputBorder} rounded-xl ${textColor} outline-none transition-all focus:ring-2`}
          style={{ backgroundColor: inputBg, '--tw-ring-color': 'var(--accent-color, #F59E0B)' } as React.CSSProperties}
          placeholder="Tu Nombre"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className={`block text-xs font-bold ${labelColor} transition-colors duration-500`}>Correo Electrónico</label>
          {emailStatus === 'available' && <span className="text-[10px] text-emerald-500 font-semibold">✓ Disponible</span>}
          {emailStatus === 'exists' && <span className="text-[10px] text-red-500 font-semibold">✕ Ya registrado</span>}
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full px-3.5 py-2.5 text-xs border ${inputBorder} rounded-xl ${textColor} outline-none transition-all focus:ring-2`}
          style={{ backgroundColor: inputBg, '--tw-ring-color': 'var(--accent-color, #F59E0B)' } as React.CSSProperties}
          placeholder="tu@correo.com"
        />
      </div>

      <div>
        <label className={`block text-xs font-bold ${labelColor} mb-1 transition-colors duration-500`}>Contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full pl-3.5 pr-10 py-2.5 text-xs border ${inputBorder} rounded-xl ${textColor} outline-none transition-all focus:ring-2`}
            style={{ backgroundColor: inputBg, '--tw-ring-color': 'var(--accent-color, #F59E0B)' } as React.CSSProperties}
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${mutedTextColor} hover:${textColor} text-xs cursor-pointer focus:outline-none transition-colors`}
          >
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || emailStatus === 'exists'}
        className="w-full py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-color, #F59E0B)' }}
      >
        {loading ? 'Procesando...' : buttonText}
      </button>
    </form>
  );
}