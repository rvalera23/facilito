'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingBag, X, CreditCard } from 'lucide-react';

// Importar los subcomponentes
import CartItemsList from './CartItemsList';
import CartFooter from './CartFooter';
import CartPaymentStep from './CartPaymentStep';
import CartConfirmModal from './CartConfirmModal';
import OrderSuccessModal from './OrderSuccessModal';

// Importar tipos
import type { CartSidebarProps } from './types';

// IMPORTAR EL HELPER DE VALIDACIÓN
import {
  getAvailablePaymentMethods,
  getDefaultPaymentMethod,
  hasAnyPaymentMethodAvailable,
  PaymentMethodType,
  PAYMENT_METHODS_CONFIG,
} from '../../utils/paymentMethods';

// IMPORTAR EL MANEJADOR DE MENSAJES DEL CHAT
import {
  sendInitialChatMessage,
  sendPaymentReportedMessage,
  sendOrderCompletedMessage,
} from '../../utils/chatMessageHandler';

// ✅ IMPORTAR getImageUrl DESDE imageUtils
import { getImageUrl } from '@/lib/imageUtils';
// 🔥 BANKS - fuente única de verdad
import { getBankLabel } from '@/lib/venezuelanBanks';

// ✅ IMPORTAR useExchangeRateContext (AGREGAR ESTA LÍNEA)
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

// 🔥 DELIVERY LOCAL — ubicación del comprador
import { useLocationContext } from '@/app/context/LocationContext';
import type { LocalDeliverySelection } from '@/components/LocalDeliveryBlock';

// 🔥 IMPORTAR COMPONENTE DE PAGOS MIXTOS
import { PaymentBreakdown } from '@/app/components/PaymentBreakdown';
import type { ActivePaymentMethod } from '@/app/components/PaymentBreakdown';
import type {
  PaymentBreakdown as PaymentBreakdownType,
  ChangeResolution as ChangeResolutionType,
  CreatePaymentBreakdownPayload,
} from '@/types/payment-breakdown';

// URL BASE DEL BACKEND
// 🔥 Se lee de NEXT_PUBLIC_API_URL (.env.local). Fallback solo para dev local.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// FUNCIÓN PARA DISPARAR EVENTOS GLOBALES
const triggerGlobalRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('globalRefresh'));
    window.dispatchEvent(new Event('notificationUpdate'));
    console.log('🔄 [CartSidebar] Eventos globales disparados');
  }
};

