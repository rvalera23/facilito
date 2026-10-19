'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePublicStore } from '@/app/tienda/[slug]/hooks/usePublicStore';
import KioskStoreLayout from './components/kiosko/KioskStoreLayout';
import KioskoGrid from './components/kiosko/KioskoGrid';
import KioskoCart from './components/kiosko/KioskoCart';
import KioskoCartSidebar from './components/kiosko/KioskoCartSidebar';
import KioskoPay from './components/kiosko/KioskoPay';
import KioskoWelcomeModal from './components/KioskoWelcomeModal';
import KioskoServiceWelcomeModal from './components/KioskoServiceWelcomeModal';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { ShoppingBag, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { getTenantConfig, applyFontToContainer } from '@/lib/fontLoader';
import KioskoServiceGrid from './components/kiosko/KioskoServiceGrid';
import KioskoServiceCart from './components/kiosko/KioskoServiceCart';
import KioskoServicePay from './components/kiosko/KioskoServicePay';
import KioskoTurnosRecientes from './components/kiosko/KioskoTurnosRecientes';
import KioskoTurnosCartelera from './components/kiosko/KioskoTurnosCartelera';
import KioskoServiceCartSidebar from './components/kiosko/KioskoServiceCartSidebar';
import KioskoServiceSuccessModal from './components/kiosko/KioskoServiceSuccessModal';
import KioskoTurnosPanel from './components/kiosko/KioskoTurnosPanel';
import { KioskSessionProvider, useKioskSession } from './contexts/KioskSessionContext';
import { DEFAULT_THEME } from '@/lib/branding';
import { usePageTitle } from '@/hooks/usePageTitle';


const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function KioskoPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const slug = searchParams.get('slug');

  // 🔥 Sesión del kiosco (login / anónimo)
  const kioskSession = useKioskSession();
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [kioskConfig, setKioskConfig] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }

    fetch(`${API_BASE}/terminals/kiosk/${encodeURIComponent(token.trim())}`)
      .then((response) => {
        if (!response.ok) throw new Error('Token de kiosco inválido o inactivo');
        return response.json();
      })
      .then((config) => {
        setKioskConfig(config);
        setTokenStatus('valid');
      })
      .catch(() => setTokenStatus('invalid'));
  }, [token]);

  // ✅ CARGAR LA FUENTE DEL TENANT EN EL KIOSKO
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (tokenStatus !== 'valid') return;
  
  // Obtener el slug del tenant desde kioskConfig o desde los params
  const tenantSlug = kioskConfig?.tenant?.slug || slug;
  if (!tenantSlug) {
    console.warn('⚠️ [KioskoPage] No se pudo obtener slug para la fuente');
    return;
  }

  // Obtener la fuente guardada para esta tienda
  const config = getTenantConfig(tenantSlug);
  const fontFamily = config?.fontFamily || 'Quicksand';
  const fontWeight = config?.fontWeight || 400;

  console.log(`🔤 [KioskoPage] Aplicando fuente para "${tenantSlug}":`, fontFamily, fontWeight);

  // Aplicar al contenedor del kiosko
  const applyFont = () => {
    const container = document.querySelector('.kiosko-container') as HTMLElement;
    if (container) {
      applyFontToContainer(container, fontFamily, fontWeight);
      console.log(`✅ [KioskoPage] Fuente aplicada al kiosko:`, fontFamily, fontWeight);
    } else {
      // Si el contenedor no existe, esperar
      setTimeout(applyFont, 100);
    }
  };

  applyFont();

  // Escuchar cambios de fuente
  const handleFontChange = (e: CustomEvent) => {
    const { font: newFont, weight: newWeight, slug: eventSlug } = e.detail;
    if (eventSlug === tenantSlug) {
      const container = document.querySelector('.kiosko-container') as HTMLElement;
      if (container) {
        applyFontToContainer(container, newFont, newWeight);
        console.log(`✅ [KioskoPage] Fuente del kiosko actualizada:`, newFont, newWeight);
      }
    }
  };

  window.addEventListener('tenantFontChanged', handleFontChange as EventListener);

  return () => {
    window.removeEventListener('tenantFontChanged', handleFontChange as EventListener);
  };
}, [tokenStatus, kioskConfig, slug]);

  const store = usePublicStore(slug || kioskConfig?.tenant?.slug || undefined);


  // 🔥 FASE K: título + favicon del tenant (igual que la tienda normal)
  const kioskTenant = store.tenant || kioskConfig?.tenant;

  usePageTitle({
    tenantName: kioskTenant?.name || '',
    slogan: kioskTenant?.slogan || '',
    fallback: 'facilitó — Crea tu negocio virtual en minutos',
  });

  // 🔥 FASE K: favicon del tenant (con fallback al logo)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const faviconUrl =
      kioskTenant?.faviconUrl ||
      kioskTenant?.logoUrl ||
      kioskTenant?.logo ||
      null;

    if (!faviconUrl) return;

    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = getImageUrl({ coverImage: faviconUrl });

    return () => {
      const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (existingLink) existingLink.href = '/favicon.ico';
    };
  }, [kioskTenant?.faviconUrl, kioskTenant?.logoUrl, kioskTenant?.logo]);

  const isService = useMemo(() => {
    if (!store.tenant) return false;

    const modelType = store.tenant?.modelType || store.tenant?.model_type || '';
    if (modelType === 'service' || modelType === 'servicio') {
      console.log('✅ [KioskoPage] Detectado service por modelType:', modelType);
      return true;
    }

    const workModality = store.tenant?.workModality || store.tenant?.work_modality || '';
    if (workModality === 'service' || workModality === 'servicio') {
      console.log('✅ [KioskoPage] Detectado service por workModality:', workModality);
      return true;
    }

    const config = store.tenant?.specificConfig || store.tenant?.specific_config || {};
    if (config.isServiceStore === true || config.serviceStore === true) {
      console.log('✅ [KioskoPage] Detectado service por specificConfig');
      return true;
    }

    if (store.tenant?.professionals && Array.isArray(store.tenant.professionals) && store.tenant.professionals.length > 0) {
      console.log('✅ [KioskoPage] Detectado service por professionals');
      return true;
    }

    if (store.filteredProducts && store.filteredProducts.length > 0) {
      const first = store.filteredProducts[0];
      if (first?.duration || first?.durationMinutes || first?.duracion) {
        console.log('✅ [KioskoPage] Detectado service por duration en productos');
        return true;
      }
      if (first?.serviceModality || first?.modality) {
        console.log('✅ [KioskoPage] Detectado service por modality en productos');
        return true;
      }
    }

    console.log('❌ [KioskoPage] No se detectó como tienda de servicios');
    return false;
  }, [store.tenant, store.filteredProducts]);

  const [showWelcome, setShowWelcome] = useState(true);

  // 🔥 El Welcome debe estar abierto siempre que el modo esté pendiente
  // o el cliente haya elegido. Se cierra SOLO cuando toca "Comenzar".
  useEffect(() => {
    if (!kioskSession.hasChosenMode) {
      setShowWelcome(true);
    }
  }, [kioskSession.hasChosenMode]);
  // ============================================================
  // 🔥 MÁQUINA DE ESTADOS DEL KIOSKO DE SERVICIO
  // ============================================================
  // view:
  //   - 'cartelera': pantalla completa con la cola de turnos.
  //                  Es el estado por defecto cuando nadie interactúa.
  //   - 'reserva':   el flujo actual (grid → cart → pay → success).
  //
  // El welcome de servicio se persiste con localStorage (12h).
  // No es un `view`, es un modal que se muestra encima de la cartelera
  // la primera vez de la sesión.
  // ============================================================
  const [view, setView] = useState<'cartelera' | 'reserva'>('cartelera');
  const [showServiceWelcome, setShowServiceWelcome] = useState(false);

  // Clave de localStorage por tenant. Cambia si cambia el kiosko.
  const welcomeStorageKey = useMemo(() => {
    const tid = store.tenant?.id || store.tenant?._id || 'default';
    return `kiosko_service_welcome_${tid}`;
  }, [store.tenant]);

  // Decidir si mostrar el welcome la primera vez.
  // Reglas:
  //   - Solo para tiendas de servicio.
  //   - Solo si no se ha mostrado en las últimas 12h.
  useEffect(() => {
    if (!isService || tokenStatus !== 'valid') return;
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(welcomeStorageKey);
      if (!stored) {
        setShowServiceWelcome(true);
        return;
      }
      const timestamp = Number(stored);
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      const expired = Date.now() - timestamp > TWELVE_HOURS;
      if (expired) {
        setShowServiceWelcome(true);
      }
    } catch {
      // Si localStorage falla (modo privado, etc.), mostrar el welcome.
      setShowServiceWelcome(true);
    }
  }, [isService, tokenStatus, welcomeStorageKey]);

  // Cerrar el welcome y persistir el timestamp.
  const handleCloseServiceWelcome = useCallback(() => {
    setShowServiceWelcome(false);
    try {
      localStorage.setItem(welcomeStorageKey, String(Date.now()));
    } catch {
      // Silencioso. Si falla, el welcome se mostrará la próxima.
    }
  }, [welcomeStorageKey]);

    // ============================================================
  // 🔥 INACTIVIDAD → VOLVER A CARTELERA
  // ============================================================
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!isService || view !== 'reserva') return;
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏱️ [KioskoPage] Inactividad 30s → volviendo a cartelera');
      setView('cartelera');
      // 🔥 Logout automático al abandonar
      kioskSession.logout();
    }, 30_000);
  }, [isService, view, kioskSession]);

  useEffect(() => {
    if (!isService) return;
    if (view !== 'reserva') {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'scroll'];
    const handler = () => resetInactivityTimer();
    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isService, view, resetInactivityTimer]);

  const handleEnterReserva = useCallback(() => {
    console.log('👆 [KioskoPage] Entrando a reserva desde cartelera');
    setView('reserva');
  }, []);

  const handleServiceSuccessClose = useCallback(() => {
    console.log('🔚 [KioskoPage] Cerrando success → cartelera');
    if (typeof store.setCart === 'function') store.setCart({});
    setSelectedService(null);
    setSelectedProfessionalId('');
    setAppointmentDate('');
    setAppointmentTime('');
    setKioskCustomerName('');
    setKioskCustomerPhone('');
    setKioskCustomerAddress('');
    setKioskCustomerReference('');
    setIsServiceCartModalOpen(false);
    setShowKioskoPay(false);
    setShowSuccess(false);
    setSuccessOrderData(null);
    setView('cartelera');
  }, [store]);

  
  

  const [showKioskoPay, setShowKioskoPay] = useState(false);
  const [showTurnosPanel, setShowTurnosPanel] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderData, setSuccessOrderData] = useState<any>(null);

  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  // 🔥 Estado del modal de "editar cita" (fecha, hora, datos del cliente).
  // Lo controla el page para que pueda abrirse desde el sidebar desktop
  // o desde el footer mobile.
  const [isServiceCartModalOpen, setIsServiceCartModalOpen] = useState(false);
  const [kioskCustomerName, setKioskCustomerName] = useState('');
  const [kioskCustomerPhone, setKioskCustomerPhone] = useState('');
  const [kioskCustomerAddress, setKioskCustomerAddress] = useState('');
  const [kioskCustomerReference, setKioskCustomerReference] = useState('');

  // 🔥 Datos del cliente resueltos.
  //   - Si el kiosco está autenticado: usar los datos del login.
  //   - Si es anónimo: usar los que el usuario escribió en el modal.
  // Los 4 componentes (Cart, CartSidebar, Pay, SuccessModal) reciben
  // estas variables en vez de los estados crudos, para que toda la UI
  // muestre el mismo nombre/teléfono que se manda al backend.
  const resolvedKioskCustomerName = useMemo(
    () =>
      kioskSession.mode === 'authenticated' && kioskSession.displayName
        ? kioskSession.displayName
        : kioskCustomerName,
    [kioskSession.mode, kioskSession.displayName, kioskCustomerName],
  );

  const resolvedKioskCustomerPhone = useMemo(
    () =>
      kioskSession.mode === 'authenticated' && kioskSession.displayPhone
        ? kioskSession.displayPhone
        : kioskCustomerPhone,
    [kioskSession.mode, kioskSession.displayPhone, kioskCustomerPhone],
  );

  const getImageUrlMemo = useMemo(() => getImageUrl, []);


  console.log('🎯 [KioskoPage] ===== DIAGNÓSTICO =====');
  console.log('🎯 [KioskoPage] token:', token);
  console.log('🎯 [KioskoPage] slug:', slug);
  console.log('🎯 [KioskoPage] tenant?.modelType:', store.tenant?.modelType);
  console.log('🎯 [KioskoPage] isService (detectado):', isService);
  console.log('🎯 [KioskoPage] selectedService:', selectedService);

  const { rates, loading: ratesLoading } = useExchangeRateContext();
  
  const exchangeRate = useMemo(() => {
    if (rates?.USD && rates.USD > 0) {
      console.log('✅ [KioskoPage] exchangeRate desde contexto global:', rates.USD);
      return rates.USD;
    }
    const fromTenant = Number(
      store.tenant?.specificConfig?.exchangeRate ||
        store.tenant?.specific_config?.exchangeRate ||
        0,
    );
    if (fromTenant > 0) {
      console.log('✅ [KioskoPage] exchangeRate desde tenant:', fromTenant);
      return fromTenant;
    }
    if (ratesLoading) {
      console.log('⏳ [KioskoPage] Esperando rates...');
      return 1;
    }
    console.warn('⚠️ [KioskoPage] No se encontró exchangeRate, usando 1');
    return 1;
  }, [rates?.USD, store.tenant, ratesLoading]);

  const getServicePrices = useCallback((service: any) => {
    if (!service) {
      return {
        VES: 0,
        USD: 0,
        originalVes: 0,
        originalUsd: 0,
        hasDiscount: false,
        discountPercentage: 0,
      };
    }

    const attrs = service?.attributes || {};
    let pricesObj = attrs.prices || service?.prices || {};

    if (typeof pricesObj === 'string') {
      try {
        pricesObj = JSON.parse(pricesObj);
      } catch {
        pricesObj = {};
      }
    }

    let vesVal = Number(
      pricesObj?.VES ??
      pricesObj?.ves ??
      attrs.price_ves ??
      service?.price_ves ??
      service?.price ??
      0
    );

    let usdVal = Number(
      pricesObj?.USD ??
      pricesObj?.usd ??
      attrs.priceUsd ??
      attrs.usdReference ??
      service?.priceUsd ??
      service?.price_usd ??
      0
    );

    // 🔥 DESCUENTO: leer de _pricing (backend ya calcula) con fallback a campos planos
    const pricing = service?._pricing;
    const pricingHasDiscount =
      pricing?.hasDiscount === true ||
      service?.hasDiscount === true ||
      service?.onSale === true;
    const rawDiscountPct = Number(
      pricing?.discountPercentage ??
      service?.discountPercentage ??
      attrs.discountPercentage ??
      0
    );
    const discountPercentage = Math.min(100, Math.max(0, rawDiscountPct));
    const hasDiscount = pricingHasDiscount && discountPercentage > 0;

    // Guardamos el original (antes del descuento) por si lo necesitamos
    const originalVes = vesVal;
    const originalUsd = usdVal;

    // Aplicar descuento al VES
    if (hasDiscount) {
      vesVal = Math.round(vesVal * (1 - discountPercentage / 100) * 100) / 100;
    }

    // Derivar USD si falta (siempre desde el VES ya con descuento)
    if (usdVal === 0 && vesVal > 0 && exchangeRate > 0) {
      usdVal = Math.round((vesVal / exchangeRate) * 100) / 100;
    } else if (hasDiscount && exchangeRate > 0) {
      // Si teníamos USD del backend, recalcular desde el VES con descuento
      usdVal = Math.round((vesVal / exchangeRate) * 100) / 100;
    }

    if (vesVal === 0 && usdVal > 0 && exchangeRate > 0) {
      vesVal = Math.round((usdVal * exchangeRate) * 100) / 100;
    }

    console.log('🔍 [getServicePrices] Precio del servicio:', {
      name: service?.name,
      vesVal,
      usdVal,
      originalVes,
      originalUsd,
      hasDiscount,
      discountPercentage,
      pricesObj,
      exchangeRate,
    });

    return {
      VES: vesVal,
      USD: usdVal,
      originalVes,
      originalUsd,
      hasDiscount,
      discountPercentage,
    };
  }, [exchangeRate]);

  const totalUsd = useMemo(() => {
    return store.cartItems.reduce((acc, item) => {
      const usdPrice = item.priceUsd || 0;
      return acc + (usdPrice * Number(item.quantity || 1));
    }, 0);
  }, [store.cartItems]);

  const totalVes = useMemo(() => {
    return store.cartItems.reduce((acc, item) => {
      const vesPrice = item.priceVes || 0;
      return acc + (vesPrice * Number(item.quantity || 1));
    }, 0);
  }, [store.cartItems]);

  const servicePrices = useMemo(() => {
    if (!selectedService) {
      return {
        VES: 0,
        USD: 0,
        originalVes: 0,
        originalUsd: 0,
        hasDiscount: false,
        discountPercentage: 0,
      };
    }
    const prices = getServicePrices(selectedService);
    console.log('🔍 [KioskoPage] servicePrices calculado:', {
      serviceName: selectedService?.name,
      pricesVES: prices.VES,
      pricesUSD: prices.USD,
      hasDiscount: prices.hasDiscount,
      discountPercentage: prices.discountPercentage,
      rawPrices: selectedService?.prices,
      rawAttributes: selectedService?.attributes?.prices,
    });
    return prices;
  }, [selectedService, getServicePrices]);

  const serviceTotalVes = servicePrices.VES;
  const serviceTotalUsd = servicePrices.USD;

  const handleProcessKioskoOrder = useCallback(async (orderData: any) => {
    console.log('📦 [KioskoPage] handleProcessKioskoOrder llamado con:', orderData);

    try {
      const tenantId = store.tenant?.id || store.tenant?._id;
      if (!tenantId) {
        console.error('❌ [KioskoPage] tenantId no disponible en kiosko');
        throw new Error('ID de tienda no disponible');
      }

      const isServiceOrder = orderData.orderType === 'service' ||
        (orderData.items && orderData.items.some((item: any) => item.type === 'service'));

      if (isServiceOrder) {
        if (!selectedService) {
          throw new Error('No hay servicio seleccionado');
        }

        const service = selectedService;

        if (orderData.action === 'create_order') {
          // 🔥 Resolver nombre del cliente para servicios
          const resolvedServiceCustomerName =
            kioskSession.mode === 'authenticated' && kioskSession.displayName
              ? kioskSession.displayName
              : (orderData.customerName || kioskCustomerName || 'Cliente Kiosko');

          const resolvedServiceCustomerPhone =
            kioskSession.mode === 'authenticated' && kioskSession.displayPhone
              ? kioskSession.displayPhone
              : (orderData.customerPhone || kioskCustomerPhone || '04140000000');

          const payload: any = {
            tenantId: tenantId,
            userId: kioskSession.userId || null,
            customerName: resolvedServiceCustomerName,
            customerPhone: resolvedServiceCustomerPhone,
            customerAddress: orderData.customerAddress || kioskCustomerAddress || '',
            customerReference: orderData.customerReference || kioskCustomerReference || '',
            items: [{
              serviceId: service.id || service._id,
              name: service.name,
              quantity: 1,
              priceUsd: orderData.totalUsd || 0,
              priceVes: orderData.totalVes || 0,
              type: 'service',
              appointmentDate: orderData.appointmentDate || appointmentDate,
              appointmentTime: orderData.appointmentTime || appointmentTime,
              durationMinutes: service.durationMinutes || service.duration || 60,
              professionalId: orderData.professionalId || selectedProfessionalId || undefined,
              professionalName: orderData.professionalName || undefined,
              notes: orderData.customerReference || kioskCustomerReference || '',
            }],
            totalUsd: orderData.totalUsd || 0,
            totalVes: orderData.totalVes || 0,
            paymentMethod: orderData.paymentMethod || 'efectivo',
            status: orderData.status || 'PENDING_LOCAL',
            orderType: 'service',
            source: 'kiosk',
            serviceDetails: {
              date: orderData.appointmentDate || appointmentDate,
              time: orderData.appointmentTime || appointmentTime,
              duration: service.durationMinutes || service.duration || 60,
              professionalId: orderData.professionalId || selectedProfessionalId || undefined,
              professionalName: orderData.professionalName || undefined,
              notes: orderData.customerReference || kioskCustomerReference || '',
            },
          };

          // 🔥 VUELTO: propagar cashCurrency/cashAmount/changeResolution/changeDeliveryPreference
          if (orderData.cashCurrency) payload.cashCurrency = orderData.cashCurrency;
          if (orderData.cashAmount > 0) payload.cashAmount = orderData.cashAmount;
          if (orderData.changeResolution) payload.changeResolution = orderData.changeResolution;
          if (orderData.changeDeliveryPreference) {
            payload.changeDeliveryPreference = orderData.changeDeliveryPreference;
          }

          const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(kioskSession.kioskToken
                ? { Authorization: `Bearer ${kioskSession.kioskToken}` }
                : {}),
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Error al crear la orden de servicio');
          }

          const orderId = data.id || data._id || data.orderId;
          if (!orderId) {
            throw new Error('No se pudo obtener el ID de la orden');
          }

          const bookingResponse = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(kioskSession.kioskToken
                ? { Authorization: `Bearer ${kioskSession.kioskToken}` }
                : {}),
            },
            body: JSON.stringify({
              tenantId,
              serviceId: service.id || service._id,
              professionalId: orderData.professionalId || selectedProfessionalId || undefined,
              userId: kioskSession.userId || orderData.userId || null,
              customerName: resolvedServiceCustomerName,
              customerPhone: resolvedServiceCustomerPhone,
              bookingDate: orderData.appointmentDate || appointmentDate,
              startTime: orderData.appointmentTime || appointmentTime,
              durationMinutes: service.durationMinutes || service.duration || 60,
              status: 'pending',
              orderId,
              notes: orderData.customerReference || kioskCustomerReference || '',
              metadata: {
                source: 'kiosk',
                orderId,
                priceUsd: orderData.totalUsd || 0,
                priceVes: orderData.totalVes || 0,
                professionalName: orderData.professionalName || undefined,
              },
            }),
          });

          if (!bookingResponse.ok) {
            const bookingError = await bookingResponse.text();
            throw new Error(bookingError || 'No se pudo crear la reserva');
          }

          return { success: true, orderId: orderId };
        }

