  'use client';

  import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
  import Image from 'next/image';
  import { MapPin, Globe, ShieldCheck, Share2, Check, Clock, ShoppingBag, Sparkles, Heart, Star } from 'lucide-react';
  import { useStoreLikes } from '@/hooks/useStoreLikes';
  import { useStoreRating } from '@/hooks/useStoreRating';
  import { getTenantConfig, _loadFontAsset } from '@/lib/fontLoader';
  import { getImageUrl } from '@/lib/imageUtils';
  import { DEFAULT_THEME } from '@/lib/branding';

  // ============================================================
  // 🚀 MOVER FUERA DEL COMPONENTE (NO SE RECREA CADA RENDER)
  // ============================================================

  // 🔥 ICONOS DE REDES - ESTÁTICO
  const SOCIAL_ICONS = {
    instagram: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>,
    facebook: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
    tiktok: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.6a6.34 6.34 0 0 0 10.86 4.43v-7.85a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.21z"/></svg>,
    x_twitter: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    threads: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 8.672c-.521-.033-1.047.008-1.558.122-1.396.313-2.39 1.34-2.585 2.685.556-.252 1.171-.383 1.796-.383 2.146 0 3.894 1.708 3.894 3.812 0 2.103-1.748 3.812-3.894 3.812-2.308 0-4.106-1.801-4.106-4.106 0-2.484 1.833-4.52 4.252-4.757-.042-.313-.065-.632-.065-.956 0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.254-.383 2.422-1.045 3.393A7.95 7.95 0 0 1 18.186 20c-1.354 0-2.617-.354-3.708-.973-.873.49-1.884.773-2.964.773-3.314 0-6-2.686-6-6s2.686-6 6-6c1.17 0 2.258.337 3.178.919a7.92 7.92 0 0 1-3.178 7.214z"/></svg>,
    linkedin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.34a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>,
  };

  const getSocialIcon = (key: string) => SOCIAL_ICONS[key as keyof typeof SOCIAL_ICONS] || <Globe className="w-4 h-4" />;

  // 🔥 FUNCIÓN DE HORARIO - PURA (SIN EFECTOS SECUNDARIOS)
  const checkIfStoreIsOpen = (specificConfig: any) => {
    if (!specificConfig) return { isOpen: true, label: 'Abierto Ahora' };

    const isManuallyClosed = 
      specificConfig.is_manually_closed === true || 
      specificConfig.is_manually_closed === 'true' || 
      specificConfig.isManuallyClosed === true ||
      specificConfig.isManuallyClosed === 'true';

    if (isManuallyClosed) {
      return { isOpen: false, label: 'Cerrado Temporalmente' };
    }

    const daysMap: Record<string, string> = {
      0: 'sunday', 1: 'monday', 2: 'tuesday',
      3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
    };

    const now = new Date();
    const currentDayKey = daysMap[now.getDay()];
    const todayConfig = specificConfig.schedule?.[currentDayKey];

    if (todayConfig && !todayConfig.closed) {
            const parseTime = (time: string) => {
        const cleaned = time.trim().toLowerCase();
        const isPM = cleaned.includes('pm');
        const isAM = cleaned.includes('am');
        const parts = cleaned.replace(/[ap]m/g, '').trim().split(':');
        let h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        
        return h * 60 + m;
      };

      const openStr = todayConfig.open || todayConfig.openTime || specificConfig.open || '08:00';
      const closeStr = todayConfig.close || todayConfig.closeTime || specificConfig.close || '17:00';
      
      const openTime = parseTime(openStr);
      const closeTime = parseTime(closeStr);
      const current = (now.getHours() * 60) + now.getMinutes();

      if (current >= openTime && current <= closeTime) {
        return { isOpen: true, label: 'Abierto Ahora' };
      }
      return { isOpen: false, label: 'Fuera de Horario' };
    }

    return { isOpen: false, label: 'Cerrado Hoy' };
  };

  // 🔥 CONFIGURACIONES ESTÁTICAS
  const ALL_CURRENCY_OPTIONS = [
    { value: 'USD', label: 'Dólares ($)' },
    { value: 'VES', label: 'Bolívares (Bs.)' },
    { value: 'EUR', label: 'Euros (€)' },
    { value: 'CRYPTO', label: 'Criptomonedas' },
  ];

  const PAYMENT_METHOD_LABELS = {
    cash: 'Efectivo',
    pos: 'Punto de Venta',
    pago_movil: 'Pago Móvil',
    biopago: 'Biopago',
    zelle: 'Zelle',
    binance: 'Binance Pay',
  };

  // ============================================================
  // 🚀 COMPONENTE PRINCIPAL CON MEMO - FULL WIDTH SIN BORDES
  // ============================================================
  const StoreHero = memo(({ 
    tenant, 
    bannerSource, 
    primary, 
    secondary, 
    isSecondaryLight, 
    cardBgClass,
    headerBgColor,
    headerIsLight,
    totalProducts = 0,
    isServiceStore = false,
    layoutType = 'default',
  }: any) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showRatingSelector, setShowRatingSelector] = useState(false);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [bannerLoaded, setBannerLoaded] = useState(false);
    const [isClient, setIsClient] = useState(false);
    
    const tooltipRef = useRef<HTMLDivElement>(null);
    const ratingRef = useRef<HTMLDivElement>(null);

    // ✅ NUEVO: storeStatus como estado (evita #418 por `new Date()` en server vs cliente)
