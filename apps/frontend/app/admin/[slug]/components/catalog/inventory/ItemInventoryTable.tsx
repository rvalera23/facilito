'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ItemActionsCell from './ItemActionsCell';
import ItemPreviewModal from './ItemPreviewModal';
import ItemEditModal from './ItemEditModal';
import StockMovementHistoryModal from './StockMovementHistoryModal';
import { useInventoryTable } from './hooks/useInventoryTable';
import ItemInventoryHeader from './table/ItemInventoryHeader';
import ItemInventoryPagination from './table/ItemInventoryPagination';
import TrashManager from './TrashManager';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { getFirstImage } from '@/lib/imageUtils';
import { toAbsoluteApiUrl } from '@/lib/apiUrl';
import { useToast } from '@/components/ui/useToast';

interface ItemInventoryTableProps {
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

const AVAILABLE_COLUMNS = [
  { id: 'select', label: 'Seleccionar', defaultVisible: true, width: 50, fixed: true },
  { id: 'image', label: 'Imagen', defaultVisible: true, width: 70, fixed: true },
  { id: 'name', label: 'Nombre', defaultVisible: true, width: 250 },
  { id: 'itemId', label: 'Codigo ID', defaultVisible: true, width: 100 },
  { id: 'category', label: 'Categoría', defaultVisible: false, width: 110 },
  { id: 'status', label: 'Estado', defaultVisible: true, width: 110 },
  { id: 'channels', label: 'Canales', defaultVisible: true, width: 80 },
  { id: 'price', label: 'Precio', defaultVisible: true, width: 120 },
  { id: 'iva', label: 'IVA', defaultVisible: false, width: 100 },
  { id: 'onSale', label: 'Oferta', defaultVisible: true, width: 70 },
  { id: 'stock', label: 'Stock', defaultVisible: true, width: 90 },
  { id: 'actions', label: 'Acciones', defaultVisible: true, width: 140, fixed: true },
];

export default function ItemInventoryTable({
  items, primary, secondary, textColor, isDarkBg,
  handleRemoveItem, handleEditItem: externalHandleEditItem, handleTogglePublish: externalHandleTogglePublish,
  handleSendToTrash, onUpdateItem, setNewItem,
  onRestoreItem,
  onDeletePermanently,
  onEmptyTrash,
  trashItemsCount = 0,
  lowStockThreshold = 2,
}: ItemInventoryTableProps) {
  
  const { rates, loading: ratesLoading } = useExchangeRateContext();

  const { showToast } = useToast();

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const defaultVisible = new Set(
      AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
    );
    return defaultVisible;
  });

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

  const enrichedItems = React.useMemo(() => {
    return items.map((item: any) => {
      if (item.ivaType) {
        return item;
      }
      if (item.attributes?.ivaType) {
        return {
          ...item,
          ivaType: item.attributes.ivaType,
          ivaRate: Number(item.attributes.ivaRate || 16),
        };
      }
      return {
        ...item,
        ivaType: 'excluded',
        ivaRate: 16,
      };
    });
  }, [items]);

  const {
    localItems, filteredAndSortedItems, paginatedItems, searchTerm, setSearchTerm,
    sortField, sortDirection, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    selectedIds, setSelectedIds, previewProduct, setPreviewProduct,
    totalPages, toggleSort, handleTogglePublish,
    handleUpdateItem,
    legacyGetItemImage, formatVESPrice, getInternalId, getProductCode
  } = useInventoryTable(enrichedItems, externalHandleTogglePublish, onUpdateItem, rates.USD, 'products');

  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // 🔥 EDICIÓN INLINE DE STOCK
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');
  const [savingStock, setSavingStock] = useState<boolean>(false);

  // 🔥 HISTORIAL DE MOVIMIENTOS
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);

  // FUNCIONES DE CÁLCULO (definidas una sola vez)
  const getIvaBadge = useCallback((item: any) => {
    const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
    
    const badges: Record<string, { label: string; color: string }> = {
      'included': {
        label: `IVA ${ivaRate}% Inc.`,
        color: '#8b5cf6',
      },
      'excluded': {
        label: `IVA ${ivaRate}% +`,
        color: '#f59e0b',
      },
      'exempt': {
        label: 'Exento',
        color: '#64748b',
      }
    };

    return badges[ivaType] || badges['excluded'];
  }, []);

  const calculatePriceWithIVA = useCallback((item: any) => {
    const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
    
    let rawPrice = 0;
    
    // 🔥 PRIORIDAD 1: USD × tasa actual (el VES es el ancla y se recalcula)
    // El USD es el precio REAL, y el VES se recalcula con la tasa del día.
    let usdPrice = 0;
    if (item.priceUsd && Number(item.priceUsd) > 0) {
      usdPrice = Number(item.priceUsd);
    } else if (item.prices?.USD && Number(item.prices.USD) > 0) {
      usdPrice = Number(item.prices.USD);
    } else if (item.attributes?.prices?.USD && Number(item.attributes.prices.USD) > 0) {
      usdPrice = Number(item.attributes.prices.USD);
    }
    if (usdPrice > 0 && rates.USD > 0) {
      rawPrice = Number((usdPrice * rates.USD).toFixed(2));
    }
    
    // 🔴 FALLBACK: VES explícito (solo si no hay USD)
    if (rawPrice === 0) {
      if (item.priceVes && Number(item.priceVes) > 0) {
        rawPrice = Number(item.priceVes);
      } else if (item.prices?.VES && Number(item.prices.VES) > 0) {
        rawPrice = Number(item.prices.VES);
      } else if (item.attributes?.prices?.VES && Number(item.attributes.prices.VES) > 0) {
        rawPrice = Number(item.attributes.prices.VES);
      }
    }
    
    // 🔴 FALLBACK FINAL: precio simple
    if (rawPrice === 0) {
      const simplePrice = Number(item?.price || 0);
      if (simplePrice > 0) {
        const hasExplicitUsd = !!(item.priceUsd || item.prices?.USD || item.attributes?.prices?.USD);
        if (hasExplicitUsd && simplePrice < 1000 && rates.USD > 0) {
          rawPrice = Number((simplePrice * rates.USD).toFixed(2));
        } else if (!hasExplicitUsd && simplePrice < 1000) {
          rawPrice = simplePrice;
        } else if (simplePrice > 1000) {
          rawPrice = simplePrice;
        } else if (rates.USD > 0) {
          rawPrice = Number((simplePrice * rates.USD).toFixed(2));
        } else {
          rawPrice = simplePrice;
        }
      }
    }
    
    let basePriceVes = 0;
    let ivaAmount = 0;
    let priceWithIVA = 0;
    
    if (ivaType === 'excluded') {
      basePriceVes = rawPrice;
      ivaAmount = basePriceVes * (ivaRate / 100);
      priceWithIVA = basePriceVes + ivaAmount;
    } else if (ivaType === 'included') {
      priceWithIVA = rawPrice;
      basePriceVes = priceWithIVA / (1 + ivaRate / 100);
      ivaAmount = priceWithIVA - basePriceVes;
    } else {
      basePriceVes = rawPrice;
      ivaAmount = 0;
      priceWithIVA = basePriceVes;
    }
    
    const priceWithIVAUsd = rates.USD > 0 ? priceWithIVA / rates.USD : 0;
    
    return {
      basePriceVes: Math.round(basePriceVes * 100) / 100,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      priceWithIVA: Math.round(priceWithIVA * 100) / 100,
      priceWithIVAUsd: Math.round(priceWithIVAUsd * 100) / 100,
      ivaType,
      ivaRate,
    };
  }, [rates.USD]);

  const getDiscountedPrice = useCallback((item: any) => {
    const onSale = item?.onSale === true || item?.attributes?.onSale === true;
    let discountPercentage = Number(item?.discountPercentage || item?.attributes?.discountPercentage || 0);
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    
    const priceInfo = calculatePriceWithIVA(item);
    const originalPrice = priceInfo.priceWithIVA;
    
    if (!onSale || discountPercentage === 0) {
      return {
        ...priceInfo,
        hasDiscount: false,
        discountPercentage: 0,
        originalPrice: originalPrice,
        discountedPrice: originalPrice,
      };
    }
    
    const discountedPrice = originalPrice * (1 - discountPercentage / 100);
    
    return {
      ...priceInfo,
      hasDiscount: true,
      discountPercentage: discountPercentage,
      originalPrice: Math.round(originalPrice * 100) / 100,
      discountedPrice: Math.round(discountedPrice * 100) / 100,
    };
  }, [calculatePriceWithIVA]);

  const getOnSaleBadge = useCallback((item: any) => {
    const onSale = item?.onSale === true || item?.attributes?.onSale === true;
    let discount = Number(item?.discountPercentage || item?.attributes?.discountPercentage || 0);
    discount = Math.min(100, Math.max(0, discount));
    
    if (!onSale || discount === 0) {
      return null;
    }
    
    return {
      label: `${discount}%`,
      color: isDarkBg ? '#f87171' : '#991b1b',
      bg: isDarkBg ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
      border: isDarkBg ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)',
    };
  }, [isDarkBg]);

  const enrichItemWithPrices = (item: any) => {
    const ves = Number(item?.prices?.VES || item?.price || item?.precioVes || 0);
    const usd = Number(item?.prices?.USD || item?.priceUsd || item?.usdPrice || 0);
    const eur = Number(item?.prices?.EUR || item?.priceEur || 0);
    const crypto = Number(item?.prices?.CRYPTO || item?.crypto || 0);

    let finalVes = ves;
    let finalUsd = usd;

    if (finalVes === 0 && finalUsd > 0 && rates.USD > 0) {
      finalVes = Number((finalUsd * rates.USD).toFixed(2));
    }
    else if (finalUsd === 0 && finalVes > 0 && rates.USD > 0) {
      finalUsd = Number((finalVes / rates.USD).toFixed(2));
    }

    if (finalVes === 0 && finalUsd === 0) {
      const rawPrice = Number(item?.price || 0);
      if (rawPrice > 0) {
        if (rawPrice < 1000 && rates.USD > 0) {
          finalUsd = rawPrice;
          finalVes = Number((rawPrice * rates.USD).toFixed(2));
        } else {
          finalVes = rawPrice;
          finalUsd = rates.USD > 0 ? Number((rawPrice / rates.USD).toFixed(2)) : 0;
        }
      }
    }

    let finalEur = eur;
    if (finalEur === 0 && finalUsd > 0 && rates.USD > 0 && rates.EUR > 0) {
      const EUR_USD_RATE = rates.EUR / rates.USD;
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
      model: item?.model || item?.attributes?.model || '',
      weightValue: item?.weightValue || item?.attributes?.weightValue || '',
      weightUnit: item?.weightUnit || item?.attributes?.weightUnit || 'kg',
      dimensions: item?.dimensions || item?.attributes?.dimensions || '',
      brand: item?.brand || item?.attributes?.brand || '',
      category: item?.category || item?.attributes?.category || '',
      description: item?.description || item?.attributes?.description || '',
      features: Array.isArray(item?.features) ? item.features : (Array.isArray(item?.attributes?.features) ? item.attributes.features : []),
    };
  };

  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() => {
    const widths: { [key: string]: number } = {};
    AVAILABLE_COLUMNS.forEach(col => {
      widths[col.id] = col.width;
    });
    return widths;
  });

  const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

  const startResize = (e: React.MouseEvent, field: string) => {
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
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredAndSortedItems.map(i => getInternalId(i)) : []);
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 🔥 EDICIÓN INLINE DE STOCK - guarda via endpoint /stock-adjustment
  const handleInlineStockSave = useCallback(async (item: any, newStock: number) => {
    const productId = item?.id;
    const tenantId = item?.tenantId;
    const currentStock = Number(item?.stock ?? 0);

    if (!productId || !tenantId) {
      console.error('[StockInline] Faltan IDs', { productId, tenantId });
      setEditingStockId(null);
      setEditingStockValue('');
      return;
    }

    const delta = newStock - currentStock;
    if (delta === 0) {
      // Nada que guardar
      setEditingStockId(null);
      setEditingStockValue('');
      return;
    }

    setSavingStock(true);

    try {
      const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const dynamicBase =
        process.env.NEXT_PUBLIC_API_URL ||
        `http://${apiHost}:3000`;
      const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

      const url = `${cleanBase}/products/${productId}/stock-adjustment`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta,
          reason: 'adjustment',
          note: 'Edición inline desde tabla',
          tenantId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // 🔥 Actualizar el item en la tabla
      const updatedProduct = data?.product;
      if (updatedProduct) {
        // Actualizar el estado local del hook useInventoryTable
        // (el hook recibe items via prop, pero podemos forzar un update local)
        if (typeof onUpdateItem === 'function') {
          onUpdateItem(updatedProduct);
        }
      }

      // Cerrar el modo edición
      setEditingStockId(null);
      setEditingStockValue('');

      console.log('✅ [StockInline] Stock actualizado:', {
        productId,
        previousQty: data?.movement?.previousQty,
        newQty: data?.movement?.newQty,
      });
    } catch (error) {
      console.error('❌ [StockInline] Error:', error);
      showToast({
        variant: 'error',
        message: `Error al guardar el stock: ${error instanceof Error ? error.message : 'Desconocido'}`,
      });
      setEditingStockId(null);
      setEditingStockValue('');
    } finally {
      setSavingStock(false);
    }
  }, [onUpdateItem, showToast]);

    // 🔥 EXPORTAR CSV - respeta filtros y búsqueda activos
  const handleExportCSV = useCallback(() => {
    const itemsToExport = filteredAndSortedItems;

    if (!itemsToExport || itemsToExport.length === 0) {
      showToast({
        variant: 'info',
        message: 'No hay artículos para exportar con los filtros actuales.',
      });
      return;
    }

    // Helper: escapar valores para CSV
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Si tiene coma, comilla o salto de línea → entre comillas dobles y duplicar comillas internas
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Cabeceras
    const headers = [
      'ID',
      'Nombre',
      'Categoría',
      'Marca',
      'Modelo',
      'Stock',
      'MinStock',
      'Costo USD',
      'Precio VES',
      'Precio USD',
      'IVA Tipo',
      'IVA %',
      'Estado',
      'En Oferta',
      'Descuento %',
      'SKU',
    ];

    // Filas
    const rows = itemsToExport.map((item: any) => {
      const prices = item?.prices || item?.attributes?.prices || {};
      const priceVes = Number(prices?.VES ?? item?.price ?? 0);
      const priceUsd = Number(prices?.USD ?? 0);
      const stockNum = Number(item?.stock ?? 0);
      const minStockNum = Number(
        item?.minStock ?? item?.attributes?.minStock ?? lowStockThreshold ?? 2
      );
      const costNum = Number(item?.cost ?? item?.attributes?.cost ?? 0);
      const status = item?.status === 'published' ? 'Publicado' : 'Borrador';
      const sku =
        item?.itemId ||
        item?.sku ||
        item?.code ||
        item?.attributes?.sku ||
        '';

      return [
        item?.id || '',
        item?.name || '',
        item?.category || item?.attributes?.category || '',
        item?.brand || item?.attributes?.brand || '',
        item?.model || item?.attributes?.model || '',
        stockNum,
        minStockNum,
        costNum > 0 ? costNum.toFixed(2) : '',
        priceVes > 0 ? priceVes.toFixed(2) : '',
        priceUsd > 0 ? priceUsd.toFixed(2) : '',
        item?.ivaType || item?.attributes?.ivaType || 'excluded',
        Number(item?.ivaRate ?? item?.attributes?.ivaRate ?? 16),
        status,
        item?.onSale ? 'Sí' : 'No',
        Number(item?.discountPercentage ?? item?.attributes?.discountPercentage ?? 0),
        sku,
      ].map(escapeCSV);
    });

    // BOM UTF-8 para Excel (evita problemas con tildes/ñ)
    const BOM = '\uFEFF';
    const csvContent =
      BOM +
      [headers.map(escapeCSV).join(','), ...rows.map(r => r.join(','))].join('\r\n');

    // Descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;

    link.href = url;
    link.download = `inventario_${dateStr}_${timeStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`✅ [ExportCSV] ${itemsToExport.length} artículos exportados`);
  }, [filteredAndSortedItems, lowStockThreshold, showToast]);

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

  const containerStyle = {
    backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    borderColor: isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    color: textColor
  };

  const subtleBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
  const vesPriceColor = isDarkBg ? '#4ade80' : '#15803d';
  const usdReferenceColor = isDarkBg ? '#86efac' : '#166534';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' 
    : 'http://localhost:3000');

  return (
    <div className="border rounded-3xl shadow-xl p-5 space-y-4 w-full" style={containerStyle}>
      
      {/* Cabecera y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 gap-4">
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>Inventario de Artículos</h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            {filteredAndSortedItems.length} de {localItems.length} artículos registrados en el sistema general.
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
          <TrashManager
            primary={primary}
            secondary={secondary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            onRestoreItem={onRestoreItem}
            onDeletePermanently={onDeletePermanently}
            onEmptyTrash={onEmptyTrash}
          />

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredAndSortedItems.length === 0}
            className="px-3 py-2 rounded-xl border text-xs font-medium transition hover:opacity-70 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ borderColor: subtleBorderColor, color: textColor }}
            title={`Exportar ${filteredAndSortedItems.length} artículos a CSV`}
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
              placeholder="Buscar por ID, nombre, modelo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
              style={{ borderColor: subtleBorderColor, color: textColor }}
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border pb-1" style={{ borderColor: subtleBorderColor }}>
        <table className="w-full text-left border-collapse" style={{ minWidth: '1050px', tableLayout: 'fixed' }}>
          <ItemInventoryHeader
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
              paginatedItems.map((item, index) => {
// 🔥 LOG TEMPORAL DE DIAGNÓSTICO
console.log('[ItemInventoryTable] item crudo:', {
  name: item?.name,
  mediaUrls: item?.mediaUrls,
  coverImage: item?.coverImage,
  image: item?.image,
  _processedImage: item?._processedImage,
});

// 🔥 PRIORIDAD 1: mediaUrls[0] (viene limpio de la BD, sin /api/)
const imgUrl =
  (item?.mediaUrls?.[0] && typeof item.mediaUrls[0] === 'string'
    ? toAbsoluteApiUrl(item.mediaUrls[0])
    : null) ||
  getFirstImage(item);

console.log('[ItemInventoryTable] imgUrl final:', imgUrl);
                  const uniqueId = getProductCode(item);
                const internalSysId = getInternalId(item);
                const internalId = internalSysId || index.toString();
                const isSelected = selectedIds.includes(internalId);
                const isPublished = item.status === 'published' || item.isActive === true || item.isActive === 't' || item.isActive === '1' || item.isPublished === true;

                const statusBadgeClass = isPublished
                  ? isDarkBg ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : isDarkBg ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300';

                const isLowStock = Number(item.stock) <= 2;
                const stockBadgeClass = isLowStock
                  ? isDarkBg ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-800 border border-red-300'
                  : isDarkBg ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300';

                const discountInfo = getDiscountedPrice(item);
                const ivaBadge = getIvaBadge(item);
                const onSaleBadge = getOnSaleBadge(item);

                return (
                  <tr key={internalId} className={`hover:bg-white/5 ${isSelected ? 'bg-white/10' : ''}`} style={{ borderBottom: `1px solid ${subtleBorderColor}` }}>
                    
                    {visibleColumns.has('select') && (
                      <td className="py-3 px-3 truncate text-left" style={{ width: columnWidths.select }}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(internalId)} className="rounded cursor-pointer accent-current" />
                      </td>
                    )}
                    
                    {visibleColumns.has('image') && (
                      <td className="py-3 px-3 truncate text-left" style={{ width: columnWidths.image }}>
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
                    
                    {visibleColumns.has('name') && (
                      <td className="py-3 px-3 font-bold tracking-tight truncate text-left" style={{ width: columnWidths.name }}>
                        <div className="truncate cursor-pointer hover:underline" onClick={() => setPreviewProduct(item)}>{item.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-normal truncate mt-0.5" style={{ color: primary }}>
                          {item.brand && <span>{item.brand}</span>}
                          {item.brand && item.model && <span>•</span>}
                          {item.model && <span className="opacity-80">Mod. {item.model}</span>}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.has('itemId') && (
                      <td className="py-3 px-3 truncate text-left" style={{ width: columnWidths.itemId }}>
                        <div className="font-mono font-bold truncate" style={{ color: textColor }}>{uniqueId || <span className="opacity-40 font-normal">Sin ID</span>}</div>
                      </td>
                    )}
                    
{visibleColumns.has('category') && (
  <td className="py-3 px-3 min-w-[140px] max-w-[200px] text-left" style={{ width: columnWidths.category }}>
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
                    
                    {visibleColumns.has('status') && (
                      <td className="py-3 px-3 truncate text-center" style={{ width: columnWidths.status }}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
                          {isPublished ? 'Publicado' : 'Borrador'}
                        </span>
                      </td>
                    )}

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
                    
                    
                    {visibleColumns.has('price') && (
                      <td className="py-3 px-3 truncate text-left" style={{ width: columnWidths.price }}>
                        <div className="flex flex-col items-start">
                          {discountInfo.hasDiscount ? (
                            <>
                              <div className="line-through opacity-50 text-[11px]" style={{ color: textColor }}>
                                Bs. {formatVESPrice(discountInfo.originalPrice)}
                              </div>
                              <div className="font-extrabold" style={{ color: primary }}>
                                Bs. {formatVESPrice(discountInfo.discountedPrice)}
                              </div>
                              <div className="text-[10px] font-semibold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                                {rates.USD > 0 
                                  ? `($${Number(discountInfo.discountedPrice / rates.USD || 0).toFixed(2)})` 
                                  : '(USD no disponible)'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-extrabold" style={{ color: primary }}>
                                Bs. {formatVESPrice(discountInfo.priceWithIVA)}
                              </div>
                              <div className="text-[10px] font-semibold" style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}>
                                {rates.USD > 0 
                                  ? `($${Number(discountInfo.priceWithIVAUsd || 0).toFixed(2)})` 
                                  : '(USD no disponible)'}
                              </div>
                            </>
                          )}
                          {discountInfo.ivaType !== 'exempt' && discountInfo.ivaRate > 0 && discountInfo.basePriceVes > 0 && (
                            <div className="text-[8px] opacity-60 mt-0.5" style={{ color: textColor }}>
                              Base: Bs. {formatVESPrice(discountInfo.basePriceVes)} + {discountInfo.ivaRate}% IVA
                            </div>
                          )}
                          {discountInfo.ivaType === 'included' && discountInfo.ivaRate > 0 && discountInfo.basePriceVes > 0 && (
                            <div className="text-[8px] opacity-60 mt-0.5" style={{ color: textColor }}>
                              IVA {discountInfo.ivaRate}% incluido
                            </div>
                          )}
                          {discountInfo.ivaType === 'exempt' && (
                            <div className="text-[8px] opacity-60 mt-0.5" style={{ color: textColor }}>
                              Exento de IVA
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.has('iva') && (
                      <td className="py-3 px-3 text-center align-middle" style={{ width: columnWidths.iva }}>
                        <span 
                          className="text-[10px] font-medium"
                          style={{ 
                            color: ivaBadge.color,
                            opacity: 0.9
                          }}
                        >
                          {ivaBadge.label}
                        </span>
                      </td>
                    )}

                    {visibleColumns.has('onSale') && (
                      <td className="py-3 px-3 text-center align-middle" style={{ width: columnWidths.onSale }}>
                        {onSaleBadge ? (
                          <span 
                            className="inline-flex items-center gap-1 font-semibold"
                            style={{ 
                              color: textColor,
                              fontSize: '11px'
                            }}
                          >
                            <svg 
                              viewBox="0 0 24 24" 
                              fill="currentColor" 
                              className="w-4 h-4"
                              style={{ color: '#f97316' }}
                            >
                              <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
                              <path d="M12 15c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                            </svg>
                            {onSaleBadge.label} OFF
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-40" style={{ color: textColor }}>
                            —
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.has('stock') && (
                      <td className="py-3 px-3 text-center align-middle" style={{ width: columnWidths.stock }}>
                        {(() => {
                          const stockNum = Number(item.stock ?? 0);
                          const minStock = Number(
                            item.minStock ??
                            item.attributes?.minStock ??
                            lowStockThreshold ??
                            2
                          );

                          let numberColor = textColor;
                          if (stockNum === 0) {
                            numberColor = isDarkBg ? '#f87171' : '#dc2626';
                          } else if (stockNum <= minStock) {
                            numberColor = isDarkBg ? '#fbbf24' : '#d97706';
                          } else if (stockNum > minStock * 10) {
                            numberColor = isDarkBg ? '#4ade80' : '#15803d';
                          }

                          const maxForBar = Math.max(minStock * 2, stockNum, 1);
                          const ratio = Math.min(1, stockNum / maxForBar);

                          let barColor = '#10b981';
                          if (stockNum === 0) {
                            barColor = '#ef4444';
                          } else if (stockNum <= minStock) {
                            barColor = '#f59e0b';
                          }

                          const isEditingThis =
                            editingStockId === (item.id || internalId);

                          // 🔥 MODO EDICIÓN INLINE
                          if (isEditingThis) {
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    autoFocus
                                    value={editingStockValue}
                                    disabled={savingStock}
                                    onChange={(e) => setEditingStockValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newStock = Math.max(
                                          0,
                                          parseInt(editingStockValue, 10) || 0
                                        );
                                        handleInlineStockSave(item, newStock);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setEditingStockId(null);
                                        setEditingStockValue('');
                                      }
                                    }}
                                    className="w-16 px-1.5 py-0.5 text-xs text-center rounded-md border outline-none"
                                    style={{
                                      borderColor: primary,
                                      color: textColor,
                                      backgroundColor: isDarkBg
                                        ? 'rgba(255,255,255,0.05)'
                                        : 'rgba(255,255,255,0.9)',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newStock = Math.max(
                                        0,
                                        parseInt(editingStockValue, 10) || 0
                                      );
                                      handleInlineStockSave(item, newStock);
                                    }}
                                    disabled={savingStock}
                                    className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-500 transition cursor-pointer disabled:opacity-40"
                                    title="Guardar (Enter)"
                                  >
                                    {savingStock ? (
                                      <svg
                                        className="w-3.5 h-3.5 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <circle cx="12" cy="12" r="10" opacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                      </svg>
                                    ) : (
                                      <svg
                                        className="w-3.5 h-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStockId(null);
                                      setEditingStockValue('');
                                    }}
                                    disabled={savingStock}
                                    className="p-0.5 rounded hover:bg-red-500/20 text-red-400 transition cursor-pointer disabled:opacity-40"
                                    title="Cancelar (Esc)"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                                <span
                                  className="text-[9px] opacity-50"
                                  style={{ color: textColor }}
                                >
                                  Enter = guardar
                                </span>
                              </div>
                            );
                          }

                          // 🔥 MODO NORMAL (con click para editar)
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStockId(item.id || internalId);
                                    setEditingStockValue(String(stockNum));
                                  }}
                                  className="text-xs font-bold rounded px-1 -mx-1 hover:bg-white/10 transition cursor-pointer"
                                  style={{ color: numberColor }}
                                  title="Click para editar stock"
                                >
                                  {stockNum}
                                </button>
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
                    
                    {visibleColumns.has('actions') && (
                      <td className="py-3 px-3 text-right truncate" style={{ width: columnWidths.actions }}>
                        <ItemActionsCell
                          item={item}
                          textColor={textColor}
                          isDarkBg={isDarkBg}
                          borderDynamic={subtleBorderColor}
                          onPreview={(targetItem) => setPreviewProduct(targetItem)}
                          onEdit={(targetItem) => {
                            const enrichedItem = enrichItemWithPrices(targetItem);
                            setEditingProduct(enrichedItem);
                            externalHandleEditItem?.(enrichedItem);
                          }}
                          onTogglePublish={handleTogglePublish}
                          onDelete={(targetItem) => {
                            console.log('🗑️ Eliminando con ID:', targetItem);
                            if (targetItem) {
                              handleRemoveItem(targetItem);
                            } else {
                              console.error('No se encontró el ID para eliminar');
                            }
                          }}
                          onShowHistory={(targetItem) => {
                            setHistoryProduct(targetItem);
                          }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={visibleColumns.size} className="py-8 text-center opacity-60">No se encontraron artículos registrados en el inventario.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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

      <ItemPreviewModal
        previewProduct={previewProduct}
        setPreviewProduct={setPreviewProduct}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />

      <ItemEditModal
        key={editingProduct?.id || editingProduct?.itemId || 'new-product'}
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={async (formData) => {
          try {
            const realUuid = editingProduct?.id;

            if (!realUuid) {
              console.error("No se encontró el UUID primario del producto");
              showToast({
                variant: 'error',
                message: 'Error crítico: No se encontró el ID único del producto.',
              });
              return;
            }

            await handleUpdateItem(realUuid, formData);
            setEditingProduct(null);
            showToast({
              variant: 'success',
              message: 'Producto actualizado correctamente.',
            });
          } catch (error) {
            console.error('Error al actualizar el producto en el servidor:', error);
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

      <StockMovementHistoryModal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />

    </div>
  );
}