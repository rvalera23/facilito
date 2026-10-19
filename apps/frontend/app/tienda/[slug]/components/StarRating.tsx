'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

// ============================================================
// 🔥 STAR RATING — Estrellas interactivas y display
// ============================================================
// Modo display: solo muestra N estrellas (readOnly)
// Modo input: el usuario puede clickear para elegir rating
//
// Uso:
//   <StarRating value={4.5} readOnly size={16} />
//   <StarRating value={rating} onChange={setRating} size={24} />

interface StarRatingProps {
  /** Valor actual (0-5, permite decimales para display) */
  value: number;

  /** Si es de solo lectura (para mostrar) */
  readOnly?: boolean;

  /** Callback al cambiar (solo si no es readOnly) */
  onChange?: (rating: number) => void;

  /** Tamaño de cada estrella en px. Default: 16 */
  size?: number;

  /** Color de las estrellas llenas. Default: '#facc15' (amarillo) */
  activeColor?: string;

  /** Color de las estrellas vacías. Default: rgba(100,116,139,0.35) */
  inactiveColor?: string;

  /** Espacio entre estrellas en px. Default: 2 */
  gap?: number;

  /** Clase extra */
  className?: string;
}

export default function StarRating({
  value,
  readOnly = false,
  onChange,
  size = 16,
  activeColor = '#facc15',
  inactiveColor = 'rgba(100, 116, 139, 0.35)',
  gap = 2,
  className = '',
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const clampedValue = Math.max(0, Math.min(5, Number(displayValue) || 0));

  const handleClick = (rating: number) => {
    if (readOnly || !onChange) return;
    onChange(rating);
  };

  const handleMouseEnter = (rating: number) => {
    if (readOnly) return;
    setHoverValue(rating);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: `${gap}px` }}
      onMouseLeave={handleMouseLeave}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={readOnly ? `${clampedValue} de 5 estrellas` : 'Seleccionar calificación'}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        // 🔥 Determinamos si esta estrella está llena, media llena o vacía
        const fill = getStarFill(clampedValue, starIndex);

        return (
          <button
            key={starIndex}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            className={`relative transition-transform ${
              readOnly
                ? 'cursor-default'
                : 'cursor-pointer hover:scale-110 active:scale-95'
            }`}
            style={{
              width: size,
              height: size,
              padding: 0,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={`${starIndex} estrella${starIndex > 1 ? 's' : ''}`}
            tabIndex={readOnly ? -1 : 0}
          >
            {/* Estrella de fondo (siempre vacía) */}
            <Star
              className="absolute"
              width={size}
              height={size}
              stroke={inactiveColor}
              fill="transparent"
              strokeWidth={1.5}
            />

            {/* Estrella llena (recortada según el fill) */}
            <div
              className="absolute overflow-hidden"
              style={{
                width: `${fill * 100}%`,
                height: size,
                left: 0,
                top: 0,
              }}
            >
              <Star
                width={size}
                height={size}
                fill={activeColor}
                stroke={activeColor}
                strokeWidth={1.5}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// 🔥 HELPER: calcula cuánto llenar cada estrella
// ============================================================
// Devuelve 0, 0.5 o 1 según corresponda.
// Ejemplo con value = 3.7:
//   Estrella 1 → 1
//   Estrella 2 → 1
//   Estrella 3 → 1
//   Estrella 4 → 0.5 (porque 3.7 redondea a 3.5)
//   Estrella 5 → 0
function getStarFill(value: number, starIndex: number): number {
  const diff = value - (starIndex - 1);

  if (diff >= 1) return 1;
  if (diff >= 0.5) return 0.5;
  if (diff > 0) return 0.5; // cualquier fracción muestra media estrella
  return 0;
}