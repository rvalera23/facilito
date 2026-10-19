'use client';

// ============================================================
// ARCHIVO: app/profesional/page.tsx
// Layout del profesional: sidebar + header + contenido.
// Mismo patrón que /repartidor.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User as UserIcon, AlertCircle } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useMyProfessionalProfile } from '@/hooks/useMyProfessionalProfile';
import { useTenantTheme, getContrastTextColor } from '@/hooks/useTenantTheme';
import ProfessionalSidebar, {
  ProfessionalTab,
} from './components/ProfessionalSidebar';
import ProfessionalHeader from './components/ProfessionalHeader';
import AvailabilityToggle from './components/AvailabilityToggle';
import AppointmentCard from './components/AppointmentCard';
import { performLogout } from '@/lib/auth/logout';
import { formatPhoneDisplay } from '@/lib/formatPhone';

const VALID_TABS: readonly ProfessionalTab[] = ['citas', 'historial', 'perfil'];

// 🔥 Traducir status del profesional al español
const PROFESSIONAL_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  online: 'Disponible',
  offline: 'No disponible',
  busy: 'Ocupado',
  paused: 'Pausado',
  pending: 'Pendiente',
  suspended: 'Suspendido',
};

function formatProfessionalStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const normalized = String(status).toLowerCase().trim();
  return PROFESSIONAL_STATUS_LABELS[normalized] || status;
}

export default function ProfesionalPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = usePersistedState<ProfessionalTab>(
    'profesional_active_tab',
    'citas',
    {
      validate: (v): v is ProfessionalTab =>
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
      role !== 'profesional' &&
      role !== 'admin' &&
      role !== 'seller' &&
      role !== 'owner'
    ) {
      setAuthError('Esta sección es solo para profesionales.');
      setIsAuthChecked(true);
      return;
    }

    setIsAuthChecked(true);
  }, [router]);

  const {
    professional,
    bookings,
    history,
    loading,
    error,
    refresh,
    setAvailability,
    updateBookingStatus,
  } = useMyProfessionalProfile({ enabled: isAuthChecked && !authError });

  // 🔥 Cargar tema del tenant al que pertenece el profesional.
  // Aplica los colores + fuente de la tienda al panel.
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
} = useTenantTheme(professional?.tenantId || null);

  // Orden: pendientes primero, después confirmadas, después en curso
  const sortedBookings = useMemo(() => {
    const weight = (s: string) => {
      if (s === 'pending') return 0;
      if (s === 'confirmed') return 1;
      if (s === 'in_progress') return 2;
      return 3;
    };
    return [...bookings].sort((a, b) => weight(a.status) - weight(b.status));
  }, [bookings]);

  const handleLogout = () => {
    performLogout({ redirectTo: '/' });
  };

  // ---------------- Loading inicial ----------------
  // 🔥 Esperar a que el theme del tenant esté cargado antes de mostrar la UI
  // (si hay tenantId). Si no hay tenantId todavía, esperar al profile.
  const isThemePending = Boolean(professional?.tenantId) && themeLoading;

  if (!isAuthChecked || (loading && !professional && !authError) || isThemePending) {
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
        <div className="max-w-sm w-full rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3"><AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
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

  // ---------------- No es professional ----------------
  if (!professional) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: BACKGROUND, color: THEME_TEXT_COLOR }}
      >
        <div className="max-w-sm w-full rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
          <div className="text-sm font-bold text-amber-300">
            No estás registrado como profesional
          </div>
          <div className="text-[11px]" style={{ color: THEME_TEXT_MUTED }}>
            Pedile a tu tienda que te dé de alta como profesional.
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
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: BACKGROUND, color: THEME_TEXT_COLOR }}
    >
      {/* Sidebar */}
      <ProfessionalSidebar
        userName={professional.user?.name || professional.name || 'Profesional'}
        avatarSource={professional.user?.avatarUrl || professional.coverImage || null}
        status={professional.status}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        primary={PRIMARY}
        secondary={SECONDARY}
        textColor={THEME_TEXT_COLOR}
        isDarkBg={THEME_IS_DARK}
        onLogout={handleLogout}
        citasCount={sortedBookings.length}
      />

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <ProfessionalHeader
            userName={professional.user?.name || professional.name || 'Profesional'}
            avatarUrl={professional.user?.avatarUrl || professional.coverImage || null}
            status={professional.status}
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

          {/* Toggle disponibilidad */}
<AvailabilityToggle
  status={professional.status === 'active' ? 'online' : 'offline'}
  onChange={setAvailability}
  primary={PRIMARY}
  textMuted={THEME_TEXT_MUTED}
  activeBookings={sortedBookings.length}
/>

          {/* Contenido según tab */}
          {activeTab === 'citas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: THEME_TEXT_MUTED }}
                >
                  Citas activas
                </h2>
                {sortedBookings.length > 0 && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${PRIMARY}25`, color: PRIMARY }}
                  >
                    {sortedBookings.length}
                  </span>
                )}
              </div>

              {sortedBookings.length === 0 ? (
                <div
                  className="rounded-3xl border p-8 text-center space-y-2"
                  style={{
                    backgroundColor: THEME_CARD_BG,
                    borderColor: THEME_BORDER,
                  }}
                >
                  <Calendar
                    className="w-10 h-10 mx-auto"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.5 }}
                  />
                  <div
                    className="text-xs font-bold"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Sin citas asignadas
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.7 }}
                  >
                    {professional.status === 'active'
                      ? 'Cuando un cliente reserve tus servicios, aparecerán acá.'
                      : 'Activate disponible para recibir citas'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedBookings.map((b) => (
<AppointmentCard
  key={b.id}
  booking={b}
  onUpdateStatus={updateBookingStatus}
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

              {history.length === 0 ? (
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
                    Sin citas en el historial
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: THEME_TEXT_MUTED, opacity: 0.7 }}
                  >
                    Las citas completadas van a aparecer acá.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((b) => (
                    <AppointmentCard
                      key={b.id}
                      booking={b}
                      onUpdateStatus={async () => {
                        // no-op: las del historial no se actualizan
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
            <div
              className="rounded-3xl border p-6 space-y-3"
              style={{
                backgroundColor: THEME_CARD_BG,
                borderColor: THEME_BORDER,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${PRIMARY}20`, color: PRIMARY }}
                >
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: THEME_TEXT_COLOR }}
                  >
                    {professional.name || 'Profesional'}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    {professional.specialties?.slice(0, 3).join(' · ') ||
                      'Sin especialidades'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-0.5">
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Email
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: THEME_TEXT_COLOR }}
                  >
                    {professional.user?.email || '—'}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Teléfono
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: THEME_TEXT_COLOR }}
                  >
                    {professional.user?.phone
                      ? formatPhoneDisplay(professional.user.phone)
                      : '—'}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Rating
                  </div>
                  <div className="text-xs font-bold" style={{ color: PRIMARY }}>
                    ★ {professional.rating}{' '}
                    <span
                      className="font-normal"
                      style={{ color: THEME_TEXT_MUTED }}
                    >
                      ({professional.reviewsCount})
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Estado
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: THEME_TEXT_COLOR }}
                  >
                    {formatProfessionalStatus(professional.status)}
                  </div>
                </div>
              </div>

              {professional.description && (
                <div
                  className="pt-3 border-t space-y-1"
                  style={{ borderColor: THEME_BORDER }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: THEME_TEXT_MUTED }}
                  >
                    Descripción
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: THEME_TEXT_COLOR }}
                  >
                    {professional.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
