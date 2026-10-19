'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Wallet, Store, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

interface CreditTenant {
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  tenantLogo: string | null;
  balance: number;
  updatedAt: string;
}

interface CreditTabProps {
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

const formatAmount = (n: number): string => {
  if (!Number.isFinite(n)) return '0,00';
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export default function CreditTab({
  primary,
  secondary,
  textColor,
  isDarkBg,
}: CreditTabProps) {
  // 🔥 Rate de cambio para mostrar el monto en USD
  const { rates } = useExchangeRateContext();
  const usdRate = rates?.USD || 0;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditTenant[]>([]);

  const subtleBorderColor = isDarkBg
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.08)';

  const cardBg =
    secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/account/credit/tenants');
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const data = await res.json();
      setCredits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('❌ [CreditTab] Error:', err);
      setError('No se pudo cargar tu saldo a favor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const total = credits.reduce((sum, c) => sum + (c.balance || 0), 0);

  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full"
      style={{
        backgroundColor: cardBg,
        borderColor: subtleBorderColor,
        color: textColor,
      }}
    >
      {/* Header */}
      <div
        className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: subtleBorderColor }}
      >
        <div>
          <h3
            className="font-extrabold text-base tracking-tight flex items-center gap-2"
            style={{ color: textColor }}
          >
            <Wallet className="w-4 h-4" style={{ color: primary }} />
            Saldo a favor
          </h3>
          <p
            className="text-[11px] opacity-75 mt-0.5"
            style={{ color: textColor }}
          >
            Saldo disponible en cada tienda. Se genera cuando conviertes un
            vuelto en saldo a favor.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchCredits}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-80 disabled:opacity-40"
          style={{
            borderColor: subtleBorderColor,
            color: textColor,
            backgroundColor: isDarkBg
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Actualizar
        </button>
      </div>

      {/* Total */}
      {!loading && !error && credits.length > 0 && (
        <div
          className="p-4 rounded-2xl border"
          style={{
            borderColor: `${primary}40`,
            backgroundColor: `${primary}10`,
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider font-bold mb-1"
            style={{ color: primary }}
          >
            Total a favor
          </div>
          <div className="text-2xl font-extrabold" style={{ color: primary }}>
            Bs. {formatAmount(total)}
          </div>
          {usdRate > 0 && (
            <div
              className="text-[13px] font-bold mt-1 opacity-80"
              style={{ color: textColor }}
            >
              ≈ ${formatAmount(total / usdRate)}
            </div>
          )}
          <div
            className="text-[11px] opacity-70 mt-1"
            style={{ color: textColor }}
          >
            En {credits.length} {credits.length === 1 ? 'tienda' : 'tiendas'}
          </div>
        </div>
      )}

      {/* Estados */}
      {loading && (
        <div className="text-center py-12 opacity-60 text-sm">
          Cargando tu saldo a favor...
        </div>
      )}

      {!loading && error && (
        <div
          className="p-4 rounded-2xl border flex items-center gap-3"
          style={{
            borderColor: 'rgba(239,68,68,0.3)',
            backgroundColor: 'rgba(239,68,68,0.08)',
          }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="text-sm text-red-500">{error}</div>
        </div>
      )}

      {!loading && !error && credits.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Wallet
            className="w-12 h-12 mx-auto opacity-20"
            style={{ color: textColor }}
          />
          <p
            className="text-sm font-medium opacity-70"
            style={{ color: textColor }}
          >
            No tienes saldo a favor por ahora
          </p>
          <p className="text-xs opacity-40" style={{ color: textColor }}>
            Cuando elijas recibir un vuelto como saldo a favor, aparecerá aquí.
          </p>
        </div>
      )}

      {/* Lista */}
      {!loading && !error && credits.length > 0 && (
        <div className="space-y-2">
          {credits.map((c) => {
            const usdBalance = usdRate > 0 ? c.balance / usdRate : null;
            return (
              <div
                key={c.tenantId}
                className="p-4 rounded-2xl border flex items-center justify-between gap-3"
                style={{ borderColor: subtleBorderColor }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {c.tenantLogo ? (
                    <img
                      src={c.tenantLogo}
                      alt={c.tenantName || 'Tienda'}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border"
                      style={{ borderColor: subtleBorderColor }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${primary}20` }}
                    >
                      <Store className="w-5 h-5" style={{ color: primary }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {c.tenantSlug ? (
                      <Link
                        href={`/tienda/${c.tenantSlug}`}
                        className="font-bold text-sm truncate hover:underline block"
                        style={{ color: primary }}
                      >
                        {c.tenantName || c.tenantSlug}
                      </Link>
                    ) : (
                      <div
                        className="font-bold text-sm truncate"
                        style={{ color: textColor }}
                      >
                        {c.tenantName || 'Tienda'}
                      </div>
                    )}
                    <div
                      className="text-[10px] opacity-60"
                      style={{ color: textColor }}
                    >
                      Actualizado: {formatDate(c.updatedAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-extrabold text-base"
                    style={{ color: primary }}
                  >
                    Bs. {formatAmount(c.balance)}
                  </div>
                  {usdBalance != null && (
                    <div
                      className="text-[10px] opacity-70"
                      style={{ color: textColor }}
                    >
                      ≈ ${formatAmount(usdBalance)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}