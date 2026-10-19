'use client';

import React, { memo } from 'react';
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronRight, MapPin } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  icon: <Clock className="w-3 h-3" /> },
  por_enviar:  { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  icon: <Clock className="w-3 h-3" /> },
  in_transit:  { label: 'En tránsito', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  icon: <Truck className="w-3 h-3" /> },
  en_transito: { label: 'En tránsito', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  icon: <Truck className="w-3 h-3" /> },
  delivered:   { label: 'Entregado',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.3)',   icon: <CheckCircle className="w-3 h-3" /> },
  entregado:   { label: 'Entregado',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   border: 'rgba(34,197,94,0.3)',   icon: <CheckCircle className="w-3 h-3" /> },
  cancelled:   { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   icon: <XCircle className="w-3 h-3" /> },
  cancelado:   { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   icon: <XCircle className="w-3 h-3" /> },
};

const DEFAULT_CONFIG = {
  label: 'Desconocido',
  color: '#64748b',
  bg: 'rgba(100,116,139,0.15)',
  border: 'rgba(100,116,139,0.3)',
  icon: <Clock className="w-3 h-3" />,
};

const getStatusConfig = (status: string) => STATUS_CONFIG[status] || DEFAULT_CONFIG;

const COMPANY_LABELS: Record<string, string> = {
  mrw: 'MRW',
  zoom: 'Zoom',
  domesa: 'Domesa',
  tealca: 'Tealca',
  delivery_propio: 'Delivery propio',
  delivery: 'Delivery',
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

interface BuyerShippingCardProps {
  order: any;
  primary: string;
  textColor: string;
  mutedText: string;
  cardBorder: string;
  isDarkBg: boolean;
  onClick: (order: any) => void;
}

function BuyerShippingCard({
  order,
  primary,
  textColor,
  mutedText,
  cardBorder,
  isDarkBg,
  onClick,
}: BuyerShippingCardProps) {
  const delivery = order.paymentMetadata?.delivery || order.delivery || {};
  const rawStatus = String(delivery.status || order.status || 'pending').toLowerCase();
  const statusConfig = getStatusConfig(rawStatus);
  const company = delivery.company || '';
  const companyLabel = COMPANY_LABELS[company] || company || 'Mensajería';
  const tracking = delivery.trackingNumber || '';
  const orderId = order.id ? `#${String(order.id).slice(-6).toUpperCase()}` : 'Pedido';
  const tenantName = order.tenantName || order.tenant?.name || 'Tienda';
  const address = delivery.address || order.customerAddress || '';
  const estimatedDays = delivery.estimatedDays || '';
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <div
      onClick={() => onClick(order)}
      className="p-4 rounded-2xl border cursor-pointer hover:opacity-90 transition-all"
      style={{
        borderColor: cardBorder,
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Fila 1: ID + Estado */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black" style={{ color: textColor }}>
              {orderId}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.border}`,
              }}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>

          {/* Fila 2: Tienda */}
          <p className="text-xs mt-1 font-medium" style={{ color: primary }}>
            {tenantName}
          </p>

          {/* Fila 3: Mensajería + Tracking */}
          <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]" style={{ color: mutedText }}>
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {companyLabel}
            </span>
            {tracking && (
              <>
                <span>•</span>
                <span className="font-mono">#{tracking}</span>
              </>
            )}
            {itemCount > 0 && (
              <>
                <span>•</span>
                <span>{itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}</span>
              </>
            )}
          </div>

          {/* Fila 4: Dirección o días estimados */}
          {(address || estimatedDays) && (
            <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: mutedText }}>
              {address ? (
                <>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{address}</span>
                </>
              ) : (
                <span>{estimatedDays}</span>
              )}
            </div>
          )}

          {/* Fila 5: Fecha */}
          {order.createdAt && (
            <p className="text-[10px] mt-1.5 opacity-60" style={{ color: mutedText }}>
              Pedido: {formatDate(order.createdAt)}
            </p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 opacity-40 shrink-0 mt-1" style={{ color: textColor }} />
      </div>
    </div>
  );
}

export default memo(BuyerShippingCard);