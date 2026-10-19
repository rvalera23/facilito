'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/AssignOrderModal.tsx
// Modal para asignar una orden a un driver.
// ============================================================

import { useState } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';
import type { DriverItem } from './DeliveryTab';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/useToast';
import { apiFetch } from '@/lib/api';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

export interface PendingOrder {
  id: string;
  status: string;
  customerName: string;
  totalAmount: string;
  createdAt: string;
  assignmentId: string | null;
  assignmentStatus: string | null;
}

function formatElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

interface AssignOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  tenantId?: string | null;
  drivers: DriverItem[];
  pendingOrders: PendingOrder[];
  pendingLoading?: boolean;
  primary: string;
  secondary?: string;
  isDarkBg: boolean;
  textColor: string;
}

export default function AssignOrderModal({
  isOpen,
  onClose,
  onAssigned,
  tenantId,
  drivers,
  pendingOrders,
  pendingLoading = false,
  primary,
  secondary,
  isDarkBg,
  textColor,
}: AssignOrderModalProps) {
  const toast = useToast();
  const [orderId, setOrderId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Solo drivers online o busy (los que pueden recibir)
  const availableDrivers = drivers.filter(
    (d) => d.status === 'online' || d.status === 'busy',
  );

  const reset = () => {
    setOrderId('');
    setDriverId('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      setError('No se pudo determinar el tenant');
      return;
    }
    if (!orderId.trim()) {
      setError('El orderId es obligatorio');
      return;
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(orderId.trim())) {
      setError('El orderId debe ser un UUID válido');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: any = {
        orderId: orderId.trim(),
        tenantId,
      };
      if (driverId) {
        body.driverId = driverId;
      }

      const res = await apiFetch('/delivery/assignments/assign', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      toast.showToast({
        variant: 'success',
        message: 'Orden asignada correctamente.',
      });
      onAssigned();
      reset();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Error al asignar la orden';
      setError(msg);
      toast.showToast({ variant: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    color: textColor,
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl p-6"
        style={{
backgroundColor: secondary || (isDarkBg ? '#0f172a' : '#ffffff'),
          borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          color: textColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold" style={{ color: textColor }}>
              Asignar orden
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition hover:opacity-70 disabled:opacity-40"
            style={inputStyle}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Orden pendiente
            </label>
            {pendingLoading ? (
              <div
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs border flex items-center gap-2"
                style={inputStyle}
              >
                <Loader size="xs" color={primary} />
                <span className="opacity-60">Cargando órdenes…</span>
              </div>
            ) : pendingOrders.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-10 h-10" />}
                message="No hay órdenes de delivery pendientes de asignar."
                padding="py-4"
                primary={primary}
                textColor={textColor}
                borderColor={
                  isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
                cardBg={secondary || (isDarkBg ? '#0f172a' : '#ffffff')}
                isDarkBg={isDarkBg}
              />
            ) : (
              <SearchableDropdown
                value={orderId}
                onChange={(val) => setOrderId(val)}
                options={[
                  { value: '', label: 'Seleccionar orden…' },
                  ...pendingOrders.map((o) => ({
                    value: o.id,
                    label: `${o.id.slice(0, 8)} · ${o.customerName} · $${o.totalAmount} · ${formatElapsed(o.createdAt)}`,
                  })),
                ]}
                placeholder="Seleccionar orden…"
                searchPlaceholder="Buscar orden..."
                emptyMessage="No hay órdenes pendientes"
                primary={primary}
                textColor={textColor}
                isDarkBg={isDarkBg}
                borderColor={isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                searchable={true}
                disabled={submitting}
                footerLabel={(n) => `${n} órdenes`}
              />
            )}
          </div>

          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1"
              style={{ color: textColor }}
            >
              Repartidor (opcional — auto si vacío)
            </label>
            <SearchableDropdown
              value={driverId}
              onChange={(val) => setDriverId(val)}
              options={[
                { value: '', label: 'Auto (mejor disponible)' },
                ...availableDrivers.map((d) => ({
                  value: d.id,
                  label: `${d.user?.name || 'Sin nombre'} — ${d.status}${d.vehiclePlate ? ` (${d.vehiclePlate})` : ''}`,
                })),
              ]}
              placeholder="Auto (mejor disponible)"
              searchPlaceholder="Buscar repartidor..."
              emptyMessage="No hay repartidores disponibles"
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
              searchable={true}
              disabled={submitting}
              footerLabel={(n) => `${n} repartidores`}
            />
            <p
              className="text-[10px] opacity-50 mt-1"
              style={{ color: textColor }}
            >
              {availableDrivers.length} repartidor
              {availableDrivers.length === 1 ? '' : 'es'} disponible
              {availableDrivers.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mt-3 p-2.5 rounded-xl border flex items-center gap-2 text-[11px]"
            style={{
              borderColor: 'rgba(239,68,68,0.3)',
              backgroundColor: 'rgba(239,68,68,0.06)',
              color: '#f87171',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}



        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition hover:opacity-70 disabled:opacity-40 cursor-pointer"
            style={{
              borderColor: isDarkBg
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)',
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            style={{ backgroundColor: primary }}
          >
            {submitting ? (
              <>
                <Loader size="xs" color="#ffffff" />
                Asignando...
              </>
            ) : (
              <>
                <Truck className="w-3.5 h-3.5" />
                Asignar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
