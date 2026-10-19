'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Requisitos de password
  const hasMin = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isStrong = hasMin && hasUpper && hasLower && hasNumber;
  const matches = password.length > 0 && password === confirm;

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Falta el token en el link. Pedí un nuevo enlace de recuperación.');
      return;
    }
    setState('form');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) {
      setMessage('La contraseña no cumple los requisitos mínimos.');
      return;
    }
    if (!matches) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'No se pudo restablecer la contraseña');
      }

      setState('success');
      setMessage(data.message || 'Contraseña restablecida correctamente.');

      // Redirigir al login después de 2.5s
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (e: any) {
      setState('error');
      setMessage(e.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(234, 88, 12, 0.12) 0%, transparent 55%), #0b0f19',
      }}
    >
      <div className="max-w-md w-full bg-slate-900/60 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
        {state === 'loading' && (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-black text-white mb-2">Verificando enlace...</h1>
            <p className="text-sm text-slate-400">Un momento por favor.</p>
          </div>
        )}

        {state === 'form' && (
          <>
            <div className="text-center mb-6">
              <div
                className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(234, 88, 12, 0.15)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="#ea580c"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-black text-white mb-2">Restablecer contraseña</h1>
              <p className="text-sm text-slate-400">
                Ingresá tu nueva contraseña.
              </p>
            </div>

            {message && state !== 'form' && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-600 transition"
                />
              </div>

              {/* Barra de requisitos */}
              <div className="space-y-1.5 pt-1">
                {[
                  { ok: hasMin, text: 'Mínimo 8 caracteres' },
                  { ok: hasUpper, text: 'Una mayúscula' },
                  { ok: hasLower, text: 'Una minúscula' },
                  { ok: hasNumber, text: 'Un número' },
                  { ok: matches, text: 'Las contraseñas coinciden' },
                ].map((r) => (
                  <div key={r.text} className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${
                        r.ok ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                    <span className={r.ok ? 'text-emerald-400' : 'text-slate-400'}>
                      {r.text}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || !isStrong || !matches}
                className="w-full mt-2 px-5 py-3 rounded-xl bg-orange-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div
              className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="#10b981"
                className="w-8 h-8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-white mb-2">¡Contraseña restablecida!</h1>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:opacity-90 transition"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div
              className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="#ef4444"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-black text-white mb-2">No se pudo restablecer</h1>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:opacity-90 transition"
            >
              Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
