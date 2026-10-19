  'use client';

import React, { useMemo, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
  import { useToast } from '@/components/ui/useToast';

  interface AdminHeaderProps {
    tenant: any;
    activeTab: string;
    textColor: string;
    primary: string;
    secondary: string;
    isDarkBg: boolean;
    isServiceBusiness?: boolean;
    setActiveTab?: (tab: string) => void;
    // Kiosko
    isKioskActive?: boolean;
    kioskLoading?: boolean;
    onToggleKiosk?: () => void;
    hasPin?: boolean;
    // Command Palette
    onOpenCommandPalette?: () => void;
  }

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
    const schedule = specificConfig.schedule || {};
    const todayConfig = schedule[currentDayKey];

    if (!todayConfig || todayConfig.closed) {
      return { isOpen: false, label: 'Cerrado Hoy' };
    }

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

    return {
      isOpen: current >= openTime && current <= closeTime,
      label: current >= openTime && current <= closeTime ? 'Abierto Ahora' : 'Fuera de Horario'
    };
  };

  // 🔥 TAB TITLES - EXTRAÍDO FUERA DEL COMPONENTE (NO SE RECREA NUNCA)
const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Panel Principal', subtitle: 'Métricas principales y estado actual de tu negocio.' },
  catalog: { title: 'Catálogo e Inventario', subtitle: 'Controla tu stock, precios y catálogo.' },
  orders: { title: 'Órdenes y Ventas', subtitle: 'Monitorea los pedidos entrantes.' },
  bookings: { title: 'Reservas', subtitle: 'Gestiona todas las reservas de tus clientes.' },
  notifications: { title: 'Notificaciones', subtitle: 'Mantente al día con las notificaciones.' },
  messages: { title: 'Conversaciones', subtitle: 'Comunícate con tus clientes.' },
  reviews: { title: 'Reseñas', subtitle: 'Gestiona las opiniones de tus clientes y respondé públicamente.' },
   // 🔥 Unificado: "Envíos y Delivery" cubre encomiendas + repartidores propios
  // en un solo tab con segmented interno (ver ShippingAndDeliveryTab).
  shipping: { title: 'Envíos y Delivery', subtitle: 'Encomiendas a empresas y repartidores propios.' },
  delivery: { title: 'Envíos y Delivery', subtitle: 'Repartidores propios, asignación y tracking en vivo.' },
  themes: { title: 'Marca', subtitle: 'Personaliza la identidad visual de tu negocio.' },
  branding: { title: 'Perfil de Negocio', subtitle: 'Información de tu comercio y datos de contacto.' },
  settings: { title: 'Configuración', subtitle: 'Ajusta los parámetros generales.' },
  professionals: { title: 'Profesionales', subtitle: 'Gestiona los profesionales que atienden en tu negocio.' },
};

  // 🔥 TITLES PARA SERVICIOS - EXTRAÍDO
