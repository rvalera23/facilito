// ARCHIVO: apps/frontend/app/admin/[slug]/components/catalog/inventory/table/ServiceInventoryPagination.tsx
import React from 'react';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface ServiceInventoryPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  filteredCount: number;
  totalCount: number;
  searchTerm: string;
  isDarkBg: boolean;
  textColor: string;
  subtleBorderColor: string;
  primary: string;
}

export default function ServiceInventoryPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  filteredCount,
  totalCount,
  searchTerm,
  isDarkBg,
  textColor,
  subtleBorderColor,
  primary,
}: ServiceInventoryPaginationProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between pt-3 border-t gap-4 text-xs select-none" style={{ borderColor: subtleBorderColor }}>
      <div className="opacity-75 text-[11px] flex items-center gap-2">
        <span>
          Mostrando <strong className="font-semibold">{filteredCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a <strong className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredCount)}</strong> de <strong className="font-semibold">{filteredCount}</strong> servicios
        </span>
        {searchTerm && <span className="opacity-60">(filtrados de {totalCount} totales)</span>}
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="opacity-70">Ver:</span>
          <div className="w-[80px]">
            <SearchableDropdown
              value={String(itemsPerPage)}
              onChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}
              options={[
                { value: '5', label: '5' },
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '50', label: '50' },
              ]}
              placeholder={String(itemsPerPage)}
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={subtleBorderColor}
              searchable={false}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{ borderColor: subtleBorderColor }}
          >
            Anterior
          </button>
          <span className="px-3 py-1.5 text-[11px] font-semibold opacity-95">Página {currentPage} de {totalPages || 1}</span>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{ borderColor: subtleBorderColor }}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}