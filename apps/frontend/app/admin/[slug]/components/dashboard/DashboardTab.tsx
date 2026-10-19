import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { Trash2, Save, User, Store, CreditCard, Settings, Shield, Truck, Clock, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import { toPng } from 'html-to-image';
import DashboardMetrics from './DashboardMetrics';
import DashboardCharts from './DashboardCharts';
import DashboardDeliveryMetrics from './DashboardDeliveryMetrics';
import DashboardPaymentMetrics from './DashboardPaymentMetrics';
import DashboardCardModal from './DashboardCardModal';
import DashboardExportReportCard from './DashboardExportReportCard';
import DashboardExportCard from './DashboardExportCard';
import type { BusinessFlyerData } from './DashboardExportCard';
import { useToast } from '@/components/ui/useToast';
import { getPriceColors } from '@/lib/priceTokens';
import { getDashboardTextColors } from '@/lib/dashboardTextColors';
import SectionTitle from '@/components/ui/SectionTitle';
import { LayoutDashboard, Package, TrendingUp } from 'lucide-react';
// ============================================================
// 🔥 ICONOS SVG CONSTANTES CON COLORES SIGNIFICATIVOS
// ============================================================
const Icons = {
  MapPin: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#ef4444' }} className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Id: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#8b5cf6' }} className={className}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Clock: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#3b82f6' }} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Currency: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#f59e0b' }} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M8 8c0-2 2-3 4-3s4 1 4 3-2 3-4 3-4 1-4 3 2 3 4 3 4-1 4-3" />
    </svg>
  ),
  Phone: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#22c55e' }} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Email: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#06b6d4' }} className={className}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Spinner: ({ color, size = 20, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#64748b' }} className={className || 'animate-spin'}>
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
  AlertCircle: ({ color, size = 16, className }: { color?: string; size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: color || '#ef4444' }} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ============================================================
// 🔥 PROPS DEL DASHBOARD
// ============================================================

interface DashboardTabProps {
  orders?: any[];
  items?: any[];
  tenant?: any;
  businessType?: string;
  businessConfig?: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  customers?: any[];
  appointments?: any[];
  onSelectOrder?: (order: any) => void;
  onNavigate?: (section: string, filter?: any) => void;
  exchangeRate?: number;
  ivaRate?: number;
  getImageUrl?: (item: any) => string | null;
}

// ============================================================
// 🔥 FUNCIONES DE AYUDA
// ============================================================

// 🔥 Normalizar URLs: colapsa /api/api/... en /api/...
// Evita el bug de doble/triple /api/ cuando se concatenan URLs relativas
const normalizeApiUrl = (url: string | null): string | null => {
  if (!url) return null;
  return url.replace(/(\/api)+/g, '/api');
};

export const getOrderVesTotal = (order: any, bsRate: number): number => {
  // 🔥 PRIORIDAD 1: leer totalAmountVes del snapshot del backend (YA incluye envío)
  // El backend lo calcula con PricingService: suma(items con IVA) + envío
  if (order?.totalAmountVes !== undefined && order?.totalAmountVes !== null && Number(order.totalAmountVes) > 0) {
    return Math.round(Number(order.totalAmountVes) * 100) / 100;
  }

  // 🔥 PRIORIDAD 2: sumar items del snapshot
  // ⚠️ totalPriceVES es UNITARIO (no incluye cantidad). Hay que multiplicar.
  // + sumar el envío desde paymentMetadata.delivery
  if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
    let hasSnapshot = false;
    let itemsTotalVes = 0;

    for (const item of order.items) {
      if (item.totalPriceVES !== undefined && item.totalPriceVES !== null && Number(item.totalPriceVES) > 0) {
        hasSnapshot = true;
        const qty = Number(item.quantity || 1);
        itemsTotalVes += Number(item.totalPriceVES) * qty;
      }
    }

    if (hasSnapshot) {
      // Sumar envío
      const delivery = order?.paymentMetadata?.delivery;
      const shippingVes = delivery?.selected
        ? Number(delivery.costVes || 0)
        : Number(order?.shippingCost || 0);

      return Math.round((itemsTotalVes + shippingVes) * 100) / 100;
    }
  }

  // 🔴 PRIORIDAD 3: recalcular desde items con flujo viejo (× cantidad)
  if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
    let totalVes = 0;
    for (const item of order.items) {
      const quantity = Number(item.quantity || 1);
      let priceVes = 0;
      
      if (item.priceVes !== undefined && item.priceVes !== null) {
        priceVes = Number(item.priceVes);
      } else if (item.prices?.VES !== undefined) {
        priceVes = Number(item.prices.VES);
      } else if (item.price !== undefined && item.price !== null) {
        priceVes = Number(item.price);
      }
      
      totalVes += priceVes * quantity;
    }
    // Sumar envío también en el flujo viejo
    const delivery = order?.paymentMetadata?.delivery;
    const shippingVes = delivery?.selected
      ? Number(delivery.costVes || 0)
      : Number(order?.shippingCost || 0);
    return Math.round((totalVes + shippingVes) * 100) / 100;
  }

  // 🔴 PRIORIDAD 4: convertir desde USD con la tasa
  const usdAmount = Number(order?.totalUsd || order?.totalAmount || 0);
  if (bsRate <= 0) return 0;
  return Math.round(usdAmount * bsRate * 100) / 100;
};


