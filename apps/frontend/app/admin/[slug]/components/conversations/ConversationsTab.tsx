'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageSquare, RefreshCw, Archive } from 'lucide-react';
import { useAppRefreshContext } from '@/app/context/AppRefreshContext';
import ConversationList from './ConversationList';
import ConversationDetail from './ConversationDetail';
import { Conversation } from './types';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderFullPage } from '@/components/ui/Loader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface ConversationsTabProps {
  tenantId: string;
  tenant?: any;
  primary: string;
  secondary?: string;
  isPrimaryLight: boolean;
  textColor: string;
  cardBgClass: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg?: boolean;
  onProcessOrder?: (orderData: any) => Promise<any>;
}

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
export default function ConversationsTab(props: ConversationsTabProps) {
const { tenantId: propTenantId, onProcessOrder, tenant: fullTenant, ...styleProps } = props;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>('Admin');
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { registerComponent, unregisterComponent } = useAppRefreshContext();
  const isMounted = useRef(true);
  
  // ✅ REF PARA DATOS DEL ADMIN (cache)
  const adminDataCache = useRef<{ id: string | null; avatar: string | null; name: string } | null>(null);

  // ✅ MEMOIZAR VALORES DERIVADOS
  const tenantId = useMemo(() => {
    if (propTenantId) return propTenantId;
    try {
      const tenantStr = localStorage.getItem('tenant');
      if (tenantStr) {
        const tenant = JSON.parse(tenantStr);
        return tenant.id || tenant._id || '';
      }
    } catch (e) {}
    return '';
  }, [propTenantId]);

  const token = useMemo(() => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }, []);

  // ✅ MEMOIZAR ESTILOS - SOLO UNA VEZ
  const styleContainer = useMemo(() => ({
    backgroundColor: props.secondary || (props.isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    borderColor: props.isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    color: props.textColor
  }), [props.secondary, props.isDarkBg, props.textColor]);

  const borderColor = useMemo(() => 
    props.isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    [props.isDarkBg]
  );

  // ✅ OBTENER DATOS DEL ADMIN - UNA SOLA VEZ
  useEffect(() => {
    if (adminDataCache.current) {
      setAdminUserId(adminDataCache.current.id);
      setAdminAvatar(adminDataCache.current.avatar);
      setAdminName(adminDataCache.current.name);
      return;
    }

    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        adminDataCache.current = {
          id: user.id || user._id || user.userId || user.sub || null,
          avatar: user.avatarUrl || user.avatar || user.image || null,
          name: user.name || user.fullName || 'Admin'
        };
        setAdminUserId(adminDataCache.current.id);
        setAdminAvatar(adminDataCache.current.avatar);
        setAdminName(adminDataCache.current.name);
      }
    } catch {
      adminDataCache.current = { id: null, avatar: null, name: 'Admin' };
    }
  }, []);

  // ✅ FETCH CONVERSACIONES - MEMOIZADO
  const fetchConversations = useCallback(async () => {
    if (!tenantId) {
      setError('No se encontró el tenant');
      setLoading(false);
      return;
    }

    if (!isMounted.current) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
      if (!token) {
        setError('No autenticado');
        setLoading(false);
        return;
      }

      const url = `${API_BASE}/chat/tenant/${tenantId}/conversations`;
      console.log('[ConversationsTab] Fetching:', url);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!isMounted.current) return;

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[ConversationsTab] Error response:', errorText);
        throw new Error(`Error ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      
      if (!isMounted.current) return;
      
      setConversations(data || []);
      setError(null);
    } catch (err: any) {
      if (isMounted.current) {
        console.error('[ConversationsTab] Fetch error:', err);
        setError(err.message || 'Error al cargar');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  // ✅ HANDLERS MEMOIZADOS
  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  const handleUpdateConversation = useCallback((updated: Conversation) => {
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedConversation?.id === updated.id) {
      setSelectedConversation(updated);
    }
  }, [selectedConversation]);

  // ✅ INICIALIZACIÓN - UNA SOLA VEZ
  useEffect(() => {
    isMounted.current = true;

    if (!isInitialized) {
      fetchConversations();
      setIsInitialized(true);
    }

    const componentId = 'conversations-tab';
    registerComponent(componentId, fetchConversations);

    return () => {
      isMounted.current = false;
      unregisterComponent(componentId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ REFRESCAR CUANDO CAMBIA tenantId
  useEffect(() => {
    if (tenantId && isInitialized) {
      fetchConversations();
    }
  }, [tenantId, isInitialized, fetchConversations]);

  // ✅ CALCULAR archivados - MEMOIZADO
  const archivedCount = useMemo(() => 
    conversations.filter(c => c.status === 'archived').length,
    [conversations]
  );

  // ✅ RENDER DE CARGA
  if (loading && conversations.length === 0) {
    return (
      <LoaderFullPage
        message="Cargando conversaciones..."
        primary={props.primary}
        textColor={props.textColor}
        isDarkBg={props.isDarkBg || false}
      />
    );
  }

  // ✅ RENDER DE ERROR
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <p className={`text-sm font-bold ${props.textMainClass}`}>{error}</p>
        <button 
          onClick={fetchConversations} 
          className="px-4 py-2 rounded-xl text-xs font-bold text-white" 
          style={{ backgroundColor: props.primary }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ✅ RENDER PRINCIPAL - SIN EFECTO ZOOM-IN
  return (
    <div className={`border rounded-3xl shadow-xl w-full p-6 transition-none`} style={styleContainer}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: styleContainer.borderColor }}>
        <div>
          <h3 className="font-bold text-base" style={{ color: props.textColor }}>
            Conversaciones
          </h3>
          <p className={`text-xs ${props.textMutedClass} mt-0.5`}>
            {conversations.length} conversaciones {archivedCount > 0 && `(${archivedCount} archivadas)`}
          </p>
        </div>
        <button
          onClick={fetchConversations}
          className="p-2 rounded-xl border hover:opacity-70 transition"
          style={{ borderColor: styleContainer.borderColor, color: props.textColor }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* LAYOUT DE DOS COLUMNAS - SIN ANIMACIONES DE ENTRADA */}
      <div className="flex gap-4 mt-4">
        {/* Columna izquierda: Lista de conversaciones (35%) */}
        <div className="w-[35%] flex-shrink-0">
          <ConversationList
            conversations={conversations}
            adminUserId={adminUserId}
            onSelect={handleSelectConversation}
            onRefresh={fetchConversations}
            {...styleProps}
          />
        </div>

        {/* Columna derecha: Detalle del chat (65%) */}
        <div className="w-[65%] flex-shrink-0">
          {selectedConversation ? (
<ConversationDetail
  conversation={selectedConversation}
  fullTenant={fullTenant}
  adminUserId={adminUserId}
  adminAvatar={adminAvatar}
  adminName={adminName}
  isAdmin={true}
  onBack={handleBack}
  onUpdate={handleUpdateConversation}
  onProcessOrder={onProcessOrder}
  {...styleProps}
/>
          ) : (
            <div
              className="h-[500px] flex items-center justify-center rounded-2xl border-2 border-dashed"
              style={{
                borderColor: borderColor,
                backgroundColor: props.isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <EmptyState
                icon={<MessageSquare className="w-12 h-12" />}
                title="Selecciona una conversación"
                message="Elige un chat de la lista para ver los mensajes"
                primary={props.primary}
                textColor={props.textColor}
                borderColor={borderColor}
                cardBg="transparent"
                isDarkBg={props.isDarkBg || false}
                padding="py-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}