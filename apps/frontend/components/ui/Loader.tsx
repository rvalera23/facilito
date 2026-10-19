'use client';

import React from 'react';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoaderProps {
  size?: LoaderSize;
  /** Color del spinner. Por defecto hereda del padre si no se pasa. */
  color?: string;
  /** Clases adicionales opcionales (para margin, etc.). */
  className?: string;
}

const SIZE_CONFIG: Record<LoaderSize, number> = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
};

const STROKE_WIDTH: Record<LoaderSize, number> = {
  xs: 2.5,
  sm: 2.5,
  md: 2.5,
  lg: 2.5,
  xl: 2.5,
};

/**
 * Loader canónico de Facilito.
 *
 * Uso:
 *   <Loader />                       // md, hereda color
 *   <Loader size="sm" />              // sm
 *   <Loader size="lg" color="#fff" /> // lg, blanco
 *   <LoaderFullPage message="Cargando..." primary="#f97316" textColor="#fff" isDarkBg />
 *   <LoaderInline />                  // alias, mismo que <Loader />
 */
export function Loader({ size = 'md', color, className = '' }: LoaderProps) {
  const px = SIZE_CONFIG[size];
  const stroke = STROKE_WIDTH[size];

  return (
    <svg
      className={`animate-spin shrink-0 ${className}`}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      style={color ? { color } : undefined}
      role="status"
      aria-label="Cargando"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Loader de pantalla completa (centrado vertical y horizontal).
 * Ideal para reemplazar los "flex items-center justify-center h-64" con spinner.
 */
export function LoaderFullPage({
  message = 'Cargando...',
  primary,
  textColor,
  isDarkBg,
}: {
  message?: string;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      style={{ color: textColor }}
      role="status"
      aria-live="polite"
    >
      <Loader size="lg" color={primary} />
      {message && (
        <p
          className="text-xs"
          style={{ color: textColor, opacity: 0.7 }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Alias semántico para loaders inline (dentro de botones, cards, etc.).
 * Es exactamente el mismo componente que <Loader />.
 */
export const LoaderInline = Loader;

export default Loader;