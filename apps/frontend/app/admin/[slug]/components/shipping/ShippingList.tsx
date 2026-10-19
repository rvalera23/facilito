// frontend/app/admin/[slug]/components/shipping/ShippingList.tsx

import React from 'react';
import ShippingCard from './ShippingCard';
import { ShippingOrder } from './types';
import { EmptyState } from '@/components/ui/EmptyState';

interface ShippingListProps {
  orders: ShippingOrder[];
  onViewDetails: (order: ShippingOrder) => void;
  onStatusChange: (orderId: string, status: string) => Promise<void>;
  isUpdating: Record<string, boolean>;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
}

export default function ShippingList({
  orders,
  onViewDetails,
  onStatusChange,
  isUpdating,
  primary,
  textColor,
  isDarkBg,
  cardBorder,
}: ShippingListProps) {
  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
        title="No hay envíos registrados"
        message="Los envíos de tus clientes aparecerán aquí"
        primary={primary}
        textColor={textColor}
        borderColor={cardBorder}
        cardBg="transparent"
        isDarkBg={isDarkBg}
        padding="py-16"
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <ShippingCard
          key={order.id}
          order={order}
          onViewDetails={onViewDetails}
          onStatusChange={onStatusChange}
          isUpdating={isUpdating[order.id] || false}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          cardBorder={cardBorder}
        />
      ))}
    </div>
  );
}