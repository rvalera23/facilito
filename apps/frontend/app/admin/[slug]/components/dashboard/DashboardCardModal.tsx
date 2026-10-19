import React, { memo } from 'react';
import { TrendingUp, ShoppingBag, Truck, Store, MonitorSmartphone } from 'lucide-react';
import { getDashboardTextColors } from '@/lib/dashboardTextColors';
import { formatUsd } from '@/lib/price-utils';

interface TopItem {
  name: string;
  count?: number;
  quantity?: number;
}

interface RecentOrder {
  id: string;
  customerName?: string;
  clientName?: string;
  status: string;
  createdAt?: string;
  totalVes?: number;
  totalAmount?: number;
  paymentMetadata?: {
    source?: string;
    delivery?: {
      selected?: boolean;
      company?: string;
      companyName?: string;
      costVes?: number;
      costUsd?: number;
    };
  };
  items?: any[];
}

interface DashboardCardModalProps {
  topItems: TopItem[];
  topMaxValue: number;
  isServiceBusiness: boolean;
  recentOrders: RecentOrder[];
  primary: string;
  greenColor: string;
  darkerText: string;
  cardBg: string;
  cardBorder: string;
  isDarkBg?: boolean;   // ← NUEVO
  bsRate: number;
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
  getOrderVesTotal: (order: any, bsRate: number) => number;
  getOrderUsdTotal?: (order: any) => number;
}

// 🔥 Helper de formato con separador de miles
const formatPrice = (n: number): string =>
  n.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// 🔥 Labels de mensajería
const COMPANY_LABELS: Record<string, string> = {
  mrw: 'MRW',
  domesa: 'Domesa',
  tealca: 'Tealca',
  zoom: 'Zoom',
  otro: 'Otra',
};

// 🔥 Badge de mensajería / retiro
const DeliveryBadge = memo(function DeliveryBadge({
  order,
  isDarkMode,
  primary,
}: {
  order: RecentOrder;
  isDarkMode: boolean;
  primary: string;
}) {
  const delivery = order?.paymentMetadata?.delivery;
  const source = order?.paymentMetadata?.source?.toLowerCase();

  // Kiosco (autoservicio)
  if (source === 'kiosk') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
        style={{
          backgroundColor: 'rgba(139,92,246,0.15)',
          color: '#8b5cf6',
        }}
      >
        <MonitorSmartphone size={9} />
        Kiosco
      </span>
    );
  }

  const hasShipping = !!(
    delivery?.selected &&
    (Number(delivery.costVes) > 0 || Number(delivery.costUsd) > 0)
  );

  if (hasShipping) {
    const company = (delivery.company || delivery.companyName || 'otro').toLowerCase();
    const label = COMPANY_LABELS[company] || company;

    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
        style={{
          backgroundColor: `${primary}15`,
          color: primary,
        }}
      >
        <Truck size={9} />
        {label}
      </span>
    );
  }

  // Sin envío
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#64748b',
      }}
    >
      <Store size={9} />
      Retiro
    </span>
  );
});
DeliveryBadge.displayName = 'DeliveryBadge';

