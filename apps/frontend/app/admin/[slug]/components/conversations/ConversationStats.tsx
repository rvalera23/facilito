// frontend/app/admin/[slug]/components/conversations/ConversationStats.tsx

import React from 'react';
import { ConversationStats as StatsType } from './types';

interface ConversationStatsProps {
  stats: StatsType;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}

export default function ConversationStats({ stats, primary, textColor, isDarkBg }: ConversationStatsProps) {
  const statsConfig = [
    { key: 'total', label: 'Total', value: stats.total, color: '#3b82f6' },
    { key: 'active', label: 'Activas', value: stats.active, color: '#10b981' },
    { key: 'pendingPayment', label: 'Pagos Pendientes', value: stats.pendingPayment, color: '#f59e0b' },
    { key: 'completed', label: 'Completadas', value: stats.completed, color: '#8b5cf6' },
    { key: 'archived', label: 'Archivadas', value: stats.archived, color: '#64748b' },
    { key: 'resolved', label: 'Resueltas', value: stats.resolved, color: '#8b5cf6' },
  ];

  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {statsConfig.map((stat) => (
        <div
          key={stat.key}
          className="p-2 rounded-xl border text-center"
          style={{
            borderColor: cardBorder,
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <span className="text-sm font-bold" style={{ color: stat.value > 0 ? stat.color : textColor }}>
            {stat.value}
          </span>
          <p className="text-[8px] uppercase font-bold tracking-wider opacity-60 mt-0.5" style={{ color: textColor }}>
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}