if (orderData.action === 'submit_payment') {
  const orderId = orderData.orderId || orderData.id;
  if (!orderId) {
    throw new Error('ID de orden no disponible para reportar el pago');
  }

  // 🔥 LOG DE DEPURACIÓN
  console.log('📦 [KioskoPage] Enviando submit_payment con datos:', {
    orderId,
    paymentMethod: orderData.paymentMethod || 'pagomovil',
    bankSource: orderData.bankSource || '',
    paymentReference: orderData.paymentReference || '',
    status: orderData.status || 'por_verificar',
    clientIdType: orderData.clientIdType || '',
    clientIdNumber: orderData.clientIdNumber || '',
    clientPhone: orderData.clientPhone || '',
  });

  const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(kioskSession.kioskToken
        ? { Authorization: `Bearer ${kioskSession.kioskToken}` }
        : {}),
    },
    body: JSON.stringify({
      paymentMethod: orderData.paymentMethod || 'pagomovil',
      bankSource: orderData.bankSource || '',
      paymentReference: orderData.paymentReference || '',
      status: orderData.status || 'por_verificar',
      clientIdType: orderData.clientIdType || '',
      clientIdNumber: orderData.clientIdNumber || '',
      clientPhone: orderData.clientPhone || '',
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al reportar el pago');
  }

  console.log('✅ [KioskoPage] Pago reportado correctamente:', data);
  return { success: true };
}

        return { success: false, error: 'Acción no reconocida para servicios' };
      }

      if (!store.cartItems || store.cartItems.length === 0) {
        throw new Error('El carrito esta vacio');
      }

      if (orderData.action === 'create_order') {
        console.log('📦 [KioskoPage] orderData.paymentMethod:', orderData.paymentMethod);
        
        // 🔥 Resolver el nombre: si hay kioskSession autenticado, usar ese;
        // si viene customerName en el payload, usar ese;
        // si no, usar el default.
        const resolvedCustomerName =
          kioskSession.mode === 'authenticated' && kioskSession.displayName
            ? kioskSession.displayName
            : (orderData.customerName || 'Cliente Kiosko / Autopago');

        const resolvedCustomerPhone =
          kioskSession.mode === 'authenticated' && kioskSession.displayPhone
            ? kioskSession.displayPhone
            : (orderData.customerPhone || '');

        const payload: any = {
          tenantId: tenantId,
          userId: kioskSession.userId || undefined,
          customerName: resolvedCustomerName,
          customerPhone: resolvedCustomerPhone,
          customerAddress: orderData.customerAddress || 'Terminal Kiosko Autopago',
          items: store.cartItems.map((item: any) => ({
            productId: item.id || item._id,
            name: item.name || 'Producto',
            quantity: Number(item.quantity || 1),
            // 🔥 NO MANDAR priceUsd/priceVes: el backend recalcula con PricingService
          })),
          totalUsd: orderData.totalUsd || store.subtotal || 0,
          totalVes: orderData.totalVes || totalVes || 0,
          paymentMethodUsed: orderData.paymentMethod || 'efectivo',
          status: orderData.status || 'COMPLETED',
          orderType: 'kiosko',
          source: 'kiosk',
          ...(orderData.bankSource && { bankSource: orderData.bankSource }),
          ...(orderData.paymentReference && { paymentReference: orderData.paymentReference }),
        };

        // 🔥 VUELTO: propagar al backend para que persista paymentMetadata.change
        if (orderData.cashCurrency) payload.cashCurrency = orderData.cashCurrency;
        if (orderData.cashAmount > 0) payload.cashAmount = orderData.cashAmount;
        if (orderData.changeResolution) payload.changeResolution = orderData.changeResolution;
        if (orderData.changeDeliveryPreference) {
          payload.changeDeliveryPreference = orderData.changeDeliveryPreference;
        }
        
        console.log('📦 [KioskoPage] Payload enviado:', JSON.stringify(payload, null, 2));

        const response = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(kioskSession.kioskToken
              ? { Authorization: `Bearer ${kioskSession.kioskToken}` }
              : {}),
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

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

        if (typeof store.setCart === 'function') {
          store.setCart({});
        }

        return { success: true, orderId: orderId };
      }

