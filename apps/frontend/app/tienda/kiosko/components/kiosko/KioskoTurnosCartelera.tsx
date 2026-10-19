'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useKioskQueue } from './hooks/useKioskQueue';

// ============================================================
// ICONOS SVG LOCALES (heredan color con `currentColor`)
// ============================================================
const IconClock = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCalendar = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconChevronRight = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconUsers = ({ className = 'w-7 h-7' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSparkles = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
  </svg>
);

// ============================================================
// ICONOS PARA ESTADOS VACÍOS
// ============================================================

// Luna durmiendo — "nadie en atención ahora"
const IconMoonRest = ({ className = 'w-24 h-24' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    <path d="M17 6h.01" />
    <path d="M14 10h.01" />
    <path d="M17.5 9.5h.01" />
  </svg>
);

// Chispa — "sin turnos próximos"
const IconSparkleEmpty = ({ className = 'w-24 h-24' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9L12 3z" />
    <path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
  </svg>
);

// Hoja — "sin espera"
const IconLeafEmpty = ({ className = 'w-24 h-24' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

// Sol con nube — "todo tranquilo"
const IconSunCloud = ({ className = 'w-28 h-28' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M20 12h2" />
    <path d="M19.07 4.93l-1.41 1.41" />
    <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
    <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z" />
  </svg>
);

// Advertencia — ErrorState
const IconWarning = ({ className = 'w-20 h-20' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ============================================================
// HELPERS DE COLOR
// ============================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ensureContrast(color: string, bgColor: string, minRatio = 3): string {
  const fgLum = getLuminance(color);
  const bgLum = getLuminance(bgColor);
  const ratio = fgLum > bgLum ? (fgLum + 0.05) / (bgLum + 0.05) : (bgLum + 0.05) / (fgLum + 0.05);
  if (ratio >= minRatio) return color;
  const bgIsLight = bgLum > 0.5;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const target = bgIsLight ? { r: 20, g: 20, b: 20 } : { r: 245, g: 245, b: 245 };
  const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const mixed = {
    r: mix(rgb.r, target.r, 0.6),
    g: mix(rgb.g, target.g, 0.6),
    b: mix(rgb.b, target.b, 0.6),
  };
  return `#${[mixed.r, mixed.g, mixed.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ============================================================
// KIOSKO TURNOS CARTELERA
// ============================================================

type ViewKey = 'now' | 'next' | 'waiting' | 'upcoming';

interface Props {
  isOpen: boolean;
  onTapToReserve: () => void;
  tenant?: any;
  logoSource?: string | null;
  bannerSource?: string | null;
  primary: string;
  secondary: string;
  isSecondaryLight: boolean;
  textColor: string;
  mutedTextColor: string;
  token: string | null;
  kioskSettings: any;
}

export default function KioskoTurnosCartelera({
  isOpen,
  onTapToReserve,
  tenant,
  logoSource,
  bannerSource,
  primary,
  secondary,
  isSecondaryLight,
  textColor,
  mutedTextColor,
  token,
  kioskSettings,
}: Props) {
  const { now, next, waiting, upcoming: upcomingRaw, loading, error } = useKioskQueue({
    token,
    settings: kioskSettings,
  });
  const upcoming = upcomingRaw ?? [];

  const panelSolidBg = isSecondaryLight ? '#ffffff' : '#0a0e18';
  const accentReadable = ensureContrast(primary, panelSolidBg, 3.5);

  const mutedColor = isSecondaryLight ? '#475569' : mutedTextColor;
  const panelBg = isSecondaryLight ? 'rgba(255,255,255,0.94)' : 'rgba(0,0,0,0.55)';
  const panelBorder = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.14)';

  const availableViews: ViewKey[] = useMemo(() => {
    const views: ViewKey[] = [];
    views.push('now');
    if (next.length > 0) views.push('next');
    views.push('waiting');
    if (upcoming.length > 0) views.push('upcoming');
    return views;
  }, [next.length, upcoming.length]);

  const [viewIndex, setViewIndex] = useState(0);

  useEffect(() => {
    if (viewIndex >= availableViews.length) setViewIndex(0);
  }, [availableViews.length, viewIndex]);

  useEffect(() => {
    if (!isOpen) return;
    if (availableViews.length <= 1) return;
    const timer = setInterval(() => {
      setViewIndex((i) => (i + 1) % availableViews.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isOpen, availableViews.length]);

  if (!isOpen) return null;

  const hasAnyToday = now.length > 0 || next.length > 0 || waiting.count > 0;
  const hasAnyUpcoming = upcoming.length > 0;
  const hasAnything = hasAnyToday || hasAnyUpcoming;
  const currentView = availableViews[viewIndex];

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col cursor-pointer select-none overflow-hidden"
      onClick={onTapToReserve}
    >
      {bannerSource ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: `url(${bannerSource})`, filter: 'blur(18px)' }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{ backgroundColor: secondary || '#090d16' }}
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          backgroundColor: isSecondaryLight
            ? 'rgba(0,0,0,0.15)'
            : 'rgba(0,0,0,0.35)',
        }}
      />
      
      <div className="relative z-10 flex flex-col h-full w-full">
        {/* HEADER */}
        <div className="flex flex-col items-center justify-center pt-8 sm:pt-10 pb-4 shrink-0">
          {logoSource ? (
            <img
              src={logoSource}
              alt={tenant?.name || 'Tienda'}
              className="h-14 sm:h-16 md:h-20 w-auto max-w-[220px] object-contain drop-shadow-2xl mb-3"
            />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3"
              style={{
                backgroundColor: `${accentReadable}25`,
                border: `2px solid ${accentReadable}50`,
                color: accentReadable,
              }}
            >
              <IconCalendar className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          )}

          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-center"
            style={{ color: textColor, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            {tenant?.name || 'Turnos en vivo'}
          </h1>

          <div className="flex items-center gap-2 mt-2" style={{ color: accentReadable }}>
            <IconSparkles className="w-3.5 h-3.5" />
            <p className="text-xs sm:text-sm font-medium" style={{ color: mutedColor }}>
              {loading && !hasAnything ? 'Cargando turnos…' : 'Toca la pantalla para reservar'}
            </p>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 py-4 min-h-0">
          {error && !hasAnything ? (
            <ErrorState message={error} textColor={textColor} mutedColor={mutedColor} accent={accentReadable} />
          ) : !hasAnything ? (
            <EmptyState textColor={textColor} mutedColor={mutedColor} accent={accentReadable} />
          ) : currentView === 'now' ? (
            <NowView
              items={now}
              accent={accentReadable}
              textColor={textColor}
              mutedColor={mutedColor}
              panelBg={panelBg}
              panelBorder={panelBorder}
            />
          ) : currentView === 'next' ? (
            <NextView
              items={next}
              accent={accentReadable}
              textColor={textColor}
              mutedColor={mutedColor}
              panelBg={panelBg}
              panelBorder={panelBorder}
            />
          ) : currentView === 'waiting' ? (
            <WaitingView
              count={waiting.count}
              estimatedMinutes={waiting.estimatedMinutes}
              accent={accentReadable}
              textColor={textColor}
              mutedColor={mutedColor}
            />
          ) : (
            <UpcomingView
              days={upcoming}
              accent={accentReadable}
              textColor={textColor}
              mutedColor={mutedColor}
              panelBg={panelBg}
              panelBorder={panelBorder}
            />
          )}
        </div>

        {/* DOTS */}
        <div className="flex items-center justify-center gap-2 pb-8 shrink-0">
          {availableViews.map((v, i) => (
            <div
              key={v}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === viewIndex ? 28 : 8,
                height: 8,
                backgroundColor:
                  i === viewIndex
                    ? accentReadable
                    : isSecondaryLight
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VISTAS
// ============================================================

interface ViewProps {
  accent: string;
  textColor: string;
  mutedColor: string;
  panelBg: string;
  panelBorder: string;
}

// Estado vacío reutilizable: círculo con icono SVG adentro.
function EmptyIconBadge({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center mb-2"
      style={{
        backgroundColor: `${accent}15`,
        border: `2px solid ${accent}30`,
        color: accent,
      }}
    >
      {children}
    </div>
  );
}

function NowView({
  items,
  accent,
  textColor,
  mutedColor,
  panelBg,
  panelBorder,
}: ViewProps & { items: ReturnType<typeof useKioskQueue>['now'] }) {
  if (items.length === 0) {
    return (
      <div className="text-center flex flex-col items-center space-y-4">
        <EmptyIconBadge accent={accent}>
          <IconMoonRest className="w-16 h-16 sm:w-20 sm:h-20" />
        </EmptyIconBadge>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-black mt-4" style={{ color: textColor }}>
          Nadie en atención ahora
        </p>
        <p className="text-base sm:text-lg" style={{ color: mutedColor }}>
          Los próximos turnos vienen en camino
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3" style={{ color: accent }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
        <span className="text-sm sm:text-base font-black uppercase tracking-widest">
          En curso
        </span>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {items.map((item) => (
          <div
            key={item.turnNumber}
            className="rounded-3xl p-6 sm:p-8 flex items-center gap-6 border-2"
            style={{
              backgroundColor: panelBg,
              borderColor: `${accent}55`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: `0 8px 32px ${accent}22`,
            }}
          >
            <div
              className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono tabular-nums tracking-tight shrink-0"
              style={{ color: accent }}
            >
              #{item.turnNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black truncate" style={{ color: textColor }}>
                {item.serviceName}
              </p>
              <p className="text-sm sm:text-base font-medium mt-1" style={{ color: mutedColor }}>
                {item.professionalName || 'Profesional por asignar'} · {item.startTime} - {item.endTime}
              </p>
              <p className="text-xs sm:text-sm font-bold mt-1" style={{ color: accent }}>
                Faltan {formatDuration(item.remainingMinutes)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextView({
  items,
  accent,
  textColor,
  mutedColor,
  panelBg,
  panelBorder,
}: ViewProps & { items: ReturnType<typeof useKioskQueue>['next'] }) {
  if (items.length === 0) {
    return (
      <div className="text-center flex flex-col items-center space-y-4">
        <EmptyIconBadge accent={accent}>
          <IconSparkleEmpty className="w-16 h-16 sm:w-20 sm:h-20" />
        </EmptyIconBadge>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-black mt-4" style={{ color: textColor }}>
          Sin turnos próximos
        </p>
        <p className="text-base sm:text-lg" style={{ color: mutedColor }}>
          Agenda libre por ahora
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3" style={{ color: accent }}>
        <IconChevronRight className="w-6 h-6" />
        <span className="text-sm sm:text-base font-black uppercase tracking-widest">
          Próximos
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {items.map((item, i) => (
          <div
            key={item.turnNumber}
            className="rounded-2xl p-5 sm:p-6 flex items-center gap-5 border"
            style={{
              backgroundColor: panelBg,
              borderColor: panelBorder,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums w-8 shrink-0" style={{ color: mutedColor }}>
              {i + 1}
            </div>
            <div
              className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono tabular-nums tracking-tight shrink-0"
              style={{ color: i === 0 ? accent : textColor }}
            >
              #{item.turnNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl sm:text-2xl font-black truncate" style={{ color: textColor }}>
                {item.serviceName}
              </p>
              <p className="text-sm font-medium mt-0.5" style={{ color: mutedColor }}>
                {item.startTime} · {formatDuration(item.durationMinutes)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WaitingView({
  count,
  estimatedMinutes,
  accent,
  textColor,
  mutedColor,
}: {
  count: number;
  estimatedMinutes: number;
  accent: string;
  textColor: string;
  mutedColor: string;
}) {
  if (count === 0) {
    return (
      <div className="text-center flex flex-col items-center space-y-4">
        <EmptyIconBadge accent={accent}>
          <IconLeafEmpty className="w-16 h-16 sm:w-20 sm:h-20" />
        </EmptyIconBadge>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-black mt-4" style={{ color: textColor }}>
          Sin espera
        </p>
        <p className="text-base sm:text-lg" style={{ color: mutedColor }}>
          Agenda despejada por ahora
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8 sm:space-y-10">
      <div className="flex items-center justify-center gap-3" style={{ color: accent }}>
        <IconUsers className="w-7 h-7" />
        <span className="text-sm sm:text-base font-black uppercase tracking-widest">
          En espera
        </span>
      </div>

      <div className="space-y-3">
        <div
          className="text-8xl sm:text-9xl lg:text-[10rem] font-black leading-none font-mono tabular-nums"
          style={{ color: textColor, textShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
        >
          {count}
        </div>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-black" style={{ color: mutedColor }}>
          {count === 1 ? 'turno en cola' : 'turnos en cola'}
        </p>
      </div>

      {estimatedMinutes > 0 && (
        <div className="pt-4 inline-block px-6 border-t" style={{ borderColor: 'rgba(128,128,128,0.25)' }}>
          <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: mutedColor }}>
            Tiempo estimado
          </p>
          <p className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono tabular-nums" style={{ color: accent }}>
            {formatDuration(estimatedMinutes)}
          </p>
        </div>
      )}
    </div>
  );
}

function UpcomingView({
  days,
  accent,
  textColor,
  mutedColor,
  panelBg,
  panelBorder,
}: ViewProps & { days: ReturnType<typeof useKioskQueue>['upcoming'] }) {
  if (days.length === 0) return null;

  return (
    <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3" style={{ color: accent }}>
        <IconCalendar className="w-6 h-6" />
        <span className="text-sm sm:text-base font-black uppercase tracking-widest">
          Próximos días
        </span>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {days.map((day) => (
          <div
            key={day.date}
            className="rounded-2xl p-5 sm:p-6 border"
            style={{
              backgroundColor: panelBg,
              borderColor: panelBorder,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <p className="text-xs sm:text-sm font-black uppercase tracking-widest mb-3" style={{ color: accent }}>
              {formatDateHuman(day.date)}
            </p>
            <div className="space-y-2">
              {day.items.map((item, idx) => (
                <div key={`${day.date}-${idx}`} className="flex items-center gap-4 py-1.5">
                  <span className="text-xl sm:text-2xl font-black font-mono tabular-nums w-16 shrink-0" style={{ color: textColor }}>
                    {item.time}
                  </span>
                  <span className="text-base sm:text-lg font-bold truncate flex-1 min-w-0" style={{ color: textColor }}>
                    {item.name}
                  </span>
                  {item.turnNumber && (
                    <span className="text-xs sm:text-sm font-black font-mono tabular-nums shrink-0" style={{ color: mutedColor }}>
                      #{item.turnNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  textColor,
  mutedColor,
  accent,
}: {
  textColor: string;
  mutedColor: string;
  accent: string;
}) {
  return (
    <div className="text-center flex flex-col items-center space-y-6">
      <EmptyIconBadge accent={accent}>
        <IconSunCloud className="w-20 h-20 sm:w-24 sm:h-24" />
      </EmptyIconBadge>
      <div>
        <p
          className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3"
          style={{ color: textColor, textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
        >
          Todo tranquilo
        </p>
        <p className="text-lg sm:text-xl font-medium" style={{ color: mutedColor }}>
          No hay turnos pendientes por ahora
        </p>
      </div>
      <p className="text-sm pt-4" style={{ color: accent }}>
        Toca la pantalla para agendar tu cita
      </p>
    </div>
  );
}

function ErrorState({
  message,
  textColor,
  mutedColor,
  accent,
}: {
  message: string;
  textColor: string;
  mutedColor: string;
  accent: string;
}) {
  return (
    <div className="text-center flex flex-col items-center space-y-4">
      <EmptyIconBadge accent={accent}>
        <IconWarning className="w-14 h-14 sm:w-16 sm:h-16" />
      </EmptyIconBadge>
      <p className="text-2xl font-black mt-4" style={{ color: textColor }}>
        No pudimos cargar los turnos
      </p>
      <p className="text-sm" style={{ color: mutedColor }}>
        {message}
      </p>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatDateHuman(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date
      .toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace('.', '');
  } catch {
    return isoDate;
  }
}