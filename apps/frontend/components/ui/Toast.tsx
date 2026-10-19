'use client';

import React, { useEffect, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'undo';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  onDismiss: () => void;
  duration?: number;
  // Tema heredado del tenant
  primary: string;
  textColor: string;
  cardBg: string;
  borderColor: string;
  isDarkBg: boolean;
}

// 🔥 Colores semánticos universales (no se heredan del tenant)
const VARIANT_ACCENTS: Record<Exclude<ToastVariant, 'undo'>, string> = {
  success: '#22c55e',
  error: '#f43f5e',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// 🔥 Íconos SVG por variante
const VARIANT_ICONS: Record<Exclude<ToastVariant, 'undo'>, React.ReactNode> = {
  success: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function Toast({
  variant,
  message,
  action,
  onDismiss,
  duration = 5000,
  primary,
  textColor,
  cardBg,
  borderColor,
  isDarkBg,
}: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingRef = useRef<number>(duration);
  const startRef = useRef<number>(0);

  // 🔥 Timer de auto-dismiss (con pausa en hover)
  useEffect(() => {
    if (duration <= 0) return;

    const startTimer = () => {
      startRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, remainingRef.current);
    };

    const pauseTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const elapsed = Date.now() - startRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };

    if (isHovered) {
      pauseTimer();
    } else {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isHovered, duration, onDismiss]);

  // 🔥 Escape cierra el toast
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  const accent = variant === 'undo' ? primary : VARIANT_ACCENTS[variant];
  const icon = variant === 'undo' ? null : VARIANT_ICONS[variant];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 w-full max-w-md"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        color: textColor,
      }}
    >
      {/* Ícono (solo para variantes semánticas) */}
      {icon && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: `${accent}1A`,
            borderColor: `${accent}4D`,
            color: accent,
          }}
        >
          {icon}
        </div>
      )}

      {/* Mensaje */}
      <span className="flex-1 text-sm font-medium leading-snug">{message}</span>

      {/* Acción opcional */}
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-90 cursor-pointer shrink-0"
          style={{ backgroundColor: primary, color: '#ffffff' }}
        >
          {action.label}
        </button>
      )}

      {/* Botón cerrar */}
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-md opacity-50 hover:opacity-100 transition cursor-pointer shrink-0"
        aria-label="Cerrar"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default Toast;