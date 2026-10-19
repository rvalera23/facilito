'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTrash } from './TrashProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';



// 🔥 TRASH MODAL PRINCIPAL
interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onRestoreItem?: (item: any) => Promise<void>;
  onDeletePermanently?: (item: any) => Promise<void>;
  onEmptyTrash?: () => Promise<void>;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onRestoreItem,
  onDeletePermanently,
  onEmptyTrash,
}) => {
  const { 
    trashItems, 
    removeFromTrash, 
    restoreFromTrash, 
    emptyTrash,
    loadTrashFromBackend,
  } = useTrash();

  const [tenantId, setTenantId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    item: any | null;
    action: 'delete' | 'empty' | null;
  }>({
    isOpen: false,
    item: null,
    action: null,
  });

  // Obtener tenantId del path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const slugIndex = pathParts.indexOf('admin') + 1;
      if (slugIndex > 0 && pathParts[slugIndex]) {
        setTenantId(pathParts[slugIndex]);
      }
    }
  }, []);

  // Cargar papelera al abrir
  useEffect(() => {
    if (isOpen && tenantId) {
      loadTrashFromBackend(tenantId);
    }
  }, [isOpen, tenantId, loadTrashFromBackend]);

  // 🔥 HANDLER: Restaurar item
  const handleRestore = useCallback(async (item: any) => {
    if (onRestoreItem) {
      await onRestoreItem(item);
    } else {
      // Lógica por defecto
      try {
        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        const response = await fetch(`${cleanBase}/products/trash/restore/${item._id || item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          restoreFromTrash(item._id || item.id);
          if (tenantId) {
            await loadTrashFromBackend(tenantId);
          }
        }
      } catch (error) {
        console.error('Error restoring item:', error);
      }
    }
  }, [onRestoreItem, restoreFromTrash, tenantId, loadTrashFromBackend]);

  // 🔥 HANDLER: Eliminar permanentemente (ABRE CONFIRM)
  const handleDeletePermanently = (item: any) => {
    setConfirmDialog({
      isOpen: true,
      item: item,
      action: 'delete',
    });
  };

  // 🔥 HANDLER: Vaciar papelera (ABRE CONFIRM)
  const handleEmptyTrash = () => {
    setConfirmDialog({
      isOpen: true,
      item: null,
      action: 'empty',
    });
  };

  // 🔥 EJECUTAR ACCIÓN CONFIRMADA
  const executeConfirmedAction = useCallback(async () => {
    const { item, action } = confirmDialog;
    
    if (!action) return;

    setIsLoading(true);
    try {
      if (action === 'delete' && item) {
        if (onDeletePermanently) {
          await onDeletePermanently(item);
        } else {
          // Lógica por defecto
          const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
          const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;
          
          const response = await fetch(`${cleanBase}/products/trash/${item._id || item.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (response.ok) {
            removeFromTrash(item._id || item.id);
            if (tenantId) {
              await loadTrashFromBackend(tenantId);
            }
          }
        }
      } else if (action === 'empty') {
        if (onEmptyTrash) {
          await onEmptyTrash();
        } else {
          // Lógica por defecto
          const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
          const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;
          
          const response = await fetch(`${cleanBase}/products/trash/empty/${tenantId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (response.ok) {
            emptyTrash();
          }
        }
      }
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ isOpen: false, item: null, action: null });
    }
  }, [confirmDialog, onDeletePermanently, onEmptyTrash, removeFromTrash, tenantId, loadTrashFromBackend, emptyTrash]);

  if (!isOpen) return null;

  const bgColor = isDarkBg ? 'bg-gray-900' : 'bg-white';
  const borderColor = isDarkBg ? 'border-gray-700' : 'border-gray-200';
  const textMainColor = isDarkBg ? 'text-white' : 'text-gray-900';
  const textMutedColor = isDarkBg ? 'text-gray-400' : 'text-gray-500';
  const itemBgColor = isDarkBg ? 'bg-gray-800/50' : 'bg-gray-50';

  return createPortal(
    <>
      {/* MODAL PRINCIPAL */}
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div 
          className={`w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col ${bgColor} ${borderColor}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${borderColor}`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <div>
                <h3 className={`text-sm font-bold ${textMainColor}`}>Papelera de productos</h3>
                <p className={`text-[10px] ${textMutedColor}`}>
                  {trashItems.length} {trashItems.length === 1 ? 'producto' : 'productos'} eliminados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {trashItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-500 hover:bg-red-500/10 transition border border-red-500/20"
                >
                  Vaciar todo
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-white/10 ${textMutedColor}`}
              >
                ✕
              </button>
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: primary }} />
              </div>
            ) : trashItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <p className={`text-sm ${textMutedColor}`}>La papelera está vacía</p>
              </div>
            ) : (
              trashItems.map((item) => (
                <div
                  key={item._id || item.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition hover:shadow-md ${itemBgColor} ${borderColor}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${textMainColor}`}>
                      {item.name || 'Producto sin nombre'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] ${textMutedColor}`}>
                        ID: {item._id || item.id}
                      </span>
                      {item.deletedAt && (
                        <span className={`text-[10px] ${textMutedColor}`}>
                          Eliminado: {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition hover:opacity-80"
                      style={{ backgroundColor: primary, color: '#ffffff' }}
                    >
                      Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePermanently(item)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-500 hover:bg-red-500/10 transition border border-red-500/20"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className={`px-6 py-3 border-t ${borderColor}`}>
            <p className={`text-[10px] ${textMutedColor}`}>
              Los productos permanecen en la papelera por 30 días antes de ser eliminados automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 CONFIRM DIALOG CON HERENCIA DE TEMAS */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
        onConfirm={executeConfirmedAction}
        title={confirmDialog.action === 'empty' ? '¿Vaciar papelera?' : '¿Eliminar permanentemente?'}
        message={
          confirmDialog.action === 'empty'
            ? 'Todos los productos serán eliminados permanentemente. Esta acción no se puede deshacer.'
            : `¿Eliminar permanentemente "${confirmDialog.item?.name || 'este producto'}"? Esta acción no se puede deshacer.`
        }
        confirmLabel={confirmDialog.action === 'empty' ? 'Vaciar todo' : 'Eliminar'}
        variant="danger"
        loading={isLoading}
        primary={primary}
        borderColor={isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
        cardBg={isDarkBg ? '#0f172a' : '#ffffff'}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    </>,
    document.body
  );
};

export default TrashModal;