'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  /** Si se pasa, el usuario debe escribir exactamente este texto para habilitar el botón */
  requireConfirmationText?: string;
  /** Label sobre el input (ej: "Para confirmar, escribe el nombre de tu tienda:") */
  requireConfirmationLabel?: string;
  // 🔥 Tema del tenant
  primary: string;
  borderColor: string;
  cardBg: string;
  textColor: string;
  isDarkBg: boolean;
}

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  { accent: string; iconPath: string; defaultConfirm: string }
> = {
  danger: {
    accent: '#f43f5e', // rose-500
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    defaultConfirm: 'Sí, eliminar',
  },
  warning: {
    accent: '#f59e0b', // amber-500
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    defaultConfirm: 'Sí, continuar',
  },
  info: {
    accent: '#3b82f6', // fallback si no hay primary
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    defaultConfirm: 'Confirmar',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  requireConfirmationText,
  requireConfirmationLabel,
  primary,
  borderColor,
  cardBg,
  textColor,
  isDarkBg,
}: ConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  const config = VARIANT_CONFIG[variant];
  const accent = variant === 'info' ? primary || config.accent : config.accent;
  const finalConfirmLabel = confirmLabel ?? config.defaultConfirm;
  const isLoading = loading || internalLoading;

  // Reset input al abrir/cerrar
  useEffect(() => {
    if (!isOpen) setConfirmText('');
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const isConfirmEnabled =
    !isLoading &&
    (!requireConfirmationText || confirmText === requireConfirmationText);

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } finally {
      setInternalLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !isLoading && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: cardBg,
          borderColor: borderColor,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono de la variante */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto border"
          style={{
            backgroundColor: `${accent}1A`,
            borderColor: `${accent}4D`,
            color: accent,
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={config.iconPath}
            />
          </svg>
        </div>

        {/* Título + mensaje */}
        <div className="space-y-1">
          <h3 className="text-base font-bold" style={{ color: accent }}>
            {title}
          </h3>
          <p className="text-xs opacity-80" style={{ color: textColor }}>
            {message}
          </p>
        </div>

        {/* Input de confirmación (opcional) */}
        {requireConfirmationText && (
          <div className="space-y-2 pt-2 text-left">
            <label
              className="block text-[11px] font-semibold opacity-80"
              style={{ color: textColor }}
            >
              {requireConfirmationLabel || 'Para confirmar, escribe:'}{' '}
              <span className="font-bold" style={{ color: accent }}>
                {requireConfirmationText}
              </span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requireConfirmationText}
              className="w-full px-3 py-2 rounded-xl border text-xs outline-none transition"
              style={{
                backgroundColor: isDarkBg
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.05)',
                borderColor: borderColor,
                color: textColor,
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>
        )}

        {/* Botones */}
        <div
          className="flex items-center justify-center gap-3 pt-4 border-t"
          style={{ borderColor: borderColor }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-100 opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: borderColor, color: textColor }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!isConfirmEnabled}
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
            style={{ backgroundColor: variant === 'info' ? primary : accent }}
          >
            {isLoading ? 'Procesando...' : finalConfirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmDialog;