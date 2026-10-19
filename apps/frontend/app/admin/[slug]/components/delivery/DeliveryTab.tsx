'use client';

// ============================================================
// ARCHIVO: admin/[slug]/components/delivery/DeliveryTab.tsx
// Tab de delivery (local + repartidores propios).
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Plus, RefreshCw, Settings } from 'lucide-react';
import DriversList from './DriversList';
import DriversMap from './DriversMap';
import CreateDriverModal from './CreateDriverModal';
import EditDriverModal from './EditDriverModal';
import DeliveryConfigModal from './DeliveryConfigModal';
import AssignOrderModal from './AssignOrderModal';
import { useDeliverySocket } from '@/hooks/useDeliverySocket';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/useToast';
import { apiFetch } from '@/lib/api';
import type { PendingOrder } from './AssignOrderModal';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface DriverItem {
  id: string;
  userId: string;
  tenantId: string | null;
  status: 'offline' | 'online' | 'busy' | 'paused';
  currentLat: number | null;
  currentLng: number | null;
  lastSeenAt: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  maxActiveOrders: number;
  ratingAvg: string;
  ratingCount: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
}

interface DeliveryTabProps {
  tenantId?: string | null;
  tenantSlug?: string | null;
  tenant?: any;          // el tenant completo con la config
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
}

