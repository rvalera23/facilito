// frontend/app/admin/[slug]/components/professionals/ProfessionalList.tsx

'use client';

import React, { useState } from 'react';
import { User, Star, X, CheckCircle2, AlertCircle, Edit, Trash2, Users } from 'lucide-react';
import { Professional } from './types';

interface ProfessionalListProps {
  professionals: Professional[];
  loading: boolean;
  onEdit: (professional: Professional) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

const getStatusBadge = (isActive: boolean) => {
  if (isActive) {
    return {
      label: 'Activo',
      bg: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />
    };
  }
  return {
    label: 'Inactivo',
    bg: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
    icon: <AlertCircle className="w-3 h-3" />
  };
};

export default function ProfessionalList({
  professionals,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: ProfessionalListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = professionals.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.specialties || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar profesional por nombre, especialidad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-xs outline-none bg-transparent"
          style={{ borderColor: borderDynamic, color: textColor }}
        />
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 opacity-60">
          <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay profesionales registrados</p>
          <p className="text-xs opacity-50 mt-1">Crea tu primer profesional para comenzar</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: borderDynamic }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75" style={{ borderColor: borderDynamic, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)' }}>
                <th className="py-3 px-4">Profesional</th>
                <th className="py-3 px-4">Especialidades</th>
                <th className="py-3 px-4">Servicios</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.map((professional) => {
                const status = getStatusBadge(professional.isActive);
                const serviceCount = professional.serviceIds?.length || 0;

                return (
                  <tr key={professional.id} className="border-b hover:bg-white/5 transition" style={{ borderColor: borderDynamic }}>
                    <td className="py-3 px-4">
                      <div className="font-medium" style={{ color: textColor }}>
                        {professional.name}
                      </div>
                      {professional.description && (
                        <div className="text-[10px] opacity-60 truncate max-w-[200px]">
                          {professional.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(professional.specialties || []).slice(0, 3).map((spec, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full text-[9px] font-medium border" style={{ borderColor: borderDynamic }}>
                            {spec}
                          </span>
                        ))}
                        {(professional.specialties || []).length > 3 && (
                          <span className="text-[9px] opacity-50">+{(professional.specialties || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 opacity-40" />
                        {serviceCount} servicios
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold border flex items-center gap-1 w-fit ${status.bg}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onToggleStatus(professional.id, !professional.isActive)}
                          className={`p-1.5 rounded-lg transition ${professional.isActive ? 'hover:bg-gray-500/20 text-gray-500' : 'hover:bg-emerald-500/20 text-emerald-500'}`}
                          title={professional.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {professional.isActive ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onEdit(professional)}
                          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-500 transition"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar a "${professional.name}"?`)) {
                              onDelete(professional.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}