if (orderData.action === 'submit_payment') {
  const orderId = orderData.orderId || orderData.id;
  if (!orderId) {
    throw new Error('ID de orden no disponible para reportar el pago');
  }

  // 🔥 LOG DE DEPURACIÓN
  console.log('📦 [KioskoPage] Enviando submit_payment (productos) con datos:', {
    orderId,
    paymentMethod: orderData.paymentMethod || 'pagomovil',
    bankSource: orderData.bankSource || '',
    paymentReference: orderData.paymentReference || '',
    status: orderData.status || 'por_verificar',
    clientIdType: orderData.clientIdType || '',
    clientIdNumber: orderData.clientIdNumber || '',
    clientPhone: orderData.clientPhone || '',
  });

  const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(kioskSession.kioskToken
        ? { Authorization: `Bearer ${kioskSession.kioskToken}` }
        : {}),
    },
    body: JSON.stringify({
      paymentMethod: orderData.paymentMethod || 'pagomovil',
      bankSource: orderData.bankSource || '',
      paymentReference: orderData.paymentReference || '',
      status: orderData.status || 'por_verificar',
      clientIdType: orderData.clientIdType || '',
      clientIdNumber: orderData.clientIdNumber || '',
      clientPhone: orderData.clientPhone || '',
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al reportar el pago');
  }

  console.log('✅ [KioskoPage] Pago reportado correctamente (productos):', data);

  if (typeof store.setCart === 'function') {
    store.setCart({});
  }
  return { success: true };
}

      return { success: false, error: 'Acción no reconocida' };

    } catch (error: any) {
      console.error('❌ [KioskoPage] Error en handleProcessKioskoOrder:', error);
      store.showAlert('Error en Kiosco', error.message || 'Error al procesar la orden', 'error');
            throw error;
    }
  }, [store, API_BASE, totalVes, selectedService, appointmentDate, appointmentTime,
    kioskCustomerName, kioskCustomerPhone, kioskCustomerAddress, kioskCustomerReference, selectedProfessionalId]);

  const resetKiosko = useCallback(() => {
    console.log('🔄 [KioskoPage] Reseteando kiosko...');
    if (typeof store.setCart === 'function') {
      store.setCart({});
    }
    setSelectedService(null);
    setSelectedProfessionalId('');
    setAppointmentDate('');
    setAppointmentTime('');
    setKioskCustomerName('');
    setKioskCustomerPhone('');
    setKioskCustomerAddress('');
    setKioskCustomerReference('');
    setIsServiceCartModalOpen(false);
    setShowKioskoPay(false);
    setShowWelcome(true);
    // setShowServiceWelcome NO se toca: se controla por localStorage (12h).
    setShowSuccess(false);
    setSuccessOrderData(null);
  }, [store]);

  const handleOrderComplete = useCallback((orderData: any) => {
    console.log('🎉 [KioskoPage] Orden completada:', orderData);
    setSuccessOrderData(orderData);
    setShowSuccess(true);
  }, []);

  const handleSuccessClose = useCallback(() => {
    console.log('🔚 [KioskoPage] Cerrando modal de éxito, reseteando...');
    setTimeout(() => {
      resetKiosko();
      // 🔥 Logout automático: el kiosco es compartido
      kioskSession.logout();
    }, 300);
  }, [resetKiosko, kioskSession]);

  const handleClearCart = useCallback(() => {
    if (typeof store.setCart === 'function') {
      store.setCart({});
    }
  }, [store]);

  const handleClearService = useCallback(() => {
    setSelectedService(null);
    setAppointmentDate('');
    setAppointmentTime('');
  }, []);

  const processedBanner = useMemo(() => {
    const banner = store.bannerSource || store.tenant?.banner_url || store.tenant?.banner || kioskConfig?.tenant?.bannerUrl || null;
    return banner ? getImageUrl({ coverImage: banner }) : null;
  }, [store.bannerSource, store.tenant, kioskConfig]);

  const processedLogo = useMemo(() => {
    const logo = store.logoSource || store.tenant?.logo_url || store.tenant?.logo || null;
    return logo ? getImageUrl({ coverImage: logo }) : null;
  }, [store.logoSource, store.tenant]);

  const processedFilteredProducts = useMemo(() => {
    if (!store.filteredProducts || store.filteredProducts.length === 0) return store.filteredProducts;

    // 🔥 FASE K3.2: kiosk solo muestra productos disponibles en kiosco
    const onlyKioskProducts = store.filteredProducts.filter(
      (p: any) => p.availableKiosk === true
    );

    return onlyKioskProducts.map((product: any) => {
      const processedImage = getImageUrl(product);
      return {
        ...product,
        _processedImage: processedImage,
        coverImage: processedImage || product.coverImage,
        image: processedImage || product.image,
      };
    });
  }, [store.filteredProducts]);

  
  // 🔥 FASE K3.2: kiosk solo muestra servicios disponibles en kiosco
  const filteredKioskServices = useMemo(() => {
    if (!store.filteredProducts) return [];
    return store.filteredProducts.filter((s: any) => s.availableKiosk === true);
  }, [store.filteredProducts]);

