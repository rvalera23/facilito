'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Falta el token en el link.');
      return;
    }

    const run = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const res = await fetch(
          `${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
          throw new Error(msg || 'No se pudo verificar el email');
        }

        setState('success');
        setMessage(data.message || 'Email verificado correctamente.');

        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            u.emailVerified = true;
            localStorage.setItem('user', JSON.stringify(u));
            window.dispatchEvent(new CustomEvent('authChanged'));
          }
        } catch {}
      } catch (e: any) {
        setState('error');
        setMessage(e.message || 'No se pudo verificar el email.');
      }
    };

    run();
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(234, 88, 12, 0.12) 0%, transparent 55%), #0b0f19',
      }}
    >
      <div className="max-w-md w-full bg-slate-900/60 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
        {state === 'loading' && (
          <>
            <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-black text-white mb-2">Verificando tu email...</h1>
            <p className="text-sm text-slate-400">Un momento por favor.</p>
          </>
        )}

        {state === 'success' && (
          <>
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
            <h1 className="text-xl font-black text-white mb-2">¡Email verificado!</h1>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <Link
              href="/mi-cuenta"
              className="inline-block px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:opacity-90 transition"
            >
              Ir a mi cuenta
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
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
            <h1 className="text-xl font-black text-white mb-2">No se pudo verificar</h1>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:opacity-90 transition"
            >
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
