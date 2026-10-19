  'use client';

  import React from 'react';

  interface BuyerOrderStatusBadgeProps {
    status: string;
    isDarkBg?: boolean;
    className?: string;
  }

  export default function BuyerOrderStatusBadge({ 
    status, 
    isDarkBg = true,
    className = ''
  }: BuyerOrderStatusBadgeProps) {
    const normalized = status?.toLowerCase() || 'pending';
    
    const statusMap: Record<string, { label: string; style: string }> = {
      'por_verificar': {
        label: 'Verificando',
        style: isDarkBg 
          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' 
          : 'bg-sky-100 text-sky-800 border-sky-300'
      },
      'verificando': {
        label: 'Verificando',
        style: isDarkBg 
          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' 
          : 'bg-sky-100 text-sky-800 border-sky-300'
      },
      'pending': {
        label: 'Pendiente',
        style: isDarkBg 
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
          : 'bg-amber-100 text-amber-800 border-amber-300'
      },
      'pendiente': {
        label: 'Pendiente',
        style: isDarkBg 
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
          : 'bg-amber-100 text-amber-800 border-amber-300'
      },
      // ✅ AGREGAR CONFIRMED (Verificado)
      'confirmed': {
        label: 'Verificado',
        style: isDarkBg 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      'verificado': {
        label: 'Verificado',
        style: isDarkBg 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      'completed': {
        label: 'Completado',
        style: isDarkBg 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      'completado': {
        label: 'Completado',
        style: isDarkBg 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      'pagado': {
        label: 'Completado',
        style: isDarkBg 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      'aprobado': {
        label: 'Completado',
        style: isDarkBg 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      'cancelled': {
        label: 'Cancelado',
        style: isDarkBg 
          ? 'bg-red-500/15 text-red-300 border-red-500/30' 
          : 'bg-red-100 text-red-800 border-red-300'
      },
      'cancelado': {
        label: 'Cancelado',
        style: isDarkBg 
          ? 'bg-red-500/15 text-red-300 border-red-500/30' 
          : 'bg-red-100 text-red-800 border-red-300'
      },
      'rechazado': {
        label: 'Cancelado',
        style: isDarkBg 
          ? 'bg-red-500/15 text-red-300 border-red-500/30' 
          : 'bg-red-100 text-red-800 border-red-300'
      },
    };

    const config = statusMap[normalized] || statusMap['pending'];

    // 🔥 SVG pequeño para el badge (reemplaza el punto)
    const DotIcon = () => (
      <svg className="w-1.5 h-1.5 mr-1 inline-block fill-current" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
    );

    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border ${config.style} ${className}`}>
        
        {config.label}
      </span>
    );
  }