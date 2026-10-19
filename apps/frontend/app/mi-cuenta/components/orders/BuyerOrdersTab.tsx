'use client';

import React, { useState, useMemo, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import BuyerOrderActionsCell from './BuyerOrderActionsCell';
import BuyerOrderDetailModal from './BuyerOrderDetailModal';
import BuyerOrderStatusBadge from './BuyerOrderStatusBadge';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
// ✅ IMPORTAR CONTEXTO DE TASAS
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
// ✅ IMPORTAR imageUtils PARA IMÁGENES
import { getImageUrl } from '@/lib/imageUtils';
import { getPriceColors } from '@/lib/priceTokens';
import { formatUsd } from '@/lib/price-utils';
import { apiFetch } from '@/lib/api';
import { Store } from 'lucide-react';
import { useToast } from '@/components/ui/useToast';
import SearchableDropdown from '@/components/ui/SearchableDropdown';


interface BuyerOrdersTabProps {
  orders: any[];
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantPaymentData?: {
    pagoMovilList?: any[];
    zelle?: any;
    binance?: any;
    paypal?: any;
    activePaymentMethods?: string[];
    specificConfig?: any;
    paymentMethods?: any;
  };
  userProducts?: any[];
  onOrderUpdated?: (order: any) => void;
}

// ============================================================
// 🔥 FUNCIONES UTILITARIAS - FUERA DEL COMPONENTE
// ============================================================

// 🔥 FORMATO DE PRECIOS
const formatPrice = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return '0,00';
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const isServiceOrder = (order: any): boolean => {
  if (!order) return false;
  return order.orderType === 'service' ||
    order.type === 'service' ||
    Boolean(order.serviceDetails) ||
    (Array.isArray(order.items) && order.items.some((item: any) =>
      item?.type === 'service' || item?.itemType === 'service' || item?.serviceId
    ));
};

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
    const unitPrice = totalPriceVES / quantity;

    // 🔥 Info de descuento
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
      subtotal: Math.round(basePriceVES * 100) / 100,
      quantity,
      unitPrice: Math.round(unitPrice * 100) / 100,
      // 🔥 Info extra que va a usar el render
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
  } 
  else if (item.unitPrice !== undefined && item.unitPrice !== null && Number(item.unitPrice) > 0) {
    unitPrice = Number(item.unitPrice);
  } 
  else if (item.price !== undefined && item.price !== null && Number(item.price) > 0) {
    const priceVal = Number(item.price);
    if (priceVal > 1000) {
      unitPrice = priceVal;
    } else {
      unitPrice = priceVal * orderRate;
    }
  } 
  else if (item.precio !== undefined && item.precio !== null && Number(item.precio) > 0) {
    const precioVal = Number(item.precio);
    if (precioVal > 1000) {
      unitPrice = precioVal;
    } else {
      unitPrice = precioVal * orderRate;
    }
  }
  
  if (unitPrice === 0) {
    console.warn('⚠️ No se pudo determinar el precio del item:', item);
  }
  
  const subtotal = unitPrice * quantity;
  
  const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
  const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
  
  let ivaAmount = 0;
  let priceWithIVA = subtotal;
  
  if (ivaType === 'excluded') {
    ivaAmount = subtotal * (ivaRate / 100);
    priceWithIVA = subtotal + ivaAmount;
  } else if (ivaType === 'included') {
    ivaAmount = subtotal - (subtotal / (1 + ivaRate / 100));
    priceWithIVA = subtotal;
  } else {
    ivaAmount = 0;
    priceWithIVA = subtotal;
  }
  
  return {
    ivaType,
    ivaRate,
    ivaAmount: Math.round(ivaAmount * 100) / 100,
    basePrice: Math.round(subtotal * 100) / 100,
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

// 🔥 CALCULAR EL TIPO DE IVA DE UNA ORDEN
const getOrderIvaInfo = (order: any): { display: string; badgeColor: string; badgeBg: string; hasIVA: boolean } => {
  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return { display: 'Sin IVA', badgeColor: '#64748b', badgeBg: 'rgba(100,116,139,0.15)', hasIVA: false };
  }

  let orderRate = 1;
  if (order.rate) {
    orderRate = Number(order.rate);
  } else if (order.exchangeRate) {
    orderRate = Number(order.exchangeRate);
  } else if (order.rateUsd) {
    orderRate = Number(order.rateUsd);
  } else if (order.paymentMetadata?.exchangeRate) {
    orderRate = Number(order.paymentMetadata.exchangeRate);
  } else if (order.totalAmount && order.totalAmountVes) {
    orderRate = Number(order.totalAmountVes) / Number(order.totalAmount);
  }

  let hasIncludedIVA = false;
  let hasExcludedIVA = false;
  let hasExemptItems = false;
  let totalIvaRate = 0;

  for (const item of order.items) {
    const ivaInfo = calculateItemIVA(item, orderRate);
    if (ivaInfo.ivaType === 'included') hasIncludedIVA = true;
    if (ivaInfo.ivaType === 'excluded') hasExcludedIVA = true;
    if (ivaInfo.ivaType === 'exempt') hasExemptItems = true;
    if (ivaInfo.ivaRate > totalIvaRate) totalIvaRate = ivaInfo.ivaRate;
  }

  let display = 'Sin IVA';
  let badgeColor = '#64748b';
  let badgeBg = 'rgba(100,116,139,0.15)';
  let hasIVA = false;

  if (hasIncludedIVA && hasExcludedIVA) {
    display = `IVA ${totalIvaRate}% Mixto`;
    badgeColor = '#8b5cf6';
    badgeBg = 'rgba(139,92,246,0.15)';
    hasIVA = true;
  } else if (hasIncludedIVA) {
    display = `IVA ${totalIvaRate}% Inc.`;
    badgeColor = '#22c55e';
    badgeBg = 'rgba(34,197,94,0.15)';
    hasIVA = true;
  } else if (hasExcludedIVA) {
    display = `IVA ${totalIvaRate}% +`;
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(251,191,36,0.15)';
    hasIVA = true;
  } else if (hasExemptItems && !hasIncludedIVA && !hasExcludedIVA) {
    display = 'Exento';
    badgeColor = '#64748b';
    badgeBg = 'rgba(100,116,139,0.15)';
  }

  return { display, badgeColor, badgeBg, hasIVA };
};

