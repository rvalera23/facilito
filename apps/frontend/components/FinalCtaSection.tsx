// ==========================================
// ARCHIVO: components/FinalCtaSection.tsx (LUMEN ULTRA DISCRETO + ANIMACIÓN)
// ==========================================
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedSection from '@/components/AnimatedSection';
import { canSeeBuyerFeatures } from '@/lib/roles';
interface FinalCtaProps {
  textColorClass: string;
  mutedTextColorClass: string;
  primaryColor: string;
  backgroundCardBg?: string;
}

export default function FinalCtaSection({
  textColorClass,
  mutedTextColorClass,
  primaryColor,
}: FinalCtaProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userHasStore, setUserHasStore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);

          const hasStore = Boolean(
            user?.tenantId ||
              user?.tenant_id ||
              user?.storeId ||
              user?.store_id ||
              user?.tenant?.id ||
              user?.store?.id ||
              user?.tenant?.slug ||
              user?.store_slug
          );

          let hasStoreFromStorage = false;
          if (!hasStore && typeof window !== 'undefined') {
            try {
              const storedTenant = localStorage.getItem('tenant');
              if (storedTenant) {
                const tenant = JSON.parse(storedTenant);
                if (tenant && (tenant.id || tenant.slug)) {
                  hasStoreFromStorage = true;
                }
              }
            } catch (e) {}
          }

          setUserHasStore(hasStore || hasStoreFromStorage);
        } else {
          setCurrentUser(null);
          setUserHasStore(false);
        }
      } catch (e) {
        setCurrentUser(null);
        setUserHasStore(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
    window.addEventListener('authChange', checkUser);
    window.addEventListener('storage', checkUser);

    return () => {
      window.removeEventListener('authChange', checkUser);
      window.removeEventListener('storage', checkUser);
    };
  }, []);

  // 🔥 Solo mostrar el CTA de "crear tienda" a:
  //   - Usuarios no logueados.
  //   - Compradores (cualquier rol que no sea repartidor/profesional) sin tienda.
  // Repartidores y profesionales NO son elegibles → no ven el CTA.
  const showCta =
    !isLoading &&
    (!currentUser || (canSeeBuyerFeatures(currentUser) && !userHasStore));

  const handleCreateStore = () => {
    if (currentUser) {
      router.push('/onboarding?role=seller');
    } else {
      router.push('/onboarding?new=true');
    }
  };

  const getUserName = () => {
    if (!currentUser) return null;
    return (
      currentUser.name ||
      currentUser.fullName ||
      currentUser.nombre ||
      currentUser.displayName ||
      null
    );
  };

  const userName = getUserName();
  const firstName = userName ? userName.split(' ')[0] : null;

  if (!showCta) {
    return null;
  }

  return (
    <AnimatedSection
      as="section"
      className="w-full py-36 relative z-10 overflow-hidden text-center"
    >
      {/* Glow de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center">
        <div
          className="w-[500px] h-[500px] sm:w-[750px] sm:h-[750px] rounded-full blur-[180px] opacity-[0.012] transition-all duration-1000 animate-[pulse_18s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          style={{
            backgroundColor: primaryColor,
            maskImage: 'radial-gradient(circle, black 2%, transparent 55%)',
            WebkitMaskImage: 'radial-gradient(circle, black 2%, transparent 55%)',
          }}
        />
      </div>

      <AnimatedSection
        as="div"
        delay={100}
        className="max-w-4xl mx-auto px-6 sm:px-12 relative z-10"
      >
        {/* 🔥 ETIQUETA SUPERIOR */}
        <AnimatedSection as="div" delay={150}>
          <span
            className="text-xs font-bold uppercase tracking-[0.25em] block mb-4"
            style={{ color: primaryColor }}
          >
            {currentUser
              ? 'Lleva tu negocio al siguiente nivel'
              : 'El poder de tu propia marca'}
          </span>
        </AnimatedSection>

        {/* 🔥 TÍTULO PRINCIPAL */}
        <AnimatedSection as="div" delay={250}>
          <h2
            className={`text-3xl sm:text-5xl font-black tracking-tight ${textColorClass} mb-6 leading-tight`}
          >
            {currentUser && firstName ? (
              <>
                {firstName}, ya tienes cuenta, <br />
                <span style={{ color: primaryColor }}>ahora crea tu tienda</span>
              </>
            ) : currentUser ? (
              <>
                Ya tienes cuenta, <br />
                <span style={{ color: primaryColor }}>ahora crea tu tienda</span>
              </>
            ) : (
              <>
                Tu espacio digital propio <br />
                <span style={{ color: primaryColor }}>está a un solo clic.</span>
              </>
            )}
          </h2>
        </AnimatedSection>

        {/* Descripción breve */}
        <AnimatedSection as="div" delay={350}>
          <p
            className={`text-sm sm:text-base ${mutedTextColorClass} max-w-xl mx-auto mb-10 leading-relaxed font-light px-2`}
          >
            {currentUser
              ? 'Aprovecha tu cuenta para vender tus productos o servicios sin comisiones.'
              : 'Únete a los creadores y comerciantes que ya dejaron atrás las comisiones abusivas y los catálogos anónimos. Configura tu identidad en minutos.'}
          </p>
        </AnimatedSection>

        {/* Botón principal de acción */}
        <AnimatedSection as="div" delay={450}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCreateStore}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105 shadow-2xl cursor-pointer relative group overflow-hidden text-white"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 15px 35px -10px ${primaryColor}40`,
              }}
            >
              <span className="relative z-10">
                {currentUser ? 'Crear mi tienda ahora' : 'Crear mi tienda gratis'}
              </span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </AnimatedSection>

        {/* Microtexto de confianza */}
        <AnimatedSection as="div" delay={550}>
          <p
            className={`text-xs ${mutedTextColorClass} mt-6 opacity-60 font-light`}
          >
            {currentUser
              ? 'Configuración inmediata • Sin costos adicionales'
              : 'Sin tarjetas de crédito requeridas • Configuración inmediata'}
          </p>
        </AnimatedSection>
      </AnimatedSection>
    </AnimatedSection>
  );
}