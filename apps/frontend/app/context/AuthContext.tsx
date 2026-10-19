'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  tenantId?: string;
  avatar?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: User, token: string, refreshToken?: string) => void;
    logout: () => void;
  refresh: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromStorage = useCallback(() => {
    try {
      const userString = localStorage.getItem('user');
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      
      if (userString && token) {
        const parsedUser = JSON.parse(userString);
        setUser(parsedUser);
        setLoading(false);
        return true;
      }
      setUser(null);
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Error loading user from storage:', error);
      setUser(null);
      setLoading(false);
      return false;
    }
  }, []);

  // 🔥 Refresca el user desde la API (/auth/context) para tener datos frescos.
  // Actualiza localStorage + estado si cambió algo (ej: emailVerified pasa a true).
  const refreshFromApi = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) return;

      // 🔥 Guard: si el access token ya expiró (exp en el payload), no llamamos.
      // Evita el 401 en consola cuando el usuario tiene un token viejo.
      // El refresh se hará automáticamente cuando alguna request autenticada
      // real reciba 401 y dispare apiFetch → /auth/refresh.
      try {
        const payloadB64 = token.split('.')[1];
        if (payloadB64) {
          const payload = JSON.parse(atob(payloadB64));
          if (payload?.exp && payload.exp * 1000 < Date.now()) {
            return;
          }
        }
      } catch {
        // Si el token no es parseable, mejor no llamar.
        return;
      }

      const res = await apiFetch('/auth/context');
      if (!res.ok) {
        // 401 = sin sesión / token expirado → silencioso, no es error
        if (res.status !== 401) {
          console.debug('[AuthContext] refreshFromApi status:', res.status);
        }
        return;
      }

      const fresh = await res.json();
      if (!fresh || typeof fresh !== 'object') return;

      // El backend puede devolver { user: {...} } o el user directo.
      const freshUser = fresh.user ?? fresh;
      if (!freshUser || !freshUser.id) return;

      const currentRaw = localStorage.getItem('user');
      const current = currentRaw ? JSON.parse(currentRaw) : null;

      const changed =
        !current ||
        current.emailVerified !== freshUser.emailVerified ||
        current.name !== freshUser.name ||
        current.avatarUrl !== freshUser.avatarUrl ||
        current.role !== freshUser.role;

      if (changed) {
        const merged = { ...(current || {}), ...freshUser };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
        // Notificar a otros listeners (StoreHeader, Header, etc.)
        window.dispatchEvent(new CustomEvent('authChange'));
        window.dispatchEvent(new CustomEvent('authChanged'));
      }
    } catch (err) {
      // Silencioso: si falla, seguimos con lo que hay en localStorage
      console.warn('[AuthContext] refreshFromApi falló:', err);
    }
  }, []);

  useEffect(() => {
    loadUserFromStorage();

    // 🔥 Refrescar el user desde la API al montar (trae emailVerified fresco)
    refreshFromApi();

    // Escuchar cambios en localStorage (otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token' || e.key === 'access_token') {
        loadUserFromStorage();
      }
    };

    // Escuchar eventos personalizados de login/logout/refresh
    const handleAuthEvent = () => {
      loadUserFromStorage();
    };

    // Cuando vuelve el foco a la pestaña, refrescar (por si verificó en otra)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromApi();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // 🔥 Escuchar AMBOS nombres (con y sin "d") por compatibilidad
    window.addEventListener('authChange', handleAuthEvent);
    window.addEventListener('authChanged', handleAuthEvent);
    window.addEventListener('userUpdated', handleAuthEvent);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthEvent);
      window.removeEventListener('authChanged', handleAuthEvent);
      window.removeEventListener('userUpdated', handleAuthEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadUserFromStorage, refreshFromApi]);

  const login = useCallback((userData: User, token: string, refreshToken?: string) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      setUser(userData);
      window.dispatchEvent(new CustomEvent('authChanged'));
    } catch (error) {
      console.error('Error during login:', error);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      // Fase 1: notificar al backend para revocar refresh tokens.
      // Fire-and-forget: no esperamos la respuesta, igual limpiamos local.
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken, all: false }),
        }).catch(() => {
          // Si falla, da igual: el refresh va a expirar solo en 30 días.
        });
      }

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      window.dispatchEvent(new CustomEvent('authChanged'));
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  const refresh = useCallback(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new CustomEvent('userUpdated'));
      } catch (error) {
        console.error('Error updating user:', error);
      }
    }
  }, [user]);

  const userId = user?.id || user?._id || user?.userId || null;

  return (
    <AuthContext.Provider value={{
      user,
      userId,
      isAuthenticated: !!user && !!userId,
      loading,
      login,
      logout,
      refresh,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}