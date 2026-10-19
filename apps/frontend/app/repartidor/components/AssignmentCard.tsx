'use client';

// ============================================================
// ARCHIVO: app/repartidor/components/AssignmentCard.tsx
// Card de un pedido asignado al repartidor.
// Colores heredados del DEFAULT_THEME de facilito.
// ============================================================

import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  CheckCircle2,
  Package,
  XCircle,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import type { AssignmentWithOrder } from '@/hooks/useMyDriverProfile';

interface AssignmentCardProps {
  assignment: AssignmentWithOrder;
  onUpdateStatus: (assignmentId: string, status: string) => Promise<void>;
  /** 🔥 Color primario del tenant. */
  primary: string;
  /** 🔥 Color de acento del tenant. */
  accent: string;
  /** 🔥 Color de texto principal. */
  textColor: string;
  /** 🔥 Color de texto secundario. */
  textMuted: string;
  /** 🔥 Fondo de la card. */
  cardBg: string;
  /** 🔥 Color del borde dinámico. */
  borderDynamic: string;
}

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    getColors: (
      primary: string,
      accent: string,
    ) => { color: string; bg: string };
  }
> = {
  assigned: {
    label: 'Nuevo',
    getColors: () => ({ color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' }),
  },
  accepted: {
    label: 'Aceptado',
    getColors: (primary) => ({ color: primary, bg: `${primary}20` }),
  },
  picked_up: {
    label: 'En camino',
    getColors: (_p, accent) => ({ color: accent, bg: `${accent}20` }),
  },
  delivered: {
    label: 'Entregado',
    getColors: () => ({ color: '#10b981', bg: 'rgba(16,185,129,0.15)' }),
  },
  cancelled: {
    label: 'Cancelado',
    getColors: () => ({ color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }),
  },
};

export default function AssignmentCard({
  assignment,
  onUpdateStatus,
  primary,
  accent,
  textColor,
  textMuted,
  cardBg,
  borderDynamic,
}: AssignmentCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const order = assignment.order;
  const statusInfo =
    (STATUS_LABELS[assignment.status] || STATUS_LABELS.assigned).getColors(
      primary,
      accent,
    );
  const statusLabel =
    (STATUS_LABELS[assignment.status] || STATUS_LABELS.assigned).label;

  const handleAction = async (nextStatus: string) => {
    setIsLoading(nextStatus);
    try {
      await onUpdateStatus(assignment.id, nextStatus);
    } finally {
      setIsLoading(null);
    }
  };

  // Acciones según estado actual
  const actions: Array<{ status: string; label: string; color: string; icon: any }> = [];
  if (assignment.status === 'assigned') {
    actions.push({ status: 'accepted', label: 'Aceptar', color: primary, icon: CheckCircle2 });
    actions.push({ status: 'rejected', label: 'Rechazar', color: '#ef4444', icon: XCircle });
  } else if (assignment.status === 'accepted') {
    actions.push({ status: 'picked_up', label: 'Retiré el pedido', color: accent, icon: Package });
  } else if (assignment.status === 'picked_up') {
    actions.push({ status: 'delivered', label: 'Marcar entregado', color: '#10b981', icon: CheckCircle2 });
  }

  const phone = order?.customerPhone;
  const address = order?.customerAddress;
  const customerName = order?.customerName || 'Cliente';

  return (
    <div
      className="rounded-3xl border backdrop-blur-sm shadow-xl overflow-hidden"
      style={{ backgroundColor: cardBg, borderColor: borderDynamic }}
    >
      {/* Header con estado */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: borderDynamic }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
          >
            {statusLabel}
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: textMuted }}
          >
            #{order?.id?.slice(0, 8) || 'N/A'}
          </span>
        </div>
        {order?.deliveryEtaMinutes != null && (
          <div
            className="flex items-center gap-1 text-[11px] font-bold"
            style={{ color: primary }}
          >
            <Clock className="w-3 h-3" />
            {order.deliveryEtaMinutes} min
          </div>
        )}
      </div>

      {/* Info del cliente */}
      <div className="p-4 space-y-3">
        {/* Nombre */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${primary}20`, color: primary }}
          >
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-bold truncate"
              style={{ color: textColor }}
            >
              {customerName}
            </div>
          </div>
        </div>

        {/* Dirección */}
        {address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <span
              className="text-xs leading-relaxed"
              style={{ color: textColor }}
            >
              {address}
            </span>
          </div>
        )}

        {/* Teléfono + botón llamar */}
        {phone && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs" style={{ color: textColor }}>
                {phone}
              </span>
            </div>
            <a
              href={`tel:${phone}`}
              className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-400 text-[11px] font-bold hover:bg-blue-500/25 transition"
            >
              Llamar
            </a>
          </div>
        )}

        {/* Distancia + monto */}
        <div
          className="flex items-center gap-3 pt-1 text-[11px]"
          style={{ color: textMuted }}
        >
          {order?.deliveryDistanceKm != null && (
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {Number(order.deliveryDistanceKm).toFixed(2)} km
            </div>
          )}
          {order?.totalAmount && (
            <>
              <span style={{ color: textMuted, opacity: 0.6 }}>·</span>
              <span className="font-bold" style={{ color: primary }}>
                ${Number(order.totalAmount).toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      {actions.length > 0 && (
        <div className="p-4 pt-0 flex gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const loading = isLoading === action.status;
            return (
              <button
                key={action.status}
                type="button"
                onClick={() => handleAction(action.status)}
                disabled={isLoading !== null}
                className="flex-1 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-white transition flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                style={{ backgroundColor: action.color }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
