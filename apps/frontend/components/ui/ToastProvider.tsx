'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast, type ToastVariant, type ToastAction } from './Toast';
import { useToastTheme } from './ToastThemeProvider';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (data: Omit<ToastData, 'id'>) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

// 🔥 Máximo de toasts visibles simultáneamente
const MAX_VISIBLE_TOASTS = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // 🔥 Captura el theme del ToastThemeProvider MÁS CERCANO al toast que se dispara.
  //    Como el hook se llama dentro del ToastProvider (que está fuera del ToastThemeProvider
  //    del admin), vamos a leer el theme del DOM en el momento del showToast.
  //    Alternativa: pasar el theme como argumento al showToast.
  const theme = useToastTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = useCallback(
    (data: Omit<ToastData, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 🔥 Capturar el theme en el momento del disparo (no en el render del provider)
      //    Esto permite que cada toast use el theme del contexto más cercano.
      const capturedTheme = theme;

      setToasts((prev) => {
        const next = [
          ...prev,
          {
            ...data,
            id,
            // @ts-ignore — campo interno, no expuesto en la interface pública
            _theme: capturedTheme,
          },
        ];
        if (next.length > MAX_VISIBLE_TOASTS) {
          return next.slice(next.length - MAX_VISIBLE_TOASTS);
        }
        return next;
      });

      return id;
    },
    [theme],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast, dismissAll }),
    [showToast, dismissToast, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isMounted &&
        createPortal(
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] flex flex-col items-center gap-2 pointer-events-none px-4"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((toast: any) => {
              // 🔥 Usar el theme capturado al disparar (fallback al theme del provider)
              const t = toast._theme || theme;
              return (
                <Toast
                  key={toast.id}
                  variant={toast.variant}
                  message={toast.message}
                  action={toast.action}
                  duration={toast.duration}
                  onDismiss={() => dismissToast(toast.id)}
                  primary={t.primary}
                  textColor={t.textColor}
                  cardBg={t.cardBg}
                  borderColor={t.borderColor}
                  isDarkBg={t.isDarkBg}
                />
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}