// 🔥 Badge de estado
const StatusBadge = memo(({ status }: { status: string }) => {
  const normalized = (status || '').toLowerCase().trim();

  const configs: Record<string, { label: string; bg: string; color: string }> = {
    completado: { label: 'Completado', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    completed: { label: 'Completado', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    pagado: { label: 'Pagado', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    confirmado: { label: 'Confirmado', bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    confirmed: { label: 'Confirmado', bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    pendiente: { label: 'Pendiente', bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
    pending: { label: 'Pendiente', bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
    por_verificar: { label: 'Por Verificar', bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
    verificando: { label: 'Verificando', bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
    cancelado: { label: 'Cancelado', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    cancelled: { label: 'Cancelado', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    rechazado: { label: 'Rechazado', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  };

  const config = configs[normalized] || {
    label: status || 'Desconocido',
    bg: 'rgba(100,116,139,0.15)',
    color: '#64748b',
  };

  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const DashboardCardModal = memo(function DashboardCardModal({
  topItems,
  topMaxValue,
  isServiceBusiness,
  recentOrders,
  primary,
  greenColor,
  darkerText,
  cardBg,
  cardBorder,
  isDarkBg,   // ← NUEVO
  bsRate,
  onNavigate,
  labels,
  getOrderVesTotal,
  getOrderUsdTotal,
}: DashboardCardModalProps) {
  // Modo oscuro: usar prop explícita, con fallback a detección por cardBg
  const isDarkMode = isDarkBg ?? (
    cardBg?.includes('0, 0, 0') ||
    cardBg?.includes('rgba(0, 0, 0') ||
    cardBg?.includes('#1') ||
    cardBg?.includes('#0')
  );

  // Colores de texto dinámicos unificados
  const textColors = getDashboardTextColors(isDarkMode);

  // 🔥 Helper interno para USD (fallback si no viene prop)
  const resolveUsd = (order: RecentOrder): number => {
    if (getOrderUsdTotal) return getOrderUsdTotal(order);
    // Fallback: intentar totalAmount directo
    if (order?.totalAmount && Number(order.totalAmount) > 0) {
      return Number(order.totalAmount);
    }
    // Último recurso: convertir desde VES con la tasa
    const totalVes = getOrderVesTotal(order, bsRate);
    if (bsRate > 0) return totalVes / bsRate;
    return 0;
  };

  return (
    <>
      {/* ============================================================ */}
      {/* Top 5 productos/servicios */}
      {/* ============================================================ */}
      <div
        className="border rounded-2xl p-5"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      >
        <h4
          className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
          style={{ color: textColors.title }}
        >
          <TrendingUp size={14} color={greenColor} />
          {labels.topLabel}
        </h4>
        {topItems.length > 0 ? (
          <div className="space-y-3">
            {topItems.map((item, idx) => {
              const value = isServiceBusiness
                ? (item as any).count
                : (item as any).quantity;
              const percentage = topMaxValue > 0 ? (value / topMaxValue) * 100 : 0;

              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="truncate flex-1 mr-2"
                      style={{ color: textColors.subtitle }}
                    >
                      <span style={{ color: textColors.muted }}>#{idx + 1}</span>{' '}
                      {item.name}
                    </span>
                    <span
                      className="font-bold shrink-0"
                      style={{ color: primary }}
                    >
                      {value} {labels.countLabel}
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${primary}20` }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(percentage, 4)}%`,
                        backgroundColor: primary,
                        opacity: 0.7 + (1 - idx / topItems.length) * 0.3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="flex items-center justify-center py-8 text-xs"
            style={{ color: textColors.muted }}
          >
            No hay {labels.itemPlural} vendidos aún
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Últimas órdenes */}
      {/* ============================================================ */}
      <div
        className="border rounded-2xl p-5"
        style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4
            className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2"
            style={{ color: textColors.title }}
          >
            <ShoppingBag size={14} color={primary} />
            Últimas {labels.ordersLabel}
          </h4>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="text-[10px] font-semibold hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: primary }}
          >
            Ver todas →
          </button>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: cardBorder }}>
                  <th
                    className="text-left py-2 pr-3 font-medium"
                    style={{ color: textColors.muted }}
                  >
                    ID
                  </th>
                  <th
                    className="text-left py-2 pr-3 font-medium"
                    style={{ color: textColors.muted }}
                  >
                    Cliente
                  </th>
                  <th
                    className="text-left py-2 pr-3 font-medium"
                    style={{ color: textColors.muted }}
                  >
                    Total
                  </th>
                  {/* 🔥 NUEVA COLUMNA */}
                  <th
                    className="text-left py-2 pr-3 font-medium"
                    style={{ color: textColors.muted }}
                  >
                    Entrega
                  </th>
                  <th
                    className="text-left py-2 pr-3 font-medium"
                    style={{ color: textColors.muted }}
                  >
                    Estado
                  </th>
                  <th
                    className="text-left py-2 font-medium"
                    style={{ color: textColors.muted }}
                  >
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const totalVes = getOrderVesTotal(order, bsRate);
                  const totalUsd = resolveUsd(order);
                  const status = order?.status || 'Desconocido';

                  // 🔥 Fecha con hora
                  const date = order?.createdAt
                    ? new Date(order.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--';

                  return (
                    <tr
                      key={order.id}
                      className="border-b last:border-b-0 cursor-pointer hover:opacity-70 transition-opacity"
                      style={{ borderColor: cardBorder }}
                      onClick={() => onNavigate('orders', { id: order.id })}
                    >
                      <td
                        className="py-2.5 pr-3 font-mono text-[10px]"
                        style={{ color: textColors.smallText }}
                      >
                        #{String(order.id).slice(0, 8)}
                      </td>
                      <td
                        className="py-2.5 pr-3 truncate max-w-[100px]"
                        style={{ color: textColors.subtitle }}
                      >
                        {order?.customerName || order?.clientName || 'Cliente'}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {/* 🔥 Bs. + USD en la misma columna */}
                        <span
                          className="font-bold block"
                          style={{ color: primary }}
                        >
                          Bs. {formatPrice(totalVes)}
                        </span>
                        <span
                          className="text-[9px] font-semibold block"
                          style={{ color: greenColor }}
                        >
(${formatUsd(totalUsd)})
                        </span>
                      </td>
                      {/* 🔥 NUEVA CELDA DE ENTREGA */}
                      <td className="py-2.5 pr-3">
                        <DeliveryBadge
                          order={order}
                          isDarkMode={isDarkMode}
                          primary={primary}
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={status} />
                      </td>
                      <td
                        className="py-2.5 text-[10px] whitespace-nowrap"
                        style={{ color: textColors.muted }}
                      >
                        {date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="flex items-center justify-center py-8 text-xs"
            style={{ color: textColors.muted }}
          >
            No hay {labels.ordersPlural} recientes
          </div>
        )}
      </div>
    </>
  );
});

DashboardCardModal.displayName = 'DashboardCardModal';

export default DashboardCardModal;