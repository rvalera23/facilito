// ARCHIVO: apps/frontend/app/admin/[slug]/components/catalog/inventory/ServiceActionsCell.tsx
'use client';

import React, { useState } from 'react';
interface ServiceActionsCellProps {
  item: any;
  onPreview: (item: any) => void;
  onEdit?: (item: any) => void;
  onTogglePublish?: (item: any) => void;
  onDelete: (item: any) => void;
  textColor?: string;
  isDarkBg?: boolean;
  borderDynamic?: string;
}

export const ServiceActionsCell: React.FC<ServiceActionsCellProps> = ({
  item,
  onPreview,
  onEdit,
  onTogglePublish,
  onDelete,
  textColor = 'inherit',
  isDarkBg = true,
  borderDynamic = 'rgba(255, 255, 255, 0.1)',
}) => {
  const isPublished = 
    item.status === 'published' || 
    (item.status === undefined && (item.isActive === true || item.isActive === 't' || item.isActive === '1' || item.isPublished === true || item.published === true));

  // 🔥 Verificar si es un servicio (por si acaso)
  const isService = item.itemType === 'service' || item.type === 'service' || item.attributes?.itemType === 'service';

  // 🔥 Estado local para evitar doble click
  const [isToggling, setIsToggling] = React.useState(false);

  // 🔥 Handler que SÍ cambia el estado antes de llamar a la prop
  const handleTogglePublish = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!onTogglePublish) return;
    if (isToggling) return;

    setIsToggling(true);

    try {
      // 🔥 Calcular el nuevo estado ANTES de llamar
      const newStatus = isPublished ? 'draft' : 'published';

      // 🔥 Pasar el item con el estado YA modificado
      const updatedItem = {
        ...item,
        status: newStatus,
        isActive: newStatus === 'published',
      };

      await onTogglePublish(updatedItem);
    } catch (error) {
      console.error('❌ Error al cambiar estatus del servicio:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2" style={{ color: textColor }}>
      
      {/* 1. Cambiar estatus (Publicar / Borrador) */}
      {onTogglePublish && (
        <button
          type="button"
          onClick={handleTogglePublish}
          disabled={isToggling}
          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm ${
            isToggling
              ? 'opacity-50 cursor-wait'
              : isPublished 
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/30' 
                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border-amber-500/30'
          }`}
          title={isPublished ? 'Cambiar a borrador' : 'Publicar servicio'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      )}

      {/* 2. Editar / Modificar */}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/25 border-blue-500/30"
          title="Modificar servicio"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {/* 3. Ver vista previa */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview(item); }}
        className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-purple-400 bg-purple-500/10 hover:bg-purple-500/25 border-purple-500/30"
        title="Ver vista previa del servicio"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>

      {/* 4. Eliminar */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
        className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-red-400 bg-red-500/10 hover:bg-red-500/25 border-red-500/30"
        title="Eliminar servicio"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

    </div>
  );
};

export default ServiceActionsCell;