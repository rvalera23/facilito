'use client';

import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { Maximize, CreditCard, User as UserIcon, LogOut } from 'lucide-react';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { useKioskSession } from '../../contexts/KioskSessionContext';


// ============================================================
// ICONOS SVG LOCALES (heredan color con `currentColor`)
// ============================================================
const IconMaximize = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const IconCreditCard = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

// ============================================================
// HELPERS DE COLOR
// ============================================================
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ensureContrast(color: string, bgColor: string, minRatio = 3): string {
  const fgLum = getLuminance(color);
  const bgLum = getLuminance(bgColor);
  const ratio = fgLum > bgLum ? (fgLum + 0.05) / (bgLum + 0.05) : (bgLum + 0.05) / (fgLum + 0.05);
  if (ratio >= minRatio) return color;
  const bgIsLight = bgLum > 0.5;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const target = bgIsLight ? { r: 20, g: 20, b: 20 } : { r: 245, g: 245, b: 245 };
  const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const mixed = {
    r: mix(rgb.r, target.r, 0.6),
    g: mix(rgb.g, target.g, 0.6),
    b: mix(rgb.b, target.b, 0.6),
  };
  return `#${[mixed.r, mixed.g, mixed.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// 🔥 CREAR CONTEXTO PARA COMPARTIR PROPIEDADES EN TODO EL KIOSKO
const KioskContext = createContext<any>(null);

export const useKioskContext = () => {
  const context = useContext(KioskContext);
  if (!context) {
    console.warn('⚠️ [useKioskContext] Usado fuera de KioskStoreLayout');
    return {};
  }
  return context;
};

export default function KioskStoreLayout({
  tenant,
  logoSource,
  primary,
  secondary,
  isSecondaryLight,
  children,
  searchQuery,
  setSearchQuery,
  token,
  tenantId,
  kioskSettings,
}: any) {

  const requestFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    requestFullScreen();
  }, []);


  // 🔥 Setear CSS vars del tema para que TODOS los componentes del kiosco
  // hereden el fondo/acento/secundario sin hardcodear colores.
  // Patrón idéntico a app/page.tsx, app/admin/[slug]/page.tsx, etc.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const prevBg = root.style.getPropertyValue('--bg-color');
    const prevAccent = root.style.getPropertyValue('--accent-color');
    const prevSecondary = root.style.getPropertyValue('--secondary-color');

    const bgColor = secondary || (isSecondaryLight ? '#f1f5f9' : '#090d16');
    const accentColor = primary || '#F59E0B';
    const secondaryColor = secondary || '#0f172a';

    root.style.setProperty('--bg-color', bgColor);
    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--secondary-color', secondaryColor);

    return () => {
      if (prevBg) root.style.setProperty('--bg-color', prevBg);
      else root.style.removeProperty('--bg-color');
      if (prevAccent) root.style.setProperty('--accent-color', prevAccent);
      else root.style.removeProperty('--accent-color');
      if (prevSecondary) root.style.setProperty('--secondary-color', prevSecondary);
      else root.style.removeProperty('--secondary-color');
    };
  }, [secondary, primary, isSecondaryLight]);

  const [scrolled, setScrolled] = useState(false);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        setScrolled((current) => {
          const next = window.scrollY > 20;
          return current === next ? current : next;
        });
        scrollFrameRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  // 🔥 COLORES Y ESTILOS
  const textColor = isSecondaryLight ? 'text-slate-900' : 'text-white';
  const textMuted = isSecondaryLight ? 'text-slate-500' : 'text-slate-400';
  const backgroundStyle = 'var(--bg-color)';
  
  // 🔥 TASA DE CAMBIO GLOBAL (fuente única de verdad para todo el kiosco)
  const { rates: exchangeRates } = useExchangeRateContext();
  const exchangeRate = Number(exchangeRates?.USD) > 0 ? Number(exchangeRates.USD) : 0;

  // 🔥 Sesión del kiosco (para el indicador del header)
  const { user: kioskUser, mode: kioskMode, logout: kioskLogout, hasChosenMode: kioskHasChosen } = useKioskSession();
  const kioskIsAuthenticated = kioskMode === 'authenticated' && kioskUser;
  const kioskIsAnonymous = kioskMode === 'anonymous';

    // Acento legible para badges e iconos del header
  const safePrimary = primary || '#F59E0B';
  const panelSolidBg = isSecondaryLight ? '#ffffff' : '#0a0e18';
  const accentReadable = ensureContrast(safePrimary, panelSolidBg, 3.5);

  if (!tenant) {
    return (
      <div className="w-screen min-h-screen flex items-center justify-center bg-slate-950 text-white select-none">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="h-16 w-16 bg-white/10 rounded-2xl"></div>
          <div className="h-8 w-64 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const tenantSlogan = tenant?.slogan || tenant?.specific_config?.slogan || '';
  const headerBgColor = secondary || (isSecondaryLight ? '#f1f5f9' : '#090d16');

  // 🔥 VALORES DEL CONTEXTO - SOLO LO ESENCIAL
  const contextValue = {
    tenant,
    logoSource,
    primary,
    secondary,
    isSecondaryLight,
    textColor,
    textMuted,
    backgroundStyle,
    headerBgColor,
    scrolled,
    searchQuery,
    setSearchQuery,
    requestFullScreen,
    accentReadable,
    // 🔥 Tasa de cambio expuesta a todo el kiosco
    exchangeRate,
    kiosk: {
      token,
      tenantId,
      settings: kioskSettings || {
        queue: { enabled: true, refreshIntervalSeconds: 5 },
        printer: { enabled: false },
        notifications: { whatsapp: { enabled: false }, sms: { enabled: false } },
        turnNumber: { prefix: 'T', padding: 3, resetDaily: true },
      },
    },
  };

  return (
    <KioskContext.Provider value={contextValue}>
      <div 
        className={`w-screen min-h-screen flex flex-col select-none m-0 p-0 ${textColor}`}
        style={{ backgroundColor: backgroundStyle }}
      >
        {/* HEADER */}
<header 
  className={`w-full transition-all duration-500 ${scrolled ? 'shadow-lg' : ''}`}
  style={{
    backgroundColor: headerBgColor,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  }}
>
  <div className="w-full px-6 sm:px-10 lg:px-16 py-2 sm:py-2.5">
    
    <div className="flex items-center justify-center relative">
      {/* 🔥 INDICADOR DE SESIÓN DEL KIOSCO (izquierda) */}
      {kioskHasChosen && (
        <div className="absolute left-0 flex items-center gap-2">
          {kioskIsAuthenticated ? (
            <>
              <div
                className="hidden sm:flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border backdrop-blur-md max-w-[220px]"
                style={{
                  backgroundColor: isSecondaryLight
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(255,255,255,0.08)',
                  borderColor: isSecondaryLight
                    ? 'rgba(0,0,0,0.08)'
                    : 'rgba(255,255,255,0.12)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 text-[11px] font-black"
                  style={{ backgroundColor: `${safePrimary}30`, color: accentReadable }}
                >
                  {kioskUser?.avatar ? (
                    <img
                      src={kioskUser.avatar}
                      alt={kioskUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    (kioskUser?.name?.[0] || 'C').toUpperCase()
                  )}
                </div>
                <span
                  className="text-[11px] font-bold truncate"
                  style={{ color: textColor === 'text-white' ? '#ffffff' : '#0f172a' }}
                >
                  {kioskUser?.name || 'Cliente'}
                </span>
                <button
                  type="button"
                  onClick={kioskLogout}
                  className="shrink-0 p-1 rounded-full transition hover:opacity-70 active:scale-95 cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" style={{ color: accentReadable }} />
                </button>
              </div>

              {/* Versión compacta en móvil */}
              <button
                type="button"
                onClick={kioskLogout}
                className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-full border backdrop-blur-md cursor-pointer active:scale-95"
                style={{
                  backgroundColor: isSecondaryLight
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(255,255,255,0.08)',
                  borderColor: isSecondaryLight
                    ? 'rgba(0,0,0,0.08)'
                    : 'rgba(255,255,255,0.12)',
                }}
                title={`Cerrar sesión (${kioskUser?.name || 'Cliente'})`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden text-[9px] font-black"
                  style={{ backgroundColor: `${safePrimary}30`, color: accentReadable }}
                >
                  {kioskUser?.avatar ? (
                    <img
                      src={kioskUser.avatar}
                      alt={kioskUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (kioskUser?.name?.[0] || 'C').toUpperCase()
                  )}
                </div>
                <LogOut className="w-3 h-3" style={{ color: accentReadable }} />
              </button>
            </>
          ) : kioskIsAnonymous ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md"
              style={{
                backgroundColor: isSecondaryLight
                  ? 'rgba(255,255,255,0.7)'
                  : 'rgba(255,255,255,0.08)',
                borderColor: isSecondaryLight
                  ? 'rgba(0,0,0,0.08)'
                  : 'rgba(255,255,255,0.12)',
              }}
            >
              <UserIcon className="w-3.5 h-3.5" style={{ color: accentReadable }} />
              <span
                className="text-[11px] font-bold"
                style={{ color: textColor === 'text-white' ? '#ffffff' : '#0f172a' }}
              >
                Invitado
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Logo */}
      {logoSource ? (
        <img 
          src={logoSource} 
          alt={tenant?.name || 'Tienda'} 
          className="h-10 sm:h-12 w-auto max-w-[160px] sm:max-w-[220px] object-contain" 
        />
      ) : (
        <span className="text-lg font-black">{tenant?.name || 'Tienda'}</span>
      )}

      {/* Badge Autopago + Pantalla completa */}
      <div className="absolute right-0 flex items-center gap-2">
        <span
          className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full border"
          style={{
            backgroundColor: `${accentReadable}20`,
            color: accentReadable,
            borderColor: `${accentReadable}40`,
          }}
        >
          <IconCreditCard className="w-3 h-3" />
          Autopago
        </span>

        <button
          type="button"
          onClick={requestFullScreen}
          className={`p-2 rounded-xl border transition active:scale-95 cursor-pointer flex items-center justify-center ${
            isSecondaryLight 
              ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white' 
              : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
          }`}
          title="Pantalla Completa"
        >
<IconMaximize className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Eslogan */}
    {tenantSlogan && (
      <div className="flex justify-center">
        <p className={`text-[9px] sm:text-[10px] font-medium tracking-wide ${textMuted}`}>
          {tenantSlogan}
        </p>
      </div>
    )}
  </div>
</header>

<main className="w-full flex-1 px-0 py-4 m-0">
  <div className="w-full max-w-none">
    {children}
  </div>
</main>
      </div>
    </KioskContext.Provider>
  );
}