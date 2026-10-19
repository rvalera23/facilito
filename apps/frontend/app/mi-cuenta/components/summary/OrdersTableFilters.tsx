'use client';

import React from 'react';
import SearchInput from './shared/SearchInput';

interface OrdersTableFiltersProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  searchFilter: string;
  setSearchFilter: (search: string) => void;
  setCurrentPage: (page: number) => void;
  textColor: string;
  primary: string;
  isDarkBg: boolean;
  subtleBorderColor: string;
}

// 🔥 ICONOS SVG DINÁMICOS
const Icons = {
  Product: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Service: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  All: ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Search: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
};

export default function OrdersTableFilters({
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  searchFilter,
  setSearchFilter,
  setCurrentPage,
  textColor,
  primary,
  isDarkBg,
  subtleBorderColor,
}: OrdersTableFiltersProps) {
  const statusTabs = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'completed', label: 'Completados' },
    { id: 'cancelled', label: 'Cancelados' },
  ];

  const typeTabs = [
    { id: 'all', label: 'Todo', icon: Icons.All },
    { id: 'product', label: 'Productos', icon: Icons.Product },
    { id: 'service', label: 'Servicios', icon: Icons.Service },
  ];

  const handleStatusChange = (tabId: string) => {
    setStatusFilter(tabId);
    setCurrentPage(1);
  };

  const handleTypeChange = (tabId: string) => {
    setTypeFilter(tabId);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-5 border-b flex flex-col gap-4" style={{ borderColor: subtleBorderColor }}>
      {/* Fila 1: Filtros de estado + tipo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Estados */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 mr-1 shrink-0">
            Estado
          </span>
          <div className="flex gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`text-[11px] font-medium px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id 
                    ? 'text-white shadow-lg scale-[1.02]' 
                    : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: statusFilter === tab.id ? primary : 'transparent',
                  boxShadow: statusFilter === tab.id ? `0 4px 12px ${primary}40` : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tipos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 mr-1 shrink-0">
            Tipo
          </span>
          <div className="flex gap-1">
            {typeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeChange(tab.id)}
                  className={`text-[11px] font-medium px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive 
                      ? 'text-white shadow-lg scale-[1.02]' 
                      : 'opacity-60 hover:opacity-100 hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isActive ? primary : 'transparent',
                    boxShadow: isActive ? `0 4px 12px ${primary}40` : 'none',
                  }}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fila 2: Buscador */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40">
          <Icons.Search size={14} />
        </div>
        <SearchInput
          value={searchFilter}
          onChange={(value) => { setSearchFilter(value); setCurrentPage(1); }}
          placeholder="Buscar por ID, producto o método de pago..."
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
          className="pl-9"
        />
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${primary};
          border-radius: 9999px;
          opacity: 0.5;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}