import React, { memo } from 'react';
import { TrendingUp, PieChart } from 'lucide-react';
import { getDashboardTextColors } from '@/lib/dashboardTextColors';
import { formatUsd } from '@/lib/price-utils';

// ============================================================
// 🔥 ICONOS SVG INLINE (heredan color del tema)
// ============================================================
const TruckIcon = ({ color, size = 14 }: { color?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: color || 'currentColor', display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M10 17h4V5H2v12h3" />
    <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
    <circle cx="7.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const StoreIcon = ({ color, size = 14 }: { color?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: color || 'currentColor', display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M3 9l1.5-6h15L21 9" />
    <path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" />
    <path d="M3 9h18" />
    <path d="M9 22V12h6v10" />
  </svg>
);

const PackageIcon = ({ color, size = 14 }: { color?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: color || 'currentColor', display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M16.5 9.4l-9-5.19" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

// ============================================================
// 🔥 TIPOS
// ============================================================
interface ChartData {
  label: string;
  amount: number;
  amountUsd: number;
  count: number;
  height: number;
}

interface StatusData {
  pending?: number;
  confirmed?: number;
  completed?: number;
  cancelled?: number;
  noShow?: number;
}

interface DeliveryMetricsData {
  withShipping: {
    count: number;
    totalVes: number;
    totalUsd: number;
    avgTicketVes: number;
    avgTicketUsd: number;
  };
  withoutShipping: {
    count: number;
    totalVes: number;
    totalUsd: number;
    avgTicketVes: number;
    avgTicketUsd: number;
  };
  byCompany: Record<string, { count: number; totalVes: number; totalUsd: number }>;
  bySource: Record<string, { count: number; totalVes: number; totalUsd: number }>;
}

interface DashboardChartsProps {
  chartData: ChartData[];
  statusData: StatusData;
  statusTotal: number;
  isServiceBusiness: boolean;
  primary: string;
  greenColor: string;
  darkerText: string;
  cardBg: string;
  cardBorder: string;
  labels: {
    ordersLabel: string;
    ordersPlural: string;
    itemLabel: string;
    itemPlural: string;
    topLabel: string;
    countLabel: string;
    pendingLabel: string;
  };
  deliveryMetrics?: DeliveryMetricsData;
}

// ============================================================
// 🔥 HELPERS
// ============================================================
const formatPrice = (n: number): string => {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const COMPANY_LABELS: Record<string, string> = {
  mrw: 'MRW',
  domesa: 'Domesa',
  tealca: 'Tealca',
  zoom: 'Zoom',
  otro: 'Otra',
};

const COMPANY_COLORS: Record<string, string> = {
  mrw: '#e11d48',
  domesa: '#0ea5e9',
  tealca: '#8b5cf6',
  zoom: '#f59e0b',
  otro: '#94a3b8',
};

// ============================================================
// 🔥 COMPONENTE
// ============================================================
const DashboardCharts = memo(function DashboardCharts({
  chartData,
  statusData,
  statusTotal,
  isServiceBusiness,
  primary,
  greenColor,
  darkerText,
  cardBg,
  cardBorder,
  labels,
  deliveryMetrics,
}: DashboardChartsProps) {
  const colorMap: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#ef4444',
    noShow: '#94a3b8',
  };

  const labelMap: Record<string, string> = {
    pending: isServiceBusiness ? 'Pendientes' : 'Pendientes',
    confirmed: isServiceBusiness ? 'Confirmadas' : 'Confirmados',
    completed: isServiceBusiness ? 'Realizadas' : 'Completados',
    cancelled: 'Cancelados',
    noShow: 'No Asistieron',
  };

  const isDarkMode =
    cardBg?.includes('0, 0, 0') ||
    cardBg?.includes('rgba(0, 0, 0') ||
    cardBg?.includes('#1') ||
    cardBg?.includes('#0') ||
    cardBg?.includes('bg-black') ||
    cardBg?.includes('dark');

  const baseTextColors = getDashboardTextColors(isDarkMode);
  const textColors = {
    ...baseTextColors,
    emptyState: baseTextColors.muted,
  };

  const totalWeekVes = chartData.reduce((sum, d) => sum + d.amount, 0);
  const daysWithSales = chartData.filter((d) => d.count > 0).length;
  const avgDaily = chartData.length > 0 ? totalWeekVes / chartData.length : 0;
  const avgDailyWithSales = daysWithSales > 0 ? totalWeekVes / daysWithSales : 0;

  const withShipping = deliveryMetrics?.withShipping;
  const withoutShipping = deliveryMetrics?.withoutShipping;
  const byCompany = deliveryMetrics?.byCompany || {};
  const hasDeliveryData =
    !!withShipping &&
    !!withoutShipping &&
    withShipping.count + withoutShipping.count > 0;

  const deliveryTotal = hasDeliveryData
    ? withShipping.count + withoutShipping.count
    : 0;

  const shippingPercent = hasDeliveryData
    ? Math.round((withShipping.count / deliveryTotal) * 100)
    : 0;

  const totalDeliveryVes = hasDeliveryData
    ? withShipping.totalVes + withoutShipping.totalVes
    : 0;

  const companyEntries = Object.entries(byCompany).sort(
    (a, b) => b[1].totalVes - a[1].totalVes
  );

  const maxCompanyVes =
    companyEntries.length > 0
      ? Math.max(...companyEntries.map(([, d]) => d.totalVes))
      : 1;

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* FILA 1: Ingresos 7 días + Distribución de estados */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 1: Ingresos 7 días */}
        <div
          className="border rounded-2xl p-5"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <h4
            className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
            style={{ color: textColors.title }}
          >
            <TrendingUp size={14} color={greenColor} />
            Ingresos últimos 7 días
          </h4>
          <div className="relative flex items-end justify-between gap-1.5 h-40">
            {chartData.map((d, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/90 text-white text-[9px] rounded-lg py-1 px-2.5 pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-10">
                  <span className="font-bold" style={{ color: greenColor }}>
                    Bs. {formatPrice(d.amount)}
                  </span>
                  <span className="opacity-60 ml-1">
(${formatUsd(d.amountUsd)})
                  </span>
                  <span className="opacity-50 ml-1">
                    · {d.count} {d.count === 1 ? labels.ordersLabel : labels.ordersPlural}
                  </span>
                </div>
                <div
                  className="w-full rounded-t-lg group-hover:brightness-125 transition-all"
                  style={{
                    height: `${d.height}%`,
                    backgroundColor: primary,
                    opacity: d.count > 0 ? 0.85 : 0.2,
                  }}
                />
                <span
                  className="text-[9px] mt-2 font-medium"
                  style={{ color: textColors.subtitle }}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex items-center justify-between mt-3 pt-2 border-t"
            style={{ borderColor: cardBorder }}
          >
            <span className="text-[9px]" style={{ color: textColors.smallText }}>
              Promedio diario {daysWithSales > 0 ? `(${daysWithSales}/7 días con ventas)` : ''}
            </span>
            <div className="text-right">
              <span className="text-xs font-bold block" style={{ color: primary }}>
                Bs. {formatPrice(avgDaily)}
              </span>
              {daysWithSales > 0 && daysWithSales < chartData.length && (
                <span className="text-[8px] block" style={{ color: textColors.smallText }}>
                  Bs. {formatPrice(avgDailyWithSales)} en días activos
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Distribución de estados */}
        <div
          className="border rounded-2xl p-5"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <h4
            className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
            style={{ color: textColors.title }}
          >
            <PieChart size={14} color={primary} />
            Distribución de {labels.ordersLabel}
          </h4>
          {statusTotal > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(statusData).map(([key, value]) => {
                const percentage =
                  statusTotal > 0 ? (value / statusTotal) * 100 : 0;
                const color = colorMap[key] || '#94a3b8';
                const label = labelMap[key] || key;

                return (
                  <div key={key} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: textColors.label }}>{label}</span>
                      <span
                        className="font-bold"
                        style={{ color: textColors.value }}
                      >
                        {value} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: `${color}30` }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-32 text-xs"
              style={{ color: textColors.emptyState }}
            >
              No hay datos para mostrar
            </div>
          )}
        </div>
      </div>


    </div>
  );
});

DashboardCharts.displayName = 'DashboardCharts';

export default DashboardCharts;