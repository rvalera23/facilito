'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  /** 🔥 SOLO el color del check. El resto hereda del tema (primary, borderColor, cardBg). */
  accentColor?: string;
  /** Duración en ms para autocerrar. 0 = no autocierra */
  autoCloseMs?: number;
  /** Texto del botón de cerrar (opcional, para UX explícita) */
  closeLabel?: string;
  /** 🔥 Color del botón principal (normalmente = primary del tenant) */
  primary: string;
  /** 🔥 Color del borde de la card (neutral) */
  borderColor: string;
  /** Fondo de la card */
  cardBg: string;
  /** Color del texto */
  textColor: string;
  isDarkBg: boolean;
}

export function SuccessModal({
  isOpen,
  onClose,
  title = '¡Cambios guardados!',
  message = 'La operación se completó correctamente.',
  accentColor = '#22c55e',
  autoCloseMs = 2000,
  closeLabel,
  primary,
  borderColor,
  cardBg,
  textColor,
  isDarkBg,
}: SuccessModalProps) {
  // 🔥 SSR safety: createPortal solo funciona en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔥 Autocierre
  useEffect(() => {
    if (!isOpen || !autoCloseMs) return;
    const timeout = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timeout);
  }, [isOpen, autoCloseMs, onClose]);

  // 🔥 Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // 🔥 Bloquear el scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // 🔥 Renderizar en document.body con createPortal
  //    Esto saca el modal del árbol del componente (evita que
  //    `position: fixed` se ancle a un ancestro con `will-change` / `transform` / `overflow`)
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
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
        {/* Ícono de check */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto border"
          style={{
            backgroundColor: `${accentColor}1A`, // 10% opacity
            borderColor: `${accentColor}4D`,
            color: accentColor,
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Título + mensaje */}
        <div className="space-y-1">
          <h3 className="text-base font-bold" style={{ color: accentColor }}>
            {title}
          </h3>
          <p className="text-xs opacity-80" style={{ color: textColor }}>
            {message}
          </p>
        </div>

        {/* Botón de cerrar opcional */}
        {closeLabel && (
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: primary, color: '#ffffff' }}
          >
            {closeLabel}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}