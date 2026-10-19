// StatsCards.tsx
import React from 'react';

interface StatsCardsProps {
  stats: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  cardBorder: string;
  textColor: string;
  isDarkBg: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  cardBorder,
  textColor,
  isDarkBg,
}) => {
  const cardBg = isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="p-3 rounded-xl border text-center" style={{ borderColor: cardBorder, backgroundColor: cardBg }}>
        <span className="text-lg font-black" style={{ color: textColor }}>{stats.total}</span>
        <p className="text-[8px] uppercase tracking-wider opacity-50">Total</p>
      </div>
      <div className="p-3 rounded-xl border text-center" style={{ borderColor: cardBorder, backgroundColor: cardBg }}>
        <span className="text-lg font-black text-amber-500">{stats.pending}</span>
        <p className="text-[8px] uppercase tracking-wider opacity-50">Pendientes</p>
      </div>
      <div className="p-3 rounded-xl border text-center" style={{ borderColor: cardBorder, backgroundColor: cardBg }}>
        <span className="text-lg font-black text-emerald-500">{stats.completed}</span>
        <p className="text-[8px] uppercase tracking-wider opacity-50">Completadas</p>
      </div>
      <div className="p-3 rounded-xl border text-center" style={{ borderColor: cardBorder, backgroundColor: cardBg }}>
        <span className="text-lg font-black text-rose-500">{stats.cancelled}</span>
        <p className="text-[8px] uppercase tracking-wider opacity-50">Canceladas</p>
      </div>
    </div>
  );
};