// frontend/app/mi-cuenta/components/notifications/utils.ts

import { 
  DollarSign, 
  Smartphone, 
  CreditCard, 
  Landmark, 
  Bitcoin, 
  CircleDollarSign,
  Zap
} from 'lucide-react';
import { EnhancedNotification } from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getToken = (): string => {
  return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
};

// 🔥 CONFIGURACIÓN DE MÉTODOS DE PAGO CON ICONOS SVG
export const PAYMENT_CONFIG: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  label: string; 
  requiresAction: boolean 
}> = {
  'efectivo en caja': { icon: DollarSign, color: '#22c55e', label: 'Efectivo', requiresAction: true },
  'efectivo': { icon: DollarSign, color: '#22c55e', label: 'Efectivo', requiresAction: true },
  'pago móvil': { icon: Smartphone, color: '#8b5cf6', label: 'Pago Móvil', requiresAction: true },
  'pago movil': { icon: Smartphone, color: '#8b5cf6', label: 'Pago Móvil', requiresAction: true },
  'zelle': { icon: CircleDollarSign, color: '#0ea5e9', label: 'Zelle', requiresAction: true },
  'punto de venta': { icon: CreditCard, color: '#3b82f6', label: 'Punto de Venta', requiresAction: false },
  'punto_de_venta': { icon: CreditCard, color: '#3b82f6', label: 'Punto de Venta', requiresAction: false },
  'biopago': { icon: Zap, color: '#8b5cf6', label: 'Biopago', requiresAction: false },
  'binance pay': { icon: Bitcoin, color: '#f0b90b', label: 'Binance Pay', requiresAction: false },
  'binance': { icon: Bitcoin, color: '#f0b90b', label: 'Binance Pay', requiresAction: false },
  'transferencia': { icon: Landmark, color: '#f59e0b', label: 'Transferencia', requiresAction: true },
  'transferencia bancaria': { icon: Landmark, color: '#f59e0b', label: 'Transferencia', requiresAction: true },
};

export const getPaymentConfig = (paymentMethod?: string) => {
  if (!paymentMethod) {
    return { icon: CreditCard, color: '#6b7280', label: 'No especificado', requiresAction: false };
  }
  
  const normalized = paymentMethod.toLowerCase().trim();
  
  if (PAYMENT_CONFIG[normalized]) {
    return PAYMENT_CONFIG[normalized];
  }
  
  for (const [key, config] of Object.entries(PAYMENT_CONFIG)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return config;
    }
  }
  
  return { icon: CreditCard, color: '#6b7280', label: paymentMethod, requiresAction: false };
};

export const getPaymentLabel = (paymentMethod?: string): string => {
  const config = getPaymentConfig(paymentMethod);
  return config.label;
};

export const getPaymentEmoji = (paymentMethod?: string): string => {
  const config = getPaymentConfig(paymentMethod);
  return config.label;
};

export const formatDate = (date: string): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  if (diff < 60000) return 'hace un momento';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)} h`;
  if (diff < 172800000) return 'ayer';
  if (diff < 604800000) return d.toLocaleDateString('es-VE', { weekday: 'short' });
  
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getStatusBadge = (status?: string) => {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    'PENDING': { label: 'Pendiente', color: '#f59e0b', bg: '#f59e0b20' },
    'POR_VERIFICAR': { label: 'Verificar', color: '#8b5cf6', bg: '#8b5cf620' },
    'CONFIRMED': { label: 'Confirmado', color: '#22c55e', bg: '#22c55e20' },
    'COMPLETED': { label: 'Completado', color: '#22c55e', bg: '#22c55e20' },
    'CANCELLED': { label: 'Cancelado', color: '#ef4444', bg: '#ef444420' },
    'PAID': { label: 'Pagado', color: '#06b6d4', bg: '#06b6d420' },
    'DELIVERED': { label: 'Entregado', color: '#3b82f6', bg: '#3b82f620' },
  };
  if (!status) return null;
  const normalized = status.toUpperCase().trim();
  return statusMap[normalized] || null;
};

export const getTypeColor = (notification: EnhancedNotification) => {
  const { metadata, type } = notification;
  
  if (metadata?.actionRequired) return '#f59e0b';
  if (type.includes('cancelled')) return '#ef4444';
  if (type.includes('completed') || type.includes('confirmed') || type.includes('delivered')) return '#22c55e';
  if (type.includes('payment') || type.includes('verified') || type.includes('received')) return '#06b6d4';
  
  const config = getPaymentConfig(metadata?.paymentMethod);
  return config.color;
};

export const triggerBadgeUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notificationUpdate'));
    window.dispatchEvent(new CustomEvent('notificationRead'));
  }
};

export const buildImageUrl = (imagePath?: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  if (imagePath.includes('uploads/')) {
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${API_BASE_URL}/${cleanPath}`;
  }
  return `${API_BASE_URL}/uploads/${imagePath}`;
};