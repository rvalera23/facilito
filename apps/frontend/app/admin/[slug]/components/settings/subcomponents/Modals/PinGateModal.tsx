'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, X, Loader2 } from 'lucide-react';

// ============================================================
// 🔥 PIN GATE MODAL — Pide el PIN antes de entrar a una sección
// ============================================================
// Modal simple con un input de PIN de 4-6 dígitos.
// Al verificar correctamente, llama onSuccess.
// Al cancelar o cerrar, llama onCancel.
//
// No tiene lógica de configurar/eliminar PIN. Solo verifica.

interface PinGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  title?: string;
  subtitle?: string;
  primary: string;
  textColor: string;
  cardBg: string;
  cardBorder: string;
}

export default function PinGateModal({
  isOpen,
  onClose,
  onSuccess,
  onVerify,
  title = 'Ingresá tu PIN',
  subtitle = 'Necesitamos verificar tu identidad para acceder',
  primary,
  textColor,
  cardBg,
  cardBorder,
}: PinGateModalProps) {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 🔥 NUEVO: ref para el debounce del auto-verify
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 Resetear estado al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsVerifying(false);
      // Enfocar el input después de que se monte
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 🔥 Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isVerifying) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isVerifying, onClose]);

  // 🔥 Cleanup del timer de auto-verify al desmontar
  useEffect(() => {
    return () => {
      if (autoVerifyTimeoutRef.current) {
        clearTimeout(autoVerifyTimeoutRef.current);
      }
    };
  }, []);

  // 🔥 NUEVO: helper que recibe el PIN como parámetro (para el auto-verify)
  const handleVerifyWithPin = async (pinToVerify: string) => {
    if (pinToVerify.length < 4 || pinToVerify.length > 6) {
      setError('El PIN debe tener entre 4 y 6 dígitos');
      return;
    }

    // Evitar doble verify si ya está verificando
    if (isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      const ok = await onVerify(pinToVerify);
      if (ok) {
        onSuccess();
      } else {
        setError('PIN incorrecto. Intentá de nuevo.');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error al verificar el PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  // 🔥 handleVerify original (para el botón "Verificar" y Enter)
  const handleVerify = async () => {
    // Limpiar debounce pendiente (si lo hay)
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    await handleVerifyWithPin(pin);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo números, máximo 6 caracteres
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setError(null);

    // 🔥 Limpiar el debounce anterior (si el user sigue escribiendo)
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    // 🔥 Auto-verificar cuando el PIN tiene entre 4 y 6 dígitos.
    // El debounce de 400ms espera a que el user termine de escribir.
    if (value.length >= 4 && value.length <= 6) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        handleVerifyWithPin(value);
      }, 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      e.preventDefault();
      handleVerify();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !isVerifying && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-gate-title"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: cardBg,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: cardBorder,
          color: textColor,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: cardBorder }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${primary}20`,
                color: primary,
              }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="pin-gate-title"
                className="text-base font-black tracking-tight"
                style={{ color: textColor }}
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="p-2 rounded-xl transition hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(0,0,0,0.05)',
            }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs opacity-70 leading-relaxed" style={{ color: textColor }}>
            {subtitle}
          </p>

          <div className="space-y-2">
            <label
              className="block text-[11px] font-semibold opacity-85"
              style={{ color: textColor }}
            >
              PIN de seguridad
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              maxLength={6}
              disabled={isVerifying}
              className="w-full rounded-2xl px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] outline-none border-2 transition disabled:opacity-60"
              style={{
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderColor: error ? '#ef4444' : pin.length >= 4 ? primary : cardBorder,
                color: textColor,
              }}
            />
            {error && (
              <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition hover:opacity-80 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border"
            style={{
              backgroundColor: 'transparent',
              borderColor: cardBorder,
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying || pin.length < 4}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              backgroundColor: primary,
            }}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}