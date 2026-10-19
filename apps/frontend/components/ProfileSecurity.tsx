'use client';

import React, { useState, useEffect } from 'react';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import { apiFetch } from '@/lib/api';

interface ProfileSecurityProps {
  textColor: string;
  inputClass: string;
  isDarkBg: boolean;
  primary: string;
  onLogout: () => void;
}

export default function ProfileSecurity({
  textColor,
  inputClass,
  isDarkBg,
  primary,
  onLogout,
}: ProfileSecurityProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  
  // Estado real de 2FA (leído del backend)
  const [totpEnabled, setTotpEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/auth/2fa/status')
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setTotpEnabled(!!d.totpEnabled);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  
  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Ingresá tu contraseña actual.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña no puede ser igual a la actual.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(newPassword)) {
      setError(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.',
      );
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' ') : data.message;
        throw new Error(msg || 'No se pudo cambiar la contraseña');
      }

      setSuccess(true);
      resetForm();

      // El backend revocó todos los refresh tokens. Cerramos sesión en 3s.
      setTimeout(() => {
        onLogout();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const inputType = showPasswords ? 'text' : 'password';

  if (success) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-80" style={{ color: textColor }}>
          Seguridad y Contraseña
        </h4>
        <div
          className="p-4 rounded-xl border flex items-start gap-3"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="#10b981"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-400">
              Contraseña actualizada correctamente
            </p>
            <p className={`text-[11px] mt-0.5 ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
              Por seguridad, cerramos tu sesión. Te estamos redirigiendo al login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔥 Bloque 2FA */}
      <TwoFactorSetup
        textColor={textColor}
        inputClass={inputClass}
        isDarkBg={isDarkBg}
        primary={primary}
        initialEnabled={totpEnabled}
              />

      {/* 🔥 Bloque Cambiar Contraseña */}
      <div className="space-y-3 pt-4 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
      <h4
        className="text-xs font-bold uppercase tracking-wider opacity-80"
        style={{ color: textColor }}
      >
        Seguridad y Contraseña
      </h4>

      <p className={`text-[11px] ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
        Cambiá tu contraseña periódicamente. Al guardar, se cerrará tu sesión en todos los
        dispositivos y vas a tener que iniciar sesión de nuevo.
      </p>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] rounded-xl text-center font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              className="block text-[10px] font-semibold mb-1 opacity-70"
              style={{ color: textColor }}
            >
              Contraseña Actual
            </label>
            <input
              type={inputType}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
              style={{ color: textColor }}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-semibold mb-1 opacity-70"
              style={{ color: textColor }}
            >
              Nueva Contraseña
            </label>
            <input
              type={inputType}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
              style={{ color: textColor }}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-semibold mb-1 opacity-70"
              style={{ color: textColor }}
            >
              Confirmar Contraseña
            </label>
            <input
              type={inputType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva"
              className={inputClass}
              style={{ color: textColor }}
              autoComplete="new-password"
            />
          </div>
        </div>

        {newPassword && <PasswordStrengthIndicator password={newPassword} />}

        {confirmPassword && newPassword && confirmPassword !== newPassword && (
          <p className="text-[11px] text-rose-400">Las contraseñas no coinciden.</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className={`text-[11px] font-semibold transition-opacity hover:opacity-100 opacity-70 ${
              isDarkBg ? 'text-white' : 'text-slate-700'
            }`}
          >
            {showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </button>

          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}