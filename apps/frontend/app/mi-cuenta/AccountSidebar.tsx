'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  User, 
  ShoppingBag, 
  Heart, 
  Palette, 
  LogOut, 
  Home,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Store,
  MessageSquare,
  Bell,
  Calendar,
  ChevronUp,
  ChevronDown,
  Star,
  Truck,
  Shield,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import { useNotificationContext } from '@/app/context/NotificationContext';

import { usePersistedState } from '@/hooks/usePersistedState';
import { performLogout } from '@/lib/auth/logout';

interface AccountSidebarProps {
  user: any;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  avatarSource?: string;
  onSearchChange?: (searchTerm: string) => void;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

// 🔥 Tipo explícito del item del menú
interface MenuItemType {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  badge?: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AccountSidebar({
  user,
  activeTab,
  setActiveTab,
  primary,
  secondary,
  textColor,
  isDarkBg,
  avatarSource,
  onSearchChange,
  onLogout,
  onOpenCommandPalette,
}: AccountSidebarProps) {
  const [isCollapsed, setIsCollapsed] = usePersistedState<boolean>(
    'mi_cuenta_sidebar_collapsed',
    true,
    {
      serialize: (v) => (v ? 'true' : 'false'),
      deserialize: (raw) => raw === 'true',
    },
  );
    const [mobileOpen, setMobileOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { counts, buyerUnreadCount: unreadCount } = useNotificationContext();

  const resolvedAvatar = useMemo(() => {
    const raw = avatarSource || user?.avatarUrl || user?.avatar || user?.image;
    return raw 
      ? (raw.startsWith('http') ? raw : `${API_BASE}${raw}`)
      : null;
  }, [avatarSource, user?.avatarUrl, user?.avatar, user?.image]);

  const rawUserName = useMemo(() => 
    user?.name || 'Mi Cuenta',
    [user?.name]
  );

  const formattedUserName = useMemo(() => 
    rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1).toLowerCase(),
    [rawUserName]
  );

    // 🔥 Título de la pestaña del navegador con badge de notificaciones
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const base = `${formattedUserName || 'Mi Cuenta'} | facilitó`;
    document.title = counts.all > 0 ? `(${counts.all}) ${base}` : base;
  }, [counts.all, formattedUserName]);

  const storeSlug = useMemo(() => 
    user?.store_slug || user?.tenant?.slug,
    [user?.store_slug, user?.tenant?.slug]
  );

  const borderColor = useMemo(() => 
    isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    [isDarkBg]
  );

  const menuItems = useMemo<MenuItemType[]>(() => [
    // ── Resumen ──
    { id: 'resumen', label: 'Resumen General', shortLabel: 'Resumen', icon: LayoutDashboard },

    // ── Cuenta ──
    { id: 'perfil', label: 'Mi Perfil', shortLabel: 'Perfil', icon: User },
    { id: 'saldo', label: 'Saldo a favor', shortLabel: 'Saldo', icon: Wallet },

    // ── Actividad ──
    {
      id: 'compras',
      label: 'Compras',
      shortLabel: 'Compras',
      icon: ShoppingBag,
      badge: counts.orders > 0 ? counts.orders : null,
    },
    {
      id: 'envios',
      label: 'Envíos',
      shortLabel: 'Envíos',
      icon: Truck,
      badge: counts.shipping > 0 ? counts.shipping : null,
    },
    {
      id: 'reclamos',
      label: 'Reclamos',
      shortLabel: 'Reclamos',
      icon: AlertTriangle,
      badge: null,
    },
    {
      id: 'citas',
      label: 'Citas',
      shortLabel: 'Citas',
      icon: Calendar,
      badge: counts.appointments > 0 ? counts.appointments : null,
    },

    // ── Descubrir ──
    { id: 'favoritos', label: 'Favoritos', shortLabel: 'Favoritos', icon: Heart },
    { id: 'resenas', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star },

    // ── Comunicación ──
    {
      id: 'conversaciones',
      label: 'Conversaciones',
      shortLabel: 'Mensajes',
      icon: MessageSquare,
      badge: counts.messages > 0 ? counts.messages : null,
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones',
      shortLabel: 'Avisos',
      icon: Bell,
      badge: counts.all > 0 ? counts.all : null,
    },

    // ── Configuración ──
    { id: 'seguridad', label: 'Seguridad', shortLabel: 'Seguridad', icon: Shield },
    { id: 'branding', label: 'Personalización', shortLabel: 'Marca', icon: Palette },
  ], [counts]);

