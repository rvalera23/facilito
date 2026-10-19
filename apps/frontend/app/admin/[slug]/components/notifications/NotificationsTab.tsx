// frontend/app/admin/[slug]/components/notifications/NotificationsTab.tsx

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
  Users,
  AlertTriangle,
  Eye,
  User,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { EnhancedNotificationItem } from './components/EnhancedNotificationItem';
import { useNotifications } from './hooks/useNotifications';
import { FilterType, SortType, EnhancedNotification } from './types';
import OrderDetailModal from '../orders/components/OrderDetailModal';
import { getInitials, getFullAvatarUrl } from '../conversations/utils/conversationUtils';
import { groupNotificationsByDate } from '@/lib/groupNotificationsByDate';
import { useUndoDelete } from '@/hooks/useUndoDelete';
import { UndoToast } from '@/app/components/UndoToast';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderFullPage } from '@/components/ui/Loader';
interface NotificationsTabProps {
  tenant: any;
  primary: string;
  secondary: string;
  textColor: string;
  isDarkBg: boolean;
  onOrderStatusChange?: (orderId: string, newStatus: string) => Promise<any>;
  isUpdating?: boolean;
  onOrderUpdated?: (updatedOrder: any) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NotificationsTab({
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg,
  onOrderStatusChange,
  isUpdating = false,
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
  } = useNotifications(tenant?.id);

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientCache, setClientCache] = useState<Map<string, { name: string; avatar: string | null }>>(new Map());
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // 🔥 Eliminar con opción de "Deshacer" (estilo Gmail)
  const { pendingDelete, softDelete, undo } = useUndoDelete<EnhancedNotification>({
    timeoutMs: 5000,
  });

  const handleDeleteWithUndo = (notification: EnhancedNotification) => {
    softDelete(
      notification.id,
      notification,
      // onHide: quitamos de la lista inmediatamente
      () => {
        // Como el hook useNotifications ya maneja el estado interno,
        // hacemos una copia local que filtra el item
        // (el backend se encarga al confirmar)
      },
      // onCommit: eliminar en el backend
      async () => {
        await deleteNotification(notification.id);
      }
    );
  };

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

