'use client';

import React, { memo } from 'react';
import { getDashboardTextColors } from '@/lib/dashboardTextColors';
import { formatUsd } from '@/lib/price-utils';

// ============================================================
// 🔥 ICONOS SVG INLINE (heredan color del tema, sin Lucide)
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

const GlobeIcon = ({ color, size = 14 }: { color?: string; size?: number }) => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const MonitorSmartphoneIcon = ({ color, size = 14 }: { color?: string; size?: number }) => (
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
    <path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" />
    <path d="M10 19v-3.96 3.15" />
    <path d="M7 19h5" />
    <rect width="6" height="10" x="16" y="12" rx="2" />
  </svg>
);

// ============================================================
// 🔥 TIPOS
// ============================================================
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

interface DashboardDeliveryMetricsProps {
  deliveryMetrics: DeliveryMetricsData;
  primary: string;
  greenColor: string;
  darkerText: string;
  cardBg: string;
  cardBorder: string;
  isDarkBg?: boolean;   // ← NUEVO
  formatPrice: (n: number) => string;
}

// ============================================================
// 🔥 LABELS
// ============================================================
const COMPANY_LABELS: Record<string, string> = {
  mrw: 'MRW',
  domesa: 'Domesa',
  tealca: 'Tealca',
  zoom: 'Zoom',
  otro: 'Otra',
};

const SOURCE_LABELS: Record<string, { label: string; Icon: any }> = {
  kiosk: { label: 'Kiosco', Icon: MonitorSmartphoneIcon },
  web: { label: 'Web', Icon: GlobeIcon },
  admin: { label: 'Admin', Icon: StoreIcon },
};

// ============================================================
// 🔥 COMPONENTE
// ============================================================
const DashboardDeliveryMetrics = memo(function DashboardDeliveryMetrics({
  deliveryMetrics,
  primary,
  greenColor,
  darkerText,
  cardBg,
  cardBorder,
  isDarkBg,   // ← NUEVO
  formatPrice,
}: DashboardDeliveryMetricsProps) {
  const { withShipping, withoutShipping, byCompany, bySource } = deliveryMetrics;

  const totalCount = withShipping.count + withoutShipping.count;
  const totalVes = withShipping.totalVes + withoutShipping.totalVes;
  const totalUsd = withShipping.totalUsd + withoutShipping.totalUsd;

  const shippingPercent = totalCount > 0 ? Math.round((withShipping.count / totalCount) * 100) : 0;
  const noShippingPercent = totalCount > 0 ? 100 - shippingPercent : 0;

  const hasCompanies = Object.keys(byCompany).length > 0;
  const hasSources = Object.keys(bySource).length > 0;

  // Modo oscuro: usar prop explícita, con fallback a detección por cardBg
  const isDarkMode = isDarkBg ?? (
    cardBg?.includes('0, 0, 0') ||
    cardBg?.includes('rgba(0, 0, 0') ||
    cardBg?.includes('#1') ||
    cardBg?.includes('#0') ||
    cardBg?.includes('bg-black') ||
    cardBg?.includes('dark')
  );

  // 🔥 Colores dinámicos unificados
  const textColors = getDashboardTextColors(isDarkMode);

  // Si no hay nada, no renderizamos
  if (totalCount === 0) return null;

  return (
    <div
      className="border rounded-3xl shadow-xl p-6 space-y-5"
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TruckIcon color={primary} size={18} />
          <h3
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: textColors.title }}
          >
            Tipos de Entrega
          </h3>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${primary}15`, color: primary }}
        >
          {totalCount} {totalCount === 1 ? 'pedido' : 'pedidos'} · Bs. {formatPrice(totalVes)} (${formatUsd(totalUsd)})
        </span>
      </div>

      {/* TARJETAS: CON ENVÍO vs SIN ENVÍO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CON ENVÍO */}
        <div
          className="p-4 rounded-2xl border-2 relative overflow-hidden"
          style={{ borderColor: `${primary}40`, backgroundColor: `${primary}08` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TruckIcon color={primary} size={14} />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: primary }}
              >
                Con envío
              </span>
            </div>
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              {shippingPercent}%
            </span>
          </div>
          <div className="text-lg font-black leading-tight" style={{ color: primary }}>
            Bs. {formatPrice(withShipping.totalVes)}
          </div>
          <div
            className="text-[11px] font-semibold"
            style={{ color: greenColor }}
          >
            (${formatUsd(withShipping.totalUsd)})
          </div>
          <div
            className="mt-2 text-[10px] opacity-70"
            style={{ color: textColors.subtitle }}
          >
            {withShipping.count} {withShipping.count === 1 ? 'pedido' : 'pedidos'}
            {withShipping.count > 0 && (
              <>
{' · '}Ticket prom: Bs. {formatPrice(withShipping.avgTicketVes)} (${formatUsd(withShipping.avgTicketUsd)})
              </>
            )}
          </div>
        </div>

        {/* SIN ENVÍO */}
        <div
          className="p-4 rounded-2xl border-2 relative overflow-hidden"
          style={{ borderColor: `${primary}20`, backgroundColor: `${primary}04` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <StoreIcon color={primary} size={14} />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: primary }}
              >
                Sin envío
              </span>
            </div>
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${primary}15`, color: primary }}
            >
              {noShippingPercent}%
            </span>
          </div>
          <div className="text-lg font-black leading-tight" style={{ color: primary }}>
            Bs. {formatPrice(withoutShipping.totalVes)}
          </div>
          <div
            className="text-[11px] font-semibold"
            style={{ color: greenColor }}
          >
