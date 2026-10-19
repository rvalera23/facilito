'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import ServiceActionsCell from './ServiceActionsCell';
import ServiceEditModal from './ServiceEditModal';
import ServiceInventoryHeader from './table/ServiceInventoryHeader';
import { useInventoryTable } from './hooks/useInventoryTable';
import ItemInventoryPagination from './table/ItemInventoryPagination';
import TrashManager from './TrashManager';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { getFirstImage } from '@/lib/imageUtils';
import { useToast } from '@/components/ui/useToast';

interface ServiceInventoryTableProps {
  items: any[];
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  handleRemoveItem: (id: string) => void;
  handleEditItem?: (item: any) => void;
  handleTogglePublish?: (itemOrIds: any) => void;
  handleSendToTrash?: (ids: string[]) => void;
  handleViewItem?: (item: any) => void;
  onUpdateItem?: (updatedItem: any) => void;
  setNewItem?: React.Dispatch<React.SetStateAction<any>> | ((item: any) => void);
  onRestoreItem?: (item: any) => void;
  onDeletePermanently?: (item: any) => void;
  onEmptyTrash?: () => void;
  trashItemsCount?: number;
  lowStockThreshold?: number;
}

// 🔥 CONFIGURACIÓN DE COLUMNAS PARA SERVICIOS (SIN IVA)
const AVAILABLE_COLUMNS = [
  { id: 'select', label: 'Seleccionar', defaultVisible: true, width: 50, fixed: true },
  { id: 'image', label: 'Imagen', defaultVisible: true, width: 70, fixed: true },
  { id: 'name', label: 'Nombre', defaultVisible: true, width: 220 },
  { id: 'itemId', label: 'ID / SKU', defaultVisible: true, width: 95 },
  { id: 'category', label: 'Categoría', defaultVisible: true, width: 120 },
  { id: 'status', label: 'Estado', defaultVisible: true, width: 95 },
    { id: 'channels', label: 'Canales', defaultVisible: true, width: 80 },
  { id: 'price', label: 'Precio', defaultVisible: true, width: 90 },
  { id: 'onSale', label: 'Oferta', defaultVisible: true, width: 80 },
  { id: 'duration', label: 'Duración', defaultVisible: true, width: 100 },
  { id: 'availability', label: 'Cupos', defaultVisible: true, width: 85 },
  { id: 'actions', label: 'Acciones', defaultVisible: true, width: 120, fixed: true },
];

// 🔥 FUNCIÓN PARA CALCULAR PRECIO DE SERVICIO (SIN IVA)
const calculateServicePrice = (item: any, exchangeRate: number) => {
  let priceVes = 0;
  let priceUsd = 0;

  // 🔥 PRIORIDAD 1: USD × tasa actual (el USD es el ancla)
  if (item?.prices?.USD && Number(item.prices.USD) > 0) {
    priceUsd = Number(item.prices.USD);
  } else if (item?.priceUsd && Number(item.priceUsd) > 0) {
    priceUsd = Number(item.priceUsd);
  } else if (item?.attributes?.prices?.USD && Number(item.attributes.prices.USD) > 0) {
    priceUsd = Number(item.attributes.prices.USD);
  }

  if (priceUsd > 0 && exchangeRate > 0) {
    priceVes = Number((priceUsd * exchangeRate).toFixed(2));
  }

  // 🔴 FALLBACK: VES explícito (solo si no hay USD)
  if (priceVes === 0) {
    if (item?.prices?.VES && Number(item.prices.VES) > 0) {
      priceVes = Number(item.prices.VES);
    } else if (item?.priceVes && Number(item.priceVes) > 0) {
      priceVes = Number(item.priceVes);
    } else if (item?.attributes?.prices?.VES && Number(item.attributes.prices.VES) > 0) {
      priceVes = Number(item.attributes.prices.VES);
    }

    // Si encontramos VES, calcular USD
    if (priceVes > 0 && priceUsd === 0 && exchangeRate > 0) {
      priceUsd = Number((priceVes / exchangeRate).toFixed(2));
    }
  }

  // 5. Si no hay ni VES ni USD, intentar con 'price' simple
  if (priceVes === 0 && priceUsd === 0) {
    const simplePrice = Number(item?.price || 0);
    if (simplePrice > 0) {
      const hasExplicitUsd = !!(item?.priceUsd || item?.prices?.USD || item?.attributes?.prices?.USD);
      if (hasExplicitUsd && simplePrice < 1000 && exchangeRate > 0) {
        priceUsd = simplePrice;
        priceVes = Number((simplePrice * exchangeRate).toFixed(2));
      } else if (!hasExplicitUsd && simplePrice < 1000) {
        priceVes = simplePrice;
        priceUsd = exchangeRate > 0 ? Number((simplePrice / exchangeRate).toFixed(2)) : 0;
      } else if (simplePrice > 1000) {
        priceVes = simplePrice;
        priceUsd = exchangeRate > 0 ? Number((simplePrice / exchangeRate).toFixed(2)) : 0;
      } else if (exchangeRate > 0) {
        priceUsd = simplePrice;
        priceVes = Number((simplePrice * exchangeRate).toFixed(2));
      } else {
        priceVes = simplePrice;
      }
    }
  }

  // 6. Asegurar que priceVes nunca sea 0 si hay USD
  if (priceUsd > 0 && priceVes === 0 && exchangeRate > 0) {
    priceVes = Number((priceUsd * exchangeRate).toFixed(2));
  }

  // 🔥 SERVICIOS NO TIENEN IVA - retornamos solo precios
  return {
    priceVes: Math.round(priceVes * 100) / 100,
    priceUsd: Math.round(priceUsd * 100) / 100,
  };
};

