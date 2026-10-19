  // ARCHIVO: frontend/src/components/Header.tsx

  'use client';

  import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
  import Link from 'next/link';
  import { useRouter } from 'next/navigation';
  import AuthModal from './AuthModal';
  import NotificationsBell from './NotificationsBell';
  import GlobalSearch from './GlobalSearch';
  import FavoritesDropdown from './FavoritesDropdown';
  import LocationButton from './LocationButton';
  import { getAccountPath } from '@/lib/accountPath';
  import { performLogout } from '@/lib/auth/logout';
import { canSeeBuyerFeatures } from '@/lib/roles';
  type StoreType = 'tienda' | 'servicio';

  interface Store {
    id: string;
    name: string;
    slug: string;
    slogan?: string;
    logoUrl?: string;
    type?: StoreType;
    niche?: string;
  }

  export default function Header() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const [stores, setStores] = useState<Store[]>([]);
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [user, setUser] = useState<{ 
      id: string; 
      name: string; 
      email: string; 
      role?: string;
      onboardingCompleted?: boolean;
    } | null>(null);
    
    const [tenant, setTenant] = useState<{ id: string; name: string; slug: string; logo?: string; logoUrl?: string } | null>(null);

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [initialAuthMode, setInitialAuthMode] = useState<boolean>(false);
  // 🔥 Fase 6.6: inicializar con `false` (idéntico en SSR y cliente).
  // El valor real se calcula en un useEffect después del mount.
  // Esto evita el hydration mismatch (#418).
  const [isLight, setIsLight] = useState<boolean>(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    
    const [activePaletteSecondary, setActivePaletteSecondary] = useState('#0f172a');
    // ✅ NUEVO: saber si estamos en el cliente (evita #418)
  const [isClient, setIsClient] = useState(false);

    // ✅ NUEVO: marcar como cliente después del mount (evita #418)
    useEffect(() => {
      setIsClient(true);
    }, []);

    // 🔥 Fase 6.6: cargar el theme guardado DESPUÉS del mount (evita hydration mismatch).
    useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem('selected_app_theme');
        if (stored) {
          const palette = JSON.parse(stored);
          const bg = (palette.background || '').replace('#', '');
          if (bg.length === 6) {
            const r = parseInt(bg.substr(0, 2), 16);
            const g = parseInt(bg.substr(2, 2), 16);
            const b = parseInt(bg.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            setIsLight(brightness > 140);
            return;
          }
        }
        // Fallback: leer la CSS var por si ya está seteada
        const cssBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        if (cssBg) {
          const bg = cssBg.replace('#', '');
          if (bg.length === 6) {
            const r = parseInt(bg.substr(0, 2), 16);
            const g = parseInt(bg.substr(2, 2), 16);
            const b = parseInt(bg.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            setIsLight(brightness > 140);
          }
        }
      } catch {}
    }, []);

    // ✅ MEMOIZAR LOGO
    const logoSource = useMemo(() => {
      if (tenant?.logoUrl) return tenant.logoUrl;
      if (tenant?.logo) return tenant.logo;
      return null;
    }, [tenant?.logoUrl, tenant?.logo]);

    // ✅ MEMOIZAR ESTADOS DERIVADOS
    const isLoggedIn = useMemo(() => !!user, [user]);
    const hasTenant = useMemo(() => !!tenant?.slug, [tenant?.slug]);
    const isOnboardingComplete = useMemo(() => user?.onboardingCompleted !== false, [user?.onboardingCompleted]);

    // ✅ MEMOIZAR ESTILOS
    const styles = useMemo(() => ({
      textColor: isLight ? 'text-slate-900' : 'text-white',
      mutedTextColor: isLight ? 'text-slate-600' : 'text-slate-300',
      borderColor: isLight ? 'border-slate-200' : 'border-white/10',
      hoverBg: isLight ? 'hover:bg-black/5' : 'hover:bg-white/5',
      placeholderColor: isLight ? 'placeholder-slate-500' : 'placeholder-slate-400',
      searchBg: isLight 
        ? 'bg-white/40 border-slate-900/15 text-slate-900' 
        : 'bg-black/25 border-white/15 text-white',
      mobileSearchBtnBg: isLight 
        ? 'bg-white/40 text-slate-800 border-slate-900/15' 
        : 'bg-black/25 text-slate-200 border-white/15',
    }), [isLight]);

    // 🔥 NOTA: Los useEffect que reenviaban 'globalRefresh' → 'notificationUpdate'
    // fueron eliminados porque no aportaban funcionalidad y agregaban listeners
    // innecesarios. Si en el futuro se necesita, agregar acá con un caso de uso concreto.

    // ✅ FUNCIONES SEGURAS CON useCallback
    const safeSetIsLight = useCallback((value: boolean) => {
      setTimeout(() => {
        setIsLight(value);
      }, 0);
    }, []);

    const safeSetActivePaletteSecondary = useCallback((value: string) => {
      setTimeout(() => {
        setActivePaletteSecondary(value);
      }, 0);
    }, []);

    // ✅ checkBackgroundBrightness con useCallback
    const checkBackgroundBrightness = useCallback(() => {
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();

      console.log('🔍 [Header] bgColor detectado:', bgColor);
      
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
          const newIsLight = brightness > 140;
          console.log('🔍 [Header] isLight calculado:', newIsLight, 'brillo:', brightness);
          safeSetIsLight(newIsLight);
          return;
        }
      }
      
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      if (bodyBg) {
        const rgb = bodyBg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
          safeSetIsLight(brightness > 140);
          return;
        }
      }
      
      safeSetIsLight(false);
    }, [safeSetIsLight]);

    // ✅ updatePaletteSecondary con useCallback
    const updatePaletteSecondary = useCallback(() => {
      const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
      if (secondaryColor) {
        safeSetActivePaletteSecondary(secondaryColor);
      } else {
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        safeSetActivePaletteSecondary(bgColor || (isLight ? '#ffffff' : '#0f172a'));
      }
    }, [safeSetActivePaletteSecondary, isLight]);

    // ✅ syncAuthState con useCallback
    const syncAuthState = useCallback(() => {
      const storedUser = localStorage.getItem('user');
      const storedTenant = localStorage.getItem('tenant');
      
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch (e) { setUser(null); }
      } else {
        setUser(null);
      }

      if (storedTenant) {
        try { 
          const parsed = JSON.parse(storedTenant);
          setTenant(parsed);
        } catch (e) { setTenant(null); }
      } else {
        setTenant(null);
      }
    }, []);

    // ✅ handleThemeChange con useCallback
    const handleThemeChange = useCallback(() => {
      console.log('🎨 [Header] Tema cambiado, recalculando isLight');
      setTimeout(() => {
        checkBackgroundBrightness();
        updatePaletteSecondary();
      }, 0);
    }, [checkBackgroundBrightness, updatePaletteSecondary]);

    // ✅ handleClickOutside con useCallback
    const handleClickOutside = useCallback((event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }, []);

    // ✅ handleSearch con useCallback
    const handleSearch = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      if (searchTerm.trim()) {
        router.push(`/tienda/${searchTerm.trim().toLowerCase()}`);
        setShowDropdown(false);
        setIsSearchOpen(false);
      }
    }, [searchTerm, router]);

    // ✅ handleAuthSuccess con useCallback
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
      setIsMobileMenuOpen(false);

      const activeTenantSlug = data.tenant?.slug || tenant?.slug;
      const role = (data.user?.role || '').toLowerCase();

      if (data.user?.onboardingCompleted === false) {
        router.push('/onboarding?new=true');
      } else if (role === 'repartidor') {
        router.push('/repartidor');
      } else if (role === 'profesional') {
        router.push('/profesional');
      } else if (role === 'buyer' || role === 'comprador' || !activeTenantSlug) {
        router.push('/mi-cuenta');
      } else if (activeTenantSlug) {
        router.push(`/admin/${activeTenantSlug}`);
      } else {
        router.push('/');
      }
    }, [router, tenant?.slug]);

    // ✅ handleLogout con useCallback
    const handleLogout = useCallback(() => {
      setUser(null);
      setTenant(null);
      setIsMobileMenuOpen(false);
      performLogout({ redirectTo: '/' });
    }, []);

  useEffect(() => {
    syncAuthState();
    
    // ✅ DETECTAR SI ESTAMOS EN MI CUENTA
    const isMiCuenta = typeof window !== 'undefined' && window.location.pathname === '/mi-cuenta';
    
    // ✅ SI ESTAMOS EN MI CUENTA, NO ESCUCHAR EVENTOS DE TEMA
    if (isMiCuenta) {
      console.log('⏭️ [Header] Ignorando eventos de tema en Mi Cuenta');
      // Solo sincronizar autenticación y salir
      return () => {};
    }

    setTimeout(() => {
      checkBackgroundBrightness();
      updatePaletteSecondary();
    }, 100);

    const handleStorage = syncAuthState;
    const handleTheme = () => {
      setTimeout(() => {
        checkBackgroundBrightness();
        updatePaletteSecondary();
      }, 0);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('authChange', handleStorage);
    window.addEventListener('userChange', handleStorage);
    window.addEventListener('themeChange', handleTheme);
    window.addEventListener('paletteChange', handleTheme);
    window.addEventListener('tenantThemeUpdated', handleTheme);

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('authChange', handleStorage);
      window.removeEventListener('userChange', handleStorage);
      window.removeEventListener('themeChange', handleTheme);
      window.removeEventListener('paletteChange', handleTheme);
      window.removeEventListener('tenantThemeUpdated', handleTheme);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [syncAuthState, checkBackgroundBrightness, updatePaletteSecondary, handleClickOutside]);

    // ✅ EFECTO DE BÚSQUEDA - Optimizado
    useEffect(() => {
      const query = searchTerm.trim();
      if (query.length < 1) {
        setStores([]);
        setShowDropdown(false);
        return;
      }

      setIsLoadingStores(true);
      setShowDropdown(true);

      const fetchStores = async () => {
        try {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants?search=${encodeURIComponent(query)}`);
  if (res.ok) {
    const data = await res.json();
    let storesData = Array.isArray(data) ? data : (data.tenants || []);
    
    // ✅ Asegurar que sea un array y limitar a 5
    if (!Array.isArray(storesData)) {
      storesData = [];
    }
    storesData = storesData.slice(0, 5);
    
    const storesWithType = storesData.map((store: any) => ({
      ...store,
      type: store.niche?.includes('servicio') || store.niche?.includes('cafe') ? 'servicio' : 'tienda'
    }));
    setStores(storesWithType);
  } else {
            setStores([]);
          }
        } catch (error) {
          console.error('Error buscando tiendas:', error);
          setStores([]);
        } finally {
          setIsLoadingStores(false);
        }
      };

  const timer = setTimeout(fetchStores, 500); // ✅ 500ms en lugar de 300ms
      return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
      <>
<div
  className="sticky top-0 z-50 w-full transition-colors duration-500"
  style={{ backgroundColor: 'color-mix(in srgb, var(--bg-color, #0b0f19) 85%, transparent)' }}
>  <header className="w-full bg-transparent px-2 sm:px-4 py-3.5 flex items-center justify-between relative">          
            {/* LOGO */}
            <Link href="/" className="flex items-center space-x-2 group cursor-pointer z-10 shrink-0">
              <span className={`text-xl sm:text-2xl font-black tracking-tight ${styles.textColor} drop-shadow-md transition-colors duration-500`}>
                facil<span style={{ color: 'var(--accent-color, #ea580c)' }}>i</span>to
              </span>
            </Link>

            {/* 🔥 BUSCADOR GLOBAL - REDUCIDO */}
            <div className="flex-1 max-w-sm mx-2 sm:mx-3">
              {isClient && (
                <GlobalSearch
                  isLight={isLight}
                  textColor={styles.textColor}
                  mutedTextColor={styles.mutedTextColor}
                  placeholderColor={styles.placeholderColor}
                  searchBg={styles.searchBg}
                  primaryColor="var(--accent-color, #ea580c)"
                  // 🔥 NO pasar secondary: el dropdown debe heredar el --bg-color
                  // (matchear el fondo de la home), no el secondary del palette.
                  isCompact={true}
                />
              )}
            </div>

            {/* ACCIONES - Desktop */}
            <div className="hidden md:flex items-center space-x-2 sm:space-x-3 z-10 shrink-0">
              {isLoggedIn && user ? (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className={`hidden lg:inline text-xs font-bold ${styles.textColor} drop-shadow transition-colors duration-500`}>
                    Hola, {user.name}
                  </span>

                  {isOnboardingComplete ? (
                    <>
                    {/* 🔥 FAVORITOS — visible para todos menos repartidor/profesional */}
                    {user.id && isClient && canSeeBuyerFeatures(user) && (
                      <FavoritesDropdown
                          userId={user.id}
                          isLight={isLight}
                          textColor={styles.textColor}
                          mutedTextColor={styles.mutedTextColor}
                          borderColor={styles.borderColor}
                          hoverBg={styles.hoverBg}
                          primaryColor="var(--accent-color, #ea580c)"
                          secondary={activePaletteSecondary}
                        />
                      )}

                      {/* NOTIFICACIONES */}
                      {user.id && isClient && (
                        <NotificationsBell
                          userId={user.id}
                          isLight={isLight}
                          textColor={styles.textColor}
                          mutedTextColor={styles.mutedTextColor}
                          borderColor={styles.borderColor}
                          hoverBg={styles.hoverBg}
                          primaryColor="var(--accent-color, #ea580c)"
                          secondary={activePaletteSecondary}
                          className="hidden sm:block"
                        />
                      )}

                    {/* 🔥 MI CUENTA — visible para todos menos repartidor/profesional */}
                    {canSeeBuyerFeatures(user) && (
                      <button
                        type="button"
                        onClick={() => router.push(getAccountPath(user))}
                        className={`p-2 rounded-xl border ${styles.borderColor} bg-white/5 transition-all duration-300 cursor-pointer ${styles.hoverBg} ${styles.textColor}`}
                        title="Mi Cuenta"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </button>
                    )}

                    {hasTenant && tenant && (
                        <>
                          <Link
                            href={`/tienda/${tenant.slug}`}
                            target="_blank"
                            className={`p-2 rounded-xl border ${styles.borderColor} bg-white/5 transition-all duration-300 cursor-pointer ${styles.hoverBg} ${styles.textColor}`}
                            title="Mi Tienda"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </Link>

                          <button
                            type="button"
                            onClick={() => router.push(`/admin/${tenant.slug}`)}
                            className="p-2 rounded-xl shadow-lg transition-all duration-300 cursor-pointer hover:opacity-90"
                            style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
                            title="Panel de Control"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push('/onboarding?new=true')}
                      className="text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg transition-all duration-300 cursor-pointer hover:opacity-90 animate-pulse"
                      style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
                    >
                      Completar Registro
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`p-2 rounded-xl ${styles.mutedTextColor} hover:text-red-500 transition cursor-pointer`}
                    title="Cerrar sesión"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <LocationButton
                    isLight={isLight}
                    textColor={styles.textColor}
                    mutedTextColor={styles.mutedTextColor}
                    borderColor={styles.borderColor}
                    hoverBg={styles.hoverBg}
                  />
                                  <button
                    type="button"
                    onClick={() => {
                      setInitialAuthMode(true);
                      setIsAuthModalOpen(true);
                    }}
                    className={`text-xs font-bold ${styles.textColor} hover:opacity-80 px-3 py-2 transition cursor-pointer`}
                  >
                    Iniciar Sesión
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      router.push('/onboarding?new=true');
                    }}
                    className="text-white text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl shadow-lg transition-all duration-300 cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
                  >
                    Registrarse
                  </button>
                </div>
              )}
            </div>

            {/* BOTONES MÓVIL */}
            {isClient && (
              <div className="flex md:hidden items-center space-x-2 z-10">
                <LocationButton
                  compact
                  isLight={isLight}
                  textColor={styles.textColor}
                  mutedTextColor={styles.mutedTextColor}
                  borderColor={styles.borderColor}
                  hoverBg={styles.hoverBg}
                />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`p-2.5 rounded-2xl ${styles.mobileSearchBtnBg} backdrop-blur-md hover:opacity-80 transition cursor-pointer border shadow-lg`}
                  aria-label="Menú"
                >
                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            )}
          </header>
          {isMobileMenuOpen && (
            <div className={`md:hidden px-4 pb-4 pt-2 border-t ${styles.borderColor}`}>
              <div className="flex flex-col space-y-2">
                {isLoggedIn && user ? (
                  <>
                    <div className={`text-sm font-bold ${styles.textColor} px-1 py-1`}>
                      Hola, {user.name}
                    </div>

                    {isOnboardingComplete ? (
                      <>
                        {canSeeBuyerFeatures(user) && (
                          <button
                            type="button"
                            onClick={() => {
                              router.push(getAccountPath(user));
                              setIsMobileMenuOpen(false);
                            }}
                            className={`text-sm font-medium px-4 py-2.5 rounded-xl border ${styles.borderColor} bg-white/5 ${styles.hoverBg} transition ${styles.textColor} text-left`}
                          >
                            Mi Cuenta
                          </button>
                        )}

                        {hasTenant && tenant && (
                          <>
                            <Link
                              href={`/tienda/${tenant.slug}`}
                              target="_blank"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`text-sm font-medium px-4 py-2.5 rounded-xl border ${styles.borderColor} bg-white/5 ${styles.hoverBg} transition ${styles.textColor}`}
                            >
                              Ver Mi Tienda
                            </Link>

                            <button
                              onClick={() => {
                                router.push(`/admin/${tenant.slug}`);
                                setIsMobileMenuOpen(false);
                              }}
                              className="text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition w-full text-left"
                              style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
                            >
                              Ir al Panel
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          router.push('/onboarding?new=true');
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition w-full text-left animate-pulse"
                        style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
                      >
                        Completar Registro
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className={`text-sm font-medium ${styles.mutedTextColor} hover:text-red-500 px-4 py-2.5 rounded-xl transition w-full text-left`}
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setInitialAuthMode(true);
                        setIsAuthModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`text-sm font-bold ${styles.textColor} px-4 py-2.5 rounded-xl border ${styles.borderColor} bg-white/5 ${styles.hoverBg} transition w-full text-left`}
                    >
                      Iniciar Sesión
                    </button>

                    <button
                      onClick={() => {
                        router.push('/onboarding?new=true');
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition w-full text-left"
                      style={{ backgroundColor: 'var(--accent-color, #ea580c)' }}
                    >
                      Registrarse
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          initialIsLogin={initialAuthMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }