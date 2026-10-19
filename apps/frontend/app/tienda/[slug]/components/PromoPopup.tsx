'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { toAbsoluteApiUrl } from '@/lib/apiUrl';
// ============================================================
// 🔥 POPUP PROMOCIONAL PARA LA TIENDA
// ============================================================
// Muestra una imagen configurada por el admin, con trigger y
// frecuencia configurables. Se monta en la tienda pública.
//
// Config viene de `tenant.specificConfig.popup`:
//   {
//     enabled, imageUrl, trigger, delaySeconds, scrollPercent,
//     frequency, showCloseButton, imageAlt, updatedAt
//   }
//
// Persistencia de "dismissed" en localStorage/sessionStorage según
// la frecuencia elegida.

interface PromoPopupProps {
  popupConfig: any;
  tenantId: string;
  /** Callback opcional al cerrar (para que el padre sepa) */
  onClose?: () => void;
}

type Frequency = 'always' | 'once_session' | 'once_day' | 'once_ever';
type Trigger = 'onLoad' | 'afterDelay' | 'onScroll';

const STORAGE_KEY_PREFIX = 'promo_popup_dismissed_';

export default function PromoPopup({ popupConfig, tenantId, onClose }: PromoPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 🔥 Verificar si debe mostrarse según frecuencia
  const shouldShowByFrequency = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    const frequency: Frequency = popupConfig?.frequency || 'once_session';
    const key = `${STORAGE_KEY_PREFIX}${tenantId}`;

    if (frequency === 'always') return true;

    try {
      if (frequency === 'once_session') {
        const dismissed = sessionStorage.getItem(key);
        return !dismissed;
      }

      if (frequency === 'once_day') {
        const raw = localStorage.getItem(key);
        if (!raw) return true;
        try {
          const parsed = JSON.parse(raw);
          const dismissedAt = parsed?.dismissedAt;
          if (!dismissedAt) return true;
          const hoursSince = (Date.now() - Number(dismissedAt)) / 3_600_000;
          return hoursSince >= 24;
        } catch {
          return true;
        }
      }

      if (frequency === 'once_ever') {
        const dismissed = localStorage.getItem(key);
        return !dismissed;
      }
    } catch {
      // Si storage falla, mostramos igual (mejor mostrar de más que nunca)
      return true;
    }

    return true;
  }, [popupConfig?.frequency, tenantId]);

  // 🔥 Guardar "dismissed" según frecuencia
  const persistDismissal = useCallback(() => {
    if (typeof window === 'undefined') return;

    const frequency: Frequency = popupConfig?.frequency || 'once_session';
    const key = `${STORAGE_KEY_PREFIX}${tenantId}`;

    try {
      if (frequency === 'once_session') {
        sessionStorage.setItem(key, '1');
      } else if (frequency === 'once_day') {
        localStorage.setItem(key, JSON.stringify({ dismissedAt: Date.now() }));
      } else if (frequency === 'once_ever') {
        localStorage.setItem(key, '1');
      }
      // 'always' no persiste nada
    } catch {
      // Silencioso
    }
  }, [popupConfig?.frequency, tenantId]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    persistDismissal();
    onClose?.();
  }, [persistDismissal, onClose]);

  // 🔥 Click en el botón de enlace: cierra el popup y navega
  const handleLinkClick = useCallback(() => {
    persistDismissal();
    setIsVisible(false);
    onClose?.();
    // La navegación la hace el <a> nativo
  }, [persistDismissal, onClose]);

  // 🔥 Registrar si está montado (para SSR-safe)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🔥 Decidir cuándo mostrar según trigger
  useEffect(() => {
    if (!isMounted) return;
    if (!popupConfig?.enabled) return;
    if (!popupConfig?.imageUrl) return;

    // Chequear frecuencia primero
    if (!shouldShowByFrequency()) return;

    const trigger: Trigger = popupConfig?.trigger || 'onLoad';

    // 🔥 Trigger: onLoad
    if (trigger === 'onLoad') {
      setIsVisible(true);
      return;
    }

    // 🔥 Trigger: afterDelay
    if (trigger === 'afterDelay') {
      const delay = Math.max(1, Number(popupConfig?.delaySeconds) || 3);
      const timer = setTimeout(() => setIsVisible(true), delay * 1000);
      return () => clearTimeout(timer);
    }

    // 🔥 Trigger: onScroll
    if (trigger === 'onScroll') {
      const percent = Math.max(10, Math.min(100, Number(popupConfig?.scrollPercent) || 50));

      const handleScroll = () => {
        const scrolled = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        const currentPercent = (scrolled / total) * 100;
        if (currentPercent >= percent) {
          setIsVisible(true);
          window.removeEventListener('scroll', handleScroll);
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      // Chequeo inicial (por si ya está scrolleado)
      handleScroll();

      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isMounted, popupConfig, shouldShowByFrequency]);

  // 🔥 Cerrar con ESC (solo si está visible)
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose]);

  // 🔥 Bloquear scroll del body mientras está visible
  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow || 'unset';
    };
  }, [isVisible]);

  // 🔥 No renderizar si no está visible
  if (!isMounted || !isVisible) return null;
  if (!popupConfig?.imageUrl) return null;

  const showCloseButton = popupConfig?.showCloseButton !== false;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={popupConfig?.imageAlt || 'Pop-up promocional'}
    >
      {/* 🔥 Contenedor que se ajusta a la imagen (no al revés) */}
      <div
        className="relative inline-block animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 'min(480px, 90vw)',
          maxHeight: '85vh',
        }}
      >
        {/* 🔥 Imagen clickable (si hay enlace) */}
        {popupConfig?.linkUrl ? (
          <a
            href={popupConfig.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="block cursor-pointer"
            aria-label={popupConfig.imageAlt || 'Promoción'}
          >
            <img
              src={toAbsoluteApiUrl(popupConfig.imageUrl)}
              alt={popupConfig.imageAlt || 'Promoción'}
              className="block max-w-full max-h-[85vh] h-auto w-auto rounded-2xl shadow-2xl transition-transform hover:scale-[1.01]"
              loading="eager"
              onError={(e) => {
                console.error('❌ [PromoPopup] Error cargando imagen:', popupConfig.imageUrl);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </a>
        ) : (
          <img
            src={toAbsoluteApiUrl(popupConfig.imageUrl)}
            alt={popupConfig.imageAlt || 'Promoción'}
            className="block max-w-full max-h-[85vh] h-auto w-auto rounded-2xl shadow-2xl"
            loading="eager"
            onError={(e) => {
              console.error('❌ [PromoPopup] Error cargando imagen:', popupConfig.imageUrl);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* Botón de cerrar (X) — pegado al borde superior derecho de la imagen */}
        {showCloseButton && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 shadow-lg flex items-center justify-center transition hover:scale-110 active:scale-95 cursor-pointer z-10"
            aria-label="Cerrar pop-up"
            title="Cerrar"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}