  // 🔥 FUNCIÓN PARA EXTRAER NOMBRE DEL CLIENTE DESDE LA NOTIFICACIÓN
  const extractClientName = (notification: any): string => {
    // Prioridad: buscar en diferentes lugares donde pueda estar el nombre
    if (notification.buyer?.name) return notification.buyer.name;
    if (notification.client?.name) return notification.client.name;
    if (notification.user?.name) return notification.user.name;
    if (notification.customerName) return notification.customerName;
    if (notification.clientName) return notification.clientName;
    if (notification.userName) return notification.userName;
    
    // Buscar en metadata
    if (notification.metadata?.customerName) return notification.metadata.customerName;
    if (notification.metadata?.clientName) return notification.metadata.clientName;
    if (notification.metadata?.buyerName) return notification.metadata.buyerName;
    if (notification.metadata?.userName) return notification.metadata.userName;
    
    // Buscar en el mensaje de la notificación (como "El cliente Yuraima Martinez ha realizado...")
    if (notification.message) {
      const match = notification.message.match(/cliente\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\s+ha|\s+realizado|$)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Buscar en content
    if (notification.content) {
      const match = notification.content.match(/cliente\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\s+ha|\s+realizado|$)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Cliente sin nombre';
  };

  // 🔥 FUNCIÓN PARA EXTRAER ID DEL CLIENTE
  const extractClientId = (notification: any): string => {
    return notification.buyerId || 
           notification.clientId || 
           notification.userId || 
           notification.customerId ||
           notification.metadata?.clientId ||
           notification.metadata?.buyerId ||
           notification.metadata?.userId ||
           'unknown';
  };

  // 🔥 FUNCIÓN PARA EXTRAER AVATAR DEL CLIENTE
  const extractClientAvatar = (notification: any): string | null => {
    // 🔥 PRIORIDAD 1: metadata.customerAvatarUrl (lo que guarda el backend)
    if (notification.metadata?.customerAvatarUrl) {
      return notification.metadata.customerAvatarUrl;
    }
    // Fallbacks (para notificaciones viejas o casos raros)
    return notification.buyer?.avatarUrl || 
           notification.buyer?.avatar || 
           notification.client?.avatarUrl || 
           notification.client?.avatar || 
           notification.user?.avatarUrl || 
           notification.user?.avatar || 
           notification.metadata?.clientAvatar ||
           notification.metadata?.buyerAvatar ||
           null;
  };

  // 🔥 FUNCIÓN PARA EXTRAER EMAIL DEL CLIENTE
  const extractClientEmail = (notification: any): string | null => {
    return notification.buyer?.email || 
           notification.client?.email || 
           notification.user?.email || 
           notification.metadata?.clientEmail ||
           notification.metadata?.buyerEmail ||
           null;
  };

  // 🔥 FUNCIÓN PARA EXTRAER TELÉFONO DEL CLIENTE
  const extractClientPhone = (notification: any): string | null => {
    return notification.buyer?.phone || 
           notification.client?.phone || 
           notification.user?.phone || 
           notification.metadata?.clientPhone ||
           notification.metadata?.buyerPhone ||
           null;
  };

  // 🔥 CARGAR CLIENTES FALTANTES (nombre + avatar) PARA LAS NOTIFICACIONES
  useEffect(() => {
    const missingIds = new Set<string>();
    filteredNotifications.forEach((n: any) => {
      const cid = extractClientId(n);
      if (cid && cid !== 'unknown' && !clientCache.has(cid) && !n.buyer?.name && !n.client?.name && !n.user?.name) {
        missingIds.add(cid);
      }
    });

    if (missingIds.size === 0) return;

    const fetchClients = async () => {
      const token = getToken();
      const entries = await Promise.all(
        Array.from(missingIds).map(async (id) => {
          try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) {
              // 🔥 Marcar como "no encontrado" para no reintentar en loop
              return [id, { name: 'Cliente', avatar: null }] as const;
            }
            const u = await res.json();
            return [id, {
              name: u.name || u.fullName || u.username || 'Cliente',
              avatar: u.avatarUrl || u.avatar || u.image || null,
            }] as const;
          } catch {
            // 🔥 Marcar como error para no reintentar en loop
            return [id, { name: 'Cliente', avatar: null }] as const;
          }
        })
      );

      setClientCache((prev) => {
        const next = new Map(prev);
        entries.forEach((e) => { if (e) next.set(e[0], e[1]); });
        return next;
      });
    };

    fetchClients();
  }, [filteredNotifications, clientCache]);

