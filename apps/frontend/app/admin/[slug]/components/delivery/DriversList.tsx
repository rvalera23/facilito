'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/DriversList.tsx
// Lista de drivers con su estado actual + acciones (editar/eliminar).
// ============================================================

import { memo, useMemo } from 'react';
import {
  Truck,
  Bike,
  Car,
  Footprints,
  User as UserIcon,
  Circle,
  Pencil,
  Trash2,
  Power,
} from 'lucide-react';
import type { DriverItem } from './DeliveryTab';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPhoneDisplay } from '@/lib/formatPhone';

interface DriversListProps {
  drivers: DriverItem[];
  loading?: boolean;
  primary: string;
  isDarkBg: boolean;
  textColor: string;
  onRefresh?: () => void;
  onEdit?: (driver: DriverItem) => void;
  onDelete?: (driver: DriverItem) => void;
  onToggleStatus?: (driver: DriverItem) => void;
}

const STATUS_CONFIG: Record<
  DriverItem['status'],
  { label: string; color: string; bg: string }
> = {
  offline: { label: 'Offline', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  online: { label: 'Online', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  busy: { label: 'En ruta', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  paused: { label: 'Pausa', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

function VehicleIcon({ type }: { type: string | null }) {
  if (type === 'moto') return <Truck className="w-3.5 h-3.5" />;
  if (type === 'bici') return <Bike className="w-3.5 h-3.5" />;
  if (type === 'carro') return <Car className="w-3.5 h-3.5" />;
  if (type === 'a_pie') return <Footprints className="w-3.5 h-3.5" />;
  return <Truck className="w-3.5 h-3.5" />;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

const DriverRow = memo(function DriverRow({
  driver,
  primary,
  isDarkBg,
  textColor,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  driver: DriverItem;
  primary: string;
  isDarkBg: boolean;
  textColor: string;
  onEdit?: (driver: DriverItem) => void;
  onDelete?: (driver: DriverItem) => void;
  onToggleStatus?: (driver: DriverItem) => void;
}) {
  const statusConf = STATUS_CONFIG[driver.status] || STATUS_CONFIG.offline;
  const isPool = driver.tenantId === null;
  const name = driver.user?.name || 'Sin nombre';
  const phone = driver.user?.phone ? formatPhoneDisplay(driver.user.phone) : '—';
  
  return (
    <div
      className="p-3 rounded-2xl border flex items-center gap-3"
      style={{
        borderColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${primary}15`, color: primary }}
      >
        {driver.user?.avatarUrl ? (
          <img
            src={driver.user.avatarUrl}
            alt={name}
            className="w-full h-full rounded-2xl object-cover"
          />
        ) : (
          <UserIcon className="w-5 h-5" />
        )}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-bold truncate"
            style={{ color: textColor }}
          >
            {name}
          </span>
          {isPool && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(139,92,246,0.15)',
                color: '#8b5cf6',
              }}
            >
              POOL
            </span>
          )}
          {driver.isVerified && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
              }}
            >
              ✓
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className="text-[10px] opacity-60 flex items-center gap-1"
            style={{ color: textColor }}
          >
            <VehicleIcon type={driver.vehicleType} />
            {driver.vehicleType || 'n/d'}
            {driver.vehiclePlate && ` · ${driver.vehiclePlate}`}
          </span>
          <span className="text-[10px] opacity-40" style={{ color: textColor }}>
            ·
          </span>
          <span className="text-[10px] opacity-60" style={{ color: textColor }}>
            {phone}
          </span>
        </div>
        {driver.lastSeenAt && (
          <div
            className="text-[9px] opacity-40 mt-0.5"
            style={{ color: textColor }}
          >
            Visto {formatRelativeTime(driver.lastSeenAt)}
          </div>
        )}
      </div>

      {/* Estado + acciones */}
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1">
          {/* Badge status (click = toggle online/offline) */}
          <button
            type="button"
            onClick={() => onToggleStatus?.(driver)}
            title="Cambiar estado (online ↔ offline)"
            className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 transition hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
          >
            <Circle className="w-2 h-2 fill-current" />
            {statusConf.label}
          </button>

          {/* Editar */}
          <button
            type="button"
            onClick={() => onEdit?.(driver)}
            title="Editar"
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition hover:opacity-80 cursor-pointer"
            style={{
              borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: textColor,
            }}
          >
            <Pencil className="w-3 h-3" />
          </button>

          {/* Eliminar */}
          <button
            type="button"
            onClick={() => onDelete?.(driver)}
            title="Eliminar"
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition hover:opacity-80 cursor-pointer"
            style={{
              borderColor: 'rgba(239,68,68,0.3)',
              color: '#f87171',
            }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {driver.ratingCount > 0 && (
          <span
            className="text-[9px] opacity-60"
            style={{ color: textColor }}
          >
            ★ {driver.ratingAvg}
          </span>
        )}
      </div>
    </div>
  );
});

export default function DriversList({
  drivers,
  loading,
  primary,
  isDarkBg,
  textColor,
  onEdit,
  onDelete,
  onToggleStatus,
}: DriversListProps) {
  const sorted = useMemo(() => {
    const weight = (d: DriverItem) =>
      d.status === 'online' ? 0 : d.status === 'busy' ? 1 : 2;
    return [...drivers].sort((a, b) => weight(a) - weight(b));
  }, [drivers]);

  return (
    <div
      className="p-4 rounded-2xl border space-y-2 max-h-[600px] overflow-y-auto"
      style={{
        borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3
          className="text-xs font-black uppercase tracking-wider"
          style={{ color: textColor }}
        >
          Repartidores
        </h3>
        {loading && (
          <span className="text-[10px] opacity-50" style={{ color: textColor }}>
            cargando...
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8" />}
          title="No hay repartidores todavía"
          message='Usá "Nuevo driver" para crear uno.'
          primary={primary}
          textColor={textColor}
          borderColor={isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
          cardBg={isDarkBg ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'}
          isDarkBg={isDarkBg}
          padding="py-10"
        />
      ) : (
        sorted.map((d) => (
          <DriverRow
            key={d.id}
            driver={d}
            primary={primary}
            isDarkBg={isDarkBg}
            textColor={textColor}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
          />
        ))
      )}
    </div>
  );
}