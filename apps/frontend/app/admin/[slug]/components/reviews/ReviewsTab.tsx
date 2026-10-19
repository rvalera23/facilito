'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Star,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  BadgeCheck,
  MessageCircle,
  Package,
  AlertCircle,
  Loader2,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import { useTenantReviews, type TenantReview, type TenantReviewsFilters } from './hooks/useTenantReviews';
import StarRating from '@/app/tienda/[slug]/components/StarRating';
import UserAvatar from '@/app/tienda/[slug]/components/UserAvatar';
import ReviewResponseModal from './ReviewResponseModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderFullPage } from '@/components/ui/Loader';

// ============================================================
// 🔥 REVIEWS TAB — Pestaña de gestión de reseñas para el admin
// ============================================================

interface ReviewsTabProps {
  tenant: any;
  tenantId: string;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

// ============================================================
// 🔥 HELPER: fecha relativa
// ============================================================
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

// ============================================================
// 🔥 SUBCOMPONENTE: una fila de review (lista izquierda)
// ============================================================
const ReviewListRow = React.memo(function ReviewListRow({
  review,
  isSelected,
  onSelect,
  primary,
  textColor,
  isDarkBg,
  borderColor,
}: {
  review: TenantReview;
  isSelected: boolean;
  onSelect: (review: TenantReview) => void;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
}) {
  const hasResponse = !!review.ownerResponse;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(review)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(review);
        }
      }}
      className={`w-full p-3 rounded-xl border transition-all cursor-pointer text-left hover:opacity-90`}
      style={{
        borderColor: isSelected ? primary : borderColor,
        borderLeftWidth: isSelected ? '4px' : '1px',
        borderLeftColor: isSelected ? primary : borderColor,
        backgroundColor: isSelected
          ? isDarkBg
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.03)'
          : 'transparent',
      }}
    >
      <div className="flex items-start gap-2.5">
        <UserAvatar
          name={review.user?.name || 'Usuario'}
          avatarUrl={review.user?.avatarUrl || null}
          size={36}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-xs font-bold truncate"
              style={{ color: textColor }}
            >
              {review.user?.name || 'Usuario'}
            </span>
            <span
              className="text-[10px] shrink-0"
              style={{ color: textColor, opacity: 0.5 }}
            >
              {formatRelativeDate(review.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <StarRating value={review.rating} readOnly size={11} gap={0.5} />
            {review.isVerifiedPurchase && (
              <BadgeCheck className="w-3 h-3 shrink-0" style={{ color: '#22c55e' }} />
            )}
          </div>

          {review.title && (
            <p
              className="text-[11px] font-medium truncate mt-0.5"
              style={{ color: textColor, opacity: 0.85 }}
            >
              {review.title}
            </p>
          )}

          {review.comment && (
            <p
              className="text-[10px] line-clamp-1 mt-0.5"
              style={{ color: textColor, opacity: 0.6 }}
            >
              {review.comment}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {hasResponse ? (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(34,197,94,0.15)',
                  color: '#16a34a',
                }}
              >
                ✓ Respondida
              </span>
            ) : (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(251,191,36,0.15)',
                  color: '#d97706',
                }}
              >
                ● Sin responder
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          className="w-3.5 h-3.5 shrink-0 mt-2"
          style={{ color: textColor, opacity: 0.4 }}
        />
      </div>
    </div>
  );
});

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
export default function ReviewsTab({
  tenant,
  tenantId,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: ReviewsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterResponse, setFilterResponse] = useState<boolean | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<TenantReview | null>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [responseModalReview, setResponseModalReview] = useState<TenantReview | null>(null);

  // 🔥 Filtros para el hook
  const filters: TenantReviewsFilters = useMemo(
    () => ({
      rating: filterRating,
      hasResponse: filterResponse,
    }),
    [filterRating, filterResponse],
  );

  const {
    reviews,
    total,
    stats,
    loading,
    loadingMore,
    submitting,
    error,
    hasMore,
    respondToReview,
    loadMore,
    refresh,
  } = useTenantReviews({ tenantId, filters, limit: 30 });

  const borderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');

  // 🔥 Filtro por texto (client-side)
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase().trim();
    return reviews.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q),
    );
  }, [reviews, searchQuery]);

  // 🔥 Handlers
  const handleSelectReview = useCallback((review: TenantReview) => {
    setSelectedReview(review);
  }, []);

  const handleOpenResponseModal = useCallback((review: TenantReview) => {
    setResponseModalReview(review);
    setResponseModalOpen(true);
  }, []);

  const handleCloseResponseModal = useCallback(() => {
    setResponseModalOpen(false);
    setResponseModalReview(null);
  }, []);

  const handleSubmitResponse = useCallback(
    async (response: string) => {
      if (!responseModalReview) return;
      await respondToReview(responseModalReview.id, response);
      // Actualizar también el selected si es el mismo
      setSelectedReview((prev) =>
        prev && prev.id === responseModalReview.id
          ? { ...prev, ownerResponse: response }
          : prev,
      );
    },
    [responseModalReview, respondToReview],
  );

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterRating(null);
    setFilterResponse(null);
    setSelectedReview(null);
  }, []);

  // ============================================================
  // RENDER: LOADING
  // ============================================================
  if (loading && reviews.length === 0) {
    return (
      <LoaderFullPage
        message="Cargando reseñas..."
        primary={primary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    );
  }

  // ============================================================
  // RENDER: ERROR
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

  const filterActive = filterRating !== null || filterResponse !== null;

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
                Reseñas
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
              <span className="w-px h-3 bg-current opacity-20" />
              <span style={{ color: '#16a34a' }}>
                ✓ {stats.withResponse} respondidas
              </span>
              {stats.withoutResponse > 0 && (
                <>
                  <span className="w-px h-3 bg-current opacity-20" />
                  <span style={{ color: '#d97706' }}>
                    ● {stats.withoutResponse} sin responder
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" style={{ borderColor, color: textColor }}>
            <Star className="w-4 h-4" />
          </div>
        </div>

        {/* ============================================================ */}
        {/* FILTROS */}
        {/* ============================================================ */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40"
              style={{ color: textColor }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, título o comentario..."
              className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor, color: textColor }}
            />
          </div>

          {/* Filtro dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              icon={
                <span className="inline-flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  {filterActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: primary }}
                    />
                  )}
                </span>
              }
              primary={primary}
              borderColor={borderColor}
              textColor={textColor}
              cardBg={cardBg}
              isDarkBg={isDarkBg}
            >
              Filtros
            </Button>

            {isFilterOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl border shadow-2xl py-2 min-w-[200px] z-50"
                style={{
                  backgroundColor: secondary || (isDarkBg ? '#1e293b' : '#ffffff'),
                  borderColor,
                }}
              >
                <div className="px-3 pb-2 mb-2 border-b" style={{ borderColor }}>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: textColor, opacity: 0.6 }}
                  >
                    Por estrellas
                  </span>
                </div>
                {[5, 4, 3, 2, 1].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setFilterRating(filterRating === r ? null : r);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:opacity-80 flex items-center gap-2 ${
                      filterRating === r ? 'font-bold' : ''
                    }`}
                    style={{ color: filterRating === r ? primary : textColor }}
                  >
                    <Star className="w-3 h-3" fill="currentColor" />
                    {r} estrella{r > 1 ? 's' : ''}
                    {filterRating === r && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </button>
                ))}

                <div
                  className="px-3 pb-2 mt-3 mb-2 border-b border-t pt-2"
                  style={{ borderColor }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: textColor, opacity: 0.6 }}
                  >
                    Por respuesta
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilterResponse(filterResponse === true ? null : true);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:opacity-80 flex items-center gap-2 ${
                    filterResponse === true ? 'font-bold' : ''
                  }`}
                  style={{ color: filterResponse === true ? primary : textColor }}
                >
                  <MessageCircle className="w-3 h-3" />
                  Respondidas
                  {filterResponse === true && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterResponse(filterResponse === false ? null : false);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:opacity-80 flex items-center gap-2 ${
                    filterResponse === false ? 'font-bold' : ''
                  }`}
                  style={{ color: filterResponse === false ? primary : textColor }}
                >
                  <MessageCircle className="w-3 h-3 opacity-40" />
                  Sin responder
                  {filterResponse === false && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                </button>

                {filterActive && (
                  <div className="px-3 pt-3 mt-2 border-t" style={{ borderColor }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterRating(null);
                        setFilterResponse(null);
                        setIsFilterOpen(false);
                      }}
                      className="w-full text-[11px] font-medium text-center underline"
                      style={{ color: textColor, opacity: 0.7 }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refrescar */}
          <button
            type="button"
            onClick={refresh}
            className="p-2.5 rounded-xl border hover:opacity-70"
            style={{ borderColor, color: textColor }}
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(filterActive || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-2.5 rounded-xl border text-xs hover:opacity-80"
              style={{ borderColor, color: textColor }}
              title="Resetear todo"
            >
              ✕
            </button>
          )}
        </div>

        {/* ============================================================ */}
        {/* CONTENIDO — Layout 2 columnas */}
        {/* ============================================================ */}
        {filteredReviews.length === 0 ? (
          <EmptyState
            icon={<Star className="w-12 h-12" />}
            message={
              searchQuery || filterActive
                ? 'No se encontraron reseñas con estos filtros.'
                : 'No hay reseñas todavía.'
            }
            primary={primary}
            textColor={textColor}
            borderColor={borderColor}
            cardBg={cardBg}
            isDarkBg={isDarkBg}
          />
        ) : (
          <div className="flex gap-4">
            {/* 🔥 COLUMNA IZQUIERDA: Lista de reviews (35%) */}
            <div className="w-[35%] flex-shrink-0">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {filteredReviews.map((review) => (
                  <ReviewListRow
                    key={review.id}
                    review={review}
                    isSelected={selectedReview?.id === review.id}
                    onSelect={handleSelectReview}
                    primary={primary}
                    textColor={textColor}
                    isDarkBg={isDarkBg}
                    borderColor={borderColor}
                  />
                ))}

                {hasMore && !searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
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
                      : `Cargar más (${total - reviews.length} restantes)`}
                  </Button>
                )}
              </div>
            </div>

            {/* 🔥 COLUMNA DERECHA: Detalle (65%) */}
            <div className="w-[65%] flex-shrink-0">
              {selectedReview ? (
                <ReviewDetailPanel
                  review={selectedReview}
                  primary={primary}
                  textColor={textColor}
                  isDarkBg={isDarkBg}
                  borderColor={borderColor}
                  onRespond={() => handleOpenResponseModal(selectedReview)}
                />
              ) : (
                <div
                  className="h-[500px] flex items-center justify-center rounded-2xl border-2 border-dashed"
                  style={{
                    borderColor,
                    backgroundColor: isDarkBg
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <EmptyState
                    icon={<MessageCircle className="w-12 h-12" />}
                    title="Seleccioná una reseña"
                    message="Elegí una reseña de la lista para verla completa"
                    primary={primary}
                    textColor={textColor}
                    borderColor={borderColor}
                    cardBg={cardBg}
                    isDarkBg={isDarkBg}
                    padding="py-0"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 MODAL DE RESPUESTA */}
      {responseModalReview && (
        <ReviewResponseModal
          isOpen={responseModalOpen}
          onClose={handleCloseResponseModal}
          onSubmit={handleSubmitResponse}
          review={responseModalReview}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      )}
    </>
  );
}

// ============================================================
// 🔥 PANEL DE DETALLE (columna derecha)
// ============================================================
function ReviewDetailPanel({
  review,
  primary,
  textColor,
  isDarkBg,
  borderColor,
  onRespond,
}: {
  review: TenantReview;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderColor: string;
  onRespond: () => void;
}) {
  const hasResponse = !!review.ownerResponse;

  return (
    <div
      className="rounded-2xl border p-5 space-y-5"
      style={{
        borderColor,
        backgroundColor: isDarkBg
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(0,0,0,0.01)',
      }}
    >
      {/* Header: usuario + fecha */}
      <div className="flex items-start gap-3">
        <UserAvatar
          name={review.user?.name || 'Usuario'}
          avatarUrl={review.user?.avatarUrl || null}
          size={48}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm" style={{ color: textColor }}>
              {review.user?.name || 'Usuario'}
            </span>
            {review.isVerifiedPurchase && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(34,197,94,0.15)',
                  color: '#16a34a',
                }}
              >
                <BadgeCheck className="w-3 h-3" />
                Compra verificada
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={review.rating} readOnly size={14} gap={1} />
            <span
              className="text-[11px]"
              style={{ color: textColor, opacity: 0.5 }}
            >
              {formatRelativeDate(review.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Producto/Servicio */}
      <div
        className="flex items-center gap-2 p-3 rounded-xl border"
        style={{ borderColor, backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }}
      >
        <Package className="w-4 h-4 shrink-0" style={{ color: primary }} />
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: textColor, opacity: 0.75 }}
        >
          {review.itemType === 'service' ? 'Servicio' : 'Producto'} ·{' '}
          <span className="font-mono text-[10px] opacity-60">
            {review.itemId.slice(0, 8)}...
          </span>
        </span>
      </div>

      {/* Título + comentario */}
      <div className="space-y-2">
        {review.title && (
          <h4 className="font-bold text-sm" style={{ color: textColor }}>
            {review.title}
          </h4>
        )}
        {review.comment && (
          <p
            className="text-xs leading-relaxed whitespace-pre-line"
            style={{ color: textColor, opacity: 0.85 }}
          >
            {review.comment}
          </p>
        )}
      </div>

      {/* Respuesta del dueño */}
      {hasResponse ? (
        <div
          className="p-4 rounded-2xl"
          style={{
            backgroundColor: isDarkBg
              ? 'rgba(34,197,94,0.06)'
              : 'rgba(34,197,94,0.04)',
            borderColor: isDarkBg
              ? 'rgba(34,197,94,0.25)'
              : 'rgba(34,197,94,0.20)',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <MessageCircle
                className="w-3.5 h-3.5"
                style={{ color: '#16a34a' }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: '#16a34a' }}
              >
                Tu respuesta
              </span>
            </div>
            <button
              type="button"
              onClick={onRespond}
              className="text-[10px] font-medium underline opacity-70 hover:opacity-100 cursor-pointer"
              style={{ color: textColor }}
            >
              Editar
            </button>
          </div>
          <p
            className="text-xs leading-relaxed whitespace-pre-line"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {review.ownerResponse}
          </p>
        </div>
      ) : (
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onRespond}
          icon={<MessageCircle className="w-4 h-4" />}
          primary={primary}
          borderColor={borderColor}
          textColor={textColor}
          cardBg={isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'}
          isDarkBg={isDarkBg}
        >
          Escribir respuesta
        </Button>
      )}
    </div>
  );
}