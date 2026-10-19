'use client';

import React, { memo } from 'react';
import { Truck, CheckCircle, Clock, Package } from 'lucide-react';

interface BuyerShippingStatsProps {
  stats: {
    inTransit: number;
    delivered: number;
    pending: number;
    total: number;
  };
  primary: string;
  textColor: string;
  mutedText: string;
  cardBorder: string;
  isDarkBg: boolean;
}

function BuyerShippingStats({
  stats,
  primary,
  textColor,
  mutedText,
  cardBorder,
  isDarkBg,
}: BuyerShippingStatsProps) {
  const items = [
    {
      label: 'En tránsito',
      value: stats.inTransit,
      icon: <Truck className="w-4 h-4" />,
      color: '#3b82f6',
    },
    {
      label: 'Entregados',
      value: stats.delivered,
      icon: <CheckCircle className="w-4 h-4" />,
      color: '#22c55e',
    },
    {
      label: 'Pendientes',
      value: stats.pending,
      icon: <Clock className="w-4 h-4" />,
      color: '#f59e0b',
    },
    {
      label: 'Total',
      value: stats.total,
      icon: <Package className="w-4 h-4" />,
      color: primary,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="p-3 rounded-2xl border"
          style={{
            borderColor: cardBorder,
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: item.color }}>{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
              {item.label}
            </span>
          </div>
          <p className="text-2xl font-black" style={{ color: item.color }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default memo(BuyerShippingStats);