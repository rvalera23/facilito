// ==========================================
// ARCHIVO: apps/frontend/app/admin/[slug]/components/catalog/inventory/table/ItemInventoryHeader.tsx
// ==========================================
import React from 'react';

interface ItemInventoryHeaderProps {
  columnWidths: { [key: string]: number };
  startResize: (e: React.MouseEvent, field: string) => void;
  toggleSort: (field: 'name' | 'price' | 'stock' | 'itemId' | 'iva' | 'onSale') => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAllSelected: boolean;
  isDarkBg: boolean;
  subtleBorderColor: string;
  visibleColumns: Set<string>;
  availableColumns: { id: string; label: string; defaultVisible: boolean; width: number; fixed?: boolean }[];
}

export default function ItemInventoryHeader({
  columnWidths,
  startResize,
  toggleSort,
  sortField,
  sortDirection,
  handleSelectAll,
  isAllSelected,
  isDarkBg,
  subtleBorderColor,
  visibleColumns,
  availableColumns,
}: ItemInventoryHeaderProps) {
  
  // 🔥 FUNCIÓN PARA VERIFICAR SI UNA COLUMNA ES VISIBLE
  const isVisible = (field: string): boolean => {
    return visibleColumns.has(field);
  };

  // 🔥 MAPEAR availableColumns para agregar propiedades de sort y align
  const columns = availableColumns.map(col => {
    const sortableFields = ['name', 'price', 'stock', 'itemId', 'iva', 'onSale'];
    const isSortable = sortableFields.includes(col.id);
    const alignRight = col.id === 'actions';
    const alignCenter = col.id === 'onSale' || col.id === 'iva' || col.id === 'stock' || col.id === 'status';
    
    return {
      ...col,
      sortable: isSortable,
      alignRight: alignRight,
      alignCenter: alignCenter,
    };
  });

  // 🔥 FILTRAR COLUMNAS PARA MOSTRAR SOLO LAS VISIBLES
  const visibleColumnsList = columns.filter(col => {
    if (col.id === 'select' || col.id === 'actions') return true;
    return isVisible(col.id);
  });

  return (
    <thead>
      <tr 
        className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none"
        style={{ 
          borderColor: subtleBorderColor, 
          backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)' 
        }}
      >
        {visibleColumnsList.map((col) => {
          const key = col.id;
          const width = col.width || columnWidths[col.id] || 100;
          const isSortable = col.sortable;
          const alignCenter = col.alignCenter;
          const alignRight = col.alignRight;

          // 🔥 COLUMNA SELECT
          if (col.id === 'select') {
            return (
              <th 
                key={key}
                className="py-2.5 px-3 relative truncate"
                style={{ width: width }}
              >
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={isAllSelected} 
                  className="rounded cursor-pointer accent-current" 
                />
                <div 
                  className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${isDarkBg ? 'hover:bg-white/30' : 'hover:bg-black/20'}`} 
                  onMouseDown={(e) => startResize(e, col.id)} 
                />
              </th>
            );
          }

          // 🔥 COLUMNA ACTIONS
          if (col.id === 'actions') {
            return (
              <th 
                key={key}
                className={`py-2.5 px-3 relative truncate text-right`}
                style={{ width: width }}
              >
                <span>{col.label}</span>
              </th>
            );
          }

          // 🔥 RESTO DE COLUMNAS
          return (
            <th
              key={key}
              className={`py-2.5 px-3 relative truncate ${isSortable ? 'cursor-pointer hover:opacity-100' : ''} ${alignCenter ? 'text-center' : ''} ${alignRight ? 'text-right' : ''}`}
              style={{ width: width }}
              onClick={isSortable ? () => toggleSort(col.id as any) : undefined}
            >
              <div className={`flex items-center gap-1 ${alignCenter ? 'justify-center' : ''} ${alignRight ? 'justify-end' : ''}`}>
                <span>{col.label}</span>
                {isSortable && sortField === col.id && (
                  <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </div>
              <div 
                className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${isDarkBg ? 'hover:bg-white/30' : 'hover:bg-black/20'}`} 
                onMouseDown={(e) => startResize(e, col.id)} 
              />
            </th>
          );
        })}
      </tr>
    </thead>
  );
}