// 🔥 OBTENER TOTAL VES - CON TASA DINÁMICA (NUNCA 784.66)
const getOrderTotalVes = (order: any, globalRate: number = 0): number => {
  // 🔥 PRIORIDAD 1: usar totalAmountVes del backend (YA incluye envío)
  if (order.totalAmountVes !== undefined && order.totalAmountVes !== null && Number(order.totalAmountVes) > 0) {
    return Math.round(Number(order.totalAmountVes) * 100) / 100;
  }

  // 🔥 PRIORIDAD 2: sumar items del snapshot + envío
  // ⚠️ totalPriceVES es UNITARIO (no incluye cantidad). Multiplicar por quantity.
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    let hasSnapshot = false;
    let itemsTotalVes = 0;
    
    for (const item of order.items) {
      if (item.totalPriceVES !== undefined && Number(item.totalPriceVES) > 0) {
        hasSnapshot = true;
        itemsTotalVes += Number(item.totalPriceVES) * Number(item.quantity || 1);
      }
    }
    
    if (hasSnapshot && itemsTotalVes > 0) {
      // 🔥 Sumar el envío
      const delivery = order.paymentMetadata?.delivery;
      const shippingVes = delivery?.selected
        ? Number(delivery.costVes || 0)
        : Number(order.shippingCost || 0);
      
      return Math.round((itemsTotalVes + shippingVes) * 100) / 100;
    }
  }
  // 🔴 PRIORIDAD 2: usar totalAmountVes guardado (compatibilidad)
  if (order.totalAmountVes) {
    return Number(order.totalAmountVes);
  }
  if (order.totalVes) {
    return Number(order.totalVes);
  }

  // 🔴 PRIORIDAD 3: recalcular con tasa (flujo viejo)
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    let orderRate = 1;
    if (order.rate) {
      orderRate = Number(order.rate);
    } else if (order.exchangeRate) {
      orderRate = Number(order.exchangeRate);
    } else if (order.rateUsd) {
      orderRate = Number(order.rateUsd);
    } else if (order.paymentMetadata?.exchangeRate) {
      orderRate = Number(order.paymentMetadata.exchangeRate);
    } else if (order.totalAmount && order.totalAmountVes) {
      orderRate = Number(order.totalAmountVes) / Number(order.totalAmount);
    } else if (globalRate > 0) {
      orderRate = globalRate;
    }

    let totalVes = 0;
    for (const item of order.items) {
      const ivaInfo = calculateItemIVA(item, orderRate);
      totalVes += ivaInfo.priceWithIVA;
    }
    return Math.round(totalVes * 100) / 100;
  }

  return 0;
};

// 🔥 FORMATO DE MONEDA CON IVA Y TASA DINÁMICA
const formatOrderCurrency = (order: any, globalRate: number = 0) => {
  const totalVes = getOrderTotalVes(order, globalRate);
  const totalUsd = Number(order.totalAmount || 0);
  const ivaInfo = getOrderIvaInfo(order);
  return {
    bs: formatPrice(totalVes),
usd: formatUsd(totalUsd),
    ivaDisplay: ivaInfo.display,
    ivaBadgeColor: ivaInfo.badgeColor,
    ivaBadgeBg: ivaInfo.badgeBg,
    hasIVA: ivaInfo.hasIVA,
  };
};

