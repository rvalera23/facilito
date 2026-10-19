'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Package, Calendar, LayoutDashboard, TrendingUp } from 'lucide-react';
import SummaryMetrics from './SummaryMetrics';
import SummaryChart from './SummaryChart';
import SectionTitle from '@/components/ui/SectionTitle';

// ============================================================
// 🔥 ICONOS SVG
// ============================================================
const Icons = {
  Package: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
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
  Spinner: ({ color, size = 24 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }} className="animate-spin">
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  AlertCircle: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#ef4444' }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ============================================================
// 🔥 FUNCIONES DE PRECIOS (de la documentación)
// ============================================================

const getOrderVesTotal = (order: any, bsRate: number): number => {
  if (order?.totalAmountVes) {
    return Number(order.totalAmountVes);
  }

  if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
    let totalVes = 0;
    for (const item of order.items) {
      const quantity = Number(item.quantity || 1);
      let priceVes = 0;

      const isService = item.itemType === 'service' || 
                        item.type === 'service' || 
                        item.serviceModality === true;

      if (item.priceVes !== undefined && item.priceVes !== null) {
        priceVes = Number(item.priceVes);
      } else if (item.prices?.VES !== undefined) {
        priceVes = Number(item.prices.VES);
      } else if (item.price !== undefined && item.price !== null) {
        priceVes = Number(item.price);
      }

      // 🔥 SI priceVes < 1000, significa que está en USD, convertir con tasa
      if (priceVes < 1000 && priceVes > 0 && bsRate > 0) {
        priceVes = priceVes * bsRate;
      }

      totalVes += priceVes * quantity;
    }
    return totalVes;
  }

  const usdAmount = Number(order?.totalUsd || order?.totalAmount || 0);
  if (bsRate <= 0) return 0;
  return usdAmount * bsRate;
};

const getOrderUsdTotal = (order: any): number => {
  return Number(order?.totalUsd || order?.totalAmount || 0);
};

