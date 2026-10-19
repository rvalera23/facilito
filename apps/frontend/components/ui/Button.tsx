'use client';

import React, { useState } from 'react';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'outline-danger';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  // 🔥 Tema del tenant (todo heredado)
  primary: string;
  borderColor: string;
  textColor: string;
  cardBg: string;
  isDarkBg: boolean;
}

const SIZE_CONFIG: Record<
  ButtonSize,
  { padding: string; text: string; radius: string; gap: string; iconSize: number }
> = {
  xs: { padding: 'px-2 py-1', text: 'text-[10px]', radius: 'rounded-lg', gap: 'gap-1', iconSize: 12 },
  sm: { padding: 'px-3 py-1.5', text: 'text-[10px]', radius: 'rounded-xl', gap: 'gap-1.5', iconSize: 14 },
  md: { padding: 'px-4 py-2.5', text: 'text-xs', radius: 'rounded-xl', gap: 'gap-2', iconSize: 16 },
  lg: { padding: 'px-6 py-3.5', text: 'text-xs', radius: 'rounded-2xl', gap: 'gap-2', iconSize: 16 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  children,
  type = 'button',
  primary,
  borderColor,
  textColor,
  cardBg,
  isDarkBg,
  ...rest
}: ButtonProps) {
  const cfg = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;
  const [isHovered, setIsHovered] = useState(false);

  // 🔥 Estilos por variante — TODO heredado del tema
  let bg = 'transparent';
  let border: string | undefined;
  let color = textColor;
  let hoverBg = 'transparent';

  switch (variant) {
    case 'primary':
      bg = primary;
      color = '#ffffff';
      break;
    case 'danger':
      bg = '#f43f5e';
      color = '#ffffff';
      break;
    case 'secondary':
      bg = cardBg;
      border = `1px solid ${borderColor}`;
      color = textColor;
      hoverBg = isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
      break;
    case 'outline':
      bg = 'transparent';
      border = `1px solid ${borderColor}`;
      color = textColor;
      hoverBg = isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
      break;
    case 'outline-danger':
      bg = 'transparent';
      border = '1px solid rgba(244,63,94,0.3)';
      color = '#f43f5e';
      hoverBg = 'rgba(244,63,94,0.08)';
      break;
    case 'ghost':
      bg = 'transparent';
      color = textColor;
      hoverBg = isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
      break;
  }

  const finalBg = isHovered && hoverBg !== 'transparent' ? hoverBg : bg;
  const finalOpacity = isDisabled
    ? 0.4
    : isHovered && (variant === 'primary' || variant === 'danger')
      ? 0.9
      : 1;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={[
        'inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer select-none',
        cfg.padding,
        cfg.text,
        cfg.radius,
        cfg.gap,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'cursor-not-allowed grayscale' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: finalBg,
        border,
        color,
        opacity: finalOpacity,
      }}
      {...rest}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin shrink-0"
            width={cfg.iconSize}
            height={cfg.iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="shrink-0 inline-flex">{icon}</span>
          )}
          {children && <span className="truncate">{children}</span>}
          {icon && iconPosition === 'right' && (
            <span className="shrink-0 inline-flex">{icon}</span>
          )}
        </>
      )}
    </button>
  );
}

export default Button;