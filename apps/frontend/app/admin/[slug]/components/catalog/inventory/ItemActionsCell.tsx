'use client';

import React, { useState } from 'react';

interface ItemActionsCellProps {
  item: any;
  onPreview: (item: any) => void;
  onEdit?: (item: any) => void;
  onTogglePublish?: (item: any) => void;
  onDelete: (item: any) => void;
  textColor?: string;
  isDarkBg?: boolean;
  borderDynamic?: string;
  onNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onShowHistory?: (item: any) => void;
}

export const ItemActionsCell: React.FC<ItemActionsCellProps> = ({
  item,
  onPreview,
  onEdit,
  onTogglePublish,
  onDelete,
  textColor = 'inherit',
  isDarkBg = true,
  borderDynamic = 'rgba(255, 255, 255, 0.1)',
  onNotification,
  onShowHistory,
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const isPublished = item.status === 'published' || item.isActive === true;

const handleTogglePublish = async (e: React.MouseEvent) => {
  e.stopPropagation();
  
  if (!onTogglePublish) return;
  if (isToggling) return;

  setIsToggling(true);

  try {
    const newStatus = isPublished ? 'draft' : 'published';
    
    // 🔥 MANTENER TODOS LOS CAMPOS DEL PRODUCTO, INCLUYENDO IVA
    const updatedItem = {
      ...item,
      status: newStatus,
      isActive: newStatus === 'published',
      // 🔥 Asegurar que IVA se mantiene
      ivaType: item.ivaType || item.attributes?.ivaType || 'excluded',
      ivaRate: Number(item.ivaRate || item.attributes?.ivaRate || 16),
      // 🔥 Asegurar que attributes mantiene IVA
      attributes: {
        ...(item.attributes || {}),
        ivaType: item.ivaType || item.attributes?.ivaType || 'excluded',
        ivaRate: Number(item.ivaRate || item.attributes?.ivaRate || 16),
      }
    };

    await onTogglePublish(updatedItem);

    const statusLabel = newStatus === 'published' ? 'publicado' : 'borrador';
    const message = `"${item.name || 'Artículo'}" ahora está en ${statusLabel}`;
    
    if (onNotification) {
      onNotification(message, 'success');
    }

  } catch (error) {
    const errorMessage = `Error al cambiar el estado: ${error instanceof Error ? error.message : 'Error desconocido'}`;
    
    if (onNotification) {
      onNotification(errorMessage, 'error');
    } else {
      console.error(errorMessage);
    }
  } finally {
    setIsToggling(false);
  }
};

  // 🔥 ELIMINADO EL CONFIRM DE AQUÍ - SOLO LLAMA A onDelete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isToggling) return;

    const itemId = item.id || item._id;
    if (!itemId) {
      if (onNotification) {
        onNotification('Error: No se encontró el ID del artículo', 'error');
      }
      return;
    }

    // 🔥 PASAR EL ID DIRECTAMENTE, SIN CONFIRM
    onDelete(itemId);
  };

  return (
    <div className="flex items-center justify-end gap-2" style={{ color: textColor }}>
      
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
                : 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/25 border-orange-500/30'
          }`}
          title={isPublished ? 'Cambiar a borrador' : 'Publicar artículo'}
        >
          {isToggling ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </button>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-blue-400 bg-blue-500/10 hover:bg-blue-500/25 border-blue-500/30"
          title="Modificar artículo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview(item); }}
        className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-purple-400 bg-purple-500/10 hover:bg-purple-500/25 border-purple-500/30"
        title="Ver vista previa del cliente"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>

      {onShowHistory && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onShowHistory(item); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/25 border-cyan-500/30"
          title="Ver historial de stock"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isToggling}
        className={`w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-red-400 bg-red-500/10 hover:bg-red-500/25 border-red-500/30 ${
          isToggling ? 'opacity-50 cursor-wait' : ''
        }`}
        title="Mover a papelera"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

    </div>
  );
};

export default ItemActionsCell;