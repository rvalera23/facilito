'use client';

import React, { useState, useMemo, useCallback } from 'react';
import DashboardCardModal from './DashboardCardModal';

interface DashboardMetricsAdvancedProps {
  orders: any[];
  items: any[];
  customers: any[];
  appointments?: any[];
  businessType: string;
  isServiceBusiness?: boolean;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  subtleBorderColor: string;
  formatCurrency: (amount: number) => { bs: string; usd: string };
  onNavigate?: (section: string, filter?: any) => void;
  bsRate?: number;
  ivaRate?: number;
}

// ICONOS SVG DINÁMICOS
const Icons = {
  Orders: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Ticket: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M9 7h6m0 10v-3m-6 3v-3m-6 3h18M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  ),
  Trending: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Customers: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
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
  Service: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

const DashboardMetricsAdvanced = React.memo(function DashboardMetricsAdvanced({
  orders = [],
  items = [],
  customers = [],
  appointments = [],
  businessType,
  isServiceBusiness = false,
  primary,
  secondary,
  textColor,
  isDarkBg,
  subtleBorderColor,
  formatCurrency,
  onNavigate,
  bsRate = 0,
  ivaRate = 16,
}: DashboardMetricsAdvancedProps) {
  
  const cardBg = secondary || (isDarkBg ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)');

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    type: 'orders' | 'products' | 'customers' | 'status' | 'appointments';
    data: any;
  }>({
    isOpen: false,
    title: '',
    type: 'orders',
    data: {},
  });

  // DATOS SEGUROS
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const safeItems = useMemo(() => Array.isArray(items) ? items : [], [items]);
  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);
  const safeAppointments = useMemo(() => Array.isArray(appointments) ? appointments : [], [appointments]);

  // FUNCIÓN PARA CALCULAR TOTAL EN VES
  // FUNCIÓN PARA CALCULAR TOTAL EN VES
  const getOrderVesTotal = useCallback((order: any): number => {
    // 🔥 PRIORIDAD 1: suma exacta desde el snapshot de los items
    if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
      let hasSnapshot = false;
      let total = 0;

      for (const item of order.items) {
        if (item.totalPriceVES !== undefined && item.totalPriceVES !== null && Number(item.totalPriceVES) > 0) {
          hasSnapshot = true;
          total += Number(item.totalPriceVES) * Number(item.quantity || 1);
        }
      }

      if (hasSnapshot && total > 0) {
        return Math.round(total * 100) / 100;
      }
    }

    // 🔴 PRIORIDAD 2: usar totalAmountVes guardado (compatibilidad)
    if (order?.totalAmountVes) return Number(order.totalAmountVes);

    // 🔴 PRIORIDAD 3: recalcular desde items con flujo viejo
    if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
      let total = 0;
      for (const item of order.items) {
        const qty = Number(item.quantity || 1);
        const price = Number(item.priceVes || item.prices?.VES || item.price || 0);
        total += price * qty;
      }
      return total;
    }

    // 🔴 PRIORIDAD 4: convertir desde USD con tasa (SIN fallback hardcodeado)
    const usdAmount = Number(order?.totalAmount || order?.totalUsd || 0);
    if (bsRate <= 0) return usdAmount; // devolver USD si no hay tasa
    return usdAmount * bsRate;
  }, [bsRate]);

  // ESTADOS DE ÓRDENES/CITAS
  const statusCounts = useMemo(() => {
    if (isServiceBusiness) {
      const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
      safeAppointments.forEach(a => {
        const status = (a.status || '').toLowerCase();
        if (status.includes('pend') || status.includes('solicitada')) counts.pending++;
        else if (status.includes('confirm') || status.includes('aprobado')) counts.confirmed++;
        else if (status.includes('complet') || status.includes('realizado') || status.includes('finalizado')) counts.completed++;
        else if (status.includes('canc') || status.includes('rechaz')) counts.cancelled++;
        else if (status.includes('no_show') || status.includes('ausente')) counts.noShow++;
      });
      return counts;
    } else {
      const counts = { verifying: 0, pending: 0, completed: 0, cancelled: 0 };
      safeOrders.forEach(o => {
        const status = (o.status || '').toLowerCase();
        if (status.includes('por_verificar') || status.includes('verificando')) counts.verifying++;
        else if (status.includes('pend')) counts.pending++;
        else if (status.includes('complet') || status.includes('pagado') || status.includes('aprobado')) counts.completed++;
        else if (status.includes('canc') || status.includes('rechaz')) counts.cancelled++;
      });
      return counts;
    }
  }, [safeOrders, safeAppointments, isServiceBusiness]);

  // TOTALES
  const totalItems = useMemo(() => {
    if (isServiceBusiness) return safeAppointments.length;
    return safeOrders.length;
  }, [safeOrders, safeAppointments, isServiceBusiness]);

  const completedItems = useMemo(() => {
    if (isServiceBusiness) return statusCounts.completed || 0;
    return statusCounts.completed || 0;
  }, [statusCounts, isServiceBusiness]);

  // VENTAS TOTALES EN VES
  const totalSalesVes = useMemo(() => {
    if (isServiceBusiness) {
      let total = 0;
      safeAppointments.forEach(a => {
        const status = (a.status || '').toLowerCase();
        if (status.includes('pend') || status.includes('canc') || status.includes('rechaz') || status.includes('no_show')) return;
        // 🔥 PRIORIDAD 1: pricingSnapshot (BookingEntity, Fase 5)
        if (a.pricingSnapshot?.totalPriceVES) {
          total += Number(a.pricingSnapshot.totalPriceVES);
          return;
        }
        // 🔴 FALLBACK: flujo viejo
        const price = Number(a.price || a.total || 0);
        if (bsRate > 0) {
          total += price * bsRate;
        }
      });
      return total;
    }
  }, [safeOrders, safeAppointments, isServiceBusiness, bsRate, getOrderVesTotal]);

  // TICKET PROMEDIO
  const avgTicket = useMemo(() => {
    if (completedItems === 0) return { bs: '0.00', usd: '0.00' };
    const avgVes = totalSalesVes / completedItems;
    const avgUsd = bsRate > 0 ? avgVes / bsRate : 0;
    return {
      bs: avgVes.toFixed(2),
      usd: avgUsd.toFixed(2)
    };
  }, [completedItems, totalSalesVes, bsRate]);

  // CONVERSIÓN
  const conversionRate = useMemo(() => {
    if (totalItems === 0) return '0.0';
    return ((completedItems / totalItems) * 100).toFixed(1);
  }, [totalItems, completedItems]);

  // TOP ITEMS
  const topItems = useMemo(() => {
    if (isServiceBusiness) {
      const map: Record<string, { name: string; count: number }> = {};
      safeAppointments.forEach(a => {
        const name = a.serviceName || a.name || a.title || 'Servicio';
        const id = a.serviceId || a.id || name;
        if (!map[id]) map[id] = { name, count: 0 };
        map[id].count++;
      });
      return Object.values(map).sort((a, b) => b.count - a.count);
    } else {
      const map: Record<string, { name: string; quantity: number }> = {};
      safeOrders.forEach(o => {
        (o.items || []).forEach((item: any) => {
          const id = item.productId || item.id || item.name;
          if (!id) return;
          if (!map[id]) map[id] = { name: item.name || 'Producto', quantity: 0 };
          map[id].quantity += Number(item.quantity || 1);
        });
      });
      return Object.values(map).sort((a, b) => b.quantity - a.quantity);
    }
  }, [safeOrders, safeAppointments, isServiceBusiness]);

  const topItem = topItems[0] || null;

  // CLIENTES ÚNICOS
  const { uniqueCount, customerList } = useMemo(() => {
    const data = isServiceBusiness ? safeAppointments : safeOrders;
    const map = new Map<string, number>();
    
    data.forEach(o => {
      const name = o.customerName || o.userId || o.userName || o.clientName || o.clientId;
      if (name) {
        const key = String(name);
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    
    const list = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return { uniqueCount: map.size, customerList: list };
  }, [safeOrders, safeAppointments, isServiceBusiness]);

  // DATOS PARA MODALES
  const statusData = useMemo(() => ({
    total: totalItems,
    statusCounts,
    avgTicketVes: Number(avgTicket.bs),
    avgTicketUsd: Number(avgTicket.usd),
    totalSalesVes,
    isServiceBusiness,
  }), [totalItems, statusCounts, avgTicket, totalSalesVes, isServiceBusiness]);

  const productData = useMemo(() => ({
    totalItems: safeItems.length,
    topItem,
    topItems,
    isServiceBusiness,
  }), [safeItems.length, topItem, topItems, isServiceBusiness]);

  const customerData = useMemo(() => ({
    total: uniqueCount,
    recent: customerList,
    isServiceBusiness,
  }), [uniqueCount, customerList, isServiceBusiness]);

  // HANDLERS
  const handleCardClick = useCallback((type: 'orders' | 'products' | 'customers' | 'status' | 'appointments', title: string, data: any) => {
    setModalState({ isOpen: true, title, type, data });
  }, []);

  const handleNavigate = useCallback((section: string, filter?: any) => {
    if (onNavigate) onNavigate(section, filter);
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: section, filter } }));
    }
  }, [onNavigate]);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // LABELS
  const labels = useMemo(() => {
    if (isServiceBusiness) {
      return {
        statusLabel: 'Citas',
        completedLabel: 'Realizadas',
        topLabel: 'Servicio Más Solicitado',
        countLabel: 'citas',
        totalLabel: 'Total servicios',
        actionLabel: 'agendado',
      };
    }
    return {
      statusLabel: 'Órdenes',
      completedLabel: 'Completadas',
      topLabel: 'Más Vendido',
      countLabel: 'unidades vendidas',
      totalLabel: 'Total productos',
      actionLabel: 'comprado',
    };
  }, [isServiceBusiness]);

  // RENDER DE TARJETAS
  const cards = useMemo(() => {
    const { statusLabel, completedLabel, topLabel, countLabel, totalLabel, actionLabel } = labels;

    const statusCard = (
      <div 
        key="status"
        className="border p-4 rounded-2xl space-y-3 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
        onClick={() => handleCardClick('status', `Distribución de ${statusLabel}`, statusData)}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: textColor, opacity: 0.75 }}>
            {isServiceBusiness ? <Icons.Appointment color={textColor} size={12} /> : <Icons.Orders color={textColor} size={12} />}
            {statusLabel}
          </span>
          <span className="text-xs font-bold" style={{ color: textColor, opacity: 0.6 }}>{totalItems}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(statusCounts).map(([key, value]) => {
            const colorMap: Record<string, string> = {
              verifying: 'bg-sky-400',
              pending: 'bg-amber-400',
              completed: 'bg-emerald-400',
              cancelled: 'bg-red-400',
              confirmed: 'bg-sky-400',
              noShow: 'bg-gray-400',
            };
            const labelMap: Record<string, string> = {
              verifying: 'Verif.',
              pending: 'Pend.',
              completed: isServiceBusiness ? 'Real.' : 'Compl.',
              cancelled: 'Cancel.',
              confirmed: 'Conf.',
              noShow: 'No Show',
            };
            const color = colorMap[key] || 'bg-gray-400';
            const label = labelMap[key] || key;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                <span className="text-[10px]" style={{ color: textColor, opacity: 0.7 }}>{label}</span>
                <span className="text-xs font-bold ml-auto" style={{ color: textColor }}>{value}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: subtleBorderColor }}>
          <span className="text-[9px]" style={{ color: textColor, opacity: 0.5 }}>Tasa de conversión</span>
          <span className="text-xs font-bold" style={{ color: primary }}>{conversionRate}%</span>
        </div>
      </div>
    );

    const avgTicketCard = (
      <div 
        key="avgTicket"
        className="border p-4 rounded-2xl space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
        onClick={() => handleCardClick('orders', `Detalle de ${statusLabel}`, statusData)}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: textColor, opacity: 0.75 }}>
            <Icons.Ticket color={textColor} size={12} />
            Ticket Promedio
          </span>
          <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Icons.Ticket color="#818cf8" size={16} />
          </div>
        </div>
