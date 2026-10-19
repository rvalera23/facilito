'use client';

  import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
  import { useParams } from 'next/navigation';

  // ✅ IMPORTAR getImageUrl
  import { getImageUrl } from '@/lib/imageUtils';
  import { DEFAULT_THEME } from '@/lib/branding';
  import { apiFetch } from '@/lib/api';

  export function getContrastTextColor(hexColor: string) {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16) || 255;
    const g = parseInt(hexColor.slice(3, 5), 16) || 255;
    const b = parseInt(hexColor.slice(5, 7), 16) || 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#0f172a' : '#ffffff';
  }

  export function useAdminTenant() {
    const params = useParams();
    const rawSlug = params?.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

    const [tenant, setTenant] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
       const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'catalog' | 'orders' | 'branding' | 'settings'>('dashboard');

    // 🔥 Tema cacheado por slug — permite que el spinner del admin use
    // los colores reales del tenant en visitas siguientes, sin transición.
    // Mismo patrón que `usePublicStore` usa para la tienda.
    const [cachedTheme, setCachedTheme] = useState<{ primary: string; secondary: string; background: string } | null>(null);

    const tenantIdRef = useRef<string | null>(null);

    const isServiceBusiness = 
      tenant?.modelType === 'service' ||
      tenant?.itemType === 'service' ||
      tenant?.workModality === 'service' ||
      tenant?.businessType === 'service';

    const [newItem, setNewItem] = useState<any>({ 
      name: '', 
      price: '', 
      stock: '', 
      duration: '', 
      category: '', 
      files: [] as File[],
      prices: { VES: '', USD: '', EUR: '', CRYPTO: '' },
      features: [] as string[],
      existingImages: [] as string[],
      isActive: true,
      status: 'published',
      itemType: isServiceBusiness ? 'service' : 'product',
      durationMinutes: 60,
      includes: '',
      notIncludes: '',
      certifications: [],
      materials: [],
      clientRequirements: [],
      cancellationPolicy: '',
    });

    const [brandConfig, setBrandConfig] = useState({
      name: '',
      slogan: '',
      description: '',
      niche: 'general',
      ownerName: '',
      email: '',
      phone: '',
      countryCode: '+58',
      workModality: 'local',
      city: '',
      zone: '',
      address: '',
      latitude: null,
      longitude: null,
      currencies: '',
      primaryColor: DEFAULT_THEME.primaryColor,
      secondaryColor: DEFAULT_THEME.secondaryColor,
      accentColor: DEFAULT_THEME.accentColor,
      backgroundColor: DEFAULT_THEME.backgroundColor,
      logoUrl: '',
      bannerUrl: '',
      faviconUrl: '',
      fontFamily: 'Quicksand',
      fontWeight: 400,
      heroLayout: 'default',
      instagram: '',
      facebook: '',
      tiktok: '',
      x_twitter: '',
      threads: '',
      linkedin: '',
      whatsapp: '',
      rif: '',
      customFields: [] as { key: string; value: string }[],
      specific_config: {
        paymentMethods: {
          pagoMovilList: [],
          zelle: { emailOrPhone: '', holderName: '' },
          paypal: { emailOrLink: '', holderName: '' },
          binance: { payId: '', email: '' },
          wallet: { address: '', network: '' },
          zimli: { accountId: '' },
        },
        storeStatus: {
          isActive: true,
          schedule: {}
        }
      },
    });

    const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' 
      : 'http://localhost:3000');

    // ✅ MEMOIZAR PROCESAMIENTO DE IMÁGENES CON getImageUrl - PASANDO STRING DIRECTAMENTE
    const processedLogoSource = useMemo(() => {
      const rawLogo = brandConfig.logoUrl || tenant?.logoUrl || tenant?.logoPreview || tenant?.logo || tenant?.logo_url;
      if (!rawLogo) return null;
      
      try {
        // ✅ getImageUrl maneja strings directamente
        const processed = getImageUrl(rawLogo);
        return processed || rawLogo;
      } catch {
        return rawLogo;
      }
    }, [brandConfig.logoUrl, tenant?.logoUrl, tenant?.logoPreview, tenant?.logo, tenant?.logo_url]);

    const processedBannerSource = useMemo(() => {
      const rawBanner = brandConfig.bannerUrl || tenant?.bannerUrl || tenant?.banner || tenant?.banner_url;
      if (!rawBanner) return null;
      
      try {
        const processed = getImageUrl(rawBanner);
        return processed || rawBanner;
      } catch {
        return rawBanner;
      }
    }, [brandConfig.bannerUrl, tenant?.bannerUrl, tenant?.banner, tenant?.banner_url]);

    const processedFaviconSource = useMemo(() => {
      const rawFavicon = brandConfig.faviconUrl || tenant?.faviconUrl || tenant?.favicon || tenant?.favicon_url;
      if (!rawFavicon) return null;
      
      try {
        const processed = getImageUrl(rawFavicon);
        return processed || rawFavicon;
      } catch {
        return rawFavicon;
      }
    }, [brandConfig.faviconUrl, tenant?.faviconUrl, tenant?.favicon, tenant?.favicon_url]);

    // ✅ PROCESAR ITEMS DEL CATÁLOGO
    const processedItems = useMemo(() => {
      if (!items || items.length === 0) return items;
      
      return items.map((item: any) => {
        try {
          const processedImage = getImageUrl(item);
          return {
            ...item,
            _processedImage: processedImage,
            coverImage: processedImage || item.coverImage,
            image: processedImage || item.image,
          };
        } catch {
          return item;
        }
      });
    }, [items]);

    const preservePaymentMethods = (existingConfig: any, newConfig: any) => {
      return {
        ...newConfig,
        paymentMethods: {
          ...existingConfig?.paymentMethods,
          ...newConfig?.paymentMethods,
          pagoMovilList: newConfig?.paymentMethods?.pagoMovilList !== undefined 
            ? newConfig.paymentMethods.pagoMovilList 
            : existingConfig?.paymentMethods?.pagoMovilList || [],
          zelle: {
            ...existingConfig?.paymentMethods?.zelle,
            ...newConfig?.paymentMethods?.zelle,
          },
          paypal: {
            ...existingConfig?.paymentMethods?.paypal,
            ...newConfig?.paymentMethods?.paypal,
          },
          binance: {
            ...existingConfig?.paymentMethods?.binance,
            ...newConfig?.paymentMethods?.binance,
          },
          wallet: {
            ...existingConfig?.paymentMethods?.wallet,
            ...newConfig?.paymentMethods?.wallet,
          },
          zimli: {
            ...existingConfig?.paymentMethods?.zimli,
            ...newConfig?.paymentMethods?.zimli,
          },
        }
      };
    };

    useEffect(() => {
      if (tenant?.id) {
        tenantIdRef.current = tenant.id;
      }
    }, [tenant?.id]);

    const refreshData = useCallback(async () => {
      const currentTenantId = tenantIdRef.current;
      if (!currentTenantId) {
        console.warn('⚠️ [refreshData] No hay tenantId disponible');
        return;
      }

      try {
        console.log('🔄 [useAdminTenant] Refrescando datos...');
        
        const isService = tenant?.modelType === 'service' || tenant?.itemType === 'service';
        const itemsPath = isService
          ? `/services/tenant/${currentTenantId}`
          : `/products/tenant/${currentTenantId}`;

        const [resItems, resOrd, resBookings] = await Promise.all([
          apiFetch(itemsPath),
          apiFetch(`/orders/tenant/${currentTenantId}`),
          apiFetch(`/bookings/tenant/${currentTenantId}?limit=50`),
        ]);

        if (resItems.ok) {
          const itemsData = await resItems.json();
          const itemsArray = Array.isArray(itemsData) ? itemsData : itemsData.items || [];
          const itemsWithType = itemsArray.map((item: any) => ({
            ...item,
            itemType: item.itemType || (isService ? 'service' : 'product')
          }));
          setItems(itemsWithType);
          console.log(`✅ [useAdminTenant] Items actualizados: ${itemsWithType.length}`);
        } else {
          console.warn(`⚠️ [useAdminTenant] No se pudieron cargar los items (status: ${resItems.status})`);
        }

        if (resOrd.ok) {
          const ordersData = await resOrd.json();
          const ordersArray = Array.isArray(ordersData) ? ordersData : ordersData.orders || ordersData.data || [];
          setOrders(ordersArray);
          console.log(`✅ [useAdminTenant] Órdenes actualizadas: ${ordersArray.length}`);
        }

        if (resBookings.ok) {
          const bookingsData = await resBookings.json();
          const bookingsArray = Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || [];
          setBookings(bookingsArray);
          console.log(`✅ [useAdminTenant] Bookings actualizados: ${bookingsArray.length}`);
        }
      } catch (err) {
        console.error('❌ [useAdminTenant] Error refrescando datos:', err);
      }
    }, [apiBase, tenant?.modelType, tenant?.itemType]);

    // 🔥 FUNCIÓN PARA ELIMINAR IMAGEN DEL SERVIDOR
    const handleRemoveBrandImage = async (field: 'logoUrl' | 'bannerUrl' | 'faviconUrl') => {
      if (!tenant?.id) {
        console.error('❌ No hay tenantId para eliminar imagen');
        return;
      }

      const url = brandConfig?.[field];
      if (!url) {
        console.warn(`⚠️ No hay URL para eliminar en ${field}`);
        return;
      }

      try {
        const response = await apiFetch(`/tenants/${tenant.id}/brand/${field}`, {
          method: 'DELETE',
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Error al eliminar ${field}:`, errorData);
          return false;
        }

        console.log(`✅ Imagen ${field} eliminada del servidor`);
        
        setTenant((prev: any) => prev ? { ...prev, [field]: null } : prev);
        
        return true;
      } catch (error) {
        console.error(`❌ Error en handleRemoveBrandImage para ${field}:`, error);
        return false;
      }
    };

    // 🔥 FUNCIÓN PARA ELIMINAR IMAGEN (completa: servidor + local)
    const handleRemoveImage = async (field: 'logoUrl' | 'bannerUrl' | 'faviconUrl') => {
      const success = await handleRemoveBrandImage(field);
      
      setBrandConfig((prev: any) => ({ 
        ...prev, 
        [field]: '' 
      }));
      
      const input = document.querySelector(`input[data-key="${field}"]`) as HTMLInputElement;
      if (input) input.value = '';
      
      return success;
    };

    useEffect(() => {
      if (!slug && !tenant?.id) return;


      // 🔥 Leer tema cacheado del localStorage para que el spinner del admin
      // tenga los colores reales del tenant desde el primer frame (si ya visitó antes).
      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`admin-theme:${slug}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.primary && parsed?.secondary && parsed?.background) {
              setCachedTheme(parsed);
            }
          }
        }
      } catch {
        // Silencioso: si el cache falla, simplemente se usa el default
      }

      const parseSpecificConfig = (rawConfig: any) => {
        if (!rawConfig) return {};
        if (typeof rawConfig === 'string') {
          try {
            return JSON.parse(rawConfig);
          } catch (e) {
            return {};
          }
        }
        return rawConfig;
      };

      let isMounted = true;

      async function loadAdminData() {
        try {
          const resTenant = await apiFetch(`/tenants/${tenant?.id || slug}`);
                    if (resTenant.ok) {
            const rawTenantData = await resTenant.json();
            
            const parsedConfig = parseSpecificConfig(rawTenantData.specific_config);
            const tenantData = {
              ...rawTenantData,
              specific_config: parsedConfig
            };

            if (!isMounted) return;
            setTenant(tenantData);
            tenantIdRef.current = tenantData.id;

            // 🔥 Guardar el tema en cache para próximas visitas
            try {
              if (typeof window !== 'undefined') {
                const themeToCache = {
                  primary: tenantData.primaryColor || DEFAULT_THEME.primaryColor,
                  secondary: tenantData.secondaryColor || DEFAULT_THEME.secondaryColor,
                  background: tenantData.backgroundColor || DEFAULT_THEME.backgroundColor,
                };
                localStorage.setItem(`admin-theme:${slug}`, JSON.stringify(themeToCache));
                setCachedTheme(themeToCache);
              }
            } catch {
              // Silencioso
            }
            
setBrandConfig((prev) => ({
  ...prev,
  name: tenantData.name || '',
  slogan: tenantData.slogan || '',
  description: tenantData.description || '',
  niche: tenantData.niche || 'general',
  ownerName: tenantData.ownerName || '',
  email: tenantData.email || '',
  phone: tenantData.phone || '',
  countryCode: tenantData.countryCode || '+58',
  workModality: tenantData.workModality || tenantData.work_modality || 'local',
  city: tenantData.city || '',
  zone: tenantData.zone || '',
  address: tenantData.address || '',
  latitude: tenantData.latitude ?? null,
  longitude: tenantData.longitude ?? null,
  currencies: tenantData.currencies || '',
  primaryColor: tenantData.primaryColor || DEFAULT_THEME.primaryColor,
  secondaryColor: tenantData.secondaryColor || DEFAULT_THEME.secondaryColor,
  accentColor: tenantData.accentColor || DEFAULT_THEME.accentColor,
  backgroundColor: tenantData.backgroundColor || DEFAULT_THEME.backgroundColor,
  logoUrl: tenantData.logoUrl || tenantData.logoPreview || tenantData.logo || tenantData.logo_url || '',
bannerUrl: tenantData.bannerUrl || tenantData.banner || tenantData.banner_url || '',
faviconUrl: tenantData.faviconUrl || tenantData.favicon || tenantData.favicon_url || '',
fontFamily: (() => {
  const match = window.location.pathname.match(/^\/(admin|tienda)\/([^/]+)/);
  const urlSlug = match?.[2] || '';
  if (!urlSlug) return tenantData.fontFamily || 'Quicksand';
  const config = localStorage.getItem(`tenant_config_${urlSlug}`);
  if (config) {
    try {
      const parsed = JSON.parse(config);
      if (parsed?.fontFamily) return parsed.fontFamily;
    } catch {}
  }
  return localStorage.getItem(`tenant_font_${urlSlug}`) || tenantData.fontFamily || 'Quicksand';
})(),
fontWeight: (() => {
  const match = window.location.pathname.match(/^\/(admin|tienda)\/([^/]+)/);
  const urlSlug = match?.[2] || '';
  if (!urlSlug) return tenantData.fontWeight || 400;
  const config = localStorage.getItem(`tenant_config_${urlSlug}`);
  if (config) {
    try {
      const parsed = JSON.parse(config);
      if (parsed?.fontWeight) return parsed.fontWeight;
    } catch {}
  }
  const legacyWeight = localStorage.getItem(`tenant_font_weight_${urlSlug}`);
  return legacyWeight ? Number(legacyWeight) : (tenantData.fontWeight || 400);
})(),
heroLayout: tenantData.heroLayout || prev.heroLayout || 'default',

  instagram: tenantData.instagram || '',
  facebook: tenantData.facebook || '',
  tiktok: tenantData.tiktok || '',
  whatsapp: tenantData.whatsapp || '',
  rif: tenantData.rif || '',
  customFields: tenantData.customFields || parsedConfig?.customFields || [],
  specific_config: preservePaymentMethods(
    prev.specific_config,
    parsedConfig
  ),
}));

            const isService = tenantData.modelType === 'service' || tenantData.itemType === 'service';
            const itemsEndpoint = isService
              ? `${apiBase}/services/tenant/${tenantData.id}`
              : `${apiBase}/products/tenant/${tenantData.id}`;

            console.log(`📡 [useAdminTenant] Cargando ${isService ? 'servicios' : 'productos'} desde: ${itemsEndpoint}`);

            const itemsPath = isService
              ? `/services/tenant/${tenantData.id}`
              : `/products/tenant/${tenantData.id}`;

            const [resItems, resOrd, resBookings] = await Promise.all([
              apiFetch(itemsPath),
              apiFetch(`/orders/tenant/${tenantData.id}`),
              apiFetch(`/bookings/tenant/${tenantData.id}?limit=50`),
            ]);

            if (!isMounted) return;

            if (resItems.ok) {
              const itemsData = await resItems.json();
              const itemsArray = Array.isArray(itemsData) ? itemsData : itemsData.items || [];
              const itemsWithType = itemsArray.map((item: any) => ({
                ...item,
                itemType: item.itemType || (isService ? 'service' : 'product')
              }));
              console.log(`✅ [useAdminTenant] ${isService ? 'Servicios' : 'Productos'} cargados: ${itemsWithType.length}`);
              setItems(itemsWithType);
            } else {
              console.warn(`⚠️ [useAdminTenant] No se pudieron cargar los ${isService ? 'servicios' : 'productos'}`);
              setItems([]);
            }
            
            if (resOrd.ok) {
              const ordersData = await resOrd.json();
              const ordersArray = Array.isArray(ordersData) ? ordersData : ordersData.orders || ordersData.data || [];
              setOrders(ordersArray);
              console.log(`✅ [useAdminTenant] Órdenes cargadas: ${ordersArray.length}`);
            }

            if (resBookings.ok) {
              const bookingsData = await resBookings.json();
              const bookingsArray = Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || [];
              setBookings(bookingsArray);
              console.log(`✅ [useAdminTenant] Bookings cargados: ${bookingsArray.length}`);
            }
          }
        } catch (err) {
          console.error('Error cargando administración:', err);
          if (isMounted) {
            setItems([]);
            setOrders([]);
            setBookings([]);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }

      loadAdminData();

      return () => {
        isMounted = false;
      };
    }, [slug, tenant?.id, apiBase]);