export default function DeliveryTab({
  tenantId,
  tenantSlug,
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
}: DeliveryTabProps) {
  const toast = useToast();
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Editar driver
  const [editingDriver, setEditingDriver] = useState<DriverItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Eliminar driver (con confirmación)
  const [driverToDelete, setDriverToDelete] = useState<DriverItem | null>(null);

  // WS para posiciones en vivo (escuchamos al tenant)
  const ws = useDeliverySocket({
    tenantId,
    enabled: Boolean(tenantId),
  });

  const fetchDrivers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(
        `${API_BASE}/delivery/drivers?tenantId=${tenantId}&includePool=true`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Error cargando drivers');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchPendingOrders = useCallback(async () => {
    if (!tenantId) return;
    setPendingLoading(true);
    try {
      const res = await apiFetch(
        `/delivery/assignments/pending?tenantId=${tenantId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPendingOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.showToast({
        variant: 'error',
        message: err?.message || 'Error cargando órdenes pendientes',
      });
      setPendingOrders([]);
    } finally {
      setPendingLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Cargar pendientes al abrir el modal de asignar
  useEffect(() => {
    if (showAssignModal) {
      fetchPendingOrders();
    }
  }, [showAssignModal, fetchPendingOrders]);

  // Merge: si WS trae posición de algún driver, la aplicamos sobre la lista
  const driversWithLivePos = useMemo(() => {
    const liveDriverId = ws.driverPosition?.driverId;
    const liveLat = ws.driverPosition?.lat;
    const liveLng = ws.driverPosition?.lng;

    if (!liveDriverId || liveLat == null || liveLng == null) {
      return drivers;
    }

    return drivers.map((d) =>
      d.id === liveDriverId
        ? {
            ...d,
            currentLat: liveLat,
            currentLng: liveLng,
            lastSeenAt: new Date().toISOString(),
          }
        : d,
    );
  }, [drivers, ws.driverPosition]);

  const onlineCount = driversWithLivePos.filter((d) => d.status === 'online').length;
  const busyCount = driversWithLivePos.filter((d) => d.status === 'busy').length;
  const poolCount = driversWithLivePos.filter((d) => d.tenantId === null).length;
  const ownCount = driversWithLivePos.filter((d) => d.tenantId === tenantId).length;

  // ============================================================
  // ACCIONES
  // ============================================================

  const handleEditDriver = (driver: DriverItem) => {
    setEditingDriver(driver);
    setShowEditModal(true);
  };

  // 🔥 handleDeleteDriver: ahora solo abre el ConfirmDialog (no borra)
  const handleDeleteDriver = (driver: DriverItem) => {
    setDriverToDelete(driver);
  };

  // 🔥 confirmDeleteDriver: hace el DELETE real, se llama desde el ConfirmDialog
  const confirmDeleteDriver = async () => {
    if (!driverToDelete) return;
    const driver = driverToDelete;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/delivery/drivers/${driver.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      // Refrescar la lista
      await fetchDrivers();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el repartidor');
    }
  };

  const handleToggleStatus = async (driver: DriverItem) => {
    // Ciclo simple: online <-> offline
    const nextStatus = driver.status === 'online' ? 'offline' : 'online';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/delivery/drivers/${driver.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      await fetchDrivers();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar el estado');
    }
  };

  // Estilos base heredados del tema del tenant
  const cardBg =
    secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)');
  const subtleBorderColor = isDarkBg
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.08)';

  return (
    <div
      className="p-6 rounded-3xl border shadow-xl space-y-6 w-full transition-all duration-300"
      style={{
        backgroundColor: cardBg,
        borderColor: subtleBorderColor,
        color: textColor,
      }}
    >
      {/* TÍTULO + SUBTÍTULO + ACCIONES */}
      <div
        className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: subtleBorderColor }}
      >
        <div>
          <h3
            className="font-extrabold text-base tracking-tight"
            style={{ color: textColor }}
          >
            Delivery local
          </h3>
          <p
            className="text-[11px] opacity-75 mt-0.5"
            style={{ color: textColor }}
          >
            {driversWithLivePos.length} repartidor
            {driversWithLivePos.length === 1 ? '' : 'es'} · {onlineCount} online ·{' '}
            {busyCount} en ruta
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchDrivers}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-80 disabled:opacity-40 cursor-pointer"
            style={{
              borderColor: subtleBorderColor,
              color: textColor,
              backgroundColor: isDarkBg
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
            }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
            style={{
              borderColor: subtleBorderColor,
              color: textColor,
              backgroundColor: isDarkBg
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
            }}
          >
            <Settings className="w-3.5 h-3.5" />
            Configurar delivery
          </button>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="px-3 py-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
            style={{
              borderColor: subtleBorderColor,
              color: textColor,
              backgroundColor: isDarkBg
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
            }}
          >
            <Truck className="w-3.5 h-3.5" />
            Asignar orden
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-90 cursor-pointer text-white shadow-md"
            style={{ backgroundColor: primary }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo driver
          </button>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total"
          value={driversWithLivePos.length}
          isDarkBg={isDarkBg}
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
        />
        <MetricCard
          label="Online"
          value={onlineCount}
          isDarkBg={isDarkBg}
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
          accent="#10b981"
        />
        <MetricCard
          label="Propios"
          value={ownCount}
          isDarkBg={isDarkBg}
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
        />
        <MetricCard
          label="Pool"
          value={poolCount}
          isDarkBg={isDarkBg}
          textColor={textColor}
          subtleBorderColor={subtleBorderColor}
          accent="#8b5cf6"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div
          className="p-3 rounded-xl border text-xs"
          style={{
            borderColor: 'rgba(239,68,68,0.3)',
            backgroundColor: 'rgba(239,68,68,0.06)',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

      {/* MAPA + LISTA */}
      <div
        className="border rounded-2xl shadow-xl overflow-hidden"
        style={{ borderColor: subtleBorderColor }}
      >
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{
            borderColor: subtleBorderColor,
            backgroundColor: isDarkBg
              ? 'rgba(0, 0, 0, 0.15)'
              : 'rgba(0, 0, 0, 0.03)',
          }}
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 opacity-60" style={{ color: primary }} />
            <span
              className="text-xs font-bold uppercase tracking-wider opacity-75"
              style={{ color: textColor }}
            >
              Repartidores
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isDarkBg
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
                color: textColor,
              }}
            >
              {driversWithLivePos.length}
            </span>
          </div>

          {ws.connected && ws.authenticated && (
            <span
              className="text-[10px] font-bold flex items-center gap-1.5"
              style={{ color: '#10b981' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En vivo
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <DriversMap
            drivers={driversWithLivePos}
            primary={primary}
            isDarkBg={isDarkBg}
            textColor={textColor}
            subtleBorderColor={subtleBorderColor}
            height={400}
          />
          <DriversList
            drivers={driversWithLivePos}
            loading={loading}
            primary={primary}
            isDarkBg={isDarkBg}
            textColor={textColor}
            subtleBorderColor={subtleBorderColor}
            onRefresh={fetchDrivers}
            onEdit={handleEditDriver}
            onDelete={handleDeleteDriver}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </div>

      {/* MODALES */}
      {showCreateModal && (
        <CreateDriverModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchDrivers}
          tenantId={tenantId}
          primary={primary}
          secondary={secondary}
          isDarkBg={isDarkBg}
          textColor={textColor}
        />
      )}

      {showEditModal && (
        <EditDriverModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingDriver(null);
          }}
          onUpdated={fetchDrivers}
          driver={editingDriver}
          primary={primary}
          secondary={secondary}
          isDarkBg={isDarkBg}
          textColor={textColor}
        />
      )}

      {showConfigModal && (
        <DeliveryConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onUpdated={fetchDrivers /* o lo que corresponda */}
          tenantId={tenantId}
          tenantConfig={tenant}
          primary={primary}
          secondary={secondary}
          isDarkBg={isDarkBg}
          textColor={textColor}
        />
      )}

      {showAssignModal && (
        <AssignOrderModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            fetchDrivers();
            fetchPendingOrders();
          }}
          tenantId={tenantId}
          drivers={driversWithLivePos}
          pendingOrders={pendingOrders}
          pendingLoading={pendingLoading}
          primary={primary}
          secondary={secondary}
          isDarkBg={isDarkBg}
          textColor={textColor}
        />
      )}

      {/* 🔥 ConfirmDialog para eliminar driver */}
      <ConfirmDialog
        isOpen={!!driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirm={confirmDeleteDriver}
        title="¿Eliminar repartidor?"
        message={`¿Eliminar a ${driverToDelete?.user?.name || 'este repartidor'}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        variant="danger"
        primary={primary}
        borderColor={subtleBorderColor}
        cardBg={cardBg}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  isDarkBg,
  textColor,
  subtleBorderColor,
  accent,
}: {
  label: string;
  value: number;
  isDarkBg: boolean;
  textColor: string;
  subtleBorderColor: string;
  accent?: string;
}) {
  return (
    <div
      className="p-3 rounded-2xl border"
      style={{
        borderColor: subtleBorderColor,
        backgroundColor: isDarkBg
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(0,0,0,0.02)',
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider opacity-60"
        style={{ color: textColor }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-black mt-1"
        style={{ color: accent || textColor }}
      >
        {value}
      </div>
    </div>
  );
}