const pagoMovilData = useMemo(() => {
  const tenant = store.tenant;
  if (!tenant) return { bank: '0134 - Banesco', phone: '04242450194', idNumber: '18714469', idType: 'V' };

  // 🔥 BUSCAR EN EL LUGAR CORRECTO: specificConfig.paymentMethods.pagoMovilList
  const specificConfig = tenant?.specificConfig || tenant?.specific_config || {};
  const paymentMethods = specificConfig?.paymentMethods || {};
  let pagoMovilList = paymentMethods?.pagoMovilList || [];
  
  // 🔥 FALLBACK: Buscar en tenant.paymentMethods si existe
  if (pagoMovilList.length === 0) {
    pagoMovilList = tenant?.paymentMethods?.pagoMovilList || [];
  }
  
  console.log('🔍 [KioskoPage] pagoMovilList encontrada:', pagoMovilList);
  
  if (pagoMovilList.length > 0) {
    const first = pagoMovilList[0];
    console.log('🔍 [KioskoPage] Primera cuenta PagoMóvil:', first);
    
    const bank = first.bank || first.banco || '0102';
    const operator = first.operator || first.operador || '0414';
    const phone = first.phone || first.telefono || first.telephone || '';
    const idType = first.idType || first.tipo_documento || 'V';
    const idNumber = first.idNumber || first.cedula || first.rif || '';
    
    const fullPhone = phone ? `${operator}${phone}` : '';
    const formattedId = idNumber.match(/^[A-Za-z]/) ? idNumber : `${idType}${idNumber}`;
    
    console.log('🔍 [KioskoPage] Datos PagoMóvil procesados:', { bank, fullPhone, formattedId });
    
    return {
      bank: bank,
      phone: fullPhone,
      idNumber: formattedId,
      idType: idType,
      operator: operator,
      nationalId: formattedId,
      cedula: formattedId,
      rif: formattedId,
    };
  }

  console.warn('⚠️ [KioskoPage] No hay cuentas de PagoMóvil configuradas, usando datos de la tienda como fallback');
  
  const idNumber = tenant.nationalId || tenant.cedula || tenant.rif || '18714469';
  const idType = tenant.idType || 'V';
  const formattedId = idNumber.match(/^[A-Za-z]/) ? idNumber : `${idType}${idNumber}`;
  
  return {
    bank: tenant.bank || tenant.banco || '0134 - Banesco',
    phone: tenant.phone || tenant.telefono || '04242450194',
    idNumber: formattedId,
    idType: idType,
    operator: tenant.operator || '0424',
    nationalId: formattedId,
    cedula: formattedId,
    rif: formattedId,
  };
}, [store.tenant]);

  if (!store.tenant) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: store.secondary || '#090d16' }}>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
