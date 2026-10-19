'use client';

import React, { memo } from 'react';
import { Search } from 'lucide-react';

interface BuyerShippingFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterCompany: string;
  setFilterCompany: (v: string) => void;
  uniqueCompanies: Array<{ value: string; label: string; count: number }>;
  primary: string;
  textColor: string;
  mutedText: string;
  cardBorder: string;
  isDarkBg: boolean;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_transit', label: 'En tránsito' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
];

function BuyerShippingFilters({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterCompany,
  setFilterCompany,
  uniqueCompanies,
  primary,
  textColor,
  mutedText,
  cardBorder,
  isDarkBg,
}: BuyerShippingFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none opacity-50" style={{ color: textColor }}>
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por pedido, tracking o tienda..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border outline-none transition"
          style={{
            backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
            borderColor: cardBorder,
            color: textColor,
          }}
        />
      </div>

      {/* Filtros de estado */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = filterStatus === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterStatus(opt.value)}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border flex-shrink-0 cursor-pointer"
              style={{
                backgroundColor: isActive ? primary : 'transparent',
                borderColor: isActive ? primary : cardBorder,
                color: isActive ? '#ffffff' : textColor,
                opacity: isActive ? 1 : 0.7,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Filtro de mensajería */}
      {uniqueCompanies.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: mutedText }}>
            Mensajería:
          </span>
          <button
            type="button"
            onClick={() => setFilterCompany('all')}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
            style={{
              backgroundColor: filterCompany === 'all' ? `${primary}20` : 'transparent',
              borderColor: filterCompany === 'all' ? primary : cardBorder,
              color: filterCompany === 'all' ? primary : textColor,
            }}
          >
            Todas
          </button>
          {uniqueCompanies.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setFilterCompany(c.value)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer"
              style={{
                backgroundColor: filterCompany === c.value ? `${primary}20` : 'transparent',
                borderColor: filterCompany === c.value ? primary : cardBorder,
                color: filterCompany === c.value ? primary : textColor,
              }}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(BuyerShippingFilters);