'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Star,
  Package,
  Calendar,
  MessageCircle,
  BadgeCheck,
  Edit3,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useMyReviews, type MyReview } from './hooks/useMyReviews';
import { usePendingReviews, type PendingReviewItem } from './hooks/usePendingReviews';
import StarRating from '@/app/tienda/[slug]/components/StarRating';
import EditMyReviewModal from './EditMyReviewModal';
import PendingReviewModal from './PendingReviewModal';
import { Star as StarIcon, Package as PackageIcon, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderFullPage } from '@/components/ui/Loader';
// ============================================================
// 🔥 MY REVIEWS TAB — Pestaña de "Mis Reseñas" del comprador
// ============================================================

interface MyReviewsTabProps {
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  tenantSlug?: string | null;
}

// 🔥 Helper: fecha relativa
function formatRelativeDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 60) return `Hace ${Math.max(1, diffMin)} min`;
  if (diffHour < 24) return `Hace ${diffHour}h`;
  if (diffDay < 7) return `Hace ${diffDay}d`;
  if (diffDay < 30) return `Hace ${Math.floor(diffDay / 7)}sem`;
  if (diffDay < 365) return `Hace ${Math.floor(diffDay / 30)}mes`;
  return `Hace ${Math.floor(diffDay / 365)}a`;
}

// 🔥 Helper: formatear URL de imagen
function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (typeof window === 'undefined') return path;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

  if (path.startsWith('/')) {
    return `${cleanBase}${path}`;
  }

  return `${cleanBase}/uploads/${path}`;
}

