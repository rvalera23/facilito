'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface TwoFactorSetupProps {
  textColor: string;
  inputClass: string;
  isDarkBg: boolean;
  primary: string;
  /** Estado inicial: si el usuario ya tiene 2FA activo */
  initialEnabled: boolean;
}

type WizardStep = 'idle' | 'qr' | 'verify' | 'backup' | 'disable' | 'done';

export default function TwoFactorSetup({
  textColor,
  inputClass,
  isDarkBg,
  primary,
  initialEnabled,
}: TwoFactorSetupProps) {
  const [enabled, setEnabled] = useState(initialEnabled);

  // 🔥 Sincronizar con el padre cuando cambia initialEnabled
  // (porque el fetch de /2fa/status puede resolver DESPUÉS del primer render)
  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);
    const [step, setStep] = useState<WizardStep>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos del setup
  const [secret, setSecret] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Inputs
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep('idle');
    setError('');
    setCode('');
    setDisableCode('');
    setSecret('');
    setQrCodeDataUrl('');
    setBackupCodes([]);
    setCopied(false);
  };

  // ============================================================
  // START SETUP
  // ============================================================
  const handleStartSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'No se pudo iniciar el setup');
      }
      setSecret(data.secret);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setBackupCodes(data.backupCodes || []);
      setStep('qr');
    } catch (e: any) {
      setError(e.message || 'Error al iniciar setup');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VERIFY SETUP
  // ============================================================
  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'Código inválido');
      }
      setStep('backup');
    } catch (e: any) {
      setError(e.message || 'Error al verificar');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FINISH SETUP
  // ============================================================
  const handleFinish = () => {
    setEnabled(true);
    setStep('done');
    setTimeout(() => {
      reset();
    }, 3000);
  };

  // ============================================================
  // COPY / DOWNLOAD
  // ============================================================
  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  const handleDownloadCodes = () => {
    const content = `facilito — Códigos de respaldo 2FA\n\nGenerados: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nGuardá estos códigos en un lugar seguro.\nCada uno sirve una sola vez.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facilito-2fa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // DISABLE
  // ============================================================
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (disableCode.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'No se pudo desactivar');
      }
      setEnabled(false);
      setStep('idle');
      setDisableCode('');
    } catch (e: any) {
      setError(e.message || 'Error al desactivar');
    } finally {
      setLoading(false);
    }
  };

  const subTextClass = isDarkBg ? 'text-slate-400' : 'text-slate-600';

  // ============================================================
  // RENDER
  // ============================================================

  // Estado "done" (éxito tras activar)
  if (step === 'done') {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          2FA (Autenticación en 2 pasos)
        </h4>
        <div
          className="p-4 rounded-xl border flex items-start gap-3"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#10b981" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400">2FA activado correctamente</p>
            <p className={`text-[11px] mt-0.5 ${subTextClass}`}>
              La próxima vez que inicies sesión te vamos a pedir un código.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado "qr": mostrar QR + secret
  if (step === 'qr') {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          2FA — Paso 1 de 3
        </h4>
        <p className={`text-[11px] ${subTextClass}`}>
          Escaneá este código con Google Authenticator, Authy, 1Password o cualquier app TOTP.
        </p>
        {qrCodeDataUrl && (
          <div className="flex justify-center p-4 bg-white rounded-2xl">
            <img src={qrCodeDataUrl} alt="QR 2FA" className="w-48 h-48" />
          </div>
        )}
        <div className={`text-[11px] ${subTextClass}`}>
          <p className="mb-1">¿No podés escanear? Ingresá este código manualmente:</p>
          <code
            className="block p-2 rounded-lg font-mono text-[11px] select-all break-all"
            style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: textColor }}
          >
            {secret}
          </code>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep('verify')}
            className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Ya lo escaneé → Siguiente
          </button>
          <button
            type="button"
            onClick={reset}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${isDarkBg ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-700'}`}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Estado "verify": input del código de 6 dígitos
  if (step === 'verify') {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          2FA — Paso 2 de 3
        </h4>
        <p className={`text-[11px] ${subTextClass}`}>
          Ingresá el código de 6 dígitos que muestra tu app.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] rounded-xl text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifySetup} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            className={`${inputClass} text-center text-2xl font-mono tracking-[0.5em]`}
            style={{ color: textColor }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition disabled:opacity-40 hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>
            <button
              type="button"
              onClick={reset}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${isDarkBg ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-700'}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Estado "backup": mostrar códigos de respaldo
  if (step === 'backup') {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          2FA — Paso 3 de 3
        </h4>
        <p className={`text-[11px] ${subTextClass}`}>
          Guardá estos <strong>10 códigos de respaldo</strong>. Cada uno sirve <strong>una sola vez</strong> para iniciar sesión si perdés tu dispositivo.
        </p>

        <div
          className="grid grid-cols-2 gap-1.5 p-3 rounded-xl font-mono text-[11px]"
          style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', color: textColor }}
        >
          {backupCodes.map((bc, i) => (
            <div key={i} className="py-1">
              {bc}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyCodes}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold border ${isDarkBg ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-700'}`}
          >
            {copied ? '✓ Copiado' : 'Copiar códigos'}
          </button>
          <button
            type="button"
            onClick={handleDownloadCodes}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold border ${isDarkBg ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-700'}`}
          >
            Descargar .txt
          </button>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
          style={{ backgroundColor: primary }}
        >
          Listo, guardé mis códigos
        </button>
      </div>
    );
  }

  // Estado "disable": input para desactivar
  if (step === 'disable') {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Desactivar 2FA
        </h4>
        <p className={`text-[11px] ${subTextClass}`}>
          Ingresá un código de tu app para confirmar. Después, tu cuenta quedará sin 2FA.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] rounded-xl text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleDisable} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoFocus
            className={`${inputClass} text-center text-2xl font-mono tracking-[0.5em]`}
            style={{ color: textColor }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || disableCode.length !== 6}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold transition disabled:opacity-40 hover:bg-rose-600"
            >
              {loading ? 'Desactivando...' : 'Desactivar 2FA'}
            </button>
            <button
              type="button"
              onClick={reset}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${isDarkBg ? 'border-white/15 text-slate-300' : 'border-slate-300 text-slate-700'}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Estado "idle": tarjeta principal con toggle
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
        Autenticación en 2 pasos (2FA)
      </h4>

      <div
        className="p-4 rounded-xl border flex items-start sm:items-center justify-between gap-3"
        style={{
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 88, 12, 0.12)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={enabled ? '#10b981' : '#ea580c'} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: textColor }}>
              {enabled ? '2FA está activo' : 'Protegé tu cuenta con 2FA'}
            </p>
            <p className={`text-[11px] mt-0.5 ${subTextClass}`}>
              {enabled
                ? 'Al iniciar sesión vas a necesitar un código de tu app.'
                : 'Sumá una capa extra de seguridad pidiendo un código además de tu contraseña.'}
            </p>
            {enabled && (
              <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400">● ACTIVO</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => (enabled ? setStep('disable') : handleStartSetup())}
          disabled={loading}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40 ${enabled ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'text-white hover:opacity-90'}`}
          style={!enabled ? { backgroundColor: primary } : {}}
        >
          {loading ? '...' : enabled ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] rounded-xl text-center font-semibold">
          {error}
        </div>
      )}
    </div>
  );
}
