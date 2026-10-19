'use client';

import React, { useMemo, useState } from 'react';
import { BadgeCheck, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import StarRating from './StarRating';
import UserAvatar from './UserAvatar';
import type { ItemReview } from '../hooks/useItemReviews';

// ============================================================
// 🔥 REVIEW CARD — Una reseña individual
// ============================================================
// Muestra: avatar/inicial, nombre, estrellas, fecha, badge verificado,
// título, comentario, y (si existe) la respuesta del dueño.
//
// El comentario largo se colapsa con "Ver más" / "Ver menos".
//
// Uso:
//   <ReviewCard review={review} primary="#f97316" isSecondaryLight={false} />

interface ReviewCardProps {
  review: ItemReview;

  /** Color primario del tenant */
  primary: string;

  /** Si el fondo de la tienda es claro */
  isSecondaryLight: boolean;

  /** Callback para que el usuario edite su propia review */
  onEdit?: (review: ItemReview) => void;

  /** Callback para eliminar su propia review */
  onDelete?: (review: ItemReview) => void;

  /** Si esta review es del usuario logueado */
  isOwnReview?: boolean;
}

// ============================================================
// 🔥 HELPER: fecha relativa ("Hace 3 días", "Hace 2 semanas")
// ============================================================
function formatRelativeDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Hace unos segundos';
  if (diffMin < 60) return `Hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`;
  if (diffHour < 24) return `Hace ${diffHour} hora${diffHour === 1 ? '' : 's'}`;
  if (diffDay < 7) return `Hace ${diffDay} día${diffDay === 1 ? '' : 's'}`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `Hace ${weeks} semana${weeks === 1 ? '' : 's'}`;
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `Hace ${months} mes${months === 1 ? '' : 'es'}`;
  }
  const years = Math.floor(diffDay / 365);
  return `Hace ${years} año${years === 1 ? '' : 's'}`;
}

// ============================================================
// 🔥 HELPER: cuántos caracteres antes de colapsar el comentario
// ============================================================
const COLLAPSE_THRESHOLD = 220;

// ============================================================
// 🔥 COMPONENTE
// ============================================================

export default function ReviewCard({
  review,
  primary,
  isSecondaryLight,
  onEdit,
  onDelete,
  isOwnReview = false,
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 🎨 Colores según tema
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedTextColor = isSecondaryLight ? '#64748b' : '#94a3b8';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const itemBg = isSecondaryLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.03)';

  const relativeDate = useMemo(
    () => formatRelativeDate(review.createdAt),
    [review.createdAt],
  );

  const commentText = review.comment || '';
  const isCommentLong = commentText.length > COLLAPSE_THRESHOLD;
  const displayedComment = isCommentLong && !isExpanded
    ? `${commentText.slice(0, COLLAPSE_THRESHOLD).trim()}…`
    : commentText;

  const hasOwnerResponse = !!review.ownerResponse && review.ownerResponse.trim() !== '';

  return (
    <article
      className="p-4 rounded-2xl border transition-colors"
      style={{
        backgroundColor: itemBg,
        borderColor,
      }}
    >
      {/* ============================================================ */}
      {/* 🔥 HEADER: Avatar + Nombre + Fecha + Estrellas */}
      {/* ============================================================ */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <UserAvatar
          name={review.user?.name || 'Usuario'}
          avatarUrl={review.user?.avatarUrl || null}
          size={40}
        />

        {/* Info usuario */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-bold text-sm truncate"
              style={{ color: textColor }}
            >
              {review.user?.name || 'Usuario'}
            </span>

            {review.isVerifiedPurchase && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isSecondaryLight
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(34,197,94,0.2)',
                  color: isSecondaryLight ? '#15803d' : '#4ade80',
                }}
                title="Compra verificada"
              >
                <BadgeCheck className="w-3 h-3" />
                Compra verificada
              </span>
            )}

            {isOwnReview && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: `${primary}20`,
                  color: primary,
                }}
              >
                Tu reseña
              </span>
            )}
          </div>

          {/* Estrellas + fecha */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StarRating value={review.rating} readOnly size={14} gap={1} />
            <span
              className="text-[10px] font-medium"
              style={{ color: mutedTextColor }}
            >
              {relativeDate}
            </span>
          </div>
        </div>

        {/* Acciones (editar/borrar) — solo si es propia */}
        {isOwnReview && (onEdit || onDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(review)}
                className="text-[10px] font-medium underline opacity-60 hover:opacity-100 cursor-pointer transition px-1"
                style={{ color: textColor }}
              >
                Editar
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(review)}
                className="text-[10px] font-medium underline opacity-60 hover:opacity-100 cursor-pointer transition px-1"
                style={{ color: '#ef4444' }}
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 🔥 TÍTULO */}
      {/* ============================================================ */}
      {review.title && review.title.trim() !== '' && (
        <h4
          className="font-bold text-sm mt-3"
          style={{ color: textColor }}
        >
          {review.title}
        </h4>
      )}

      {/* ============================================================ */}
      {/* 🔥 COMENTARIO */}
      {/* ============================================================ */}
      {commentText && (
        <div className="mt-2">
          <p
            className="text-xs leading-relaxed whitespace-pre-line"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {displayedComment}
          </p>

          {isCommentLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold transition hover:opacity-80 cursor-pointer"
              style={{ color: primary }}
            >
              {isExpanded ? (
                <>
                  Ver menos <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Ver más <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 🔥 RESPUESTA DEL DUEÑO */}
      {/* ============================================================ */}
      {hasOwnerResponse && (
        <div
          className="mt-3 p-3 rounded-xl border-o"
          style={{
            backgroundColor: isSecondaryLight
              ? 'rgba(0,0,0,0.03)'
              : 'rgba(255,255,255,0.03)',
            borderColor: primary,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="w-3 h-3" style={{ color: primary }} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: primary }}
            >
              Respuesta del vendedor
            </span>
          </div>
          <p
            className="text-xs leading-relaxed whitespace-pre-line"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {review.ownerResponse}
          </p>
        </div>
      )}
    </article>
  );
}