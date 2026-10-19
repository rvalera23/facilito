  'use client';

  import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, memo } from 'react';
  import { useParams, useRouter } from 'next/navigation';
  import { useAdminTenant } from './hooks/useAdminTenant';
  import { usePersistedActiveTab } from './hooks/useNavigation';
  import { useUnlockGate } from './hooks/useUnlockGate';
  import { useSecurityPin } from './components/settings/hooks/useSecurityPin';
  import PinGateModal from './components/settings/subcomponents/Modals/PinGateModal';
  import { useTerminalManager } from './components/settings/hooks/useTerminalManager';
  import AdminSidebar from './components/AdminSidebar';
  import AdminHeader from './components/AdminHeader';
  import { usePageTitle } from '../../../hooks/usePageTitle';
  import { getImageUrl } from '@/lib/imageUtils';
  import { DEFAULT_THEME } from '@/lib/branding';
  import CommandPalette from './components/command-palette/CommandPalette';
  import { useCommandPalette } from './components/command-palette/useCommandPalette';
  import { buildCommands } from './components/command-palette/commands';
  import { ToastThemeProvider } from '@/components/ui/ToastThemeProvider';
  import { useToast } from '@/components/ui/useToast';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';
import { performLogout } from '@/lib/auth/logout';
  // LAZY LOAD PARA TABS
  const DashboardTab = lazy(() => import('./components/dashboard/DashboardTab'));
  const CatalogTab = lazy(() => import('./components/catalog/CatalogTab'));
  const OrdersTab = lazy(() => import('./components/orders/OrdersTab'));
  const ServiceBookingsTab = lazy(() => import('./components/orders/ServiceBookingsTab'));
  const AvailabilityTab = lazy(() => import('./components/availability/AvailabilityTab'));
  const BrandingTab = lazy(() => import('./components/branding/BrandingTab'));
  const ThemesTab = lazy(() => import('./components/themes/ThemesTab'));
  const SettingsTab = lazy(() => import('./components/settings/SettingsTab'));
  const ConversationsTab = lazy(() => import('./components/conversations/ConversationsTab'));