const [storeStatus, setStoreStatus] = useState<{ isOpen: boolean; label: string }>({
  isOpen: true,
  label: 'Cargando...',
});

    // ✅ SOLO EJECUTAR EN CLIENTE (EVITA HIDRATACIÓN)
    useEffect(() => {
      setIsClient(true);
      try {
        const userString = localStorage.getItem('user');
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        
        if (userString && token) {
          const userData = JSON.parse(userString);
          const id = userData.id || userData._id || userData.userId || null;
          setUserId(id);
          setIsAuthenticated(!!id);
        }
      } catch (e) {
        console.error('Error al obtener usuario en StoreHero:', e);
      }
    }, []);

      // ✅ FORZAR QUE EL TÍTULO USE LA FUENTE CORRECTA CON PESO 900
    useEffect(() => {
      if (typeof window === 'undefined') return;
      if (!tenant?.slug) return;
      
      const tenantSlug = tenant.slug;
      const config = getTenantConfig(tenantSlug);
      const fontFamily = config?.fontFamily || 'Quicksand';
      
      // 🔥 CARGAR LA FUENTE CON TODOS LOS PESOS
      _loadFontAsset(fontFamily);
    }, [tenant?.slug]);

    // 🚀 AGUPAR TODOS LOS useMemo EN UNO (REDUCE RECOMPUTACIONES)
    const storeData = useMemo(() => {
      const specificConfig = tenant?.specificConfig || tenant?.specific_config || {};
      const isLight = headerIsLight !== undefined ? headerIsLight : (isSecondaryLight !== undefined ? isSecondaryLight : false);
      const heroBgColor = headerBgColor || secondary || (isLight ? '#f1f5f9' : '#090d16');
  const textColor = isLight ? 'text-slate-800' : 'text-white';
      const mutedTextColor = isLight ? 'text-slate-600' : 'text-slate-300';
      const uniformBadgeStyle = isLight 
        ? 'border-slate-200/60 text-slate-700' 
        : 'border-white/10 text-slate-300';

      // 🔥 Color de fondo dinámico para los badges (hereda del tema)
      const uniformBadgeBg = isLight 
        ? 'rgba(255, 255, 255, 0.85)' 
        : (secondary ? `${secondary}D9` : 'rgba(0, 0, 0, 0.85)');
      const cardBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';

      // 🔥 Active Currencies
      const rawCurrencies = specificConfig.currencies || specificConfig.acceptedCurrencies || tenant?.currencies;
      let activeCurrencies: string[] = [];
      if (Array.isArray(rawCurrencies)) {
        activeCurrencies = ALL_CURRENCY_OPTIONS
          .filter(opt => rawCurrencies.includes(opt.value))
          .map(opt => opt.label);
      } else if (typeof rawCurrencies === 'object' && rawCurrencies !== null) {
        const mapping = [
          { label: 'Dólares ($)', active: rawCurrencies.usd ?? rawCurrencies.dollars },
          { label: 'Bolívares (Bs.)', active: rawCurrencies.ves ?? rawCurrencies.bolivares },
          { label: 'Euros (€)', active: rawCurrencies.eur ?? rawCurrencies.euros },
          { label: 'Criptomonedas', active: rawCurrencies.crypto ?? rawCurrencies.cryptocurrencies },
        ];
        activeCurrencies = mapping.filter(m => m.active).map(m => m.label);
      }

      // 🔥 Active Payment Methods
      const rawActiveMethods = specificConfig?.activePaymentMethods || 
                              specificConfig.paymentMethods || 
                              specificConfig.methods || 
                              tenant?.activePaymentMethods || 
                              tenant?.paymentMethods;
      let activePaymentMethods: string[] = [];
      if (Array.isArray(rawActiveMethods) && rawActiveMethods.length > 0) {
        activePaymentMethods = rawActiveMethods
          .map((id: string) => PAYMENT_METHOD_LABELS[id as keyof typeof PAYMENT_METHOD_LABELS] || id)
          .filter(Boolean);
      } else if (typeof rawActiveMethods === 'object' && rawActiveMethods !== null) {
        activePaymentMethods = Object.entries(rawActiveMethods)
          .filter(([_, val]) => val === true || val === 'true')
          .map(([key]) => PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS] || key.replace(/([A-Z])/g, ' $1').trim());
      }
      if (activePaymentMethods.length === 0) {
        activePaymentMethods = ['Efectivo'];
      }

      // 🔥 Social Networks
      const socialEntries = [
        { key: 'instagram', baseUrl: 'https://instagram.com/', user: tenant?.instagram },
        { key: 'facebook', baseUrl: 'https://facebook.com/', user: tenant?.facebook },
        { key: 'tiktok', baseUrl: 'https://tiktok.com/@', user: tenant?.tiktok },
        { key: 'x_twitter', baseUrl: 'https://twitter.com/', user: tenant?.x_twitter || tenant?.twitter },
        { key: 'threads', baseUrl: 'https://threads.net/@', user: tenant?.threads },
        { key: 'linkedin', baseUrl: 'https://linkedin.com/in/', user: tenant?.linkedin },
      ].filter(net => net.user && net.user.trim() !== '');

      return {
        specificConfig,
        isLight,
        heroBgColor,
        textColor,
        mutedTextColor,
        uniformBadgeStyle,
        uniformBadgeBg,        // ✅ NUEVO
        cardBorder,
        activeCurrencies,
        activePaymentMethods,
        socialEntries,
      };
    }, [tenant, headerIsLight, isSecondaryLight, headerBgColor, secondary]);

    // ✅ NUEVO: actualizar storeStatus DESPUÉS de hidratar (evita #418)
    useEffect(() => {
      const specificConfig = tenant?.specificConfig || tenant?.specific_config || {};
      setStoreStatus(checkIfStoreIsOpen(specificConfig));
    }, [tenant]);

    // 🔥 HOOKS (NO CAMBIAN)
    const { likes, isLiked, loading: likesLoading, toggleLike } = useStoreLikes({
      tenantId: tenant?.id,
      userId: userId,
    });

    const { ratingAvg, ratingCount, rating: userRating, loading: ratingLoading, submitRating } = useStoreRating({
      tenantId: tenant?.id,
      userId: userId,
    });

    // ✅ SINCRONIZAR RATING
    useEffect(() => {
      if (userRating !== null && userRating !== undefined) {
        setSelectedRating(userRating);
      }
    }, [userRating]);

    // ✅ CERRAR SELECTORES (OPTIMIZADO)
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ratingRef.current && !ratingRef.current.contains(event.target as Node)) {
          setShowRatingSelector(false);
        }
        if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
          setIsTooltipOpen(false);
        }
      };
      
      if (showRatingSelector || isTooltipOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showRatingSelector, isTooltipOpen]);

    // ✅ HANDLERS CON DEPENDENCIAS ESTABLES
    const handleShare = useCallback(async () => {
      const shareData = {
        title: tenant?.name || 'Tienda',
        text: `¡Visita ${tenant?.name || 'esta tienda'}!`,
        url: window.location.href,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          // Usuario canceló, no hacer nada
        }
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(window.location.href);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = window.location.href;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('No se pudo copiar el enlace', err);
      }
    }, [tenant]);

    const handleToggleLike = useCallback(() => {
      if (!isAuthenticated) return;
      toggleLike();
    }, [isAuthenticated, toggleLike]);

    const handleRatingClick = useCallback(() => {
      if (!isAuthenticated) return;
      setShowRatingSelector(prev => !prev);
    }, [isAuthenticated]);

    const handleStarClick = useCallback((i: number) => {
      if (!isAuthenticated) return;
      setSelectedRating(i);
      submitRating(i);
      setShowRatingSelector(false);
    }, [isAuthenticated, submitRating]);

    // ✅ RENDER DE ESTRELLAS (MEMOIZADO POR PROPS)
    const displayStars = useMemo(() => {
      const avg = Number(ratingAvg) || 0;
      const fullStars = Math.floor(avg);
      const hasHalfStar = avg % 1 !== 0 && avg > 0;
      const stars = [];
      const isLight = storeData.isLight;
      
      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          stars.push(<Star key={i} className="w-3.5 h-3.5 fill-current text-yellow-400" />);
        } else if (i === fullStars && hasHalfStar) {
          stars.push(
            <div key={i} className="relative w-3.5 h-3.5">
              <Star className="w-3.5 h-3.5 absolute text-slate-300/30" />
              <Star className="w-3.5 h-3.5 absolute clip-half text-yellow-400 fill-current" style={{ clipPath: 'inset(0 50% 0 0)' }} />
            </div>
          );
        } else {
          stars.push(
            <Star 
              key={i} 
              className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400/60' : 'text-slate-300/30'}`} 
            />
          );
        }
      }
      return stars;
    }, [ratingAvg, storeData.isLight]);

    const interactiveStars = useMemo(() => {
      const currentRating = selectedRating || 0;
      const displayRating = hoveredStar !== null ? hoveredStar : currentRating;
      const stars = [];
      
      for (let i = 1; i <= 5; i++) {
        const isActive = i <= displayRating;
        stars.push(
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHoveredStar(i)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => handleStarClick(i)}
            className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-110 ${
              isActive ? 'text-yellow-400' : 'text-slate-400/30'
            }`}
            title={`${i} estrella${i > 1 ? 's' : ''}`}
          >
            <Star className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
          </button>
        );
      }
      return stars;
    }, [selectedRating, hoveredStar, handleStarClick]);

    // ✅ SI NO HAY DATOS, NO RENDERIZAR
    if (!tenant?.name) return null;

    const { 
      isLight, 
      heroBgColor, 
      textColor, 
      mutedTextColor, 
      uniformBadgeStyle,
      uniformBadgeBg,        // ✅ AGREGAR ESTA LÍNEA
      cardBorder,
      activeCurrencies,
      activePaymentMethods,
      socialEntries,
    } = storeData;

    // ✅ USAR getImageUrl (con la misma lógica robusta del logo)
    const bannerUrl = useMemo(() => {
      if (!bannerSource) return null;

      const raw = String(bannerSource).trim();

      // Si ya es URL HTTPS, devolverla tal cual
      if (raw.startsWith('https://')) return raw;

      // Si es HTTP, extraer el path y reconstruirla
      if (raw.startsWith('http://')) {
        try {
          const url = new URL(raw);
          const path = url.pathname;
          if (path.startsWith('/api/uploads/')) return path;
          if (path.startsWith('/uploads/')) return `/api${path}`;
          return path;
        } catch {
          return raw;
        }
      }

      // Si ya empieza con /api/uploads/ o /uploads/, devolverlo tal cual
      if (raw.startsWith('/api/uploads/')) return raw;
      if (raw.startsWith('/uploads/')) return `/api${raw}`;

      // Si es una ruta relativa, procesarla con getImageUrl
      try {
        const processed = getImageUrl({ coverImage: raw });
        if (processed) return processed;
      } catch {
        // Silencioso
      }

      return raw;
    }, [bannerSource]);

    return (
      // 🔥 SECCIÓN FULL-WIDTH SIN PADDING LATERAL
  <section className="w-full" style={{ contain: 'layout paint style' }}>
        <style jsx global>{`
          .clip-half { clip-path: inset(0 50% 0 0); }
        `}</style>

        {/* 🔥 DIV PRINCIPAL SIN BORDES REDONDEADOS */}
  <div 
    className={`w-full relative overflow-hidden ${
      isLight ? 'bg-white/60' : 'bg-black/40'
    }`}

          style={{ 
            backgroundColor: heroBgColor,
            minHeight: '300px'
          }}
        >
          {/* 🔥 BANNER CON ALTURA FIJA PARA CLS = 0 */}
          {bannerUrl && isClient && (
    <div 
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ height: '100%' }} // ← CAMBIADO de '300px' a '100%'
    >
              <div className="relative w-full h-full">
                <Image
                  src={bannerUrl}
                  alt={tenant?.name || 'Banner de tienda'}
                  fill
                  className="object-cover"
                  priority={true}
                  quality={75}
                  loading="eager"
                  sizes="100vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
          style={{
            objectFit: 'cover',
            width: '100%',    // ← FORZAR ancho completo
            height: '100%',   // ← FORZAR alto completo
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
                
                {/* Gradiente adaptativo - se ajusta al modo claro/oscuro */}
                <div 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    background: `linear-gradient(to bottom, transparent 0%, ${heroBgColor} 100%)`,
                  }}
                />
                
                {primary && (
                  <div 
                    className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
                    style={{ backgroundColor: primary }} 
                  />
                )}
              </div>
            </div>
          )}

          {!bannerUrl && primary && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  background: `radial-gradient(ellipse at 50% 50%, ${primary}30 0%, ${primary}05 50%, transparent 70%)`,
                }}
              />
            </div>
          )}

          {/* 🔥 CONTENIDO CON PADDING INTERNO PARA QUE NO QUEDE PEGADO */}
          <div className={`relative z-10 pt-3 pb-6 px-6 sm:p-8 lg:p-10 ${layoutType === 'centered' ? 'flex flex-col items-center text-center' : 'grid grid-cols-1 lg:grid-cols-12 items-start gap-4 lg:gap-5'}`}>
            
            {layoutType === 'centered' ? (
              /* 🔥 LAYOUT CENTRADO - TODO EN UNA COLUMNA */
              <div className="flex flex-col items-center space-y-4 w-full max-w-3xl mx-auto">
                
                {/* Badges centrados */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* Estado */}
<div 
  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm  ${uniformBadgeStyle}`}
  style={{ backgroundColor: uniformBadgeBg }}
>                    <span className="relative flex h-1.5 w-1.5">
                      {storeStatus.isOpen && (
  <span className="hidden md:inline-flex absolute h-full w-full rounded-full opacity-75 bg-emerald-400" />
                      )}
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${storeStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
                      {storeStatus.label}
                    </span>
                  </div>

                  {/* Productos */}
                  <div 
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm  ${uniformBadgeStyle}`}
                    style={{ backgroundColor: uniformBadgeBg }}
                  >
                    <ShoppingBag className="w-3 h-3 shrink-0" 
                    style={{ color: primary || (isLight ? DEFAULT_THEME.primaryColor : DEFAULT_THEME.accentColor) }} />
                    <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                      {totalProducts > 0 ? `${totalProducts} ${isServiceStore ? 'servicios' : 'productos'}` : `Sin ${isServiceStore ? 'servicios' : 'productos'}`}
                    </span>
                  </div>

                  {/* Valoración */}
                  <div className="relative" ref={ratingRef}>
                    <button
                      type="button"
                      onClick={handleRatingClick}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm transition-transform hover:scale-105 ${uniformBadgeStyle}`}
                      style={{ backgroundColor: uniformBadgeBg }}
                      title={isAuthenticated ? 'Haz clic para valorar' : 'Inicia sesión para valorar'}
                    >
                      <div className="flex items-center gap-0.5">{displayStars}</div>
                      <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                        ({ratingCount > 0 ? Number(ratingAvg).toFixed(1) : '0.0'})
                      </span>
                    </button>

                    {showRatingSelector && isAuthenticated && (
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 p-2 rounded-xl border shadow-2xl  min-w-[160px] flex items-center justify-center gap-0.5"
                        style={{
                          backgroundColor: heroBgColor,
                          borderColor: cardBorder,
                        }}
                      >
                        <div className="flex items-center gap-0.5">{interactiveStars}</div>
                        <span className={`text-[9px] font-medium ml-1 ${mutedTextColor}`}>
                          {selectedRating ? `${selectedRating}/5` : 'Valorar'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Like */}
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    disabled={likesLoading || !isAuthenticated}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all cursor-pointer hover:scale-105 shadow-sm  ${
                      isLiked 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' 
                        : uniformBadgeStyle
                    } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={isLiked ? undefined : { backgroundColor: uniformBadgeBg }}
                    title={!isAuthenticated ? 'Inicia sesión para dar like' : ''}
                  >
                    <svg 
                      className="w-3 h-3 shrink-0 transition-colors duration-200"
                      viewBox="0 0 24 24"
                      fill={isLiked ? '#f43f5e' : 'none'}
                      stroke={isLiked ? '#f43f5e' : 'currentColor'}
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                      {likes}
                    </span>
                  </button>

                  {/* Compartir */}
                  <div className="relative" ref={tooltipRef}>
                    <button
                      type="button"
                      onClick={handleShare}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm  transition-all hover:scale-105 ${uniformBadgeStyle}`}
                      style={{ backgroundColor: uniformBadgeBg }}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className={`text-[9px] font-bold ${textColor}`}>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3" />
                          <span className={`text-[9px] font-bold ${textColor}`}>Compartir</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Título centrado */}
  <h2 
    className={`store-hero-title text-3xl sm:text-4xl lg:text-5xl tracking-tight ${textColor} leading-[1] drop-shadow-sm`}
    style={{ fontWeight: 700 }}
  >
    {tenant.name}
  </h2>

                <div className={`w-full max-w-xs h-[1px] bg-gradient-to-r ${isLight ? 'from-gray-800/50 via-gray-800/20 to-transparent' : 'from-white/50 via-white/20 to-transparent'}`} />

                {/* Descripción centrada */}
                {tenant.description && (
                  <p className={`text-[11px] sm:text-xs font-normal ${textColor} max-w-lg leading-relaxed ${isLight ? 'opacity-90' : 'opacity-90'}`}>
                    {tenant.description}
                  </p>
                )}

                {/* Redes sociales centradas */}
                {socialEntries.length > 0 && (
                  <div className="pt-0.5 flex flex-wrap items-center justify-center gap-2">
                    {socialEntries.map((net) => (
                      <a
                        key={net.key}
                        href={`${net.baseUrl}${net.user}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Visitar ${net.key}`}
                        className={`p-2 rounded-xl border transition-transform duration-300 hover:scale-110 flex items-center justify-center shadow-sm  ${uniformBadgeStyle}`}
                        style={{ color: primary, backgroundColor: uniformBadgeBg }} 
                      >
                        {getSocialIcon(net.key)}
                      </a>
                    ))}
                  </div>
                )}

                {/* Divisas y pagos centrados abajo */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a3.5 3.5 0 00-7 0v5a3.5 3.5 0 007 0v-5zm-3-3v11" />
                    </svg>
                    <span className={`font-semibold ${textColor}`}>
                      {activeCurrencies.length > 0 ? activeCurrencies.slice(0, 3).map(c => c.split(' ')[0]).join(', ') : 'USD, VES'}
                      {activeCurrencies.length > 3 && ` +${activeCurrencies.length - 3}`}
                    </span>
                  </div>

                  <span className={`w-px h-4 ${isLight ? 'bg-slate-300/40' : 'bg-white/20'}`} />

                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                    <span className={`font-semibold ${textColor}`}>
                      {activePaymentMethods.slice(0, 3).join(', ')}
                      {activePaymentMethods.length > 3 && ` +${activePaymentMethods.length - 3}`}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* 🔥 LAYOUT DEFAULT - 2 COLUMNAS (EL ACTUAL) */
              <>
                {/* Columna Izquierda */}
                <div className="space-y-4 lg:col-span-8">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Estado */}
                    <div 
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm  ${uniformBadgeStyle}`}
                      style={{ backgroundColor: uniformBadgeBg }}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                                              {storeStatus.isOpen && (
<span className="hidden md:inline-flex absolute h-full w-full rounded-full opacity-75 bg-emerald-400" />                        )}
 <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${storeStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
                        {storeStatus.label}
                      </span>
                    </div>

                    {/* Productos */}
                    <div 
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm  ${uniformBadgeStyle}`}
                      style={{ backgroundColor: uniformBadgeBg }}
                    >
                      <ShoppingBag className="w-3 h-3 shrink-0" style={{ color: primary || (isLight ? '#4f46e5' : '#818cf8') }} />
                       <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                        {totalProducts > 0 ? `${totalProducts} ${isServiceStore ? 'servicios' : 'productos'}` : `Sin ${isServiceStore ? 'servicios' : 'productos'}`}
                      </span>
                    </div>

                    {/* Valoración */}
                    <div className="relative" ref={ratingRef}>
                      <button
                        type="button"
                        onClick={handleRatingClick}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm  transition-transform hover:scale-105 ${uniformBadgeStyle}`}
                        style={{ backgroundColor: uniformBadgeBg }}
                        title={isAuthenticated ? 'Haz clic para valorar' : 'Inicia sesión para valorar'}
                      >
                        <div className="flex items-center gap-0.5">{displayStars}</div>
                        <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                          ({ratingCount > 0 ? Number(ratingAvg).toFixed(1) : '0.0'})
                        </span>
                      </button>

                      {showRatingSelector && isAuthenticated && (
                        <div className="absolute top-full mt-1 left-0 z-50 p-2 rounded-xl border shadow-2xl  min-w-[160px] flex items-center justify-center gap-0.5"
                          style={{
                            backgroundColor: heroBgColor,
                            borderColor: cardBorder,
                          }}
                        >
                          <div className="flex items-center gap-0.5">{interactiveStars}</div>
                          <span className={`text-[9px] font-medium ml-1 ${mutedTextColor}`}>
                            {selectedRating ? `${selectedRating}/5` : 'Valorar'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Like */}
                    <button
                      type="button"
                      onClick={handleToggleLike}
                      disabled={likesLoading || !isAuthenticated}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-transform cursor-pointer hover:scale-105 shadow-sm ${
                        isLiked 
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' 
                          : uniformBadgeStyle
                      } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={isLiked ? undefined : { backgroundColor: uniformBadgeBg }}
                      title={!isAuthenticated ? 'Inicia sesión para dar like' : ''}
                    >
                      <svg 
                        className="w-3 h-3 shrink-0 transition-colors duration-200"
                        viewBox="0 0 24 24"
                        fill={isLiked ? '#f43f5e' : 'none'}
                        stroke={isLiked ? '#f43f5e' : 'currentColor'}
                        strokeWidth="2"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span className={`text-[9px] font-bold tracking-wide ${textColor}`}>
                        {likes}
                      </span>
                    </button>

                    {/* Compartir */}
                    <div className="relative" ref={tooltipRef}>
                      <button
                        type="button"
                        onClick={handleShare}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm transition-all hover:scale-105 ${uniformBadgeStyle}`}
                        style={{ backgroundColor: uniformBadgeBg }}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className={`text-[9px] font-bold ${textColor}`}>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3 h-3" />
                            <span className={`text-[9px] font-bold ${textColor}`}>Compartir</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
  <h2 
    className={`store-hero-title text-3xl sm:text-4xl lg:text-5xl tracking-tight ${textColor} leading-[1] sm:drop-shadow-sm`}
    style={{ fontWeight: 700 }}
  >
    {tenant.name}
  </h2>
                  </div>

                  <div className={`w-full max-w-xs h-[1px] bg-gradient-to-r ${isLight ? 'from-gray-800/50 via-gray-800/20 to-transparent' : 'from-white/50 via-white/20 to-transparent'}`} />
                  
                  <div className="space-y-1.5">
                    {tenant.description && (
                      <p className={`text-[11px] sm:text-xs font-normal ${textColor} max-w-lg leading-relaxed ${isLight ? 'opacity-90' : 'opacity-90'}`}>
                        {tenant.description}
                      </p>
                    )}
                  </div>

                  {/* Redes sociales */}
                  {socialEntries.length > 0 && (
                    <div className="pt-0.5 flex flex-wrap items-center gap-2">
                      {socialEntries.map((net) => (
                        <a
                          key={net.key}
                          href={`${net.baseUrl}${net.user}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Visitar ${net.key}`}
                          className={`p-2 rounded-xl border transition-all duration-300 hover:scale-110 flex items-center justify-center  shadow-sm ${uniformBadgeStyle}`}
                          style={{ color: primary, backgroundColor: uniformBadgeBg }}
                        >
                          {getSocialIcon(net.key)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Columna Derecha */}
                <div className="lg:col-span-4 flex justify-start lg:justify-end items-start h-full">
                  <div className="w-full sm:w-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
                    
                    {/* Divisas */}
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a3.5 3.5 0 00-7 0v5a3.5 3.5 0 007 0v-5zm-3-3v11" />
                      </svg>
                      <span className={`font-semibold ${textColor}`}>
                        {activeCurrencies.length > 0 ? activeCurrencies.slice(0, 3).map(c => c.split(' ')[0]).join(', ') : 'USD, VES'}
                        {activeCurrencies.length > 3 && ` +${activeCurrencies.length - 3}`}
                      </span>
                    </div>

                    <span className={`w-px h-4 ${isLight ? 'bg-slate-300/40' : 'bg-white/20'}`} />

                    {/* Pagos */}
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" style={{ color: primary }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                      <span className={`font-semibold ${textColor}`}>
                        {activePaymentMethods.slice(0, 3).join(', ')}
                        {activePaymentMethods.length > 3 && ` +${activePaymentMethods.length - 3}`}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    );
  });

  StoreHero.displayName = 'StoreHero';

  export default StoreHero;