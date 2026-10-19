// utils/orderUtils.ts

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

export const getBadgeConfig = (orderStatus: string, isDarkBg: boolean) => {
  const st = orderStatus.toLowerCase();
  if (st.includes('por_verificar')) {
    return { style: isDarkBg ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-sky-100 text-sky-800 border-sky-300 font-semibold' };
  } else if (st.includes('pend')) {
    return { style: isDarkBg ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300 font-semibold' };
  } else if (st.includes('canc') || st.includes('rechaz')) {
    return { style: isDarkBg ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-red-100 text-red-800 border-red-300 font-semibold' };
  } else {
    return { style: isDarkBg ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold' };
  }
};