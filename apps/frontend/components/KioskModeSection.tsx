// ==========================================
// ARCHIVO: components/KioskModeSection.tsx
// ==========================================
'use client';

import React from 'react';
import AnimatedSection from '@/components/AnimatedSection';

interface KioskModeSectionProps {
  textColorClass: string;
  mutedTextColorClass: string;
  primaryColor: string;
  backgroundCardBg: string;
}

export default function KioskModeSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
}: KioskModeSectionProps) {
  return (
    <AnimatedSection
      as="section"
      className="w-full py-28 px-6 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center relative z-10">
        
        {/* COLUMNA IZQUIERDA: Superposición Tipográfica (6 columnas) */}
        <AnimatedSection
          as="div"
          delay={200}
          className="lg:col-span-6 flex flex-col space-y-16 order-2 lg:order-1 relative"
        >
          {/* Item 1 */}
          <AnimatedSection as="div" delay={100} className="relative pl-10">
            <span className="absolute -top-10 -left-5 text-[120px] font-black opacity-[0.03] select-none" style={{ color: primaryColor }}>01</span>
            <div className="relative z-10 space-y-2">
              <h3 className={`text-2xl font-extrabold tracking-tight ${textColorClass}`}>Tu Marca, Tu Identidad Única</h3>
              <p className={`text-base ${mutedTextColorClass} leading-relaxed font-light`}>
                Tus clientes ingresan a tu enlace personalizado, diseñado con tus colores, tu logotipo y tus reglas comerciales.
              </p>
            </div>
          </AnimatedSection>

          {/* Item 2 */}
          <AnimatedSection as="div" delay={250} className="relative pl-10">
            <span className="absolute -top-10 -left-5 text-[120px] font-black opacity-[0.03] select-none" style={{ color: primaryColor }}>02</span>
            <div className="relative z-10 space-y-2">
              <h3 className={`text-2xl font-extrabold tracking-tight ${textColorClass}`}>Modo Kiosco Integrado</h3>
              <p className={`text-base ${mutedTextColorClass} leading-relaxed font-light`}>
                Coloca una tablet en el mostrador: el cliente mismo arma su carrito de forma interactiva, fluida y sin fricciones operativas.
              </p>
            </div>
          </AnimatedSection>

          {/* Item 3 */}
          <AnimatedSection as="div" delay={400} className="relative pl-10">
            <span className="absolute -top-10 -left-5 text-[120px] font-black opacity-[0.03] select-none" style={{ color: primaryColor }}>03</span>
            <div className="relative z-10 space-y-2">
              <h3 className={`text-2xl font-extrabold tracking-tight ${textColorClass}`}>Gestión y Pagos Directos</h3>
              <p className={`text-base ${mutedTextColorClass} leading-relaxed font-light`}>
                Combina métodos de pago locales y digitales. Cada transacción se registra en tiempo real en tu panel administrativo.
              </p>
            </div>
          </AnimatedSection>
        </AnimatedSection>

        {/* COLUMNA DERECHA: Encabezado (6 columnas) */}
        <AnimatedSection
          as="div"
          delay={100}
          className="lg:col-span-6 flex flex-col items-start text-left space-y-6 order-1 lg:order-2"
        >
          <div>
            <span 
              className="text-xs font-bold uppercase tracking-[0.25em] block"
              style={{ color: primaryColor }}
            >
              Autoservicio sin Intermediarios
            </span>
          </div>

          <h2 className={`text-3xl sm:text-5xl font-black tracking-tight ${textColorClass}`}>
            Convierte tu mostrador en una <span style={{ color: primaryColor }}>Estación de Autopago</span> de Clase Mundial.
          </h2>

          <p 
            className={`text-base sm:text-lg ${mutedTextColorClass} leading-relaxed font-light border pl-6 py-2`}
            style={{ borderColor: `${primaryColor}30` }}
          >
            Olvídate de plataformas genéricas. <strong className={textColorClass} style={{fontWeight: 600}}>facilito</strong> te permite proyectar tu identidad profesional en el espacio físico, manteniendo el control total de la experiencia del cliente y tus ganancias.
          </p>
        </AnimatedSection>

      </div>
    </AnimatedSection>
  );
}