'use client';

import React from 'react';

export function TokenModal({ 
  newGeneratedTokenModal, 
  setNewGeneratedTokenModal, 
  cardBg, 
  cardBorder, 
  textColor, 
  primary 
}: {
  newGeneratedTokenModal: any;
  setNewGeneratedTokenModal: (val: any) => void;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  primary: string;
}) {
  if (!newGeneratedTokenModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 text-center"
        style={{ 
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor 
        }}
      >
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto border"
          style={{
            backgroundColor: primary ? `${primary}15` : 'rgba(255,255,255,0.1)',
            borderColor: primary ? `${primary}30` : cardBorder,
            color: primary || textColor
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold" style={{ color: primary || textColor }}>
            ¡Terminal Creado con Éxito!
          </h3>
          <p className="text-xs opacity-80" style={{ color: textColor }}>
            Copia este token de acceso para el terminal <span className="font-bold">{newGeneratedTokenModal.name}</span>. Por seguridad, no se volverá a mostrar completo.
          </p>
        </div>

        <div className="p-3 bg-black/10 dark:bg-white/10 rounded-xl border border-black/10 dark:border-white/10 font-mono text-xs break-all select-all" style={{ color: textColor }}>
          {newGeneratedTokenModal.token}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setNewGeneratedTokenModal(null)}
            className="w-full py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition cursor-pointer"
            style={{ backgroundColor: primary || '#f97316' }}
          >
            He copiado el token
          </button>
        </div>
      </div>
    </div>
  );
}
