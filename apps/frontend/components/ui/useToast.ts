'use client';

import { useContext } from 'react';
import { ToastContext } from './ToastProvider';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      'useToast debe usarse dentro de un <ToastProvider>. ' +
        'Asegurate de montarlo en app/layout.tsx.'
    );
  }
  return ctx;
}