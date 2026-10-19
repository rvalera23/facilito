'use client';

import React from 'react';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
  textColor: string;
  subtleBorderColor: string;
  isDarkBg: boolean;
  primary: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  textColor,
  subtleBorderColor,
  isDarkBg,
  primary,
}: PaginationProps) {
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs select-none" style={{ borderColor: subtleBorderColor }}>
      <div className="opacity-75 text-[11px]">
        <span>
          Mostrando <strong className="font-semibold">{startItem}</strong> a <strong className="font-semibold">{endItem}</strong> de <strong className="font-semibold">{totalItems}</strong> registros
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="opacity-70">Ver:</span>
          <div className="w-[80px]">
            <SearchableDropdown
              value={String(itemsPerPage)}
              onChange={(val) => {
                onItemsPerPageChange(Number(val));
                onPageChange(1);
              }}
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
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            style={{ borderColor: subtleBorderColor }}
          >
            Anterior
          </button>
          <span className="px-3 py-1.5 text-[11px] font-semibold opacity-95">
            Página {currentPage} de {totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
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