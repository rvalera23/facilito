'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ItemReviewsSection from '@/app/tienda/[slug]/components/ItemReviewsSection';
import type { PendingReviewItem } from './hooks/usePendingReviews';
import { useThemeBackground } from '@/hooks/useThemeBackground';

// ============================================================
// 🔥 MODAL: Escribir reseña de un item pendiente
// ============================================================
// Envuelve al ItemReviewsSection ya existente, apuntado al item.
// No reimplementa nada: reutiliza el flujo completo (crear/editar).

interface PendingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PendingReviewItem | null;
  userId: string | null | undefined;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onReviewSubmitted?: () => void;
}

export default function PendingReviewModal({
  isOpen,
  onClose,
  item,
  userId,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onReviewSubmitted,
}: PendingReviewModalProps) {
  // 🔥 Fondo del modal centralizado (lee --bg-color, reactivo a themeChange).
  const themeBg = useThemeBackground(secondary, isDarkBg);

  if (!isOpen || !item) return null;

  const borderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = themeBg;

  // Detectar cuando se publica la reseña: ItemReviewsSection refresca
  // internamente su propia lista. Avisamos al padre después de un
  // pequeño delay para que el bloque de pendientes se refresque.
  const handleClose = () => {
    if (onReviewSubmitted) onReviewSubmitted();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
      style={{ backgroundColor: isDarkBg ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden"
        style={{
          backgroundColor: cardBg,
          borderColor,
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor }}
        >
          <div className="min-w-0">
            <span
              className="text-[10px] uppercase tracking-wider font-extrabold"
              style={{ color: primary }}
            >
              Escribir reseña
            </span>
            <h3
              className="text-sm sm:text-base font-bold truncate"
              style={{ color: textColor }}
            >
              {item.itemName}
            </h3>
            {item.tenantName && (
              <p
                className="text-[11px] opacity-60 truncate"
                style={{ color: textColor }}
              >
                {item.tenantName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95 shrink-0"
            style={{
              borderColor,
              backgroundColor: isDarkBg
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(0,0,0,0.03)',
              color: textColor,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY — ItemReviewsSection reutilizado */}
        <div className="p-6 overflow-y-auto flex-1">
          <ItemReviewsSection
            tenantId={item.tenantId}
            itemId={item.itemId}
            itemType={item.itemType}
            primary={primary}
            secondary={secondary}
            isSecondaryLight={!isDarkBg}
            isDarkBg={isDarkBg}
            isAuthenticated={true}
            userId={userId || undefined}
            inlineLimit={5}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}