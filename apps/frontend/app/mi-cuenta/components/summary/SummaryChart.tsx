'use client';

import React, { useMemo } from 'react';
import { formatPrice } from '../../utils';

interface SummaryChartProps {
  orders: any[];
  appointments?: any[];
  chartData?: any[];
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  secondary?: string;
  bsRate?: number;
  ivaRate?: number;
  productsCount?: number;
  servicesCount?: number;
  hasProducts?: boolean;
  hasServices?: boolean;
}

// 🔥 ICONOS SVG DINÁMICOS (idénticos a Dashboard)
const Icons = {
  Trending: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  PieChart: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
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
};

const SummaryChart = React.memo(function SummaryChart({
    orders, 
  appointments = [],
  chartData: propChartData,
  primary, 
  textColor, 
  isDarkBg, 
  secondary,
  bsRate = 0,
  ivaRate = 16,
  hasProducts = false,
  hasServices = false,
}: SummaryChartProps) {
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

  // 🔥 FUNCIÓN PARA CALCULAR TOTAL EN VES CON IVA - SIN FALLBACKS
  const getOrderTotalVesWithIva = (order: any): number => {
    let totalVes = 0;
    let hasProduct = false;
    
    if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
      for (const item of order.items) {
        const quantity = Number(item.quantity || 1);
        let priceVes = 0;
        
        if (item.priceVes !== undefined && item.priceVes !== null && Number(item.priceVes) > 0) {
          priceVes = Number(item.priceVes);
        } else if (item.prices?.VES !== undefined && Number(item.prices.VES) > 0) {
          priceVes = Number(item.prices.VES);
        } else if (item.price !== undefined && item.price !== null && Number(item.price) > 0) {
          priceVes = Number(item.price);
        }
        
        totalVes += priceVes * quantity;
        
        if (item.itemType === 'product' || item.type === 'product' || 
            (item.category && !item.serviceModality)) {
          hasProduct = true;
        }
      }
    }

    // 🔥 SIN FALLBACK ESTÁTICO - SOLO DE ITEMS
    const ivaAmount = hasProduct ? totalVes * (ivaRate / 100) : 0;
    return totalVes + ivaAmount;
  };

  // 🔥 FUNCIÓN PARA OBTENER TOTAL DE CITA EN VES - SIN FALLBACKS
  const getAppointmentVesTotal = (appointment: any): number => {
    // 🔥 SOLO PRICEVES O CONVERSIÓN DE USD
    if (appointment?.priceVes !== undefined && appointment?.priceVes !== null && Number(appointment.priceVes) > 0) {
      return Number(appointment.priceVes);
    }
    const price = Number(appointment?.price || appointment?.total || 0);
    if (price > 0 && bsRate > 0) {
      return price * bsRate;
    }
    // 🔥 RETORNA 0 SI NO HAY DATOS VÁLIDOS
    return 0;
  };

  // 🔥 DATOS DEL GRÁFICO - SIN FALLBACKS
  const chartData = useMemo(() => {
    if (propChartData && Array.isArray(propChartData) && propChartData.length > 0) {
      return propChartData;
    }

    const summary: { [key: string]: { amount: number; count: number; date: Date } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      summary[dateKey] = { amount: 0, count: 0, date: d };
    }

    // 🔥 SUMAR ÓRDENES (SOLO SI EXISTEN)
    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach((o) => {
        const status = (o?.status || '').toLowerCase().trim();
        if (status.includes('canc') || status.includes('rechaz')) return;
        if (o.createdAt) {
          const d = new Date(o.createdAt);
          d.setHours(0, 0, 0, 0);
          const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          if (summary[dateKey]) {
            const total = getOrderTotalVesWithIva(o);
            summary[dateKey].amount += total;
            if (total > 0) {
              summary[dateKey].count += 1;
            }
          }
        }
      });
    }

    // 🔥 SUMAR CITAS (SOLO SI EXISTEN)
    if (Array.isArray(appointments) && appointments.length > 0) {
      appointments.forEach((a) => {
        const status = (a?.status || '').toLowerCase().trim();
        if (status.includes('canc') || status.includes('rechaz')) return;
        if (a.createdAt) {
          const d = new Date(a.createdAt);
          d.setHours(0, 0, 0, 0);
          const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          if (summary[dateKey]) {
            const total = getAppointmentVesTotal(a);
            summary[dateKey].amount += total;
            if (total > 0) {
              summary[dateKey].count += 1;
            }
          }
        }
      });
    }

    const sortedEntries = Object.entries(summary).sort((a, b) => 
      a[1].date.getTime() - b[1].date.getTime()
    );
    const maxVal = Math.max(...sortedEntries.map(([_, val]) => val.amount), 1);

    return sortedEntries.map(([label, val]) => ({
      label,
      amount: val.amount,
      count: val.count,
      height: val.amount > 0 ? `${Math.max(Math.round((val.amount / maxVal) * 85), 8)}%` : '4%'
    }));
  }, [orders, appointments, bsRate, propChartData]);

  // 🔤 LABELS DINÁMICOS
  const labels = useMemo(() => {
    const hasBoth = hasProducts && hasServices;
    const onlyProducts = hasProducts && !hasServices;
    const onlyServices = !hasProducts && hasServices;

    if (hasBoth) {
      return {
        title: 'Historial de Actividad',
        badge: 'Productos + Servicios',
        empty: 'No hay datos para graficar',
      };
    } else if (onlyProducts) {
      return {
        title: 'Historial de Compras',
        badge: 'Productos',
        empty: 'No hay compras para graficar',
      };
    } else if (onlyServices) {
      return {
        title: 'Historial de Servicios',
        badge: 'Servicios',
        empty: 'No hay servicios para graficar',
      };
    } else {
      return {
        title: 'Historial de Actividad',
        badge: 'Sin actividad',
        empty: 'No hay datos para graficar',
      };
    }
  }, [hasProducts, hasServices]);

  const hasData = useMemo(() => 
    chartData.some(bar => bar.count > 0), 
    [chartData]
  );

  // 🔥 CALCULAR PROMEDIO DIARIO (COMO EN DASHBOARD)
  const totalAmount = chartData.reduce((sum, d) => sum + d.amount, 0);
  const daysWithData = chartData.filter(d => d.count > 0).length;
  const averageDaily = daysWithData > 0 ? totalAmount / daysWithData : 0;

  return (
    <div 
      className="border rounded-2xl p-5"
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
    >
      {/* 🔥 HEADER - MISMO ESTILO QUE DASHBOARD */}
      <h4
        className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
        style={{ color: textColors.title }}
      >
        <Icons.Trending color={primary} size={14} />
        {labels.title}
      </h4>

      {/* 🔥 GRÁFICO - MISMA ESTRUCTURA Y ESTILOS QUE DASHBOARD */}
      <div className="relative flex items-end justify-between gap-1.5 h-40">
        {hasData ? (
          chartData.map((bar, idx) => (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              {/* 🔥 TOOLTIP - MISMO ESTILO QUE DASHBOARD */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/90 text-white text-[9px] rounded-lg py-1 px-2.5 pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-10">
                <span className="font-bold" style={{ color: primary }}>
                  Bs. {formatPrice(bar.amount)}
                </span>
                <span className="opacity-50 ml-1">
                  ({bar.count} {bar.count === 1 ? 'transacción' : 'transacciones'})
                </span>
              </div>
              
              {/* 🔥 BARRA - MISMA OPACIDAD Y TRANSICIÓN QUE DASHBOARD */}
              <div
                className="w-full rounded-t-lg group-hover:brightness-125 transition-all"
                style={{
                  height: bar.height,
                  backgroundColor: primary,
                  opacity: bar.count > 0 ? 0.85 : 0.2,
                }}
              />
              
              {/* 🔥 ETIQUETA - MISMO ESTILO QUE DASHBOARD */}
              <span
                className="text-[9px] mt-2 font-medium"
                style={{ color: textColors.subtitle }}
              >
                {bar.label}
              </span>
            </div>
          ))
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs"
            style={{ color: textColors.emptyState }}
          >
            {labels.empty}
          </div>
        )}
      </div>

      {/* 🔥 FOOTER - MISMO ESTILO QUE DASHBOARD */}
      <div
        className="flex items-center justify-between mt-3 pt-2 border-t"
        style={{ borderColor: cardBorder }}
      >
        <span className="text-[9px]" style={{ color: textColors.smallText }}>
          Promedio diario
        </span>
        <span className="text-xs font-bold" style={{ color: primary }}>
          Bs. {formatPrice(averageDaily)}
        </span>
      </div>
    </div>
  );
});

SummaryChart.displayName = 'SummaryChart';

export default SummaryChart;