const ShippingTab = lazy(() => import('./components/shipping/ShippingTab'));
const ShippingAndDeliveryTab = lazy(() => import('./components/shipping/ShippingAndDeliveryTab'));
  const NotificationsTab = lazy(() => import('./components/notifications/NotificationsTab'));
  const ReviewsTab = lazy(() => import('./components/reviews/ReviewsTab'));
  const BookingsTab = lazy(() => import('./components/bookings/BookingsTab'));
  const ProfessionalsTab = lazy(() => import('./components/professionals/ProfessionalsTab'));
  const DeliveryTab = lazy(() => import('./components/delivery/DeliveryTab'));
  // ============================================================
  // 🔥 FUNCIÓN UTILITARIA - FUERA DEL COMPONENTE
  // ============================================================
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
  // 🔥 SUBCOMPONENTE: SearchBar (MEMOIZADO)
  // ============================================================
  const SearchBar = memo(({ searchTerm, setSearchTerm, primaryColor, isDarkBg }: any) => {
    if (!searchTerm) return null;

    return (
      <div 
        className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs backdrop-blur-md transition-all shadow-lg border"
        style={{ 
          backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.7)',
          borderColor: primaryColor + '40'
        }}
      >
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
          <span>
            Filtrando panel por: <strong className="font-semibold" style={{ color: primaryColor }}>"{searchTerm}"</strong>
          </span>
        </div>
        <button 
          onClick={() => setSearchTerm('')} 
          className="opacity-70 hover:opacity-100 font-medium underline cursor-pointer transition"
        >
          Limpiar búsqueda
        </button>
      </div>
    );
  });
  SearchBar.displayName = 'SearchBar';

  // ============================================================
  // 🔥 SUBCOMPONENTE: LoadingFallback (MEMOIZADO)
  // ============================================================
  const LoadingFallback = memo(({ primaryColor }: { primaryColor: string }) => (
    <div className="flex items-center justify-center py-12">
      <div 
        className="w-6 h-6 border-2 rounded-full animate-spin" 
        style={{
          borderTopColor: 'transparent',
          borderRightColor: primaryColor,
          borderBottomColor: primaryColor,
          borderLeftColor: primaryColor,
        }}
      />
    </div>
  ));
  LoadingFallback.displayName = 'LoadingFallback';

  // ============================================================
  // 🔥 SUBCOMPONENTE: Footer (MEMOIZADO - EXTRAÍDO FUERA)
  // ============================================================
  const Footer = memo(({ 
    formattedTenantName, 
    currentYear, 
    tenantSlogan, 
    textColor, 
    isDarkBg 
  }: any) => {
    return (
      <footer 
        className="mt-8 pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-50"
        style={{ 
          borderColor: isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          color: textColor 
        }}
      >
        <span>
          © {currentYear} {formattedTenantName}. {tenantSlogan}
        </span>
        <span className="flex items-center gap-2">
          <span>v1.0</span>
          <span className="w-1 h-1 rounded-full bg-current opacity-30" />
          <span>Hecho con ❤️ en Venezuela</span>
        </span>
      </footer>
    );
  });
  Footer.displayName = 'Footer';

  // ============================================================
  // 🔥 CONSTANTE DE TABS - FUERA DEL COMPONENTE
  // ============================================================
  const TAB_NAMES = {
    dashboard: 'Dashboard',
    catalog: 'Catálogo',
    orders: 'Pedidos',
    bookings: 'Reservas',
    shipping: 'Envíos',
    branding: 'Perfil de Comercio',
    themes: 'Temas',
    settings: 'Configuración',
    messages: 'Mensajes',
    reviews: 'Reseñas',
    notifications: 'Notificaciones',
    professionals: 'Profesionales',
    delivery: 'Delivery',
  };



  // ============================================================
  // 🔥 Tabs válidos del admin (fuente única de verdad)
  // ============================================================
  const VALID_ADMIN_TABS = [
    'dashboard',
    'catalog',
    'orders',
    'bookings',
    'shipping',
    'branding',
    'themes',
    'settings',
    'messages',
    'reviews',
    'notifications',
    'professionals',
    'delivery',
  ] as const;

  type AdminTab = typeof VALID_ADMIN_TABS[number];

  // ============================================================
  // 🔥 COMPONENTE PRINCIPAL MEMOIZADO
  // ============================================================
  const AdminTenantPageComponent = memo(function AdminTenantPageComponent() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const { showToast } = useToast();

    // 🔥 Command Palette state + atajo ⌘K
    const commandPalette = useCommandPalette();
    
    const { 
      tenant, 
      setTenant,  
      items, 
      setItems,
      orders, 
      bookings,
      loading, 
      newItem, 
      setNewItem, 
      brandConfig, 
      setBrandConfig, 
      handleSaveBranding, 
      handleCreateItem,
      handleUpdateItem,
      handleRemoveItem,
      handleLogoUpload,
      handleBannerUpload,
      handleFaviconUpload,
      businessType,
      isServiceBusiness,
      primary,
      secondary,
      textColor,
      logoSource,
      refreshData,
      cachedTheme,
    } = useAdminTenant();
    
    // ✅ MEMOIZAR getImageUrl
    const getImageUrlMemo = useMemo(() => getImageUrl, []);

      // 🔥 PIN GATE — control de acceso a la sección "Configuración y Cuenta"
    const {
      isUnlocked: isSettingsUnlocked,
      unlock: unlockSettings,
      checkAccess: checkSettingsAccess,
    } = useUnlockGate({
      sectionKey: 'settings',
      tenantId: tenant?.id,
    });

    const {
      hasPin: tenantHasPin,
      verifyPin: verifyTenantPin,
    } = useSecurityPin({
      tenantId: tenant?.id,
    });

    // 🔥 Estado del modal de gate (qué sección está esperando desbloqueo)
    const [pendingProtectedTab, setPendingProtectedTab] = useState<AdminTab | null>(null);

    // ============================================================
    // 🔥 KIOSKO — Manager global + gate por PIN para activar
    // ============================================================
    // El terminalManager vive acá (no en SettingsTab) para que el header
    // pueda mostrar el estado y togglear sin entrar a Settings.
    // Se le pasa al SettingsTab por props para que use el mismo estado.
    const terminalManager = useTerminalManager(tenant, (msg) => {
      if (msg) console.error('[Kiosk]', msg);
    });

    const {
      isUnlocked: isKioskUnlocked,
      unlock: unlockKiosk,
      checkAccess: checkKioskAccess,
    } = useUnlockGate({
      sectionKey: 'kiosk',
      tenantId: tenant?.id,
    });

    // Estado del modal de PIN del kiosko
    const [pendingKioskUnlock, setPendingKioskUnlock] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [activeTab, setActiveTabRaw] = usePersistedActiveTab<AdminTab>(VALID_ADMIN_TABS);
      const hasFetchedUserId = useRef(false);

    // ✅ EFECTO DE CLIENTE Y RESIZE - UNA SOLA VEZ
    useEffect(() => {
      setIsClient(true);
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ✅ USER ID - CON DEPENDENCIA CORRECTA Y CLEANUP
    useEffect(() => {
      if (hasFetchedUserId.current) return;
      hasFetchedUserId.current = true;

      if (typeof window !== 'undefined') {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const id = user?.id || user?._id || user?.userId || user?.sub || null;
            if (id) {
              setCurrentUserId(id);
              return;
            }
          }
          
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              const decoded = JSON.parse(jsonPayload);
              const id = decoded?.sub || decoded?.id || decoded?.userId || null;
              if (id) {
                setCurrentUserId(id);
              }
            } catch (e) {
              // Silencioso
            }
          }
        } catch (e) {
          // Silencioso
        }
      }
    }, []); // ✅ SIN DEPENDENCIAS (solo se ejecuta una vez)

      // ✅ ESCUCHAR EVENTOS DE NAVEGACIÓN DESDE EL DASHBOARD
    useEffect(() => {
      const handleNavigateTab = (e: CustomEvent) => {
        const { tab, filter } = e.detail;
        setActiveTab(tab);
        if (filter) {
          console.log('Filtro recibido:', filter);
        }
      };

      window.addEventListener('navigateTab', handleNavigateTab as EventListener);
      return () => {
        window.removeEventListener('navigateTab', handleNavigateTab as EventListener);
      };
    }, []);

      // ✅ LA FUENTE SE CARGA EN UserFontLoader - NO HACER NADA AQUÍ
      // Este useEffect está vacío porque UserFontLoader maneja la fuente
      useEffect(() => {
        // Intencionalmente vacío - la fuente se maneja en UserFontLoader
      }, []);

    // ✅ MEMOIZAR VALORES DERIVADOS
    const customBg = useMemo(() => brandConfig?.backgroundColor || DEFAULT_THEME.backgroundColor, [brandConfig?.backgroundColor]);
    const primaryColor = useMemo(() => brandConfig?.primaryColor || DEFAULT_THEME.primaryColor, [brandConfig?.primaryColor]);
      const dynamicTextColor = useMemo(() => getContrastTextColor(customBg), [customBg]);
    const isDarkBg = useMemo(() => dynamicTextColor === '#ffffff', [dynamicTextColor]);

    const secondaryColor = useMemo(() => {
      // 🔥 Si el tenant tiene un secondaryColor explícito, usarlo
      if (brandConfig?.secondaryColor) return brandConfig?.secondaryColor;
      
      // 🔥 Si no, usar un neutro según el tema (NO el backgroundColor)
      return isDarkBg ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
    }, [brandConfig?.secondaryColor, isDarkBg]);

    // ✅ MEMOIZAR NOMBRE DE TENANT
    const rawTenantName = useMemo(() => tenant?.name || 'Mi Comercio', [tenant?.name]);
    const formattedTenantName = useMemo(() => 
      rawTenantName.charAt(0).toUpperCase() + rawTenantName.slice(1).toLowerCase(), 
      [rawTenantName]
    );
    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const tenantSlogan = useMemo(() => tenant?.slogan || '', [tenant?.slogan]);

    // ✅ PROCESAR ITEMS - CON DEPENDENCIAS ESTABLES
    const processedItems = useMemo(() => {
      if (!items || items.length === 0) return items;
      
      return items.map((item: any) => {
        const processedImage = getImageUrl(item);
        return {
          ...item,
          _processedImage: processedImage,
          coverImage: processedImage || item.coverImage,
          image: processedImage || item.image,
        };
      });
    }, [items]); // items es la única dependencia

    // ✅ PROCESAR BANNER Y LOGO
    const processedBannerSource = useMemo(() => {
      const banner = tenant?.bannerUrl || tenant?.banner || brandConfig?.bannerUrl || brandConfig?.banner || null;
      return banner ? getImageUrl({ coverImage: banner }) : null;
    }, [tenant?.bannerUrl, tenant?.banner, brandConfig?.bannerUrl, brandConfig?.banner]);

    const processedLogoSource = useMemo(() => {
      const logo = logoSource || tenant?.logoUrl || tenant?.logo || brandConfig?.logoUrl || brandConfig?.logo || null;
      return logo ? getImageUrl({ coverImage: logo }) : null;
    }, [logoSource, tenant?.logoUrl, tenant?.logo, brandConfig?.logoUrl, brandConfig?.logo]);

    const processedFavicon = useMemo(() => {
      const favicon = tenant?.faviconUrl || brandConfig?.faviconUrl || null;
      return favicon ? getImageUrl({ coverImage: favicon }) : null;
    }, [tenant?.faviconUrl, brandConfig?.faviconUrl]);

    // ✅ FILTRADO DE ITEMS, ORDERS Y BOOKINGS
    const query = useMemo(() => searchTerm.toLowerCase().trim(), [searchTerm]);

    const filteredItems = useMemo(() => {
      if (!query) return processedItems;
      return processedItems.filter((item: any) => {
        const name = item?.name || item?.title || '';
        const description = item?.description || '';
        return name.toLowerCase().includes(query) || description.toLowerCase().includes(query);
      });
    }, [processedItems, query]);

    const filteredOrders = useMemo(() => {
      if (!query) return orders;
      return orders.filter((order: any) => {
        const clientName = order?.clientName || order?.customerName || order?.name || '';
        const orderId = String(order?.id || order?._id || '');
        return clientName.toLowerCase().includes(query) || orderId.includes(query);
      });
    }, [orders, query]);

    const filteredBookings = useMemo(() => {
      if (!query || !bookings) return bookings || [];
      return bookings.filter((booking: any) => {
        const customerName = booking?.customerName || '';
        const serviceName = booking?.service?.name || '';
        const bookingId = String(booking?.id || '');
        return customerName.toLowerCase().includes(query) || 
              serviceName.toLowerCase().includes(query) || 
              bookingId.includes(query);
      });
    }, [bookings, query]);

    // ✅ USER ID
    const userId = useMemo(() => currentUserId || tenant?.ownerId || null, [currentUserId, tenant?.ownerId]);


      // 🔥 SINCRONIZAR CSS VARIABLES GLOBALES CON EL TEMA DEL TENANT
    // Mismo patrón que la tienda (usePublicStore → page.tsx):
    // seteamos --bg-color y --primary-color en documentElement para que
    // el `body` (definido en globals.css con `background-color: var(--bg-color)`)
    // tome el color correcto. Sin esto, el body queda con el default
    // (#0f172a) y se ve un borde oscuro alrededor del admin-container.
