'use client';

// ============================================================
// ARCHIVO: app/repartidor/page.tsx
// Layout del repartidor: sidebar + header + contenido.
// Mismo patrón que /mi-cuenta y /admin/[slug].
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Clock, User as UserIcon, AlertCircle } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useMyDriverProfile } from '@/hooks/useMyDriverProfile';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import RepartidorSidebar, { RepartidorTab } from './components/RepartidorSidebar';
import RepartidorHeader from './components/RepartidorHeader';
import DriverStatusToggle from './components/DriverStatusToggle';
import AssignmentCard from './components/AssignmentCard';
import PerfilTab from './components/PerfilTab';
import { performLogout } from '@/lib/auth/logout';
import { ToastThemeProvider } from '@/components/ui/ToastThemeProvider';
import { formatPhoneDisplay } from '@/lib/formatPhone';

const VALID_TABS: readonly RepartidorTab[] = ['pedidos', 'historial', 'perfil'];

// 🔥 Traducir status del repartidor al español
const DRIVER_STATUS_LABELS: Record<string, string> = {
  online: 'Disponible',
  offline: 'No disponible',
  busy: 'Ocupado',
  paused: 'Pausado',
  active: 'Activo',
  inactive: 'Inactivo',
};

function formatDriverStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const normalized = String(status).toLowerCase().trim();
  return DRIVER_STATUS_LABELS[normalized] || status;
}

