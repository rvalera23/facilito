'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';

export type NotificationRecord = {
  id: string;
  userId?: string;
  tenantId?: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  source?: string;
  bookingId?: string;
  orderId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
};
type NotificationCounts = {
  all: number;
  orders: number;
  messages: number;
  appointments: number;
  shipping: number;
};

type NotificationContextValue = {
  connected: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  counts: NotificationCounts;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  unlockSound: () => void;
};

const emptyCounts: NotificationCounts = {
  all: 0,
  orders: 0,
  messages: 0,
  appointments: 0,
  shipping: 0,
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const apiBase = process.env.NEXT_PUBLIC_API_URL;
const socketBase = apiBase.replace(/\/$/, '');

function getStoredIdentity() {
  if (typeof window === 'undefined') return { userId: '', tenantId: '' };

  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      userId: stored.id || stored.userId || stored.sub || '',
      tenantId: stored.tenantId || stored.tenant?.id || '',
    };
  } catch {
    return { userId: '', tenantId: '' };
  }
}

function classifyNotification(notification: NotificationRecord) {
  const type = String(notification.type || '').toLowerCase();
  const metadata = notification.metadata || {};
  const message = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();

  // 🔥 Shipping va PRIMERO para que no caiga en orders
  if (/shipping|envío|envio|delivery|despacho|mensajería|mensajeria|tracking|paquete/.test(type) || 
      /envío|envio|delivery|despacho|mensajería|mensajeria|tracking|paquete/.test(message)) {
    return 'shipping' as const;
  }
  if (notification.bookingId || metadata.orderType === 'service' || /booking|cita|reserva|servicio/.test(message)) {
    return 'appointments' as const;
  }
  if (/message|mensaje|chat|conversation|conversación/.test(type) || /mensaje|chat/.test(message)) {
    return 'messages' as const;
  }
  if (notification.orderId || /order|pedido|payment|pago|estado/.test(type)) {
    return 'orders' as const;
  }
  return 'all' as const;
}

function countNotifications(
  notifications: NotificationRecord[],
  sourceFilter?: 'buyer' | 'seller'
): NotificationCounts {
  const counts = { ...emptyCounts };
  for (const notification of notifications) {
    if (notification.read) continue;
    if (sourceFilter && notification.source !== sourceFilter) continue;
    counts.all += 1;
    const category = classifyNotification(notification);
    counts[category] += 1;
  }
  return counts;
}

function countBySource(notifications: NotificationRecord[], source: string) {
  return notifications.filter((notification) => !notification.read && notification.source === source).length;
}

