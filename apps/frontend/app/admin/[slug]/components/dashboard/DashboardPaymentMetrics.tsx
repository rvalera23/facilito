'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getPriceColors } from '@/lib/priceTokens';
import { getDashboardTextColors } from '@/lib/dashboardTextColors';

interface DashboardPaymentMetricsProps {
  orders: any[];
  tenantId?: string;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  subtleBorderColor: string;
  bsRate?: number;
  onNavigate?: (section: string, filter?: any) => void;
}

const Icons = {
  Change: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Credit: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M6 15h4" />
    </svg>
  ),
  Methods: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  ),
  Partial: ({ color, size = 16 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
};

const METHOD_LABELS_ES: Record<string, string> = {
  cash: 'Efectivo',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  pos: 'Punto de Venta',
  biopago: 'Biopago',
  binance: 'Binance Pay',
  paypal: 'PayPal',
  crypto_wallet: 'Wallet Cripto',
  zimli: 'Zimli',
};

function formatBs(amount: number): string {
  if (!Number.isFinite(amount)) return '0,00';
  return amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DashboardPaymentMetrics = React.memo(function DashboardPaymentMetrics({
  orders = [],
  tenantId,
  primary,
  secondary,
  textColor,
  isDarkBg,
  subtleBorderColor,
  bsRate = 0,
  onNavigate,
}: DashboardPaymentMetricsProps) {
  const cardBg = secondary || (isDarkBg ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)');
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  // 🔥 Colores de precio unificados
  const priceColors = useMemo(
    () => getPriceColors({ primary, isDarkBg }),
    [primary, isDarkBg]
  );

  // 🔥 Colores de texto unificados (mismo módulo que el resto del dashboard)
  const textColors = getDashboardTextColors(isDarkBg);

  const [creditSummary, setCreditSummary] = useState<{
    totalBalance: number;
    usersCount: number;
  }>({ totalBalance: 0, usersCount: 0 });

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const apiBase =
          process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(
          `${apiBase}/api/account/credit/summary?tenantId=${tenantId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;

        setCreditSummary({
          totalBalance: Number(data?.totalBalance || 0),
          usersCount: Number(data?.usersCount || 0),
        });
      } catch (err) {
        console.warn('⚠️ [DashboardPaymentMetrics] Saldo summary:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  // 🔥 NUEVO: lista de users con saldo (fetch on-demand)
  const [creditUsers, setCreditUsers] = useState<
    Array<{
      userId: string;
      userName: string | null;
      userEmail: string | null;
      balance: number;
      updatedAt: string;
    }>
  >([]);
  const [showCreditUsers, setShowCreditUsers] = useState(false);
  const [loadingCreditUsers, setLoadingCreditUsers] = useState(false);
  const [creditUsersError, setCreditUsersError] = useState<string | null>(null);

  const fetchCreditUsers = useCallback(async () => {
    if (!tenantId) return;
    setLoadingCreditUsers(true);
    setCreditUsersError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCreditUsersError('Sin sesión');
        return;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(
        `${apiBase}/api/account/credit/users?tenantId=${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      setCreditUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('⚠️ [DashboardPaymentMetrics] Credit users:', err);
      setCreditUsersError('No se pudo cargar la lista.');
    } finally {
      setLoadingCreditUsers(false);
    }
  }, [tenantId]);

  const toggleCreditUsers = useCallback(() => {
    setShowCreditUsers((prev) => {
      const next = !prev;
      // Si abrimos y aún no hay data, fetch
      if (next && creditUsers.length === 0 && !loadingCreditUsers) {
        fetchCreditUsers();
      }
      return next;
    });
  }, [creditUsers.length, loadingCreditUsers, fetchCreditUsers]);

  const pendingChangeVes = useMemo(() => {
    let total = 0;
    safeOrders.forEach((o) => {
      const change = o?.paymentBreakdown?.change;
      if (!change) return;
      if (change.resolution === 'pending' && Number(change.amountVes) > 0) {
        total += Number(change.amountVes);
      }
    });
    return Math.round(total * 100) / 100;
  }, [safeOrders]);

  const partialOrdersCount = useMemo(() => {
    return safeOrders.filter(
      (o) => o?.paymentBreakdown?.status === 'partial',
    ).length;
  }, [safeOrders]);

  const topMethods = useMemo(() => {
    const map: Record<string, number> = {};
    safeOrders.forEach((o) => {
      const methods = o?.paymentBreakdown?.methods;
      if (!Array.isArray(methods)) return;
      methods.forEach((m: any) => {
        const type = String(m?.methodType || '').toLowerCase();
        if (!type) return;
        map[type] = (map[type] || 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([type, count]) => ({
        type,
        label: METHOD_LABELS_ES[type] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [safeOrders]);

  const topMethod = topMethods[0] || null;
  const totalMethodUsages = topMethods.reduce((acc, m) => acc + m.count, 0);

  const totalCreditVes = creditSummary.totalBalance;
  const usersWithCredit = creditSummary.usersCount;
  const creditUsd = bsRate > 0 ? totalCreditVes / bsRate : 0;

  const handlePendingChangeClick = useCallback(() => {
    if (onNavigate) onNavigate('orders', { filter: 'pending_change' });
  }, [onNavigate]);

  const handlePartialClick = useCallback(() => {
    if (onNavigate) onNavigate('orders', { filter: 'partial' });
  }, [onNavigate]);

  const handleMethodsClick = useCallback(() => {
    if (onNavigate) onNavigate('orders', { filter: 'methods' });
  }, [onNavigate]);

  return (
    <div className="space-y-3">


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="border p-4 rounded-2xl space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
          onClick={handlePendingChangeClick}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: textColors.title }}
            >
              <Icons.Change color={textColors.title} size={12} />
              Vuelto Pendiente
            </span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Icons.Change color="#f59e0b" size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight" style={{ color: primary }}>
              Bs. {formatBs(pendingChangeVes)}
            </h3>
            <p className="text-[10px]" style={{ color: textColors.smallText }}>
              {bsRate > 0 ? `($${formatBs(pendingChangeVes / bsRate)})` : 'Sin tasa'} pendiente de entregar
            </p>
          </div>
        </div>

        <div
          className="border p-4 rounded-2xl space-y-2 transition-all duration-300"
          style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: textColors.title }}
            >
              <Icons.Credit color={textColors.title} size={12} />
              Saldos a Favor
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Icons.Credit color={priceColors.foreign} size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight" style={{ color: priceColors.foreign }}>
              Bs. {formatBs(totalCreditVes)}
            </h3>
            <p className="text-[10px]" style={{ color: textColors.smallText }}>
              {bsRate > 0 ? `($${formatBs(creditUsd)}) · ` : ''}
              {usersWithCredit} cliente{usersWithCredit === 1 ? '' : 's'} con saldo
            </p>
          </div>

          {/* 🔥 NUEVO: botón para ver/ocultar la lista de clientes con saldo */}
          {usersWithCredit > 0 && (
            <button
              type="button"
              onClick={toggleCreditUsers}
              className="w-full mt-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer flex items-center justify-center gap-1"
              style={{
                borderColor: `${primary}40`,
                backgroundColor: `${primary}10`,
                color: primary,
              }}
            >
              {showCreditUsers ? 'Ocultar clientes' : `Ver ${usersWithCredit} cliente${usersWithCredit === 1 ? '' : 's'}`}
              <span className={`transition-transform text-[8px] ${showCreditUsers ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          )}

          {/* 🔥 NUEVO: lista expandible de users con saldo */}
          {showCreditUsers && (
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: subtleBorderColor }}>
              {loadingCreditUsers && (
                <p className="text-[10px] text-center py-2" style={{ color: textColor, opacity: 0.5 }}>
                  Cargando clientes...
                </p>
              )}

              {!loadingCreditUsers && creditUsersError && (
                <p className="text-[10px] text-center py-2 text-rose-500">
                  {creditUsersError}
                </p>
              )}

              {!loadingCreditUsers && !creditUsersError && creditUsers.length === 0 && (
                <p className="text-[10px] text-center py-2" style={{ color: textColor, opacity: 0.5 }}>
                  No hay clientes con saldo.
                </p>
              )}

              {!loadingCreditUsers && !creditUsersError && creditUsers.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {creditUsers.map((u) => (
                    <div
                      key={u.userId}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg"
                      style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate" style={{ color: textColor }}>
                          {u.userName || 'Usuario'}
                        </p>
                        <p className="text-[9px] truncate" style={{ color: textColors.smallText }}>
                          {u.userEmail || u.userId.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-black" style={{ color: priceColors.foreign }}>
                          Bs. {formatBs(u.balance)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="border p-4 rounded-2xl space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
          onClick={handleMethodsClick}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: textColors.title }}
            >
              <Icons.Methods color={textColors.title} size={12} />
              Método Más Usado
            </span>
            <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Icons.Methods color="#818cf8" size={16} />
            </div>
          </div>
          <div>
            {topMethod ? (
              <>
                <h3 className="text-sm font-bold tracking-tight truncate" style={{ color: textColor }}>
                  {topMethod.label}
                </h3>
                <p className="text-[10px]" style={{ color: textColor, opacity: 0.6 }}>
                  {topMethod.count} uso{topMethod.count === 1 ? '' : 's'}
                  {totalMethodUsages > 0
                    ? ` · ${((topMethod.count / totalMethodUsages) * 100).toFixed(0)}% del total`
                    : ''}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
                Sin datos aún
              </p>
            )}
          </div>
        </div>

        <div
          className="border p-4 rounded-2xl space-y-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: cardBg, borderColor: subtleBorderColor }}
          onClick={handlePartialClick}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: textColors.title }}
            >
              <Icons.Partial color={textColors.title} size={12} />
              Pagos Parciales
            </span>
            <div className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Icons.Partial color="#f87171" size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight" style={{ color: '#f87171' }}>
              {partialOrdersCount}
            </h3>
            <p className="text-[10px]" style={{ color: textColors.smallText }}>
              orden{partialOrdersCount === 1 ? '' : 'es'} con pago incompleto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardPaymentMetrics.displayName = 'DashboardPaymentMetrics';
export default DashboardPaymentMetrics;