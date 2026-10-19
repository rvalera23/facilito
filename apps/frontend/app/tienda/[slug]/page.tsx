      'use client';

import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
      import { useSearchParams } from 'next/navigation';
      import { usePublicStore } from './hooks/usePublicStore';
      import { useFavorites } from './hooks/useFavorites';
      import { usePageTitle } from '@/hooks/usePageTitle';
      import StoreHeader from './components/StoreHeader';
      import StoreHero from './components/StoreHero';
      import ProductCatalog from './components/ProductCatalog';
      import ServiceCatalog from './components/ServiceCatalog';
      import CartSidebar from './components/CartSidebar';
      import AppointmentSidebar from './components/AppointmentSidebar';
      import AppointmentCheckout from './components/AppointmentCheckout';
      import ServiceDetailModal from './components/ServiceDetailModal';
      import StoreFooter from './components/StoreFooter';
      import StoreFeaturedProducts from './components/StoreFeaturedProducts';
import RelatedStoresSection from './components/RelatedStoresSection';
import RelatedProductsSection from './components/RelatedProductsSection';   // ✅ NUEVO
import AuthModal from '@/components/AuthModal';
      import ProductDetailModal from './components/ProductDetailModal';
      import FavoritesModal from './components/FavoritesModal';
      import FilterSidebar from './components/FilterSidebar';
      import PromoPopup from './components/PromoPopup';
      import StorePoliciesBar from './components/StorePoliciesBar';
      import Top10Sidebar from './components/Top10Sidebar';
      import { useProductFilters } from './hooks/useProductFilters';
      import { ShoppingBag, ShieldAlert } from 'lucide-react';
      import { DEFAULT_THEME } from '@/lib/branding';
