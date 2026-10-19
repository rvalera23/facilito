// frontend/app/admin/[slug]/components/conversations/hooks/useConversationActions.ts

import { useState, useCallback } from 'react';
import { API_BASE } from '../constants';

interface UseConversationActionsOptions {
  tenantId: string;
  onRefresh?: () => void;
}

export function useConversationActions({ tenantId, onRefresh }: UseConversationActionsOptions) {
  const [isArchiving, setIsArchiving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const archiveConversation = useCallback(async (conversationId: string) => {
    setIsArchiving(prev => ({ ...prev, [conversationId]: true }));
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        if (onRefresh) onRefresh();
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al archivar');
        return false;
      }
    } catch (err) {
      console.error('Error archiving conversation:', err);
      setError('Error de conexión');
      return false;
    } finally {
      setIsArchiving(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [onRefresh]);

  const resolveConversation = useCallback(async (conversationId: string) => {
    setIsArchiving(prev => ({ ...prev, [conversationId]: true }));
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        if (onRefresh) onRefresh();
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al resolver');
        return false;
      }
    } catch (err) {
      console.error('Error resolving conversation:', err);
      setError('Error de conexión');
      return false;
    } finally {
      setIsArchiving(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [onRefresh]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    setIsArchiving(prev => ({ ...prev, [conversationId]: true }));
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        if (onRefresh) onRefresh();
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al eliminar');
        return false;
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Error de conexión');
      return false;
    } finally {
      setIsArchiving(prev => ({ ...prev, [conversationId]: false }));
    }
  }, [onRefresh]);

  return {
    archiveConversation,
    resolveConversation,
    deleteConversation,
    isArchiving,
    error,
  };
}