(${formatUsd(withoutShipping.totalUsd)})
          </div>
          <div
            className="mt-2 text-[10px] opacity-70"
            style={{ color: textColors.subtitle }}
          >
            {withoutShipping.count} {withoutShipping.count === 1 ? 'pedido' : 'pedidos'}
            {withoutShipping.count > 0 && (
              <>
{' · '}Ticket prom: Bs. {formatPrice(withoutShipping.avgTicketVes)} (${formatUsd(withoutShipping.avgTicketUsd)})
              </>
            )}
          </div>
        </div>
      </div>

      {/* POR MENSAJERÍA */}
      {hasCompanies && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PackageIcon color={primary} size={13} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: textColors.title }}
            >
              Por mensajería
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(byCompany)
              .sort((a, b) => b[1].totalVes - a[1].totalVes)
              .map(([company, data]) => {
                const label = COMPANY_LABELS[company] || company;
                const percent = withShipping.totalVes > 0
                  ? Math.round((data.totalVes / withShipping.totalVes) * 100)
                  : 0;
                return (
                  <div
                    key={company}
                    className="p-3 rounded-xl border"
                    style={{
                      borderColor: `${primary}25`,
                      backgroundColor: `${primary}06`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: primary }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-[9px] font-bold opacity-60"
                        style={{ color: textColors.smallText }}
                      >
                        {percent}%
                      </span>
                    </div>
                    <div
                      className="text-sm font-black leading-tight"
                      style={{ color: primary }}
                    >
                      Bs. {formatPrice(data.totalVes)}
                    </div>
                    <div
                      className="text-[9px] font-semibold"
                      style={{ color: greenColor }}
                    >
(${formatUsd(data.totalUsd)})
                    </div>
                    <div
                      className="text-[9px] opacity-60 mt-0.5"
                      style={{ color: textColors.smallText }}
                    >
                      {data.count} {data.count === 1 ? 'pedido' : 'pedidos'}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* POR ORIGEN (KIOSCO vs WEB) */}
      {hasSources && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <GlobeIcon color={primary} size={13} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: textColors.title }}
            >
              Origen de la orden
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bySource)
              .sort((a, b) => b[1].totalVes - a[1].totalVes)
              .map(([source, data]) => {
                const sourceInfo = SOURCE_LABELS[source] || { label: source, Icon: GlobeIcon };
                const Icon = sourceInfo.Icon;
                const percent = totalVes > 0
                  ? Math.round((data.totalVes / totalVes) * 100)
                  : 0;
                return (
                  <div
                    key={source}
                    className="px-3 py-2 rounded-xl border flex items-center gap-2"
                    style={{
                      borderColor: `${primary}25`,
                      backgroundColor: `${primary}06`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${primary}15` }}
                    >
                      <Icon color={primary} size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-black uppercase tracking-wider"
                          style={{ color: primary }}
                        >
                          {sourceInfo.label}
                        </span>
                        <span
                          className="text-[9px] font-bold opacity-60"
                          style={{ color: textColors.smallText }}
                        >
                          {percent}%
                        </span>
                      </div>
                      <div
                        className="text-xs font-black leading-tight"
                        style={{ color: primary }}
                      >
                        Bs. {formatPrice(data.totalVes)}
                        <span
                          className="text-[9px] font-semibold ml-1"
                          style={{ color: greenColor }}
                        >
(${formatUsd(data.totalUsd)})
                        </span>
                      </div>
                      <div
                        className="text-[9px] opacity-60"
                        style={{ color: textColors.smallText }}
                      >
                        {data.count} {data.count === 1 ? 'pedido' : 'pedidos'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
});

DashboardDeliveryMetrics.displayName = 'DashboardDeliveryMetrics';

export default DashboardDeliveryMetrics;