'use client';

import React, { useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import KioskoTurnosRecientes from './KioskoTurnosRecientes';

interface KioskoTurnosPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  primary: string;
  secondary?: string;
  isSecondaryLight: boolean;
}

export default function KioskoTurnosPanel({
  isOpen,
  onClose,
  tenantId,
  primary,
  secondary,
  isSecondaryLight,
}: KioskoTurnosPanelProps) {
  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Bloquear scroll de fondo cuando está abierto
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const panelBg = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
  
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedColor = isSecondaryLight ? '#64748b' : '#94a3b8';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral */}
      <aside
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden"
        style={{
          backgroundColor: panelBg,
          border: `1px solid ${borderColor}`,
          color: textColor,
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Turnos recientes</h2>
              <p className="text-[11px]" style={{ color: mutedColor }}>
                Cola de turnos activos del kiosco
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-70 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
              color: textColor,
            }}
            aria-label="Cerrar panel de turnos"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body con scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <KioskoTurnosRecientes
            tenantId={tenantId}
            primary={primary}
            isSecondaryLight={isSecondaryLight}
          />
        </div>
      </aside>
    </div>
  );
}