// frontend/app/admin/[slug]/components/conversations/types.ts

export interface Message {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name?: string;
    avatar?: string;
  } | string;
  content: string;
  type: 'text' | 'status_update' | 'payment_report' | 'system' | 'image';
  metadata?: Record<string, any>;
  createdAt: string;
  isRead: boolean;
  read?: boolean;
}

export interface Conversation {
  id: string;
  orderId?: string;
  tenantId?: string;
  tenant?: any;
  buyer: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    avatarUrl?: string;
    online?: boolean;
  };
  product?: {
    id: string;
    name: string;
    price?: number;
    image?: string;
  };
  messages: Message[];
  status: 'active' | 'archived' | 'completed' | 'resolved';
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  metadata?: Record<string, any>;
}

export interface ConversationStats {
  total: number;
  active: number;
  archived: number;
  completed: number;
  resolved: number;
  pendingPayment: number;
  verifying: number;
  inTransit: number;
}

export interface OrderAction {
  id: string;
  label: string;
  action: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface ReportPaymentData {
  method: string;
  reference: string;
  amount: number;
  bank?: string;
  phoneNumber?: string;
  date: string;
  notes?: string;
  buyerName: string;
  productName: string;
  totalAmount: number;
}