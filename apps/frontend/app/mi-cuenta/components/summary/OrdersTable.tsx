  // frontend/app/mi-cuenta/components/summary/OrdersTable.tsx
  'use client';

  import React from 'react';
  import OrdersTableFilters from './OrdersTableFilters';
  import OrdersTableRow from './OrdersTableRow';
  import Pagination from './shared/Pagination';

  interface OrdersTableProps {
    orders: any[];
    appointments?: any[];
    filteredOrders: any[];
    paginatedOrders: any[];
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    setItemsPerPage: (n: number) => void;
    goToPage: (page: number) => void;
    searchFilter: string;
    setSearchFilter: (s: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    typeFilter: string;
    setTypeFilter: (s: string) => void;
    setCurrentPage: (n: number) => void;
    sortField: 'date' | 'total' | 'id';
    sortDirection: 'asc' | 'desc';
    handleSort: (field: 'date' | 'total' | 'id') => void;
    primary: string;
    textColor: string;
    isDarkBg: boolean;
    secondary?: string;
    userProducts?: any[];
    bsRate?: number;
    ivaRate?: number;
  }

  // 🔥 ICONOS SVG
  const Icons = {
    SortAsc: ({ color, size = 10 }: { color?: string; size?: number }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
        <polyline points="6 15 12 9 18 15" />
      </svg>
    ),
    SortDesc: ({ color, size = 10 }: { color?: string; size?: number }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
  };

  export default function OrdersTable({
    orders,
    appointments = [],
    filteredOrders,
    paginatedOrders,
    totalItems,
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    goToPage,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    setCurrentPage,
    sortField,
    sortDirection,
    handleSort,
    primary,
    textColor,
    isDarkBg,
    secondary,
    userProducts = [],
    bsRate = 0,
    ivaRate = 16,
  }: OrdersTableProps) {
    const subtleBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';

  const SortIcon = sortDirection === 'asc' ? Icons.SortAsc : Icons.SortDesc;

  return (
    <div 
      className="border rounded-2xl shadow-lg overflow-hidden backdrop-blur-sm flex flex-col"
      style={{ 
        backgroundColor: secondary || 'transparent', 
        borderColor: subtleBorderColor,
        maxHeight: '600px', // 🔥 Limitar altura máxima
      }}
    >
      <OrdersTableFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        setCurrentPage={setCurrentPage}
        textColor={textColor}
        primary={primary}
        isDarkBg={isDarkBg}
        subtleBorderColor={subtleBorderColor}
      />

      {/* 🔥 AQUÍ EL SCROLL HORIZONTAL Y VERTICAL */}
      <div className="overflow-x-auto overflow-y-auto flex-1" style={{ maxHeight: 'calc(600px - 120px)' }}>
        <table className="w-full text-left border-collapse min-w-[900px]">
          {/* ... resto de la tabla */}
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
        onItemsPerPageChange={setItemsPerPage}
        textColor={textColor}
        subtleBorderColor={subtleBorderColor}
        isDarkBg={isDarkBg}
        primary={primary}
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 5px;
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkBg ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 9999px;
          margin: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')};
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)')};
        }
        /* 🔥 Ocultar scroll vertical cuando no es necesario */
        .custom-scrollbar {
          scrollbar-width: thin;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 5px;
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)')};
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
}