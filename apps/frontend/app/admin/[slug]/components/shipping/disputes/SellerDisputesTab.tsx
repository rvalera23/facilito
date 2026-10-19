'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Package, ChevronRight, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: '#f59e0b' },
  seller_responded: { label: 'Respondido', color: '#3b82f6' },
  escalated: { label: 'Escalado', color: '#ef4444' },
  resolved_buyer: { label: 'Resuelto a favor del comprador', color: '#22c55e' },
  resolved_seller: { label: 'Resuelto a tu favor', color: '#22c55e' },
  auto_resolved_buyer: { label: 'Auto-resuelto a favor del comprador', color: '#22c55e' },
  auto_resolved_seller: { label: 'Auto-resuelto a tu favor', color: '#22c55e' },
  closed: { label: 'Cerrado', color: '#64748b' },
};

const REASON_LABELS: Record<string, string> = {
  not_received: 'No recibió el pedido',
  wrong_item: 'Producto equivocado',
  damaged: 'Producto dañado',
  late: 'Llegó tarde',
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

interface SellerDisputesTabProps {
  tenantId: string;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onOpenDetail?: (dispute: any) => void;
}

export default function SellerDisputesTab({
  tenantId,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onOpenDetail,
}: SellerDisputesTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<any[]>([]);

  const mutedText = isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)');

  const fetchDisputes = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/shipping-disputes/tenant/${tenantId}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[SellerDisputesTab] Error:', err);
      setError('No se pudieron cargar los reclamos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDisputes();

    const handler = () => fetchDisputes();
    if (typeof window !== 'undefined') {
      window.addEventListener('globalRefresh', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('globalRefresh', handler);
      }
    };
  }, [fetchDisputes]);

  const openCount = disputes.filter((d) =>
    ['open', 'seller_responded'].includes(d.status),
  ).length;
  const escalatedCount = disputes.filter((d) => d.status === 'escalated').length;

  return (
    <div className="space-y-4">
      {!loading && !error && disputes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5"
            style={{
              borderColor: 'rgba(245,158,11,0.3)',
              color: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.1)',
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            {openCount} abiertos
          </div>
          {escalatedCount > 0 && (
            <div
              className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5"
              style={{
                borderColor: 'rgba(239,68,68,0.3)',
                color: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.1)',
              }}
            >
              <AlertCircle className="w-3 h-3" />
              {escalatedCount} escalados
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: primary }} />
        </div>
      ) : error ? (
        <div
          className="p-6 rounded-2xl border text-center"
          style={{ borderColor: cardBorder, backgroundColor: cardBg }}
        >
          <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: textColor }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchDisputes}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            style={{ backgroundColor: primary, color: '#ffffff' }}
          >
            Reintentar
          </button>
        </div>
      ) : disputes.length === 0 ? (
        <div
          className="p-8 rounded-3xl border shadow-xl"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          <EmptyState
            icon={<AlertTriangle className="w-14 h-14" />}
            title="Sin reclamos"
            message="Cuando un comprador reporte un problema con una encomienda, va a aparecer acá para que puedas responder."
            primary={primary}
            textColor={textColor}
            borderColor={cardBorder}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => {
            const statusInfo =
              STATUS_LABELS[d.status] || { label: d.status, color: '#64748b' };
            const reasonLabel = REASON_LABELS[d.reason] || d.reason;
            const orderShort = d.orderId
              ? `#${String(d.orderId).slice(-8).toUpperCase()}`
              : 'Pedido';

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onOpenDetail?.(d)}
                className="w-full text-left p-4 rounded-2xl border transition hover:opacity-90 cursor-pointer"
                style={{ borderColor: cardBorder, backgroundColor: cardBg }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 shrink-0" style={{ color: mutedText }} />
                    <span className="text-xs font-black truncate" style={{ color: textColor }}>
                      {orderShort}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: `${statusInfo.color}20`,
                      color: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold" style={{ color: textColor }}>
                      {reasonLabel}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: mutedText }}>
                      {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: mutedText }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}