// 🔥 Detecta el contexto actual según la ruta del navegador
function getContextSource(): 'buyer' | 'seller' {
  if (typeof window === 'undefined') return 'buyer';
  return window.location.pathname.includes('/admin/') ? 'seller' : 'buyer';
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState(getStoredIdentity);
  const socketRef = useRef<Socket | null>(null);
  const identityRef = useRef(identity);
  const knownIdsRef = useRef(new Set<string>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundUnlockedRef = useRef(false);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }, []);

  const unlockSound = useCallback(() => {
    if (typeof window === 'undefined' || soundUnlockedRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = context;
    if (context.state === 'suspended') void context.resume();
    soundUnlockedRef.current = true;
  }, []);

  const playNotificationSound = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !soundUnlockedRef.current) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
  }, []);

  const addNotification = useCallback((notification: NotificationRecord) => {
    if (!notification?.id || knownIdsRef.current.has(notification.id)) return;
    knownIdsRef.current.add(notification.id);
    setNotifications((current) => [notification, ...current].slice(0, 100));
    if (!notification.read) playNotificationSound();
    window.dispatchEvent(new CustomEvent('notificationUpdate', { detail: notification }));
  }, [playNotificationSound]);

  const applyUnread = useCallback((items: NotificationRecord[]) => {
    knownIdsRef.current = new Set(items.map((item) => item.id).filter(Boolean));
    setNotifications(items);
  }, []);

  const refresh = useCallback(async () => {
    const { userId } = identityRef.current;
    const token = getToken();
    if (!userId || !token) return;

    try {
      // 🔥 Traemos TODAS las notificaciones del usuario (buyer + seller).
      // El filtrado por contexto se hace al momento de contar/consumir.
      const response = await fetch(`${apiBase}/notifications/user/${userId}?onlyUnread=true&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      applyUnread(data.items || data.notifications || []);
    } catch {
      // Socket.IO remains the primary channel; HTTP is only a fallback.
    }
  }, [applyUnread, getToken]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('mark_as_read', { notificationId });
    }
    // 🔥 Marcar como leída en el estado local, no eliminar
    setNotifications((current) =>
      current.map((item) => item.id === notificationId ? { ...item, read: true } : item)
    );

    try {
      const response = await fetch(`${apiBase}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) void refresh();
    } catch {
      void refresh();
    }
  }, [getToken, refresh]);

  const markAllAsRead = useCallback(async () => {
    const { userId } = identityRef.current;
    const socket = socketRef.current;
    const contextSource = getContextSource();

    // 🔥 Solo marcamos como leídas las notificaciones del contexto actual
    if (socket?.connected && userId) {
      socket.emit('mark_all_as_read', { userId });
    }

    // 🔥 NO borramos todo el array, solo las del contexto actual
    setNotifications((current) =>
      current.filter((item) => item.source !== contextSource)
    );

    if (!userId) return;
    try {
      const response = await fetch(
        `${apiBase}/notifications/user/${userId}/read-all?source=${contextSource}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (!response.ok) void refresh();
    } catch {
      void refresh();
    }
  }, [getToken, refresh]);

  useEffect(() => {
    identityRef.current = identity;
    if (!identity.userId) {
      setNotifications([]);
      knownIdsRef.current.clear();
      return;
    }

    const socket = io(`${socketBase}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token: getToken() },
      autoConnect: true,
    });
    socketRef.current = socket;

    const authenticate = () => {
      socket.emit('authenticate', identityRef.current);
    };
    const handleConnect = () => {
      setConnected(true);
      authenticate();
    };
    const handleDisconnect = () => setConnected(false);
    const handleUnread = (payload: { notifications?: NotificationRecord[] }) => {
      applyUnread(payload.notifications || []);
    };
    const handleNew = (notification: NotificationRecord) => addNotification(notification);
    const handleUpdated = (notification: NotificationRecord) => {
      // 🔥 Actualizar la notificación existente (no crear nueva)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, ...notification } : item
        )
      );
    };
    const handleCount = () => void refresh();

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('unread_notifications', handleUnread);
    socket.on('new_notification', handleNew);
    socket.on('notification_updated', handleUpdated);
    socket.on('unread_count_updated', handleCount);

    void refresh();
    const fallbackInterval = window.setInterval(() => {
      if (!document.hidden && !socket.connected) void refresh();
    }, 30000);
    const handleVisibility = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(fallbackInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [addNotification, applyUnread, getToken, identity, refresh]);

  useEffect(() => {
    const syncIdentity = () => setIdentity(getStoredIdentity());
    window.addEventListener('authChanged', syncIdentity);
    window.addEventListener('storage', syncIdentity);
    return () => {
      window.removeEventListener('authChanged', syncIdentity);
      window.removeEventListener('storage', syncIdentity);
    };
  }, []);

  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [unlockSound]);

  // 🔥 counts filtrado por el contexto actual (admin = seller, mi-cuenta = buyer)
  const counts = useMemo(() => {
    const contextSource = getContextSource();
    return countNotifications(notifications, contextSource);
  }, [notifications]);

  const buyerUnreadCount = useMemo(() => countBySource(notifications, 'buyer'), [notifications]);
  const sellerUnreadCount = useMemo(() => countBySource(notifications, 'seller'), [notifications]);
  const value = useMemo(() => ({
    connected,
    notifications,
    unreadCount: counts.all,
    buyerUnreadCount,
    sellerUnreadCount,
    counts,
    markAsRead,
    markAllAsRead,
    refresh,
    unlockSound,
  }), [connected, notifications, counts, buyerUnreadCount, sellerUnreadCount, markAsRead, markAllAsRead, refresh, unlockSound]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationContext debe usarse dentro de NotificationProvider');
  return context;
}
