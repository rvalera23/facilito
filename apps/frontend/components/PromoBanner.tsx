// ==========================================
// ARCHIVO: components/PromoBanner.tsx (APARICIÓN A LOS 10 SEGUNDOS)
// ==========================================
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isLight, setIsLight] = useState<boolean>(false);

  useEffect(() => {
    // Temporizador de 10 segundos (10000 ms) para mostrar el banner
    const timer = setTimeout(() => {
      setIsRendered(true);
      // Pequeño timeout para activar la transición de opacidad
      requestAnimationFrame(() => setIsVisible(true));
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkBackgroundBrightness = () => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      if (bgColor) {
        let hex = bgColor.replace('#', '');
        if (hex.length === 3) {
          hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6) {
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setIsLight(brightness > 140);
        }
      }
    };

    checkBackgroundBrightness();
    const observer = new MutationObserver(checkBackgroundBrightness);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  if (!isRendered) return null;

  const bannerBg = isLight ? 'bg-white/80 border-slate-200' : 'bg-black/40 border-white/10';
  const textColor = isLight ? 'text-slate-900' : 'text-white';
  const mutedTextColor = isLight ? 'text-slate-600' : 'text-slate-300';
  const badgeBg = isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/15';

  return (
    <div 
      className={`w-full ${bannerBg} px-4 py-2.5 text-xs sm:text-sm font-medium text-center relative z-40 flex items-center justify-between border-b shadow-sm transition-[opacity,transform,max-height] duration-700 ease-in-out ${
                isVisible ? 'opacity-100 translate-y-0 max-h-20' : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden py-0 border-b-0'
      }`}
    >
      {/* Espacio izquierdo para equilibrar simetría */}
      <div className="hidden sm:block w-6"></div>

      {/* Contenido Central */}
      <div className="flex items-center justify-center space-x-2.5 sm:space-x-3 mx-auto flex-wrap gap-y-1">
        
        {/* Logo de Cachea con contenedor adaptado */}
        <div className={`inline-flex items-center ${badgeBg} px-2.5 py-1 rounded-xl shadow-xs border`}>
                    <Image
            src="https://cdn.prod.website-files.com/632db6924fcc7661685adfa8/664776c9b680e021178d3a07_Logo_Cashea-p-500.png"
            alt="Cachea"
            width={100}
            height={20}
            className="h-4 sm:h-5 w-auto object-contain"
            quality={80}
          />
        </div>

        <span className={`${textColor} font-semibold tracking-tight transition-colors duration-500`}>
          ¡Próximamente disponible en{' '}
          <span className="font-black tracking-tight">
            facil<span style={{ color: 'var(--accent-color, #ea580c)' }}>i</span>to
                      </span>!
        </span>

        <span className={`hidden md:inline-block text-xs ${mutedTextColor} font-medium ${badgeBg} px-2.5 py-0.5 rounded-lg border transition-colors duration-500`}>
          ✨ Pagos y créditos sin complicaciones
        </span>
      </div>

      {/* Botón de cerrar */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className={`${mutedTextColor} hover:${textColor} p-1 rounded-lg transition cursor-pointer flex items-center justify-center`}
        title="Cerrar anuncio"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}