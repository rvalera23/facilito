'use client';

import { useCallback, useState } from 'react';

// ============================================================
// 🔥 HOOK GENÉRICO: Estado persistido en localStorage
// ============================================================
//
// Uso básico (sin validador):
//   const [isCollapsed, setIsCollapsed] = usePersistedState('sidebar_collapsed', true);
//
// Uso con validador (para valores restringidos):
//   const [tab, setTab] = usePersistedState('admin_active_tab', 'dashboard', {
//     validate: (v): v is AdminTab => VALID_ADMIN_TABS.includes(v as AdminTab),
//   });
//
// - SSR-safe: no toca localStorage en el servidor.
// - Validación opcional: si el valor guardado no pasa el validador, cae al default.
// - Único punto de escritura: el setter persiste automáticamente.
// - Acepta updaters igual que useState: setIsCollapsed(prev => !prev).

export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
  options?: {
    validate?: (value: unknown) => value is T;
    serialize?: (value: T) => string;
    deserialize?: (raw: string) => T;
  },
): [T, (value: T | ((prev: T) => T)) => void] {
  const { validate, serialize, deserialize } = options ?? {};

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return defaultValue;

      const parsed = deserialize ? deserialize(raw) : (raw as unknown);

      if (validate && !validate(parsed)) {
        return defaultValue;
      }

      return parsed as T;
    } catch {
      return defaultValue;
    }
  });

  // 🔥 Acepta tanto valor directo como updater (igual que useState).
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolved =
          typeof value === 'function'
            ? (value as (prev: T) => T)(prev)
            : value;

        if (typeof window !== 'undefined') {
          try {
            const raw = serialize ? serialize(resolved) : String(resolved);
            window.localStorage.setItem(storageKey, raw);
          } catch {
            // Silencioso: si falla, la app sigue funcionando en memoria
          }
        }

        return resolved;
      });
    },
    [storageKey, serialize],
  );

  return [state, setPersistedState];
}

// ============================================================
// 🔥 HOOK ESPECÍFICO: Pestaña activa con validación
// ============================================================
//
// Atajo sobre `usePersistedState` que valida contra una lista de tabs.

export function usePersistedActiveTab<T extends string>(
  validTabs: readonly T[],
  storageKey: string = 'admin_active_tab',
): [T, (tab: T | ((prev: T) => T)) => void] {
  return usePersistedState<T>(storageKey, validTabs[0], {
    validate: (value): value is T =>
      typeof value === 'string' && (validTabs as readonly string[]).includes(value),
  });
}