useEffect(() => {
  if (tenant) {
    const parseSpecificConfig = (rawConfig: any) => {
      if (!rawConfig) return {};
      if (typeof rawConfig === 'string') {
        try { return JSON.parse(rawConfig); } catch (e) { return {}; }
      }
      return rawConfig;
    };

    const parsedConfig = parseSpecificConfig(tenant.specific_config);

    setBrandConfig((prev) => ({
      ...prev,
      name: tenant.name ?? prev.name,
      slogan: tenant.slogan ?? prev.slogan,
      niche: tenant.niche ?? prev.niche,
      ownerName: tenant.ownerName ?? prev.ownerName,
      email: tenant.email ?? prev.email,
      phone: tenant.phone ?? prev.phone,
      countryCode: tenant.countryCode ?? prev.countryCode,
      workModality: tenant.workModality ?? tenant.work_modality ?? prev.workModality,
      city: tenant.city ?? prev.city,
      zone: tenant.zone ?? prev.zone,
      address: tenant.address ?? prev.address,
      currencies: tenant.currencies ?? prev.currencies,
      primaryColor: tenant.primaryColor ?? prev.primaryColor,
      secondaryColor: tenant.secondaryColor ?? prev.secondaryColor,
      accentColor: tenant.accentColor ?? prev.accentColor,
      backgroundColor: tenant.backgroundColor ?? prev.backgroundColor,
      logoUrl: tenant.logoUrl || tenant.logoPreview || tenant.logo || tenant.logo_url || prev.logoUrl,
      bannerUrl: tenant.bannerUrl || tenant.banner || tenant.banner_url || prev.bannerUrl,
bannerUrl: tenant.bannerUrl || tenant.banner || tenant.banner_url || prev.bannerUrl,
faviconUrl: tenant.faviconUrl || tenant.favicon || tenant.favicon_url || prev.faviconUrl,
fontFamily: (() => {
  const match = window.location.pathname.match(/^\/(admin|tienda)\/([^/]+)/);
  const urlSlug = match?.[2] || '';
  if (!urlSlug) return tenant.fontFamily || prev.fontFamily || 'Quicksand';
  const config = localStorage.getItem(`tenant_config_${urlSlug}`);
  if (config) {
    try {
      const parsed = JSON.parse(config);
      if (parsed?.fontFamily) return parsed.fontFamily;
    } catch {}
  }
  return localStorage.getItem(`tenant_font_${urlSlug}`) || tenant.fontFamily || prev.fontFamily || 'Quicksand';
})(),
fontWeight: (() => {
  const match = window.location.pathname.match(/^\/(admin|tienda)\/([^/]+)/);
  const urlSlug = match?.[2] || '';
  if (!urlSlug) return tenant.fontWeight || prev.fontWeight || 400;
  const config = localStorage.getItem(`tenant_config_${urlSlug}`);
  if (config) {
    try {
      const parsed = JSON.parse(config);
      if (parsed?.fontWeight) return parsed.fontWeight;
    } catch {}
  }
  const legacyWeight = localStorage.getItem(`tenant_font_weight_${urlSlug}`);
  return legacyWeight ? Number(legacyWeight) : (tenant.fontWeight || prev.fontWeight || 400);
})(),
heroLayout: tenant.heroLayout || prev.heroLayout || 'default',
      instagram: tenant.instagram ?? prev.instagram,
      facebook: tenant.facebook ?? prev.facebook,
      tiktok: tenant.tiktok ?? prev.tiktok,
      x_twitter: tenant.x_twitter ?? tenant.xTwitter ?? tenant.twitter ?? prev.x_twitter,
      threads: tenant.threads ?? prev.threads,
      linkedin: tenant.linkedin ?? prev.linkedin,
      whatsapp: tenant.whatsapp ?? prev.whatsapp,
      rif: tenant.rif ?? prev.rif,
      customFields: tenant.customFields || parsedConfig?.customFields || prev.customFields, // ✅ AGREGAR ESTO
      specific_config: preservePaymentMethods(
        prev.specific_config,
        parsedConfig
      ),
    }));

    const isService = tenant.modelType === 'service' || tenant.itemType === 'service';
    setNewItem((prev: any) => ({
      ...prev,
      itemType: isService ? 'service' : 'product',
    }));
  }
}, [tenant]);

    const businessType = tenant?.workModality || tenant?.work_modality || tenant?.businessType || 'store';

    const openCreateModal = () => {
      const isService = tenant?.modelType === 'service' || tenant?.itemType === 'service';
      setNewItem({
        name: '',
        price: '',
        stock: '',
        duration: '',
        category: businessType === 'barber' ? 'Cortes' : 'General',
        prices: { VES: '', USD: '', EUR: '', CRYPTO: '' },
        features: [],
        files: [],
        existingImages: [],
        isActive: true,
        status: 'published',
        itemType: isService ? 'service' : 'product',
        durationMinutes: 60,
        includes: '',
        notIncludes: '',
        certifications: [],
        materials: [],
        clientRequirements: [],
        cancellationPolicy: '',
      });
    };

    const openEditModal = (itemToEdit: any) => {
      const isItemActive = itemToEdit.isActive ?? (itemToEdit.status === 'published');
      const isService = itemToEdit.itemType === 'service' || tenant?.modelType === 'service';
      
      setNewItem({
        ...itemToEdit,
        prices: itemToEdit.prices || { VES: '', USD: '', EUR: '', CRYPTO: '' },
        features: itemToEdit.features || [],
        files: [],
        existingImages: itemToEdit.mediaUrls || itemToEdit.existingImages || [],
        isActive: isItemActive,
        status: itemToEdit.status || (isItemActive ? 'published' : 'draft'),
        itemType: isService ? 'service' : 'product',
        durationMinutes: itemToEdit.durationMinutes || itemToEdit.attributes?.durationMinutes || 60,
        includes: itemToEdit.includes || itemToEdit.attributes?.includes || '',
        notIncludes: itemToEdit.notIncludes || itemToEdit.attributes?.notIncludes || '',
        certifications: itemToEdit.certifications || itemToEdit.attributes?.certifications || [],
        materials: itemToEdit.materials || itemToEdit.attributes?.materials || [],
        clientRequirements: itemToEdit.clientRequirements || itemToEdit.attributes?.clientRequirements || [],
        cancellationPolicy: itemToEdit.cancellationPolicy || itemToEdit.attributes?.cancellationPolicy || '',
      });
    };

    const handleBrandImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'logoUrl' | 'bannerUrl' | 'faviconUrl') => {
      const file = e.target.files?.[0];
      if (!file || !tenant?.id) return;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiFetch(`/tenants/${tenant.id}/upload/brand`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const fileUrl = data.url || data.filePath || data.path || data.secure_url;
          
          if (fileUrl) {
            setBrandConfig((prev) => ({ 
              ...prev, 
              [targetField]: fileUrl 
            }));
            setTenant((prev: any) => prev ? { ...prev, [targetField]: fileUrl } : prev);
          }
        } else {
          const errText = await res.text();
          console.error(`Error detallado del servidor al subir ${targetField}:`, errText);
        }
      } catch (err) {
        console.error(`Error de red al subir ${targetField}:`, err);
      }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleBrandImageUpload(e, 'logoUrl');
    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleBrandImageUpload(e, 'bannerUrl');
    const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleBrandImageUpload(e, 'faviconUrl');

    const handleCustomFieldChange = (index: number, key: string, value: string) => {
      setBrandConfig((prev: any) => {
        const updatedFields = [...(prev.customFields || [])];
        updatedFields[index] = { key, value };
        return { ...prev, customFields: updatedFields };
      });
    };

    const addCustomField = () => {
      setBrandConfig((prev: any) => ({
        ...prev,
        customFields: [...(prev.customFields || []), { key: '', value: '' }]
      }));
    };

    const removeCustomField = (index: number) => {
      setBrandConfig((prev: any) => ({
        ...prev,
        customFields: (prev.customFields || []).filter((_: any, i: number) => i !== index)
      }));
    };

    const handleCreateItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tenant) return;

      try {
        let formData: FormData;

        if (newItem instanceof FormData) {
          formData = newItem;
          if (!formData.has('tenantId')) {
            formData.append('tenantId', tenant.id);
          }
        } else {
          formData = new FormData();
          formData.append('tenantId', tenant.id);
          formData.append('name', newItem.name || '');
          formData.append('price', String(newItem.price || 0));
          
          const productMetadata = {
            prices: newItem.prices || { VES: '', USD: '', EUR: '', CRYPTO: '' },
            weight: newItem.weight && newItem.weight !== 'NaN' ? newItem.weight : '0'
          };
          formData.append('metadata', JSON.stringify(productMetadata));

          if (newItem.prices) {
            formData.append('prices', JSON.stringify(newItem.prices));
          }

          formData.append('stock', String(newItem.stock || 0));
          formData.append('category', newItem.category || (businessType === 'barber' ? 'Cortes' : 'General'));
          
          const activeStatus = newItem.isActive !== undefined 
            ? Boolean(newItem.isActive) 
            : (newItem.status === 'published' || newItem.status === true);
            
          const statusValue = newItem.status || (activeStatus ? 'published' : 'draft');

          formData.append('isActive', String(activeStatus));
          formData.append('status', statusValue);

          const resolvedCode = newItem.itemId || newItem.sku || newItem.code || newItem.codigo || '';
          if (resolvedCode) {
            formData.append('itemId', resolvedCode);
            formData.append('sku', resolvedCode);
            formData.append('code', resolvedCode);
          }

          if (newItem.description) formData.append('description', newItem.description);
          if (newItem.brand) formData.append('brand', newItem.brand);
          if (newItem.condition) formData.append('condition', newItem.condition);
          if (newItem.warranty) formData.append('warranty', newItem.warranty);
          
          const safeWeight = newItem.weight && newItem.weight !== 'NaN' ? String(newItem.weight) : '0';
          formData.append('weight', safeWeight);

          if (newItem.dimensions) formData.append('dimensions', newItem.dimensions);

          const isService = newItem.itemType === 'service' || tenant?.modelType === 'service';
          formData.append('itemType', isService ? 'service' : 'product');
          
          if (isService) {
            formData.append('durationMinutes', String(newItem.durationMinutes || 60));
            formData.append('includes', newItem.includes || '');
            formData.append('notIncludes', newItem.notIncludes || '');
            formData.append('certifications', JSON.stringify(newItem.certifications || []));
            formData.append('materials', JSON.stringify(newItem.materials || []));
            formData.append('clientRequirements', JSON.stringify(newItem.clientRequirements || []));
            formData.append('cancellationPolicy', newItem.cancellationPolicy || '');
          }

          // 🔥 FEATURES (características) - como array individual
          if (newItem.features && Array.isArray(newItem.features)) {
            newItem.features.forEach((feature: string) => {
              formData.append('features[]', feature);
            });
          }

          // 🔥🔥🔥 AGREGAR TODOS LOS CAMPOS FALTANTES 🔥🔥🔥
          // 1. IVA
          const ivaType = newItem?.ivaType || 'excluded';
          const ivaRate = Number(newItem?.ivaRate ?? 16);
          formData.append('ivaType', ivaType);
          formData.append('ivaRate', String(ivaRate));

          // 2. OFERTA Y DESCUENTO
          formData.append('onSale', String(newItem.onSale || false));
          formData.append('discountPercentage', String(newItem.discountPercentage || 0));

          if (newItem.discountStartDate) {
            formData.append('discountStartDate', newItem.discountStartDate);
          }
          if (newItem.discountEndDate) {
            formData.append('discountEndDate', newItem.discountEndDate);
          }

          // 3. ATRIBUTOS (con TODOS los campos)
          const finalAttributes = {
            prices: newItem.prices || {},
            weight: newItem.weight || '0',
            ...(newItem.attributes || {}),
            ivaType: ivaType,
            ivaRate: ivaRate,
            onSale: newItem.onSale || false,
            discountPercentage: newItem.discountPercentage || 0,
            discountStartDate: newItem.discountStartDate || null,
            discountEndDate: newItem.discountEndDate || null,
            colors: Array.isArray(newItem.colors) ? newItem.colors : (newItem.color ? [newItem.color] : []),
            stock: Number(newItem.stock ?? 0),
            features: newItem.features || [],
          };
          formData.append('attributes', JSON.stringify(finalAttributes));

          // 4. FEATURES (como JSON)
          if (newItem.features && Array.isArray(newItem.features)) {
            formData.append('features', JSON.stringify(newItem.features));
          }

          // 5. COLORES
          const colors = Array.isArray(newItem.colors) 
            ? newItem.colors 
            : (newItem.color ? [newItem.color] : []);
          if (colors.length > 0) {
            formData.append('colors', JSON.stringify(colors));
            formData.append('color', colors[0]);
          }

          // 6. IMÁGENES EXISTENTES (URLs del servidor)
          const existingImages = newItem.existingImages || newItem.mediaUrls || [];
          if (Array.isArray(existingImages) && existingImages.length > 0) {
            const serverImages = existingImages.filter((url: string) => 
              typeof url === 'string' && url.startsWith('http') && !url.startsWith('blob:')
            );
            if (serverImages.length > 0) {
              formData.append('existingImages', JSON.stringify(serverImages));
              formData.append('mediaUrls', JSON.stringify(serverImages));
              formData.append('images', JSON.stringify(serverImages));
            }
          }

          // 7. COVER IMAGE
          if (newItem.coverImage && typeof newItem.coverImage === 'string') {
            formData.append('coverImage', newItem.coverImage);
          }

          // 8. ARCHIVOS (files)
          const filesToAppend = newItem.files || [];
          if (Array.isArray(filesToAppend)) {
            filesToAppend.forEach((file: File) => {
              formData.append('files', file);
            });
          }
        }

        const isService = newItem.itemType === 'service' || tenant?.modelType === 'service';
        const endpoint = isService ? '/services' : '/products';

        const res = await apiFetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const created = await res.json();
          setItems([...items, created]);
          openCreateModal();
          await refreshData();
        } else {
          const errText = await res.text();
          console.error('Error del servidor:', errText);
        }
      } catch (err) {
        console.error('Error de red:', err);
      }
    };

    const handleUpdateItem = async (id: string, formDataOrData: any, files?: File[]) => {
      if (!tenant) return;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const currentItem = items.find((i) => i.id === id || i.itemId === id || i.sku === id) || {};
      const targetId = uuidRegex.test(id) ? id : (currentItem.id && uuidRegex.test(currentItem.id) ? currentItem.id : null);
      if (!targetId || !uuidRegex.test(targetId)) {
        console.error('Error: Se intentó actualizar un producto sin un UUID válido:', id);
        return;
      }

      try {
        let formData: FormData;

        if (formDataOrData instanceof FormData) {
          formData = formDataOrData;
          if (!formData.has('tenantId')) {
            formData.append('tenantId', tenant.id);
          }
        } else {
          formData = new FormData();
          formData.append('tenantId', tenant.id);

          const finalName = formDataOrData.name !== undefined && formDataOrData.name !== '' ? formDataOrData.name : currentItem.name;
          
          const rawPrice = formDataOrData.price !== undefined && formDataOrData.price !== '' ? formDataOrData.price : currentItem.price;
          const finalPrice = rawPrice !== undefined && !isNaN(Number(rawPrice)) ? Number(rawPrice) : 0;
          
          const finalPrices = formDataOrData.prices !== undefined ? formDataOrData.prices : (newItem?.prices || currentItem.prices);
          if (finalPrices) {
            formData.set('prices', JSON.stringify(finalPrices));
          }

          const rawWeight = formDataOrData.weight !== undefined && formDataOrData.weight !== '' ? formDataOrData.weight : (currentItem.weight || '0');
          const finalWeight = rawWeight !== 'NaN' && !isNaN(Number(rawWeight)) ? String(rawWeight) : '0';

          const productMetadata = {
            prices: finalPrices || { VES: '', USD: '', EUR: '', CRYPTO: '' },
            weight: finalWeight
          };
          formData.set('metadata', JSON.stringify(productMetadata));

          const finalStock = formDataOrData.stock !== undefined && formDataOrData.stock !== '' ? formDataOrData.stock : currentItem.stock;
          const safeStock = finalStock !== undefined && !isNaN(Number(finalStock)) ? Number(finalStock) : 0;

          const finalDescription = formDataOrData.description !== undefined ? formDataOrData.description : currentItem.description;
          const finalCategory = formDataOrData.category !== undefined && formDataOrData.category !== '' ? formDataOrData.category : currentItem.category;
          const finalBrand = formDataOrData.brand !== undefined ? formDataOrData.brand : currentItem.brand;
          const finalCondition = formDataOrData.condition !== undefined ? formDataOrData.condition : currentItem.condition;
          const finalWarranty = formDataOrData.warranty !== undefined ? formDataOrData.warranty : currentItem.warranty;

          const finalIsActive = formDataOrData.isActive !== undefined 
            ? Boolean(formDataOrData.isActive) 
            : (formDataOrData.status !== undefined 
                ? (formDataOrData.status === 'published' || formDataOrData.status === true) 
                : (currentItem.isActive ?? true));

          const finalStatus = formDataOrData.status || (finalIsActive ? 'published' : 'draft');

          formData.set('isActive', String(finalIsActive));
          formData.set('status', finalStatus);

          const finalCode = formDataOrData.itemId || formDataOrData.sku || formDataOrData.code || formDataOrData.codigo || currentItem.itemId || currentItem.sku || currentItem.code || '';

          if (finalName) formData.set('name', finalName);
          formData.set('price', String(finalPrice));
          formData.set('stock', String(safeStock));
          formData.set('weight', finalWeight);
          
          if (finalDescription !== undefined) formData.set('description', finalDescription || '');
          if (finalCategory) formData.set('category', finalCategory);
          if (finalBrand !== undefined) formData.set('brand', finalBrand || '');
          if (finalCondition !== undefined) formData.set('condition', finalCondition || '');
          if (finalWarranty !== undefined) formData.set('warranty', finalWarranty || '');

          if (finalCode) {
            formData.set('itemId', finalCode);
            formData.set('sku', finalCode);
            formData.set('code', finalCode);
          }

          const isService = formDataOrData.itemType === 'service' || currentItem.itemType === 'service' || tenant?.modelType === 'service';
          formData.set('itemType', isService ? 'service' : 'product');
          
          if (isService) {
            const duration = formDataOrData.durationMinutes !== undefined 
              ? formDataOrData.durationMinutes 
              : (currentItem.durationMinutes || 60);
            formData.set('durationMinutes', String(duration));
            formData.set('includes', formDataOrData.includes || currentItem.includes || '');
            formData.set('notIncludes', formDataOrData.notIncludes || currentItem.notIncludes || '');
            formData.set('certifications', JSON.stringify(formDataOrData.certifications || currentItem.certifications || []));
            formData.set('materials', JSON.stringify(formDataOrData.materials || currentItem.materials || []));
            formData.set('clientRequirements', JSON.stringify(formDataOrData.clientRequirements || currentItem.clientRequirements || []));
            formData.set('cancellationPolicy', formDataOrData.cancellationPolicy || currentItem.cancellationPolicy || '');
          }

          const featuresToUse = formDataOrData.features !== undefined ? formDataOrData.features : currentItem.features;
          if (featuresToUse && Array.isArray(featuresToUse)) {
            featuresToUse.forEach((feature: string) => {
              formData.append('features[]', feature);
            });
          }

          const rawFiles = files !== undefined ? files : (formDataOrData.files || []);
          const rawImages = formDataOrData.images !== undefined ? formDataOrData.images : (formDataOrData.existingImages || currentItem.mediaUrls || []);

          const newFileItems = Array.isArray(rawFiles) ? rawFiles.filter((item: any) => item instanceof File) : [];
          
          if (newFileItems.length > 0) {
            newFileItems.forEach((file: File) => {
              formData.append('files', file);
            });
          }

          const existingImageStrings = Array.isArray(rawImages) 
            ? rawImages.filter((item: any) => typeof item === 'string' && item.trim() !== '')
            : [];

          existingImageStrings.forEach((item: string) => {
            formData.append('existingImages[]', item);
          });

          if (existingImageStrings.length === 0 && newFileItems.length === 0) {
            formData.append('existingImages[]', '');
          }
        }

        const isService = formData.get('itemType') === 'service' || tenant?.modelType === 'service';
        const endpoint = isService ? `/services/${targetId}` : `/products/${targetId}`;

        const res = await apiFetch(endpoint, {
          method: 'PUT',
          body: formData,
        });

        if (res.ok) {
          const updated = await res.json();
          setItems((prevItems) => prevItems.map((item) => (item.id === targetId ? { ...item, ...updated } : item)));
          setNewItem((prev: any) => ({ ...prev, ...updated }));
          await refreshData();
        } else {
          const errText = await res.text();
          console.error('Error del servidor al actualizar:', errText);
        }
      } catch (err) {
        console.error('Error de red al actualizar:', err);
      }
    };

    const handleRemoveItem = async (id: string) => {
      if (!tenant) return;

      try {
        const isService = newItem?.itemType === 'service' || tenant?.modelType === 'service';
        const endpoint = isService
          ? `/services/${id}/${tenant.id}`
          : `/products/${id}/${tenant.id}`;

        const res = await apiFetch(endpoint, {
          method: 'DELETE',
        });

        if (res.ok) {
          setItems(items.filter((item) => item.id !== id));
          await refreshData();
        } else {
          console.error('Error al eliminar el elemento');
        }
      } catch (err) {
        console.error('Error de red al eliminar:', err);
      }
    };

    const handleSaveBranding = async (e: React.FormEvent) => {
      e?.preventDefault?.();
      
      console.log('🔵 [handleSaveBranding] Iniciando guardado...');
      console.log('🔵 Tenant ID:', tenant?.id);
      console.log('🔵 BrandConfig:', brandConfig);
      
      if (!tenant?.id) {
        console.error('❌ [handleSaveBranding] No hay tenant ID');
        return false;
      }

      try {
const currentSpecificConfig = brandConfig.specific_config || tenant?.specific_config || {};

// ✅ AGREGAR customFields DENTRO DE specific_config
const finalSpecificConfig = {
  ...preservePaymentMethods(currentSpecificConfig, brandConfig.specific_config || {}),
  customFields: brandConfig.customFields || []
};

const payload = { 
  name: brandConfig.name || tenant?.name || '',
  slogan: brandConfig.slogan || '',
  description: brandConfig.description || '',
  niche: brandConfig.niche || 'general',
primaryColor: brandConfig.primaryColor || DEFAULT_THEME.primaryColor,
  secondaryColor: brandConfig.secondaryColor || '#0f172a',
  accentColor: brandConfig.accentColor || '#3b82f6',
  backgroundColor: brandConfig.backgroundColor || '#0b0f19',
  logoUrl: brandConfig.logoUrl || null,
  bannerUrl: brandConfig.bannerUrl || null,
  faviconUrl: brandConfig.faviconUrl || null,
  instagram: brandConfig.instagram || '',
  facebook: brandConfig.facebook || '',
  tiktok: brandConfig.tiktok || '',
  xTwitter: brandConfig.x_twitter || brandConfig.xTwitter || '',
  threads: brandConfig.threads || '',
  linkedin: brandConfig.linkedin || '',
  fontFamily: brandConfig.fontFamily || 'Quicksand',
  heroLayout: brandConfig.heroLayout || 'default',
  address: brandConfig.address || '',
  city: brandConfig.city || '',
  state: brandConfig.state || '',
  latitude: brandConfig.latitude || null,
  longitude: brandConfig.longitude || null,
  rif: brandConfig.rif || '',
  phone: brandConfig.phone || '',
  countryCode: brandConfig.countryCode || '+58',
  specific_config: finalSpecificConfig,
  specificConfig: finalSpecificConfig
};

        console.log('📤 [handleSaveBranding] Enviando payload:', payload);

        const res = await apiFetch(`/tenants/${tenant.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        console.log('📥 [handleSaveBranding] Response status:', res.status);

        if (!res.ok) {
          const errText = await res.text();
          console.error('❌ [handleSaveBranding] Error del servidor:', res.status, errText);
          return false;
        }

        const updated = await res.json();
        console.log('✅ [handleSaveBranding] Respuesta del servidor:', updated);
        
        setTenant((prev: any) => ({
          ...prev,
          ...payload,
          ...updated,
        }));
        
        const updatedSpecificConfig = updated.specific_config || finalSpecificConfig;
        
        setBrandConfig((prev: any) => ({
          ...prev,
          ...payload,
          specific_config: preservePaymentMethods(
            prev.specific_config,
            updatedSpecificConfig
          ),
        }));
        
// ✅ GUARDAR TENANT EN LOCALSTORAGE CON heroLayout
const currentTenant = JSON.parse(localStorage.getItem('tenant') || '{}');
const updatedTenant = {
  ...currentTenant,
  primaryColor: payload.primaryColor,
  secondaryColor: payload.secondaryColor,
  accentColor: payload.accentColor,
  backgroundColor: payload.backgroundColor,
  name: payload.name,
  logoUrl: payload.logoUrl || '',
  bannerUrl: payload.bannerUrl || '',
  faviconUrl: payload.faviconUrl || '',
  fontFamily: payload.fontFamily || 'Quicksand',
  // ✅ FORZAR heroLayout EN TENANT
  heroLayout: brandConfig.heroLayout || 'default',
};

// ✅ TAMBIÉN GUARDAR EN specificConfig PARA COMPATIBILIDAD
if (updatedTenant.specificConfig) {
  updatedTenant.specificConfig.heroLayout = brandConfig.heroLayout || 'default';
} else if (updatedTenant.specific_config) {
  updatedTenant.specific_config.heroLayout = brandConfig.heroLayout || 'default';
}

localStorage.setItem('tenant', JSON.stringify(updatedTenant));
// ✅ GUARDAR tenant_font SEPARADAMENTE (con slug robusto)
const slugMatch = window.location.pathname.match(/^\/(admin|tienda)\/([^/]+)/);
const currentSlug = slugMatch?.[2] || '';
if (currentSlug) {
  localStorage.setItem(`tenant_config_${currentSlug}`, JSON.stringify({
    fontFamily: payload.fontFamily || 'Quicksand',
    fontWeight: payload.fontWeight || 400,
    updatedAt: Date.now(),
  }));
  localStorage.setItem(`tenant_font_${currentSlug}`, payload.fontFamily || 'Quicksand');
  localStorage.setItem(`tenant_font_weight_${currentSlug}`, String(payload.fontWeight || 400));
}
console.log('💾 [handleSaveBranding] Tenant guardado con heroLayout:', updatedTenant.heroLayout);
        
        const themeColors = {
          primaryColor: payload.primaryColor,
          secondaryColor: payload.secondaryColor,
          accentColor: payload.accentColor,
          backgroundColor: payload.backgroundColor,
          name: payload.name || 'Mi Tienda',
          logoUrl: payload.logoUrl || '',
          bannerUrl: payload.bannerUrl || '',
          faviconUrl: payload.faviconUrl || '',
          fontFamily: payload.fontFamily || 'Quicksand',
        };

        // ✅ DISPARAR EVENTO DE CAMBIO DE FUENTE
        if (typeof window !== 'undefined') {
          const slugMatch = window.location.pathname.match(/^\/(admin|tienda)\/([^/]+)/);
          const slug = slugMatch?.[2] || '';
          const fontFamily = payload.fontFamily || 'Quicksand';
          const fontWeight = brandConfig.fontWeight || 400;

          if (slug) {
            window.dispatchEvent(new CustomEvent('tenantFontChanged', {
              detail: { font: fontFamily, weight: fontWeight, slug }
            }));
            console.log(`🔤 [useAdminTenant] Evento tenantFontChanged disparado para "${slug}":`, fontFamily, fontWeight);
          }
        }

        
        localStorage.setItem('app_theme', JSON.stringify(themeColors));
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tenantThemeUpdated', { 
            detail: themeColors 
          }));
          window.dispatchEvent(new Event('storage'));
        }
        
        console.log('✅ [handleSaveBranding] Guardado exitoso');
        
        await refreshData();
        
        return true;
        
      } catch (err) {
        console.error('❌ [handleSaveBranding] Error de red:', err);
        return false;
      }
    };

    const onChangeConfig = (newSpecificConfig: any) => {
      console.log('🔄 [useAdminTenant] onChangeConfig recibido:', newSpecificConfig);
      
      setBrandConfig((prev: any) => ({
        ...prev,
        specific_config: preservePaymentMethods(
          prev.specific_config,
          newSpecificConfig
        ),
      }));
    };

    // ✅ USAR VERSIONES PROCESADAS
    const primary = brandConfig.primaryColor || tenant?.primaryColor || DEFAULT_THEME.primaryColor;
    const secondary = brandConfig.secondaryColor || tenant?.secondaryColor || DEFAULT_THEME.secondaryColor;
    const logoSource = processedLogoSource;
    const bannerSource = processedBannerSource;
    const faviconSource = processedFaviconSource;
    const textColor = getContrastTextColor(secondary);
    const isDarkBg = textColor === '#ffffff';

    return {
      tenant,
      setTenant,
      items: processedItems || [],
      setItems,
      orders: orders || [],
      bookings: bookings || [],
      loading,
      activeTab,
      setActiveTab,
      newItem,
      setNewItem,
      openCreateModal,
      openEditModal,
      brandConfig,
      setBrandConfig,
      onChangeConfig,
      businessType,
      isServiceBusiness,
      primary,
      secondary,
      logoSource,
      bannerSource,
      faviconSource,
      textColor,
      isDarkBg,
      handleLogoUpload,
      handleBannerUpload,
      handleFaviconUpload,
      handleRemoveImage,
      handleCustomFieldChange,
      addCustomField,
      removeCustomField,
      handleCreateItem,
      handleUpdateItem,
      handleRemoveItem,
      handleSaveBranding,
      refreshData,
      cachedTheme,
    };
  }