  const filteredMenuItems = useMemo<MenuItemType[]>(() => {
    if (localSearch.trim() === '') return menuItems;
    return menuItems.filter(item =>
      item.label.toLowerCase().includes(localSearch.toLowerCase())
    );
  }, [menuItems, localSearch]);

  const isExpanded = useMemo(() => !isCollapsed, [isCollapsed]);
  const contentVisible = useMemo(() => isExpanded || mobileOpen, [isExpanded, mobileOpen]);
  const isCollapsedMode = useMemo(() => isCollapsed && !mobileOpen, [isCollapsed, mobileOpen]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  }, [onSearchChange]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    if (onSearchChange) {
      onSearchChange('');
    }
    searchInputRef.current?.focus();
  }, [onSearchChange]);

  const handleLogoutClick = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      performLogout();
    }
  }, [onLogout]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const toggleBottomMenu = useCallback(() => {
    setShowBottomMenu(prev => !prev);
  }, []);

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId as any);
    setMobileOpen(false);
    if (localSearch) {
      setLocalSearch('');
      if (onSearchChange) onSearchChange('');
    }
  }, [setActiveTab, localSearch, onSearchChange]);

  const getCollapseMessage = useCallback(() => {
    return isCollapsed ? "Expandir menú" : "Contraer menú";
  }, [isCollapsed]);

  const handleTooltipShow = useCallback((e: React.MouseEvent<HTMLElement>, label: string) => {
    if (isCollapsedMode) {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.right + 10,
        y: rect.top + rect.height / 2
      });
      setHoveredTab(label);
    }
  }, [isCollapsedMode]);

  const handleTooltipHide = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredTab(null);
    }, 100);
  }, []);

  const HomeIcon = useMemo(() => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ), []);

  const MenuIcon = useMemo(() => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ), []);

  const CloseIcon = useMemo(() => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ), []);

  const menuItemsRender = useMemo(() => {
    return filteredMenuItems.map((tab: MenuItemType) => {
      const isActive = activeTab === tab.id;
      const Icon = tab.icon;
      const hasBadge = tab.badge && tab.badge > 0;
      return (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          onMouseEnter={(e) => handleTooltipShow(e, tab.label)}
          onMouseLeave={handleTooltipHide}
          style={
            isActive
              ? { backgroundColor: primary, color: '#ffffff' }
              : { color: textColor }
          }
          title={isCollapsedMode ? tab.label : ''}
          className={`w-full flex relative overflow-visible ${
            isCollapsedMode
              ? 'flex-col items-center justify-center gap-0.5 px-0.5 py-2'
              : 'items-center space-x-3 px-4 py-2.5'
          } rounded-xl text-xs font-medium transition-opacity duration-150 opacity-80 hover:opacity-100 cursor-pointer ${
            isActive
              ? 'shadow-lg font-semibold opacity-100 scale-[1.02]'
              : isDarkBg
                ? 'hover:bg-white/5'
                : 'hover:bg-black/5'
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center overflow-visible">
            <Icon className="w-4 h-4" />
            {hasBadge && (
              <span
                className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold transition-transform duration-150 group-hover:scale-110 z-20 pointer-events-none"
                style={{
                  backgroundColor: isActive ? '#ffffff' : primary,
                  color: isActive ? primary : '#ffffff',
                  boxShadow: `0 0 0 2px ${isActive ? primary : secondary}`,
                }}
              >
                {hasBadge ? (tab.badge! > 9 ? '9+' : tab.badge) : null}
                              </span>
            )}
          </div>
          {contentVisible ? (
            <span className="tracking-wide truncate">{tab.label}</span>
          ) : (
            <span className="text-[10px] font-medium tracking-tight leading-none text-center w-full truncate">
              {tab.shortLabel || tab.label}
            </span>
          )}
        </button>
      );
    });
  }, [filteredMenuItems, activeTab, primary, textColor, isDarkBg, isCollapsedMode, contentVisible, handleTabClick, secondary, handleTooltipShow, handleTooltipHide]);

  const headerRender = useMemo(() => {
    if (isCollapsedMode) {
      return (
        <div className="mx-auto flex flex-col items-center gap-3 w-full pt-1">
          {resolvedAvatar ? (
            <div 
              className="p-2 rounded-2xl border backdrop-blur-md shadow-sm overflow-visible bg-black/10 w-10 h-10 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }}
            >
              <img 
                src={resolvedAvatar} 
                alt="Avatar" 
                className="h-6 w-6 object-cover rounded-xl"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-xs shadow-sm shrink-0"
              style={{ backgroundColor: primary, color: '#ffffff' }}
            >
              {formattedUserName.charAt(0)}
            </div>
          )}

          <span className="text-[8px] font-bold uppercase tracking-widest opacity-40" style={{ color: textColor }}>
            Cliente
          </span>

          <Link
            href="/"
            title="Volver al inicio"
            style={{ color: textColor }}
            className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer shadow-sm"
          >
            {HomeIcon}
          </Link>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-2 w-full overflow-visible">
        <div className="flex items-center space-x-3 truncate w-full min-w-0">
          {resolvedAvatar ? (
            <div 
              className="p-2 rounded-2xl border backdrop-blur-md shrink-0 shadow-sm overflow-visible bg-black/10 w-10 h-10 flex items-center justify-center"
              style={{
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }}
            >
              <img 
                src={resolvedAvatar} 
                alt={user?.name || 'Avatar'} 
                className="h-6 w-6 object-cover rounded-xl"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs shadow-sm shrink-0"
              style={{ backgroundColor: primary, color: '#ffffff' }}
            >
              {formattedUserName.charAt(0)}
            </div>
          )}
          <div className={`flex flex-col truncate w-full min-w-0 transition-opacity duration-150 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="font-bold text-xs tracking-wide truncate" style={{ color: textColor, opacity: 0.95 }}>
              {formattedUserName}
            </h2>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 truncate" style={{ color: primary }}>
              Cliente
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {mobileOpen && (
            <button
              type="button"
              onClick={closeMobile}
              className="md:hidden p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: textColor }}
              title="Cerrar menú"
            >
              {CloseIcon}
            </button>
          )}
          <Link
            href="/"
            title="Volver al inicio"
            style={{ color: textColor }}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            {HomeIcon}
          </Link>
        </div>
      </div>
    );
  }, [isCollapsedMode, resolvedAvatar, isDarkBg, primary, formattedUserName, textColor, HomeIcon, CloseIcon, contentVisible, mobileOpen, closeMobile, user?.name]);

  // 🔥 BOTTOM BUTTONS - EXACTAMENTE IGUAL QUE ADMIN
  const bottomButtons = useMemo(() => {
    return (
      <div className="space-y-1 w-full overflow-visible">
        <div className={`${
          !contentVisible
            ? 'flex items-center justify-center w-full'
            : 'flex items-center justify-between w-full'
        } rounded-xl text-[11px] font-medium opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 overflow-visible min-h-[36px]`}>
          <button
            type="button"
            onClick={toggleCollapse}
            onMouseEnter={(e) => handleTooltipShow(e, isCollapsed ? "Expandir menú" : "Contraer menú")}
            onMouseLeave={handleTooltipHide}
            title={isCollapsed ? "Expandir barra lateral" : "Contraer menú"}
            style={{ color: textColor }}
            className={`flex items-center ${
              !contentVisible ? 'justify-center w-full py-2.5' : 'px-3.5 py-2.5 flex-1'
            } rounded-xl text-[11px] font-medium opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 overflow-visible min-h-[36px]`}
          >
            <div className="flex items-center space-x-2.5">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                  <span className="tracking-tight whitespace-nowrap">{getCollapseMessage()}</span>
                </>
              )}
            </div>
          </button>
        </div>

        {(showBottomMenu || !contentVisible) && (
          <>
            <button
              type="button"
              onClick={handleLogoutClick}
              onMouseEnter={(e) => handleTooltipShow(e, "Cerrar Sesión")}
              onMouseLeave={handleTooltipHide}
              title={!contentVisible ? "Cerrar sesión" : ""}
              className={`w-full flex items-center ${
                !contentVisible ? 'justify-center py-2.5' : 'space-x-2.5 px-3.5 py-2'
              } rounded-xl text-[11px] font-medium text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer overflow-visible min-h-[36px]`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {contentVisible && <span className="tracking-tight whitespace-nowrap">Cerrar Sesión</span>}
            </button>

            {storeSlug && (
              <Link
                href={`/admin/${storeSlug}`}
                onMouseEnter={(e) => handleTooltipShow(e, "Panel de Administración")}
                onMouseLeave={handleTooltipHide}
                style={{ color: textColor }}
                title={!contentVisible ? "Panel de administración" : ""}
                className={`w-full flex items-center ${
                  !contentVisible ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2'
                } rounded-xl text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  {contentVisible && <span className="tracking-tight truncate">Panel de Administración</span>}
                </div>
                {contentVisible && <span className="text-xs opacity-70 shrink-0">↗</span>}
              </Link>
            )}

            {!storeSlug && (
              <Link
                href="/onboarding?role=seller"
                onMouseEnter={(e) => handleTooltipShow(e, "Crear mi tienda")}
                onMouseLeave={handleTooltipHide}
                style={{ color: textColor }}
                title={!contentVisible ? "Crear mi tienda" : ""}
                className={`w-full flex items-center ${
                  !contentVisible ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2'
                } rounded-xl text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  {contentVisible && <span className="tracking-tight truncate">Crear mi tienda</span>}
                </div>
                {contentVisible && <span className="text-xs opacity-70 shrink-0">↗</span>}
              </Link>
            )}

            <Link
              href="/"
              onMouseEnter={(e) => handleTooltipShow(e, "Ir al sitio principal")}
              onMouseLeave={handleTooltipHide}
              style={{ color: textColor }}
              title={!contentVisible ? "Ir al sitio principal" : ""}
              className={`w-full flex items-center ${
                !contentVisible ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2'
              } rounded-xl text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Home className="w-3.5 h-3.5 shrink-0" />
                {contentVisible && <span className="tracking-tight truncate">Ir al sitio principal</span>}
              </div>
              {contentVisible && <span className="text-xs opacity-70 shrink-0">↗</span>}
            </Link>
          </>
        )}
      </div>
    );
  }, [
    contentVisible,
    toggleCollapse,
    isCollapsed,
    textColor,
    getCollapseMessage,
    showBottomMenu,
    handleLogoutClick,
    storeSlug,
    handleTooltipShow,
    handleTooltipHide
  ]);

  const tooltipRender = useMemo(() => {
    if (!hoveredTab || !isCollapsedMode) return null;

    const isTooltipDark = isDarkBg;
    const tooltipBg = isTooltipDark ? secondary : '#ffffff';
    const tooltipText = isTooltipDark ? textColor : '#111827';
    const borderColor2 = isTooltipDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    return (
      <div
        className="fixed z-[60] pointer-events-none animate-in fade-in slide-in-from-left-2 duration-150"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: 'translateY(-50%)',
        }}
      >
        <div className="relative flex items-center">
          <svg
            className="shrink-0"
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="none"
            style={{
              filter: isTooltipDark ? 'drop-shadow(-2px 0 4px rgba(0,0,0,0.2))' : 'drop-shadow(-2px 0 4px rgba(0,0,0,0.08))'
            }}
          >
            <polygon
              points="0,8 10,0 10,16"
              fill={tooltipBg}
            />
          </svg>

          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg whitespace-nowrap"
            style={{
              backgroundColor: tooltipBg,
              color: tooltipText,
              border: `1px solid ${borderColor2}`,
              boxShadow: isTooltipDark
                ? '0 10px 40px rgba(0,0,0,0.4)'
                : '0 10px 40px rgba(0,0,0,0.12)'
            }}
          >
            {hoveredTab}
          </div>
        </div>
      </div>
    );
  }, [hoveredTab, isCollapsedMode, isDarkBg, secondary, textColor, tooltipPosition]);

  return (
    <>
      <button
        type="button"
        onClick={toggleMobile}
        className="md:hidden fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: primary, color: '#ffffff' }}
        title="Abrir menú de navegación"
      >
        {MenuIcon}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}



<aside
  ref={sidebarRef}
  className={`overflow-visible flex flex-col shrink-0 border-r z-50 ${
    isCollapsedMode ? 'p-2' : 'p-5'
  } ${
    mobileOpen
      ? 'fixed inset-y-0 left-0 w-72 h-full shadow-2xl flex z-50'
      : 'hidden md:flex md:relative z-20'
  }`}
  style={{
    backgroundColor: secondary,
    borderColor: borderColor,
    overflow: 'visible',
    width: mobileOpen ? '288px' : (isCollapsed ? '80px' : '288px'),
    transition: 'width 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'width',
  }}
>
      
        <div
          className="absolute -left-16 -top-16 w-60 h-60 rounded-full blur-[80px] opacity-15 pointer-events-none"
          style={{ backgroundColor: primary }}
        />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full w-full overflow-visible">

          <div className="flex-shrink-0 w-full overflow-visible">
            {headerRender}

            {/* 🔥 Botón Command Palette - SOLO CUANDO ESTÁ EXPANDIDO */}
            {contentVisible && onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="mt-3 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition hover:opacity-90 cursor-pointer text-xs font-medium"
                style={{
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: textColor,
                }}
                title="Buscar o ejecutar un comando (⌘K)"
              >
                <Search className="w-4 h-4 shrink-0 opacity-60" />
                <span className="flex-1 text-left opacity-60 truncate">Buscar o ejecutar…</span>
                <kbd
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 opacity-50"
                  style={{
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  ⌘K
                </kbd>
              </button>
            )}

            {/* 🔥 Ícono solo en modo colapsado */}
            {!contentVisible && onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="mt-3 w-full flex items-center justify-center p-2.5 rounded-xl border transition hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: textColor,
                }}
                title="Buscar o ejecutar un comando (⌘K)"
              >
                <Search className="w-4 h-4 opacity-60" />
              </button>
            )}
          </div>

          {/* 🔥 MENÚ - CON FLEX-1 */}
          <div
            className={`flex-1 overflow-y-auto w-full overflow-x-visible mt-3 ${
              isCollapsedMode
                ? 'scrollbar-hide'
                : 'scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent'
            }`}
            style={{
              scrollbarWidth: isCollapsedMode ? 'none' : 'thin',
              scrollbarColor: `${primary}40 transparent`,
              overflowX: 'visible',
              paddingLeft: '3px',
              paddingRight: '3px'
            }}
          >
            <nav className="space-y-1.5 w-full">
              {menuItemsRender}
              {contentVisible && localSearch && filteredMenuItems.length === 0 && (
                <div className="text-center py-4 text-xs opacity-50" style={{ color: textColor }}>
                  No se encontraron resultados
                </div>
              )}
            </nav>
          </div>

          {/* 🔥 FOOTER - CON pt-2 COMO ADMIN */}
          <div className="flex-shrink-0 pt-2.5 w-full border-t border-black/5 dark:border-white/5 overflow-visible" style={{ borderColor: borderColor }}>
                      {contentVisible && (
              <button
                type="button"
                onClick={toggleBottomMenu}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[11px] font-medium opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]"
                style={{ color: textColor }}
              >
                <span>Opciones</span>
                {showBottomMenu ? (
                  <ChevronDown className="w-3 h-3 shrink-0" />
                ) : (
                  <ChevronUp className="w-3 h-3 shrink-0" />
                )}
              </button>
            )}

            {bottomButtons}
          </div>
        </div>
      </aside>

      {tooltipRender}
    </>
  );
}