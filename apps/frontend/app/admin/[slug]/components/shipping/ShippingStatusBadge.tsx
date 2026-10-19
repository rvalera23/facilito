// frontend/app/admin/[slug]/components/shipping/ShippingStatusBadge.tsx

import React from 'react';
import { SHIPPING_STATUS, resolveShippingStatus } from './constants';
import { StatusConfig } from './types';

interface ShippingStatusBadgeProps {
  status: string;
  isDarkBg?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ShippingStatusBadge({
  status,
  isDarkBg = false,
  showIcon = false,
  size = 'sm',
}: ShippingStatusBadgeProps) {
  const statusInfo: StatusConfig = resolveShippingStatus(status);  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[9px]',
    md: 'px-2.5 py-1 text-[10px]',
    lg: 'px-3 py-1.5 text-xs',
  };

  // 🔥 SVG por estado
  const StatusIcon = ({ color }: { color: string }) => {
    const icons: Record<string, React.ReactNode> = {
      'PENDING': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
        </svg>
      ),
      'in_transit': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16h8" />
        </svg>
      ),
      'COMPLETED': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      ),
      'CANCELLED': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      'por_verificar': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    };
    
    const normalizedStatus = Object.keys(icons).find(key => 
      status.toLowerCase().includes(key.toLowerCase())
    ) || 'PENDING';
    
    return icons[normalizedStatus] || icons['PENDING'];
  };

  return (
    <span
      className={`rounded-full font-bold inline-flex items-center gap-1.5 ${sizeClasses[size]}`}
      style={{
        color: statusInfo.color,
        backgroundColor: statusInfo.bg,
        border: `1px solid ${statusInfo.color}30`,
      }}
    >
      {showIcon && <StatusIcon color={statusInfo.color} />}
      {statusInfo.label}
    </span>
  );
}