export const getOrderUsdTotal = (order: any): number => {
  // 🔥 PRIORIDAD 1: leer totalAmount del backend (YA incluye envío en USD)
  if (order?.totalAmount !== undefined && order?.totalAmount !== null && Number(order.totalAmount) > 0) {
    return Math.round(Number(order.totalAmount) * 100) / 100;
  }

  // 🔥 PRIORIDAD 2: sumar items del snapshot
  // ⚠️ totalPriceUSD es UNITARIO (no incluye cantidad). Hay que multiplicar.
  // + sumar el envío desde paymentMetadata.delivery.costUsd
  if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
    let hasSnapshot = false;
    let itemsTotalUsd = 0;

    for (const item of order.items) {
      if (item.totalPriceUSD !== undefined && item.totalPriceUSD !== null && Number(item.totalPriceUSD) > 0) {
        hasSnapshot = true;
        const qty = Number(item.quantity || 1);
        itemsTotalUsd += Number(item.totalPriceUSD) * qty;
      }
    }

    if (hasSnapshot) {
      // Sumar envío en USD
      const delivery = order?.paymentMetadata?.delivery;
      let shippingUsd = 0;
      if (delivery?.selected) {
        if (delivery.costUsd !== undefined && delivery.costUsd !== null) {
          shippingUsd = Number(delivery.costUsd);
        } else if (delivery.costVes && order?.exchangeRate) {
          shippingUsd = Number(delivery.costVes) / Number(order.exchangeRate);
        }
      }

      return Math.round((itemsTotalUsd + shippingUsd) * 100) / 100;
    }
  }

  // 🔴 PRIORIDAD 3: usar el campo de la orden (compatibilidad)
  return Number(order?.totalUsd || order?.totalAmount || 0);
};

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
const DashboardTab = memo(function DashboardTab({
  orders = [],
  items = [],
  tenant,
  businessType = 'store',
  businessConfig,
  primary,
  secondary,
  textColor,
  isDarkBg,
  customers = [],
  appointments = [],
  onSelectOrder,
  onNavigate,
  exchangeRate: propExchangeRate,
  ivaRate: propIvaRate,
  getImageUrl,
}: DashboardTabProps) {
  
  // 🔥 TASAS BCV
  const { showToast } = useToast();

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
    error: null
  });

  const [isDashboardHeaderCollapsed, setIsDashboardHeaderCollapsed] = useState(true);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  // 🔥 Secciones colapsables (por defecto contraídas para no cargar de más)
  const [isOperationExpanded, setIsOperationExpanded] = useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  
  // 🔥 Cargar tasas BCV
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
                error: null
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
            error: error instanceof Error ? error.message : 'Error al cargar tasas del BCV'
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

  // 🔥 Detectar si es tienda de servicios
  const isServiceBusiness = useMemo(() => 
    businessConfig?.modelType === 'service' ||
    businessConfig?.itemType === 'service' || 
    businessConfig?.work_modality === 'service' || 
    businessType === 'service',
    [businessConfig, businessType]
  );

  // 🔥 Datos seguros
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);

  console.log('🚨🚨🚨 DashboardTab SE ESTÁ RENDERIZANDO 🚨🚨🚨');
