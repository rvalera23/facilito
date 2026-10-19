// utils/dates.ts

export const getLastOrderDate = (orders: any[]): string => {
  if (!orders.length) return 'Sin actividad';
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return sorted[0].createdAt ? new Date(sorted[0].createdAt).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : 'Reciente';
};

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

export const formatDate = (date: string | Date): string => {
  if (!date) return 'Fecha reciente';
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};