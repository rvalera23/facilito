'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';

interface VerifyEmailBannerProps {
  primaryColor?: string;
  isLight?: boolean;
}

/**
 * Banner de advertencia cuando el usuario no verificó su email.
 * Se oculta solo cuando el user.emailVerified es true, o cuando el usuario
 * cierra manualmente el banner (por sesión).
 */
export default function VerifyEmailBanner({
  primaryColor = '#ea580c',
  isLight = false,
}: VerifyEmailBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Si ya está verificado o no hay user logueado, no mostrar
  if (!user || user.emailVerified === true) return null;
  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      const res = await apiFetch('/api/auth/send-verification', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.status === 429) {
        const retry = data.retryAfter ? ` Reintentá en ${Math.ceil(data.retryAfter / 60)} min.` : '';
        throw new Error(`Demasiados intentos.${retry}`);
      }
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'No se pudo enviar el email');
      }

      setSent(true);
      setTimeout(() => setSent(false), 6000);
    } catch (e: any) {
      setError(e.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const bgColor = isLight ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.10)';
  const borderColor = 'rgba(251, 191, 36, 0.35)';
  const textColor = isLight ? '#78350f' : '#fcd34d';
  const mutedColor = isLight ? '#92400e' : '#fbbf24';

  return (
    <div
      className="w-full px-4 py-3 rounded-2xl border flex items-start sm:items-center gap-3 shadow-sm transition-all"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      {/* Ícono de alerta */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="#fbbf24"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: textColor }}>
          Verificá tu email para acceder a todas las funciones
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>
          {sent
            ? 'Te enviamos un email con el link de verificación. Revisá tu bandeja de entrada.'
            : 'Confirmá tu dirección para asegurar tu cuenta. Revisá la bandeja de entrada o reenviá el email.'}
        </p>
        {error && (
          <p className="text-[11px] mt-1 font-semibold text-red-400">{error}</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!sent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="text-xs font-bold px-3.5 py-2 rounded-xl text-white transition disabled:opacity-50 cursor-pointer whitespace-nowrap shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#f59e0b' }}
          >
            {sending ? 'Enviando...' : 'Reenviar email'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-bold px-2 py-1.5 rounded-lg transition cursor-pointer"
          style={{ color: mutedColor }}
          title="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