// 🔥 OBTENER IMAGEN USANDO imageUtils
const getItemImage = (item: any): string | null => {
  if (!item) return null;
  return getImageUrl(item);
};

// 🔥 OBTENER IMAGEN DE LA ORDEN USANDO imageUtils
const getOrderImage = (order: any, userProducts: any[]): string | null => {
  if (!order) return null;
  const firstItem = order.items?.[0];
  if (!firstItem) return null;

  // Intentar obtener imagen del producto en userProducts
  if (firstItem.productId && userProducts && userProducts.length > 0) {
    const foundProduct = userProducts.find((p: any) => p.id === firstItem.productId || p._id === firstItem.productId);
    if (foundProduct) {
      const img = getImageUrl(foundProduct);
      if (img) return img;
    }
  }

  // Fallback: usar getImageUrl directamente en el item
  return getImageUrl(firstItem);
};

// 🔥 OBTENER NOMBRE DE LA TIENDA
const getStoreName = (order: any): string => {
  if (order.tenantName) return order.tenantName;
  if (order.tenant?.name) return order.tenant.name;
  if (order.store?.name) return order.store.name;
  if (order.shop?.name) return order.shop.name;
  if (order.business?.name) return order.business.name;
  if (order.storeName) return order.storeName;
  if (order.shopName) return order.shopName;
  if (order.businessName) return order.businessName;
  
  if (order.tenantId) return `Tienda #${order.tenantId.slice(0, 6)}`;
  if (order.tenant?.id) return `Tienda #${order.tenant.id.slice(0, 6)}`;
  if (order.store?.id) return `Tienda #${order.store.id.slice(0, 6)}`;
  
  return 'Tienda';
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// 🔥 SVG Candado
const LockIcon = () => (
  <svg className="w-3 h-3 inline-block opacity-40 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// ============================================================
// 🔥 COMPONENTE PRINCIPAL CON MEMO
// ============================================================
const BuyerOrdersTab = memo(({
  orders = [],
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantPaymentData,
  userProducts = [],
  onOrderUpdated,
}: BuyerOrdersTabProps) => {
  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL - NUNCA USAR 784.66
  const { rates, loading: ratesLoading } = useExchangeRateContext();
  const globalRate = rates.USD > 0 ? rates.USD : 0;

  const { showToast } = useToast();
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<'date' | 'total' | 'id'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: true,
    image: true,
    store: true,
    items: true,
    total: true,
    payment: false,
    status: true,
    date: true,
    actions: true,
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    id: 90,
    image: 65,
    store: 150,
    items: 200,
    total: 100,
    payment: 120,
    status: 100,
    date: 100,
    actions: 80
  });

  const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);
  const { registerComponent, unregisterComponent } = useAppRefreshContext();

  // ✅ Memoizar estilos
  const subtleBorderColor = useMemo(() => 
    isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    [isDarkBg]
  );

  const cardBg = useMemo(() =>
    secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    [secondary, isDarkBg]
  );

  const priceColors = useMemo(
    () => getPriceColors({ primary, isDarkBg }),
    [primary, isDarkBg],
  
  );

  // ✅ Memoizar órdenes de productos (excluyendo kiosco y servicios)
  const productOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return [];
    }
    return orders.filter((order: any) => {
      if (order.source === 'kiosk') {
        return false;
      }

      return !isServiceOrder(order);
    });
  }, [orders]);

  // ✅ Actualizar localOrders cuando cambian las órdenes
  React.useEffect(() => {
    setLocalOrders(productOrders);
  }, [productOrders]);

  // ✅ Registrar componente para refresco
  React.useEffect(() => {
    const componentId = 'buyer-orders-tab';
    
    const refreshOrders = async () => {
      console.log('🔄 [BuyerOrdersTab] Refrescando compras...');
      try {
        const response = await apiFetch('/account/orders');
        if (response.ok) {
          const data = await response.json();
          setLocalOrders(data.filter((order: any) => {
            if (order.source === 'kiosk') return false;

            return !isServiceOrder(order);
          }));
          if (onOrderUpdated) {
            onOrderUpdated(data);
          }
          console.log(`✅ [BuyerOrdersTab] Compras actualizadas: ${data.length}`);
        }
      } catch (error) {
        console.error('❌ [BuyerOrdersTab] Error refrescando:', error);
      }
    };

    registerComponent(componentId, refreshOrders);
    
    return () => {
      unregisterComponent(componentId);
    };
  }, [registerComponent, unregisterComponent, onOrderUpdated]);

  // ✅ Escuchar eventos globales
  React.useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log('🔔 [BuyerOrdersTab] Evento globalRefresh recibido');
    };

    window.addEventListener('globalRefresh', handleGlobalRefresh);
    window.addEventListener('notificationUpdate', handleGlobalRefresh);

    return () => {
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
      window.removeEventListener('notificationUpdate', handleGlobalRefresh);
    };
  }, []);

  // ============================================================
  // 🔥 HANDLERS CON useCallback
  // ============================================================

  const handleCancelOrder = useCallback(async (orderId: string) => {
    setIsCancelling(true);
    try {
      const response = await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();

        setLocalOrders(prevOrders =>
          prevOrders.map(o =>
            o.id === orderId ? { ...o, status: 'CANCELLED' } : o
          )
        );

        if (onOrderUpdated) {
          onOrderUpdated({ ...selectedOrder, status: 'CANCELLED' });
        }

        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'CANCELLED' });
        }

        console.log('✅ Orden cancelada correctamente');
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globalRefresh'));
          window.dispatchEvent(new Event('notificationUpdate'));
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Error:', errorData.message);
      }
    } catch (error) {
      console.error('Error cancelando orden:', error);
    } finally {
      setIsCancelling(false);
    }
  }, [selectedOrder, onOrderUpdated]);

  const handleReportPayment = useCallback(async (orderId: string, paymentData: any) => {
    try {
      let paymentProofBase64 = null;
      if (paymentData.paymentProof) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(paymentData.paymentProof);
          });
          paymentProofBase64 = await base64Promise;
          console.log('✅ Comprobante convertido a base64');
        } catch (err) {
          console.warn('⚠️ Error al convertir comprobante a base64:', err);
        }
      }

      const payload: any = {
        status: 'por_verificar',
        bankSource: paymentData.bankSource,
        paymentReference: paymentData.paymentReference,
        tenantId: localOrders.find(o => o.id === orderId)?.tenantId || '',
      };

      if (paymentProofBase64) {
        payload.paymentProof = paymentProofBase64;
        payload.paymentMetadata = {
          bankSource: paymentData.bankSource,
          paymentReference: paymentData.paymentReference,
          paymentProof: paymentProofBase64,
        };
      }

      console.log('📤 Enviando payload con comprobante:', { 
        ...payload, 
        paymentProof: paymentProofBase64 ? '✅ (base64)' : '❌ (sin comprobante)'
      });

      const response = await apiFetch(`/orders/${orderId}/payment`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        console.log('✅ Pago reportado correctamente');
        
        setLocalOrders(prev => 
          prev.map(o => o.id === orderId ? { ...o, status: 'por_verificar', ...updatedOrder } : o)
        );
        
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: 'por_verificar', ...updatedOrder });
        }
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globalRefresh'));
          window.dispatchEvent(new Event('notificationUpdate'));
        }
      } else {
        const error = await response.json();
        console.error('❌ Error al reportar pago:', error);
        showToast({
          variant: 'error',
          message: 'Error al reportar el pago: ' + (error.message || 'Intenta de nuevo'),
        });
      }
    } catch (error) {
      console.error('❌ Error al reportar pago:', error);
      showToast({
        variant: 'error',
        message: 'Error de conexión al reportar el pago',
      });
    }
  }, [localOrders, selectedOrder, showToast]);
  const handleRowClick = useCallback((order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }, []);

  const handleViewDetails = useCallback((order: any) => {
    const updatedOrder = localOrders.find(o => o.id === order.id) || order;
    setSelectedOrder(updatedOrder);
    setIsModalOpen(true);
  }, [localOrders]);

  const handleSort = useCallback((field: 'date' | 'total' | 'id') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const handleMouseDown = useCallback((colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || 120
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(80, resizingRef.current.startWidth + delta);
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current!.colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // ✅ Memoizar órdenes filtradas
  const filteredOrders = useMemo(() => {
    if (!localOrders || !Array.isArray(localOrders) || localOrders.length === 0) {
      return [];
    }
    return localOrders.filter(o => {
      const matchesSearch =
        (o.id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
         o.paymentMethodUsed?.toLowerCase().includes(searchFilter.toLowerCase()) ||
         o.paymentReference?.toLowerCase().includes(searchFilter.toLowerCase()) ||
         (Array.isArray(o.items) && o.items.some((item: any) =>
           (item.name || item.productName || item.title || '').toLowerCase().includes(searchFilter.toLowerCase())
         )));

      const orderStatus = (o.status || 'pendiente').toLowerCase();
      let matchesStatus = true;

      if (statusFilter === 'pending') {
        matchesStatus = orderStatus.includes('pend') || orderStatus.includes('por_verificar');
      } else if (statusFilter === 'completed') {
        matchesStatus = orderStatus.includes('complet') || orderStatus.includes('pagado') || orderStatus.includes('aprobado');
      } else if (statusFilter === 'cancelled') {
        matchesStatus = orderStatus.includes('canc') || orderStatus.includes('rechaz');
      }

      return matchesSearch && matchesStatus;
    });
  }, [localOrders, searchFilter, statusFilter]);

  // ✅ Memoizar órdenes ordenadas
  const sortedOrders = useMemo(() => {
    if (!filteredOrders || !Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return [];
    }
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'date') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (sortField === 'total') {
        valA = getOrderTotalVes(a, globalRate);
        valB = getOrderTotalVes(b, globalRate);
      } else if (sortField === 'id') {
        valA = a.id || '';
        valB = b.id || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortField, sortDirection, globalRate]);

  const totalPages = useMemo(() => 
    Math.ceil((sortedOrders || []).length / itemsPerPage) || 1,
    [sortedOrders, itemsPerPage]
  );

  // ✅ Memoizar órdenes paginadas
  const paginatedOrders = useMemo(() => {
    if (!sortedOrders || !Array.isArray(sortedOrders) || sortedOrders.length === 0) {
      return [];
    }
    const start = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(start, start + itemsPerPage);
  }, [sortedOrders, currentPage, itemsPerPage]);

  // ✅ Memoizar el selector de columnas
  const columnSelector = useMemo(() => {
    if (!showColumnSelector) return null;

    const labels: Record<string, string> = {
      id: 'ID Pedido',
      image: 'Imagen',
      store: 'Tienda',
      items: 'Artículos',
      total: 'Total',
      payment: 'Método de Pago',
      status: 'Estado',
      date: 'Fecha',
      actions: 'Acciones',
    };

    return (
      <div 
        className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-2xl py-2 z-50 backdrop-blur-lg"
        style={{
          backgroundColor: isDarkBg ? '#1e293b' : '#ffffff',
          borderColor: subtleBorderColor,
        }}
      >
        <div className="px-3 py-1 border-b text-[9px] font-bold uppercase tracking-wider opacity-50" style={{ borderColor: subtleBorderColor, color: textColor }}>
          Mostrar columnas
        </div>
        {Object.keys(visibleColumns).map((key) => (
          <label
            key={key}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-xs transition"
            style={{ color: textColor }}
          >
            <input
              type="checkbox"
              checked={visibleColumns[key]}
              onChange={() => setVisibleColumns(prev => ({
                ...prev,
                [key]: !prev[key]
              }))}
              className="w-3.5 h-3.5 rounded cursor-pointer"
              style={{ accentColor: primary }}
            />
            <span className="truncate">{labels[key] || key}</span>
          </label>
        ))}
        <div className="px-3 pt-1.5 mt-1 border-t flex gap-2" style={{ borderColor: subtleBorderColor }}>
          <button
            type="button"
            onClick={() => {
              const allTrue = Object.keys(visibleColumns).reduce((acc, k) => ({ ...acc, [k]: true }), {});
              setVisibleColumns(allTrue);
            }}
            className="text-[9px] font-bold px-2 py-0.5 rounded hover:bg-white/10 transition"
            style={{ color: primary }}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => {
              const allFalse = Object.keys(visibleColumns).reduce((acc, k) => ({ ...acc, [k]: false }), {});
              setVisibleColumns(allFalse);
            }}
            className="text-[9px] font-bold px-2 py-0.5 rounded hover:bg-white/10 transition opacity-50"
            style={{ color: textColor }}
          >
            Ninguna
          </button>
        </div>
      </div>
    );
  }, [showColumnSelector, isDarkBg, subtleBorderColor, textColor, primary, visibleColumns]);

  // ✅ Si no hay órdenes, mostrar mensaje
  if (!localOrders || localOrders.length === 0) {
    return (
      <div 
        className="p-8 rounded-3xl border shadow-xl text-center"
        style={{ 
          backgroundColor: cardBg,
          borderColor: subtleBorderColor,
          color: textColor
        }}
      >
        <div className="flex flex-col items-center gap-3 py-12">
          <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm font-medium opacity-70">No hay órdenes registradas</p>
          <p className="text-xs opacity-40">Tus compras aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full"
            style={{
        backgroundColor: cardBg,
        borderColor: subtleBorderColor,
        color: textColor
      }}
    >
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkBg ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 9999px;
          margin: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')};
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${primary || (isDarkBg ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)')};
        }
        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }
        .resizer:hover, .resizer:active {
          background-color: ${primary};
          opacity: 0.6;
        }
        .order-row {
          cursor: pointer;
        }
        .order-row:hover {
          background-color: ${isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
        }
        .order-row td:last-child {
          cursor: default;
        }
      `}</style>

      {/* TÍTULO Y SEPARADOR VISUAL */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
        <div>
          <h3 className="font-extrabold text-base tracking-tight" style={{ color: textColor }}>
            Mis Pedidos y Compras
          </h3>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            Consulta el historial, detalles y estados de todas tus compras de productos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="px-3 py-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-80"
              style={{
                borderColor: subtleBorderColor,
                color: textColor,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Columnas
              <span className={`text-[8px] transition-transform ${showColumnSelector ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {columnSelector}
          </div>

          <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl self-start sm:self-auto" style={{ borderColor: subtleBorderColor, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)' }}>
            <span className="text-[11px] opacity-70">Total pedidos:</span>
            <span className="text-[11px] font-bold" style={{ color: primary }}>{localOrders.length}</span>
          </div>
        </div>
      </div>

      {/* BLOQUE DE LA TABLA */}
      <div className="border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: subtleBorderColor }}>

        {/* Barra Superior con Filtros de Estado y Buscador */}
        <div className="p-4 sm:p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'pending', label: 'Pendientes / Verificando' },
              { id: 'completed', label: 'Completadas' },
              { id: 'cancelled', label: 'Canceladas / Rechazadas' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm ${
                  statusFilter === tab.id
                    ? 'text-white shadow-md'
                    : 'bg-white/5 opacity-75 hover:opacity-100 hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: statusFilter === tab.id ? primary : undefined
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por ID, producto, pago..."
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none w-full transition"
              style={{ borderColor: subtleBorderColor, color: textColor }}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b text-[9px] font-bold uppercase tracking-wider opacity-75 select-none"
                style={{
                  borderColor: subtleBorderColor,
                  backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)'
                }}
              >
                {visibleColumns.id && (
                  <th className="py-3 px-4 pl-5 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.id }} onClick={() => handleSort('id')}>
                    <div className="truncate">ID Pedido {sortField === 'id' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('id', e)} />
                  </th>
                )}
                {visibleColumns.image && (
                  <th className="py-3 px-4 relative" style={{ width: columnWidths.image }}>
                    <div className="truncate text-center">Imagen</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('image', e)} />
                  </th>
                )}
                {visibleColumns.store && (
                  <th className="py-3 px-4 relative" style={{ width: columnWidths.store }}>
                    <div className="truncate">Tienda</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('store', e)} />
                  </th>
                )}
                {visibleColumns.items && (
                  <th className="py-3 px-4 relative" style={{ width: columnWidths.items }}>
                    <div className="truncate">Artículos / Detalle</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('items', e)} />
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.total }} onClick={() => handleSort('total')}>
                    <div className="truncate">Total {sortField === 'total' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('total', e)} />
                  </th>
                )}
                {visibleColumns.payment && (
                  <th className="py-3 px-4 relative" style={{ width: columnWidths.payment }}>
                    <div className="truncate">Método de Pago</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('payment', e)} />
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="py-3 px-4 relative" style={{ width: columnWidths.status }}>
                    <div className="truncate">Estado</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('status', e)} />
                  </th>
                )}
                {visibleColumns.date && (
                  <th className="py-3 px-4 relative cursor-pointer hover:opacity-100 transition" style={{ width: columnWidths.date }} onClick={() => handleSort('date')}>
                    <div className="truncate">Fecha {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('date', e)} />
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="py-3 px-4 pr-5 relative" style={{ width: columnWidths.actions }}>
                    <div className="truncate text-center">Acciones</div>
                    <div className="resizer" onMouseDown={(e) => handleMouseDown('actions', e)} />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs" style={{ borderColor: subtleBorderColor }}>
              {paginatedOrders && paginatedOrders.length > 0 ? (
                paginatedOrders.map((o: any, idx: number) => {
                  const orderStatus = (o.status || 'pendiente').toLowerCase();
                  // ✅ PASAR globalRate A formatOrderCurrency
                  const orderCurrency = formatOrderCurrency(o, globalRate);
                  const storeName = getStoreName(o);

                  const orderItemsList = Array.isArray(o.items) ? o.items : [];
                  const isExpanded = expandedOrderId === (o.id || idx);
                  const isOrderLocked = orderStatus.includes('complet') || orderStatus.includes('canc') || orderStatus.includes('rechaz');

                  const itemImage = getOrderImage(o, userProducts);

                  return (
                    <tr 
                      key={o.id || idx} 
                      className="order-row group" 
                      style={{ borderBottom: `1px solid ${subtleBorderColor}` }}
                      onClick={(e) => {
                        // 🔥 Guard: si el click viene de un botón, link o input, ignorar.
                        // Así evitamos que el botón "Ver detalles" del actions cell
                        // dispare DOS aperturas del modal (una por el cell y otra por la fila).
                        const target = e.target as HTMLElement;
                        if (target.closest('button, a, input, select, [role="button"]')) {
                          return;
                        }
                        handleRowClick(o);
                      }}
                    >
                      {visibleColumns.id && (
                        <td className="py-3 px-4 pl-5 font-mono font-bold opacity-90 align-middle truncate" style={{ width: columnWidths.id }}>
                          #{o.id ? o.id.slice(0, 8) : idx + 1}
                        </td>
                      )}
                      {visibleColumns.image && (
                        <td className="py-3 px-4 align-middle text-center" style={{ width: columnWidths.image }}>
                          <div className="w-10 h-10 rounded-xl bg-black/40 border overflow-hidden flex items-center justify-center mx-auto shrink-0" style={{ borderColor: subtleBorderColor }}>
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt="Producto"
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = e.target.parentElement;
                                  if (parent) {
                                    const fallback = document.createElement('span');
                                    fallback.className = 'text-[9px] opacity-40';
                                    fallback.textContent = 'Sin foto';
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-[9px] opacity-40">Sin foto</span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.store && (
                        <td 
                          className="py-3 px-4 align-middle" 
                          style={{ width: columnWidths.store }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const tenantSlug = 
                              o.tenantSlug || 
                              o.tenant?.slug || 
                              o.storeSlug || 
                              o.store?.slug || 
                              '';
                            
                            if (!tenantSlug) {
                              return (
                                <div className="flex items-center gap-1.5 opacity-60">
                                  <Store className="w-3.5 h-3.5 shrink-0" />
                                  <span className="font-medium truncate text-xs" style={{ color: textColor }}>
                                    {storeName}
                                  </span>
                                </div>
                              );
                            }
                            
                            return (
                              <Link
                                href={`/tienda/${tenantSlug}`}
                                className="flex items-center gap-1.5 transition group"
                                title={`Ir a la tienda ${storeName}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Store 
                                  className="w-3.5 h-3.5 shrink-0 transition-opacity group-hover:opacity-100" 
                                  style={{ color: primary, opacity: 0.7 }} 
                                />
                                <span 
                                  className="font-medium truncate text-xs underline-offset-2 group-hover:underline transition-all"
                                  style={{ color: primary }}
                                >
                                  {storeName}
                                </span>
                              </Link>
                            );
                          })()}
                        </td>
                      )}
                      {visibleColumns.items && (
                        <td className="py-3 px-4 align-middle" style={{ width: columnWidths.items }}>
                          {orderItemsList.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 border px-2.5 py-1.5 rounded-xl text-[11px]" style={{ borderColor: subtleBorderColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                                <span className="truncate">
                                  <strong className="font-bold mr-1.5" style={{ color: primary }}>{orderItemsList[0].quantity || orderItemsList[0].qty || 1}x</strong>
                                  {orderItemsList[0].name || orderItemsList[0].productName || orderItemsList[0].title || 'Artículo'}
                                </span>
                                {orderItemsList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedOrderId(isExpanded ? null : (o.id || idx));
                                    }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer whitespace-nowrap"
                                    style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: primary }}
                                  >
                                    {isExpanded ? 'Ocultar' : `+${orderItemsList.length - 1} más`}
                                  </button>
                                )}
                              </div>

                              {isExpanded && orderItemsList.length > 1 && (
                                <div className="space-y-1 pt-1 pl-1 border-l-2" style={{ borderColor: primary }}>
                                  {orderItemsList.slice(1).map((item: any, itemIdx: number) => (
                                    <div key={itemIdx} className="text-[10px] opacity-80 flex items-center justify-between gap-2 px-2 py-0.5 rounded bg-black/10">
                                      <span className="truncate">
                                        <strong className="font-bold mr-1" style={{ color: primary }}>{item.quantity || item.qty || 1}x</strong>
                                        {item.name || item.productName || item.title || 'Artículo'}
                                      </span>
                                      {item.price && (
<span className="opacity-50 whitespace-nowrap">(${formatUsd(Number(item.price))})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] opacity-40 italic">Orden directa</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="py-3 px-4 align-middle" style={{ width: columnWidths.total }}>
                          {/* ✅ Bs. - color primary (heredado del tema) */}
                          <div className="font-extrabold" style={{ color: primary }}>
                            Bs. {orderCurrency.bs}
                          </div>
                          {/* ✅ $ - verde adaptativo según tema */}
                          <div className="text-[10px] font-semibold" style={{ color: priceColors.foreign }}>
                                                        (${orderCurrency.usd})
                          </div>
                          {orderCurrency.hasIVA ? (
                            <span 
                              className="mt-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border inline-block"
                              style={{
                                backgroundColor: orderCurrency.ivaBadgeBg,
                                borderColor: `${orderCurrency.ivaBadgeColor}30`,
                                color: orderCurrency.ivaBadgeColor
                              }}
                            >
                              {orderCurrency.ivaDisplay}
                            </span>
                          ) : (
                            <span 
                              className="mt-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border inline-block opacity-50"
                              style={{
                                backgroundColor: 'rgba(100,116,139,0.1)',
                                borderColor: 'rgba(100,116,139,0.2)',
                                color: '#64748b'
                              }}
                            >
                              Sin IVA
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.payment && (
                        <td className="py-3 px-4 align-middle" style={{ width: columnWidths.payment }}>
                          {/* 🔥 SI HAY PAGO MIXTO: mostrar desglose compacto */}
                          {o.paymentBreakdown && Array.isArray(o.paymentBreakdown.methods) && o.paymentBreakdown.methods.length > 1 ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 flex-wrap">
                                {o.paymentBreakdown.methods.map((entry: any, mIdx: number) => {
                                  const methodLabel = (() => {
                                    const type = String(entry.methodType || '').toLowerCase();
                                    if (type.includes('pago_movil') || type.includes('pagomovil')) return 'Pago Móvil';
                                    if (type.includes('cash')) return 'Efectivo';
                                    if (type.includes('pos')) return 'POS';
                                    if (type.includes('biopago')) return 'Biopago';
                                    if (type.includes('zelle')) return 'Zelle';
                                    if (type.includes('paypal')) return 'PayPal';
                                    if (type.includes('binance')) return 'Binance';
                                    if (type.includes('crypto')) return 'Wallet';
                                    return type || 'Otro';
                                  })();
                                  return (
                                    <span
                                      key={mIdx}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        color: textColor,
                                      }}
                                    >
                                      {methodLabel}
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="text-[9px] opacity-60" style={{ color: textColor }}>
                                {o.paymentBreakdown.methods.length} métodos
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-[11px] truncate capitalize" style={{ color: textColor }}>
                                {(() => {
                                  const method = o.paymentMethodUsed || 'No especificado';
                                  const lowerMethod = method.toLowerCase();
                                  if (lowerMethod.includes('pagomovil') || lowerMethod === 'pago_movil' || lowerMethod === 'pagomovil') {
                                    return 'Pago Móvil';
                                  }
                                  if (lowerMethod.includes('efectivo') || lowerMethod === 'cash') {
                                    return 'Efectivo en Caja';
                                  }
                                  if (lowerMethod.includes('pos')) {
                                    return 'Punto de Venta';
                                  }
                                  if (lowerMethod.includes('biopago')) {
                                    return 'Biopago';
                                  }
                                  if (lowerMethod.includes('zelle')) {
                                    return 'Zelle';
                                  }
                                  if (lowerMethod.includes('paypal')) {
                                    return 'PayPal';
                                  }
                                  if (lowerMethod.includes('binance')) {
                                    return 'Binance';
                                  }
                                  return method;
                                })()}
                              </div>
                              {o.paymentReference && (
                                <div className="text-[10px] opacity-60 font-mono truncate">
                                  Ref: {o.paymentReference}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="py-3 px-4 align-middle" style={{ width: columnWidths.status }}>
                          <BuyerOrderStatusBadge status={o.status} isDarkBg={isDarkBg} />
                          {isOrderLocked && <LockIcon />}
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="py-3 px-4 pr-5 opacity-70 align-middle text-[11px]" style={{ width: columnWidths.date }}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Fecha reciente'}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="py-3 px-4 pr-5 align-middle" onClick={(e) => e.stopPropagation()}>
                          <BuyerOrderActionsCell
                            order={o}
                            onViewDetails={handleViewDetails}
                            onCancelOrder={handleCancelOrder}
                            isCancelling={isCancelling}
                            primary={primary}
                            secondary={secondary}
                            isDarkBg={isDarkBg}
                            textColor={textColor}
                            subtleBorderColor={subtleBorderColor}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center opacity-60 font-medium">
                    No se encontraron pedidos de productos en esta sección.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador Inferior */}
        <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs select-none" style={{ borderColor: subtleBorderColor }}>
          <div className="opacity-75 text-[11px]">
            <span>
              Mostrando <strong className="font-semibold">{filteredOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> a <strong className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</strong> de <strong className="font-semibold">{filteredOrders.length}</strong> registros
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="opacity-70">Ver:</span>
              <div className="w-[80px]">
                <SearchableDropdown
                  value={String(itemsPerPage)}
                  onChange={(val) => {
                    setItemsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '20', label: '20' },
                    { value: '50', label: '50' },
                  ]}
                  placeholder={String(itemsPerPage)}
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={subtleBorderColor}
                  searchable={false}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: subtleBorderColor }}
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-[11px] font-semibold opacity-95">
                Página {currentPage} de {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: subtleBorderColor }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE DETALLES */}
      <BuyerOrderDetailModal
        key={selectedOrder?.id || 'no-order'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
        onCancelOrder={handleCancelOrder}
        isCancelling={isCancelling}
        tenantPaymentData={tenantPaymentData}
        userProducts={userProducts}
        onReportPayment={handleReportPayment}
      />
    </div>
  );
});

BuyerOrdersTab.displayName = 'BuyerOrdersTab';

export default BuyerOrdersTab;