console.log('🚨 orders prop:', orders);
console.log('🚨 orders length:', orders?.length);
// 🔥 DEBUG TEMPORAL - quitar después
useEffect(() => {
  console.log('🔥 [DashboardTab] safeOrders cambió. Total:', safeOrders.length);
  console.log('🔥 [DashboardTab] orders (prop cruda) tipo:', typeof orders, 'esArray:', Array.isArray(orders), 'length:', orders?.length);
  
  if (safeOrders.length > 0) {
    safeOrders.forEach(o => {
      console.log('=== ORDEN', o.id?.slice(0, 8), '===');
      console.log('  status:', o.status);
      console.log('  totalAmountVes:', o.totalAmountVes);
      console.log('  totalAmount:', o.totalAmount);
      console.log('  items count:', o.items?.length);
      o.items?.forEach((i: any) => {
        console.log('    -', i.name, '| qty:', i.quantity, '| totalPriceVES:', i.totalPriceVES, '| totalPriceUSD:', i.totalPriceUSD);
      });
      console.log('  paymentMetadata:', o.paymentMetadata);
      console.log('  delivery:', o.paymentMetadata?.delivery);
    });
  } else {
    console.warn('⚠️ [DashboardTab] safeOrders está VACÍO. Prop orders:', orders);
  }
}, [safeOrders, orders]);
  const safeItems = useMemo(() => Array.isArray(items) ? items : [], [items]);
  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);
  const safeAppointments = useMemo(() => Array.isArray(appointments) ? appointments : [], [appointments]);

  // 🔥 Tasa de cambio
  const bsRate = useMemo(() => {
    if (propExchangeRate && propExchangeRate > 0) return propExchangeRate;
    if (tenant?.exchangeRate && tenant.exchangeRate > 0) return tenant.exchangeRate;
    if (tenant?.tasaDolar && tenant.tasaDolar > 0) return tenant.tasaDolar;
    if (bcvRates.usd > 0) return bcvRates.usd;
    return 0;
  }, [propExchangeRate, tenant?.exchangeRate, tenant?.tasaDolar, bcvRates.usd]);

  const ivaRate = useMemo(() => {
    if (propIvaRate && propIvaRate > 0) return propIvaRate;
    if (tenant?.ivaRate && tenant.ivaRate > 0) return tenant.ivaRate;
    if (bcvRates.iva > 0) return bcvRates.iva;
    return 16;
  }, [propIvaRate, tenant?.ivaRate, bcvRates.iva]);

  // 🔥 Cálculos de métricas
  const { totalSalesUsd, totalSalesVes, totalOrdersCount, pendingOrdersCount, totalCustomersCount, totalAppointmentsCount } = useMemo(() => {
    let salesUsd = 0;
    let salesVes = 0;
    let ordersCount = 0;
    let pendingCount = 0;
    let customersSet = new Set<string>();

    safeOrders.forEach((o) => {
      const status = (o?.status || '').toLowerCase().trim();
      const isCompleted = !status.includes('pend') && !status.includes('canc') && !status.includes('rechaz');
      
      if (isCompleted) {
        salesUsd += getOrderUsdTotal(o);
        salesVes += getOrderVesTotal(o, bsRate);
      }
      
      if (status.includes('pend') || status.includes('por_verificar')) {
        pendingCount++;
      }
      
      ordersCount++;
      
      const customerName = o?.customerName || o?.userId || o?.clientName;
      if (customerName) {
        customersSet.add(String(customerName));
      }
    });

    if (isServiceBusiness) {
      safeAppointments.forEach((a) => {
        const customerName = a?.customerName || a?.userId || a?.clientName;
        if (customerName) {
          customersSet.add(String(customerName));
        }
      });
    }

    return {
      totalSalesUsd: salesUsd,
      totalSalesVes: salesVes,
      totalOrdersCount: ordersCount,
      pendingOrdersCount: pendingCount,
      totalCustomersCount: customersSet.size,
      totalAppointmentsCount: safeAppointments.length,
    };
  }, [safeOrders, safeAppointments, bsRate, isServiceBusiness]);

  // 🔥 Configuración específica
  const specificConfig = useMemo(() => 
    tenant?.specificConfig || tenant?.specific_config || businessConfig || {},
    [tenant, businessConfig]
  );

  // 🔥 Formatear moneda
  const formatCurrency = useCallback((usdAmount: number) => {
    if (bsRate <= 0) {
      return {
        bs: '0.00',
        usd: usdAmount.toFixed(2),
        error: 'Sin tasa de cambio'
      };
    }
    const totalBs = usdAmount * bsRate;
    const formattedBs = totalBs.toLocaleString('es-VE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return {
      bs: formattedBs,
      usd: usdAmount.toFixed(2)
    };
  }, [bsRate]);

  // 🔥 Datos para gráfico de ingresos (7 días)
  const chartData = useMemo(() => {
    const summary: { [key: string]: { totalVes: number; totalUsd: number; count: number; rawDate: Date } } = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      summary[dateKey] = { totalVes: 0, totalUsd: 0, count: 0, rawDate: d };
    }

    safeOrders.forEach((o) => {
      const status = (o.status || '').toLowerCase().trim();
      if (status.includes('pend') || status.includes('canc') || status.includes('rechaz')) return;

      if (o.createdAt) {
        const d = new Date(o.createdAt);
        d.setHours(0, 0, 0, 0);
        const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        if (summary[dateKey]) {
          summary[dateKey].totalVes += getOrderVesTotal(o, bsRate);
          summary[dateKey].totalUsd += getOrderUsdTotal(o);
          summary[dateKey].count += 1;
        }
      }
    });

    const sortedEntries = Object.entries(summary).sort((a, b) => a[1].rawDate.getTime() - b[1].rawDate.getTime());
    const maxVal = Math.max(...sortedEntries.map(([_, val]) => val.totalVes), 1);

    return sortedEntries.map(([label, val]) => ({
      label,
      amount: val.totalVes,
      amountUsd: val.totalUsd,
      count: val.count,
      height: val.totalVes > 0 ? Math.max(Math.round((val.totalVes / maxVal) * 90), 15) : 4
    }));
  }, [safeOrders, bsRate]);

  // 🔥 Datos para distribución de estados
  const statusData = useMemo(() => {
    const data = isServiceBusiness ? safeAppointments : safeOrders;
    const counts: Record<string, number> = {};

    data.forEach((item) => {
      const status = (item.status || '').toLowerCase().trim();
      if (status.includes('pend') || status.includes('por_verificar') || status.includes('solicitada')) {
        counts.pending = (counts.pending || 0) + 1;
      } else if (status.includes('confirm') || status.includes('aprobado') || status.includes('verificando')) {
        counts.confirmed = (counts.confirmed || 0) + 1;
      } else if (status.includes('complet') || status.includes('pagado') || status.includes('realizado') || status.includes('finalizado')) {
        counts.completed = (counts.completed || 0) + 1;
      } else if (status.includes('canc') || status.includes('rechaz')) {
        counts.cancelled = (counts.cancelled || 0) + 1;
      } else if (status.includes('no_show') || status.includes('ausente')) {
        counts.noShow = (counts.noShow || 0) + 1;
      }
    });

    return counts;
  }, [safeOrders, safeAppointments, isServiceBusiness]);

  const statusTotal = useMemo(() => Object.values(statusData).reduce((a, b) => a + b, 0), [statusData]);


  
  // ============================================================
  // 🔥 MÉTRICAS DE ENTREGA (delivery / retiro / kiosco / web)
  // ============================================================
  const deliveryMetrics = useMemo(() => {
    let withShippingCount = 0;
    let withShippingVes = 0;
    let withShippingUsd = 0;

    let withoutShippingCount = 0;
    let withoutShippingVes = 0;
    let withoutShippingUsd = 0;

    const byCompany: Record<string, { count: number; totalVes: number; totalUsd: number }> = {};
    const bySource: Record<string, { count: number; totalVes: number; totalUsd: number }> = {};

    safeOrders.forEach((o) => {
      const status = (o?.status || '').toLowerCase().trim();
      const isCompleted = !status.includes('pend') && !status.includes('canc') && !status.includes('rechaz');
      if (!isCompleted) return;

      const totalVes = getOrderVesTotal(o, bsRate);
      const totalUsd = getOrderUsdTotal(o);
      const delivery = o.paymentMetadata?.delivery;
      const hasShipping = !!(delivery?.selected && (Number(delivery.costVes) > 0 || Number(delivery.costUsd) > 0));

      if (hasShipping) {
        withShippingCount++;
        withShippingVes += totalVes;
        withShippingUsd += totalUsd;

        const company = (delivery.company || 'otro').toLowerCase();
        if (!byCompany[company]) byCompany[company] = { count: 0, totalVes: 0, totalUsd: 0 };
        byCompany[company].count++;
        byCompany[company].totalVes += totalVes;
        byCompany[company].totalUsd += totalUsd;
      } else {
        withoutShippingCount++;
        withoutShippingVes += totalVes;
        withoutShippingUsd += totalUsd;
      }

      const source = (o.paymentMetadata?.source || 'web').toLowerCase();
      if (!bySource[source]) bySource[source] = { count: 0, totalVes: 0, totalUsd: 0 };
      bySource[source].count++;
      bySource[source].totalVes += totalVes;
      bySource[source].totalUsd += totalUsd;
    });

    return {
      withShipping: {
        count: withShippingCount,
        totalVes: Math.round(withShippingVes * 100) / 100,
        totalUsd: Math.round(withShippingUsd * 100) / 100,
        avgTicketVes: withShippingCount > 0 ? Math.round((withShippingVes / withShippingCount) * 100) / 100 : 0,
        avgTicketUsd: withShippingCount > 0 ? Math.round((withShippingUsd / withShippingCount) * 100) / 100 : 0,
      },
      withoutShipping: {
        count: withoutShippingCount,
        totalVes: Math.round(withoutShippingVes * 100) / 100,
        totalUsd: Math.round(withoutShippingUsd * 100) / 100,
        avgTicketVes: withoutShippingCount > 0 ? Math.round((withoutShippingVes / withoutShippingCount) * 100) / 100 : 0,
        avgTicketUsd: withoutShippingCount > 0 ? Math.round((withoutShippingUsd / withoutShippingCount) * 100) / 100 : 0,
      },
      byCompany,
      bySource,
    };
  }, [safeOrders, bsRate]);

  // 🔥 Top 5 productos/servicios
  const topItems = useMemo(() => {
    if (isServiceBusiness) {
      const serviceCount: { [key: string]: { name: string; count: number } } = {};
      safeAppointments.forEach(a => {
        const serviceName = a.serviceName || a.name || a.title || 'Servicio';
        const id = a.serviceId || a.id || serviceName;
        if (!serviceCount[id]) {
          serviceCount[id] = { name: serviceName, count: 0 };
        }
        serviceCount[id].count += 1;
      });
      return Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 5);
    } else {
      const productSales: { [key: string]: { name: string; quantity: number } } = {};
      safeOrders.forEach(o => {
        (o.items || []).forEach((item: any) => {
          const id = item.productId || item.id || item.name;
          if (!id) return;
          if (!productSales[id]) {
            productSales[id] = { name: item.name || 'Producto', quantity: 0 };
          }
          productSales[id].quantity += Number(item.quantity || 1);
        });
      });
      return Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    }
  }, [safeOrders, safeAppointments, isServiceBusiness]);

  const topMaxValue = useMemo(() => {
    if (topItems.length === 0) return 1;
    const values = topItems.map(p => isServiceBusiness ? (p as any).count : (p as any).quantity);
    return Math.max(...values);
  }, [topItems, isServiceBusiness]);

  // 🔥 Últimas órdenes (5)
  const recentOrders = useMemo(() => {
    return safeOrders.slice(0, 5);
  }, [safeOrders]);

  // 🔥 Obtener horario
  const getScheduleSummary = useCallback(() => {
    const config = tenant?.specificConfig || tenant?.specific_config || {};
    const schedule = config?.schedule || config?.availability || {};
    
    if (!schedule || Object.keys(schedule).length === 0) {
      return 'Horario no configurado';
    }

    const dayMap: Record<string, string> = {
      monday: 'Lun',
      tuesday: 'Mar',
      wednesday: 'Mié',
      thursday: 'Jue',
      friday: 'Vie',
      saturday: 'Sáb',
      sunday: 'Dom'
    };

    const is247 = Object.keys(schedule).every(key => {
      const day = schedule[key];
      return day && day.open === '00:00' && day.close === '23:59' && day.closed === false;
    });

    if (is247) {
      return '24/7 - Siempre abierto';
    }

    const daysWithSchedule: { key: string; label: string; open: string; close: string }[] = [];

    Object.keys(schedule).forEach(key => {
      if (dayMap[key]) {
        const day = schedule[key];
        if (day && day.closed !== true && day.open && day.close) {
          daysWithSchedule.push({
            key,
            label: dayMap[key],
            open: day.open,
            close: day.close
          });
        }
      }
    });

    if (daysWithSchedule.length === 0) {
      return 'Horario no configurado';
    }

    const formatTime = (time: string) => {
      if (!time) return '';
      const [h, m] = time.split(':');
      let hour = parseInt(h, 10);
      const minute = m || '00';
      const period = hour >= 12 ? 'PM' : 'AM';
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;
      return `${hour}:${minute} ${period}`;
    };

    const scheduleGroups: { days: string[]; open: string; close: string }[] = [];
    let currentGroup: { days: string[]; open: string; close: string } | null = null;

    daysWithSchedule.forEach((day, index) => {
      const timeKey = `${day.open}-${day.close}`;
      if (!currentGroup || currentGroup.open !== day.open || currentGroup.close !== day.close) {
        currentGroup = { days: [day.label], open: day.open, close: day.close };
        scheduleGroups.push(currentGroup);
      } else {
        currentGroup.days.push(day.label);
      }
    });

    const formattedGroups = scheduleGroups.map(group => {
      const daysStr = group.days.length === 1 
        ? group.days[0] 
        : `${group.days[0]} - ${group.days[group.days.length - 1]}`;
      return `${daysStr} ${formatTime(group.open)} - ${formatTime(group.close)}`;
    });

    return formattedGroups.join(' • ');
  }, [tenant]);

  // 🔥 Navegar
  const handleNavigate = useCallback((section: string, filter?: any) => {
    const event = new CustomEvent('navigateTab', { 
      detail: { tab: section, filter } 
    });
    window.dispatchEvent(event);
    
    // Fallback: si existe la prop onNavigate, usarla también
    if (onNavigate) {
      onNavigate(section, filter);
    }
  }, [onNavigate]);

  // 🔥 Ref para el contenedor oculto del flyer exportable
  const exportCardRef = useRef<HTMLDivElement>(null);
