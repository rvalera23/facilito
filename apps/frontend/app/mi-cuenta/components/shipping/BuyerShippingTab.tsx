'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Truck, Package, Bike } from 'lucide-react';
import BuyerShippingStats from './BuyerShippingStats';
import BuyerShippingFilters from './BuyerShippingFilters';
import BuyerShippingCard from './BuyerShippingCard';
import BuyerShippingDetailModal from './BuyerShippingDetailModal';
import ReportDisputeModal from '../disputes/ReportDisputeModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface BuyerShippingTabProps {
  orders: any[];
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onNavigateToOrders?: (orderId: string) => void;
}

type ShipmentKind = 'shipping' | 'delivery';

interface NormalizedShipment {
  /** Orden original, sin tocar */
  order: any;
  /** Tipo de logística */
  kind: ShipmentKind;
  /** Config unificada para render (merge de shipping.delivery o fulfillment='delivery') */
  meta: {
    status: string;
    companyLabel: string;
    companyKey: string;
    trackingNumber: string | null;
    address: string | null;
    estimatedDays: string | null;
    costVes: number;
    costUsd: number | null;
    // Delivery local
    distanceKm: number | null;
    etaMinutes: number | null;
    feeUsd: number | null;
  };
}

const COMPANY_LABELS: Record<string, string> = {
  mrw: 'MRW',
  zoom: 'Zoom',
  domesa: 'Domesa',
  tealca: 'Tealca',
  delivery_propio: 'Delivery propio',
  delivery: 'Delivery',
};

const KIND_ICONS = {
  shipping: Package,
  delivery: Bike,
};

function getContrastMuted(isDarkBg: boolean): string {
  return isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
}

function getCardBorder(isDarkBg: boolean): string {
  return isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
}

function getCardBg(isDarkBg: boolean, secondary?: string): string {
  return secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');
}

/**
 * Normaliza una orden a la estructura de logística.
 * Devuelve null si no es un envío (ni mensajería ni delivery local).
 *
 * Reglas:
 * - Mensajería: order.paymentMetadata.delivery.selected === true
 * - Delivery local: order.paymentMetadata.fulfillment === 'delivery' (con o sin localDelivery)
 *
 * Si una orden tuviera ambos (no debería), gana fulfillment='delivery'.
 */
function normalizeShipment(order: any): NormalizedShipment | null {
  const pm = order?.paymentMetadata || {};
  const legacyDelivery = pm.delivery || order?.delivery || null;
  const localDelivery = pm.localDelivery || null;

  const isLocalDelivery =
    pm.fulfillment === 'delivery' || !!localDelivery;

  if (isLocalDelivery) {
    return {
      order,
      kind: 'delivery',
      meta: {
        status: String(
          localDelivery?.status || order.status || 'pending',
        ).toLowerCase(),
        companyLabel: 'Delivery propio',
        companyKey: 'delivery_propio',
        trackingNumber: null,
        address: order?.customerAddress || null,
        estimatedDays: null,
        costVes: 0,
        costUsd: null,
        distanceKm: localDelivery?.distanceKm ?? null,
        etaMinutes: localDelivery?.etaMinutes ?? null,
        feeUsd: localDelivery?.fee ?? null,
      },
    };
  }

  const isShipping = legacyDelivery && legacyDelivery.selected === true;
  if (isShipping) {
    const companyKey = String(legacyDelivery.company || '').toLowerCase();
    return {
      order,
      kind: 'shipping',
      meta: {
        status: String(
          legacyDelivery.status || order.status || 'pending',
        ).toLowerCase(),
        companyLabel:
          COMPANY_LABELS[companyKey] ||
          legacyDelivery.companyName ||
          companyKey ||
          'Envío',
        companyKey,
        trackingNumber: legacyDelivery.trackingNumber || null,
        address: legacyDelivery.address || null,
        estimatedDays: legacyDelivery.estimatedDays || null,
        costVes: Number(legacyDelivery.costVes || 0),
        costUsd:
          legacyDelivery.costUsd != null
            ? Number(legacyDelivery.costUsd)
            : null,
        distanceKm: null,
        etaMinutes: null,
        feeUsd: null,
      },
    };
  }

  return null;
}

