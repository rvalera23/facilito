'use client';

// ============================================================
// ARCHIVO: app/profesional/components/ProfessionalSidebar.tsx
// Sidebar del profesional. Mismo patrón que RepartidorSidebar.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  User,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  History,
} from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type ProfessionalTab = 'citas' | 'historial' | 'perfil';

interface ProfessionalSidebarProps {
  userName: string;
  avatarSource?: string | null;
  status: string;
  activeTab: ProfessionalTab;
  setActiveTab: (tab: ProfessionalTab) => void;
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onLogout: () => void;
  citasCount?: number;
}

export default function ProfessionalSidebar({
  userName,
  avatarSource,
  status,
  activeTab,
  setActiveTab,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onLogout,
  citasCount = 0,
}: ProfessionalSidebarProps) {
  const [isCollapsed, setIsCollapsed] = usePersistedState<boolean>(
    'profesional_sidebar_collapsed',
    true,
    {
      serialize: (v) => (v ? 'true' : 'false'),
      deserialize: (raw) => raw === 'true',
    },
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const sidebarRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resolvedAvatar = useMemo(() => {
    const raw = avatarSource;
    return raw
      ? raw.startsWith('http')
        ? raw
        : `${API_BASE}${raw}`
      : null;
  }, [avatarSource]);

  const formattedUserName = useMemo(
    () =>
      userName
        ? userName.charAt(0).toUpperCase() + userName.slice(1)
        : 'Profesional',
    [userName],
  );

  const borderColor = useMemo(
    () => (isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
    [isDarkBg],
  );

  const menuItems = useMemo(
    () => [
      {
        id: 'citas' as ProfessionalTab,
        label: 'Citas activas',
        icon: Calendar,
        badge: citasCount > 0 ? citasCount : null,
      },
      { id: 'historial' as ProfessionalTab, label: 'Historial', icon: History },
      { id: 'perfil' as ProfessionalTab, label: 'Mi perfil', icon: User },
    ],
    [citasCount],
  );

  const isExpanded = useMemo(() => !isCollapsed, [isCollapsed]);
  const contentVisible = useMemo(
    () => isExpanded || mobileOpen,
    [isExpanded, mobileOpen],
  );
  const isCollapsedMode = useMemo(
    () => isCollapsed && !mobileOpen,
    [isCollapsed, mobileOpen],
  );

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
    };
  }, []);

  const handleLogoutClick = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const toggleBottomMenu = useCallback(() => {
    setShowBottomMenu((prev) => !prev);
  }, []);

  const handleTabClick = useCallback(
    (tabId: ProfessionalTab) => {
      setActiveTab(tabId);
      setMobileOpen(false);
    },
    [setActiveTab],
  );

  const getCollapseMessage = useCallback(
    () => (isCollapsed ? 'Expandir menú' : 'Contraer menú'),
    [isCollapsed],
  );

  const handleTooltipShow = useCallback(
    (e: React.MouseEvent<HTMLElement>, label: string) => {
      if (isCollapsedMode) {
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
          tooltipTimeoutRef.current = null;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          x: rect.right + 10,
          y: rect.top + rect.height / 2,
        });
        setHoveredTab(label);
      }
    },
    [isCollapsedMode],
  );

  const handleTooltipHide = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => setHoveredTab(null), 100);
  }, []);

  const HomeIcon = useMemo(
    () => (
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    [],
  );

  const MenuIcon = useMemo(
    () => (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    ),
    [],
  );

  const CloseIcon = useMemo(
    () => (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    [],
  );

  const menuItemsRender = useMemo(() => {
    return menuItems.map((tab) => {
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
          className={`w-full flex items-center relative overflow-visible ${
            isCollapsedMode ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-2.5'
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
                className="absolute -top-2.5 -right-3 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-lg animate-pulse z-20 pointer-events-none"
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
          {contentVisible && (
            <span className="tracking-wide truncate">{tab.label}</span>
          )}
        </button>
      );
    });
  }, [
    menuItems,
    activeTab,
    primary,
    textColor,
    isDarkBg,
    isCollapsedMode,
    contentVisible,
    handleTabClick,
    secondary,
    handleTooltipShow,
    handleTooltipHide,
  ]);

  const headerRender = useMemo(() => {
    const isOnline = status === 'online' || status === 'active';
    const statusLabel = isOnline ? 'Disponible' : 'No disponible';
    const statusColor = isOnline ? '#10b981' : '#64748b';

    if (isCollapsedMode) {
      return (
        <div className="mx-auto flex flex-col items-center gap-3 w-full pt-1">
          {resolvedAvatar ? (
            <div
              className="p-2 rounded-2xl border backdrop-blur-md shadow-sm overflow-visible w-10 h-10 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isDarkBg
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.03)',
                borderColor: isDarkBg
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
              }}
            >
              <img
                src={resolvedAvatar}
                alt="Avatar"
                className="h-6 w-6 object-cover rounded-xl"
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

          <span
            className="text-[8px] font-bold uppercase tracking-widest opacity-40 text-center"
            style={{ color: textColor }}
          >
            Profesional
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
              className="p-2 rounded-2xl border backdrop-blur-md shrink-0 shadow-sm overflow-visible w-10 h-10 flex items-center justify-center"
              style={{
                backgroundColor: isDarkBg
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.03)',
                borderColor: isDarkBg
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
              }}
            >
              <img
                src={resolvedAvatar}
                alt={formattedUserName}
                className="h-6 w-6 object-cover rounded-xl"
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
          <div
            className={`flex flex-col truncate w-full min-w-0 transition-opacity duration-150 ${
              contentVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <h2
              className="font-bold text-xs tracking-wide truncate"
              style={{ color: textColor, opacity: 0.95 }}
            >
              {formattedUserName}
            </h2>
            <span
              className="text-[8px] font-bold uppercase tracking-widest truncate"
              style={{ color: statusColor }}
            >
              {statusLabel}
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
  }, [
    isCollapsedMode,
    resolvedAvatar,
    isDarkBg,
    primary,
    formattedUserName,
    textColor,
    status,
    HomeIcon,
    CloseIcon,
    contentVisible,
    mobileOpen,
    closeMobile,
  ]);

  const bottomButtons = useMemo(() => {
    return (
      <div className="space-y-1 w-full overflow-visible">
        <div
          className={`${
            !contentVisible
              ? 'flex items-center justify-center w-full'
              : 'flex items-center justify-between w-full'
          } rounded-xl text-[11px] font-medium opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 overflow-visible min-h-[36px]`}
        >
          <button
            type="button"
            onClick={toggleCollapse}
            onMouseEnter={(e) => handleTooltipShow(e, getCollapseMessage())}
            onMouseLeave={handleTooltipHide}
            title={isCollapsed ? 'Expandir barra lateral' : 'Contraer menú'}
            style={{ color: textColor }}
            className={`flex items-center ${
              !contentVisible
                ? 'justify-center w-full py-2.5'
                : 'px-3.5 py-2 flex-1'
            } rounded-xl overflow-visible`}
          >
            <div className="flex items-center space-x-2.5">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                  <span className="tracking-tight whitespace-nowrap">
                    {getCollapseMessage()}
                  </span>
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
              onMouseEnter={(e) => handleTooltipShow(e, 'Cerrar Sesión')}
              onMouseLeave={handleTooltipHide}
              title={!contentVisible ? 'Cerrar sesión' : ''}
              className={`w-full flex items-center ${
                !contentVisible
                  ? 'justify-center py-2.5'
                  : 'space-x-2.5 px-3.5 py-2'
              } rounded-xl text-[11px] font-medium text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer overflow-visible min-h-[36px]`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {contentVisible && (
                <span className="tracking-tight whitespace-nowrap">
                  Cerrar Sesión
                </span>
              )}
            </button>

            <Link
              href="/"
              onMouseEnter={(e) => handleTooltipShow(e, 'Ir al sitio principal')}
              onMouseLeave={handleTooltipHide}
              style={{ color: textColor }}
              title={!contentVisible ? 'Ir al sitio principal' : ''}
              className={`w-full flex items-center ${
                !contentVisible
                  ? 'justify-center py-2.5'
                  : 'justify-between px-3.5 py-2'
              } rounded-xl text-[11px] font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible min-h-[36px]`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Home className="w-3.5 h-3.5 shrink-0" />
                {contentVisible && (
                  <span className="tracking-tight truncate">
                    Ir al sitio principal
                  </span>
                )}
              </div>
              {contentVisible && (
                <span className="text-xs opacity-70 shrink-0">↗</span>
              )}
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
    handleTooltipShow,
    handleTooltipHide,
  ]);

  const tooltipRender = useMemo(() => {
    if (!hoveredTab || !isCollapsedMode) return null;

    const isTooltipDark = isDarkBg;
    const tooltipBg = isTooltipDark ? secondary : '#ffffff';
    const tooltipText = isTooltipDark ? textColor : '#111827';
    const borderColor2 = isTooltipDark
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.08)';

    return (
      <div
        className="fixed z-[60] pointer-events-none"
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
          >
            <polygon points="0,8 10,0 10,16" fill={tooltipBg} />
          </svg>
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg whitespace-nowrap"
            style={{
              backgroundColor: tooltipBg,
              color: tooltipText,
              border: `1px solid ${borderColor2}`,
            }}
          >
            {hoveredTab}
          </div>
        </div>
      </div>
    );
  }, [
    hoveredTab,
    isCollapsedMode,
    isDarkBg,
    secondary,
    textColor,
    tooltipPosition,
  ]);

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
        className={`overflow-visible flex flex-col shrink-0 p-5 border-r z-50 ${
          mobileOpen
            ? 'fixed inset-y-0 left-0 w-72 h-full shadow-2xl flex z-50'
            : 'hidden md:flex md:relative z-20'
        }`}
        style={{
          backgroundColor: secondary,
          borderColor: borderColor,
          overflow: 'visible',
          width: mobileOpen ? '288px' : isCollapsed ? '80px' : '288px',
          transition: 'width 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'width',
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
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
          </div>

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
              paddingRight: '3px',
            }}
          >
            <nav className="space-y-1.5 w-full">{menuItemsRender}</nav>
          </div>

          <div
            className="flex-shrink-0 pt-2 w-full border-t border-black/5 dark:border-white/5 overflow-visible"
            style={{ borderColor: borderColor }}
          >
            {contentVisible && (
              <button
                type="button"
                onClick={toggleBottomMenu}
                className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg text-xs font-medium opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer overflow-visible"
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
