'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellDot, CheckCheck, Package, Calendar, XCircle, Truck, CreditCard, AlertTriangle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAccountPath } from '@/lib/accountPath';
import { apiFetch } from '@/lib/api';
interface Notification {
  id: string;
  userId: string;
  tenantId?: string;
  orderId?: string;
  bookingId?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  source?: 'buyer' | 'seller';
}

interface NotificationsBellProps {
  userId: string;
  isLight: boolean;
  textColor?: string;
  mutedTextColor?: string;
  borderColor?: string;
  hoverBg?: string;
  primaryColor?: string;
  secondary?: string;
  className?: string;
}

export default function NotificationsBell({
  userId,
  isLight,
  textColor = 'text-slate-900',
  mutedTextColor = 'text-slate-500',
  borderColor = 'border-slate-200',
  hoverBg = 'hover:bg-black/5',
  primaryColor = '#ea580c',
  secondary,
  className = '',
}: NotificationsBellProps) {
  const router = useRouter();
    // 🔥 Resolver la ruta según el rol del usuario.
  // Driver → /repartidor
  // Profesional → /profesional
  // Buyer / otros → /mi-cuenta?tab=notificaciones
  const goToNotifications = useCallback(() => {
    let user: any = null;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('user');
        if (raw) user = JSON.parse(raw);
      }
    } catch {}

    if (!user) {
      router.push('/mi-cuenta?tab=notificaciones');
      return;
    }

    const path = getAccountPath(user);
    // Si es /mi-cuenta, agregamos el tab de notificaciones.
    // Si es /repartidor o /profesional, vamos directo (no tienen tab de notifs).
    if (path === '/mi-cuenta') {
      router.push('/mi-cuenta?tab=notificaciones');
    } else {
      router.push(path);
    }
  }, [router]);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // 🔥 Leer el bg-color de la CSS var de forma reactiva (a themeChange).
  const [pageBg, setPageBg] = useState<string>(() => {
    if (typeof window === 'undefined') return secondary || '#0f172a';
    const css = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-color')
      .trim();
    return css || secondary || (isLight ? '#ffffff' : '#0f172a');
  });

  useEffect(() => {
    const updateBg = () => {
      const css = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-color')
        .trim();
      setPageBg(css || secondary || (isLight ? '#ffffff' : '#0f172a'));
    };
    updateBg();
    window.addEventListener('themeChange', updateBg);
    window.addEventListener('tenantThemeUpdated', updateBg);
    window.addEventListener('paletteChange', updateBg);
    return () => {
      window.removeEventListener('themeChange', updateBg);
      window.removeEventListener('tenantThemeUpdated', updateBg);
      window.removeEventListener('paletteChange', updateBg);
    };
  }, [secondary, isLight]);

  const borderDynamic = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  const containerBg = pageBg;
  const resolvedTextMain = isLight ? 'text-slate-900' : 'text-slate-100';
  const resolvedTextMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const buttonBg = isLight ? 'bg-white/40' : 'bg-black/25';

  // 🔥 DETECTAR SI ES UN SERVICIO (para el icono y etiqueta)
  const isServiceNotification = (notification: Notification): boolean => {
    if (notification.metadata?.orderType === 'service') return true;
    if (notification.metadata?.isService === true) return true;
    if (notification.bookingId) return true;
    if (notification.type?.toLowerCase().includes('booking')) return true;
    
    const serviceKeywords = ['cita', 'reserva', 'servicio', 'appointment', 'booking'];
    const messageLower = notification.message?.toLowerCase() || '';
    const titleLower = notification.title?.toLowerCase() || '';
    
    if (serviceKeywords.some(keyword => messageLower.includes(keyword) || titleLower.includes(keyword))) {
      return true;
    }
    
    return false;
  };

  // 🔥 DETERMINAR EL TIPO REAL DE LA NOTIFICACIÓN
  const getNotificationType = (notification: Notification): { type: string; icon: React.ReactNode; color: string } => {
    const type = notification.type?.toLowerCase() || '';
    const metadata = notification.metadata || {};
    const isService = isServiceNotification(notification);

    if (isService) {
      return {
        type: 'service',
        icon: <Calendar className="w-4 h-4" />,
        color: '#8b5cf6'
      };
    }

    if (type.includes('order') || type.includes('pedido') || metadata.orderType === 'product') {
      return {
        type: 'product',
        icon: <Package className="w-4 h-4" />,
        color: '#3b82f6'
      };
    }

    if (type.includes('delivery') || type.includes('shipping') || type.includes('envío') || 
        type.includes('entrega') || metadata.delivery) {
      return {
        type: 'delivery',
        icon: <Truck className="w-4 h-4" />,
        color: '#22c55e'
      };
    }

    if (type.includes('cancel') || type.includes('cancell') || metadata.cancelled === true) {
      return {
        type: 'cancel',
        icon: <XCircle className="w-4 h-4" />,
        color: '#ef4444'
      };
    }

    if (type.includes('payment') || type.includes('pago') || metadata.payment) {
      return {
        type: 'payment',
        icon: <CreditCard className="w-4 h-4" />,
        color: '#22c55e'
      };
    }

    if (type.includes('warning') || type.includes('alert')) {
      return {
        type: 'warning',
        icon: <AlertTriangle className="w-4 h-4" />,
        color: '#f59e0b'
      };
    }

    return {
      type: 'info',
      icon: <Info className="w-4 h-4" />,
      color: '#64748b'
    };
  };

  // 🔥 REDIRIGIR A LA PESTAÑA DE NOTIFICACIONES EN MI CUENTA
  const handleNotificationClick = (notification: Notification) => {
    console.log('🔔 [NotificationsBell] Click en notificación:', {
      id: notification.id,
      title: notification.title,
    });

    if (!notification.read) {
      markAsRead(notification.id);
    }

    goToNotifications();
    setIsOpen(false);
  };

  // 🔥 "VER TODAS" -> misma ruta
  const goToNotificationsPage = () => {
    setIsOpen(false);
    goToNotifications();
  };

  // 🔥 Ref para leer el unreadCount actual sin meterlo en las deps del useCallback
  // (evita el loop: setUnreadCount → nueva fetchNotifications → nuevo useEffect → fetch)
  const unreadCountRef = useRef(0);
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const fetchNotifications = useCallback(async () => {
    if (isFetchingRef.current || !userId || !isMountedRef.current) {
      return;
    }

    // ✅ No llamar al backend si no hay token (evita 401 y ruido en consola)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        if (isMountedRef.current) {
          setNotifications([]);
          setUnreadCount(0);
        }
        return;
      }
    }

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      const res = await apiFetch(`/notifications/user/${userId}?limit=5`);

      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        const items = data.items || [];
        const newUnreadCount = data.unreadCount || 0;

        const prevCount = unreadCountRef.current;
        if (newUnreadCount > prevCount && prevCount > 0) {
          setIsPulsing(true);
          setTimeout(() => {
            if (isMountedRef.current) setIsPulsing(false);
          }, 2000);
        }

        if (isMountedRef.current) {
          const buyerItems = items.filter((n: any) => {
            if (n.source === 'buyer') return true;
            if (!n.source) return true;
            return false;
          });

          setNotifications(buyerItems);
          setUnreadCount(newUnreadCount);
        }
      }
    } catch (error) {
      // Silencioso
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [userId, API_BASE]);  // ✅ SIN unreadCount

  // 🔥 CARGA INICIAL
  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchNotifications]);

  // 🔥 ESCUCHAR EVENTOS GLOBALES (SIN CONTEXTO)
  useEffect(() => {
    const handleRefresh = () => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    };

    const handleGlobalRefresh = () => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    };

    window.addEventListener('notificationUpdate', handleRefresh);
    window.addEventListener('globalRefresh', handleGlobalRefresh);

    console.log('✅ [NotificationsBell] Suscrito a eventos de refresco');

    return () => {
      window.removeEventListener('notificationUpdate', handleRefresh);
      window.removeEventListener('globalRefresh', handleGlobalRefresh);
    };
  }, [fetchNotifications]);

  // 🔥 ACTUALIZAR CUANDO SE ABRE EL DROPDOWN
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // 🔥 MARCAR COMO LEÍDA
  const markAsRead = async (notificationId: string) => {
    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 🔥 MARCAR TODAS COMO LEÍDAS
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await apiFetch(`/notifications/user/${userId}/read-all`, {
        method: 'PATCH',
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // 🔥 CERRAR DROPDOWN
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Hace ${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString('es-VE');
  };

  const typeLabels: Record<string, string> = {
    product: 'Producto',
    service: 'Servicio/Cita',
    delivery: 'Envío',
    cancel: 'Cancelación',
    payment: 'Pago',
    warning: 'Alerta',
    info: 'Info'
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => {
          const newOpen = !isOpen;
          setIsOpen(newOpen);
          if (newOpen) {
            fetchNotifications();
          }
        }}
        className={`relative p-2 rounded-xl border flex items-center justify-center transition ${hoverBg} ${textColor} ${
          isPulsing ? 'animate-pulse' : ''
        }`}
        style={{
          borderColor: borderDynamic,
          backgroundColor: buttonBg,
        }}
        aria-label="Notificaciones"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="w-4 h-4" style={{ color: primaryColor }} />
            <span
              className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 transition-all duration-300 ${
                isPulsing ? 'scale-110 ring-2 ring-red-500/30' : ''
              }`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border z-50 max-h-[500px] flex flex-col"
          style={{
            backgroundColor: containerBg,
            borderColor: borderDynamic,
            color: isLight ? '#0f172a' : '#ffffff',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: borderDynamic,
              backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
            }}
          >
            <span className={`text-sm font-bold ${resolvedTextMain}`}>Notificaciones</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isMarkingAll}
                  className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition ${resolvedTextMuted} hover:opacity-80`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {isMarkingAll ? '...' : 'Marcar todas'}
                </button>
              )}
              <button
                onClick={goToNotificationsPage}
                className={`text-[10px] font-bold uppercase tracking-wider transition ${resolvedTextMuted} hover:opacity-80`}
              >
                Ver todas
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
                  style={{ color: primaryColor }}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className={`text-sm font-medium ${resolvedTextMain}`}>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map(notification => {
                const { icon, color, type } = getNotificationType(notification);
                const isService = isServiceNotification(notification);
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b cursor-pointer transition last:border-b-0 ${
                      notification.read ? 'opacity-70' : ''
                    }`}
                    style={{
                      borderColor: borderDynamic,
                      backgroundColor: notification.read
                        ? 'transparent'
                        : isLight
                        ? 'rgba(0,0,0,0.03)'
                        : 'rgba(255,255,255,0.03)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = isLight
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = notification.read
                        ? 'transparent'
                        : isLight
                        ? 'rgba(0,0,0,0.03)'
                        : 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: `${color}20`,
                          color: color
                        }}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-sm font-semibold ${
                              notification.read
                                ? resolvedTextMain
                                : 'text-[var(--accent-color,#ea580c)]'
                            }`}
                            style={{ color: notification.read ? undefined : primaryColor }}
                          >
                            {notification.title}
                          </p>
                          <span 
                            className="text-[9px] font-normal uppercase opacity-60 whitespace-nowrap"
                            style={{ color: resolvedTextMuted }}
                          >
                            • {typeLabels[type] || 'Info'}
                            {isService && ' 🟣'}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${resolvedTextMuted}`}>
                          {notification.message}
                        </p>
                        <span className={`text-[10px] ${resolvedTextMuted}`}>
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      {!notification.read && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            className="px-4 py-2 border-t text-center"
            style={{
              borderColor: borderDynamic,
              backgroundColor: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
            }}
          >
            <button
              onClick={goToNotificationsPage}
              className="text-xs font-medium transition hover:opacity-80"
              style={{ color: primaryColor }}
            >
              Ver todas las notificaciones →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}