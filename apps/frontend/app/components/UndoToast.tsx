// frontend/app/components/UndoToast.tsx
'use client';

import React from 'react';

interface UndoToastProps {
  show: boolean;
  message?: string;
  actionLabel?: string;
  onUndo: () => void;
  onDismiss?: () => void;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}

export function UndoToast({
  show,
  message = 'Notificación eliminada',
  actionLabel = 'Deshacer',
  onUndo,
  onDismiss,
  primary,
  textColor,
  isDarkBg,
}: UndoToastProps) {
  console.log('[UndoToast] render. show:', show, 'message:', message);
  if (!show) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200"
      style={{
        backgroundColor: isDarkBg ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        color: textColor,
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: primary, color: '#ffffff' }}
      >
        {actionLabel}
      </button>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md opacity-50 hover:opacity-100 transition cursor-pointer"
          aria-label="Cerrar"
        >
          ✕
        </button>
      )}
    </div>
  );
}