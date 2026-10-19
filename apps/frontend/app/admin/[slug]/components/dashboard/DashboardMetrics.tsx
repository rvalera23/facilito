import React, { memo } from 'react';
import { DollarSign, ShoppingBag, Users, Calendar, Receipt, Truck } from 'lucide-react';
import { getDashboardTextColors } from '@/lib/dashboardTextColors';

interface DashboardMetricsProps {
  totalSalesUsd: number;
  totalSalesVes: number;
  totalOrdersCount: number;
  totalAppointmentsCount: number;
  pendingOrdersCount: number;
  totalCustomersCount: number;
  statusData: Record<string, number>;
  isServiceBusiness: boolean;
  primary: string;
  greenColor: string;
  darkerText: string;
  cardBg: string;
  cardBorder: string;
  isDarkBg?: boolean;   // ← NUEVO
  formatCurrency: (amount: number) => { bs: string; usd: string };
  onNavigate: (section: string, filter?: any) => void;
  labels: {
    ordersLabel: string;
    ordersPlural: string;
    itemLabel: string;
    itemPlural: string;
    topLabel: string;
    countLabel: string;
    pendingLabel: string;
  };
  // 🔥 NUEVO: datos de delivery para badges
  deliveryMetrics?: {
    withShipping: { count: number; totalVes: number; totalUsd: number; avgTicketVes: number; avgTicketUsd: number };
    withoutShipping: { count: number; totalVes: number; totalUsd: number; avgTicketVes: number; avgTicketUsd: number };
    byCompany: Record<string, { count: number; totalVes: number; totalUsd: number }>;
    bySource: Record<string, { count: number; totalVes: number; totalUsd: number }>;
  };
}

