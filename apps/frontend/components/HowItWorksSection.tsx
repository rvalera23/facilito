// ==========================================
// ARCHIVO: components/HowItWorksSection.tsx
// ==========================================
'use client';

import React from 'react';
import AnimatedSection from '@/components/AnimatedSection';

interface HowItWorksProps {
  textColorClass: string;
  mutedTextColorClass: string;
  primaryColor: string;
  backgroundCardBg: string;
}

export default function HowItWorksSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
}: HowItWorksProps) {
  return (
    <AnimatedSection
      as="section"
      className="w-full max-w-7xl mx-auto px-6 py-20 relative z-10 overflow-hidden"
    >
      {/* Encabezado limpio */}
      <AnimatedSection
        as="div"
        delay={100}
        className="max-w-3xl mb-20 relative z-10"
      >
        <h2 className={`text-3xl sm:text-5xl font-black tracking-tight ${textColorClass} mb-4`}>
          El ciclo de vida en <span className={textColorClass}>facil</span><span style={{ color: primaryColor }}>i</span><span className={textColorClass}>to</span>
                  </h2>
        <p className={`text-base sm:text-lg ${mutedTextColorClass} leading-relaxed font-light`}>
          Diseñado para que empezar sea tan natural como abrir la puerta de tu local. Dos movimientos clave y estás dentro.
        </p>
      </AnimatedSection>

      {/* Grid estilo Bento / Tarjetas interactivas asimétricas */}
      <AnimatedSection
        as="div"
        delay={250}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-stretch"
      >
        {/* TARJETA 1: CUENTA E IDENTIDAD (5 columnas) */}
        <div 
          className="lg:col-span-5 rounded-3xl p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border transition-all duration-500 hover:shadow-2xl group"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.025)', 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.5)`
          }}
        >
          <div 
            className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-35"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="relative z-10">
            <span 
              className="text-xs font-bold uppercase tracking-[0.25em] block mb-4"
              style={{ color: primaryColor }}
            >
              Paso inicial
            </span>

            <h3 className={`text-2xl font-black mb-4 ${textColorClass}`}>
              Tu cuenta e identidad
            </h3>

            <p className={`text-sm leading-relaxed ${mutedTextColorClass} font-light mb-6`}>
              Configura tu acceso único indicando tu nombre para saludarte con cercanía, tu correo electrónico como llave maestra y una contraseña robusta.
            </p>

            <div className="space-y-3 mb-6">
              <div 
                className="p-3.5 rounded-xl border text-xs flex items-center justify-between"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.015)', borderColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <span className={mutedTextColorClass}>Nombre o Alias</span>
                <span className="font-semibold" style={{ color: primaryColor }}>Personalizado</span>
              </div>
              <div 
                className="p-3.5 rounded-xl border text-xs flex items-center justify-between"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.015)', borderColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <span className={mutedTextColorClass}>Correo Electrónico</span>
                <span className="font-semibold" style={{ color: primaryColor }}>Llave Maestra</span>
              </div>
            </div>
          </div>

          <div 
            className="relative z-10 p-4 rounded-2xl border text-xs flex items-center space-x-3 transition-colors duration-300"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)', borderColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
            <span className={textColorClass}>Identificador único verificado al instante</span>
          </div>
        </div>

        {/* TARJETA 2: LA BIFURCACIÓN DE PERFILES (7 columnas) */}
        <div 
          className="lg:col-span-7 rounded-3xl p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border transition-all duration-500 hover:shadow-2xl group"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.03)', 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.5)`
          }}
        >
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-35"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="relative z-10">
            <span 
              className="text-xs font-bold uppercase tracking-[0.25em] block mb-4"
              style={{ color: primaryColor }}
            >
              Selección de rol
            </span>

            <h3 className={`text-2xl font-black mb-4 ${textColorClass}`}>
              ¿Qué deseas hacer hoy?
            </h3>

            <p className={`text-sm leading-relaxed ${mutedTextColorClass} font-light mb-8`}>
              La Plataforma despliega un selector inteligente adaptado a tus metas inmediatas. Tú decides de qué lado de la plataforma quieres estar:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div 
                className="p-5 rounded-2xl border transition-all duration-300 hover:border-opacity-40"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
              >
                <div className="font-bold text-sm mb-2" style={{ color: primaryColor }}>
                 Quiero comprar
                </div>
                <p className={`text-xs leading-relaxed ${mutedTextColorClass} font-light`}>
                  Define tu zona de delivery y conéctate directamente con los comercios de tu entorno.
                </p>
              </div>

              <div 
                className="p-5 rounded-2xl border transition-all duration-300 hover:border-opacity-40"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
              >
                <div className="font-bold text-sm mb-2" style={{ color: primaryColor }}>
                  Quiero Vender
                </div>
                <p className={`text-xs leading-relaxed ${mutedTextColorClass} font-light`}>
                  Despliega tu propia tienda digital con panel de control y gestión de pedidos propia.
                </p>
              </div>
            </div>
          </div>


          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/5 text-xs">
            <span className="font-semibold uppercase tracking-widest opacity-50">
              Flexibilidad total
            </span>
            <span className="font-bold transition-transform duration-300 group-hover:translate-x-1" style={{ color: primaryColor }}>
              Tú tienes el control absoluto →
            </span>
          </div>

        </div>

      </AnimatedSection>
    </AnimatedSection>
  );
}