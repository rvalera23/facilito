'use client';

import { useState, useEffect } from 'react';

export function useTerminalManager(tenant: any, setErrorMsg: (msg: string) => void) {
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  const [creatingTerminal, setCreatingTerminal] = useState(false);
  const [newGeneratedTokenModal, setNewGeneratedTokenModal] = useState<{ name: string; token: string } | null>(null);

  useEffect(() => {
    if (tenant?.id || tenant?.slug) {
      fetchTerminals();
    }
  }, [tenant]);

  const fetchTerminals = async () => {
    try {
      setLoadingTerminals(true);
const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const identifier = tenant?.id || tenant?.slug;
      const res = await fetch(`${apiBase}/terminals/tenant/${identifier}`);
      if (res.ok) {
        const data = await res.json();
        setTerminals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar terminales:', err);
    } finally {
      setLoadingTerminals(false);
    }
  };

  const handleToggleKiosk = async () => {
    const isKioskActive = terminals.length > 0 && terminals[0].isActive !== false;
    const identifier = tenant?.id || tenant?.slug;

    if (!identifier) return;

    // Si ya está activo, lo que hacemos al dar click en el toggle es desactivarlo/revocarlo
    if (isKioskActive && terminals[0]) {
      await handleDeleteTerminal(terminals[0].id);
      return;
    }

    // Si está inactivo, lo creamos automáticamente usando el nombre de la tienda
    setCreatingTerminal(true);
    setErrorMsg('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Ajustado a la ruta POST /terminals/:tenantId que definimos en el backend
      const res = await fetch(`${apiBase}/terminals/${identifier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenant?.name || 'Kiosco Principal'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNewGeneratedTokenModal({
          name: data.name || tenant?.name || 'Kiosco',
          token: data.token || 'Token generado con éxito'
        });
        fetchTerminals();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.message || 'Error al activar el modo kiosco.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión al activar el modo kiosco.');
    } finally {
      setCreatingTerminal(false);
    }
  };

  const handleDeleteTerminal = async (terminalId: string) => {
    const identifier = tenant?.id || tenant?.slug;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Ajustado a la ruta DELETE /terminals/:tenantId/:id que definimos en el backend
      const res = await fetch(`${apiBase}/terminals/${identifier}/${terminalId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTerminals();
      } else {
        setErrorMsg('Error al desactivar el modo kiosco.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión al desactivar el modo kiosco.');
    }
  };

  return {
    terminals,
    loadingTerminals,
    creatingTerminal,
    newGeneratedTokenModal,
    setNewGeneratedTokenModal,
    handleToggleKiosk,
    handleDeleteTerminal
  };
}