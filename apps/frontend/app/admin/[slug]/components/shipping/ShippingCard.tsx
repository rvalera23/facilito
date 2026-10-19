// frontend/app/admin/[slug]/components/shipping/ShippingCard.tsx

import React, { useState } from 'react';
import ShippingStatusBadge from './ShippingStatusBadge';
import ShippingActions from './ShippingActions';
import { DELIVERY_COMPANIES } from './constants';
import { ShippingOrder } from './types';
import { formatPhoneDisplay } from '@/lib/formatPhone';

import { 
  Package, 
  MapPin, 
  Truck, 
  Calendar, 
  Clock, 
  User, 
  Hash, 
  ChevronRight,
  ClipboardList,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { getInitials } from '../conversations/utils/conversationUtils';

// 🔥 FUNCIÓN PARA OBTENER NOMBRE DE EMPRESA
export const getCompanyName = (companyId?: string): string => {
  if (!companyId) return 'Sin asignar';
  const info = DELIVERY_COMPANIES[companyId];
  return info?.name || companyId;
};

// 🔥 FUNCIÓN PARA OBTENER COLOR DE EMPRESA
export const getCompanyColor = (companyId?: string): string => {
  if (!companyId) return '#64748b';
  const info = DELIVERY_COMPANIES[companyId];
  return info?.color || '#64748b';
};

// 🔥 FUNCIÓN PARA OBTENER LOGO DE EMPRESA
export const getCompanyLogo = (companyId?: string): string | null => {
  if (!companyId) return null;
  const info = DELIVERY_COMPANIES[companyId];
  return info?.logo || null;
};

interface ShippingCardProps {
  order: ShippingOrder;
  onViewDetails: (order: ShippingOrder) => void;
  onStatusChange: (orderId: string, status: string) => Promise<void>;
  isUpdating: boolean;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
}

export default function ShippingCard({
  order,
  onViewDetails,
  onStatusChange,
  isUpdating,
  primary,
  textColor,
  isDarkBg,
  cardBorder,
}: ShippingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const delivery = order.attributes?.delivery || order.delivery || {};
  const status = delivery.status || order.status || 'PENDING';
  const companyName = getCompanyName(delivery.company);
  const companyColor = getCompanyColor(delivery.company);
  const companyLogo = getCompanyLogo(delivery.company);

  // 🔥 Formatear fecha
  const formatDate = (date?: string) => {
    if (!date) return 'Fecha no disponible';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (date?: string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // 🔥 Obtener iniciales del cliente
  const customerInitials = getInitials(order.customerName || 'Cliente');

  // 🔥 Obtener icono de estado
  const getStatusIcon = (status: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    if (s === 'PENDING' || s === 'POR_ENVIAR') return <Clock className="w-3.5 h-3.5" />;
    if (s === 'IN_TRANSIT' || s === 'EN_TRANSITO') return <Truck className="w-3.5 h-3.5" />;
    if (s === 'DELIVERED' || s === 'ENTREGADO') return <CheckCircle className="w-3.5 h-3.5" />;
    if (s === 'CANCELLED' || s === 'CANCELADO') return <XCircle className="w-3.5 h-3.5" />;
    return <AlertCircle className="w-3.5 h-3.5" />;
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    if (s === 'PENDING' || s === 'POR_ENVIAR') return '#f59e0b';
    if (s === 'IN_TRANSIT' || s === 'EN_TRANSITO') return '#3b82f6';
    if (s === 'DELIVERED' || s === 'ENTREGADO') return '#22c55e';
    if (s === 'CANCELLED' || s === 'CANCELADO') return '#ef4444';
    return '#64748b';
  };

  // 🔥 Contar items
  const itemCount = order.items?.length || 0;
  const totalItems = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

  // 🔥 Resumen de productos
  const productNames = order.items?.map(item => item.name || item.productName).join(', ') || '';

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        isHovered ? 'shadow-lg' : 'shadow-sm'
      } ${isExpanded ? 'bg-white/5' : ''}`}
      style={{ 
        borderColor: isHovered ? primary : cardBorder,
        backgroundColor: isHovered ? (isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 🔥 HEADER - Siempre visible */}
      <div className="flex items-start gap-3">
        {/* Avatar del cliente */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
          style={{
            backgroundColor: `${primary}20`,
            color: primary,
          }}
        >
          {customerInitials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Fila superior: ID, Empresa, Estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold flex items-center gap-1" style={{ color: textColor }}>
              <Hash className="w-3 h-3 opacity-40" />
              #{order.id?.slice(0, 8) || 'N/A'}
            </p>
            
            {delivery.company && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                style={{
                  backgroundColor: `${companyColor}20`,
                  color: companyColor,
                  border: `1px solid ${companyColor}30`,
                }}
              >
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-3 h-3 rounded-full" />
                ) : (
                  <Truck className="w-3 h-3" />
                )}
                {companyName}
              </span>
            )}

            <ShippingStatusBadge status={status} isDarkBg={isDarkBg} />
          </div>

          {/* Cliente */}
          <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5" style={{ color: textColor }}>
            <User className="w-3 h-3 opacity-40" />
            {order.customerName || 'Cliente sin nombre'}
            {order.customerPhone && (
              <span className="text-[10px] opacity-50 flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" />
                {formatPhoneDisplay(order.customerPhone)}
                              </span>
            )}
          </p>

          {/* Dirección - SIEMPRE visible */}
          {order.customerAddress && (
            <div className="flex items-start gap-1.5 mt-0.5">
              <MapPin className="w-3 h-3 opacity-40 shrink-0 mt-0.5" />
              <span 
                className="text-[10px] opacity-60 break-words whitespace-normal" 
                style={{ color: textColor }}
              >
                {order.customerAddress}
              </span>
            </div>
          )}

          {/* Productos y cantidad */}
          {itemCount > 0 && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Package className="w-3 h-3 opacity-40" />
              <span className="text-[10px] opacity-60 truncate max-w-[200px]" style={{ color: textColor }}>
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'} ({totalItems} unidades)
              </span>
              {productNames && (
                <span className="text-[9px] opacity-40 truncate max-w-[150px]">
                  • {productNames}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="p-1.5 rounded-lg border hover:opacity-70 transition"
            style={{ borderColor: cardBorder }}
            title="Ver detalles"
          >
            <ClipboardList className="w-4 h-4 opacity-60" />
          </button>
          
          <ShippingActions
            orderId={order.id}
            currentStatus={status}
            onStatusChange={onStatusChange}
            isUpdating={isUpdating}
            isDarkBg={isDarkBg}
            textColor={textColor}
            cardBorder={cardBorder}
          />

          {/* Botón expandir */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg border transition-all hover:opacity-70 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            style={{ borderColor: cardBorder }}
            title={isExpanded ? 'Contraer' : 'Expandir'}
          >
            <ChevronRight className={`w-4 h-4 opacity-60 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🔥 DETALLE EXPANDIDO */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: cardBorder }}>
          {/* Grid de información adicional */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Fecha de creación */}
            {order.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 opacity-40" />
                <div>
                  <p className="text-[8px] uppercase opacity-40" style={{ color: textColor }}>Creado</p>
                  <p className="text-[10px] font-medium" style={{ color: textColor }}>
                    {formatDateShort(order.createdAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Fecha de entrega estimada */}
            {delivery.estimatedDelivery && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 opacity-40" style={{ color: primary }} />
                <div>
                  <p className="text-[8px] uppercase opacity-40" style={{ color: textColor }}>Entrega estimada</p>
                  <p className="text-[10px] font-medium" style={{ color: primary }}>
                    {formatDateShort(delivery.estimatedDelivery)}
                  </p>
                </div>
              </div>
            )}

            {/* Tracking */}
            {delivery.trackingNumber && (
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 opacity-40" />
                <div>
                  <p className="text-[8px] uppercase opacity-40" style={{ color: textColor }}>Tracking</p>
                  <p className="text-[10px] font-mono font-medium" style={{ color: textColor }}>
                    {delivery.trackingNumber}
                  </p>
                </div>
              </div>
            )}

            {/* Última actualización */}
            {delivery.updatedAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 opacity-40" />
                <div>
                  <p className="text-[8px] uppercase opacity-40" style={{ color: textColor }}>Última actualización</p>
                  <p className="text-[10px] font-medium" style={{ color: textColor }}>
                    {formatDateShort(delivery.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notas del envío */}
          {delivery.notes && (
            <div className="p-2 rounded-lg" style={{ 
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }}>
              <p className="text-[9px] opacity-40 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                Notas del envío
              </p>
              <p className="text-[10px] mt-0.5 opacity-70" style={{ color: textColor }}>
                {delivery.notes}
              </p>
            </div>
          )}

          {/* Email del cliente si existe */}
          {order.customerEmail && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 opacity-40" />
              <span className="text-[10px] opacity-60" style={{ color: textColor }}>
                {order.customerEmail}
              </span>
            </div>
          )}

          {/* Barra de progreso de estado */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[8px] opacity-40 mb-1" style={{ color: textColor }}>
              <span>Pendiente</span>
              <span>En tránsito</span>
              <span>Entregado</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${cardBorder}40` }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: status === 'DELIVERED' || status === 'ENTREGADO' ? '100%' :
                         status === 'IN_TRANSIT' || status === 'EN_TRANSITO' ? '60%' :
                         '20%',
                  backgroundColor: getStatusColor(status),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 🔥 INDICADOR DE CARGA */}
      {isUpdating && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{
          backgroundColor: isDarkBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(2px)',
        }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: primary }} />
        </div>
      )}
    </div>
  );
}