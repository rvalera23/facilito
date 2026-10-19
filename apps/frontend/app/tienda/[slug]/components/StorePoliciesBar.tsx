'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Sparkles, ArrowRight, Shield, Truck, Clock } from 'lucide-react';
// ============================================================
// 🔥 BARRA DE REGLAS DE LA TIENDA
// ============================================================
// Barra arriba del header con el texto corto configurado por el admin.
// Al hacer click en "Ver reglas" abre el modal con la lista completa.
// Si `barDismissible` es true, el cliente puede cerrarla (sessionStorage).
// ============================================================

interface StorePoliciesBarProps {
  policies: any;
  tenantId: string;
  primary: string;
  secondary: string;
  isSecondaryLight: boolean;
}

const SESSION_KEY_PREFIX = 'store_policies_dismissed_';

export default function StorePoliciesBar({
  policies,
  tenantId,
  primary,
  secondary,
  isSecondaryLight,
}: StorePoliciesBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔥 Montar (SSR-safe)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🔥 Verificar dismissed
  useEffect(() => {
    if (!isMounted) return;
    if (!policies?.enabled) return;

    if (!policies?.barDismissible) {
      setIsVisible(true);
      return;
    }

    try {
      const key = `${SESSION_KEY_PREFIX}${tenantId}`;
      const dismissed = sessionStorage.getItem(key);
      setIsVisible(!dismissed);
    } catch {
      setIsVisible(true);
    }
  }, [isMounted, policies?.enabled, policies?.barDismissible, tenantId]);

  // 🔥 Cerrar la barra (persistir en sessionStorage)
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      const key = `${SESSION_KEY_PREFIX}${tenantId}`;
      sessionStorage.setItem(key, '1');
    } catch {
      // Silencioso
    }
  }, [tenantId]);

  // 🔥 Abrir modal
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // 🔥 Cerrar modal con ESC
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, handleCloseModal]);

  // 🔥 Bloquear scroll mientras el modal está abierto
  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow || 'unset';
    };
  }, [isModalOpen]);

  // 🔥 Si no hay config o no está visible, no renderizar nada
  if (!isMounted) return null;
  if (!policies?.enabled) return null;
  if (!isVisible) return null;

  const barColor = policies?.barColor || 'primary';
  const barAlignment = policies?.barAlignment || 'left';

  // 🎨 Colores según la opción
  const barStyles = (() => {
    switch (barColor) {
      case 'primary':
        return {
          backgroundColor: primary,
          color: '#ffffff',
          gradient: `linear-gradient(90deg, ${primary} 0%, ${primary}dd 60%, ${primary} 100%)`,
          border: 'transparent',
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          color: '#1e293b',
          gradient: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
          border: 'transparent',
        };
      case 'success':
        return {
          backgroundColor: '#22c55e',
          color: '#ffffff',
          gradient: 'linear-gradient(90deg, #22c55e 0%, #4ade80 50%, #22c55e 100%)',
          border: 'transparent',
        };
      case 'info':
        return {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          gradient: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)',
          border: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          gradient: 'linear-gradient(90deg, #ef4444 0%, #f87171 50%, #ef4444 100%)',
          border: 'transparent',
        };
      case 'dark':
        return {
          backgroundColor: '#0f172a',
          color: '#ffffff',
          gradient: 'linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          border: 'transparent',
        };
      case 'light':
        return {
          backgroundColor: '#f1f5f9',
          color: '#0f172a',
          gradient: 'linear-gradient(90deg, #f1f5f9 0%, #ffffff 50%, #f1f5f9 100%)',
          border: 'rgba(0,0,0,0.08)',
        };
      case 'purple':
        return {
          backgroundColor: '#8b5cf6',
          color: '#ffffff',
          gradient: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #8b5cf6 100%)',
          border: 'transparent',
        };
      case 'neutral':
      default:
        return {
          backgroundColor: isSecondaryLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.55)',
          color: isSecondaryLight ? '#0f172a' : '#ffffff',
          gradient: isSecondaryLight
            ? 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)'
            : 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 100%)',
          border: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
        };
    }
  })();

  // 🔥 Icono elegido por el admin (con fallback inteligente por color)
  const BarIcon = (() => {
    const iconId = policies?.icon;

    if (iconId === 'none') return null;

    if (iconId === 'alert') return AlertTriangle;
    if (iconId === 'info') return Info;
    if (iconId === 'warning') return AlertCircle;
    if (iconId === 'shield') return Shield;
    if (iconId === 'truck') return Truck;
    if (iconId === 'clock') return Clock;
    if (iconId === 'sparkles') return Sparkles;

    // Fallback: si no hay iconId, elegir según el color (comportamiento viejo)
    if (barColor === 'warning' || barColor === 'danger') return AlertTriangle;
    return Info;
  })();

  const hasRules = Array.isArray(policies?.rules) && policies.rules.length > 0;

  const isPrimaryBar = barColor === 'primary';
  const isWarningBar = barColor === 'warning';
  const isNeutralBar = barColor === 'neutral' || barColor === 'light';

  // Color del texto para la barra según el modo
  const barTextColor = barStyles.color;

  // 🎯 Clases para alineación (no usadas en el render, pero las dejamos por compatibilidad)

  return (
    <>
      {/* ============================================================
          BARRA SUPERIOR
          ============================================================ */}
      <div
        className="w-full relative overflow-hidden"
        style={{
          background: barStyles.gradient,
          color: barTextColor,
          boxShadow: isNeutralBar
            ? '0 1px 0 0 rgba(0,0,0,0.04)'
            : '0 4px 20px -6px rgba(0,0,0,0.25)',
          animation: 'slideDownBar 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Línea decorativa inferior */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: isNeutralBar
              ? 'rgba(0,0,0,0.06)'
              : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          }}
        />

        {/* Línea decorativa inferior */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: isNeutralBar
              ? 'rgba(0,0,0,0.06)'
              : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          }}
        />

        {barAlignment === 'center' ? (
          /* ============================================================
             CENTRO: grid de 3 columnas
             [spacer]  [icon + texto + botón + X]  [spacer]
             El contenido se centra porque los spacers son simétricos
             ============================================================ */
          <div className="relative w-full px-3 sm:px-4 lg:px-6 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Spacer izquierdo */}
            <div aria-hidden="true" />

            {/* Contenido central */}
            <div className="flex items-center justify-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {BarIcon && (
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: isNeutralBar
                        ? isSecondaryLight
                          ? 'rgba(0,0,0,0.06)'
                          : 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.22)',
                      border: isNeutralBar
                        ? isSecondaryLight
                          ? '1px solid rgba(0,0,0,0.08)'
                          : '1px solid rgba(255,255,255,0.15)'
                        : '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <BarIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                )}
                <span className="text-[12px] sm:text-[13px] font-semibold tracking-tight truncate">
                  {policies.barText || 'Información importante'}
                </span>
              </div>

              {(hasRules || policies?.barDismissible) && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasRules && policies?.showButton !== false && (
                    <button
                      type="button"
                      onClick={handleOpenModal}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-transform duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer"
                      style={{
                        backgroundColor: isNeutralBar
                          ? isSecondaryLight
                            ? 'rgba(0,0,0,0.06)'
                            : 'rgba(255,255,255,0.1)'
                          : 'rgba(255,255,255,0.2)',
                        color: barTextColor,
                        border: isNeutralBar
                          ? isSecondaryLight
                            ? '1px solid rgba(0,0,0,0.08)'
                            : '1px solid rgba(255,255,255,0.15)'
                          : '1px solid rgba(255,255,255,0.25)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                      }}
                    >
                      <Sparkles className="w-3 h-3 opacity-90" strokeWidth={2.5} />
                      <span>{policies.buttonText || 'Saber más'}</span>
                      <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  )}

                  {policies?.barDismissible && (
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="p-1.5 rounded-full opacity-70 hover:opacity-100 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                      style={{ color: barTextColor }}
                      aria-label="Cerrar barra"
                      title="Cerrar"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Spacer derecho */}
            <div aria-hidden="true" />
          </div>
        ) : barAlignment === 'right' ? (
          /* ============================================================
             DERECHA: [X] [botón] ........ texto [icon]
             ============================================================ */
          <div className="relative w-full px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3">
            {/* Acciones a la IZQUIERDA */}
            {(hasRules || policies?.barDismissible) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {hasRules && policies?.showButton !== false && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-transform duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: isNeutralBar
                        ? isSecondaryLight
                          ? 'rgba(0,0,0,0.06)'
                          : 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.2)',
                      color: barTextColor,
                      border: isNeutralBar
                        ? isSecondaryLight
                          ? '1px solid rgba(0,0,0,0.08)'
                          : '1px solid rgba(255,255,255,0.15)'
                        : '1px solid rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                    }}
                  >
                    <Sparkles className="w-3 h-3 opacity-90" strokeWidth={2.5} />
                    <span>{policies.buttonText || 'Saber más'}</span>
                    <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                )}

                {policies?.barDismissible && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="p-1.5 rounded-full opacity-70 hover:opacity-100 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                    style={{ color: barTextColor }}
                    aria-label="Cerrar barra"
                    title="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}

            {/* Texto + ícono a la DERECHA */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <span className="text-[12px] sm:text-[13px] font-semibold tracking-tight truncate">
                {policies.barText || 'Información importante'}
              </span>
              {BarIcon && (
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: isNeutralBar
                      ? isSecondaryLight
                        ? 'rgba(0,0,0,0.06)'
                        : 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.22)',
                    border: isNeutralBar
                      ? isSecondaryLight
                        ? '1px solid rgba(0,0,0,0.08)'
                        : '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  <BarIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              )}
            </div>
          </div>
        ) : (
          /* ============================================================
             IZQUIERDA: [icon] texto ........ [botón] [X]
             ============================================================ */
          <div className="relative w-full px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3">
            {/* Texto + ícono a la IZQUIERDA */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {BarIcon && (
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: isNeutralBar
                      ? isSecondaryLight
                        ? 'rgba(0,0,0,0.06)'
                        : 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.22)',
                    border: isNeutralBar
                      ? isSecondaryLight
                        ? '1px solid rgba(0,0,0,0.08)'
                        : '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  <BarIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              )}
              <span className="text-[12px] sm:text-[13px] font-semibold tracking-tight truncate">
                {policies.barText || 'Información importante'}
              </span>
            </div>

            {/* Acciones a la DERECHA */}
            {(hasRules || policies?.barDismissible) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {hasRules && policies?.showButton !== false && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-transform duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: isNeutralBar
                        ? isSecondaryLight
                          ? 'rgba(0,0,0,0.06)'
                          : 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.2)',
                      color: barTextColor,
                      border: isNeutralBar
                        ? isSecondaryLight
                          ? '1px solid rgba(0,0,0,0.08)'
                          : '1px solid rgba(255,255,255,0.15)'
                        : '1px solid rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                    }}
                  >
                    <Sparkles className="w-3 h-3 opacity-90" strokeWidth={2.5} />
                    <span>{policies.buttonText || 'Saber más'}</span>
                    <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                )}

                {policies?.barDismissible && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="p-1.5 rounded-full opacity-70 hover:opacity-100 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                    style={{ color: barTextColor }}
                    aria-label="Cerrar barra"
                    title="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL
          ============================================================ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeInOverlay 0.25s ease-out',
          }}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-policies-title"
        >
          <div
            className="relative w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isSecondaryLight ? '#ffffff' : '#0f172a',
              color: isSecondaryLight ? '#0f172a' : '#ffffff',
              maxHeight: '85vh',
              animation: 'zoomInModal 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              border: isSecondaryLight
                ? '1px solid rgba(0,0,0,0.06)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow:
                '0 25px 60px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Glow superior con color del tenant */}
            <div
              aria-hidden="true"
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${primary}30 0%, transparent 65%)`,
                filter: 'blur(20px)',
              }}
            />

            {/* ============================================================
                HEADER
                ============================================================ */}
            <div
              className="relative p-6 pb-5"
              style={{
                borderBottom: isSecondaryLight
                  ? '1px solid rgba(0,0,0,0.06)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-start gap-4">
                {/* Ícono grande con fondo y glow */}
                <div
                  className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center relative"
                  style={{
                    background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
                    boxShadow: `0 8px 24px -6px ${primary}80, inset 0 1px 0 0 rgba(255,255,255,0.25)`,
                  }}
                >
                  <Info className="w-7 h-7 text-white" strokeWidth={2.2} />
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h2
                    id="store-policies-title"
                    className="text-xl sm:text-2xl font-black tracking-tight leading-tight"
                  >
                    {policies.title || 'Información importante'}
                  </h2>
                  {hasRules && (
                    <p
                      className="text-xs font-medium mt-1.5 flex items-center gap-1.5"
                      style={{
                        color: isSecondaryLight
                          ? 'rgba(15,23,42,0.55)'
                          : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: primary }}
                      />
                      {policies.rules.length}{' '}
                      {policies.rules.length === 1 ? 'punto' : 'puntos'} a tener en cuenta
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: isSecondaryLight
                      ? 'rgba(0,0,0,0.05)'
                      : 'rgba(255,255,255,0.08)',
                    color: isSecondaryLight ? '#0f172a' : '#ffffff',
                  }}
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* ============================================================
                BODY
                ============================================================ */}
            <div
              className="relative flex-1 overflow-y-auto p-6"
              style={{ maxHeight: 'calc(85vh - 220px)' }}
            >
              {hasRules ? (
                <ul className="space-y-3.5">
                  {policies.rules.map((rule: string, index: number) => (
                    <li
                      key={index}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-transform duration-200 hover:opacity-95 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                                      style={{
                        backgroundColor: isSecondaryLight
                          ? 'rgba(0,0,0,0.025)'
                          : 'rgba(255,255,255,0.03)',
                        border: isSecondaryLight
                          ? '1px solid rgba(0,0,0,0.04)'
                          : '1px solid rgba(255,255,255,0.05)',
                        animation: `slideUpItem 0.35s ease-out ${index * 0.06}s both`,
                      }}
                    >
                      <span
                        className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-[12px] font-black mt-0.5 transition-transform duration-200 group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
                          color: '#ffffff',
                          boxShadow: `0 4px 12px -2px ${primary}66`,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 pt-0.5">{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-12 text-center">
                  <div
                    className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: isSecondaryLight
                        ? 'rgba(0,0,0,0.04)'
                        : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Info
                      className="w-5 h-5"
                      style={{
                        color: isSecondaryLight
                          ? 'rgba(15,23,42,0.4)'
                          : 'rgba(255,255,255,0.4)',
                      }}
                    />
                  </div>
                  <p
                    className="text-sm"
                    style={{
                      color: isSecondaryLight
                        ? 'rgba(15,23,42,0.5)'
                        : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    No hay información configurada.
                  </p>
                </div>
              )}
            </div>

            {/* ============================================================
                FOOTER
                ============================================================ */}
            <div
              className="relative p-5"
              style={{
                borderTop: isSecondaryLight
                  ? '1px solid rgba(0,0,0,0.06)'
                  : '1px solid rgba(255,255,255,0.08)',
                backgroundColor: isSecondaryLight
                  ? 'rgba(0,0,0,0.015)'
                  : 'rgba(255,255,255,0.02)',
              }}
            >
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-transform duration-200 hover:opacity-95 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)`,
                  color: '#ffffff',
                  boxShadow: `0 8px 20px -6px ${primary}80`,
                }}
              >
                <span>Entendido</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ANIMACIONES
          ============================================================ */}
      <style jsx global>{`
        @keyframes slideDownBar {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInOverlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoomInModal {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes slideUpItem {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}