'use client';

import React, { useMemo, useState } from 'react';
import {
  Star,
  MessageSquarePlus,
  X,
  Loader2,
  LogIn,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import { useItemReviews, type ItemReview } from '../hooks/useItemReviews';

// ============================================================
// 🔥 ITEM REVIEWS SECTION — Sección de reseñas para el modal
// ============================================================
// Va dentro de ProductDetailModal / ServiceDetailModal.
// Muestra:
//   - Promedio + cantidad de reseñas
//   - Distribución (barras por cantidad de estrellas)
//   - Botón "Escribir reseña" (o "Iniciá sesión")
//   - Lista de las N últimas reviews
//   - Botón "Ver todas" (abre modal con todas)

interface ItemReviewsSectionProps {
  tenantId: string;
  itemId: string;
  itemType: 'product' | 'service';

  primary: string;
  secondary?: string;
  isSecondaryLight: boolean;
  /** Si viene, gana sobre isSecondaryLight para calcular textColor. */
  isDarkBg?: boolean;

  isAuthenticated: boolean;
  userId?: string;

  /** Cuántas reviews mostrar en la sección inline. Default: 3 */
  inlineLimit?: number;
}

// ============================================================
// 🔥 MODAL PARA CREAR/EDITAR REVIEW
// ============================================================

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, title: string, comment: string) => Promise<void>;
  initialReview?: ItemReview | null;
  primary: string;
  isSecondaryLight: boolean;
  isDarkBg?: boolean;
}

function ReviewFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialReview,
  primary,
  isSecondaryLight,
  isDarkBg,
}: ReviewFormModalProps) {
  const isEditing = !!initialReview;

  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [title, setTitle] = useState(initialReview?.title || '');
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetear cuando cambia initialReview o se abre
  React.useEffect(() => {
    if (isOpen) {
      setRating(initialReview?.rating || 0);
      setTitle(initialReview?.title || '');
      setComment(initialReview?.comment || '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialReview?.id]);

  if (!isOpen) return null;

  const isDark = isDarkBg !== undefined ? isDarkBg : !isSecondaryLight;
  const textColor = isDark ? '#ffffff' : '#0f172a';
    const mutedTextColor = isSecondaryLight ? '#64748b' : '#94a3b8';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const inputBg = isSecondaryLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
  const modalBg = isDark ? '#0f172a' : '#ffffff';
  
  const canSubmit = rating >= 1 && comment.trim().length >= 3 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(rating, title.trim(), comment.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al enviar la reseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: modalBg,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor,
          color: textColor,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b shrink-0"
          style={{ borderColor }}
        >
          <div>
            <h2 className="text-base font-black tracking-tight" style={{ color: textColor }}>
              {isEditing ? 'Editar reseña' : 'Escribir una reseña'}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: mutedTextColor }}>
              {isEditing
                ? 'Podés actualizar tu calificación y comentario'
                : 'Contá tu experiencia con este artículo'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl transition hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: inputBg, color: textColor }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Rating */}
          <div className="space-y-2">
            <label
              className="block text-xs font-bold uppercase tracking-wider"
              style={{ color: textColor }}
            >
              Tu calificación *
            </label>
            <div className="flex items-center gap-2">
              <StarRating
                value={rating}
                onChange={setRating}
                size={32}
                gap={4}
                readOnly={isSubmitting}
              />
              {rating > 0 && (
                <span
                  className="text-xs font-bold"
                  style={{ color: primary }}
                >
                  {rating} de 5
                </span>
              )}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label
              className="block text-xs font-bold uppercase tracking-wider"
              style={{ color: textColor }}
            >
              Título (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumí tu experiencia en una línea"
              maxLength={120}
              disabled={isSubmitting}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition disabled:opacity-60"
              style={{
                backgroundColor: inputBg,
                borderColor,
                color: textColor,
              }}
            />
          </div>

          {/* Comentario */}
          <div className="space-y-2">
            <label
              className="block text-xs font-bold uppercase tracking-wider"
              style={{ color: textColor }}
            >
              Comentario *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te pareció el producto? ¿Lo recomendarías? ¿Cumplió tus expectativas?"
              maxLength={1500}
              rows={5}
              disabled={isSubmitting}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition resize-none disabled:opacity-60"
              style={{
                backgroundColor: inputBg,
                borderColor,
                color: textColor,
              }}
            />
            <p
              className="text-[10px] text-right"
              style={{ color: mutedTextColor }}
            >
              {comment.length} / 1500
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl text-xs"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
              }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          className="p-5 pt-0 flex gap-2 shrink-0 border-t"
          style={{ borderColor }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition hover:opacity-80 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border mt-5"
            style={{
              backgroundColor: 'transparent',
              borderColor,
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any)}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-5"
            style={{ backgroundColor: primary }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : isEditing ? (
              'Guardar cambios'
            ) : (
              'Publicar reseña'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🔥 SECCIÓN PRINCIPAL
// ============================================================

export default function ItemReviewsSection({
  tenantId,
  itemId,
  itemType,
  primary,
  secondary,
  isSecondaryLight,
  isDarkBg,
  isAuthenticated,
  userId,
  inlineLimit = 3,
}: ItemReviewsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ItemReview | null>(null);

  const {
    reviews,
    total,
    summary,
    canReviewResult,
    loading,
    submitting,
    createReview,
    updateOwnReview,
    deleteOwnReview,
    hasMore,
    loadMore,
    loadingMore,
  } = useItemReviews({ tenantId, itemId, itemType });

  // Reviews a mostrar inline
  const inlineReviews = useMemo(() => reviews.slice(0, inlineLimit), [reviews, inlineLimit]);

  // Encontrar la review propia (si existe)
  const ownReview = useMemo(
    () => reviews.find((r) => r.userId === userId),
    [reviews, userId],
  );

  // 🎨 Colores
  const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const mutedTextColor = isSecondaryLight ? '#64748b' : '#94a3b8';
  const borderColor = isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  // Estado del botón principal
  const handleOpenForm = () => {
    setEditingReview(ownReview || null);
    setIsFormOpen(true);
  };

  const handleEditReview = (review: ItemReview) => {
    setEditingReview(review);
    setIsFormOpen(true);
  };

  const handleDeleteReview = async (review: ItemReview) => {
    if (!confirm('¿Estás seguro de que querés eliminar tu reseña?')) return;
    try {
      await deleteOwnReview(review.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (rating: number, title: string, comment: string) => {
    if (editingReview) {
      await updateOwnReview(editingReview.id, rating, title, comment);
    } else {
      await createReview(rating, title, comment);
    }
    setEditingReview(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingReview(null);
  };

  // ============================================================
  // 🔥 RENDERIZADO
  // ============================================================

  return (
    <div className="pt-4 border-t space-y-4" style={{ borderColor }}>
      {/* ============================================================ */}
      {/* HEADER: título + botón */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3
            className="text-sm font-extrabold uppercase tracking-wider"
            style={{ color: textColor }}
          >
            Reseñas {total > 0 && `(${total})`}
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: mutedTextColor }}>
            Opiniones de compradores verificados
          </p>
        </div>

        {/* Botón escribir / login */}
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              // Disparar evento para abrir el auth modal
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('openAuthModal'));
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition hover:opacity-90 active:scale-[0.98] cursor-pointer border"
            style={{
              backgroundColor: 'transparent',
              borderColor: primary,
              color: primary,
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Iniciá sesión para reseñar
          </button>
        ) : ownReview ? (
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition hover:opacity-90 active:scale-[0.98] cursor-pointer border"
            style={{
              backgroundColor: 'transparent',
              borderColor: primary,
              color: primary,
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Editar mi reseña
          </button>
        ) : canReviewResult?.canReview ? (
          <button
            type="button"
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: primary }}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Escribir reseña
          </button>
        ) : null}
      </div>

      {/* ============================================================ */}
      {/* RESUMEN: promedio + distribución */}
      {/* ============================================================ */}
      {total > 0 && (
        <div
          className="p-4 rounded-2xl border flex items-center gap-5 flex-wrap"
          style={{ borderColor }}
        >
          {/* Promedio grande */}
          <div className="flex flex-col items-center shrink-0">
            <span
              className="text-4xl font-black leading-none"
              style={{ color: textColor }}
            >
              {summary.averageRating.toFixed(1)}
            </span>
            <StarRating
              value={summary.averageRating}
              readOnly
              size={14}
              gap={1}
              className="mt-1"
            />
            <span
              className="text-[10px] mt-1"
              style={{ color: mutedTextColor }}
            >
              {total} {total === 1 ? 'reseña' : 'reseñas'}
            </span>
          </div>

          {/* Distribución */}
          <div className="flex-1 min-w-[140px] space-y-1">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = summary.distribution[stars as 5 | 4 | 3 | 2 | 1] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold w-3 text-right"
                    style={{ color: mutedTextColor }}
                  >
                    {stars}
                  </span>
                  <Star
                    className="w-3 h-3 shrink-0"
                    fill={primary}
                    stroke={primary}
                  />
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: isSecondaryLight
                        ? 'rgba(0,0,0,0.06)'
                        : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: primary,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-medium w-6 text-right"
                    style={{ color: mutedTextColor }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MENSAJE: sin reviews */}
      {/* ============================================================ */}
      {total === 0 && !loading && (
        <div
          className="p-6 rounded-2xl border text-center"
          style={{ borderColor }}
        >
          <StarRating value={0} readOnly size={20} gap={3} className="mb-3 justify-center" />
          <p className="text-sm font-bold" style={{ color: textColor }}>
            Todavía no hay reseñas
          </p>
          <p className="text-[11px] mt-1" style={{ color: mutedTextColor }}>
            {isAuthenticated && canReviewResult?.canReview
              ? 'Sé el primero en compartir tu experiencia.'
              : 'Cuando alguien compre este artículo, podrá dejar su opinión.'}
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* LISTA DE REVIEWS (inline) */}
      {/* ============================================================ */}
      {inlineReviews.length > 0 && (
        <div className="space-y-3">
          {inlineReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              primary={primary}
              isSecondaryLight={isSecondaryLight}
              isOwnReview={review.userId === userId}
              onEdit={review.userId === userId ? handleEditReview : undefined}
              onDelete={review.userId === userId ? handleDeleteReview : undefined}
            />
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* BOTÓN "Ver todas" / "Cargar más" */}
      {/* ============================================================ */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-2xl text-xs font-bold transition hover:opacity-80 active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border"
          style={{
            backgroundColor: 'transparent',
            borderColor,
            color: textColor,
          }}
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cargando...
            </>
          ) : (
            <>Ver las {total - inlineLimit} reseñas restantes</>
          )}
        </button>
      )}

      {/* ============================================================ */}
      {/* MODAL DE FORMULARIO */}
      {/* ============================================================ */}
      <ReviewFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitReview}
        initialReview={editingReview}
        primary={primary}
        isSecondaryLight={isSecondaryLight}
      />
    </div>
  );
}