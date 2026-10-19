// frontend/app/admin/[slug]/hooks/useProfessionals.ts

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Professional {
  id: string;
  tenantId: string;
  userId?: string | null;
  name: string;
  description?: string | null;
  specialties?: string[];
  serviceIds?: string[];
  schedule?: Record<string, any>;
  breaks?: any[];
  rating?: number;
  reviewsCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateProfessionalDto {
  name: string;
  description?: string;
  specialties?: string[];
  serviceIds?: string[];
  schedule?: Record<string, any>;
  breaks?: any[];
  status?: 'active' | 'inactive';
}

interface UpdateProfessionalDto extends Partial<CreateProfessionalDto> {
  id: string;
}


interface CreateWithUserDto {
  name: string;
  email: string;
  phone?: string | null;
  password?: string | null;
  description?: string;
  specialties?: string[];
  serviceIds?: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function useProfessionals(tenantId?: string) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // 🔍 FETCH PROFESSIONALS
  // ============================================
  const fetchProfessionals = useCallback(async () => {
    console.log('🔍 [fetchProfessionals] Iniciando...', { tenantId });

    if (!tenantId) {
      console.warn('⚠️ [fetchProfessionals] No hay tenantId, limpiando profesionales');
      setProfessionals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token') || '';
      const url = `${API_BASE}/professionals/tenant/${tenantId}`;
      console.log('📡 [fetchProfessionals] GET →', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [fetchProfessionals] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [fetchProfessionals] Datos recibidos:', data.length, 'profesionales');
      setProfessionals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ [fetchProfessionals] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar profesionales');
      setProfessionals([]);
    } finally {
      setLoading(false);
      console.log('🏁 [fetchProfessionals] Finalizado');
    }
  }, [tenantId]);

  // ============================================
  // ➕ CREATE PROFESSIONAL
  // ============================================
  const createProfessional = useCallback(async (data: CreateProfessionalDto) => {
    console.log('➕ [createProfessional] Iniciando...', { data, tenantId });

    if (!tenantId) {
      console.error('❌ [createProfessional] No hay tenantId');
      throw new Error('No hay tenant ID disponible');
    }

    try {
      const token = localStorage.getItem('token') || '';
      const payload = {
        ...data,
        tenantId,
      };
      
      console.log('📡 [createProfessional] POST →', `${API_BASE}/professionals`);
      console.log('📦 [createProfessional] Payload:', payload);

      const response = await fetch(`${API_BASE}/professionals`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 [createProfessional] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [createProfessional] Error response:', errorData);
        throw new Error(errorData.message || 'Error al crear profesional');
      }

      const newProfessional = await response.json();
      console.log('✅ [createProfessional] Creado:', newProfessional);
      
      setProfessionals(prev => {
        console.log('🔄 [createProfessional] Actualizando lista de profesionales');
        return [newProfessional, ...prev];
      });
      
      return newProfessional;
    } catch (err) {
      console.error('❌ [createProfessional] Error:', err);
      throw err;
    }
  }, [tenantId]);


  // ============================================
  // ➕ CREATE PROFESSIONAL WITH USER (con login)
  // ============================================
  const createWithUser = useCallback(async (data: CreateWithUserDto) => {
    console.log('➕ [createWithUser] Iniciando...', { data, tenantId });

    if (!tenantId) {
      console.error('❌ [createWithUser] No hay tenantId');
      throw new Error('No hay tenant ID disponible');
    }

    if (!data.name?.trim()) {
      throw new Error('El nombre es obligatorio');
    }
    if (!data.email?.trim()) {
      throw new Error('El email es obligatorio');
    }

    try {
      const token = localStorage.getItem('token') || '';
      const payload = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        password: data.password?.trim() || null,
        tenantId,
        description: data.description?.trim() || null,
        specialties: data.specialties || [],
        serviceIds: data.serviceIds || [],
      };

      console.log('📡 [createWithUser] POST →', `${API_BASE}/professionals/create-with-user`);
      console.log('📦 [createWithUser] Payload:', payload);

      const response = await fetch(`${API_BASE}/professionals/create-with-user`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 [createWithUser] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [createWithUser] Error response:', errorData);
        throw new Error(errorData.message || 'Error al crear profesional con acceso');
      }

      const newProfessional = await response.json();
      console.log('✅ [createWithUser] Creado:', newProfessional);

      setProfessionals(prev => [newProfessional, ...prev]);

      return newProfessional;
    } catch (err) {
      console.error('❌ [createWithUser] Error:', err);
      throw err;
    }
  }, [tenantId]);


  // ============================================
  // ✏️ UPDATE PROFESSIONAL
  // ============================================
  const updateProfessional = useCallback(async (data: UpdateProfessionalDto) => {
    console.log('✏️ [updateProfessional] Iniciando...', { data, tenantId });

    if (!tenantId) {
      console.error('❌ [updateProfessional] No hay tenantId');
      throw new Error('No hay tenant ID disponible');
    }

    try {
      const token = localStorage.getItem('token') || '';
      
      // ✅ Asegurar que tenantId esté en el payload
      const payload = {
        ...data,
        tenantId,
      };
      
      const url = `${API_BASE}/professionals/${data.id}`;
      console.log('📡 [updateProfessional] PUT →', url);
      console.log('📦 [updateProfessional] Payload:', payload);

      const response = await fetch(url, {
        method: 'PUT',  // ✅ Cambiado de PATCH a PUT
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 [updateProfessional] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [updateProfessional] Error response:', errorData);
        throw new Error(errorData.message || `Error al actualizar profesional: ${response.status}`);
      }

      const updated = await response.json();
      console.log('✅ [updateProfessional] Actualizado:', updated);
      
      setProfessionals(prev => {
        console.log('🔄 [updateProfessional] Actualizando lista de profesionales');
        return prev.map(p => p.id === data.id ? updated : p);
      });
      
      return updated;
    } catch (err) {
      console.error('❌ [updateProfessional] Error:', err);
      throw err;
    }
  }, [tenantId]);

  // ============================================
  // 🗑️ DELETE PROFESSIONAL
  // ============================================
  const deleteProfessional = useCallback(async (id: string) => {
    console.log('🗑️ [deleteProfessional] Iniciando...', { id, tenantId });

    if (!tenantId) {
      console.error('❌ [deleteProfessional] No hay tenantId');
      throw new Error('No hay tenant ID disponible');
    }

    try {
      const token = localStorage.getItem('token') || '';
      const url = `${API_BASE}/professionals/${id}/${tenantId}`;
      console.log('📡 [deleteProfessional] DELETE →', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      console.log('📡 [deleteProfessional] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [deleteProfessional] Error response:', errorData);
        throw new Error(errorData.message || 'Error al eliminar profesional');
      }

      console.log('✅ [deleteProfessional] Eliminado:', id);
      setProfessionals(prev => {
        console.log('🔄 [deleteProfessional] Actualizando lista de profesionales');
        return prev.filter(p => p.id !== id);
      });
    } catch (err) {
      console.error('❌ [deleteProfessional] Error:', err);
      throw err;
    }
  }, [tenantId]);

  // ============================================
  // 🔄 EFECTO PARA CARGAR PROFESIONALES
  // ============================================
  useEffect(() => {
    console.log('🔄 [useEffect] Ejecutando fetchProfessionals');
    fetchProfessionals();
  }, [fetchProfessionals]);

  // ============================================
  // 📦 RETORNO
  // ============================================
  console.log('📦 [useProfessionals] Estado actual:', {
    professionalsCount: professionals.length,
    loading,
    error,
    tenantId,
  });

  return {
    professionals,
    loading,
    error,
    fetchProfessionals,
    createProfessional,
    createWithUser,
    updateProfessional,
    deleteProfessional,
  };
}