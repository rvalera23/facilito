'use client';

// ============================================================
// ARCHIVO: apps/frontend/components/tracking/OrderTrackingPanel.tsx
// Panel completo de tracking de una orden.
// Combina: chip de ETA + estado + mapa + notificación nearby.
// ============================================================

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOrderTracking } from '@/hooks/useOrderTracking';
// Leaflet usa `window` en el import — hay que cargarlo client-side only.
const OrderTrackingMap = dynamic(() => import('./OrderTrackingMap'), {
  ssr: false,
});
interface OrderTrackingPanelProps {
  /** ID de la orden o booking a trackear. */
  orderId: string;
  /**
   * Tipo de tracking:
   *   - 'order'   → orden de producto (repartidor)
   *   - 'booking' → booking de servicio (profesional)
   * Default: 'order'
   */
  trackingType?: 'order' | 'booking';
  /** Tema. */
  safePrimary?: string;
  textMainClass?: string;
  textMutedClass?: string;
  /** Altura del mapa en px. Default 320. */
  mapHeight?: number;
}

const STATUS_LABELS_ORDER: Record<string, string> = {
  pending: 'Buscando repartidor',
  assigned: 'Repartidor asignado',
  accepted: 'Repartidor en camino al local',
  picked_up: 'En camino a tu dirección',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado por el repartidor',
};

const STATUS_LABELS_BOOKING: Record<string, string> = {
  pending: 'Buscando profesional',
  assigned: 'Profesional asignado',
  accepted: 'Profesional confirmado',
  in_transit: 'Profesional en camino',
  in_service: 'Servicio en progreso',
  completed: 'Servicio completado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado por el profesional',
};

const STATUS_ICONS: Record<string, 'truck' | 'clock' | 'check' | 'alert'> = {
  pending: 'clock',
  assigned: 'truck',
  accepted: 'truck',
  picked_up: 'truck',
  delivered: 'check',
  cancelled: 'alert',
  rejected: 'alert',
};

function StatusIcon({ type }: { type: 'truck' | 'clock' | 'check' | 'alert' }) {
  if (type === 'truck') return <Truck className="w-4 h-4" />;
  if (type === 'clock') return <Clock className="w-4 h-4" />;
  if (type === 'check') return <CheckCircle2 className="w-4 h-4" />;
  return <AlertCircle className="w-4 h-4" />;
}

