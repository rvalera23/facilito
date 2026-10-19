'use client';

import React from 'react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  /** Ícono ya renderizado (lucide, SVG, etc.). Hereda color del tema. */
  icon?: React.ReactNode;
  /** Título opcional. Si no se pasa, se renderiza solo `message`. */
  title?: string;
  /** Mensaje principal. Obligatorio. */
  message: string;
  /** Acción opcional (botón al pie). */
  action?: EmptyStateAction;
  /** Tamaño del ícono si se pasa como componente lucide. Default: 48px. */
  iconSize?: number;
  /** Padding vertical. Default: py-12. */
  padding?: string;
  // 🔥 Tema del tenant
  primary: string;
  textColor: string;
  borderColor: string;
  cardBg: string;
  isDarkBg: boolean;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  iconSize = 48,
  padding = 'py-12',
  primary,
  textColor,
  borderColor,
  cardBg,
  isDarkBg,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${padding} text-center space-y-3`}
      style={{ color: textColor }}
      role="status"
      aria-live="polite"
    >
      {/* Ícono heredado — el color se lo da el consumidor via currentColor */}
      {icon && (
        <div
          className="flex items-center justify-center opacity-20"
          style={{ color: textColor }}
        >
          {icon}
        </div>
      )}

      {/* Título (opcional) */}
      {title && (
        <p
          className="text-sm font-semibold"
          style={{ color: textColor }}
        >
          {title}
        </p>
      )}

      {/* Mensaje */}
      <p
        className={`text-sm ${title ? 'opacity-60' : 'opacity-70'} max-w-md`}
        style={{ color: textColor }}
      >
        {message}
      </p>

      {/* Acción (opcional) */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold transition hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: primary, color: '#ffffff' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;