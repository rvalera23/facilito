'use client';

import React, { useMemo } from 'react';
import { formatPrice } from '../../utils';

interface SummaryMetricsProps {
  totalSpent: { ves: number; usd: number; vesWithIva?: number };
  totalOrders: number;
  lastOrderDate: string;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  secondary?: string;
  bsRate?: number;
  ivaRate?: number;
  appointmentsCount?: number;
  ordersCount?: number;
  servicesCount?: number;
  hasProducts?: boolean;
  hasServices?: boolean;
}

// 🔥 ICONOS SVG DINÁMICOS (MISMO QUE DASHBOARD)
const Icons = {
  Dollar: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M8 8c0-2 2-3 4-3s4 1 4 3-2 3-4 3-4 1-4 3 2 3 4 3 4-1 4-3" />
    </svg>
  ),
  Orders: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Appointment: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="1" />
      <circle cx="16" cy="15" r="1" />
      <circle cx="8" cy="15" r="1" />
    </svg>
  ),
  Calendar: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Iva: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  Clock: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Trending: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

const SummaryMetrics = React.memo(function SummaryMetrics({
    totalSpent, 
  totalOrders, 
  lastOrderDate, 
  primary, 
  textColor, 
  isDarkBg, 
  secondary,
  bsRate = 0,
  ivaRate = 16,
  appointmentsCount = 0,
  ordersCount = 0,
  servicesCount = 0,
  hasProducts = false,
  hasServices = false,
}: SummaryMetricsProps) {
  // 🔥 COLORES DINÁMICOS SEGÚN TEMA (MISMO QUE DASHBOARD)
  const cardBg = secondary || (isDarkBg ? 'rgba(0, 0, 0, 0.3)' : '#ffffff');
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  
  const textColors = {
    title: isDarkBg ? 'rgba(255, 255, 255, 0.9)' : '#1e293b',
    subtitle: isDarkBg ? 'rgba(255, 255, 255, 0.7)' : '#475569',
    label: isDarkBg ? 'rgba(255, 255, 255, 0.6)' : '#334155',
    value: isDarkBg ? 'rgba(255, 255, 255, 0.95)' : '#1e293b',
    smallText: isDarkBg ? 'rgba(255, 255, 255, 0.5)' : '#64748b',
    emptyState: isDarkBg ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8',
  };

  const formattedCurrency = useMemo(() => {
    const ves = totalSpent.ves || 0;
    const usd = totalSpent.usd || 0;
    // 🔥 SIN FALLBACK ESTÁTICO - si no hay tasa, no se calcula
    const calculatedUsd = usd > 0 ? usd : (bsRate > 0 ? ves / bsRate : 0);
    
    return {
      ves: ves.toLocaleString('es-VE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }),
      usd: calculatedUsd > 0 ? calculatedUsd.toFixed(2) : '0.00',
      vesWithIva: totalSpent.vesWithIva 
        ? totalSpent.vesWithIva.toLocaleString('es-VE', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })
        : null
    };
  }, [totalSpent, bsRate]);

  const labels = useMemo(() => {
    const hasBoth = hasProducts && hasServices;
    const onlyProducts = hasProducts && !hasServices;
    const onlyServices = !hasProducts && hasServices;

    if (hasBoth) {
      return {
        title: 'Inversión Total',
        subtitle: 'Productos + Servicios',
        countLabel: 'Transacciones',
        countSub: 'Productos y servicios',
        activityLabel: 'Última Actividad',
        activitySub: 'Última transacción',
      };
    } else if (onlyProducts) {
      return {
        title: 'Inversión Total',
        subtitle: 'Productos Comprados',
        countLabel: 'Pedidos',
        countSub: 'Productos adquiridos',
        activityLabel: 'Última Actividad',
        activitySub: 'Último pedido',
      };
    } else if (onlyServices) {
      return {
        title: 'Inversión Total',
        subtitle: 'Servicios Contratados',
        countLabel: 'Citas',
        countSub: 'Servicios agendados',
        activityLabel: 'Última Actividad',
        activitySub: 'Última cita',
      };
    } else {
      return {
        title: 'Inversión Total',
        subtitle: 'Sin actividad aún',
        countLabel: 'Transacciones',
        countSub: 'Aún no tienes actividad',
        activityLabel: 'Última Actividad',
        activitySub: 'Sin actividad',
      };
    }
  }, [hasProducts, hasServices]);

  return (
    <div className="lg:col-span-5 grid grid-cols-1 gap-4">
      {/* 🔥 TARJETA DE INVERSIÓN TOTAL - MISMO ESTILO QUE SUMMARY CHART */}
      <div 
        className="border rounded-2xl p-5"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      >
        {/* 🔥 HEADER - EXACTAMENTE IGUAL QUE SUMMARY CHART */}
        <div className="flex items-center justify-between">
          <h4
            className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2"
            style={{ color: textColors.title }}
          >
            <Icons.Trending color={primary} size={14} />
            {labels.title}
          </h4>
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: `${primary}20`,
            }}
          >
            <Icons.Dollar color={primary} size={16} />
          </div>
        </div>

        {/* 🔥 VALOR PRINCIPAL - MISMO ESTILO QUE SUMMARY CHART */}
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: primary }}>
            Bs. {formattedCurrency.ves}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {formattedCurrency.usd !== '0.00' && (
<span className="text-[11px] font-bold" style={{ color: isDarkBg ? '#22c55e' : '#16a34a' }}>
                $ {formattedCurrency.usd} USD
              </span>
            )}
            {totalSpent.vesWithIva !== undefined && ivaRate > 0 && (
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: textColors.smallText }}>
                <Icons.Iva color={textColors.smallText} size={10} />
                Con IVA ({ivaRate}%): Bs. {formattedCurrency.vesWithIva}
              </span>
            )}
            {bsRate > 0 && (
              <span className="text-[11px] font-medium" style={{ color: textColors.smallText }}>
                Tasa: 1 USD = Bs. {bsRate.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* 🔥 FOOTER - EXACTAMENTE IGUAL QUE SUMMARY CHART (text-[9px]) */}
        <div
          className="flex items-center justify-between mt-3 pt-2 border-t"
          style={{ borderColor: cardBorder }}
        >
          <span className="text-[9px]" style={{ color: textColors.smallText }}>
            {labels.subtitle}
          </span>
          <span className="text-[9px] font-medium" style={{ color: textColors.smallText }}>
            <Icons.Calendar color={textColors.smallText} size={10} />
          </span>
        </div>
      </div>

      {/* 🔥 TARJETAS DE CONTEOS - MISMO ESTILO QUE SUMMARY CHART */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          className="border rounded-2xl p-4"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          {/* 🔥 HEADER - EXACTAMENTE IGUAL QUE SUMMARY CHART */}
          <div className="flex items-center gap-1.5">
            {hasProducts && hasServices ? (
              <>
                <Icons.Orders color={textColors.smallText} size={12} />
                <Icons.Appointment color={textColors.smallText} size={12} />
              </>
            ) : hasServices ? (
              <Icons.Appointment color={textColors.smallText} size={14} />
            ) : (
              <Icons.Orders color={textColors.smallText} size={14} />
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textColors.title }}>
              {labels.countLabel}
            </span>
          </div>
          
          {/* 🔥 VALOR - MISMO ESTILO QUE SUMMARY CHART */}
          <div className="text-xl sm:text-2xl font-black tracking-tight mt-2" style={{ color: primary }}>
            {totalOrders}
          </div>
          
          {/* 🔥 FOOTER - EXACTAMENTE IGUAL QUE SUMMARY CHART */}
          <div
            className="flex items-center justify-between mt-3 pt-2 border-t"
            style={{ borderColor: cardBorder }}
          >
            <span className="text-[9px]" style={{ color: textColors.smallText }}>
              {labels.countSub}
            </span>
            {hasProducts && hasServices && (
              <span className="text-[9px] font-medium" style={{ color: textColors.smallText }}>
                {ordersCount} prod • {servicesCount} serv
              </span>
            )}
            {hasProducts && !hasServices && (
              <span className="text-[9px] font-medium" style={{ color: textColors.smallText }}>
                {ordersCount} prod
              </span>
            )}
            {!hasProducts && hasServices && (
              <span className="text-[9px] font-medium" style={{ color: textColors.smallText }}>
                {servicesCount} serv
              </span>
            )}
          </div>
        </div>

        <div 
          className="border rounded-2xl p-4"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          {/* 🔥 HEADER - EXACTAMENTE IGUAL QUE SUMMARY CHART */}
          <div className="flex items-center gap-1.5">
            <Icons.Clock color={primary} size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textColors.title }}>
              {labels.activityLabel}
            </span>
          </div>
          
          {/* 🔥 FECHA - MISMO ESTILO QUE SUMMARY CHART */}
          <div className="text-xs font-bold mt-2 truncate" style={{ color: '#f59e0b' }}>
            {lastOrderDate}
          </div>
          
          {/* 🔥 FOOTER - EXACTAMENTE IGUAL QUE SUMMARY CHART */}
          <div
            className="flex items-center justify-between mt-3 pt-2 border-t"
            style={{ borderColor: cardBorder }}
          >
            <span className="text-[9px]" style={{ color: textColors.smallText }}>
              {labels.activitySub}
            </span>
            <Icons.Calendar color={textColors.smallText} size={10} />
          </div>
        </div>
      </div>
    </div>
  );
});

SummaryMetrics.displayName = 'SummaryMetrics';

export default SummaryMetrics;