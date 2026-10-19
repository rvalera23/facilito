import { useState, useEffect, useCallback } from 'react';

interface UseSecurityPinProps {
  tenantId?: string;
  onUpdate?: (data: any) => void;
}

export const useSecurityPin = ({ tenantId, onUpdate }: UseSecurityPinProps) => {
  const [pin, setPin] = useState<string>('');
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [tempPin, setTempPin] = useState<string>('');
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // 🔥 OBTENER EL PIN ACTUAL
  const fetchPin = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      // ✅ CORREGIDO: usar "tenants" (plural) sin "/api"
      const response = await fetch(`${API_BASE}/tenants/${tenantId}/security-pin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasPin(data.hasPin || false);
        setPin(data.pin || '');
      }
    } catch (error) {
      console.error('Error al obtener el PIN:', error);
      setError('Error al cargar la configuración del PIN');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, API_BASE]);

  // 🔥 GUARDAR PIN
  const savePin = useCallback(async (newPin: string) => {
    if (!tenantId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      // ✅ CORREGIDO: usar "tenants" (plural) sin "/api"
      const response = await fetch(`${API_BASE}/tenants/${tenantId}/security-pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: newPin }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasPin(true);
        setPin(newPin);
        if (onUpdate) onUpdate({ pin: newPin, hasPin: true });
        setShowPinModal(false);
        setTempPin('');
        setPinConfirm('');
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al guardar el PIN');
        return false;
      }
    } catch (error) {
      console.error('Error al guardar el PIN:', error);
      setError('Error al guardar el PIN');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, API_BASE, onUpdate]);

  // 🔥 ELIMINAR PIN
  const deletePin = useCallback(async () => {
    if (!tenantId) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      // ✅ CORREGIDO: usar "tenants" (plural) sin "/api"
      const response = await fetch(`${API_BASE}/tenants/${tenantId}/security-pin`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setHasPin(false);
        setPin('');
        if (onUpdate) onUpdate({ pin: '', hasPin: false });
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al eliminar el PIN');
        return false;
      }
    } catch (error) {
      console.error('Error al eliminar el PIN:', error);
      setError('Error al eliminar el PIN');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, API_BASE, onUpdate]);

  // 🔥 VERIFICAR PIN
  const verifyPin = useCallback(async (pinToVerify: string): Promise<boolean> => {
    if (!tenantId || !pinToVerify) return false;
    
    try {
      const token = localStorage.getItem('token');
      // ✅ CORREGIDO: usar "tenants" (plural) sin "/api"
      const response = await fetch(`${API_BASE}/tenants/${tenantId}/security-pin/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinToVerify }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.valid || false;
      }
      return false;
    } catch (error) {
      console.error('Error al verificar el PIN:', error);
      return false;
    }
  }, [tenantId, API_BASE]);

  // 🔥 VALIDAR PIN (4-6 dígitos)
  const validatePin = useCallback((pinToValidate: string): boolean => {
    return /^\d{4,6}$/.test(pinToValidate);
  }, []);

  // 🔥 ABRIR MODAL PARA CONFIGURAR PIN
  const openPinModal = useCallback(() => {
    setTempPin('');
    setPinConfirm('');
    setIsSettingPin(!hasPin);
    setShowPinModal(true);
  }, [hasPin]);

  // 🔥 CERRAR MODAL
  const closePinModal = useCallback(() => {
    setShowPinModal(false);
    setTempPin('');
    setPinConfirm('');
    setError(null);
  }, []);

  // Cargar PIN al montar
  useEffect(() => {
    fetchPin();
  }, [fetchPin]);

  return {
    // Estado
    pin,
    hasPin,
    isLoading,
    error,
    showPinModal,
    tempPin,
    pinConfirm,
    isSettingPin,
    
    // Acciones
    setTempPin,
    setPinConfirm,
    fetchPin,
    savePin,
    deletePin,
    verifyPin,
    validatePin,
    openPinModal,
    closePinModal,
  };
};