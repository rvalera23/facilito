  'use client';

  import React, { useState, useRef, useEffect } from 'react';
  import { createPortal } from 'react-dom';
  import BuyerOrderStatusBadge from './BuyerOrderStatusBadge';
  import OrderTrackingPanel from '@/components/tracking/OrderTrackingPanel';
  import ItemReviewsSection from '@/app/tienda/[slug]/components/ItemReviewsSection';
  import { getPriceColors } from '@/lib/priceTokens';
  import { formatUsd } from '@/lib/price-utils';
import { Image as ImageIcon, ChevronLeft, ChevronRight, X, Building2, CreditCard, Maximize2, Truck, Package, Clock, Mail, Phone, Wallet, CheckCircle, AlertCircle, MapPin, FileText } from 'lucide-react';
  import { 
    formatPrice, 
    getOrderTotalVes, 
    getOrderRate,
    roundPrice,
  } from '../../../admin/[slug]/components/orders/components/hooks/orderUtils';
  // ✅ IMPORTAR CONTEXTO DE TASAS
  import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
  // ✅ IMPORTAR imageUtils PARA IMÁGENES
  import { getImageUrl } from '@/lib/imageUtils';
  import { apiFetch } from '@/lib/api';
  import { Button } from '@/components/ui/Button';
  import { useToast } from '@/components/ui/useToast';
  import { formatPhoneDisplay } from '@/lib/formatPhone';
  // 🔥 IMPORTAR COMPONENTE DE PAGOS MIXTOS
  import { PaymentBreakdown } from '@/app/components/PaymentBreakdown';
  import type {
    CreatePaymentBreakdownPayload,
    ActivePaymentMethod,
  } from '@/app/components/PaymentBreakdown';
  import type { PaymentBreakdown as PaymentBreakdownType } from '@/types/payment-breakdown';

  // 🔥 BANKS - fuente única de verdad
  import { getBankName } from '@/lib/venezuelanBanks';


  // 🔥 OPCIONES DE MENSAJERÍA
  const DELIVERY_COMPANIES: Record<string, { name: string; color: string }> = {
    mrw: { name: 'MRW', color: '#e11d48' },
    domesa: { name: 'Domesa', color: '#0ea5e9' },
    tealca: { name: 'Tealca', color: '#8b5cf6' },
    zoom: { name: 'Zoom', color: '#f59e0b' },
  };

  // 🔥 FUNCIÓN PARA DISPARAR EVENTO DE REFRESCO
  const triggerRefresh = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalRefresh'));
      window.dispatchEvent(new Event('notificationUpdate'));
    }
  };

  // 🔥 FUNCIÓN PARA CALCULAR IVA DE UN ITEM - CORREGIDA
  const calculateItemIVA = (item: any, orderRate: number) => {
    const quantity = Number(item?.quantity || item?.qty || 1);

    // ============================================================
    // 🔥 PRIORIDAD 1: Snapshot guardado en la orden (Fase 3)
    // ============================================================
    if (item.totalPriceVES !== undefined && Number(item.totalPriceVES) > 0) {
      const totalPriceVES = Number(item.totalPriceVES);
      const totalPriceUSD = Number(item.totalPriceUSD || 0);
      const taxAmountVES = Number(item.taxAmountVES || 0);
      const taxAmountUSD = Number(item.taxAmountUSD || 0);
      const basePriceVES = Number(item.basePriceVES || 0);
      const basePriceUSD = Number(item.basePriceUSD || 0);
      const ivaType = item.ivaType || 'excluded';
      const ivaRate = Number(item.ivaRate || 0);
      const unitPrice = totalPriceVES;
      const hasDiscount = item.hasDiscount === true || Number(item.discountAmountVES || 0) > 0;
      const discountPercentage = Number(item.discountPercentage || 0);
      const originalPriceVES = Number(item.originalPriceVES || 0);
      const originalPriceUSD = Number(item.originalPriceUSD || 0);
      const discountAmountVES = Number(item.discountAmountVES || 0);
      const discountAmountUSD = Number(item.discountAmountUSD || 0);

      return {
        ivaType,
        ivaRate,
        ivaAmount: Math.round(taxAmountVES * 100) / 100,
        basePrice: Math.round(basePriceVES * 100) / 100,
        priceWithIVA: Math.round(totalPriceVES * 100) / 100,
        subtotal: Math.round(basePriceVES * quantity * 100) / 100,      quantity,
        unitPrice: Math.round(unitPrice * 100) / 100,
        hasDiscount,
        discountPercentage,
        originalPriceVES,
        originalPriceUSD,
        discountAmountVES,
        discountAmountUSD,
        totalPriceUSD,
        taxAmountUSD,
        basePriceUSD,
        display: ivaType === 'included' ? `IVA Incluido (${ivaRate}%)` :
                ivaType === 'exempt' ? 'Exento de IVA' : `IVA No Incluido (${ivaRate}%)`,
        displayShort: ivaType === 'included' ? 'IVA Inc.' :
                      ivaType === 'exempt' ? 'Exento' : 'IVA +',
        badgeColor: ivaType === 'included' ? '#22c55e' :
                    ivaType === 'exempt' ? '#64748b' : '#f59e0b',
        badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
                ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
      };
    }

    // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
    let unitPrice = 0;
    
    if (item.priceVes !== undefined && item.priceVes !== null && Number(item.priceVes) > 0) {
      unitPrice = Number(item.priceVes);
    } else if (item.unitPrice !== undefined && item.unitPrice !== null && Number(item.unitPrice) > 0) {
      unitPrice = Number(item.unitPrice);
    } else if (item.price !== undefined && item.price !== null && Number(item.price) > 0) {
      const priceVal = Number(item.price);
      if (priceVal > 1000) {
        unitPrice = priceVal;
      } else {
        unitPrice = priceVal * orderRate;
      }
    } else if (item.precio !== undefined && item.precio !== null && Number(item.precio) > 0) {
      const precioVal = Number(item.precio);
      if (precioVal > 1000) {
        unitPrice = precioVal;
      } else {
        unitPrice = precioVal * orderRate;
      }
    } else if (item.prices?.VES !== undefined && Number(item.prices.VES) > 0) {
      unitPrice = Number(item.prices.VES);
    }
    
    if (unitPrice === 0) {
      let usdPrice = 0;
      if (item.priceUsd !== undefined && Number(item.priceUsd) > 0) {
        usdPrice = Number(item.priceUsd);
      } else if (item.prices?.USD !== undefined && Number(item.prices.USD) > 0) {
        usdPrice = Number(item.prices.USD);
      } else if (item.attributes?.prices?.USD !== undefined && Number(item.attributes.prices.USD) > 0) {
        usdPrice = Number(item.attributes.prices.USD);
      }
      if (usdPrice > 0 && orderRate > 0) {
        unitPrice = usdPrice * orderRate;
      }
    }
    
    if (unitPrice === 0) {
      console.warn('⚠️ No se pudo determinar el precio del item:', item?.name || item?.id);
    }
    
    const subtotal = unitPrice * quantity;
    
    const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
    
    let ivaAmount = 0;
    let priceWithIVA = subtotal;
    let basePrice = subtotal;

    if (ivaType === 'excluded') {
      ivaAmount = subtotal * (ivaRate / 100);
      priceWithIVA = subtotal + ivaAmount;
      basePrice = subtotal;
    } else if (ivaType === 'included') {
      ivaAmount = subtotal - (subtotal / (1 + ivaRate / 100));
      priceWithIVA = subtotal;
      basePrice = subtotal - ivaAmount;
    } else {
      ivaAmount = 0;
      priceWithIVA = subtotal;
      basePrice = subtotal;
    }
    
    return {
      ivaType,
      ivaRate,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100,
      priceWithIVA: Math.round(priceWithIVA * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      quantity,
      unitPrice: Math.round(unitPrice * 100) / 100,
      hasDiscount: false,
      discountPercentage: 0,
      originalPriceVES: 0,
      originalPriceUSD: 0,
      discountAmountVES: 0,
      discountAmountUSD: 0,
      display: ivaType === 'included' ? `IVA Incluido (${ivaRate}%)` : 
              ivaType === 'exempt' ? 'Exento de IVA' : `IVA No Incluido (${ivaRate}%)`,
      displayShort: ivaType === 'included' ? 'IVA Inc.' : 
                    ivaType === 'exempt' ? 'Exento' : 'IVA +',
      badgeColor: ivaType === 'included' ? '#22c55e' : 
                  ivaType === 'exempt' ? '#64748b' : '#f59e0b',
      badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' : 
                ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
    };
  };

  // 🔥 FUNCIÓN PARA CALCULAR EL TOTAL DE LA ORDEN CON IVA - CORREGIDA
  const calculateOrderTotalsWithIVA = (order: any, orderRate: number) => {
    const orderItemsList = Array.isArray(order.items) ? order.items : [];
    
    let subtotalVes = 0;
    let totalIVAVes = 0;
    let totalWithIVAVes = 0;
    let hasIncludedIVA = false;
    let hasExcludedIVA = false;
    let hasExemptItems = false;
    let totalIvaRate = 0;
    let ivaInfoList: any[] = [];
    
    orderItemsList.forEach((item: any) => {
      const ivaInfo = calculateItemIVA(item, orderRate);
      ivaInfoList.push(ivaInfo);
      
      // 🔥 subtotalVes usa basePrice × quantity
      const qty = Number(item.quantity || item.qty || 1);
      subtotalVes += ivaInfo.basePrice * qty;
      totalIVAVes += ivaInfo.ivaAmount * qty;
      totalWithIVAVes += ivaInfo.priceWithIVA * qty;
      
      if (ivaInfo.ivaType === 'included') hasIncludedIVA = true;
      if (ivaInfo.ivaType === 'excluded') hasExcludedIVA = true;
      if (ivaInfo.ivaType === 'exempt') hasExemptItems = true;
      if (ivaInfo.ivaRate > totalIvaRate) totalIvaRate = ivaInfo.ivaRate;
    });
    
    // 🔥 El envío vive en paymentMetadata.delivery
    const delivery = order.paymentMetadata?.delivery;
    const shippingVes = delivery?.selected
      ? Number(delivery.costVes || 0)
      : Number(order.shippingCost || 0);
    const totalConIVAVes = totalWithIVAVes + shippingVes;
    let ivaDisplayType = 'Sin IVA';
    let ivaBadgeBg = 'rgba(100,116,139,0.15)';
    let ivaBadgeColor = '#64748b';
    
    if (hasIncludedIVA && hasExcludedIVA) {
      ivaDisplayType = `IVA Mixto (${totalIvaRate}%)`;
      ivaBadgeBg = 'rgba(139,92,246,0.15)';
      ivaBadgeColor = '#8b5cf6';
    } else if (hasIncludedIVA) {
      ivaDisplayType = `IVA ${totalIvaRate}% Incluido`;
      ivaBadgeBg = 'rgba(34,197,94,0.15)';
      ivaBadgeColor = '#22c55e';
    } else if (hasExcludedIVA) {
      ivaDisplayType = `IVA ${totalIvaRate}% No Incluido`;
      ivaBadgeBg = 'rgba(251,191,36,0.15)';
      ivaBadgeColor = '#f59e0b';
    } else if (hasExemptItems && !hasIncludedIVA && !hasExcludedIVA) {
      ivaDisplayType = 'Exento de IVA';
      ivaBadgeBg = 'rgba(100,116,139,0.15)';
      ivaBadgeColor = '#64748b';
    }
    
    return {
      subtotalVes: Math.round(subtotalVes * 100) / 100,
      totalIVAVes: Math.round(totalIVAVes * 100) / 100,
      totalWithIVAVes: Math.round(totalWithIVAVes * 100) / 100,
      shippingVes: Math.round(shippingVes * 100) / 100,
      totalConIVAVes: Math.round(totalConIVAVes * 100) / 100,
      hasIVA: totalIVAVes > 0 || hasIncludedIVA,
      ivaInfoList,
      ivaDisplayType,
      ivaBadgeBg,
      ivaBadgeColor,
      totalIvaRate,
      hasIncludedIVA,
      hasExcludedIVA,
      hasExemptItems,
    };
  };

  // 🔥 FUNCIÓN PARA CALCULAR EL DESCUENTO TOTAL DE LA ORDEN
  const getOrderDiscountInfoLocal = (order: any) => {
    if (!order?.items || !Array.isArray(order.items)) return null;
    
    let totalOriginalVes = 0;
    let totalSavedVes = 0;
    let hasDiscount = false;
    let maxDiscountPercentage = 0;
    
    for (const item of order.items) {
      const quantity = Number(item.quantity || 1);
      const itemHasDiscount = item.hasDiscount === true || Number(item.discountAmountVES || 0) > 0;

      // 🔥 Precio original del item: si tiene descuento, es originalPriceVES; si no, es totalPriceVES
      const originalPriceUnit = itemHasDiscount
        ? Number(item.originalPriceVES || 0)
        : Number(item.totalPriceVES || 0);

      totalOriginalVes += originalPriceUnit * quantity;

      if (itemHasDiscount) {
        hasDiscount = true;
        totalSavedVes += Number(item.discountAmountVES || 0) * quantity;

        const pct = Number(item.discountPercentage || 0);
        if (pct > maxDiscountPercentage) maxDiscountPercentage = pct;
      }
    }
    
    if (!hasDiscount) return null;
    
    return {
      totalOriginalVes: Math.round(totalOriginalVes * 100) / 100,
      totalSavedVes: Math.round(totalSavedVes * 100) / 100,
      maxDiscountPercentage,
      hasDiscount: true,
    };
  };

  // 🔥 HOOK DE REFRESCO
  function useGlobalRefresh({ id, onRefresh, events = [], enabled = true }: any) {
    const refreshFn = React.useRef(onRefresh);

    React.useEffect(() => {
      refreshFn.current = onRefresh;
    }, [onRefresh]);

    const executeRefresh = React.useCallback(async () => {
      if (!enabled) return;
      try {
        await refreshFn.current();
      } catch (error) {
        console.error(`❌ [${id}] Error en refresh:`, error);
      }
    }, [id, enabled]);

    React.useEffect(() => {
      if (!enabled || typeof window === 'undefined') return;

      const handleRefresh = () => executeRefresh();

      window.addEventListener('globalRefresh', handleRefresh);
      events.forEach((eventName: string) => {
        window.addEventListener(eventName, handleRefresh);
      });

      return () => {
        window.removeEventListener('globalRefresh', handleRefresh);
        events.forEach((eventName: string) => {
          window.removeEventListener(eventName, handleRefresh);
        });
      };
    }, [id, events, enabled, executeRefresh]);

    return { triggerRefresh: executeRefresh };
  }

  interface BuyerOrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    primary: string;
    secondary?: string;
    textColor: string;
    isDarkBg: boolean;
    onCancelOrder?: (orderId: string) => Promise<void>;
    isCancelling?: boolean;
    tenantPaymentData?: {
      pagoMovilList?: any[];
      zelle?: any;
      binance?: any;
      paypal?: any;
      activePaymentMethods?: string[];
      specificConfig?: {
        activePaymentMethods?: string[];
        paymentMethods?: any;
      };
      paymentMethods?: any;
    };
    userProducts?: any[];
    onReportPayment?: (orderId: string, paymentData: any) => Promise<void>;
  }

  export default function BuyerOrderDetailModal({
    isOpen,
    onClose,
    order: initialOrder,
    primary,
    secondary,
    textColor,
    isDarkBg,
    onCancelOrder,
    isCancelling = false,
    tenantPaymentData = {},
    userProducts = [],
    onReportPayment,
  }: BuyerOrderDetailModalProps) {
    // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL - NUNCA USAR 784.66
    const { rates, loading: ratesLoading } = useExchangeRateContext();
    const globalRate = rates.USD > 0 ? rates.USD : 0;

    const { showToast } = useToast();

    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [isZoomedModalOpen, setIsZoomedModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isQrZoomed, setIsQrZoomed] = useState(false);
    const [isProofZoomed, setIsProofZoomed] = useState(false);
    const [reviewItemIndex, setReviewItemIndex] = useState(0);
    // 🔥 ESTADOS PARA REPORTAR PAGO
    const [isReportPaymentOpen, setIsReportPaymentOpen] = useState(false);
      // 🔥 ESTADO PARA MÉTODOS ACTIVOS DEL TENANT (Fase 2)
    const [activePaymentMethods, setActivePaymentMethods] = useState<ActivePaymentMethod[]>([]);
    const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false);
    const [breakdownError, setBreakdownError] = useState<string | null>(null);
    const [bankSource, setBankSource] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [paymentFilePreview, setPaymentFilePreview] = useState<string | null>(null);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    
    // 🔥 CAMPOS ADICIONALES PARA PAGO MÓVIL
    const [clientIdType, setClientIdType] = useState('V');
    const [clientIdNumber, setClientIdNumber] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientAccountType, setClientAccountType] = useState('');

    // 🔥 NUEVO: método de pago que el usuario está reportando
    // Inicializado con el método de la orden (o 'efectivo' por defecto)
    const [reportedPaymentMethod, setReportedPaymentMethod] = useState<string>('');

    // 🔥 ESTADO LOCAL DE LA ORDEN
    const [localOrder, setLocalOrder] = useState<any>(initialOrder);
    const orderIdRef = useRef(initialOrder?.id);
    const isMountedRef = useRef(true);

    useEffect(() => {
      if (!initialOrder?.id) return;

      // 🔥 Si es una orden DISTINTA → resetear todo.
      if (initialOrder.id !== orderIdRef.current) {
        orderIdRef.current = initialOrder.id;
        if (isMountedRef.current) {
          setLocalOrder(initialOrder);
        }
        return;
      }

      // 🔥 Si es la MISMA orden pero el padre mandó datos más frescos
      // (ej: creditApplied recién agregado), mergear SIN pisar el localOrder.
      if (isMountedRef.current) {
        setLocalOrder((prev: any) => {
          if (!prev) return initialOrder;

          const prevCredit = prev?.paymentMetadata?.creditApplied;
          const nextCredit = initialOrder?.paymentMetadata?.creditApplied;

          // Si el padre trae creditApplied y el local no lo tiene → mergear.
          // Si el padre trae totalAmount distinto → mergear.
          const needsMerge =
            (!prevCredit && nextCredit) ||
            (prev.totalAmount !== initialOrder.totalAmount) ||
            (prev.status !== initialOrder.status);

          if (!needsMerge) return prev;

          return {
            ...prev,
            ...initialOrder,
            paymentMetadata: {
              ...(prev?.paymentMetadata || {}),
              ...(initialOrder?.paymentMetadata || {}),
            },
          };
        });
      }
    }, [initialOrder]);

    // 🔥 Inicializar el método de pago a reportar cuando la orden cambia
    useEffect(() => {
      if (initialOrder) {
        const method = initialOrder.paymentMethodUsed || initialOrder.paymentMethod || '';
        const lower = method.toLowerCase();

        // Detectar el tipo y normalizar
        if (lower.includes('pago') || lower === 'pago_movil') {
          setReportedPaymentMethod('pago_movil');
        } else if (lower.includes('pos')) {
          setReportedPaymentMethod('pos');
        } else if (lower.includes('biopago')) {
          setReportedPaymentMethod('biopago');
        } else if (lower.includes('zelle')) {
          setReportedPaymentMethod('zelle');
        } else if (lower.includes('binance')) {
          setReportedPaymentMethod('binance');
        } else if (lower.includes('paypal')) {
          setReportedPaymentMethod('paypal');
        } else if (lower.includes('efectivo') || lower === 'cash') {
          setReportedPaymentMethod('efectivo');
        } else {
          // Si no se reconoce, por defecto 'efectivo'
          setReportedPaymentMethod('efectivo');
        }
      }
    }, [initialOrder]);

    // 🔥 CONSTRUIR MÉTODOS DE PAGO ACTIVOS DESDE tenantPaymentData (fuente de verdad)
    useEffect(() => {
      if (!isOpen) return;
      if (!tenantPaymentData) return;

      // 1. Lista de métodos activos
      const rawActive: string[] =
        (tenantPaymentData as any)?.specificConfig?.activePaymentMethods ||
        (tenantPaymentData as any)?.activePaymentMethods ||
        (tenantPaymentData as any)?.specificConfig?.paymentMethods?.activePaymentMethods ||
        (tenantPaymentData as any)?.paymentMethods?.activePaymentMethods ||
        ['cash', 'pago_movil'];

      const activeIds: string[] = Array.isArray(rawActive)
        ? rawActive.filter((m: any) => typeof m === 'string')
        : Object.keys(rawActive || {});

      // 2. Config completa de paymentMethods
      const paymentMethodsConfig =
        (tenantPaymentData as any)?.specificConfig?.paymentMethods ||
        (tenantPaymentData as any)?.paymentMethods ||
        {};

      // 3. Mapear cada método activo a un ActivePaymentMethod con sus cuentas
      const builtMethods: ActivePaymentMethod[] = activeIds.map((id: string) => {
        const config = paymentMethodsConfig?.[id] || {};
        let accounts: any[] = [];

        if (id === 'pago_movil') {
          const list = Array.isArray(paymentMethodsConfig?.pagoMovilList)
            ? paymentMethodsConfig.pagoMovilList
            : (tenantPaymentData?.pagoMovilList || []);
          accounts = list.map((acc: any, i: number) => ({
            id: acc?.id || `pago_movil-${i}`,
            type: 'pago_movil',
            bankName: acc?.bank || '',
            phone: acc?.phone || '',
            ciRif: `${acc?.idType || 'V'}${acc?.idNumber || ''}`,
            operator: acc?.operator || '',
          }));
        } else if (id === 'zelle') {
          const list = Array.isArray(paymentMethodsConfig?.zelleList) && paymentMethodsConfig.zelleList.length > 0
            ? paymentMethodsConfig.zelleList
            : (tenantPaymentData?.zelle ? [tenantPaymentData.zelle] : []);
          accounts = list.map((acc: any, i: number) => ({
            id: acc?.id || `zelle-${i}`,
            type: 'zelle',
            email: acc?.email || acc?.emailOrPhone || '',
            holderName: acc?.holderName || '',
          }));
        } else if (id === 'binance') {
          const list = Array.isArray(paymentMethodsConfig?.binanceList) && paymentMethodsConfig.binanceList.length > 0
            ? paymentMethodsConfig.binanceList
            : (tenantPaymentData?.binance ? [tenantPaymentData.binance] : []);
          accounts = list.map((acc: any, i: number) => ({
            id: acc?.id || `binance-${i}`,
            type: 'binance',
            email: acc?.email || '',
            payId: acc?.payId || '',
          }));
        } else if (id === 'paypal') {
          const cfg = config || tenantPaymentData?.paypal || {};
          accounts = (cfg?.email || cfg?.emailOrLink)
            ? [{ id: 'paypal-0', type: 'paypal', email: cfg.email || cfg.emailOrLink, holderName: cfg.holderName || '' }]
            : [];
        } else if (id === 'wallet' || id === 'zimli') {
          accounts = (config?.address || config?.accountId)
            ? [{ id: `${id}-0`, type: id, address: config.address, accountId: config.accountId, network: config.network || '' }]
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

      console.log('🔍 [BuyerOrderDetailModal] activePaymentMethods CONSTRUIDOS:', builtMethods);
      console.log('🔍 [BuyerOrderDetailModal] activeIds:', activeIds);

      setActivePaymentMethods(builtMethods);
    }, [isOpen, tenantPaymentData]);


    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // ============================================================
    // 🔥 FUNCIÓN PARA ACTUALIZAR LA ORDEN LOCAL
    // ============================================================
    const refreshOrderData = async () => {
      if (!localOrder?.id) return;

      const currentStatus = localOrder.status?.toUpperCase() || '';
      if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
        console.log('⏭️ [BuyerOrderDetailModal] Orden final, no refrescar');
        return;
      }

      // 🔥 Snapshot del id en el momento del fetch. Si el usuario cambia de
      // orden mientras la request está en vuelo, descartamos la respuesta.
      const requestOrderId = localOrder.id;

      try {
        console.log(`🔄 [BuyerOrderDetailModal] Refrescando orden ${requestOrderId}...`);
        const response = await apiFetch(`/orders/${requestOrderId}`);

        if (!response.ok) return;

        const updatedOrder = await response.json();

        // 🔥 Guard: descartar si la orden cambió mientras la request estaba en vuelo
        if (updatedOrder?.id !== requestOrderId) {
          console.log(
            `⏭️ [BuyerOrderDetailModal] Descartando respuesta de ${requestOrderId} (modal ahora en otra orden)`,
          );
          return;
        }
        // 🔥 Guard: descartar si el componente se desmontó
        if (!isMountedRef.current) return;

        const oldStatus = localOrder.status;
        const newStatus = updatedOrder.status;

        if (oldStatus !== newStatus) {
          console.log(`✅ [BuyerOrderDetailModal] Estado cambió: ${oldStatus} → ${newStatus}`);
        }

        setLocalOrder(updatedOrder);
      } catch (error) {
        console.error('❌ [BuyerOrderDetailModal] Error al refrescar orden:', error);
      }
    };

    // ============================================================
    // 🔥 REFRESCAR AUTOMÁTICAMENTE
    // ============================================================
    useEffect(() => {
      if (!isOpen || !localOrder?.id) return;
      
      const status = localOrder.status?.toUpperCase() || '';
      const isFinal = status === 'COMPLETED' || status === 'CANCELLED';
      
      if (isFinal) return;
      
      refreshOrderData();
      
      const interval = setInterval(() => {
        if (isMountedRef.current && isOpen) {
          refreshOrderData();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }, [isOpen, localOrder?.id]);

    // ============================================================
    // 🔥 HANDLE REPORT PAYMENT
    // ============================================================
    const handleSubmitPaymentReport = async () => {
      if (!onReportPayment || !localOrder?.id) return;
      
      // 🔥 Usar el método de pago que el usuario está reportando
      const isReportPagoMovil = reportedPaymentMethod === 'pago_movil';
      const isReportPos = reportedPaymentMethod === 'pos';
      const isReportBiopago = reportedPaymentMethod === 'biopago';
      const isReportEfectivo = reportedPaymentMethod === 'efectivo';
      
      // 🔥 Validaciones según el método reportado
      const requiresBank = isReportPagoMovil || isReportPos || isReportBiopago;
      const requiresReference = !isReportEfectivo;

      if (requiresBank && !bankSource) {
        showToast({
          variant: 'warning',
          message: 'Por favor, completa el banco desde el que pagas',
        });
        return;
      }
      if (requiresReference && !paymentReference) {
        showToast({
          variant: 'warning',
          message: 'Por favor, completa la referencia de pago',
        });
        return;
      }
      
      if (isReportPagoMovil || isReportBiopago || isReportPos) {
        if (!clientIdNumber) {
          showToast({
            variant: 'warning',
            message: 'Por favor, ingresa tu cédula/RIF',
          });
          return;
        }
      }
      
      if (isReportPagoMovil) {
        if (!clientPhone) {
          showToast({
            variant: 'warning',
            message: 'Por favor, ingresa tu teléfono',
          });
          return;
        }
      }
      
      if (isReportPos) {
        if (!clientAccountType) {
          showToast({
            variant: 'warning',
            message: 'Por favor, selecciona el tipo de cuenta',
          });
          return;
        }
      }

      setIsSubmittingPayment(true);
      try {
        const paymentPayload: any = {
          bankSource,
          paymentReference,
          clientIdNumber,
          clientIdType: clientIdType || 'V',
          clientPhone: clientPhone || '',
          reportedPaymentMethod, // 🔥 incluir el método que el usuario está reportando
        };
        
        if (paymentFile) {
          paymentPayload.paymentProof = paymentFile;
        }
        
        if (isPos) {
          paymentPayload.clientAccountType = clientAccountType;
        }
        
        const isEfectivo = paymentMethod.toLowerCase().includes('efectivo') || paymentMethod === 'cash';
        const shouldAutoVerify = isEfectivo || isPos;
        
        if (shouldAutoVerify) {
          paymentPayload.autoVerify = true;
          paymentPayload.status = 'COMPLETED';
        }

        await onReportPayment(localOrder.id, paymentPayload);

        setIsReportPaymentOpen(false);
        setBankSource('');
        setPaymentReference('');
        setPaymentFile(null);
        setPaymentFilePreview(null);
        setClientIdNumber('');
        setClientPhone('');
        setClientAccountType('');
        // No reseteamos reportedPaymentMethod — se reinicializa al abrir el modal
        
        setLocalOrder((prev: any) => ({
          ...prev,
          status: shouldAutoVerify ? 'COMPLETED' : 'por_verificar',
          bankSource: bankSource,
          paymentReference: paymentReference,
          paymentMetadata: {
            ...prev?.paymentMetadata,
            bankSource: bankSource,
            paymentReference: paymentReference,
            clientIdNumber: clientIdNumber,
            clientIdType: clientIdType || 'V',
            clientPhone: clientPhone || '',
            clientAccountType: clientAccountType || '',
            paymentProof: paymentFile ? 'pending_upload' : undefined,
            reportedAt: new Date().toISOString(),
          }
        }));

        setTimeout(() => {
          refreshOrderData();
        }, 500);
        
        triggerRefresh();
        
      } catch (error) {
        console.error('Error al reportar pago:', error);
        showToast({
          variant: 'error',
          message: 'Error al reportar el pago. Intenta de nuevo.',
        });
      } finally {
        setIsSubmittingPayment(false);
      }
    };

    // ============================================================
    // 🔥 HANDLER: REPORTAR PAGO MIXTO (Fase 2)
    // ============================================================
    const handleSubmitBreakdown = async (payload: CreatePaymentBreakdownPayload) => {
      if (!localOrder?.id) return;
      setIsSubmittingBreakdown(true);
      setBreakdownError(null);

      try {
        const response = await apiFetch(
          `/orders/${localOrder.id}/payment-breakdown`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 'Error al reportar el pago',
          );
        }

        const updatedOrder = await response.json();
        setLocalOrder(updatedOrder);
        setIsReportPaymentOpen(false);
        triggerRefresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al reportar el pago';
        setBreakdownError(message);
        throw err;
      } finally {
        setIsSubmittingBreakdown(false);
      }
    };

    if (!isOpen || !localOrder) return null;

    const order = localOrder;

    const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');
    const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)';
    const priceColors = getPriceColors({ primary, isDarkBg });
        const priceColor = isDarkBg ? '#4ade80' : '#15803d';

    const dynamicSubCardStyle = {
      backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderColor: borderDynamic,
      color: textColor
    };

    // 🔥 OBTENER DATOS DE MENSAJERÍA (el envío vive en paymentMetadata.delivery)
    const deliveryData = order.paymentMetadata?.delivery || order.attributes?.delivery || order.delivery || {};
    const deliveryCompany = deliveryData.company;
    const companyInfo = deliveryCompany ? DELIVERY_COMPANIES[deliveryCompany] : null;
    // 🔥 SOLO MOSTRAR MENSAJERÍA SI HAY DATOS DE ENVÍO
    const hasDelivery = !!(deliveryCompany || deliveryData.companyName || deliveryData.cost || deliveryData.trackingNumber);

    const getBaseUrl = (): string => {
      return process.env.NEXT_PUBLIC_API_URL;
    };

    // 🔥 FUNCIÓN PARA OBTENER URL DEL COMPROBANTE
    const getProofUrl = (proofPath: string) => {
      if (!proofPath) return null;
      const apiBase = getBaseUrl();
      if (proofPath.includes('localhost')) {
        return proofPath.replace(/http:\/\/localhost:\d+/, apiBase).replace(/https:\/\/localhost:\d+/, apiBase);
      }
      if (proofPath.startsWith('http://') || proofPath.startsWith('https://')) return proofPath;
      if (proofPath.startsWith('/')) return `${apiBase}${proofPath}`;
      return `${apiBase}/${proofPath}`;
    };

    const isImageFile = (url: string) => {
      if (!url) return false;
      return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
    };

    // 🔥 OBTENER IMAGEN USANDO imageUtils
    const getItemImage = (item: any) => {
      if (!item) return null;
      return getImageUrl(item);
    };

    const getAllOrderImages = () => {
      if (!order) return [];
      const images: string[] = [];
      const items = order.items || [];
      items.forEach((item: any) => {
        const img = getImageUrl(item);
        if (img && !images.includes(img)) images.push(img);
      });
      return images;
    };

    const allImages = getAllOrderImages();
    const currentImg = allImages[selectedImageIndex] || allImages[0] || null;

    const goToPrevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (allImages.length > 1) {
        setSelectedImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
      }
    };

    const goToNextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (allImages.length > 1) {
        setSelectedImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
      }
    };

    // 🔥 OBTENER TASA DE CAMBIO - DINÁMICA (NUNCA 784.66)
    let orderRate = getOrderRate(order);
    // Si no tiene tasa, usar globalRate
    if (!orderRate || orderRate === 0) {
      orderRate = globalRate;
    }

    // 🔥 DECLARAR orderItemsList ANTES DE USARLO
    const orderItemsList = Array.isArray(order.items) ? order.items : [];

    // 🔥 CALCULAR TOTALES CON IVA
    const totalsWithIVA = calculateOrderTotalsWithIVA(order, orderRate);
    const { 
      subtotalVes, 
      totalIVAVes, 
      totalWithIVAVes, 
      shippingVes, 
      totalConIVAVes, 
      hasIVA, 
      ivaInfoList,
      ivaDisplayType,
      ivaBadgeBg,
      ivaBadgeColor,
      totalIvaRate,
      hasIncludedIVA,
      hasExcludedIVA,
      hasExemptItems
    } = totalsWithIVA;
    const orderDiscountInfo = getOrderDiscountInfoLocal(order);
    // 🔥 ENRIQUECER ITEMS CON IVA PARA LA TABLA (AHORA orderItemsList YA ESTÁ DECLARADO)
    const enrichedItems = orderItemsList.map((item: any, index: number) => {
      const ivaInfo = ivaInfoList[index] || calculateItemIVA(item, orderRate);
      return {
        ...item,
        _ivaInfo: ivaInfo,
        unitPriceVes: ivaInfo.unitPrice,
        subtotalVes: ivaInfo.basePrice,
        priceWithIVA: ivaInfo.priceWithIVA,
        ivaType: ivaInfo.ivaType,
        ivaRate: ivaInfo.ivaRate,
      };
    });

    // 🔥 CALCULAR TOTALES
    const totalItems = orderItemsList.reduce((sum: number, item: any) => sum + (item.quantity || item.qty || 1), 0);
    // 🔥 totalAmount y totalAmountVes del backend YA incluyen IVA + envío - saldo a favor.
    // NO sumarle tax ni shipping de nuevo, o el descuento se pierde.
    const totalUsd = Number(order.totalAmount || 0);
    const totalVes = Number(order.totalAmountVes || totalConIVAVes);
    // 🔥 Saldo a favor aplicado (para mostrarlo como línea en el desglose)
    const creditAppliedVes = Number(order.paymentMetadata?.creditApplied?.amountVes || 0);

    // ============================================================
    // 🔥 NORMALIZAR ESTADO - CORREGIDO PARA ACEPTAR "PENDIENTE" Y "PENDING"
    // ============================================================
    const normalizedStatus = order.status?.toUpperCase().trim() || '';

    const isCompleted = normalizedStatus === 'COMPLETED' || normalizedStatus === 'COMPLETADA' || normalizedStatus === 'PAGADO' || normalizedStatus === 'APROBADO';
    const isCancelled = normalizedStatus === 'CANCELLED' || normalizedStatus === 'CANCELADA' || normalizedStatus === 'RECHAZADO' || normalizedStatus === 'RECHAZADA';
    const isLocked = isCompleted || isCancelled;
    const isPending = normalizedStatus === 'PENDING' || normalizedStatus === 'PENDIENTE' || normalizedStatus === 'POR_PAGAR';
    const isVerifying = normalizedStatus === 'POR_VERIFICAR' || normalizedStatus === 'VERIFICANDO' || normalizedStatus === 'EN_VERIFICACION';

    // ============================================================
    // 🔥 OBTENER MÉTODO DE PAGO
    // ============================================================
    const paymentMethod = order.paymentMethodUsed || order.paymentMethod || '';

    // 🔥 Flags basados en el método de pago ORIGINAL de la orden (para mostrar en la ficha)
    const isPagoMovil = paymentMethod.toLowerCase().includes('pago') || paymentMethod === 'pago_movil';
    const isEfectivo = paymentMethod.toLowerCase().includes('efectivo') || paymentMethod === 'cash';
    const isPos = paymentMethod.toLowerCase().includes('pos');
    const isBiopago = paymentMethod.toLowerCase().includes('biopago');

    // 🔥 Flags basados en el método que el usuario está REPORTANDO (para el modal de reportar)
    const isReportPagoMovil = reportedPaymentMethod === 'pago_movil';
    const isReportEfectivo = reportedPaymentMethod === 'efectivo';
    const isReportPos = reportedPaymentMethod === 'pos';
    const isReportBiopago = reportedPaymentMethod === 'biopago';
    const isReportZelle = reportedPaymentMethod === 'zelle';
    const isReportBinance = reportedPaymentMethod === 'binance';
    const isReportPaypal = reportedPaymentMethod === 'paypal';

      // 🔥 DEBUG TEMPORAL - quitar después
    console.log('🔍 [BuyerOrderDetailModal] paymentMethod:', JSON.stringify(paymentMethod));
    console.log('🔍 [BuyerOrderDetailModal] isPagoMovil:', isPagoMovil);
    console.log('🔍 [BuyerOrderDetailModal] isEfectivo:', isEfectivo);
    console.log('🔍 [BuyerOrderDetailModal] isPos:', isPos);
    console.log('🔍 [BuyerOrderDetailModal] isBiopago:', isBiopago);
    console.log('🔍 [BuyerOrderDetailModal] isReportPaymentOpen:', isReportPaymentOpen);

    // ============================================================
    // 🔥 CONDICIONES DE ACCIONES
    // ============================================================
    // 🔥 REGLA DE NEGOCIO: El comprador solo puede cancelar en PENDING o POR_VERIFICAR.
    // Si ya está CONFIRMED (o superior), debe contactar al vendedor.
    const isCancelableStatus = ['PENDING', 'POR_VERIFICAR'].includes(normalizedStatus);
    const canCancel = isCancelableStatus && !isLocked && !isVerifying && onCancelOrder;

    const hasPaymentReport = !!(order.paymentMetadata?.bankSource || order.bankSource || 
                              order.paymentMetadata?.paymentReference || order.paymentReference || 
                              order.paymentMetadata?.paymentProof || order.paymentProof);
    const paymentReport = order.paymentMetadata || {};
    const reportBankSource = paymentReport.bankSource || order.bankSource || '';
    const reportPaymentReference = paymentReport.paymentReference || order.paymentReference || '';
    const reportClientIdNumber = paymentReport.clientIdNumber || order.clientIdNumber || '';
    const reportClientIdType = paymentReport.clientIdType || order.clientIdType || 'V';
    const reportClientPhone = paymentReport.clientPhone || order.clientPhone || '';
    const canReportPayment = isPending && !hasPaymentReport && onReportPayment;

    // ============================================================
    // SELLER PAYMENT DATA
    // ============================================================
    const getSellerPaymentData = () => {
      const pagoMovilList = tenantPaymentData?.pagoMovilList || [];
      const zelle = tenantPaymentData?.zelle || null;
      const binance = tenantPaymentData?.binance || null;
      const paypal = tenantPaymentData?.paypal || null;

      let selectedPagoMovil = null;
      
      if (isPagoMovil && pagoMovilList.length > 0) {
        if (order.paymentReference) {
          selectedPagoMovil = pagoMovilList.find((pm: any) => 
            pm.phone && order.paymentReference.includes(pm.phone)
          ) || pagoMovilList[0];
        } else {
          selectedPagoMovil = pagoMovilList[0];
        }
      }

      return { pagoMovilList, selectedPagoMovil, zelle, binance, paypal };
    };

    const sellerData = getSellerPaymentData();

    // ============================================================
    // FORMAT DATE
    // ============================================================
    const formatDate = (date: string) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return createPortal(
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in overflow-y-auto"
        style={{ backgroundColor: overlayBg }}
        onClick={onClose}
      >
        <div 
          className="w-full max-w-5xl rounded-3xl border shadow-2xl flex flex-col my-auto max-h-[92vh] transition-all overflow-hidden"
          style={{ 
            backgroundColor: cardBg,
            border: `1px solid ${borderDynamic}`,
            color: textColor
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div 
            className="px-6 py-4 border-b flex items-center justify-between shrink-0"
            style={{ 
              borderColor: borderDynamic,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primary }}></span>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>Detalles de tu Orden</span>
                <h3 className="text-sm sm:text-base font-bold" style={{ color: textColor }}>
                  #{order.id ? order.id.slice(0, 12) : 'N/A'}
                </h3>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95`}
              style={dynamicSubCardStyle}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Columna Izquierda: Imagen */}
              <div className="md:col-span-5 space-y-4">
                <div 
                  className="aspect-square rounded-3xl border overflow-hidden flex items-center justify-center relative group shadow-inner cursor-pointer"
                  style={dynamicSubCardStyle}
                  onClick={() => currentImg && setIsZoomedModalOpen(true)}
                >
                  {currentImg ? (
                    <img 
                      src={currentImg} 
                      alt="Producto" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Sin+Imagen';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <ImageIcon className="w-16 h-16 opacity-20" />
                      <span className="text-xs opacity-40 mt-2">Sin imagen disponible</span>
                    </div>
                  )}
                </div>

                {allImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {allImages.map((imgUrl: string, idx: number) => {
                      const isSelected = idx === selectedImageIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border shrink-0 transition-all relative group cursor-pointer ${isSelected ? 'ring-2 shadow-md scale-105' : 'opacity-60 hover:opacity-100'}`}
                          style={{ borderColor: isSelected ? primary : borderDynamic }}
                        >
                          <img src={imgUrl} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Columna Derecha: Información */}
              <div className="md:col-span-7 space-y-5">
                
                {/* Estado y Acciones */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium opacity-70" style={{ color: textColor }}>Estado:</span>
                    <BuyerOrderStatusBadge status={order.status} isDarkBg={isDarkBg} />
                    {isLocked && (
                      <span 
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border opacity-60 flex items-center gap-1"
                        style={{ 
                          borderColor: borderDynamic, 
                          color: textColor,
                          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                        }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Bloqueado</span>
                      </span>
                    )}
                  </div>

                  {canReportPayment && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsReportPaymentOpen(true)}
                      icon={<Wallet className="w-3.5 h-3.5" />}
                      primary={primary}
                      borderColor={borderDynamic}
                      textColor={textColor}
                      cardBg={cardBg}
                      isDarkBg={isDarkBg}
                    >
                      Reportar Pago
                    </Button>
                  )}

                {canCancel && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setIsCancelModalOpen(true)}
                    loading={isCancelling}
                    primary={primary}
                    borderColor={borderDynamic}
                    textColor={textColor}
                    cardBg={cardBg}
                    isDarkBg={isDarkBg}
                  >
                    Cancelar
                  </Button>
                )}
                {!canCancel && !isLocked && normalizedStatus === 'CONFIRMED' && (
                  <div
                    className="px-3 py-1.5 rounded-xl border text-[10px] font-semibold flex items-center gap-1.5"
                    style={{
                      borderColor: 'rgba(251,191,36,0.3)',
                      backgroundColor: 'rgba(251,191,36,0.1)',
                      color: isDarkBg ? '#fbbf24' : '#b45309',
                    }}
                    title="El pedido ya fue confirmado. Contactá al vendedor para cancelar."
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Contactá al vendedor para cancelar
                  </div>
                )}
              </div>

              {/* 🔥 TRACKING EN VIVO (delivery local) — solo si la orden es delivery y está activa */}
              {(order.paymentMetadata?.fulfillment === 'delivery' ||
                (!order.paymentMetadata?.fulfillment && order.orderType === 'delivery')) &&
                !isCancelled && !isCompleted && (
                <OrderTrackingPanel
                  orderId={order.id}
                  safePrimary={primary}
                  textMainClass={textColor}
                  textMutedClass={isDarkBg ? 'text-slate-400' : 'text-slate-500'}
                  mapHeight={300}
                />
              )}

              {/* 🔥 SECCIÓN MENSAJERÍA - SOLO SI HAY DATOS DE ENVÍO */}
                {hasDelivery && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" style={{ color: companyInfo?.color || primary }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>Mensajería</span>
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ 
                            backgroundColor: `${companyInfo?.color || primary}20`, 
                            color: companyInfo?.color || primary 
                          }}
                        >
                          {companyInfo?.name || deliveryData.companyName || deliveryData.company || 'Envío'}
                        </span>
                      </div>
                      {deliveryData.costUsd === null ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: 'rgba(251,191,36,0.15)',
                            color: isDarkBg ? '#fbbf24' : '#b45309',
                            border: '1px solid rgba(251,191,36,0.3)',
                          }}
                        >
                          Cobro a destino
                        </span>
                      ) : (deliveryData.costVes || deliveryData.cost) ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-bold" style={{ color: primary }}>
                            Bs. {formatPrice(Number(deliveryData.costVes || deliveryData.cost || 0))}
                          </span>
                          {deliveryData.costUsd && (
                            <span className="text-[10px] font-semibold" style={{ color: priceColors.foreign }}>
(${formatUsd(Number(deliveryData.costUsd))})
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                    
                    {deliveryData.estimatedDays && (
                      <p className="text-[10px] opacity-60 mt-1 flex items-center gap-1" style={{ color: textColor }}>
                        <Clock className="w-3 h-3" /> Tiempo estimado: {deliveryData.estimatedDays}
                      </p>
                    )}
                    
                    {deliveryData.trackingNumber && (
                      <div className="mt-2 p-2 rounded-lg bg-black/5 flex items-center gap-2" style={{ borderColor: borderDynamic }}>
                        <Package className="w-3.5 h-3.5 opacity-40" />
  <span className="text-xs font-medium" style={{ color: textColor }}>{deliveryData.trackingNumber}</span>                      {deliveryData.trackingUrl && (
                          <a 
                            href={deliveryData.trackingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold underline"
                            style={{ color: primary }}
                          >
                            Seguir
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 🔥 DELIVERY LOCAL — snapshot del checkout */}
                {order.paymentMetadata?.fulfillment === 'delivery' && order.paymentMetadata?.localDelivery && (
  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4" style={{ color: primary }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>
          Delivery Local
        </span>
      </div>
      {order.paymentMetadata.localDelivery.fee != null && (
        <span className="text-xs font-bold" style={{ color: primary }}>
          {Number(order.paymentMetadata.localDelivery.fee) === 0
            ? 'Gratis'
: `$${formatUsd(Number(order.paymentMetadata.localDelivery.fee))}`}
        </span>
      )}
    </div>
    <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: textColor }}>
      {order.paymentMetadata.localDelivery.distanceKm != null && (
        <span className="flex items-center gap-1 opacity-70">
          <MapPin className="w-3 h-3" />
          {Number(order.paymentMetadata.localDelivery.distanceKm).toFixed(2)} km
        </span>
      )}
      {order.paymentMetadata.localDelivery.etaMinutes != null && (
        <span className="flex items-center gap-1 opacity-70">
          <Clock className="w-3 h-3" />
          ~{order.paymentMetadata.localDelivery.etaMinutes} min
        </span>
      )}
    </div>
  </div>
)}

                {order.paymentMetadata?.fulfillment === 'pickup' && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" style={{ color: primary }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>
                          Retiro en el local
                        </span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: primary }}>Sin costo de envío</span>
                    </div>
                  </div>
                )}

                {/* 🔥 SECCIÓN DEL MÉTODO DE PAGO - SIEMPRE SE MUESTRA */}
                {!order.paymentBreakdown && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" style={{ color: primary }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary }}>Método de Pago</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-sm font-medium" style={{ color: textColor }}>
                        {paymentMethod || 'No especificado'}
                      </span>
                      {order.paymentReference && (
                        <span className="text-xs opacity-60 ml-2" style={{ color: textColor }}>
                          Ref: {order.paymentReference}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 🔥 BLOQUE DE VUELTO - SIEMPRE QUE EXISTA */}
                {order.paymentMetadata?.change && Number(order.paymentMetadata.change.amountVes) > 0 && (() => {
                  const change = order.paymentMetadata.change;
                  const resolution = change.resolution;
                  const amountVes = Number(change.amountVes || 0);
                  const amountUsd = Number(change.amountUsd || 0);
                  const pref = change.deliveryPreference;
                  const deliveredMethod = change.deliveryMethod;
                  const deliveredPm = change.deliveryPagoMovilData;

                  // 🔥 Color + icono según el estado
                  let bg = 'rgba(251,191,36,0.08)';
                  let border = 'rgba(251,191,36,0.3)';
                  let titleColor = '#f59e0b';

                  if (resolution === 'credit' && change.creditCreated === true) {
                    bg = 'rgba(34,197,94,0.08)';
                    border = 'rgba(34,197,94,0.3)';
                    titleColor = '#22c55e';
                  } else if (resolution === 'delivered') {
                    bg = 'rgba(34,197,94,0.08)';
                    border = 'rgba(34,197,94,0.3)';
                    titleColor = '#22c55e';
                  } else if (resolution === 'rounded') {
                    bg = isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                    border = borderDynamic;
                    titleColor = isDarkBg ? '#94a3b8' : '#64748b';
                  }

                  return (
                    <div
                      className="p-4 rounded-xl border space-y-2"
                      style={{ backgroundColor: bg, borderColor: border }}
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 shrink-0" style={{ color: titleColor }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: titleColor }}>
                          Vuelto
                        </span>
                      </div>

                      {/* CASO A: SALDO A FAVOR ACREDITADO */}
                      {resolution === 'credit' && change.creditCreated === true && (
                        <div className="space-y-1">
                          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#22c55e' }}>
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            Bs. {formatPrice(amountVes)} acreditados a tu cuenta
                          </p>
                          <p className="text-[11px]" style={{ color: textColor }}>
                            El saldo a favor ya está disponible para tu próxima compra.
                          </p>
                          <p className="text-[10px]" style={{ color: textColor, opacity: 0.7 }}>
                            Podés verlo en{' '}
                            <span className="font-bold" style={{ color: primary }}>
                              Mi Cuenta → Saldo a favor
                            </span>
                            .
                          </p>
                        </div>
                      )}

                      {/* CASO B: SALDO A FAVOR PENDIENTE */}
                      {resolution === 'credit' && change.creditCreated !== true && (
                        <div className="space-y-1">
                          <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                            Bs. {formatPrice(amountVes)} se acreditarán como saldo a favor
                          </p>
                          <p className="text-[11px]" style={{ color: textColor }}>
                            Se acreditarán cuando el vendedor confirme el pago.
                          </p>
                        </div>
                      )}

                      {/* CASO C: VUELTO ENTREGADO */}
                      {resolution === 'delivered' && (
                        <div className="space-y-1">
                          <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#22c55e' }}>
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            Bs. {formatPrice(amountVes)} entregados
                          </p>
                          {deliveredMethod && (
                            <p className="text-[11px]" style={{ color: textColor }}>
                              <b>Vía:</b>{' '}
                              {deliveredMethod === 'cash_ves'
                                ? 'Efectivo Bs.'
                                : deliveredMethod === 'cash_usd'
                                ? 'Efectivo USD'
                                : deliveredMethod === 'pago_movil'
                                ? 'Pago Móvil'
                                : 'Otro'}
                            </p>
                          )}
                          {deliveredMethod === 'pago_movil' && deliveredPm && (
                            <div className="text-[10px] space-y-0.5" style={{ color: textColor, opacity: 0.8 }}>
                              <div><b>Banco:</b> {deliveredPm.bank}</div>
                              <div><b>Teléfono:</b> {deliveredPm.phone}</div>
                              <div><b>Cédula:</b> {deliveredPm.clientIdType}-{deliveredPm.clientIdNumber}</div>
                              {deliveredPm.reference && <div><b>Referencia:</b> {deliveredPm.reference}</div>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CASO D: VUELTO PENDIENTE */}
                      {resolution === 'pending' && (
                        <div className="space-y-1">
                          <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                            Bs. {formatPrice(amountVes)} pendientes por recibir
                          </p>

                          {pref?.method === 'pago_movil' && (
                            <>
                              <p className="text-[11px]" style={{ color: textColor }}>
                                Pediste recibirlo por <b>Pago Móvil</b>:
                              </p>
                              {pref.pagoMovilData && (
                                <div className="text-[10px] space-y-0.5" style={{ color: textColor, opacity: 0.8 }}>
                                  {pref.pagoMovilData.bank && <div><b>Banco:</b> {pref.pagoMovilData.bank}</div>}
                                  {pref.pagoMovilData.phone && <div><b>Teléfono:</b> {pref.pagoMovilData.phone}</div>}
                                  {pref.pagoMovilData.clientIdNumber && (
                                    <div>
                                      <b>Cédula:</b> {pref.pagoMovilData.clientIdType || 'V'}-
                                      {pref.pagoMovilData.clientIdNumber}
                                    </div>
                                  )}
                                </div>
                              )}
                              <p className="text-[10px] italic" style={{ color: textColor, opacity: 0.7 }}>
                                La tienda procesará el vuelto al confirmar tu pedido.
                              </p>
                            </>
                          )}

                          {pref?.method === 'cash_ves' && (
                            <p className="text-[11px]" style={{ color: textColor }}>
                              Pediste recibirlo en <b>efectivo (Bs.)</b>. La tienda te lo entregará al confirmar.
                            </p>
                          )}

                          {pref?.method === 'cash_usd' && (
                            <p className="text-[11px]" style={{ color: textColor }}>
Pediste recibirlo en <b>efectivo (USD)</b> — ${formatUsd(amountUsd)}. La tienda te lo entregará al confirmar.
                            </p>
                          )}

                          {pref?.method === 'other' && (
                            <p className="text-[11px]" style={{ color: textColor }}>
                              Pediste recibirlo por <b>otro método</b>
                              {pref.notes ? ` ("${pref.notes}")` : ''}. Coordiná con la tienda.
                            </p>
                          )}

                          {!pref && (
                            <p className="text-[11px]" style={{ color: textColor }}>
                              Coordiná con la tienda cómo querés recibir el vuelto.
                            </p>
                          )}
                        </div>
                      )}

                      {/* CASO E: REDONDEO */}
                      {resolution === 'rounded' && (
                        <div className="space-y-1">
                          <p className="text-sm font-bold" style={{ color: textColor, opacity: 0.9 }}>
                            Aceptaste el redondeo
                          </p>
                          <p className="text-[11px]" style={{ color: textColor, opacity: 0.7 }}>
                            El vuelto de Bs. {formatPrice(amountVes)} quedó a favor de la tienda.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 🔥 DESGLOSE DE PAGO MIXTO (Fase 2) - SOLO SI YA FUE REPORTADO */}
                {order.paymentBreakdown && (
                  <PaymentBreakdown
                    mode="view"
                    totalVes={totalVes}
                    exchangeRate={orderRate}
                    activeMethods={activePaymentMethods}
                    initialBreakdown={order.paymentBreakdown as PaymentBreakdownType}
                    canResolveChange={false}
                    primary={primary}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                    borderColor={borderDynamic}
                    cardBg={cardBg}
                  />
                )}

                {/* 🔥 MENSAJES DE ESTADO */}
                {isPending && !hasPaymentReport && (
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <p className="text-xs text-amber-400">Esta orden está pendiente de pago. Reporta tu pago para que el vendedor lo confirme.</p>
                  </div>
                )}

                {isPending && hasPaymentReport && (
                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-blue-400">Tu pago ha sido reportado. El vendedor lo está verificando.</p>
                  </div>
                )}

                {isVerifying && hasPaymentReport && (
                  <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <p className="text-xs text-sky-400">Tu pago está siendo verificado por el vendedor. Recibirás una notificación cuando sea confirmado.</p>
                  </div>
                )}

                {isCompleted && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-emerald-400">Esta orden ha sido completada exitosamente.</p>
                  </div>
                )}

                {/* 🔥 CLIENTE Y FECHA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border" style={dynamicSubCardStyle}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: textColor }}>Cliente</span>
                    <p className="text-sm font-medium mt-0.5" style={{ color: textColor }}>
                      {order.customerName || order.userName || order.clientName || 'Cliente'}
                    </p>
                    {order.customerEmail && (
                      <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5" style={{ color: textColor }}>
                        <Mail className="w-3 h-3" />
                        {order.customerEmail}
                      </p>
                    )}
                    {order.customerPhone && (
                      <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5" style={{ color: textColor }}>
                        <Phone className="w-3 h-3" />
                        Tel: {formatPhoneDisplay(order.customerPhone)}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: textColor }}>Fecha</span>
                    <p className="text-sm font-medium mt-0.5" style={{ color: textColor }}>
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>

                {/* 🔥 BADGE DE IVA */}
                {hasIVA && orderItemsList.length > 0 && (
                  <div className="flex justify-end">
                    <span 
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
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

                {/* 🔥 RESUMEN DE LA ORDEN - SIN BATCH VERDE DEL TOTAL */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block" style={{ color: textColor }}>Resumen de la Orden</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                      <span className="font-bold opacity-50 text-[8px] uppercase tracking-wider mb-0.5" style={{ color: textColor }}>Artículos</span>
                      <span className="font-semibold text-xs" style={{ color: textColor }}>{totalItems} unidades</span>
                    </div>
                    <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                      <span className="font-bold opacity-50 text-[8px] uppercase tracking-wider mb-0.5" style={{ color: textColor }}>Subtotal</span>
                      <span className="font-semibold text-xs" style={{ color: priceColor }}>Bs. {formatPrice(subtotalVes)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                      <span className="font-bold opacity-50 text-[8px] uppercase tracking-wider mb-0.5" style={{ color: textColor }}>Productos</span>
                      <span className="font-semibold text-xs" style={{ color: textColor }}>{orderItemsList.length} diferente(s)</span>
                    </div>
                  </div>
                </div>

                {/* 🔥 TABLA DE ARTÍCULOS CON IVA */}
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: borderDynamic }}>
                  <table className="w-full text-xs">
                    <thead className="border-b" style={{ borderColor: borderDynamic }}>
                      <tr className="opacity-60">
                        <th className="px-3 py-2 text-left font-bold w-10">#</th>
                        <th className="px-3 py-2 text-left font-bold">Producto</th>
                        <th className="px-3 py-2 text-right font-bold">Cant.</th>
                        <th className="px-3 py-2 text-right font-bold">Precio</th>
                        <th className="px-3 py-2 text-right font-bold">Total</th>
                      </tr>
                    </thead>
                <tbody>
    {enrichedItems.map((item: any, idx: number) => {
      const quantity = Number(item.quantity || item.qty || 1);
      const ivaInfo = item._ivaInfo;
      // ✅ CORREGIDO: usar unitPrice (precio unitario) en lugar de priceWithIVA (que ya está multiplicado)
      const priceVes = ivaInfo?.unitPrice || item.priceVes || item.price || 0;
      // ✅ CORREGIDO: multiplicar precio unitario × cantidad (una sola vez)
      const totalItem = priceVes * quantity;
      const itemName = item.name || item.productName || item.title || 'Producto';
      const itemImage = getItemImage(item);
      
      // 🔥 OBTENER DESCUENTO DEL ITEM (desde el snapshot)
      const hasDiscount = ivaInfo?.hasDiscount || false;
      const originalPriceVes = hasDiscount ? ivaInfo.originalPriceVES : priceVes;
      const discountPercentage = hasDiscount ? ivaInfo.discountPercentage : 0;
      const savedVes = hasDiscount ? (ivaInfo.originalPriceVES - ivaInfo.priceWithIVA) * quantity : 0;
      // 🔥 BADGE DE IVA PARA EL PRODUCTO
      let ivaBadge = '';
      if (ivaInfo?.ivaType === 'excluded') {
        ivaBadge = `+${ivaInfo.ivaRate}%`;
      } else if (ivaInfo?.ivaType === 'included') {
        ivaBadge = `IVA ${ivaInfo.ivaRate}%`;
      } else if (ivaInfo?.ivaType === 'exempt') {
        ivaBadge = 'Exento';
      }
      
      return (
        <tr key={idx} className="border-t" style={{ borderColor: borderDynamic }}>
          <td className="px-3 py-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border flex items-center justify-center" style={dynamicSubCardStyle}>
              {itemImage ? (
                <img 
                  src={itemImage} 
                  alt={itemName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <ImageIcon className="w-3 h-3 opacity-40" />
              )}
            </div>
          </td>
          <td className="px-3 py-2 font-medium">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{itemName}</span>
              {ivaBadge && (
                <span 
                  className="text-[7px] font-bold px-1.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: ivaInfo?.badgeBg || 'rgba(100,116,139,0.15)',
                    borderColor: `${ivaInfo?.badgeColor || '#64748b'}30`,
                    color: ivaInfo?.badgeColor || '#64748b'
                  }}
                >
                  {ivaBadge}
                </span>
              )}
              {/* 🔥 BADGE DE DESCUENTO */}
              {hasDiscount && (
                <span 
                  className="text-[7px] font-bold px-1.5 py-0.5 rounded-full border animate-pulse"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.2)',
                    borderColor: 'rgba(239,68,68,0.3)',
                    color: '#f87171'
                  }}
                >
  -{discountPercentage}%              </span>
              )}
            </div>
            {hasDiscount && (
              <div className="text-[8px] flex items-center gap-2" style={{ color: priceColors.foreign }}>
                                <span className="line-through opacity-50" style={{ color: textColor }}>
                  Bs. {formatPrice(originalPriceVes)}
                </span>
                <span className="font-bold">Ahorras Bs. {formatPrice(savedVes)}</span>
              </div>
            )}
            {ivaInfo?.ivaType === 'excluded' && ivaInfo.ivaAmount > 0 && (
              <div className="text-[8px] opacity-50" style={{ color: textColor }}>
                Base: Bs. {formatPrice(ivaInfo.basePrice)} + {ivaInfo.ivaRate}% IVA
              </div>
            )}
            {ivaInfo?.ivaType === 'included' && ivaInfo.ivaAmount > 0 && (
              <div className="text-[8px] opacity-50" style={{ color: textColor }}>
                IVA {ivaInfo.ivaRate}% incluido
              </div>
            )}
          </td>
          <td className="px-3 py-2 text-right font-bold" style={{ color: textColor }}>{quantity}</td>
          <td className="px-3 py-2 text-right">
            {hasDiscount ? (
              <>
                <span className="line-through opacity-50 text-[9px] block" style={{ color: textColor }}>
                  Bs. {formatPrice(originalPriceVes)}
                </span>
                <span className="font-bold" style={{ color: '#22c55e' }}>Bs. {formatPrice(priceVes)}</span>
              </>
            ) : (
              <span className="font-bold" style={{ color: primary }}>Bs. {formatPrice(priceVes)}</span>
            )}
          </td>
          <td className="px-3 py-2 text-right">
            {hasDiscount ? (
              <>
                <span className="line-through opacity-50 text-[9px] block" style={{ color: textColor }}>
                  Bs. {formatPrice(originalPriceVes * quantity)}
                </span>
                <span className="font-bold block" style={{ color: '#22c55e' }}>
                  Bs. {formatPrice(totalItem)}
                </span>
              </>
            ) : (
              <span className="font-bold" style={{ color: primary }}>
                Bs. {formatPrice(totalItem)}
              </span>
            )}
          </td>
        </tr>
      );
    })}
                </tbody>
                  </table>
                </div>

                {/* 🔥 SECCIÓN DE RESEÑAS - SOLO CUANDO LA ORDEN ESTÁ COMPLETADA */}
                {isCompleted && orderItemsList.length > 0 && (
                  <div className="space-y-4 pt-4 border-t" style={{ borderColor: borderDynamic }}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>
                        Deja tu reseña
                      </h4>
                    </div>
                    <p className="text-[10px] opacity-60" style={{ color: textColor }}>
                      Tu compra está completada. Comparte tu experiencia con otros compradores.
                    </p>

                    {/* 🔥 ItemReviewsSection - Con selector de items */}
                    {(() => {
                      // Filtrar items válidos (con id)
                      const validItems = orderItemsList.filter((item: any) => {
                        const itemId = item.productId || item.serviceId || item.id || item._id;
                        return !!itemId;
                      });

                      if (validItems.length === 0) return null;

                      // Asegurar que el índice esté dentro del rango
                      const safeIndex = Math.min(reviewItemIndex, validItems.length - 1);
                      const currentItem = validItems[safeIndex];
                      const itemId = currentItem.productId || currentItem.serviceId || currentItem.id || currentItem._id;
                      const itemType = currentItem.type === 'service' || currentItem.serviceId ? 'service' : 'product';

                      return (
                        <div
                          className="rounded-xl border overflow-hidden"
                          style={{ borderColor: borderDynamic, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                        >
                          <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: borderDynamic }}>
                            <span className="text-xs font-bold shrink-0" style={{ color: textColor }}>
                              Producto a reseñar:
                            </span>
                            {validItems.length === 1 ? (
                              <span className="text-xs font-medium" style={{ color: primary }}>
                                {currentItem.name || 'Producto'}
                              </span>
                            ) : (
  <select
    value={safeIndex}
    onChange={(e) => setReviewItemIndex(Number(e.target.value))}
    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg text-xs border outline-none transition cursor-pointer"
    style={{
      backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderColor: borderDynamic,
      color: textColor,
      colorScheme: isDarkBg ? 'dark' : 'light',
    }}
  >
                                {validItems.map((item: any, idx: number) => (
                                  <option key={idx} value={idx}>
                                    {item.name || `Producto ${idx + 1}`}
                                    {item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="p-4">
                            <ItemReviewsSection
                              key={itemId}
                              tenantId={order.tenantId}
                              itemId={itemId}
                              itemType={itemType as 'product' | 'service'}
                              primary={primary}
                              secondary={secondary}
                              isSecondaryLight={!isDarkBg}
                              isAuthenticated={true}
                              userId={undefined}
                              inlineLimit={5}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 🔥 SECCIÓN DE IVA Y TOTALES - AHORA DEBAJO DE LA TABLA */}
                {hasIVA && orderItemsList.length > 0 && (
                  <div
                    className="p-4 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: `${primary}10`,
                      borderColor: `${primary}30`,
                    }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Subtotal (sin IVA):</span>
                      <span className="font-bold" style={{ color: primary }}>
                        Bs. {formatPrice(subtotalVes)}
                      </span>
                    </div>
                    {totalIVAVes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>
                          IVA ({totalIvaRate || 16}%):
                        </span>
                        <span className="font-bold" style={{ color: primary }}>
                          Bs. {formatPrice(totalIVAVes)}
                        </span>
                      </div>
                    )}
                    {orderDiscountInfo && orderDiscountInfo.totalSavedVes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Descuento aplicado:</span>
                        <span className="font-bold" style={{ color: '#22c55e' }}>
                          -Bs. {formatPrice(orderDiscountInfo.totalSavedVes)}
                        </span>
                      </div>
                    )}

                    {/* 🔥 SALDO A FAVOR APLICADO */}
                    {creditAppliedVes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1" style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>
                          <Wallet className="w-3.5 h-3.5" />
                          Saldo a favor aplicado:
                        </span>
                        <span className="font-bold" style={{ color: '#22c55e' }}>
                          -Bs. {formatPrice(creditAppliedVes)}
                          {orderRate > 0 && (
                            <span className="ml-1 text-[10px] font-semibold">
(-${formatUsd(creditAppliedVes / orderRate)})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {shippingVes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>
                          Envío{deliveryData?.companyName ? ` (${deliveryData.companyName})` : ''}:
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold" style={{ color: primary }}>
                            Bs. {formatPrice(shippingVes)}
                          </span>
                          {deliveryData?.costUsd && (
                            <span className="text-[10px] font-semibold" style={{ color: priceColors.foreign }}>
(${formatUsd(Number(deliveryData.costUsd))})
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: borderDynamic }}>
                      <span className="font-black uppercase" style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Total con IVA:</span>
                      <div className="text-right">
                        {orderDiscountInfo && orderDiscountInfo.totalOriginalVes > 0 && (
                          <span className="text-xs line-through opacity-50 block" style={{ color: textColor }}>
                            Bs. {formatPrice(orderDiscountInfo.totalOriginalVes)}
                          </span>
                        )}
                        <span className="text-lg font-black" style={{ color: primary }}>
                          Bs. {formatPrice(totalVes)}
                          <span className="text-xs font-semibold ml-1" style={{ color: priceColors.foreign }}>
                                                        (${formatPrice(totalUsd)})
                          </span>
                          {orderDiscountInfo && orderDiscountInfo.totalSavedVes > 0 && (
                            <span className="text-[9px] font-bold block" style={{ color: '#22c55e' }}>
                              Ahorraste Bs. {formatPrice(orderDiscountInfo.totalSavedVes)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔥 TOTALES SIN IVA */}
                {!hasIVA && orderItemsList.length > 0 && (
                  <div
                    className="p-4 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: `${primary}10`,
                      borderColor: `${primary}30`,
                    }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Subtotal:</span>
                      <span className="font-medium" style={{ color: textColor }}>
                        Bs. {formatPrice(subtotalVes)}
                      </span>
                    </div>
                    {orderDiscountInfo && orderDiscountInfo.totalSavedVes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Descuento aplicado:</span>
                        <span className="font-bold" style={{ color: '#22c55e' }}>
                          -Bs. {formatPrice(orderDiscountInfo.totalSavedVes)}
                        </span>
                      </div>
                    )}

                    {/* 🔥 SALDO A FAVOR APLICADO */}
                    {creditAppliedVes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1" style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>
                          <Wallet className="w-3.5 h-3.5" />
                          Saldo a favor aplicado:
                        </span>
                        <span className="font-bold" style={{ color: '#22c55e' }}>
                          -Bs. {formatPrice(creditAppliedVes)}
                          {orderRate > 0 && (
                            <span className="ml-1 text-[10px] font-semibold">
(-${formatUsd(creditAppliedVes / orderRate)})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {Number(order.shippingCost) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Envío:</span>
                        <span className="font-medium" style={{ color: textColor }}>
                          Bs. {formatPrice(shippingVes)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: borderDynamic }}>
                      <span className="font-black uppercase" style={{ color: isDarkBg ? '#94a3b8' : '#64748b' }}>Total:</span>
                      <div className="text-right">
                        {orderDiscountInfo && orderDiscountInfo.totalOriginalVes > 0 && (
                          <span className="text-xs line-through opacity-50 block" style={{ color: textColor }}>
                            Bs. {formatPrice(orderDiscountInfo.totalOriginalVes)}
                          </span>
                        )}
                        <span className="text-lg font-black" style={{ color: primary }}>
                          Bs. {formatPrice(totalVes)}
                          <span className="text-xs font-semibold ml-1" style={{ color: priceColors.foreign }}>
                                                        (${formatPrice(totalUsd)})
                          </span>
                          {orderDiscountInfo && orderDiscountInfo.totalSavedVes > 0 && (
                            <span className="text-[9px] font-bold block" style={{ color: '#22c55e' }}>
                              Ahorraste Bs. {formatPrice(orderDiscountInfo.totalSavedVes)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔥 QR Y DATOS DE PAGO - SOLO SI ESTÁ PENDIENTE Y ES PAGO MÓVIL */}
                {isPending && !hasPaymentReport && isPagoMovil && sellerData.selectedPagoMovil && (
                  <div className="p-4 rounded-xl border space-y-3" style={dynamicSubCardStyle}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" style={{ color: primary }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary }}>Datos para realizar el pago</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div><span className="opacity-50">Banco:</span><span className="font-medium ml-1" style={{ color: textColor }}>{getBankName(sellerData.selectedPagoMovil.bank)}</span></div>
                                            <div><span className="opacity-50">Teléfono:</span><span className="font-medium ml-1" style={{ color: textColor }}>{formatPhoneDisplay(`${sellerData.selectedPagoMovil.operator || ''}${sellerData.selectedPagoMovil.phone || ''}`)}</span></div>
                                            <div><span className="opacity-50">RIF/Cédula:</span><span className="font-medium ml-1" style={{ color: textColor }}>{sellerData.selectedPagoMovil.idType || 'V'}-{sellerData.selectedPagoMovil.idNumber || ''}</span></div>
                      <div><span className="opacity-50">Monto:</span><span className="font-bold ml-1" style={{ color: primary }}>Bs. {formatPrice(totalVes)}</span></div>
                    </div>

                    <div className="pt-2 border-t flex flex-col items-center" style={{ borderColor: borderDynamic }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">Escanea para pagar</span>
                      <div 
                        className="p-2 bg-white rounded-xl shadow-sm mt-1 cursor-pointer transition hover:scale-105"
                        onClick={() => setIsQrZoomed(true)}
                      >
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            `PAGO MOVIL\nBanco: ${sellerData.selectedPagoMovil.bank}\nTelefono: ${sellerData.selectedPagoMovil.operator || ''}${sellerData.selectedPagoMovil.phone || ''}\nCedula: ${sellerData.selectedPagoMovil.idType || 'V'}${sellerData.selectedPagoMovil.idNumber || ''}\nMonto: ${formatUsd(totalVes)}`
                          )}`} 
                          alt="QR Pago Móvil" 
                          className="w-32 h-32 object-contain"
                        />
                        <div className="flex items-center justify-center gap-1 mt-1 text-[9px] opacity-50">
                          <Maximize2 className="w-3 h-3" />
                          <span>Clic para ampliar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔥 SECCIÓN DE REPORTE DE PAGO - SI YA FUE REPORTADO */}
                {hasPaymentReport && (
                  <div className="p-4 rounded-xl border space-y-3" style={dynamicSubCardStyle}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" style={{ color: isCompleted ? '#4ade80' : '#f59e0b' }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isCompleted ? '#4ade80' : '#f59e0b' }}>
                        {isCompleted ? 'Pago Verificado' : 'Pago Reportado'}
                      </span>
                    </div>

                    {/* DATOS DEL REPORTE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-3 rounded-lg" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                      {reportBankSource && (
                        <div>
                          <span className="opacity-50">Banco origen:</span>
                          <span className="font-medium ml-1" style={{ color: textColor }}>{reportBankSource}</span>
                        </div>
                      )}
                      {reportPaymentReference && (
                        <div>
                          <span className="opacity-50">Referencia:</span>
                          <span className="font-medium ml-1" style={{ color: textColor }}>{reportPaymentReference}</span>
                                                </div>
                      )}
                      {reportClientIdNumber && (
                        <div>
                          <span className="opacity-50">Cédula/RIF:</span>
                          <span className="font-medium ml-1" style={{ color: textColor }}>{reportClientIdType}-{reportClientIdNumber}</span>
                        </div>
                      )}
                      {reportClientPhone && (
                        <div>
                          <span className="opacity-50">Teléfono:</span>
                          <span className="font-medium ml-1" style={{ color: textColor }}>{formatPhoneDisplay(reportClientPhone)}</span>
                        </div>
                      )}
                    </div>

                    {/* COMPROBANTE DE PAGO */}
                    {order.paymentProof && (() => {
                      const proofUrl = getProofUrl(order.paymentProof);
                      const isImage = isImageFile(order.paymentProof);
                      
                      return (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-3.5 h-3.5 opacity-50" />
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Comprobante de pago</span>
                          </div>
                          
                          <div 
                            className="rounded-xl overflow-hidden border bg-black/5 cursor-pointer transition hover:scale-[1.01]"
                            style={{ borderColor: borderDynamic }}
                            onClick={() => setIsProofZoomed(true)}
                          >
                            {proofUrl && isImage ? (
                              <div className="relative">
                                <img 
                                  src={proofUrl} 
                                  alt="Comprobante" 
                                  className="w-full max-h-64 object-contain p-2"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                      const link = document.createElement('a');
                                      link.href = proofUrl;
                                      link.target = '_blank';
                                      link.rel = 'noopener noreferrer';
                                      link.className = 'block text-center p-4 text-xs font-bold underline';
                                      link.style.color = primary;
                                      link.textContent = 'Abrir comprobante';
                                                                            parent.appendChild(link);
                                    }
                                  }}
                                />
                                <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-70 hover:opacity-100 transition">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ) : proofUrl ? (
                              <div className="p-4 text-center">
  <span className="text-xs opacity-50 flex items-center gap-1">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
    Comprobante en PDF
  </span>                              <a 
                                  href={proofUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="block mt-1 text-xs font-bold underline"
                                  style={{ color: primary }}
                                >
                                  Abrir PDF
                                </a>
                              </div>
                            ) : (
                              <div className="p-4 text-center">
                                <span className="text-xs opacity-50">Comprobante subido</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end shrink-0" style={{ borderColor: borderDynamic }}>
            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              primary={primary}
              borderColor={borderDynamic}
              textColor={textColor}
              cardBg={cardBg}
              isDarkBg={isDarkBg}
            >
              Cerrar
            </Button>
          </div>
        </div>
        {/* 🔥 MODAL DE REPORTAR PAGO - PAGOS MIXTOS (Fase 2) */}
        {isReportPaymentOpen && (
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => {
              if (!isSubmittingBreakdown) setIsReportPaymentOpen(false);
            }}
          >
            <div 
              className="w-full max-w-lg rounded-2xl border shadow-xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ 
                backgroundColor: cardBg,
                borderColor: borderDynamic,
                color: textColor
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold" style={{ color: textColor }}>Reportar Pago</h3>
                  <p className="text-xs opacity-70 mt-0.5">
                    Puedes combinar varios métodos. El sistema calcula el vuelto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportPaymentOpen(false)}
                  disabled={isSubmittingBreakdown}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer hover:opacity-70 disabled:opacity-40"
                  style={{ borderColor: borderDynamic, color: textColor }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <PaymentBreakdown
                mode="report"
                totalVes={totalVes}
                exchangeRate={orderRate}
                activeMethods={activePaymentMethods}
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={borderDynamic}
                cardBg={cardBg}
                onSubmit={handleSubmitBreakdown}
                isSubmitting={isSubmittingBreakdown}
                submitError={breakdownError}
                hideTitle
              />
            </div>
          </div>
        )}

        {/* Modal QR */}
        {isQrZoomed && sellerData.selectedPagoMovil && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setIsQrZoomed(false)}>
            <div className="relative max-w-md max-h-[90vh] flex items-center justify-center">
              <button 
                type="button" 
                onClick={() => setIsQrZoomed(false)} 
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="bg-white p-6 rounded-3xl shadow-2xl">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
                    `PAGO MOVIL\nBanco: ${sellerData.selectedPagoMovil.bank}\nTelefono: ${sellerData.selectedPagoMovil.operator || ''}${sellerData.selectedPagoMovil.phone || ''}\nCedula: ${sellerData.selectedPagoMovil.idType || 'V'}${sellerData.selectedPagoMovil.idNumber || ''}\nMonto: ${totalVes.toFixed(2)}`
                  )}`} 
                  alt="QR Pago Móvil Ampliado" 
                  className="w-80 h-80 object-contain"
                />
                <div className="text-center mt-3 text-sm font-medium text-gray-700">
                  {getBankName(sellerData.selectedPagoMovil.bank)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Comprobante */}
        {isProofZoomed && order.paymentProof && (() => {
          const proofUrl = getProofUrl(order.paymentProof);
          const isImage = isImageFile(order.paymentProof);
          
          return (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setIsProofZoomed(false)}>
              <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
                <button 
                  type="button" 
                  onClick={() => setIsProofZoomed(false)} 
                  className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
                {proofUrl && isImage ? (
                  <img 
                    src={proofUrl} 
                    alt="Comprobante Ampliado" 
                    className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const link = document.createElement('a');
                        link.href = proofUrl;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.className = 'text-white text-sm font-bold underline p-8 block';
                        link.textContent = 'Abrir comprobante';
                        parent.appendChild(link);
                      }
                    }}
                  />
                ) : proofUrl ? (
                  <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg">
                    <div className="text-center">
  <span className="text-lg font-bold flex items-center gap-2 justify-center">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
    Comprobante en PDF
  </span>                    <a 
                        href={proofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block mt-4 text-sm font-bold underline"
                        style={{ color: primary }}
                      >
                        Abrir PDF
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })()}

        {/* Modal Zoom Imagen Principal */}
        {isZoomedModalOpen && currentImg && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in" onClick={() => setIsZoomedModalOpen(false)}>
            <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
              <button 
                type="button" 
                onClick={() => setIsZoomedModalOpen(false)} 
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={currentImg} alt="Zoom Imagen Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10" />
            </div>
          </div>
        )}

        {/* Modal Cancelación */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsCancelModalOpen(false)}>
            <div className="w-full max-w-md rounded-2xl border shadow-2xl p-6" style={{ backgroundColor: cardBg, borderColor: borderDynamic, color: textColor }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-red-400">Confirmar Cancelación</h3>
              <p className="text-sm opacity-80 mt-2">¿Estás seguro de que deseas cancelar esta orden? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 mt-6 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(false)}
                  primary={primary}
                  borderColor={borderDynamic}
                  textColor={textColor}
                  cardBg={cardBg}
                  isDarkBg={isDarkBg}
                >
                  No, volver
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (onCancelOrder && order.id) {
                      await onCancelOrder(order.id as string);
                      setIsCancelModalOpen(false);
                      onClose();
                    }
                  }}
                  disabled={isCancelling}
                  loading={isCancelling}
                  primary={primary}
                  borderColor={borderDynamic}
                  textColor={textColor}
                  cardBg={cardBg}
                  isDarkBg={isDarkBg}
                >
                  {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  }