'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState } from '@/components/ui/EmptyState';
interface StockMovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

interface Movement {
  id: string;
  productId: string;
  tenantId: string;
  delta: number;
  previousQty: number;
  newQty: number;
  reason: string;
  note?: string | null;
  userId?: string | null;
  createdAt: string;
}

// 🔥 Configuración visual por tipo de movimiento
const REASON_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  restock:     { label: 'Reabastecimiento', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: '+' },
  sale:        { label: 'Venta',            color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: '−' },
  adjustment:  { label: 'Ajuste manual',    color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', icon: '±' },
  return:      { label: 'Devolución',       color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: '↺' },
  damage:      { label: 'Daño / Pérdida',   color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: '!' },
  initial:     { label: 'Stock inicial',    color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', icon: '◉' },
};

const getReasonConfig = (reason: string) =>
  REASON_CONFIG[reason] || {
    label: reason || 'Otro',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    icon: '·',
  };

// 🔥 Formateo de fecha
const formatDate = (iso: string): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export default function StockMovementHistoryModal({
  isOpen,
  onClose,
  product,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: StockMovementHistoryModalProps) {

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Paleta
  const cardBg = secondary || (isDarkBg ? '#0f172a' : '#ffffff');
  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)';
  const mutedText = isDarkBg ? '#94a3b8' : '#64748b';

  const productId = product?.id;
  const productName = product?.name || 'Producto';

  // 🔥 Fetch del historial
  const fetchMovements = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const dynamicBase =
        process.env.NEXT_PUBLIC_API_URL ||
        `http://${apiHost}:3000`;
      const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

      const url = `${cleanBase}/products/${productId}/movements`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ [StockMovementHistory] Error:', e);
      setError(e instanceof Error ? e.message : 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen && productId) {
      fetchMovements();
    } else {
      setMovements([]);
      setError(null);
    }
  }, [isOpen, productId, fetchMovements]);

  // Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: overlayBg }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderDynamic}`,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex justify-between items-center shrink-0"
          style={{ borderColor: borderDynamic }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: primary }}
            />
            <div className="min-w-0">
              <span
                className="text-[10px] uppercase tracking-wider font-extrabold block"
                style={{ color: primary }}
              >
                Historial de Stock
              </span>
              <h3
                className="text-sm font-bold truncate"
                style={{ color: textColor }}
              >
                {productName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchMovements}
              disabled={loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-white/10 disabled:opacity-40"
              style={{ color: textColor }}
              title="Recargar"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-white/10"
              style={{ color: textColor }}
              title="Cerrar"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading */}
          {loading && movements.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{
                  borderTopColor: 'transparent',
                  borderRightColor: primary,
                  borderBottomColor: primary,
                  borderLeftColor: primary,
                }}
              />
              <span className="text-xs opacity-60" style={{ color: textColor }}>
                Cargando historial...
              </span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div
              className="p-4 rounded-xl border text-center text-xs"
              style={{
                borderColor: 'rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && movements.length === 0 && (
            <EmptyState
              icon={
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
              title="No hay movimientos registrados todavía"
              message="Los ajustes de stock aparecerán acá."
              primary={primary}
              textColor={textColor}
              borderColor={borderDynamic}
              cardBg={cardBg}
              isDarkBg={isDarkBg}
              padding="py-10"
            />
          )}

          {/* Lista */}
          {!loading && !error && movements.length > 0 && (
            <ul className="space-y-2">
              {movements.map((mv) => {
                const config = getReasonConfig(mv.reason);
                const isPositive = mv.delta > 0;
                const isNegative = mv.delta < 0;
                const deltaColor = isPositive
                  ? (isDarkBg ? '#4ade80' : '#15803d')
                  : isNegative
                  ? (isDarkBg ? '#f87171' : '#dc2626')
                  : (isDarkBg ? '#94a3b8' : '#64748b');

                return (
                  <li
                    key={mv.id}
                    className="p-3 rounded-xl border transition hover:bg-white/5"
                    style={{
                      borderColor: borderDynamic,
                      backgroundColor: isDarkBg
                        ? 'rgba(255, 255, 255, 0.02)'
                        : 'rgba(0, 0, 0, 0.01)',
                    }}
                  >
                    {/* Fila 1: fecha + badge de tipo */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: mutedText }}
                      >
                        {formatDate(mv.createdAt)}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
                        style={{
                          color: config.color,
                          borderColor: `${config.color}40`,
                          backgroundColor: config.bg,
                        }}
                      >
                        <span className="text-[10px] leading-none">{config.icon}</span>
                        {config.label}
                      </span>
                    </div>

                    {/* Fila 2: delta grande + cantidad anterior → nueva */}
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-base font-extrabold tracking-tight"
                          style={{ color: deltaColor }}
                        >
                          {isPositive ? '+' : ''}
                          {mv.delta}
                        </span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: mutedColor(textColor, mutedText) }}
                        >
                          {mv.previousQty} → {mv.newQty}
                        </span>
                      </div>
                    </div>

                    {/* Fila 3: nota */}
                    {mv.note && (
                      <p
                        className="text-[10px] mt-1.5 italic opacity-70 truncate"
                        style={{ color: textColor }}
                        title={mv.note}
                      >
                        "{mv.note}"
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex justify-between items-center shrink-0"
          style={{ borderColor: borderDynamic }}
        >
          <span className="text-[10px] opacity-50" style={{ color: textColor }}>
            {movements.length > 0
              ? `${movements.length} movimiento${movements.length === 1 ? '' : 's'}`
              : 'Sin movimientos'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl transition hover:opacity-80"
            style={{
              backgroundColor: isDarkBg
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
              color: textColor,
              border: `1px solid ${borderDynamic}`,
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Helper para opacidad de texto
function mutedColor(textColor: string, _muted: string): string {
  return textColor;
}