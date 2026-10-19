// ARCHIVO: apps/frontend/app/admin/[slug]/components/catalog/inventory/table/ServiceInventoryHeader.tsx
import React from 'react';

interface ServiceInventoryHeaderProps {
  columnWidths: { [key: string]: number };
  startResize: (e: React.MouseEvent, field: string) => void;
  toggleSort: (field: 'name' | 'price' | 'stock' | 'itemId' | 'duration') => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAllSelected: boolean;
  isDarkBg: boolean;
  subtleBorderColor: string;
  visibleColumns?: Set<string>;
  availableColumns?: Array<{ id: string; label: string; defaultVisible: boolean; width: number; fixed?: boolean }>;
}

export default function ServiceInventoryHeader({
  columnWidths,
  startResize,
  toggleSort,
  sortField,
  sortDirection,
  handleSelectAll,
  isAllSelected,
  isDarkBg,
  subtleBorderColor,
  visibleColumns
}: ServiceInventoryHeaderProps) {
  const renderTh = (field: string, label: string, sortable = false, align: 'left' | 'center' | 'right' = 'left') => (
    <th
      className={`py-2.5 px-3 relative truncate ${sortable ? 'cursor-pointer hover:opacity-100' : ''} text-${align}`}
      style={{ width: columnWidths[field] }}
      onClick={sortable ? () => toggleSort(field as any) : undefined}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        {sortable && sortField === field && (
          <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
      <div 
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${isDarkBg ? 'hover:bg-white/30' : 'hover:bg-black/20'}`} 
        onMouseDown={(e) => startResize(e, field)} 
      />
    </th>
  );

  return (
    <thead>
      <tr 
        className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none"
        style={{ 
          borderColor: subtleBorderColor, 
          backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)' 
        }}
      >
        {/* SELECT - Centrado */}
        {(!visibleColumns || visibleColumns.has('select')) && (
          <th className="py-2.5 px-3 relative truncate text-center" style={{ width: columnWidths.select }}>
            <div className="flex items-center justify-center">
              <input 
                type="checkbox" 
                onChange={handleSelectAll} 
                checked={isAllSelected} 
                className="rounded cursor-pointer accent-current" 
              />
            </div>
            <div 
              className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${isDarkBg ? 'hover:bg-white/30' : 'hover:bg-black/20'}`} 
              onMouseDown={(e) => startResize(e, 'select')} 
            />
          </th>
        )}
        
        {/* IMAGEN - Centrado */}
        {(!visibleColumns || visibleColumns.has('image')) && (
          <th className="py-2.5 px-3 relative truncate text-center" style={{ width: columnWidths.image }}>
            <span>Imagen</span>
            <div 
              className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${isDarkBg ? 'hover:bg-white/30' : 'hover:bg-black/20'}`} 
              onMouseDown={(e) => startResize(e, 'image')} 
            />
          </th>
        )}
        
        {/* NOMBRE - Izquierda */}
        {(!visibleColumns || visibleColumns.has('name')) && renderTh('name', 'Servicio / Marca', true, 'left')}
        
        {/* ID - Izquierda */}
        {(!visibleColumns || visibleColumns.has('itemId')) && renderTh('itemId', 'Código ID', true, 'left')}
        
        {/* CATEGORÍA - Centrado */}
        {(!visibleColumns || visibleColumns.has('category')) && renderTh('category', 'Categoría', false, 'center')}
        
        {/* ESTADO - Centrado */}
        {(!visibleColumns || visibleColumns.has('status')) && renderTh('status', 'Estatus', false, 'center')}
        
        {/* CANALES - Centrado */}
        {(!visibleColumns || visibleColumns.has('channels')) && renderTh('channels', 'Canales', false, 'center')}

        {/* PRECIO - Izquierda (igual que producto) */}
        {(!visibleColumns || visibleColumns.has('price')) && renderTh('price', 'Precio', true, 'left')}
        
        {/* OFERTA - Centrado */}
        {(!visibleColumns || visibleColumns.has('onSale')) && renderTh('onSale', 'Oferta', false, 'center')}
        
        {/* DURACIÓN - Centrado */}
        {(!visibleColumns || visibleColumns.has('duration')) && renderTh('duration', '⏱ Duración', true, 'center')}
        
        {/* CUPOS - Centrado */}
        {(!visibleColumns || visibleColumns.has('availability')) && renderTh('availability', 'Cupos', true, 'center')}
        
        {/* ACCIONES - Derecha */}
        {(!visibleColumns || visibleColumns.has('actions')) && renderTh('actions', 'Acciones', false, 'right')}
      </tr>
    </thead>
  );
}