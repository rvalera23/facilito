  'use client';

  import React, { useState, useMemo, useRef, useCallback, memo } from 'react';
  import OrderActionsCell from './components/OrderActionsCell';
  import OrderDetailModal from './components/OrderDetailModal';
  import OrderStatusBadge from './components/OrderStatusBadge';
  import { useOrderActions } from './components/hooks/useOrderActions';
import { getOrderVesTotal } from './components/hooks/orderUtils';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { getPriceColors } from '@/lib/priceTokens';
import { formatUsd } from '@/lib/price-utils';
import { getFirstImage } from '@/lib/imageUtils';
import { toAbsoluteApiUrl } from '@/lib/apiUrl';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

  import { Truck, MonitorSmartphone, User } from 'lucide-react';

  interface OrdersTabProps {
    orders: any[];
    tenant?: any;
    primary: string;
    secondary?: string;
    textColor: string;
    isDarkBg: boolean;
    onUpdateOrder?: (updatedOrder: any) => void;
  }

  // ============================================================
  // 🔥 FUNCIONES UTILITARIAS - FUERA DEL COMPONENTE
  // ============================================================

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const DELIVERY_COMPANIES: Record<string, { name: string; color: string }> = {
    mrw: { name: 'MRW', color: '#e11d48' },
    domesa: { name: 'Domesa', color: '#0ea5e9' },
    tealca: { name: 'Tealca', color: '#8b5cf6' },
    zoom: { name: 'Zoom', color: '#f59e0b' },
  };

  // 🔥 FORMATO DE PRECIOS
  const formatPrice = (num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value) || value === 0) return '0,00';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const roundPrice = (value: number): number => Math.round(value * 100) / 100;

  // 🔥 FUNCIÓN PARA CALCULAR IVA DE UN ITEM - CORREGIDA
  const calculateItemIVA = (item: any, orderRate: number) => {
    let unitPrice = 0;
    
    // 1. Buscar precio en VES
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
    
    // 2. Si no hay precio en VES, intentar usar USD
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
    
    const quantity = Number(item?.quantity || item?.qty || 1);
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
      // 🔥 EL PRECIO YA INCLUYE IVA - extraer el IVA del precio
      ivaAmount = subtotal - (subtotal / (1 + ivaRate / 100));
      priceWithIVA = subtotal;
      basePrice = subtotal - ivaAmount; // 🔥 PRECIO SIN IVA
    } else {
      // EXENTO
      ivaAmount = 0;
      priceWithIVA = subtotal;
      basePrice = subtotal;
    }
    
    return {
      ivaType,
      ivaRate,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      basePrice: Math.round(basePrice * 100) / 100, // 🔥 PRECIO SIN IVA
      priceWithIVA: Math.round(priceWithIVA * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      quantity,
      unitPrice: Math.round(unitPrice * 100) / 100,
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

  // 🔥 OBTENER IVA DE ORDEN
  const getOrderIvaInfo = (order: any): { display: string; badgeColor: string; badgeBg: string; hasIVA: boolean } => {
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return { display: 'Sin IVA', badgeColor: '#64748b', badgeBg: 'rgba(100,116,139,0.15)', hasIVA: false };
    }

    let orderRate = 1;
    if (order.rate) orderRate = Number(order.rate);
    else if (order.exchangeRate) orderRate = Number(order.exchangeRate);
    else if (order.rateUsd) orderRate = Number(order.rateUsd);
    else if (order.paymentMetadata?.exchangeRate) orderRate = Number(order.paymentMetadata.exchangeRate);
    else if (order.totalAmount && order.totalAmountVes) orderRate = Number(order.totalAmountVes) / Number(order.totalAmount);

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



  // 🔥 OBTENER TOTAL USD - SIN HARDCODEOS (CON PARÁMETRO globalRate)
  const getOrderTotalUsd = (order: any, globalRate: number = 0): number => {
    if (order.totalAmount) return Number(order.totalAmount);
    if (order.totalUsd) return Number(order.totalUsd);
    
    // 🔥 TASA DINÁMICA PARA CONVERSIÓN
    let orderRate = 1;
    if (order.rate) orderRate = Number(order.rate);
    else if (order.exchangeRate) orderRate = Number(order.exchangeRate);
    else if (order.rateUsd) orderRate = Number(order.rateUsd);
    else if (order.paymentMetadata?.exchangeRate) orderRate = Number(order.paymentMetadata.exchangeRate);
    // 🔥 USAR TASA GLOBAL COMO FALLBACK (recibida como parámetro)
    else if (globalRate > 0) orderRate = globalRate;
    
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      let totalUsd = 0;
      for (const item of order.items) {
        // Buscar precio en USD
        let priceUsd = Number(item.priceUsd || item.prices?.USD || item.attributes?.prices?.USD || 0);
        // Si no hay USD, convertir desde VES
        if (priceUsd === 0) {
          const priceVes = Number(item.priceVes || item.price || item.precio || 0);
          if (priceVes > 0 && orderRate > 0) {
            priceUsd = priceVes / orderRate;
          }
        }
        const quantity = Number(item.quantity || 1);
        totalUsd += priceUsd * quantity;
      }
      return roundPrice(totalUsd);
    }
    return 0;
  };

  // 🔥 OBTENER NOMBRE DE CLIENTE
  const getClientName = (order: any): string => {
    if (order.customer?.name) return order.customer.name;
    if (order.client?.name) return order.client.name;
    if (order.user?.name) return order.user.name;
    if (order.customerName) return order.customerName;
    if (order.clientName) return order.clientName;
    if (order.userName) return order.userName;
    if (order.customer?.email) return order.customer.email;
    if (order.client?.email) return order.client.email;
    if (order.user?.email) return order.user.email;
    if (order.email) return order.email;
    return 'Cliente';
  };

  // 🔥 OBTENER IMAGEN DE ORDEN
  // Usa la utilidad central (getFirstImage + toAbsoluteApiUrl) que:
  //   - Recorre TODOS los campos de imagen
  //   - Colapsa /api/api/ → /api/ (evita doble prefijo)
  //   - Maneja URLs absolutas, relativas, blobs y data URLs
  const getOrderItemImage = (order: any) => {
    if (!order) return null;

    const firstItem = order.items?.[0];
    if (!firstItem) return null;

    // 1. Prioridad: mediaUrls[0] (viene limpio de la BD)
    const rawFromMediaUrls =
      Array.isArray(firstItem.mediaUrls) &&
      typeof firstItem.mediaUrls[0] === 'string'
        ? firstItem.mediaUrls[0]
        : null;

    if (rawFromMediaUrls) {
      return toAbsoluteApiUrl(rawFromMediaUrls);
    }

    // 2. Fallback: getFirstImage (recorre coverImage, image, images, attributes, metadata…)
    const fromFirstImage = getFirstImage(firstItem);
    if (fromFirstImage) return fromFirstImage;

    return null;
  };

  // 🔥 OBTENER NOMBRE DE MENSAJERÍA
  const getDeliveryCompanyName = (order: any): string | null => {
    const delivery = order.attributes?.delivery || order.delivery || {};
    const company = delivery.company || delivery.companyName || delivery.name || '';
    if (!company) return null;
    const info = DELIVERY_COMPANIES[company.toLowerCase()];
    return info?.name || company;
  };

  const getDeliveryCompanyColor = (order: any): string => {
    const delivery = order.attributes?.delivery || order.delivery || {};
    const company = delivery.company || delivery.companyName || delivery.name || '';
    if (!company) return '#64748b';
    const info = DELIVERY_COMPANIES[company.toLowerCase()];
    return info?.color || '#64748b';
  };

  // ============================================================
  // 🚀 COMPONENTE PRINCIPAL CON MEMO
  // ============================================================
  const OrdersTab = memo(({ 
    orders, 
    tenant, 
    primary, 
    secondary, 
    textColor, 
    isDarkBg,
    onUpdateOrder,
  }: OrdersTabProps) => {
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
      // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
    const { rates, loading: ratesLoading } = useExchangeRateContext();
    
    // 🔥 TASA DE CAMBIO DINÁMICA - NUNCA USAR VALORES FIJOS
    const globalRate = rates.USD > 0 ? rates.USD : 0;
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<'date' | 'total' | 'id'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [localOrders, setLocalOrders] = useState<any[]>(orders);
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
      id: true,
      image: true,
      client: true, 
      items: true,
      total: true,
      payment: false,
      status: true,
      delivery: false,
      date: true,
      actions: true,
    });
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
      id: 90,
      image: 65,
      client: 150,
      items: 200,
      total: 120,
      payment: 120,
      status: 120,
      delivery: 100,
      date: 100,
      actions: 100,
    });

    const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);
    const { registerComponent, unregisterComponent } = useAppRefreshContext();

    const tenantId = tenant?.id || tenant?.tenantId || tenant?._id;

    const { updateOrderStatus, isUpdating } = useOrderActions({
      apiBase: API_BASE,
      tenantId: tenantId,
      onOrderUpdated: (updatedOrder) => {
        console.log('🔄 [OrdersTab] onOrderUpdated:', updatedOrder);
        if (onUpdateOrder) {
          onUpdateOrder(updatedOrder);
        }
      },
    });

    // ✅ Memoizar estilos
    const subtleBorderColor = useMemo(() =>
      isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      [isDarkBg]
    );

    const priceColors = useMemo(
      () => getPriceColors({ primary, isDarkBg }),
      [primary, isDarkBg]
    );

    const cardBg = useMemo(() =>
      secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
      [secondary, isDarkBg]
    );

  // ✅ Memoizar funciones de formato
  const formatOrderCurrency = useCallback((order: any) => {
    // 🔥 Total VES: usar totalAmountVes del snapshot (que ya incluye el envío)
    // Si no existe, calcular: suma de items + envío
    let totalVes = Number(order.totalAmountVes || 0);
    
    if (totalVes === 0) {
      // Fallback: sumar items + envío
      const itemsTotalVes = getOrderVesTotal(order, globalRate);
      const delivery = order.paymentMetadata?.delivery;
      const shippingVes = delivery?.selected
        ? Number(delivery.costVes || 0)
        : 0;
      totalVes = itemsTotalVes + shippingVes;
    }

    // 🔥 Total USD: usar totalAmount del snapshot (que ya incluye el envío)
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
  }, [globalRate]);

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

        if (statusFilter === 'verifying') {
          matchesStatus = orderStatus.includes('por_verificar') || orderStatus.includes('verificando');
        } else if (statusFilter === 'pending') {
          matchesStatus = orderStatus.includes('pend') && !orderStatus.includes('por_verificar');
        } else if (statusFilter === 'completed') {
          matchesStatus = orderStatus.includes('complet') || orderStatus.includes('pagado') || orderStatus.includes('aprobado');
        } else if (statusFilter === 'cancelled') {
          matchesStatus = orderStatus.includes('canc') || orderStatus.includes('rechaz');
        } else if (statusFilter === 'kiosk') {
          matchesStatus = o.source === 'kiosk';
        }

        return matchesSearch && matchesStatus;
      });
    }, [localOrders, searchFilter, statusFilter]);

  // ✅ Memoizar órdenes ordenadas
  const sortedOrders = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'date') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (sortField === 'total') {
valA = Number(a.totalAmountVes || 0) || getOrderVesTotal(a, globalRate);
valB = Number(b.totalAmountVes || 0) || getOrderVesTotal(b, globalRate);
      } else if (sortField === 'id') {
        valA = a.id || '';
        valB = b.id || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortField, sortDirection, globalRate]); // ✅ AGREGAR globalRate a dependencias

    const totalPages = useMemo(() => 
      Math.ceil((sortedOrders || []).length / itemsPerPage) || 1,
      [sortedOrders, itemsPerPage]
    );

    // ✅ Memoizar órdenes paginadas
    const paginatedOrders = useMemo(() => {
      if (!sortedOrders || sortedOrders.length === 0) return [];
      const start = (currentPage - 1) * itemsPerPage;
      return sortedOrders.slice(start, start + itemsPerPage);
    }, [sortedOrders, currentPage, itemsPerPage]);

    // ✅ Handlers con useCallback
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

    const handleRowClick = useCallback((order: any) => {
      setSelectedOrder(order);
      setIsModalOpen(true);
    }, []);

    const handleViewDetails = useCallback((order: any) => {
      setSelectedOrder(order);
      setIsModalOpen(true);
    }, []);

    const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
      console.log('🟡 [OrdersTab] handleStatusChange:', { orderId, newStatus });
      
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (result && result.success) {
        console.log('✅ [OrdersTab] Orden actualizada correctamente');
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const freshOrder = await response.json();
            
            if (selectedOrder && selectedOrder.id === orderId) {
              setSelectedOrder(freshOrder);
            }
            
            setLocalOrders(prev => 
              prev.map(o => o.id === orderId ? freshOrder : o)
            );
            
            if (onUpdateOrder) {
              onUpdateOrder(freshOrder);
            }
          }
        } catch (error) {
          console.error('❌ [OrdersTab] Error refrescando orden:', error);
        }
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globalRefresh'));
          window.dispatchEvent(new Event('notificationUpdate'));
        }
      } else if (result && !result.success) {
        console.error('❌ [OrdersTab] Error:', result.error);
      }
      
      return result;
    }, [updateOrderStatus, selectedOrder, onUpdateOrder]);

    // ✅ Si no hay órdenes
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
            <p className="text-xs opacity-40">Las órdenes de tus clientes aparecerán aquí</p>
          </div>
        </div>
      );
    }

    // ✅ Memoizar selector de columnas
    const columnSelector = useMemo(() => {
      if (!showColumnSelector) return null;

      const labels: Record<string, string> = {
        id: 'ID Pedido',
        image: 'Imagen',
        client: 'Cliente',
        items: 'Artículos',
        total: 'Total',
        payment: 'Método de Pago',
        status: 'Estado',
        delivery: 'Mensajería',
        date: 'Fecha',
        actions: 'Acciones',
      };

      return (
        <div 
          className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-2xl py-2 z-50 backdrop-blur-lg"
          style={{
            backgroundColor: cardBg,
            borderColor: subtleBorderColor,
            color: textColor,
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

    return (
      <div 
        className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all duration-300"
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

        {/* TÍTULO */}
        <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
          <div>
            <h3 className="font-extrabold text-base tracking-tight" style={{ color: textColor }}>
              Órdenes de Compra
            </h3>
            <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
              Gestiona y monitorea todas las órdenes de tus clientes.
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
              <span className="text-[11px] opacity-70">Total órdenes:</span>
              <span className="text-[11px] font-bold" style={{ color: primary }}>{localOrders.length}</span>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: subtleBorderColor }}>
          
          {/* Filtros */}
          <div className="p-4 sm:p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4" style={{ borderColor: subtleBorderColor }}>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'verifying', label: 'Verificando' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'completed', label: 'Completadas' },
                { id: 'cancelled', label: 'Canceladas' },
                { id: 'kiosk', label: 'Kiosco' },
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
                  {visibleColumns.client && (
                    <th className="py-3 px-4 relative" style={{ width: columnWidths.client }}>
                      <div className="truncate">Cliente</div>
                      <div className="resizer" onMouseDown={(e) => handleMouseDown('client', e)} />
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
                  {visibleColumns.delivery && (
                    <th className="py-3 px-4 relative" style={{ width: columnWidths.delivery }}>
                      <div className="truncate">Mensajería</div>
                      <div className="resizer" onMouseDown={(e) => handleMouseDown('delivery', e)} />
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
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((o: any, idx: number) => {
                    const orderStatus = (o.status || 'pendiente').toLowerCase();
                    const orderCurrency = formatOrderCurrency(o);
                    const isKiosk = o.source === 'kiosk';
                    const orderItemsList = Array.isArray(o.items) ? o.items : [];
                    const isExpanded = expandedOrderId === (o.id || idx);
                    const itemImage = getOrderItemImage(o);
                    const clientName = getClientName(o);
                    
                    const deliveryCompany = getDeliveryCompanyName(o);
                    const deliveryColor = getDeliveryCompanyColor(o);
                    const hasDelivery = deliveryCompany !== null;

                    return (
                      <tr 
                        key={o.id || idx} 
                        className="order-row group" 
                        style={{ borderBottom: `1px solid ${subtleBorderColor}` }}
                        onClick={() => handleRowClick(o)}
                      >
                        {visibleColumns.id && (
                          <td className="py-3 px-4 pl-5 font-mono font-bold opacity-90 align-middle truncate" style={{ width: columnWidths.id }}>
                            #{o.id ? o.id.slice(0, 8) : idx + 1}
                            {isKiosk && (
                              <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 inline-flex items-center gap-1">
                                <MonitorSmartphone className="w-2.5 h-2.5" />
                                Kiosco
                              </span>
                            )}
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
                                  }}
                                />
                              ) : (
                                <span className="text-[9px] opacity-40">Sin foto</span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.client && (
                          <td className="py-3 px-4 align-middle" style={{ width: columnWidths.client }}>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 opacity-50" />
                              <span className="font-medium truncate text-xs">{clientName}</span>
                            </div>
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
    {/* PRECIO PRINCIPAL - COLOR HEREDADO DEL TEMA */}
    <div className="font-extrabold" style={{ color: primary }}>Bs. {orderCurrency.bs}</div>
    {/* REFERENCIA USD - VERDE ADAPTATIVO */}
    <div className="text-[10px] font-semibold" style={{ color: priceColors.foreign }}>(${orderCurrency.usd})</div>
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
                                  <div className="text-[10px] opacity-60 font-mono truncate">Ref: {o.paymentReference}</div>
                                )}
                              </>
                            )}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="py-3 px-4 align-middle" style={{ width: columnWidths.status }}>
                            <OrderStatusBadge status={o.status} isDarkBg={isDarkBg} />
                          </td>
                        )}
                        {visibleColumns.delivery && (
                          <td className="py-3 px-4 align-middle" style={{ width: columnWidths.delivery }}>
                            {hasDelivery ? (
                              <span 
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                style={{ 
                                  backgroundColor: `${deliveryColor}20`, 
                                  color: deliveryColor,
                                  border: `1px solid ${deliveryColor}30`
                                }}
                              >
                                <Truck className="w-2.5 h-2.5" />
                                {deliveryCompany}
                              </span>
                            ) : (
                              <span className="text-[9px] opacity-30">—</span>
                            )}
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
                            <OrderActionsCell
                              order={o}
                              onViewDetails={handleViewDetails}
                              onStatusChange={handleStatusChange}
                              isUpdating={isUpdating[o.id] || false}
                              primary={primary}
                              secondary={secondary}
                              isDarkBg={isDarkBg}
                              textColor={textColor}
                              subtleBorderColor={subtleBorderColor}
                              tenantId={tenantId}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center opacity-60 font-medium">
                      No se encontraron órdenes registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
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
                    borderColor={subtleBorderColor || (isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}
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

        {/* MODAL */}
        <OrderDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          order={selectedOrder}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onStatusChange={handleStatusChange}
          isUpdating={isUpdating[selectedOrder?.id] || false}
          onOrderUpdated={(updatedOrder) => {
            if (updatedOrder) {
              setSelectedOrder(updatedOrder);
              setLocalOrders(prev => 
                prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
              );
            }
            if (onUpdateOrder) {
              onUpdateOrder(updatedOrder);
            }
          }}
          tenant={tenant}
        />
      </div>
    );
  });

  OrdersTab.displayName = 'OrdersTab';

  export default OrdersTab;