export default function RepartidorPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = usePersistedState<RepartidorTab>(
    'repartidor_active_tab',
    'pedidos',
    {
      validate: (v): v is RepartidorTab =>
        typeof v === 'string' && (VALID_TABS as readonly string[]).includes(v),
    },
  );

  // Check de auth + rol
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.replace('/');
      return;
    }

    let user: any = null;
    try {
      if (userStr) user = JSON.parse(userStr);
    } catch {}

    if (!user || !user.role) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        user = JSON.parse(atob(base64));
      } catch {}
    }

    const role = user?.role || user?.activeRole;

    if (
      role !== 'repartidor' &&
      role !== 'admin' &&
      role !== 'seller' &&
      role !== 'owner'
    ) {
      setAuthError('Esta sección es solo para repartidores.');
      setIsAuthChecked(true);
      return;
    }

    setIsAuthChecked(true);
  }, [router]);

  const {
    driver,
    assignments,
    loading,
    error,
    setStatus,
    refresh,
    updateAssignmentStatus,
    updateProfile,
    uploadMyAvatar,
  } = useMyDriverProfile({ enabled: isAuthChecked && !authError });

  // 🔥 Cargar tema del tenant al que pertenece el repartidor.
  const {
    primary: PRIMARY,
    secondary: SECONDARY,
    accent: ACCENT,
    background: BACKGROUND,
    textColor: THEME_TEXT_COLOR,
    textMuted: THEME_TEXT_MUTED,
    borderDynamic: THEME_BORDER,
    cardBg: THEME_CARD_BG,
    isDarkBg: THEME_IS_DARK,
    loading: themeLoading,      // 🔥 NUEVO: exposición del loading del theme
  } = useTenantTheme(driver?.tenantId || null);

  // Historial de assignments (delivered/cancelled/rejected)
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isAuthChecked || authError) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(
        `${apiBase}/delivery/drivers/me/assignments/history`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setHistoryError(err?.message || 'Error cargando historial');
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthChecked, authError]);

  // Cargar historial al entrar a la tab
  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Orden: asignados primero, después aceptados, después en camino
  const sortedAssignments = useMemo(() => {
    const weight = (s: string) => {
      if (s === 'assigned') return 0;
      if (s === 'accepted') return 1;
      if (s === 'picked_up') return 2;
      return 3;
    };
    return [...assignments].sort((a, b) => weight(a.status) - weight(b.status));
  }, [assignments]);

  const handleLogout = () => {
    performLogout({ redirectTo: '/' });
  };

  // ---------------- Loading inicial ----------------
  // 🔥 Esperar a que el theme del tenant esté cargado antes de mostrar la UI.
  const isThemePending = Boolean(driver?.tenantId) && themeLoading;

  if (!isAuthChecked || (loading && !driver && !authError) || isThemePending) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)' }}
          />
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {isThemePending ? 'Cargando tema...' : 'Cargando tu perfil...'}
          </div>
        </div>
      </div>
    );
  }
  // ---------------- Auth error ----------------
  if (authError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: BACKGROUND, color: THEME_TEXT_COLOR }}
      >
        <div className="max-w-sm w-full rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
          <div className="text-sm font-bold text-rose-300">{authError}</div>
          <button
            onClick={() => router.replace('/')}
            className="w-full px-4 py-2.5 rounded-2xl bg-rose-500 text-white font-bold text-xs hover:opacity-90 cursor-pointer"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  // ---------------- No es driver ----------------
  if (!driver) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: BACKGROUND, color: THEME_TEXT_COLOR }}
      >
        <div className="max-w-sm w-full rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
          <div className="text-sm font-bold text-amber-300">
            No estás registrado como repartidor
          </div>
          <div className="text-[11px]" style={{ color: THEME_TEXT_MUTED }}>
            Pedile a tu tienda que te dé de alta como repartidor.
          </div>  
          <button
            onClick={() => router.replace('/')}
            className="w-full px-4 py-2.5 rounded-2xl bg-amber-500 text-white font-bold text-xs hover:opacity-90 cursor-pointer"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Layout principal ----------------
  return (
    <ToastThemeProvider
      primary={PRIMARY}
      textColor={THEME_TEXT_COLOR}
      cardBg={THEME_CARD_BG}
      borderColor={THEME_BORDER}
      isDarkBg={THEME_IS_DARK}
    >
    <div
      className="h-screen w-full flex overflow-hidden"
      style={{ backgroundColor: BACKGROUND, color: THEME_TEXT_COLOR }}
    >
      {/* Sidebar */}
      <RepartidorSidebar
        userName={driver.user?.name || 'Repartidor'}
        avatarSource={driver.user?.avatarUrl || null}
        status={driver.status}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        primary={PRIMARY}
        secondary={SECONDARY}
        textColor={THEME_TEXT_COLOR}
        isDarkBg={THEME_IS_DARK}
        onLogout={handleLogout}
        pedidosCount={sortedAssignments.length}
      />

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden">
        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <RepartidorHeader
            userName={driver.user?.name || 'Repartidor'}
            avatarUrl={driver.user?.avatarUrl || null}
            status={driver.status}
            activeTab={activeTab}
            textColor={THEME_TEXT_COLOR}
            primary={PRIMARY}
            secondary={SECONDARY}
            isDarkBg={THEME_IS_DARK}
          />

          {/* Error banner */}
          {error && (
            <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Toggle online/offline */}
          <DriverStatusToggle
            status={driver.status}
            onChange={setStatus}
            primary={PRIMARY}
            textMuted={THEME_TEXT_MUTED}
            activeAssignments={sortedAssignments.length}
          />

          {/* Contenido según tab */}
          {activeTab === 'pedidos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: THEME_TEXT_MUTED }}
                >
                  Pedidos activos
                </h2>
                {sortedAssignments.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${PRIMARY}25`, color: PRIMARY }}
                  >
                    {sortedAssignments.length}
                  </span>
                )}
              </div>

              {sortedAssignments.length === 0 ? (
                <div
                  className="rounded-3xl border p-8 text-center space-y-2"
                  style={{
                    backgroundColor: THEME_CARD_BG,
                    borderColor: THEME_BORDER,
                  }}
                >
                  <Inbox
                    className="w-10 h-10 mx-auto"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.5 }}
                  />
                  <div
                    className="text-xs font-bold"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Sin pedidos asignados
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.7 }}
                  >
                    {driver.status === 'online'
                      ? 'Esperando pedidos nuevos...'
                      : 'Activate online para recibir pedidos'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAssignments.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      onUpdateStatus={updateAssignmentStatus}
                      primary={PRIMARY}
                      accent={ACCENT}
                      textColor={THEME_TEXT_COLOR}
                      textMuted={THEME_TEXT_MUTED}
                      cardBg={THEME_CARD_BG}
                      borderDynamic={THEME_BORDER}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: THEME_TEXT_MUTED }}
                >
                  Historial
                </h2>
                {history.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${PRIMARY}25`, color: PRIMARY }}
                  >
                    {history.length}
                  </span>
                )}
              </div>

              {historyLoading ? (
                <div
                  className="rounded-3xl border p-8 text-center space-y-2"
                  style={{
                    backgroundColor: THEME_CARD_BG,
                    borderColor: THEME_BORDER,
                  }}
                >
                  <div
                    className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                    style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }}
                  />
                  <div
                    className="text-[10px]"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Cargando historial...
                  </div>
                </div>
              ) : historyError ? (
                <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
                  <div className="text-xs font-bold text-rose-300">
                    {historyError}
                  </div>
                  <button
                    onClick={fetchHistory}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold hover:opacity-90"
                  >
                    Reintentar
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div
                  className="rounded-3xl border p-8 text-center space-y-2"
                  style={{
                    backgroundColor: THEME_CARD_BG,
                    borderColor: THEME_BORDER,
                  }}
                >
                  <Clock
                    className="w-10 h-10 mx-auto"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.5 }}
                  />
                  <div
                    className="text-xs font-bold"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Sin pedidos en el historial
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.7 }}
                  >
                    Los pedidos entregados van a aparecer acá.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      onUpdateStatus={async () => {
                        // no-op: los del historial no se actualizan
                      }}
                      primary={PRIMARY}
                      accent={ACCENT}
                      textColor={THEME_TEXT_COLOR}
                      textMuted={THEME_TEXT_MUTED}
                      cardBg={THEME_CARD_BG}
                      borderDynamic={THEME_BORDER}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'perfil' && (
            <PerfilTab
              driver={driver}
              primary={PRIMARY}
              secondary={SECONDARY}
              accent={ACCENT}
              textColor={THEME_TEXT_COLOR}
              textMuted={THEME_TEXT_MUTED}
              cardBg={THEME_CARD_BG}
              borderDynamic={THEME_BORDER}
              isDarkBg={THEME_IS_DARK}
              onUpdated={refresh}
              updateProfile={updateProfile}
              uploadMyAvatar={uploadMyAvatar}
            />
          )}
        </div>
      </main>
    </div>
    </ToastThemeProvider>
  );
}
