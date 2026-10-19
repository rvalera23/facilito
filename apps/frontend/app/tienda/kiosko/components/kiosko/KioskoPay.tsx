  'use client';

  import React, { useState, useEffect } from 'react';
    import {
    X,
    Smartphone,
    CreditCard,
    Banknote,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
    ShieldCheck,
    Copy,
    Check,
    ArrowLeft,
  } from 'lucide-react';
  import { useKioskContext } from './KioskStoreLayout';
  import { useKioskSession } from '../../contexts/KioskSessionContext';
  // 🔥 IMPORTAR MODALES
  import KioskoConfirmModal from './KioskoConfirmModal';
  import KioskoSuccessModal from './KioskoSuccessModal';
  import KioskoCashPayment from './KioskoCashPayment';

  // 🔥 IMPORTAR CONSTANTES CENTRALIZADAS
  import { 
    PHONE_OPERATORS, 
    ID_TYPES 
  } from '@/app/onboarding/components/step-contact-account/paymentConstants';
  // 🔥 BANKS - fuente única de verdad
  import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
    import SearchableDropdown from '@/components/ui/SearchableDropdown';

  // 🔥 FUNCIÓN UTILITARIA PARA CALCULAR PRECIO CON IVA Y DESCUENTO (Kiosco)
const getProductPriceWithIVAAndDiscount = (product: any, exchangeRate: number) => {
  if (!product) return null;

  // ============================================================
  // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
  // ============================================================
  if (product?._pricing && typeof product._pricing === 'object') {
    const p = product._pricing;
    const ivaType = p.ivaType || 'excluded';
    const ivaRate = Number(p.ivaRate || 0);
    const hasDiscount = p.hasDiscount === true;
    const discountPercentage = Number(p.discountPercentage || 0);

    return {
      baseVes: Number(p.basePriceVES || 0),
      baseUsd: Number(p.basePriceUSD || 0),
      discountedBaseVes: Number(p.subtotalVES || p.basePriceVES || 0),
      discountedBaseUsd: Number(p.subtotalUSD || p.basePriceUSD || 0),
      finalWithIVAVes: Number(p.totalPriceVES || 0),
      finalWithIVAUsd: Number(p.totalPriceUSD || 0),
      originalFinalVes: Number(p.originalPriceVES || 0),
      originalFinalUsd: Number(p.originalPriceUSD || 0),
      savingVes: Number(p.discountAmountVES || 0),
      savingUsd: Number(p.discountAmountUSD || 0),
      ivaType,
      ivaRate,
      hasDiscount,
      discountPercentage,
      displayBadge: hasDiscount ? `-${discountPercentage}% 🔥` : '',
      isOnSale: hasDiscount,
    };
  }

  // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
  let pricesObj = product?.prices || product?.attributes?.prices || {};
  if (typeof pricesObj === 'string') {
    try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
  }

  let baseVes = Number(
    pricesObj?.VES ?? pricesObj?.ves ?? product?.priceVes ?? product?.price_ves ?? product?.price ?? product?.precio ?? 0
  );
  let baseUsd = Number(
    pricesObj?.USD ?? pricesObj?.usd ?? product?.priceUsd ?? product?.price_usd ?? product?.usd ?? 0
  );

  if (baseUsd === 0 && baseVes > 0 && exchangeRate > 0) {
    baseUsd = Math.round((baseVes / exchangeRate) * 100) / 100;
  }
  if (baseVes === 0 && baseUsd > 0 && exchangeRate > 0) {
    baseVes = Math.round((baseUsd * exchangeRate) * 100) / 100;
  }

  const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);

  const isOnSale = product?.onSale === true || product?.attributes?.onSale === true;
  let discountPercentage = Number(product?.discountPercentage || product?.attributes?.discountPercentage || 0);
  discountPercentage = Math.min(100, Math.max(0, discountPercentage));
  const hasDiscount = isOnSale && discountPercentage > 0;

  let discountedBaseVes = baseVes;
  let discountedBaseUsd = baseUsd;
  let originalFinalVes = baseVes;
  let originalFinalUsd = baseUsd;

  if (hasDiscount) {
    const factor = 1 - discountPercentage / 100;
    if (ivaType === 'excluded') {
      originalFinalVes = baseVes * (1 + ivaRate / 100);
      originalFinalUsd = baseUsd * (1 + ivaRate / 100);
    } else if (ivaType === 'included') {
      originalFinalVes = baseVes;
      originalFinalUsd = baseUsd;
    } else {
      originalFinalVes = baseVes;
      originalFinalUsd = baseUsd;
    }
    discountedBaseVes = baseVes * factor;
    discountedBaseUsd = baseUsd * factor;
  }

  let ivaAmountVes = 0;
  let ivaAmountUsd = 0;
  let finalWithIVAVes = discountedBaseVes;
  let finalWithIVAUsd = discountedBaseUsd;

  if (ivaType === 'excluded') {
    ivaAmountVes = discountedBaseVes * (ivaRate / 100);
    ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
    finalWithIVAVes = discountedBaseVes + ivaAmountVes;
    finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
  } else if (ivaType === 'included') {
    ivaAmountVes = discountedBaseVes * (ivaRate / 100);
    ivaAmountUsd = discountedBaseUsd * (ivaRate / 100);
    finalWithIVAVes = discountedBaseVes + ivaAmountVes;
    finalWithIVAUsd = discountedBaseUsd + ivaAmountUsd;
  }

  const savingVes = Math.round((originalFinalVes - finalWithIVAVes) * 100) / 100;
  const savingUsd = Math.round((originalFinalUsd - finalWithIVAUsd) * 100) / 100;

  return {
    baseVes: Math.round(baseVes * 100) / 100,
    baseUsd: Math.round(baseUsd * 100) / 100,
    discountedBaseVes: Math.round(discountedBaseVes * 100) / 100,
    discountedBaseUsd: Math.round(discountedBaseUsd * 100) / 100,
    finalWithIVAVes: Math.round(finalWithIVAVes * 100) / 100,
    finalWithIVAUsd: Math.round(finalWithIVAUsd * 100) / 100,
    originalFinalVes: Math.round(originalFinalVes * 100) / 100,
    originalFinalUsd: Math.round(originalFinalUsd * 100) / 100,
    savingVes,
    savingUsd,
    ivaType,
    ivaRate,
    hasDiscount,
    discountPercentage,
    displayBadge: hasDiscount ? `-${discountPercentage}% 🔥` : '',
    isOnSale: hasDiscount,
  };
};

  interface KioskoPayProps {
    tenant?: any;
    isOpen: boolean;
    onClose: () => void;
    subtotal: number;
    subtotalVes: number;
    // 🔥 Sesión del kiosco
    kioskUser?: any;
    kioskDisplayName?: string;
    kioskDisplayPhone?: string;
    kioskUserId?: string | null;
    pagoMovilData: {
      bank?: string;
      banco?: string;
      phone?: string;
      telefono?: string;
      nationalId?: string;
      cedula?: string;
      rif?: string;
      prefix?: string;
      // 🔥 Campos adicionales usados en el render
      idNumber?: string;
      idType?: string;
      tipo_documento?: string;
      operator?: string;
      operador?: string;
    };
    onProcessOrder: (orderData: any) => Promise<any>;
    cartItems: any[];
    /** Limpia el carrito del kiosco (se llama al terminar el pago). */
    onClearCart?: () => void;
    /** Se llama cuando la orden se completa exitosamente. */
    onOrderComplete?: (orderData: any) => void;
    onSuccessClose?: () => void;
  }

  export default function KioskoPay({
    tenant,
    isOpen,
    onClose,
    subtotal,
    subtotalVes,
    pagoMovilData,
    onProcessOrder,
    cartItems,
    onClearCart,
    onOrderComplete,
    onSuccessClose,
    kioskUser,
    kioskDisplayName,
    kioskDisplayPhone,
    kioskUserId,
  }: KioskoPayProps) {
    // 🔥 CONTEXTO
    const context = useKioskContext();
    const { primary, secondary, isSecondaryLight, kioskIvaInfo, exchangeRate } = context;

    // 🔥 SESIÓN DEL KIOSCO (usuario logueado)
    const kioskSession = useKioskSession();

    // ============================================================
    // ESTADOS PRINCIPALES
    // ============================================================
    const [step, setStep] = useState<'cart' | 'waiting_payment'>('cart');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmedData, setConfirmedData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    // 🔥 ESTADOS DE PAGO
    const [paymentMethod, setPaymentMethod] = useState<'pagomovil' | 'efectivo' | 'pos'>('pagomovil');
    const [bankSource, setBankSource] = useState(BANK_LIST[2]?.name || 'Provincial');
        const [paymentReference, setPaymentReference] = useState('');

    // 🔥 AUTOCALCULAR valores iniciales desde el perfil del usuario logueado
    const initialPhoneParts = (() => {
      const user = kioskSession.user;
      if (!user?.pago_movil_same_as_profile) return { prefix: PHONE_OPERATORS[1]?.code || '0414', number: '' };
      const rawPhone = String(user.phone || '').replace(/\D/g, '');
      const without58 = rawPhone.startsWith('58') ? rawPhone.slice(2) : rawPhone;
      const withZero = without58.startsWith('0') ? without58 : `0${without58}`;
      const prefix = withZero.slice(0, 4);
      const number = withZero.slice(4, 11);
      return { prefix: prefix || '0414', number: number || '' };
    })();

    // 🔥 ESTADOS DE PAGOMÓVIL (autocompletados si el perfil lo permite)
    const [clientPhonePrefix, setClientPhonePrefix] = useState(initialPhoneParts.prefix);
    const [clientPhoneNumber, setClientPhoneNumber] = useState(initialPhoneParts.number);
    const [clientIdType, setClientIdType] = useState(
      kioskSession.user?.pago_movil_same_as_profile
        ? (kioskSession.user?.id_type || ID_TYPES[0]?.code || 'V')
        : (ID_TYPES[0]?.code || 'V')
    );
    const [clientIdNumber, setClientIdNumber] = useState(
      kioskSession.user?.pago_movil_same_as_profile
        ? (kioskSession.user?.id_number || '')
        : ''
    );

    // 🔥 SINCRONIZAR cuando el kioskSession.user cambie (hidratación asíncrona)
    useEffect(() => {
      const user = kioskSession.user;
      if (!user?.pago_movil_same_as_profile) return;

      const rawPhone = String(user.phone || '').replace(/\D/g, '');
      const without58 = rawPhone.startsWith('58') ? rawPhone.slice(2) : rawPhone;
      const withZero = without58.startsWith('0') ? without58 : `0${without58}`;
      const prefix = withZero.slice(0, 4) || '0414';
      const number = withZero.slice(4, 11);

      console.log('🔍 [KioskoPay] useEffect sincronizando desde kioskSession:', {
        prefix,
        number,
        idType: user.id_type,
        idNumber: user.id_number,
      });

      setClientPhonePrefix(prefix);
      setClientPhoneNumber(number);
      setClientIdType(user.id_type || ID_TYPES[0]?.code || 'V');
      setClientIdNumber(user.id_number || '');
    }, [kioskSession.user]);

    // 🔥 ESTADOS DE COPIA
    const [copied, setCopied] = useState(false);

    // 🔥 ESTADOS DE ÉXITO
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successOrderData, setSuccessOrderData] = useState<any>(null);

    // 🔥 ESTADOS DE VUELTO (pago en efectivo)
    const [cashCurrency, setCashCurrency] = useState<'VES' | 'USD'>('VES');
    const [cashAmount, setCashAmount] = useState<number>(0);
    // 🔥 Estado reportado por <KioskoCashPayment /> — única fuente de verdad
    const [cashCoversTotal, setCashCoversTotal] = useState(true);
    // 🔥 Preferencia de vuelto elegida en <KioskoCashPayment />
    const [changeDeliveryPreference, setChangeDeliveryPreference] = useState<{
      method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'credit';
      pagoMovilData?: {
        bank: string;
        phone: string;
        clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
        clientIdNumber: string;
      };
    } | null>(null);


    const getProductPrices = (product: any) => {
      if (!product) return { VES: 0, USD: 0, ivaType: 'excluded', ivaRate: 16 };

      // ============================================================
      // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
      // ============================================================
      if (product?._pricing && typeof product._pricing === 'object') {
        const p = product._pricing;
        return {
          VES: Number(p.totalPriceVES || 0),
          USD: Number(p.totalPriceUSD || 0),
          ivaType: p.ivaType || 'excluded',
          ivaRate: Number(p.ivaRate || 0),
        };
      }

      // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
      // 🔥 PASO 1: Buscar en attributes.prices
      const attrs = product?.attributes || {};
      let pricesObj = attrs.prices || product?.prices || {};

      if (typeof pricesObj === 'string') {
        try {
          pricesObj = JSON.parse(pricesObj);
        } catch {
          pricesObj = {};
        }
      }

      if (!pricesObj || Object.keys(pricesObj).length === 0) {
        pricesObj = {};
      }

      // 🔥 PASO 2: Obtener VES
      const vesVal = Number(
        pricesObj?.VES ??
        pricesObj?.ves ??
        attrs.price_ves ??
        product?.price_ves ??
        attrs.price ??
        product?.precio ??
        0
      );

      // 🔥 PASO 3: Obtener USD
      const usdVal = Number(
        pricesObj?.USD ??
        pricesObj?.usd ??
        attrs.priceUsd ??
        attrs.usdReference ??
        product?.priceUsd ??
        product?.price_usd ??
        product?.usd ??
        0
      );

      // 🔥 PASO 4: Determinar tipo de IVA
      const ivaType = product?.ivaType || attrs?.ivaType || 'excluded';
      const ivaRate = Number(product?.ivaRate || attrs?.ivaRate || 16);

      let finalVes = vesVal;
      let finalUsd = usdVal;

      // 🔥 PASO 5: Si no hay USD pero hay VES, calcular USD usando la tasa
      if (finalUsd === 0 && finalVes > 0 && exchangeRate && exchangeRate > 0) {
        finalUsd = Math.round((finalVes / exchangeRate) * 100) / 100;
        console.log(`🔄 [KioskoPay] Calculado USD desde VES: ${finalVes} / ${exchangeRate} = ${finalUsd}`);
      }

      // 🔥 PASO 6: Si no hay VES pero hay USD, calcular VES usando la tasa
      if (finalVes === 0 && finalUsd > 0 && exchangeRate && exchangeRate > 0) {
        finalVes = Math.round((finalUsd * exchangeRate) * 100) / 100;
        console.log(`🔄 [KioskoPay] Calculado VES desde USD: ${finalUsd} × ${exchangeRate} = ${finalVes}`);
      }

      // 🔥🔥🔥 PASO 7: CORREGIDO - Si el IVA es "excluded", calcular el VES CON IVA
      // 📌 PRINCIPIO: El precio con IVA debe ser consistente en VES y USD
      let priceWithIVAVes = finalVes;
      let priceWithIVAUsd = finalUsd;

      if (ivaType === 'excluded' && ivaRate > 0) {
        // 🔥 El precio en VES con IVA
        priceWithIVAVes = finalVes * (1 + ivaRate / 100);
        // 🔥 El precio en USD con IVA (usando la misma tasa)
        priceWithIVAUsd = finalUsd * (1 + ivaRate / 100);
        console.log(`🔄 [KioskoPay] IVA excluded: VES ${finalVes} → ${priceWithIVAVes}, USD ${finalUsd} → ${priceWithIVAUsd}`);
      } else if (ivaType === 'included') {
        // El precio YA incluye IVA
        priceWithIVAVes = finalVes;
        priceWithIVAUsd = finalUsd;
      } else {
        // EXENTO: sin IVA
        priceWithIVAVes = finalVes;
        priceWithIVAUsd = finalUsd;
      }

      console.log(`🔍 [KioskoPay] getProductPrices: ${product?.name || 'sin nombre'}`);
      console.log(`🔍   → USD base: ${finalUsd}, VES base: ${finalVes}`);
      console.log(`🔍   → USD con IVA: ${priceWithIVAUsd}, VES con IVA: ${priceWithIVAVes}, IVA: ${ivaType} ${ivaRate}%`);

      return {
        VES: Math.round(priceWithIVAVes * 100) / 100,
        USD: Math.round(priceWithIVAUsd * 100) / 100,
        ivaType,
        ivaRate,
      };
    };

    // 🔥 FUNCIÓN PARA OBTENER IMAGEN DEL PRODUCTO
    const getItemImage = (item: any): string | null => {
      if (!item) return null;
      const possibleImages = [
        item.image,
        item.coverImage,
        item.photo,
        ...(item.mediaUrls || []),
        ...(item.images || []),
        ...(item.existingImages || []),
        ...(item.fileUrls || []),
        ...(item.photos || []),
      ].filter(Boolean);

      if (possibleImages.length === 0) return null;

      let rawImg = possibleImages[0];
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
    };