export default function CartSidebar({
  isOpen,
  onClose,
  textMainClass,
  textMutedClass,
  cartItems,
  primary,
  secondary,
  subtotal,
  subtotalVes,
  isSecondaryLight,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  isPrimaryLight,
  updateCartQty,
  removeFromCart,
  onProcessOrder,
  pagoMovilData,
  pagoMovilList: pagoMovilListProp,
  tenantId,
  tenant,
    onOpenPreview,
  userId,
  tenantConfig,
  currentUser,
  isStoreOpen = true,
  storeClosedMessage = 'La tienda está cerrada en este momento.',
  getImageUrl: getImageUrlProp,
  // 🔥 NUEVO: cotización del backend (fuente de verdad de precios)
  cartQuote,
  cartQuoteLoading,
  cartQuoteError,
  refreshCartQuote,
}: CartSidebarProps & {
  isStoreOpen?: boolean;
  storeClosedMessage?: string;
  getImageUrl?: (item: any) => string | null;
  cartQuote?: any;
  cartQuoteLoading?: boolean;
  cartQuoteError?: string | null;
  refreshCartQuote?: () => void;
}) {

  // ============================================================
  // 🔥 DIAGNÓSTICO INICIAL
  // ============================================================
  console.log('🔍 [CartSidebar] ===== INICIO =====');
  console.log('🔍 [CartSidebar] userId recibido:', userId);
  console.log('🔍 [CartSidebar] tenantId recibido:', tenantId);
  console.log('🔍 [CartSidebar] cartItems:', cartItems.length);
  console.log('🔍 [CartSidebar] tenantConfig:', tenantConfig ? 'OK' : 'null');
  console.log('🔍 [CartSidebar] DIAGNÓSTICO tenant:', {
    tenantExists: Boolean(tenant),
    tenantSlug: tenant?.slug,
    tenantConfigSlug: tenantConfig?.slug,
    tenantConfigId: tenantConfig?.id,
  });
  console.log('🔍 [CartSidebar] ===== FIN INICIO =====');

  // Sincronizar datos de la cuenta
  useEffect(() => {
    if (!isOpen) return;
    if (customerPhone && customerAddress && customerName) return;

    let isMounted = true;

    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        if (!token) return;

        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;
        
        const res = await fetch(`${cleanBase}/api/account/profile`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok && isMounted) {
          const account = await res.json();
          if (account) {
            if (!customerName && account.name) setCustomerName(account.name);
            if (!customerPhone && account.phone) setCustomerPhone(account.phone);
            if (!customerAddress) {
              const dir = account.address || '';
              const ciudad = account.city || '';
              let fullAddress = dir;
              if (ciudad && !dir.toLowerCase().includes(ciudad.toLowerCase())) {
                fullAddress = dir ? `${dir}, ${ciudad}` : ciudad;
              }
              if (fullAddress) setCustomerAddress(fullAddress);
            }
          }
        }
      } catch (err) {
        console.error('❌ [CartSidebar] Error al sincronizar datos de la cuenta:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerPhone, customerAddress, customerName]);

  const [step, setStep] = useState<'cart' | 'waiting_payment'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pago_movil');
  const [bankSource, setBankSource] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  // 🔥 Ref para acceder al ID de la orden desde closures sin depender del render
  const createdOrderIdRef = useRef<string | null>(null);

  // NUEVO ESTADO PARA GUARDAR EL conversationId
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [selectedPagoMovilIndex, setSelectedPagoMovilIndex] = useState(0);

  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.email) {
          setUserEmail(user.email);
          console.log('📧 [CartSidebar] Correo del usuario cargado:', user.email);
        }

        // 🔥 AUTocompletar cédula + teléfono si el flag está activo
        const sameAsProfile = Boolean(user.pago_movil_same_as_profile);
        const profileIdNumber = user.id_number || '';
        const profileIdType = user.id_type || 'V';
        const profilePhone = user.phone || '';

        if (sameAsProfile) {
          if (profileIdNumber) {
            setClientIdNumber(profileIdNumber);
            setClientIdType(profileIdType);
          }
          if (profilePhone) {
            // Extraer solo dígitos del teléfono
            // Formatos de entrada posibles:
            //   '+58 4124274173'  → '584124274173'
            //   '+58 04124274173' → '5804124274173'
            //   '04124274173'     → '04124274173'
            //   '4124274173'      → '4124274173'
            // Salida SIEMPRE: '04124274173' (11 dígitos, prefijo 0 + operadora + número)
            const phoneDigits = String(profilePhone).replace(/\D/g, '');
            let normalizedPhone = phoneDigits;

            // Quitar prefijo 58 si está
            if (normalizedPhone.startsWith('58')) {
              normalizedPhone = normalizedPhone.slice(2);
            }

            // Asegurar que empiece con '0' (formato local venezolano)
            if (normalizedPhone.length === 10 && !normalizedPhone.startsWith('0')) {
              normalizedPhone = '0' + normalizedPhone;
            }

            setClientPhone(normalizedPhone);
          }
          console.log('✅ [CartSidebar] Pago Móvil autocompletado desde perfil:', {
            idNumber: profileIdNumber,
            idType: profileIdType,
            phone: profilePhone,
          });
        }
      }
    } catch (e) {
      console.error('❌ [CartSidebar] Error al obtener correo:', e);
    }
  }, []);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmedData, setConfirmedData] = useState(false);


  // 🔥 SALDO A FAVOR (Fase 5)
  const [creditBalance, setCreditBalance] = useState(0);
  const [applyCredit, setApplyCredit] = useState(false);
  // 🔥 Congelar el valor de applyCredit al confirmar para que no se resetee durante el flujo
  const applyCreditRef = useRef<boolean>(false);

  const [senderEmail, setSenderEmail] = useState('');
  const [clientIdNumber, setClientIdNumber] = useState('');
  const [clientAccountType, setClientAccountType] = useState('');
  const [clientIdType, setClientIdType] = useState('V');
  const [clientPhone, setClientPhone] = useState('');

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderData, setSuccessOrderData] = useState<any>(null);

  
  // 🔥 ESTADO PARA PAGO MIXTO (Fase 2)
  const [isMixedPaymentOpen, setIsMixedPaymentOpen] = useState(false);
  const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [activePaymentMethods, setActivePaymentMethods] = useState<ActivePaymentMethod[]>([]);

  // 🔥 Estado para el pago en efectivo (VES/USD + monto)
  const [cashCurrency, setCashCurrency] = useState<'VES' | 'USD'>('VES');
  const [cashAmount, setCashAmount] = useState(0);
  const [changeResolution, setChangeResolution] = useState<'credit' | 'pending' | 'rounded'>('pending');

  // 🔥 Preferencia del comprador para recibir el vuelto (método + datos PM)
  const [changeDeliveryPreference, setChangeDeliveryPreference] = useState<{
    method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
    pagoMovilData?: {
      bank: string;
      phone: string;
      clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
      clientIdNumber: string;
    };
    notes?: string;
  } | null>(null);

  const safeIsSecondaryLight = Boolean(isSecondaryLight);
  const safeIsPrimaryLight = Boolean(isPrimaryLight);
  const safePrimaryColor = primary || '#10B981';

  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [deliveryData, setDeliveryData] = useState<any>(null);
  // 🔥 Método de entrega elegido por el comprador en CartPaymentStep
  const [deliveryMethodChoice, setDeliveryMethodChoice] = useState<'pickup' | 'local' | 'shipping' | null>(null);

  // 🔥 FETCH: saldo a favor del cliente en este tenant
  useEffect(() => {
    if (!isOpen) return;
    if (!tenantId) return;

    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

        const response = await fetch(`${cleanBase}/account/credit/tenants`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;

        if (Array.isArray(data)) {
          const match = data.find(
            (c: any) => String(c.tenantId) === String(tenantId),
          );
          setCreditBalance(match ? Number(match.balance) : 0);
        }
      } catch (err) {
        console.warn('⚠️ [CartSidebar] No se pudo obtener el saldo:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantId]);
  const { rates, loading: ratesLoading } = useExchangeRateContext();
  // 🔥 DEFINIR exchangeRate PARA USAR EN TODA LA FUNCIÓN
  const exchangeRate = rates.USD > 0 ? rates.USD : 0;
  const isServiceOrder = cartItems.some((item: any) =>
    item?.type === 'service' || item?.itemType === 'service' || item?.serviceId
  );

  // 🔥 DELIVERY LOCAL — ubicación del comprador
  const { location, requestBrowserLocation } = useLocationContext();
  const buyerLat = location?.latitude ?? null;
  const buyerLng = location?.longitude ?? null;
  const [localDeliverySelection, setLocalDeliverySelection] =
    useState<LocalDeliverySelection | null>(null);
  // 🔥 Ref que persiste la última selección válida de delivery local
  const localDeliverySelectionRef = useRef<LocalDeliverySelection | null>(null);

  // 🔥 Handler que actualiza el ref INMEDIATAMENTE (sin useEffects)
  const handleLocalDeliveryChange = React.useCallback((sel: LocalDeliverySelection | null) => {
    console.log('🎯 [CartSidebar] handleLocalDeliveryChange RECIBIDO:', sel);
    if (sel?.enabled) {
      localDeliverySelectionRef.current = sel;
      console.log('🎯 [CartSidebar] REF GUARDADO:', sel);
    } else {
      localDeliverySelectionRef.current = null;
      console.log('🎯 [CartSidebar] REF LIMPIADO');
    }
    setLocalDeliverySelection(sel);
  }, []);
      // 🔥 LOG DEBUG: ver cada cambio de localDeliverySelection
  useEffect(() => {
    console.log('🎯 [CartSidebar] localDeliverySelection cambió:', localDeliverySelection);
  }, [localDeliverySelection]);

      console.log('🔍 [CartSidebar] DIAGNÓSTICO buyer:', {
    hasLocation: Boolean(location),
    buyerLat,
    buyerLng,
    tenantSlugForCart: tenant?.slug || null,
  });

  // 🔥 Auto-pedir GPS cuando el comprador abre el carrito.
  //    Solo si aún no hay coords y no lo pedimos ya en esta sesión del carrito.
  const autoLocationRequestedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    if (buyerLat != null && buyerLng != null) return;
    if (autoLocationRequestedRef.current) return;
    autoLocationRequestedRef.current = true;
    requestBrowserLocation().catch((e) => {
      console.warn('⚠️ [CartSidebar] No se pudo pedir la ubicación:', e);
    });
  }, [isOpen, buyerLat, buyerLng, requestBrowserLocation]);

  // 🔥 NOTA: NO resetear localDeliverySelection acá.
  // El LocalDeliveryBlock ya maneja los cambios de coords internamente:
  // cuando cambian, vuelve a llamar al endpoint y dispara onChange
  // con la nueva selección (o null si ya no aplica).

  // 🔥 VACIAR EL CARRITO AL CERRAR EL MODAL DE ÉXITO
  useEffect(() => {
    if (!showSuccessModal && successOrderData) {
      console.log('🗑️ [CartSidebar] Vaciar carrito al cerrar modal de éxito');
      cartItems.forEach((item: any) => {
        const productId = item.id || item._id;
        if (typeof updateCartQty === 'function') {
          updateCartQty(productId, 0, 0);
        }
      });
    }
  }, [showSuccessModal, successOrderData]);

  // 🔥 FUNCIÓN PARA OBTENER IMAGEN CON getImageUrl - CORREGIDA (SIN DUPLICADOS)
  const getItemImage = useCallback((item: any) => {
    if (!item) return null;
    
    // 🔥 PRIORIDAD 1: Usar getImageUrl del padre si está disponible
    if (getImageUrlProp) {
      const processed = getImageUrlProp(item);
      if (processed) return processed;
    }
    
    // 🔥 PRIORIDAD 2: Usar getImageUrl de imageUtils
    try {
      const processed = getImageUrl(item);
      if (processed) return processed;
    } catch (e) {
      // Fallback a la lógica manual
    }
    
    // 🔥 PRIORIDAD 3: Buscar en campos específicos del item (NO compartir entre items)
    let rawImg = '';
    
    // 🔥 Buscar en el item actual, NO en otros items
    if (typeof item.coverImage === 'string' && item.coverImage.trim() !== '') {
      rawImg = item.coverImage;
    } else if (typeof item.image === 'string' && item.image.trim() !== '') {
      rawImg = item.image;
    } else if (typeof item.photo === 'string' && item.photo.trim() !== '') {
      rawImg = item.photo;
    } else if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
      const first = item.mediaUrls[0];
      if (typeof first === 'string' && first.trim() !== '') rawImg = first;
      else if (first?.url) rawImg = first.url;
      else if (first?.path) rawImg = first.path;
    } else {
      // 🔥 Buscar en arrays de imágenes del item actual
      const directImages = item.images || item.existingImages || item.fileUrls || item.photos || item.files;
      if (Array.isArray(directImages) && directImages.length > 0) {
        const first = directImages[0];
        if (typeof first === 'string' && first.trim() !== '') rawImg = first;
        else if (first?.url) rawImg = first.url;
        else if (first?.path) rawImg = first.path;
      }
    }

    if (!rawImg) return null;
    if (typeof rawImg !== 'string') rawImg = String(rawImg);
    rawImg = rawImg.trim();
    if (!rawImg) return null;

    rawImg = rawImg.replace(/\\/g, '/');

    const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
    const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      try {
        const urlObj = new URL(rawImg);
        if (urlObj.port && urlObj.port !== '3000') {
          return `${cleanBase}${urlObj.pathname}`;
        }
        return rawImg;
      } catch (e) {
        return rawImg;
      }
    }

    if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) {
      return rawImg;
    }

    if (rawImg.includes('uploads/')) {
      const relativePath = rawImg.split('uploads/').pop();
      return `${cleanBase}/uploads/${relativePath}`;
    }

    const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
    return `${cleanBase}/uploads/${cleanPath}`;
  }, [getImageUrlProp]);

  // 🔥🔥🔥 handleDeliveryChange MODIFICADO para llamar al backend
  const handleDeliveryChange = useCallback(async (data: any) => {
    console.log('📦 [CartSidebar] handleDeliveryChange RECIBIDO:', data);
    const costUsd = Number(data?.costUsd ?? data?.data?.cost ?? 0);
    const activeCompanies = tenantConfig?.delivery?.activeCompanies || [];
    const selectedCompany = data?.selected || '';
    const validExchangeRate = Number(data?.exchangeRate) || 0;

    const isValidDelivery = !isServiceOrder && Boolean(selectedCompany) &&
      (activeCompanies.length === 0 || activeCompanies.includes(selectedCompany)) &&
      Number.isFinite(costUsd) && costUsd >= 0;

    const normalizedData = isValidDelivery
      ? {
          ...data,
          selected: selectedCompany,
          costUsd,
          costVes: validExchangeRate > 0 ? costUsd * validExchangeRate : 0,
          exchangeRate: validExchangeRate,
          data: data?.data || {
            id: selectedCompany,
            name: selectedCompany,
            cost: costUsd,
            days: data?.data?.days || '2-3 días hábiles',
          },
        }
      : {
          selected: '',
          data: null,
          costUsd: 0,
          costVes: 0,
          exchangeRate: validExchangeRate,
        };

    setDeliveryData(normalizedData);
    setSelectedDelivery(normalizedData.selected || '');

    if (createdOrderId && normalizedData.selected) {
      console.log('📦 [CartSidebar] Actualizando delivery en la orden:', createdOrderId);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders/${createdOrderId}/delivery`, {
          method: 'PATCH',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company: normalizedData.selected,
            companyName: normalizedData.data?.name || normalizedData.selected,
            cost: normalizedData.costUsd,
            costUsd: normalizedData.costUsd,
            costVes: normalizedData.costVes,
            exchangeRate: normalizedData.exchangeRate,
            estimatedDays: normalizedData.data?.days || '2-3 días hábiles',
            address: customerAddress,
            selected: true,
          }),
        });

        if (response.ok) {
          const updatedOrder = await response.json();
          console.log('✅ [CartSidebar] Delivery actualizado correctamente:', updatedOrder);

          if (successOrderData) {
            setSuccessOrderData((prev: any) => ({
              ...prev,
              delivery: {
                company: normalizedData.selected,
                companyName: normalizedData.data?.name || normalizedData.selected,
                cost: normalizedData.costUsd,
                costUsd: normalizedData.costUsd,
                costVes: normalizedData.costVes,
                exchangeRate: normalizedData.exchangeRate,
                estimatedDays: normalizedData.data?.days || '2-3 días hábiles',
                address: customerAddress,
                selected: true,
              },
            }));
          }

          triggerGlobalRefresh();
        } else {
          const errorText = await response.text();
          console.error('❌ [CartSidebar] Error al actualizar delivery:', errorText);
        }
      } catch (error) {
        console.error('❌ [CartSidebar] Error en PATCH delivery:', error);
      }
    }
  }, [createdOrderId, customerAddress, isServiceOrder, successOrderData, tenantConfig]);

  const pagoMovilList = 
    pagoMovilListProp ||
    tenantConfig?.paymentMethods?.pagoMovilList || 
    tenantConfig?.specificConfig?.paymentMethods?.pagoMovilList || 
    (pagoMovilData ? [pagoMovilData] : []);

  const selectedPagoMovil = pagoMovilList[selectedPagoMovilIndex] || null;

  const activeMethods =
    tenantConfig?.activePaymentMethods ||
    tenantConfig?.specificConfig?.activePaymentMethods ||
    tenantConfig?.specific_config?.activePaymentMethods ||
    tenantConfig?.paymentMethods?.activePaymentMethods ||
    tenantConfig?.specificConfig?.paymentMethods?.activePaymentMethods ||
    tenantConfig?.specific_config?.paymentMethods?.activePaymentMethods ||
    tenantConfig?.paymentMethods ||
    tenantConfig?.specificConfig?.paymentMethods ||
    ['cash', 'pago_movil'];
      const availablePaymentMethods = getAvailablePaymentMethods(activeMethods, tenantConfig || {});
  const hasValidPaymentMethods = hasAnyPaymentMethodAvailable(activeMethods, tenantConfig || {});

  
  // 🔥 CONSTRUIR MÉTODOS DE PAGO ACTIVOS DESDE tenantConfig (fuente de verdad)
  useEffect(() => {
    if (!isOpen) return;
    if (!tenantConfig) return;

    // 1. Obtener lista de métodos activos desde CUALQUIER ubicación posible
    const rawActive =
      tenantConfig?.specificConfig?.paymentMethods?.activePaymentMethods ||
      tenantConfig?.specific_config?.paymentMethods?.activePaymentMethods ||
      tenantConfig?.paymentMethods?.activePaymentMethods ||
      tenantConfig?.specificConfig?.activePaymentMethods ||
      tenantConfig?.specific_config?.activePaymentMethods ||
      tenantConfig?.activePaymentMethods ||
      ['cash', 'pago_movil'];

    const activeIds: string[] = Array.isArray(rawActive)
      ? rawActive.filter((m: any) => typeof m === 'string')
      : Object.keys(rawActive || {});

    // 2. Config completa de paymentMethods
    const paymentMethodsConfig =
      tenantConfig?.specificConfig?.paymentMethods ||
      tenantConfig?.specific_config?.paymentMethods ||
      tenantConfig?.paymentMethods ||
      {};

    // 3. Mapear cada método activo a un ActivePaymentMethod con sus cuentas
    const builtMethods: ActivePaymentMethod[] = activeIds.map((id: string) => {
      const config = paymentMethodsConfig?.[id] || {};

      let accounts: any[] = [];

      if (id === 'pago_movil') {
        const list = Array.isArray(paymentMethodsConfig?.pagoMovilList)
          ? paymentMethodsConfig.pagoMovilList
          : [];
        accounts = list.map((acc: any) => ({
          id: acc?.id || `${id}-${Math.random()}`,
          type: 'pago_movil',
          bankName: acc?.bank || '',
          phone: acc?.phone || '',
          ciRif: `${acc?.idType || 'V'}${acc?.idNumber || ''}`,
          operator: acc?.operator || '',
        }));
      } else if (id === 'zelle') {
        const list = Array.isArray(paymentMethodsConfig?.zelleList) && paymentMethodsConfig.zelleList.length > 0
          ? paymentMethodsConfig.zelleList
          : (config?.email || config?.emailOrPhone ? [config] : []);
        accounts = list.map((acc: any, i: number) => ({
          id: acc?.id || `zelle-${i}`,
          type: 'zelle',
          email: acc?.email || acc?.emailOrPhone || '',
          holderName: acc?.holderName || '',
        }));
      } else if (id === 'binance') {
        const list = Array.isArray(paymentMethodsConfig?.binanceList) && paymentMethodsConfig.binanceList.length > 0
          ? paymentMethodsConfig.binanceList
          : (config?.email || config?.payId ? [config] : []);
        accounts = list.map((acc: any, i: number) => ({
          id: acc?.id || `binance-${i}`,
          type: 'binance',
          email: acc?.email || '',
          payId: acc?.payId || '',
        }));
      } else if (id === 'paypal') {
        accounts = (config?.email || config?.emailOrLink)
          ? [{ id: 'paypal-0', type: 'paypal', email: config.email || config.emailOrLink, holderName: config.holderName || '' }]
          : [];
      } else if (id === 'wallet') {
        accounts = (config?.address)
          ? [{ id: 'wallet-0', type: 'wallet', address: config.address, network: config.network || '' }]
          : [];
      } else if (id === 'zimli') {
        accounts = (config?.accountId)
          ? [{ id: 'zimli-0', type: 'zimli', accountId: config.accountId }]
          : [];
      } else if (id === 'pos') {
        accounts = (config?.idNumber || config?.accountType)
          ? [{ id: 'pos-0', type: 'pos', idNumber: config.idNumber || '', accountType: config.accountType || '' }]
          : [];
      } else if (id === 'biopago') {
        accounts = (config?.idNumber || config?.bank)
          ? [{ id: 'biopago-0', type: 'biopago', idNumber: config.idNumber || '', bank: config.bank || '' }]
          : [];
      } else if (id === 'cash' || id === 'efectivo') {
        accounts = [{ id: 'cash-0', type: 'cash' }];
      } else {
        accounts = config && Object.keys(config).length > 0
          ? [{ id: `${id}-0`, type: id, ...config }]
          : [];
      }

      return {
        id,
        type: id,
        method: id,
        label: id,
        accounts,
        enabled: true,
      } as any;
    });

    console.log('🔍 [CartSidebar] activePaymentMethods CONSTRUIDOS:', builtMethods);
    console.log('🔍 [CartSidebar] activeIds:', activeIds);
    console.log('🔍 [CartSidebar] paymentMethodsConfig:', paymentMethodsConfig);

    setActivePaymentMethods(builtMethods);
  }, [isOpen, tenantConfig]);

  useEffect(() => {
    if (availablePaymentMethods.length > 0) {
      const defaultMethod = getDefaultPaymentMethod(activeMethods, tenantConfig || {});
      if (defaultMethod && paymentMethod !== defaultMethod) {
        const isCurrentAvailable = availablePaymentMethods.some(m => m.id === paymentMethod);
        if (!isCurrentAvailable) {
          setPaymentMethod(defaultMethod);
        }
      }
    }
  }, [availablePaymentMethods, activeMethods, tenantConfig]);

  const getProductPrices = (product: any) => {
    // 🔥 BUSCAR EN TODAS LAS UBICACIONES POSIBLES
    let pricesObj = product?.prices || product?.attributes?.prices || {};
    if (typeof pricesObj === 'string') {
      try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
    }

    // 🔥 PRIORIDAD: priceVes, price, prices.VES, attributes.prices.VES
    const vesVal = Number(
      product?.priceVes ??           
      product?.price ??               
      pricesObj?.VES ??               
      pricesObj?.ves ??               
      product?.price_ves ??          
      product?.precio ??             
      product?.attributes?.price_ves ?? 
      0
    );

    const usdVal = Number(
      product?.priceUsd ??           
      pricesObj?.USD ??              
      pricesObj?.usd ??              
      product?.price_usd ??          
      product?.attributes?.priceUsd ?? 
      0
    );

    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

    return {
      VES: !isNaN(vesVal) ? vesVal : 0,
      USD: !isNaN(usdVal) ? usdVal : 0,
      ivaType: ivaType,
      ivaRate: ivaRate,
    };
  };

  /**
   * 🔥 OBTENER PRECIOS CON DESCUENTO
   */
/**
 * 🔥 OBTENER PRECIOS CON DESCUENTO
 */
const getDiscountedPrices = (item: any) => {
  if (!item) return null;
  
  const isOnSale = item?.onSale === true || item?.attributes?.onSale === true;
  let discountPercentage = Number(item?.discountPercentage || item?.attributes?.discountPercentage || 0);
  discountPercentage = Math.min(100, Math.max(0, discountPercentage));
  
  if (!isOnSale || discountPercentage === 0) {
    return null;
  }
  
  const prices = getProductPrices(item);
  
  // 🔥 OBTENER EL TIPO DE IVA
  const ivaType = item?.ivaType || item?.attributes?.ivaType || prices.ivaType || 'excluded';
  const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || prices.ivaRate || 16);
  
  // 🔥 CALCULAR PRECIO BASE (SIN IVA) CON DESCUENTO
  const discountedVES = prices.VES * (1 - discountPercentage / 100);
  const discountedUSD = prices.USD * (1 - discountPercentage / 100);
  
  // 🔥 SI ES EXCLUIDO, EL PRECIO CON DESCUENTO DEBE INCLUIR IVA PARA MOSTRAR
  // 🔥 PERO EL PRECIO BASE (SIN IVA) SE USA PARA CALCULAR EL IVA
  let finalVES = discountedVES;
  let finalUSD = discountedUSD;
  
  if (ivaType === 'excluded' && ivaRate > 0) {
    // 🔥 PARA EXCLUIDO: el precio final CON IVA es la base * (1 + IVA)
    finalVES = discountedVES * (1 + ivaRate / 100);
    finalUSD = discountedUSD * (1 + ivaRate / 100);
  } else if (ivaType === 'included' && ivaRate > 0) {
    // 🔥 PARA INCLUIDO: el precio final YA INCLUYE IVA
    // El descuento ya se aplicó a la base, pero el precio final es la base + IVA
    finalVES = discountedVES * (1 + ivaRate / 100);
    finalUSD = discountedUSD * (1 + ivaRate / 100);
  }
  // EXEMPT: no se aplica IVA, finalVES = discountedVES (ya está)
  
  return {
    discountPercentage,
    originalVES: prices.VES,
    originalUSD: prices.USD,
    discountedVES: Math.round(discountedVES * 100) / 100,   // ← BASE (sin IVA) con descuento
    discountedUSD: Math.round(discountedUSD * 100) / 100,   // ← BASE (sin IVA) con descuento
    finalVES: Math.round(finalVES * 100) / 100,             // ← PRECIO FINAL CON IVA (NUEVO)
    finalUSD: Math.round(finalUSD * 100) / 100,             // ← PRECIO FINAL CON IVA (NUEVO)
    ivaType: prices.ivaType,
    ivaRate: prices.ivaRate,
  };
};

  const formatPrice = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getProductReference = (item: any) => {
    return (
      item?.itemId ||
      item?.sku ||
      item?.code ||
      item?.codigo ||
      item?.inventoryId ||
      item?.reference ||
      item?.referencia ||
      ''
    );
  };
const calculateTotals = () => {
  console.log('🧮 [CartSidebar] calculateTotals INICIO');
  let totalUsd = 0;
  let totalVes = 0;
  let totalWithIvaUsd = 0;
  let totalWithIvaVes = 0;
  let totalIvaVes = 0;
  let subtotalWithIva = 0;
  let isExempt = false;
  let isMixed = false;
  let hasIvaProducts = false;
  let hasExemptProducts = false;
  
  const enrichedItems = cartItems.map((item: any) => {
    const quantity = Number(item.quantity || 1);

    if (item?._pricing && typeof item._pricing === 'object') {
      const p = item._pricing;
      const ivaType = p.ivaType || 'excluded';
      const ivaRate = Number(p.ivaRate || 0);

      // 🔥 El precio final (con descuento e IVA si aplica)
      const totalVES = Number(p.totalPriceVES || 0);
      const totalUSD = Number(p.totalPriceUSD || 0);
      const taxVES   = Number(p.taxAmountVES || 0);

      // 🔥 El precio BASE CON descuento, SIN IVA
      // (para 'included': totalVES tiene IVA adentro, extraerlo)
      let baseConDescuentoVES = totalVES;
      let baseConDescuentoUSD = totalUSD;
      if (ivaType === 'included' && ivaRate > 0) {
        baseConDescuentoVES = totalVES / (1 + ivaRate / 100);
        baseConDescuentoUSD = totalUSD / (1 + ivaRate / 100);
      }

      // Acumular en los totales globales
      // ⚠️ totalVes / totalUsd = BASE con descuento, SIN IVA
      totalUsd            += baseConDescuentoUSD * quantity;
      totalVes            += baseConDescuentoVES * quantity;
      totalIvaVes         += taxVES * quantity;
      totalWithIvaVes     += totalVES * quantity;
      totalWithIvaUsd     += totalUSD * quantity;

      if (ivaType !== 'exempt') hasIvaProducts = true;
      else hasExemptProducts = true;

      // Devolver el item "enriquecido" con los valores del backend
      return {
        ...item,
        ivaType,
        ivaRate,
        ivaAmount: taxVES,
        totalWithIva: totalVES * quantity,
        _processedImage: getItemImage(item),
        discountInfo: null,
        effectiveVES: baseConDescuentoVES,
        effectiveUSD: baseConDescuentoUSD,
        _pricingSource: 'backend',
      };
    }

    // 🔴 FLUJO VIEJO: cálculo local (compatibilidad)
    const prices = getProductPrices(item);
    const discountInfo = getDiscountedPrices(item);

    // 🔥 OBTENER EL PRECIO BASE (SIN IVA) DEL PRODUCTO
    // El precio que viene en el carrito PUEDE ser con o sin IVA según el tipo
    let rawPrice = item.effectiveVES || prices.VES;
    
    // 🔥 DETECTAR EL TIPO DE IVA DEL PRODUCTO
    const ivaType = item?.ivaType || item?.attributes?.ivaType || prices.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || prices.ivaRate || 16);
    
    // 🔥 PASO 1: EXTRAER LA BASE (SIN IVA) SIEMPRE
    // Esto asegura que effectiveVES sea SIEMPRE el precio sin IVA
    let basePrice = rawPrice;
    let ivaAmount = 0;
    let priceWithIVA = rawPrice;
    
    if (ivaType === 'included') {
      // 🔥 IVA INCLUIDO: el precio raw YA incluye IVA
      // Extraer la base (sin IVA)
      basePrice = rawPrice / (1 + ivaRate / 100);
      ivaAmount = rawPrice - basePrice;
      priceWithIVA = rawPrice;
    } else if (ivaType === 'excluded') {
      // 🔥 IVA EXCLUIDO: el precio raw ES la base (sin IVA)
      basePrice = rawPrice;
      ivaAmount = rawPrice * (ivaRate / 100);
      priceWithIVA = rawPrice + ivaAmount;
    } else {
      // 🔥 EXENTO: no se aplica IVA
      basePrice = rawPrice;
      ivaAmount = 0;
      priceWithIVA = rawPrice;
    }
    
    // 🔥 PASO 2: APLICAR DESCUENTO A LA BASE (sin IVA)
    let effectiveVES = basePrice;
    let effectiveUSD = item.effectiveUSD || prices.USD;
    
    // Aplicar descuento a la base
    if (discountInfo) {
      // El descuento se aplica a la base (sin IVA)
      effectiveVES = discountInfo.discountedVES;
      effectiveUSD = discountInfo.discountedUSD;
    }
    
    // 🔥 PASO 3: RECALCULAR IVA SOBRE LA BASE CON DESCUENTO
    let finalIvaAmount = 0;
    let finalPriceWithIVA = effectiveVES;
    
    if (ivaType === 'included') {
      // IVA incluido: calcular IVA sobre la base con descuento
      finalIvaAmount = effectiveVES * (ivaRate / 100);
      finalPriceWithIVA = effectiveVES + finalIvaAmount;
    } else if (ivaType === 'excluded') {
      // IVA excluido: sumar IVA a la base con descuento
      finalIvaAmount = effectiveVES * (ivaRate / 100);
      finalPriceWithIVA = effectiveVES + finalIvaAmount;
    } else {
      // Exento: sin IVA
      finalIvaAmount = 0;
      finalPriceWithIVA = effectiveVES;
    }
    
    const itemTotalVes = effectiveVES * quantity;
    const itemTotalUsd = effectiveUSD * quantity;
    
    console.log(`🧮 [CartSidebar] Item: ${item.name}, BASE: ${effectiveVES}, USD: ${effectiveUSD}, IVA: ${finalIvaAmount}, CON IVA: ${finalPriceWithIVA}, qty: ${quantity}`);
    
    totalUsd += itemTotalUsd;
    totalVes += itemTotalVes;
    totalIvaVes += finalIvaAmount * quantity;
    totalWithIvaUsd += effectiveUSD * quantity * (ivaType === 'excluded' ? (1 + ivaRate / 100) : 1);
    totalWithIvaVes += finalPriceWithIVA * quantity;
    
    if (ivaType !== 'exempt') {
      hasIvaProducts = true;
    } else {
      hasExemptProducts = true;
    }
    
    return {
      ...item,
      ivaType: ivaType,
      ivaRate: ivaRate,
      ivaAmount: finalIvaAmount,
      totalWithIva: finalPriceWithIVA * quantity,
      _processedImage: getItemImage(item),
      discountInfo: discountInfo,
      effectiveVES: effectiveVES,  // ✅ SIEMPRE ES LA BASE (SIN IVA)
      effectiveUSD: effectiveUSD,
    };
  });

  isExempt = hasExemptProducts && !hasIvaProducts;
  isMixed = hasExemptProducts && hasIvaProducts;

  let ivaTypeGeneral: 'included' | 'excluded' | 'exempt' | 'mixed' = 'excluded';
  if (isExempt) {
    ivaTypeGeneral = 'exempt';
  } else if (isMixed) {
    ivaTypeGeneral = 'mixed';
  } else if (hasIvaProducts) {
    const allIncluded = cartItems.every((item: any) => {
      const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
      return ivaType === 'included';
    });
    ivaTypeGeneral = allIncluded ? 'included' : 'excluded';
  }

  if (ivaTypeGeneral === 'included') {
    subtotalWithIva = totalVes + totalIvaVes;
    console.log(`🧮 [CartSidebar] IVA incluido - subtotalWithIva = totalVes + totalIvaVes: ${subtotalWithIva}`);
  } else {
    subtotalWithIva = totalVes + totalIvaVes;
    console.log(`🧮 [CartSidebar] IVA excluido/mixto - subtotalWithIva = totalVes + totalIvaVes: ${subtotalWithIva}`);
  }

  console.log(`🧮 [CartSidebar] calculateTotals FINAL: totalVes=${totalVes}, totalUsd=${totalUsd}, totalIvaVes=${totalIvaVes}, isExempt=${isExempt}, isMixed=${isMixed}, ivaTypeGeneral=${ivaTypeGeneral}, subtotalWithIva=${subtotalWithIva}`);
  
  return { 
    totalUsd, 
    totalVes, 
    totalWithIvaUsd,
    totalWithIvaVes,
    totalIvaVes,
    subtotalWithIva,
    isExempt,
    isMixed,
    hasIvaProducts,
    hasExemptProducts,
    enrichedItems,
    ivaTypeGeneral,
  };
};

const { 
  totalUsd: calculatedTotalUsd, 
  totalVes: calculatedTotalVes, 
  totalWithIvaUsd,
  totalWithIvaVes,
  totalIvaVes,
  subtotalWithIva,
  isExempt,
  isMixed,
  enrichedItems,
  ivaTypeGeneral 
} = useMemo(() => calculateTotals(), [cartItems, step, exchangeRate]);
//                                                       👆
//                                            SOLO AGREGA ESTO

  const finalUsd = totalWithIvaUsd;
  const finalVes = totalWithIvaVes;
  const deliveryCostUsd = !isServiceOrder && deliveryData?.selected
    ? Number(deliveryData.costUsd ?? deliveryData.data?.cost ?? 0)
    : 0;
  const validDeliveryCostUsd = Number.isFinite(deliveryCostUsd) && deliveryCostUsd >= 0 ? deliveryCostUsd : 0;
  const deliveryCostVes = !isServiceOrder && Number(deliveryData?.exchangeRate) > 0
    ? validDeliveryCostUsd * Number(deliveryData.exchangeRate)
    : 0;
// 🔥 CALCULAR orderTotalUsd CON DESCUENTO APLICADO
// 🔥 CALCULAR orderTotalUsd CON DESCUENTO APLICADO
const orderTotalUsd = cartItems.reduce((acc, item) => {
  // 🔥 NUEVO: Si el item trae `_pricing`, usar totalPriceUSD del backend
  if (item?._pricing && typeof item._pricing === 'object') {
    const unit = Number(item._pricing.totalPriceUSD || 0);
    return acc + (unit * Number(item.quantity || 1));
  }

  // 🔴 FLUJO VIEJO
  let priceUsd = getProductPrices(item).USD;
  
  const isOnSale = item?.onSale === true || item?.attributes?.onSale === true;
  let discountPercentage = Number(item?.discountPercentage || item?.attributes?.discountPercentage || 0);
  discountPercentage = Math.min(100, Math.max(0, discountPercentage));
  
  if (isOnSale && discountPercentage > 0) {
    priceUsd = priceUsd * (1 - discountPercentage / 100);
  }
  
  const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
  
  let finalPrice = priceUsd;
  if (ivaType === 'excluded' && ivaRate > 0) {
    finalPrice = priceUsd * (1 + ivaRate / 100);
  }
  
  return acc + (finalPrice * (item.quantity || 1));
}, 0) + (deliveryData?.selected ? validDeliveryCostUsd : 0);

// 🔥 orderTotalVes se calcula desde orderTotalUsd
const orderTotalVes = exchangeRate > 0 ? orderTotalUsd * exchangeRate : finalVes + (deliveryData?.selected ? deliveryCostVes : 0);
  console.log('💰 [CartSidebar] finalUsd:', finalUsd);
  console.log('💰 [CartSidebar] finalVes:', finalVes);

  const safePrimary = primary || '#10B981';

  // FUNCIÓN PARA SUBIR COMPROBANTE
  const handleUploadProof = async () => {
    console.log('📤 [CartSidebar] handleUploadProof INICIO');
    if (!proofFile || !createdOrderId) {
      setProofError('No hay archivo seleccionado o orden creada');
      return;
    }

    setIsUploadingProof(true);
    setProofError(null);

    try {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('file', proofFile);

      console.log('📤 [CartSidebar] Subiendo comprobante para orden:', createdOrderId);

      const response = await fetch(`${API_BASE}/orders/${createdOrderId}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir el comprobante');
      }

      const data = await response.json();
      console.log('✅ [CartSidebar] Comprobante subido:', data);

      setProofUrl(data.url);
      setProofUploaded(true);
      setProofFile(null);
      
      const input = document.getElementById('proof-upload') as HTMLInputElement;
      if (input) input.value = '';

    } catch (error: any) {
      console.error('❌ [CartSidebar] Error al subir comprobante:', error);
      setProofError(error.message || 'Error al subir el comprobante');
    } finally {
      setIsUploadingProof(false);
    }
  };

  // NUEVA VERSIÓN: createAutoConversation USANDO chatMessageHandler
  const createAutoConversation = async (orderId: string) => {
    console.log('💬 [createAutoConversation] Iniciando con orderId:', orderId);
    console.log('💬 [createAutoConversation] tenantId:', tenantId);
    console.log('💬 [createAutoConversation] userId prop:', userId);
    
    try {
      let finalUserId = userId;
      if (!finalUserId) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            finalUserId = user.id || user._id || user.userId || user.sub || null;
          }
        } catch (e) {}
      }
      
      if (!finalUserId) {
        console.error('❌ [createAutoConversation] No se pudo obtener userId');
        return;
      }
      
      const clientToken = localStorage.getItem('token') || '';
      if (!clientToken) {
        console.error('❌ [createAutoConversation] No hay token');
        return;
      }

      const paymentConfig = {
        pagoMovil: selectedPagoMovil || null,
        zelle: tenantConfig?.paymentMethods?.zelle || null,
        binance: tenantConfig?.paymentMethods?.binance || null,
        paypal: tenantConfig?.paymentMethods?.paypal || null,
      };

      const result = await sendInitialChatMessage({
        orderId,
        tenantId: tenantId || '',
        userId: finalUserId,
        customerName,
        customerPhone,
        customerEmail: userEmail,
        paymentMethod: paymentMethod as any,
        paymentReference,
        bankSource,
        totalAmount: finalUsd,
        totalAmountVes: finalVes,
        paymentConfig,
        token: clientToken,
      });

      if (result.success) {
        console.log('✅ [CartSidebar] Mensaje automatico enviado correctamente');
        
        if (result.conversationId) {
          setConversationId(result.conversationId);
          console.log('💬 [CartSidebar] conversationId guardado:', result.conversationId);
        }
      } else {
        console.warn('⚠️ [CartSidebar] No se pudo enviar mensaje automatico:', result.message);
      }
      
      triggerGlobalRefresh();
      
    } catch (error) {
      console.error('❌ [CartSidebar] Error al crear conversacion automatica:', error);
    }
  };

  // NUEVA VERSIÓN: sendPaymentNotification USANDO chatMessageHandler
  const sendPaymentNotification = async (orderId: string) => {
    console.log('💬 [sendPaymentNotification] Enviando notificacion de pago para orden:', orderId);
    
    try {
      const token = localStorage.getItem('token') || '';
      if (!token) {
        console.error('❌ [sendPaymentNotification] No hay token');
        return;
      }

      let finalUserId = userId;
      if (!finalUserId) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            finalUserId = user.id || user._id || user.userId || user.sub || null;
          }
        } catch (e) {}
      }
      
      if (!finalUserId) {
        console.error('❌ [sendPaymentNotification] No se pudo obtener userId');
        return;
      }

      let finalConversationId = conversationId;

      if (!finalConversationId) {
        console.log('💬 [sendPaymentNotification] No hay conversationId guardado, creando uno nuevo...');
        
        const createRes = await fetch(`${API_BASE}/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tenantId: tenantId,
            productId: cartItems[0]?.id || null,
          }),
        });

        if (!createRes.ok) {
          console.error('❌ [sendPaymentNotification] Error al crear conversacion');
          return;
        }

        const data = await createRes.json();
        finalConversationId = data.id;
        
        if (!finalConversationId) {
          console.error('❌ [sendPaymentNotification] No se obtuvo conversationId');
          return;
        }
        
        setConversationId(finalConversationId);
      }

      console.log('💬 [sendPaymentNotification] Usando conversationId:', finalConversationId);

      const result = await sendPaymentReportedMessage(orderId, finalConversationId, {
        method: paymentMethod,
        reference: paymentReference || 'N/A',
        amount: finalUsd,
        amountVes: finalVes,
        bank: bankSource,
        clientIdNumber: clientIdNumber,
        clientIdType: clientIdType || 'V',
        clientPhone: clientPhone,
        proofUrl: proofUrl || undefined,
      });

      if (result.success) {
        console.log('✅ [CartSidebar] Notificacion de pago enviada');
        triggerGlobalRefresh();
      } else {
        console.warn('⚠️ [CartSidebar] No se pudo enviar notificacion de pago');
      }

    } catch (error) {
      console.error('❌ [CartSidebar] Error al enviar notificacion de pago:', error);
    }
  };

  // ============================================================
  // 🔥 handleGenerateOrder - CORREGIDO CON userId SEGURO
  // ============================================================
  const handleGenerateOrder = async () => {
    console.log('📦 [CartSidebar] handleGenerateOrder INICIO');
    console.log('📦 [CartSidebar] userId recibido:', userId);
    
    // 🔥 CONGELAR el valor de applyCredit ANTES de cualquier reset
    // (el modal se va a cerrar y disparar onClose, que lo resetea)
    const frozenApplyCredit = applyCredit;
    const frozenCreditBalance = creditBalance;
    applyCreditRef.current = frozenApplyCredit;
    
    console.log('📦 [CartSidebar] applyCredit congelado:', frozenApplyCredit, 'saldo:', frozenCreditBalance);
    
    if (onProcessOrder) {
      setIsSubmitting(true);
      setShowConfirmModal(false);
      
      try {
        let finalUserId = userId;
        
        if (!finalUserId) {
          console.log('🔍 [CartSidebar] userId es null, buscando en localStorage');
          try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);
              finalUserId = user.id || user._id || user.userId || user.sub || null;
              console.log('🔍 [CartSidebar] userId desde localStorage:', finalUserId);
            }
          } catch (e) {
            console.error('❌ [CartSidebar] Error al parsear user de localStorage:', e);
          }
        }
        
        if (!finalUserId) {
          console.log('🔍 [CartSidebar] userId sigue null, intentando desde token');
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              const decoded = JSON.parse(jsonPayload);
              finalUserId = decoded.sub || decoded.id || decoded.userId || null;
              console.log('🔍 [CartSidebar] userId desde token:', finalUserId);
            }
          } catch (e) {
            console.error('❌ [CartSidebar] Error al parsear token:', e);
          }
        }
        
        console.log('✅ [CartSidebar] userId FINAL para la orden:', finalUserId);

// ============================================================
// 🔥 SOLO MANDAR productId Y quantity AL BACKEND
// ============================================================
// El backend calcula TODO (precios, IVA, descuentos) con
// PricingService. El frontend NO manda precios.
// ============================================================
const itemsWithPrices = enrichedItems.map((item: any) => {
  return {
    productId: item.id || item._id,
    quantity: Number(item.quantity || 1),
  };
});

// ============================================================
// 🔥 LOG INFORMATIVO (el backend calcula los descuentos reales)
// ============================================================
console.log('🔍 [CartSidebar] Items a enviar:', itemsWithPrices);

// ============================================================
// 🔥 PAYLOAD AL BACKEND
// ============================================================
// El backend calcula totales. El frontend NO los manda.
        // 🔥 Esperar 150ms para que React sincronice el state del delivery local.
        // Sin esto, si el usuario apretó "Usar" y luego "Reportar Pago" muy rápido,
        // el closure tiene el state viejo (null) y el payload sale con pickup.
        await new Promise((resolve) => setTimeout(resolve, 150));

        // 🔥 Leer el estado MÁS RECIENTE desde el ref (que se llena en handleLocalDeliveryChange)
        const effectiveLocalDeliveryNow =
          localDeliverySelectionRef.current || localDeliverySelection;

        console.log('🎯 [CartSidebar] ESTADO ANTES DE ARMAR PAYLOAD:', {
          localDeliverySelection,
          ref: localDeliverySelectionRef.current,
          effective: effectiveLocalDeliveryNow,
          isServiceOrder,
          buyerLat,
          buyerLng,
        });
const payloadData: any = {
  action: 'create_order',
  tenantId: tenantId || 'default-tenant',
  userId: finalUserId,
  paymentMethodUsed: paymentMethod,
  customerName,
  customerEmail: userEmail,
  customerPhone,
  customerAddress,
  items: itemsWithPrices,
  status: 'PENDING',
  // ⚠️ NO mandar: totalAmount, totalUsd, totalVes,
  //              discountTotal, hasDiscount, discountPercentage
  // El backend los calcula con PricingService.

  // 🔥 SALDO A FAVOR: usar el valor CONGELADO (no el estado que puede estar reseteado)
  ...(applyCreditRef.current && frozenCreditBalance > 0
    ? { applyCreditBalance: true }
    : {}),

  // 🔥 VUELTO: si el comprador eligió cómo quiere recibirlo, mandarlo
  // (el backend lo persiste en paymentMetadata.change.deliveryPreference)
  ...(paymentMethod === 'cash' && changeDeliveryPreference
    ? { changeDeliveryPreference }
    : {}),
};

console.log('📦 [CartSidebar] ===== DIAGNÓSTICO DE ENVÍO =====');
console.log('📦 [CartSidebar] selectedDelivery:', selectedDelivery);
console.log('📦 [CartSidebar] deliveryData:', deliveryData);
console.log('📦 [CartSidebar] userId en payload:', finalUserId);
console.log('📦 [CartSidebar] tenantId en payload:', payloadData.tenantId);
console.log('📦 [CartSidebar] items a enviar:', payloadData.items.length);
console.log('📦 [CartSidebar] ℹ️  El backend calculará precios, IVA y totales.');
        
        if (selectedDelivery && deliveryData?.data && !isServiceOrder) {
          payloadData.delivery = {
            company: selectedDelivery,
            companyName: deliveryData.data.name || deliveryData.data.companyName || selectedDelivery,
            cost: validDeliveryCostUsd,
            costUsd: validDeliveryCostUsd,
            costVes: deliveryCostVes,
            exchangeRate: Number(deliveryData.exchangeRate) || 0,
            estimatedDays: deliveryData.data.days || '2-3 días hábiles',
            address: customerAddress,
            selected: true,
          };        }

        // ============================================================
        // 🔥 FULFILLMENT (estándar UCP)
        // ============================================================
        // Reglas:
        //   1. Si el comprador eligió 'local' y el LocalDeliveryBlock
        //      está activo → fulfillment = 'delivery' + coords.
        //   2. Si eligió 'shipping' → fulfillment = 'shipping' + delivery.
        //   3. Si eligió 'pickup' o no eligió nada → 'pickup'.
        // ============================================================
        if (!isServiceOrder) {
          if (buyerLat != null && buyerLng != null) {
            payloadData.buyerLat = Number(buyerLat);
            payloadData.buyerLng = Number(buyerLng);
          }

          const effectiveLocalDelivery = effectiveLocalDeliveryNow;

          if (deliveryMethodChoice === 'local' && effectiveLocalDelivery?.enabled) {
            // Delivery local activo
            payloadData.fulfillment = 'delivery';
            payloadData.deliveryFeeLocalUsd = effectiveLocalDelivery.fee;
            payloadData.deliveryDistanceKm = effectiveLocalDelivery.distanceKm;
            payloadData.deliveryEtaMinutes = effectiveLocalDelivery.etaMinutes;
            console.log('🎯 [CartSidebar] ✅ fulfillment = delivery', effectiveLocalDelivery);
          } else if (deliveryMethodChoice === 'shipping' && selectedDelivery && deliveryData?.data) {
            // Encomienda
            payloadData.fulfillment = 'shipping';
            console.log('🎯 [CartSidebar] ✅ fulfillment = shipping', {
              selectedDelivery,
              costUsd: deliveryData.costUsd,
            });
          } else {
            // Pickup o sin elección
            payloadData.fulfillment = 'pickup';
            console.log('🎯 [CartSidebar] ⚠️ fulfillment = pickup', {
              deliveryMethodChoice,
              effectiveLocalDelivery: effectiveLocalDelivery?.enabled,
            });
          }
        }

        console.log('📦 [CartSidebar] Enviando payloadData completo:', JSON.stringify(payloadData, null, 2));
        
        const response = await onProcessOrder(payloadData);
        console.log('📦 [CartSidebar] Respuesta de onProcessOrder:', response);
        
        const assignedId = 
          response?.id || 
          response?.orderId || 
          response?._id || 
          (typeof response === 'string' ? response : null) || 
          ('ORD-' + Date.now());

        console.log('✅ [CartSidebar] orderId asignado:', assignedId);

        setCreatedOrderId(assignedId);
        createdOrderIdRef.current = assignedId;
        setStep('waiting_payment');
        setConfirmedData(false);
        // 🔥 NO resetear applyCredit todavía: CartPaymentStep lo necesita

        setProofFile(null);
        setProofPreview(null);
        setProofError(null);
        setProofUploaded(false);
        setProofUrl(null);

        // 🔥 NO resetear applyCredit: el CartPaymentStep lo necesita para mostrar el descuento
        // Se resetea solo al cerrar el modal / carrito
        
        if (assignedId && finalUserId && tenantId) {
          console.log('💬 [CartSidebar] Creando conversación automática...');
          await createAutoConversation(assignedId);
        } else {
          console.warn('⚠️ [CartSidebar] No se creó conversación: assignedId=', assignedId, 'finalUserId=', finalUserId, 'tenantId=', tenantId);
        }
        
        triggerGlobalRefresh();
        
      } catch (error) {
        console.error("❌ [CartSidebar] Excepción al generar la orden:", error);
      } finally {
        setIsSubmitting(false);
        console.log('📦 [CartSidebar] handleGenerateOrder FIN');
      }
    }
  };

  // ============================================================
  // 🔥 handleSubmitPaymentReport - CORREGIDO Y MOVIDO ANTES DEL RETURN
  // ============================================================
  const handleSubmitPaymentReport = async () => {
    console.log('💳 [CartSidebar] handleSubmitPaymentReport INICIO');
    console.log('💳 [CartSidebar] createdOrderId:', createdOrderId);
    console.log('💳 [CartSidebar] finalVes:', finalVes);
    console.log('💳 [CartSidebar] finalUsd:', finalUsd);
    
    if (onProcessOrder) {
      setIsSubmitting(true);
      try {
const paymentPayload: any = {
  action: 'submit_payment',
  id: createdOrderId,         
  orderId: createdOrderId,    
  paymentMethod,
  bankSource,
  paymentReference,
  status: paymentMethod === 'cash' ? 'CONFIRMED' : 'por_verificar',
  // 🔥 CÉDULA Y TELÉFONO DEL CLIENTE (quien paga)
  clientIdNumber: clientIdNumber,
  clientIdType: clientIdType || 'V',
  clientPhone: clientPhone,
  customerPhone: clientPhone,
  // 🔥 Si es efectivo, incluir moneda + monto entregado
  ...(paymentMethod === 'cash'
    ? {
        cashCurrency,
        cashAmount,
        changeResolution,
        ...(changeDeliveryPreference
          ? { changeDeliveryPreference }
          : {}),
      }
    : {}),
};

// 🔥 AGREGAR paymentMetadata CON TODOS LOS DATOS
paymentPayload.paymentMetadata = {
  source: 'web',
  exchangeRate: Number(deliveryData?.exchangeRate) || 0,
  // 🔥 DATOS DEL CLIENTE QUE REPORTA EL PAGO
  clientIdNumber: clientIdNumber,
  clientIdType: clientIdType || 'V',
  clientPhone: clientPhone,
  // 🔥 DATOS DEL PAGO
  bankSource: bankSource,
  paymentReference: paymentReference,
};

// 🔥 SI ES PAGO MÓVIL, AGREGAR DATOS DEL COMERCIO
if (paymentMethod === 'pago_movil' && selectedPagoMovil) {
  paymentPayload.paymentMetadata.merchantId = selectedPagoMovil.idNumber || '';
  paymentPayload.paymentMetadata.merchantPhone = selectedPagoMovil.phone || '';
  paymentPayload.paymentMetadata.merchantOperator = selectedPagoMovil.operator || '';
  paymentPayload.paymentMetadata.idType = selectedPagoMovil.idType || 'V';
  paymentPayload.paymentMetadata.bank = selectedPagoMovil.bank || '';
  paymentPayload.paymentMetadata.bankName = getBankLabel(selectedPagoMovil.bank) || '';
}

if (paymentMethod === 'zelle') {
  paymentPayload.senderEmail = senderEmail;
}

if (paymentMethod === 'pos') {
  paymentPayload.clientIdNumber = clientIdNumber;
  paymentPayload.clientAccountType = clientAccountType;
}

if (paymentMethod === 'biopago') {
  paymentPayload.clientIdNumber = clientIdNumber;
}

if (proofUrl) {
  paymentPayload.paymentProof = proofUrl;
}

        console.log('💳 [CartSidebar] paymentPayload enviado:', JSON.stringify(paymentPayload, null, 2));

        const submitResponse = await onProcessOrder(paymentPayload);

        // 🔥 Leer el `change` que devolvió el backend
        // (el backend ya lo calculó y lo guardó en paymentMetadata.change)
        const changeFromBackend =
          submitResponse?.paymentMetadata?.change ||
          submitResponse?.order?.paymentMetadata?.change ||
          null;

        
        // ============================================================
        // 🔥 DELIVERY LOCAL: actualizar fulfillment en la orden existente
        // (la orden se creó con pickup; ahora actualizamos a delivery)
        // ============================================================
        const effectiveLocalDelivery =
          localDeliverySelectionRef.current || localDeliverySelection;

        if (
          !isServiceOrder &&
          effectiveLocalDelivery?.enabled &&
          createdOrderId
        ) {
          try {
            const token = localStorage.getItem('token');
            const localDeliveryPayload = {
              fulfillment: 'delivery',
              buyerLat: Number(buyerLat),
              buyerLng: Number(buyerLng),
              deliveryFeeLocalUsd: effectiveLocalDelivery.fee,
              deliveryDistanceKm: effectiveLocalDelivery.distanceKm,
              deliveryEtaMinutes: effectiveLocalDelivery.etaMinutes,
            };

            console.log('🎯 [CartSidebar] PATCH local-delivery:', localDeliveryPayload);

            const res = await fetch(
              `${API_BASE}/orders/${createdOrderId}/local-delivery`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(localDeliveryPayload),
              },
            );

            if (res.ok) {
              const updated = await res.json();
              console.log('✅ [CartSidebar] Orden actualizada a delivery:', updated);
            } else {
              const errText = await res.text();
              console.warn('⚠️ [CartSidebar] No se pudo actualizar delivery:', errText);
            }
          } catch (e) {
            console.warn('⚠️ [CartSidebar] Error al actualizar delivery:', e);
          }
        }
            // 🔥 Si es efectivo y hay vuelto, resolver qué hacer con él
        // 🔥 PERO SOLO si la orden tiene paymentBreakdown (pago mixto).
        //    El endpoint /resolve-change solo funciona para pagos mixtos.
        const orderIdForResolve = createdOrderIdRef.current || createdOrderId;
        if (paymentMethod === 'cash' && orderIdForResolve) {
          try {
            // 🔥 Primero verificar si la orden tiene paymentBreakdown
            const token = localStorage.getItem('token');
            const orderRes = await fetch(`${API_BASE}/orders/${orderIdForResolve}`, {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
              },
            });

            let hasBreakdown = false;
            if (orderRes.ok) {
              const orderData = await orderRes.json();
              hasBreakdown = !!orderData?.paymentBreakdown;
            }

            // 🔥 Solo llamar a resolve-change si hay breakdown (pago mixto)
            if (hasBreakdown) {
              const resolveRes = await fetch(`${API_BASE}/orders/${orderIdForResolve}/resolve-change`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  resolution: changeResolution,
                  notes: changeResolution === 'credit'
                    ? 'Cliente eligió acreditar el vuelto como saldo a favor'
                    : changeResolution === 'rounded'
                    ? 'Cliente decidió no recibir el vuelto'
                    : 'Cliente pidió el vuelto en efectivo',
                }),
              });
              if (!resolveRes.ok) {
                const errText = await resolveRes.text();
                console.warn('⚠️ [CartSidebar] No se pudo resolver el vuelto:', errText);
              } else {
                const resolvedOrder = await resolveRes.json();
                console.log('✅ [CartSidebar] Vuelto resuelto:', resolvedOrder?.paymentBreakdown?.change);
              }
            } else {
              // 🔥 Efectivo simple: no hay breakdown → no hay nada que resolver
              // El vuelto se maneja en el local al entregar el efectivo.
              console.log('ℹ️ [CartSidebar] Efectivo simple: no hay paymentBreakdown, no se llama a resolve-change');
            }
          } catch (resolveErr) {
            console.warn('⚠️ [CartSidebar] Error al resolver el vuelto:', resolveErr);
          }
        }    
        if (createdOrderId) {
          console.log('💬 [CartSidebar] Enviando notificación de pago...');
          await sendPaymentNotification(createdOrderId);
        }
        
        console.log('🔍 🔥🔥🔥 [CartSidebar] ===== DEBUG FINAL =====');
        console.log('🔍 [CartSidebar] finalVes:', finalVes);
        console.log('🔍 [CartSidebar] calculatedTotalVes:', calculatedTotalVes);
        console.log('🔍 [CartSidebar] cartItems:', JSON.stringify(cartItems, null, 2));
        console.log('🔍 [CartSidebar] ===== FIN DEBUG =====');
        
        // 🔥 Calcular el descuento por saldo a favor
        const creditAppliedFinalVes = applyCredit && creditBalance > 0
          ? Math.min(creditBalance, finalVes)
          : 0;
        const creditAppliedFinalUsd = exchangeRate > 0
          ? creditAppliedFinalVes / exchangeRate
          : 0;

        setSuccessOrderData({
          id: createdOrderId,
          customerName,
          customerPhone,
          customerEmail: userEmail,
          customerAddress,
          totalAmount: Math.max(0, finalUsd - creditAppliedFinalUsd),
          totalAmountVes: Math.max(0, finalVes - creditAppliedFinalVes),
          // 🔥 Saldo a favor aplicado (para mostrarlo en el modal)
          creditAppliedVes: creditAppliedFinalVes,
          creditAppliedUsd: creditAppliedFinalUsd,
          paymentMethodUsed: paymentMethod,
          paymentReference,
          bankSource: bankSource,
          clientIdNumber: clientIdNumber,
          clientIdType: clientIdType || 'V',
          clientPhone: clientPhone,
          paymentProof: proofUrl,
          selectedDelivery: selectedDelivery,
          // 🔥 Si fue efectivo, guardar moneda + monto entregado
          ...(paymentMethod === 'cash'
            ? {
                cashCurrency,
                cashAmount,
                // 🔥 VUELTO: detalle completo (resolución + preferencia)
                ...(changeFromBackend
                  ? { change: changeFromBackend }
                  : {}),
              }
            : {}),

          // 🔥 DELIVERY LOCAL + ENCOMIENDA — para el OrderSuccessModal
          fulfillment: localDeliverySelection?.enabled
            ? 'delivery'
            : (selectedDelivery && deliveryData?.data
                ? 'shipping'
                : 'pickup'),
          localDelivery: localDeliverySelection?.enabled
            ? {
                fee: localDeliverySelection.fee,
                distanceKm: localDeliverySelection.distanceKm,
                etaMinutes: localDeliverySelection.etaMinutes,
              }
            : null,
            
          items: enrichedItems.map((item: any) => {
            const image = getItemImage(item);

            // 🔥 Si el item trae `_pricing`, pasarlo + derivar discountInfo
            if (item?._pricing && typeof item._pricing === 'object') {
              const p = item._pricing;
              const discountInfo = p.hasDiscount ? {
                discountPercentage: Number(p.discountPercentage || 0),
                originalVES: Number(p.originalPriceVES || 0),
                originalUSD: Number(p.originalPriceUSD || 0),
                discountedVES: Number(p.totalPriceVES || 0),
                discountedUSD: Number(p.totalPriceUSD || 0),
              } : null;

              return {
                name: item.name || item.title || 'Producto',
                quantity: Number(item.quantity || 1),
                image: image,
                type: item.type || 'product',
                _pricing: p,
                discountInfo,   // ← 🔥 para que el modal muestre la oferta
              };
            }

            // 🔴 FLUJO VIEJO
            const prices = getProductPrices(item);
            const ivaType = item?.ivaType ||
                            item?.attributes?.ivaType ||
                            prices.ivaType ||
                            'excluded';
            const ivaRate = Number(item?.ivaRate ||
                                  item?.attributes?.ivaRate ||
                                  prices.ivaRate ||
                                  16);
            return {
              name: item.name || item.title || 'Producto',
              quantity: Number(item.quantity || 1),
              price: prices.USD,
              priceUsd: prices.USD,
              priceVes: prices.VES,
              image: image,
              ivaType: ivaType,
              ivaRate: ivaRate,
              prices: prices,
              discountInfo: item.discountInfo || null,
            };
          }),
          createdAt: new Date().toISOString(),
        });
        
        console.log('✅ [CartSidebar] successOrderData guardado:', successOrderData);
        
        setShowSuccessModal(true);
        
        triggerGlobalRefresh();
        
      } catch (error) {
        console.error("❌ [CartSidebar] Excepción al reportar pago:", error);
      } finally {
        setIsSubmitting(false);
        console.log('💳 [CartSidebar] handleSubmitPaymentReport FIN');
      }
    }
  };



  const copyPaymentData = () => {
    if (!selectedPagoMovil) return;
    
    const textToCopy = `Banco: ${getBankLabel(selectedPagoMovil.bank)}\nTeléfono: ${selectedPagoMovil.operator || ''}${selectedPagoMovil.phone || ''}\nRIF/Cédula: ${selectedPagoMovil.idType || 'V'}-${selectedPagoMovil.idNumber || ''}\nMonto: Bs. ${formatPrice(finalVes)}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => alert('Datos de pago copiados al portapapeles'))
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            alert('Datos de pago copiados al portapapeles');
          } catch (err) {
            console.error('Error al copiar con fallback:', err);
            alert('No se pudo copiar automaticamente.');
          }
          document.body.removeChild(textArea);
        });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Datos de pago copiados al portapapeles');
      } catch (err) {
        console.error('Error al copiar con fallback:', err);
        alert('No se pudo copiar automaticamente.');
      }
      document.body.removeChild(textArea);
    }
  };

  // EXTRAER workModality Y deliveryType DE tenantConfig
  const workModality = tenantConfig?.workModality || tenantConfig?.work_modality || 'local';
  const deliveryType = tenantConfig?.deliveryType || tenantConfig?.delivery_type || 'retiro_local';

  console.log('[CartSidebar] workModality:', workModality);
  console.log('[CartSidebar] deliveryType:', deliveryType);

  // ============================================================
  // 🔥 HANDLER: REPORTAR PAGO MIXTO (Fase 2)
  // ============================================================
  const handleSubmitBreakdown = async (payload: CreatePaymentBreakdownPayload) => {
    if (!createdOrderId) {
      throw new Error('No hay orden creada para reportar el pago');
    }
    setIsSubmittingBreakdown(true);
    setBreakdownError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/orders/${createdOrderId}/payment-breakdown`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al reportar el pago');
      }

      const updatedOrder = await response.json();
      console.log('✅ [CartSidebar] Payment breakdown reportado:', updatedOrder);

      setIsMixedPaymentOpen(false);

      // Notificación de chat (reutiliza la que ya existe)
      if (createdOrderId) {
        try {
          await sendPaymentNotification(createdOrderId);
        } catch (e) {
          console.warn('⚠️ [CartSidebar] No se pudo enviar notificación de pago mixto:', e);
        }
      }

      // Preparar el successOrderData para el modal de éxito
      setSuccessOrderData({
        id: createdOrderId,
        customerName,
        customerPhone,
        customerEmail: userEmail,
        customerAddress,
        totalAmount: finalUsd,
        totalAmountVes: finalVes,
        paymentMethodUsed: 'pago_mixto',
        items: enrichedItems.map((item: any) => {
          const image = getItemImage(item);
          return {
            name: item.name || item.title || 'Producto',
            quantity: Number(item.quantity || 1),
            image: image,
            type: item.type || 'product',
            _pricing: item._pricing,
          };
        }),
        createdAt: new Date().toISOString(),
      });
      setShowSuccessModal(true);
      triggerGlobalRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al reportar el pago';
      setBreakdownError(message);
      throw err;
    } finally {
      setIsSubmittingBreakdown(false);
    }
  };

  // ============================================================
  // 🔥 HANDLER: RESOLVER VUELTO (SOLO ADMIN — no aplica al comprador)
  // ============================================================
  // El comprador NO resuelve el vuelto. Se deja el handler por
  // completitud, pero el prop canResolveChange queda en false.
  // ============================================================
  const handleResolveChange = async (
    _resolution: ChangeResolutionType,
    _notes?: string,
  ) => {
    console.warn('[CartSidebar] El comprador no puede resolver el vuelto');
    return;
  };

  if (!isOpen) return null;

  const resolvedTextMain = textMainClass || (isSecondaryLight ? 'text-slate-900' : 'text-slate-100');
  const resolvedTextMuted = textMutedClass || (isSecondaryLight ? 'text-slate-500' : 'text-slate-400');
  const borderDynamic = isSecondaryLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  const containerStyle = { 
    backgroundColor: secondary || (isSecondaryLight ? '#ffffff' : '#0f172a'), 
    borderColor: borderDynamic, 
  };
  
  const dynamicSubCardStyle = {
    backgroundColor: isSecondaryLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: borderDynamic,
  };

  const hasValidPaymentMethodsLegacy = (() => {
    const hasPagoMovil = pagoMovilList && pagoMovilList.length > 0;
    const hasZelle = tenantConfig?.paymentMethods?.zelle || tenantConfig?.specificConfig?.paymentMethods?.zelle;
    const hasEfectivo = true;
    return hasPagoMovil || hasZelle || hasEfectivo;
  })();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className={`w-screen max-w-md border-l shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 ${resolvedTextMain}`}
          style={containerStyle}
        >
          
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="p-2.5 rounded-2xl shadow-sm flex items-center justify-center"
                style={{ backgroundColor: `${safePrimary}15`, color: safePrimary }}
              >
                <ShoppingBag className="w-5 h-5" style={{ color: safePrimary }} />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight ${resolvedTextMain}`}>
                  {step === 'cart' ? 'Tu Carrito de Compras' : 'Realizar Pago de la Orden'}
                </h2>
                <p className={`text-xs font-medium ${resolvedTextMuted}`}>
                  {step === 'cart' ? 'Resumen y datos de entrega' : `Orden #${createdOrderId || 'Generada'}`}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setApplyCredit(false);
                onClose();
              }}
              className={`p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 ${resolvedTextMain}`}
              style={dynamicSubCardStyle}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* FASE 1: VISTA DE CARRITO */}
          {step === 'cart' && (
            <>
              <CartItemsList
                cartItems={enrichedItems}
                updateCartQty={updateCartQty}
                removeFromCart={removeFromCart}
                onOpenPreview={onOpenPreview}
                isSecondaryLight={safeIsSecondaryLight}
                resolvedTextMain={resolvedTextMain}
                resolvedTextMuted={resolvedTextMuted}
                borderDynamic={borderDynamic}
                dynamicSubCardStyle={dynamicSubCardStyle}
                safePrimary={safePrimary}
                getProductPrices={getProductPrices}
                formatPrice={formatPrice}
                getItemImage={getItemImage}
                getProductReference={getProductReference}
              />

              <CartFooter
                cartItems={enrichedItems}
                customerName={customerName}
                customerPhone={customerPhone}
                customerEmail={userEmail}
                customerAddress={customerAddress}
                setCustomerName={setCustomerName}
                setCustomerPhone={setCustomerPhone}
                setCustomerAddress={setCustomerAddress}
                finalVes={finalVes}
                finalUsd={finalUsd}
                formatPrice={formatPrice}
                isSecondaryLight={safeIsSecondaryLight}
                isPrimaryLight={safeIsPrimaryLight}
                safePrimary={safePrimary}
                borderDynamic={borderDynamic}
                resolvedTextMain={resolvedTextMain}
                resolvedTextMuted={resolvedTextMuted}
                tenantConfig={tenantConfig}
                isSubmitting={isSubmitting}
                hasValidPaymentMethods={hasValidPaymentMethods}
                onGenerateOrder={() => {
                  if (!hasValidPaymentMethods) {
                    alert('La tienda no tiene metodos de pago configurados. Contacta al administrador.');
                    return;
                  }
                  setShowConfirmModal(true);
                }}
                isStoreOpen={isStoreOpen}
                storeClosedMessage={storeClosedMessage}
                cartQuote={cartQuote}
              />
            </>
          )}

          {/* FASE 2: ORDEN CREADA - SELECCIÓN DE PAGO */}
          {/* FASE 2: ORDEN CREADA - SELECCIÓN DE PAGO */}
          {step === 'waiting_payment' && (
<CartPaymentStep
  createdOrderId={createdOrderId}
  paymentMethod={paymentMethod}
  setPaymentMethod={setPaymentMethod}
  bankSource={bankSource}
  setBankSource={setBankSource}
  paymentReference={paymentReference}
  setPaymentReference={setPaymentReference}
  isSubmitting={isSubmitting}
  onBack={() => setStep('cart')}
  onSubmit={handleSubmitPaymentReport}
  selectedPagoMovil={selectedPagoMovil}
  pagoMovilList={pagoMovilList}
  selectedPagoMovilIndex={selectedPagoMovilIndex}
  setSelectedPagoMovilIndex={setSelectedPagoMovilIndex}
  finalVes={finalVes}
  formatPrice={formatPrice}
  isSecondaryLight={safeIsSecondaryLight}
  isPrimaryLight={safeIsPrimaryLight}
  safePrimary={safePrimaryColor}
  borderDynamic={borderDynamic}
  resolvedTextMain={resolvedTextMain}
  resolvedTextMuted={resolvedTextMuted}
  getBankName={getBankLabel}
    copyPaymentData={copyPaymentData}
  availablePaymentMethods={availablePaymentMethods}
  tenantConfig={tenantConfig}
  senderEmail={senderEmail}
  setSenderEmail={setSenderEmail}
  clientIdNumber={clientIdNumber}
  clientPhone={clientPhone}
  setClientPhone={setClientPhone}
  setClientIdNumber={setClientIdNumber}
  clientAccountType={clientAccountType}
  setClientAccountType={setClientAccountType}
  proofFile={proofFile}
  setProofFile={setProofFile}
  proofPreview={proofPreview}
  setProofPreview={setProofPreview}
  proofError={proofError}
  setProofError={setProofError}
  isUploadingProof={isUploadingProof}
  setIsUploadingProof={setIsUploadingProof}
  onUploadProof={handleUploadProof}
  selectedDelivery={selectedDelivery}
  setSelectedDelivery={(value) => {
    console.log('📦 [CartSidebar] setSelectedDelivery llamado con:', value);
    setSelectedDelivery(value);
  }}
  onDeliveryChange={handleDeliveryChange}
  textColor={resolvedTextMain}
  orderType="product"
  ivaPercentage={0.16}
  isIvaExempt={isExempt}
  isIvaMixed={isMixed}
  ivaAmount={totalIvaVes}
  subtotalWithIva={subtotalWithIva}
  ivaTypeGeneral={ivaTypeGeneral}
  workModality={workModality}
  deliveryType={deliveryType}
  customerAddress={customerAddress}
  setCustomerAddress={setCustomerAddress}
  addressPlaceholder={customerAddress || 'Direccion exacta o zona de delivery'}
  cartItems={enrichedItems}
  hasDiscount={enrichedItems.some((item: any) => item.discountInfo)}
  cartQuote={cartQuote}
  onOpenMixedPayment={() => {
    setBreakdownError(null);
    setIsMixedPaymentOpen(true);
  }}
  cashCurrency={cashCurrency}
  onCashCurrencyChange={setCashCurrency}
  cashAmount={cashAmount}
  onCashAmountChange={setCashAmount}
  onChangeResolution={setChangeResolution}
  onChangeDeliveryPreference={setChangeDeliveryPreference}
  buyerProfileData={{
    idNumber: clientIdNumber || undefined,
    idType: (clientIdType as 'V' | 'E' | 'J' | 'G' | 'P') || undefined,
    phone: clientPhone || undefined,
  }}
  creditBalance={creditBalance}
  applyCredit={applyCredit || applyCreditRef.current}
  onApplyCreditChange={setApplyCredit}
  // 🔥 DELIVERY LOCAL (facilito)
  tenantSlug={tenant?.slug || null}
  buyerLat={buyerLat}
  buyerLng={buyerLng}
  onLocalDeliveryChange={handleLocalDeliveryChange}
  onDeliveryMethodChange={setDeliveryMethodChoice}
    onRequestLocation={async () => {
    try {
      await requestBrowserLocation();
    } catch (e) {
      console.warn('⚠️ [CartSidebar] No se pudo pedir la ubicación:', e);
    }
  }}
/>
          )}

        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
