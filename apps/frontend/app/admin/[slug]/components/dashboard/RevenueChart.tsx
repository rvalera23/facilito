'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { formatUsd } from '@/lib/price-utils';

interface RevenueChartProps {
  chartData: any[];
  primary: string;
  salesCurrency: { bs: string; usd: string; bsWithIva?: string };
  isDarkBg: boolean;
  subtleBorderColor: string;
  formatCurrency: (amount: number) => { bs: string; usd: string };
  isServiceBusiness?: boolean;
  bsRate?: number;
}

// ============================================================
// 🔥 HELPER: Formateo con separador de miles
// ============================================================
const formatPrice = (n: number): string =>
  n.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ============================================================
// 🔥 ICONOS MEMOIZADOS - FUERA DEL COMPONENTE
// ============================================================
const Icons = {
  Dollar: memo(({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M8 8c0-2 2-3 4-3s4 1 4 3-2 3-4 3-4 1-4 3 2 3 4 3 4-1 4-3" />
    </svg>
  )),
  Wallet: memo(({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )),
  Orders: memo(({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )),
  Calendar: memo(({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )),
  Trending: memo(({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )),
  Iva: memo(({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )),
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
const RevenueChart = memo(function RevenueChart({
  chartData = [],
  primary,
  salesCurrency,
  isDarkBg,
  subtleBorderColor,
  formatCurrency,
  isServiceBusiness = false,
  bsRate = 0,
}: RevenueChartProps) {
  // ✅ Memoizar estilos
  const cardBg = useMemo(
    () => (isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.6)'),
    [isDarkBg]
  );

  // ✅ Memoizar datos seguros
  const safeData = useMemo(
    () => (Array.isArray(chartData) ? chartData : []),
    [chartData]
  );

  // ✅ Memoizar cálculos
  const { totalCount, totalAmount, avgTicket, avgTicketUsd } = useMemo(() => {
    let totalOrders = 0;
    let totalVes = 0;

    for (const d of safeData) {
      totalOrders += Number(d.count) || 0;
      totalVes += Number(d.amount) || 0;
    }

    const avg = totalOrders > 0 ? totalVes / totalOrders : 0;
    // 🔥 NO usar fallback de 36.5. Si no hay tasa, no convertir.
    const avgUsd = bsRate > 0 ? avg / bsRate : 0;

    return {
      totalCount: totalOrders,
      totalAmount: totalVes,
      avgTicket: avg,
      avgTicketUsd: avgUsd,
    };
  }, [safeData, bsRate]);

  // ✅ Estado del tooltip
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  // ✅ Handlers memoizados
  const handleMouseEnter = useCallback((e: React.MouseEvent, d: any) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      data: d,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // ✅ Memoizar barras
  const bars = useMemo(() => {
    if (safeData.length === 0) {
      return (
        <div
          className="flex-1 flex items-center justify-center text-xs"
          style={{ color: '#94a3b8' }}
        >
          No hay datos para mostrar
        </div>
      );
    }

    const maxAmount = safeData.reduce(
      (max, d) => Math.max(max, Number(d.amount) || 0),
      0
    );
    const maxVal = maxAmount > 0 ? maxAmount : 1;
    // 🔥 NO usar fallback de 36.5. Si no hay tasa, no convertir.
    const rate = bsRate > 0 ? bsRate : 0;

    return safeData.map((d, index) => {
      const amount = Number(d.amount) || 0;
      const count = Number(d.count) || 0;
      const height = maxVal > 0 ? (amount / maxVal) * 100 : 0;

      const dayAvg = count > 0 ? amount / count : 0;
      const dayAvgUsd = rate > 0 ? dayAvg / rate : 0;
      const dayAmountUsd = rate > 0 ? amount / rate : 0;

      return (
        <div
          key={`${d.label}-${index}`}
          className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[36px] z-10 cursor-pointer"
          onMouseEnter={(e) =>
            handleMouseEnter(e, {
              ...d,
              amount,
              count,
              dayAvg,
              dayAvgUsd,
              dayAmountUsd,
            })
          }
          onMouseLeave={handleMouseLeave}
        >
          {count > 0 && (
            <span
              className="text-[9px] font-bold mb-1 group-hover:opacity-100 transition"
              style={{ color: '#64748b' }}
            >
              {count}
            </span>
          )}

          <div
            className="w-full rounded-t-lg transition-all duration-500 group-hover:brightness-125 shadow-md"
            style={{
              height: `${Math.max(height, 4)}%`,
              backgroundColor: primary || '#3b82f6',
              opacity: count === 0 ? 0.3 : 0.85 + (amount / maxVal) * 0.15,
            }}
          />

          <span
            className="text-[9px] mt-2 truncate w-full text-center font-medium"
            style={{ color: '#475569' }}
          >
            {d.label}
          </span>
        </div>
      );
    });
  }, [safeData, primary, bsRate, handleMouseEnter, handleMouseLeave]);

  // ✅ Memoizar tooltip
  const tooltipElement = useMemo(() => {
    if (!tooltip.visible || !tooltip.data) return null;

    const { label, amount, count, dayAvg, dayAvgUsd, dayAmountUsd } =
      tooltip.data;

    return createPortal(
      <div
        className="fixed pointer-events-none z-[99999] transition-opacity duration-200"
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="bg-black/95 text-white text-[10px] rounded-xl py-2 px-4 shadow-2xl border border-white/15 min-w-[180px]">
          {/* 🔥 Fix: usar formatPrice con separador de miles */}
          <p className="font-extrabold text-emerald-400 flex items-center gap-1.5">
            <Icons.Dollar color="#34d399" size={14} />
            Bs. {formatPrice(amount)}
            {dayAmountUsd > 0 && (
              <span className="opacity-60 text-[9px] font-normal">
(${formatUsd(dayAmountUsd)})
              </span>
            )}
          </p>
          <p className="opacity-80 text-[9px] flex items-center gap-1.5 mt-0.5">
            <Icons.Orders color="#94a3b8" size={12} />
            {count} {isServiceBusiness ? 'citas' : 'órdenes'}
            <span className="opacity-50 ml-1">•</span>
            {/* 🔥 Fix: usar formatPrice */}
            <span className="opacity-60">
              Bs. {formatPrice(dayAvg)} c/u
            </span>
            {dayAvgUsd > 0 && (
              <span className="opacity-40">(${formatUsd(dayAvgUsd)})</span>
            )}
          </p>
          <div className="border-t border-white/10 mt-1 pt-1 text-[9px] opacity-50 flex items-center gap-1.5">
            <Icons.Calendar color="#94a3b8" size={12} />
            {label || ''}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-black/95 border-r border-b border-white/15" />
        </div>
      </div>,
      document.body
    );
  }, [tooltip, isServiceBusiness]);

  // ✅ Memoizar labels
  const labels = useMemo(() => {
    if (isServiceBusiness) {
      return {
        title: 'Tendencia de Citas y Rendimiento',
        subtitle: 'Comportamiento diario',
        ticket: 'Ticket Promedio',
        global: 'Citas Globales',
        totalLabel: 'citas totales',
        withIva: 'Con IVA:',
      };
    }
    return {
      title: 'Tendencia de Ingresos y Rendimiento',
      subtitle: 'Comportamiento diario',
      ticket: 'Ticket Promedio',
      global: 'Ingreso Global',
      totalLabel: 'órdenes totales',
      withIva: 'Con IVA:',
    };
  }, [isServiceBusiness]);

  return (
    <>
      <div
        className="w-full border p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-xl overflow-visible h-full"
        style={{
          backgroundColor: cardBg,
          borderColor: subtleBorderColor,
        }}
      >
        {/* HEADER */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b pb-3"
          style={{ borderColor: subtleBorderColor }}
        >
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              style={{ color: '#1e293b' }}
            >
              <Icons.Trending color={primary} size={14} />
              {labels.title}
            </h3>
            <p
              className="text-[10px] flex items-center gap-2 mt-0.5"
              style={{ color: '#475569' }}
            >
              <Icons.Calendar color={primary} size={10} />
              {labels.subtitle} •
              <span className="font-semibold" style={{ color: primary }}>
                {totalCount} {labels.totalLabel}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            {/* Ticket promedio */}
            <div>
              <div
                className="text-[9px] uppercase font-semibold flex items-center gap-1 justify-end"
                style={{ color: '#64748b' }}
              >
                <Icons.Dollar color={primary} size={10} />
                {labels.ticket}
              </div>
              {/* 🔥 Fix: usar formatPrice con separador de miles */}
              <div className="text-xs font-bold" style={{ color: '#0f172a' }}>
                Bs. {formatPrice(avgTicket)}
              </div>
              {bsRate > 0 && (
                <div className="text-[8px]" style={{ color: '#94a3b8' }}>
                  ${formatUsd(avgTicketUsd)} USD
                </div>
              )}
            </div>

            {/* Ingreso Global (🔥 icono Wallet, no Dollar) */}
            <div
              className="border-l pl-4"
              style={{ borderColor: subtleBorderColor }}
            >
              <div
                className="text-[9px] uppercase font-semibold flex items-center gap-1 justify-end"
                style={{ color: '#64748b' }}
              >
                <Icons.Wallet color={primary} size={10} />
                {labels.global}
              </div>
              <span className="text-xs font-black" style={{ color: '#0f172a' }}>
                Bs. {salesCurrency.bs}
              </span>
              {salesCurrency.bsWithIva && (
                <div
                  className="text-[8px] flex items-center gap-1 justify-end"
                  style={{ color: '#94a3b8' }}
                >
                  <Icons.Iva color="#94a3b8" size={8} />
                  {labels.withIva} Bs. {salesCurrency.bsWithIva}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="relative flex-1 min-h-[160px] w-full flex items-end gap-2 pt-4 pb-2 px-1 overflow-x-auto overflow-y-visible custom-scrollbar">
          <div className="absolute inset-x-0 top-4 bottom-6 flex flex-col justify-between pointer-events-none opacity-20">
            <div
              className="border-b w-full"
              style={{ borderColor: subtleBorderColor }}
            />
            <div
              className="border-b w-full"
              style={{ borderColor: subtleBorderColor }}
            />
            <div
              className="border-b w-full"
              style={{ borderColor: subtleBorderColor }}
            />
          </div>

          {bars}
        </div>
      </div>

      {tooltipElement}
    </>
  );
});

RevenueChart.displayName = 'RevenueChart';

export default RevenueChart;