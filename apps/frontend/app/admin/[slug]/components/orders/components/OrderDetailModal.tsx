  'use client';

  import React, { useState, useEffect, useRef } from 'react';
  import { createPortal } from 'react-dom';
  import OrderStatusBadge from './OrderStatusBadge';
  import OrderStatusDropdown from './OrderStatusDropdown';
  import OrderItemsTable from './OrderItemsTable';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Truck, Package, MapPin, Clock, CheckCircle2, CreditCard, Building2, Maximize2, MonitorSmartphone, Mail, Phone, Wallet, AlertCircle, MessageCircle, Star, Loader2, ChevronDown, Flame, AlertTriangle, Wrench, FileText, Banknote, Smartphone, X } from 'lucide-react';
  import { useTenantReviews, type TenantReview } from '@/app/admin/[slug]/components/reviews/hooks/useTenantReviews';
  import ReviewResponseModal from '@/app/admin/[slug]/components/reviews/ReviewResponseModal';
  import StarRating from '@/app/tienda/[slug]/components/StarRating';
  import { formatUsd } from '@/lib/price-utils';
  import { 
    formatPrice, 
    getOrderTotalVes, 
    getOrderRate,
    isStatusLocked,
    getStatusConfirmationMessage,
    LOCKED_STATUSES
  } from './hooks/orderUtils';

  // 🔥 IMPORTAR CONTEXTO DE TASAS
  import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
  import SearchableDropdown from '@/components/ui/SearchableDropdown';

  // 🔥 IMPORTAR COMPONENTE DE PAGOS MIXTOS
  import { PaymentBreakdown } from '@/app/components/PaymentBreakdown';
  import type { ActivePaymentMethod } from '@/app/components/PaymentBreakdown';
  import type {
    PaymentBreakdown as PaymentBreakdownType,
    ChangeResolution as ChangeResolutionType,
  } from '@/types/payment-breakdown';

  // 🔥 IMPORTAR UTILIDAD DE IMÁGENES
  import { getImageUrl } from '@/lib/imageUtils';
  import { getBankName } from '@/lib/venezuelanBanks';
  import { formatPhoneDisplay } from '@/lib/formatPhone';
    import { Button } from '@/components/ui/Button';

  interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    primary: string;
    secondary?: string;
    textColor: string;
    isDarkBg: boolean;
    onStatusChange?: (
      orderId: string,
      newStatus: string,
    ) => Promise<
      | { success: boolean; data?: any; error?: any }
      | void
    >;
    isUpdating?: boolean;
    onOrderUpdated?: (updatedOrder: any) => void;
    tenant?: any;
  }

  // 🔥 OPCIONES DE MENSAJERÍA
  const DELIVERY_COMPANIES: Record<string, { name: string; color: string }> = {
    mrw: { name: 'MRW', color: '#e11d48' },
    domesa: { name: 'Domesa', color: '#0ea5e9' },
    tealca: { name: 'Tealca', color: '#8b5cf6' },
    zoom: { name: 'Zoom', color: '#f59e0b' },
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // 🔥 FUNCIÓN PARA OBTENER URL DEL COMPROBANTE
  const getProofUrl = (proofPath: string, apiBase: string) => {
    if (!proofPath) return null;
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

  // ============================================================
  // 🔥 LEER SNAPSHOT DEL ITEM
  // ============================================================
  // El backend ya calculó TODO con PricingService al crear la orden.
  // El frontend SOLO lee. NO recalcula. NO tiene fallback.
  // Si un item no tiene snapshot, se muestra con ceros.
  // ============================================================
  const readItemSnapshot = (item: any) => {
    const quantity = Number(item?.quantity || item?.qty || 1);

    // Valores del snapshot (los pone el backend con PricingService)
    const basePriceVES = Number(item.basePriceVES || 0);
    const basePriceUSD = Number(item.basePriceUSD || 0);
    const basePriceOriginalVES = Number(item.basePriceOriginalVES || 0);
    const basePriceOriginalUSD = Number(item.basePriceOriginalUSD || 0);
    const taxAmountVES = Number(item.taxAmountVES || 0);
    const taxAmountUSD = Number(item.taxAmountUSD || 0);
    const totalPriceVES = Number(item.totalPriceVES || 0);
    const totalPriceUSD = Number(item.totalPriceUSD || 0);
    const originalPriceVES = Number(item.originalPriceVES || 0);
    const originalPriceUSD = Number(item.originalPriceUSD || 0);
    const discountAmountVES = Number(item.discountAmountVES || 0);
    const discountAmountUSD = Number(item.discountAmountUSD || 0);
    const discountPercentage = Number(item.discountPercentage || 0);
    const hasDiscount = item.hasDiscount === true || discountAmountVES > 0;
    const ivaType = item.ivaType || 'excluded';
    const ivaRate = Number(item.ivaRate || 0);

    const unitPriceVES = quantity > 0 ? totalPriceVES / quantity : totalPriceVES;

    return {
      ivaType,
      ivaRate,
      ivaAmount: Math.round(taxAmountVES * 100) / 100,
      basePrice: Math.round(basePriceVES * 100) / 100,
      basePriceOriginal: Math.round(basePriceOriginalVES * 100) / 100,
      priceWithIVA: Math.round(totalPriceVES * 100) / 100,
      subtotal: Math.round(basePriceVES * 100) / 100,
      quantity,
      unitPrice: Math.round(unitPriceVES * 100) / 100,
      hasDiscount,
      discountPercentage,
      originalPriceVES,
      originalPriceUSD,
      discountAmountVES,
      discountAmountUSD,
      totalPriceUSD,
      taxAmountUSD,
      basePriceUSD,
      basePriceOriginalUSD,
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


  // ============================================================
  // 🔥 LEER TOTALES DE LA ORDEN DESDE EL SNAPSHOT
  // ============================================================
  // Los totales vienen calculados por PricingService.
  // El frontend NO recalcula. NO suma.
  // ============================================================
  const readOrderTotals = (order: any) => {
    const orderItemsList = Array.isArray(order.items) ? order.items : [];

    let subtotalVes = 0;
    let totalIVAVes = 0;
    let totalWithIVAVes = 0;
    let totalOriginalVes = 0;
    let totalDiscountVes = 0;
    let hasIncludedIVA = false;
    let hasExcludedIVA = false;
    let hasExemptItems = false;
    let totalIvaRate = 0;
    const ivaInfoList: any[] = [];

    orderItemsList.forEach((item: any) => {
      const ivaInfo = readItemSnapshot(item);
      ivaInfoList.push(ivaInfo);

      const qty = ivaInfo.quantity || 1;
      subtotalVes += ivaInfo.basePrice * qty;
      totalIVAVes += ivaInfo.ivaAmount * qty;
      totalWithIVAVes += ivaInfo.priceWithIVA * qty;
      totalOriginalVes += ivaInfo.basePriceOriginal * qty;
      totalDiscountVes += ivaInfo.discountAmountVES * qty;

      if (ivaInfo.ivaType === 'included') hasIncludedIVA = true;
      if (ivaInfo.ivaType === 'excluded') hasExcludedIVA = true;
      if (ivaInfo.ivaType === 'exempt') hasExemptItems = true;
      if (ivaInfo.ivaRate > totalIvaRate) totalIvaRate = ivaInfo.ivaRate;
    });

  // 🔥 El envío viene del snapshot: paymentMetadata.delivery.costVes
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
      totalOriginalVes: Math.round(totalOriginalVes * 100) / 100,
      totalDiscountVes: Math.round(totalDiscountVes * 100) / 100,
      shippingVes: Math.round(shippingVes * 100) / 100,
      taxVes: 0,
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

  export default function OrderDetailModal({
    isOpen,
    onClose,
    order,
    primary,
    secondary,
    textColor,
    isDarkBg,
    onStatusChange,
    isUpdating = false,
    onOrderUpdated,
    tenant,
  }: OrderDetailModalProps) {
    // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
    const { rates, loading: ratesLoading } = useExchangeRateContext();
    
    // 🔥 TASA DE CAMBIO DINÁMICA - NUNCA USAR VALORES FIJOS
    const globalRate = rates.USD > 0 ? rates.USD : 0;

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [localOrder, setLocalOrder] = useState<any>(order);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [isZoomedModalOpen, setIsZoomedModalOpen] = useState(false);
    const [isProofZoomed, setIsProofZoomed] = useState(false);
    
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isSavingTracking, setIsSavingTracking] = useState(false);
    const [trackingSaved, setTrackingSaved] = useState(false);

    
    // 🔥 ESTADO PARA PAGOS MIXTOS (Fase 2)
    const [activePaymentMethods, setActivePaymentMethods] = useState<ActivePaymentMethod[]>([]);
    const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false);
    const [breakdownError, setBreakdownError] = useState<string | null>(null);

    // 🔥 ESTADO PARA RESOLVER VUELTO DESDE EL ADMIN (bloque de vuelto)
    const [changeAdminPanelOpen, setChangeAdminPanelOpen] = useState(false);
    const [changeAdminDelivery, setChangeAdminDelivery] = useState<
      'cash_ves' | 'cash_usd' | 'pago_movil' | 'other'
    >('cash_ves');
    const [changeAdminPmBank, setChangeAdminPmBank] = useState('');
    const [changeAdminPmPhone, setChangeAdminPmPhone] = useState('');
    const [changeAdminPmIdType, setChangeAdminPmIdType] = useState<'V' | 'E' | 'J' | 'G' | 'P'>('V');
    const [changeAdminPmIdNumber, setChangeAdminPmIdNumber] = useState('');
    const [changeAdminPmReference, setChangeAdminPmReference] = useState('');

    // 🔥 RESEÑAS DE ESTA ORDEN
    const [reviewsExpanded, setReviewsExpanded] = useState(false);
    const [responseModalReview, setResponseModalReview] = useState<TenantReview | null>(null);
    const [responseModalOpen, setResponseModalOpen] = useState(false);

    // 🔥 HOOK DE RESEÑAS DEL TENANT (debe estar ANTES de cualquier return)
    const tenantIdForReviews = tenant?.id || tenant?._id || order?.tenantId;

    const {
      reviews: allTenantReviews,
      loading: reviewsLoading,
      respondToReview,
    } = useTenantReviews({
      tenantId: tenantIdForReviews || '',
      filters: {},
      limit: 100,
    });

    const handleOpenResponse = (review: TenantReview) => {
      setResponseModalReview(review);
      setResponseModalOpen(true);
    };

    const handleSubmitResponse = async (response: string) => {
      if (!responseModalReview) return;
      await respondToReview(responseModalReview.id, response);
    };

    const handleCloseResponse = () => {
      setResponseModalOpen(false);
      setResponseModalReview(null);
    };

    const orderIdRef = useRef(order?.id);
    const isUpdatingRef = useRef(false);

    // 🔥 CARGAR MÉTODOS DE PAGO ACTIVOS DEL TENANT
    useEffect(() => {
      if (!isOpen || !localOrder?.tenantId) return;

      let cancelled = false;

      (async () => {
        try {
          const response = await fetch(
            `${API_BASE}/tenants/${localOrder.tenantId}/payment-methods`,
          );
          if (!response.ok) return;
          const data = await response.json();
          if (cancelled) return;
          if (Array.isArray(data)) {
            setActivePaymentMethods(data);
          }
        } catch (err) {
          console.error('❌ Error al cargar métodos de pago:', err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [isOpen, localOrder?.tenantId]);


    useEffect(() => {
      if (order?.id === orderIdRef.current && localOrder) {
        return;
      }
      if (isUpdatingRef.current) {
        return;
      }
      if (order?.id) {
        orderIdRef.current = order.id;
        setLocalOrder(order);
      }
    }, [order, localOrder]);

    // 🔥 AUTO-READ: Al abrir el detalle, marcar todas las notificaciones
    // de esta orden como leídas (estándar Shopify/Slack).
    useEffect(() => {
      if (!isOpen || !localOrder?.id) return;
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) return;

      const source = 'seller'; // este modal se usa en /admin → vendedor

      fetch(`${API_BASE}/notifications/read-by-order/${localOrder.id}?source=${source}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            // 🔥 Avisar al NotificationContext que refresque el badge
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('notificationUpdate'));
              window.dispatchEvent(new CustomEvent('globalRefresh'));
            }
          }
        })
        .catch((err) => console.warn('[OrderDetailModal] auto-read error:', err));
    }, [isOpen, localOrder?.id]);

    if (!isOpen || !localOrder) return null;

    const isKiosk = localOrder.source === 'kiosk';

    // (debug logs removidos — disparaban re-render en loop)
    const cardBg = secondary || (isDarkBg ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)');
    const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)';
    const priceColor = isDarkBg ? '#4ade80' : '#15803d';
    
    const dynamicSubCardStyle = {
      backgroundColor: isDarkBg ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderColor: borderDynamic,
      color: textColor
    };

    const orderItemsList = Array.isArray(localOrder.items) ? localOrder.items : [];
    
    // 🔥 TASA DE CAMBIO DINÁMICA - NUNCA USAR 36.5 NI 784.66
    let orderRate = getOrderRate(localOrder);
    
    // Si la orden no tiene tasa, usar la global
    if (!orderRate || orderRate === 0) {
      orderRate = globalRate;
    }
    
    // Si todavía es 0, usar fallback seguro (0, no 36.5)
    if (!orderRate || orderRate === 0) {
      console.warn('⚠️ [OrderDetailModal] No se pudo determinar la tasa de cambio, usando 0');
      orderRate = 0;
    }
    
    const totalItems = orderItemsList.reduce((sum: number, item: any) => {
      return sum + (item.quantity || item.qty || 1);
    }, 0);
    
    const totalsWithIVA = readOrderTotals(localOrder);

    // 🔥 Descuento total desde el snapshot de la orden
    // El "total original" es la suma de TODOS los items SIN descuento
    const orderDiscountInfo = (() => {
      const orderItemsList = Array.isArray(localOrder.items) ? localOrder.items : [];
      const itemsWithDiscount = orderItemsList.filter((item: any) => {
        const hasDisc = item.hasDiscount === true || Number(item.discountAmountVES || 0) > 0;
        return hasDisc;
      });
      if (itemsWithDiscount.length === 0) return null;

      let totalOriginalVes = 0;   // suma de originales de TODOS los items (con y sin descuento)
      let totalSavedVes = 0;      // suma de ahorros de items con descuento
      let maxDiscountPercentage = 0;

      for (const item of orderItemsList) {
        const qty = Number(item.quantity || 1);
        const itemHasDiscount = item.hasDiscount === true || Number(item.discountAmountVES || 0) > 0;

        // Si tiene descuento, el original es originalPriceVES.
        // Si NO tiene descuento, el original es totalPriceVES (que ya está sin descuento).
        const originalUnit = itemHasDiscount
          ? Number(item.originalPriceVES || 0)
          : Number(item.totalPriceVES || 0);

        totalOriginalVes += originalUnit * qty;

        if (itemHasDiscount) {
          totalSavedVes += Number(item.discountAmountVES || 0) * qty;
          const pct = Number(item.discountPercentage || 0);
          if (pct > maxDiscountPercentage) maxDiscountPercentage = pct;
        }
      }

      return {
        totalOriginalVes: Math.round(totalOriginalVes * 100) / 100,
        totalSavedVes: Math.round(totalSavedVes * 100) / 100,
        maxDiscountPercentage,
        hasDiscount: true,
      };
    })();
    const { 
      subtotalVes, 
      totalIVAVes, 
      totalWithIVAVes, 
      shippingVes, 
      taxVes, 
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
    
    // 🔥 CALCULAR TOTAL EN USD DINÁMICAMENTE
    // 🔥 CALCULAR TOTAL EN USD DINÁMICAMENTE
    let totalUsd = 0;
    
    // 1. Si la orden tiene totalAmount, usarlo (asumimos que está en USD)
    if (localOrder.totalAmount && Number(localOrder.totalAmount) > 0) {
      totalUsd = Number(localOrder.totalAmount);
    } else {
      // 2. Si no, calcular desde los items
      const items = Array.isArray(localOrder.items) ? localOrder.items : [];
      let calculatedUsd = 0;
      
      for (const item of items) {
        const quantity = Number(item.quantity || item.qty || 1);
        // 🔥 NUEVO: priorizar totalPriceUSD del snapshot
        let priceUsd = Number(item.totalPriceUSD || 0);
        
        if (priceUsd === 0) {
          priceUsd = Number(item.priceUsd || item.prices?.USD || item.attributes?.prices?.USD || 0);
        }
        
        // Si no hay USD, convertir desde VES
        if (priceUsd === 0) {
          const priceVes = Number(item.priceVes || item.price || item.precio || 0);
          if (priceVes > 0 && orderRate > 0) {
            priceUsd = priceVes / orderRate;
          }
        }
        
        calculatedUsd += priceUsd * quantity;
      }
      
      totalUsd = calculatedUsd;
    }
    
    // Sumar envío en USD si existe
    if (localOrder.shippingCost && Number(localOrder.shippingCost) > 0) {
      const shippingVes = Number(localOrder.shippingCost);
      if (orderRate > 0) {
        totalUsd += shippingVes / orderRate;
      }
    }
    
    // Sumar impuestos en USD si existen
    if (localOrder.tax && Number(localOrder.tax) > 0) {
      const taxVes = Number(localOrder.tax);
      if (orderRate > 0) {
        totalUsd += taxVes / orderRate;
      }
    }
    
    // Redondear a 2 decimales
    totalUsd = Math.round(totalUsd * 100) / 100;
    
    // 🔥 USAR LOS TOTALES DEL BACKEND (ya vienen con saldo a favor descontado)
    // Si el backend guardó totalAmountVes, ese es el total final.
    const creditAppliedVes = Number(localOrder.paymentMetadata?.creditApplied?.amountVes || 0);
    const totalVes = Number(localOrder.totalAmountVes || totalConIVAVes);

    const normalizedStatus = localOrder.status?.toUpperCase().trim() || '';
    const isLocked = isStatusLocked(normalizedStatus);
    const isCompleted = normalizedStatus === 'COMPLETED';

    const deliveryData = localOrder.paymentMetadata?.delivery || localOrder.attributes?.delivery || localOrder.delivery || {};
    const deliveryCompany = deliveryData?.company;

    // 🔥 CONDICIÓN MEJORADA PARA DETECTAR SI HAY ENVÍO
    const hasDelivery = !!( 
      deliveryCompany && 
      typeof deliveryCompany === 'string' && 
      deliveryCompany.trim() !== '' && 
      deliveryCompany !== 'undefined' && 
      deliveryCompany !== 'null' &&
      (deliveryData.cost !== undefined || 
      deliveryData.selected === true || 
      deliveryData.companyName || 
      deliveryData.trackingNumber ||
      localOrder.customerAddress)
    );
    const companyInfo = hasDelivery ? DELIVERY_COMPANIES[deliveryCompany] : null;

    // 🔥 OBTENER DIRECCIÓN DE ENTREGA
    const deliveryAddress = localOrder.customerAddress || deliveryData.address || '';

    const paymentMetadata = localOrder.paymentMetadata || {};
    const orderPaymentProof = paymentMetadata.paymentProof || localOrder.paymentProof || localOrder.payment_proof;
    const hasPaymentProof = !!orderPaymentProof;

    const paymentBankSource = getBankName(paymentMetadata.bankSource || localOrder.bankSource || '');
        const paymentRef = paymentMetadata.paymentReference || localOrder.paymentReference || '';
    const clientIdNumber = paymentMetadata.clientIdNumber || localOrder.clientIdNumber || '';
    const clientIdType = paymentMetadata.clientIdType || localOrder.clientIdType || 'V';
    const clientPhoneFromReport = paymentMetadata.clientPhone || localOrder.clientPhone || '';
    const clientAccountType = paymentMetadata.clientAccountType || localOrder.clientAccountType || '';
    const paymentReportedAt = paymentMetadata.reportedAt || localOrder.reportedAt || '';

    // 🔥 Efectivo: moneda + monto entregado (para mostrar detalle de vuelto)
    const cashCurrency: 'VES' | 'USD' | undefined = paymentMetadata.cashCurrency;
    const cashAmount: number | undefined = paymentMetadata.cashAmount;

    

    const hasPaymentReport = !!paymentBankSource || !!paymentRef || hasPaymentProof;
    const proofUrl = hasPaymentProof ? getProofUrl(orderPaymentProof, API_BASE) : null;

    // 🔥 OBTENER MÉTODO DE PAGO
    const paymentMethod = localOrder.paymentMethodUsed || localOrder.paymentMethod || '';
    const isPagoMovil = paymentMethod.toLowerCase().includes('pago') || 
                        paymentMethod.toLowerCase().includes('movil');
    const isEfectivo = paymentMethod.toLowerCase().includes('efectivo') || paymentMethod === 'cash';
    const isPos = paymentMethod.toLowerCase().includes('pos');
    const isBiopago = paymentMethod.toLowerCase().includes('biopago');

    const handleStatusChange = async (newStatus: string) => {
      console.log('🔴 [OrderDetailModal] handleStatusChange INICIO:', newStatus);
      
      if (isLocked) {
        console.warn('⚠️ Orden bloqueada, no se puede modificar');
        return;
      }

      if (isStatusLocked(newStatus)) {
        const confirmMessage = getStatusConfirmationMessage(newStatus);
      }

      // ============================================================
      // 🔥 CONFIRMACIÓN ESPECIAL PARA CANCELACIÓN
      // ============================================================
      // Al cancelar, el backend hace DOS acciones irreversibles:
      //   1. Restock: devuelve el stock de cada producto al inventario.
      //   2. Refund: devuelve el saldo a favor al comprador (si aplica).
      // Avisamos al admin ANTES de confirmar.
      // ============================================================
      if (newStatus === 'CANCELLED') {
        const items = localOrder.items || [];
        const productItems = items.filter(
          (item: any) => !(item.type === 'service' || item.itemType === 'service' || item.serviceId),
        );
        const totalUnits = productItems.reduce(
          (sum: number, item: any) => sum + Number(item.quantity || 1),
          0,
        );

        const creditApplied = localOrder.paymentMetadata?.creditApplied;
        const refundAmount = Number(creditApplied?.amountVes || 0);

        const messages: string[] = [];
        if (totalUnits > 0) {
          messages.push(
            `• Se devolverán ${totalUnits} unidad(es) de ${productItems.length} producto(s) al inventario.`,
          );
        }
        if (refundAmount > 0) {
          messages.push(
            `• Se devolverán Bs. ${refundAmount.toFixed(2)} al saldo a favor del comprador.`,
          );
        }

        if (messages.length > 0) {
          const confirmCancel = window.confirm(
            `⚠️ VAS A CANCELAR ESTA ORDEN\n\n` +
            `Esta acción es irreversible y ejecutará:\n\n` +
            `${messages.join('\n')}\n\n` +
            `¿Confirmás la cancelación?`,
          );

          if (!confirmCancel) {
            console.log('❌ [OrderDetailModal] Cancelación abortada por el admin');
            return;
          }
        }
      }
      
      if (onStatusChange && localOrder.id) {
        console.log('📡 [OrderDetailModal] Llamando a onStatusChange...');
        const result = await onStatusChange(localOrder.id as string, newStatus);
        console.log('🔴 [OrderDetailModal] onStatusChange RESULTADO:', result);
        
        if (result && result.success) {
          console.log('✅ [OrderDetailModal] Estado actualizado correctamente');
          const orderData = result.data?.order || result.data;
          
          const mergedOrder = {
            ...localOrder,
            status: newStatus,
            ...orderData,
            items: orderData.items ? orderData.items.map((newItem: any, index: number) => {
              const oldItem = localOrder.items?.[index] || {};
              
              const imageFields = [
                'coverImage', 'image', 'photo', 'img',
                'mediaUrls', 'images', 'existingImages',
                'fileUrls', 'photos', 'files'
              ];
              
              const preservedItem = { ...newItem };
              
              imageFields.forEach(field => {
                if (oldItem[field] && (!newItem[field] || 
                    (Array.isArray(newItem[field]) && newItem[field].length === 0) ||
                    (typeof newItem[field] === 'string' && newItem[field].trim() === ''))) {
                  preservedItem[field] = oldItem[field];
                }
              });
              
              if (!newItem.priceVes && oldItem.priceVes) {
                preservedItem.priceVes = oldItem.priceVes;
              }
              if (!newItem.ivaType && oldItem.ivaType) {
                preservedItem.ivaType = oldItem.ivaType;
              }
              if (!newItem.ivaRate && oldItem.ivaRate) {
                preservedItem.ivaRate = oldItem.ivaRate;
              }
              
              return preservedItem;
            }) : localOrder.items,
          };
          
          setLocalOrder(mergedOrder);
          if (onOrderUpdated) {
            onOrderUpdated(mergedOrder);
          }
        } else if (result && !result.success) {
          console.error('❌ [OrderDetailModal] Error al actualizar:', result.error);
        } else {
          console.error('❌ [OrderDetailModal] onStatusChange no devolvió nada');
        }
        setIsDropdownOpen(false);
      }
    };

    const handleSaveTracking = async () => {
      if (!localOrder.id) return;
      
      setIsSavingTracking(true);
      setTrackingSaved(false);
      
      try {
        const token = localStorage.getItem('token');
        
        const updatedAttributes = {
          ...localOrder.attributes,
          delivery: {
            ...deliveryData,
            trackingNumber: trackingNumber.trim(),
            updatedAt: new Date().toISOString()
          }
        };
        
        const response = await fetch(`${API_BASE}/orders/${localOrder.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attributes: updatedAttributes }),
        });

        if (response.ok) {
          const updated = await response.json();
          setLocalOrder({ ...localOrder, ...updated });
          if (onOrderUpdated) {
            onOrderUpdated(updated);
          }
          setTrackingSaved(true);
          setTimeout(() => setTrackingSaved(false), 3000);
        } else {
          console.error('Error al guardar tracking number');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsSavingTracking(false);
      }
    };

    // 🔥 HANDLER: RESOLVER VUELTO (SOLO ADMIN)

    
    const handleResolveChange = async (
      resolution: ChangeResolutionType,
      notes?: string,
      deliveryMethod?: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other',
      deliveryPagoMovilData?: {
        bank: string;
        phone: string;
        clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
        clientIdNumber: string;
        reference?: string;
      },
    ) => {
      if (!localOrder?.id) return;
      setIsSubmittingBreakdown(true);
      setBreakdownError(null);

      try {
        const token = localStorage.getItem('token');
        const body: any = { resolution, notes };
        if (deliveryMethod) body.deliveryMethod = deliveryMethod;
        if (deliveryPagoMovilData) {
          body.deliveryPagoMovilData = deliveryPagoMovilData;
        }

        const response = await fetch(
          `${API_BASE}/orders/${localOrder.id}/resolve-change`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 'Error al resolver el vuelto',
          );
        }

        const updatedOrder = await response.json();
        setLocalOrder(updatedOrder);
        if (onOrderUpdated) {
          onOrderUpdated(updatedOrder);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al resolver el vuelto';
        setBreakdownError(message);
        throw err;
      } finally {
        setIsSubmittingBreakdown(false);
      }
    };

    // 🔥 Delegamos a la utilidad central (maneja /api/api/uploads, etc.)
    const getItemImageUrl = (item: any): string | null => {
      if (!item) return null;
      return getImageUrl(item);
    };

    const getAllOrderImages = (): string[] => {
      const images: string[] = [];
      orderItemsList.forEach((item: any) => {
        const img = getItemImageUrl(item);
        if (img && !images.includes(img)) {
          images.push(img);
        }
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

    const getItemImage = (item: any) => {
      return getItemImageUrl(item);
    };

    const getStatusColor = (status: string) => {
      const st = status?.toLowerCase().trim() || '';
      if (isLocked) {
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30 cursor-not-allowed';
      }
      if (st.includes('verificando') || st.includes('por_verificar') || st === 'verificado') return 'text-sky-400 bg-sky-500/10 hover:bg-sky-500/25 border-sky-500/30';
      if (st.includes('pend')) return 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/25 border-amber-500/30';
      if (st.includes('cancel')) return 'text-red-400 bg-red-500/10 hover:bg-red-500/25 border-red-500/30';
      if (st.includes('complet')) return 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/30';
      return 'text-slate-400 bg-slate-500/10 hover:bg-slate-500/25 border-slate-500/30';
    };


    // 🔥 FILTRAR RESEÑAS DE ESTA ORDEN
    const orderItemIds = orderItemsList
      .map((item: any) => item.productId || item.serviceId || item.id || item._id)
      .filter(Boolean);

    const orderReviews = allTenantReviews.filter((r) =>
      orderItemIds.includes(r.itemId),
    );

    const pendingReviewsCount = orderReviews.filter((r) => !r.ownerResponse).length;




    // 🔥 ENRIQUECER ITEMS CON EL SNAPSHOT PARA PASAR A OrderItemsTable
    const enrichedItemsForTable = orderItemsList.map((item: any, index: number) => {
      const ivaInfo = ivaInfoList[index] || readItemSnapshot(item);
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

    return createPortal(
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in overflow-y-auto"
        style={{ backgroundColor: overlayBg }}
      >
        <div 
          className="w-full max-w-5xl rounded-3xl border shadow-2xl flex flex-col my-auto max-h-[92vh] transition-all overflow-hidden"
          style={{ 
            backgroundColor: cardBg,
            border: `1px solid ${borderDynamic}`,
            color: textColor
          }}
        >
          {/* Header */}
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
                <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>Detalles de la Orden</span>
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 flex-wrap" style={{ color: textColor }}>
                  #{localOrder.id ? localOrder.id.slice(0, 12) : 'N/A'}
                  {orderDiscountInfo && (
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-bold animate-pulse"
                      style={{
                        backgroundColor: isDarkBg ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
                        color: isDarkBg ? '#f87171' : '#991b1b',
                        border: `1px solid ${isDarkBg ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.25)'}`
                      }}
                    >
                      <Flame className="w-3 h-3 inline mr-0.5" />
                      {orderDiscountInfo.maxDiscountPercentage}% OFF
                                          </span>
                  )}
                </h3>
            
                {isKiosk && (
                  <span 
                    className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1"
                  >
                    <MonitorSmartphone className="w-2.5 h-2.5" />
                    Kiosco
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={onClose} 
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95`}
                style={dynamicSubCardStyle}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Columna de Imágenes */}
              <div className="md:col-span-5 space-y-4">
                <div 
                  className="aspect-square rounded-3xl border overflow-hidden flex items-center justify-center relative group shadow-inner cursor-pointer"
                  style={dynamicSubCardStyle}
                  onClick={() => currentImg && setIsZoomedModalOpen(true)}
                >
                  {currentImg ? (
                    <>
                      <img 
                        src={currentImg} 
                        alt="Producto" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Sin+Imagen';
                        }}
                      />
                      {allImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={goToPrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition opacity-70 hover:opacity-100"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={goToNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition opacity-70 hover:opacity-100"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold">
                            {selectedImageIndex + 1} / {allImages.length}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <ImageIcon className="w-16 h-16 opacity-20" />
                      <span className="text-xs opacity-40 mt-2">Sin imagen disponible</span>
                    </div>
                  )}
                </div>

                {allImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {allImages.map((imgUrl: string, idx: number) => {
                      const isSelected = idx === selectedImageIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`aspect-square rounded-xl overflow-hidden border transition-all relative group cursor-pointer ${
                            isSelected ? 'ring-2 shadow-md scale-105' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ borderColor: isSelected ? primary : borderDynamic }}
                        >
                          <img src={imgUrl} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Columna de Información */}
              <div className="md:col-span-7 space-y-5">
                
                {/* Estado y Acciones */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium opacity-70" style={{ color: textColor }}>Estado:</span>
                    <OrderStatusBadge status={localOrder.status} isDarkBg={isDarkBg} />
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

                  {onStatusChange && !isLocked && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={isUpdating}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-2 shadow-sm ${getStatusColor(localOrder.status)}`}
                      >
                        {isUpdating ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <>
                            Cambiar Estado
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg z-50 border overflow-hidden">
                          <OrderStatusDropdown
                            currentStatus={localOrder.status}
                            onStatusChange={handleStatusChange}
                            isDarkBg={isDarkBg}
                            textColor={textColor}
                            subtleBorderColor={borderDynamic}
                            primary={primary}
                            secondary={secondary}
                            onClose={() => setIsDropdownOpen(false)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 🔥 SECCIÓN MENSAJERÍA */}
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
                          {companyInfo?.name || deliveryData.companyName || deliveryData.company}
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
      <span className="text-[10px] font-semibold" style={{ color: isDarkBg ? '#34d399' : '#065f46' }}>
        (${formatUsd(Number(deliveryData.costUsd))})
      </span>
    )}
  </div>
) : null}
                    </div>
                    
                    {deliveryData.estimatedDays && (
                      <p className="text-[10px] opacity-60 mt-1 flex items-center gap-1" style={{ color: textColor }}>
                        <Clock className="w-3 h-3" />
                        Tiempo estimado: {deliveryData.estimatedDays}
                      </p>
                    )}
                    
                    {deliveryData.trackingNumber && (
                      <div className="mt-2 p-2 rounded-lg bg-black/5 flex items-center gap-2" style={{ borderColor: borderDynamic }}>
                        <Package className="w-3.5 h-3.5 opacity-40" />
                        <span className="text-xs font-medium" style={{ color: textColor }}>
                          {deliveryData.trackingNumber}
                        </span>
                        {deliveryData.trackingUrl && (
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
                {localOrder.paymentMetadata?.fulfillment === 'delivery' && localOrder.paymentMetadata?.localDelivery && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" style={{ color: primary }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>
                          Delivery Local
                        </span>
                      </div>
                      {localOrder.paymentMetadata.localDelivery.fee != null && (
                        <span className="text-xs font-bold" style={{ color: primary }}>
                          {Number(localOrder.paymentMetadata.localDelivery.fee) === 0
                            ? 'Gratis'
                            : `$${formatUsd(Number(localOrder.paymentMetadata.localDelivery.fee))}`}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: textColor }}>
                      {localOrder.paymentMetadata.localDelivery.distanceKm != null && (
                        <span className="flex items-center gap-1 opacity-70">
                          <MapPin className="w-3 h-3" />
                          {Number(localOrder.paymentMetadata.localDelivery.distanceKm).toFixed(2)} km
                        </span>
                      )}
                      {localOrder.paymentMetadata.localDelivery.etaMinutes != null && (
                        <span className="flex items-center gap-1 opacity-70">
                          <Clock className="w-3 h-3" />
                          ~{localOrder.paymentMetadata.localDelivery.etaMinutes} min
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {localOrder.paymentMetadata?.fulfillment === 'pickup' && (
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

                {/* 🔥 ADMIN - AGREGAR NÚMERO DE SEGUIMIENTO */}
                {hasDelivery && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: textColor }}>
                      Número de seguimiento
                    </label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Ej. MRW-1234567890"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none bg-transparent"
                        style={{ borderColor: borderDynamic, color: textColor }}
                        disabled={isLocked}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveTracking}
                        disabled={isLocked}
                        loading={isSavingTracking}
                        primary={primary}
                        borderColor={borderDynamic}
                        textColor={textColor}
                        cardBg={cardBg}
                        isDarkBg={isDarkBg}
                      >
                        {isSavingTracking ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                    {trackingSaved && (
                      <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Número de seguimiento guardado
                      </p>
                    )}
                    {isLocked && (
                      <p className="text-[10px] opacity-40 mt-1">No se puede modificar, orden bloqueada</p>
                    )}
                  </div>
                )}

                {/* 🔥 CLIENTE Y FECHA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border" style={dynamicSubCardStyle}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: textColor }}>Cliente</span>
                    <p className="text-sm font-medium mt-0.5" style={{ color: textColor }}>
                      {localOrder.customerName || localOrder.userName || localOrder.clientName || 'Cliente'}
                      {isKiosk && (
                        <span className="ml-2 text-[9px] font-normal opacity-60">(Autoservicio)</span>
                      )}
                    </p>
                    
                    {localOrder.customerEmail && (
                      <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5" style={{ color: textColor }}>
                        <Mail className="w-3 h-3" />
                        {localOrder.customerEmail}
                      </p>
                    )}
                    
                    {localOrder.customerPhone && (
                      <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5" style={{ color: textColor }}>
                        <Phone className="w-3 h-3" />
                        {formatPhoneDisplay(localOrder.customerPhone)}
                                              </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: textColor }}>Fecha</span>
                    <p className="text-sm font-medium mt-0.5" style={{ color: textColor }}>
                      {localOrder.createdAt ? new Date(localOrder.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 🔥 MÉTODO DE PAGO LEGACY - SOLO SI NO HAY paymentBreakdown */}
                {!localOrder.paymentBreakdown && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" style={{ color: primary }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary }}>Método de Pago</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-sm font-medium" style={{ color: textColor }}>
                        {paymentMethod || 'No especificado'}
                      </span>
                      {localOrder.paymentReference && (
                        <span className="text-xs opacity-60 ml-2" style={{ color: textColor }}>
                          Ref: {localOrder.paymentReference}
                        </span>
                      )}
                    </div>

                    {/* 🔥 DETALLE DE PAGO EN EFECTIVO (moneda + monto + vuelto) */}
                    {isEfectivo && (cashCurrency || (cashAmount && cashAmount > 0)) && (
                      <div
                        className="mt-2 pt-2 border-t space-y-1"
                        style={{ borderColor: borderDynamic }}
                      >
                        {cashCurrency && (
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: textColor, opacity: 0.6 }}>Pagó en</span>
                            <span className="font-bold" style={{ color: textColor }}>
                              {cashCurrency === 'VES' ? 'Bolívares (Bs.)' : 'Dólares (USD)'}
                            </span>
                          </div>
                        )}

                        {cashAmount !== undefined && cashAmount > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: textColor, opacity: 0.6 }}>Entregó</span>
                            <span className="font-bold" style={{ color: textColor }}>
                              {cashCurrency === 'USD'
                                ? `$${formatUsd(Number(cashAmount))}`
                                : `Bs. ${formatPrice(Number(cashAmount))}`}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: textColor, opacity: 0.6 }}>Total</span>
                          <span className="font-bold" style={{ color: textColor }}>
                            Bs. {formatPrice(totalVes)}
                          </span>
                        </div>

                        {/* Vuelto o falta por pagar */}
                        {(() => {
                          if (!cashAmount || cashAmount <= 0) return null;
                          if (!orderRate || orderRate <= 0) return null;

                          const paidInVes =
                            cashCurrency === 'USD'
                              ? Number(cashAmount) * orderRate
                              : Number(cashAmount);

                          const diff = paidInVes - totalVes;

                          if (diff > 0.01) {
                            return (
                              <div
                                className="flex items-center justify-between text-xs pt-1 border-t"
                                style={{ borderColor: borderDynamic }}
                              >
                                <span
                                  className="font-bold"
                                  style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}
                                >
                                  Vuelto pendiente de entregar
                                </span>
                                <span
                                  className="font-black"
                                  style={{ color: isDarkBg ? '#4ade80' : '#15803d' }}
                                >
                                  Bs. {formatPrice(diff)}
                                </span>
                              </div>
                            );
                          }

                          if (diff < -0.01) {
                            return (
                              <div
                                className="flex items-center justify-between text-xs pt-1 border-t"
                                style={{ borderColor: borderDynamic }}
                              >
                                <span
                                  className="font-bold"
                                  style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}
                                >
                                  Falta por pagar
                                </span>
                                <span
                                  className="font-black"
                                  style={{ color: isDarkBg ? '#fbbf24' : '#b45309' }}
                                >
                                  Bs. {formatPrice(Math.abs(diff))}
                                </span>
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    )}

                    {isEfectivo && (
                      <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Pago en efectivo - confirmar en el local
                      </p>
                    )}
                    {isPos && (
                      <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Pago con POS - verificar transacción
                      </p>
                    )}
                    {isPagoMovil && (
                      <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Pago Móvil - verificar con el cliente
                      </p>
                    )}
                  </div>
                )}

                {/* 🔥 BLOQUE DE VUELTO (paymentMetadata.change) - ADMIN */}
                {localOrder.paymentMetadata?.change &&
                  Number(localOrder.paymentMetadata.change.amountVes) > 0 &&
                  (() => {
                    const change = localOrder.paymentMetadata.change;
                    const resolution = change.resolution;
                    const amountVes = Number(change.amountVes || 0);
                    const amountUsd = Number(change.amountUsd || 0);
                    const pref = change.deliveryPreference;
                    const deliveredMethod = change.deliveryMethod;
                    const deliveredPm = change.deliveryPagoMovilData;

                    const isPending = resolution === 'pending';
                    const isCredit = resolution === 'credit';
                    const isDelivered = resolution === 'delivered';
                    const isRounded = resolution === 'rounded';

                    // Colores según estado
                    let accentColor = '#f59e0b';
                    let bgTint = 'rgba(251,191,36,0.08)';
                    let borderTint = 'rgba(251,191,36,0.3)';
                    let statusLabel = 'PENDIENTE DE RESOLVER';

                    if (isCredit && change.creditCreated === true) {
                      accentColor = '#22c55e';
                      bgTint = 'rgba(34,197,94,0.08)';
                      borderTint = 'rgba(34,197,94,0.3)';
                      statusLabel = 'SALDO ACREDITADO';
                    } else if (isCredit && change.creditCreated !== true) {
                      accentColor = '#f59e0b';
                      bgTint = 'rgba(251,191,36,0.08)';
                      borderTint = 'rgba(251,191,36,0.3)';
                      statusLabel = 'SALDO PENDIENTE DE ACREDITAR';
                    } else if (isDelivered) {
                      accentColor = '#22c55e';
                      bgTint = 'rgba(34,197,94,0.08)';
                      borderTint = 'rgba(34,197,94,0.3)';
                      statusLabel = 'VUELTO ENTREGADO';
                    } else if (isRounded) {
                      accentColor = isDarkBg ? '#94a3b8' : '#64748b';
                      bgTint = isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                      borderTint = borderDynamic;
                      statusLabel = 'REDONDEO ACEPTADO';
                    }

                    return (
                      <div
                        className="p-4 rounded-xl border space-y-3"
                        style={{ backgroundColor: bgTint, borderColor: borderTint }}
                      >
                        {/* HEADER */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: accentColor }}
                            >
                              Vuelto
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                              style={{
                                backgroundColor: `${accentColor}15`,
                                borderColor: `${accentColor}40`,
                                color: accentColor,
                              }}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black" style={{ color: accentColor }}>
                              Bs. {formatPrice(amountVes)}
                            </div>
                            <div className="text-[10px] font-semibold" style={{ color: textColor, opacity: 0.6 }}>
                              (${formatUsd(amountUsd)})
                            </div>
                          </div>
                        </div>

                        {/* ESTADO: CREDIT ACREDITADO */}
                        {isCredit && change.creditCreated === true && (
                          <div className="text-[11px] space-y-0.5" style={{ color: textColor }}>
                            <p className="flex items-start gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                              <span>
                                El saldo a favor de <b>Bs. {formatPrice(amountVes)}</b> ya fue acreditado
                                automáticamente al cliente.
                              </span>
                            </p>
                            {change.resolvedAt && (
                              <p className="text-[10px] opacity-60">
                                Acreditado el{' '}
                                {new Date(change.resolvedAt).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* ESTADO: CREDIT PENDIENTE */}
                        {isCredit && change.creditCreated !== true && (
                          <div className="text-[11px] space-y-2" style={{ color: textColor }}>
                            <p className="flex items-start gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                              <span>
                                El cliente eligió <b>saldo a favor</b> pero aún no se acreditó.
                              </span>
                            </p>
                            {change.creditError && (
                              <p className="text-[10px] text-rose-500">
                                Error previo: {change.creditError}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                if (!localOrder?.id) return;
                                try {
                                  setIsSubmittingBreakdown(true);
                                  const token = localStorage.getItem('token');
                                  const res = await fetch(
                                    `${API_BASE}/orders/${localOrder.id}/resolve-change`,
                                    {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                      },
                                      body: JSON.stringify({
                                        resolution: 'credit',
                                        notes: 'Acreditado manualmente desde el admin',
                                      }),
                                    },
                                  );
                                  if (!res.ok) throw new Error(await res.text());
                                  const updated = await res.json();
                                  setLocalOrder(updated);
                                  if (onOrderUpdated) onOrderUpdated(updated);
                                } catch (e) {
                                  console.error('Error acreditando:', e);
                                } finally {
                                  setIsSubmittingBreakdown(false);
                                }
                              }}
                              disabled={isSubmittingBreakdown}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                              style={{ backgroundColor: '#22c55e' }}
                            >
                              {isSubmittingBreakdown ? (
                                'Acreditando...'
                              ) : (
                                <>
                                  <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                                  Acreditar saldo ahora
                                </>
                              )}
                                                          </button>
                          </div>
                        )}

                        {/* ESTADO: DELIVERED */}
                        {isDelivered && (
                          <div className="text-[11px] space-y-1" style={{ color: textColor }}>
                            <p className="flex items-start gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                              <span>
                                El vuelto de <b>Bs. {formatPrice(amountVes)}</b> fue entregado al cliente.
                              </span>
                            </p>
                            {deliveredMethod && (
                              <p>
                                <b>Método:</b>{' '}
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
                              <div className="text-[10px] space-y-0.5 opacity-80">
                                {deliveredPm.bank && <div><b>Banco:</b> {deliveredPm.bank}</div>}
                                {deliveredPm.phone && <div><b>Teléfono:</b> {formatPhoneDisplay(deliveredPm.phone)}</div>}
                                                                {deliveredPm.clientIdNumber && (
                                  <div>
                                    <b>Cédula:</b> {deliveredPm.clientIdType || 'V'}-
                                    {deliveredPm.clientIdNumber}
                                  </div>
                                )}
                                {deliveredPm.reference && (
                                  <div><b>Referencia:</b> {deliveredPm.reference}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ESTADO: ROUNDED */}
                        {isRounded && (
                          <div className="text-[11px]" style={{ color: textColor, opacity: 0.8 }}>
                            El cliente aceptó el redondeo. El vuelto de Bs. {formatPrice(amountVes)} quedó
                            a favor de la tienda.
                          </div>
                        )}

                        {/* ESTADO: PENDING — mostrar preferencia + acciones */}
                        {isPending && (
                          <>
                            {/* Preferencia del comprador */}
                            {pref ? (
                              <div
                                className="p-2.5 rounded-lg border space-y-1"
                                style={{
                                  borderColor: borderDynamic,
                                  backgroundColor: isDarkBg
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(0,0,0,0.02)',
                                }}
                              >
                                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: primary }}>
                                  El comprador pidió:
                                </div>
                                <div className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: textColor }}>
                                  {pref.method === 'cash_ves' ? (
                                    <>
                                      <Banknote className="w-3.5 h-3.5 shrink-0" />
                                      Efectivo Bs.
                                    </>
                                  ) : pref.method === 'cash_usd' ? (
                                    <>
                                      <Banknote className="w-3.5 h-3.5 shrink-0" />
                                      Efectivo USD
                                    </>
                                  ) : pref.method === 'pago_movil' ? (
                                    <>
                                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                                      Pago Móvil
                                    </>
                                  ) : (
                                    'Otro'
                                  )}
                                </div>
                                {pref.method === 'pago_movil' && pref.pagoMovilData && (
                                  <div className="text-[10px] space-y-0.5" style={{ color: textColor, opacity: 0.8 }}>
                                    {pref.pagoMovilData.bank && <div><b>Banco:</b> {pref.pagoMovilData.bank}</div>}
                                    {pref.pagoMovilData.phone && <div><b>Teléfono:</b> {formatPhoneDisplay(pref.pagoMovilData.phone)}</div>}
                                                                        {pref.pagoMovilData.clientIdNumber && (
                                      <div>
                                        <b>Cédula:</b> {pref.pagoMovilData.clientIdType || 'V'}-
                                        {pref.pagoMovilData.clientIdNumber}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {pref.notes && (
                                  <div className="text-[10px] italic opacity-70" style={{ color: textColor }}>
                                    &quot;{pref.notes}&quot;
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] italic" style={{ color: textColor, opacity: 0.6 }}>
                                El comprador no especificó cómo quiere el vuelto.
                              </div>
                            )}

                            {/* Botón para abrir panel de resolución */}
                            {!changeAdminPanelOpen ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setChangeAdminPanelOpen(true);
                                  // Pre-rellenar con la preferencia del comprador
                                  if (pref?.method) {
                                    setChangeAdminDelivery(pref.method);
                                    if (pref.method === 'pago_movil' && pref.pagoMovilData) {
                                      setChangeAdminPmBank(pref.pagoMovilData.bank || '');
                                      setChangeAdminPmPhone(pref.pagoMovilData.phone || '');
                                      setChangeAdminPmIdType(pref.pagoMovilData.clientIdType || 'V');
                                      setChangeAdminPmIdNumber(pref.pagoMovilData.clientIdNumber || '');
                                    }
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg text-[11px] font-bold text-white transition hover:opacity-90 cursor-pointer"
                                style={{ backgroundColor: primary }}
                              >
                                <Wrench className="w-3.5 h-3.5 inline mr-1" />
                                Resolver vuelto
                                                              </button>
                            ) : (
                              <div
                                className="p-3 rounded-lg border space-y-2"
                                style={{ borderColor: borderDynamic, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>
                                    Entregar vuelto vía:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setChangeAdminPanelOpen(false)}
                                    className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
                                    style={{ color: textColor }}
                                  >
                                    Cancelar
                                  </button>
                                </div>

                                {/* Selector de método */}
                                <div className="flex flex-wrap gap-1.5">
                                  {([
                                    { value: 'cash_ves', label: 'Efectivo Bs.' },
                                    { value: 'cash_usd', label: 'Efectivo USD' },
                                    { value: 'pago_movil', label: 'Pago Móvil' },
                                    { value: 'other', label: 'Otro' },
                                  ] as const).map((opt) => {
                                    const active = changeAdminDelivery === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setChangeAdminDelivery(opt.value)}
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer"
                                        style={{
                                          borderColor: active ? primary : borderDynamic,
                                          backgroundColor: active ? `${primary}15` : 'transparent',
                                          color: active ? primary : textColor,
                                        }}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Campos PM */}
                                {changeAdminDelivery === 'pago_movil' && (
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="col-span-2">
                                      <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
                                        Banco
                                      </label>
                                      <input
                                        type="text"
                                        value={changeAdminPmBank}
                                        onChange={(e) => setChangeAdminPmBank(e.target.value)}
                                        placeholder="Banesco"
                                        className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                                        style={{ borderColor: borderDynamic, color: textColor }}
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
                                        Teléfono
                                      </label>
                                      <input
                                        type="tel"
                                        value={changeAdminPmPhone}
                                        onChange={(e) => setChangeAdminPmPhone(e.target.value)}
                                        placeholder="04141234567"
                                        className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                                        style={{ borderColor: borderDynamic, color: textColor }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
                                        Cédula / RIF
                                      </label>
                                      <div className="flex gap-1">
                                        <div className="w-[70px] flex-shrink-0">
                                          <SearchableDropdown
                                            value={changeAdminPmIdType}
                                            onChange={(val) => setChangeAdminPmIdType(val as 'V' | 'E' | 'J' | 'G' | 'P')}
                                            options={[
                                              { value: 'V', label: 'V' },
                                              { value: 'E', label: 'E' },
                                              { value: 'J', label: 'J' },
                                              { value: 'G', label: 'G' },
                                              { value: 'P', label: 'P' },
                                            ]}
                                            placeholder="V"
                                            primary={primary}
                                            textColor={textColor}
                                            isDarkBg={isDarkBg}
                                            borderColor={borderDynamic}
                                            searchable={false}
                                          />
                                        </div>
                                        <input
                                          type="text"
                                          value={changeAdminPmIdNumber}
                                          onChange={(e) => setChangeAdminPmIdNumber(e.target.value.replace(/\D/g, ''))}
                                          placeholder="12345678"
                                          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                                          style={{ borderColor: borderDynamic, color: textColor }}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: textColor }}>
                                        Referencia (opcional)
                                      </label>
                                      <input
                                        type="text"
                                        value={changeAdminPmReference}
                                        onChange={(e) => setChangeAdminPmReference(e.target.value)}
                                        placeholder="1234"
                                        className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                                        style={{ borderColor: borderDynamic, color: textColor }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  disabled={isSubmittingBreakdown}
                                  onClick={async () => {
                                    const notes = 'Entregado desde el admin';
                                    const pmData =
                                      changeAdminDelivery === 'pago_movil'
                                        ? {
                                            bank: changeAdminPmBank.trim(),
                                            phone: changeAdminPmPhone.trim(),
                                            clientIdType: changeAdminPmIdType,
                                            clientIdNumber: changeAdminPmIdNumber.trim(),
                                            reference: changeAdminPmReference.trim() || undefined,
                                          }
                                        : undefined;
                                    try {
                                      await handleResolveChange('delivered', notes, changeAdminDelivery, pmData);
                                      setChangeAdminPanelOpen(false);
                                    } catch (e) {
                                      // handleResolveChange ya setea breakdownError
                                    }
                                  }}
                                  className="w-full py-2 rounded-lg text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                                  style={{ backgroundColor: '#22c55e' }}
                                >
                                  {isSubmittingBreakdown ? (
                                    'Guardando...'
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                                      Confirmar entrega
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}

                {/* 🔥 DESGLOSE DE PAGO MIXTO (Fase 2) - VISTA + RESOLUCIÓN */}
                {localOrder.paymentBreakdown && (
                  <PaymentBreakdown
                    mode="view"
                    totalVes={totalVes}
                    exchangeRate={orderRate}
                    activeMethods={activePaymentMethods}
                    initialBreakdown={localOrder.paymentBreakdown as PaymentBreakdownType}
                    canResolveChange={true}
                    primary={primary}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                    borderColor={borderDynamic}
                    cardBg={cardBg}
                    onResolveChange={handleResolveChange}
                    isSubmitting={isSubmittingBreakdown}
                    submitError={breakdownError}
                  />
                )}

                {/* 🔥 COMPROBANTE DE PAGO DEL CLIENTE */}
                {hasPaymentReport && (
                  <div className="p-4 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" style={{ color: primary }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary }}>
                          Pago Reportado por el Cliente
                        </span>
                      </div>
                      {paymentReportedAt && (
                        <span className="text-[9px] opacity-50" style={{ color: textColor }}>
                          {new Date(paymentReportedAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: borderDynamic }}>
                      {paymentBankSource && (
                        <p className="text-xs opacity-80 flex items-center gap-1">
                          <Building2 className="w-3 h-3 opacity-50" />
                          <span className="opacity-50">Banco origen:</span>
                          <span className="font-medium" style={{ color: textColor }}>{paymentBankSource}</span>
                        </p>
                      )}
                      
                      {paymentRef && (
                        <p className="text-xs opacity-80 flex items-center gap-1">
                          <span className="opacity-50">Referencia:</span>
                          <span className="font-medium" style={{ color: textColor }}>{paymentRef}</span>
                        </p>
                      )}
                      
                      {isPagoMovil && (
                        <>
                          {clientIdNumber && (
                            <p className="text-xs opacity-80 flex items-center gap-1">
                              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                              </svg>
                              <span className="opacity-50">Cédula/RIF:</span>
                              <span className="font-medium" style={{ color: textColor }}>
                                {clientIdType}-{clientIdNumber}
                              </span>
                            </p>
                          )}
                          
                          {clientPhoneFromReport && (
                            <p className="text-xs opacity-80 flex items-center gap-1">
                              <Phone className="w-3 h-3 opacity-50" />
                              <span className="opacity-50">Teléfono:</span>
                              <span className="font-medium" style={{ color: textColor }}>{formatPhoneDisplay(clientPhoneFromReport)}</span>
                                                          </p>
                          )}
                        </>
                      )}
                      
                      {isPos && clientAccountType && (
                        <p className="text-xs opacity-80 flex items-center gap-1">
                          <span className="opacity-50">Tipo de cuenta:</span>
                          <span className="font-medium" style={{ color: textColor }}>{clientAccountType}</span>
                        </p>
                      )}
                    </div>
                    
{hasPaymentProof && proofUrl && (
  <div 
    className="rounded-xl overflow-hidden border bg-black/5 cursor-pointer transition hover:scale-[1.01] mt-3"
    style={{ borderColor: borderDynamic }}
    onClick={() => setIsProofZoomed(true)}
  >
    {isImageFile(orderPaymentProof) ? (
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
    ) : (
      <div className="p-4 text-center">
        <span className="text-xs opacity-50 inline-flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          Comprobante en PDF
        </span>
        <div className="flex gap-2 justify-center mt-2">
          <a 
            href={proofUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Abrir
          </a>
          <a 
            href={proofUrl} 
            download
            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:opacity-80"
            style={{ borderColor: borderDynamic, color: textColor }}
          >
            Descargar
          </a>
        </div>
      </div>
    )}
  </div>
)}
                  </div>
                )}

                {/* 🔥 RESUMEN DE LA ORDEN CON TOTAL DEBAJO - PASO 1 CORREGIDO */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block" style={{ color: textColor }}>Resumen de la Orden</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                      <span className="font-bold opacity-50 text-[8px] uppercase tracking-wider mb-0.5" style={{ color: textColor }}>Artículos</span>
                      <span className="font-semibold text-xs" style={{ color: textColor }}>{totalItems} unidades</span>
                    </div>
                    <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                      <span className="font-bold opacity-50 text-[8px] uppercase tracking-wider mb-0.5" style={{ color: textColor }}>Subtotal</span>
                      {/* ✅ Subtotal - font-bold + primary (sin font-mono) */}
                      <span className="text-xs font-bold" style={{ color: primary }}>
                        Bs. {formatPrice(subtotalVes)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border flex flex-col justify-center" style={dynamicSubCardStyle}>
                      <span className="font-bold opacity-50 text-[8px] uppercase tracking-wider mb-0.5" style={{ color: textColor }}>Productos</span>
                      <span className="font-semibold text-xs" style={{ color: textColor }}>
                        {orderItemsList.length} {orderItemsList.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                  </div>

                  {/* ✅ TOTAL CORREGIDO */}
                  <div 
                    className="p-3 rounded-xl border-2 flex items-center justify-between"
                    style={{ 
                      borderColor: primary,
                      backgroundColor: `${primary}10`,
                    }}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>Total a Pagar</span>
                    <div className="text-right">
                      {/* ✅ Total - font-black + primary */}
                      <span className="text-lg font-black" style={{ color: primary }}>
                        Bs. {formatPrice(totalVes)}
                      </span>
                      {/* ✅ USD - verde con lógica + font-semibold (sin font-mono) */}
                      <span className="text-[10px] font-semibold ml-2" style={{ color: isDarkBg ? '#34d399' : '#065f46' }}>
                        (${formatPrice(totalUsd)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🔥 TABLA DE PRODUCTOS - PASANDO ITEMS ENRIQUECIDOS CON IVA */}
                <OrderItemsTable 
                  items={enrichedItemsForTable}
                  order={localOrder}
                  subtotalVes={subtotalVes}
                  textColor={textColor}
                  primary={primary}
                  priceColor={priceColor}
                  borderDynamic={borderDynamic}
                  dynamicSubCardStyle={dynamicSubCardStyle}
                  getItemImage={getItemImage}
                />

                {/* 🔥 DESGLOSE DE IVA - DEFINITIVO */}
                {hasIVA && (
                  <div className="p-3 rounded-xl border" style={dynamicSubCardStyle}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: textColor }}>
                        Desglose de IVA
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded-lg text-[8px] font-medium border"
                        style={{
                          backgroundColor: ivaBadgeBg,
                          borderColor: `${ivaBadgeColor}30`,
                          color: ivaBadgeColor
                        }}
                      >
                        {ivaDisplayType}
                      </span>
                    </div>
                    
                    {orderItemsList.map((item: any, index: number) => {
                      const ivaInfo = ivaInfoList[index] || readItemSnapshot(item);
                      const qty = Number(item.quantity || item.qty || 1);

                      if (ivaInfo.ivaType === 'exempt') {
                        return (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] py-0.5 border-b last:border-0 gap-0.5" style={{ borderColor: borderDynamic }}>
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="font-medium opacity-80 truncate" style={{ color: textColor }}>
                                {item.name || item.title || item.productName || `Item ${index + 1}`}
                              </span>
                              <span className="px-1 py-0.5 rounded text-[7px] font-medium border shrink-0" style={{
                                backgroundColor: 'rgba(100,116,139,0.15)',
                                borderColor: 'rgba(100,116,139,0.3)',
                                color: '#94a3b8'
                              }}>
                                Exento
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold" style={{ color: primary }}>
                                Total: Bs. {formatPrice(ivaInfo.basePrice * qty)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] py-0.5 border-b last:border-0 gap-0.5" style={{ borderColor: borderDynamic }}>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="font-medium opacity-80 truncate" style={{ color: textColor }}>
                              {item.name || item.title || item.productName || `Item ${index + 1}`}
                            </span>
                            <span className="px-1 py-0.5 rounded text-[7px] font-medium border shrink-0" style={{
                              backgroundColor: ivaInfo.ivaType === 'included' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                              borderColor: ivaInfo.ivaType === 'included' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)',
                              color: ivaInfo.ivaType === 'included' ? '#34d399' : '#fbbf24'
                            }}>
                              {ivaInfo.displayShort}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="opacity-60" style={{ color: textColor }}>Base: Bs. {formatPrice(ivaInfo.basePrice * qty)}</span>
                            <span className="font-bold" style={{ color: primary }}>
                              IVA: Bs. {formatPrice(ivaInfo.ivaAmount * qty)}
                            </span>
                            <span className="font-bold" style={{ color: primary }}>
                              Total: Bs. {formatPrice(ivaInfo.priceWithIVA * qty)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 🔥 TOTALES - CON IVA INTEGRADO */}
                <div className="flex flex-col items-end gap-1 p-4 rounded-xl border" style={dynamicSubCardStyle}>
                  {/* ✅ Subtotal */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs opacity-60" style={{ color: textColor }}>Subtotal:</span>
                    <span className="text-xs font-bold" style={{ color: primary }}>Bs. {formatPrice(subtotalVes)}</span>
                  </div>
                  
                  {/* ✅ IVA - AHORA CON EL TIPO DE IVA INCLUIDO */}
                  {hasIVA && (
                    <>
                      <div className="flex items-center gap-4">
                        <span className="text-xs opacity-60" style={{ color: textColor }}>IVA ({ivaDisplayType}):</span>
                        <span className="text-xs font-bold" style={{ color: primary }}>Bs. {formatPrice(totalIVAVes)}</span>
                      </div>
                    </>
                  )}

                  {/* ✅ DESCUENTO APLICADO */}
                  {orderDiscountInfo && orderDiscountInfo.totalSavedVes > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-xs opacity-60" style={{ color: textColor }}>Descuento aplicado:</span>
                      <span className="text-xs font-bold" style={{ color: '#22c55e' }}>
                        -Bs. {formatPrice(orderDiscountInfo.totalSavedVes)}
                      </span>
                    </div>
                  )}

                  {/* 🔥 SALDO A FAVOR APLICADO */}
                  {creditAppliedVes > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-xs opacity-60 flex items-center gap-1" style={{ color: textColor }}>
                        <Wallet className="w-3 h-3" />
                        Saldo a favor aplicado:
                      </span>
                      <span className="text-xs font-bold" style={{ color: '#22c55e' }}>
                        -Bs. {formatPrice(creditAppliedVes)}
                        {orderRate > 0 && (
                          <span className="ml-1 text-[10px] font-semibold">
                            (-${formatUsd(creditAppliedVes / orderRate)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {/* ✅ Envío */}
                  {shippingVes > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-xs opacity-60" style={{ color: textColor }}>
  Envío{deliveryData?.companyName ? ` (${deliveryData.companyName})` : ''}:
                      </span>
                      <span className="text-xs font-bold" style={{ color: primary }}>
                        Bs. {formatPrice(shippingVes)}
                      </span>
                    </div>
                  )}
                  
                  {/* ✅ Impuestos ELIMINADO - el IVA ya se muestra arriba, el order.tax era un parche viejo */}
                  
                  {/* ✅ UN SOLO SEPARADOR - este es el único que queda */}
                  <div className="flex items-center gap-4 pt-2 border-t w-full justify-end" style={{ borderColor: borderDynamic }}>
                    <span className="text-sm font-bold" style={{ color: textColor }}>Total:</span>
                    <div className="text-right">
                      {orderDiscountInfo && orderDiscountInfo.totalOriginalVes > 0 && (
                        <span className="text-xs line-through opacity-50 block" style={{ color: textColor }}>
                          Bs. {formatPrice(orderDiscountInfo.totalOriginalVes)}
                        </span>
                      )}
                      <span className="text-sm font-black" style={{ color: primary }}>
                        Bs. {formatPrice(totalVes)}
                        <span className="text-[10px] font-semibold ml-1" style={{ color: isDarkBg ? '#34d399' : '#065f46' }}>
                          (${formatPrice(totalUsd)})
                        </span>
                      </span>
                      {orderDiscountInfo && orderDiscountInfo.totalSavedVes > 0 && (
                        <span className="text-[9px] font-bold block" style={{ color: '#22c55e' }}>
                          Ahorraste Bs. {formatPrice(orderDiscountInfo.totalSavedVes)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 🔥 SECCIÓN DE RESEÑAS DE ESTA ORDEN */}
                {orderReviews.length > 0 && (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: borderDynamic }}>
                    <button
                      type="button"
                      onClick={() => setReviewsExpanded(!reviewsExpanded)}
                      className="w-full p-4 flex items-center justify-between transition hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" style={{ color: primary }} />
                        <span className="text-xs font-bold" style={{ color: textColor }}>
                          Reseñas de esta orden
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: `${primary}20`, color: primary }}
                        >
                          {orderReviews.length}
                        </span>
                        {pendingReviewsCount > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#d97706' }}
                          >
                            {pendingReviewsCount} sin responder
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${reviewsExpanded ? 'rotate-180' : ''}`}
                        style={{ color: textColor, opacity: 0.5 }}
                      />
                    </button>

                    {reviewsExpanded && (
                      <div className="p-4 space-y-3 border-t" style={{ borderColor: borderDynamic }}>
                        {reviewsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: primary }} />
                          </div>
                        ) : (
                          orderReviews.map((review: TenantReview) => {
                            const hasResponse = !!review.ownerResponse;
                            return (
                              <div
                                key={review.id}
                                className="p-3 rounded-xl border"
                                style={{ borderColor: borderDynamic, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                              >
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold" style={{ color: textColor }}>
                                        {review.user?.name || 'Usuario'}
                                      </span>
                                      <StarRating value={review.rating} readOnly size={11} gap={0.5} />
                                    </div>
                                    {review.title && (
                                      <p className="text-[11px] font-medium mt-1" style={{ color: textColor, opacity: 0.85 }}>
                                        {review.title}
                                      </p>
                                    )}
                                    {review.comment && (
                                      <p className="text-[10px] mt-1" style={{ color: textColor, opacity: 0.6 }}>
                                        {review.comment}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {hasResponse ? (
                                      <span
                                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                                      >
                                        ✓ Respondida
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#d97706' }}
                                      >
                                        ● Sin responder
                                      </span>
                                    )}
                                    <Button
                                      variant="primary"
                                      size="xs"
                                      onClick={() => handleOpenResponse(review)}
                                      primary={primary}
                                      borderColor={borderDynamic}
                                      textColor={textColor}
                                      cardBg={cardBg}
                                      isDarkBg={isDarkBg}
                                    >
                                      {hasResponse ? 'Editar' : 'Responder'}
                                    </Button>
                                  </div>
                                </div>

                                {hasResponse && (
                                  <div
                                    className="mt-2 pt-2 border-t p-2 rounded-lg"
                                    style={{
                                      borderColor: borderDynamic,
                                      backgroundColor: isDarkBg ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)',
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <MessageCircle className="w-3 h-3" style={{ color: '#16a34a' }} />
                                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#16a34a' }}>
                                        Tu respuesta
                                      </span>
                                    </div>
                                    <p className="text-[10px] whitespace-pre-line" style={{ color: textColor, opacity: 0.9 }}>
                                      {review.ownerResponse}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
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

        {/* Modal de Zoom de Imagen */}
        {isZoomedModalOpen && currentImg && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in" onClick={() => setIsZoomedModalOpen(false)}>
            <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
              <button 
                type="button" 
                onClick={() => setIsZoomedModalOpen(false)} 
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
              >
                ✕
              </button>
              <img src={currentImg} alt="Zoom Imagen Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10" />
            </div>
          </div>
        )}

              {/* 🔥 MODAL DE RESPUESTA A RESEÑA */}
        {responseModalReview && (
          <ReviewResponseModal
            isOpen={responseModalOpen}
            onClose={handleCloseResponse}
            onSubmit={handleSubmitResponse}
            review={responseModalReview}
            primary={primary}
            secondary={secondary}
            textColor={textColor}
            isDarkBg={isDarkBg}
          />
        )}


        {/* Modal Zoom Comprobante de Pago */}
        {isProofZoomed && hasPaymentProof && proofUrl && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setIsProofZoomed(false)}>
            <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
              <button 
                type="button" 
                onClick={() => setIsProofZoomed(false)} 
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
              >
                ✕
              </button>
              {isImageFile(orderPaymentProof) ? (
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
              ) : (
                <div className="p-8 rounded-3xl shadow-2xl max-w-lg" style={{ backgroundColor: isDarkBg ? 'rgba(15,23,42,0.95)' : '#ffffff' }}>
                  <div className="text-center space-y-4">
                    <FileText className="w-12 h-12 block mx-auto" style={{ color: textColor }} />
                                        <span className="text-lg font-bold block" style={{ color: textColor }}>Comprobante en PDF</span>
                    <div className="flex gap-3 justify-center">
                      <a 
                        href={proofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                        style={{ backgroundColor: primary }}
                      >
                        Abrir
                      </a>
                      <a 
                        href={proofUrl} 
                        download
                        className="px-5 py-2.5 rounded-xl text-sm font-bold border transition hover:opacity-80"
                        style={{ borderColor: borderDynamic, color: textColor }}
                      >
                        Descargar
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  }