'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/shipping/ShippingAndDeliveryTab.tsx
// Wrapper que unifica "Encomiendas" (ShippingTab) y "Repartidores"
// (DeliveryTab) bajo una sola pestaña con segmented control interno.
//
// MOTIVO: en el admin, "Envíos y Despachos" y "Delivery local" eran dos
// tabs separados. Ambos son "cómo sale el pedido", así que se muestran
// juntos con dos segmentos. Estándar: Shopify, Wix, WooCommerce, VTEX
// unifican estos modos bajo una sola entrada de menú.
//
// ID del tab: sigue siendo 'shipping' (no rompemos persistencia).
// El tab 'delivery' sigue existiendo como id, pero el admin lo redirige
// a 'shipping' con el segmento "Repartidores" activo.
// ============================================================

import { memo, useEffect, useState } from 'react';
import { Truck, Package, AlertTriangle } from 'lucide-react';
import ShippingTab from './ShippingTab';
import DeliveryTab from '../delivery/DeliveryTab';
import SellerDisputesTab from './disputes/SellerDisputesTab';
import SellerDisputeDetailModal from './disputes/SellerDisputeDetailModal';
import { usePersistedState } from '@/hooks/usePersistedState';

type Segment = 'encomiendas' | 'repartidores' | 'reclamos';

interface ShippingAndDeliveryTabProps {
  // Props de ShippingTab
  orders?: any[];
  onRefresh?: () => void;
  // Props de DeliveryTab
  tenantId?: string | null;
  tenantSlug?: string | null;
  tenant?: any;
  // Tema (compartido)
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  // Control externo del segmento (para redirección desde 'delivery')
  initialSegment?: Segment;
}

const ShippingAndDeliveryTab = memo(function ShippingAndDeliveryTab({
  orders = [],
  onRefresh,
  tenantId,
  tenantSlug,
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
  initialSegment = 'encomiendas',
}: ShippingAndDeliveryTabProps) {
  // 🔥 Persistir el segmento activo entre recargas.
  // Validador: si el localStorage tiene basura (ej: 'foo'), cae al default.
  const [segment, setSegment] = usePersistedState<Segment>(
    'admin_shipping_delivery_segment',
    initialSegment,
    {
      validate: (v): v is Segment =>
        v === 'encomiendas' || v === 'repartidores' || v === 'reclamos',
    },
  );

  // Estado para el modal de detalle del reclamo
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  // 🔥 Si llega un initialSegment distinto (redirección desde 'delivery'),
  // forzamos el segmento una sola vez.
  useEffect(() => {
    if (initialSegment && initialSegment !== segment) {
      setSegment(initialSegment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSegment]);

  const subtleBorderColor = isDarkBg
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.08)';

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* SEGMENTED CONTROL: Encomiendas | Repartidores                */}
      {/* ============================================================ */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-2xl border"
        style={{
          borderColor: subtleBorderColor,
          backgroundColor: isDarkBg
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(0,0,0,0.02)',
        }}
        role="tablist"
        aria-label="Tipo de entrega"
      >
        <SegmentButton
          active={segment === 'encomiendas'}
          onClick={() => setSegment('encomiendas')}
          icon={<Package className="w-3.5 h-3.5" />}
          label="Encomiendas"
          primary={primary}
          textColor={textColor}
        />
        <SegmentButton
          active={segment === 'repartidores'}
          onClick={() => setSegment('repartidores')}
          icon={<Truck className="w-3.5 h-3.5" />}
          label="Repartidores"
          primary={primary}
          textColor={textColor}
        />
        <SegmentButton
          active={segment === 'reclamos'}
          onClick={() => setSegment('reclamos')}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Reclamos"
          primary={primary}
          textColor={textColor}
        />
      </div>

      {/* ============================================================ */}
      {/* CONTENIDO DEL SEGMENTO ACTIVO                                */}
      {/* ============================================================ */}
      {segment === 'encomiendas' && (
        <ShippingTab
          orders={orders}
          tenant={tenant}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onRefresh={onRefresh}
        />
      )}

      {segment === 'repartidores' && (
        <DeliveryTab
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          tenant={tenant}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      )}

      {segment === 'reclamos' && (
        <SellerDisputesTab
          tenantId={tenantId || ''}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onOpenDetail={(dispute) => setSelectedDispute(dispute)}
        />
      )}

      {/* MODAL: detalle del reclamo */}
      <SellerDisputeDetailModal
        isOpen={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        dispute={selectedDispute}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
        onUpdated={() => setSelectedDispute(null)}
      />
    </div>
  );
});

ShippingAndDeliveryTab.displayName = 'ShippingAndDeliveryTab';

// ============================================================
// SUBCOMPONENTE: SegmentButton
// ============================================================
function SegmentButton({
  active,
  onClick,
  icon,
  label,
  primary,
  textColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary: string;
  textColor: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: active ? primary : 'transparent',
        color: active ? '#ffffff' : textColor,
        opacity: active ? 1 : 0.7,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default ShippingAndDeliveryTab;