    'use client';

    import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
    import { useRouter } from 'next/navigation';
    import Image from 'next/image';
    import { motion, AnimatePresence } from 'framer-motion';
    import Header from '@/components/Header';
    import Footer from '@/components/Footer';
    import AuthModal from '@/components/AuthModal';
    import AvailableStoresSection from '@/components/AvailableStoresSection';
    import LocationBanner from '@/components/LocationBanner';
    import AvailableProductsSection from '@/components/AvailableProductsSection';
    import AvailableServiceSection from '@/components/AvailableServiceSection';
    import AvailableServicesItemsSection from '@/components/AvailableServicesItemsSection';
    import ValuePropositionSection from '@/components/ValuePropositionSection';
    import HowItWorksSection from '@/components/HowItWorksSection';
    import KioskModeSection from '@/components/KioskModeSection';
    import FinalCtaSection from '@/components/FinalCtaSection';
    import { APP_PALETTES } from './constants/palettes';
    import { useAppTheme } from '@/hooks/useAppTheme';

    // ✅ IMPORTAR getImageUrl PARA PROCESAR IMÁGENES
    import { getImageUrl } from '@/lib/imageUtils';

    // ============================================================
    // 🔥 CONSTANTES FUERA DEL COMPONENTE
    // ============================================================
    const PERSONAS = [
      {
        id: 1,
        src: '/images/persona1.png',
        nombre: 'Gustavo V.',
        negocio: 'Consultor Privado',
        quote: 'facilito me ayudó a organizar las consultas y citas de mis clientes sin enredos',
      },
      {
        id: 2,
        src: '/images/persona2.png',
        nombre: 'Mariana G.',
        negocio: 'Boutique & Moda',
        quote: 'facilito me ayudó a organizar mis pedidos de sin enredos',
      },
      {
        id: 3,
        src: '/images/persona3.png',
        nombre: 'Carlos R.',
        negocio: 'Bodega',
        quote: 'Ahora gestiono mis ventas y envios directo desde mis dispositivos',
      },
    ];

    // ============================================================
    // 🔥 FUNCIONES PURAS FUERA DEL COMPONENTE
    // ============================================================
    const isLightBackground = (colorHex: string): boolean => {
      const hex = colorHex.replace('#', '');
      if (hex.length !== 6) return false;
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 140;
    };

    // ============================================================
    // 🔥 COMPONENTE DE TESTIMONIO (MEMOIZADO)
    // ============================================================
    const TestimonialCarousel = memo(({ 
      currentIndex, 
      cardBgStyle, 
      activePalette, 
      mutedTextColorClass 
    }: any) => {
      const currentPersona = PERSONAS[currentIndex];

      // ✅ PROCESAR IMAGEN CON getImageUrl
      const processedImage = useMemo(() => {
        if (!currentPersona?.src) return null;
        try {
          return getImageUrl({ coverImage: currentPersona.src });
        } catch {
          return currentPersona.src;
        }
      }, [currentPersona?.src]);

      return (
        <div className="relative hidden lg:flex flex-col items-center justify-center pt-8 lg:pt-0">
          <motion.div 
            key={`aura-${activePalette.id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.35, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full blur-[90px] pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: activePalette.primary }}
          />

          <div className="relative z-10 w-full h-[410px] sm:h-[470px] flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPersona.src}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="relative w-full h-full max-w-[420px] sm:max-w-[480px] drop-shadow-[0_15px_25px_rgba(0,0,0,0.35)]"
              >
                <Image
                  src={processedImage || currentPersona.src}
                  alt="Emprendedor usando facilito"
                  fill
                  sizes="(min-width: 640px) 480px, 0px"
                  quality={70}
                  priority={currentPersona.id === PERSONAS[0].id}
                  className="object-cover object-top"
                />
              </motion.div>
            </AnimatePresence>
          </div>

                   <div
            className="relative z-25 -mt-6 max-w-xs sm:max-w-sm border px-5 py-3.5 rounded-2xl flex flex-col text-center transition-colors duration-500"
             style={{ 
              backgroundColor: cardBgStyle,
              borderColor: `${activePalette.primary}40`,
              boxShadow: `0 20px 40px -10px ${activePalette.primary}30`
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPersona.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 block" style={{ color: activePalette.primary }}>
                  {currentPersona.nombre} • {currentPersona.negocio}
                </span>
                <p className={`text-xs font-medium ${mutedTextColorClass} italic`}>
                  "{currentPersona.quote}"
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      );
    });

    TestimonialCarousel.displayName = 'TestimonialCarousel';

    // ============================================================
    // 🔥 COMPONENTE DE PALETAS (MEMOIZADO)
    // ============================================================
    const PaletteSelector = memo(({ 
      activePalette, 
      textColorClass, 
      onSelectPalette
    }: any) => {
      const scrollContainerRef = useRef<HTMLDivElement>(null);
      const [isDragging, setIsDragging] = useState(false);
      const [startX, setStartX] = useState(0);
      const [scrollLeft, setScrollLeft] = useState(0);

      const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const thirdWidth = container.scrollWidth / 3;

        if (container.scrollLeft >= thirdWidth * 2) {
          container.scrollLeft -= thirdWidth;
        } else if (container.scrollLeft <= 0) {
          container.scrollLeft += thirdWidth;
        }
      }, []);

      const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
      }, []);

      const handleMouseLeave = useCallback(() => { setIsDragging(false); }, []);
      const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

      const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
      }, [isDragging, startX, scrollLeft]);

      const scrollPalettes = useCallback((direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
          const scrollAmount = 220;
          scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
          });
        }
      }, []);

      return (
        <div className="w-full space-y-1.5 pt-1 relative">
          <div className={`flex items-center justify-between text-[11px] font-semibold px-1 ${textColorClass}`}>
            <span className="opacity-70">Selecciona la paleta de tu tienda:</span>
            <span className="font-bold" style={{ color: activePalette.primary }}>{activePalette.name}</span>
          </div>

          <div className="relative group">
            <button 
              onClick={() => scrollPalettes('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg cursor-pointer border"
              style={{ backgroundColor: activePalette.background, borderColor: `${activePalette.primary}40`, color: activePalette.primary }}
              title="Anterior"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="flex gap-3 overflow-x-auto py-2 px-6 scrollbar-none select-none cursor-grab active:cursor-grabbing justify-start lg:justify-start"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
              }}
            >
              {[...APP_PALETTES, ...APP_PALETTES, ...APP_PALETTES].map((palette, index) => {
                const isSelected = activePalette.id === palette.id;
                return (
                  <button
                    key={`${palette.id}-${index}`}
                    onClick={() => onSelectPalette(palette)}
                    className={`p-2.5 rounded-2xl border transition cursor-pointer flex flex-col items-center justify-center space-y-1.5 shrink-0 backdrop-blur-md shadow-sm ${
                      isSelected 
                        ? 'scale-105 shadow-md' 
                        : 'opacity-80 hover:opacity-100 hover:border-slate-500'
                    }`}
                    style={{ 
                      backgroundColor: isSelected ? `${palette.primary}25` : `${palette.background}66`,
                      borderColor: isSelected ? palette.primary : `${palette.primary}30`,
                      minWidth: '78px'
                    }}
                  >
                    <div className="flex items-center -space-x-1 pointer-events-none">
                      <span className="w-3 h-3 rounded-full border border-black/40 shadow-sm z-4" style={{ backgroundColor: palette.primary }} />
                      <span className="w-3 h-3 rounded-full border border-black/40 shadow-sm z-3" style={{ backgroundColor: palette.secondary }} />
                      <span className="w-3 h-3 rounded-full border border-black/40 shadow-sm z-2" style={{ backgroundColor: palette.accent }} />
                      <span className="w-3 h-3 rounded-full border border-black/40 shadow-sm z-1" style={{ backgroundColor: palette.background }} />
                    </div>
                    <span className={`text-[10px] font-bold ${textColorClass} truncate w-full text-center pointer-events-none`}>
                      {palette.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => scrollPalettes('right')}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg cursor-pointer border"
              style={{ backgroundColor: activePalette.background, borderColor: `${activePalette.primary}40`, color: activePalette.primary }}
              title="Siguiente"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      );
    });

    PaletteSelector.displayName = 'PaletteSelector';

    // ============================================================
    // 🔥 COMPONENTE PRINCIPAL
    // ============================================================
    function HomeComponent() {
      const router = useRouter();
      const [user, setUser] = useState<{ id: string; name: string; email: string; role?: string } | null>(null);
      const [tenant, setTenant] = useState<{ id: string; name: string; slug: string } | null>(null);
      const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
      const [initialAuthMode, setInitialAuthMode] = useState<boolean>(false);
      const [isMounted, setIsMounted] = useState(false);
      const [currentIndex, setCurrentIndex] = useState(0);
      const { currentTheme, updateTheme } = useAppTheme();

      // 🔥 REF PARA EVITAR DUPLICACIÓN DE EVENTOS
      const isMountedRef = useRef(false);
      const intervalRef = useRef<NodeJS.Timeout | null>(null);

      // ✅ MEMOIZAR getImageUrl PARA PASAR A COMPONENTES HIJOS
      const getImageUrlMemo = useMemo(() => getImageUrl, []);

      // 🔥 MEMOIZAR VALORES DERIVADOS
      const activePalette = useMemo(() => {
        const matchingPalette = APP_PALETTES.find((palette) => (
          palette.primary === currentTheme.primaryColor &&
          palette.secondary === currentTheme.secondaryColor &&
          palette.accent === currentTheme.accentColor &&
          palette.background === currentTheme.backgroundColor
        ));

        if (matchingPalette) return matchingPalette;

        if (
          currentTheme.primaryColor === '#4f46e5' &&
          currentTheme.backgroundColor === '#0b0f19' &&
          currentTheme.name === 'Mi Tienda'
        ) {
          return APP_PALETTES[0];
        }

        return {
          id: 'tenant-custom',
          name: currentTheme.name || 'Mi Tema',
          primary: currentTheme.primaryColor || APP_PALETTES[0].primary,
          secondary: currentTheme.secondaryColor || APP_PALETTES[0].secondary,
          accent: currentTheme.accentColor || APP_PALETTES[0].accent,
          background: currentTheme.backgroundColor || APP_PALETTES[0].background,
        };
      }, [currentTheme]);

      const isLight = useMemo(() => isLightBackground(activePalette.background), [activePalette.background]);
      const textColorClass = useMemo(() => isLight ? 'text-slate-900' : 'text-slate-100', [isLight]);
      const mutedTextColorClass = useMemo(() => isLight ? 'text-slate-600' : 'text-slate-300', [isLight]);
      const labelColorClass = useMemo(() => isLight ? 'text-slate-800' : 'text-slate-300', [isLight]);
      const inputBg = useMemo(() => isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.25)', [isLight]);
      const inputBorder = useMemo(() => isLight ? 'border-slate-900/20' : 'border-white/15', [isLight]);
      const cardBgStyle = useMemo(() => isLight ? `${activePalette.background}F8` : `${activePalette.background}EE`, [activePalette.background, isLight]);

      const userRole = useMemo(() => (user?.role || '').toLowerCase(), [user?.role]);
      const isBuyerRole = useMemo(() => userRole === 'buyer' || userRole === 'comprador', [userRole]);
      const hasTenantStore = useMemo(() => tenant !== null && tenant !== undefined, [tenant]);
      const showActionButtons = useMemo(() => !user || (isBuyerRole && !hasTenantStore), [user, isBuyerRole, hasTenantStore]);

      // 🔥 INICIALIZACIÓN - SOLO UNA VEZ
      useEffect(() => {
        if (isMountedRef.current) return;
        isMountedRef.current = true;
        
        document.title = "Crea tu negocio virtual en minutos | facilito";
        setIsMounted(true);

      }, []);

      // 🔥 SINCRONIZAR TEMA CON EL DOM
      useEffect(() => {
        if (!isMounted) return;
        
        const root = document.documentElement;
        root.style.setProperty('--accent-color', activePalette.primary);
        root.style.setProperty('--secondary-color', activePalette.secondary);
        root.style.setProperty('--accent-glow', activePalette.accent);
        root.style.setProperty('--bg-color', activePalette.background);
        root.style.setProperty('--color-primary', activePalette.primary);
        root.style.setProperty('--primary-color', activePalette.primary);
        root.style.setProperty('--color-secondary', activePalette.secondary);
        root.style.setProperty('--color-background', activePalette.background);
        root.style.setProperty('--background-color', activePalette.background);
      }, [activePalette, isMounted]);

      // 🔥 INTERVAL PARA TESTIMONIOS - CON CLEANUP
      useEffect(() => {
        if (!isMounted) return;
        
        intervalRef.current = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % PERSONAS.length);
        }, 5000);
        
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      }, [isMounted]);

      // 🔥 SINCRONIZAR AUTENTICACIÓN
      const syncAuthState = useCallback(() => {
        const storedUser = localStorage.getItem('user');
        const storedTenant = localStorage.getItem('tenant');
        
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch (e) { setUser(null); }
        } else { setUser(null); }

        if (storedTenant) {
          try { 
            const parsedTenant = JSON.parse(storedTenant);
            setTenant(parsedTenant);
          } catch (e) { 
            setTenant(null); 
          }
        } else { 
          setTenant(null); 
        }
      }, []);

      // 🔥 EVENT LISTENER DE AUTENTICACIÓN
      useEffect(() => {
        if (!isMounted) return;
        
        syncAuthState();
        const handleStorage = (e: StorageEvent) => {
          if (e.key === 'user' || e.key === 'tenant') {
            syncAuthState();
          }
        };
        const handleAuthChange = syncAuthState;

        window.addEventListener('storage', handleStorage);
        window.addEventListener('authChange', handleAuthChange);

        return () => {
          window.removeEventListener('storage', handleStorage);
          window.removeEventListener('authChange', handleAuthChange);
        };
      }, [isMounted, syncAuthState]);

      // 🔥 HANDLERS MEMOIZADOS
const handleSelectPalette = useCallback((palette: typeof APP_PALETTES[0]) => {
  updateTheme({
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    name: palette.name,
  });

  if (typeof window !== 'undefined') {
    document.documentElement.setAttribute('data-theme', palette.id);
    // 🔥 AVISAR AL HEADER QUE EL TEMA CAMBIÓ
    window.dispatchEvent(new Event('themeChange'));
  }
}, [updateTheme]);

      const handleAuthSuccess = useCallback((data: any, isRegister: boolean) => {
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
        if (data.tenant) {
          localStorage.setItem('tenant', JSON.stringify(data.tenant));
          setTenant(data.tenant);
        } else {
          localStorage.removeItem('tenant');
          setTenant(null);
        }
        window.dispatchEvent(new Event('authChange'));
        setIsAuthModalOpen(false);

        const loggedUser = data.user || user;
        const role = (loggedUser?.role || '').toLowerCase();
        const onboardingCompleted = loggedUser?.onboarding_completed ?? data.onboarding_completed;
        const hasTenant = Boolean(data.tenant || tenant);

        if (!onboardingCompleted || (!role && !hasTenant)) {
          router.push('/onboarding');
          router.refresh();
          return;
        }

        const isBuyer = role === 'buyer' || role === 'comprador';
        const isDriver = role === 'repartidor';
        const isProfessional = role === 'profesional';
        const activeSlug = data.tenant?.slug || tenant?.slug;

        if (isDriver) {
          router.push('/repartidor');
        } else if (isProfessional) {
          router.push('/profesional');
        } else if (isBuyer || !data.tenant) {
          router.push('/mi-cuenta');
        } else if (isRegister) {
          router.push('/onboarding');
        } else {
          router.push(`/admin/${activeSlug}`);
        }
      }, [router, user, tenant]);

      // 🔥 MEMOIZAR PROPS PARA COMPONENTES HIJOS (incluyendo getImageUrl)
      const sectionProps = useMemo(() => ({
        textColorClass,
        mutedTextColorClass,
        primaryColor: activePalette.primary,
        secondaryColor: activePalette.secondary,   // ✅ NUEVO
        backgroundCardBg: cardBgStyle,
        getImageUrl: getImageUrlMemo,
        isLight,
      }), [textColorClass, mutedTextColorClass, activePalette.primary, activePalette.secondary, cardBgStyle, getImageUrlMemo, isLight]);
      
      if (!isMounted) {
        return (
          <div 
            className="min-h-screen flex flex-col bg-slate-950 text-slate-100"
            style={{ backgroundColor: APP_PALETTES[0].background }}
          />
        );
      }

      return (
    // Y REEMPLÁZALA por:
    <div 
      className={`min-h-screen flex flex-col ${textColorClass} relative transition-colors duration-500`}
      style={{ 
        backgroundColor: activePalette.background,
        fontFamily: 'var(--font-quicksand), Quicksand, sans-serif', // ✅ FUERZA Quicksand
      }}
    >
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
            <div 
              className="absolute w-[450px] h-[350px] sm:w-[700px] sm:h-[500px] rounded-full blur-[160px] opacity-25"
              style={{ backgroundColor: activePalette.primary }}
            />
          </div>

          <Header />

          <LocationBanner
            primaryColor={activePalette.primary}
            textColorClass={textColorClass}
            mutedTextColorClass={mutedTextColorClass}
            backgroundCardBg={cardBgStyle}
            isLight={isLight}
          />

          <main className="flex-1 w-full flex flex-col">
            <div className="w-full px-6 py-12 md:py-16">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">

                {/* TEXTO Y ACCIONES */}
                <div className="flex flex-col items-center lg:items-start space-y-6 text-center lg:text-left">
                  <span 
                    className="text-xs font-bold uppercase tracking-[0.25em] block"
                    style={{ color: activePalette.primary }}
                  >
                    Emprendimientos, servicios y más
                  </span>

    <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${textColorClass}`}>
      Digitaliza tu negocio en minutos con{' '}
      <span className={textColorClass}>
                    facil<span style={{ color: 'var(--accent-color, #ea580c)' }}>i</span>to
      </span>
    </h1>

                  <p className={`text-base sm:text-lg ${mutedTextColorClass} leading-relaxed`}>
                    La alternativa profesional para pequeños emprendedores. Lleva el control de tus productos, citas, pedidos por delivery y pagos sin complicaciones técnicas y con tu propia identidad visual.
                  </p>

                  {/* PALETAS FLOTANTES */}
                  <PaletteSelector
                    activePalette={activePalette}
                    textColorClass={textColorClass}
                    onSelectPalette={handleSelectPalette}
                  />

                  {showActionButtons && (
                    <div className="flex flex-col sm:flex-row gap-4 w-full pt-2 justify-center lg:justify-start">
                      {/* 🔥 Google OAuth deshabilitado hasta tener dominio público.
                          El botón no tenía onClick → era decorativo.
                          Para reactivar: ver sección "Google OAuth" del manual. */}
                      {/* {!user && (
                        <button
                          type="button"
                          onClick={() => {
                            setInitialAuthMode(true);
                            setIsAuthModalOpen(true);
                          }}
                          className={`flex items-center justify-center gap-3 ${textColorClass} border font-bold text-base px-6 py-4 rounded-2xl shadow-md transition transform hover:-translate-y-0.5 cursor-pointer`}
                          style={{ 
                            backgroundColor: `${activePalette.secondary}44`, 
                            borderColor: `${activePalette.primary}40` 
                          }}
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          Continuar con Google
                        </button>
                      )} */}

                      <button
                        type="button"
                        onClick={() => {
                          router.push('/onboarding?new=true');
                        }}
                        className="inline-flex items-center justify-center font-bold text-base px-6 py-4 rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer text-center text-white w-full sm:w-auto"
                        style={{ backgroundColor: activePalette.primary, boxShadow: `0 10px 25px -5px ${activePalette.primary}50` }}
                      >
                        Crear mi Tienda Gratis →
                      </button>
                    </div>
                  )}
                  <span className={`text-xs ${mutedTextColorClass}`}>Sin tarjetas de crédito. Configuración guiada para cualquier tipo de comercio.</span>
                </div>

                {/* TESTIMONIO */}
                <TestimonialCarousel
                  currentIndex={currentIndex}
                  cardBgStyle={cardBgStyle}
                  activePalette={activePalette}
                  mutedTextColorClass={mutedTextColorClass}
                />

              </div>
            </div>

            {/* 🔥 SECCIONES - PASANDO getImageUrl */}
            <AvailableStoresSection {...sectionProps} />
            <AvailableProductsSection {...sectionProps} />
                    <ValuePropositionSection {...sectionProps} />
                    <AvailableServiceSection {...sectionProps} />
            <AvailableServicesItemsSection {...sectionProps} />


            <KioskModeSection {...sectionProps} />
            <HowItWorksSection {...sectionProps} />
            <FinalCtaSection {...sectionProps} />
          </main>

          <Footer />

          <AuthModal
            isOpen={isAuthModalOpen}
            initialIsLogin={initialAuthMode}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
            textColorClass={textColorClass}
            mutedTextColorClass={mutedTextColorClass}
            labelColorClass={labelColorClass}
            inputBg={inputBg}
            inputBorder={inputBorder}
            primaryColor={activePalette.primary}
            getImageUrl={getImageUrlMemo} // ✅ PASAR getImageUrl A AuthModal
          />
        </div>
      );
    }

    // 🔥 ASIGNAR DISPLAY NAME A LA FUNCIÓN
    HomeComponent.displayName = 'Home';

    // 🔥 EXPORTAR COMO DEFAULT CON MEMO
    export default memo(HomeComponent);