'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_FORM_DATA = {
  fullName: '',
  phone: '',
  email: '',
  deliveryCity: '',
  state: '',
  municipality: '',
  latitude: null as number | null,
  longitude: null as number | null,
  addressType: 'Casa' as 'Casa' | 'Local' | 'Oficina',
  zone: '',
  street: '',
  number: '',
  reference: '',
  preferredCurrency: 'USD',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function useProfile(user: any, onUpdateUser?: (data: any) => void) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const initialValuesRef = useRef(DEFAULT_FORM_DATA);
  const isFirstRender = useRef(true);

  // 🔥 SINCRONIZAR CON EL USUARIO - Solo cuando user cambia realmente
  useEffect(() => {
    if (!user) {
      setFormData(DEFAULT_FORM_DATA);
      initialValuesRef.current = DEFAULT_FORM_DATA;
      return;
    }

    console.log('🔄 Sincronizando perfil con usuario (useEffect):', user.id);

    const parseAddress = (address: string) => {
      if (!address) {
        return { type: 'Casa' as const, zone: '', street: '', number: '', reference: '' };
      }
      const match = address.match(/^(Casa|Local|Oficina):\s*(.*?),\s*(.*?),\s*(.*?)(?:\s*-\s*Ref:\s*(.*))?$/i);
      if (match) {
        return {
          type: match[1] as 'Casa' | 'Local' | 'Oficina',
          zone: match[2]?.trim() || '',
          street: match[3]?.trim() || '',
          number: match[4]?.trim() || '',
          reference: match[5]?.trim() || '',
        };
      }
      return { type: 'Casa' as const, zone: address || '', street: '', number: '', reference: '' };
    };

    const parsed = parseAddress(user.address || '');

    const newData = {
      fullName: user.name || user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      deliveryCity: user.deliveryCity || user.city || '',
      state: user.state || '',
      municipality: user.municipality || '',
      latitude: user.latitude !== null && user.latitude !== undefined ? Number(user.latitude) : null,
      longitude: user.longitude !== null && user.longitude !== undefined ? Number(user.longitude) : null,
      addressType: parsed.type,
      zone: parsed.zone,
      street: parsed.street,
      number: parsed.number,
      reference: parsed.reference,
      preferredCurrency: user.preferredCurrency || user.preferred_currency || 'USD',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    console.log('📝 Nuevos datos del formulario (useEffect):', newData);
    setFormData(newData);
    initialValuesRef.current = newData;
    setSuccessMsg('');
    setShowSuccessModal(false);
    setErrorMsg('');
  }, [user?.id]); // 🔥 DEPENDENCIA: user.id (para evitar reseteos innecesarios)

  // 🔥 UPDATE FORM - Función estable
  const updateForm = useCallback((fields: Partial<typeof formData>) => {
    console.log('✏️ updateForm llamado con:', fields);
    setFormData(prev => {
      const newData = { ...prev, ...fields };
      console.log('📝 Nuevo estado después de updateForm:', newData);
      return newData;
    });
  }, []);

  // 🔥 Detectar cambios - Recalculado cada vez que formData cambia
  const hasChanges = (() => {
    const current = formData;
    const initial = initialValuesRef.current;
    const hasChange = 
      current.fullName !== initial.fullName ||
      current.phone !== initial.phone ||
      current.deliveryCity !== initial.deliveryCity ||
      current.state !== initial.state ||
      current.municipality !== initial.municipality ||
      current.latitude !== initial.latitude ||
      current.longitude !== initial.longitude ||
      current.addressType !== initial.addressType ||
      current.zone !== initial.zone ||
      current.street !== initial.street ||
      current.number !== initial.number ||
      current.reference !== initial.reference ||
      current.preferredCurrency !== initial.preferredCurrency ||
      current.currentPassword !== '' ||
      current.newPassword !== '' ||
      current.confirmPassword !== '';
    
    if (hasChange) {
      console.log('🔴 Hay cambios detectados:', { current, initial });
    }
    return hasChange;
  })();

  const saveProfile = async () => {
    if (!hasChanges) {
      setErrorMsg('No hay cambios para guardar.');
      return false;
    }

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    // Validaciones de contraseña
    if (formData.newPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        setErrorMsg('Debes ingresar tu contraseña actual para establecer una nueva.');
        setSaving(false);
        return false;
      }
      if (formData.newPassword === formData.currentPassword) {
        setErrorMsg('La nueva contraseña no puede ser igual a la contraseña actual.');
        setSaving(false);
        return false;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMsg('Las nuevas contraseñas no coinciden.');
        setSaving(false);
        return false;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
        setSaving(false);
        return false;
      }
    }

    try {
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
      const token = localStorage.getItem('token') || '';

      const fullAddress = `${formData.addressType}: ${formData.zone || formData.municipality || formData.deliveryCity}, ${formData.street || 'Dirección'}, ${formData.number || 'N/A'}${formData.reference ? ` - Ref: ${formData.reference}` : ''}`;

      const payload: any = {
        name: formData.fullName,
        phone: formData.phone,
        city: formData.deliveryCity,
        address: fullAddress,
        deliveryCity: formData.deliveryCity,
        state: formData.state,
        municipality: formData.municipality,
        preferredCurrency: formData.preferredCurrency,
        latitude: formData.latitude !== null ? Number(formData.latitude) : null,
        longitude: formData.longitude !== null ? Number(formData.longitude) : null,
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      console.log('📤 Enviando payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${apiBase}/api/account/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      console.log('📥 Respuesta del servidor:', responseText);

      if (res.ok) {
        let updatedUser;
        try {
          updatedUser = JSON.parse(responseText);
        } catch {
          updatedUser = { message: responseText };
        }

        const successText = '¡Tus datos personales y de ubicación se han actualizado con éxito!';
        setSuccessMsg(successText);
        setShowSuccessModal(true);

        const newInitial = { ...formData, currentPassword: '', newPassword: '', confirmPassword: '' };
        initialValuesRef.current = newInitial;

        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }

        // Actualizar localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.name = formData.fullName;
            parsed.phone = formData.phone;
            parsed.city = formData.deliveryCity;
            parsed.deliveryCity = formData.deliveryCity;
            parsed.state = formData.state;
            parsed.municipality = formData.municipality;
            parsed.latitude = formData.latitude;
            parsed.longitude = formData.longitude;
            parsed.preferredCurrency = formData.preferredCurrency;
            parsed.address = fullAddress;
            localStorage.setItem('user', JSON.stringify(parsed));
          } catch (err) {}
        }

        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        setSaving(false);
        return true;
      } else {
        console.error('❌ Error del backend:', responseText);
        setErrorMsg(responseText || 'Error al actualizar los datos en el servidor.');
        setSaving(false);
        return false;
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
      setErrorMsg('Error de conexión con el servidor.');
      setSaving(false);
      return false;
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmationText !== (user?.email || 'eliminar')) {
      setErrorMsg('El correo electrónico no coincide para confirmar la eliminación.');
      return false;
    }

    setDeleting(true);
    try {
      const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : 'http://localhost:3000';
      const token = localStorage.getItem('token') || '';

      const res = await fetch(`${apiBase}/api/account/profile`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (res.ok || res.status === 200) {
        return true;
      } else {
        setErrorMsg('Error al eliminar la cuenta en el servidor.');
        setDeleting(false);
        setShowDeleteModal(false);
        return false;
      }
    } catch (err) {
      setErrorMsg('Error de conexión al intentar eliminar la cuenta.');
      setDeleting(false);
      return false;
    }
  };

  return {
    formData,
    updateForm,
    saveProfile,
    deleteAccount,
    hasChanges,
    loading,
    saving,
    deleting,
    successMsg,
    errorMsg,
    showSuccessModal,
    setShowSuccessModal,
    showDeleteModal,
    setShowDeleteModal,
    deleteConfirmationText,
    setDeleteConfirmationText,
  };
}