// frontend/app/admin/[slug]/components/shipping/types.ts

export interface DeliveryInfo {
  company?: string;
  trackingNumber?: string;
  status?: string;
  estimatedDelivery?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ShippingOrder {
  id: string;
  customerName?: string;
  customerAddress?: string;
  status?: string;
  orderType?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  attributes?: {
    delivery?: DeliveryInfo;
    [key: string]: any;
  };
  delivery?: DeliveryInfo;
  [key: string]: any;
}

export interface ShippingStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  icon?: string;
}

export interface CompanyInfo {
  name: string;
  color: string;
  icon?: string;
}