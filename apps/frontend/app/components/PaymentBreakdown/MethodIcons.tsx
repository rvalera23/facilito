// ============================================================
// ARCHIVO: frontend/app/components/PaymentBreakdown/MethodIcons.tsx
// ============================================================
// Iconos SVG inline para cada método de pago.
// Heredan color del theme vía props. Sin emojis, sin librerías
// externas de iconos.
// ============================================================

import React from 'react';
import type { PaymentMethodType } from '@/types/payment-breakdown';

interface IconProps {
  className?: string;
  color?: string;
  size?: number;
}

interface BaseProps extends IconProps {
  children: React.ReactNode;
}

function Base({
  children,
  size = 20,
  color = 'currentColor',
  className,
}: BaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </Base>
  );
}

export function PagoMovilIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 6h4" />
      <path d="M9 11l3 3 3-3" />
      <path d="M12 14v3" />
    </Base>
  );
}

export function ZelleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 4h16l-12 8 12 8H4" />
    </Base>
  );
}

export function PosIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M6 15h4" />
    </Base>
  );
}

export function BiopagoIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5s3 3 3 5.5" />
      <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7.5" />
      <circle cx="12" cy="9" r="2" />
    </Base>
  );
}

export function BinanceIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3l3 3-3 3-3-3 3-3z" />
      <path d="M12 15l3 3-3 3-3-3 3-3z" />
      <path d="M3 12l3-3 3 3-3 3-3-3z" />
      <path d="M15 12l3-3 3 3-3 3-3-3z" />
    </Base>
  );
}

export function PaypalIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 20l1.5-16h5a4 4 0 0 1 0 8H9" />
      <path d="M12 20l1.5-12h4a3.5 3.5 0 0 1 0 7H13" />
    </Base>
  );
}

export function CryptoWalletIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <circle cx="17" cy="15" r="1" />
    </Base>
  );
}

export function GenericPaymentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </Base>
  );
}

interface MethodIconProps extends IconProps {
  type: PaymentMethodType;
}

/**
 * Devuelve el icono correspondiente al tipo de método.
 * Si el tipo no está mapeado, devuelve el genérico.
 */
export function MethodIcon({ type, ...props }: MethodIconProps) {
  switch (type) {
    case 'cash':
      return <CashIcon {...props} />;
    case 'pago_movil':
      return <PagoMovilIcon {...props} />;
    case 'zelle':
      return <ZelleIcon {...props} />;
    case 'pos':
      return <PosIcon {...props} />;
    case 'biopago':
      return <BiopagoIcon {...props} />;
    case 'binance':
      return <BinanceIcon {...props} />;
    case 'paypal':
      return <PaypalIcon {...props} />;
    case 'crypto_wallet':
      return <CryptoWalletIcon {...props} />;
    case 'zimli':
    default:
      return <GenericPaymentIcon {...props} />;
  }
}