// 🔥 CALCULAR TOTALES CON IVA Y DESCUENTO - CORREGIDO
const calculateRealTotals = () => {
  let totalVes = 0;
  let totalUsd = 0;
  let totalIvaVes = 0;
  let totalBaseVes = 0;
  let totalSavingVes = 0;
  let totalOriginalVes = 0;
  let totalDiscountPercentage = 0;
  let hasAnyDiscount = false;

  cartItems.forEach((item: any) => {
    // 🔥 USAR LA FUNCIÓN CON IVA Y DESCUENTO
    const priceInfo = getProductPriceWithIVAAndDiscount(item, exchangeRate || 0);
    if (!priceInfo) return;
    
    const quantity = Number(item.quantity || 1);
    
    totalVes += priceInfo.finalWithIVAVes * quantity;
    totalUsd += priceInfo.finalWithIVAUsd * quantity;
    totalIvaVes += (priceInfo.finalWithIVAVes - priceInfo.discountedBaseVes) * quantity;
    totalBaseVes += priceInfo.discountedBaseVes * quantity;
    totalSavingVes += priceInfo.savingVes * quantity;
    totalOriginalVes += priceInfo.originalFinalVes * quantity;
    
    if (priceInfo.hasDiscount) {
      hasAnyDiscount = true;
      if (priceInfo.discountPercentage > totalDiscountPercentage) {
        totalDiscountPercentage = priceInfo.discountPercentage;
      }
    }
  });

  return { 
    totalVes: Math.round(totalVes * 100) / 100,
    totalUsd: Math.round(totalUsd * 100) / 100,
    totalIvaVes: Math.round(totalIvaVes * 100) / 100,
    totalBaseVes: Math.round(totalBaseVes * 100) / 100,
    totalSavingVes: Math.round(totalSavingVes * 100) / 100,
    totalOriginalVes: Math.round(totalOriginalVes * 100) / 100,
    hasDiscount: hasAnyDiscount,
    totalDiscountPercentage: totalDiscountPercentage,
  };
};

    // 🔥🔥🔥 CORREGIDO: Calcular totals ANTES de finalVes/finalUsd 🔥🔥🔥
    const totals = calculateRealTotals();

    // 🔥 USAR IVA DEL CONTEXTO O CALCULAR DIRECTAMENTE
    const finalVes = kioskIvaInfo?.totalWithIVAVes || totals.totalVes || subtotalVes || 0;
    
    // 🔥🔥🔥 CORREGIDO: finalUsd DEBE coincidir con finalVes (ambos con IVA) 🔥🔥🔥
    // 📌 PRINCIPIO: finalVes YA INCLUYE IVA (calculado por calculateCartIVA o kioskIvaInfo)
    // 📌 finalUsd debe ser el equivalente en USD del total con IVA
    
    let finalUsd = 0;
    
    // 🔥 Opción 1: Usar la tasa de cambio (MÁS PRECISO)
    if (exchangeRate && exchangeRate > 0) {
      finalUsd = Math.round((finalVes / exchangeRate) * 100) / 100;
    }
    
    // 🔥 Opción 2: Si no hay tasa de cambio, usar totals.totalUsd (fallback)
    if (finalUsd === 0 && totals.totalUsd > 0) {
      finalUsd = totals.totalUsd;
    }
    
    // 🔥 Opción 3: Último recurso - tasa de respaldo (solo para evitar NaN)
    if (finalUsd === 0 && finalVes > 0) {
      const fallbackRate = 1; // 🔥 Si no hay tasa, asumir 1:1
      finalUsd = finalVes / fallbackRate;
    }

    console.log('🔍 [KioskoPay] finalVes (con IVA):', finalVes);
    console.log('🔍 [KioskoPay] finalUsd (con IVA):', finalUsd);
    console.log('🔍 [KioskoPay] exchangeRate:', exchangeRate);
    console.log('🔍 [KioskoPay] totals.totalUsd:', totals.totalUsd);

    // 🔥 INFORMACIÓN DEL IVA PARA MOSTRAR
    const ivaDisplayType = kioskIvaInfo?.displayType || 'Sin IVA';
    const ivaBadgeBg = kioskIvaInfo?.badgeBg || 'rgba(100,116,139,0.15)';
    const ivaBadgeColor = kioskIvaInfo?.badgeColor || '#64748b';
    const hasIVA = kioskIvaInfo?.totalIVA > 0 || kioskIvaInfo?.totalIvaType === 'included';

    const formatPrice = (num: number): string => {
      if (isNaN(num) || num === 0) return '0,00';
      return num.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // ============================================================
    // COLORES DINÁMICOS
    // ============================================================
    const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
    const mutedTextColor = isSecondaryLight ? '#64748b' : '#94a3b8';
    const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    const modalBgColor = secondary || (isSecondaryLight ? '#ffffff' : '#0f172a');
    const innerBgColor = isSecondaryLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
    const methodBgColor = isSecondaryLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)';
    const safePrimary = primary || '#F59E0B';

  // 🔥 DATOS DE PAGOMÓVIL - IGUAL QUE LA TIENDA NORMAL
  const storeBank = pagoMovilData?.bank || pagoMovilData?.banco || '0134 - Banesco';
  // 🔥 Asegurar que el teléfono tenga el 0 al inicio
  let rawPhone = pagoMovilData?.phone || pagoMovilData?.telefono || '04242450194';
  const storePhone = rawPhone.startsWith('0') ? rawPhone : `0${rawPhone}`;
  // 🔥 Usar idNumber con el valor real
  const storeIdRaw = pagoMovilData?.idNumber || pagoMovilData?.nationalId || pagoMovilData?.cedula || pagoMovilData?.rif || '18714469';
  const storeIdType = pagoMovilData?.idType || pagoMovilData?.tipo_documento || 'V';
  // 🔥 Formatear la cédula con el tipo de documento
  const storeId = storeIdRaw.match(/^[A-Za-z]/) ? storeIdRaw : `${storeIdType}${storeIdRaw}`;
  const storeOperator = pagoMovilData?.operator || pagoMovilData?.operador || '0424';

  console.log('🔍 [KioskoPay] storeBank:', storeBank);
  console.log('🔍 [KioskoPay] storePhone:', storePhone);
  console.log('🔍 [KioskoPay] storeId:', storeId);
    const handleCopyStoreData = () => {
      const textToCopy = `Banco: ${storeBank}\nTeléfono: ${storePhone}\nCédula/RIF: ${storeId}\nMonto: Bs. ${formatPrice(finalVes)}`;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };

    // ============================================================
    // HANDLERS
    // ============================================================
    const handleGenerateOrder = async () => {
      setIsSubmitting(true);
      setShowConfirmModal(false);

      try {
        let finalPaymentReference = '';
        let finalBankSource = '';
        let finalClientIdType = '';
        let finalClientIdNumber = '';
        let finalClientPhone = '';
        let finalCustomerPhone = '';

        if (paymentMethod === 'pagomovil') {
          const fullPhone = `${clientPhonePrefix}${clientPhoneNumber}`;
          
          if (!clientPhoneNumber || clientPhoneNumber.length < 7) {
            alert('⚠️ Para PagoMóvil, debes ingresar tu número de teléfono completo (mínimo 7 dígitos)');
            setIsSubmitting(false);
            return;
          }

          if (fullPhone.length < 11) {
            alert('⚠️ El teléfono debe tener al menos 11 dígitos (ej: 04141234567)');
            setIsSubmitting(false);
            return;
          }

          if (!paymentReference || paymentReference.length < 4) {
            alert('⚠️ Por favor, ingresa un número de referencia válido (mínimo 4 dígitos)');
            setIsSubmitting(false);
            return;
          }

          finalCustomerPhone = fullPhone;
          finalPaymentReference = paymentReference;
          finalBankSource = bankSource;
          finalClientIdType = clientIdType;
          finalClientIdNumber = clientIdNumber;
          finalClientPhone = fullPhone;
          
          console.log('📱 [KioskoPay] Datos PagoMóvil:', { 
            finalPaymentReference, 
            finalBankSource, 
            finalClientIdType, 
            finalClientIdNumber,
            finalClientPhone 
          });
        } else {
          // 🔥 EFECTIVO O POS: usar datos del kiosco si existen
          finalCustomerPhone = kioskDisplayPhone || '';
          console.log('📦 [KioskoPay] Pago en efectivo o POS');
        }

        // 🔥 Nombre del cliente: logueado o anónimo por defecto
        const finalCustomerName = kioskDisplayName || 'Cliente Kiosko / Autopago';

        console.log('📦 [KioskoPay] Datos del cliente:', { 
          finalCustomerName, 
          finalCustomerPhone,
          paymentMethod,
          finalPaymentReference,
          finalBankSource,
          finalClientPhone
        });

        const orderStatus = paymentMethod === 'pagomovil' ? 'por_verificar' : 'COMPLETED';

        // 🔥🔥🔥 CONSTRUIR ITEMS CON PRECIOS CORRECTOS 🔥🔥🔥
        // 🔥🔥🔥 CONSTRUIR ITEMS SIN PRECIOS (el backend recalcula con PricingService) 🔥🔥🔥
        const itemsWithPrices = cartItems.map((item: any) => {
          const quantity = Number(item.quantity || 1);
          
          return {
            productId: item.id || item._id,
            name: item.name || item.title || 'Producto',
            quantity: quantity,
            // 🔥 NO MANDAR priceUsd/priceVes: el backend recalcula y guarda el snapshot
          };
        });

        // 🔥 Calcular totales desde finalVes/finalUsd (que ya están bien calculados)
        const totalVesFromItems = finalVes;
        const totalUsdFromItems = finalUsd;

        console.log('📊 [KioskoPay] Totales calculados:');
        console.log(`📊   → totalUsdFromItems: ${totalUsdFromItems}`);
        console.log(`📊   → totalVesFromItems: ${totalVesFromItems}`);
        console.log(`📊   → finalUsd: ${finalUsd}`);
        console.log(`📊   → finalVes: ${finalVes}`);
        console.log(`📊   → exchangeRate: ${exchangeRate}`);

// 🔥 LOG DE DEPURACIÓN ANTES DE ENVIAR
console.log('🔍 [KioskoPay] DATOS DE PAGO MÓVIL ANTES DE ENVIAR:');
console.log('  - finalClientIdType:', finalClientIdType);
console.log('  - finalClientIdNumber:', finalClientIdNumber);
console.log('  - finalClientPhone:', finalClientPhone);
console.log('  - finalBankSource:', finalBankSource);
console.log('  - finalPaymentReference:', finalPaymentReference);

const createPayload = {
  action: 'create_order',
  userId: kioskUserId || undefined,
  // 🔥 Mandar undefined si no hay usuario logueado, para que page.tsx
  // resuelva el fallback correcto ('Cliente Kiosko / Autopago').
  customerName: kioskDisplayName || undefined,
  customerPhone: finalCustomerPhone,
  
  totalUsd: Math.round(totalUsdFromItems * 100) / 100,
  totalVes: Math.round(totalVesFromItems * 100) / 100,
  paymentMethod: paymentMethod,
  status: orderStatus,
  source: 'kiosk',
  items: itemsWithPrices,
  exchangeRate: exchangeRate || 1,
  // 🔥 Datos de vuelto (solo efectivo)
  ...(paymentMethod === 'efectivo' && cashAmount > 0 && {
    cashCurrency,
    cashAmount,
    // 🔥 Preferencia de vuelto (si el cliente la eligió)
    ...(changeDeliveryPreference?.method === 'credit'
      ? { changeResolution: 'credit' as const }
      : changeDeliveryPreference
      ? {
          changeResolution: 'pending' as const,
          changeDeliveryPreference: {
            method: changeDeliveryPreference.method,
            pagoMovilData:
              changeDeliveryPreference.method === 'pago_movil'
                ? changeDeliveryPreference.pagoMovilData
                : undefined,
          },
        }
      : {}),
  }),
  // 🔥🔥🔥 ENVIAR DATOS DE PAGO MÓVIL DIRECTAMENTE (NO DENTRO DE paymentMetadata)
  ...(paymentMethod === 'pagomovil' && {
    bankSource: finalBankSource,
    paymentReference: finalPaymentReference,
    // 🔥 ESTOS CAMPOS DEBEN ESTAR EN EL OBJETO PRINCIPAL
    clientIdType: finalClientIdType,
    clientIdNumber: finalClientIdNumber,
    clientPhone: finalClientPhone,
    // 🔥 Y TAMBIÉN EN paymentMetadata
    paymentMetadata: {
      clientIdType: finalClientIdType,
      clientIdNumber: finalClientIdNumber,
      clientPhone: finalClientPhone,
      bankSource: finalBankSource,
      paymentReference: finalPaymentReference,
    }
  }),
};

console.log('📦 [KioskoPay] createPayload final:', JSON.stringify(createPayload, null, 2));

        console.log('📦 [KioskoPay] Enviando create_order:', JSON.stringify(createPayload, null, 2));

        const orderRes = await onProcessOrder(createPayload);

        console.log('🔍 [KioskoPay] orderRes:', orderRes);

        if (!orderRes || !orderRes.success) {
          throw new Error('No se pudo generar el identificador de la orden.');
        }

        const orderId = orderRes.orderId || orderRes.id || orderRes._id || orderRes.data?.id || orderRes.data?._id || orderRes.data?.orderId;

        if (!orderId) {
          console.error('❌ [KioskoPay] No se recibió orderId:', orderRes);
          throw new Error('No se pudo obtener el ID de la orden. Por favor, intenta de nuevo.');
        }

        console.log('✅ [KioskoPay] Order ID obtenido:', orderId);
        setCreatedOrderId(orderId);

        if (paymentMethod === 'pagomovil') {
          const paymentPayload = {
            action: 'submit_payment',
            orderId: orderId,
            paymentMethod: 'pagomovil',
            bankSource: finalBankSource,
            paymentReference: finalPaymentReference,
            clientIdType: finalClientIdType,
            clientIdNumber: finalClientIdNumber,
            clientPhone: finalClientPhone,
            status: 'por_verificar',
          };

          console.log('📦 [KioskoPay] Enviando submit_payment:', JSON.stringify(paymentPayload, null, 2));

          const paymentResult = await onProcessOrder(paymentPayload);
          console.log('🔍 [KioskoPay] paymentResult:', paymentResult);

          if (!paymentResult || !paymentResult.success) {
            console.warn('⚠️ Pago reportado con advertencia:', paymentResult?.error);
          }
        }

        setSuccessOrderData({
          id: orderId,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          totalAmount: totalUsdFromItems,
          totalAmountVes: totalVesFromItems,
          paymentMethodUsed: paymentMethod,
          paymentReference: paymentMethod === 'pagomovil' ? finalPaymentReference : undefined,
          bankSource: paymentMethod === 'pagomovil' ? finalBankSource : undefined,
          clientPhone: paymentMethod === 'pagomovil' ? finalClientPhone : undefined,
          clientIdType: paymentMethod === 'pagomovil' ? finalClientIdType : undefined,
          clientIdNumber: paymentMethod === 'pagomovil' ? finalClientIdNumber : undefined,
          items: cartItems.map((item: any) => {
            const itemImage = getItemImage(item);
            
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
                quantity: item.quantity || 1,
                image: itemImage,
                _pricing: p,
                discountInfo,
              };
            }
            
            // 🔴 FLUJO VIEJO
            const prices = getProductPrices(item);
            const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
            const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
            
            return {
              name: item.name || item.title || 'Producto',
              quantity: item.quantity || 1,
              priceVes: prices.VES,
              priceUsd: prices.USD,
              image: itemImage,
              ivaType: ivaType,
              ivaRate: ivaRate,
            };
          }),
          createdAt: new Date().toISOString(),
          isPagoMovil: paymentMethod === 'pagomovil',
          isEfectivo: paymentMethod === 'efectivo',
          isPOS: paymentMethod === 'pos',
          status: orderStatus,
        });
        cartItems.forEach((item: any) => {
          const productId = item.id || item._id;
          if (typeof context.updateCartQty === 'function') {
            context.updateCartQty(productId, 0);
          }
        });

        setTimeout(() => {
          setShowSuccessModal(true);
          console.log('🎉 [KioskoPay] Modal de éxito activado');
        }, 100);

        setStep('cart');

      } catch (error: any) {
        console.error('❌ [KioskoPay] Error al generar orden:', error);
        alert(error.message || 'Ocurrió un error al procesar tu solicitud.');
      } finally {
        setIsSubmitting(false);
      }
    };

    // ============================================================
    // RENDER
    // ============================================================
    if (!isOpen) return null;

    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md select-none animate-fadeIn">
          <div
            className="w-full max-w-3xl rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-md"
            style={{
              backgroundColor: modalBgColor,
              borderColor: borderColor,
              color: textColor,
            }}
          >
            {/* HEADER */}
            <div
              className="px-8 py-6 border-b flex items-center justify-between"
              style={{
                borderColor: borderColor,
                backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg"
                  style={{ backgroundColor: safePrimary, color: '#020617' }}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black tracking-tight`} style={{ color: textColor }}>
                    {step === 'cart' ? 'Caja de Autoservicio' : 'Confirmar Pago'}
                  </h2>
                  <p className={`text-xs font-medium`} style={{ color: mutedTextColor }}>
                    {step === 'cart'
                      ? 'Selecciona tu método de pago preferido'
                      : `Orden #${createdOrderId || 'Generada'}`}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer"
                style={{
                  backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                  borderColor: borderColor,
                  color: textColor,
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
              {/* 🔥 PASO 1: SELECCIÓN DE MÉTODO DE PAGO */}
              {step === 'cart' && (
                <div className="space-y-6">
                  {/* MÉTODOS DE PAGO */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pagomovil')}
                      style={{
                        borderColor: paymentMethod === 'pagomovil' ? safePrimary : borderColor,
                        backgroundColor:
                          paymentMethod === 'pagomovil' ? `${safePrimary}15` : methodBgColor,
                        color: textColor,
                      }}
                      className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 cursor-pointer shadow-xl ${paymentMethod === 'pagomovil' ? 'shadow-2xl scale-105' : ''}`}
                    >
                      <div
                        className="w-16 h-16 rounded-2xl border flex items-center justify-center"
                        style={{
                          backgroundColor: isSecondaryLight ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.2)',
                          borderColor: isSecondaryLight ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.3)',
                          color: '#34d399',
                        }}
                      >
                        <Smartphone className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-black`} style={{ color: textColor }}>
                          PagoMóvil
                        </h3>
                        <p className={`text-xs mt-1`} style={{ color: mutedTextColor }}>
                          Transferencia inmediata
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      style={{
                        borderColor: paymentMethod === 'efectivo' ? safePrimary : borderColor,
                        backgroundColor: paymentMethod === 'efectivo' ? `${safePrimary}15` : methodBgColor,
                        color: textColor,
                      }}
                      className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 cursor-pointer shadow-xl ${paymentMethod === 'efectivo' ? 'shadow-2xl scale-105' : ''}`}
                    >
                      <div
                        className="w-16 h-16 rounded-2xl border flex items-center justify-center"
                        style={{
                          backgroundColor: isSecondaryLight ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.2)',
                          borderColor: isSecondaryLight ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.3)',
                          color: '#fbbf24',
                        }}
                      >
                        <Banknote className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-black`} style={{ color: textColor }}>
                          Efectivo en Caja
                        </h3>
                        <p className={`text-xs mt-1`} style={{ color: mutedTextColor }}>
                          Pague en taquilla física
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pos')}
                      style={{
                        borderColor: paymentMethod === 'pos' ? safePrimary : borderColor,
                        backgroundColor: paymentMethod === 'pos' ? `${safePrimary}15` : methodBgColor,
                        color: textColor,
                      }}
                      className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center gap-4 cursor-pointer shadow-xl ${paymentMethod === 'pos' ? 'shadow-2xl scale-105' : ''}`}
                    >
                      <div
                        className="w-16 h-16 rounded-2xl border flex items-center justify-center"
                        style={{
                          backgroundColor: isSecondaryLight ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.2)',
                          borderColor: isSecondaryLight ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.3)',
                          color: '#60a5fa',
                        }}
                      >
                        <CreditCard className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-black`} style={{ color: textColor }}>
                          Punto de Venta
                        </h3>
                        <p className={`text-xs mt-1`} style={{ color: mutedTextColor }}>
                          Tarjeta Débito / Crédito
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* 🔥 VUELTO (solo efectivo) */}
                  {paymentMethod === 'efectivo' && cartItems.length > 0 && (
                    <KioskoCashPayment
                      totalVes={finalVes}
                      totalUsd={finalUsd}
                      exchangeRate={exchangeRate}
                      currency={cashCurrency}
                      amount={cashAmount}
                      onCurrencyChange={setCashCurrency}
                      onAmountChange={setCashAmount}
                      onCoversChange={setCashCoversTotal}
                      userProfileData={
                        kioskSession.user
                          ? {
                              phone: kioskSession.user.phone,
                              id_number: kioskSession.user.id_number ?? null,
                              id_type: kioskSession.user.id_type ?? null,
                              pago_movil_same_as_profile:
                                kioskSession.user.pago_movil_same_as_profile,
                            }
                          : null
                      }
                      onChangePreference={setChangeDeliveryPreference}
                      textColor={textColor}
                      mutedTextColor={mutedTextColor}
                      borderColor={borderColor}
                      innerBgColor={innerBgColor}
                      isSecondaryLight={isSecondaryLight}
                      safePrimary={safePrimary}
                      formatPrice={formatPrice}
                    />
                  )}

                  {/* 🔥 BADGE DE IVA */}
                  {hasIVA && cartItems.length > 0 && (
                    <div className="flex justify-end">
                      <span 
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border`}
                        style={{
                          backgroundColor: ivaBadgeBg,
                          borderColor: `${ivaBadgeColor}30`,
                          color: ivaBadgeColor
                        }}
                      >
                        {ivaDisplayType}
                      </span>
                    </div>
                  )}

                  {/* 🔥 DESGLOSE DE IVA */}
                  {hasIVA && cartItems.length > 0 && (
                    <div
                      className="p-4 rounded-2xl border space-y-2"
                      style={{
                        backgroundColor: `${safePrimary}10`,
                        borderColor: `${safePrimary}30`,
                      }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: mutedTextColor }}>Subtotal (sin IVA):</span>
                        <span className="font-medium" style={{ color: textColor }}>
                          Bs. {formatPrice(kioskIvaInfo?.totalBaseVes || totals.totalBaseVes || 0)}
                        </span>
                      </div>
                      {(kioskIvaInfo?.totalIVA > 0 || totals.totalIvaVes > 0) && (
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: mutedTextColor }}>
                            IVA ({kioskIvaInfo?.totalIvaRate || 16}%):
                          </span>
                          <span className="font-medium" style={{ color: textColor }}>
                            Bs. {formatPrice(kioskIvaInfo?.totalIVA || totals.totalIvaVes || 0)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: borderColor }}>
                        <span className="font-black uppercase" style={{ color: mutedTextColor }}>Total con IVA:</span>
                        <span className="text-xl font-black" style={{ color: safePrimary }}>
                          Bs. {formatPrice(finalVes)}
                        </span>
                      </div>
                    </div>
                  )}

{/* RESUMEN DE TOTALES */}
<div
  className="p-6 rounded-[2.5rem] border space-y-3"
  style={{
    backgroundColor: innerBgColor,
    borderColor: borderColor,
  }}
>
  {totals.hasDiscount && totals.totalSavingVes > 0 && (
    <div className="flex items-center justify-between bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
      <span className="text-xs font-bold flex items-center gap-1" style={{ color: '#34d399' }}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-3.5 h-3.5"
        >
          <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
        </svg>
        Ahorro:
      </span>
      <span className="font-bold text-sm" style={{ color: '#34d399' }}>
        Bs. {formatPrice(totals.totalSavingVes)}
      </span>
    </div>
  )}

  <div className="flex justify-between items-center text-sm">
    <span style={{ color: mutedTextColor }}>Monto Total en Dólares:</span>
    <span
      className="font-bold text-lg"
      style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}
    >
      ${finalUsd.toFixed(2)} USD
    </span>
  </div>
  <div
    className="flex justify-between items-center text-base pt-3 border-t"
    style={{ borderColor: borderColor }}
  >
    <span className={`font-black uppercase`} style={{ color: mutedTextColor }}>
      Total a Pagar en Bolívares:
    </span>
    <span className="font-black text-2xl sm:text-3xl" style={{ color: safePrimary }}>
      Bs. {formatPrice(finalVes)}
    </span>
  </div>
</div>

                  {/* BOTÓN CONTINUAR */}
                  <button
                    type="button"
                    onClick={() => {
                      if (paymentMethod === 'efectivo' && !cashCoversTotal) {
                        alert('El monto entregado no cubre el total a pagar.');
                        return;
                      }
                      setShowConfirmModal(true);
                    }}
                    disabled={paymentMethod === 'efectivo' && !cashCoversTotal}
                    style={{
                      backgroundColor:
                        paymentMethod === 'efectivo' && !cashCoversTotal
                          ? '#94a3b8'
                          : safePrimary,
                      cursor:
                        paymentMethod === 'efectivo' && !cashCoversTotal
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                    className="w-full py-5 rounded-[2.5rem] text-slate-950 font-black text-xl transition shadow-2xl flex items-center justify-center gap-3 hover:opacity-95 disabled:opacity-60"
                  >
                    <span>
                      Continuar con{' '}
                      {paymentMethod === 'pagomovil'
                        ? 'PagoMóvil'
                        : paymentMethod === 'efectivo'
                        ? 'Efectivo'
                        : 'Punto de Venta'}
                    </span>
                    <ArrowRight className="w-6 h-6 text-slate-950" />
                  </button>
                </div>
              )}

  {/* 🔥 PASO 2: DATOS DE PAGOMÓVIL */}
  {step === 'waiting_payment' && paymentMethod === 'pagomovil' && (
    <div className="space-y-6">
      <div
        className="p-6 rounded-[2.5rem] border space-y-4"
        style={{
          backgroundColor: isSecondaryLight ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.1)',
          borderColor: isSecondaryLight ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.3)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#34d399' }}>
            Datos para realizar el PagoMóvil
          </span>
          <button
            type="button"
            onClick={handleCopyStoreData}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer"
            style={{
              backgroundColor: isSecondaryLight ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.2)',
              borderColor: isSecondaryLight ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.3)',
              color: '#34d399',
            }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado!' : 'Copiar datos'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: innerBgColor,
              borderColor: borderColor,
            }}
          >
            <span className="text-[10px] uppercase font-bold block" style={{ color: mutedTextColor }}>
              Banco
            </span>
            <span className="font-black text-sm mt-1 block" style={{ color: textColor }}>
              {storeBank}
            </span>
          </div>
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: innerBgColor,
              borderColor: borderColor,
            }}
          >
            <span className="text-[10px] uppercase font-bold block" style={{ color: mutedTextColor }}>
              Teléfono
            </span>
            <span className="font-black text-sm mt-1 block" style={{ color: textColor }}>
              {storePhone.startsWith('0') ? storePhone : `0${storePhone}`}
            </span>
          </div>
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: innerBgColor,
              borderColor: borderColor,
            }}
          >
            <span className="text-[10px] uppercase font-bold block" style={{ color: mutedTextColor }}>
              Cédula / RIF
            </span>
            <span className="font-black text-sm mt-1 block" style={{ color: textColor }}>
              {storeId.includes('-') ? storeId : `${storeIdType || 'V'}-${storeId.replace(/^[A-Za-z]+/, '')}`}
            </span>
          </div>
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: innerBgColor,
              borderColor: borderColor,
            }}
          >
            <span className="text-[10px] uppercase font-bold block" style={{ color: mutedTextColor }}>
              Monto Exacto
            </span>
            <span className="font-black text-sm mt-1 block" style={{ color: '#34d399' }}>
              Bs. {formatPrice(finalVes)}
            </span>
          </div>
        </div>

        {/* 🔥 DESGLOSE DE IVA EN LA SECCIÓN DE PAGO */}
        {hasIVA && cartItems.length > 0 && (
          <div
            className="p-3 rounded-xl border space-y-1.5"
            style={{
              backgroundColor: `${safePrimary}10`,
              borderColor: `${safePrimary}30`,
            }}
          >
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: mutedTextColor }}>Subtotal (sin IVA):</span>
              <span className="font-medium" style={{ color: textColor }}>
                Bs. {formatPrice(kioskIvaInfo?.totalBaseVes || totals.totalBaseVes || 0)}
              </span>
            </div>
            {(kioskIvaInfo?.totalIVA > 0 || totals.totalIvaVes > 0) && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: mutedTextColor }}>
                  IVA ({kioskIvaInfo?.totalIvaRate || 16}%):
                </span>
                <span className="font-medium" style={{ color: textColor }}>
                  Bs. {formatPrice(kioskIvaInfo?.totalIVA || totals.totalIvaVes || 0)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm border-t pt-1.5" style={{ borderColor: borderColor }}>
              <span className="font-black uppercase text-xs" style={{ color: mutedTextColor }}>Total con IVA:</span>
              <span className="text-base font-black" style={{ color: '#34d399' }}>
                Bs. {formatPrice(finalVes)}
              </span>
            </div>
          </div>
        )}

        {/* 🔥 CÓDIGO QR PARA PAGO MÓVIL */}
        <div className="pt-2 border-t border-dashed flex flex-col items-center justify-center gap-2" style={{ borderColor: borderColor }}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedTextColor}`}>
            Escanea para pagar con tu app bancaria
          </span>
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                `PAGO MOVIL\nBanco: ${storeBank}\nTelefono: ${storePhone}\nCedula: ${storeId}\nMonto: ${finalVes.toFixed(2)}`
              )}`} 
              alt="QR Pago Movil" 
              className="w-32 h-32 object-contain"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={`text-base font-black`} style={{ color: textColor }}>
          Ingresa los datos de tu pago realizado:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-bold uppercase mb-1.5 block`} style={{ color: mutedTextColor }}>
              Banco Emisor
            </label>
            <SearchableDropdown
              value={bankSource}
              onChange={setBankSource}
              options={BANK_LIST.map((bank) => ({
                value: bank.name,
                label: getBankLabel(bank.code),
              }))}
              placeholder="Seleccionar banco"
              searchPlaceholder="Buscar banco..."
              emptyMessage="No hay bancos"
              primary={safePrimary}
              textColor={textColor}
              secondary={secondary}
              isDarkBg={!isSecondaryLight}
              borderColor={borderColor}
              searchable={true}
              footerLabel={(n) => `${n} bancos`}
            />
          </div>

          <div>
            <label className={`text-xs font-bold uppercase mb-1.5 block`} style={{ color: mutedTextColor }}>
              Número de Referencia
            </label>
            <input
              type="text"
              placeholder="Ej. 4839"
              maxLength={12}
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value.replace(/\D/g, ''))}
              className="w-full px-5 py-4 rounded-2xl border text-sm focus:outline-none font-bold tracking-widest"
              style={{
                backgroundColor: innerBgColor,
                borderColor: borderColor,
                color: textColor,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-bold uppercase mb-1.5 block`} style={{ color: mutedTextColor }}>
              Tipo de Documento
            </label>
            <SearchableDropdown
              value={clientIdType}
              onChange={setClientIdType}
              options={ID_TYPES.map((type) => ({
                value: type.code,
                label: type.label,
              }))}
              placeholder="Seleccionar tipo"
              searchPlaceholder=""
              emptyMessage="—"
              primary={safePrimary}
              textColor={textColor}
              secondary={secondary}
              isDarkBg={!isSecondaryLight}
              borderColor={borderColor}
              searchable={false}
            />
          </div>
          <div>
            <label className={`text-xs font-bold uppercase mb-1.5 block`} style={{ color: mutedTextColor }}>
              Número de Cédula / RIF
            </label>
            <input
              type="text"
              placeholder="Ej. 18714469"
              value={clientIdNumber}
              onChange={(e) => setClientIdNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full px-5 py-4 rounded-2xl border text-sm focus:outline-none font-medium"
              style={{
                backgroundColor: innerBgColor,
                borderColor: borderColor,
                color: textColor,
              }}
            />
          </div>
        </div>

        <div>
          <label className={`text-xs font-bold uppercase mb-1.5 block`} style={{ color: mutedTextColor }}>
            Teléfono Afiliado para PagoMóvil
          </label>
          <div className="flex gap-2">
            <div className="w-28 shrink-0">
              <SearchableDropdown
                value={clientPhonePrefix}
                onChange={setClientPhonePrefix}
                options={PHONE_OPERATORS.map((op) => ({
                  value: op.code,
                  label: op.code,
                }))}
                placeholder="0414"
                searchPlaceholder=""
                emptyMessage="—"
                primary={safePrimary}
                textColor={textColor}
                secondary={secondary}
                isDarkBg={!isSecondaryLight}
                borderColor={borderColor}
                searchable={false}
              />
            </div>
            <input
              type="text"
              placeholder="1234567 (7 dígitos)"
              value={clientPhoneNumber}
              onChange={(e) => setClientPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 7))}
              className="flex-1 px-5 py-4 rounded-2xl border text-sm focus:outline-none font-medium"
              style={{
                backgroundColor: innerBgColor,
                borderColor: borderColor,
                color: textColor,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => setStep('cart')}
          className="w-1/3 py-4 rounded-[2rem] font-bold text-sm transition border cursor-pointer flex items-center justify-center gap-2"
          style={{
            backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
            borderColor: borderColor,
            color: textColor,
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <button
          type="button"
          onClick={handleGenerateOrder}
          disabled={isSubmitting || !paymentReference || paymentReference.length < 4 || !clientPhoneNumber || clientPhoneNumber.length < 7}
          style={
            !paymentReference || paymentReference.length < 4 || !clientPhoneNumber || clientPhoneNumber.length < 7
              ? {}
              : { backgroundColor: safePrimary }
          }
          className={`w-2/3 py-4 rounded-[2rem] text-slate-950 font-black text-base transition shadow-2xl flex items-center justify-center gap-2 ${
            !paymentReference || paymentReference.length < 4 || !clientPhoneNumber || clientPhoneNumber.length < 7
              ? 'opacity-50 cursor-not-allowed border'
              : 'cursor-pointer hover:opacity-95'
          }`}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
          ) : (
            <>
              <span>Reportar PagoMóvil y Finalizar</span>
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
            </>
          )}
        </button>
      </div>
    </div>
  )}
            </div>
          </div>
        </div>

        {/* 🔥 MODAL DE CONFIRMACIÓN */}
        <KioskoConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmedData(false);
          }}
          onConfirm={() => {
            if (paymentMethod === 'pagomovil') {
              setStep('waiting_payment');
              setShowConfirmModal(false);
            } else {
              handleGenerateOrder();
            }
          }}
          isSubmitting={isSubmitting}
          confirmedData={confirmedData}
          setConfirmedData={setConfirmedData}
          cartItems={cartItems}
          customerName={kioskDisplayName || 'Cliente Kiosko / Autopago'}
          customerPhone={kioskDisplayPhone || `${clientPhonePrefix}${clientPhoneNumber}`}
          finalVes={finalVes}
          finalUsd={finalUsd}
          formatPrice={formatPrice}
          isSecondaryLight={isSecondaryLight}
          safePrimary={safePrimary}
          borderDynamic={borderColor}
          resolvedTextMain={textColor}
          resolvedTextMuted={mutedTextColor}
          paymentMethod={paymentMethod}
          cashCurrency={cashCurrency}
          cashAmount={cashAmount}
        />

        {/* 🔥 MODAL DE ÉXITO */}
        {showSuccessModal && successOrderData && (
          <KioskoSuccessModal
            isOpen={showSuccessModal}
            onClose={() => {
              console.log('🔚 [KioskoPay] Cerrando modal de éxito');
              setShowSuccessModal(false);
              setTimeout(() => {
                onClose();
                if (typeof onSuccessClose === 'function') {
                  console.log('🔄 [KioskoPay] Llamando a onSuccessClose');
                  onSuccessClose();
                }
              }, 300);
            }}
            orderData={successOrderData}
            tenant={tenant}
            primary={safePrimary}
            secondary={secondary || ''}
            isSecondaryLight={isSecondaryLight}
            textMainClass={isSecondaryLight ? 'text-slate-900' : 'text-white'}
            textMutedClass={isSecondaryLight ? 'text-slate-500' : 'text-slate-400'}
          />
        )}
      </>
    );
  }