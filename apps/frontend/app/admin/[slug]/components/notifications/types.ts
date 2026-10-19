// frontend/app/admin/[slug]/components/notifications/types.ts

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
  tenantId?: string;
  tenantName?: string;
  tenantAvatarUrl?: string | null;
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
  buyer?: { name?: string; avatar?: string; avatarUrl?: string; email?: string; phone?: string };
  client?: { name?: string; avatar?: string; avatarUrl?: string; email?: string; phone?: string };
  user?: { name?: string; avatar?: string; avatarUrl?: string; email?: string; phone?: string };
}

export interface NotificationStats {
  total: number;
  unread: number;
  requiresAction: number;
  services: number;
  products: number;
  buyer: number;
  seller: number;
  byStatus?: Record<string, number>;
  byPaymentMethod?: Record<string, number>;
}

export type FilterType = 'all' | 'unread' | 'read' | 'buyer' | 'seller' | 'product' | 'service' | 'requires_action';
export type SortType = 'newest' | 'oldest' | 'unread_first';