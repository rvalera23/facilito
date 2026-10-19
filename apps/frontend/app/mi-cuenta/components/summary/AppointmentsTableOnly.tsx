'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import BadgeStatus from './shared/BadgeStatus';
import PriceDisplay from './shared/PriceDisplay';
import Pagination from './shared/Pagination';
import SearchInput from './shared/SearchInput';

interface AppointmentsTableOnlyProps {
  userId: string;
  appointments?: any[];
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantId?: string;
}

export default function AppointmentsTableOnly({
  userId,
  appointments = [],
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantId
}: AppointmentsTableOnlyProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const subtleBorderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // Filtrar citas - usando los datos reales
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a: any) => {
      const matchesSearch = 
        a.clientName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.serviceName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a._id?.toLowerCase().includes(searchFilter.toLowerCase());

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = a.status?.toLowerCase() === statusFilter.toLowerCase();
      }
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchFilter, statusFilter]);

  // Paginación
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(start, start + itemsPerPage);
  }, [filteredAppointments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // Filtros de estado
  const statusOptions = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'confirmed', label: 'Confirmadas' },
    { id: 'completed', label: 'Completadas' },
    { id: 'cancelled', label: 'Canceladas' },
  ];

  // Si no hay citas, mostrar mensaje
  if (appointments.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="opacity-60 text-sm" style={{ color: textColor }}>
          No tienes citas agendadas
        </div>
      </div>
    );
  }

  return (
    // 🔥 CONTENEDOR PRINCIPAL CON ALTURA CONTROLADA
    <div 
      className="border rounded-2xl shadow-xl overflow-hidden flex flex-col"
      style={{ 
        borderColor: subtleBorderColor,
        maxHeight: '600px', // Limitar altura para evitar desbordamiento
      }}
    >
      {/* Filtros - Fijo en la parte superior */}
      <div className="p-3 border-b flex flex-wrap gap-1 items-center flex-shrink-0" style={{ borderColor: subtleBorderColor }}>
        <div className="flex flex-wrap gap-1 flex-1">
          {statusOptions.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setStatusFilter(id as any);
                setCurrentPage(1);
              }}
              className={`text-[10px] font-medium px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                statusFilter === id ? 'text-white' : 'opacity-50 hover:opacity-100 hover:bg-white/5'
              }`}
              style={{ backgroundColor: statusFilter === id ? primary : 'transparent' }}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput
          value={searchFilter}
          onChange={(value) => {
            setSearchFilter(value);
            setCurrentPage(1);
          }}
          placeholder="Buscar cita..."
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
        />
      </div>

      {/* 🔥 TABLA CON SCROLL HORIZONTAL Y VERTICAL */}
      <div 
        className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"
        style={{ maxHeight: 'calc(600px - 120px)' }} // Ajustar altura restando filtros + paginación
      >
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr
              className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none sticky top-0 z-10"
              style={{
                borderColor: subtleBorderColor,
                backgroundColor: isDarkBg ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)',
              }}
            >
              <th className="py-2.5 px-3 pl-4 whitespace-nowrap">ID</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Cliente</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Servicio</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Fecha/Hora</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Total</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Estado</th>
            </tr>
          </thead>
          <tbody className="text-xs" style={{ borderColor: subtleBorderColor }}>
            {paginatedAppointments.length > 0 ? (
              paginatedAppointments.map((a: any, idx: number) => {
                const appointmentDate = a.date || a.appointmentDate || a.createdAt;
                const formattedDate = appointmentDate
                  ? new Date(appointmentDate).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Fecha no disponible';

                return (
                  <tr
                    key={a.id || a._id || idx}
                    style={{ borderBottom: `1px solid ${subtleBorderColor}` }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-3 pl-4 font-mono text-[11px] font-bold" style={{ color: textColor }}>
                      #{a.id?.slice(0, 8) || a._id?.slice(0, 8) || idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[11px]" style={{ color: textColor }}>
                      {a.clientName || a.client?.name || a.user?.name || 'Cliente'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px]" style={{ color: textColor }}>
                      {a.serviceName || a.service?.name || a.title || 'Servicio'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] opacity-70" style={{ color: textColor }}>
                      {formattedDate}
                    </td>
                    <td className="py-2.5 px-3">
                      <PriceDisplay 
                        amountVes={a.priceVes || a.totalVes || 0} 
                        amountUsd={a.price || a.total || 0} 
                        primary={primary} 
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <BadgeStatus status={a.status || 'pending'} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center opacity-60 font-medium">
                  No hay citas para mostrar con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación - Fija en la parte inferior */}
      <div className="flex-shrink-0">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAppointments.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
          isDarkBg={isDarkBg}
          primary={primary}
        />
      </div>

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
        /* 🔥 Ocultar scroll cuando no es necesario */
        .custom-scrollbar {
          scrollbar-width: thin;
        }
      `}</style>
    </div>
  );
}