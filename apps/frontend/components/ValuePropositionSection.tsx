// ==========================================
// ARCHIVO: components/ValuePropositionSection.tsx
// ==========================================
'use client';

import React from 'react';
import Image from 'next/image';
import AnimatedSection from '@/components/AnimatedSection';

interface ValuePropositionProps {
  textColorClass: string;
  mutedTextColorClass: string;
  primaryColor: string;
  backgroundCardBg?: string;
}

export default function ValuePropositionSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
  backgroundCardBg,
}: ValuePropositionProps) {
  return (
    <AnimatedSection
      as="section"
      className="w-full py-32 relative z-10 overflow-hidden"
    >
      {/* 🔥 GRADIENTE de fondo (sutil, con el color primario del tenant) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${primaryColor}08 15%, ${primaryColor}12 50%, ${primaryColor}08 85%, transparent 100%)`,
        }}
      />

      {/* 🔥 SEGUNDO gradiente: radial difuso detrás del contenido */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryColor}15 0%, transparent 60%)`,
        }}
      />

      {/* Luz ambiental de fondo */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px] opacity-5 pointer-events-none transition-all"
        style={{ 
          backgroundColor: primaryColor,
          maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)'
        }}
      />

      {/* Contenedor expandido al ancho máximo */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 relative z-10">
        
        {/* Encabezado con tipografía original */}
        <AnimatedSection
          as="div"
          delay={100}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span 
            className="text-xs font-bold uppercase tracking-[0.25em] block mb-3"
            style={{ color: primaryColor }}
          >
            El poder de tu propia marca
          </span>
          <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight ${textColorClass}`}>
            No eres un <span className="line-through opacity-60">vendedor más</span> en un catálogo gigante. Eres dueño de tu espacio.
          </h2>
          <p className={`text-sm sm:text-base ${mutedTextColorClass} mt-4 leading-relaxed font-light`}>
            Los grandes marketplaces te tratan como una simple línea en una base de datos. En <strong style={{ color: primaryColor }}>facilito</strong>, cada tienda respira la identidad única de su creador.
          </p>
        </AnimatedSection>
        {/* 🔥 IMAGEN DECORATIVA: mujer apuntando hacia abajo */}
        <AnimatedSection
          as="div"
          delay={180}
          className="flex flex-col items-center mb-8 lg:mb-12 -mt-4 lg:-mt-8"
        >
          <div className="relative w-[280px] sm:w-[340px] lg:w-[420px] xl:w-[480px] aspect-square">
            <Image
              src="/images/women-point-down.webp"
              alt="Señalando las opciones"
              fill
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 420px, (min-width: 640px) 340px, 280px"
              quality={90}
              className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)] select-none pointer-events-none"
              priority={false}
            />
          </div>

          {/* 🔥 BADGE con subtítulo y CTA - mismo estilo que el testimonio del hero */}
          <div 
            className="relative z-20 -mt-8 sm:-mt-10 lg:-mt-12 backdrop-blur-xl border px-8 sm:px-12 py-5 sm:py-6 rounded-2xl shadow-2xl flex flex-col items-center text-center transition-colors duration-500 min-w-[300px] sm:min-w-[380px] max-w-[420px]"
            style={{ 
              backgroundColor: backgroundCardBg || 'rgba(255,255,255,0.06)',
              borderColor: `${primaryColor}40`,
              boxShadow: `0 20px 40px -10px ${primaryColor}30`
            }}
          >
            {/* LABEL SUPERIOR */}
            <span 
              className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1"
              style={{ color: primaryColor }}
            >
              Compará las opciones
            </span>

            {/* TÍTULO PRINCIPAL */}
            <h3 className={`text-base sm:text-lg font-black tracking-tight leading-tight mb-1 ${textColorClass}`}>
              La diferencia se ve en cada detalle
            </h3>

            {/* SUBTÍTULO */}
            <p className={`text-xs sm:text-sm font-light leading-relaxed mb-4 ${mutedTextColorClass}`}>
              Mientras otros te esconden entre miles, aquí tu marca es la protagonista.
            </p>

            {/* CTA - mini botón */}
            <button
              type="button"
              onClick={() => {
                const element = document.querySelector('#how-it-works');
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: `${primaryColor}20`,
                color: primaryColor,
                border: `1px solid ${primaryColor}40`,
              }}
            >
              Descubrí cómo funciona
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </AnimatedSection>
        {/* Columnas principales perfectamente simétricas usando todo el ancho */}
        <AnimatedSection
          as="div"
          delay={250}
          className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch"
        >
          {/* Divisor vertical exactamente centrado */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10 -translate-x-1/2 pointer-events-none" />

          {/* Columna Izquierda: Marketplaces tradicionales */}
          <div className="flex flex-col justify-between py-6 text-center lg:px-8">
            <div>
              <div className="flex flex-col items-center justify-center space-y-3 mb-8">
                <span className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-base shadow-sm">
                  ✕
                </span>
                <h3 className={`text-xl font-bold ${textColorClass}`}>
                  Marketplaces tradicionales
                </h3>
              </div>
              
              <ul className={`space-y-6 text-sm ${mutedTextColorClass} font-light max-w-md mx-auto`}>
                <li className="min-h-[48px] flex items-center justify-center leading-relaxed">
                  Tu tienda luce idéntica a la de otros miles de competidores anónimos.
                </li>
                <li className="min-h-[48px] flex items-center justify-center leading-relaxed">
                  El cliente recuerda la plataforma masiva, nunca el nombre de tu local.
                </li>
                <li className="min-h-[48px] flex items-center justify-center leading-relaxed">
                  Comisiones elevadas que asfixian el margen del pequeño comerciante.
                </li>
              </ul>
            </div>

            <div className="mt-12 pt-6 border-t border-white/5 text-xs">
              <span className="font-semibold opacity-40 uppercase tracking-widest block text-center">
                Modelo corporativo anónimo
              </span>
            </div>
          </div>

          {/* Columna Derecha: Tu tienda en facilitó */}
          <div className="flex flex-col justify-between py-6 text-center lg:px-8">
            <div>
              <div className="flex flex-col items-center justify-center space-y-3 mb-8">
                <div 
                  className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base shadow-sm"
                >
                  ✓
                </div>
                <h3 className={`text-xl font-bold ${textColorClass}`}>
                  Tu tienda en <span style={{ color: primaryColor }}>facilito</span>
                </h3>
              </div>

              <ul className={`space-y-6 text-sm ${textColorClass} font-light max-w-lg mx-auto px-4`}>
                <li className="min-h-[48px] flex items-center justify-center leading-relaxed text-center">
                  Paleta de colores, logotipo y estilo visual adaptado 100% a tu marca personal.
                </li>
                <li className="min-h-[48px] flex items-center justify-center leading-relaxed text-center">
                  <span>Tus clientes entran a&nbsp;<strong className="font-semibold">tutienda.com</strong>&nbsp;y sienten que están en tu local propio.</span>
                </li>
                <li className="min-h-[48px] flex items-center justify-center leading-relaxed text-center">
                  Control total de tus clientes, citas y pedidos por WhatsApp o pasarela directa.
                </li>
              </ul>
            </div>

            <div className="mt-12 pt-6 border-t border-white/10 text-xs">
              <span className="font-bold uppercase tracking-wider block text-center" style={{ color: primaryColor }}>
                Orgullo de marca local
              </span>
            </div>
          </div>

        </AnimatedSection>

      </div>
    </AnimatedSection>
  );
}