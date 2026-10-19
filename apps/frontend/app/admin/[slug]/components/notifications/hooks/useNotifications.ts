// frontend/app/admin/[slug]/components/notifications/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { EnhancedNotification, FilterType, SortType } from '../types';
import { triggerBadgeUpdate } from '../utils';
import { usePersistedState } from '@/hooks/usePersistedState';
import { apiFetch } from '@/lib/api';

export function useNotifications(tenantId?: string) {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = usePersistedState<FilterType>(
    'notifications_admin_filterType',
    'all',
    {
      validate: (v): v is FilterType =>
        ['all', 'unread', 'read', 'buyer', 'seller', 'product', 'service', 'requires_action'].includes(v as string),
    }
  );
  const [sortType, setSortType] = usePersistedState<SortType>(
    'notifications_admin_sortType',
    'newest',
    {
      validate: (v): v is SortType =>
        ['newest', 'oldest', 'unread_first'].includes(v as string),
    }
  );
  const [searchQuery, setSearchQuery] = usePersistedState<string>(
    'notifications_admin_searchQuery',
    ''
  );

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/notifications/tenant/${tenantId}?source=seller`);

      if (response.ok) {
        const data = await response.json();
        const notificationsList = Array.isArray(data) ? data : data.notifications || data.items || [];
        
        setNotifications(notificationsList);
        triggerBadgeUpdate();
      } else {
        const errorText = await response.text();
        setError(`Error ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        triggerBadgeUpdate();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking as read:', error);
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!tenantId) return false;
    
    try {
      const response = await apiFetch(`/notifications/tenant/${tenantId}/read-all?source=seller`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
        triggerBadgeUpdate();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }, [tenantId]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await apiFetch(`/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        triggerBadgeUpdate();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }, []);

  // Filtrar y ordenar notificaciones
  const filteredNotifications = (() => {
    let filtered = [...notifications];

    switch (filterType) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'read':
        filtered = filtered.filter(n => n.read);
        break;
      case 'buyer':
        filtered = filtered.filter(n => n.source === 'buyer');
        break;
      case 'seller':
        filtered = filtered.filter(n => n.source === 'seller');
        break;
      case 'product':
        filtered = filtered.filter(n => !n.metadata?.isService);
        break;
      case 'service':
        filtered = filtered.filter(n => n.metadata?.isService);
        break;
      case 'requires_action':
        filtered = filtered.filter(n => n.metadata?.actionRequired);
        break;
      default:
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.metadata?.customerName?.toLowerCase().includes(query) ||
        n.metadata?.paymentMethod?.toLowerCase().includes(query) ||
        n.metadata?.serviceName?.toLowerCase().includes(query)
      );
    }

    switch (sortType) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'unread_first':
        filtered.sort((a, b) => {
          if (a.read === b.read) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.read ? 1 : -1;
        });
        break;
    }

    return filtered;
  })();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
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
  };
}