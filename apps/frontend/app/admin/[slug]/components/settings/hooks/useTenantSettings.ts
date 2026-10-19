'use client';

import { useState, useEffect, useRef } from 'react';
import { useTerminalManager } from './useTerminalManager';
import { apiFetch } from '@/lib/api';
import { performLogout } from '@/lib/auth/logout';

export function useTenantSettings(
  tenant: any,
  onUpdateTenant?: (updatedData: any) => void,
  options?: { terminalManagerExternal?: ReturnType<typeof useTerminalManager> },
) {
  const [fullName, setFullName] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed?.name) return parsed.name;
        } catch (e) {}
      }
    }
    return tenant?.ownerName || tenant?.user?.name || tenant?.userName || 'Robert Valera';
  });

  const [storeName, setStoreName] = useState(tenant?.name || '');

  const getInitialSpecificConfig = () => {
    return tenant?.specificConfig || tenant?.specific_config || {};
  };

  const [specificConfig, setSpecificConfig] = useState(getInitialSpecificConfig());

  const ownerEmail = tenant?.ownerEmail || tenant?.email || 'robertvalera23@gmail.com';

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showStoreNameModal, setShowStoreNameModal] = useState(false);
  const [storeNameConfirmation, setStoreNameConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const localTerminalManager = useTerminalManager(tenant, setErrorMsg);
  const terminalManager = options?.terminalManagerExternal || localTerminalManager;
  const initialValuesRef = useRef({
    fullName,
    storeName,
    specificConfig: JSON.stringify(getInitialSpecificConfig()),
  });

  const [hasChanges, setHasChanges] = useState(false);

  // 🔥 Sincronizar con el tenant cuando cambia
  useEffect(() => {
    if (tenant) {
      const initialConfig = tenant?.specificConfig || tenant?.specific_config || {};
      setSpecificConfig(initialConfig);
      setStoreName(tenant.name || '');
      if (tenant.ownerName) {
        setFullName(tenant.ownerName);
      }

      initialValuesRef.current = {
        fullName: tenant.ownerName || fullName,
        storeName: tenant.name || '',
        specificConfig: JSON.stringify(initialConfig),
      };
    }
  }, [tenant]);

  // 🔥 DETECTAR CAMBIOS
  useEffect(() => {
    const currentConfigString = JSON.stringify(specificConfig);
    const initialConfigString = initialValuesRef.current.specificConfig;

    const isDifferent =
      fullName !== initialValuesRef.current.fullName ||
      storeName !== initialValuesRef.current.storeName ||
      currentConfigString !== initialConfigString;

    setHasChanges(isDifferent);
  }, [fullName, storeName, specificConfig]);

  // 🔥 FIX PROFESIONAL: abrir modal automáticamente cuando storeName cambia
  // (solo si es distinto del tenant.name actual, para no abrir al cargar)
  useEffect(() => {
    if (!tenant) return;
    // Si el usuario cambió el nombre y no hay modal abierto y no está guardando
    if (storeName && tenant.name && storeName !== tenant.name && !showStoreNameModal && !saving) {
      setStoreNameConfirmation('');
      setErrorMsg('');
      setShowStoreNameModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeName, tenant?.name]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    // Si el nombre cambió y el modal NO se abrió (ej. por race), abrirlo
    if (storeName !== tenant?.name && !showStoreNameModal) {
      setStoreNameConfirmation('');
      setErrorMsg('');
      setShowStoreNameModal(true);
      return;
    }

    // Si el nombre no cambió (o ya se confirmó), guardar directo
    executeSaveSettings();
  };

  const executeSaveSettings = async (onSuccessCallback?: () => void) => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updatedSpecificConfig = {
        ...specificConfig,
        paymentMethods: {
          ...(specificConfig.paymentMethods || {}),
          pagoMovilList: specificConfig?.paymentMethods?.pagoMovilList || []
        }
      };

      const payload: any = {
        name: storeName,
        ownerName: fullName,
        specificConfig: updatedSpecificConfig,
        specific_config: updatedSpecificConfig
      };

      const identifier = tenant?.slug || tenant?.id;
      const res = await apiFetch(`/tenants/${identifier}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const successText = '¡Configuración de cuenta, tienda, horarios y pago móvil actualizadas con éxito!';
        setSuccessMsg(successText);
        setShowSuccessModal(true);
        if (onSuccessCallback) onSuccessCallback();

        initialValuesRef.current = {
          fullName,
          storeName,
          specificConfig: JSON.stringify(updatedSpecificConfig),
        };
        setHasChanges(false);

        // ✅ Leer slug nuevo
        let updatedSlug = tenant?.slug;
        try {
          const updatedData = await res.clone().json();
          updatedSlug = updatedData.slug || updatedSlug;
        } catch (e) {}

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.name = fullName;
            localStorage.setItem('user', JSON.stringify(parsedUser));
            window.dispatchEvent(new Event('userChange'));
          } catch (e) {}
        }

        // ✅ Persistir tenant con slug nuevo
        if (typeof window !== 'undefined') {
          try {
            const storedTenant = JSON.parse(localStorage.getItem('tenant') || '{}');
            localStorage.setItem('tenant', JSON.stringify({
              ...storedTenant,
              ...tenant,
              name: storeName,
              slug: updatedSlug,
              ownerName: fullName,
              specificConfig: updatedSpecificConfig,
              specific_config: updatedSpecificConfig,
            }));
          } catch (e) {}
        }

        if (onUpdateTenant) {
          onUpdateTenant({
            ...tenant,
            name: storeName,
            slug: updatedSlug,
            ownerName: fullName,
            specificConfig: updatedSpecificConfig,
            specific_config: updatedSpecificConfig
          });
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setErrorMsg(errorData.message || 'Error al actualizar los datos en el servidor.');
        if (onSuccessCallback) onSuccessCallback();
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
      if (onSuccessCallback) onSuccessCallback();
    } finally {
      setSaving(false);
    }
  };

  // 🔥 FIX PROFESIONAL: confirmAndSaveStoreName NO re-valida.
  // El ConfirmDialog ya validó internamente (confirmText === requireConfirmationText).
  const confirmAndSaveStoreName = (onCloseModal: () => void) => {
    executeSaveSettings(onCloseModal);
  };

  const handleDeleteAccount = async (onDeleteTenant?: () => void, onCloseModal?: () => void) => {
    if (deleteConfirmationText !== (tenant?.name || 'eliminar')) {
      setErrorMsg('El nombre de la tienda no coincide para confirmar la eliminación.');
      return;
    }

    setDeleting(true);
    try {
      const identifier = tenant?.slug || tenant?.id;
      const res = await apiFetch(`/tenants/${identifier}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 200) {
        if (onDeleteTenant) {
          onDeleteTenant();
        } else {
          performLogout();
        }
      } else {
        setErrorMsg('Error al eliminar la tienda en el servidor.');
        setDeleting(false);
        if (onCloseModal) onCloseModal();
      }
    } catch (err) {
      setErrorMsg('Error de conexión al intentar eliminar.');
      setDeleting(false);
      if (onCloseModal) onCloseModal();
    }
  };

  return {
    fullName, setFullName,
    storeName, setStoreName,
    ownerEmail,
    terminalManager,
    specificConfig, setSpecificConfig,
    showStoreNameModal, setShowStoreNameModal,
    storeNameConfirmation, setStoreNameConfirmation,
    showDeleteModal, setShowDeleteModal,
    deleteConfirmationText, setDeleteConfirmationText,
    showSuccessModal, setShowSuccessModal,
    saving, deleting, successMsg, errorMsg, setErrorMsg,
    hasChanges,
    handleSubmitForm, confirmAndSaveStoreName, handleDeleteAccount
  };
}