const getOrderTotalVesWithIva = (order: any, bsRate: number): number => {
  if (order?.totalAmountVes) {
    return Number(order.totalAmountVes);
  }

  let totalVes = 0;
  let orderRate = bsRate;

  if (order?.rate) orderRate = Number(order.rate);
  else if (order?.exchangeRate) orderRate = Number(order.exchangeRate);

  if (order?.items && Array.isArray(order.items)) {
    for (const item of order.items) {
      const quantity = Number(item.quantity || 1);

      const isService = item.itemType === 'service' || 
                        item.type === 'service' || 
                        item.serviceModality === true;

      let unitPriceVes = 0;
      if (item.priceVes !== undefined && item.priceVes !== null) {
        unitPriceVes = Number(item.priceVes);
      } else if (item.prices?.VES !== undefined) {
        unitPriceVes = Number(item.prices.VES);
      } else if (item.price !== undefined && item.price !== null) {
        unitPriceVes = Number(item.price);
      }

      if (unitPriceVes < 1000 && unitPriceVes > 0 && orderRate > 0) {
        unitPriceVes = unitPriceVes * orderRate;
      }

      const subtotal = unitPriceVes * quantity;

      if (isService) {
        totalVes += subtotal;
        continue;
      }

      const ivaType = item.ivaType || 'excluded';
      const ivaRate = Number(item.ivaRate || 16);

      let ivaAmount = 0;
      if (ivaType === 'excluded') {
        ivaAmount = subtotal * (ivaRate / 100);
        totalVes += subtotal + ivaAmount;
      } else if (ivaType === 'included') {
        ivaAmount = subtotal - (subtotal / (1 + ivaRate / 100));
        totalVes += subtotal;
      } else {
        totalVes += subtotal;
      }
    }
  }

  return totalVes;
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================

interface SummaryTabProps {
  user: any;
  orders: any[];
  appointments?: any[];
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  userProducts?: any[];
  bsRate?: number;
  ivaRate?: number;
  tenantPaymentData?: any;
}

export default function SummaryTab({
  user,
  orders,
  appointments = [],
  primary,
  secondary,
  textColor,
  isDarkBg,
  userProducts = [],
  bsRate: propBsRate,
  ivaRate: propIvaRate,
  tenantPaymentData = {},
}: SummaryTabProps) {
  // 🔥 ESTADOS PARA TASAS BCV
  const [bcvRates, setBcvRates] = useState<{
    usd: number;
    eur: number;
    iva: number;
    loading: boolean;
    error: string | null;
  }>({
    usd: 0,
    eur: 0,
    iva: 16,
    loading: true,
    error: null,
  });

  // 🔥 OBTENER TASAS DEL BCV
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const apiBase = process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        : 'http://localhost:3000');

    async function loadBcvRates() {
      try {
        setBcvRates(prev => ({ ...prev, loading: true, error: null }));

        const response = await fetch(`${apiBase}/currency/rates`);

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data?.success && data?.rates) {
          const usdRate = Number(data.rates.USD);
          const eurRate = Number(data.rates.EUR);
          const ivaRate = Number(data.rates.IVA || 16);

          if (usdRate > 0 && eurRate > 0) {
            if (isMounted) {
              setBcvRates({
                usd: usdRate,
                eur: eurRate,
                iva: ivaRate,
                loading: false,
                error: null,
              });
            }
          } else {
            throw new Error('Tasas inválidas del BCV');
          }
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      } catch (error) {
        console.error('Error al obtener tasas del BCV:', error);
        if (isMounted) {
          setBcvRates(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Error al cargar tasas del BCV',
          }));
        }
      }
    }

    loadBcvRates();

    const scheduleNextFetch = () => {
      timeoutId = setTimeout(() => {
        if (isMounted) {
          loadBcvRates();
          scheduleNextFetch();
        }
      }, 5 * 60 * 1000);
    };

    scheduleNextFetch();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // 🔥 TASA DE CAMBIO DINÁMICA - SIN FALLBACK ESTÁTICO
  const bsRate = useMemo(() => {
    if (propBsRate && propBsRate > 0) return propBsRate;
    if (bcvRates.usd > 0) return bcvRates.usd;
    return 0; // 🔥 SIN FALLBACK ESTÁTICO
  }, [propBsRate, bcvRates.usd]);

  const ivaRate = useMemo(() => {
    if (propIvaRate && propIvaRate > 0) return propIvaRate;
    if (bcvRates.iva > 0) return bcvRates.iva;
    return 16; // IVA por defecto es 16% (esto es un valor legal, no un fallback estático de tasa)
  }, [propIvaRate, bcvRates.iva]);

  // 🔥 ESTILOS DINÁMICOS
  const cardBg = useMemo(() =>
    secondary || (isDarkBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.4)'),
    [secondary, isDarkBg]
  );

  const cardBorder = useMemo(() =>
    isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    [isDarkBg]
  );

  const mutedText = useMemo(() =>
    isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
    [isDarkBg]
  );

  const greenColor = useMemo(() =>
    isDarkBg ? '#4ade80' : '#16a34a',
    [isDarkBg]
  );

  // 🔥 Colores de texto unificados (mismos que el dashboard admin)
  const textColors = useMemo(() => ({
    title: isDarkBg ? 'rgba(255, 255, 255, 0.9)' : '#1e293b',
    subtitle: isDarkBg ? 'rgba(255, 255, 255, 0.7)' : '#475569',
  }), [isDarkBg]);

  // 🔥 DATOS SEGUROS
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const safeAppointments = useMemo(() => Array.isArray(appointments) ? appointments : [], [appointments]);

  // 🔥 CALCULAR TOTALES COMBINADOS (Productos + Servicios)
  const totals = useMemo(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let productCount = 0;
    let serviceCount = 0;
    let orderCount = 0;
    let appointmentCount = 0;
    let pendingCount = 0;

    safeOrders.forEach((o) => {
      const status = (o?.status || '').toLowerCase().trim();
      const isCancelled = status.includes('canc') || status.includes('rechaz');

      if (!isCancelled) {
        totalUsd += getOrderUsdTotal(o);
        totalVes += getOrderTotalVesWithIva(o, bsRate);
        orderCount++;
      }

      if (status.includes('pend') || status.includes('por_verificar')) {
        pendingCount++;
      }

      if (o?.items && Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const isService = item.itemType === 'service' ||
                            item.type === 'service' ||
                            item.serviceModality === true;
          if (isService) {
            serviceCount += Number(item.quantity || 1);
          } else {
            productCount += Number(item.quantity || 1);
          }
        });
      }
    });

    safeAppointments.forEach((a) => {
      const status = (a?.status || '').toLowerCase().trim();
      const isCancelled = status.includes('canc') || status.includes('rechaz');

      if (!isCancelled) {
        const priceUsd = Number(a?.price || a?.total || 0);
        const priceVes = Number(a?.priceVes || 0);
        totalUsd += priceUsd;
        // 🔥 SIN FALLBACK ESTÁTICO - solo si hay tasa
        totalVes += priceVes > 0 ? priceVes : (bsRate > 0 ? priceUsd * bsRate : 0);
        appointmentCount++;
        serviceCount++;
      }
    });

    return {
      usd: totalUsd,
      ves: totalVes,
      productCount,
      serviceCount,
      totalItems: productCount + serviceCount,
      orderCount,
      appointmentCount,
      pendingCount,
    };
  }, [safeOrders, safeAppointments, bsRate]);

  // 🔥 ÚLTIMA ACTIVIDAD
  const lastActivityDate = useMemo(() => {
    let latestTimestamp = -Infinity;
    let latestCreatedAt: string | null = null;
    let latestType = '';

    const consider = (activity: any, type: string) => {
      const ts = new Date(activity?.createdAt || 0).getTime();
      if (ts > latestTimestamp) {
        latestTimestamp = ts;
        latestCreatedAt = activity?.createdAt;
        latestType = type;
      }
    };

    safeOrders.forEach((o) => consider(o, 'orden'));
    safeAppointments.forEach((a) => consider(a, 'cita'));

    if (latestTimestamp === -Infinity) return 'Sin actividad';

    const date = latestCreatedAt
      ? new Date(latestCreatedAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })
      : 'Reciente';

    return `${date} (${latestType})`;
  }, [safeOrders, safeAppointments]);

  // 🔥 DISTRIBUCIÓN DE ESTADOS
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};

    safeOrders.forEach((o) => {
      const status = (o?.status || '').toLowerCase().trim();
      if (status.includes('pend') || status.includes('por_verificar')) {
        counts.pending = (counts.pending || 0) + 1;
      } else if (status.includes('complet') || status.includes('pagado') || status.includes('aprobado')) {
        counts.completed = (counts.completed || 0) + 1;
      } else if (status.includes('canc') || status.includes('rechaz')) {
        counts.cancelled = (counts.cancelled || 0) + 1;
      }
    });

    safeAppointments.forEach((a) => {
      const status = (a?.status || '').toLowerCase().trim();
      if (status.includes('pend') || status.includes('solicitada')) {
        counts.pending = (counts.pending || 0) + 1;
      } else if (status.includes('confirm') || status.includes('confirmada')) {
        counts.confirmed = (counts.confirmed || 0) + 1;
      } else if (status.includes('complet') || status.includes('realizado')) {
        counts.completed = (counts.completed || 0) + 1;
      } else if (status.includes('canc') || status.includes('rechaz')) {
        counts.cancelled = (counts.cancelled || 0) + 1;
      }
    });

    return counts;
  }, [safeOrders, safeAppointments]);

  // 🔥 FORMATO DE MONEDA
  const formatCurrency = useCallback((usdAmount: number) => {
    if (bsRate <= 0) {
      return { bs: '0.00', usd: usdAmount.toFixed(2) };
    }
    const totalBs = usdAmount * bsRate;
    const formattedBs = totalBs.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return { bs: formattedBs, usd: usdAmount.toFixed(2) };
  }, [bsRate]);

  // 🔥 CARGANDO
  if (bcvRates.loading) {
    return (
      <div
        className="border rounded-3xl shadow-xl p-8 text-center"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        <div className="flex flex-col items-center gap-4">
          <Icons.Spinner color={primary} size={40} />
          <p className="text-sm opacity-70" style={{ color: textColor }}>
            Cargando tasas del BCV...
          </p>
        </div>
      </div>
    );
  }

  // 🔥 ERROR - solo si no hay tasa
  if (bcvRates.error || bsRate <= 0) {
    return (
      <div
        className="border rounded-3xl shadow-xl p-8 text-center"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        <div className="flex flex-col items-center gap-4">
          <Icons.AlertCircle color="#ef4444" size={48} />
          <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Error al cargar las tasas del BCV</p>
          <p className="text-xs opacity-70" style={{ color: textColor }}>
            {bcvRates.error || 'No se pudo obtener la tasa de cambio del BCV'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: primary }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // 🔥 RENDER PRINCIPAL
  return (
    <div
      className="border rounded-3xl shadow-xl p-6 w-full space-y-8"
      style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
    >
      {/* HEADER DE LA TARJETA */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
            Mi Cuenta
          </h3>
          <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
            Visualiza tus compras, citas y actividad general en la plataforma.
          </p>
        </div>
        <div 
          className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" 
          style={{ borderColor: cardBorder, color: textColor }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BLOQUE 1: RESUMEN GENERAL                                    */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionTitle
          icon={<LayoutDashboard size={18} />}
          title="Resumen general"
          subtitle="Tus compras, citas y actividad en un vistazo"
          primary={primary}
          textColors={textColors}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* COLUMNA IZQUIERDA: SummaryMetrics */}
          <SummaryMetrics
            totalSpent={totals}
            totalOrders={totals.totalItems}
            lastOrderDate={lastActivityDate}
            primary={primary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            secondary={secondary}
            bsRate={bsRate}
            ivaRate={ivaRate}
            appointmentsCount={totals.appointmentCount}
            ordersCount={totals.orderCount}
            servicesCount={totals.serviceCount}
            hasProducts={totals.productCount > 0}
            hasServices={totals.serviceCount > 0}
          />

          {/* COLUMNA DERECHA: Resumen de Estados */}
          <div
            className="border rounded-2xl p-4 w-full flex flex-col"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 mb-3" style={{ color: textColor }}>
              <Package className="w-4 h-4" style={{ color: primary }} />
              Resumen de Estados
            </h4>
            <div className="grid grid-cols-2 gap-1 w-full flex-1">
              {Object.entries(statusData).length > 0 ? (
                Object.entries(statusData).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center py-1 w-full">
                    <span className="text-[11px] font-medium" style={{ color: textColor, opacity: 0.75 }}>
                      {status === 'pending' ? '● Pendientes' :
                       status === 'confirmed' ? '● Confirmados' :
                       status === 'completed' ? '● Completados' :
                       status === 'cancelled' ? '● Cancelados' :
                       status === 'noShow' ? '● No Asistió' : status}
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg shrink-0" style={{ backgroundColor: `${primary}15`, color: primary }}>
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] font-medium col-span-2 text-center" style={{ color: textColor, opacity: 0.4 }}>
                  Sin transacciones registradas
                </p>
              )}
            </div>
            <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-medium" style={{ borderColor: cardBorder, color: textColor, opacity: 0.6 }}>
              <span>Última actividad</span>
              <span className="font-medium">{lastActivityDate}</span>
            </div>
            <div className="mt-2 pt-2 border-t flex items-center justify-between text-[11px] font-medium" style={{ borderColor: cardBorder, color: textColor, opacity: 0.5 }}>
              <span>Tasa BCV</span>
              <span className="font-semibold">1 USD = Bs. {bsRate.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* BLOQUE 2: ACTIVIDAD                                          */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionTitle
          icon={<TrendingUp size={18} />}
          title="Actividad"
          subtitle="Evolución de tus compras y citas en el tiempo"
          primary={primary}
          textColors={textColors}
        />

        <SummaryChart
          orders={safeOrders}
          appointments={safeAppointments}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          secondary={secondary}
          bsRate={bsRate}
          ivaRate={ivaRate}
          productsCount={totals.productCount}
          servicesCount={totals.serviceCount}
          hasProducts={totals.productCount > 0}
          hasServices={totals.serviceCount > 0}
        />
      </section>
    </div>
  );
}
