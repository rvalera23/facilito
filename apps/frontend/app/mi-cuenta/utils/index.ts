// utils/index.ts

// 🔥 FORMATO DE PRECIOS
export const formatPrice = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return '0,00';
  return value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 🔥 TOTAL EN VES
export const getOrderTotalVes = (order: any): number => {
  if (order.totalAmountVes) return Number(order.totalAmountVes);
  if (!order.items || !Array.isArray(order.items)) return 0;
  
  let totalVes = 0;
  for (const item of order.items) {
    const quantity = Number(item.quantity || 1);
    let priceVes = item.priceVes || item.prices?.VES || item.price || 0;
    totalVes += Number(priceVes) * quantity;
  }
  return totalVes;
};

// 🔥 NUEVO: OBTENER MONEDAS DE LA ORDEN
export const getOrderCurrencies = (order: any) => {
  const totalVes = getOrderTotalVes(order);
  const totalUsd = Number(order.totalAmount || 0);
  return {
    bs: formatPrice(totalVes),
    usd: totalUsd.toFixed(2)
  };
};

// 🔥 ESTADOS
export const getOrderStatus = (order: any): 'pending' | 'completed' | 'cancelled' | 'unknown' => {
  const status = (order?.status || '').toLowerCase().trim();
  if (status.includes('complet') || status.includes('pagado') || status.includes('aprobado')) return 'completed';
  if (status.includes('canc') || status.includes('rechaz')) return 'cancelled';
  if (status.includes('pend') || status.includes('por_verificar')) return 'pending';
  return 'unknown';
};

export const getFriendlyStatusLabel = (status: string) => {
  const st = (status || '').toLowerCase();
  if (st.includes('por_verificar')) return 'Verificando';
  if (st.includes('pend')) return 'Pendiente';
  if (st.includes('paid') || st.includes('complet') || st.includes('aprobado')) return 'Completado';
  if (st.includes('canc') || st.includes('rechaz')) return 'Cancelado';
  return status || 'Pendiente';
};

export const getBadgeConfig = (status: string, isDarkBg: boolean) => {
  const st = status.toLowerCase();
  const styles = {
    pending: isDarkBg ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    completed: isDarkBg ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
    cancelled: isDarkBg ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-red-100 text-red-800 border-red-300 font-semibold',
  };
  if (st.includes('por_verificar') || st.includes('pend')) return { style: styles.pending };
  if (st.includes('canc') || st.includes('rechaz')) return { style: styles.cancelled };
  return { style: styles.completed };
};

// 🔥 FECHAS
export const getLastOrderDate = (orders: any[]): string => {
  if (!orders.length) return 'Sin actividad';
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return sorted[0].createdAt ? new Date(sorted[0].createdAt).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : 'Reciente';
};

export const formatDate = (date: string | Date): string => {
  if (!date) return 'Fecha reciente';
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// 🔥 GRÁFICA
export const getChartData = (orders: any[]) => {
  const summary: { [key: string]: { total: number; count: number; rawDate: Date } } = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    summary[dateKey] = { total: 0, count: 0, rawDate: d };
  }

  const safeOrders = Array.isArray(orders) ? orders : [];
  safeOrders.forEach((o) => {
    const status = (o.status || '').toLowerCase().trim();
    if (status.includes('canc') || status.includes('rechaz')) return;
    if (o.createdAt) {
      const d = new Date(o.createdAt);
      d.setHours(0, 0, 0, 0);
      const dateKey = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      if (summary[dateKey]) {
        summary[dateKey].total += Number(o.totalAmount || o.total) || 0;
        summary[dateKey].count += 1;
      }
    }
  });

  const sortedEntries = Object.entries(summary).sort((a, b) => a[1].rawDate.getTime() - b[1].rawDate.getTime());
  const maxVal = Math.max(...sortedEntries.map(([_, val]) => val.total), 1);

  return sortedEntries.map(([label, val]) => ({
    label,
    amount: val.total,
    count: val.count,
    height: val.total > 0 ? `${Math.max(Math.round((val.total / maxVal) * 90), 15)}%` : '4%'
  }));
};