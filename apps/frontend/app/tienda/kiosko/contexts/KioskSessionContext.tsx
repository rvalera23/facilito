'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

// ============================================================
// TIPOS
// ============================================================
export interface KioskUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role?: string;
  // 🔥 Cédula + flag Pago Móvil (para autocompletar)
  id_number?: string | null;
  id_type?: string | null;
  pago_movil_same_as_profile?: boolean;
}

export type KioskMode = 'pending' | 'authenticated' | 'anonymous';

interface KioskSessionContextValue {
  mode: KioskMode;
  user: KioskUser | null;
  displayName: string;
  displayPhone: string;
  displayEmail: string;
  userId: string | null;
  kioskToken: string | null;
  hasChosenMode: boolean;
  login: (userData: any, token: string) => void;
  continueAnonymous: () => void;
  logout: () => void;
  reset: () => void;
}

const KioskSessionContext = createContext<KioskSessionContextValue | undefined>(undefined);

export function KioskSessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<KioskMode>('pending');
  const [user, setUser] = useState<KioskUser | null>(null);
  const [kioskToken, setKioskToken] = useState<string | null>(null);

  const login = useCallback((userData: any, token: string) => {
    console.log('🔍 [KioskSession.login] userData FULL:', JSON.stringify(userData, null, 2));
    console.log('🔍 [KioskSession.login] userData?.user:', userData?.user);
    console.log('🔍 [KioskSession.login] userData?.user?.id_number:', userData?.user?.id_number);
    console.log('🔍 [KioskSession.login] userData?.id_number:', userData?.id_number);
    const raw = userData?.user || userData || {};
    console.log('🔍 [KioskSession.login] raw final:', raw);
    console.log('🔍 [KioskSession.login] raw.id_number:', raw.id_number);
    console.log('🔍 [KioskSession.login] raw.pago_movil_same_as_profile:', raw.pago_movil_same_as_profile);
    const realId =
      raw.id || raw._id || raw.userId || raw.sub || userData?.id || userData?.userId;

    if (!realId) {
      console.error('[KioskSession] Login sin ID de usuario:', userData);
      return;
    }

    const normalized: KioskUser = {
      id: String(realId),
      name:
        raw.name ||
        raw.fullName ||
        raw.firstName ||
        userData?.name ||
        'Cliente',
      email: raw.email || userData?.email || '',
      phone:
        raw.phone ||
        raw.phoneNumber ||
        raw.telefono ||
        raw.celular ||
        userData?.phone ||
        '',
      address:
        raw.address ||
        raw.shippingAddress ||
        raw.direccion ||
        raw.shipping_address ||
        '',
      avatar: raw.avatarUrl || raw.avatar || raw.image || undefined,
      role: (raw.role || userData?.role || '').toLowerCase(),
      // 🔥 Cédula + flag Pago Móvil
      id_number: raw.id_number ?? userData?.id_number ?? null,
      id_type: raw.id_type ?? userData?.id_type ?? null,
      pago_movil_same_as_profile: Boolean(
        raw.pago_movil_same_as_profile ?? userData?.pago_movil_same_as_profile,
      ),
    };

    // 🔥 Guardar en claves propias del KIOSCO. NO tocar `token`/`user` del admin.
    if (token) {
      try {
        localStorage.setItem('kiosk_token', token);
        localStorage.setItem('kiosk_user', JSON.stringify(normalized));
      } catch {}
    }

    setUser(normalized);
    setKioskToken(token || null);
    setMode('authenticated');
    console.log('✅ [KioskSession] Login OK (kiosk_token guardado):', normalized);
  }, []);

  const continueAnonymous = useCallback(() => {
    setUser(null);
    setKioskToken(null);
    setMode('anonymous');
    console.log('✅ [KioskSession] Modo anónimo activado');
  }, []);

  const logout = useCallback(() => {
    try {
      // 🔥 Solo borrar claves del kiosco. NO tocar `token`/`access_token`/`user`.
      localStorage.removeItem('kiosk_token');
      localStorage.removeItem('kiosk_user');
    } catch {}
    setUser(null);
    setKioskToken(null);
    setMode('pending');
    console.log('🚪 [KioskSession] Logout del kiosco (sesión admin intacta)');
  }, []);

  const reset = useCallback(() => {
    logout();
  }, [logout]);

  const value = useMemo<KioskSessionContextValue>(() => {
    const isAuthenticated = mode === 'authenticated' && user;
    return {
      mode,
      user,
      displayName: isAuthenticated ? user.name : 'Cliente Kiosko / Autopago',
      displayPhone: isAuthenticated ? (user.phone || '') : '',
      displayEmail: isAuthenticated ? (user.email || '') : '',
      userId: isAuthenticated ? user.id : null,
      kioskToken: isAuthenticated ? kioskToken : null,
      hasChosenMode: mode !== 'pending',
      login,
      continueAnonymous,
      logout,
      reset,
    };
  }, [mode, user, kioskToken, login, continueAnonymous, logout, reset]);

  return (
    <KioskSessionContext.Provider value={value}>
      {children}
    </KioskSessionContext.Provider>
  );
}

export function useKioskSession(): KioskSessionContextValue {
  const ctx = useContext(KioskSessionContext);
  if (!ctx) {
    throw new Error('useKioskSession debe usarse dentro de <KioskSessionProvider>');
  }
  return ctx;
}