const flyerCardRef = useRef<HTMLDivElement>(null);
  // 🔥 Estado para feedback visual del botón
  const [isExporting, setIsExporting] = useState(false);
const [isExportingFlyer, setIsExportingFlyer] = useState(false);
  // 🔥 Ticket promedio
  const averageTicketUsd = useMemo(() => {
    if (totalOrdersCount <= 0) return 0;
    return totalSalesUsd / totalOrdersCount;
  }, [totalSalesUsd, totalOrdersCount]);

  const averageTicketVes = useMemo(() => {
    if (totalOrdersCount <= 0) return 0;
    return totalSalesVes / totalOrdersCount;
  }, [totalSalesVes, totalOrdersCount]);

    // 🔥 Logo resuelto del tenant (con URL absoluta)
  const resolvedLogo = useMemo(() => {
    const rawLogo =
      tenant?.logoUrl ||
      tenant?.logo ||
      tenant?.logoPreview ||
      tenant?.logo_url ||
      null;

    if (!rawLogo) return null;

    if (rawLogo.startsWith('http://') || rawLogo.startsWith('https://')) {
      return rawLogo;
    }

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        : 'http://localhost:3000');

    const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

    const composed = rawLogo.startsWith('/')
      ? `${cleanBase}${rawLogo}`
      : `${cleanBase}/uploads/${rawLogo}`;

    // 🔥 Normalizar por si el backend ya trae /api/ en el rawLogo
    return normalizeApiUrl(composed);
  }, [tenant?.logoUrl, tenant?.logo, tenant?.logoPreview, tenant?.logo_url]);

  // 🔥 Estilos dinámicos
  const cardBg = useMemo(() => 
    secondary || (isDarkBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.6)'),
    [secondary, isDarkBg]
  );

  const cardBorder = useMemo(() => 
    isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    [isDarkBg]
  );

  const mutedText = useMemo(() => 
    isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    [isDarkBg]
  );

  const darkerText = useMemo(() => 
    isDarkBg ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
    [isDarkBg]
  );

  // 🔥 Colores de texto unificados (mismos que usan los hijos del dashboard)
  const textColors = useMemo(() => getDashboardTextColors(isDarkBg), [isDarkBg]);

  // 🔥 Colores de precio unificados (verde canónico para divisas)
  const priceColors = useMemo(
    () => getPriceColors({ primary, isDarkBg }),
    [primary, isDarkBg]
  );

  // ✅ greenColor viene del token (mismo verde que el resto del proyecto)
  const greenColor = priceColors.foreign;

  // 🔥 Etiquetas
  const labels = isServiceBusiness ? {
    ordersLabel: 'Citas',
    ordersPlural: 'citas',
    itemLabel: 'Servicios',
    itemPlural: 'servicios',
    topLabel: 'Servicios Más Solicitados',
    countLabel: 'veces',
    pendingLabel: 'pendientes',
  } : {
    ordersLabel: 'Pedidos',
    ordersPlural: 'pedidos',
    itemLabel: 'Productos',
    itemPlural: 'productos',
    topLabel: 'Productos Más Vendidos',
    countLabel: 'unidades',
    pendingLabel: 'pendientes',
  };

    // 🔥 Datos del flyer exportable
  const exportCardData = useMemo(() => ({
    tenantName: tenant?.name || 'Mi Negocio',
    tenantSlogan: tenant?.slogan || null,
    logoUrl: resolvedLogo,
    primaryColor: primary || '#f97316',
    secondaryColor: secondary || (isDarkBg ? '#0b0f19' : '#ffffff'),
    textColor: textColor || (isDarkBg ? '#ffffff' : '#0f172a'),
    isDarkBg,
    totalSalesVes,
    totalSalesUsd,
    totalOrdersCount,
    pendingOrdersCount,
    totalCustomersCount,
    averageTicketVes,
    averageTicketUsd,
    statusData,
    topItems: topItems.map((item) => ({
      name: (item as any).name || 'Item',
      value: isServiceBusiness ? (item as any).count || 0 : (item as any).quantity || 0,
    })),
    exchangeRate: bsRate,
    labels: {
      ordersLabel: labels.ordersLabel,
      itemPlural: labels.itemPlural,
      countLabel: labels.countLabel,
    },
  }), [
    tenant, resolvedLogo, primary, secondary, isDarkBg, textColor,
    totalSalesVes, totalSalesUsd, totalOrdersCount, pendingOrdersCount,
    totalCustomersCount, averageTicketVes, averageTicketUsd, statusData,
    topItems, bsRate, labels, isServiceBusiness,
  ]);

  // 🔥 Datos del flyer del negocio (tarjeta de presentación)
  const flyerCardData: BusinessFlyerData = useMemo(() => {
    const t = tenant as any;

    const rawPayments = t?.paymentMethods || t?.payment_methods || [];
    const paymentMethods: string[] = Array.isArray(rawPayments)
      ? rawPayments
          .map((p: any) => (typeof p === 'string' ? p : p?.name || p?.label || ''))
          .filter(Boolean)
      : [];

    const rawDelivery = t?.deliveryCompanies || t?.delivery_companies || t?.shippingMethods || [];
    const deliveryCompanies: string[] = Array.isArray(rawDelivery)
      ? rawDelivery
          .map((c: any) => (typeof c === 'string' ? c : c?.name || c?.label || ''))
          .filter(Boolean)
      : [];

    const storeUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/tienda/${tenant?.slug || ''}`
        : `https://facilito.app/tienda/${tenant?.slug || ''}`;

    // 🔥 Banner resuelto con URL absoluta (misma lógica que el logo)
    const rawBanner =
      t?.bannerUrl ||
      t?.banner_url ||
      t?.banner ||
      null;

    let resolvedBanner: string | null = null;
    if (rawBanner) {
      if (rawBanner.startsWith('http://') || rawBanner.startsWith('https://')) {
        resolvedBanner = rawBanner;
      } else {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ||
          (typeof window !== 'undefined'
            ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            : 'http://localhost:3000');
        const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
        const composed = rawBanner.startsWith('/')
          ? `${cleanBase}${rawBanner}`
          : `${cleanBase}/uploads/${rawBanner}`;
        // 🔥 Normalizar por si el backend ya trae /api/ en el rawBanner
        resolvedBanner = normalizeApiUrl(composed);
      }
    }

    return {
      tenantName: tenant?.name || 'Mi Negocio',
      tenantSlogan: tenant?.slogan || null,
      logoUrl: resolvedLogo,
      bannerUrl: resolvedBanner,
      description: t?.description || null,
      rif: t?.rif || t?.taxId || t?.tax_id || null,
      address: t?.address || t?.location || null,
      city: t?.city || null,
      zone: t?.zone || null,
      niche: t?.niche || null,
      email: t?.email || null,
      phone: t?.phone || t?.whatsapp || null,
      schedule: t?.schedule || t?.openingHours || t?.opening_hours || null,
      modality: t?.modality || null,
      deliveryType: t?.deliveryType || t?.delivery_type || null,
      paymentMethods,
      deliveryCompanies,
      ratingAvg: t?.rating_avg ? Number(t.rating_avg) : null,
      ratingCount: t?.rating_count ? Number(t.rating_count) : null,
      likesCount: t?.likes_count ? Number(t.likes_count) : null,
      socialLinks: {
        instagram: t?.instagram || null,
        
        facebook: t?.facebook || null,
        whatsapp: t?.whatsapp || null,
        tiktok: t?.tiktok || null,
        x: t?.x_twitter || t?.twitter || null,
        threads: t?.threads || null,
        linkedin: t?.linkedin || null,
        telegram: t?.telegram || null,
      },
      primaryColor: primary || '#f97316',
      secondaryColor: secondary || (isDarkBg ? '#0b0f19' : '#ffffff'),
      textColor: textColor || (isDarkBg ? '#ffffff' : '#0f172a'),
      isDarkBg,
      storeUrl,
      fontFamily: t?.fontFamily || t?.font_family || 'Quicksand',
      fontWeight: Number(t?.fontWeight || t?.font_weight || 700),
    };
  }, [tenant, resolvedLogo, primary, secondary, isDarkBg, textColor]);

  // 🔥 Exportar como imagen PNG
  const handleExport = useCallback(async () => {
    const node = exportCardRef.current;
    if (!node) {
      console.warn('⚠️ [DashboardTab] No hay nodo para exportar');
      return;
    }

    setIsExporting(true);

    try {
      // 🔥 Esperamos un frame para asegurar que las fuentes están cargadas
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 🔥 Generamos el PNG con html-to-image
      const dataUrl = await toPng(node, {
        width: 1600,
        height: 900,
        pixelRatio: 2,       // Salida a 3200x1800 (alta resolución)
        cacheBust: true,     // Evita cache de imágenes
        quality: 0.95,
        // 🔥 Evitamos errores de CORS con hojas de estilo externas
        // (Google Fonts, CDNs, etc.). Solo aplicamos estilos inline del nodo.
        skipFonts: true,
        filter: (domNode: HTMLElement) => {
          // Excluir hojas de estilo externas que causan SecurityError
          if (domNode.tagName === 'LINK' && (domNode as HTMLLinkElement).rel === 'stylesheet') {
            const href = (domNode as HTMLLinkElement).href || '';
            // Excluir solo las externas (http/https que no sean del mismo origen)
            if (href.startsWith('http') && !href.startsWith(window.location.origin)) {
              return false;
            }
          }
          return true;
        },
      });
      // 🔥 Descargar
      const link = document.createElement('a');
      link.download = `reporte-${tenant?.slug || 'negocio'}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      console.log('✅ [DashboardTab] Flyer exportado correctamente');
    } catch (error) {
      console.error('❌ [DashboardTab] Error al exportar el flyer:', error);
      // Fallback: avisamos al usuario
      showToast({
        variant: 'error',
        message: 'No se pudo generar la imagen. Intentá de nuevo.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [tenant?.slug, showToast]);

  // 🔥 Exportar flyer del negocio como PNG
  const handleExportFlyer = useCallback(async () => {
    const node = flyerCardRef.current;
    if (!node) {
      console.warn('⚠️ [DashboardTab] No hay nodo de flyer para exportar');
      return;
    }

    setIsExportingFlyer(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(node, {
        width: 1600,
        height: 900,
        pixelRatio: 2,
        cacheBust: true,
        quality: 0.95,
        skipFonts: true,
        filter: (domNode: HTMLElement) => {
          if (domNode.tagName === 'LINK' && (domNode as HTMLLinkElement).rel === 'stylesheet') {
            const href = (domNode as HTMLLinkElement).href || '';
            if (href.startsWith('http') && !href.startsWith(window.location.origin)) {
              return false;
            }
          }
          return true;
        },
      });

      const link = document.createElement('a');
      link.download = `negocio-${tenant?.slug || 'mi-negocio'}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      console.log('✅ [DashboardTab] Flyer del negocio exportado correctamente');
    } catch (error) {
      console.error('❌ [DashboardTab] Error al exportar el flyer del negocio:', error);
      showToast({
        variant: 'error',
        message: 'No se pudo generar el flyer. Intentá de nuevo.',
      });
    } finally {
      setIsExportingFlyer(false);
    }
  }, [tenant?.slug, showToast]);

  // 🔥 Cargando
  if (bcvRates.loading) {
    return (
      <div className="border rounded-3xl shadow-xl p-8 text-center" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}>
        <div className="flex flex-col items-center gap-4">
          <Icons.Spinner color={primary} size={40} />
          <p className="text-sm opacity-70" style={{ color: textColor }}>
            Cargando tasas del BCV...
          </p>
        </div>
      </div>
    );
  }

  // 🔥 Error
  if (bcvRates.error || bsRate <= 0) {
    return (
      <div className="border rounded-3xl shadow-xl p-8 text-center" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}>
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

  return (
    <div className="w-full space-y-10">
      {/* 🔥 FLYER EXPORTABLE (OCULTO EN PANTALLA, VISIBLE PARA html-to-image) */}
      <div
        style={{
          position: 'fixed',
          left: -99999,
          top: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <DashboardExportReportCard ref={exportCardRef} data={exportCardData} />
        <DashboardExportCard ref={flyerCardRef} data={flyerCardData} />
              </div>

      {/* ============================================================ */}
      {/* SECCIÓN 1: CABECERA DE LA EMPRESA */}
      {/* ============================================================ */}
      <div 
        className={`border rounded-3xl shadow-xl w-full ${
          isDashboardHeaderCollapsed ? 'p-5 space-y-0' : 'p-6 space-y-5'
        }`}
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        {/* HEADER DEL TOGGLE */}
        <div 
          onClick={() => setIsDashboardHeaderCollapsed(prev => !prev)}
          className="flex items-center justify-between pb-3 border-b cursor-pointer hover:opacity-70 select-none"
          style={{ borderColor: cardBorder }}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div>
              <h2 className="text-base font-black tracking-tight truncate" style={{ color: textColor }}>
                {tenant?.name || 'Mi Tienda'}
              </h2>
              {tenant?.slogan && (
                <p className="text-[10px] opacity-60 truncate" style={{ color: textColor }}>
                  {tenant.slogan}
                </p>
              )}
            </div>
          </div>
          <div 
            className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm shrink-0 ml-2"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            {isDashboardHeaderCollapsed ? (
              <Eye size={16} />
            ) : (
              <EyeOff size={16} />
            )}
          </div>
        </div>

        {/* CONTENIDO EXPANDIDO */}
        <div className={`${isDashboardHeaderCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-none opacity-100 pt-4'}`}>
          
          {/* FILA 1: Información Fiscal y Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b" style={{ borderColor: cardBorder }}>
            <div className="flex items-center gap-2 text-xs">
              <Icons.Id color={primary} size={16} />
              <span className="opacity-70" style={{ color: textColor }}>RIF:</span>
              <span className="font-medium" style={{ color: textColor }}>{tenant?.rif || 'No registrado'}</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <Icons.MapPin color={primary} size={16} className="mt-0.5 shrink-0" />
              <span className="opacity-70 shrink-0" style={{ color: textColor }}>Dirección:</span>
              <span 
                className={`font-medium ${!isAddressExpanded ? 'line-clamp-1' : ''}`} 
                style={{ color: textColor }}
              >
                {tenant?.address || 'No registrada'}
              </span>
              {tenant?.address && tenant.address.length > 40 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddressExpanded(prev => !prev);
                  }}
                  className="text-[10px] font-semibold shrink-0 hover:underline ml-1"
                  style={{ color: primary }}
                >
                  {isAddressExpanded ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          </div>

          {/* FILA 2: Contacto y Horario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4 border-b" style={{ borderColor: cardBorder }}>
            <div className="flex items-center gap-2 text-xs">
              <Icons.Email color={primary} size={16} />
              <span className="opacity-70" style={{ color: textColor }}>Email:</span>
              <span className="font-medium truncate" style={{ color: textColor }}>{tenant?.email || 'No registrado'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Icons.Phone color={primary} size={16} />
              <span className="opacity-70" style={{ color: textColor }}>Teléfono:</span>
              <span className="font-medium" style={{ color: textColor }}>{tenant?.phone ? formatPhoneDisplay(tenant.phone, tenant?.country_code || tenant?.countryCode) : 'No registrado'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Icons.Clock color={primary} size={16} />
              <span className="opacity-70" style={{ color: textColor }}>Horario:</span>
              <span className="font-medium truncate" style={{ color: textColor }}>{getScheduleSummary()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Icons.Currency color={primary} size={16} />
              <span className="opacity-70" style={{ color: textColor }}>Tasa BCV:</span>
              <span className="font-medium" style={{ color: greenColor }}>1 USD = Bs. {bsRate.toFixed(2)}</span>
            </div>
          </div>

          {/* FILA 3: Modalidad de Trabajo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4 border-b" style={{ borderColor: cardBorder }}>
            <div className="flex items-center gap-2 text-xs">
              <LayoutGrid className="w-4 h-4" style={{ color: primary }} />
              <span className="opacity-70" style={{ color: textColor }}>Modalidad:</span>
              <span className="font-medium" style={{ color: primary }}>
                {(() => {
                  const workModality = specificConfig?.workModality || 'local';
                  const modalityLabels: Record<string, string> = {
                    local: 'Local / Tienda / Casa',
                    delivery: 'Solo Delivery',
                    hybrid: 'Híbrido (Local + Delivery)',
                    remote: '100% Remoto / Online'
                  };
                  return isServiceBusiness 
                    ? (specificConfig?.serviceType === 'citas' ? 'Por Citas / Horas' :
                       specificConfig?.serviceType === 'orden_llegada' ? 'Orden de Llegada' :
                       specificConfig?.serviceType === 'reservas' ? 'Reservas / Días o Equipos' : 'Por Citas / Horas')
                    : modalityLabels[workModality] || modalityLabels.local;
                })()}
              </span>
            </div>
            {!isServiceBusiness && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <Truck className="w-4 h-4" style={{ color: primary }} />
                  <span className="opacity-70" style={{ color: textColor }}>Entrega:</span>
                  <span className="font-medium" style={{ color: primary }}>
                    {(() => {
                      const deliveryType = specificConfig?.deliveryType || 'retiro_local';
                      const deliveryLabels: Record<string, string> = {
                        delivery_propio: 'Delivery / Envío',
                        retiro_local: 'Punto Fijo / Local',
                        online: 'Online / Remoto',
                        ambos: 'Ambas opciones'
                      };
                      return deliveryLabels[deliveryType] || deliveryLabels.retiro_local;
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primary }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="opacity-70" style={{ color: textColor }}>Variantes:</span>
                  <span className="font-medium" style={{ color: specificConfig?.hasVariants === 'si' ? greenColor : primary }}>
                    {specificConfig?.hasVariants === 'si' ? 'Con variantes' : 'Sin variantes'}
                  </span>
                </div>
              </>
            )}
            {isServiceBusiness && (
              <div className="flex items-center gap-2 text-xs col-span-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primary }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="opacity-70" style={{ color: textColor }}>Tipo de Servicio:</span>
                <span className="font-medium" style={{ color: primary }}>
                  {specificConfig?.serviceType === 'citas' ? 'Citas / Horas' :
                   specificConfig?.serviceType === 'orden_llegada' ? 'Orden de Llegada' :
                   specificConfig?.serviceType === 'reservas' ? 'Reservas / Días o Equipos' : 'Citas / Horas'}
                </span>
              </div>
            )}
          </div>

          {/* FILA 4: Métodos de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-b" style={{ borderColor: cardBorder }}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" style={{ color: primary }} />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Métodos de Pago
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const config = specificConfig || {};
                  const methods = config.activePaymentMethods || config.paymentMethods || [];
                  const methodLabels: Record<string, string> = {
                    cash: 'Efectivo',
                    pos: 'Punto de Venta',
                    pago_movil: 'Pago Móvil',
                    biopago: 'Biopago',
                    zelle: 'Zelle',
                    binance: 'Binance Pay',
                  };
                  
                  const activeMethods = Array.isArray(methods) 
                    ? methods.filter(m => m !== false && m !== 'false')
                    : Object.entries(methods)
                        .filter(([_, val]) => val === true || val === 'true' || val === 'on')
                        .map(([key]) => key);
                  
                  const hasPagoMovil = specificConfig?.paymentMethods?.pagoMovilList?.length > 0;
                  const hasBinance = specificConfig?.paymentMethods?.binance?.payId || specificConfig?.paymentMethods?.binance?.email;
                  
                  const allMethods = [...activeMethods];
                  if (hasPagoMovil && !allMethods.includes('pago_movil')) allMethods.push('pago_movil');
                  if (hasBinance && !allMethods.includes('binance')) allMethods.push('binance');
                  
                  if (allMethods.length === 0) {
                    return (
                      <span className="text-[10px] opacity-40" style={{ color: textColor }}>
                        No configurados
                      </span>
                    );
                  }
                  
                  return allMethods.map((method: string) => (
                    <span 
                      key={method}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium border"
                      style={{ 
                        borderColor: `${primary}25`,
                        backgroundColor: `${primary}08`,
                        color: primary
                      }}
                    >
                      {methodLabels[method] || method}
                    </span>
                  ));
                })()}
              </div>
            </div>

            {/* FILA 5: Mensajería */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4" style={{ color: primary }} />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                  Mensajería / Delivery
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const deliveryConfig = specificConfig?.delivery || {};
                  const activeCompanies = deliveryConfig.activeCompanies || [];
                  const companyNames: Record<string, string> = {
                    mrw: 'MRW',
                    domesa: 'Domesa',
                    tealca: 'Tealca',
                    zoom: 'Zoom'
                  };
                  
                  if (activeCompanies.length === 0) {
                    return (
                      <span className="text-[10px] opacity-40" style={{ color: textColor }}>
                        No configurado
                      </span>
                    );
                  }
                  
                  return activeCompanies.map((company: string) => (
                    <span 
                      key={company}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium border"
                      style={{ 
                        borderColor: `${primary}25`,
                        backgroundColor: `${primary}08`,
                        color: primary
                      }}
                    >
                      {companyNames[company] || company}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* FILA 6: Botones de exportación */}
          <div className="flex justify-end gap-2 pt-3">
            {/* Botón 1: Compartir mi Negocio (flyer) */}
            <button
              type="button"
              onClick={handleExportFlyer}
              disabled={isExportingFlyer}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: primary,
                color: '#ffffff'
              }}
            >
              {isExportingFlyer ? (
                <>
                  <Icons.Spinner color="#ffffff" size={16} />
                  Generando flyer...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartir mi Negocio
                </>
              )}
            </button>

            {/* Botón 2: Exportar Reporte (métricas) */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: primary,
                color: '#ffffff'
              }}
            >
              {isExporting ? (
                <>
                  <Icons.Spinner color="#ffffff" size={16} />
                  Generando reporte...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Reporte
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* ============================================================ */}
      {/* BLOQUE 1: RESUMEN DEL NEGOCIO                                */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionTitle
          icon={<LayoutDashboard size={18} />}
          title="Resumen del negocio"
          subtitle="Vista general de tus ventas, pedidos y clientes"
          primary={primary}
          textColors={textColors}
        />

        <DashboardMetrics
          totalSalesUsd={totalSalesUsd}
          totalSalesVes={totalSalesVes}
          totalOrdersCount={totalOrdersCount}
          totalAppointmentsCount={totalAppointmentsCount}
          pendingOrdersCount={pendingOrdersCount}
          totalCustomersCount={totalCustomersCount}
          statusData={statusData}
          isServiceBusiness={isServiceBusiness}
          primary={primary}
          greenColor={greenColor}
          darkerText={darkerText}
          cardBg={cardBg}
          cardBorder={cardBorder}
          isDarkBg={isDarkBg}
          formatCurrency={formatCurrency}
          onNavigate={handleNavigate}
          labels={labels}
          deliveryMetrics={deliveryMetrics}
        />
      </section>

      {/* ============================================================ */}
      {/* BLOQUE 2: OPERACIÓN (colapsable)                             */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionTitle
          icon={<Package size={18} />}
          title="Operación"
          subtitle="Cómo llegan y cómo se pagan los pedidos"
          primary={primary}
          textColors={textColors}
          collapsible
          expanded={isOperationExpanded}
          onToggle={() => setIsOperationExpanded((prev) => !prev)}
        />

        {isOperationExpanded && (
          <>
            <DashboardDeliveryMetrics
              deliveryMetrics={deliveryMetrics}
              primary={primary}
              greenColor={greenColor}
              darkerText={darkerText}
              cardBg={cardBg}
              cardBorder={cardBorder}
              isDarkBg={isDarkBg}
              formatPrice={(n: number) =>
                n.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }
            />

            <DashboardPaymentMetrics
              orders={safeOrders}
              tenantId={tenant?.id || tenant?.tenantId || tenant?._id}
              primary={primary}
              secondary={secondary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              subtleBorderColor={cardBorder}
              bsRate={bsRate}
              onNavigate={handleNavigate}
            />
          </>
        )}
      </section>

      {/* ============================================================ */}
      {/* BLOQUE 3: ANÁLISIS (colapsable)                              */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <SectionTitle
          icon={<TrendingUp size={18} />}
          title="Análisis"
          subtitle="Tendencias y detalles de tu operación"
          primary={primary}
          textColors={textColors}
          collapsible
          expanded={isAnalysisExpanded}
          onToggle={() => setIsAnalysisExpanded((prev) => !prev)}
        />

        {isAnalysisExpanded && (
          <>
            <DashboardCharts
              chartData={chartData}
              statusData={statusData}
              statusTotal={statusTotal}
              isServiceBusiness={isServiceBusiness}
              primary={primary}
              greenColor={greenColor}
              darkerText={darkerText}
              cardBg={cardBg}
              cardBorder={cardBorder}
              labels={labels}
              deliveryMetrics={deliveryMetrics}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardCardModal
                topItems={topItems}
                topMaxValue={topMaxValue}
                isServiceBusiness={isServiceBusiness}
                recentOrders={recentOrders}
                primary={primary}
                greenColor={greenColor}
                darkerText={darkerText}
                cardBg={cardBg}
                cardBorder={cardBorder}
                isDarkBg={isDarkBg}
                bsRate={bsRate}
                onNavigate={handleNavigate}
                labels={labels}
                getOrderVesTotal={getOrderVesTotal}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
});

DashboardTab.displayName = 'DashboardTab';

export default DashboardTab;