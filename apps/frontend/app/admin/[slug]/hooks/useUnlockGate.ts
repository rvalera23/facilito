'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// 🔥 HOOK: Control de acceso a secciones protegidas por PIN
// ============================================================
// Gestiona el "desbloqueo" de una sección protegida por PIN.
// El desbloqueo vive en sessionStorage (se pierde al cerrar la pestaña).
// Cada desbloqueo tiene un TTL (time to live) en minutos.
//
// Uso:
//   const { isUnlocked, unlock, lock, checkAccess } = useUnlockGate({
//     sectionKey: 'settings',
//     tenantId: tenant.id,
//     ttlMinutes: 15,
//   });
//
//   // Antes de navegar a la sección:
//   if (needsPin && !isUnlocked) {
//     openPinModal(); // el modal llama a unlock() al verificar OK
//   }

interface UseUnlockGateOptions {
  /** Identificador único de la sección (ej: 'settings', 'branding') */
  sectionKey: string;
  /** ID del tenant para aislar el storage por negocio */
  tenantId?: string;
}

interface UnlockPayload {
  /** Timestamp (ms) en que se desbloqueó */
  unlockedAt: number;
}

const STORAGE_KEY_PREFIX = 'section_unlock_';

export function useUnlockGate({
  sectionKey,
  tenantId,
}: UseUnlockGateOptions) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${tenantId || 'default'}_${sectionKey}`;

  // 🔥 Leer el estado del sessionStorage
  // ⚠️ Sin TTL: el desbloqueo dura toda la sesión (sessionStorage).
  // Se borra al cerrar la pestaña, al cerrar sesión, o manualmente con lock().
  const readUnlockState = useCallback((): UnlockPayload | null => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed: UnlockPayload = JSON.parse(raw);
      if (!parsed?.unlockedAt) return null;

      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  // 🔥 Verificar el estado al montar
  // Sin TTL, no hace falta re-chequear cada minuto.
  useEffect(() => {
    setIsMounted(true);

    const payload = readUnlockState();
    setIsUnlocked(!!payload);
  }, [readUnlockState]);

  // 🔥 Desbloquear
  const unlock = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const payload: UnlockPayload = { unlockedAt: Date.now() };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      setIsUnlocked(true);
    } catch {
      // Si falla el storage, al menos desbloqueamos en memoria
      setIsUnlocked(true);
    }
  }, [storageKey]);

  // 🔥 Bloquear manualmente (por ejemplo, al cerrar sesión)
  const lock = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Silencioso
    }
    setIsUnlocked(false);
  }, [storageKey]);

  // 🔥 Utilidad: chequeo sincrónico (para usar antes de decidir si abrir el modal)
  const checkAccess = useCallback((): boolean => {
    return !!readUnlockState();
  }, [readUnlockState]);

  return {
    isUnlocked,
    isMounted,
    unlock,
    lock,
    checkAccess,
  };
}