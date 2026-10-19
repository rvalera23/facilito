// frontend/app/admin/[slug]/components/shipping/ShippingDetailModal.tsx

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ShippingStatusBadge from './ShippingStatusBadge';
import ShippingActions from './ShippingActions';
import { getCompanyName, getCompanyColor, getCompanyLogo } from './ShippingCard';
import { getImageUrl } from '@/lib/imageUtils';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { ShippingOrder } from './types';
import { 
  X, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Package, 
  Hash,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';

// 🔥 IMPORTAR COMPONENTE DE PAGOS MIXTOS
import { PaymentBreakdown } from '@/app/components/PaymentBreakdown';
import type { ActivePaymentMethod } from '@/app/components/PaymentBreakdown';
import type {
  PaymentBreakdown as PaymentBreakdownType,
  ChangeResolution as ChangeResolutionType,
} from '@/types/payment-breakdown';
import { useToast } from '@/components/ui/useToast';
import { Button } from '@/components/ui/Button';
import { API_BASE } from './constants';
interface ShippingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ShippingOrder | null;
  onStatusChange: (orderId: string, status: string) => Promise<void>;
  isUpdating: Record<string, boolean>;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  cardBg?: string;
}

export default function ShippingDetailModal({
  isOpen,
  onClose,
  order,
  onStatusChange,
  isUpdating,
  primary,
  secondary,
  textColor,
  isDarkBg,
  cardBg,
}: ShippingDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'history'>('info');

  // 🔥 ESTADO LOCAL PARA TRACKING EDITABLE
  const { showToast } = useToast();
  const [editTrackingNumber, setEditTrackingNumber] = useState<string>('');
  const [editTrackingUrl, setEditTrackingUrl] = useState<string>('');
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = secondary || (isDarkBg ? '#1e293b' : '#ffffff');

  
  // 🔥 ESTADO PARA PAGOS MIXTOS (Fase 2)
  const [activePaymentMethods, setActivePaymentMethods] = useState<ActivePaymentMethod[]>([]);
  const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  // 🔥 CARGAR MÉTODOS DE PAGO ACTIVOS DEL TENANT
  // 🔥 SINCRONIZAR INPUTS DE TRACKING CUANDO CAMBIA LA ORDEN
  useEffect(() => {
    if (!order) return;
    const d = (order as any)?.paymentMetadata?.delivery || (order as any)?.delivery || {};
    setEditTrackingNumber(d.trackingNumber || '');
    setEditTrackingUrl(d.trackingUrl || '');
  }, [order?.id]);

  useEffect(() => {
        const tenantId = (order as any)?.tenantId;
    if (!isOpen || !tenantId) return;

    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    (async () => {
      try {
        const response = await fetch(
          `${apiBase}/tenants/${tenantId}/payment-methods`,
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
  }, [isOpen, (order as any)?.tenantId]);


  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
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
    if (!order?.id) return;
    setIsSubmittingBreakdown(true);
    setBreakdownError(null);

    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL;

      const body: any = { resolution, notes };
      if (deliveryMethod) body.deliveryMethod = deliveryMethod;
      if (deliveryPagoMovilData) {
        body.deliveryPagoMovilData = deliveryPagoMovilData;
      }

      const response = await fetch(
        `${apiBase}/orders/${order.id}/resolve-change`,
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
        throw new Error(errorData.message || 'Error al resolver el vuelto');
      }

      // Refrescar la orden para reflejar la resolución
      // (el componente padre debería re-fetch, pero si no, al menos
      // cerramos el modal)
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al resolver el vuelto';
      setBreakdownError(message);
      throw err;
    } finally {
      setIsSubmittingBreakdown(false);
    }
  };

  if (!isOpen || !order) return null;

  // 🔥 El delivery vive en `paymentMetadata.delivery` (backend).
  // Los fallbacks a `attributes.delivery` y `order.delivery` se mantienen
  // para compatibilidad con órdenes viejas.
  const delivery =
    (order as any).paymentMetadata?.delivery ||
    order.attributes?.delivery ||
    order.delivery ||
    {};
  const status = delivery.status || order.status || 'PENDING';
  const companyName = getCompanyName(delivery.company);
  const companyColor = getCompanyColor(delivery.company);
  const companyLogo = getCompanyLogo(delivery.company);

  // 🔥 Formatear fechas
  const formatFullDate = (date?: string) => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // 🔥 Obtener estado del timeline
  const getTimelineStatus = (status: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    if (s === 'PENDING' || s === 'POR_ENVIAR' || s === 'PENDING_LOCAL') {
      return { label: 'Pendiente', icon: Clock, color: '#f59e0b' };
    }
    if (s === 'POR_VERIFICAR') {
      return { label: 'Por verificar', icon: Clock, color: '#f59e0b' };
    }
    if (s === 'CONFIRMED') {
      return { label: 'Confirmado', icon: CheckCircle, color: '#3b82f6' };
    }
    if (s === 'IN_TRANSIT' || s === 'EN_TRANSITO') {
      return { label: 'En tránsito', icon: Truck, color: '#3b82f6' };
    }
    if (s === 'DELIVERED' || s === 'ENTREGADO' || s === 'COMPLETED') {
      return { label: 'Entregado', icon: CheckCircle, color: '#22c55e' };
    }
    if (s === 'CANCELLED' || s === 'CANCELADO') {
      return { label: 'Cancelado', icon: AlertCircle, color: '#ef4444' };
    }
    if (s === 'NO_SHOW') {
      return { label: 'No asistió', icon: AlertCircle, color: '#ef4444' };
    }
    return { label: status, icon: AlertCircle, color: '#64748b' };
  };

  const timelineStatus = getTimelineStatus(status);

  // 🔥 Obtener pasos del timeline
  // Normalizamos el status a mayúscula para hacer las comparaciones
  // (el backend devuelve 'in_transit' y 'delivered' en minúscula).
  const getTimelineSteps = () => {
    const normalizedStatus = String(status || '').toUpperCase();

    // 🔥 Determinar el paso "actual" según el status
    const isPending =
      normalizedStatus === 'PENDING' ||
      normalizedStatus === 'POR_ENVIAR' ||
      normalizedStatus === 'PENDING_LOCAL';

    const isConfirmed = normalizedStatus === 'CONFIRMED' || normalizedStatus === 'POR_VERIFICAR';

    const isInTransit =
      normalizedStatus === 'IN_TRANSIT' ||
      normalizedStatus === 'EN_TRANSITO';

    const isDelivered =
      normalizedStatus === 'DELIVERED' ||
      normalizedStatus === 'ENTREGADO' ||
      normalizedStatus === 'COMPLETED';

    const isCancelled =
      normalizedStatus === 'CANCELLED' ||
      normalizedStatus === 'CANCELADO' ||
      normalizedStatus === 'NO_SHOW';

    return [
      {
        key: 'created',
        label: 'Orden creada',
        date: order.createdAt,
        status: 'completed',
      },
      {
        key: 'pending',
        label: 'En espera de envío',
        date: order.createdAt,
        // 'completed' si ya avanzó a in_transit o delivered
        status: isPending || isConfirmed
          ? 'active'
          : 'completed',
      },
      {
        key: 'in_transit',
        label: 'En camino',
        date: delivery.updatedAt,
        // 'active' si está en tránsito, 'completed' si ya se entregó
        status: isInTransit
          ? 'active'
          : isDelivered
          ? 'completed'
          : isCancelled
          ? 'pending'
          : 'pending',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        date: delivery.actualDelivery || delivery.updatedAt,
        // 'active' si ya se entregó
        status: isDelivered
          ? 'active'
          : 'pending',
      },
    ];
  };

  const timelineSteps = getTimelineSteps();

  // 🔥 Tabs
  const tabs = [
    { id: 'info', label: 'Información', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'items', label: 'Productos', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'Historial', icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  return createPortal(
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`} 
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
        <div
        ref={modalRef}
        className="w-full max-w-3xl rounded-3xl border shadow-2xl max-h-[90vh] overflow-visible flex flex-col"
          style={{
          backgroundColor: bgColor,
          borderColor: cardBorder,
          color: textColor,
        }}
      >
        {/* 🔥 HEADER - Sticky con sombra */}
        <div className="sticky top-0 z-10 p-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: cardBorder, backgroundColor: bgColor }}>
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${companyColor}20` }}
            >
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="w-5 h-5 object-contain" />
              ) : (
                <Truck className="w-5 h-5" style={{ color: companyColor }} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: textColor }}>
                Detalles del Envío
                <span 
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${companyColor}20`,
                    color: companyColor,
                  }}
                >
                  {companyName}
                </span>
              </h3>
              <p className="text-[11px] opacity-60 font-mono flex items-center gap-1" style={{ color: textColor }}>
                <Hash className="w-3 h-3" />
                #{order.id?.slice(0, 8) || 'N/A'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🔥 CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
                    {/* 🔥 RESUMEN RÁPIDO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
              <p className="text-[8px] uppercase opacity-40">Estado</p>
              <div className="mt-1">
                <ShippingStatusBadge status={status} isDarkBg={isDarkBg} showIcon size="lg" />
              </div>
            </div>
            <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
              <p className="text-[8px] uppercase opacity-40">Cliente</p>
              <p className="text-xs font-bold truncate mt-1" style={{ color: textColor }}>
                {order.customerName || 'Cliente'}
              </p>
            </div>
            <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
              <p className="text-[8px] uppercase opacity-40">Productos</p>
              <p className="text-xs font-bold mt-1" style={{ color: textColor }}>
                {order.items?.length || 0} items
              </p>
            </div>
            <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
              <p className="text-[8px] uppercase opacity-40">Total</p>
              <p className="text-xs font-bold mt-1" style={{ color: textColor }}>
                {order.totalAmount ? `$${Number(order.totalAmount).toFixed(2)}` : 'N/A'}
              </p>
            </div>
          </div>

          {/* 🔥 TABS */}
          <div className="flex gap-1 border-b pb-0" style={{ borderColor: cardBorder }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-[10px] font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-b-2'
                    : 'border-b-2 border-transparent opacity-50 hover:opacity-80'
                }`}
                style={{
                  borderColor: activeTab === tab.id ? primary : 'transparent',
                  color: activeTab === tab.id ? primary : textColor,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 🔥 TAB: INFORMACIÓN */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Cliente */}
              <div className="p-4 rounded-xl border" style={{ borderColor: cardBorder }}>
                <p className="text-[9px] uppercase font-bold tracking-wider opacity-50 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Información del Cliente
                </p>
                <div className="mt-2 space-y-1.5">
                  <p className="text-sm font-bold" style={{ color: textColor }}>
                    {order.customerName || 'Cliente'}
                  </p>
                  {order.customerPhone && (
                    <p className="text-xs flex items-center gap-1.5 opacity-60" style={{ color: textColor }}>
                      <Phone className="w-3 h-3" />
                      {formatPhoneDisplay(order.customerPhone)}
                                          </p>
                  )}
                  {order.customerEmail && (
                    <p className="text-xs flex items-center gap-1.5 opacity-60" style={{ color: textColor }}>
                      <Mail className="w-3 h-3" />
                      {order.customerEmail}
                    </p>
                  )}
                  {order.customerAddress && (
                    <p className="text-xs flex items-start gap-1.5 opacity-60 mt-1" style={{ color: textColor }}>
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="break-words">{order.customerAddress}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Envío */}
              <div className="p-4 rounded-xl border" style={{ borderColor: cardBorder }}>
                <p className="text-[9px] uppercase font-bold tracking-wider opacity-50 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Información del Envío
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {delivery.company && (
                    <div>
                      <p className="text-[9px] opacity-40">Empresa</p>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={{
                          backgroundColor: `${companyColor}20`,
                          color: companyColor,
                        }}
                      >
                        {companyLogo && (
                          <img src={companyLogo} alt={companyName} className="w-3 h-3 rounded-full" />
                        )}
                        {companyName}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] opacity-40">Número de seguimiento</p>
                    <input
                      type="text"
                      value={editTrackingNumber}
                      onChange={(e) => setEditTrackingNumber(e.target.value)}
                      placeholder="Ej: MRW-123456789"
                      className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs font-mono outline-none focus:ring-1"
                      style={{
                        backgroundColor: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                        color: textColor,
                        border: `1px solid ${cardBorder}`,
                      }}
                    />
                  </div>

                  <div>
                    <p className="text-[9px] opacity-40">URL de seguimiento (opcional)</p>
                    <input
                      type="url"
                      value={editTrackingUrl}
                      onChange={(e) => setEditTrackingUrl(e.target.value)}
                      placeholder="https://www.mrw.com.ve/rastreo/..."
                      className="mt-1 w-full px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-1"
                      style={{
                        backgroundColor: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                        color: textColor,
                        border: `1px solid ${cardBorder}`,
                      }}
                    />
                    {editTrackingUrl && (
                      <a
                        href={editTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] mt-1 inline-flex items-center gap-1 hover:underline"
                        style={{ color: primary }}
                      >
                        Probar link
                      </a>
                    )}
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={isSavingTracking}
                      disabled={isSavingTracking}
                      onClick={async () => {
                        if (!order) return;
                        setIsSavingTracking(true);
                        try {
                          const token = localStorage.getItem('token');
                          const currentDelivery =
                            (order as any)?.paymentMetadata?.delivery ||
                            (order as any)?.delivery ||
                            {};

                          const res = await fetch(
                            `${API_BASE}/orders/${order.id}/delivery`,
                            {
                              method: 'PATCH',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                ...currentDelivery,
                                trackingNumber: editTrackingNumber.trim(),
                                trackingUrl: editTrackingUrl.trim(),
                              }),
                            },
                          );

                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err.message || 'Error al guardar');
                          }

                          showToast({
                            variant: 'success',
                            message: 'Tracking actualizado',
                          });

                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('globalRefresh'));
                            window.dispatchEvent(new Event('notificationUpdate'));
                          }
                        } catch (e: any) {
                          showToast({
                            variant: 'error',
                            message: e.message || 'No se pudo guardar el tracking',
                          });
                        } finally {
                          setIsSavingTracking(false);
                        }
                      }}
                      primary={primary}
                      borderColor={cardBorder}
                      textColor={textColor}
                      cardBg={bgColor}
                      isDarkBg={isDarkBg}
                    >
                      Guardar tracking
                    </Button>
                  </div>
                  {delivery.estimatedDelivery && (
                    <div>
                      <p className="text-[9px] opacity-40">Fecha estimada</p>
                      <p className="text-xs font-bold flex items-center gap-1" style={{ color: textColor }}>
                        <Calendar className="w-3 h-3" />
                        {formatDateShort(delivery.estimatedDelivery)}
                      </p>
                    </div>
                  )}
                  {delivery.actualDelivery && (
                    <div>
                      <p className="text-[9px] opacity-40">Fecha de entrega</p>
                      <p className="text-xs font-bold flex items-center gap-1" style={{ color: '#22c55e' }}>
                        <CheckCircle className="w-3 h-3" />
                        {formatDateShort(delivery.actualDelivery)}
                      </p>
                    </div>
                  )}
                </div>
                {delivery.notes && (
                  <div className="mt-3 p-2 rounded-lg" style={{ 
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  }}>
                    <p className="text-[9px] opacity-40 flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      Notas
                    </p>
                    <p className="text-[10px] mt-0.5 opacity-70" style={{ color: textColor }}>
                      {delivery.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* 🔥 DESGLOSE DE PAGO MIXTO (Fase 2) */}
              {(order as any).paymentBreakdown && (
                <PaymentBreakdown
                  mode="view"
                  totalVes={Number((order as any).totalAmountVes || 0)}
                  exchangeRate={Number(delivery.exchangeRate || 0)}
                  activeMethods={activePaymentMethods}
                  initialBreakdown={(order as any).paymentBreakdown as PaymentBreakdownType}
                  canResolveChange={true}
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={cardBorder}
                  cardBg={bgColor}
                  onResolveChange={handleResolveChange}
                  isSubmitting={isSubmittingBreakdown}
                  submitError={breakdownError}
                />
              )}
            </div>
          )}

          {/* 🔥 TAB: PRODUCTOS */}
          {activeTab === 'items' && (
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, index: number) => {
                  const imageUrl = item.image || item.coverImage || item.mediaUrls?.[0];
                  const resolvedUrl = imageUrl
                    ? getImageUrl({ coverImage: imageUrl })
                    : null;
                  const imageFailed = failedImages.has(index);

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl border flex items-center gap-3"
                      style={{ borderColor: cardBorder }}
                    >
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ backgroundColor: `${primary}15` }}
                      >
                        {resolvedUrl && !imageFailed ? (
                          <img 
                            src={resolvedUrl} 
                            alt={item.name || item.productName}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setFailedImages((prev) => new Set(prev).add(index));
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5" style={{ color: primary }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: textColor }}>
                          {item.name || item.productName || 'Producto'}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] opacity-60">
                          <span>Cantidad: {item.quantity || 1}</span>
                          {item.price && (
                            <span>Precio: ${Number(item.price).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      {item.price && (
                        <p className="text-xs font-bold shrink-0" style={{ color: textColor }}>
                          ${(Number(item.price) * (item.quantity || 1)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="w-8 h-8 opacity-20" />
                  <p className="text-sm opacity-60 mt-2">No hay productos en esta orden</p>
                </div>
              )}

              {/* Total */}
              {order.items && order.items.length > 0 && (
                <div className="p-3 rounded-xl border flex items-center justify-between" style={{ borderColor: cardBorder }}>
                  <span className="text-xs font-bold" style={{ color: textColor }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: primary }}>
                    ${Number(order.totalAmount || order.items.reduce((sum: number, item: any) => sum + (Number(item.price) * (item.quantity || 1)), 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 🔥 TAB: HISTORIAL */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative pl-6 space-y-4">
                {timelineSteps.map((step, index) => {
                  const isLast = index === timelineSteps.length - 1;
                  const isCompleted = step.status === 'completed';
                  const isActive = step.status === 'active';
                  const isPending = step.status === 'pending';

                  let stepColor = '#64748b';
                  let stepBg = '#64748b20';
                  if (isCompleted) { stepColor = '#22c55e'; stepBg = '#22c55e20'; }
                  if (isActive) { stepColor = '#3b82f6'; stepBg = '#3b82f620'; }

                  return (
                    <div key={step.key} className="relative">
                      {!isLast && (
                        <div 
                          className="absolute left-[-1px] top-5 bottom-0 w-0.5"
                          style={{ 
                            backgroundColor: isCompleted ? '#22c55e' : '#64748b40',
                            height: 'calc(100% + 16px)',
                          }}
                        />
                      )}
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            borderColor: stepColor,
                            backgroundColor: isActive ? stepBg : 'transparent',
                          }}
                        >
                          {isActive && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stepColor }} />
                          )}
                          {isCompleted && (
                            <CheckCircle className="w-3 h-3" style={{ color: '#22c55e' }} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: textColor }}>
                            {step.label}
                          </p>
                          {step.date && (
                            <p className="text-[10px] opacity-40" style={{ color: textColor }}>
                              {formatFullDate(step.date)}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <span 
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ 
                              backgroundColor: '#3b82f620',
                              color: '#3b82f6',
                            }}
                          >
                            Actual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Información adicional */}
              <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
                <p className="text-[9px] uppercase font-bold tracking-wider opacity-40 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Última actualización
                </p>
                <p className="text-xs mt-1" style={{ color: textColor }}>
                  {delivery.updatedAt ? formatFullDate(delivery.updatedAt) : 'No disponible'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 🔥 FOOTER - Acciones */}
        <div className="sticky bottom-0 p-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: cardBorder, backgroundColor: bgColor }}>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-70"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            Cerrar
          </button>
<ShippingActions
  orderId={order.id}
  currentStatus={
    order?.paymentMetadata?.delivery?.status
    || order?.attributes?.delivery?.status
    || order?.status
    || 'pending'
  }
  onStatusChange={onStatusChange}
  isUpdating={isUpdating?.[order.id] || false}
  isDarkBg={isDarkBg}
  textColor={textColor}
  cardBorder={cardBorder}
  cardBg={cardBg || bgColor}
  primary={primary}
/>
        </div>
      </div>
    </div>,
    document.body
  );
}