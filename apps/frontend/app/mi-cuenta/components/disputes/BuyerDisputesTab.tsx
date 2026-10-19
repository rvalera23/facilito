'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Package, ChevronRight, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: '#f59e0b' },
  seller_responded: { label: 'Respondido', color: '#3b82f6' },
  escalated: { label: 'Escalado', color: '#ef4444' },
  resolved_buyer: { label: 'Resuelto a tu favor', color: '#22c55e' },
  resolved_seller: { label: 'Resuelto a favor del vendedor', color: '#64748b' },
  auto_resolved_buyer: { label: 'Resuelto automáticamente', color: '#22c55e' },
  auto_resolved_seller: { label: 'Resuelto automáticamente', color: '#64748b' },
  closed: { label: 'Cerrado', color: '#64748b' },
};

const REASON_LABELS: Record<string, string> = {
  not_received: 'No recibí mi pedido',
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

interface BuyerDisputesTabProps {
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onOpenDetail?: (dispute: any) => void;
}

export default function BuyerDisputesTab({
  primary,
  secondary,
  textColor,
  isDarkBg,
  onOpenDetail,
}: BuyerDisputesTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<any[]>([]);

  const mutedText = isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)');

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/shipping-disputes/my-cases');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[BuyerDisputesTab] Error:', err);
      setError('No se pudieron cargar tus reclamos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // ── CONTENEDOR COMÚN ──────────────────────────────────────
  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all duration-300"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        color: textColor,
      }}
    >
      {/* HEADER */}
      <div className="border-b pb-3" style={{ borderColor: cardBorder }}>
        <h2 className="text-base font-black tracking-tight" style={{ color: textColor }}>
          Mis Reclamos
        </h2>
        <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
          Seguimiento de los problemas reportados con tus encomiendas.
        </p>
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: primary }} />
        </div>
      ) : error ? (
        <div
          className="p-6 rounded-2xl border text-center"
          style={{ borderColor: cardBorder }}
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
        <EmptyState
          icon={<AlertTriangle className="w-14 h-14" />}
          title="No hay reclamos registrados"
          message="Cuando reportes un problema con una encomienda, vas a poder hacerle seguimiento desde acá."
          primary={primary}
          textColor={textColor}
          borderColor={cardBorder}
          cardBg={cardBg}
          isDarkBg={isDarkBg}
        />
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