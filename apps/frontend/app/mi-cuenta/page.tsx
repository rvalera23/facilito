// frontend/app/mi-cuenta/page.tsx

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AccountHeader from './AccountHeader';
import AccountSidebar from './AccountSidebar';
import SummaryTab from './components/summary/SummaryTab';
import BuyerOrdersTab from './components/orders/BuyerOrdersTab';
import BuyerShippingTab from './components/shipping/BuyerShippingTab';
import BuyerDisputesTab from './components/disputes/BuyerDisputesTab';
import AppointmentsTab from './components/appointments/AppointmentsTab';
import ProfileTab from './components/profile/ProfileTab';
import FavoritesTab from './components/favorites/FavoritesTab';
import ConversationsTab from './components/conversations/ConversationsTab';
import NotificationsTab from './components/notifications/NotificationsTab';
import AccountBrandingVisual from './components/branding/AccountBrandingVisual';
import MyReviewsTab from './components/reviews/MyReviewsTab';
import SessionsList from './components/security/SessionsList';
import BuyerDisputeDetailModal from './components/disputes/BuyerDisputeDetailModal';
import CreditTab from './components/credit/CreditTab';
import { DEFAULT_THEME } from '@/lib/branding';
import { usePersistedState } from '@/hooks/usePersistedState';
import CommandPalette from './components/command-palette/CommandPalette';
import { useCommandPalette } from './components/command-palette/useCommandPalette';
import { buildCommands } from './components/command-palette/commands';
import { ToastThemeProvider } from '@/components/ui/ToastThemeProvider';
import { apiFetch } from '@/lib/api';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';
import { performLogout } from '@/lib/auth/logout';
import { useTenantTheme } from '@/hooks/useTenantTheme';

const DEFAULT_COLORS = {
  primaryColor: DEFAULT_THEME.primaryColor,
  secondaryColor: DEFAULT_THEME.secondaryColor,
  backgroundColor: DEFAULT_THEME.backgroundColor,
  accentColor: DEFAULT_THEME.accentColor,
  fontFamily: 'Quicksand',
};

function getContrastTextColor(hexColor: string) {
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#ffffff';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
}

// ============================================================
// 🔥 Tabs válidos de Mi Cuenta (fuente única de verdad)
// ============================================================
const VALID_MI_CUENTA_TABS = [
  'resumen',
  'perfil',
  'compras',
  'envios',
  'citas',
  'favoritos',
  'resenas',
  'reclamos',
  'conversaciones',
  'notificaciones',
  'seguridad',
  'branding',
  'saldo',
] as const;

type MiCuentaTab = typeof VALID_MI_CUENTA_TABS[number];