// 🔥 COMPONENTE DE FILA MEMOIZADO
const ServiceRow = memo(({
  item,
  index,
  selectedIds,
  handleSelectOne,
  setEditingProduct,
  externalHandleEditItem,
  handleTogglePublish,
  handleRemoveItem,
  handleViewItem,
  isDarkBg,
  textColor,
  primary,
  secondary,
  subtleBorderColor,
  formatVESPrice,
  getInternalId,
  getProductCode,
  enrichItemWithPrices,
  formatDuration,
  exchangeRate,
  visibleColumns,
  columnWidths,
  lowStockThresholdValue,
}: any) => {
  const imgUrl = getFirstImage(item);
  const uniqueId = getProductCode(item);
  const internalSysId = getInternalId(item);
  const internalId = internalSysId || index.toString();
  const isSelected = selectedIds.includes(internalId);
  const isPublished = item.status === 'published' || item.isActive === true || item.isActive === 't' || item.isActive === '1' || item.isPublished === true;

  const statusBadgeClass = isPublished
    ? isDarkBg ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : isDarkBg ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300';

  const availableSlots = Number(item.maxCapacity ?? item.attributes?.maxCapacity ?? 0);
  const isLowAvailability = availableSlots <= 2 && availableSlots > 0;
  const isNoAvailability = availableSlots === 0;
  
  // 🔥 Color del número según disponibilidad (igual que en Producto)
  let numberColor = textColor;
  if (isNoAvailability) {
    numberColor = isDarkBg ? '#f87171' : '#dc2626';
  } else if (isLowAvailability) {
    numberColor = isDarkBg ? '#fbbf24' : '#d97706';
  } else if (availableSlots > 100) {
    numberColor = isDarkBg ? '#4ade80' : '#15803d';
  }

  const availabilityBadgeClass = isNoAvailability
    ? isDarkBg ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-800 border border-red-300'
    : isLowAvailability
    ? isDarkBg ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
    : isDarkBg ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300';

  // 🔥 Calcular precios SIN IVA
  const priceInfo = calculateServicePrice(item, exchangeRate);

  return (
    <tr
      className={`hover:bg-white/5 ${isSelected ? 'bg-white/10' : ''}`}
      style={{ borderBottom: `1px solid ${subtleBorderColor}` }}
    >
      {/* SELECT */}
      {visibleColumns.has('select') && (
        <td className="py-3 px-3 truncate" style={{ width: columnWidths.select }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectOne(internalId)}
            className="rounded cursor-pointer accent-current"
          />
        </td>
      )}

      {/* IMAGEN */}
      {visibleColumns.has('image') && (
        <td className="py-3 px-3 truncate" style={{ width: columnWidths.image }}>
          <div className="w-10 h-10 rounded-xl bg-black/40 border overflow-hidden flex items-center justify-center shrink-0" style={{ borderColor: subtleBorderColor }}>
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                width="40"
                height="40"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('span');
                    fallback.className = 'text-[9px] opacity-40';
                    fallback.textContent = 'Sin foto';
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <span className="text-[9px] opacity-40">Sin foto</span>
            )}
          </div>
        </td>
      )}

      {/* NOMBRE */}
      {visibleColumns.has('name') && (
        <td className="py-3 px-3 font-bold tracking-tight truncate" style={{ width: columnWidths.name }}>
          <div
            className="truncate cursor-pointer hover:underline"
            onClick={() => {
              handleViewItem?.(item);
            }}
          >
            {item.name || 'Servicio sin nombre'}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-normal truncate mt-0.5" style={{ color: primary }}>
            {item.brand && <span>{item.brand}</span>}
            {item.brand && item.category && <span>•</span>}
            {item.category && <span className="opacity-80">{item.category}</span>}
          </div>
        </td>
      )}

      {/* ID / SKU */}
      {visibleColumns.has('itemId') && (
        <td className="py-3 px-3 truncate" style={{ width: columnWidths.itemId }}>
          <div className="font-mono font-bold truncate" style={{ color: textColor }}>
            {uniqueId || <span className="opacity-40 font-normal">Sin ID</span>}
          </div>
        </td>
      )}

      {/* CATEGORÍA */}
      {visibleColumns.has('category') && (
<td className="py-3 px-3 min-w-[140px] max-w-[200px] text-center" style={{ width: columnWidths.category }}>
            <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border inline-block max-w-full whitespace-normal break-words"
            style={{
              borderColor: subtleBorderColor,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
            }}
          >
            {item.category || 'General'}
          </span>
        </td>
      )}

      {/* ESTADO */}
      {visibleColumns.has('status') && (
<td className="py-3 px-3 truncate text-center" style={{ width: columnWidths.status }}>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
            {isPublished ? 'Publicado' : 'Borrador'}
          </span>
        </td>
      )}

            {/* CANALES */}
      {visibleColumns.has('channels') && (
        <td className="py-3 px-3 text-center align-middle" style={{ width: columnWidths.channels }}>
          <div className="flex items-center justify-center gap-1.5">
            <span
              title={item?.availableKiosk === false ? 'No disponible en kiosco' : 'Disponible en kiosco'}
              className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
              style={{
                borderColor: item?.availableKiosk === false
                  ? (isDarkBg ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)')
                  : primary,
                backgroundColor: item?.availableKiosk === false ? 'transparent' : `${primary}20`,
                color: item?.availableKiosk === false ? (isDarkBg ? '#94a3b8' : '#64748b') : primary,
                minWidth: '26px',
              }}
            >
              K
            </span>
            <span
              title={item?.availableOnline === false ? 'No disponible en tienda online' : 'Disponible en tienda online'}
              className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
              style={{
                borderColor: item?.availableOnline === false
                  ? (isDarkBg ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)')
                  : primary,
                backgroundColor: item?.availableOnline === false ? 'transparent' : `${primary}20`,
                color: item?.availableOnline === false ? (isDarkBg ? '#94a3b8' : '#64748b') : primary,
                minWidth: '26px',
              }}
            >
              W
            </span>
          </div>
        </td>
      )}

      {/* PRECIO - CON SOPORTE DE DESCUENTO */}
      {visibleColumns.has('price') && (() => {
        const onSale = item?.onSale === true;
        const discountPct = Math.min(100, Math.max(0, Number(item?.discountPercentage || 0)));
        const hasDiscount = onSale && discountPct > 0;

        const finalVes = hasDiscount
          ? priceInfo.priceVes * (1 - discountPct / 100)
          : priceInfo.priceVes;
        const finalUsd = hasDiscount
          ? priceInfo.priceUsd * (1 - discountPct / 100)
          : priceInfo.priceUsd;

        return (
          <td className="py-3 px-3 truncate" style={{ width: columnWidths.price }}>
            {hasDiscount ? (
              <>
                <div className="line-through opacity-50 text-[11px]" style={{ color: textColor }}>
                  Bs. {formatVESPrice(priceInfo.priceVes)}
                </div>
                <div className="font-extrabold" style={{ color: primary }}>
                  Bs. {formatVESPrice(finalVes)}
                </div>
                <div className="text-[10px] font-semibold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                  {exchangeRate > 0 ? `($${Number(finalUsd || 0).toFixed(2)})` : '(USD no disponible)'}
                </div>
              </>
            ) : (
              <>
                <div className="font-extrabold" style={{ color: primary }}>
                  Bs. {formatVESPrice(priceInfo.priceVes)}
                </div>
                <div className="text-[10px] font-semibold" style={{ color: isDarkBg ? '#86efac' : '#166534' }}>
                  {exchangeRate > 0 ? `($${Number(priceInfo.priceUsd || 0).toFixed(2)})` : '(USD no disponible)'}
                </div>
              </>
            )}
          </td>
        );
      })()}

            {/* OFERTA - BADGE CON PORCENTAJE */}
      {visibleColumns.has('onSale') && (() => {
        const onSale = item?.onSale === true;
        const discountPct = Math.min(100, Math.max(0, Number(item?.discountPercentage || 0)));
        const hasDiscount = onSale && discountPct > 0;

        return (
          <td className="py-3 px-3 text-center align-middle" style={{ width: columnWidths.onSale }}>
            {hasDiscount ? (
              <span
                className="inline-flex items-center gap-1 font-semibold"
                style={{ color: textColor, fontSize: '11px' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 shrink-0"
                  style={{ color: '#f97316' }}
                >
                  <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z" />
                  <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                </svg>
                {discountPct}% OFF
              </span>
            ) : (
              <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                —
              </span>
            )}
          </td>
        );
      })()}



      {/* DURACIÓN */}
      {visibleColumns.has('duration') && (
        <td className="py-3 px-3 truncate text-center" style={{ width: columnWidths.duration }}>
          <span className="px-2 py-1 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1" style={{ borderColor: subtleBorderColor }}>
            ⏱ {formatDuration(item.durationMinutes || 60)}
          </span>
        </td>
      )}

{/* CUPOS - CON BARRA VISUAL + MINSTOCK */}
{visibleColumns.has('availability') && (
  <td className="py-3 px-3 text-center align-middle" style={{ width: columnWidths.availability }}>
    {(() => {
      const availableSlots = Number(item.maxCapacity ?? item.attributes?.maxCapacity ?? 0);
      const minStock = Number(
        item.minStock ??
        item.attributes?.minStock ??
        lowStockThresholdValue ??
        2
      );

      let numberColor = textColor;
      if (availableSlots === 0) {
        numberColor = isDarkBg ? '#f87171' : '#dc2626';
      } else if (availableSlots <= minStock) {
        numberColor = isDarkBg ? '#fbbf24' : '#d97706';
      } else if (availableSlots > minStock * 10) {
        numberColor = isDarkBg ? '#4ade80' : '#15803d';
      }

      const maxForBar = Math.max(minStock * 2, availableSlots, 1);
      const ratio = Math.min(1, availableSlots / maxForBar);

      let barColor = '#10b981';
      if (availableSlots === 0) {
        barColor = '#ef4444';
      } else if (availableSlots <= minStock) {
        barColor = '#f59e0b';
      }

      return (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 shrink-0 opacity-50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: textColor }}
            >
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs font-bold" style={{ color: numberColor }}>
              {availableSlots === 0 ? 'Sin cupos' : availableSlots}
            </span>
          </div>

          <span
            className="text-[9px] font-medium opacity-60"
            style={{ color: textColor }}
          >
            min {minStock}
          </span>

          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{
              backgroundColor: isDarkBg
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${ratio * 100}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        </div>
      );
    })()}
  </td>
)}

      {/* ACCIONES */}
      {visibleColumns.has('actions') && (
        <td className="py-3 px-3 text-right truncate" style={{ width: columnWidths.actions }}>
          <ServiceActionsCell
            item={item}
            textColor={textColor}
            isDarkBg={isDarkBg}
            borderDynamic={subtleBorderColor}
            onPreview={(targetItem) => {
              const itemToUse = targetItem?.name ? targetItem : item;
              handleViewItem?.(itemToUse);
            }}
            onEdit={(targetItem) => {
              const enrichedItem = enrichItemWithPrices(targetItem);
              const professionalIds =
                enrichedItem.professionals ||
                enrichedItem.attributes?.professionals ||
                enrichedItem.attributes?.professionalIds ||
                [];
              const itemWithProfessionalIds = {
                ...enrichedItem,
                professionalIds: professionalIds,
              };
              setEditingProduct(itemWithProfessionalIds);
              externalHandleEditItem?.(itemWithProfessionalIds);
            }}
            onTogglePublish={handleTogglePublish}
            onDelete={(targetItem) => handleRemoveItem(getInternalId(targetItem) || internalId)}
          />
        </td>
      )}
    </tr>
  );
});