const SERVICE_TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Panel Principal', subtitle: 'Métricas principales y estado actual de tu negocio.' },
  catalog: { title: 'Catálogo de Servicios', subtitle: 'Administra tu catálogo de servicios.' },
  orders: { title: 'Gestión de Citas', subtitle: 'Revisa la agenda de tus clientes.' },
  bookings: { title: 'Reservas', subtitle: 'Gestiona todas las reservas de tus clientes.' },
  notifications: { title: 'Notificaciones', subtitle: 'Mantente al día con las notificaciones.' },
  messages: { title: 'Conversaciones', subtitle: 'Comunícate con tus clientes.' },
  reviews: { title: 'Reseñas', subtitle: 'Gestiona las opiniones de tus clientes y respondé públicamente.' },
  shipping: { title: 'Disponibilidad y Horarios', subtitle: 'Configura los horarios de atención.' },
  // 🔥 En servicios, 'delivery' no aplica (no hay repartidores propios).
  // El sidebar filtra el tab, así que nunca se abre. Dejamos el título
  // por si algún user lo tenía persistido desde antes: no rompe nada.
  delivery: { title: 'Delivery', subtitle: 'No aplica a negocios de servicios.' },
  themes: { title: 'Marca', subtitle: 'Personaliza la identidad visual de tu negocio.' },
  branding: { title: 'Perfil de Negocio', subtitle: 'Información de tu comercio y datos de contacto.' },
  settings: { title: 'Configuración', subtitle: 'Ajusta los parámetros generales.' },
  professionals: { title: 'Profesionales', subtitle: 'Gestiona los profesionales que atienden en tu negocio.' },
};

  const AdminHeader = React.memo(function AdminHeader({ 
    tenant, 
    activeTab, 
    textColor, 
    primary, 
    secondary, 
    isDarkBg,
    isServiceBusiness = false,
    setActiveTab,
    isKioskActive = false,
    kioskLoading = false,
    onToggleKiosk,
    hasPin = false,
    onOpenCommandPalette,
  }: AdminHeaderProps) {
    const { showToast } = useToast();

    // ✅ BADGE VERIFICADA — lee del AuthContext (fuente única, sincronizada)
    const { user: authUser } = useAuth();
    const isVerified = authUser?.emailVerified === true;

    // ✅ MEMOIZAR LOGO
    const resolvedLogo = useMemo(() => {
      const rawLogo = tenant?.logoUrl || tenant?.logo || tenant?.image;
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

      return raw;
    }, [tenant?.logoUrl, tenant?.logo, tenant?.image]);
    
    // ✅ MEMOIZAR CONFIGURACIÓN
    const specificConfig = useMemo(() => 
      tenant?.specificConfig || tenant?.specific_config || {},
      [tenant?.specificConfig, tenant?.specific_config]
    );
    
    // ✅ MEMOIZAR ESTADO DE LA TIENDA
    const storeStatus = useMemo(() => 
      checkIfStoreIsOpen(specificConfig),
      [specificConfig]
    );

    // ✅ MEMOIZAR NOMBRE FORMATEADO
    const formattedTenantName = useMemo(() => {
      const name = tenant?.name || 'Mi Comercio';
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }, [tenant?.name]);

    // ✅ MEMOIZAR TITULOS - USANDO CONSTANTES FUERA
    const tabTitles = useMemo(() => 
      isServiceBusiness ? SERVICE_TAB_TITLES : TAB_TITLES,
      [isServiceBusiness]
    );

    // ✅ MEMOIZAR INFO ACTUAL
    const currentInfo = useMemo(() => 
      tabTitles[activeTab] || { title: 'Panel de Administración', subtitle: 'Bienvenido.' },
      [tabTitles, activeTab]
    );
    const handleStoreStatusClick = useCallback(() => {
      setActiveTab?.('settings');
    }, [setActiveTab]);

    // ✅ HANDLER MEMOIZADO
    const handleKioskToggleClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (kioskLoading) return;
      if (!hasPin && !isKioskActive) {
        showToast({
          variant: 'warning',
          message:
            'Para activar el modo kiosco necesitás configurar un PIN de seguridad. ' +
            'Andá a Configuración → Seguridad para crearlo.',
          duration: 8000,
        });
        return;
      }
      onToggleKiosk?.();
    }, [kioskLoading, hasPin, isKioskActive, onToggleKiosk, showToast]);

    // ✅ MANEJO DE ERROR DE IMAGEN
    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.style.display = 'none';
    }, []);

    return (
      <header 
        className="relative overflow-hidden border p-4 md:p-6 rounded-3xl flex flex-row items-center justify-between gap-4 md:gap-6 shadow-xl w-full min-h-[120px]"
                style={{ 
          backgroundColor: secondary, 
          borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          color: textColor
        }}
      >
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: primary }} />

                <div className="relative z-10 order-2 md:order-1 space-y-1 max-w-2xl w-full md:w-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
            <span className="text-[11px] font-medium tracking-wide opacity-75 whitespace-nowrap" style={{ color: textColor }}>
              {formattedTenantName}
            </span>
            <span style={{ color: textColor, opacity: 0.3 }} className="text-[11px]">•</span>
            <button
              type="button"
              onClick={handleStoreStatusClick}
              className={`text-[11px] font-medium tracking-wide hover:opacity-80 whitespace-nowrap ${
                storeStatus.isOpen ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {storeStatus.label}
            </button>

            {/* 🔥 Badge del Kiosko — heredado, compacto, al lado del horario */}
            <span style={{ color: textColor, opacity: 0.3 }} className="text-[11px]">•</span>
            <button
              type="button"
              onClick={handleKioskToggleClick}
              disabled={kioskLoading}
              className="flex items-center gap-1 text-[11px] font-medium tracking-wide hover:opacity-80 whitespace-nowrap transition cursor-pointer disabled:opacity-40 disabled:cursor-wait"
              style={{
                color: isKioskActive ? primary : textColor,
                opacity: isKioskActive ? 1 : 0.55,
              }}
              title={
                !hasPin && !isKioskActive
                  ? 'Configurá un PIN primero en Configuración → Seguridad'
                  : isKioskActive
                  ? 'Clic para desactivar el kiosco'
                  : 'Clic para activar el kiosco'
              }
            >
              {/* Ícono monitor */}
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>

              {/* Texto */}
              <span className="leading-none">
                {kioskLoading
                  ? 'Cargando…'
                  : isKioskActive
                  ? 'Kiosko activo'
                  : 'Kiosko inactivo'}
              </span>

              {/* Punto de estado — heredado, sin glow agresivo */}
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isKioskActive
                    ? primary
                    : textColor,
                  opacity: isKioskActive ? 1 : 0.35,
                }}
              />
            </button>

            {/* ✅ Badge Cuenta Verificada */}
            {isVerified && (
              <>
                <span style={{ color: textColor, opacity: 0.3 }} className="text-[11px]">•</span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-emerald-400 whitespace-nowrap"
                  title="Tu cuenta está verificada"
                >
                  <svg
                    className="w-3 h-3 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="leading-none">Verificada</span>
                </span>
              </>
            )}
          </div>

          <div className="space-y-0.5 min-h-[48px]">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: textColor }}>
              {currentInfo.title}
            </h2>
            <p className="text-xs font-normal leading-relaxed opacity-70 pt-0.5 line-clamp-2" style={{ color: textColor }}>
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="relative z-10 order-1 md:order-2 flex flex-col items-start md:items-end gap-2 self-start md:self-center shrink-0">
                              {/* Logo */}
          <div className="flex items-center justify-end w-full min-h-[48px]">
            {resolvedLogo ? (
              <img 
                src={resolvedLogo} 
                alt={tenant?.name || 'Logo'} 
                className="max-h-10 md:max-h-16 max-w-[100px] md:max-w-[220px] w-auto h-auto object-contain"
                                width={220}
                height={72}
                style={{ maxHeight: '72px' }}
                loading="eager"
                onError={handleImageError}
              />
            ) : (
              <span className="font-bold text-sm md:text-base uppercase tracking-wider" style={{ color: primary }}>
                {formattedTenantName}
              </span>
            )}
          </div>
        </div>
      </header>
    );
  });

  AdminHeader.displayName = 'AdminHeader';

  export default AdminHeader;