export default function BuyerShippingTab({
  orders = [],
  primary,
  secondary,
  textColor,
  isDarkBg,
  onNavigateToOrders,
}: BuyerShippingTabProps) {
  const [selectedShipment, setSelectedShipment] =
    useState<NormalizedShipment | null>(null);

  // 🔥 ESTADO: orden a reportar (modal de disputa)
  const [reportingOrder, setReportingOrder] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | ShipmentKind>('all');

  const mutedText = getContrastMuted(isDarkBg);
  const cardBorder = getCardBorder(isDarkBg);
  const cardBg = getCardBg(isDarkBg, secondary);

  // 🔥 Normalizar TODAS las órdenes a shipments (mensajería + delivery)
  const allShipments = useMemo(() => {
    return orders
      .map(normalizeShipment)
      .filter((s): s is NormalizedShipment => s !== null);
  }, [orders]);

  // 🔥 Conteo por tipo (para mostrar en el segmented control)
  const kindCounts = useMemo(() => {
    let shipping = 0;
    let delivery = 0;
    allShipments.forEach((s) => {
      if (s.kind === 'shipping') shipping++;
      else if (s.kind === 'delivery') delivery++;
    });
    return { shipping, delivery, all: allShipments.length };
  }, [allShipments]);

  // 🔥 Aplicar filtro de tipo
  const shipmentsByKind = useMemo(() => {
    if (kindFilter === 'all') return allShipments;
    return allShipments.filter((s) => s.kind === kindFilter);
  }, [allShipments, kindFilter]);

  // 🔥 Lista única de empresas (solo mensajería tiene empresa)
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, number>();
    shipmentsByKind.forEach((s) => {
      if (s.kind !== 'shipping') return;
      if (s.meta.companyKey) {
        map.set(s.meta.companyKey, (map.get(s.meta.companyKey) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({
        value,
        label: COMPANY_LABELS[value] || value,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [shipmentsByKind]);

  // 🔥 Filtrar por estado / empresa / búsqueda
  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return shipmentsByKind.filter((s) => {
      const status = s.meta.status;

      // Filtro de estado
      if (filterStatus !== 'all') {
        if (
          filterStatus === 'pending' &&
          !status.includes('pend') &&
          !status.includes('por_enviar')
        )
          return false;
        if (
          filterStatus === 'in_transit' &&
          !status.includes('transit') &&
          !status.includes('en_transito')
        )
          return false;
        if (
          filterStatus === 'delivered' &&
          !status.includes('deliver') &&
          !status.includes('entreg')
        )
          return false;
        if (filterStatus === 'cancelled' && !status.includes('cancel'))
          return false;
      }

      // Filtro de empresa (solo aplica a mensajería)
      if (filterCompany !== 'all') {
        if (s.kind !== 'shipping') return false;
        if (s.meta.companyKey !== filterCompany) return false;
      }

      // Búsqueda
      if (q) {
        const orderId = String(s.order.id || '').toLowerCase();
        const tracking = String(s.meta.trackingNumber || '').toLowerCase();
        const tenantName = String(
          s.order.tenantName || s.order.tenant?.name || '',
        ).toLowerCase();
        const companyLabel = s.meta.companyLabel.toLowerCase();
        if (
          !orderId.includes(q) &&
          !tracking.includes(q) &&
          !tenantName.includes(q) &&
          !companyLabel.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [shipmentsByKind, filterStatus, filterCompany, searchQuery]);

  // 🔥 Stats (sobre el filtro de tipo activo)
  const stats = useMemo(() => {
    let inTransit = 0;
    let delivered = 0;
    let pending = 0;
    shipmentsByKind.forEach((s) => {
      const status = s.meta.status;
      if (status.includes('transit') || status.includes('en_transito'))
        inTransit++;
      else if (status.includes('deliver') || status.includes('entreg'))
        delivered++;
      else if (status.includes('pend') || status.includes('por_enviar'))
        pending++;
    });
    return {
      inTransit,
      delivered,
      pending,
      total: shipmentsByKind.length,
    };
  }, [shipmentsByKind]);

  const handleOpenModal = useCallback((shipment: NormalizedShipment) => {
    setSelectedShipment(shipment);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedShipment(null);
  }, []);

  const handleViewFullOrder = useCallback(
    (order: any) => {
      if (onNavigateToOrders) {
        onNavigateToOrders(order.id);
      }
    },
    [onNavigateToOrders],
  );

  // 🔥 EMPTY STATE: no hay ni mensajería ni delivery
  if (allShipments.length === 0) {
    return (
      <div
        className="p-8 rounded-3xl border shadow-xl"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        <EmptyState
          icon={<Truck className="w-14 h-14" />}
          title="No hay envíos registrados"
          message="Cuando compres productos con envío o delivery local, van a aparecer acá para que puedas hacerles seguimiento."
          primary={primary}
          textColor={textColor}
          borderColor={cardBorder}
          cardBg={cardBg}
          isDarkBg={isDarkBg}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all duration-300"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        {/* HEADER */}
        <div className="border-b pb-3" style={{ borderColor: cardBorder }}>
          <h2 className="text-base font-black tracking-tight" style={{ color: textColor }}>
            Mis Envíos
          </h2>
          <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
            Seguimiento de tus pedidos con mensajería o delivery local.
          </p>
        </div>

        {/* SEGMENTED CONTROL — Todos / Mensajería / Delivery */}
        <div
          className="flex items-center gap-1 p-1 rounded-2xl border w-fit"
          style={{ borderColor: cardBorder, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
        >
          {(
            [
              { id: 'all' as const, label: 'Todos', icon: Truck, count: kindCounts.all },
              { id: 'shipping' as const, label: 'Mensajería', icon: Package, count: kindCounts.shipping },
              { id: 'delivery' as const, label: 'Delivery', icon: Bike, count: kindCounts.delivery },
            ]
          ).map(({ id, label, icon: Icon, count }) => {
            const active = kindFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKindFilter(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer"
                style={{
                  backgroundColor: active ? primary : 'transparent',
                  color: active ? '#ffffff' : textColor,
                  opacity: active ? 1 : 0.7,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                <span
                  className="ml-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                    color: active ? '#ffffff' : textColor,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* STATS */}
        <BuyerShippingStats
          stats={stats}
          primary={primary}
          textColor={textColor}
          mutedText={mutedText}
          cardBorder={cardBorder}
          isDarkBg={isDarkBg}
        />

        {/* FILTROS */}
        <BuyerShippingFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCompany={filterCompany}
          setFilterCompany={setFilterCompany}
          uniqueCompanies={uniqueCompanies}
          primary={primary}
          textColor={textColor}
          mutedText={mutedText}
          cardBorder={cardBorder}
          isDarkBg={isDarkBg}
        />

        {/* LISTA */}
        <div className="space-y-2">
          {filteredShipments.length === 0 ? (
            <div className="py-8 text-center opacity-60 text-xs">
              No se encontraron envíos con los filtros aplicados.
            </div>
          ) : (
            filteredShipments.map((shipment) => (
              <BuyerShippingCard
                key={shipment.order.id}
                order={shipment.order}
                primary={primary}
                textColor={textColor}
                mutedText={mutedText}
                cardBorder={cardBorder}
                isDarkBg={isDarkBg}
                onClick={() => handleOpenModal(shipment)}
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL */}
      {selectedShipment && (
        <BuyerShippingDetailModal
          order={selectedShipment.order}
          onClose={handleCloseModal}
          primary={primary}
          secondary={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          cardBorder={cardBorder}
          isDarkBg={isDarkBg}
          onViewFullOrder={handleViewFullOrder}
          onReportIssue={(o) => setReportingOrder(o)}
        />
      )}

      {/* MODAL: reportar problema */}
      <ReportDisputeModal
        isOpen={!!reportingOrder}
        onClose={() => setReportingOrder(null)}
        order={reportingOrder}
        primary={primary}
        secondary={cardBg}
        textColor={textColor}
        mutedText={mutedText}
        cardBorder={cardBorder}
        isDarkBg={isDarkBg}
        onCreated={() => setReportingOrder(null)}
      />
    </>
  );
}