function loadMiCuentaFont(fontFamily: string) {
  if (typeof document === 'undefined') return;
  
  const container = document.querySelector('.mi-cuenta-container') as HTMLElement;
  if (!container) return;
  
  if (fontFamily === 'Quicksand') {
    container.style.fontFamily = 'var(--font-quicksand), Quicksand, sans-serif';
    return;
  }
  
  const fontId = `font-${fontFamily.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
  
  container.style.fontFamily = `'${fontFamily}', sans-serif`;
}

export default function MiCuentaPage() {
  // 🔥 Command Palette state + atajo ⌘K
  const commandPalette = useCommandPalette();


  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [tenantPaymentData, setTenantPaymentData] = useState<any>({
    pagoMovilList: [],
    zelle: null,
    binance: null,
    paypal: null,
    activePaymentMethods: [],
    specificConfig: null,
    paymentMethods: null,
  });
  const [activeTab, setActiveTab] = usePersistedState<MiCuentaTab>(
    'mi_cuenta_active_tab',
    'resumen',
    {
      validate: (v): v is MiCuentaTab =>
        typeof v === 'string' && (VALID_MI_CUENTA_TABS as readonly string[]).includes(v),
    },
  );
    const [error, setError] = useState<string | null>(null);
  // 🔥 Inicializar brandConfig desde user_theme si existe (para que el panel adopte el tema del onboarding)
  // 🔥 Fase 6.6: inicializar con DEFAULT_COLORS (idéntico en SSR y cliente).
  // El theme real se carga en un useEffect después del mount.


    const [brandConfig, setBrandConfig] = useState(DEFAULT_COLORS);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);

  // 🔥 FIX: state del tenantId para el theme (se setea cuando `user` cambia).
  const [tenantIdForTheme, setTenantIdForTheme] = useState<string | null>(null);

  useEffect(() => {
    const fromUser =
      user?.tenantId ||
      user?.tenant_id ||
      user?.tenant?.id ||
      null;

    if (fromUser) {
      setTenantIdForTheme(fromUser);
      return;
    }

    if (typeof window === 'undefined') return;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const tid = parsed?.tenantId || parsed?.tenant_id || parsed?.tenant?.id || null;
        if (tid) setTenantIdForTheme(tid);
      }
    } catch {}
  }, [user]);

  // 🔥 Si el user tiene tienda, este hook carga el theme del tenant.
  const tenantTheme = useTenantTheme(tenantIdForTheme);
  // 🔥 CONSTANTES DERIVADAS (después de TODOS los useState).
  // Si el user tiene tienda → el theme viene del tenant (heredado).
  // Si no → viene de brandConfig/user/DEFAULT.
  const hasStore = Boolean(user?.store_slug || user?.tenant?.slug);

  const primaryColor = hasStore
    ? tenantTheme.primary
    : (brandConfig?.primaryColor || user?.primary_color || user?.primaryColor || DEFAULT_COLORS.primaryColor);

  const secondaryColor = hasStore
    ? tenantTheme.secondary
    : (brandConfig?.secondaryColor || user?.secondary_color || user?.secondaryColor || DEFAULT_COLORS.secondaryColor);

  const backgroundColor = hasStore
    ? tenantTheme.background
    : (brandConfig?.backgroundColor || user?.background_color || user?.backgroundColor || DEFAULT_COLORS.backgroundColor);

  const textColor = hasStore
    ? tenantTheme.textColor
    : getContrastTextColor(backgroundColor);

  const isDarkBg = textColor === '#ffffff';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const theme = localStorage.getItem('user_theme');
      if (theme) {
        const parsed = JSON.parse(theme);
        setBrandConfig({
          primaryColor: parsed.primaryColor || DEFAULT_COLORS.primaryColor,
          secondaryColor: parsed.secondaryColor || DEFAULT_COLORS.secondaryColor,
          backgroundColor: parsed.backgroundColor || DEFAULT_COLORS.backgroundColor,
          accentColor: parsed.accentColor || DEFAULT_COLORS.accentColor,
          fontFamily: parsed.fontFamily || DEFAULT_COLORS.fontFamily,
        });
      }
    } catch {}
  }, []);

  // 🔥 FIX: si el user tiene tienda, sobreescribir brandConfig con el theme
  // del tenant. Así el picker (bloqueado) muestra los colores de la tienda.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasStore = Boolean(user?.store_slug || user?.tenant?.slug);
    if (!hasStore) return;
    if (!tenantTheme?.primary) return;

    setBrandConfig({
      primaryColor: tenantTheme.primary,
      secondaryColor: tenantTheme.secondary,
      backgroundColor: tenantTheme.background,
      accentColor: tenantTheme.accent,
      fontFamily: tenantTheme.fontFamily || 'Quicksand',
    });
  }, [user?.store_slug, user?.tenant?.slug, tenantTheme?.primary, tenantTheme?.secondary, tenantTheme?.background, tenantTheme?.accent, tenantTheme?.fontFamily]);

 useEffect(() => {
  // ✅ Cargar fuente desde user_theme, NO desde user
  const getFontFromTheme = () => {
    try {
      const theme = localStorage.getItem('user_theme');
      if (theme) {
        const parsed = JSON.parse(theme);
        return parsed.fontFamily || 'Quicksand';
      }
    } catch {}
    return 'Quicksand';
  };
  const fontFamily = getFontFromTheme();
  loadMiCuentaFont(fontFamily);
}, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setError('No hay sesión');
          setLoading(false);
          return;
        }

        const [resProfile, resOrders, resAppointments] = await Promise.all([
          apiFetch('/account/profile'),
          apiFetch('/account/orders'),
          apiFetch('/account/appointments'),
        ]);

        if (resProfile.ok) {
          const data = await resProfile.json();
          setUser(data);
          
          // 🔥 PRIORIDAD:
          // 1. user_theme (localStorage) — lo que el user eligió más recientemente.
          // 2. backend — si el user nunca personalizó en este dispositivo.
          // 3. DEFAULT_COLORS — fallback.
          //
          // ⚠️ IMPORTANTE: user_theme GANA al backend porque es la elección
          // más reciente (el localStorage se sincroniza al instante, el backend
          // puede tener valores viejos de otro dispositivo/sesión).
          let themeFromStorage: any = {};
          try {
            const stored = localStorage.getItem('user_theme');
            if (stored) themeFromStorage = JSON.parse(stored);
          } catch {}

          // 🔥 Detectar si user_theme tiene datos reales (no solo default).
          const hasUserTheme =
            themeFromStorage.primaryColor &&
            themeFromStorage.secondaryColor &&
            themeFromStorage.backgroundColor;

          const newPrimary = hasUserTheme
            ? themeFromStorage.primaryColor
            : (data?.primary_color || data?.primaryColor || DEFAULT_COLORS.primaryColor);

          const newSecondary = hasUserTheme
            ? themeFromStorage.secondaryColor
            : (data?.secondary_color || data?.secondaryColor || DEFAULT_COLORS.secondaryColor);

          const newBackground = hasUserTheme
            ? themeFromStorage.backgroundColor
            : (data?.background_color || data?.backgroundColor || DEFAULT_COLORS.backgroundColor);

          const newAccent = hasUserTheme
            ? themeFromStorage.accentColor
            : (data?.accent_color || data?.accentColor || DEFAULT_COLORS.accentColor);

          const newFont = hasUserTheme
            ? themeFromStorage.fontFamily
            : (data?.font_family || data?.fontFamily || DEFAULT_COLORS.fontFamily);

          setBrandConfig({
            primaryColor: newPrimary,
            secondaryColor: newSecondary,
            backgroundColor: newBackground,
            accentColor: newAccent,
            fontFamily: newFont,
          });
        } else {
          setError('Error al cargar perfil');
        }

        if (resOrders.ok) {
          const data = await resOrders.json();
          const ordersArray = Array.isArray(data) ? data : (data.orders || data.data || []);
          setOrders(ordersArray);
          
          const productIds: string[] = [];
          const serviceIds: string[] = [];
          
          ordersArray.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                if (item.productId && !productIds.includes(item.productId)) {
                  productIds.push(item.productId);
                }
                if (item.serviceId && !serviceIds.includes(item.serviceId)) {
                  serviceIds.push(item.serviceId);
                }
                if (item.serviceDetails?.serviceId && !serviceIds.includes(item.serviceDetails.serviceId)) {
                  serviceIds.push(item.serviceDetails.serviceId);
                }
              });
            }
          });

          try {
            const tenantIdForProducts = ordersArray[0]?.tenantId || user?.tenantId;
            if (tenantIdForProducts) {
              const token2 = localStorage.getItem('token') || localStorage.getItem('access_token');
              
              let productItems: any[] = [];
              if (productIds.length > 0) {
                const productsRes = await apiFetch(`/products/tenant/${tenantIdForProducts}`);
                if (productsRes.ok) {
                  const allProducts = await productsRes.json();
                  productItems = allProducts.filter((p: any) => productIds.includes(p.id));
                }
              }

              let serviceItems: any[] = [];
              if (serviceIds.length > 0) {
                const servicesRes = await apiFetch(`/services/tenant/${tenantIdForProducts}`);
                if (servicesRes.ok) {
                  const allServices = await servicesRes.json();
                  serviceItems = allServices.filter((s: any) => serviceIds.includes(s.id));
                }
              }

              const allItems = [...productItems, ...serviceItems];
              setUserProducts(allItems);
            }
          } catch (error) {
            console.error('Error obteniendo productos/servicios:', error);
          }
          
          const tenantId = ordersArray.length > 0 ? ordersArray[0]?.tenantId : null;
          if (tenantId) {
            try {
              const token2 = localStorage.getItem('token') || localStorage.getItem('access_token');
              const response = await apiFetch(`/tenants/${tenantId}`);
              if (response.ok) {
                const tenantData = await response.json();
                const specificConfig = tenantData.specificConfig || tenantData.specific_config || {};
                const paymentMethods = specificConfig.paymentMethods || {};
                setTenantPaymentData({
                  pagoMovilList: paymentMethods.pagoMovilList || [],
                  zelle: paymentMethods.zelle || null,
                  binance: paymentMethods.binance || null,
                  paypal: paymentMethods.paypal || null,
                  // 🔥 AGREGAR: métodos activos + config completa para el modal de pago mixto
                  activePaymentMethods:
                    paymentMethods.activePaymentMethods ||
                    specificConfig.activePaymentMethods ||
                    [],
                  specificConfig: {
                    activePaymentMethods:
                      paymentMethods.activePaymentMethods ||
                      specificConfig.activePaymentMethods ||
                      [],
                    paymentMethods,
                  },
                  paymentMethods,
                });
              }
            } catch (error) {
              console.error('Error al obtener datos de pago:', error);
            }
          }
        }

        if (resAppointments.ok) {
          const data = await resAppointments.json();
          const appointmentsArray = Array.isArray(data) ? data : (data.appointments || data.data || []);
          setAppointments(appointmentsArray);
        }
      } catch (err) {
        console.error('❌ Error:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔥 ELIMINADO: NO guardar user_theme automáticamente en cada cambio.
  // Eso contaminaba el theme del próximo user que se logueaba en el mismo navegador.
  // El user_theme SOLO se guarda cuando el user aprieta "Guardar tema"
  // (ver `handleUpdateProfile`), y se restaura al hacer login (ver `AuthModal`).  // 🔥 Cargar y aplicar la fuente en vivo cuando cambia la selección.
  // ⚠️ Debe ir ANTES de los `if (loading) return` y `if (error) return`
  // para no romper las reglas de React Hooks.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Leer la fuente: prioridad brandConfig > localStorage > default
    const family =
      brandConfig?.fontFamily ||
      (() => {
        try {
          const theme = localStorage.getItem('user_theme');
          if (theme) {
            const parsed = JSON.parse(theme);
            return parsed.fontFamily || 'Quicksand';
          }
        } catch {}
        return 'Quicksand';
      })();

    if (!family) return;

    // Cargar el asset de Google Fonts si no está cargado
    if (family !== 'Quicksand') {
      const fontId = `font-${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    }

    const fontStack =
      family === 'Quicksand'
        ? 'var(--font-quicksand), Quicksand, sans-serif'
        : `'${family}', sans-serif`;

    // Aplicar al contenedor de Mi Cuenta
    const container = document.querySelector('.mi-cuenta-container') as HTMLElement;
    if (container) {
      container.style.fontFamily = fontStack;
    }

    // 🔥 TAMBIÉN aplicar al <html> y <body> para que componentes con
    // `createPortal` (como CommandPalette) hereden la fuente.
    document.documentElement.style.fontFamily = fontStack;
    document.body.style.fontFamily = fontStack;

    // Limpieza al desmontar (volver a la fuente por defecto)
    return () => {
      document.documentElement.style.fontFamily = '';
      document.body.style.fontFamily = '';
    };
  }, [brandConfig?.fontFamily]);

  // 🔥 Setear las CSS vars globales (bg, secondary, primary, accent)
  // para que los modales y dropdowns hijos las lean vía useThemeBackground.
  // ⚠️ DEBE estar ANTES de los `if (loading) return` y `if (error) return`.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bg = backgroundColor;
    const sec = secondaryColor;
    const prim = primaryColor;
    const acc = brandConfig?.accentColor || DEFAULT_COLORS.accentColor;

    document.documentElement.style.setProperty('--bg-color', bg);
    document.documentElement.style.setProperty('--secondary-color', sec);
    document.documentElement.style.setProperty('--primary-color', prim);
    document.documentElement.style.setProperty('--accent-color', acc);
    document.body.style.backgroundColor = bg;

    return () => {
      document.documentElement.style.removeProperty('--bg-color');
      document.documentElement.style.removeProperty('--secondary-color');
      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--accent-color');
      document.body.style.backgroundColor = '';
    };
  }, [backgroundColor, secondaryColor, primaryColor, brandConfig?.accentColor]);

    // 🔥 Comandos del Command Palette
  const commandList = useMemo(() => {
    // Tabs disponibles en Mi Cuenta
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'resumen', label: 'Resumen General' },
      { id: 'saldo', label: 'Saldo a favor' },
      { id: 'perfil', label: 'Mi Perfil' },
      { id: 'compras', label: 'Compras' },
      { id: 'envios', label: 'Envíos' },
      { id: 'citas', label: 'Citas' },
      { id: 'favoritos', label: 'Favoritos' },
      { id: 'resenas', label: 'Reseñas' },
      { id: 'conversaciones', label: 'Conversaciones' },
      { id: 'notificaciones', label: 'Notificaciones' },
      { id: 'seguridad', label: 'Seguridad' },
      { id: 'branding', label: 'Personalización' },
    ];

    const storeSlug = user?.store_slug || user?.tenant?.slug || null;

    return buildCommands({
      availableTabs: tabs,
      storeSlug,
      setActiveTab: setActiveTab as (tab: string) => void,
      onLogout: () => {
        performLogout();
      },
      onGoHome: () => { window.location.href = '/'; },
    });
  }, [user, setActiveTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateMessage(null);

    try {
      const payload = {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        city: user?.city || '',
        address: user?.address || '',
        state: user?.state || '',
        municipality: user?.municipality || '',
        deliveryCity: user?.city || '',
        primary_color: brandConfig.primaryColor,
        secondary_color: brandConfig.secondaryColor,
        background_color: brandConfig.backgroundColor,
        accent_color: brandConfig.accentColor,
        font_family: brandConfig.fontFamily,
      };

      const response = await apiFetch('/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el perfil');
      }

      const updated = await response.json();
      setUser(updated);
      
      // ✅ Guardar en user_theme después de actualizar
      // ⚠️ SOLO user_theme, NO app_theme (ese es del admin/tienda).
      const fontFamily = brandConfig.fontFamily || 'Quicksand';
      const userTheme = {
        primaryColor: brandConfig.primaryColor,
        secondaryColor: brandConfig.secondaryColor,
        backgroundColor: brandConfig.backgroundColor,
        accentColor: brandConfig.accentColor,
        fontFamily: fontFamily,
        fontWeight: 400,
        name: user?.name || user?.fullName || 'Mi Cuenta',
      };
      localStorage.setItem('user_theme', JSON.stringify(userTheme));
      loadMiCuentaFont(fontFamily);


      setUpdateMessage({ type: 'success', text: '¡Cambios guardados correctamente!' });
    } catch (error) {
      console.error(error);
      setUpdateMessage({ type: 'error', text: 'Ocurrió un error al guardar los cambios.' });
    } finally {
      setUpdating(false);
    }
  };

