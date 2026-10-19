  // frontend/hooks/useUndoDelete.ts
  import { useState, useRef, useCallback, useEffect } from 'react';

  interface PendingDelete<T> {
    id: string;
    item: T;
    timeoutRef: ReturnType<typeof setTimeout>;
  }

  /**
   * 🔥 Hook para eliminar con opción de "Deshacer" (estilo Gmail/Slack).
   * 
   * Uso:
   *   const { pendingDelete, softDelete, confirmDelete, undo } = useUndoDelete({ timeoutMs: 5000 });
   *   // En el botón de la papelera:
   *   softDelete(notification.id, notification, () => markAsDeletedInUI(id));
   *   // En el toast:
   *   <UndoToast show={!!pendingDelete} onUndo={undo} onDismiss={confirmDelete} />
   */
  export function useUndoDelete<T = any>(options?: { timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 5000;
    const [pendingDelete, setPendingDelete] = useState<PendingDelete<T> | null>(null);
    const onCommitRef = useRef<(() => Promise<void>) | null>(null);

    // Limpieza al desmontar
    useEffect(() => {
      return () => {
        if (pendingDelete?.timeoutRef) {
          clearTimeout(pendingDelete.timeoutRef);
        }
      };
    }, [pendingDelete]);

    /**
     * Marca como "por eliminar". Oculta el item de la UI inmediatamente
     * (con onHide), y programa el borrado real tras timeoutMs.
     */
  const softDelete = useCallback(
    (id: string, item: T, onHide?: () => void, onCommit?: () => Promise<void>) => {
      console.log('[useUndoDelete] softDelete llamado. id:', id);
      // Si había uno pendiente, confirmarlo YA
        if (pendingDelete) {
          clearTimeout(pendingDelete.timeoutRef);
          if (onCommitRef.current) {
            onCommitRef.current().catch(() => {});
          }
        }

        // Ocultar de la UI ya
        onHide?.();

        onCommitRef.current = onCommit ?? null;

        const timeoutRef = setTimeout(async () => {
          try {
            if (onCommit) await onCommit();
          } catch (e) {
            console.error('[useUndoDelete] error al confirmar:', e);
          } finally {
            setPendingDelete(null);
            onCommitRef.current = null;
          }
        }, timeoutMs);

      setPendingDelete({ id, item, timeoutRef });
      console.log('[useUndoDelete] pendingDelete seteado:', id);
    },
    [pendingDelete, timeoutMs]
  );

    /**
     * Cancela el borrado pendiente y restaura el item en la UI.
     */
    const undo = useCallback(
      (onRestore?: () => void) => {
        if (!pendingDelete) return;
        clearTimeout(pendingDelete.timeoutRef);
        setPendingDelete(null);
        onCommitRef.current = null;
        onRestore?.();
      },
      [pendingDelete]
    );

    /**
     * Confirma el borrado inmediatamente (sin esperar timeout).
     */
    const confirmDelete = useCallback(async () => {
      if (!pendingDelete) return;
      clearTimeout(pendingDelete.timeoutRef);
      try {
        if (onCommitRef.current) await onCommitRef.current();
      } catch (e) {
        console.error('[useUndoDelete] error al confirmar manual:', e);
      } finally {
        setPendingDelete(null);
        onCommitRef.current = null;
      }
    }, [pendingDelete]);

    return { pendingDelete, softDelete, undo, confirmDelete };
  }