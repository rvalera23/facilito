'use client';

import React from 'react';

// ============================================================
// TIPOS
// ============================================================

export type InventoryFilterKey =
  | 'all'
  | 'published'
  | 'drafts'
  | 'low-stock'
  | 'out-of-stock'
  | 'on-sale';

interface InventoryFilterChipsProps {
  activeFilter: InventoryFilterKey;
  onFilterChange: (filter: InventoryFilterKey) => void;
  isService?: boolean;
  lowStockThreshold?: number;
  items: any[];
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}

// ============================================================
// COMPONENTE
// ============================================================

export default function InventoryFilterChips({
  activeFilter,
  onFilterChange,
  isService = false,
  lowStockThreshold = 2,
  items,
  primary,
  textColor,
  isDarkBg,
}: InventoryFilterChipsProps) {

  // ------------------------------------------------------------
  // CALCULAR CONTADORES POR FILTRO (en vivo)
  // ------------------------------------------------------------
  const counts = React.useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    let published = 0;
    let drafts = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let onSale = 0;

    for (const item of safeItems) {
      const status = item?.status || '';
      const isPublished = status === 'published' || status === 'Publicado';
      if (isPublished) {
        published += 1;
      } else {
        drafts += 1;
      }

      const qty = isService
        ? Number(item?.maxCapacity ?? item?.attributes?.maxCapacity ?? 0)
        : Number(item?.stock ?? item?.attributes?.stock ?? 0);

      if (qty === 0) {
        outOfStock += 1;
      } else if (qty <= lowStockThreshold) {
        lowStock += 1;
      }

      if (item?.onSale === true) {
        onSale += 1;
      }
    }

    return {
      all: safeItems.length,
      published,
      drafts,
      lowStock,
      outOfStock,
      onSale,
    };
  }, [items, isService, lowStockThreshold]);

  // ------------------------------------------------------------
  // DEFINICIÓN DE CHIPS
  // ------------------------------------------------------------
  const chips: Array<{
    key: InventoryFilterKey;
    label: string;
    count: number;
    accent?: 'green' | 'amber' | 'red' | 'slate';
  }> = [
    { key: 'all', label: 'Todos', count: counts.all },
    { key: 'published', label: 'Publicados', count: counts.published, accent: 'green' },
    { key: 'drafts', label: 'Borradores', count: counts.drafts, accent: 'slate' },
    {
      key: 'low-stock',
      label: isService ? 'Cupos limitados' : 'Stock bajo',
      count: counts.lowStock,
      accent: 'amber',
    },
    {
      key: 'out-of-stock',
      label: isService ? 'Sin cupos' : 'Agotados',
      count: counts.outOfStock,
      accent: 'red',
    },
    { key: 'on-sale', label: 'En oferta', count: counts.onSale, accent: 'green' },
  ];

  // ------------------------------------------------------------
  // COLORES
  // ------------------------------------------------------------
  const getColors = (accent?: string) => {
    const isActive = false;
    const palette: Record<string, { color: string; bg: string; border: string }> = {
      green: {
        color: isDarkBg ? '#4ade80' : '#15803d',
        bg: isDarkBg ? 'rgba(74, 222, 128, 0.08)' : 'rgba(21, 128, 61, 0.05)',
        border: isDarkBg ? 'rgba(74, 222, 128, 0.2)' : 'rgba(21, 128, 61, 0.15)',
      },
      amber: {
        color: isDarkBg ? '#fbbf24' : '#d97706',
        bg: isDarkBg ? 'rgba(251, 191, 36, 0.08)' : 'rgba(217, 119, 6, 0.05)',
        border: isDarkBg ? 'rgba(251, 191, 36, 0.2)' : 'rgba(217, 119, 6, 0.15)',
      },
      red: {
        color: isDarkBg ? '#f87171' : '#dc2626',
        bg: isDarkBg ? 'rgba(248, 113, 113, 0.08)' : 'rgba(220, 38, 38, 0.05)',
        border: isDarkBg ? 'rgba(248, 113, 113, 0.2)' : 'rgba(220, 38, 38, 0.15)',
      },
      slate: {
        color: isDarkBg ? '#94a3b8' : '#475569',
        bg: isDarkBg ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.05)',
        border: isDarkBg ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.15)',
      },
      default: {
        color: textColor,
        bg: 'transparent',
        border: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      },
    };
    return palette[accent || 'default'] || palette.default;
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.key;
        const colors = getColors(chip.accent);

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilterChange(chip.key)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-[10px] sm:text-[11px] font-semibold border
              transition-all cursor-pointer
              ${isActive ? 'scale-105 shadow-sm' : 'opacity-70 hover:opacity-100 hover:scale-[1.02]'}
            `}
            style={{
              backgroundColor: isActive ? colors.bg : 'transparent',
              borderColor: isActive ? colors.color : colors.border,
              color: isActive ? colors.color : textColor,
            }}
          >
            <span>{chip.label}</span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{
                backgroundColor: isActive ? `${colors.color}20` : 'rgba(128,128,128,0.12)',
                color: isActive ? colors.color : textColor,
              }}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}