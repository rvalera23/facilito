'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useKioskoStore } from './useKioskoStore';
import { useCartQuote, type QuoteItemInput } from './useCartQuote';
import { apiFetch } from '@/lib/api';
import { DEFAULT_THEME } from '@/lib/branding';
import { toAbsoluteApiUrl } from '@/lib/apiUrl';

export function isColorLight(hexColor: string) {
  if (!hexColor || !hexColor.startsWith('#')) return false;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) || 0;
  const g = parseInt(hex.substr(2, 2), 16) || 0;
  const b = parseInt(hex.substr(4, 2), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
}

// 🔥 CORREGIDO: Acepta slug como parámetro opcional
export function usePublicStore(externalSlug?: string) {
  const params = useParams();
  // 🔥 Si se proporciona externalSlug, usarlo; si no, usar el de la URL
  const slug = externalSlug || params?.slug;



  const [tenant, setTenant] = useState<any>(null);
  const [specificConfig, setSpecificConfig] = useState<any>({});
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedService, setSelectedService] = useState<any>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerZone, setCustomerZone] = useState('');
  const [customerReference, setCustomerReference] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 🔥 NUEVO: tema cacheado por slug para que el spinner tenga colores reales
  const [cachedTheme, setCachedTheme] = useState<{ primary: string; secondary: string } | null>(null);




  const { isKioskEnabled, isOwnerOfThisStore, currentUser: kioskCurrentUser, canShowKioskButton } = useKioskoStore(tenant);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = useCallback((title: string, message: string, type: 'warning' | 'error' | 'info' = 'warning') => {
    console.warn(`🚨 [usePublicStore Alert] [${type.toUpperCase()}] ${title}: ${message}`);
    setAlertModal({ isOpen: true, title, message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const isStoreOpen = useCallback(() => {
    const config = specificConfig || {};
    if (config.is_manually_closed === true) return false;
    const schedule = config.schedule;
    if (!schedule) return true;
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = schedule[currentDay];
    if (!daySchedule) return true;
    if (daySchedule.closed === true) return false;
    if (daySchedule.open && daySchedule.close) {
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime < daySchedule.open || currentTime > daySchedule.close) return false;
    }
    return true;
  }, [specificConfig]);

  const getStoreClosedMessage = useCallback(() => {
    const config = specificConfig || {};
    if (config.is_manually_closed === true) {
      return 'La tienda se encuentra temporalmente cerrada. Por favor, intenta más tarde.';
    }
    const schedule = config.schedule;
    if (!schedule) return 'La tienda está cerrada en este momento.';
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = schedule[currentDay];
    if (daySchedule?.closed) {
      return 'La tienda está cerrada hoy. Consulta nuestros horarios de atención.';
    }
    if (daySchedule?.open && daySchedule?.close) {
      return `La tienda está fuera de horario. Atendemos de ${daySchedule.open} a ${daySchedule.close}.`;
    }
    return 'La tienda está cerrada en este momento.';
  }, [specificConfig]);

  // ============================================================
  // 🔥 FUNCIÓN PARA OBTENER IMAGEN (URL absoluta con origin actual)
  // ============================================================
  const getProductImage = useCallback((item: any) => {
    if (!item) return null;

    const extractString = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
      }
      if (typeof value === 'object') {
        if (value.url) return extractString(value.url);
        if (value.path) return extractString(value.path);
        if (value.secure_url) return extractString(value.secure_url);
        if (value.preview) return extractString(value.preview);
        if (value.src) return extractString(value.src);
        if (value instanceof File || value instanceof Blob) {
          return URL.createObjectURL(value);
        }
        if (value.toString && typeof value.toString === 'function') {
          const str = value.toString();
          if (str && str !== '[object Object]') return str;
        }
      }
      return null;
    };

    let rawImg = extractString(item.coverImage) || 
                 extractString(item.image) || 
                 extractString(item.photo);
    
    if (!rawImg && Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
      for (const media of item.mediaUrls) {
        const extracted = extractString(media);
        if (extracted) { rawImg = extracted; break; }
      }
    }
    
    if (!rawImg) {
      const imageArrays = ['images', 'existingImages', 'fileUrls', 'photos', 'files'];
      for (const key of imageArrays) {
        const array = item[key];
        if (Array.isArray(array) && array.length > 0) {
          for (const img of array) {
            const extracted = extractString(img);
            if (extracted) { rawImg = extracted; break; }
          }
          if (rawImg) break;
        }
      }
    }
    
    if (!rawImg) return null;
    rawImg = String(rawImg).trim().replace(/\\/g, '/');
    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) return rawImg;

    const webpExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'];
    for (const ext of webpExtensions) {
      if (rawImg.toLowerCase().endsWith(ext)) {
        rawImg = rawImg.slice(0, -ext.length) + '.webp';
        break;
      }
    }

    return toAbsoluteApiUrl(rawImg);
  }, []);
  // 🔥 CORREGIDO: useEffect que depende de slug
  useEffect(() => {
    if (!slug) {
      console.log("ℹ️ [usePublicStore] No hay slug definido todavía.");
      return;
    }

    
    // 🔥 NUEVO: leer tema cacheado del localStorage para este slug
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`store-theme:${slug}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.primary && parsed?.secondary) {
            setCachedTheme(parsed);
            console.log("🎨 [usePublicStore] Tema cacheado cargado para spinner:", parsed);
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ [usePublicStore] No se pudo leer el tema cacheado:", e);
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    console.log("🌐 [usePublicStore] Cargando datos para slug:", slug);

    async function fetchStoreData() {
      setLoading(true);
      setError(null);

      try {
        console.log(`📡 [usePublicStore] Obteniendo datos del tenant para el slug: "${slug}"...`);
        const resTenant = await apiFetch(`/tenants/${slug}`);

        console.log(`📥 [usePublicStore] Estado HTTP tenants/${slug}:`, resTenant.status, resTenant.statusText);

        if (!resTenant.ok) {
          let errorMsg = `Error ${resTenant.status}`;
          try {
            const errorBody = await resTenant.text();
            if (errorBody) errorMsg += `: ${errorBody.substring(0, 100)}`;
          } catch (e) {}
          console.error(`❌ [usePublicStore] Error al buscar el tenant:`, errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }

        const contentType = resTenant.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!isJson) {
          console.error(`❌ [usePublicStore] Respuesta no es JSON: ${contentType}`);
          setError('La respuesta del servidor no es válida');
          setLoading(false);
          return;
        }

        const tenantData = await resTenant.json();
        console.log("✅ [usePublicStore] Tenant obtenido correctamente:", tenantData);

        const normalizedTenant = {
          ...tenantData,
          id: tenantData.id || tenantData._id || tenantData.tenantId,
          _id: tenantData._id || tenantData.id || tenantData.tenantId,
        };

        setTenant(normalizedTenant);

        
        // 🔥 NUEVO: guardar tema en localStorage para próximas visitas
        try {
          if (typeof window !== 'undefined') {
// 🔥 NUEVO: guardar tema en localStorage SOLO si el tenant tiene colores propios
try {
  if (typeof window !== 'undefined') {
    const tenantPrimary = normalizedTenant.primary_color || normalizedTenant.primaryColor;
    const tenantSecondary = normalizedTenant.secondary_color || normalizedTenant.secondaryColor;

    if (tenantPrimary && tenantSecondary) {
      const themeToCache = { primary: tenantPrimary, secondary: tenantSecondary };
      localStorage.setItem(`store-theme:${slug}`, JSON.stringify(themeToCache));
      console.log("💾 [usePublicStore] Tema cacheado (colores del tenant):", themeToCache);
    } else {
      // 🧹 Tenant sin colores propios: borrar caché viejo para no contaminar
      localStorage.removeItem(`store-theme:${slug}`);
      console.warn("⚠️ [usePublicStore] Tenant sin colores, caché limpiado:", slug);
    }
  }
} catch (e) {
  console.warn("⚠️ [usePublicStore] No se pudo guardar el tema en cache:", e);
}
          }
        } catch (e) {
          console.warn("⚠️ [usePublicStore] No se pudo guardar el tema en cache:", e);
        }

        const config = tenantData?.specificConfig || tenantData?.specific_config || {};
        console.log("📦 [usePublicStore] specificConfig extraído:", config);
        setSpecificConfig(config);

        const tenantId = normalizedTenant.id;

        const rawModality = String(
          tenantData?.model_type ||
          tenantData?.modelType ||
          tenantData?.work_modality ||
          tenantData?.workModality ||
          tenantData?.niche ||
          tenantData?.businessType ||
          tenantData?.type ||
          ''
        ).toLowerCase().trim();

        const isService =
          rawModality === 'service' ||
          rawModality === 'servicios' ||
          rawModality === 'cita' ||
          rawModality === 'citas' ||
          rawModality.includes('service') ||
          rawModality.includes('servicio') ||
          rawModality.includes('cita');

        // 🔥 NUEVO: Usar el endpoint que devuelve productos con pricing calculado
        // (Fase 4 del sistema de precios)
        // 🔥 NUEVO: Usar el endpoint que devuelve items con pricing calculado
        // (Fase 4 del sistema de precios)
        const endpoint = isService
          ? `${apiBase}/services/priced/tenant/${tenantId}`
          : `${apiBase}/products/priced/tenant/${tenantId}`;

        console.log(`📡 [usePublicStore] Obteniendo ${isService ? 'servicios' : 'productos'} para el tenant ID: ${tenantId}...`);
        console.log(`📡 [usePublicStore] Endpoint: ${endpoint}`);

        const resItems = await fetch(endpoint);

        console.log(`📥 [usePublicStore] Estado HTTP ${isService ? 'services' : 'products'}/tenant:`, resItems.status, resItems.statusText);

        const itemsContentType = resItems.headers.get('content-type') || '';
        if (resItems.ok && itemsContentType.includes('application/json')) {
          const itemsData = await resItems.json();
          const finalItems = Array.isArray(itemsData) ? itemsData : (itemsData.items || itemsData.services || itemsData.products || []);
          console.log(`✅ [usePublicStore] ${isService ? 'Servicios' : 'Productos'} cargados con éxito. Total: ${finalItems.length}`, finalItems);
          setProducts(finalItems);
        } else {
          console.warn(`⚠️ [usePublicStore] No se pudieron cargar los ${isService ? 'servicios' : 'productos'} del tenant.`);
        }

      } catch (err: any) {
        console.error('❌ [usePublicStore Error] Excepción al cargar datos de la tienda:', err);
        setError(err?.message || 'Error de conexión al servidor');
      } finally {
        setLoading(false);
      }
    }

    fetchStoreData();
  }, [slug]);

  // ============================================================
  // VALIDACIONES Y FUNCIONES
  // ============================================================
  const validateBuyerAction = useCallback(() => {
    if (typeof window === 'undefined') return true;

    // 🔥 En el kiosco la sesión se maneja aparte (kiosk_user / kiosk_token).
    // Si estamos en modo kiosco, la acción siempre es válida:
    //   - Cliente logueado → kiosk_user presente
    //   - Cliente anónimo  → kiosk_token ausente pero sigue siendo válido
    const isKioskContext = typeof window !== 'undefined' && (
      window.location.pathname.includes('/tienda/kiosko') ||
      window.location.search.includes('token=')
    );

    if (isKioskContext) {
      console.log("🛒 [usePublicStore] Modo kiosco detectado → validateBuyerAction OMITIDO");
      return true;
    }

    const userString = localStorage.getItem('user');
    console.log("🔍 [usePublicStore] Validando acción. Usuario en localStorage:", userString ? "Encontrado" : "No encontrado");

    if (!userString) {
      showAlert(
        'Acceso Restringido',
        'Para interactuar con la tienda, debes iniciar sesión.',
        'warning'
      );
      return false;
    }

    try {
      const currentUser = JSON.parse(userString);
      console.log("👤 [usePublicStore] Usuario autenticado:", currentUser.email || currentUser.name || 'sin email');
      return true;
    } catch (e) {
      console.error('❌ [usePublicStore Error] Error al parsear el usuario:', e);
      showAlert(
        'Error de autenticación',
        'No pudimos validar tu sesión. Por favor, inicia sesión nuevamente.',
        'error'
      );
      return false;
    }
  }, [showAlert]);

  const updateCartQty = (productId: string, newQty: number, maxStock: number = 999) => {
    console.log(`🛒 [usePublicStore] Actualizando cantidad del producto ${productId} a ${newQty} (Stock Máx: ${maxStock})`);
    
    // 🔥 En el kiosco, la tienda "cerrada" solo bloquea el checkout, NO el añadir al carrito.
    const isKioskContextForStore = typeof window !== 'undefined' && (
      window.location.pathname.includes('/tienda/kiosko') ||
      window.location.search.includes('token=')
    );

    if (!isKioskContextForStore && !isStoreOpen()) {
      showAlert(
        'Tienda Cerrada',
        getStoreClosedMessage(),
        'warning'
      );
      return;
    }
    
    if (!validateBuyerAction()) return;

    setCart((prevCart) => {
      const updated = { ...prevCart };
      if (newQty <= 0) {
        console.log(`🗑️ [usePublicStore] Cantidad <= 0. Eliminando producto ${productId} del carrito.`);
        delete updated[productId];
      } else if (newQty <= maxStock) {
        updated[productId] = newQty;
      } else {
        console.warn(`⚠️ [usePublicStore] La cantidad solicitada (${newQty}) supera el stock máximo (${maxStock}).`);
      }
      console.log("🛒 [usePublicStore] Carrito actualizado:", updated);
      return updated;
    });
  };

  const removeFromCart = (productId: string) => {
    console.log(`🗑️ [usePublicStore] Removiendo producto del carrito: ${productId}`);
    if (!validateBuyerAction()) return;
    setCart((prevCart) => {
      const updated = { ...prevCart };
      delete updated[productId];
      console.log("🛒 [usePublicStore] Carrito después de remover:", updated);
      return updated;
    });
  };

  const handleSelectService = (service: any) => {
    console.log("📅 [usePublicStore] Servicio seleccionado:", service);
    if (!validateBuyerAction()) return;
    
    if (service) {
      setSelectedService(service);
      setIsCartOpen(true);
    } else {
      setSelectedService(null);
      setIsCartOpen(false);
    }
  };

  const isServiceStore = useMemo(() => {
    const rawModality = String(
      tenant?.model_type ||      
      tenant?.modelType ||       
      tenant?.work_modality || 
      tenant?.workModality || 
      tenant?.niche || 
      tenant?.businessType || 
      tenant?.type || 
      ''
    ).toLowerCase().trim();

    const result = 
      rawModality === 'service' || 
      rawModality === 'servicios' || 
      rawModality === 'cita' || 
      rawModality === 'citas' || 
      rawModality.includes('service') || 
      rawModality.includes('servicio') || 
      rawModality.includes('cita');

    
    return result;
  }, [tenant]);

  useEffect(() => {
    if (isServiceStore && selectedService) {
      console.log("🔥 [usePublicStore] useEffect: Servicio seleccionado, abriendo sidebar");
      setIsCartOpen(true);
    }
  }, [isServiceStore, selectedService]);

  useEffect(() => {
    if (isServiceStore && !selectedService) {
      console.log("🔥 [usePublicStore] useEffect: Servicio deseleccionado, cerrando sidebar");
      setIsCartOpen(false);
    }
  }, [isServiceStore, selectedService]);
const primary = tenant?.primary_color || tenant?.primaryColor || cachedTheme?.primary || DEFAULT_THEME.primaryColor;
const secondary = tenant?.secondary_color || tenant?.secondaryColor || cachedTheme?.secondary || DEFAULT_THEME.secondaryColor;
const normalizeAssetUrl = (raw: any): string | null => {
  const result = toAbsoluteApiUrl(raw);
  return result || null;
};

  const logoSource = normalizeAssetUrl(
    tenant?.logo_url || tenant?.logoUrl || tenant?.logo,
  );
  const bannerSource = normalizeAssetUrl(
    tenant?.banner_url || tenant?.bannerUrl || tenant?.banner,
  );

  const isSecondaryLight = isColorLight(secondary);
  const isPrimaryLight = isColorLight(primary);

  const textMainClass = isSecondaryLight ? 'text-slate-900' : 'text-slate-100';
  const textMutedClass = isSecondaryLight ? 'text-slate-600' : 'text-slate-400';
  const cardBgClass = isSecondaryLight 
    ? 'bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-lg shadow-slate-200/50' 
    : `backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50`;
  const cardInnerBgClass = isSecondaryLight 
    ? 'bg-slate-100/80 border-slate-200' 
    : 'bg-black/30 border-white/5';
  
  // 🔥 NUEVO: clase para fondos sin backdrop-blur (performance).
  // Usa el secondary del tenant como color base, con opacidad media.
  const cardBgClassSolid = isSecondaryLight 
    ? 'bg-white/85 border-slate-200/60 shadow-lg shadow-slate-200/30' 
    : `border-white/10 shadow-lg shadow-black/40`;

  const publishedProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p) return false;
      const status = String(p.status || '').toLowerCase();
      return !p.status || status === 'published' || status === 'activo' || p.isActive === true || p.is_active === true;
    });
  }, [products]);

  const categories = useMemo(() => {
    return ['Todos', ...Array.from(new Set(publishedProducts.map((p) => p.category).filter(Boolean)))];
  }, [publishedProducts]);

  const filteredProducts = useMemo(() => {
    return publishedProducts.filter((p) => {
      const productName = p.name || p.title || '';
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [publishedProducts, searchQuery, selectedCategory]);

  // 🔥 TASA DE CAMBIO DEL TENANT (para conversiones locales)
  // Prioridad: specificConfig.exchangeRate → 0
  // Si el backend ya devolvió _pricing, no se usa esta variable.
  const exchangeRate = useMemo(() => {
    const config = tenant?.specificConfig || tenant?.specific_config || {};
    const rate = Number(config?.exchangeRate || config?.tasaDolar || 0);
    return Number.isFinite(rate) && rate > 0 ? rate : 0;
  }, [tenant]);

  // 🔥 FUNCIÓN PARA OBTENER PRECIOS - CON TASA DINÁMICA
  const getProductPrices = useCallback((product: any) => {
        if (!product) return { VES: 0, USD: 0, EUR: 0, USDT: null, ivaType: 'excluded', ivaRate: 16 };
    
    let pricesObj = product?.prices || product?.attributes?.prices || {};

    if (typeof pricesObj === 'string') {
      try {
        pricesObj = JSON.parse(pricesObj);
      } catch {
        pricesObj = {};
      }
    }

    if (!pricesObj || Object.keys(pricesObj).length === 0) {
      const attrs = product?.attributes || {};
      pricesObj = attrs.prices || {};
    }

    // 🔥 1. OBTENER VES
    let vesVal = Number(
      pricesObj?.VES ?? 
      pricesObj?.ves ?? 
      product?.priceVes ??
      product?.price_ves ?? 
      product?.price ?? 
      product?.precio ?? 
      0
    );

    // 🔥 2. OBTENER USD
    let usdVal = Number(
      pricesObj?.USD ?? 
      pricesObj?.usd ?? 
      product?.priceUsd ?? 
      product?.price_usd ?? 
      product?.usd ?? 
      product?.attributes?.prices?.USD ?? 
      0
    );

    // 🔥 3. SI HAY VES PERO NO USD, CONVERTIR CON TASA DINÁMICA
    if (usdVal === 0 && vesVal > 0 && exchangeRate > 0) {
      usdVal = vesVal / exchangeRate;
    }

    // 🔥 4. SI HAY USD PERO NO VES, CONVERTIR CON TASA DINÁMICA
    if (vesVal === 0 && usdVal > 0 && exchangeRate > 0) {
      vesVal = usdVal * exchangeRate;
    }

    // 🔥 5. SI HAY PRECIO SIMPLE Y NO HAY NADA
    if (vesVal === 0 && usdVal === 0) {
      const simplePrice = Number(product?.price || product?.precio || 0);
      if (simplePrice > 0) {
        const hasExplicitUsd = !!(product.priceUsd || pricesObj?.USD || product.attributes?.prices?.USD);
        if (hasExplicitUsd && exchangeRate > 0) {
          usdVal = simplePrice;
          vesVal = simplePrice * exchangeRate;
        } else if (simplePrice < 1000 && exchangeRate > 0) {
          usdVal = simplePrice;
          vesVal = simplePrice * exchangeRate;
        } else {
          vesVal = simplePrice;
          if (exchangeRate > 0) usdVal = simplePrice / exchangeRate;
        }
      }
    }

    const eurVal = pricesObj?.EUR ?? pricesObj?.eur ?? null;
    const cryptoVal = pricesObj?.CRYPTO ?? pricesObj?.crypto ?? pricesObj?.USDT ?? null;
    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

    return {
      VES: !isNaN(vesVal) ? Math.round(vesVal * 100) / 100 : 0,
      USD: !isNaN(usdVal) ? Math.round(usdVal * 100) / 100 : 0,
      EUR: eurVal !== null && !isNaN(Number(eurVal)) ? Number(eurVal) : 0,
      USDT: cryptoVal !== null && String(cryptoVal).trim() !== '' ? String(cryptoVal) : null,
      ivaType,
      ivaRate,
    };
  }, [exchangeRate]);

  // 🔥 CORREGIDO: cartItems — Ahora pasa el producto "crudo"
  // 🔥 CORREGIDO: cartItems — Ahora pasa el producto "crudo" con `_pricing`
  // El componente consumidor decide si usar `_pricing` (backend) o calcular localmente.
  const cartItems = useMemo(() => {
    return isServiceStore ? [] : Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => (p.id && String(p.id) === String(productId)) || (p._id && String(p._id) === String(productId)));
        if (!product) return null;

        return {
          id: productId,
          ...product,                 // ← viene con `_pricing` si el backend lo mandó
          quantity: quantity || 1,
        };
      })
      .filter((item) => item && item.name && item.quantity > 0);
  }, [cart, products, isServiceStore]);

  // ============================================================
  // 🔥 COTIZACIÓN DEL CARRITO (backend = fuente de verdad)
  // ============================================================
  // Le pedimos al backend que calcule TODOS los totales con
  // PricingService. El frontend NO calcula nada. Solo muestra
  // lo que devuelve `cartQuote`.
  //
  // - Para productos: se manda [{productId, quantity}]
  // - Para servicios: se manda [{serviceId, quantity, ...}]
  //
  // El hook ya maneja debounce, abortos y errores.
  // ============================================================
  const quoteItems: QuoteItemInput[] = useMemo(() => {
    if (isServiceStore) {
      if (!selectedService) return [];
      const serviceId = selectedService.id || selectedService._id;
      if (!serviceId) return [];
      return [{
        serviceId,
        quantity: 1,
        appointmentDate: appointmentDate || undefined,
        appointmentTime: appointmentTime || undefined,
      }];
    }

    return cartItems
      .filter((item: any) => item && (item.id || item._id))
      .map((item: any) => ({
        productId: item.id || item._id,
        quantity: Number(item.quantity || 1),
      }));
  }, [isServiceStore, selectedService, appointmentDate, appointmentTime, cartItems]);

  const {
    quote: cartQuote,
    loading: cartQuoteLoading,
    error: cartQuoteError,
    refresh: refreshCartQuote,
  } = useCartQuote(quoteItems);


  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      // 🔥 Usar _pricing si existe (precio base con descuento, sin IVA)
      const itemPrice =
        item?._pricing?.subtotalUSD ||
        item?._pricing?.basePriceUSD ||
        item?.prices?.USD ||
        0;
      return acc + (Number(itemPrice) * Number(item.quantity || 1));
    }, 0);
  }, [cartItems]);

    const handleWhatsAppCheckout = async (orderData?: {
      action?: string;
      orderId?: string;
      paymentMethod?: string;
      bankSource?: string;
      paymentReference?: string;
      totalVes?: number;
      totalUsd?: number;
      status?: string;
    }) => {
      console.log("🚀 [handleWhatsAppCheckout] Ejecutado con orderData:", orderData);

    if (!validateBuyerAction()) {
      console.warn("⚠️ [handleWhatsAppCheckout] Validación de comprador fallida.");
      return;
    }
    if (!tenant) {
      console.warn("⚠️ [handleWhatsAppCheckout] Tenant no cargado todavía.");
      return;
    }

    const storePhone = tenant.phone || tenant.whatsapp || '584140000000';
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (orderData?.action === 'create_order') {
      console.log("📝 [handleWhatsAppCheckout] Procesando acción: create_order");

      if (!customerName.trim() || !customerPhone.trim()) {
        console.warn("⚠️ [handleWhatsAppCheckout] Faltan datos del cliente (nombre o teléfono).");
        showAlert('Datos Incompletos', 'Por favor completa tu nombre y número de teléfono.', 'warning');
        throw new Error('Datos incompletos');
      }
      if (cartItems.length === 0) {
        console.warn("⚠️ [handleWhatsAppCheckout] El carrito está vacío al intentar crear la orden.");
        showAlert('Carrito Vacío', 'Tu carrito está vacío.', 'warning');
        throw new Error('Carrito vacío');
      }

      let currentUserId = null;
      try {
        if (typeof window !== 'undefined') {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            const parsedUser = JSON.parse(rawUser);
            currentUserId = parsedUser.id || parsedUser._id || parsedUser.userId || parsedUser.sub || null;
          }
          if (!currentUserId) {
            const token = localStorage.getItem('token');
            if (token) {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              const decodedToken = JSON.parse(jsonPayload);
              currentUserId = decodedToken.sub || decodedToken.id || decodedToken.userId || null;
            }
          }
        }
      } catch (e) {
        console.error('❌ [DIAGNÓSTICO USER] Error al extraer el userId:', e);
      }

      console.log("🎯 [handleWhatsAppCheckout] userId final asignado a la orden:", currentUserId);

      const itemsWithPrices = cartItems.map(item => {
        const prices = getProductPrices(item);
        return {
          productId: item.id || item._id,
          name: item.name,
          quantity: item.quantity,
          priceUsd: prices.USD,
          priceVes: prices.VES,
          type: item.type || item.itemType || 'product',
          coverImage: item.coverImage || item.image || item.photo || undefined,
          mediaUrls: Array.isArray(item.mediaUrls) ? item.mediaUrls : undefined,
          ivaType: prices.ivaType,
          ivaRate: prices.ivaRate,
        };
      });

      const orderPayload = {
        tenantId: tenant.id || tenant._id,
        userId: currentUserId,
        orderType: 'delivery',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: null,
        items: itemsWithPrices,
        subtotal: orderData.totalUsd ?? subtotal,
        tax: 0.00,
        discount: 0.00,
        totalAmount: orderData.totalUsd ?? subtotal,
        totalVes: orderData.totalVes ?? cartItems.reduce((acc, item) => acc + (getProductPrices(item).VES * Number(item.quantity || 1)), 0),
        paymentMethodUsed: orderData.paymentMethod || 'Efectivo / WhatsApp',
        paymentReference: null,
        status: 'Pendiente'
      };

      console.log("📤 [handleWhatsAppCheckout] Enviando POST a /orders con payload:", orderPayload);

      try {
        const res = await fetch(`${apiBase}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });

        console.log("📥 [handleWhatsAppCheckout] Respuesta de /orders (POST):", res.status, res.statusText);

        if (res.ok) {
          const data = await res.json();
          console.log("✅ [handleWhatsAppCheckout] Orden creada exitosamente en BD. ID devuelto:", data.id || data);
          return { success: true, orderId: data.id || data._id || data.orderId || ('ORD-' + Date.now()) };
        } else {
          const errorText = await res.text();
          console.warn("⚠️ [handleWhatsAppCheckout] Falló el guardado en BD pero se continuará con ID temporal:", errorText);
        }
      } catch (dbErr) {
        console.warn("⚠️ [handleWhatsAppCheckout] Excepción en POST /orders, continuando con ID temporal:", dbErr);
      }

      return { success: true, orderId: 'ORD-' + Date.now() };
    }

    if (orderData?.action === 'submit_payment' && orderData.orderId) {
      console.log(`💳 [handleWhatsAppCheckout] Procesando acción: submit_payment para orden ID: ${orderData.orderId}`);

      const updatePayload = {
        paymentMethodUsed: orderData.paymentMethod,
        paymentReference: orderData.paymentReference ? `${orderData.bankSource} - ${orderData.paymentReference}` : 'Efectivo',
        status: orderData.status || 'por_verificar'
      };

      console.log(`📤 [handleWhatsAppCheckout] Enviando PATCH a /orders/${orderData.orderId} con payload:`, updatePayload);

      try {
        const res = await fetch(`${apiBase}/orders/${orderData.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
        console.log(`📥 [handleWhatsAppCheckout] Respuesta de actualización de pago:`, res.status, res.statusText);
      } catch (patchErr) {
        console.warn("⚠️ [handleWhatsAppCheckout] No se pudo actualizar el pago vía PATCH en backend, procediendo a abrir WhatsApp:", patchErr);
      }

      console.log("✅ [handleWhatsAppCheckout] Generando enlace de WhatsApp...");

      let message = `*¡Nuevo Pedido y Pago Reportado desde ${tenant.name}!* \n\n`;
      message += `👤 *Cliente:* ${customerName}\n`;
      message += `📞 *Teléfono:* ${customerPhone}\n`;
      if (customerZone) message += `📍 *Zona:* ${customerZone}\n`;
      message += `🏠 *Dirección:* ${customerAddress}\n`;
      if (customerReference) message += `📌 *Referencia:* ${customerReference}\n\n`;

      message += `*Detalle de la orden:*\n`;
      cartItems.forEach((item) => {
        const prices = getProductPrices(item);
        const pUsd = prices.USD;
        const pVes = prices.VES;
        message += `- ${item.quantity}x ${item.name} ($${(pUsd * Number(item.quantity)).toFixed(2)}) - Bs. ${(pVes * Number(item.quantity)).toFixed(2)}\n`;
      });

      message += `\n📱 *Método de Pago:* ${orderData.paymentMethod}\n`;
      if (orderData.bankSource) message += `🏦 *Banco Emisor:* ${orderData.bankSource}\n`;
      if (orderData.paymentReference) message += `🔢 *Referencia:* ${orderData.paymentReference}\n`;
      if (orderData.totalVes) message += `💵 *Monto Bs:* Bs. ${Number(orderData.totalVes).toFixed(2)}\n`;

      const totalVes = cartItems.reduce((acc, item) => {
        const prices = getProductPrices(item);
        return acc + (prices.VES * Number(item.quantity || 1));
      }, 0);
      message += `\n💳 *Total:* $${subtotal.toFixed(2)} (Bs. ${totalVes.toFixed(2)})`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${storePhone}?text=${encodedMessage}`;
      console.log("🌐 [handleWhatsAppCheckout] Abriendo WhatsApp URL:", whatsappUrl);
      window.open(whatsappUrl, '_blank');

      return { success: true };
    }

    if (isServiceStore) {
      console.log("📅 [handleWhatsAppCheckout] Ejecutando flujo de servicio/cita...");

      if (!selectedService) {
        console.warn("⚠️ [handleWhatsAppCheckout] Ningún servicio seleccionado.");
        showAlert('Campo Requerido', 'Por favor selecciona un servicio del catálogo.', 'warning');
        return;
      }
      if (!appointmentDate || !appointmentTime) {
        console.warn("⚠️ [handleWhatsAppCheckout] Faltan fecha u hora para la cita.");
        showAlert('Fecha y Hora', 'Por favor selecciona la fecha y hora para tu cita.', 'warning');
        return;
      }
      if (!customerName.trim() || !customerPhone.trim()) {
        console.warn("⚠️ [handleWhatsAppCheckout] Faltan datos del cliente para la cita.");
        showAlert('Datos Incompletos', 'Por favor completa tu nombre y número de teléfono/WhatsApp.', 'warning');
        return;
      }

      const servicePrice = Number(selectedService?.prices?.USD ?? selectedService?.priceUsd ?? selectedService?.price ?? 0);

      let currentUserId = null;
      try {
        if (typeof window !== 'undefined') {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            const parsedUser = JSON.parse(rawUser);
            currentUserId = parsedUser.id || parsedUser._id || parsedUser.userId || parsedUser.sub || null;
          }
          if (!currentUserId) {
            const token = localStorage.getItem('token');
            if (token) {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              const decodedToken = JSON.parse(jsonPayload);
              currentUserId = decodedToken.sub || decodedToken.id || decodedToken.userId || null;
            }
          }
        }
      } catch (e) {
        console.error('❌ [usePublicStore] Error al obtener el ID de usuario para cita:', e);
      }

      try {
        const orderPayload = {
          tenantId: tenant.id || tenant._id,
          userId: currentUserId,
          orderType: 'service',
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: null,
          items: [{
            serviceId: selectedService.id || selectedService._id,
            name: selectedService.name,
            durationMinutes: selectedService.durationMinutes || selectedService.duration || 30,
            appointmentDate,
            appointmentTime,
            priceUsd: servicePrice
          }],
          subtotal: servicePrice,
          tax: 0.00,
          discount: 0.00,
          totalAmount: servicePrice,
          paymentMethodUsed: 'Cita / WhatsApp',
          status: 'PENDING'
        };

        console.log("📤 [handleWhatsAppCheckout] Guardando cita en BD (POST /orders):", orderPayload);
        await fetch(`${apiBase}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
      } catch (dbErr) {
        console.error('❌ [handleWhatsAppCheckout Error] Error al guardar la cita en la BD:', dbErr);
      }

      let message = `*¡Nueva Solicitud de Cita - ${tenant.name}!* \n\n`;
      message += `🛠️ *Servicio:* ${selectedService.name}\n`;
      message += `⏱️ *Duración:* ${selectedService.durationMinutes || selectedService.duration || 30} min\n`;
      message += `📅 *Fecha:* ${appointmentDate}\n`;
      message += `⏰ *Hora:* ${appointmentTime}\n\n`;
      message += `👤 *Cliente:* ${customerName}\n`;
      message += `📞 *Teléfono:* ${customerPhone}\n`;
      if (customerZone) message += `📍 *Zona / Ciudad:* ${customerZone}\n`;
      if (customerReference) message += `📌 *Notas:* ${customerReference}\n\n`;
      message += `💳 *Inversión:* $${servicePrice.toFixed(2)}`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappServiceUrl = `https://wa.me/${storePhone}?text=${encodedMessage}`;
      console.log("🌐 [handleWhatsAppCheckout] Abriendo WhatsApp para cita:", whatsappServiceUrl);
      window.open(whatsappServiceUrl, '_blank');
      return;
    }

    console.warn("⚠️ [handleWhatsAppCheckout] No se cumplió ninguna condición de flujo conocida.");
  };

  return {
    tenant,
    specificConfig,
    products,
    cart,
    setCart,
    updateCartQty,
    removeFromCart,
    isCartOpen,
    setIsCartOpen,
    selectedService,
    setSelectedService: handleSelectService,
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerAddress,
    setCustomerAddress,
    customerZone,
    setCustomerZone,
    customerReference,
    setCustomerReference,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    loading,
    error,
    primary,
    secondary,
    logoSource,
    bannerSource,
    isSecondaryLight,
    isPrimaryLight,
    textMainClass,
    textMutedClass,
    cardBgClass,
    cardBgClassSolid,
    cardInnerBgClass,
    categories,
    filteredProducts,
    cartItems,
    subtotal,
    // 🔥 NUEVO: cotización del backend (fuente de verdad de precios)
    cartQuote,
    cartQuoteLoading,
    cartQuoteError,
    refreshCartQuote,
    handleWhatsAppCheckout,
    isServiceStore,
    alertModal,
    closeAlert,
    // 🔥 FUNCIÓN: mostrar alerta genérica (la usa el kiosco)
    showAlert,
    isKioskEnabled,
    isOwnerOfThisStore,
    kioskCurrentUser,
    canShowKioskButton,
    isStoreOpen,
    
    getStoreClosedMessage,
    user: null,
    userId: null,
    getProductImage,
    getImageUrl: getProductImage,
  };
}