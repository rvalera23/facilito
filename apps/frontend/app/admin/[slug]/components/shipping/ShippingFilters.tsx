// frontend/app/admin/[slug]/components/shipping/ShippingFilters.tsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Truck, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { getCompanyName, getCompanyColor } from './ShippingCard';

interface ShippingFiltersProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterCompany: string;
  setFilterCompany: (company: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  uniqueCompanies: string[];
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder?: string;
  onReset?: () => void;
}

export default function ShippingFilters({
  filterStatus,
  setFilterStatus,
  filterCompany,
  setFilterCompany,
  searchQuery,
  setSearchQuery,
  uniqueCompanies,
  primary,
  textColor,
  isDarkBg,
  cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  onReset,
}: ShippingFiltersProps) {
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // 🔥 CERRAR DROPDOWNS AL HACER CLICK FUERA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusFilters = [
    { id: 'all', label: 'Todos', icon: <Filter className="w-3 h-3" />, color: '#64748b' },
    { id: 'PENDING', label: 'Pendientes', icon: <Clock className="w-3 h-3" />, color: '#f59e0b' },
    { id: 'in_transit', label: 'En camino', icon: <Truck className="w-3 h-3" />, color: '#3b82f6' },
    { id: 'COMPLETED', label: 'Entregados', icon: <CheckCircle className="w-3 h-3" />, color: '#22c55e' },
    { id: 'CANCELLED', label: 'Cancelados', icon: <XCircle className="w-3 h-3" />, color: '#ef4444' },
  ];

  // 🔥 Obtener el filtro de estado actual
  const currentStatusFilter = statusFilters.find(s => s.id === filterStatus) || statusFilters[0];

  // 🔥 Contar cuántos filtros activos hay
  const activeFiltersCount = [
    filterStatus !== 'all',
    filterCompany !== 'all',
    searchQuery.length > 0
  ].filter(Boolean).length;

  // 🔥 Función para resetear todos los filtros
  const handleReset = () => {
    setFilterStatus('all');
    setFilterCompany('all');
    setSearchQuery('');
    if (onReset) onReset();
  };

  // 🔥 Obtener empresa seleccionada
  const selectedCompanyName = filterCompany !== 'all' ? getCompanyName(filterCompany) : 'Todas las empresas';
  const selectedCompanyColor = filterCompany !== 'all' ? getCompanyColor(filterCompany) : '#64748b';

  return (
    <div className="space-y-3">
      {/* 🔥 BARRA DE BÚSQUEDA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div 
          className={`relative flex-1 transition-all duration-200 ${
            isSearchFocused ? 'ring-2 ring-opacity-50' : ''
          }`}
          style={{ 
            '--tw-ring-color': primary,
            ringColor: primary,
          } as React.CSSProperties}
        >
          <Search 
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              isSearchFocused ? 'opacity-100' : 'opacity-40'
            }`} 
            style={{ color: isSearchFocused ? primary : textColor }} 
          />
          <input
            type="text"
            placeholder="Buscar por cliente, dirección, tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full border rounded-xl pl-9 pr-9 py-2.5 text-xs outline-none bg-transparent transition-all"
            style={{ 
              borderColor: isSearchFocused ? primary : cardBorder,
              color: textColor,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 transition"
              style={{ color: textColor }}
            >
              <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
            </button>
          )}
        </div>

        {/* 🔥 BOTÓN DE RESETEO RÁPIDO */}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleReset}
            className="px-3 py-2.5 rounded-xl border text-xs flex items-center gap-1.5 hover:opacity-80 transition whitespace-nowrap"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetear</span>
            <span className="inline sm:hidden">
              {activeFiltersCount} filtros
            </span>
          </button>
        )}
      </div>

      {/* 🔥 FILTROS RÁPIDOS */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Dropdown de estado */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-medium flex items-center gap-1.5 transition-all hover:opacity-80 ${
              filterStatus !== 'all' ? 'border-opacity-100' : ''
            }`}
            style={{ 
              borderColor: filterStatus !== 'all' ? currentStatusFilter.color : cardBorder,
              color: filterStatus !== 'all' ? currentStatusFilter.color : textColor,
              backgroundColor: filterStatus !== 'all' ? `${currentStatusFilter.color}15` : 'transparent',
            }}
          >
            {currentStatusFilter.icon}
            {currentStatusFilter.label}
            <ChevronDown className={`w-3 h-3 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStatusDropdownOpen && (
            <div 
              className="absolute left-0 top-full mt-1 rounded-xl border shadow-2xl py-1 min-w-[160px] z-50"
              style={{ 
                backgroundColor: isDarkBg ? '#1e293b' : '#ffffff',
                borderColor: cardBorder 
              }}
            >
              {statusFilters.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => {
                    setFilterStatus(status.id);
                    setIsStatusDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-[10px] text-left flex items-center gap-2 hover:opacity-80 transition ${
                    filterStatus === status.id ? 'font-bold' : ''
                  }`}
                  style={{ 
                    color: filterStatus === status.id ? status.color : textColor,
                    backgroundColor: filterStatus === status.id ? `${status.color}10` : 'transparent',
                  }}
                >
                  {status.icon}
                  {status.label}
                  {filterStatus === status.id && (
                    <CheckCircle className="w-3 h-3 ml-auto" style={{ color: status.color }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown de empresa */}
        {uniqueCompanies.length > 0 && (
          <div className="relative" ref={companyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-medium flex items-center gap-1.5 transition-all hover:opacity-80 ${
                filterCompany !== 'all' ? 'border-opacity-100' : ''
              }`}
              style={{ 
                borderColor: filterCompany !== 'all' ? selectedCompanyColor : cardBorder,
                color: filterCompany !== 'all' ? selectedCompanyColor : textColor,
                backgroundColor: filterCompany !== 'all' ? `${selectedCompanyColor}15` : 'transparent',
              }}
            >
              <Truck className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{selectedCompanyName}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCompanyDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-1 rounded-xl border shadow-2xl py-1 min-w-[180px] z-50 max-h-60 overflow-y-auto"
                style={{ 
                  backgroundColor: isDarkBg ? '#1e293b' : '#ffffff',
                  borderColor: cardBorder 
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFilterCompany('all');
                    setIsCompanyDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-[10px] text-left flex items-center gap-2 hover:opacity-80 transition ${
                    filterCompany === 'all' ? 'font-bold' : ''
                  }`}
                  style={{ color: filterCompany === 'all' ? primary : textColor }}
                >
                  <Filter className="w-3 h-3" />
                  Todas las empresas
                  {filterCompany === 'all' && (
                    <CheckCircle className="w-3 h-3 ml-auto" style={{ color: primary }} />
                  )}
                </button>
                
                {uniqueCompanies.map((company) => {
                  const companyName = getCompanyName(company);
                  const companyColor = getCompanyColor(company);
                  return (
                    <button
                      key={company}
                      type="button"
                      onClick={() => {
                        setFilterCompany(company);
                        setIsCompanyDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-[10px] text-left flex items-center gap-2 hover:opacity-80 transition ${
                        filterCompany === company ? 'font-bold' : ''
                      }`}
                      style={{ 
                        color: filterCompany === company ? companyColor : textColor,
                        backgroundColor: filterCompany === company ? `${companyColor}10` : 'transparent',
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: companyColor }}
                      />
                      {companyName}
                      {filterCompany === company && (
                        <CheckCircle className="w-3 h-3 ml-auto" style={{ color: companyColor }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 🔥 INDICADOR DE FILTROS ACTIVOS */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] opacity-40" style={{ color: textColor }}>
              <SlidersHorizontal className="w-3 h-3 inline mr-1" />
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* 🔥 TAGS DE FILTROS ACTIVOS (SOLO EN VISTA DESKTOP) */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t" style={{ borderColor: cardBorder }}>
          {filterStatus !== 'all' && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
              style={{ 
                backgroundColor: `${currentStatusFilter.color}15`,
                color: currentStatusFilter.color,
                border: `1px solid ${currentStatusFilter.color}30`,
              }}
            >
              {currentStatusFilter.icon}
              {currentStatusFilter.label}
              <button
                onClick={() => setFilterStatus('all')}
                className="ml-0.5 hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          {filterCompany !== 'all' && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
              style={{ 
                backgroundColor: `${selectedCompanyColor}15`,
                color: selectedCompanyColor,
                border: `1px solid ${selectedCompanyColor}30`,
              }}
            >
              <Truck className="w-2.5 h-2.5" />
              {selectedCompanyName}
              <button
                onClick={() => setFilterCompany('all')}
                className="ml-0.5 hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          {searchQuery && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
              style={{ 
                backgroundColor: `${primary}15`,
                color: primary,
                border: `1px solid ${primary}30`,
              }}
            >
              <Search className="w-2.5 h-2.5" />
              {searchQuery.length > 15 ? `${searchQuery.slice(0, 15)}...` : searchQuery}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-0.5 hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          
          {activeFiltersCount > 1 && (
            <button
              onClick={handleReset}
              className="text-[9px] opacity-40 hover:opacity-100 transition"
              style={{ color: textColor }}
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}
    </div>
  );
}