// frontend/app/mi-cuenta/components/conversations/types.ts

export interface Message {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name?: string;
  };
  content: string;
  createdAt: string;
  read?: boolean;
}

export interface Conversation {
  id: string;
  product?: {
    id: string;
    name: string;
    price?: number;
    images?: string[];
  } | null;
  tenant: {
    id: string;
    name: string;
    logoUrl?: string;
    avatar?: string;
    image?: string;
    slug?: string;
  };
  buyer: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    avatar?: string;
    image?: string;
  };
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'archived' | 'completed';
  orderId?: string;
}

export type FilterType = 'all' | 'unread' | 'read' | 'archived' | 'completed';

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