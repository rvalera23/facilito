// lib/dashboardTextColors.ts
// ============================================================
// 🎨 COLORES DE TEXTO DEL DASHBOARD — ÚNICOS EN TODO EL PROYECTO
// ------------------------------------------------------------
// Todos los componentes del dashboard (DashboardMetrics,
// DashboardCharts, DashboardDeliveryMetrics, DashboardPaymentMetrics,
// DashboardCardModal) DEBEN usar esta función. Si alguno define
// sus propios textColors, es un bug de uniformidad visual.
// ============================================================

export interface DashboardTextColors {
  /** Título de sección (encabezado de tarjeta) */
  title: string;
  /** Subtítulo / descripción */
  subtitle: string;
  /** Etiqueta de campo (label de dato) */
  label: string;
  /** Valor principal (número grande, texto destacado) */
  value: string;
  /** Texto pequeño (notas al pie, badges chicos) */
  smallText: string;
  /** Texto atenuado (placeholder, "no hay datos") */
  muted: string;
}

export function getDashboardTextColors(isDarkBg: boolean): DashboardTextColors {
  return {
    title:     isDarkBg ? 'rgba(255, 255, 255, 0.9)'  : '#1e293b',
    subtitle:  isDarkBg ? 'rgba(255, 255, 255, 0.7)'  : '#475569',
    label:     isDarkBg ? 'rgba(255, 255, 255, 0.6)'  : '#334155',
    value:     isDarkBg ? 'rgba(255, 255, 255, 0.95)' : '#0f172a',
    smallText: isDarkBg ? 'rgba(255, 255, 255, 0.5)'  : '#64748b',
    muted:     isDarkBg ? 'rgba(255, 255, 255, 0.4)'  : '#94a3b8',
  };
}