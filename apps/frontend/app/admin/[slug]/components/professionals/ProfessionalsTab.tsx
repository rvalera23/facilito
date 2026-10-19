// frontend/app/admin/[slug]/components/professionals/ProfessionalsTab.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useProfessionals } from '../../hooks/useProfessionals';
import { apiFetch } from '@/lib/api';
import { formatPhoneNumber } from '@/lib/formatPhone';
import ProfessionalList from './ProfessionalList';
import ProfessionalForm from './ProfessionalForm';
import ProfessionalSchedule from './ProfessionalSchedule';
import ProfessionalServices from './ProfessionalServices';
import { CreateProfessionalDto, ProfessionalsTabProps } from './types';
import { useToast } from '@/components/ui/useToast';
export default function ProfessionalsTab({
  tenantId,
  tenantSlug,
  primary,
  secondary,
  textColor,
  isDarkBg,
  getImageUrl,
}: ProfessionalsTabProps) {
  const { showToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'schedule' | 'services'>('info');

  const {
    professionals,
    loading,
    error,
    fetchProfessionals,
    createProfessional,
    createWithUser,
    updateProfessional,
    deleteProfessional,
  } = useProfessionals(tenantId);

  // Estado local para el profesional en edición (para schedule y services)
  const [tempProfessional, setTempProfessional] = useState<any>(null);

  // 🔥 Servicios disponibles del tenant (para asignar al profesional)
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setServicesLoading(true);
    (async () => {
      try {
        const res = await apiFetch(`/services/tenant/${tenantId}`);
        if (!res.ok) {
          console.warn(`⚠️ [ProfessionalsTab] No se pudieron cargar servicios (${res.status})`);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.items || [];
        if (!cancelled) {
          setAvailableServices(list);
          console.log(`✅ [ProfessionalsTab] ${list.length} servicios cargados`);
        }
      } catch (err) {
        console.error('❌ [ProfessionalsTab] Error cargando servicios:', err);
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handleCreate = async (data: CreateProfessionalDto & { email?: string; phone?: string; password?: string }) => {
    try {
      // 🔥 Si viene email, creamos profesional CON login (createWithUser).
      // Si no, caemos al flujo viejo (createProfessional sin login).
      if (data.email) {
        await createWithUser({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          password: data.password || null,
          description: data.description,
          specialties: data.specialties,
          tenantId,   // ← Fase P2: vincular al tenant actual
        });
      } else {
        await createProfessional(data);
      }
      setIsFormOpen(false);
      showToast({
        variant: 'success',
        message: 'Profesional creado correctamente.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Error al crear profesional',
      });
    }
  };

  const handleUpdate = async (
    data: CreateProfessionalDto & {
      password?: string;
      avatarFile?: File | null;
      notes?: string;
    }
  ) => {
    if (!editingProfessional) return;
    try {
      // 1. Update normal (datos del profesional + notas)
      await updateProfessional({
        id: editingProfessional.id,
        name: data.name,
        description: data.description,
        specialties: data.specialties,
        isActive: data.isActive,
        phone: (data as any).phone,
        notes: (data as any).notes,
      } as any);

      // 2. Si viene avatar, subirlo
      if (data.avatarFile) {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('avatar', data.avatarFile);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/professionals/${editingProfessional.id}/avatar`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          },
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Error al subir el avatar');
        }
      }

      // 3. Si viene password, cambiar
      if (data.password && data.password.trim().length > 0) {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/professionals/${editingProfessional.id}/password`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ password: data.password }),
          },
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Error al cambiar la contraseña');
        }
      }

      setEditingProfessional(null);
      setIsFormOpen(false);
      showToast({
        variant: 'success',
        message: data.password
          ? 'Profesional y contraseña actualizados correctamente.'
          : 'Profesional actualizado correctamente.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Error al actualizar profesional',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfessional(id);
      showToast({
        variant: 'success',
        message: 'Profesional eliminado correctamente.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar profesional',
      });
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    const professional = professionals.find(p => p.id === id);
    if (!professional) return;
    try {
      await updateProfessional({
        id,
        isActive,
        name: professional.name,
      });
      showToast({
        variant: 'success',
        message: isActive
          ? 'Profesional activado correctamente.'
          : 'Profesional desactivado correctamente.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Error al cambiar estado',
      });
    }
  };

  const handleScheduleChange = async (schedule: Record<string, any>) => {
    if (!editingProfessional) return;
    try {
      const updated = await updateProfessional({
        id: editingProfessional.id,
        schedule,
      });
      setEditingProfessional(updated);
      showToast({
        variant: 'success',
        message: 'Horario actualizado correctamente.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Error al actualizar horario',
      });
    }
  };

  const handleServicesChange = async (serviceIds: string[]) => {
    if (!editingProfessional) return;
    try {
      const updated = await updateProfessional({
        id: editingProfessional.id,
        serviceIds,
      });
      setEditingProfessional(updated);
      showToast({
        variant: 'success',
        message: 'Servicios actualizados correctamente.',
      });
    } catch (err) {
      showToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Error al actualizar servicios',
      });
    }
  };

  const handleEditProfessional = (professional: any) => {
    setEditingProfessional(professional);
    setActiveSubTab('info');
    setIsFormOpen(true);
  };

  const handleViewProfessional = (professional: any) => {
    setEditingProfessional(professional);
    setActiveSubTab('info');
    setIsFormOpen(true);
  };

  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  if (!tenantId) {
    return (
      <div className="p-6 rounded-3xl border shadow-xl text-center" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}>
        <p className="text-sm opacity-60">No hay un tenant asociado</p>
      </div>
    );
  }

  // Si estamos viendo un profesional en detalle (no en el formulario de creación)
  const isViewingProfessional = editingProfessional && !isFormOpen;

  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        color: textColor,
      }}
    >
      {/* Header */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: cardBorder }}>
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
            Gestión de Profesionales
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            {professionals.length} profesionales registrados
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProfessional(null);
            setActiveSubTab('info');
            setIsFormOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center gap-2"
          style={{ backgroundColor: primary }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Profesional
        </button>
      </div>

      {/* Lista */}
      <ProfessionalList
        professionals={professionals}
        loading={loading}
        onEdit={handleEditProfessional}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />

      {/* Formulario de creación/edición */}
      <ProfessionalForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProfessional(null);
        }}
        onSave={editingProfessional ? handleUpdate : handleCreate}
        professional={editingProfessional}
        loading={loading}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />

      {/* Panel de detalle del profesional (Schedule y Services) - se muestra al hacer clic en un profesional */}
      {isViewingProfessional && (
        <div className="mt-6 border-t pt-6" style={{ borderColor: cardBorder }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm" style={{ color: textColor }}>
              {editingProfessional.name}
            </h4>
            <button
              onClick={() => setEditingProfessional(null)}
              className="text-[10px] px-3 py-1.5 rounded-xl border transition hover:opacity-80"
              style={{ borderColor: cardBorder, color: textColor }}
            >
              Cerrar detalles
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'schedule', label: 'Horarios' },
              { id: 'services', label: 'Servicios' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                  activeSubTab === tab.id
                    ? 'text-white shadow-sm'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: activeSubTab === tab.id ? primary : 'transparent',
                  borderColor: activeSubTab === tab.id ? 'transparent' : cardBorder,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido del sub-tab */}
          {activeSubTab === 'schedule' && (
            <ProfessionalSchedule
              schedule={editingProfessional.schedule || {}}
              onScheduleChange={handleScheduleChange}
              primary={primary}
              secondary={secondary}
              textColor={textColor}
              isDarkBg={isDarkBg}
            />
          )}

          {activeSubTab === 'services' && (
            <ProfessionalServices
              professionalId={editingProfessional.id}
              serviceIds={editingProfessional.serviceIds || []}
              onServiceIdsChange={handleServicesChange}
              availableServices={availableServices}
              loading={servicesLoading}
              primary={primary}
              secondary={secondary}
              textColor={textColor}
              isDarkBg={isDarkBg}
            />
          )}
        </div>
      )}
    </div>
  );
}