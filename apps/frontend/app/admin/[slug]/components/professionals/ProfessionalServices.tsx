// frontend/app/admin/[slug]/components/professionals/ProfessionalServices.tsx

'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Clock, DollarSign } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price?: number;
  durationMinutes?: number;
  serviceModality?: string | null;
  itemId?: string | null;
}

interface ProfessionalServicesProps {
  professionalId: string;
  serviceIds: string[];
  availableServices: Service[];
  onServiceIdsChange: (serviceIds: string[]) => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  loading?: boolean;
}

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'En el local',
  domicilio: 'A domicilio',
  ambos: 'Local + domicilio',
};

export default function ProfessionalServices({
  professionalId,
  serviceIds,
  availableServices,
  onServiceIdsChange,
  primary,
  secondary,
  textColor,
  isDarkBg,
  loading = false,
}: ProfessionalServicesProps) {
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const itemBg = isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  const selectedCount = useMemo(
    () => serviceIds.filter((id) => availableServices.some((s) => s.id === id)).length,
    [serviceIds, availableServices],
  );

  const handleToggle = (serviceId: string) => {
    const isSelected = serviceIds.includes(serviceId);
    const newServiceIds = isSelected
      ? serviceIds.filter((id) => id !== serviceId)
      : [...serviceIds, serviceId];
    onServiceIdsChange(newServiceIds);
  };

  if (loading) {
    return (
      <div
        className="p-6 rounded-xl border text-center"
        style={{ borderColor: cardBorder, color: textColor }}
      >
        <div className="flex items-center justify-center gap-2">
          <div
            className="w-4 h-4 border-2 border-transparent rounded-full animate-spin"
            style={{ borderTopColor: primary, borderRightColor: primary }}
          />
          <span className="text-xs opacity-60">Cargando servicios...</span>
        </div>
      </div>
    );
  }

  if (!availableServices || availableServices.length === 0) {
    return (
      <div
        className="p-6 rounded-xl border text-center"
        style={{ borderColor: cardBorder, color: textColor, backgroundColor: itemBg }}
      >
        <p className="text-xs font-medium opacity-70">
          No hay servicios disponibles en esta tienda.
        </p>
        <p className="text-[10px] opacity-50 mt-1">
          Creá un servicio en Catálogo → Servicios primero.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header con contador */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-xs font-bold" style={{ color: textColor }}>
            Servicios asignados
          </h4>
          <p className="text-[10px] opacity-60" style={{ color: textColor }}>
            {selectedCount} de {availableServices.length} seleccionados
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onServiceIdsChange(availableServices.map((s) => s.id))}
            className="text-[10px] font-bold px-2 py-1 rounded-lg border transition hover:opacity-80"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onServiceIdsChange([])}
            className="text-[10px] font-bold px-2 py-1 rounded-lg border transition hover:opacity-80 opacity-60"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            Ninguno
          </button>
        </div>
      </div>

      {/* Grid de servicios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {availableServices.map((service) => {
          const isSelected = serviceIds.includes(service.id);
          const modalityLabel = service.serviceModality
            ? MODALITY_LABELS[service.serviceModality] || service.serviceModality
            : null;

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => handleToggle(service.id)}
              className="p-3 rounded-xl border-2 text-left transition cursor-pointer hover:opacity-90"
              style={{
                borderColor: isSelected ? primary : cardBorder,
                backgroundColor: isSelected ? `${primary}10` : itemBg,
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    borderColor: isSelected ? primary : cardBorder,
                    backgroundColor: isSelected ? primary : 'transparent',
                  }}
                >
                  {isSelected && (
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold truncate"
                    style={{ color: textColor }}
                  >
                    {service.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {service.durationMinutes != null && (
                      <span
                        className="text-[9px] flex items-center gap-0.5 opacity-60"
                        style={{ color: textColor }}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {service.durationMinutes} min
                      </span>
                    )}
                    {service.price != null && service.price > 0 && (
                      <span
                        className="text-[9px] flex items-center gap-0.5"
                        style={{ color: primary }}
                      >
                        <DollarSign className="w-2.5 h-2.5" />
                        {service.price.toFixed(2)}
                      </span>
                    )}
                    {modalityLabel && (
                      <span
                        className="text-[9px] opacity-50"
                        style={{ color: textColor }}
                      >
                        · {modalityLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div
          className="p-2.5 rounded-lg border flex items-center gap-2"
          style={{
            borderColor: `${primary}40`,
            backgroundColor: `${primary}08`,
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: primary }} />
          <p className="text-[10px] font-medium" style={{ color: textColor }}>
            Este profesional puede atender {selectedCount} servicio(s).
          </p>
        </div>
      )}
    </div>
  );
}