export default function OrderTrackingPanel({
  orderId,
  trackingType = 'order',
  safePrimary = '#10b981',
  textMainClass = 'text-slate-100',
  textMutedClass = 'text-slate-400',
  mapHeight = 320,
}: OrderTrackingPanelProps) {
  const {
    loading,
    error,
    assignment,
    eta,
    driverPosition,
    liveDistanceKm,
    liveEtaMinutes,
    isNearby,
    nearbyDistanceM,
    status,
    refresh,
  } = useOrderTracking({ orderId });

  // Estado local para notificación in-app cuando llega nearby
  const [showNearbyToast, setShowNearbyToast] = useState(false);

  useEffect(() => {
    if (isNearby) {
      setShowNearbyToast(true);
      const timer = setTimeout(() => setShowNearbyToast(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [isNearby]);

  // -------- Loading --------
  if (loading && !assignment) {
    return (
      <div
        className="rounded-2xl border p-6 flex items-center gap-3"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="w-5 h-5 border-2 border-transparent rounded-full animate-spin"
          style={{ borderTopColor: safePrimary, borderRightColor: safePrimary }}
        />
        <span className={`text-xs ${textMutedClass}`}>
          Cargando tracking...
        </span>
      </div>
    );
  }

  // -------- Error --------
  if (error && !assignment) {
    return (
      <div
        className="rounded-2xl border p-4 flex items-center gap-3"
        style={{
          borderColor: 'rgba(239,68,68,0.3)',
          backgroundColor: 'rgba(239,68,68,0.06)',
        }}
      >
        <AlertCircle className="w-5 h-5 text-rose-500" />
        <div className="flex-1">
          <div className="text-xs font-bold text-rose-500">
            No se pudo cargar el tracking
          </div>
          <div className="text-[10px] text-rose-400">{error}</div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // -------- Sin assignment --------
  if (!assignment) {
    return (
      <div
        className="rounded-2xl border p-4 flex items-center gap-3"
        style={{
          borderColor: 'rgba(234,179,8,0.3)',
          backgroundColor: 'rgba(234,179,8,0.06)',
        }}
      >
        <Clock className="w-5 h-5 text-amber-500" />
        <div>
          <div className="text-xs font-bold text-amber-500">
            {trackingType === 'booking'
              ? 'Aún no hay profesional asignado'
              : 'Aún no hay repartidor asignado'}
          </div>
          <div className={`text-[10px] ${textMutedClass}`}>
            Te avisaremos cuando esté en camino.
          </div>
        </div>
      </div>
    );
  }

  // -------- Asignación activa --------
  const currentStatus = status || assignment.status;
  const activeLabels = trackingType === 'booking' ? STATUS_LABELS_BOOKING : STATUS_LABELS_ORDER;
  const statusLabel = activeLabels[currentStatus] || currentStatus;
  const statusIconType = STATUS_ICONS[currentStatus] || 'truck';

  // Posiciones para el mapa
  const driverPos = driverPosition
    ? { lat: driverPosition.lat, lng: driverPosition.lng }
    : assignment.driver?.currentLat != null && assignment.driver?.currentLng != null
    ? { lat: assignment.driver.currentLat, lng: assignment.driver.currentLng }
    : null;

  const destPos =
    eta?.destinationLat != null && eta?.destinationLng != null
      ? { lat: eta.destinationLat, lng: eta.destinationLng }
      : null;

  const driverName = assignment.driver?.user?.name || 
    (trackingType === 'booking' ? 'Tu profesional' : 'Tu repartidor');

  return (
    <div className="space-y-3">
      {/* Toast nearby */}
      {showNearbyToast && (
        <div
          className="rounded-2xl border p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
          style={{
            borderColor: `${safePrimary}60`,
            backgroundColor: `${safePrimary}15`,
          }}
        >
          <MapPin className="w-5 h-5" style={{ color: safePrimary }} />
          <div>
            <div className="text-xs font-bold" style={{ color: safePrimary }}>
              {trackingType === 'booking'
                ? '¡Tu profesional está cerca!'
                : '¡Tu repartidor está cerca!'}
            </div>
            {nearbyDistanceM != null && (
              <div className={`text-[10px] ${textMutedClass}`}>
                A unos {nearbyDistanceM} metros de tu ubicación.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header con estado + ETA */}
      <div
        className="rounded-2xl border p-4 flex items-start justify-between gap-3"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${safePrimary}15`, color: safePrimary }}
          >
            <StatusIcon type={statusIconType} />
          </div>
          <div>
            <div className={`text-sm font-bold ${textMainClass}`}>
              {statusLabel}
            </div>
            {assignment.driver?.vehiclePlate && (
              <div className={`text-[11px] ${textMutedClass}`}>
                {assignment.driver.vehicleType || 'vehículo'} ·{' '}
                {assignment.driver.vehiclePlate}
              </div>
            )}
          </div>
        </div>

        {liveEtaMinutes != null && (
          <div className="text-right">
            <div className="text-xl font-black" style={{ color: safePrimary }}>
              {liveEtaMinutes}
              <span className="text-sm font-bold ml-1">min</span>
            </div>
            {liveDistanceKm != null && (
              <div className={`text-[10px] ${textMutedClass}`}>
                {liveDistanceKm < 1
                  ? `${Math.round(liveDistanceKm * 1000)} m`
                  : `${liveDistanceKm.toFixed(1)} km`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      {(driverPos || destPos) && (
        <OrderTrackingMap
          driverPosition={driverPos}
          destinationPosition={destPos}
          height={mapHeight}
          driverName={driverName}
        />
      )}

      {/* Nota de última actualización */}
      {driverPosition?.at && (
        <div className={`text-[10px] text-right ${textMutedClass}`}>
          Actualizado{' '}
          {new Date(driverPosition.at).toLocaleTimeString('es-VE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}
