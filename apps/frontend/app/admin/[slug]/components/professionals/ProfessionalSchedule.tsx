// frontend/app/admin/[slug]/components/professionals/ProfessionalServices.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Check, X, Users } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category?: string;
  price?: number;
  durationMinutes?: number;
}

interface ProfessionalServicesProps {
  professionalId?: string;
  serviceIds: string[];
  onServiceIdsChange: (serviceIds: string[]) => void;
  availableServices: Service[];
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  readOnly?: boolean;
}

export default function ProfessionalServices({
  professionalId,
  serviceIds = [],
  onServiceIdsChange,
  availableServices = [],
  primary,
  secondary,
  textColor,
  isDarkBg,
  readOnly = false,
}: ProfessionalServicesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(serviceIds);

  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    setSelectedIds(serviceIds);
  }, [serviceIds]);

  const toggleService = (serviceId: string) => {
    if (readOnly) return;
    const newIds = selectedIds.includes(serviceId)
      ? selectedIds.filter(id => id !== serviceId)
      : [...selectedIds, serviceId];
    setSelectedIds(newIds);
    onServiceIdsChange(newIds);
  };

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return availableServices;
    const term = searchTerm.toLowerCase().trim();
    return availableServices.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.category || '').toLowerCase().includes(term)
    );
  }, [availableServices, searchTerm]);

  const toggleAll = () => {
    if (readOnly) return;
    if (selectedIds.length === filteredServices.length && filteredServices.length > 0) {
      // Deseleccionar todos los filtrados
      const newIds = selectedIds.filter(id => !filteredServices.some(s => s.id === id));
      setSelectedIds(newIds);
      onServiceIdsChange(newIds);
    } else {
      // Seleccionar todos los filtrados
      const filteredIds = filteredServices.map(s => s.id);
      const newIds = Array.from(new Set([...selectedIds, ...filteredIds]));
      setSelectedIds(newIds);
      onServiceIdsChange(newIds);
    }
  };

  const selectedCount = selectedIds.length;
  const totalCount = availableServices.length;

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 opacity-60" />
          <span className="text-[11px] font-bold opacity-80" style={{ color: textColor }}>
            Servicios asignados
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: borderDynamic }}>
            {selectedCount} / {totalCount}
          </span>
        </div>
        {!readOnly && filteredServices.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition hover:opacity-80"
            style={{ borderColor: borderDynamic, color: primary }}
          >
            {selectedIds.length === filteredServices.length && filteredServices.length > 0
              ? 'Deseleccionar todos'
              : 'Seleccionar todos'}
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
        <input
          type="text"
          placeholder="Buscar servicios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none bg-transparent"
          style={{ borderColor: borderDynamic, color: textColor }}
        />
      </div>

      {/* Lista de servicios */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-8 opacity-50">
          <p className="text-xs">
            {searchTerm ? 'No se encontraron servicios' : 'No hay servicios disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
          {filteredServices.map((service) => {
            const isSelected = selectedIds.includes(service.id);

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service.id)}
                disabled={readOnly}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected ? 'border-2 shadow-sm' : 'opacity-70 hover:opacity-100'
                } ${readOnly ? 'cursor-default' : ''}`}
                style={{
                  borderColor: isSelected ? primary : borderDynamic,
                  backgroundColor: isSelected ? `${primary}10` : 'transparent',
                }}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 ${
                    isSelected ? 'bg-emerald-500 border-emerald-500' : ''
                  }`}
                  style={{ borderColor: isSelected ? 'transparent' : borderDynamic }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: textColor }}>
                    {service.name}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] opacity-50">
                    {service.category && <span>{service.category}</span>}
                    {service.durationMinutes && (
                      <span>• {service.durationMinutes} min</span>
                    )}
                    {service.price && (
                      <span>• ${service.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Resumen */}
      {selectedCount > 0 && (
        <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-[10px] flex items-center gap-2">
          <span className="text-emerald-500 font-bold">{selectedCount}</span>
          <span className="opacity-60">servicios seleccionados</span>
        </div>
      )}
    </div>
  );
}