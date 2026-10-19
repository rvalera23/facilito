'use client';

import React, { useState } from 'react';
import {
  X,
  Package,
  AlertCircle,
  Clock,
  MessageSquare,
  DollarSign,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/useToast';

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

const RESOLUTION_LABELS: Record<string, string> = {
  refund: 'Reembolso',
  replacement: 'Reemplazo',
  proof_of_delivery: 'Prueba de entrega',
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

interface TimelineEntry {
  label: string;
  date: string | null;
  color: string;
}

interface SellerDisputeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: any | null;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onUpdated?: () => void;
}

export default function SellerDisputeDetailModal({
  isOpen,
  onClose,
  dispute,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onUpdated,
}: SellerDisputeDetailModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'view' | 'respond' | 'resolve'>('view');
  const [responseText, setResponseText] = useState('');
  const [resolutionType, setResolutionType] = useState<'refund' | 'replacement' | 'proof_of_delivery'>('proof_of_delivery');
  const [resolutionAmount, setResolutionAmount] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setMode('view');
      setResponseText('');
      setResolutionType('proof_of_delivery');
      setResolutionAmount('');
      setResolutionNotes('');
    }
  }, [isOpen, dispute?.id]);

  if (!isOpen || !dispute) return null;

  const mutedText = isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const cardBorder = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)');
  const inputStyle = {
    backgroundColor: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
    color: textColor,
    border: `1px solid ${cardBorder}`,
  };

  const statusInfo = STATUS_LABELS[dispute.status] || {
    label: dispute.status,
    color: '#64748b',
  };

  const reasonLabel = REASON_LABELS[dispute.reason] || dispute.reason;
  const orderShort = dispute.orderId
    ? `#${String(dispute.orderId).slice(-8).toUpperCase()}`
    : 'Pedido';

  const timeline: TimelineEntry[] = [
    { label: 'Reclamo abierto', date: dispute.createdAt, color: '#f59e0b' },
  ];
  if (dispute.sellerRespondedAt) {
    timeline.push({ label: 'Tu respuesta enviada', date: dispute.sellerRespondedAt, color: '#3b82f6' });
  }
  if (dispute.escalatedAt) {
    timeline.push({ label: 'Escalado', date: dispute.escalatedAt, color: '#ef4444' });
  }
  if (dispute.resolvedAt) {
    timeline.push({ label: 'Resuelto', date: dispute.resolvedAt, color: '#22c55e' });
  }
  if (dispute.autoResolvedAt) {
    timeline.push({ label: 'Auto-resuelto', date: dispute.autoResolvedAt, color: '#22c55e' });
  }

  const canRespond = dispute.status === 'open';
  const canResolve =
    dispute.status === 'seller_responded' || dispute.status === 'escalated';
  const isClosed =
    dispute.status === 'resolved_buyer' ||
    dispute.status === 'resolved_seller' ||
    dispute.status === 'auto_resolved_buyer' ||
    dispute.status === 'auto_resolved_seller' ||
    dispute.status === 'closed';

  const handleRespond = async () => {
    if (responseText.trim().length < 10) {
      showToast({ variant: 'error', message: 'La respuesta debe tener al menos 10 caracteres' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/shipping-disputes/${dispute.id}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ response: responseText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Error al enviar la respuesta');
      }
      showToast({ variant: 'success', message: 'Respuesta enviada' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('globalRefresh'));
        window.dispatchEvent(new Event('notificationUpdate'));
      }
      onUpdated?.();
      onClose();
    } catch (e: any) {
      showToast({ variant: 'error', message: e?.message || 'Error al enviar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (resolutionType === 'refund') {
      const amount = parseFloat(resolutionAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast({ variant: 'error', message: 'Ingresá un monto válido para el reembolso' });
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const body: any = {
        type: resolutionType,
        notes: resolutionNotes.trim() || undefined,
      };
      if (resolutionType === 'refund') {
        body.amountUsd = parseFloat(resolutionAmount);
      }
      const res = await apiFetch(`/shipping-disputes/${dispute.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Error al resolver');
      }
      showToast({ variant: 'success', message: 'Resolución enviada al comprador' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('globalRefresh'));
        window.dispatchEvent(new Event('notificationUpdate'));
      }
      onUpdated?.();
      onClose();
    } catch (e: any) {
      showToast({ variant: 'error', message: e?.message || 'Error al resolver' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: cardBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: cardBorder }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${statusInfo.color}20` }}
            >
              <Package className="w-4 h-4" style={{ color: statusInfo.color }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black truncate" style={{ color: textColor }}>
                Reclamo {orderShort}
              </h2>
              <span className="text-[10px] font-bold" style={{ color: statusInfo.color }}>
                {statusInfo.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70 shrink-0"
            style={{ color: mutedText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: cardBorder }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
                Motivo
              </span>
            </div>
            <p className="text-xs font-bold" style={{ color: textColor }}>
              {reasonLabel}
            </p>
            {dispute.buyerMessage && (
              <p className="text-[11px] leading-relaxed mt-2" style={{ color: mutedText }}>
                {dispute.buyerMessage}
              </p>
            )}
          </div>

          {dispute.sellerResponse && (
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
                  Tu respuesta
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: textColor }}>
                {dispute.sellerResponse}
              </p>
            </div>
          )}

          {dispute.resolutionType && (
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
                  Resolución
                </span>
              </div>
              <p className="text-xs font-bold" style={{ color: textColor }}>
                {RESOLUTION_LABELS[dispute.resolutionType] || dispute.resolutionType}
                {dispute.resolutionAmountUsd != null && (
                  <span style={{ color: '#22c55e' }}>
                    {' '}
                    — ${Number(dispute.resolutionAmountUsd).toFixed(2)}
                  </span>
                )}
              </p>
              {dispute.resolutionNotes && (
                <p className="text-[11px] leading-relaxed" style={{ color: mutedText }}>
                  {dispute.resolutionNotes}
                </p>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl border" style={{ borderColor: cardBorder }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5" style={{ color: mutedText }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
                Historial
              </span>
            </div>
            <div className="space-y-2">
              {timeline.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold" style={{ color: textColor }}>
                      {entry.label}
                    </p>
                    <p className="text-[10px]" style={{ color: mutedText }}>
                      {formatDateTime(entry.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isClosed && dispute.status === 'open' && (
            <div
              className="p-3 rounded-xl text-[10px] leading-relaxed"
              style={{
                backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                color: mutedText,
              }}
            >
              Tenés <strong>5 días hábiles</strong> para responder. Si no lo hacés,
              el reclamo se escalará automáticamente.
            </div>
          )}
          {!isClosed && dispute.status === 'escalated' && (
            <div
              className="p-3 rounded-xl text-[10px] leading-relaxed"
              style={{
                backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                color: mutedText,
              }}
            >
              Tenés <strong>5 días hábiles</strong> para resolver. Si no lo hacés,
              se procesará un reembolso automático al comprador.
            </div>
          )}

          {mode === 'respond' && (
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: cardBorder }}>
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: mutedText }}>
                Tu respuesta al comprador
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Explicá qué pasó con la encomienda..."
                className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                style={inputStyle}
              />
              <div className="flex justify-end">
                <span className="text-[10px]" style={{ color: mutedText }}>
                  {responseText.length} / 2000
                </span>
              </div>
            </div>
          )}

          {mode === 'resolve' && (
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: cardBorder }}>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: mutedText }}>
                  Tipo de resolución
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'proof_of_delivery' as const, label: 'Prueba de entrega (foto/firma)' },
                    { value: 'refund' as const, label: 'Reembolso al comprador' },
                    { value: 'replacement' as const, label: 'Ofrecer reemplazo' },
                  ].map((opt) => {
                    const active = resolutionType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setResolutionType(opt.value)}
                        className="text-left px-3 py-2.5 rounded-xl border transition text-xs font-bold cursor-pointer"
                        style={{
                          borderColor: active ? primary : cardBorder,
                          backgroundColor: active ? `${primary}15` : 'transparent',
                          color: textColor,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {resolutionType === 'refund' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: mutedText }}>
                    Monto (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={resolutionAmount}
                    onChange={(e) => setResolutionAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: mutedText }}>
                  Notas (opcional)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Detalles adicionales..."
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="px-5 py-4 border-t flex justify-end gap-3 shrink-0 flex-wrap"
          style={{ borderColor: cardBorder }}
        >
          {mode === 'view' && canRespond && (
            <button
              type="button"
              onClick={() => setMode('respond')}
              className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 inline-flex items-center gap-2"
              style={{ backgroundColor: primary, color: '#ffffff' }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Responder
            </button>
          )}

          {mode === 'view' && canResolve && (
            <button
              type="button"
              onClick={() => setMode('resolve')}
              className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 inline-flex items-center gap-2"
              style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Resolver
            </button>
          )}

          {mode === 'respond' && (
            <>
              <button
                type="button"
                onClick={() => setMode('view')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: cardBorder, color: textColor }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRespond}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                style={{ backgroundColor: primary, color: '#ffffff' }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enviar respuesta
              </button>
            </>
          )}

          {mode === 'resolve' && (
            <>
              <button
                type="button"
                onClick={() => setMode('view')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: cardBorder, color: textColor }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar resolución
              </button>
            </>
          )}

          {mode === 'view' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80"
              style={{ borderColor: cardBorder, color: textColor }}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}