<div 
  className="w-16 h-16 rounded-full border-4 animate-spin" 
  style={{ 
    borderTopColor: 'transparent',
    borderRightColor: store.primary || DEFAULT_THEME.primaryColor,
    borderBottomColor: store.primary || DEFAULT_THEME.primaryColor,
    borderLeftColor: store.primary || DEFAULT_THEME.primaryColor,
  }} 
/>
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: store.isSecondaryLight ? '#0f172a' : '#ffffff' }}>
              Cargando tienda...
            </h2>
            <p className="text-xs" style={{ color: store.isSecondaryLight ? '#64748b' : '#94a3b8' }}>
              Estamos preparando el kiosko para ti
            </p>
          </div>
        </div>
      </div>
    );
  }


  if (tokenStatus !== 'valid') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="text-center space-y-2 px-6">
          <h2 className="text-xl font-black">
            {tokenStatus === 'loading' ? 'Validando kiosco...' : 'Kiosco no disponible'}
          </h2>
          {tokenStatus === 'invalid' && (
            <p className="text-sm text-slate-400">El token es inválido o el kiosco está desactivado.</p>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // 🔥 RENDER: MODO CARTELERA
  // ============================================================
  if (isService && view === 'cartelera') {
    return (
      <div className="kiosko-container">
<KioskoTurnosCartelera
  isOpen={true}
  onTapToReserve={handleEnterReserva}
  tenant={store.tenant}
  logoSource={processedLogo || store.tenant?.logo_url || store.tenant?.logo || null}
  bannerSource={processedBanner || store.tenant?.banner_url || store.tenant?.banner || null}
  primary={store.primary}
  secondary={store.secondary}
  isSecondaryLight={store.isSecondaryLight}
  textColor={store.isSecondaryLight ? '#0f172a' : '#ffffff'}
  mutedTextColor={store.isSecondaryLight ? '#64748b' : '#94a3b8'}
  token={token || kioskConfig?.terminalToken || null}
  kioskSettings={kioskConfig?.kioskSettings || null}
/>

        {store.tenant && (
          <KioskoServiceWelcomeModal
            isOpen={showServiceWelcome || !kioskSession.hasChosenMode}
            onClose={handleCloseServiceWelcome}
            tenant={store.tenant}
            logoSource={processedLogo || store.tenant?.logo_url || store.tenant?.logo || null}
            bannerSource={processedBanner || store.tenant?.banner_url || store.tenant?.banner || null}
            primary={store.primary}
            secondary={store.secondary}
            isSecondaryLight={store.isSecondaryLight}
            textColor={store.isSecondaryLight ? '#0f172a' : '#ffffff'}
            mutedTextColor={store.isSecondaryLight ? '#64748b' : '#94a3b8'}
          />
        )}
      </div>
    );
  }


return (
  <div className="kiosko-container">
    <KioskStoreLayout
      tenant={store.tenant}
      logoSource={processedLogo || store.tenant?.logo_url}
      primary={store.primary}
      secondary={store.secondary}
      isSecondaryLight={store.isSecondaryLight}
      searchQuery={store.searchQuery}
      setSearchQuery={store.setSearchQuery}
      cartItemsCount={isService ? (selectedService ? 1 : 0) : store.cartItems.length}
      totalUsd={isService ? serviceTotalUsd : totalUsd}
      totalVes={isService ? serviceTotalVes : totalVes}
      updateCartQty={store.updateCartQty}
      clearCart={handleClearCart}
      cart={store.cart}
      cartItems={store.cartItems}
      exchangeRate={exchangeRate}
      getImageUrl={getImageUrlMemo}
      token={token || kioskConfig?.terminalToken || null}
      tenantId={store.tenant?.id || store.tenant?._id || kioskConfig?.tenant?.id || null}
      kioskSettings={kioskConfig?.kioskSettings || null}
    >
      <style jsx>{`
        .kiosko-scroll ::-webkit-scrollbar { width: 6px; height: 6px; }
        .kiosko-scroll ::-webkit-scrollbar-thumb { background: ${store.primary}44; border-radius: 9999px; }
      `}</style>

      <div className="w-full max-w-none px-4 sm:px-8 py-6 pb-36">
        {isService ? (
<div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4" style={{ alignItems: 'stretch' }}>
<div className="lg:col-span-3 min-w-0 flex flex-col">
                <KioskoServiceGrid
                categories={store.categories}
                selectedCategory={store.selectedCategory}
                setSelectedCategory={store.setSelectedCategory}
                primary={store.primary}
                isPrimaryLight={store.isSecondaryLight}
                textMutedClass={store.textMutedClass}
filteredServices={filteredKioskServices}
                textMainClass={store.textMainClass}
                isSecondaryLight={store.isSecondaryLight}
                onSelectService={(service) => {
                  setSelectedService(service);
                  setSelectedProfessionalId('');
                  // 🔥 Al seleccionar, abrimos el modal directo (para elegir fecha/hora)
                  setIsServiceCartModalOpen(true);
                }}
                selectedServiceId={selectedService?.id || selectedService?._id}
              />
            </div>

            {/* 🔥 COLUMNA DERECHA — SOLO "TU CITA"
                "Turnos Recientes" se movió a un panel flotante que se abre
                desde el botón "Turnos" en la parte inferior derecha.
                Así "Tu Cita" no compite por espacio con la lista de turnos. */}
            <div className="hidden lg:block lg:col-span-2 min-w-0">
              <div
                style={{
                  position: 'sticky',
                  top: '16px',
                  zIndex: 10,
                }}
              >
                <KioskoServiceCartSidebar
                  selectedService={selectedService}
                  onClearService={handleClearService}
                  appointmentDate={appointmentDate}
                  appointmentTime={appointmentTime}
                  professionals={store.tenant?.professionals || []}
                  selectedProfessionalId={selectedProfessionalId}
                  customerName={resolvedKioskCustomerName}
                  customerPhone={resolvedKioskCustomerPhone}
                  customerAddress={kioskCustomerAddress}
                  customerReference={kioskCustomerReference}
                  totalVes={serviceTotalVes}
                  totalUsd={serviceTotalUsd}
                  onOpenModal={() => setIsServiceCartModalOpen(true)}
                  onProceedToPay={() => setShowKioskoPay(true)}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col w-full relative">
              <div className="w-full px-0 sm:px-0 mb-3 overflow-x-auto scrollbar-hide">
                <div className="flex flex-nowrap items-center gap-2 w-max">
                  {store.categories.map((cat: any) => {
                    const catName = typeof cat === 'string' ? cat : cat.name || cat.id || cat;
                    const isSelected = store.selectedCategory === catName || store.selectedCategory === cat.id;
                    return (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => store.setSelectedCategory(catName)}
                        style={isSelected ? { backgroundColor: store.primary } : {}}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                          isSelected
                            ? 'text-white border-transparent shadow-md'
                            : store.isSecondaryLight 
                              ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm' 
                              : 'bg-black/40 border-white/15 text-slate-200 hover:bg-black/70 backdrop-blur-md'
                        }`}
                      >
                        {isSelected && <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span>{catName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                                <div className="lg:col-span-2 min-w-0 w-full px-0">
                  <KioskoGrid
                    categories={[]}
                    selectedCategory={store.selectedCategory}
                    setSelectedCategory={store.setSelectedCategory}
                    primary={store.primary}
                    secondary={store.secondary}
                    isPrimaryLight={store.isSecondaryLight}
                    textMutedClass={store.textMutedClass}
                    filteredProducts={processedFilteredProducts}
                    textMainClass={store.textMainClass}
                    isSecondaryLight={store.isSecondaryLight}
                    cart={store.cart}
                    updateCartQty={store.updateCartQty}
                    removeFromCart={store.removeFromCart}
                    exchangeRate={exchangeRate}
                    setPreviewProduct={() => {}}
                    isCartSidebar={true}
                  />
                </div>

                <div className="hidden lg:block lg:col-span-1 min-w-0">
                  <div style={{
                    position: 'sticky',
                    top: '90px',
                    borderRadius: '24px',
                  }}>
                    <KioskoCartSidebar
                      cartItems={store.cartItems}
                      updateCartQty={store.updateCartQty}
                      removeFromCart={store.removeFromCart}
                      onProceedToPay={() => setShowKioskoPay(true)}
                      subtotal={totalUsd}
                      subtotalVes={totalVes}
                      primary={store.primary}
                      secondary={store.secondary}
                      isSecondaryLight={store.isSecondaryLight}
                      formatPrice={(num: number) => {
                        if (isNaN(num) || num === 0) return '0,00';
                        return num.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 🔥 MOBILE ONLY: Carrito de productos con footer flotante */}
      <div className="lg:hidden">
        {!isService && (
          <KioskoCart
            cartItems={store.cartItems}
            updateCartQty={store.updateCartQty}
            removeFromCart={store.removeFromCart}
            onProceedToPay={() => setShowKioskoPay(true)}
            subtotal={totalUsd}
            subtotalVes={totalVes}
            primary={store.primary}
            secondary={store.secondary}
            isSecondaryLight={store.isSecondaryLight}
          />
        )}
      </div>

      {/* 🔥 SERVICIO: KioskoServiceCart montado SIEMPRE.
          - El footer interno ya tiene lg:hidden, así que solo se ve en mobile.
          - El modal se ve en desktop y mobile porque es `position: fixed`. */}
      {isService && (
        <KioskoServiceCart
          selectedService={selectedService}
          professionals={store.tenant?.professionals || []}
          selectedProfessionalId={selectedProfessionalId}
          setSelectedProfessionalId={setSelectedProfessionalId}
          onClearService={handleClearService}
          onProceedToPay={() => setShowKioskoPay(true)}
          appointmentDate={appointmentDate}
          setAppointmentDate={setAppointmentDate}
          appointmentTime={appointmentTime}
          setAppointmentTime={setAppointmentTime}
          customerName={resolvedKioskCustomerName}
          setCustomerName={setKioskCustomerName}
          customerPhone={resolvedKioskCustomerPhone}
          setCustomerPhone={setKioskCustomerPhone}
          customerAddress={kioskCustomerAddress}
          setCustomerAddress={setKioskCustomerAddress}
          customerReference={kioskCustomerReference}
          setCustomerReference={setKioskCustomerReference}
          totalVes={serviceTotalVes}
          totalUsd={serviceTotalUsd}
          isOpen={isServiceCartModalOpen}
          setIsOpen={setIsServiceCartModalOpen}
        />
      )}
      {isService ? (
        <KioskoServicePay
          isOpen={showKioskoPay}
          onClose={() => setShowKioskoPay(false)}
          selectedService={selectedService}
          appointmentDate={appointmentDate}
          appointmentTime={appointmentTime}
          customerName={resolvedKioskCustomerName}
          customerPhone={resolvedKioskCustomerPhone}
          customerAddress={kioskCustomerAddress}
          customerReference={kioskCustomerReference}
          professionalId={selectedProfessionalId}
          professionalName={(store.tenant?.professionals || []).find((professional: any) => (professional.id || professional._id) === selectedProfessionalId)?.name || ''}
          totalVes={serviceTotalVes}
          totalUsd={serviceTotalUsd}
          originalVes={servicePrices.originalVes}
          originalUsd={servicePrices.originalUsd}
          hasDiscount={servicePrices.hasDiscount}
          discountPercentage={servicePrices.discountPercentage}
          pagoMovilData={pagoMovilData}
          onProcessOrder={handleProcessKioskoOrder}
          onSuccessClose={(orderData) => {
            console.log('✅ [KioskoPage] ServicePay completado con datos:', orderData);
            setShowKioskoPay(false);
            setSuccessOrderData(orderData);
            setShowSuccess(true);
          }}
          kioskDisplayName={kioskSession.displayName}
          kioskDisplayPhone={kioskSession.displayPhone}
          kioskUserId={kioskSession.userId}
          isKioskAuthenticated={kioskSession.mode === 'authenticated'}
        />
      ) : (
        <KioskoPay
          isOpen={showKioskoPay}
          onClose={() => setShowKioskoPay(false)}
          subtotal={totalUsd}
          subtotalVes={totalVes}
          pagoMovilData={pagoMovilData}
          onProcessOrder={handleProcessKioskoOrder}
          cartItems={store.cartItems}
          onClearCart={handleClearCart}
          onOrderComplete={handleOrderComplete}
          onSuccessClose={handleSuccessClose}
          tenant={store.tenant}
          kioskUser={kioskSession.user}
          kioskDisplayName={kioskSession.displayName}
          kioskDisplayPhone={kioskSession.displayPhone}
          kioskUserId={kioskSession.userId}
        />
      )}

      {/* 🔥 BOTÓN FLOTANTE DE TURNOS (solo en kiosco de servicios) */}
      {isService && (
        <>
                   <button
            type="button"
            onClick={() => setShowTurnosPanel(true)}
            className="fixed right-6 z-[70] flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-white bottom-28 lg:bottom-6"
            style={{
              backgroundColor: store.primary,
              boxShadow: `0 10px 30px -8px ${store.primary}70`,
            }}
            aria-label="Abrir panel de turnos recientes"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Turnos</span>
          </button>

          <KioskoTurnosPanel
            isOpen={showTurnosPanel}
            onClose={() => setShowTurnosPanel(false)}
            tenantId={store.tenant?.id || store.tenant?._id || ''}
            primary={store.primary}
            secondary={store.secondary}
            isSecondaryLight={store.isSecondaryLight}
          />
        </>
      )}

      {showSuccess && successOrderData && isService && (
        <KioskoServiceSuccessModal
          isOpen={showSuccess}
          onClose={handleServiceSuccessClose}
          selectedService={selectedService}
          appointmentDate={appointmentDate}
          appointmentTime={appointmentTime}
          customerName={resolvedKioskCustomerName}
          customerPhone={resolvedKioskCustomerPhone}
          customerAddress={kioskCustomerAddress}
          customerReference={kioskCustomerReference}
          totalVes={serviceTotalVes}
          totalUsd={serviceTotalUsd}
          orderId={successOrderData?.orderId}
                    changePreference={successOrderData?.changeDeliveryPreference ?? null}
          tenant={store.tenant}
          primary={store.primary} 
          secondary={store.secondary}
          isSecondaryLight={store.isSecondaryLight}
          textMainClass={store.textMainClass}
          textMutedClass={store.textMutedClass}
          kioskDisplayName={kioskSession.displayName}
          kioskDisplayPhone={kioskSession.displayPhone}
          isKioskAuthenticated={kioskSession.mode === 'authenticated'}
        />
      )}
    </KioskStoreLayout>

    {/* MODALES FUERA DEL LAYOUT */}
    {store.tenant && !isService && (
      <KioskoWelcomeModal
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        onReset={resetKiosko}
        tenant={store.tenant}
        logoSource={processedLogo || store.tenant?.logo_url || store.tenant?.logo || null}
        bannerSource={processedBanner || store.tenant?.banner_url || store.tenant?.banner || null}
        primary={store.primary}
        secondary={store.secondary}
        isSecondaryLight={store.isSecondaryLight}
        textColor={store.isSecondaryLight ? '#0f172a' : '#ffffff'}
        mutedTextColor={store.isSecondaryLight ? '#64748b' : '#94a3b8'}
        isService={false}
      />
    )}

    {store.tenant && isService && (
      <KioskoServiceWelcomeModal
        isOpen={showServiceWelcome || !kioskSession.hasChosenMode}
        onClose={handleCloseServiceWelcome}
        tenant={store.tenant}
        logoSource={processedLogo || store.tenant?.logo_url || store.tenant?.logo || null}
        bannerSource={processedBanner || store.tenant?.banner_url || store.tenant?.banner || null}
        primary={store.primary}
        secondary={store.secondary}
        isSecondaryLight={store.isSecondaryLight}
        textColor={store.isSecondaryLight ? '#0f172a' : '#ffffff'}
        mutedTextColor={store.isSecondaryLight ? '#64748b' : '#94a3b8'}
      />
    )}
  </div>
);
}

export default function KioskoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <KioskSessionProvider>
        <KioskoPageContent />
      </KioskSessionProvider>
    </Suspense>
  );
}