import { getContrastText, getContrastTextMuted } from '@/lib/contrast';

      const API_BASE = process.env.NEXT_PUBLIC_API_URL;

      export default function PublicStorePage() {
        const store = usePublicStore();
        const searchParams = useSearchParams();
        const { getImageUrl } = store;

        const [professionals, setProfessionals] = useState<any[]>([]);
        const [loadingProfessionals, setLoadingProfessionals] = useState(false);

        useEffect(() => {
          const fetchProfessionals = async () => {
            const tenantId = store.tenant?.id || store.tenant?._id;
            if (!tenantId) {
              setProfessionals([]);
              return;
            }
            setLoadingProfessionals(true);
            try {
              const token = localStorage.getItem('token') || '';
              const response = await fetch(`${API_BASE}/professionals/tenant/${tenantId}`, {
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                const data = await response.json();
                setProfessionals(Array.isArray(data) ? data : []);
              } else {
                setProfessionals([]);
              }
            } catch (error) {
              console.error('Error al cargar profesionales:', error);
              setProfessionals([]);
            } finally {
              setLoadingProfessionals(false);
            }
          };

          fetchProfessionals();
        }, [store.tenant?.id, store.tenant?._id]);

        const tenantConfig = useMemo(() =>
          store?.tenant?.specificConfig || store?.tenant?.specific_config || {},
          [store?.tenant]
        );

        // 🔥 Config del popup promocional
        const popupConfig = useMemo(() => {
          const cfg = store?.tenant?.specificConfig || store?.tenant?.specific_config || {};
          return cfg?.popup || null;
        }, [store?.tenant]);

        // 🔥 Config de reglas de la tienda
        const storePolicies = useMemo(() => {
          const cfg = store?.tenant?.specificConfig || store?.tenant?.specific_config || {};
          return cfg?.storePolicies || null;
        }, [store?.tenant]);

        const exchangeRate = useMemo(() =>
          Number(tenantConfig?.exchangeRate || tenantConfig?.tasaDolar || 36.5),
          [tenantConfig]
        );

        const subtotalUsd = useMemo(() => store.subtotal || 0, [store.subtotal]);
        const subtotalVes = useMemo(() => subtotalUsd * exchangeRate, [subtotalUsd, exchangeRate]);

        const pagoMovilConfig = useMemo(() =>
          tenantConfig?.paymentMethods?.pagoMovilList?.[0] || {},
          [tenantConfig]
        );

        const isServiceStore = useMemo(() => store.isServiceStore, [store.isServiceStore]);

        const totalCartCount = useMemo(() => {
          if (isServiceStore) {
            return store.selectedService ? 1 : 0;
          }
          return store.cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
        }, [isServiceStore, store.selectedService, store.cartItems]);

        const [currentUserId, setCurrentUserId] = useState<string | null>(null);

        useEffect(() => {
          if (store.user?.id) { setCurrentUserId(store.user.id); return; }
          if (store.userId) { setCurrentUserId(store.userId); return; }
          try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);
              const id = user.id || user._id || user.userId || user.sub || null;
              if (id) { setCurrentUserId(id); return; }
            }
          } catch (e) {}
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              const decoded = JSON.parse(jsonPayload);
              setCurrentUserId(decoded.sub || decoded.id || decoded.userId || null);
              return;
            }
          } catch (e) {}
          setCurrentUserId(null);
        }, [store.user, store.userId]);

        const [isAuthenticated, setIsAuthenticated] = useState(false);

        useEffect(() => {
          setIsAuthenticated(Boolean(
            store.user ||
            store.userId ||
            localStorage.getItem('token') ||
            localStorage.getItem('user')
          ));
        }, [store.user, store.userId]);

        const [isUserDriver, setIsUserDriver] = useState(false);
        const [isUserProfessional, setIsUserProfessional] = useState(false);

        useEffect(() => {
          let role = '';
          if (store.user?.role) {
            role = store.user.role.toLowerCase();
          } else {
            try {
              const raw = localStorage.getItem('user');
              if (raw) {
                const u = JSON.parse(raw);
                role = (u.role || u.activeRole || '').toLowerCase();
              }
            } catch {}
          }
          setIsUserDriver(role === 'repartidor');
          setIsUserProfessional(role === 'profesional');
        }, [store.user]);

        const isUserOperative = isUserDriver || isUserProfessional;


        const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
        const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
        const [initialIsLogin, setInitialIsLogin] = useState(true);
        const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
        const [activeProduct, setActiveProduct] = useState<any>(null);
                const handlePreviewProduct = useCallback((product: any) => {
          setActiveProduct(product);
          setIsDetailModalOpen(true);
        }, []);
        const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
        const [isCartOpen, setIsCartOpen] = useState(false);
        const [isServiceDetailModalOpen, setIsServiceDetailModalOpen] = useState(false);
        const [isServiceCheckoutOpen, setIsServiceCheckoutOpen] = useState(false);

        const [appointmentDate, setAppointmentDate] = useState('');
        const [appointmentTime, setAppointmentTime] = useState('');

        const { favorites, favoriteProducts, toggleFavorite, removeFavorite, favoritesCount } = useFavorites();

        const [catalogLayout, setCatalogLayout] = useState<'grid' | 'list-with-sidebar'>('list-with-sidebar');



  const { 
    filteredProducts, 
    applyFilters, 
    resetFilters,
    filters 
  } = useProductFilters({
    products: store.products || [],
    exchangeRate: exchangeRate,
    searchQuery: store.searchQuery || '', // ✅ PASAR LA BÚSQUEDA
    initialFilters: {
      selectedCategories: store.selectedCategory ? [store.selectedCategory] : [],
    }
  });

  // 🔥 SINCRONIZAR selectedCategory CON LOS FILTROS
  useEffect(() => {
    if (store.selectedCategory && store.selectedCategory !== 'Todos' && store.selectedCategory !== 'todos') {
      applyFilters({
        ...filters,
        selectedCategories: [store.selectedCategory],
      });
    } else {
      const newFilters = { ...filters };
      delete (newFilters as any).selectedCategories;
      applyFilters(newFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedCategory]);

    // 🔥 OBTENER MARCAS ÚNICAS DE LOS PRODUCTOS
    const uniqueBrands = useMemo(() => {
      const brands = new Set<string>();
      (store.products || []).forEach(p => {
        const brand = p.brand || p.marca || '';
        if (brand) brands.add(brand);
      });
      return Array.from(brands);
    }, [store.products]);

    // 🔥 OBTENER FEATURES ÚNICAS
    const uniqueFeatures = useMemo(() => {
      const features = new Set<string>();
      (store.products || []).forEach(p => {
        const feats = p.features || p.attributes?.features || p.tags || [];
        if (Array.isArray(feats)) {
          feats.forEach(f => {
            if (f && typeof f === 'string') features.add(f);
          });
        }
      });
      return Array.from(features);
    }, [store.products]);

        const getActivePaymentMethods = useCallback(() => {
          const PAYMENT_METHOD_LABELS: Record<string, string> = {
            cash: 'Efectivo',
            pos: 'Punto de Venta',
            pago_movil: 'Pago Movil',
            biopago: 'Biopago',
            zelle: 'Zelle',
            binance: 'Binance Pay',
          };

          const specificConfig = store.tenant?.specificConfig || store.tenant?.specific_config || {};
          const rawActiveMethods = specificConfig?.activePaymentMethods || specificConfig.paymentMethods || store.tenant?.activePaymentMethods || [];

          if (Array.isArray(rawActiveMethods) && rawActiveMethods.length > 0) {
            return rawActiveMethods
              .map((id: string) => PAYMENT_METHOD_LABELS[id] || id)
              .filter(Boolean);
          }

          return ['Efectivo'];
        }, [store.tenant]);

        const getSocialNetworks = useCallback(() => {
          const networks = [];
          const socialConfig = [
            { key: 'instagram', baseUrl: 'https://instagram.com/', user: store.tenant?.instagram },
            { key: 'facebook', baseUrl: 'https://facebook.com/', user: store.tenant?.facebook },
            { key: 'tiktok', baseUrl: 'https://tiktok.com/@', user: store.tenant?.tiktok },
            { key: 'x_twitter', baseUrl: 'https://twitter.com/', user: store.tenant?.x_twitter || store.tenant?.twitter },
            { key: 'threads', baseUrl: 'https://threads.net/@', user: store.tenant?.threads },
            { key: 'linkedin', baseUrl: 'https://linkedin.com/in/', user: store.tenant?.linkedin },
          ];

          socialConfig.forEach(net => {
            if (net.user && net.user.trim() !== '') {
              networks.push({
                key: net.key,
                url: `${net.baseUrl}${net.user}`,
              });
            }
          });

          return networks;
        }, [store.tenant]);

        const handleProcessOrder = useCallback(async (orderData: any) => {
          console.log('📦 [PublicStorePage] handleProcessOrder llamado con:', orderData);

          try {
            const tenantId = store.tenant?.id || store.tenant?._id;
            if (!tenantId) {
              console.error('❌ [PublicStorePage] tenantId no disponible');
              throw new Error('ID de tienda no disponible');
            }

            if (orderData.action === 'create_order' && orderData.items?.some((item: any) => item.type === 'service')) {
              console.log('📦 [PublicStorePage] Procesando orden de SERVICIO');
              console.log('📦 [PublicStorePage] orderData.paymentMethod (servicio):', orderData.paymentMethod);

              const payload = {
                tenantId: tenantId,
                userId: orderData.userId || currentUserId || null,
                customerName: orderData.customerName || store.customerName || 'Cliente',
                customerPhone: orderData.customerPhone || store.customerPhone || '04140000000',
                customerAddress: orderData.customerAddress || store.customerAddress || '',
              items: (orderData.items?.length ? orderData.items : [activeProduct]).map((item: any) => ({
                  serviceId: item.serviceId || item.id || item._id,
  name: item.name || 'Producto',
  quantity: Number(item.quantity || 1),
  type: 'service',
  coverImage: item.coverImage || item.image || item.photo || undefined,
  mediaUrls: Array.isArray(item.mediaUrls) ? item.mediaUrls : undefined,
  durationMinutes: Number(item.durationMinutes || item.duration || 60),
  // 🔥 NO MANDAR PRECIOS: el backend recalcula con PricingService
})),
                totalUsd: orderData.totalUsd || store.subtotal || 0,
totalVes: orderData.totalVes || subtotalVes || 0,
                paymentMethodUsed: orderData.paymentMethod || 'efectivo',
                status: orderData.status || 'COMPLETED',
                orderType: 'service',
                serviceDetails: {
                  date: orderData.appointmentDate || appointmentDate,
                  time: orderData.appointmentTime || appointmentTime,
                  duration: Number(orderData.durationMinutes || activeProduct?.durationMinutes || 60),
                  notes: orderData.customerReference || store.customerReference || '',
                },
                source: 'web',
                ...(orderData.bankSource && { bankSource: orderData.bankSource }),
                ...(orderData.paymentReference && { paymentReference: orderData.paymentReference }),
              };

              console.log('📦 [PublicStorePage] Payload de servicio:', JSON.stringify(payload, null, 2));

              const response = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              const data = await response.json();
              console.log('📦 [PublicStorePage] Respuesta de servicio:', data);

              if (!response.ok) {
                throw new Error(data.message || 'Error al crear la orden de servicio');
              }

              const orderId = data.id || data._id || data.orderId;
              if (!orderId) {
                throw new Error('No se pudo obtener el ID de la orden');
              }

              return { success: true, orderId: orderId };
            }

            if (orderData.action === 'create_order') {
              console.log('📦 [PublicStorePage] orderData.paymentMethod:', orderData.paymentMethod);
              
      // 🔥 Calcular costo del delivery si viene en orderData
      const deliveryFromCheckout = orderData.delivery || null;
      const deliveryCostUsd = deliveryFromCheckout?.selected
        ? Number(deliveryFromCheckout.costUsd ?? deliveryFromCheckout.cost ?? 0)
        : 0;
      const deliveryCostVes = deliveryFromCheckout?.selected
        ? Number(deliveryFromCheckout.costVes ?? (deliveryCostUsd * exchangeRate))
        : 0;

      const baseTotalUsd = Number(orderData.totalUsd || store.subtotal || 0);
      const baseTotalVes = Number(orderData.totalVes || subtotalVes || 0);

      const payload = {
        tenantId: tenantId,
        userId: currentUserId || undefined,
        customerName: orderData.customerName || 'Cliente Kiosko / Autopago',
        customerPhone: orderData.customerPhone || '',
        customerAddress: orderData.customerAddress || 'Terminal Kiosko Autopago',
        items: orderData.items.map((item: any) => ({
          productId: item.productId || item.id || item._id,
          name: item.name || 'Producto',
          quantity: Number(item.quantity || 1),
          // 🔥 NO MANDAR PRECIOS: el backend recalcula con PricingService
        })),
        // 🔥 SUMAR delivery al total (el backend también lo valida y recalcula)
        totalUsd: baseTotalUsd + deliveryCostUsd,
        totalVes: baseTotalVes + deliveryCostVes,
        paymentMethodUsed: orderData.paymentMethod || 'efectivo',
        status: orderData.status || 'COMPLETED',
        orderType: 'product',
        source: 'web',
        // 🔥 MANDAR delivery al backend para que lo guarde y lo sume
        ...(deliveryFromCheckout?.selected && {
          delivery: deliveryFromCheckout,
        }),
        // 🔥 DELIVERY LOCAL (facilito)
        ...(orderData.buyerLat != null && orderData.buyerLng != null
          ? {
              buyerLat: Number(orderData.buyerLat),
              buyerLng: Number(orderData.buyerLng),
              fulfillment: orderData.fulfillment || 'delivery',
            }
          : {}),
        ...(orderData.bankSource && { bankSource: orderData.bankSource }),
        ...(orderData.paymentReference && { paymentReference: orderData.paymentReference }),
        // 🔥 SALDO A FAVOR: preservar el flag que manda el CartSidebar
        ...(orderData.applyCreditBalance ? { applyCreditBalance: true } : {}),
      };
              
              console.log('📦 [PublicStorePage] Payload enviado:', JSON.stringify(payload, null, 2));

              const response = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              const data = await response.json();
              console.log('📦 [PublicStorePage] Respuesta de productos:', data);

              if (!response.ok) {
                throw new Error(data.message || 'Error al procesar la orden de productos');
              }

              let orderId = data.id || data._id || data.orderId;
              if (!orderId) {
                const findId = (obj: any): string | null => {
                  if (!obj || typeof obj !== 'object') return null;
                  if (obj.id) return obj.id;
                  if (obj._id) return obj._id;
                  if (obj.orderId) return obj.orderId;
                  for (const key of Object.keys(obj)) {
                    if (obj[key] && typeof obj[key] === 'object') {
                      const found = findId(obj[key]);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                orderId = findId(data);
              }

              if (!orderId) {
                throw new Error('No se pudo obtener el ID de la orden');
              }

              return { success: true, orderId: orderId };
            }

  if (orderData.action === 'submit_payment') {
    const orderId = orderData.orderId || orderData.id;
    if (!orderId) {
      throw new Error('ID de orden no disponible para reportar el pago');
    }

    // 🔥 CONSTRUIR EL PAYLOAD COMPLETO CON TODOS LOS DATOS
    const paymentPayload: any = {
      paymentMethod: orderData.paymentMethod || 'pagomovil',
      bankSource: orderData.bankSource || '',
      paymentReference: orderData.paymentReference || '',
      status: orderData.status || 'por_verificar',
      // 🔥 CÉDULA Y TELÉFONO DEL CLIENTE
      clientIdNumber: orderData.clientIdNumber || '',
      clientIdType: orderData.clientIdType || 'V',
      clientPhone: orderData.clientPhone || '',
      customerPhone: orderData.clientPhone || '',
      // 🔥 METADATOS COMPLETOS
      paymentMetadata: orderData.paymentMetadata || {},
      // 🔥 Si es efectivo, incluir moneda + monto entregado + vuelto
      ...(orderData.cashCurrency
        ? {
            cashCurrency: orderData.cashCurrency,
            cashAmount: orderData.cashAmount,
            // 🔥 VUELTO: resolución + preferencia del comprador
            ...(orderData.changeResolution
              ? { changeResolution: orderData.changeResolution }
              : {}),
            ...(orderData.changeDeliveryPreference
              ? { changeDeliveryPreference: orderData.changeDeliveryPreference }
              : {}),
          }
        : {}),
    };

    // 🔥 SI VIENE paymentProof, AGREGARLO
    if (orderData.paymentProof) {
      paymentPayload.paymentProof = orderData.paymentProof;
    }

    console.log('📦 [PublicStorePage] Enviando paymentPayload al backend:', JSON.stringify(paymentPayload, null, 2));

    const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentPayload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al reportar el pago');
    }

    return { success: true };
  }

            return { success: false, error: 'Acción no reconocida' };

          } catch (error: any) {
            console.error('❌ [PublicStorePage] Error en handleProcessOrder:', error);
            store.showAlert?.('Error', error.message || 'Error al procesar la orden', 'error');
            throw error;
          }
        }, [store, API_BASE, subtotalVes, activeProduct, appointmentDate, appointmentTime, currentUserId]);

        usePageTitle({
          tenantName: store?.tenant?.name,
          slogan: store?.tenant?.slogan,
          fallback: 'Tienda | facilito'
        });

        const kioskToken = useMemo(() => searchParams.get('kiosk') || searchParams.get('token'), [searchParams]);
        const productoParam = useMemo(() => searchParams.get('producto'), [searchParams]);
        const servicioParam = useMemo(() => searchParams.get('servicio'), [searchParams]);

        useEffect(() => {
          if (kioskToken && store.tenant?.slug) {
            console.log('🔄 [PublicStorePage] Redirigiendo al modo kiosko...');
            const tenantSlug = store.tenant.slug;
            window.location.href = `/tienda/kiosko?token=${encodeURIComponent(kioskToken)}&slug=${tenantSlug}`;
          }
        }, [kioskToken, store.tenant]);

        useEffect(() => {
          if (!store.products || store.products.length === 0) return;
          if (productoParam) {
            const product = store.products.find((p: any) => p.id === productoParam);
            if (product) {
              setActiveProduct(product);
              setIsDetailModalOpen(true);
              window.history.replaceState({}, '', window.location.pathname);
            }
          }
          if (servicioParam) {
            const service = store.products.find((s: any) => s.id === servicioParam);
            if (service) {
              setActiveProduct(service);
              if (isServiceStore) {
                setIsServiceDetailModalOpen(true);
              } else {
                setIsDetailModalOpen(true);
              }
              window.history.replaceState({}, '', window.location.pathname);
            }
          }
        }, [productoParam, servicioParam, store.products, isServiceStore]);
        
        useEffect(() => {
          if (isCartOpen) {
            let userData = store.user;
            if (!userData && typeof window !== 'undefined') {
              try {
                const rawUser = localStorage.getItem('user');
                if (rawUser) userData = JSON.parse(rawUser);
              } catch (e) {}
            }
            if (userData) {
              if (!store.customerName && (userData.name || userData.fullName || userData.nombre)) {
                store.setCustomerName?.(userData.name || userData.fullName || userData.nombre);
              }
              if (!store.customerPhone && (userData.phone || userData.phoneNumber || userData.telefono || userData.celular)) {
                store.setCustomerPhone?.(userData.phone || userData.phoneNumber || userData.telefono || userData.celular);
              }
              if (!store.customerAddress && (userData.address || userData.shippingAddress || userData.direccion || userData.shipping_address)) {
                store.setCustomerAddress?.(userData.address || userData.shippingAddress || userData.direccion || userData.shipping_address);
              }
            }
          }
        }, [isCartOpen, store.user, store.customerName, store.customerPhone, store.customerAddress]);

        const isAnyModalOpen = useMemo(() => {
          return isCartOpen || isFavoritesOpen || isDetailModalOpen || isAuthModalOpen ||
            store.alertModal.isOpen || isCheckoutOpen || isServiceDetailModalOpen ||
            isServiceCheckoutOpen;
        }, [isCartOpen, isFavoritesOpen, isDetailModalOpen, isAuthModalOpen,
          store.alertModal.isOpen, isCheckoutOpen, isServiceDetailModalOpen, isServiceCheckoutOpen]);

        useEffect(() => {
          if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
          } else {
            document.body.style.overflow = 'unset';
          }
          return () => {
            document.body.style.overflow = 'unset';
          };
        }, [isAnyModalOpen]);

useEffect(() => {
  if (store?.secondary) {
    document.documentElement.style.setProperty('--bg-color', store.secondary);
  }
  if (store?.primary) {
    document.documentElement.style.setProperty('--primary-color', store.primary);
    document.documentElement.style.setProperty('--accent-color', store.primary);
    document.documentElement.style.setProperty('--color-primary', store.primary);
  }
  // 🔥 NUEVO: color de texto calculado por contraste del fondo
  if (store?.secondary) {
    const textColor = getContrastText(store.secondary);
    const textMuted = getContrastTextMuted(store.secondary);
    document.documentElement.style.setProperty('--text-color', textColor);
    document.documentElement.style.setProperty('--text-muted', textMuted);
    document.documentElement.style.setProperty('color', textColor);
  }
  return () => {
    document.documentElement.style.removeProperty('--bg-color');
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--text-color');
    document.documentElement.style.removeProperty('--text-muted');
    document.documentElement.style.removeProperty('color');
  };
}, [store?.secondary, store?.primary]);

        useEffect(() => {
          if (!store?.tenant) return;
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          const faviconUrl = store.tenant.faviconUrl || store.tenant.logoUrl || '/favicon.ico';
          link.href = faviconUrl;
          return () => {
            const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (existingLink) {
              existingLink.href = '/favicon.ico';
            }
          };
        }, [store?.tenant, store?.tenant?.faviconUrl, store?.tenant?.logoUrl]);

const slugRef = useRef<string>('');

// ✅ LA FUENTE SE CARGA EN UserFontLoader - NO HACER NADA AQUÍ
// Este useEffect está vacío porque UserFontLoader maneja la fuente
useEffect(() => {
  // Intencionalmente vacío - la fuente se maneja en UserFontLoader
}, []);

        if (!store.tenant) {
          const isLoading = store.loading !== undefined ? store.loading : false;
          const error = store.error || null;
          const isSecondaryLight = store.isSecondaryLight !== undefined ? store.isSecondaryLight : false;
const secondary = store.secondary || DEFAULT_THEME.secondaryColor;
          const textMuted = store.textMutedClass || (isSecondaryLight ? 'text-slate-500' : 'text-slate-400');
const primary = store.primary || DEFAULT_THEME.primaryColor;

          if (isLoading) {
            return (
              <div
                className="min-w-screen min-h-screen flex items-center justify-center font-sans transition-colors duration-300"
                style={{
                  backgroundColor: secondary,
                  color: isSecondaryLight ? '#0f172a' : '#ffffff'
                }}
              >
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div
                      className="w-16 h-16 rounded-full border-4 animate-spin transition-colors duration-500"
                      style={{
                        borderTopColor: 'transparent',
                        borderRightColor: primary,
                        borderBottomColor: primary,
                        borderLeftColor: primary,
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black" style={{ color: isSecondaryLight ? '#0f172a' : '#ffffff' }}>
                      Cargando tienda...
                    </h2>
                    <p className={`text-xs ${textMuted}`}>
                      Estamos preparando todo para ti
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              className="min-w-screen min-h-screen flex items-center justify-center font-sans transition-colors duration-300"
              style={{
                backgroundColor: secondary,
                color: isSecondaryLight ? '#0f172a' : '#ffffff'
              }}
            >
              <div className="text-center space-y-4 max-w-sm mx-auto px-4">
                <div className="flex justify-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: `${primary}15`,
                      color: primary
                    }}
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-black" style={{ color: isSecondaryLight ? '#0f172a' : '#ffffff' }}>
                  {error && error.includes('conexion') ? 'Error de conexion' : 'Comercio no disponible'}
                </h2>
                <p className={`text-sm ${textMuted}`}>
                  {error || 'La tienda que buscas no esta disponible en este momento.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: primary,
                      color: '#ffffff'
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <>
            {/* 🔥 Barra de reglas — arriba del header (configurable) */}
            {storePolicies?.enabled && (
              <StorePoliciesBar
                policies={storePolicies}
                tenantId={store.tenant?.id || store.tenant?._id || ''}
                primary={store.primary}
                secondary={store.secondary}
                isSecondaryLight={store.isSecondaryLight}
              />
            )}

            <StoreHeader
              tenant={store.tenant}
              logoSource={store.logoSource}
              primary={store.primary}
              secondary={store.secondary}
              isSecondaryLight={store.isSecondaryLight}
              searchQuery={store.searchQuery}
              setSearchQuery={store.setSearchQuery}
              cartItemsCount={totalCartCount}
              onOpenMobileCart={() => setIsCartOpen(true)}
              favoritesCount={favoritesCount}
              onOpenFavorites={() => setIsFavoritesOpen(true)}
              isServiceStore={isServiceStore}
              isUserOperative={isUserOperative}
            />

<div
  className={`w-full min-h-screen font-sans ${store.textMainClass} flex flex-col justify-between transition-colors duration-300 relative store-container`}
  style={{
    backgroundColor: store.secondary,
    color: getContrastText(store.secondary),
    '--bg-color': store.secondary,
    '--primary-color': store.primary,
    '--text-color': getContrastText(store.secondary),
    '--text-muted': getContrastTextMuted(store.secondary),
  } as React.CSSProperties}
>
            
              <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-thumb { background: ${store.primary}44; border-radius: 9999px; }
              `}</style>

              <div className="w-full" style={{ minHeight: '320px' }}>
  <StoreHero
    tenant={store.tenant}
    bannerSource={store.bannerSource}
    primary={store.primary}
    secondary={store.secondary}
    isSecondaryLight={store.isSecondaryLight}
    headerBgColor={store.secondary}
    headerIsLight={store.isSecondaryLight}
    totalProducts={store.products?.length || 0}
    isServiceStore={isServiceStore}
  layoutType={store.tenant?.heroLayout || 'default'}
  />
              </div>

              <main className="w-full overflow-x-hidden py-4">
                <div className="w-full px-4 sm:px-8">
                  {isServiceStore ? (
                    <ServiceCatalog
                      categories={store.categories}
                      selectedCategory={store.selectedCategory}
                      setSelectedCategory={store.setSelectedCategory}
                      primary={store.primary}
                      secondary={store.secondary}
                      isPrimaryLight={store.isPrimaryLight}
                      textMutedClass={store.textMutedClass}
                      filteredProducts={store.filteredProducts}
                      textMainClass={store.textMainClass}
                      isSecondaryLight={store.isSecondaryLight}
                      selectedService={store.selectedService}
                      setSelectedService={store.setSelectedService}
                      setSidebarOpen={() => {
                        console.log("Abriendo AppointmentSidebar desde ServiceCatalog");
                        setIsCartOpen(true);
                      }}
                      onOpenDetail={(service: any) => {
                        console.log("[page.tsx] Abriendo detalle de servicio:", service.name);
                        setActiveProduct(service);
                        setIsServiceDetailModalOpen(true);
                      }}
                      onOpenCheckout={(service: any) => {
                        console.log("[page.tsx] Abriendo checkout de servicio:", service.name);
                        setActiveProduct(service);
                        setIsServiceCheckoutOpen(true);
                      }}
                      tenantConfig={tenantConfig}
                      tenantId={store.tenant?.id || store.tenant?._id}
                      getImageUrl={getImageUrl}
                      professionals={professionals}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                      isUserDriver={isUserDriver}
                      isUserProfessional={isUserProfessional}
                    />
                  ) : (
  <ProductCatalog
    categories={store.categories}
    selectedCategory={store.selectedCategory}
    setSelectedCategory={store.setSelectedCategory}
    primary={store.primary}
    secondary={store.secondary}
    isPrimaryLight={store.isPrimaryLight}
    textMutedClass={store.textMutedClass}
    filteredProducts={filteredProducts}
    textMainClass={store.textMainClass}
    isSecondaryLight={store.isSecondaryLight}
    cart={store.cart}
    setCart={store.setCart}
    updateCartQty={store.updateCartQty}
      removeFromCart={store.removeFromCart}
    setPreviewProduct={handlePreviewProduct}
    favorites={favorites}
    onToggleFavorite={toggleFavorite}
    getImageUrl={getImageUrl}
    layout={catalogLayout}
    allProducts={store.products || []}
    isAuthenticated={isAuthenticated}
    userId={currentUserId || ''}
    onApplyFilters={applyFilters}
    onClearFilters={resetFilters}
    filters={filters}
    uniqueBrands={uniqueBrands}
    uniqueFeatures={uniqueFeatures}
    searchQuery={store.searchQuery}
    setSearchQuery={store.setSearchQuery} 
    isUserDriver={isUserDriver}
    isUserProfessional={isUserProfessional}
  />
                  )}

                  {/* 🔥 PRODUCTOS RELACIONADOS (de otras tiendas) */}
                  {!isServiceStore && (
                    <RelatedProductsSection
                      textColorClass={store.textMainClass}
                      mutedTextColorClass={store.textMutedClass}
                      primaryColor={store.primary}
                      secondaryColor={store.secondary}
                      isSecondaryLight={store.isSecondaryLight}
                      currentProductId={activeProduct?.id || activeProduct?._id}
                      currentProductCategory={activeProduct?.category || activeProduct?.categoria}
                      currentStoreId={store.tenant?.id || store.tenant?._id}
                      limit={8}
                      title="Productos relacionados"
                      subtitle="Descubre productos similares en otras tiendas"
                      getImageUrlFn={getImageUrl}
                    />
                  )}

                  <RelatedStoresSection
                    textColorClass={store.textMainClass}
                    mutedTextColorClass={store.textMutedClass}
                    primaryColor={store.primary}
                    secondaryColor={store.secondary}
                    isSecondaryLight={store.isSecondaryLight}
                    backgroundCardBg={store.cardBgClass || (store.isSecondaryLight ? 'bg-white/70' : 'bg-black/40')}
                    currentStoreId={store.tenant?.id || store.tenant?._id}
                    currentStoreNiche={store.tenant?.niche}
                    currentStoreCategory={store.tenant?.category}
                    limit={6}
                    excludeCurrentStore={true}
                    title="Tiendas relacionadas"
                    subtitle={`Descubre otros comercios en la misma categoria que ${store.tenant?.name || 'esta tienda'}`}
                  />

                </div>
              </main>

              {isAuthenticated && !kioskToken && !isUserOperative &&(
                                <>
                  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!store.isStoreOpen()) {
                          store.showAlert?.(
                            'Tienda Cerrada',
                            store.getStoreClosedMessage(),
                            'warning'
                          );
                          return;
                        }
                        setIsCartOpen(true);
                      }}


                      className="relative p-4 rounded-2xl shadow-2xl flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer border border-white/25"
                      style={{
                        backgroundColor: store.primary,
                        color: store.isPrimaryLight ? '#0f172a' : '#ffffff'
                      }}
                      title="Abrir carrito de compras"
                    >
                      <ShoppingBag className="w-6 h-6" />
                      {totalCartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20">
                          {totalCartCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {isServiceStore ? (
                    <AppointmentSidebar
                      isOpen={isCartOpen}
                      onClose={() => setIsCartOpen(false)}
                      cardBgClass={store.cardBgClass}
                      textMainClass={store.textMainClass}
                      textMutedClass={store.textMutedClass}
                      selectedService={store.selectedService}
                      primary={store.primary}
                      isSecondaryLight={store.isSecondaryLight}
                      customerName={store.customerName}
                      setCustomerName={store.setCustomerName}
                      customerPhone={store.customerPhone}
                      setCustomerPhone={store.setCustomerPhone}
                      customerZone={store.customerZone}
                      setCustomerZone={store.setCustomerZone}
                      customerAddress={store.customerAddress}
                      setCustomerAddress={store.setCustomerAddress}
                      customerReference={store.customerReference}
                      setCustomerReference={store.setCustomerReference}
                      isPrimaryLight={store.isPrimaryLight}
                      handleWhatsAppCheckout={store.handleWhatsAppCheckout}
                      appointmentDate={store.appointmentDate}
                      setAppointmentDate={store.setAppointmentDate}
                      appointmentTime={store.appointmentTime}
                      setAppointmentTime={store.setAppointmentTime}
                      professionals={professionals}
                    />
                  ) : (
                    <CartSidebar
                      isOpen={isCartOpen}
                      onClose={() => setIsCartOpen(false)}
                      textMainClass={store.textMainClass}
                      textMutedClass={store.textMutedClass}
                      cartItems={store.cartItems}
                      primary={store.primary}
                      secondary={store.secondary}
                      subtotal={store.subtotal}
                      subtotalVes={subtotalVes}
                      isSecondaryLight={store.isSecondaryLight}
                      customerName={store.customerName}
                      setCustomerName={store.setCustomerName}
                      customerPhone={store.customerPhone}
                      setCustomerPhone={store.setCustomerPhone}
                      customerAddress={store.customerAddress}
                      setCustomerAddress={store.setCustomerAddress}
                      isPrimaryLight={store.isPrimaryLight}
                      updateCartQty={store.updateCartQty}
                      removeFromCart={store.removeFromCart}
                      onProcessOrder={handleProcessOrder}
                      pagoMovilData={pagoMovilConfig}
                      tenantId={store.tenant?.id || store.tenant?._id}
                      tenant={store.tenant}
                      tenantConfig={tenantConfig}
                      onOpenPreview={(product: any) => {
                        setActiveProduct(product);
                        setIsDetailModalOpen(true);
                      }}
                      userId={currentUserId}
                      isStoreOpen={store.isStoreOpen()}
                      storeClosedMessage={store.getStoreClosedMessage()}
                      cartQuote={store.cartQuote}
                      cartQuoteLoading={store.cartQuoteLoading}
                      cartQuoteError={store.cartQuoteError}
                      refreshCartQuote={store.refreshCartQuote}
                    />
                  )}
                </>
              )}

              {isServiceDetailModalOpen && activeProduct && (
                <ServiceDetailModal
                  isOpen={isServiceDetailModalOpen}
                  onClose={() => {
                    setIsServiceDetailModalOpen(false);
                    setActiveProduct(null);
                  }}
                  service={activeProduct}
                  tenant={store.tenant}
                  isSecondaryLight={store.isSecondaryLight}
                  textMainClass={store.textMainClass}
                  textMutedClass={store.textMutedClass}
                  cardBgClass={store.cardBgClass}
                  cardInnerBgClass={store.cardInnerBgClass}
                  primary={store.primary}
                  secondary={store.secondary}
                  isAuthenticated={isAuthenticated}
                  userId={currentUserId}
                  onReserve={(serviceWithDate: any) => {
                    console.log("[page.tsx] Reservando servicio:", serviceWithDate.name);
                    setAppointmentDate(serviceWithDate.appointmentDate);
                    setAppointmentTime(serviceWithDate.appointmentTime);
                    setActiveProduct(serviceWithDate);
                    setIsServiceDetailModalOpen(false);
                    setIsServiceCheckoutOpen(true);
                  }}
                  professionals={professionals}
                  isFavorite={
                    activeProduct?.id
                      ? favorites.includes(activeProduct.id || activeProduct._id)
                      : false
                  }
                  onToggleFavorite={toggleFavorite}
                  isUserDriver={isUserDriver}
                  isUserProfessional={isUserProfessional}
                />
              )}

              {isServiceCheckoutOpen && activeProduct && (
                <AppointmentCheckout
                  isOpen={isServiceCheckoutOpen}
                  onClose={() => {
                    setIsServiceCheckoutOpen(false);
                    setActiveProduct(null);
                    setAppointmentDate('');
                    setAppointmentTime('');
                  }}
                  selectedService={activeProduct}
                  appointmentDate={appointmentDate}
                  setAppointmentDate={setAppointmentDate}
                  appointmentTime={appointmentTime}
                  setAppointmentTime={setAppointmentTime}
                  customerName={store.customerName}
                  setCustomerName={store.setCustomerName}
                  customerPhone={store.customerPhone}
                  setCustomerPhone={store.setCustomerPhone}
                  customerAddress={store.customerAddress}
                  setCustomerAddress={store.setCustomerAddress}
                  customerReference={store.customerReference}
                  setCustomerReference={store.setCustomerReference}
                  primary={store.primary}
                  isPrimaryLight={store.isPrimaryLight}
                  isSecondaryLight={store.isSecondaryLight}
                  secondary={store.secondary}
                  textMainClass={store.textMainClass}
                  textMutedClass={store.textMutedClass}
                  tenantId={store.tenant?.id || store.tenant?._id}
                  userId={currentUserId}
                  tenantConfig={tenantConfig}
                  onProcessOrder={handleProcessOrder}
                  pagoMovilData={pagoMovilConfig}
                  isStoreOpen={store.isStoreOpen()}
                  storeClosedMessage={store.getStoreClosedMessage()}
                  professionals={professionals}
                />
              )}

              <StoreFooter
                isSecondaryLight={store.isSecondaryLight}
                textMutedClass={store.textMutedClass}
                tenant={store.tenant}
                textMainClass={store.textMainClass}
                primary={store.primary}
                secondary={store.secondary}            // ✅ NUEVO
                categories={store.categories}
                logoSource={store.logoSource}
                products={store.products}
              />

              {store.alertModal.isOpen && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                  <div
                    className={`border rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 backdrop-blur-xl ${store.cardBgClass}`}
                    style={{ borderColor: `${store.primary}40` }}
                  >
                    <h4 className="font-bold text-base" style={{ color: store.primary }}>{store.alertModal.title}</h4>
                    <p className={`text-xs ${store.textMutedClass}`}>{store.alertModal.message}</p>
                    <button onClick={store.closeAlert} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: store.primary }}>Entendido</button>
                  </div>
                </div>
              )}

              <ProductDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => { setIsDetailModalOpen(false); setActiveProduct(null); }}
                product={activeProduct}
                tenant={store.tenant}
                isSecondaryLight={store.isSecondaryLight}
                textMainClass={store.textMainClass}
                textMutedClass={store.textMutedClass}
                cardBgClass={store.cardBgClass}
                cardInnerBgClass={store.cardInnerBgClass}
                primary={store.primary}
                secondary={store.secondary}
                onAddToCart={
                  isUserOperative
                    ? undefined
                    : (productId, qty, maxStock) => {
                        store.updateCartQty(productId, (store.cart[productId] || 0) + qty, maxStock);
                      }
                }
                cartQty={activeProduct ? store.cart[activeProduct.id || activeProduct._id] || 0 : 0}
                isAuthenticated={isAuthenticated}
                userId={currentUserId}
                getImageUrl={getImageUrl}
              />

              <AuthModal
                isOpen={isAuthModalOpen}
                initialIsLogin={initialIsLogin}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={() => setIsAuthModalOpen(false)}
              />

                            {/* 🔥 Pop-up Promocional (configurable desde el admin) */}
              {popupConfig?.enabled && popupConfig?.imageUrl && (
                <PromoPopup
                  popupConfig={popupConfig}
                  tenantId={store.tenant?.id || store.tenant?._id || ''}
                />
              )}

              <FavoritesModal
                isOpen={isFavoritesOpen}
                onClose={() => setIsFavoritesOpen(false)}
                favoriteProducts={favoriteProducts}
                onToggleFavorite={toggleFavorite}
                onToggleFavoriteService={toggleFavorite}
onAddToCart={
  isUserOperative
    ? undefined
    : (product: any) => {
        const prodId = product.id || product._id;
        store.updateCartQty(prodId, (store.cart[prodId] || 0) + 1, product.stock);
      }
}
updateCartQty={isUserOperative ? undefined : store.updateCartQty}
                cart={store.cart}
                onOpenPreview={(product: any) => {
                  setActiveProduct(product);
                  setIsDetailModalOpen(true);
                }}
                primary={store.primary}
                isSecondaryLight={store.isSecondaryLight}
                textMainClass={store.textMainClass}
                textMutedClass={store.textMutedClass}
                isSecondaryLightModal={store.isSecondaryLight}
                secondary={store.secondary}
                tenantSlug={store.tenant?.slug}
                getImageUrl={getImageUrl}
              />
            </div>
          </>
        );
      }