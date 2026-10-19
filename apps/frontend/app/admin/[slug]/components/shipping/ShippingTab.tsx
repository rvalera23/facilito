'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useShippingData } from './hooks/useShippingData';
import { useShippingActions } from './hooks/useShippingActions';
import ShippingStats from './ShippingStats';
import ShippingFilters from './ShippingFilters';
import ShippingList from './ShippingList';
import ShippingDetailModal from './ShippingDetailModal';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import { 
  Truck, 
  ChevronRight, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Inbox,
  ArrowLeft
} from 'lucide-react';
import { getInitials } from '../conversations/utils/conversationUtils';
import { EmptyState } from '@/components/ui/EmptyState';
// ============================================================
// 🔥 CONSTANTES Y FUNCIONES PUERTAS - FUERA DEL COMPONENTE
// ============================================================

// ✅ MOVER FUNCIONES DE ESTADO FUERA DEL COMPONENTE
const STATUS_CONFIG = {
  pending: { 
    icon: <Clock className="w-3 h-3" />, 
    color: '#f59e0b', 
    label: 'Pendiente',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  por_enviar: { 
    icon: <Clock className="w-3 h-3" />, 
    color: '#f59e0b', 
    label: 'Pendiente',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  in_transit: { 
    icon: <Truck className="w-3 h-3" />, 
    color: '#3b82f6', 
    label: 'En tránsito',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  en_transito: { 
    icon: <Truck className="w-3 h-3" />, 
    color: '#3b82f6', 
    label: 'En tránsito',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  delivered: { 
    icon: <CheckCircle className="w-3 h-3" />, 
    color: '#22c55e', 
    label: 'Entregado',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  entregado: { 
    icon: <CheckCircle className="w-3 h-3" />, 
    color: '#22c55e', 
    label: 'Entregado',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  cancelled: { 
    icon: <XCircle className="w-3 h-3" />, 
    color: '#ef4444', 
    label: 'Cancelado',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  cancelado: { 
    icon: <XCircle className="w-3 h-3" />, 
    color: '#ef4444', 
    label: 'Cancelado',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
};

const DEFAULT_STATUS_CONFIG = {
  icon: <AlertTriangle className="w-3 h-3" />,
  color: '#64748b',
  label: 'Desconocido',
  bg: 'rgba(100, 116, 139, 0.15)',
  border: 'rgba(100, 116, 139, 0.3)',
};

// ✅ FUNCIONES PUERTAS PARA OBTENER CONFIGURACIÓN DE ESTADO
const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || DEFAULT_STATUS_CONFIG;
};

// ============================================================
// 🔥 SUBCOMPONENTE: ClientItem (MEMOIZADO)
// ============================================================
const ClientItem = memo(({
  group,
  selectedClient,
  primary,
  cardBorder,
  isDarkBg,
  onSelectClient,
}: any) => {
  const initials = getInitials(group.clientName);
  const totalOrders = group.orders.length;
  const pendingCount = group.statusCounts.pending;
  const inTransitCount = group.statusCounts.in_transit;
  const deliveredCount = group.statusCounts.delivered;
  
  const isSelected = selectedClient === group.clientName;

  const handleClick = useCallback(() => {
    onSelectClient(group.clientName);
  }, [group.clientName, onSelectClient]);

  return (
    <button
      onClick={handleClick}
      className={`w-full p-3 rounded-xl border transition-all cursor-pointer text-left flex items-center gap-3 hover:opacity-80 ${
        isSelected ? 'border' : ''
      }`}
      style={{
        borderColor: isSelected ? primary : cardBorder,
        borderLeftColor: isSelected ? primary : cardBorder,
        backgroundColor: isSelected 
          ? (isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
          : 'transparent',
      }}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-xl overflow-hidden border flex items-center justify-center shrink-0" style={{ borderColor: cardBorder }}>
          <div 
            className="w-full h-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${primary}20`, color: primary }}
          >
            {initials}
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#f59e0b' }}>
            {pendingCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold truncate ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>
            {group.clientName}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
            {totalOrders} pedidos
          </span>
          {inTransitCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ 
              backgroundColor: 'rgba(59,130,246,0.15)',
              color: '#3b82f6'
            }}>
              {inTransitCount} en tránsito
            </span>
          )}
          {deliveredCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ 
              backgroundColor: 'rgba(34,197,94,0.15)',
              color: '#22c55e'
            }}>
              {deliveredCount} entregados
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
    </button>
  );
});
ClientItem.displayName = 'ClientItem';

// ============================================================
// 🔥 SUBCOMPONENTE: OrderItem (MEMOIZADO)
// ============================================================
const OrderItem = memo(({
  order,
  isDarkBg,
  cardBorder,
  textColor,
  onViewDetails,
}: any) => {
const delivery = order.paymentMetadata?.delivery || order.attributes?.delivery || order.delivery || {};
const status = delivery.status || order.status || 'pending';
const statusConfig = getStatusConfig(status);

  const handleClick = useCallback(() => {
    onViewDetails(order);
  }, [order, onViewDetails]);

  return (
    <div
      className="p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all"
      style={{ borderColor: cardBorder }}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>
              Pedido #{order.id?.slice(-6) || order.orderNumber || 'N/A'}
            </p>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.border}`
              }}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: textColor, opacity: 0.6 }}>
            {order.deliveryCompany && (
              <span>📦 {order.deliveryCompany}</span>
            )}
            {order.trackingNumber && (
              <>
                <span>•</span>
                <span>Tracking: {order.trackingNumber}</span>
              </>
            )}
            {order.deliveryDate && (
              <>
                <span>•</span>
                <span>Entrega: {new Date(order.deliveryDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
          {order.items && order.items.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Package className="w-3 h-3 opacity-40" />
              <span className="text-[10px] opacity-60 truncate max-w-[200px]">
                {order.items.map((item: any) => item.name || item.productName).join(', ')}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 opacity-40 shrink-0 ml-2" />
      </div>
    </div>
  );
});
OrderItem.displayName = 'OrderItem';

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
interface ShippingTabProps {
  orders?: any[];
  tenant?: any;
  primary: string;
  secondary?: string;
  textColor: string;
  isDarkBg: boolean;
  onRefresh?: () => void;
}

export default function ShippingTab({
  orders = [],
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onRefresh,
}: ShippingTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const { registerComponent, unregisterComponent } = useAppRefreshContext();

  // 🔥 HOOK DE DATOS
  const {
    deliveryOrders,
    filteredOrders,
    stats,
    filterStatus,
    setFilterStatus,
    filterCompany,
    setFilterCompany,
    searchQuery,
    setSearchQuery,
    uniqueCompanies,
  } = useShippingData({ orders });

  // 🔥 HOOK DE ACCIONES
  const { updateDeliveryStatus, isUpdating } = useShippingActions({
    onRefresh,
    onOrderUpdated: useCallback((updatedOrder) => {
      // ✅ Solo actualizar si es necesario
    }, []),
  });

  // ✅ MEMOIZAR cardBorder y cardBg (no cambian)
  const cardBorder = useMemo(() => 
    isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    [isDarkBg]
  );
  
  const cardBg = useMemo(() => 
    secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    [secondary, isDarkBg]
  );

  // 🔥 AGRUPAR ENVÍOS POR CLIENTE - MEMOIZADO CON DEPENDENCIAS CORRECTAS
  const clientGroups = useMemo(() => {
    const groups = new Map<string, {
      clientName: string;
      orders: any[];
      statusCounts: {
        pending: number;
        in_transit: number;
        delivered: number;
        cancelled: number;
      };
      lastOrder: any;
    }>();

    filteredOrders.forEach(order => {
      const clientName = order.clientName || order.customerName || order.userName || 'Cliente sin nombre';
      
      if (!groups.has(clientName)) {
        groups.set(clientName, {
          clientName,
          orders: [],
          statusCounts: {
            pending: 0,
            in_transit: 0,
            delivered: 0,
            cancelled: 0
          },
          lastOrder: null
        });
      }

      const group = groups.get(clientName)!;
      group.orders.push(order);
      
const delivery = order.paymentMetadata?.delivery || order.attributes?.delivery || order.delivery || {};
const status = String(delivery.status || order.status || 'pending').toUpperCase();
if (status === 'PENDING' || status === 'POR_ENVIAR' || status === 'PENDING_LOCAL') group.statusCounts.pending++;
else if (status === 'IN_TRANSIT' || status === 'EN_TRANSITO') group.statusCounts.in_transit++;
else if (status === 'DELIVERED' || status === 'ENTREGADO' || status === 'COMPLETED') group.statusCounts.delivered++;
else if (status === 'CANCELLED' || status === 'CANCELADO' || status === 'NO_SHOW') group.statusCounts.cancelled++;

      if (!group.lastOrder || new Date(order.createdAt) > new Date(group.lastOrder.createdAt)) {
        group.lastOrder = order;
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (!a.lastOrder) return 1;
      if (!b.lastOrder) return -1;
      return new Date(b.lastOrder.createdAt).getTime() - new Date(a.lastOrder.createdAt).getTime();
    });
  }, [filteredOrders]);

  // 🔥 ENVÍOS FILTRADOS POR CLIENTE SELECCIONADO - MEMOIZADO
  const selectedOrders = useMemo(() => {
    if (!selectedClient) return [];
    const group = clientGroups.find(g => g.clientName === selectedClient);
    return group?.orders || [];
  }, [selectedClient, clientGroups]);

  // ✅ HANDLERS MEMOIZADOS
  const handleViewDetails = useCallback((order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }, []);

  const handleSelectClient = useCallback((clientName: string) => {
    setSelectedClient(clientName);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  }, []);

  const handleRefresh = useCallback(() => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  // 🔥 REGISTRAR COMPONENTE PARA REFRESCO - SOLO UNA VEZ
  useEffect(() => {
    const componentId = 'shipping-tab';
    const refreshShipping = async () => {
      console.log('🔄 [ShippingTab] Refrescando envíos...');
    };
    registerComponent(componentId, refreshShipping);
    return () => unregisterComponent(componentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ RENDERIZADO CONDICIONAL - Si no hay envíos
  if (deliveryOrders.length === 0) {
    return (
      <div
        className="p-6 rounded-3xl border shadow-xl w-full transition-all mt-4"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        <EmptyState
          icon={<Truck className="w-12 h-12" />}
          title="No hay envíos registrados"
          message="Cuando los clientes realicen pedidos con envío, aparecerán aquí."
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
        className="p-6 rounded-3xl border shadow-xl w-full transition-all mt-4"
        style={{ backgroundColor: cardBg, borderColor: cardBorder, color: textColor }}
      >
        {/* HEADER */}
        <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: cardBorder }}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
                Envíos y Mensajería
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10" style={{ color: textColor }}>
                {filteredOrders.length}
              </span>
            </div>
            <p className="text-[11px] opacity-75 mt-0.5" style={{ color: textColor }}>
              {deliveryOrders.length} envíos registrados
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl border hover:opacity-70 transition flex items-center gap-2 text-xs"
            style={{ borderColor: cardBorder, color: textColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {/* STATS */}
        <div className="mt-4">
          <ShippingStats stats={stats} primary={primary} textColor={textColor} isDarkBg={isDarkBg} />
        </div>

        {/* FILTROS */}
        <div className="mt-4">
          <ShippingFilters
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterCompany={filterCompany}
            setFilterCompany={setFilterCompany}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            uniqueCompanies={uniqueCompanies}
            primary={primary}
            textColor={textColor}
            isDarkBg={isDarkBg}
            cardBorder={cardBorder}
          />
        </div>

        {/* 🔥 LAYOUT DE DOS COLUMNAS - OPTIMIZADO */}
        <div className="flex gap-4 mt-4">
          {/* Columna izquierda: Lista de CLIENTES (35%) */}
          <div className="w-[35%] flex-shrink-0">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {clientGroups.map((group) => (
                <ClientItem
                  key={group.clientName}
                  group={group}
                  selectedClient={selectedClient}
                  primary={primary}
                  cardBorder={cardBorder}
                  isDarkBg={isDarkBg}
                  onSelectClient={handleSelectClient}
                />
              ))}
            </div>
          </div>

          {/* Columna derecha: Pedidos del CLIENTE seleccionado (65%) */}
          <div className="w-[65%] flex-shrink-0">
            {selectedClient ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {selectedOrders.length > 0 ? (
                  selectedOrders.map((order) => (
                    <OrderItem
                      key={order.id}
                      order={order}
                      isDarkBg={isDarkBg}
                      cardBorder={cardBorder}
                      textColor={textColor}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                 ) : (
                  <EmptyState
                    icon={<Truck className="w-12 h-12" />}
                    message="No hay pedidos para este cliente"
                    primary={primary}
                    textColor={textColor}
                    borderColor={cardBorder}
                    cardBg={cardBg}
                    isDarkBg={isDarkBg}
                  />
                )}
              </div>
            ) : (
              <div
                className="h-[400px] flex items-center justify-center rounded-2xl border-2 border-dashed"
                style={{
                  borderColor: cardBorder,
                  backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <EmptyState
                  icon={<Truck className="w-12 h-12" />}
                  title="Selecciona un cliente"
                  message="Elige un cliente de la lista para ver sus pedidos"
                  primary={primary}
                  textColor={textColor}
                  borderColor={cardBorder}
                  cardBg={cardBg}
                  isDarkBg={isDarkBg}
                  padding="py-0"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      <ShippingDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        order={selectedOrder}
        onStatusChange={updateDeliveryStatus}
        isUpdating={isUpdating}
        primary={primary}
        secondary={secondary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    </>
  );
}