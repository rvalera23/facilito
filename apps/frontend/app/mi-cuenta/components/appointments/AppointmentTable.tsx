// AppointmentTable.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { Search } from 'lucide-react';
import { Appointment } from './AppointmentsTab';
import { AppointmentRow } from './AppointmentRow';
import { FILTER_TABS } from './utils/statusConfig';

interface AppointmentTableProps {
  appointments: Appointment[];
  filter: string;
  setFilter: (filter: string) => void;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  sortField: string;
  setSortField: (field: any) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (dir: 'asc' | 'desc') => void;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
  onOpenModal: (appointment: Appointment) => void;
  counts: Record<string, number>;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  filter,
  setFilter,
  searchFilter,
  setSearchFilter,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  primary,
  textColor,
  isDarkBg,
  cardBorder,
  onOpenModal,
  counts,
}) => {
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({
    date: 180,
    customer: 100,
    service: 180,
    price: 80,
    professional: 100,
    status: 120,
    actions: 100,
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  // FILTROS Y ORDENAMIENTO
  const filteredAppointments = useMemo(() => {
    const result = appointments.filter(a => {
      const matchesSearch =
        a.service?.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.serviceName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.customerName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.id?.toLowerCase().includes(searchFilter.toLowerCase());

      if (filter === 'all') return matchesSearch;
      return a.status === filter && matchesSearch;
    });
    return result;
  }, [appointments, searchFilter, filter]);

  const sortedAppointments = useMemo(() => {
    const sorted = [...filteredAppointments];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'date') {
        valA = a.bookingDate ? new Date(a.bookingDate).getTime() : 0;
        valB = b.bookingDate ? new Date(b.bookingDate).getTime() : 0;
      } else if (sortField === 'customer') {
        valA = a.customerName || '';
        valB = b.customerName || '';
      } else if (sortField === 'service') {
        valA = a.service?.name || a.serviceName || '';
        valB = b.service?.name || b.serviceName || '';
      } else if (sortField === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      } else if (sortField === 'price') {
        valA = a.priceVes || a.priceUsd || 0;
        valB = b.priceVes || b.priceUsd || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc'   ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredAppointments, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedAppointments.length / itemsPerPage) || 1;
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAppointments.slice(start, start + itemsPerPage);
  }, [sortedAppointments, currentPage, itemsPerPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || 120,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(80, resizingRef.current.startWidth + delta);
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current!.colKey]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: cardBorder }}>
      {/* Filtros y Búsqueda */}
      <div
        className="p-4 sm:p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{ borderColor: cardBorder }}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          {FILTER_TABS.map((tab) => {
            const count = counts[tab.id] || 0;
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm ${
                  isActive ? 'text-white shadow-md' : 'bg-white/5 opacity-75 hover:opacity-100 hover:bg-white/10'
                }`}
                style={{ backgroundColor: isActive ? primary : undefined }}
              >
                {tab.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
          <input
            type="text"
            placeholder="Buscar cita..."
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border text-xs font-medium rounded-xl pl-9 pr-3.5 py-2 outline-none w-full transition"
            style={{ borderColor: cardBorder, color: textColor }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr
              className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none"
              style={{
                borderColor: cardBorder,
                backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)',
              }}
            >
              <th
                className="py-3 px-4 pl-5 relative cursor-pointer hover:opacity-100 transition"
                style={{ width: columnWidths.date }}
                onClick={() => handleSort('date')}
              >
                <div className="truncate">
                  Fecha y Hora {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('date', e)} />
              </th>
              <th
                className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition"
                style={{ width: columnWidths.customer }}
                onClick={() => handleSort('customer')}
              >
                <div className="truncate">
                  Cliente {sortField === 'customer' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('customer', e)} />
              </th>
              <th
                className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition"
                style={{ width: columnWidths.service }}
                onClick={() => handleSort('service')}
              >
                <div className="truncate">
                  Servicio {sortField === 'service' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('service', e)} />
              </th>
              <th
                className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition"
                style={{ width: columnWidths.price }}
                onClick={() => handleSort('price')}
              >
                <div className="truncate">
                  Precio {sortField === 'price' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('price', e)} />
              </th>
              <th className="py-3 px-4 relative" style={{ width: columnWidths.professional }}>
                <div className="truncate">Profesional</div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('professional', e)} />
              </th>
              <th
                className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition"
                style={{ width: columnWidths.status }}
                onClick={() => handleSort('status')}
              >
                <div className="truncate">
                  Estado {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
                </div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('status', e)} />
              </th>
              <th className="py-3 px-4 pr-5 relative" style={{ width: columnWidths.actions }}>
                <div className="truncate text-center">Acciones</div>
                <div className="resizer" onMouseDown={(e) => handleMouseDown('actions', e)} />
              </th>
            </tr>
          </thead>
          <tbody className="text-xs" style={{ borderColor: cardBorder }}>
            {paginatedAppointments.length > 0 ? (
              paginatedAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  cardBorder={cardBorder}
                  columnWidths={columnWidths}
                  onOpenModal={onOpenModal}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center opacity-60 font-medium">
                  No se encontraron citas con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      <div
        className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs select-none"
        style={{ borderColor: cardBorder }}
      >
        <div className="opacity-75 text-[11px]">
          <span>
            Mostrando <strong className="font-semibold">
              {sortedAppointments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </strong>{' '}
            a <strong className="font-semibold">
              {Math.min(currentPage * itemsPerPage, sortedAppointments.length)}
            </strong>{' '}
            de <strong className="font-semibold">{sortedAppointments.length}</strong> citas
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="opacity-70">Ver:</span>
            <div className="w-[80px]">
              <SearchableDropdown
                value={String(itemsPerPage)}
                onChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
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
                borderColor={cardBorder}
                searchable={false}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ borderColor: cardBorder }}
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-[11px] font-semibold opacity-95">
              Página {currentPage} de {totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ borderColor: cardBorder }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* STYLES PARA SCROLLBAR Y RESIZER */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
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
        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }
        .resizer:hover,
        .resizer:active {
          background-color: ${primary};
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};