// ============================================================
// 🔥 CARD DE RESEÑA INDIVIDUAL
// ============================================================
const MyReviewCard = React.memo(function MyReviewCard({
  review,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  onEdit,
  onDelete,
  tenantSlug,
}: {
  review: MyReview;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
  onEdit: (review: MyReview) => void;
  onDelete: (review: MyReview) => void;
  tenantSlug?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = buildImageUrl(review.item?.coverImage);
  const showImage = !!imageUrl && !imgError;

  const isService = review.itemType === 'service';

  const handleOpenProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!review.item?.id) return;

    const slug = tenantSlug || '';
    if (!slug) return;

    const queryParam = isService ? 'servicio' : 'producto';
    window.open(`/tienda/${slug}?${queryParam}=${review.item.id}`, '_blank');
  };

  return (
    <div
      className="p-4 rounded-2xl border"
      style={{
        backgroundColor: isDarkBg
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(255,255,255,0.6)',
        borderColor,
      }}
    >
      {/* ============================================================ */}
      {/* HEADER: Producto + Fecha */}
      {/* ============================================================ */}
      <div className="flex items-start gap-3">
        {/* Imagen */}
        <div
          className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center"
          style={{
            borderColor,
            backgroundColor: isDarkBg
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(0,0,0,0.03)',
          }}
        >
          {showImage ? (
            <img
              src={imageUrl as string}
              alt={review.item?.name || 'Producto'}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <Package
              className="w-6 h-6 opacity-30"
              style={{ color: textColor }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${primary}20`,
                    color: primary,
                  }}
                >
                  {isService ? 'Servicio' : 'Producto'}
                </span>
                {review.isVerifiedPurchase && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{
                      backgroundColor: 'rgba(34,197,94,0.15)',
                      color: '#16a34a',
                    }}
                  >
                    <BadgeCheck className="w-3 h-3" />
                    Verificada
                  </span>
                )}
              </div>

              <h3
                className="font-bold text-sm mt-1.5 line-clamp-1"
                style={{ color: textColor }}
              >
                {review.item?.name || 'Producto'}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleOpenProduct}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition shrink-0 cursor-pointer"
              style={{ color: textColor }}
              title="Ver en la tienda"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <StarRating value={review.rating} readOnly size={12} gap={0.5} />
            <span
              className="text-[10px]"
              style={{ color: textColor, opacity: 0.5 }}
            >
              {formatRelativeDate(review.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* COMENTARIO */}
      {/* ============================================================ */}
      {review.title && (
        <p
          className="text-xs font-bold mt-3"
          style={{ color: textColor }}
        >
          {review.title}
        </p>
      )}

      {review.comment && (
        <p
          className="text-xs leading-relaxed whitespace-pre-line mt-1.5"
          style={{ color: textColor, opacity: 0.85 }}
        >
          {review.comment}
        </p>
      )}

      {/* ============================================================ */}
      {/* RESPUESTA DEL VENDEDOR */}
      {/* ============================================================ */}
      {review.ownerResponse && (
        <div
          className="mt-3 p-3 rounded-xl border"
          style={{
            backgroundColor: isDarkBg
              ? 'rgba(34,197,94,0.06)'
              : 'rgba(34,197,94,0.04)',
            borderColor: isDarkBg
              ? 'rgba(34,197,94,0.25)'
              : 'rgba(34,197,94,0.20)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageCircle
              className="w-3 h-3"
              style={{ color: '#16a34a' }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: '#16a34a' }}
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

      {/* ============================================================ */}
      {/* ACCIONES */}
      {/* ============================================================ */}
      <div
        className="flex items-center justify-end gap-2 mt-3 pt-3 border-t"
        style={{ borderColor }}
      >
        <Button
          variant="outline"
          size="xs"
          onClick={() => onEdit(review)}
          icon={<Edit3 className="w-3 h-3" />}
          primary={primary}
          borderColor={borderColor}
          textColor={textColor}
          cardBg={isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'}
          isDarkBg={isDarkBg}
        >
          Editar
        </Button>
        <Button
          variant="outline-danger"
          size="xs"
          onClick={() => onDelete(review)}
          icon={<Trash2 className="w-3 h-3" />}
          primary={primary}
          borderColor={borderColor}
          textColor={textColor}
          cardBg={isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'}
          isDarkBg={isDarkBg}
        >
          Eliminar
        </Button> 
      </div>
    </div>
  );
});

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
export default function MyReviewsTab({
  primary,
  secondary,
  textColor,
  isDarkBg,
  tenantSlug,
}: MyReviewsTabProps) {
  const { showToast } = useToast();

  const {
    reviews,
    total,
    stats,
    loading,
    loadingMore,
    submitting,
    error,
    hasMore,
    updateReview,
    deleteReview,
    loadMore,
    refresh,
  } = useMyReviews({ limit: 10 });

  // 🔥 Items pendientes de reseñar
  const reviewedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of reviews) {
      set.add(`${r.itemType}:${r.itemId}`);
    }
    return set;
  }, [reviews]);

  const {
    items: pendingItems,
    total: pendingTotal,
    loading: pendingLoading,
    refresh: refreshPending,
  } = usePendingReviews({ reviewedKeys });

  const [selectedPending, setSelectedPending] = useState<PendingReviewItem | null>(null);

  const [editingReview, setEditingReview] = useState<MyReview | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const borderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  // 🔥 Editar
  const handleEdit = useCallback((review: MyReview) => {
    setEditingReview(review);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingReview(null);
  }, []);

  const handleSubmitEdit = useCallback(
    async (rating: number, title: string, comment: string) => {
      if (!editingReview) return;
      await updateReview(editingReview.id, rating, title, comment);
    },
    [editingReview, updateReview],
  );

  // 🔥 Eliminar
  const handleDelete = useCallback(
    async (review: MyReview) => {
      if (!confirm('¿Estás seguro de que querés eliminar esta reseña?')) return;
      try {
        await deleteReview(review.id);
        showToast({
          variant: 'success',
          message: 'Reseña eliminada correctamente.',
        });
      } catch (err: any) {
        showToast({
          variant: 'error',
          message: err?.message || 'Error al eliminar',
        });
      }
    },
    [deleteReview, showToast],
  );

  // ============================================================
  // LOADING
  // ============================================================
  if (loading && reviews.length === 0) {
    return (
      <LoaderFullPage
        message="Cargando tus reseñas..."
        primary={primary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    );
  }

  // ============================================================
  // ERROR
  // ============================================================
  if (error && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <AlertCircle className="w-10 h-10" style={{ color: '#ef4444' }} />
        <p className="text-sm font-bold" style={{ color: textColor }}>
          {error}
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={refresh}
          primary={primary}
          borderColor={borderColor}
          textColor={textColor}
          cardBg={cardBg}
          isDarkBg={isDarkBg}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className="border rounded-3xl shadow-xl w-full p-6 space-y-6"
        style={{ backgroundColor: cardBg, borderColor, color: textColor }}
      >
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-3 border-b gap-3"
          style={{ borderColor }}
        >
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
                Mis Reseñas
              </h3>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: `${primary}20`,
                  color: primary,
                }}
              >
                {total}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs" style={{ color: textColor, opacity: 0.7 }}>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" fill={primary} stroke={primary} />
                {stats.averageRating.toFixed(1)} promedio
              </span>
              {stats.withResponse > 0 && (
                <>
                  <span className="w-px h-3 bg-current opacity-20" />
                  <span style={{ color: '#16a34a' }}>
                    ✓ {stats.withResponse} con respuesta
                  </span>
                </>
              )}
            </div>
          </div>

          

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="p-2.5 rounded-xl border hover:opacity-70"
              style={{ borderColor, color: textColor }}
              title="Refrescar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div
              className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm"
              style={{ borderColor, color: textColor }}
            >
              <Star className="w-4 h-4" />
            </div>
          </div>
        </div>

                {/* ============================================================ */}
        {/* 🔥 PENDIENTES DE RESEÑAR                                     */}
        {/* ============================================================ */}
        {pendingTotal > 0 && (
          <div
            className="rounded-2xl border p-4 space-y-3"
            style={{
              borderColor: `${primary}40`,
              backgroundColor: `${primary}08`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StarIcon className="w-4 h-4 shrink-0" style={{ color: primary }} />
                <span className="text-xs font-bold truncate" style={{ color: textColor }}>
                  Tenés {pendingTotal} {pendingTotal === 1 ? 'producto' : 'productos'} sin reseñar
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  refreshPending();
                  refresh();
                }}
                className="text-[10px] font-medium underline opacity-70 hover:opacity-100 shrink-0"
                style={{ color: textColor }}
              >
                Actualizar
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {pendingItems.map((item) => (
                <div
                  key={`${item.orderId}-${item.itemType}-${item.itemId}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl border"
                  style={{
                    borderColor,
                    backgroundColor: isDarkBg
                      ? 'rgba(0,0,0,0.2)'
                      : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {/* Imagen */}
                  <div
                    className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center"
                    style={{ borderColor }}
                  >
                    {item.itemCoverImage ? (
                      <img
                        src={item.itemCoverImage}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <PackageIcon
                        className="w-4 h-4 opacity-40"
                        style={{ color: textColor }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-bold truncate"
                      style={{ color: textColor }}
                    >
                      {item.itemName}
                    </p>
                    <p
                      className="text-[9px] opacity-60 truncate"
                      style={{ color: textColor }}
                    >
                      {item.tenantName ? `${item.tenantName} · ` : ''}
                      Orden #{item.orderId.slice(0, 8)}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={() => setSelectedPending(item)}
                    className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white transition hover:opacity-90 active:scale-[0.97] cursor-pointer flex items-center gap-1"
                    style={{ backgroundColor: primary }}
                  >
                    Reseñar
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CONTENIDO */}
        {/* ============================================================ */}
        {reviews.length === 0 ? (
          <EmptyState
            icon={<Star className="w-14 h-14" />}
            title="Todavía no escribiste ninguna reseña"
            message="Cuando compres algo y la orden se complete, vas a poder dejar tu opinión acá."
            primary={primary}
            textColor={textColor}
            borderColor={borderColor}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
            padding="py-16"
          />
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <MyReviewCard
                key={review.id}
                review={review}
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={borderColor}
                onEdit={handleEdit}
                onDelete={handleDelete}
                tenantSlug={tenantSlug}
              />
            ))}

            {hasMore && (
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={loadMore}
                disabled={loadingMore}
                loading={loadingMore}
                primary={primary}
                borderColor={borderColor}
                textColor={textColor}
                cardBg={cardBg}
                isDarkBg={isDarkBg}
              >
                {loadingMore
                  ? 'Cargando...'
                  : `Ver más reseñas (${total - reviews.length} restantes)`}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL DE EDICIÓN */}
      {/* ============================================================ */}
      {editingReview && (
        <EditMyReviewModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSubmit={handleSubmitEdit}
          initialRating={editingReview.rating}
          initialTitle={editingReview.title || ''}
          initialComment={editingReview.comment || ''}
          itemName={editingReview.item?.name || 'Producto'}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      )}

            {/* 🔥 MODAL DE RESEÑA PENDIENTE */}
      <PendingReviewModal
        isOpen={!!selectedPending}
        onClose={() => setSelectedPending(null)}
        item={selectedPending}
        userId={undefined}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
        onReviewSubmitted={() => {
          // Refrescar tanto las reseñas como los pendientes
          refresh();
          refreshPending();
        }}
      />
    </>
  );
}