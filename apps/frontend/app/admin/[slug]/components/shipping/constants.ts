// frontend/app/admin/[slug]/components/shipping/constants.ts

import { StatusConfig, CompanyInfo } from './types';

// 🔥 EMPRESAS DE MENSAJERÍA
export const DELIVERY_COMPANIES: Record<string, CompanyInfo> = {
  mrw: { name: 'MRW', color: '#e11d48' },
  domesa: { name: 'Domesa', color: '#0ea5e9' },
  tealca: { name: 'Tealca', color: '#8b5cf6' },
  zoom: { name: 'Zoom', color: '#f59e0b' },
};

// 🔥 ESTADOS DE ENVÍO
// El backend puede devolver estados en MAYÚSCULA (order.status: 'CONFIRMED')
// o en minúscula (paymentMetadata.delivery.status: 'pending').
// Este mapa cubre TODAS las variantes conocidas.
export const SHIPPING_STATUS: Record<string, StatusConfig> = {
  // Pendiente
  'PENDING': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'pending': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'PENDING_LOCAL': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'pending_local': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'por_enviar': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'POR_ENVIAR': { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },

  // Por verificar
  'POR_VERIFICAR': { label: 'Por Verificar', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'por_verificar': { label: 'Por Verificar', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },

  // Confirmado
  'CONFIRMED': { label: 'Confirmado', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'confirmed': { label: 'Confirmado', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },

  // En tránsito
  'IN_TRANSIT': { label: 'En Camino', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'in_transit': { label: 'En Camino', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'EN_TRANSITO': { label: 'En Camino', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'en_transito': { label: 'En Camino', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },

  // Entregado
  'COMPLETED': { label: 'Entregado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'completed': { label: 'Entregado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'DELIVERED': { label: 'Entregado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'delivered': { label: 'Entregado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'ENTREGADO': { label: 'Entregado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'entregado': { label: 'Entregado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },

  // Cancelado
  'CANCELLED': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'cancelled': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'CANCELADO': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'cancelado': { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },

  // No asistió
  'NO_SHOW': { label: 'No asistió', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'no_show': { label: 'No asistió', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

// 🔥 OPCIONES DE ESTADO PARA SELECT
// Los valores son los que se envían al backend.
// Usamos los valores en minúscula con `_` para que funcionen tanto para
// delivery como para orden (el backend los acepta).
export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_transit', label: 'En Camino' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'por_verificar', label: 'Por Verificar' },
];

// 🔥 HELPER: normalizar el status que llega del backend
// Devuelve la entrada de SHIPPING_STATUS que mejor matchea.
export function resolveShippingStatus(status: string): StatusConfig {
  if (!status) return SHIPPING_STATUS['PENDING'];

  // 1. Match exacto
  if (SHIPPING_STATUS[status]) return SHIPPING_STATUS[status];

  // 2. Match por UPPERCASE
  const upper = status.toUpperCase();
  if (SHIPPING_STATUS[upper]) return SHIPPING_STATUS[upper];

  // 3. Match por lowercase
  const lower = status.toLowerCase();
  if (SHIPPING_STATUS[lower]) return SHIPPING_STATUS[lower];

  // 4. Fallback
  return SHIPPING_STATUS['PENDING'];
}

// 🔥 API BASE
export const API_BASE = process.env.NEXT_PUBLIC_API_URL;