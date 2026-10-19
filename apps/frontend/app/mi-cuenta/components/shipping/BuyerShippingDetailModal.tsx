'use client';

import React, { memo, useEffect, useState } from 'react';
import { X, Package, Truck, MapPin, Calendar, Building2, ExternalLink, AlertCircle } from 'lucide-react';
import { useThemeBackground } from '@/hooks/useThemeBackground';
import { apiFetch } from '@/lib/api';

const COMPANY_LABELS: Record<string, string> = {
  mrw: 'MRW',
  zoom: 'Zoom',
  domesa: 'Domesa',
  tealca: 'Tealca',
  delivery_propio: 'Delivery propio',
  delivery: 'Delivery',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#f59e0b' },
  por_enviar: { label: 'Pendiente', color: '#f59e0b' },
  in_transit: { label: 'En tránsito', color: '#3b82f6' },
  en_transito: { label: 'En tránsito', color: '#3b82f6' },
  delivered: { label: 'Entregado', color: '#22c55e' },
  entregado: { label: 'Entregado', color: '#22c55e' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
  cancelado: { label: 'Cancelado', color: '#ef4444' },
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

interface BuyerShippingDetailModalProps {
  order: any | null;
  onClose: () => void;
  primary: string;
  secondary: string;
  textColor: string;
  mutedText: string;
  cardBorder: string;
  isDarkBg: boolean;
  onViewFullOrder?: (order: any) => void;
  onReportIssue?: (order: any) => void;
}

function BuyerShippingDetailModal({
  order,
  onClose,
  primary,
  textColor,
  mutedText,
  cardBorder,
  isDarkBg,
  onViewFullOrder,
  onReportIssue,
}: BuyerShippingDetailModalProps) {
  // 🔥 Fondo del modal centralizado (lee --bg-color, reactivo a themeChange).
  const themeBg = useThemeBackground(undefined, isDarkBg);

  // 🔥 ESTADO: ¿puede el comprador reportar un problema?
  const [canReport, setCanReport] = useState<{
    canReport: boolean;
    reason?: string;
    availableAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!order?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch(`/shipping-disputes/can-report/${order.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCanReport(data);
      } catch {
        // Silencioso: si falla, el botón simplemente no se muestra
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order?.id]);

  if (!order) return null;

  const delivery = order.paymentMetadata?.delivery || order.delivery || {};
  const rawStatus = String(delivery.status || order.status || 'pending').toLowerCase();
  const statusInfo = STATUS_LABELS[rawStatus] || { label: rawStatus, color: '#64748b' };
  const company = delivery.company || '';
  const companyLabel = COMPANY_LABELS[company] || company || 'Mensajería';
  const tracking = delivery.trackingNumber || '';
  const trackingUrl = delivery.trackingUrl || '';
    const address = delivery.address || order.customerAddress || '';
  const estimatedDays = delivery.estimatedDays || '';
  const orderId = order.id ? `#${String(order.id).slice(-8).toUpperCase()}` : 'Pedido';
  const tenantName = order.tenantName || order.tenant?.name || 'Tienda';
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          backgroundColor: themeBg,
          borderColor: cardBorder,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: cardBorder }}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
              Detalle del Envío
            </span>
            <h3 className="text-base font-black" style={{ color: textColor }}>
              {orderId}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:opacity-70 transition cursor-pointer"
            style={{ color: textColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
            <span className="text-xs font-bold" style={{ color: mutedText }}>
              Estado
            </span>
            <span className="text-sm font-black" style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>

          {/* Tienda */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
            <span className="text-xs font-bold flex items-center gap-2" style={{ color: mutedText }}>
              <Building2 className="w-3.5 h-3.5" /> Tienda
            </span>
            <span className="text-sm font-black text-right" style={{ color: primary }}>
              {tenantName}
            </span>
          </div>

          {/* Mensajería */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
            <span className="text-xs font-bold flex items-center gap-2" style={{ color: mutedText }}>
              <Truck className="w-3.5 h-3.5" /> Mensajería
            </span>
            <span className="text-sm font-black" style={{ color: textColor }}>
              {companyLabel}
            </span>
          </div>

          {/* Tracking */}
          {tracking && (
            <div className="flex items-center justify-between p-3 rounded-xl border gap-3" style={{ borderColor: cardBorder }}>
              <span className="text-xs font-bold flex items-center gap-2" style={{ color: mutedText }}>
                <Package className="w-3.5 h-3.5" /> Tracking
              </span>
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-black font-mono inline-flex items-center gap-1.5 hover:underline"
                  style={{ color: primary }}
                >
                  {tracking}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-sm font-black font-mono" style={{ color: textColor }}>
                  {tracking}
                </span>
              )}
            </div>
          )}

          {/* Dirección */}
          {address && (
            <div className="p-3 rounded-xl border space-y-1.5" style={{ borderColor: cardBorder }}>
              <span className="text-xs font-bold flex items-center gap-2" style={{ color: mutedText }}>
                <MapPin className="w-3.5 h-3.5" /> Dirección de envío
              </span>
              <p className="text-sm font-medium" style={{ color: textColor }}>
                {address}
              </p>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: mutedText }}>
                Fecha del pedido
              </span>
              <span className="text-xs font-bold" style={{ color: textColor }}>
                {formatDate(order.createdAt)}
              </span>
            </div>
            {estimatedDays && (
              <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: mutedText }}>
                  Entrega estimada
                </span>
                <span className="text-xs font-bold" style={{ color: textColor }}>
                  {estimatedDays}
                </span>
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: cardBorder }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: mutedText }}>
                Productos ({items.length})
              </span>
              <div className="space-y-1.5">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate" style={{ color: textColor }}>
                      {item.quantity || 1} × {item.name || item.title || 'Producto'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-4 border-t flex justify-between gap-3 shrink-0 flex-wrap" style={{ borderColor: cardBorder }}>
          <div className="flex items-center gap-3 flex-wrap">
            {onReportIssue && canReport?.canReport && (
              <button
                type="button"
                onClick={() => {
                  onReportIssue(order);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80"
                style={{
                  borderColor: '#f59e0b',
                  color: '#f59e0b',
                }}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Reportar problema
              </button>
            )}

            {onReportIssue && canReport && !canReport.canReport && canReport.reason && (
              <span
                className="flex items-center gap-1.5 text-[10px] font-bold"
                style={{ color: mutedText }}
              >
                <AlertCircle className="w-3 h-3" />
                {canReport.reason}
              </span>
            )}

            {onViewFullOrder && (
              <button
                type="button"
                onClick={() => {
                  onViewFullOrder(order);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80"
                style={{ borderColor: cardBorder, color: textColor }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver pedido completo
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90"
            style={{ backgroundColor: primary, color: '#ffffff' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(BuyerShippingDetailModal);