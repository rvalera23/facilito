'use client';

// ============================================================
// ARCHIVO: apps/frontend/components/LocalDeliveryBlock.tsx
// Bloque de delivery local (facilito) para el checkout.
// Coexiste con el delivery legacy (mensajería nacional).
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, MapPin, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useDeliveryCheck } from '@/hooks/useDeliveryCheck';

export interface LocalDeliverySelection {
  enabled: boolean;
  fulfillment: 'delivery' | 'pickup';
  fee: number | null;
  distanceKm: number | null;
  etaMinutes: number | null;
}

interface LocalDeliveryBlockProps {
  /** Slug del tenant para consultar /geo/check-delivery. */
  tenantSlug: string | null | undefined;
  /** Coords del comprador. */
  buyerLat: number | null | undefined;
  buyerLng: number | null | undefined;
  /** Subtotal del carrito (en USD) para validar min_order_amount. */
  orderSubtotal?: number | null;
  /** Callback cuando el comprador elige delivery local o pickup. */
  onChange: (sel: LocalDeliverySelection | null) => void;
  /** Callback para pedir GPS al navegador. */
  onRequestLocation?: () => void;
  /** Tema. */
  safePrimary: string;
  resolvedTextMain: string;
  resolvedTextMuted: string;
  borderDynamic: string;
  isSecondaryLight: boolean;
  /**
   * 🔥 Notifica al padre si el delivery local está disponible para este comprador.
   * - true:  el comprador está dentro del rango y la tienda puede entregar.
   * - false: el comprador NO puede recibir delivery local (fuera de rango, sin config, etc.).
   * - null:  todavía no se sabe (falta GPS, loading, etc.).
   */
  onAvailabilityChange?: (available: boolean | null) => void;
}

