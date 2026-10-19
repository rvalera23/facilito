// ==========================================
// ARCHIVO: components/ForgotPasswordModal.tsx
// ==========================================
'use client';

import { useState, useEffect } from 'react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
      const response = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429) {
        const retry = data.retryAfter ? ` Reintentá en ${Math.ceil(data.retryAfter / 60)} min.` : '';
        throw new Error(`Demasiados intentos.${retry}`);
      }

      if (!response.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'Error al solicitar recuperación');
      }

      // El backend responde siempre 200 con mensaje genérico (no revela si el email existe)
      setMessage(
        data.message ||
        'Si el email existe, te enviamos un link para restablecer tu contraseña.',
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className={`relative w-full max-w-sm rounded-3xl shadow-2xl p-6 border ${inputBorder} transition-colors duration-300`}
        style={{ backgroundColor: 'var(--bg-color, #09090B)' }}
      >
        <button 
          onClick={onClose} 
          className={`absolute top-4 right-4 ${mutedTextColor} hover:${textColor} cursor-pointer transition-colors`}
        >
          ✕
        </button>

        {/* Logotipo institucional y cabecera */}
        <div className="flex flex-col items-center justify-center pb-3">
          <span className={`text-xl font-black tracking-tight ${textColor} transition-colors duration-500`}>
                        facil<span style={{ color: 'var(--accent-color, #F59E0B)' }}>í</span>to
                      </span>
          <h3 className={`text-xs font-bold ${labelColor} mt-1 transition-colors duration-500`}>Recuperar Contraseña</h3>
          <p className={`text-[11px] ${mutedTextColor} text-center mt-0.5 transition-colors duration-500`}>Ingresa tu correo para enviarte los pasos de recuperación.</p>
        </div>

        {error && <div className="mb-3 p-2 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl text-center">{error}</div>}
        {message && <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl text-center">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3.5 py-2.5 text-xs border ${inputBorder} rounded-xl ${textColor} outline-none transition-all focus:ring-2`}
            style={{ 
              backgroundColor: inputBg,
              '--tw-ring-color': 'var(--accent-color, #F59E0B)' 
            } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 hover:opacity-95"
            style={{ backgroundColor: 'var(--accent-color, #F59E0B)' }}
          >
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
          </button>
        </form>
      </div>
    </div>
  );
}