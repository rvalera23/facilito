// ============================================================
// ARCHIVO: components/cards/StoreCard.tsx
// Card reutilizable de tienda, con soporte opcional de cercanía.
// ============================================================
'use client';

import React, { useMemo, memo } from 'react';
import Link from 'next/link';
import { DistanceBadge } from './DistanceBadge';

// ============================================================
// Función para verificar horario de la tienda
// ============================================================
const checkIfStoreIsOpen = (specificConfig: any) => {
  if (!specificConfig || typeof specificConfig !== 'object') {
    return { isOpen: true, label: 'Abierto' };
  }

  const isManuallyClosed =
    specificConfig.is_manually_closed === true ||
    specificConfig.is_manually_closed === 'true' ||
    specificConfig.isManuallyClosed === true ||
    specificConfig.isManuallyClosed === 'true';

  if (isManuallyClosed) {
    return { isOpen: false, label: 'Cerrado' };
  }

  const daysMap: Record<string, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const now = new Date();
  const currentDayKey = daysMap[now.getDay()];
  const schedule = specificConfig.schedule || {};
  const todayConfig = schedule[currentDayKey];

  if (!todayConfig || todayConfig.closed) {
    return { isOpen: false, label: 'Cerrado' };
  }

  const parseTimeToMinutes = (timeValue: any, meridiemValue: any) => {
    if (!timeValue) return null;

    if (typeof timeValue === 'string' && timeValue.includes(':')) {
      const parts = timeValue.split(':');
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) || 0;

      if (timeValue.toLowerCase().includes('pm') && h < 12) h += 12;
      if (timeValue.toLowerCase().includes('am') && h === 12) h = 0;

      return h * 60 + m;
    }

    if (typeof timeValue !== 'undefined' && meridiemValue) {
      let h = parseInt(timeValue, 10);
      const m = 0;
      const mer = String(meridiemValue).trim().toUpperCase();

      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;

      return h * 60 + m;
    }

    return null;
  };

  const openStr = todayConfig.open || todayConfig.openTime || specificConfig.open || '08:00';
  const closeStr = todayConfig.close || todayConfig.closeTime || specificConfig.close || '17:00';

  const openTimeMinutes = parseTimeToMinutes(openStr, todayConfig.openMeridiem || specificConfig.openMeridiem) ?? 480;
  const closeTimeMinutes = parseTimeToMinutes(closeStr, todayConfig.closeMeridiem || specificConfig.closeMeridiem) ?? 1020;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  if (currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes) {
    return { isOpen: true, label: 'Abierto' };
  } else {
    return { isOpen: false, label: 'Cerrado' };
  }
};

// ============================================================
// Card
// ============================================================
export const StoreCard = memo(({
  store,
  primaryColor,
  textColorClass,
  mutedTextColorClass,
  backgroundCardBg,
  proximity,
}: any) => {
  const storeBanner = useMemo(
    () => store.bannerImage || store.bannerUrl || store.banner_url || store.banner,
    [store.bannerImage, store.bannerUrl, store.banner_url, store.banner]
  );
  const specificConfig = useMemo(
    () => store.specific_config || store.specificConfig || {},
    [store.specific_config, store.specificConfig]
  );
  const status = useMemo(() => checkIfStoreIsOpen(specificConfig), [specificConfig]);

  return (
    <Link
      key={store.id || store.slug}
      href={`/tienda/${store.slug}`}
      className="group relative p-4 rounded-[2rem] border transition-transform duration-300 hover:-translate-y-1.5 flex flex-col overflow-hidden h-[120px]"
      style={{
        backgroundColor: backgroundCardBg,
        borderColor: `${primaryColor}30`,
        boxShadow: `0 8px 20px -10px ${primaryColor}20`,
        willChange: 'transform',
      }}
    >
      {storeBanner && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={storeBanner}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-right opacity-10"
                      />
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: `linear-gradient(270deg, ${backgroundCardBg} 30%, ${backgroundCardBg}bb 70%, ${backgroundCardBg}66 100%)`,
            }}
          />
        </div>
      )}


      {/* 🔥 Estado - Arriba derecha */}
      <div className="absolute top-2 right-3 z-20">
        <span
          className={`text-[7px] font-bold uppercase tracking-wider ${
            status?.isOpen ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {status?.label || 'Abierto'}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-start space-x-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border shadow-md"
                        style={{
              borderColor: `${primaryColor}50`,
              backgroundColor: backgroundCardBg,
            }}
          >
            {(store.logoUrl || store.logo_url) ? (
              <img
                src={store.logoUrl || store.logo_url}
                alt={store.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                width="36"
                height="36"
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
                  maxWidth: '36px',
                  maxHeight: '36px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span className="font-black text-sm" style={{ color: primaryColor }}>
                {store.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-bold leading-tight ${textColorClass} mb-1.5`}
                            title={store.name}
            >
              {store.name?.length > 25 ? store.name.slice(0, 25) + '...' : store.name}
            </h3>

            {store.slogan ? (
              <p
                className={`text-[10px] font-medium leading-snug ${mutedTextColorClass} line-clamp-1`}
                style={{ opacity: 0.85 }}
                title={store.slogan}
              >
                {store.slogan}
              </p>
            ) : (
              <p className={`text-[10px] font-medium ${mutedTextColorClass}`} style={{ opacity: 0.6 }}>
                tienda/{store.slug}
              </p>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-auto border-t border-slate-500/10 pt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold tracking-wide" style={{ color: primaryColor }}>
                        Visitar tienda →
          </span>
          {proximity && (
            <DistanceBadge proximity={proximity} primaryColor={primaryColor} />
          )}
        </div>
      </div>
    </Link>
  );
});

StoreCard.displayName = 'StoreCard';