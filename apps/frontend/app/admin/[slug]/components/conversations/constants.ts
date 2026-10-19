// frontend/app/admin/[slug]/components/conversations/constants.ts

// 🔥 API_BASE se lee de NEXT_PUBLIC_API_URL (.env.local)
// export const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const CONVERSATION_STATUS = {
  active: { label: 'Activa', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  archived: { label: 'Archivada', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  completed: { label: 'Completada', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  resolved: { label: 'Resuelta', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  'PENDING': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'pending': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'por_verificar': { label: 'Por Verificar', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'POR_VERIFICAR': { label: 'Por Verificar', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'in_transit': { label: 'En Camino', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'IN_TRANSIT': { label: 'En Camino', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'COMPLETED': { label: 'Completado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'completed': { label: 'Completado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'CANCELLED': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'cancelled': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

export const FILTER_OPTIONS = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Activas' },
  { id: 'archived', label: 'Archivadas' },
  { id: 'completed', label: 'Completadas' },
  { id: 'resolved', label: 'Resueltas' },
];