'use client';

import React from 'react';

interface OrderTypeBadgeProps {
  type: 'product' | 'service' | 'mixed';
  isDarkBg: boolean;
  size?: 'sm' | 'md';
}

// 🔥 ICONOS SVG DINÁMICOS - MÁS PEQUEÑOS
const Icons = {
  Product: ({ size = 7 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Service: ({ size = 7 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Mixed: ({ size = 7 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

export default function OrderTypeBadge({ type, isDarkBg, size = 'sm' }: OrderTypeBadgeProps) {
  const configs = {
    product: {
      label: 'P',
      icon: Icons.Product,
      colors: isDarkBg 
        ? 'bg-blue-500/20 text-blue-300 border-blue-500/25' 
        : 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    service: {
      label: 'S',
      icon: Icons.Service,
      colors: isDarkBg 
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/25' 
        : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    mixed: {
      label: 'M',
      icon: Icons.Mixed,
      colors: isDarkBg 
        ? 'bg-purple-500/20 text-purple-300 border-purple-500/25' 
        : 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    },
  };

  const config = configs[type] || configs.product;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[7px] px-1 py-0.5 gap-0.5 rounded',
    md: 'text-[8px] px-1.5 py-0.5 gap-0.5 rounded',
  };

  const iconSizes = {
    sm: 6,
    md: 7,
  };

  return (
    <span className={`inline-flex items-center border font-bold ${sizeClasses[size]} ${config.colors}`}>
      <Icon size={iconSizes[size]} />
      {config.label}
    </span>
  );
}