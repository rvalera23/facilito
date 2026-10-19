// ==========================================
// ARCHIVO ACTUALIZADO: hooks/useKioskoStore.ts
// ==========================================
'use client';

import { useMemo, useState, useEffect } from 'react';

export function useKioskoStore(tenant: any) {
  const [mounted, setMounted] = useState(false);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loadingTerminals, setLoadingTerminals] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tenantId = tenant?.id || tenant?._id || tenant?.slug;

  // Consultar el estado real de los terminales de este tenant al backend público
  useEffect(() => {
    if (!tenantId) return;

    const fetchPublicTerminals = async () => {
      try {
        setLoadingTerminals(true);
        // Usar la misma lógica de URL base que el resto de la app o la variable de entorno
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        
        const res = await fetch(`${apiBase}/terminals/tenant/${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setTerminals(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('❌ [KioskoStore] Error al verificar terminales públicos:', err);
      } finally {
        setLoadingTerminals(false);
      }
    };

    fetchPublicTerminals();
  }, [tenantId]);

  return useMemo(() => {
    if (!mounted || typeof window === 'undefined' || !tenant) {
      return {
        isKioskEnabled: false,
        isOwnerOfThisStore: false,
        currentUser: null,
        canShowKioskButton: false,
        activeTerminalToken: null
      };
    }

    // 1. Obtener usuario actual del localStorage
    const userString = localStorage.getItem('user');
    let currentUser = null;
    try {
      currentUser = userString ? JSON.parse(userString) : null;
    } catch (e) {
      console.error('❌ [KioskoStore] Error al parsear el usuario:', e);
    }

    const currentUserEmail = (currentUser?.email || currentUser?.correo || '').trim().toLowerCase();
    const tenantOwnerEmail = (tenant?.email || '').trim().toLowerCase();

    const userTenantId = currentUser?.tenantId || currentUser?.tenant_id || currentUser?.tenant?.id;

    // 2. Validación de Propiedad
    const isOwnerByEmail = Boolean(currentUserEmail && tenantOwnerEmail && currentUserEmail === tenantOwnerEmail);
    const isOwnerById = Boolean(userTenantId && tenantId && String(userTenantId) === String(tenantId));
    const isOwnerOfThisStore = Boolean(currentUser && (isOwnerByEmail || isOwnerById));

    // 3. Validación basada estrictamente en terminales activos (Buscando el primero activo o el que no esté desactivado)
    const activeTerminal = terminals.find(
      (t) => t.isActive !== false && t.is_active !== false
    ) || (terminals.length > 0 ? terminals[0] : null);

    const isKioskEnabled = Boolean(activeTerminal && (activeTerminal.isActive !== false && activeTerminal.is_active !== false));

    // 4. Mostrar botón solo si eres el dueño y el kiosco fue activado en el admin
    const canShowKioskButton = Boolean(isOwnerOfThisStore && isKioskEnabled);

    return {
      isKioskEnabled,
      isOwnerOfThisStore,
      currentUser,
      canShowKioskButton,
      activeTerminalToken: activeTerminal?.token || null
    };
  }, [tenant, tenantId, terminals, mounted]);
}