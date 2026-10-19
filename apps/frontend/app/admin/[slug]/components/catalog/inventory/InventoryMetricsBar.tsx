'use client';

import React, { useMemo } from 'react';

// ============================================================
// TIPOS
// ============================================================

interface InventoryMetricsBarProps {
  items: any[];
  rates: { USD: number; EUR: number };
  isService?: boolean;
  lowStockThreshold?: number;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onFilterChange?: (filter: string) => void;
}

interface MetricCard {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  icon: 'money' | 'usd' | 'box' | 'warning' | 'empty' | 'tag' | 'draft' | 'skus';
  color: 'primary' | 'green' | 'red' | 'amber' | 'blue' | 'slate';
  filterKey?: string;
}

// ============================================================
// HELPERS
// ============================================================

const formatBs = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integerPart},${parts[1]}`;
};

const formatUsd = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatInt = (value: number): string => {
  return Math.round(value).toLocaleString('es-VE');
};

// ============================================================
// ICONOS SVG INLINE (sin dependencias)
// ============================================================

const Icon = ({ name, color }: { name: MetricCard['icon']; color: string }) => {
  const common = {
    className: 'w-4 h-4 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    style: { color },
  };

  switch (name) {
    case 'money':
      return (
        <svg {...common}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'usd':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <line x1="12" y1="6" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="18" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...common}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'empty':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case 'draft':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    case 'skus':
      return (
        <svg {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    default:
      return null;
  }
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function InventoryMetricsBar({
  items,
  rates,
  isService = false,
  lowStockThreshold = 2,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onFilterChange,
}: InventoryMetricsBarProps) {

  // ------------------------------------------------------------
  // CÁLCULO DE MÉTRICAS (memoizado)
  // ------------------------------------------------------------
  const metrics = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const safeUsd = Number(rates?.USD || 0);

    let totalValueVes = 0;
    let totalValueUsd = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let onSaleCount = 0;
    let draftCount = 0;

    for (const item of safeItems) {
      // Precio USD (raíz o attributes)
      const priceUsd = Number(
        item?.prices?.USD ??
        item?.attributes?.prices?.USD ??
        item?.usdReference ??
        0
      );

      // Precio VES: si hay USD, recalcular con la tasa actual; si no, usar el que venga
      const priceVes = priceUsd > 0 && safeUsd > 0
        ? priceUsd * safeUsd
        : Number(item?.prices?.VES ?? item?.price ?? 0);

      // Cantidad: stock para productos, maxCapacity para servicios
      const qty = isService
        ? Number(item?.maxCapacity ?? item?.attributes?.maxCapacity ?? 0)
        : Number(item?.stock ?? item?.attributes?.stock ?? 0);

      totalValueVes += priceVes * qty;
      totalValueUsd += priceUsd * qty;
      totalUnits += qty;

      // Stock bajo / agotado
      if (qty === 0) {
        outOfStockCount += 1;
      } else if (qty <= lowStockThreshold) {
        lowStockCount += 1;
      }

      // En oferta
      if (item?.onSale === true) {
        onSaleCount += 1;
      }

      // Borrador
      const status = item?.status || '';
      if (status !== 'published' && status !== 'Publicado') {
        draftCount += 1;
      }
    }

    return {
      totalValueVes,
      totalValueUsd,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      onSaleCount,
      draftCount,
      skusCount: safeItems.length,
    };
  }, [items, rates?.USD, isService, lowStockThreshold]);

  // ------------------------------------------------------------
  // CONSTRUCCIÓN DE TARJETAS
  // ------------------------------------------------------------
  const cards: MetricCard[] = useMemo(() => {
    const base: MetricCard[] = [
      {
        id: 'value-ves',
        label: isService ? 'Valor potencial' : 'Valor inventario',
        value: `Bs. ${formatBs(metrics.totalValueVes)}`,
        subValue: `$${formatUsd(metrics.totalValueUsd)}`,
        icon: 'money',
        color: 'primary',
      },
      {
        id: 'units',
        label: isService ? 'Cupos totales' : 'Unidades',
        value: formatInt(metrics.totalUnits),
        icon: 'box',
        color: 'blue',
      },
      {
        id: 'low-stock',
        label: isService ? 'Cupos limitados' : 'Stock bajo',
        value: formatInt(metrics.lowStockCount),
        subValue: `≤ ${lowStockThreshold}`,
        icon: 'warning',
        color: 'amber',
        filterKey: 'low-stock',
      },
      {
        id: 'out-of-stock',
        label: isService ? 'Sin cupos' : 'Agotados',
        value: formatInt(metrics.outOfStockCount),
        icon: 'empty',
        color: 'red',
        filterKey: 'out-of-stock',
      },
      {
        id: 'on-sale',
        label: 'En oferta',
        value: formatInt(metrics.onSaleCount),
        icon: 'tag',
        color: 'green',
        filterKey: 'on-sale',
      },
      {
        id: 'drafts',
        label: 'Borradores',
        value: formatInt(metrics.draftCount),
        icon: 'draft',
        color: 'slate',
        filterKey: 'drafts',
      },
      {
        id: 'skus',
        label: isService ? 'Servicios' : 'Articulos',
        value: formatInt(metrics.skusCount),
        icon: 'skus',
        color: 'primary',
      },
    ];

    return base;
  }, [metrics, isService, lowStockThreshold]);

  // ------------------------------------------------------------
  // COLORES ADAPTATIVOS POR TIPO DE TARJETA
  // ------------------------------------------------------------
  const getCardColors = (color: MetricCard['color']) => {
    const palette: Record<MetricCard['color'], { accent: string; bg: string; border: string }> = {
      primary: {
        accent: primary,
        bg: isDarkBg ? `${primary}15` : `${primary}0A`,
        border: isDarkBg ? `${primary}30` : `${primary}20`,
      },
      green: {
        accent: isDarkBg ? '#4ade80' : '#15803d',
        bg: isDarkBg ? 'rgba(74, 222, 128, 0.08)' : 'rgba(21, 128, 61, 0.05)',
        border: isDarkBg ? 'rgba(74, 222, 128, 0.2)' : 'rgba(21, 128, 61, 0.15)',
      },
      red: {
        accent: isDarkBg ? '#f87171' : '#dc2626',
        bg: isDarkBg ? 'rgba(248, 113, 113, 0.08)' : 'rgba(220, 38, 38, 0.05)',
        border: isDarkBg ? 'rgba(248, 113, 113, 0.2)' : 'rgba(220, 38, 38, 0.15)',
      },
      amber: {
        accent: isDarkBg ? '#fbbf24' : '#d97706',
        bg: isDarkBg ? 'rgba(251, 191, 36, 0.08)' : 'rgba(217, 119, 6, 0.05)',
        border: isDarkBg ? 'rgba(251, 191, 36, 0.2)' : 'rgba(217, 119, 6, 0.15)',
      },
      blue: {
        accent: isDarkBg ? '#60a5fa' : '#2563eb',
        bg: isDarkBg ? 'rgba(96, 165, 250, 0.08)' : 'rgba(37, 99, 235, 0.05)',
        border: isDarkBg ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.15)',
      },
      slate: {
        accent: isDarkBg ? '#94a3b8' : '#475569',
        bg: isDarkBg ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.05)',
        border: isDarkBg ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.15)',
      },
    };

    return palette[color];
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  return (
    <div className="w-full space-y-2">
      {/* Título */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3
          className="text-[11px] font-bold uppercase tracking-wider opacity-70"
          style={{ color: textColor }}
        >
          Resumen del inventario
        </h3>
        {onFilterChange && (
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className="text-[10px] opacity-50 hover:opacity-100 transition underline"
            style={{ color: textColor }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {cards.map((card) => {
          const colors = getCardColors(card.color);
          const isClickable = Boolean(onFilterChange && card.filterKey);

          return (
            <button
              key={card.id}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (isClickable && card.filterKey && onFilterChange) {
                  onFilterChange(card.filterKey);
                }
              }}
              className={`
                relative text-left rounded-xl border p-2.5 transition-all
                ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}
              `}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
              }}
              title={isClickable ? `Filtrar por: ${card.label}` : card.label}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <Icon name={card.icon} color={colors.accent} />
                {card.subValue && (
                  <span
                    className="text-[9px] font-medium opacity-60"
                    style={{ color: textColor }}
                  >
                    {card.subValue}
                  </span>
                )}
              </div>

              <div
                className="text-[13px] sm:text-sm font-extrabold tracking-tight truncate"
                style={{ color: colors.accent }}
              >
                {card.value}
              </div>

              <div
                className="text-[9px] sm:text-[10px] font-medium opacity-70 truncate mt-0.5"
                style={{ color: textColor }}
              >
                {card.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}