// 🔥 FIX: esperar a que el theme del tenant esté listo antes de mostrar el loader con colores
// (si el user tiene tienda). Si no tiene, se usa brandConfig/default sin esperar.
const isThemePending = Boolean(tenantIdForTheme) && tenantTheme.loading;

if (loading || isThemePending) {
  return (
    <div className="mi-cuenta-container" style={{
      height: '100vh',
      // 🔥 Fondo neutral (no colores del theme) para evitar flash
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-quicksand), Quicksand, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          // 🔥 Spinner neutral: blanco sutil, no usa primaryColor
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: 'rgba(255,255,255,0.6)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ opacity: 0.7 }}>
          {isThemePending ? 'Cargando tema...' : 'Cargando tus datos y compras...'}
        </p>
      </div>
    </div>
  );
}

  if (error) {
    return (
      <div className="mi-cuenta-container" style={{
        height: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-quicksand), Quicksand, sans-serif',
      }}>
        <div style={{
          backgroundColor: '#1a1a2e',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ef4444' }}>Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: DEFAULT_COLORS.primaryColor,
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // 🔥 Prioridad: brandConfig (state vivo) > user (guardado en backend) > default.
  // Así los cambios de color/fuente se ven al instante en toda la cuenta,
  // y al pulsar "Guardar tema" se persisten en el backend.
  // 🔥 Fallback SIEMPRE a DEFAULT_COLORS (naranja de facilito), NO a colores hardcodeados






  // 🔥 Fuente en vivo: usar brandConfig primero, luego user_theme, luego default.
  const currentFont =
    brandConfig?.fontFamily ||
    (typeof window !== 'undefined'
      ? (() => {
          try {
            const theme = localStorage.getItem('user_theme');
            if (theme) {
              const parsed = JSON.parse(theme);
              return parsed.fontFamily || 'Quicksand';
            }
          } catch {}
          return 'Quicksand';
        })()
      : 'Quicksand');

  return (
    <ToastThemeProvider
      primary={primaryColor}
      textColor={textColor}
      cardBg={isDarkBg ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)'}
      borderColor={isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}
      isDarkBg={isDarkBg}
    >
    <div 
      className="mi-cuenta-container"
      style={{
        height: '100vh',
        backgroundColor: backgroundColor,
        color: textColor,
        fontFamily: currentFont === 'Quicksand' 
          ? 'var(--font-quicksand), Quicksand, sans-serif'
          : `'${currentFont}', sans-serif`,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <div style={{ 
        display: 'flex', 
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <AccountSidebar
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          primary={primaryColor}
          secondary={secondaryColor}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onLogout={() => {
            performLogout();
          }}
          onOpenCommandPalette={commandPalette.open}
        />

        <div 
          className="mi-cuenta-content"
          style={{ 
            flex: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            padding: '24px',
            // 🔥 Optimización de scroll: aislar la capa y avisar al browser
            contain: 'layout paint',
            willChange: 'scroll-position',
            isolation: 'isolate',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <AccountHeader
            user={user}
            activeTab={activeTab}
            textColor={textColor}
            primary={primaryColor}
            secondary={secondaryColor}
            isDarkBg={isDarkBg}
          />
          
          <div style={{ 
            flex: 1,
            minHeight: 0,
            marginTop: '20px',
            paddingRight: '4px',
          }}>
            <div className="space-y-4">
              <VerifyEmailBanner isLight={!isDarkBg} />

              {activeTab === 'resumen' && (
                <SummaryTab
                  user={user}
                  orders={orders}
                  appointments={appointments}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  userProducts={userProducts}
                  bsRate={0}
                  ivaRate={16}
                />
              )}
                            {activeTab === 'compras' && (
                <BuyerOrdersTab
                  orders={orders}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  tenantPaymentData={tenantPaymentData}
                  userProducts={userProducts}
                />
              )}
              
              {activeTab === 'envios' && (
                <BuyerShippingTab
                  orders={orders}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  onNavigateToOrders={(orderId) => {
                    setActiveTab('compras');
                  }}
                />
              )}

              {activeTab === 'reclamos' && (
                <BuyerDisputesTab
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  onOpenDetail={(dispute) => setSelectedDispute(dispute)}
                />
              )}
              {activeTab === 'citas' && (
                <AppointmentsTab
                  userId={user?.id || user?._id || ''}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  tenantId={user?.tenantId || user?.tenant?.id}
                />
              )}
              
              {activeTab === 'perfil' && (
                <ProfileTab
                  user={user}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  onUpdateUser={(updated: any) => {
                    setUser(updated);
                    const fontFamily = updated?.font_family || updated?.fontFamily || 'Quicksand';
                    loadMiCuentaFont(fontFamily);
                  }}
                  onDeleteAccount={() => {
                    performLogout();
                  }}
                />
              )}

              {activeTab === 'seguridad' && (
                <div
                  className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all duration-300"
                  style={{
                    backgroundColor: secondaryColor || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'),
                    borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    color: textColor,
                  }}
                >
                  <div
                    className="border-b pb-3"
                    style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                  >
                    <h2
                      className="text-base font-black tracking-tight"
                      style={{ color: textColor }}
                    >
                      Seguridad
                    </h2>
                    <p
                      className="text-[11px] opacity-75 mt-0.5"
                      style={{ color: textColor }}
                    >
                      Gestioná tus dispositivos conectados y cerrá sesiones que no reconozcas.
                    </p>
                  </div>
                  <SessionsList
                    primary={primaryColor}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                  />
                </div>
              )}
              
              {activeTab === 'favoritos' && (
                <FavoritesTab
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                />
              )}

              {activeTab === 'resenas' && (
                <MyReviewsTab
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  tenantSlug={user?.tenant?.slug || null}
                />
              )}

              

              
              {activeTab === 'conversaciones' && (
                <ConversationsTab
                  userId={user?.id || user?._id || ''}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  isPrimaryLight={!isDarkBg}
                  textColor={textColor}
                  cardBgClass={isDarkBg ? 'bg-black/40 border-white/10' : 'bg-white/80 border-slate-200/60'}
                  textMainClass={isDarkBg ? 'text-white' : 'text-slate-900'}
                  textMutedClass={isDarkBg ? 'text-slate-400' : 'text-slate-600'}
                  isDarkBg={isDarkBg}
                />
              )}
              
              {activeTab === 'notificaciones' && (
                <NotificationsTab
                  userId={user?.id || user?._id || ''}
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  userProducts={userProducts}
                  tenantPaymentData={tenantPaymentData}
                />
              )}
              
              {activeTab === 'saldo' && (
                <CreditTab
                  primary={primaryColor}
                  secondary={secondaryColor}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                />
              )}

              {activeTab === 'branding' && (
                <div style={{ marginTop: '20px' }}>
                  {updateMessage && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      backgroundColor: updateMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${updateMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      color: updateMessage.type === 'success' ? '#22c55e' : '#ef4444'
                    }}>
                      {updateMessage.text}
                    </div>
                  )}
                  <AccountBrandingVisual
                    formData={brandConfig}
                    setFormData={setBrandConfig}
                    primary={primaryColor}
                    secondary={secondaryColor}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                    onSavePalette={handleUpdateProfile}
                    updating={updating}
                    user={user}
                    pickerDisabled={hasStore}
                    disabledMessage="El control de tu paleta de colores y tipografía ahora lo tiene tu tienda. Cambialo desde el panel de administración."
                    adminUrl={hasStore ? `/admin/${user?.store_slug || user?.tenant?.slug}` : null}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        commands={commandList}
        primary={primaryColor}
        secondary={secondaryColor}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />

      <BuyerDisputeDetailModal
        isOpen={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        dispute={selectedDispute}
        primary={primaryColor}
        secondary={secondaryColor}
        textColor={textColor}
        isDarkBg={isDarkBg}
        onUpdated={() => setSelectedDispute(null)}
      />
    </div>
    </ToastThemeProvider>
  );
}