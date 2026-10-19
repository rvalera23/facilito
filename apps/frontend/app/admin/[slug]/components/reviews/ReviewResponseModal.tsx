'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import UserAvatar from '@/app/tienda/[slug]/components/UserAvatar';
import StarRating from '@/app/tienda/[slug]/components/StarRating';
import type { TenantReview } from './hooks/useTenantReviews';

// ============================================================
// 🔥 REVIEW RESPONSE MODAL — Responder a una reseña
// ============================================================
// Modal simple con textarea para escribir la respuesta del dueño.
// Muestra la reseña original arriba para contexto.
// Incluye respuestas rápidas predefinidas.

interface ReviewResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (response: string) => Promise<void>;
  review: TenantReview;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

// 🔥 Respuestas rápidas predefinidas
const QUICK_RESPONSES = [
  '¡Gracias por tu reseña! Nos alegra mucho que hayas tenido una buena experiencia.',
  'Gracias por tu feedback, lo tendremos en cuenta para seguir mejorando.',
  'Lamentamos tu experiencia. Nos gustaría contactarte para resolverlo.',
  'Agradecemos tu tiempo para dejarnos tu opinión. ¡Te esperamos pronto!',
];

const MAX_LENGTH = 1500;

export default function ReviewResponseModal({
  isOpen,
  onClose,
  onSubmit,
  review,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: ReviewResponseModalProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!review.ownerResponse;

  // 🔥 Resetear al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setResponse(review.ownerResponse || '');
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, review.ownerResponse]);

  // 🔥 Cerrar con ESC
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
    const trimmed = response.trim();

    if (!trimmed) {
      setError('La respuesta no puede estar vacía');
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      setError(`La respuesta no puede superar los ${MAX_LENGTH} caracteres`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al enviar la respuesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickResponse = (text: string) => {
    setResponse(text);
    setError(null);
    textareaRef.current?.focus();
  };

  if (!isOpen) return null;

  const borderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const inputBg = isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)';
const modalBg = secondary || (isDarkBg ? '#0f172a' : '#ffffff');
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
        className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: modalBg,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor,
          color: textColor,
        }}
      >
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
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
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-base font-black tracking-tight"
                style={{ color: textColor }}
              >
                {isEditing ? 'Editar respuesta' : 'Responder reseña'}
              </h2>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: textColor, opacity: 0.6 }}
              >
                Tu respuesta será visible públicamente en la tienda
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

        {/* ============================================================ */}
        {/* BODY (scrollable) */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contexto: la reseña original */}
          <div
            className="p-4 rounded-2xl border"
            style={{
              borderColor,
              backgroundColor: isDarkBg
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(0,0,0,0.02)',
            }}
          >
            <div className="flex items-start gap-3">
              <UserAvatar
                name={review.user?.name || 'Usuario'}
                avatarUrl={review.user?.avatarUrl || null}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-bold text-sm"
                    style={{ color: textColor }}
                  >
                    {review.user?.name || 'Usuario'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating value={review.rating} readOnly size={12} gap={0.5} />
                </div>
                {review.title && (
                  <p
                    className="text-xs font-bold mt-2"
                    style={{ color: textColor }}
                  >
                    {review.title}
                  </p>
                )}
                {review.comment && (
                  <p
                    className="text-xs leading-relaxed mt-1 opacity-80"
                    style={{ color: textColor }}
                  >
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Respuestas rápidas */}
          {!isEditing && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: primary }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  Respuestas rápidas
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_RESPONSES.map((text, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickResponse(text)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-full text-[10px] font-medium border transition hover:opacity-80 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor,
                      color: textColor,
                      backgroundColor: isDarkBg
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    {text.length > 45 ? `${text.slice(0, 45)}...` : text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea de respuesta */}
          <div className="space-y-2">
            <label
              className="block text-xs font-bold uppercase tracking-wider"
              style={{ color: textColor }}
            >
              Tu respuesta *
            </label>
            <textarea
              ref={textareaRef}
              value={response}
              onChange={(e) => {
                setResponse(e.target.value);
                setError(null);
              }}
              placeholder="Escribí tu respuesta pública..."
              maxLength={MAX_LENGTH}
              rows={6}
              disabled={isSubmitting}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none border-2 transition resize-none disabled:opacity-60"
              style={{
                backgroundColor: inputBg,
                borderColor,
                color: textColor,
              }}
            />
            <div className="flex items-center justify-between">
              <p
                className="text-[10px]"
                style={{ color: textColor, opacity: 0.5 }}
              >
                Respetuoso y profesional. Se muestra con tu nombre comercial.
              </p>
              <p
                className={`text-[10px] ${
                  response.length > MAX_LENGTH * 0.9 ? 'text-amber-500' : ''
                }`}
                style={{
                  color:
                    response.length > MAX_LENGTH * 0.9
                      ? '#d97706'
                      : textColor,
                  opacity: response.length > MAX_LENGTH * 0.9 ? 1 : 0.5,
                }}
              >
                {response.length} / {MAX_LENGTH}
              </p>
            </div>
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

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <div
          className="p-5 border-t flex gap-2 shrink-0"
          style={{ borderColor }}
        >
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
            disabled={isSubmitting || !response.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              'Publicar respuesta'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}