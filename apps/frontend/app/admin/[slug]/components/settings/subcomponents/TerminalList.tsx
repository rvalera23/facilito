'use client';

import React from 'react';

interface TerminalListProps {
  terminals: any[];
  loadingTerminals: boolean;
  creatingTerminal: boolean;
  handleToggleKiosk: () => void;
  handleDeleteTerminal: (id: string) => void;
  tenantSlug?: string;
  primary: string;
  textColor: string;
  isDarkBg?: boolean;
}

export default function TerminalList({
  terminals,
  loadingTerminals,
  creatingTerminal,
  handleToggleKiosk,
  handleDeleteTerminal,
  tenantSlug,
  primary,
  textColor,
  isDarkBg = false
}: TerminalListProps) {
  const isKioskActive = terminals.length > 0 && terminals[0].isActive !== false;
  const activeTerminal = terminals.length > 0 ? terminals[0] : null;

  return (
    <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-4">
      {/* 🔥 TOGGLE CON ESTILO HEREDADO */}
      <div 
        className="p-4 rounded-2xl border flex items-center justify-between"
        style={{ 
          borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
        }}
      >
        <div className="flex items-center gap-3">
          {/* 🔥 ICONO SVG DEL KIOSCO - SIN EMOJIS */}
          <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: textColor }}>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
            <path d="M6 8h12" />
            <path d="M6 12h8" />
            <circle cx="16" cy="12" r="1.5" />
          </svg>
          <div>
            <span className="text-sm font-bold" style={{ color: textColor }}>Modo Kiosco (Autopago)</span>
            <p className="text-[10px] opacity-50" style={{ color: textColor }}>
              {isKioskActive 
                ? 'Actualmente ACTIVADO - Autopago disponible' 
                : 'Actualmente DESACTIVADO - Autopago no disponible'
              }
            </p>
          </div>
        </div>

        {/* 🔥 TOGGLE SWITCH ANIMADO - COLOR HEREDADO */}
        <button
          type="button"
          onClick={() => {
            console.log('Botón de toggle clickeado');
            handleToggleKiosk();
          }}
          disabled={creatingTerminal || loadingTerminals}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
            isKioskActive ? '' : 'bg-black/20 dark:bg-white/20'
          }`}
          style={{
            backgroundColor: isKioskActive ? primary : undefined,
          }}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              isKioskActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 🔥 ESTADO DEL KIOSCO - SIN EMOJIS */}
      {loadingTerminals ? (
        <p className="text-[11px] opacity-60" style={{ color: textColor }}>Cargando estado del kiosco...</p>
      ) : isKioskActive && activeTerminal ? (
        <div 
          className="p-3 rounded-xl border flex items-center justify-between"
          style={{ 
            borderColor: `${primary}30`,
            backgroundColor: `${primary}08`
          }}
        >
          <div>
            <p className="text-xs font-bold" style={{ color: primary }}>Modo Kiosco Activo</p>
            <p className="text-[10px] opacity-60 font-mono mt-0.5" style={{ color: textColor }}>
              Token ID: {activeTerminal.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTerminal.token && tenantSlug && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/tienda/kiosko?token=${encodeURIComponent(activeTerminal.token)}&slug=${encodeURIComponent(tenantSlug)}`;
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white transition cursor-pointer"
                style={{ backgroundColor: primary }}
              >
                Abrir kiosco
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDeleteTerminal(activeTerminal.id)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-[11px] font-bold transition cursor-pointer"
            >
              Desactivar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] opacity-60 italic" style={{ color: textColor }}>
          El modo kiosco se encuentra desactivado actualmente.
        </p>
      )}
    </div>
  );
}