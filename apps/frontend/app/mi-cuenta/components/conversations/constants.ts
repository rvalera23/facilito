// frontend/app/mi-cuenta/components/conversations/constants.ts

export const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const CONVERSATION_STATUS = {
  active: { label: 'Activa', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  archived: { label: 'Archivada', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  completed: { label: 'Completada', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

export const PAYMENT_METHODS = [
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'transferencia_bancaria', label: 'Transferencia Bancaria' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'punto_venta', label: 'Punto de Venta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'usdt', label: 'USDT' },
];