ServiceRow.displayName = 'ServiceRow';

// 🔥 COMPONENTE PRINCIPAL
export default function ServiceInventoryTable({
  items,
  primary,
  secondary,
  textColor,
  isDarkBg,
  handleRemoveItem,
  handleEditItem: externalHandleEditItem,
  handleTogglePublish: externalHandleTogglePublish,
  handleSendToTrash,
  handleViewItem,
  onUpdateItem,
  setNewItem,
  onRestoreItem,
  onDeletePermanently,
  onEmptyTrash,
  trashItemsCount = 0,
  lowStockThreshold = 2,
}: ServiceInventoryTableProps) {

  const { rates, loading: ratesLoading } = useExchangeRateContext();
  const exchangeRate = rates?.USD || 0;

  const { showToast } = useToast();

  // 🔥 Umbral de cupos limitados (default 2)
  const lowStockThresholdValue = lowStockThreshold ?? 2;

  // 🔥 ESTADO PARA COLUMNAS VISIBLES
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const defaultVisible = new Set(
      AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
    );
    return defaultVisible;
  });

  // 🔥 ESTADO PARA EL SELECTOR DE COLUMNAS
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔥 ENRIQUECER ITEMS - Servicios NO tienen IVA
  const enrichedItems = useMemo(() => {
    return items.map((item: any) => ({
      ...item,
      ivaType: 'exempt',
      ivaRate: 0,
    }));
  }, [items]);

  const {
    localItems,
    filteredAndSortedItems,
    paginatedItems,
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedIds,
    setSelectedIds,
    totalPages,
    toggleSort,
    handleTogglePublish,
    handleUpdateItem,
    getItemImage: legacyGetItemImage,
    formatVESPrice,
    getInternalId,
    getProductCode
  } = useInventoryTable(
    enrichedItems,
    externalHandleTogglePublish,
    onUpdateItem,
    exchangeRate,
    rates.EUR,
    'services'
  );

  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // 🔥 ANCHOS DE COLUMNAS
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() => {
    const widths: { [key: string]: number } = {};
    AVAILABLE_COLUMNS.forEach(col => {
      widths[col.id] = col.width;
    });
    return widths;
  });

  const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent, field: string) => {
    e.preventDefault();
    resizingRef.current = { field, startX: e.clientX, startWidth: columnWidths[field] || 100 };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(60, resizingRef.current.startWidth + delta);
      setColumnWidths(prev => ({ ...prev, [resizingRef.current!.field]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      resizingRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredAndSortedItems.map(i => getInternalId(i)) : []);
  }, [filteredAndSortedItems, getInternalId, setSelectedIds]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, [setSelectedIds]);

    // 🔥 EXPORTAR CSV - respeta filtros y búsqueda activos
  const handleExportCSV = useCallback(() => {
    const itemsToExport = filteredAndSortedItems;

    if (!itemsToExport || itemsToExport.length === 0) {
      showToast({
        variant: 'info',
        message: 'No hay servicios para exportar con los filtros actuales.',
      });
      return;
    }

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'ID',
      'Nombre',
      'Categoría',
      'Marca',
      'Cupos Máximos',
      'MinStock',
      'Duración (min)',
      'Precio VES',
      'Precio USD',
      'Modalidad',
      'Anticipación (min)',
      'Estado',
      'En Oferta',
      'Descuento %',
      'SKU',
    ];

    const rows = itemsToExport.map((item: any) => {
      const prices = item?.prices || item?.attributes?.prices || {};
      const priceVes = Number(prices?.VES ?? item?.price ?? 0);
      const priceUsd = Number(prices?.USD ?? 0);
      const cupos = Number(item?.maxCapacity ?? item?.attributes?.maxCapacity ?? 0);
      const minStockNum = Number(
        item?.minStock ?? item?.attributes?.minStock ?? lowStockThresholdValue ?? 2
      );
      const duration = Number(item?.durationMinutes ?? item?.attributes?.durationMinutes ?? 60);
      const status = item?.status === 'published' ? 'Publicado' : 'Borrador';
      const sku =
        item?.itemId ||
        item?.sku ||
        item?.code ||
        item?.attributes?.sku ||
        '';
      const modality = item?.serviceModality || item?.attributes?.serviceModality || '';
      const minAdvance = Number(
        item?.minAdvanceBooking ?? item?.attributes?.minAdvanceBooking ?? 0
      );

      return [
        item?.id || '',
        item?.name || '',
        item?.category || item?.attributes?.category || '',
        item?.brand || item?.attributes?.brand || '',
        cupos,
        minStockNum,
        duration,
        priceVes > 0 ? priceVes.toFixed(2) : '',
        priceUsd > 0 ? priceUsd.toFixed(2) : '',
        modality,
        minAdvance,
        status,
        item?.onSale ? 'Sí' : 'No',
        Number(item?.discountPercentage ?? item?.attributes?.discountPercentage ?? 0),
        sku,
      ].map(escapeCSV);
    });

    const BOM = '\uFEFF';
    const csvContent =
      BOM +
      [headers.map(escapeCSV).join(','), ...rows.map(r => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;

    link.href = url;
    link.download = `servicios_${dateStr}_${timeStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`✅ [ExportCSV] ${itemsToExport.length} servicios exportados`);
  }, [filteredAndSortedItems, lowStockThresholdValue, showToast]);

  // 🔥 ACCIONES EN LOTE
  const handleBulkAction = useCallback((action: 'publish' | 'unpublish' | 'delete' | 'trash') => {
    if (selectedIds.length === 0) {
      showToast({
        variant: 'warning',
        message: 'No hay elementos seleccionados.',
      });
      return;
    }

    const confirmAction = window.confirm(
      `¿Estás seguro de que quieres ${action === 'publish' ? 'publicar' : action === 'unpublish' ? 'ocultar' : action === 'trash' ? 'mover a la papelera' : 'eliminar'} ${selectedIds.length} elemento(s)?`
    );

    if (!confirmAction) return;

    if (action === 'publish' || action === 'unpublish') {
      const isPublishing = action === 'publish';
      selectedIds.forEach(id => {
        const item = filteredAndSortedItems.find(i => getInternalId(i) === id);
        if (item) {
          const updatedItem = {
            ...item,
            status: isPublishing ? 'published' : 'draft',
            isActive: isPublishing,
          };
          handleTogglePublish(updatedItem);
        }
      });
      setSelectedIds([]);
    } else if (action === 'trash' && handleSendToTrash) {
      handleSendToTrash(selectedIds);
      setSelectedIds([]);
    } else if (action === 'delete') {
      selectedIds.forEach(id => {
        const item = filteredAndSortedItems.find(i => getInternalId(i) === id);
        if (item) {
          handleRemoveItem(item);
        }
      });
      setSelectedIds([]);
    }
  }, [selectedIds, filteredAndSortedItems, handleTogglePublish, handleSendToTrash, handleRemoveItem, showToast]);

  // 🔥 Enriquecer item con precios para edición
  const enrichItemWithPrices = useCallback((item: any) => {
    const ves = Number(item?.prices?.VES || item?.price || item?.precioVes || 0);
    const usd = Number(item?.prices?.USD || item?.priceUsd || item?.usdPrice || 0);
    const eur = Number(item?.prices?.EUR || item?.priceEur || 0);
    const crypto = Number(item?.prices?.CRYPTO || item?.crypto || 0);

    let finalVes = ves;
    let finalUsd = usd;

    if (finalVes === 0 && finalUsd > 0 && exchangeRate > 0) {
      finalVes = Number((finalUsd * exchangeRate).toFixed(2));
    } else if (finalUsd === 0 && finalVes > 0 && exchangeRate > 0) {
      finalUsd = Number((finalVes / exchangeRate).toFixed(2));
    }

    if (finalVes === 0 && finalUsd === 0) {
      const rawPrice = Number(item?.price || 0);
      if (rawPrice > 0) {
        if (rawPrice < 1000 && exchangeRate > 0) {
          finalUsd = rawPrice;
          finalVes = Number((rawPrice * exchangeRate).toFixed(2));
        } else {
          finalVes = rawPrice;
          finalUsd = exchangeRate > 0 ? Number((rawPrice / exchangeRate).toFixed(2)) : 0;
        }
      }
    }

    let finalEur = eur;
    if (finalEur === 0 && finalUsd > 0 && exchangeRate > 0 && rates.EUR > 0) {
      const EUR_USD_RATE = rates.EUR / exchangeRate;
      finalEur = Number((finalUsd / EUR_USD_RATE).toFixed(2));
    }

    let finalCrypto = crypto;
    if (finalCrypto === 0 && finalUsd > 0) {
      finalCrypto = Number(finalUsd.toFixed(2));
    }

    return {
      ...item,
      prices: {
        VES: finalVes,
        USD: finalUsd,
        EUR: finalEur,
        CRYPTO: finalCrypto,
      },
      durationMinutes: item?.durationMinutes || item?.attributes?.durationMinutes || 60,
      includes: item?.includes || item?.attributes?.includes || '',
      notIncludes: item?.notIncludes || item?.attributes?.notIncludes || '',
      certifications: item?.certifications || item?.attributes?.certifications || [],
      materials: item?.materials || item?.attributes?.materials || [],
      clientRequirements: item?.clientRequirements || item?.attributes?.clientRequirements || [],
      cancellationPolicy: item?.cancellationPolicy || item?.attributes?.cancellationPolicy || '',
      brand: item?.brand || item?.attributes?.brand || '',
      category: item?.category || item?.attributes?.category || '',
      description: item?.description || item?.attributes?.description || '',
      features: Array.isArray(item?.features) ? item.features : (Array.isArray(item?.attributes?.features) ? item.attributes.features : []),
    };
  }, [exchangeRate, rates.EUR]);

  const formatDuration = useCallback((minutes: number | string) => {
    const mins = Number(minutes) || 0;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
    }
    return `${mins}min`;
  }, []);

  const containerStyle = useMemo(() => ({
    backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    borderColor: isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    color: textColor
  }), [secondary, isDarkBg, textColor]);

  const subtleBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <div className="border rounded-3xl shadow-xl p-5 space-y-4 w-full" style={containerStyle}>

      {/* CABECERA Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 gap-4">
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>Inventario de Servicios</h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            {filteredAndSortedItems.length} de {localItems.length} servicios registrados en el sistema.
            {!ratesLoading && rates.USD > 0 && rates.EUR > 0 && (
              <span className="ml-2 text-[10px] opacity-50">
                USD: {rates.USD} | EUR: {rates.EUR}
              </span>
            )}
            {ratesLoading && (
              <span className="ml-2 text-[10px] opacity-50 animate-pulse">
                Cargando tasas...
              </span>
            )}
            {!ratesLoading && rates.USD === 0 && (
              <span className="ml-2 text-[10px] text-yellow-500">
                ⚠️ Tasa no disponible
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* PAPELERA */}
          <TrashManager
            primary={primary}
            secondary={secondary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            onRestoreItem={onRestoreItem ? async item => { await onRestoreItem(item); } : undefined}
            onDeletePermanently={onDeletePermanently ? async item => { await onDeletePermanently(item); } : undefined}
            onEmptyTrash={onEmptyTrash ? async () => { await onEmptyTrash(); } : undefined}
          />

          {/* EXPORTAR CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredAndSortedItems.length === 0}
            className="px-3 py-2 rounded-xl border text-xs font-medium transition hover:opacity-70 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ borderColor: subtleBorderColor, color: textColor }}
            title={`Exportar ${filteredAndSortedItems.length} servicios a CSV`}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
            {filteredAndSortedItems.length > 0 && (
              <span className="text-[9px] opacity-50">
                ({filteredAndSortedItems.length})
              </span>
            )}
          </button>

          {/* SELECTOR DE COLUMNAS */}
          <div className="relative" ref={columnSelectorRef}>
            <button
              type="button"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="px-3 py-2 rounded-xl border text-xs font-medium transition hover:opacity-70 flex items-center gap-1.5"
              style={{ borderColor: subtleBorderColor, color: textColor }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Columnas
              <span className="text-[9px] opacity-50">
                ({Array.from(visibleColumns).filter(id => id !== 'select' && id !== 'actions').length})
              </span>
            </button>

            {showColumnSelector && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl border shadow-2xl p-2 max-h-64 overflow-y-auto"
                style={{
                  backgroundColor: secondary || (isDarkBg ? '#1e293b' : '#ffffff'),
                  borderColor: subtleBorderColor,
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 px-2 py-1.5 border-b" style={{ borderColor: subtleBorderColor }}>
                  Seleccionar columnas
                </div>
                {AVAILABLE_COLUMNS.filter(col => !col.fixed).map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.id)}
                      onChange={() => {
                        const newVisible = new Set(visibleColumns);
                        if (newVisible.has(col.id)) {
                          newVisible.delete(col.id);
                        } else {
                          newVisible.add(col.id);
                        }
                        setVisibleColumns(newVisible);
                      }}
                      className="rounded accent-current"
                    />
                    <span style={{ color: textColor }}>{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ACCIONES EN LOTE */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 flex-wrap">
              <span className="text-[10px] font-bold">{selectedIds.length} seleccionados</span>
              <button
                type="button"
                onClick={() => handleBulkAction('publish')}
                className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition text-xs cursor-pointer"
                title="Publicar seleccionados"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('unpublish')}
                className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition text-xs cursor-pointer"
                title="Ocultar seleccionados"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
              {handleSendToTrash && (
                <button
                  type="button"
                  onClick={() => handleBulkAction('trash')}
                  className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition text-xs cursor-pointer"
                  title="Mover a papelera"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition text-xs cursor-pointer"
                title="Limpiar selección"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar servicio por ID, nombre..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
              style={{ borderColor: subtleBorderColor, color: textColor }}
            />
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto rounded-2xl border pb-1" style={{ borderColor: subtleBorderColor }}>
        <table className="w-full text-left border-collapse" style={{ minWidth: '1050px', tableLayout: 'fixed' }}>
          <ServiceInventoryHeader
            columnWidths={columnWidths}
            startResize={startResize}
            toggleSort={toggleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSelectAll={handleSelectAll}
            isAllSelected={filteredAndSortedItems.length > 0 && selectedIds.length === filteredAndSortedItems.length}
            isDarkBg={isDarkBg}
            subtleBorderColor={subtleBorderColor}
            visibleColumns={visibleColumns}
            availableColumns={AVAILABLE_COLUMNS}
          />

          <tbody className="text-xs" style={{ borderColor: subtleBorderColor }}>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => (
                <ServiceRow
                  key={getInternalId(item) || index}
                  item={item}
                  index={index}
                  selectedIds={selectedIds}
                  handleSelectOne={handleSelectOne}
                  setEditingProduct={setEditingProduct}
                  externalHandleEditItem={externalHandleEditItem}
                  handleTogglePublish={handleTogglePublish}
                  handleRemoveItem={handleRemoveItem}
                  handleViewItem={handleViewItem}
                  isDarkBg={isDarkBg}
                  textColor={textColor}
                  primary={primary}
                  secondary={secondary}
                  subtleBorderColor={subtleBorderColor}
                  formatVESPrice={formatVESPrice}
                  getInternalId={getInternalId}
                  getProductCode={getProductCode}
                  enrichItemWithPrices={enrichItemWithPrices}
                  formatDuration={formatDuration}
                  exchangeRate={exchangeRate}
                  visibleColumns={visibleColumns}
                  columnWidths={columnWidths}
                  lowStockThresholdValue={lowStockThresholdValue}
                />
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.size} className="py-8 text-center opacity-60">
                  No se encontraron servicios registrados en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <ItemInventoryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
        filteredCount={filteredAndSortedItems.length}
        totalCount={localItems.length}
        searchTerm={searchTerm}
        isDarkBg={isDarkBg}
        textColor={textColor}
        subtleBorderColor={subtleBorderColor}
        primary={primary}
      />

      {/* EDIT MODAL */}
      <ServiceEditModal
        key={editingProduct?.id || editingProduct?.itemId || 'new-service'}
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={async (formData) => {
          try {
            const realUuid = editingProduct?.id;
            if (!realUuid) {
              console.error("No se encontró el UUID del servicio");
              showToast({
                variant: 'error',
                message: 'Error: No se encontró el ID único del servicio.',
              });
              return;
            }

            await handleUpdateItem(realUuid, formData);
            setEditingProduct(null);
            showToast({
              variant: 'success',
              message: 'Servicio actualizado correctamente.',
            });
          } catch (error) {
            console.error('Error al actualizar:', error);
            showToast({
              variant: 'error',
              message: 'Error de red al intentar guardar los cambios.',
            });
          }
        }}
        textColor={textColor}
        isDarkBg={isDarkBg}
        secondary={secondary}
        primary={primary}
        rates={{
          USD: rates.USD,
          EUR: rates.EUR,
        }}
      />
    </div>
  );
}