export default function LocalDeliveryBlock({
  tenantSlug,
  buyerLat,
  buyerLng,
  orderSubtotal,
  onChange,
  onRequestLocation,
  safePrimary,
  resolvedTextMain,
  resolvedTextMuted,
  borderDynamic,
  isSecondaryLight,
  onAvailabilityChange,
}: LocalDeliveryBlockProps) {
  const hasCoords =
    buyerLat != null &&
    buyerLng != null &&
    Number.isFinite(Number(buyerLat)) &&
    Number.isFinite(Number(buyerLng));

  const { result, loading, error } = useDeliveryCheck({
    tenantSlug,
    buyerLat,
    buyerLng,
    orderSubtotal,
    enabled: hasCoords && Boolean(tenantSlug),
  });

  const [localEnabled, setLocalEnabled] = useState(false);

  // 🔥 FIX: NO activar por defecto. El comprador debe elegir explícitamente.
  useEffect(() => {
    if (!result?.canDeliver) {
      setLocalEnabled(false);
    }
    // Si canDeliver es true, NO tocamos localEnabled.
    // Deja el estado que el comprador eligió (por defecto false).
  }, [result?.canDeliver]);

  // Notificar al padre SOLO cuando el comprador activa/desactiva manualmente
  const handleToggle = useCallback(() => {
    setLocalEnabled((prev) => {
      const next = !prev;
      console.log('🎯 [LocalDeliveryBlock] toggle:', next);
      if (next && result?.canDeliver) {
        onChange({
          enabled: true,
          fulfillment: 'delivery',
          fee: result.fee ?? null,
          distanceKm: result.distanceKm ?? null,
          etaMinutes: result.etaMinutes ?? null,
        });
      } else {
        onChange(null);
      }
      return next;
    });
  }, [result?.canDeliver, result?.fee, result?.distanceKm, result?.etaMinutes, onChange]);

  // Si el resultado llega después de que el usuario ya activó, actualizar el fee/eta
  useEffect(() => {
    if (localEnabled && result?.canDeliver) {
      onChange({
        enabled: true,
        fulfillment: 'delivery',
        fee: result.fee ?? null,
        distanceKm: result.distanceKm ?? null,
        etaMinutes: result.etaMinutes ?? null,
      });
    }
    // ⚠️ No mandamos null acá. Solo actualizamos si está activo.
  }, [localEnabled, result?.canDeliver, result?.fee, result?.distanceKm, result?.etaMinutes, onChange]);

  // 🔥 Notificar al padre sobre la disponibilidad del delivery local
  // (para que sepa si mostrar el selector de método de envío o no)
  useEffect(() => {
    if (!onAvailabilityChange) return;
    if (!hasCoords || !tenantSlug) {
      onAvailabilityChange(null);
      return;
    }
    if (loading) {
      onAvailabilityChange(null);
      return;
    }
    if (error) {
      // 🔥 Si hay error, mandar null (no false): así el padre NO desmonta el bloque
      // y puede reintentar en el próximo render.
      onAvailabilityChange(null);
      return;
    }
    onAvailabilityChange(Boolean(result?.canDeliver));
  }, [hasCoords, tenantSlug, loading, error, result?.canDeliver, onAvailabilityChange]);

  // Si no hay coords, pedir ubicación
  if (!hasCoords) {
    return (
      <div
        className="p-3 rounded-2xl border space-y-2"
        style={{
          borderColor: borderDynamic,
          backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: safePrimary }} />
          <span className="text-xs font-bold" style={{ color: resolvedTextMain }}>
            Delivery local
          </span>
        </div>
        <p className="text-[11px]" style={{ color: resolvedTextMuted }}>
          Activa tu ubicación para calcular el envío por cercanía.
        </p>
        {onRequestLocation && (
          <button
            type="button"
            onClick={onRequestLocation}
            className="w-full py-2 rounded-xl text-[11px] font-bold border transition hover:opacity-90 cursor-pointer"
            style={{
              borderColor: safePrimary,
              color: safePrimary,
              backgroundColor: `${safePrimary}10`,
            }}
          >
            Usar mi ubicación actual
          </button>
        )}
      </div>
    );
  }

  // Cargando
  if (loading) {
    return (
      <div
        className="p-3 rounded-2xl border flex items-center gap-2"
        style={{ borderColor: borderDynamic }}
      >
        <div
          className="w-4 h-4 border-2 border-transparent rounded-full animate-spin"
          style={{ borderTopColor: safePrimary, borderRightColor: safePrimary }}
        />
        <span className="text-[11px]" style={{ color: resolvedTextMuted }}>
          Calculando delivery...
        </span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div
        className="p-3 rounded-2xl border flex items-center gap-2"
        style={{
          borderColor: 'rgba(239,68,68,0.3)',
          backgroundColor: 'rgba(239,68,68,0.06)',
        }}
      >
        <AlertTriangle className="w-4 h-4 text-rose-500" />
        <span className="text-[11px] text-rose-500">
          No se pudo calcular el delivery. Reintentá más tarde.
        </span>
      </div>
    );
  }

  // No hay resultado (sin tenantSlug, etc.)
  if (!result) {
    return null;
  }

  // No se puede entregar
  if (!result.canDeliver) {
    const reasonMessages: Record<string, string> = {
      no_tenant_coords: 'La tienda no tiene ubicación configurada.',
      no_buyer_coords: 'Falta tu ubicación.',
      out_of_range: 'No llegamos a tu zona.',
      below_min_order: 'El monto mínimo para envío no se alcanza.',
      no_delivery_config: 'La tienda no tiene envío configurado.',
      accepts_pickup_only: 'Esta tienda solo acepta retiro en local.',
    };
    const msg = reasonMessages[result.reason || ''] || 'No podemos entregar en tu ubicación.';

    if (result.pickupAvailable) {
      return (
        <div
          className="p-3 rounded-2xl border space-y-2"
          style={{
            borderColor: 'rgba(234,179,8,0.3)',
            backgroundColor: 'rgba(234,179,8,0.06)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold" style={{ color: resolvedTextMain }}>
              {msg}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: resolvedTextMuted }}>
            Podés retirar tu pedido en el local.
          </p>
        </div>
      );
    }

    return (
      <div
        className="p-3 rounded-2xl border space-y-2"
        style={{
          borderColor: 'rgba(239,68,68,0.3)',
          backgroundColor: 'rgba(239,68,68,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-bold text-rose-500">{msg}</span>
        </div>
        <p className="text-[11px] text-rose-400">
          Contactá a la tienda para coordinar una alternativa.
        </p>
      </div>
    );
  }

  // SE PUEDE ENTREGAR — arranca DESACTIVADO hasta que el comprador apriete
  return (
    <div
      className="p-3 rounded-2xl border"
      style={{
        borderColor: localEnabled ? `${safePrimary}60` : borderDynamic,
        backgroundColor: localEnabled ? `${safePrimary}08` : 'transparent',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" style={{ color: safePrimary }} />
            <span className="text-xs font-bold" style={{ color: resolvedTextMain }}>
              Delivery local
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {result.distanceKm != null && (
              <span className="text-[11px] font-medium" style={{ color: resolvedTextMuted }}>
                {result.distanceKm.toFixed(2)} km
              </span>
            )}
            <span className="text-[11px]" style={{ color: resolvedTextMuted }}>·</span>
            <span className="text-[11px] font-bold" style={{ color: safePrimary }}>
              {result.fee != null ? `$${Number(result.fee).toFixed(2)}` : 'Gratis'}
            </span>
            {result.etaMinutes != null && (
              <>
                <span className="text-[11px]" style={{ color: resolvedTextMuted }}>·</span>
                <span className="text-[11px] flex items-center gap-1" style={{ color: resolvedTextMuted }}>
                  <Clock className="w-3 h-3" />
                  {result.etaMinutes} min
                </span>
              </>
            )}
          </div>
        </div>

  <button
    type="button"
    onClick={handleToggle}
          className="px-3 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer hover:opacity-80 shrink-0"
          style={{
            borderColor: localEnabled ? safePrimary : borderDynamic,
            backgroundColor: localEnabled ? safePrimary : 'transparent',
            color: localEnabled ? '#ffffff' : resolvedTextMain,
          }}
        >
          {localEnabled ? 'Quitar' : 'Usar'}
        </button>
      </div>
    </div>
  );
}