// Reemplaza en la tarjeta de Ticket Promedio (líneas 266-275):
<div>
  <h3 className="text-lg font-black tracking-tight" style={{ color: primary }}>
    Bs. {avgTicket.bs}
  </h3>
  <p className="text-[10px]" style={{ color: textColor, opacity: 0.6 }}>
    (${avgTicket.usd}) por {isServiceBusiness ? 'cita' : 'orden'} {completedLabel.toLowerCase()}
  </p>
</div>
        <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: subtleBorderColor }}>
          <span className="text-[9px]" style={{ color: textColor, opacity: 0.5 }}>{statusLabel} {completedLabel.toLowerCase()}</span>
          <span className="text-xs font-bold text-emerald-400">{completedItems}</span>
        </div>
      </div>
    );

    const topItemCard = (
      <div 
        key="topItem"
        className="border p-4 rounded-2xl space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
        onClick={() => handleCardClick('products', topLabel, productData)}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: textColor, opacity: 0.75 }}>
            <Icons.Trending color={textColor} size={12} />
            {topLabel}
          </span>
          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Icons.Trending color="#f59e0b" size={16} />
          </div>
        </div>
        <div>
          {topItem ? (
            <>
              <h3 className="text-sm font-bold tracking-tight truncate" style={{ color: textColor }}>
                {topItem.name}
              </h3>
              <p className="text-[10px]" style={{ color: textColor, opacity: 0.6 }}>
                {isServiceBusiness ? topItem.count : topItem.quantity} {countLabel}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>Sin datos aún</p>
          )}
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: subtleBorderColor }}>
          <span className="text-[9px]" style={{ color: textColor, opacity: 0.5 }}>{totalLabel}</span>
          <span className="text-xs font-bold" style={{ color: primary }}>{safeItems.length}</span>
        </div>
      </div>
    );

    const customersCard = (
      <div 
        key="customers"
        className="border p-4 rounded-2xl space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
        onClick={() => handleCardClick('customers', 'Clientes Activos', customerData)}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: textColor, opacity: 0.75 }}>
            <Icons.Customers color={textColor} size={12} />
            Clientes Activos
          </span>
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Icons.Customers color="#34d399" size={16} />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight text-emerald-400">{uniqueCount}</h3>
          <p className="text-[10px]" style={{ color: textColor, opacity: 0.6 }}>Clientes únicos que han {actionLabel}</p>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: subtleBorderColor }}>
          <span className="text-[9px]" style={{ color: textColor, opacity: 0.5 }}>Tasa de repetición</span>
          <span className="text-xs font-bold" style={{ color: primary }}>
            {uniqueCount > 0 ? ((totalItems / uniqueCount) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    );

    return [statusCard, avgTicketCard, topItemCard, customersCard];
  }, [cardBg, subtleBorderColor, primary, textColor, totalItems, statusCounts, 
      conversionRate, avgTicket, completedItems, topItem, safeItems.length, 
      uniqueCount, statusData, productData, customerData, handleCardClick, 
      isServiceBusiness, labels]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards}
      </div>

      <DashboardCardModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        data={modalState.data}
        type={modalState.type}
        primary={primary}
        textColor={textColor}
        isDarkBg={isDarkBg}
        secondary={secondary}
        formatCurrency={formatCurrency}
        onNavigate={handleNavigate}
        bsRate={bsRate}
        ivaRate={ivaRate}
        isServiceBusiness={isServiceBusiness}
      />
    </>
  );
});

DashboardMetricsAdvanced.displayName = 'DashboardMetricsAdvanced';
export default DashboardMetricsAdvanced;