const DashboardMetrics = memo(function DashboardMetrics({
  totalSalesUsd,
  totalSalesVes,
  totalOrdersCount,
  totalAppointmentsCount,
  pendingOrdersCount,
  totalCustomersCount,
  statusData,
  isServiceBusiness,
  primary,
  greenColor,
  darkerText,
  cardBg,
  cardBorder,
  isDarkBg,   // ← NUEVO
  formatCurrency,
  onNavigate,
  labels,
  deliveryMetrics,
}: DashboardMetricsProps) {
  const salesFormatted = formatCurrency(totalSalesUsd);

  // 🔥 Ticket promedio
  const avgTicketUsd = totalOrdersCount > 0 ? totalSalesUsd / totalOrdersCount : 0;
  const avgTicketVes = totalOrdersCount > 0 ? totalSalesVes / totalOrdersCount : 0;
  const avgFormatted = formatCurrency(avgTicketUsd);

  // 🔥 Datos de delivery
  const withShipping = deliveryMetrics?.withShipping;
  const withoutShipping = deliveryMetrics?.withoutShipping;
  const hasShippingData = !!withShipping && !!withoutShipping && (withShipping.count + withoutShipping.count) > 0;

  // 🔥 Total recaudado por envío (calculado a partir de órdenes con envío)
  const totalShippingVes = withShipping?.totalVes && withoutShipping?.totalVes
    ? Math.max(0, (totalSalesVes - withoutShipping.totalVes) - (withShipping.totalVes - (totalSalesVes - withoutShipping.totalVes)))
    : 0;

  // Modo oscuro: usar prop explícita, con fallback a detección por cardBg
  const isDarkMode = isDarkBg ?? (
    cardBg?.includes('0, 0, 0') ||
    cardBg?.includes('rgba(0, 0, 0') ||
    cardBg?.includes('#1') ||
    cardBg?.includes('#0')
  );

  // Colores dinámicos según el tema (unificados)
  const textColors = getDashboardTextColors(isDarkMode);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* ============================================================ */}
      {/* Tarjeta 1: Ventas */}
      {/* ============================================================ */}
      <div
        className="border rounded-2xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        onClick={() => onNavigate('orders', { status: 'completed' })}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: textColors.title }}
          >
            Ventas
          </span>
          <DollarSign size={14} color={greenColor} />
        </div>
        <div className="space-y-0.5">
          <div className="text-xl font-black tracking-tight" style={{ color: primary }}>
            Bs. {salesFormatted.bs}
          </div>
          <div className="text-[11px] font-bold" style={{ color: greenColor }}>
            ${salesFormatted.usd} USD
          </div>
        </div>
        <div
          className="mt-3 pt-2 border-t text-[9px] font-medium"
          style={{ borderColor: cardBorder, color: textColors.smallText }}
        >
          {totalOrdersCount} {labels.ordersPlural} completados
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tarjeta 2: Pedidos / Citas */}
      {/* ============================================================ */}
      <div
        className="border rounded-2xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        onClick={() => onNavigate('orders')}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: textColors.title }}
          >
            {labels.ordersLabel}
          </span>
          {isServiceBusiness ? (
            <Calendar size={14} color={primary} />
          ) : (
            <ShoppingBag size={14} color={primary} />
          )}
        </div>
        <div className="space-y-0.5">
          <div
            className="text-xl font-black tracking-tight"
            style={{ color: textColors.value }}
          >
            {isServiceBusiness ? totalAppointmentsCount : totalOrdersCount}
          </div>
          <div className="text-[11px] font-medium" style={{ color: textColors.subtitle }}>
            {isServiceBusiness ? 'citas registradas' : 'órdenes recibidas'}
          </div>
        </div>

        {/* 🔥 Badge Con envío / Sin envío (solo si hay datos) */}
        {!isServiceBusiness && hasShippingData && (
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${primary}15`,
                color: primary,
              }}
            >
              <Truck size={9} />
              {withShipping.count} envío
            </span>
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: textColors.subtitle,
              }}
            >
              {withoutShipping.count} retiro
            </span>
          </div>
        )}

        <div
          className="mt-3 pt-2 border-t flex justify-between text-[9px] font-medium"
          style={{ borderColor: cardBorder }}
        >
          <span style={{ color: textColors.smallText }}>
            Pendientes: {pendingOrdersCount}
          </span>
          <span style={{ color: primary }}>
            Completados: {statusData.completed || 0}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tarjeta 3: Clientes */}
      {/* ============================================================ */}
      <div
        className="border rounded-2xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        onClick={() => onNavigate('orders')}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: textColors.title }}
          >
            Clientes
          </span>
          <Users size={14} color={primary} />
        </div>
        <div className="space-y-0.5">
          <div
            className="text-xl font-black tracking-tight"
            style={{ color: textColors.value }}
          >
            {totalCustomersCount}
          </div>
          <div className="text-[11px] font-medium" style={{ color: textColors.subtitle }}>
            clientes únicos
          </div>
        </div>
        <div
          className="mt-3 pt-2 border-t text-[9px] font-medium"
          style={{ borderColor: cardBorder, color: textColors.smallText }}
        >
          {isServiceBusiness
            ? `${totalAppointmentsCount} citas`
            : `${totalOrdersCount} órdenes`}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tarjeta 4: Ticket Promedio (NUEVA) */}
      {/* ============================================================ */}
      <div
        className="border rounded-2xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        onClick={() => onNavigate('orders', { status: 'completed' })}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: textColors.title }}
          >
            Ticket Promedio
          </span>
          <Receipt size={14} color={primary} />
        </div>
        <div className="space-y-0.5">
          <div className="text-xl font-black tracking-tight" style={{ color: primary }}>
            Bs. {avgFormatted.bs}
          </div>
          <div className="text-[11px] font-bold" style={{ color: greenColor }}>
            ${avgFormatted.usd} USD
          </div>
        </div>
        <div
          className="mt-3 pt-2 border-t text-[9px] font-medium"
          style={{ borderColor: cardBorder, color: textColors.smallText }}
        >
          Basado en {totalOrdersCount} {labels.ordersPlural}
        </div>
      </div>
    </div>
  );
});

DashboardMetrics.displayName = 'DashboardMetrics';

export default DashboardMetrics;