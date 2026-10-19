// frontend/app/mi-cuenta/components/notifications/NotificationsTab.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw,
  Search,
  Filter,
  Clock,
  X,
  Package,
  Calendar,
  AlertTriangle,
  Eye,
  Store,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { EnhancedNotificationItem } from './components/EnhancedNotificationItem';
import { NotificationStats } from './components/NotificationStats';
import { useNotifications } from './hooks/useNotifications';
import { FilterType, SortType } from './types';
import BuyerOrderDetailModal from '../orders/BuyerOrderDetailModal';
import { getInitials, getFullAvatarUrl } from '../conversations/utils/conversationUtils';
import { groupNotificationsByDate } from '@/lib/groupNotificationsByDate';
import { Button } from '@/components/ui/Button';
import { LoaderFullPage } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';

interface NotificationsTabProps {
  userId: string;
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onCancelOrder?: (orderId: string) => Promise<void>;
  isCancelling?: boolean;
  onReportPayment?: (orderId: string, paymentData: any) => Promise<void>;
  tenantPaymentData?: any;
  userProducts?: any[];
  onOrderUpdated?: (order: any) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NotificationsTab({
  userId,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onCancelOrder,
  isCancelling = false,
  onReportPayment,
  tenantPaymentData = {},
  userProducts = [],
  onOrderUpdated,
}: NotificationsTabProps) {
  const {
    notifications,
    filteredNotifications,
    loading,
    error,
    filterType,
    sortType,
    searchQuery,
    setFilterType,
    setSortType,
    setSearchQuery,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(userId);

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantCache, setTenantCache] = useState<Map<string, { name: string; logo: string | null }>>(new Map());

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  const containerStyle = { 
    backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    borderColor: borderDynamic, 
    color: textColor 
  };

  const inputStyle = { 
    borderColor: borderDynamic, 
    color: textColor,
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    requiresAction: notifications.filter(n => n.metadata?.actionRequired).length,
    services: notifications.filter(n => n.metadata?.isService).length,
    products: notifications.filter(n => !n.metadata?.isService).length,
    buyer: notifications.filter(n => n.source === 'buyer').length,
    seller: notifications.filter(n => n.source === 'seller').length,
    byStatus: {},
    byPaymentMethod: {},
  };

  // Función para extraer el nombre de la tienda desde una notificación
  const extractTenantName = (notification: any): string => {
    if (notification.tenant?.name && notification.tenant.name !== '') {
      return notification.tenant.name;
    }
    if (notification.metadata) {
      if (notification.metadata.tenantName) return notification.metadata.tenantName;
      if (notification.metadata.storeName) return notification.metadata.storeName;
      if (notification.metadata.store) return notification.metadata.store;
      if (notification.metadata.tenant) return notification.metadata.tenant;
    }
    if (notification.storeName) return notification.storeName;
    if (notification.tenantName) return notification.tenantName;
    if (notification.store) return notification.store;
    if (notification.title) {
      const match = notification.title.match(/-\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+)$/);
      if (match && match[1]) return match[1].trim();
    }
    if (notification.message) {
      const match = notification.message.match(/en\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\.|$)/i);
      if (match && match[1]) return match[1].trim();
    }
    if (notification.store?.name) return notification.store.name;
    if (notification.order?.tenant?.name) return notification.order.tenant.name;
    if (notification.order?.storeName) return notification.order.storeName;
    if (notification.order?.tenantName) return notification.order.tenantName;
    return 'Tienda';
  };

  // Cargar tenants faltantes (nombre + logo) para las notificaciones
  useEffect(() => {
    const missingIds = new Set<string>();
    filteredNotifications.forEach((n: any) => {
      const tid = n.tenantId || n.tenant?.id || n.metadata?.tenantId;
      if (tid && !tenantCache.has(tid) && !n.tenant?.name) {
        missingIds.add(tid);
      }
    });

    if (missingIds.size === 0) return;

    const fetchTenants = async () => {
      const token = getToken();
      const entries = await Promise.all(
        Array.from(missingIds).map(async (id) => {
          try {
            const res = await fetch(`${API_BASE_URL}/tenants/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) {
              // 🔥 Marcar como "no encontrado" para no reintentar en loop
              return [id, { name: 'Tienda', logo: null }] as const;
            }
            const t = await res.json();
            return [id, {
              name: t.name || t.storeName || t.businessName || 'Tienda',
              logo: t.logoUrl || t.avatar || t.image || t.logo || null,
            }] as const;
          } catch {
            // 🔥 Marcar como error para no reintentar en loop
            return [id, { name: 'Tienda', logo: null }] as const;
          }
        })
      );

      setTenantCache((prev) => {
        const next = new Map(prev);
        entries.forEach((e) => { if (e) next.set(e[0], e[1]); });
        return next;
      });
    };

    fetchTenants();
  }, [filteredNotifications, tenantCache]);

  // Agrupar notificaciones por tienda
  const tenantGroups = useMemo(() => {
    const groups = new Map<string, { 
      tenantId: string;
      tenantName: string;
      tenantLogo: string | null;
      notifications: any[];
      unreadCount: number;
      lastNotification: any;
    }>();

    filteredNotifications.forEach(notification => {
      const tenantId = notification.tenantId || notification.tenant?.id || notification.metadata?.tenantId || 'unknown';
      const cached = tenantCache.get(tenantId);
      const tenantName = (notification.tenant?.name && notification.tenant.name !== '')
        ? notification.tenant.name
        : (cached?.name || extractTenantName(notification));
      const tenantLogo = notification.tenant?.logoUrl || notification.tenant?.avatar || 
                         notification.metadata?.tenantLogo || notification.metadata?.storeLogo || 
                         cached?.logo || null;

      if (!groups.has(tenantId)) {
        groups.set(tenantId, {
          tenantId,
          tenantName,
          tenantLogo,
          notifications: [],
          unreadCount: 0,
          lastNotification: null
        });
      }

      const group = groups.get(tenantId)!;
      group.notifications.push(notification);
      if (!notification.read) group.unreadCount++;
      if (!group.lastNotification || new Date(notification.createdAt) > new Date(group.lastNotification.createdAt)) {
        group.lastNotification = notification;
      }
    });

    // Ordenar por fecha de ultima notificacion (mas reciente primero)
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.lastNotification) return 1;
      if (!b.lastNotification) return -1;
      return new Date(b.lastNotification.createdAt).getTime() - new Date(a.lastNotification.createdAt).getTime();
    });
  }, [filteredNotifications, tenantCache]);
  // Notificaciones filtradas por tienda seleccionada
  const selectedNotifications = useMemo(() => {
    if (!selectedTenantId) return [];
    const group = tenantGroups.find(g => g.tenantId === selectedTenantId);
    return group?.notifications || [];
  }, [selectedTenantId, tenantGroups]);

  // 🔥 AGRUPAR POR FECHA (Hoy / Ayer / Esta semana / Anteriores)
  const selectedNotificationsGrouped = useMemo(() => {
    return groupNotificationsByDate(selectedNotifications);
  }, [selectedNotifications]);

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'unread', label: 'No leidas' },
    { key: 'read', label: 'Leidas' },
    { key: 'product', label: 'Productos' },
    { key: 'service', label: 'Servicios' },
    { key: 'requires_action', label: 'Requieren accion' },
  ];

  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'newest', label: 'Mas recientes' },
    { key: 'oldest', label: 'Mas antiguas' },
    { key: 'unread_first', label: 'No leidas primero' },
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSortType('newest');
    setSelectedTenantId(null);
  };

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const buildImageUrl = (imagePath: string): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:')) {
      return imagePath;
    }
    if (imagePath.startsWith('/')) {
      return `${API_BASE_URL}${imagePath}`;
    }
    if (imagePath.includes('uploads/')) {
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      return `${API_BASE_URL}/${cleanPath}`;
    }
    return `${API_BASE_URL}/uploads/${imagePath}`;
  };

  const getProductImage = (productId: string): string | null => {
    if (!productId || !userProducts.length) return null;
    const product = userProducts.find((p: any) => p.id === productId || p._id === productId);
    if (!product) return null;
    return product.coverImage || product.image || product.photo || 
           (product.mediaUrls && product.mediaUrls.length > 0 ? product.mediaUrls[0] : null) || null;
  };

  const processItemsWithImages = (items: any[]): any[] => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item: any) => {
      let imageUrl = item.coverImage || item.image || item.photo || 
                    (item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls[0] : null) ||
                    (item.images && item.images.length > 0 ? item.images[0] : null);
      
      if (!imageUrl && item.productId) {
        const productImage = getProductImage(item.productId);
        if (productImage) imageUrl = productImage;
      }
      
      const finalImageUrl = imageUrl ? buildImageUrl(imageUrl) : null;
      
      return {
        ...item,
        coverImage: finalImageUrl,
        image: finalImageUrl,
        photo: finalImageUrl,
        _imageUrl: finalImageUrl,
      };
    });
  };

  const openOrderModal = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const orderId = notification.metadata?.orderId || notification.orderId;
    if (!orderId) {
      console.warn('No se encontro orderId en la notificacion');
      return;
    }

    setLoadingOrder(true);
    setSelectedOrder(null);
    setIsOrderModalOpen(true);

    try {
      const token = getToken();
      
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const orderData = await response.json();
        
        if (!orderData.tenantId && notification.tenantId) {
          orderData.tenantId = notification.tenantId;
        }
        
        const itemsWithImages = processItemsWithImages(orderData.items || []);
        
        setSelectedOrder({
          ...orderData,
          items: itemsWithImages,
        });
      } else {
        console.error('Error al cargar la orden:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoadingOrder(false);
    }
  };

  const closeOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  if (loading && notifications.length === 0) {
    return (
      <LoaderFullPage
        message="Cargando notificaciones..."
        primary={primary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}20`, color: primary }}>
          <Bell className="w-8 h-8" />
        </div>
        <p className={`text-sm font-bold ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>Error al cargar notificaciones</p>
        <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} max-w-sm`}>{error}</p>
        <Button
          variant="primary"
          size="md"
          onClick={fetchNotifications}
          primary={primary}
          borderColor={borderDynamic}
          textColor={textColor}
          cardBg={secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)')}
          isDarkBg={isDarkBg}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
<div className={`border rounded-3xl shadow-xl w-full p-6 space-y-6`} style={containerStyle}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-3 border-b gap-3" style={{ borderColor: borderDynamic }}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
                Mis Notificaciones
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10" style={{ color: textColor }}>
                {filteredNotifications.length}
              </span>
            </div>
            <p className={`text-xs ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
              {stats.unread > 0 ? `${stats.unread} sin leer` : 'Todas las notificaciones estan leidas'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" style={{ borderColor: borderDynamic, color: textColor }}>
            <Bell className="w-4 h-4" />
          </div>
        </div>

        {/* Stats */}
        <NotificationStats stats={stats} primary={primary} textColor={textColor} isDarkBg={isDarkBg} />

        {/* Filtros */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: textColor }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar notificaciones por tienda, producto..."
              className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none bg-transparent"
              style={inputStyle}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40 hover:opacity-100"
                style={{ color: textColor }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                icon={<Filter className="w-3.5 h-3.5" />}
                primary={primary}
                borderColor={borderDynamic}
                textColor={textColor}
                cardBg={secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)')}
                isDarkBg={isDarkBg}
              >
                {filterOptions.find(f => f.key === filterType)?.label || 'Todas'}
              </Button>
              
              {isFilterDropdownOpen && (
                <div 
                  className="absolute right-0 top-full mt-1 rounded-xl border shadow-2xl py-1 min-w-[160px] z-50 max-h-80 overflow-y-auto"
                  style={{ 
                    backgroundColor: secondary || (isDarkBg ? '#1e293b' : '#ffffff'),
                    borderColor: borderDynamic 
                  }}
                >
                  {filterOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setFilterType(item.key);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-xs text-left hover:opacity-80 ${filterType === item.key ? 'font-bold' : ''}`}
                      style={{ color: filterType === item.key ? primary : textColor }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                icon={<Clock className="w-3.5 h-3.5" />}
                primary={primary}
                borderColor={borderDynamic}
                textColor={textColor}
                cardBg={secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)')}
                isDarkBg={isDarkBg}
              >
                {sortOptions.find(s => s.key === sortType)?.label || 'Mas recientes'}
              </Button>
              
              {isSortDropdownOpen && (
                <div 
                  className="absolute right-0 top-full mt-1 rounded-xl border shadow-2xl py-1 min-w-[160px] z-50"
                  style={{ 
                    backgroundColor: secondary || (isDarkBg ? '#1e293b' : '#ffffff'),
                    borderColor: borderDynamic 
                  }}
                >
                  {sortOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSortType(item.key);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-xs text-left hover:opacity-80 ${sortType === item.key ? 'font-bold' : ''}`}
                      style={{ color: sortType === item.key ? primary : textColor }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {stats.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                icon={<CheckCheck className="w-3.5 h-3.5" />}
                primary={primary}
                borderColor={borderDynamic}
                textColor={textColor}
                cardBg={secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)')}
                isDarkBg={isDarkBg}
              >
                <span className="hidden sm:inline">Marcar todas</span>
              </Button>
            )}

            <button
              type="button"
              onClick={fetchNotifications}
              className="p-2.5 rounded-xl border hover:opacity-70"
              style={{ borderColor: borderDynamic, color: textColor }}
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {(filterType !== 'all' || searchQuery || sortType !== 'newest' || selectedTenantId) && (
              <button
                onClick={resetFilters}
                className="px-2 py-2.5 rounded-xl border text-xs hover:opacity-80"
                style={{ borderColor: borderDynamic, color: textColor }}
                title="Resetear filtros"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Layout de dos columnas - Tiendas + Notificaciones */}
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-12 h-12" />}
            message={
              searchQuery || filterType !== 'all' || sortType !== 'newest'
                ? 'No se encontraron notificaciones con estos filtros.'
                : 'No hay notificaciones de tus compras. Cuando compres algo, aparecerá aquí.'
            }
            primary={primary}
            textColor={textColor}
            borderColor={borderDynamic}
            cardBg={containerStyle.backgroundColor as string}
            isDarkBg={isDarkBg}
          />
        ) : (
          <div className="flex gap-4">
            {/* Columna izquierda: Lista de Tiendas (35%) */}
            <div className="w-[35%] flex-shrink-0">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {tenantGroups.map((group) => {
                  const avatarUrl = group.tenantLogo ? getFullAvatarUrl(group.tenantLogo) : null;
                  const initials = getInitials(group.tenantName);
                  const isSelected = selectedTenantId === group.tenantId;

                  return (
                    <button
                      key={group.tenantId}
                      type="button"
                      onClick={() => handleSelectTenant(group.tenantId)}
                      className="w-full p-3 rounded-xl border transition-all cursor-pointer text-left flex items-center gap-3 hover:opacity-80"
                      style={{
                        borderColor: isSelected ? primary : borderDynamic,
                        backgroundColor: isSelected
                          ? (isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                          : (isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border flex items-center justify-center" style={{ borderColor: borderDynamic }}>
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={group.tenantName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-sm font-bold"
                              style={{ backgroundColor: `${primary}20`, color: primary }}
                            >
                              {initials}
                            </div>
                          )}
                        </div>
                        {group.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: primary }}>
                            {group.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold truncate" style={{ color: textColor }}>
                            {group.tenantName}
                          </p>
                          {group.lastNotification && (
                            <span className="text-[10px] shrink-0" style={{ color: textColor, opacity: 0.6 }}>
                              {new Date(group.lastNotification.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5 gap-2">
                          <p className="text-xs truncate" style={{ color: textColor, opacity: 0.6 }}>
                            {group.notifications.length} notificaciones
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna derecha: Notificaciones de la Tienda seleccionada (65%) */}
            <div className="w-[65%] flex-shrink-0">
              {selectedTenantId ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {selectedNotifications.length > 0 ? (
                    selectedNotificationsGrouped.map((group) => (
                      <div key={group.key} className="space-y-2">
                        {/* 🔥 Header de fecha (estilo Slack) */}
                        <div className="flex items-center gap-3 pt-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}
                            style={{ opacity: isDarkBg ? 0.7 : 0.5 }}
                          >
                            {group.label}
                          </span>
                          <span
                            className="text-[10px] font-medium opacity-40"
                            style={{ color: textColor }}
                          >
                            · {group.items.length}
                          </span>
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: borderDynamic }}
                          />
                        </div>

                        {/* 🔥 Notificaciones del grupo */}
                        {group.items.map((notification) => (
                          <EnhancedNotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDelete={deleteNotification}
                            onOpenOrder={openOrderModal}
                            primary={primary}
                            textColor={textColor}
                            isDarkBg={isDarkBg}
                            borderDynamic={borderDynamic}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={<Bell className="w-12 h-12" />}
                      message="No hay notificaciones para esta tienda"
                      primary={primary}
                      textColor={textColor}
                      borderColor={borderDynamic}
                      cardBg={containerStyle.backgroundColor as string}
                      isDarkBg={isDarkBg}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="h-[500px] flex items-center justify-center rounded-2xl border-2 border-dashed"
                  style={{
                    borderColor: borderDynamic,
                    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <EmptyState
                    icon={<Store className="w-12 h-12" />}
                    title="Selecciona una tienda"
                    message="Elige una tienda de la lista para ver sus notificaciones"
                    primary={primary}
                    textColor={textColor}
                    borderColor={borderDynamic}
                    cardBg={containerStyle.backgroundColor as string}
                    isDarkBg={isDarkBg}
                    padding="py-0"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isOrderModalOpen && selectedOrder && (
        <BuyerOrderDetailModal
          isOpen={isOrderModalOpen}
          onClose={closeOrderModal}
          order={selectedOrder}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onCancelOrder={onCancelOrder}
          isCancelling={isCancelling}
          onReportPayment={onReportPayment}
          tenantPaymentData={tenantPaymentData}
          userProducts={userProducts}
        />
      )}
    </>
  );
}