  // 🔥 AGRUPAR NOTIFICACIONES POR CLIENTE
  const clientGroups = useMemo(() => {
    const groups = new Map<string, { 
      clientId: string;
      clientName: string;
      clientEmail: string | null;
      clientPhone: string | null;
      clientAvatar: string | null;
      notifications: any[];
      unreadCount: number;
      lastNotification: any;
    }>();

    filteredNotifications.forEach(notification => {
      // Extraer información del cliente usando las funciones
      const clientId = extractClientId(notification);
      const cached = clientCache.get(clientId);
      const clientName = (notification.buyer?.name || notification.client?.name || notification.user?.name)
        ? extractClientName(notification)
        : (cached?.name || extractClientName(notification));
      const clientEmail = extractClientEmail(notification);
      const clientPhone = extractClientPhone(notification);
      const clientAvatar = extractClientAvatar(notification) || cached?.avatar || null;

      if (!groups.has(clientId)) {
        groups.set(clientId, {
          clientId,
          clientName,
          clientEmail,
          clientPhone,
          clientAvatar,
          notifications: [],
          unreadCount: 0,
          lastNotification: null
        });
      }

      const group = groups.get(clientId)!;
      group.notifications.push(notification);
      if (!notification.read) group.unreadCount++;
      
      // Actualizar última notificación
      if (!group.lastNotification || new Date(notification.createdAt) > new Date(group.lastNotification.createdAt)) {
        group.lastNotification = notification;
      }
    });

    // Ordenar por fecha de última notificación (más reciente primero)
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.lastNotification) return 1;
      if (!b.lastNotification) return -1;
      return new Date(b.lastNotification.createdAt).getTime() - new Date(a.lastNotification.createdAt).getTime();
    });
  }, [filteredNotifications, clientCache]);
  // 🔥 NOTIFICACIONES FILTRADAS POR CLIENTE SELECCIONADO
  const selectedNotifications = useMemo(() => {
    if (!selectedClientId) return [];
    const group = clientGroups.find(g => g.clientId === selectedClientId);
    return group?.notifications || [];
  }, [selectedClientId, clientGroups]);

  // 🔥 AGRUPAR POR FECHA (Hoy / Ayer / Esta semana / Anteriores)
  const selectedNotificationsGrouped = useMemo(() => {
    return groupNotificationsByDate(selectedNotifications);
  }, [selectedNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const buyerCount = notifications.filter(n => n.source === 'buyer').length;
  const sellerCount = notifications.filter(n => n.source === 'seller').length;
  const requiresActionCount = notifications.filter(n => n.metadata?.actionRequired).length;

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const openOrderModal = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const orderId = notification.metadata?.orderId || notification.orderId;
    if (!orderId) {
      console.warn('No se encontró orderId en la notificación');
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
        
        let tenantProducts: any[] = [];
        try {
          const productsResponse = await fetch(`${API_BASE_URL}/products/tenant/${orderData.tenantId || tenant?.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (productsResponse.ok) {
            tenantProducts = await productsResponse.json();
          }
        } catch (err) {
          console.warn('No se pudieron cargar los productos del tenant:', err);
        }
        
        const getProductImage = (productId: string): string | null => {
          if (!productId || !tenantProducts.length) return null;
          const product = tenantProducts.find((p: any) => p.id === productId || p._id === productId);
          if (!product) return null;
          return product.coverImage || product.image || product.photo || 
                 (product.mediaUrls && product.mediaUrls.length > 0 ? product.mediaUrls[0] : null) || null;
        };
        
        const itemsWithImages = orderData.items?.map((item: any) => {
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
        }) || orderData.items;
        
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

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'unread', label: 'No leídas' },
    { key: 'read', label: 'Leídas' },
    { key: 'buyer', label: 'Cliente' },
    { key: 'seller', label: 'Vendedor' },
    { key: 'product', label: 'Productos' },
    { key: 'service', label: 'Servicios' },
    { key: 'requires_action', label: 'Requieren acción' },
  ];

  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'newest', label: 'Más recientes' },
    { key: 'oldest', label: 'Más antiguas' },
    { key: 'unread_first', label: 'No leídas primero' },
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSortType('newest');
    setSelectedClientId(null);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
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
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-3 border-b gap-3" style={{ borderColor: borderDynamic }}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
                Notificaciones
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10" style={{ color: textColor }}>
                {filteredNotifications.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className={`text-xs flex items-center gap-1 ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
                <Eye className="w-3 h-3" />
                {unreadCount} sin leer
              </span>
              <span className="w-px h-3 opacity-20" style={{ backgroundColor: textColor }} />
              <span className={`text-xs flex items-center gap-1 ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
                <Users className="w-3 h-3" />
                {buyerCount} cliente / {sellerCount} vendedor
              </span>
              {requiresActionCount > 0 && (
                <>
                  <span className="w-px h-3 opacity-20" style={{ backgroundColor: textColor }} />
                  <span className="text-xs flex items-center gap-1 text-amber-500">
                    <AlertTriangle className="w-3 h-3" />
                    {requiresActionCount} requieren acción
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" style={{ borderColor: borderDynamic, color: textColor }}>
            <Bell className="w-4 h-4" />
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: textColor }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar notificaciones por cliente, producto..."
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
                {sortOptions.find(s => s.key === sortType)?.label || 'Más recientes'}
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

            {unreadCount > 0 && (
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

            {(filterType !== 'all' || searchQuery || sortType !== 'newest' || selectedClientId) && (
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

        {/* 🔥 LAYOUT DE DOS COLUMNAS - CLIENTES + NOTIFICACIONES */}
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-12 h-12" />}
            message={
              searchQuery || filterType !== 'all' || sortType !== 'newest'
                ? 'No se encontraron notificaciones con estos filtros.'
                : 'No hay notificaciones. Cuando recibas una, aparecerá aquí.'
            }
            primary={primary}
            textColor={textColor}
            borderColor={borderDynamic}
            cardBg={containerStyle.backgroundColor as string}
            isDarkBg={isDarkBg}
          />
        ) : (
          <div className="flex gap-4">
            {/* Columna izquierda: Lista de CLIENTES (35%) */}
            <div className="w-[35%] flex-shrink-0">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {clientGroups.map((group) => {
                  const avatarUrl = group.clientAvatar ? getFullAvatarUrl(group.clientAvatar) : null;
                  const initials = getInitials(group.clientName);

                  return (
                    <button
                      key={group.clientId}
                      onClick={() => handleSelectClient(group.clientId)}
                      className={`w-full p-3 rounded-xl border transition-all cursor-pointer text-left flex items-center gap-3 hover:opacity-80 ${
                        selectedClientId === group.clientId ? 'border' : ''
                      }`}
                      style={{
                        borderColor: selectedClientId === group.clientId ? primary : borderDynamic,
                        borderLeftColor: selectedClientId === group.clientId ? primary : borderDynamic,
                        backgroundColor: selectedClientId === group.clientId 
                          ? (isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                          : 'transparent',
                      }}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border flex items-center justify-center shrink-0" style={{ borderColor: borderDynamic }}>
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={group.clientName} 
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
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-bold truncate ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>
                            {group.clientName}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate ${isDarkBg ? 'text-slate-400' : 'text-slate-600'}`}>
                            {group.notifications.length} notificaciones
                            {group.clientEmail && (
                              <span className="ml-1 opacity-60">· {group.clientEmail}</span>
                            )}
                          </p>
                          {group.lastNotification && (
                            <span className={`text-[10px] ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} shrink-0 ml-2`}>
                              {new Date(group.lastNotification.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna derecha: Notificaciones del CLIENTE seleccionado (65%) */}
            <div className="w-[65%] flex-shrink-0">
              {selectedClientId ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {selectedNotifications.length > 0 ? (
                    selectedNotificationsGrouped.map((group) => (
                      <div key={group.key} className="space-y-2">
                        {/* 🔥 Header de fecha (estilo Slack) */}
                        <div className="flex items-center gap-3 pt-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${isDarkBg ? 'text-slate-400' : 'text-slate-500'}`}
                            style={{ color: isDarkBg ? undefined : textColor, opacity: isDarkBg ? 0.7 : 0.5 }}
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
                        {group.items
                          .filter((n) => pendingDelete?.id !== n.id)
                          .map((notification) => (
                            <EnhancedNotificationItem
                              key={notification.id}
                              notification={notification}
                              onMarkAsRead={markAsRead}
                              onDelete={async (id) => {
                                handleDeleteWithUndo(notification);
                                return true;
                              }}
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
                      message="No hay notificaciones para este cliente"
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
                    icon={<User className="w-12 h-12" />}
                    title="Selecciona un cliente"
                    message="Elige un cliente de la lista para ver sus notificaciones"
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

      {/* 🔥 Toast de "Deshacer" (estilo Gmail) */}
      <UndoToast
        show={!!pendingDelete}
        message="Notificación eliminada"
        actionLabel="Deshacer"
        onUndo={() => undo()}
        primary={primary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />

      {isOrderModalOpen && (
        <OrderDetailModal
          isOpen={isOrderModalOpen}
          onClose={closeOrderModal}
          order={selectedOrder}
          primary={primary}
          secondary={secondary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          onStatusChange={onOrderStatusChange}
          isUpdating={isUpdating}
          onOrderUpdated={onOrderUpdated}
          tenant={tenant}
        />
      )}
    </>
  );
}