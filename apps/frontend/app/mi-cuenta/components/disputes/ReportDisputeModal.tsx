'use client';

import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/useToast';

const REASONS = [
  { value: 'not_received', label: 'No recibí mi pedido' },
  { value: 'wrong_item', label: 'Producto equivocado' },
  { value: 'damaged', label: 'Producto dañado' },
  { value: 'late', label: 'Llegó tarde' },
] as const;

type DisputeReason = (typeof REASONS)[number]['value'];

interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  primary: string;
  secondary: string;
  textColor: string;
  mutedText: string;
  cardBorder: string;
  isDarkBg: boolean;
  onCreated?: () => void;
}

export default function ReportDisputeModal({
  isOpen,
  onClose,
  order,
  primary,
  secondary,
  textColor,
  mutedText,
  cardBorder,
  isDarkBg,
  onCreated,
}: ReportDisputeModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState<DisputeReason>('not_received');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setReason('not_received');
      setMessage('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const bgColor = secondary || (isDarkBg ? '#1e293b' : '#ffffff');

  const handleSubmit = async () => {
    setError(null);

    if (message.trim().length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.');
      return;
    }
    if (message.trim().length > 2000) {
      setError('La descripción no puede superar los 2000 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/shipping-disputes', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          reason,
          buyerMessage: message.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          err?.message ||
          (Array.isArray(err?.message) ? err.message.join(' ') : null) ||
          'No se pudo enviar el reporte.';
        throw new Error(msg);
      }

      showToast({
        variant: 'success',
        message: 'Reporte enviado. El vendedor tiene 5 días hábiles para responder.',
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('globalRefresh'));
        window.dispatchEvent(new Event('notificationUpdate'));
      }

      if (onCreated) onCreated();
      onClose();
    } catch (e: any) {
      const msg = e?.message || 'Error al enviar el reporte';
      setError(msg);
      showToast({ variant: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: bgColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: cardBorder }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#f59e0b20' }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="text-sm font-black" style={{ color: textColor }}>
                Reportar problema
              </h2>
              <p className="text-[10px]" style={{ color: mutedText }}>
                Orden #{String(order.id).slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
            style={{ color: mutedText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Motivo */}
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-2"
              style={{ color: mutedText }}
            >
              Motivo del reporte
            </label>
            <div className="grid grid-cols-1 gap-2">
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className="text-left px-3 py-2.5 rounded-xl border transition text-xs font-bold"
                    style={{
                      borderColor: active ? primary : cardBorder,
                      backgroundColor: active ? `${primary}15` : 'transparent',
                      color: textColor,
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-2"
              style={{ color: mutedText }}
            >
              Descripción del problema
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contá qué pasó con tu encomienda..."
              rows={5}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
              style={{
                backgroundColor: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                color: textColor,
                border: `1px solid ${cardBorder}`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: mutedText }}>
                Mínimo 10 caracteres
              </span>
              <span className="text-[10px]" style={{ color: mutedText }}>
                {message.length} / 2000
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="p-3 rounded-xl border flex items-start gap-2"
              style={{ borderColor: '#ef444440', backgroundColor: '#ef444410' }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <span className="text-[11px]" style={{ color: '#ef4444' }}>
                {error}
              </span>
            </div>
          )}

          {/* Aviso */}
          <div
            className="p-3 rounded-xl text-[10px] leading-relaxed"
            style={{
              backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
              color: mutedText,
            }}
          >
            Al enviar el reporte, el vendedor tendrá <strong>5 días hábiles</strong> para responder.
            Si no lo hace, se procesará un reembolso automático a tu saldo a favor.
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="px-5 py-4 border-t flex justify-end gap-3 shrink-0"
          style={{ borderColor: cardBorder }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
            style={{ backgroundColor: primary, color: '#ffffff' }}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
}