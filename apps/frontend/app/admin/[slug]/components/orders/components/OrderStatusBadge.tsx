// frontend/app/admin/[slug]/components/orders/components/OrderStatusBadge.tsx

'use client';

import React from 'react';
import { getStatusLabel, getStatusColor } from './hooks/orderUtils';

interface OrderStatusBadgeProps {
  status: string;
  isDarkBg?: boolean;
  className?: string;
}

export default function OrderStatusBadge({ 
  status, 
  isDarkBg = true,
  className = ''
}: OrderStatusBadgeProps) {
  const label = getStatusLabel(status);
  const colorClass = getStatusColor(status);

  // 🔥 MAPEO DE ESTILOS POR COLOR
  const getBgClass = () => {
    if (isDarkBg) {
      switch (colorClass) {
        case 'text-amber-400': return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
        case 'text-sky-400': return 'bg-sky-500/15 border-sky-500/30 text-sky-300';
        case 'text-emerald-400': return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
        case 'text-emerald-500': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
        case 'text-red-400': return 'bg-red-500/15 border-red-500/30 text-red-300';
        default: return 'bg-white/5 border-white/10 text-slate-400';
      }
    } else {
      switch (colorClass) {
        case 'text-amber-400': return 'bg-amber-100 border-amber-300 text-amber-800';
        case 'text-sky-400': return 'bg-sky-100 border-sky-300 text-sky-800';
        case 'text-emerald-400': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
        case 'text-emerald-500': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
        case 'text-red-400': return 'bg-red-100 border-red-300 text-red-800';
        default: return 'bg-black/5 border-black/10 text-slate-600';
      }
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${getBgClass()} ${className}`}>
     {label}
    </span>
  );
}