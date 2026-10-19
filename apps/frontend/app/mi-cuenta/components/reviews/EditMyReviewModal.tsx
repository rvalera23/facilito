'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Star as StarIcon, Loader2, AlertCircle, Edit3 } from 'lucide-react';
import StarRating from '@/app/tienda/[slug]/components/StarRating';
import { useThemeBackground } from '@/hooks/useThemeBackground';

// ============================================================
// 🔥 EDIT MY REVIEW MODAL — Editar la propia reseña del comprador
// ============================================================

interface EditMyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, title: string, comment: string) => Promise<void>;
  initialRating: number;
  initialTitle: string;
  initialComment: string;
  itemName: string;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  mode?: 'create' | 'edit';
}

const MAX_TITLE = 120;
const MAX_COMMENT = 1500;

export default function EditMyReviewModal({
  isOpen,
  onClose,
  onSubmit,
  initialRating,
  initialTitle,
  initialComment,
  itemName,
  primary,
  textColor,
  isDarkBg,
  mode = 'edit',
}: EditMyReviewModalProps) {
  const isCreate = mode === 'create';
  const [rating, setRating] = useState(initialRating);
  const [title, setTitle] = useState(initialTitle);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setRating(initialRating);
      setTitle(initialTitle);
      setComment(initialComment);
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialRating, initialTitle, initialComment]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Elegí una calificación');
      return;
    }
    if (comment.trim().length < 3) {
      setError('El comentario es demasiado corto');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(rating, title.trim(), comment.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los cambios');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 Fondo del modal centralizado (lee --bg-color, reactivo a themeChange).
  const themeBg = useThemeBackground(undefined, isDarkBg);

  if (!isOpen) return null;

  const borderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const inputBg = isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)';
  const modalBg = themeBg;

  const canSubmit = rating >= 1 && comment.trim().length >= 3 && !isSubmitting;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: isDarkBg ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
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
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${primary}20`,
                color: primary,
              }}
            >
              {isCreate ? <StarIcon className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h2
                className="text-base font-black tracking-tight"
                style={{ color: textColor }}
              >
                {isCreate ? 'Dejar reseña' : 'Editar mi reseña'}
              </h2>
              <p
                className="text-[11px] mt-0.5 line-clamp-1"
                style={{ color: textColor, opacity: 0.6 }}
              >
                {itemName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl transition hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'rgba(100,116,139,0.1)' }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Rating */}
          <div className="space-y-2">
            <label
              className="block text-xs font-bold uppercase tracking-wider"
              style={{ color: textColor }}
            >
              Tu calificación *
            </label>
            <div className="flex items-center gap-3">
              <StarRating
                value={rating}
                onChange={setRating}
                size={32}
                gap={4}
                readOnly={isSubmitting}
              />
              {rating > 0 && (
                <span className="text-xs font-bold" style={{ color: primary }}>
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
              maxLength={MAX_TITLE}
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
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué te pareció el producto? ¿Lo recomendarías?"
              maxLength={MAX_COMMENT}
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
              style={{ color: textColor, opacity: 0.5 }}
            >
              {comment.length} / {MAX_COMMENT}
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
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex gap-2 shrink-0" style={{ borderColor }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition hover:opacity-80 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border"
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: primary }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isCreate ? 'Publicando...' : 'Guardando...'}
              </>
            ) : (
              isCreate ? 'Publicar reseña' : 'Guardar cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}