useEffect(() => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--bg-color', customBg);
  root.style.setProperty('--primary-color', primaryColor);
  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--accent-color', primaryColor);
  // 🔥 NUEVO: setear --text-color y color para que los toasts/modales hereden
  root.style.setProperty('--text-color', dynamicTextColor);
  root.style.setProperty('color', dynamicTextColor);

  return () => {
    root.style.removeProperty('--bg-color');
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--accent-color');
    root.style.removeProperty('--text-color');
    root.style.removeProperty('color');
  };
}, [customBg, primaryColor, dynamicTextColor]);

    // ✅ FAVICON
    useEffect(() => {
      if (!tenant) return;
      
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      const faviconUrl = processedFavicon || tenant.faviconUrl || tenant.logoUrl || '/favicon.ico';
      link.href = faviconUrl;
      
      return () => {
        const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (existingLink) {
          existingLink.href = '/favicon.ico';
        }
      };
    }, [tenant, processedFavicon, tenant?.faviconUrl, tenant?.logoUrl]);

    // ✅ HANDLERS MEMOIZADOS
    const getTabDisplayName = useCallback(() => {
      return TAB_NAMES[activeTab as keyof typeof TAB_NAMES] || '';
    }, [activeTab]);

    // 🔥 SECCIONES QUE REQUIEREN PIN (por ahora solo 'settings')
    const PROTECTED_TABS: AdminTab[] = ['settings'];

    // 🔥 Wrapper que intercepta los cambios de tab
    // Si el tab es protegido y el tenant tiene PIN y no está desbloqueado,
    // abrimos el modal en lugar de cambiar de tab.
    //
    // ⚠️ Usa `setActiveTabRaw` (el setter puro del hook de persistencia) para
    // evitar dependencia circular con el alias `setActiveTab` que se define abajo.
    const handleTabChangeWithGate = useCallback((tab: AdminTab) => {
      const isProtected = PROTECTED_TABS.includes(tab);

      // No es protegido → pasa directo
      if (!isProtected) {
        setActiveTabRaw(tab);
        return;
      }

      // No tiene PIN configurado → pasa directo (no hay nada que proteger)
      if (!tenantHasPin) {
        setActiveTabRaw(tab);
        return;
      }

      // Tiene PIN y ya está desbloqueado → pasa directo
      if (checkSettingsAccess()) {
        setActiveTabRaw(tab);
        return;
      }

      // Necesita verificar PIN → guardar el tab pendiente y abrir el modal
      setPendingProtectedTab(tab);
    }, [setActiveTabRaw, tenantHasPin, checkSettingsAccess]);

    // 🔥 Callback al verificar exitosamente el PIN
    const handlePinVerified = useCallback(() => {
      unlockSettings();
      if (pendingProtectedTab) {
        setActiveTabRaw(pendingProtectedTab);
        setPendingProtectedTab(null);
      }
    }, [unlockSettings, pendingProtectedTab, setActiveTabRaw]);

    // 🔥 Callback al cerrar el modal sin verificar
    const handlePinCancel = useCallback(() => {
      setPendingProtectedTab(null);
    }, []);
    // ============================================================
    // 🔥 HANDLERS DEL KIOSKO (activar/desactivar con PIN)
    // ============================================================
    // Reglas:
    //   - Desactivar: directo, sin PIN.
    //   - Activar sin PIN configurado: bloqueado con mensaje.
    //   - Activar con PIN ya desbloqueado esta sesión: directo.
    //   - Activar con PIN: pide PIN antes de activar.
    // ============================================================
    const handleKioskToggleFromHeader = useCallback(() => {
      const isActive =
        terminalManager.terminals.length > 0 &&
        terminalManager.terminals[0].isActive !== false;

      // Desactivar → directo
      if (isActive) {
        terminalManager.handleToggleKiosk();
        return;
      }

      // 🔥 FASE K3.3: Activar → validar que haya ≥1 item disponible para kiosco
      const hasAvailableItems =
        Array.isArray(items) &&
        items.some(
          (i: any) => i.availableKiosk === true && i.status === 'published'
        );

      if (!hasAvailableItems) {
        showToast({
          variant: 'warning',
          message:
            'No hay items disponibles para kiosco. Configurá al menos un producto/servicio con el canal "Kiosco" activado.',
          duration: 8000,
        });
        return;
      }

      // Activar → verificar acceso
      if (checkKioskAccess()) {
        terminalManager.handleToggleKiosk();
        return;
      }

      // Sin PIN configurado → no se puede activar
      if (!tenantHasPin) {
        showToast({
          variant: 'warning',
          message:
            'Para activar el modo kiosco necesitás configurar un PIN de seguridad. ' +
            'Andá a Configuración → Seguridad para crearlo.',
          duration: 8000,
        });
        return;
      }
      // Pedir PIN
      setPendingKioskUnlock(true);
    }, [terminalManager, checkKioskAccess, tenantHasPin, showToast, items]);

    const handleKioskPinVerified = useCallback(() => {
      unlockKiosk();
      setPendingKioskUnlock(false);
      terminalManager.handleToggleKiosk();
    }, [unlockKiosk, terminalManager]);

    const handleKioskPinCancel = useCallback(() => {
      setPendingKioskUnlock(false);
    }, []);
    // 🔥 Alias para no romper los usos existentes de `setActiveTab`.
    // Todos los consumidores (sidebar, dashboard, etc.) siguen llamando
    // `setActiveTab` y ahora pasan por el gate automáticamente.
    const setActiveTab = handleTabChangeWithGate;


    const handleUpdateItemsList = useCallback((updatedItems: any[]) => {
      setItems(updatedItems);
    }, [setItems]);

    const handleStartEdit = useCallback((item: any) => {
      const extractedPrices = item.prices || item.attributes?.prices || item.metadata?.prices || { 
        VES: item.price || 0, 
        USD: 0, 
        EUR: 0, 
        CRYPTO: 0 
      };

      setNewItem({
        ...item,
        id: item.id || item._id || '',
        itemId: item.itemId || item.sku || item.code || '',
        stock: item.stock ?? 0,
        price: item.price || extractedPrices.VES || 0,
        prices: extractedPrices,
        status: item.status || 'published',
        isActive: item.isActive ?? (item.status === 'published')
      });
    }, [setNewItem]);

    const handleLogout = useCallback(() => {
      // 🔥 Limpiar también el sessionStorage de desbloqueo del PIN.
      // Como el unlock vive en sessionStorage (por diseño), al cerrar sesión
      // hay que borrarlo manualmente para que la próxima vez pida PIN de nuevo.
      try {
        if (typeof window !== 'undefined') {
          const keysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('section_unlock_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => sessionStorage.removeItem(k));
        }
      } catch {
        // Silencioso
      }

      performLogout();
    }, []);

    const handleUpdateTenant = useCallback((updatedData: any) => {
      setTenant((prev: any) => {
        const merged = {
          ...prev,
          ...updatedData,
          specific_config: updatedData.specific_config || updatedData.specificConfig || prev?.specific_config,
          specificConfig: updatedData.specificConfig || updatedData.specific_config || prev?.specificConfig
        };
        if (typeof window !== 'undefined') {
          try {
            const storedTenant = JSON.parse(localStorage.getItem('tenant') || '{}');
            localStorage.setItem('tenant', JSON.stringify({ ...storedTenant, ...merged }));
          } catch (e) {}
        }
        return merged;
      });

      // NUEVO: si el slug cambió, redirigir la URL
      if (updatedData.slug && tenant?.slug && updatedData.slug !== tenant.slug) {
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(`/admin/${tenant.slug}`, `/admin/${updatedData.slug}`);
        if (newPath !== currentPath) {
          router.replace(newPath);
        }
      }
    }, [setTenant, tenant?.slug, router]);


    const handleAvailabilitySave = useCallback(async (data: any) => {
      await refreshData();
    }, [refreshData]);

    // ✅ MEMOIZAR PROPS DE TABS - SOLO CAMBIAN CUANDO ES NECESARIO
    const tabProps = useMemo(() => ({
      tenant,
      primary: primaryColor,
      secondary: secondaryColor,
      textColor: dynamicTextColor,
      isDarkBg,
      businessType,
      isServiceBusiness,
      getImageUrl: getImageUrlMemo,
    }), [tenant, primaryColor, secondaryColor, dynamicTextColor, isDarkBg, businessType, isServiceBusiness, getImageUrlMemo]);

    const dashboardProps = useMemo(() => ({
      ...tabProps,
      orders,
      items: processedItems,
      businessConfig: tenant,
      customers: [],
      appointments: bookings,
      onSelectOrder: (order: any) => {
        setActiveTab('orders');
      },
      onNavigate: (section: string, filter?: any) => {
        setActiveTab(section as any);
        if (filter) {
          // Guardar filtro si es necesario
        }
      },
    }), [tabProps, orders, processedItems, tenant, bookings]);

    const catalogProps = useMemo(() => ({
      ...tabProps,
      items: filteredItems,
      handleUpdateItemsList,
      businessConfig: tenant,
      newItem,
      setNewItem,
      handleCreateItem,
      handleUpdateItem,
      handleRemoveItem,
      handleStartEdit,
    }), [tabProps, filteredItems, handleUpdateItemsList, tenant, newItem, setNewItem, handleCreateItem, handleUpdateItem, handleRemoveItem, handleStartEdit]);

    const ordersProps = useMemo(() => ({
      ...tabProps,
      bookings: filteredBookings,
      onUpdateBooking: () => {},
    }), [tabProps, filteredBookings]);

    const shippingProps = useMemo(() => ({
      ...tabProps,
      orders: filteredOrders,
    }), [tabProps, filteredOrders]);

    const brandingProps = useMemo(() => ({
      ...tabProps,
      brandConfig,
      setBrandConfig,
      handleSaveBranding,
      handleLogoUpload,
      handleBannerUpload,
      handleFaviconUpload,
      tenantId: tenant?.id,
    }), [tabProps, brandConfig, setBrandConfig, handleSaveBranding, handleLogoUpload, handleBannerUpload, handleFaviconUpload, tenant?.id]);

    const themesProps = useMemo(() => ({
      ...tabProps,
      brandConfig,
      setBrandConfig,
      handleLogoUpload,
      handleBannerUpload,
      handleFaviconUpload,
      tenantId: tenant?.id,
      handleSaveBranding,
    }), [tabProps, brandConfig, setBrandConfig, handleLogoUpload, handleBannerUpload, handleFaviconUpload, tenant?.id, handleSaveBranding]);

    const settingsProps = useMemo(() => ({
      ...tabProps,
      businessType: tenant?.workModality || tenant?.work_modality || tenant?.businessType,
      onUpdateTenant: handleUpdateTenant,
      terminalManagerExternal: terminalManager,
    }), [tabProps, tenant?.workModality, tenant?.work_modality, tenant?.businessType, handleUpdateTenant, terminalManager]);
    const availabilityProps = useMemo(() => ({
      ...tabProps,
      onSave: handleAvailabilitySave,
      existingServices: processedItems,
    }), [tabProps, handleAvailabilitySave, processedItems]);

    const messagesProps = useMemo(() => ({
      ...tabProps,
      tenantId: tenant?.id,
      isPrimaryLight: !isDarkBg,
      cardBgClass: isDarkBg ? 'bg-black/40 border-white/10' : 'bg-white/80 border-slate-200/60',
      textMainClass: isDarkBg ? 'text-white' : 'text-slate-900',
      textMutedClass: isDarkBg ? 'text-slate-400' : 'text-slate-600',
    }), [tabProps, tenant?.id, isDarkBg]);

    const reviewsProps = useMemo(() => ({
    ...tabProps,
    tenantId: tenant?.id,
  }), [tabProps, tenant?.id]);

  const professionalsProps = useMemo(() => ({
    ...tabProps,
    tenantId: tenant?.id,
    tenantSlug: slug,
  }), [tabProps, tenant?.id, slug]);

  const deliveryProps = useMemo(() => ({
    ...tabProps,
    tenantId: tenant?.id,
    tenantSlug: slug,
  }), [tabProps, tenant?.id, slug]);

    // ✅ MEMOIZAR EL RENDER DE TABS
    const renderActiveTab = useCallback(() => {
      switch (activeTab) {
        case 'dashboard': return <DashboardTab {...dashboardProps} />;
        case 'catalog': return <CatalogTab {...catalogProps} />;
        case 'orders': return isServiceBusiness ? <ServiceBookingsTab {...ordersProps} /> : <OrdersTab {...shippingProps} />;
        case 'bookings': return <BookingsTab {...tabProps} onRefresh={refreshData} />;
        case 'notifications': return <NotificationsTab {...tabProps} />;
        case 'branding': return <BrandingTab {...brandingProps} />;
        case 'themes': return <ThemesTab {...themesProps} />;
// 🔥 En productos, "Envíos y Despachos" ahora es un solo tab con dos
// segmentos internos: Encomiendas (ShippingTab) + Repartidores (DeliveryTab).
// En servicios, sigue mostrando AvailabilityTab (horarios).
// No cambiamos el id del tab ('shipping') para no romper persistencia.
case 'shipping':
  return isServiceBusiness
    ? <AvailabilityTab {...availabilityProps} />
    : <ShippingAndDeliveryTab
        {...shippingProps}
        {...deliveryProps}
      />;
              case 'settings': return <SettingsTab {...settingsProps} />;
        case 'messages': return <ConversationsTab {...messagesProps} />;
        case 'reviews': return <ReviewsTab {...reviewsProps} />;
        case 'professionals': return isServiceBusiness ? <ProfessionalsTab {...professionalsProps} /> : null;
// 🔥 'delivery' ya no se muestra como tab independiente en productos.
// Si un user lo tenía persistido, lo redirigimos al tab unificado
// 'shipping' con el segmento "Repartidores" activo.
// En servicios, este tab ya no aparece en el sidebar (filtrado).
case 'delivery':
  return <ShippingAndDeliveryTab
    {...shippingProps}
    {...deliveryProps}
    initialSegment="repartidores"
  />;
          default: return null;
      }
    }, [
      activeTab,
      dashboardProps,
      catalogProps,
      ordersProps,
      shippingProps,
      brandingProps,
      themesProps,
      settingsProps,
      availabilityProps,
      messagesProps,
      reviewsProps,
      professionalsProps,
      deliveryProps,
      tabProps,
      isServiceBusiness,
      refreshData,
    ]);
    // ✅ MEMOIZAR PAGE TITLE
    const pageTitle = useMemo(() => {
      if (!tenant?.name) return 'Panel de Administración';
      const tabName = getTabDisplayName();
      return `${tenant.name}${tabName ? ` — ${tabName}` : ''} | Panel Administrativo`;
    }, [tenant?.name, getTabDisplayName]);

    usePageTitle({
      title: pageTitle,
      fallback: 'facilito — Panel de Administración'
    });

    // 🔥 Comandos del Command Palette
    // Se reconstruyen cuando cambia el tenant, el estado del kiosko, o el logout.
    const commandList = useMemo(() => {
      if (!tenant) return [];

      // Construir lista de tabs disponibles según el tipo de negocio
      const tabs: Array<{ id: string; label: string }> = [
        { id: 'dashboard', label: 'Panel Principal' },
        { id: 'catalog', label: isServiceBusiness ? 'Catálogo de Servicios' : 'Catálogo e Inventario' },
        { id: 'orders', label: isServiceBusiness ? 'Gestión de Citas' : 'Órdenes y Ventas' },
      ];

      if (isServiceBusiness) {
        tabs.push({ id: 'shipping', label: 'Disponibilidad y Horarios' });
        tabs.push({ id: 'bookings', label: 'Reservas' });
        tabs.push({ id: 'professionals', label: 'Profesionales' });
      } else {
        // 🔥 Unificado: "Envíos y Delivery" reemplaza los dos tabs separados.
        tabs.push({ id: 'shipping', label: 'Envíos y Delivery' });
      }

      tabs.push({ id: 'reviews', label: 'Reseñas' });
      tabs.push({ id: 'notifications', label: 'Notificaciones' });
      tabs.push({ id: 'messages', label: 'Conversaciones' });
      // 🔥 'delivery' ya no se lista como comando separado (vive en 'shipping').
      tabs.push({ id: 'themes', label: 'Marca' });
      tabs.push({ id: 'branding', label: 'Perfil de Negocio' });
      tabs.push({ id: 'settings', label: 'Configuración y Cuenta' });

      const activeTerminal = terminalManager.terminals[0];
      const isKioskActive =
        terminalManager.terminals.length > 0 &&
        activeTerminal?.isActive !== false;

      return buildCommands({
        availableTabs: tabs,
        tenantSlug: tenant.slug,
        setActiveTab: setActiveTab as (tab: string) => void,
        onToggleKiosk: handleKioskToggleFromHeader,
        onLogout: handleLogout,
        onGoHome: () => { window.location.href = '/'; },
        isKioskActive,
        kioskToken: isKioskActive ? (activeTerminal as any)?.token || null : null,
      });
    }, [
      tenant,
      isServiceBusiness,
      terminalManager.terminals,
      setActiveTab,
      handleKioskToggleFromHeader,
      handleLogout,
    ]);

    // ✅ LOADING STATE
    // ✅ LOADING STATE
    // 🔥 Mismo patrón que la tienda: mientras no haya `tenant` en memoria,
    // mostramos el spinner. Cuando `tenant` llega, mostramos el layout con sus colores.
    // Esto elimina la race condition y produce la misma transición que la tienda.
    //
    // Si hay `cachedTheme` (de una visita anterior), usamos esos colores para el
    // spinner — así evitamos el flash default→tenant en cada recarga.
    // Si no hay cache (primera visita), usamos DEFAULT_THEME y se ve la transición.
    if (!tenant) {
      const themeForSpinner = cachedTheme ?? {
        primary: DEFAULT_THEME.primaryColor,
        secondary: DEFAULT_THEME.secondaryColor,
        background: DEFAULT_THEME.backgroundColor,
      };
      const loadingTextColor = getContrastTextColor(themeForSpinner.background);

      return (
        <div 
          className="h-screen flex items-center justify-center text-sm transition-colors duration-300"
          style={{ backgroundColor: themeForSpinner.background, color: loadingTextColor }}
        >
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ 
                borderLeftColor: themeForSpinner.primary, 
                borderRightColor: themeForSpinner.primary, 
                borderBottomColor: themeForSpinner.primary, 
                borderTopColor: 'transparent' 
              }}
            />
            <span className="opacity-80 tracking-wide font-bold uppercase text-xs">Cargando panel de administración...</span>
          </div>
        </div>
      );
    }


    return (
      <ToastThemeProvider
        primary={primaryColor}
        textColor={dynamicTextColor}
        cardBg={isDarkBg ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)'}
        borderColor={isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}
        isDarkBg={isDarkBg}
      >
  <div 
    className="admin-container h-screen w-full flex flex-col md:flex-row overflow-hidden" 
    data-tenant={slug}
    style={{ 
      backgroundColor: customBg, 
      color: dynamicTextColor,
      '--color-primary': primaryColor,
    } as React.CSSProperties}
  >
        <AdminSidebar
          tenant={tenant}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          businessType={businessType || 'store'}
          isServiceBusiness={isServiceBusiness || false}
          primary={primaryColor}
          secondary={secondaryColor}
          textColor={dynamicTextColor}
          isDarkBg={isDarkBg}
          logoSource={tenant?.logoUrl || tenant?.logo || logoSource || ''}
                    onSearchChange={setSearchTerm}
          onLogout={handleLogout}
          userId={userId}
          getImageUrl={getImageUrlMemo}
          onOpenCommandPalette={commandPalette.open}
                />
        
  <main className="relative flex-1 flex flex-col min-h-0 min-w-0">
          {/* Fondo decorativo - solo en desktop */}
          {!isMobile && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div 
                className="w-[500px] h-[500px] rounded-full blur-[140px] opacity-10"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          )}

          <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
            <div className="flex-1 space-y-6 w-full">
              <AdminHeader
                tenant={tenant}
                activeTab={activeTab}
                primary={primaryColor}
                secondary={secondaryColor}
                isServiceBusiness={isServiceBusiness}
                textColor={dynamicTextColor}
                isDarkBg={isDarkBg}
                setActiveTab={setActiveTab}
                bannerSource={processedBannerSource || tenant?.bannerUrl || tenant?.banner}
                headerBgColor={customBg}
                headerIsLight={!isDarkBg}
                getImageUrl={getImageUrlMemo}
                isKioskActive={
                  terminalManager.terminals.length > 0 &&
                  terminalManager.terminals[0].isActive !== false
                }
                kioskLoading={
                  terminalManager.loadingTerminals || terminalManager.creatingTerminal
                }
                onToggleKiosk={handleKioskToggleFromHeader}
                hasPin={tenantHasPin}
                onOpenCommandPalette={commandPalette.open}
              />

              <VerifyEmailBanner isLight={!isDarkBg} />

              <SearchBar 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                primaryColor={primaryColor} 
                isDarkBg={isDarkBg} 
              />

              <div className="space-y-6">
                <Suspense fallback={<LoadingFallback primaryColor={primaryColor} />}>
                  {renderActiveTab()}
                </Suspense>
              </div>
            </div>

            <Footer 
              formattedTenantName={formattedTenantName}
              currentYear={currentYear}
              tenantSlogan={tenantSlogan}
              textColor={dynamicTextColor}
              isDarkBg={isDarkBg}
            />
          </div>
        </main>

        {/* 🔥 MODAL: PIN GATE para "Configuración y Cuenta" */}
        <PinGateModal
          isOpen={pendingProtectedTab !== null}
          onClose={handlePinCancel}
          onSuccess={handlePinVerified}
          onVerify={verifyTenantPin}
          title="Acceso restringido"
          subtitle="Para entrar a Configuración y Cuenta, ingresá tu PIN de seguridad."
          primary={primaryColor}
          textColor={dynamicTextColor}
          cardBg={customBg}
          cardBorder={isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
        />

        {/* 🔥 MODAL: PIN GATE para activar el modo kiosco */}
        <PinGateModal
          isOpen={pendingKioskUnlock}
          onClose={handleKioskPinCancel}
          onSuccess={handleKioskPinVerified}
          onVerify={verifyTenantPin}
          title="Activar modo Kiosco"
          subtitle="Para activar el autopago, ingresá tu PIN de seguridad."
          primary={primaryColor}
          textColor={dynamicTextColor}
          cardBg={customBg}
          cardBorder={isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
        />

        {/* 🔥 COMMAND PALETTE */}
        <CommandPalette
          isOpen={commandPalette.isOpen}
          onClose={commandPalette.close}
          commands={commandList}
          primary={primaryColor}
          secondary={secondaryColor}
          textColor={dynamicTextColor}
          isDarkBg={isDarkBg}
        />

      </div>
      </ToastThemeProvider>
    );
  });

  AdminTenantPageComponent.displayName = 'AdminTenantPage';

  export default AdminTenantPageComponent;