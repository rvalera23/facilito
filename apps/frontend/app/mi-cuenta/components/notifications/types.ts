// frontend/app/mi-cuenta/components/notifications/types.ts

export type PaymentMethod = 
  | 'cash' 
  | 'pago_movil' 
  | 'punto_de_venta' 
  | 'bank_transfer' 
  | 'card' 
  | 'mobile'
  | 'transfer'
  | 'crypto'
  | 'wallet'
  | 'efectivo'
  | 'zelle'
  | 'biopago'
  | 'binance'
  | 'pos'
  | 'punto_de_venta';

export type NotificationSource = 'buyer' | 'seller';
export type NotificationType = 
  | 'order_created' 
  | 'booking_created' 
  | 'order_cancelled' 
  | 'booking_cancelled'
  | 'payment_verified' 
  | 'payment_received' 
  | 'order_delivered' 
  | 'booking_completed'
  | 'order_confirmed' 
  | 'booking_confirmed';

export interface NotificationMetadata {
  orderId?: string;
  bookingId?: string;
  orderType?: 'product' | 'service';
  isService?: boolean;
  totalAmount?: number;
  totalAmountVes?: number;
  paymentMethod?: string;
  paymentReference?: string;
  actionRequired?: boolean;
  instructions?: string;
  nextSteps?: string[];
  verificationSteps?: string[];
  status?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerId?: string | null;
  customerAvatarUrl?: string | null;
  itemsCount?: number;
  serviceDate?: string;
  serviceTime?: string;
  serviceName?: string;
  bankSource?: string;
  cancelledBy?: 'client' | 'provider' | 'system';
  source?: 'web' | 'kiosk' | 'admin';
  items?: any[];
  completedAt?: string;
  cancelledAt?: string;
  // 🔥 Datos de la tienda (para notificaciones al comprador)
  tenantName?: string;
  tenantLogo?: string;
  tenantId?: string;
  tenantAvatarUrl?: string | null;
  storeName?: string;
  storeLogo?: string;
  store?: string;
  tenant?: string;
  // 🔥 Historial de cambios de estado (consolidación Shopify)
  history?: Array<{ status: string; at: string }>;
}

export interface EnhancedNotification {
  id: string;
  userId: string;
  tenantId: string;
  orderId?: string;
  bookingId?: string;
  type: NotificationType;
  title: string;
  message: string;
  source: NotificationSource;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
  metadata: NotificationMetadata;
  // 🔥 Campos opcionales usados por helpers de extracción
  tenant?: { id?: string; name?: string; logo?: string; logoUrl?: string; avatar?: string };
  storeName?: string;
  tenantName?: string;
}

export interface PaymentMethodConfig {
  emoji: string;
  color: string;
  label: string;
  requiresAction: boolean;
  badge: string;
}

export const PAYMENT_METHOD_CONFIG: Record<string, PaymentMethodConfig> = {
  // Efectivo
  cash: { 
    emoji: '💰', 
    color: '#22c55e', 
    label: 'Efectivo', 
    requiresAction: true,
    badge: '💵 Efectivo'
  },
  efectivo: { 
    emoji: '💰', 
    color: '#22c55e', 
    label: 'Efectivo', 
    requiresAction: true,
    badge: '💵 Efectivo'
  },
  
  // Pago Móvil
  pago_movil: { 
    emoji: '📱', 
    color: '#8b5cf6', 
    label: 'Pago Móvil', 
    requiresAction: true,
    badge: '📱 Pago Móvil'
  },
  pagomovil: { 
    emoji: '📱', 
    color: '#8b5cf6', 
    label: 'Pago Móvil', 
    requiresAction: true,
    badge: '📱 Pago Móvil'
  },
  mobile: { 
    emoji: '📱', 
    color: '#8b5cf6', 
    label: 'Pago Móvil', 
    requiresAction: true,
    badge: '📱 Pago Móvil'
  },
  
  // Zelle
  zelle: { 
    emoji: '💵', 
    color: '#0ea5e9', 
    label: 'Zelle', 
    requiresAction: true,
    badge: '💵 Zelle'
  },
  
  // Punto de Venta / POS
  punto_de_venta: { 
    emoji: '💳', 
    color: '#3b82f6', 
    label: 'Punto de Venta', 
    requiresAction: false,
    badge: '💳 Punto de Venta'
  },
  pos: { 
    emoji: '💳', 
    color: '#3b82f6', 
    label: 'Punto de Venta', 
    requiresAction: false,
    badge: '💳 Punto de Venta'
  },
  
  // Biopago
  biopago: { 
    emoji: '💳', 
    color: '#8b5cf6', 
    label: 'Biopago', 
    requiresAction: false,
    badge: '💳 Biopago'
  },
  
  // Tarjeta
  card: { 
    emoji: '💳', 
    color: '#3b82f6', 
    label: 'Tarjeta', 
    requiresAction: false,
    badge: '💳 Tarjeta'
  },
  tarjeta: { 
    emoji: '💳', 
    color: '#3b82f6', 
    label: 'Tarjeta', 
    requiresAction: false,
    badge: '💳 Tarjeta'
  },
  
  // Transferencia
  bank_transfer: { 
    emoji: '🏦', 
    color: '#f59e0b', 
    label: 'Transferencia', 
    requiresAction: true,
    badge: '🏦 Transferencia'
  },
  transfer: { 
    emoji: '🏦', 
    color: '#f59e0b', 
    label: 'Transferencia', 
    requiresAction: true,
    badge: '🏦 Transferencia'
  },
  transferencia: { 
    emoji: '🏦', 
    color: '#f59e0b', 
    label: 'Transferencia', 
    requiresAction: true,
    badge: '🏦 Transferencia'
  },
  
  // Binance Pay
  binance: { 
    emoji: '₿', 
    color: '#f0b90b', 
    label: 'Binance Pay', 
    requiresAction: false,
    badge: '₿ Binance Pay'
  },
  
  // Crypto
  crypto: { 
    emoji: '₿', 
    color: '#f7931a', 
    label: 'Cripto', 
    requiresAction: false,
    badge: '₿ Cripto'
  },
  
  // Wallet / Billetera
  wallet: { 
    emoji: '👛', 
    color: '#06b6d4', 
    label: 'Billetera', 
    requiresAction: false,
    badge: '👛 Billetera'
  },
  billetera: { 
    emoji: '👛', 
    color: '#06b6d4', 
    label: 'Billetera', 
    requiresAction: false,
    badge: '👛 Billetera'
  },
};

export type FilterType = 'all' | 'unread' | 'read' | 'product' | 'service' | 'requires_action';
export type SortType = 'newest' | 'oldest' | 'unread_first';

export interface NotificationStats {
  total: number;
  unread: number;
  requiresAction: number;
  services: number;
  products: number;
  buyer: number;
  seller: number;
  byStatus: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}