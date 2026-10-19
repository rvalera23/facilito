'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SectionTitleProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  primary: string;
  textColors: {
    title: string;
    subtitle: string;
  };
  /** Si es true, el título se vuelve clickable y muestra un chevron */
  collapsible?: boolean;
  /** Estado actual: expandido o colapsado */
  expanded?: boolean;
  /** Callback al hacer click en el título o chevron */
  onToggle?: () => void;
}

export default function SectionTitle({
  icon,
  title,
  subtitle,
  primary,
  textColors,
  collapsible = false,
  expanded = true,
  onToggle,
}: SectionTitleProps) {
  const isClickable = collapsible && typeof onToggle === 'function';

  return (
    <div
      className={`mb-5 ${isClickable ? 'cursor-pointer select-none group' : ''}`}
      onClick={isClickable ? onToggle : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span style={{ color: primary }}>{icon}</span>
          <h2
            className="text-base font-bold tracking-tight truncate"
            style={{ color: textColors.title }}
          >
            {title}
          </h2>
        </div>

        {isClickable && (
          <div
            className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 group-hover:opacity-100"
            style={{
              borderColor: 'rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: textColors.title,
            }}
          >
            <ChevronDown
              size={16}
              style={{
                transition: 'transform 0.2s ease',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        )}
      </div>

      {subtitle && (
        <p
          className="text-xs mt-0.5 ml-7"
          style={{ color: textColors.subtitle }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