<CartConfirmModal
  isOpen={showConfirmModal}
  onClose={() => {
    setShowConfirmModal(false);
    setConfirmedData(false);
    // 🔥 NO resetear applyCredit acá: se necesita en handleGenerateOrder
  }}
  onConfirm={handleGenerateOrder}
  isSubmitting={isSubmitting}
  confirmedData={confirmedData}
  setConfirmedData={setConfirmedData}
  cartItems={enrichedItems}
  customerName={customerName}
  customerPhone={customerPhone}
  customerAddress={customerAddress}
  customerEmail={userEmail}
  selectedDelivery={selectedDelivery}
  delivery={deliveryData}
  finalVes={finalVes}
  finalUsd={finalUsd}
  formatPrice={formatPrice}
  isSecondaryLight={safeIsSecondaryLight}
  safePrimary={safePrimaryColor}
  borderDynamic={borderDynamic}
  resolvedTextMain={resolvedTextMain}
  resolvedTextMuted={resolvedTextMuted}
  containerBgColor={secondary || (isSecondaryLight ? '#ffffff' : '#0f172a')}
  cartQuote={cartQuote}
  creditBalance={creditBalance}
  applyCredit={applyCredit}
  onApplyCreditChange={setApplyCredit}
/>

      {/* MODAL DE ÉXITO */}
      {showSuccessModal && successOrderData && (
        <OrderSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setApplyCredit(false);
            applyCreditRef.current = false;
            onClose();
          }}
          orderData={successOrderData}
          
          tenant={tenant}
          primary={safePrimary}
      
          secondary={secondary || '#0f172a'}
          isSecondaryLight={safeIsSecondaryLight}
          textMainClass={resolvedTextMain}
          textMutedClass={resolvedTextMuted}
        />
      )}

      {/* 🔥 SUBMODAL DE PAGO MIXTO (Fase 2) */}
      {isMixedPaymentOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => {
            if (!isSubmittingBreakdown) {
              setIsMixedPaymentOpen(false);
              setBreakdownError(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: containerStyle.backgroundColor,
              borderColor: borderDynamic,
              color: resolvedTextMain,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: resolvedTextMain }}>
                  Pago mixto
                </h3>
                <p className={`text-xs mt-0.5 ${resolvedTextMuted}`}>
                  Divide el pago entre varios métodos. El sistema calcula el vuelto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingBreakdown) {
                    setIsMixedPaymentOpen(false);
                    setBreakdownError(null);
                  }
                }}
                disabled={isSubmittingBreakdown}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer hover:opacity-70 disabled:opacity-40`}
                style={{ borderColor: borderDynamic, color: resolvedTextMain }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PaymentBreakdown
              mode="report"
              totalVes={finalVes}
              exchangeRate={exchangeRate}
              activeMethods={activePaymentMethods}
              primary={safePrimaryColor}
              secondary={secondary}
              textColor={resolvedTextMain}
              isDarkBg={!isSecondaryLight}
              borderColor={borderDynamic}
              cardBg={
                isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)'
              }
              onSubmit={handleSubmitBreakdown}
              onResolveChange={handleResolveChange}
              canResolveChange={false}
              isSubmitting={isSubmittingBreakdown}
              submitError={breakdownError}
              hideTitle
            />
          </div>
        </div>
      )}

    </div>
  );
}