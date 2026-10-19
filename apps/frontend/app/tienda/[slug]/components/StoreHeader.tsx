'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Home, Heart, Monitor, X, User, Store, LayoutDashboard, LogOut, Menu, Star, Package, Wrench, Wallet } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import NotificationsBell from '@/components/NotificationsBell';
import { useRouter } from 'next/navigation';
import { useStoreLikes } from '@/hooks/useStoreLikes';
import { getTenantConfig, _loadFontAsset } from '@/lib/fontLoader';
import { getAccountPath } from '@/lib/accountPath';
import { performLogout } from '@/lib/auth/logout';
import { apiFetch } from '@/lib/api';

import { useStoreRating } from '@/hooks/useStoreRating';
import GlobalSearch from '@/components/GlobalSearch';

export default function StoreHeader({
  tenant,
  logoSource,
  primary,
  secondary,
  isSecondaryLight,
  searchQuery,
  setSearchQuery,
  cartItemsCount,
  onOpenMobileCart,
  favoritesCount = 0,
  onOpenFavorites,
  isUserOperative = false,
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kioskToken = searchParams.get('kiosk');
  const isKioskMode = Boolean(kioskToken);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialIsLogin, setInitialIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderSolid, setIsHeaderSolid] = useState(false);

  // 🔥 Búsqueda de catálogo - ahora contraída por defecto
  const [isCatalogSearchExpanded, setIsCatalogSearchExpanded] = useState(false);
  const [catalogSearchValue, setCatalogSearchValue] = useState('');
  const catalogSearchInputRef = useRef<HTMLInputElement>(null);
  const catalogSearchRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [storeCredit, setStoreCredit] = useState<number | null>(null);

  // ✅ Colores con lógica mejorada para modo claro/oscuro
  const textColor = isSecondaryLight ? 'text-slate-800' : 'text-white';
  const mutedTextColor = isSecondaryLight ? 'text-slate-500' : 'text-slate-300';
  const borderColor = isSecondaryLight ? 'border-slate-200' : 'border-white/10';
  const hoverBg = isSecondaryLight ? 'hover:bg-slate-100' : 'hover:bg-white/10';
  const iconBg = isSecondaryLight ? 'bg-slate-100/60 hover:bg-slate-200/80' : 'bg-white/5 hover:bg-white/10';
  const iconBorder = isSecondaryLight ? 'border-slate-200' : 'border-white/10';
  const searchBg = isSecondaryLight ? 'bg-slate-100/60 hover:bg-slate-200/60' : 'bg-white/5 hover:bg-white/10';

  // Memoizar valores para evitar re-renders
  const safePrimary = useMemo(() => primary || '#F59E0B', [primary]);

  useEffect(() => {
    try {
      const userString = localStorage.getItem('user');
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');

      if (userString && token) {
        const userData = JSON.parse(userString);
        const id = userData.id || userData._id || userData.userId || null;
        setUserId(id);
      }
    } catch (e) {
      console.error('Error al obtener usuario en StoreHeader:', e);
    }
  }, []);

  // 🔥 Fetch del saldo a favor del user en ESTA tienda
  useEffect(() => {
    let cancelled = false;

    const fetchStoreCredit = async () => {
      if (!userId || !tenant?.id) {
        setStoreCredit(null);
        return;
      }

      try {
        const res = await apiFetch('/account/credit/tenants');
        if (!res.ok) {
          setStoreCredit(null);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const match = list.find(
          (c: any) => String(c.tenantId) === String(tenant.id),
        );
        if (!cancelled) {
          setStoreCredit(match ? Number(match.balance) : null);
        }
      } catch {
        if (!cancelled) setStoreCredit(null);
      }
    };

    fetchStoreCredit();

    // Escuchar refreshes globales (post-compra, post-vuelto, etc.)
    const handler = () => fetchStoreCredit();
    if (typeof window !== 'undefined') {
      window.addEventListener('globalRefresh', handler);
      window.addEventListener('notificationUpdate', handler);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('globalRefresh', handler);
        window.removeEventListener('notificationUpdate', handler);
      }
    };
  }, [userId, tenant?.id]);

  const { likes } = useStoreLikes({
    tenantId: tenant?.id,
    userId: userId,
  });

  // 🔥 RATING - COMENTADO PARA USO FUTURO
  // const { ratingAvg, ratingCount } = useStoreRating({
  //   tenantId: tenant?.id,
  //   userId: userId,
  // });

  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        setCurrentUser(null);
      }
    };

    checkUserSession();
    window.addEventListener('authChange', checkUserSession);
    window.addEventListener('storage', checkUserSession);

    return () => {
      window.removeEventListener('authChange', checkUserSession);
      window.removeEventListener('storage', checkUserSession);
    };
  }, [tenant]);

    // ✅ CARGAR LA FUENTE DEL TENANT EN EL HEADER
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!tenant?.slug) return;
    
    const tenantSlug = tenant.slug;
    const config = getTenantConfig(tenantSlug);
    const fontFamily = config?.fontFamily || 'Quicksand';
    
    // 🔥 CARGAR LA FUENTE CON TODOS LOS PESOS
    _loadFontAsset(fontFamily);
    
    // 🔥 APLICAR AL HEADER DIRECTAMENTE
    const header = document.querySelector('.store-header');
    if (header) {
      (header as HTMLElement).style.fontFamily = fontFamily;
      // NO forzar fontWeight para que los hijos mantengan sus pesos
    }
    
    console.log(`🔤 [StoreHeader] Fuente aplicada: ${fontFamily}`);
  }, [tenant?.slug]);

  // Expandir búsqueda de catálogo y enfocar
  useEffect(() => {
    if (isCatalogSearchExpanded && catalogSearchInputRef.current) {
      catalogSearchInputRef.current.focus();
    }
  }, [isCatalogSearchExpanded]);

  // Cerrar búsqueda al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catalogSearchRef.current && !catalogSearchRef.current.contains(event.target as Node)) {
        setIsCatalogSearchExpanded(false);
        setCatalogSearchValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincronizar con el searchQuery externo
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== catalogSearchValue) {
      setCatalogSearchValue(searchQuery || '');
    }
  }, [searchQuery]);

  // 🔥 Header sólido al scrollear (sin blur)
  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderSolid(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenAuth = useCallback((isLoginMode: boolean) => {
    setInitialIsLogin(isLoginMode);
    setIsAuthModalOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    setCurrentUser(null);
    await performLogout({ redirectTo: window.location.pathname });
  }, []);

  const handleCatalogSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (setSearchQuery && catalogSearchValue.trim()) {
      setSearchQuery(catalogSearchValue.trim());
    }
    setIsCatalogSearchExpanded(false);
  }, [catalogSearchValue, setSearchQuery]);

  const handleCatalogSearchChange = useCallback((value: string) => {
    setCatalogSearchValue(value);
    if (setSearchQuery) {
      setSearchQuery(value);
    }
  }, [setSearchQuery]);

  const isOwnerOfThisStore = useMemo(() => {
    if (!currentUser || !tenant) return false;

    const userTenantId = currentUser.tenantId || currentUser.tenant_id;
    if (userTenantId && tenant.id && String(userTenantId) === String(tenant.id)) {
      return true;
    }

    try {
      const storedTenantStr = localStorage.getItem('tenant');
      if (storedTenantStr) {
        const storedTenant = JSON.parse(storedTenantStr);
        if (storedTenant && (String(storedTenant.id) === String(tenant.id) || storedTenant.slug === tenant.slug)) {
          return true;
        }
      }
    } catch (e) {}

    if (currentUser.tenant) {
      const t = currentUser.tenant;
      if (t.slug === tenant.slug || (t.id && tenant.id && String(t.id) === String(tenant.id))) {
        return true;
      }
    }

    return false;
  }, [currentUser, tenant]);
  if (!tenant) {
    return (
      <header className="sticky top-0 z-50 w-full px-3 sm:px-4 py-4 border-b bg-black/70 border-white/10">
          <div className="w-full flex justify-between items-center">
          <div className="animate-pulse flex items-center space-x-3">
            <div className="h-10 w-10 bg-white/10 rounded-xl"></div>
            <div className="h-4 w-32 bg-white/10 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
<header
  className={`store-header sticky top-0 z-50 w-full px-3 sm:px-4 lg:px-6 py-2.5 border-b transition-all duration-200 ${
    isHeaderSolid
      ? 'shadow-md'
      : (isSecondaryLight ? 'shadow-sm' : 'shadow-lg')
  } ${
    isSecondaryLight
      ? 'border-slate-200/60'
      : 'border-white/10'
  }`}
  style={{
    backgroundColor: isHeaderSolid
      ? (isSecondaryLight ? '#ffffff' : (secondary || '#0f172a'))
      : (isSecondaryLight 
          ? 'rgba(255, 255, 255, 0.85)' 
          : `${secondary ? secondary + 'D9' : 'rgba(0, 0, 0, 0.85)'}`),
    // 🔥 NUEVO: forzar color de texto y borde explícitos (no heredar del documentElement)
    color: isSecondaryLight ? '#1e293b' : '#ffffff',
    borderColor: isSecondaryLight ? 'rgba(226, 232, 240, 0.6)' : 'rgba(255, 255, 255, 0.1)',
  }}
>
        <div className="w-full flex items-center justify-between gap-3">
          {/* LOGO + SLOGAN */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
{logoSource ? (
  <div className="h-11 sm:h-12 flex items-center justify-center shrink-0">
    <img
      src={(() => {
        if (!logoSource) return logoSource;
        const raw = String(logoSource).trim();
        if (raw.startsWith('https://')) return raw;
        if (raw.startsWith('http://')) {
          try {
            const url = new URL(raw);
            const path = url.pathname;
            if (path.startsWith('/api/uploads/')) return path;
            if (path.startsWith('/uploads/')) return `/api${path}`;
            return path;
          } catch { return raw; }
        }
        if (raw.startsWith('/api/uploads/')) return raw;
        if (raw.startsWith('/uploads/')) return `/api${raw}`;
        return raw;
      })()}
      alt={tenant.name}
      className="h-10 sm:h-11 w-auto max-w-[120px] sm:max-w-[180px] object-contain"
      loading="eager"
      width="180"
      height="44"
      style={{
        width: 'auto',
        height: '40px',
        maxWidth: '120px',
        objectFit: 'contain',
      }}
    />
  </div>
) : (
<div
  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center font-black text-sm shadow-inner shrink-0"
  style={{ backgroundColor: safePrimary + '25', color: safePrimary }}
>
  <span style={{ fontSize: '14px', fontWeight: 900 }}>
    {tenant.name?.charAt(0) || 'T'}
  </span>
</div>
            )}

            <div className="hidden sm:flex items-center space-x-3 min-w-0 flex-1">
              <div className={`h-5 w-[1px] ${isSecondaryLight ? 'bg-slate-300' : 'bg-white/15'}`}></div>

              {/* SLOGAN */}
              {tenant.slogan && (
                <div className="flex items-center min-w-0 flex-1">
                  <span className={`text-xs whitespace-nowrap ${isSecondaryLight ? 'text-slate-900' : 'text-white'}`}>
                    {tenant.slogan}
                  </span>
                </div>
              )}

              {isKioskMode && (
                <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block w-fit shrink-0">
                  Kiosco
                </span>
              )}
            </div>

                        {/* Slogan en mobile — solo si es corto */}
            {tenant.slogan && tenant.slogan.length < 30 && (
              <div className="flex sm:hidden items-center min-w-0 flex-1 ml-2">
                <span className={`text-[10px] truncate ${isSecondaryLight ? 'text-slate-900' : 'text-white'} opacity-80`}>
                  {tenant.slogan}
                </span>
              </div>
            )}
          </div>

          {/* BÚSQUEDA GLOBAL */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-2">
            <GlobalSearch
              isLight={isSecondaryLight}
              textColor={textColor}
              mutedTextColor={mutedTextColor}
              placeholderColor={isSecondaryLight ? 'placeholder-slate-400' : 'placeholder-slate-400'}
              searchBg={searchBg}
              primaryColor={safePrimary}
              secondary={secondary}
              isCompact={true}
            />
          </div>

          {/* ACCIONES - Desktop */}
          <div className="hidden lg:flex items-center gap-1.5 z-10 shrink-0">
            {/* Grupo izquierdo: Home y Búsqueda de catálogo */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push('/')}
                className={`p-2 rounded-lg border ${iconBorder} ${iconBg} cursor-pointer ${textColor} hover:scale-105 h-9 w-9 flex items-center justify-center`}
                title="Ir al inicio"
              >
                <Home className="w-4 h-4" />
              </button>

              <div ref={catalogSearchRef} className="relative">
                {isCatalogSearchExpanded ? (
                  <form
                    onSubmit={handleCatalogSearch}
                    className={`flex items-center rounded-lg border ${iconBorder} ${searchBg} overflow-hidden w-[200px] h-9`}
                  >
                    <span className="pl-2.5 pointer-events-none text-slate-400 shrink-0">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      ref={catalogSearchInputRef}
                      type="text"
                      placeholder="Buscar en tienda..."
                      value={catalogSearchValue}
                      onChange={(e) => handleCatalogSearchChange(e.target.value)}
                      className={`w-full px-1.5 py-1.5 text-xs outline-none bg-transparent ${textColor} placeholder:text-slate-400 min-w-[80px] h-full`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogSearchExpanded(false);
                        setCatalogSearchValue('');
                        if (setSearchQuery) setSearchQuery('');
                      }}
                      className="px-2 text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {/* Botón "Ir" eliminado: el filtrado es en vivo (onChange) */}
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCatalogSearchExpanded(true)}
                    className={`p-2 rounded-lg border ${iconBorder} ${iconBg} cursor-pointer ${textColor} hover:scale-105 relative h-9 w-9 flex items-center justify-center`}
                    title="Buscar en esta tienda"
                  >
                    <Search className="w-4 h-4" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap" style={{ color: mutedTextColor }}>
                      Buscar aquí
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className={`h-6 w-[1px] ${isSecondaryLight ? 'bg-slate-300' : 'bg-white/15'}`}></div>

            {/* Grupo derecho: Iconos de usuario */}
            <div className="flex items-center gap-1.5">
              {currentUser ? (
                <>
                  {/* FAVORITOS — oculto para repartidor/profesional */}
                  {!isUserOperative && (
                    <button
                      onClick={onOpenFavorites}
                      className={`relative p-2 rounded-lg border ${iconBorder} ${iconBg} cursor-pointer ${textColor} hover:scale-105 h-9 w-9 flex items-center justify-center`}
                      title="Favoritos"
                    >
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                      {favoritesCount > 0 && (
                        <span
                          className="absolute -top-1 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg text-slate-950"
                          style={{ backgroundColor: safePrimary }}
                        >
                          {favoritesCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* NOTIFICACIONES */}
                  {currentUser.id && (
                    <div className="flex items-center">
                      <NotificationsBell
                        userId={currentUser.id}
                        isLight={isSecondaryLight}
                        textColor={textColor}
                        mutedTextColor={mutedTextColor}
                        borderColor={iconBorder}
                        hoverBg={iconBg}
                        primaryColor={safePrimary}
                        secondary={secondary}
                      />
                    </div>
                  )}

                  {/* MI CUENTA / REPARTIDOR / ADMIN según rol */}
                  <button
                    onClick={() => { window.location.href = getAccountPath(currentUser); }}
                    className={`p-2 rounded-lg border ${iconBorder} ${iconBg} cursor-pointer ${textColor} hover:scale-105 h-9 w-9 flex items-center justify-center`}
                    title="Mi Cuenta"
                  >
                    <User className="w-4 h-4" />
                  </button>

                  {/* DASHBOARD (si es dueño) */}
                  {isOwnerOfThisStore && (
                    <button
                      onClick={() => { if (tenant?.slug) window.location.href = `/admin/${tenant.slug}`; }}
                      className="p-2 rounded-lg shadow-lg cursor-pointer hover:opacity-90 hover:scale-105 h-9 w-9 flex items-center justify-center"
                      style={{ backgroundColor: safePrimary }}
                      title="Panel de Control"
                    >
                      <LayoutDashboard className="w-4 h-4 text-white" />
                    </button>
                  )}

                  {/* LOGOUT */}
                  <button
                    onClick={handleLogout}
                    className={`p-2 rounded-lg ${mutedTextColor} hover:text-red-500 cursor-pointer hover:scale-105 h-9 w-9 flex items-center justify-center`}
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>

                  {/* SALUDO */}
                  <div className={`h-6 w-[1px] ${isSecondaryLight ? 'bg-slate-300' : 'bg-white/15'} mx-1`}></div>
                  <span className={`text-xs font-medium ${textColor} px-1.5 whitespace-nowrap`}>
                    Hola, {currentUser.name?.split(' ')[0] || 'Usuario'}
                  </span>

                  {/* SALDO A FAVOR en esta tienda */}
                  {storeCredit !== null && storeCredit > 0 && (
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/mi-cuenta'; }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition hover:scale-105 cursor-pointer shrink-0`}
                      style={{
                        backgroundColor: `${safePrimary}15`,
                        borderColor: `${safePrimary}40`,
                        color: safePrimary,
                      }}
                      title={`Tenés saldo a favor en esta tienda: Bs. ${storeCredit.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    >
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-bold whitespace-nowrap">
                        Bs. {storeCredit.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAuth(true)}
                    className={`text-xs font-medium ${textColor} hover:opacity-80 px-2 py-1.5 cursor-pointer`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => router.push('/onboarding?new=true')}
                    className="text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg cursor-pointer hover:opacity-90 hover:scale-105"
                    style={{ backgroundColor: safePrimary }}
                  >
                    Registrarse
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BOTONES MÓVIL */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/')}
              className={`p-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor}`}
              aria-label="Ir al inicio"
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogSearchExpanded(!isCatalogSearchExpanded)}
              className={`p-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor}`}
              aria-label="Buscar en tienda"
            >
              <Search className="w-4 h-4" />
            </button>

            {currentUser && !isUserOperative && (
              <button
                onClick={onOpenFavorites}
                className={`relative p-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor}`}
                aria-label="Favoritos"
              >
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                {favoritesCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg text-slate-950"
                    style={{ backgroundColor: safePrimary }}
                  >
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            {currentUser?.id && (
              <div className="flex items-center">
                <NotificationsBell
                  userId={currentUser.id}
                  isLight={isSecondaryLight}
                  textColor={textColor}
                  mutedTextColor={mutedTextColor}
                  borderColor={iconBorder}
                  hoverBg={iconBg}
                  primaryColor={safePrimary}
                  secondary={secondary}
                />
              </div>
            )}

            {/* ✅ CTA de autenticación en mobile (solo si no está logueado) */}
            {!currentUser && (
              <button
                type="button"
                onClick={() => handleOpenAuth(true)}
                className="text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
                style={{ backgroundColor: safePrimary }}
              >
                Ingresar
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor}`}
              aria-label="Menú"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Modo Kiosco */}
          {isKioskMode && (
            <div className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border shrink-0 ${
              isSecondaryLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <Monitor className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold font-mono">
                {kioskToken.substring(0, 6)}...
              </span>
            </div>
          )}
        </div>

        {/* BÚSQUEDA DE CATÁLOGO - VERSIÓN MÓVIL EXPANDIDA */}
        {isCatalogSearchExpanded && (
          <div className="lg:hidden mt-2 flex items-center relative animate-fadeIn">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              ref={catalogSearchInputRef}
              type="text"
              placeholder="Buscar en esta tienda..."
              value={catalogSearchValue}
              onChange={(e) => handleCatalogSearchChange(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs outline-none rounded-lg border ${
                isSecondaryLight
                  ? 'bg-slate-100/80 border-slate-200 text-slate-800 placeholder-slate-400'
                  : 'bg-white/10 border-white/20 text-white placeholder-slate-300'
              }`}
            />
            <button
              onClick={() => {
                setIsCatalogSearchExpanded(false);
                setCatalogSearchValue('');
                if (setSearchQuery) setSearchQuery('');
              }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MENÚ MÓVIL */}
        {isMobileMenuOpen && (
          <div className={`lg:hidden mt-2 pt-2 border-t ${iconBorder} animate-fadeIn`}>
            <div className="flex flex-col space-y-1.5">
              {currentUser ? (
                <>
                  <div className={`text-sm font-bold ${textColor} px-1 py-1`}>
                    Hola, {currentUser.name?.split(' ')[0] || 'Usuario'}
                  </div>

                  {storeCredit !== null && storeCredit > 0 && (
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/mi-cuenta'; setIsMobileMenuOpen(false); }}
                      className="text-sm font-bold px-3 py-2 rounded-lg border flex items-center gap-2 text-left"
                      style={{
                        backgroundColor: `${safePrimary}15`,
                        borderColor: `${safePrimary}40`,
                        color: safePrimary,
                      }}
                    >
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span className="flex-1">
                        Saldo a favor: Bs. {storeCredit.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => { router.push('/'); setIsMobileMenuOpen(false); }}
                    className={`text-sm font-medium px-3 py-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor} text-left flex items-center gap-2`}
                  >
                    <Home className="w-4 h-4" />
                    Inicio
                  </button>

                  <button
                    onClick={() => { window.location.href = getAccountPath(currentUser); setIsMobileMenuOpen(false); }}
                    className={`text-sm font-medium px-3 py-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor} text-left`}
                  >
                    Mi Cuenta
                  </button>

                  {isOwnerOfThisStore && (
                    <>
                      <button
                        onClick={() => { if (tenant?.slug) { window.location.href = `/tienda/${tenant.slug}`; } setIsMobileMenuOpen(false); }}
                        className={`text-sm font-medium px-3 py-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor} text-left`}
                      >
                        Ver Mi Tienda
                      </button>
                      <button
                        onClick={() => { if (tenant?.slug) { window.location.href = `/admin/${tenant.slug}`; } setIsMobileMenuOpen(false); }}
                        className="text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg hover:opacity-90 w-full text-left"
                        style={{ backgroundColor: safePrimary }}
                      >
                        Panel de Control
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleLogout}
                    className={`text-sm font-medium ${mutedTextColor} hover:text-red-500 px-3 py-2 rounded-lg w-full text-left`}
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { router.push('/'); setIsMobileMenuOpen(false); }}
                    className={`text-sm font-medium px-3 py-2 rounded-lg border ${iconBorder} ${iconBg} ${textColor} text-left flex items-center gap-2`}
                  >
                    <Home className="w-4 h-4" />
                    Inicio
                  </button>

                  <button
                    onClick={() => { handleOpenAuth(true); setIsMobileMenuOpen(false); }}
                    className={`text-sm font-bold ${textColor} px-3 py-2 rounded-lg border ${iconBorder} ${iconBg} w-full text-left`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => { router.push('/onboarding?new=true'); setIsMobileMenuOpen(false); }}
                    className="text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg hover:opacity-90 w-full text-left"
                    style={{ backgroundColor: safePrimary }}
                  >
                    Registrarse
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      
<AuthModal
  isOpen={isAuthModalOpen}
  initialIsLogin={initialIsLogin}
  onClose={() => setIsAuthModalOpen(false)}
  primaryColorProp={safePrimary}
  backgroundColorProp={secondary || (isSecondaryLight ? '#ffffff' : '#0f172a')}
  isLightProp={isSecondaryLight}
  secondaryColorProp={secondary}
  textColorClass={textColor}
  mutedTextColorClass={mutedTextColor}
  labelColorClass={isSecondaryLight ? 'text-slate-800' : 'text-slate-300'}
  inputBg={isSecondaryLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)'}
  inputBorder={isSecondaryLight ? 'border-slate-200' : 'border-white/15'}
  brandName={tenant?.name || 'facilito'}
  brandLogoUrl={logoSource || null}
  onSuccess={(data: any) => {
    if (data) { 
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      if (data.tenant) {
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
      }
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }
    }
    setIsAuthModalOpen(false);
    window.dispatchEvent(new Event('authChange'));
    // El AuthModal ya redirige según el rol (repartidor, seller, buyer).
    // Solo recargamos si el usuario se queda en la misma página.
    // No forzamos reload para no pisar la navegación del AuthModal.
  }}
/>
    </>
  );
}