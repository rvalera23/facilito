    'use client';

    import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
    import Link from 'next/link';
    import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
    import { useNotificationContext } from '@/app/context/NotificationContext';

    // ✅ IMPORTAR getImageUrl DESDE imageUtils
    import { getImageUrl } from '@/lib/imageUtils';
    import { usePersistedState } from '../hooks/useNavigation';
import { performLogout } from '@/lib/auth/logout';
    // ============================================================
    // 🔥 HOOK PARA CONTAR NOTIFICACIONES - OPTIMIZADO
    // ============================================================
    const useNotificationsCount = (userId: string, sourceType: 'user' | 'tenant' = 'user', tenantId?: string) => {
      const [unreadCount, setUnreadCount] = useState(0);
      const [loading, setLoading] = useState(true);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL;
      const isMountedRef = useRef(true);
      const isFetchingRef = useRef(false);
      const intervalRef = useRef<NodeJS.Timeout | null>(null);
      const isDocumentVisible = useRef(true);

      const fetchCount = useCallback(async () => {
        if (!userId || isFetchingRef.current || !isMountedRef.current || !isDocumentVisible.current) return;

        isFetchingRef.current = true;

        try {
          const token = localStorage.getItem('token');
          let url = '';

          if (sourceType === 'tenant' && tenantId) {
            url = `${API_BASE}/notifications/tenant/${tenantId}/unread/count?source=seller`;
          } else {
            url = `${API_BASE}/notifications/user/${userId}/unread/count?source=seller`;
          }

          const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (res.ok && isMountedRef.current) {
            const data = await res.json();
            setUnreadCount(data.count || data.unreadCount || 0);
          }
        } catch (error) {
          // Silencioso
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
          isFetchingRef.current = false;
        }
      }, [userId, sourceType, tenantId, API_BASE]);

      useEffect(() => {
        const handleVisibilityChange = () => {
          isDocumentVisible.current = !document.hidden;
          if (isDocumentVisible.current) {
            fetchCount();
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
      }, [fetchCount]);

      useEffect(() => {
        isMountedRef.current = true;
        fetchCount();

        intervalRef.current = setInterval(() => {
          if (isMountedRef.current && !isFetchingRef.current && isDocumentVisible.current) {
            fetchCount();
          }
        }, 30000);

        return () => {
          isMountedRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      }, [fetchCount]);

      useEffect(() => {
        const handleRefresh = () => {
          if (isMountedRef.current) {
            fetchCount();
          }
        };

        window.addEventListener('notificationUpdate', handleRefresh);
        window.addEventListener('globalRefresh', handleRefresh);

        return () => {
          window.removeEventListener('notificationUpdate', handleRefresh);
          window.removeEventListener('globalRefresh', handleRefresh);
        };
      }, [fetchCount]);

      return { unreadCount, loading, refresh: fetchCount };
    };

    // ============================================================
    // 🔥 ICONOS DE MENÚ - CONSTANTES
    // ============================================================
     const MENU_ICONS = {
    delivery: 'M5 18a3 3 0 106 0 3 3 0 00-6 0zm10 0a3 3 0 106 0 3 3 0 00-6 0zM5 18H3V9a2 2 0 012-2h7l3 5h4a2 2 0 012 2v4h-2',
        dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    catalog: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      orders: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      bookings: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      messages: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      shipping: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m10 0h2m-2 0h-5m-9 0H3v2a1 1 0 001 1h2m1-1v-2a1 1 0 011-1h2m0 0h4m0 0h2a1 1 0 011 1v2m0 0h-2',
      themes: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
            profile: 'M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zM3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z',
      settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
      professionals: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      reviews: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    };

    // ============================================================
    // 🔥 INTERFACE
    // ============================================================
    interface AdminSidebarProps {
      tenant: any;
      activeTab: string;
      setActiveTab: (tab: any) => void;
      businessType: string;
      isServiceBusiness?: boolean;
      primary: string;
      secondary: string;
      textColor: string;
      isDarkBg: boolean;
      logoSource: string;
      onSearchChange?: (searchTerm: string) => void;
      onLogout?: () => void;
      userId?: string;
      getImageUrl?: (item: any) => string | null;
      onOpenCommandPalette?: () => void;
    }

    // ============================================================
    // 🔥 SUBCOMPONENTE: MenuItem (MEMOIZADO)
    // ============================================================
    const MenuItem = memo(({
      tab,
      isActive,
      isCollapsedMode,
      contentVisible,
      primary,
      secondary,
      textColor,
      isDarkBg,
      handleTabClick,
      handleTooltipShow,
      handleTooltipHide
    }: any) => {
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={tab.icon} />
            </svg>
            {hasBadge && (
              <span
                className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold transition-transform duration-150 group-hover:scale-110 z-20 pointer-events-none"
                style={{
                  backgroundColor: isActive ? '#ffffff' : primary,
                  color: isActive ? primary : '#ffffff',
                  boxShadow: `0 0 0 2px ${isActive ? primary : secondary}`,
                }}
              >
                {tab.badge > 9 ? '9+' : tab.badge}
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
    MenuItem.displayName = 'MenuItem';

    // ============================================================
    // 🔥 COMPONENTE PRINCIPAL MEMOIZADO
    // ============================================================
    const AdminSidebar = memo(function AdminSidebar({
      tenant,
      activeTab,
      setActiveTab,
      businessType,
      isServiceBusiness = false,
      primary,
      secondary,
      textColor,
      isDarkBg,
      logoSource,
      onSearchChange,
      onLogout,
      userId,
      getImageUrl: getImageUrlProp,
      onOpenCommandPalette,
    }: AdminSidebarProps) {
      const [isCollapsed, setIsCollapsed] = usePersistedState<boolean>(
        'admin_sidebar_collapsed',
        true,
        {
          serialize: (v) => (v ? 'true' : 'false'),
          deserialize: (raw) => raw === 'true',
        },
      );
          const [mobileOpen, setMobileOpen] = useState(false);

          const [isMounted, setIsMounted] = useState(false);
      const [showBottomMenu, setShowBottomMenu] = useState(false);
      const [hoveredTab, setHoveredTab] = useState<string | null>(null);
      const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);
  const logoInputRef = useRef<HTMLInputElement>(null); // ✅ AGREGAR ESTA LÍNEA

      // 🔥 NOTIFICACIONES
  const { sellerUnreadCount: unreadCount, counts } = useNotificationContext();


      // 🔥 CONTEXT DE REFRESH - SOLO REGISTRAR UNA VEZ
      const { registerComponent, unregisterComponent } = useAppRefreshContext();

      // ✅ MEMOIZAR LOGO
      const resolvedLogo = useMemo(() => {
        // 🔥 Unificar logoSource + tenant.logoUrl en una sola variable
        const rawLogo = logoSource || tenant?.logoUrl || tenant?.logo || tenant?.image;
        if (!rawLogo) return null;

        const raw = String(rawLogo).trim();

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
          const processed = getImageUrl(raw);
          if (processed) return processed;
        } catch {
          // Silencioso
        }

        return raw;
      }, [logoSource, tenant?.logoUrl, tenant?.logo, tenant?.image, getImageUrlProp]);

      const rawTenantName = useMemo(() =>
        tenant?.name || 'Mi Tienda',
        [tenant?.name]
      );

      const formattedTenantName = useMemo(() =>
        rawTenantName.charAt(0).toUpperCase() + rawTenantName.slice(1).toLowerCase(),
        [rawTenantName]
      );

          // 🔥 Título de la pestaña del navegador con badge de notificaciones
      useEffect(() => {
        if (typeof document === 'undefined') return;
        const base = `${formattedTenantName || 'Mi Tienda'} | facilitó`;
        document.title = counts.all > 0 ? `(${counts.all}) ${base}` : base;
      }, [counts.all, formattedTenantName]);

      const isService = useMemo(() =>
        isServiceBusiness ||
        businessType === 'service' ||
        businessType === 'servicios' ||
        businessType === 'cita' ||
        businessType === 'citas',
        [isServiceBusiness, businessType]
      );

      const borderColor = useMemo(() =>
        isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        [isDarkBg]
      );
      const menuItems = useMemo(() => [
        { id: 'dashboard', label: 'Panel Principal', shortLabel: 'Panel', icon: MENU_ICONS.dashboard },
        { id: 'catalog', label: isService ? 'Catálogo de Servicios' : 'Catálogo e Inventario', shortLabel: isService ? 'Servicios' : 'Catálogo', icon: MENU_ICONS.catalog },
        {
          id: 'orders',
          label: isService ? 'Gestión de Citas' : 'Órdenes y Ventas',
          shortLabel: isService ? 'Citas' : 'Órdenes',
          icon: MENU_ICONS.orders,
          badge: counts.orders > 0 ? counts.orders : null,
        },
        ...( isService ? [{
          id: 'shipping',
          label: 'Disponibilidad y Horarios',
          shortLabel: 'Horarios',
          icon: MENU_ICONS.shipping,
        }] : []),
        ...(isService ? [{ id: 'professionals', label: 'Profesionales', shortLabel: 'Equipo', icon: MENU_ICONS.professionals }] : []),
        ...( !isService ? [{
          id: 'shipping',
          label: 'Envíos y Delivery',
          shortLabel: 'Envíos',
          icon: MENU_ICONS.shipping,
          badge: counts.shipping > 0 ? counts.shipping : null,
        }] : []),
        { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: MENU_ICONS.reviews },
        {
          id: 'notifications',
          label: 'Notificaciones',
          shortLabel: 'Avisos',
          icon: MENU_ICONS.notifications,
          badge: counts.all > 0 ? counts.all : null,
        },
        {
          id: 'messages',
          label: 'Conversaciones',
          shortLabel: 'Mensajes',
          icon: MENU_ICONS.messages,
          badge: counts.messages > 0 ? counts.messages : null,
        },
        { id: 'themes', label: 'Marca', shortLabel: 'Marca', icon: MENU_ICONS.themes },
        { id: 'branding', label: 'Perfil de Negocio', shortLabel: 'Perfil', icon: MENU_ICONS.profile },
        { id: 'settings', label: 'Configuración y Cuenta', shortLabel: 'Ajustes', icon: MENU_ICONS.settings },
      ], [isService, counts]);


      const isExpanded = useMemo(() => !isCollapsed, [isCollapsed]);
      const contentVisible = useMemo(() => isExpanded || mobileOpen, [isExpanded, mobileOpen]);
      const isCollapsedMode = useMemo(() => isCollapsed && !mobileOpen, [isCollapsed, mobileOpen]);

      // ✅ Efectos
      useEffect(() => {
        setIsMounted(true);
      }, []);

      // ✅ REGISTRAR EN CONTEXT
      useEffect(() => {
        if (isRegisteredRef.current) return;
        isRegisteredRef.current = true;

        const componentId = 'admin-sidebar-badge';
        const refreshBadge = async () => {};

        registerComponent(componentId, refreshBadge);
        return () => {
          isRegisteredRef.current = false;
          unregisterComponent(componentId);
        };
      }, [registerComponent, unregisterComponent]);

      // ✅ VISIBILITY CHANGE
      useEffect(() => {
        const handleVisibilityChange = () => {
          if (!document.hidden) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('globalRefresh'));
            }
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
      }, []);

      // ✅ KEYBOARD SHORTCUT
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

      // ✅ CLEANUP TOOLTIP TIMEOUT
      useEffect(() => {
        return () => {
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
          }
        };
      }, []);



      const handleLogoutClick = useCallback(() => {
        if (onLogout) {
          onLogout();
        } else {
          performLogout();
        }
      }, [onLogout]);

      // 🔥 MANEJADOR PARA CAMBIO DE LOGO
  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aquí puedes subir el logo a tu servidor
    console.log('📸 Logo seleccionado:', file.name);
    
    // Si tienes una función para subir el logo, llamarla aquí
    // Ejemplo: onLogoUpload?.(file);

    e.target.value = '';
  }, []);

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
      }, [setActiveTab]);

      const getCollapseMessage = useCallback(() => {
        return isCollapsed ? "Expandir menú" : "Contraer menú";
      }, [isCollapsed]);

      // ✅ Tooltip handlers
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

  const StoreIcon = useMemo(() => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

      // ✅ Menu items render
      const menuItemsRender = useMemo(() => {
        return menuItems.map((tab) => {
                  const isActive = activeTab === tab.id;

          return (
            <MenuItem
              key={tab.id}
              tab={tab}
              isActive={isActive}
              isCollapsedMode={isCollapsedMode}
              contentVisible={contentVisible}
              primary={primary}
              secondary={secondary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              handleTabClick={handleTabClick}
              handleTooltipShow={handleTooltipShow}
              handleTooltipHide={handleTooltipHide}
            />
          );
        });
      }, [
        menuItems,
              activeTab,
        isCollapsedMode,
        contentVisible,
        primary,
        secondary,
        textColor,
        isDarkBg,
        handleTabClick,
        handleTooltipShow,
        handleTooltipHide
      ]);

      // ✅ Header render
      const headerRender = useMemo(() => {
        if (isCollapsedMode) {
          return (
            <div className="mx-auto flex flex-col items-center gap-3 w-full pt-1">
              {resolvedLogo ? (
  <div 
    onClick={() => {
      // Disparar evento para abrir selector de logo
      const event = new CustomEvent('openLogoSelector');
      window.dispatchEvent(event);
    }}
    className="p-2 rounded-2xl border backdrop-blur-md shadow-sm overflow-visible bg-black/10 w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
    style={{
      backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
    }}
    title=""
    onMouseEnter={(e) => handleTooltipShow(e, "Cambiar logo")}
    onMouseLeave={handleTooltipHide}
  >
    <img 
      src={resolvedLogo} 
      alt="Logo" 
      className="h-6 w-6 object-contain" 
      loading="lazy" 
    />
  </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: primary, color: '#ffffff' }}
                >
                  {formattedTenantName.charAt(0)}
                </div>
              )}

              <span className="text-[8px] font-bold uppercase tracking-widest opacity-40" style={{ color: textColor }}>
                Tienda
              </span>

  <Link
    href={`/tienda/${tenant?.slug || ''}`}
    title=""
    onMouseEnter={(e) => handleTooltipShow(e, "Ir a la tienda")}
    onMouseLeave={handleTooltipHide}
    style={{ color: textColor }}
    className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer shadow-sm"
  >
    {StoreIcon}
  </Link>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-between gap-2 w-full overflow-visible">
            <div className="flex items-center space-x-3 truncate w-full min-w-0">
              {resolvedLogo ? (
  <div 
    onClick={() => {
      const event = new CustomEvent('openLogoSelector');
      window.dispatchEvent(event);
    }}
    className="p-2 rounded-2xl border backdrop-blur-md shrink-0 shadow-sm overflow-visible bg-black/10 w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
    style={{
      backgroundColor: isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
    }}
    title=""
    onMouseEnter={(e) => handleTooltipShow(e, "Cambiar logo")}
    onMouseLeave={handleTooltipHide}
  >
    <img 
      src={resolvedLogo} 
      alt={tenant?.name || 'Logo'} 
      className="h-6 w-6 object-contain" 
      loading="lazy" 
    />
  </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: primary, color: '#ffffff' }}
                >
                  {formattedTenantName.charAt(0)}
                </div>
              )}
              <div className={`flex flex-col truncate w-full min-w-0 transition-opacity duration-150 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
                <h2 className="font-bold text-xs tracking-wide truncate" style={{ color: textColor, opacity: 0.95 }}>
                  {formattedTenantName}
                </h2>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 truncate" style={{ color: primary }}>
                  Tienda
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
    href={`/tienda/${tenant?.slug || ''}`}
    title=""
    onMouseEnter={(e) => handleTooltipShow(e, "Ir a la tienda")}
    onMouseLeave={handleTooltipHide}
    style={{ color: textColor }}
    className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
  >
    {StoreIcon}
  </Link>
            </div>
          </div>
        );
  }, [
    isCollapsedMode,
    resolvedLogo,
    isDarkBg,
    primary,
    formattedTenantName,
    textColor,
    StoreIcon,
    CloseIcon,
    contentVisible,
    mobileOpen,
    closeMobile,
    tenant?.slug,
    tenant?.name,
    handleTooltipShow,
    handleTooltipHide
  ]);

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
    title=""
    style={{ color: textColor }}
    className={`flex items-center ${
      !contentVisible ? 'justify-center w-full py-2.5' : 'px-3.5 py-2.5 flex-1'
    } rounded-xl text-[11px] font-medium opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 overflow-visible min-h-[36px]`}
  >
    <div className="flex items-center space-x-2.5">
      {isCollapsed ? (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7" />
        </svg>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7" />
          </svg>
          <span className="tracking-tight whitespace-nowrap">{getCollapseMessage()}</span>
        </>
      )}
    </div>
  </button>
          </div>

          {(showBottomMenu || !contentVisible) && (
            <>
              <Link
                href="/mi-cuenta"
                onMouseEnter={(e) => handleTooltipShow(e, "Mi Cuenta")}
                onMouseLeave={handleTooltipHide}
                style={{ color: textColor }}
    title=""
                className={`w-full flex items-center ${
                  !contentVisible ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2'
                } rounded-xl text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {contentVisible && <span className="tracking-tight truncate">Mi Cuenta</span>}
                </div>
                {contentVisible && <span className="text-xs opacity-70 shrink-0">↗</span>}
              </Link>

              <Link
                href="/"
                onMouseEnter={(e) => handleTooltipShow(e, "Ir al sitio principal")}
                onMouseLeave={handleTooltipHide}
                style={{ color: textColor }}
    title=""
                className={`w-full flex items-center ${
                  !contentVisible ? 'justify-center py-2.5' : 'justify-between px-3.5 py-2'
                } rounded-xl text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {contentVisible && <span className="tracking-tight truncate">Ir al sitio principal</span>}
                </div>
                {contentVisible && <span className="text-xs opacity-70 shrink-0">↗</span>}
              </Link>

              <button
                type="button"
                onClick={handleLogoutClick}
                onMouseEnter={(e) => handleTooltipShow(e, "Cerrar Sesión")}
                onMouseLeave={handleTooltipHide}
    title=""
                className={`w-full flex items-center ${
                  !contentVisible ? 'justify-center py-2.5' : 'space-x-2.5 px-3.5 py-2'
                } rounded-xl text-[11px] font-medium text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer overflow-visible min-h-[36px]`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {contentVisible && <span className="tracking-tight whitespace-nowrap">Cerrar Sesión</span>}
              </button>
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
      tenant?.slug,
      handleTooltipShow,
      handleTooltipHide
    ]);

      // ✅ Tooltip render
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
            <div className="absolute  inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full w-full overflow-visible">

              {/* HEADER */}
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
                    <svg
                      className="w-4 h-4 shrink-0 opacity-60"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
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
                    <svg
                      className="w-4 h-4 opacity-60"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* MENÚ NAVEGACIÓN */}
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

                </nav>
              </div>

              {/* FOOTER */}
  <div className="flex-shrink-0 pt-2.5 w-full border-t border-black/5 dark:border-white/5 overflow-visible" style={{ borderColor: borderColor }}>
  {contentVisible && (
    <button
      type="button"
      onClick={toggleBottomMenu}
      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[11px] font-medium opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]"
      style={{ color: textColor }}
    >
      <span className="tracking-tight">Opciones</span>
      {showBottomMenu ? (
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      ) : (
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
        </svg>
      )}
    </button>
  )}

                {bottomButtons}
              </div>
            </div>
          </aside>

          {/* TOOLTIP */}
          {tooltipRender}

                {/* INPUT OCULTO PARA SELECCIONAR LOGO */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/svg+xml"
          className="hidden"
          onChange={handleLogoChange}
        />
      </>
    );
  });

    AdminSidebar.displayName = 'AdminSidebar';

    export default AdminSidebar;