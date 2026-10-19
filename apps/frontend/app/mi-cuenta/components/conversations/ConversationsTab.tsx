// frontend/app/mi-cuenta/components/conversations/ConversationsTab.tsx

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  ChevronRight, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  Eye,
  Package,
  Archive,
  Inbox
} from 'lucide-react';
import ConversationDetail from './ConversationDetail';
import { Conversation, FilterType } from './types';
import { getFullAvatarUrl, getInitials, formatDate } from './utils/conversationUtils';
import { useToast } from '@/components/ui/useToast';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoaderFullPage } from '@/components/ui/Loader';
interface ConversationsTabProps {
  userId: string;
  primary: string;
  secondary?: string;
  isPrimaryLight: boolean;
  textColor: string;
  cardBgClass: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg?: boolean;
  tenantId?: string;
  onProcessOrder?: (orderData: any) => Promise<any>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function ConversationsTab({
  userId: propUserId,
  primary,
  secondary,
  isPrimaryLight,
  textColor,
  cardBgClass,
  textMainClass,
  textMutedClass,
  isDarkBg = false,
  tenantId: propTenantId,
  onProcessOrder,
}: ConversationsTabProps) {
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Tú');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');

  const borderDynamic = isDarkBg ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const containerStyle = { 
    backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'),
    borderColor: borderDynamic, 
    color: textColor 
  };

  const inputStyle = { 
    borderColor: borderDynamic, 
    color: textColor,
    backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };

  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          id: user.id || user._id || user.userId || user.sub || '',
          avatar: user.avatarUrl || user.avatar || user.image || null,
          name: user.name || user.fullName || 'Usuario'
        };
      }
    } catch (e) {}
    return { id: propUserId || '', avatar: null, name: 'Usuario' };
  };

  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  };

  const applyFilters = (convs: Conversation[]) => {
    let filtered = convs;

    if (filterType === 'unread') {
      filtered = filtered.filter(c => 
        c.messages.some(m => m.sender?.id !== currentUserId && !m.read)
      );
    } else if (filterType === 'read') {
      filtered = filtered.filter(c => 
        !c.messages.some(m => m.sender?.id !== currentUserId && !m.read)
      );
    } else if (filterType === 'archived') {
      filtered = filtered.filter(c => c.status === 'archived');
    } else if (filterType === 'completed') {
      filtered = filtered.filter(c => c.status === 'completed');
    }

    if (selectedTenantFilter !== 'all') {
      filtered = filtered.filter(c => c.tenant?.id === selectedTenantFilter);
    }

    if (propTenantId) {
      filtered = filtered.filter(c => c.tenant?.id === propTenantId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.tenant?.name?.toLowerCase().includes(query) ||
        c.product?.name?.toLowerCase().includes(query) ||
        c.messages.some(m => m.content.toLowerCase().includes(query)) ||
        c.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // REPORTAR PAGO
  const handleReportPayment = async (conversationId: string, paymentData: any) => {
    try {
      const token = getToken();
      
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv || !conv.product) {
        console.error('No se encontró producto en la conversación');
        return;
      }

      const orderPayload = {
        tenantId: conv.tenant.id,
        userId: currentUserId,
        customerName: conv.buyer?.name || 'Cliente',
        customerPhone: conv.buyer?.phone || '',
        customerEmail: conv.buyer?.email || '',
        items: [{
          productId: conv.product.id,
          name: conv.product.name,
          quantity: 1,
          priceUsd: conv.product.price || 0
        }],
        totalUsd: conv.product.price || 0,
        paymentMethod: paymentData.method || 'pago_movil',
        bankSource: paymentData.bankSource || paymentData.bank,
        paymentReference: paymentData.paymentReference || paymentData.reference,
        paymentAmount: paymentData.amount,
        paymentDate: paymentData.date,
        paymentNotes: paymentData.notes,
        status: 'por_verificar'
      };

      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        showToast({
          variant: 'success',
          message: 'Pago reportado correctamente',
        });
        const updated = { ...conv, status: 'completed' };
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? updated : c)
        );
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(updated);
        }
      } else {
        const errorData = await response.json();
        console.error('Error al reportar pago:', errorData);
        showToast({
          variant: 'error',
          message: 'Error al reportar el pago',
        });
      }
    } catch (error) {
      console.error('Error al reportar pago:', error);
      showToast({
        variant: 'error',
        message: 'Error al reportar el pago',
      });
    }
  };

  // Cargar conversaciones
  useEffect(() => {
    const user = getCurrentUser();
    const userId = user.id || propUserId;
    setCurrentUserId(userId);
    setCurrentUserAvatar(user.avatar);
    setCurrentUserName(user.name || 'Tú');

    if (!userId) {
      setError('No se pudo identificar al usuario');
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = getToken();
        if (!token) {
          setError('No estás autenticado.');
          setLoading(false);
          return;
        }

        let url = `${API_BASE}/chat/user/${userId}/conversations`;
        if (propTenantId) {
          url += `?tenantId=${propTenantId}`;
        }
        
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          setError(`Error ${res.status}: ${errorText}`);
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        console.log('📥 Conversaciones:', data?.length || 0);
        
        setConversations(data || []);
        setFilteredConversations(applyFilters(data || []));
      } catch (error) {
        console.error('❌ Error:', error);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [propUserId, propTenantId]);

  useEffect(() => {
    setFilteredConversations(applyFilters(conversations));
  }, [conversations, searchQuery, filterType, selectedTenantFilter, currentUserId, propTenantId]);

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await loadConversationMessages(conversation.id);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleUpdateConversation = (updated: Conversation) => {
    setConversations(prev =>
      prev.map(c => c.id === updated.id ? updated : c)
    );
    if (selectedConversation?.id === updated.id) {
      setSelectedConversation(updated);
    }
  };

  const uniqueTenants = useMemo(() => {
    const tenants = conversations
      .map(c => c.tenant)
      .filter(t => t && t.name)
      .map(t => ({ id: t.id, name: t.name, slug: t.slug }));
    
    const unique = new Map();
    tenants.forEach(t => unique.set(t.id, t));
    return Array.from(unique.values());
  }, [conversations]);

  // Separar conversaciones activas y archivadas
  const activeConversations = filteredConversations.filter(c => c.status !== 'archived');
  const archivedConversations = filteredConversations.filter(c => c.status === 'archived');

  // ============================================================
  // VISTA DE CARGA
  // ============================================================
  if (loading && conversations.length === 0) {
    return (
      <LoaderFullPage
        message="Cargando conversaciones..."
        primary={primary}
        textColor={textColor}
        isDarkBg={isDarkBg}
      />
    );
  }

  // ============================================================
  // VISTA DE ERROR
  // ============================================================
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}20`, color: primary }}>
          <MessageSquare className="w-8 h-8" />
        </div>
        <p className={`text-sm font-bold ${textMainClass}`}>Error al cargar conversaciones</p>
        <p className={`text-xs ${textMutedClass} max-w-sm`}>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: primary }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ============================================================
  // 🔥 LAYOUT RESPONSIVE (UNA COLUMNA EN MÓVIL, DOS EN DESKTOP)
  // ============================================================
  return (
<div className={`border rounded-3xl shadow-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-6`} style={containerStyle}>
        {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b gap-3" style={{ borderColor: borderDynamic }}>
        <div>
          <h3 className="font-bold text-base tracking-tight" style={{ color: textColor }}>
            Mis Conversaciones ({filteredConversations.length})
          </h3>
          <p className={`text-xs ${textMutedClass} mt-0.5 hidden sm:block`}>
            Comunícate con las tiendas y coordina detalles de tus pedidos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm" style={{ borderColor: borderDynamic, color: textColor }}>
            <MessageSquare className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filtros - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: textColor }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tienda, producto o mensaje..."
            className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none transition bg-transparent"
            style={inputStyle}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="px-3 py-2.5 rounded-xl border text-xs flex items-center gap-1.5 transition hover:opacity-80"
              style={{ borderColor: borderDynamic, color: textColor }}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">
                {filterType === 'all' && 'Todos'}
                {filterType === 'unread' && 'No leídos'}
                {filterType === 'read' && 'Leídos'}
                {filterType === 'archived' && 'Archivados'}
                {filterType === 'completed' && 'Completados'}
              </span>
              <span className="xs:hidden">
                {filterType === 'all' && 'Filtrar'}
                {filterType === 'unread' && 'No leídos'}
                {filterType === 'read' && 'Leídos'}
                {filterType === 'archived' && 'Archivados'}
                {filterType === 'completed' && 'Completados'}
              </span>
            </button>
            
            {isFilterDropdownOpen && (
              <div 
                className="absolute right-0 top-full mt-1 rounded-xl border shadow-2xl py-1 min-w-[140px] z-50"
                style={{ 
                  backgroundColor: secondary || (isDarkBg ? '#1e293b' : '#ffffff'),
                  borderColor: borderDynamic 
                }}
              >
                {['all', 'unread', 'read', 'archived', 'completed'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFilterType(type as FilterType);
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-xs text-left transition hover:opacity-80 ${filterType === type ? 'font-bold' : ''}`}
                    style={{ color: filterType === type ? primary : textColor }}
                  >
                    {type === 'all' && 'Todos'}
                    {type === 'unread' && 'No leídos'}
                    {type === 'read' && 'Leídos'}
                    {type === 'archived' && 'Archivados'}
                    {type === 'completed' && 'Completados'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {uniqueTenants.length > 0 && (
            <select
              value={selectedTenantFilter}
              onChange={(e) => setSelectedTenantFilter(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-xs outline-none transition bg-transparent flex-1 sm:flex-none max-w-[120px] sm:max-w-[160px]"
              style={inputStyle}
            >
              <option value="all">Todas</option>
              {uniqueTenants.map(t => (
                <option key={t.id} value={t.id} style={{ backgroundColor: isDarkBg ? '#1e293b' : '#ffffff' }}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-2.5 rounded-xl border transition hover:opacity-70"
            style={{ borderColor: borderDynamic, color: textColor }}
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🔥 LAYOUT RESPONSIVE: Una columna en móvil, dos en desktop */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Columna izquierda: Lista de conversaciones (100% en móvil, 40% en desktop) */}
        <div className="w-full lg:w-[40%] lg:flex-shrink-0">
          {filteredConversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-12 h-12" />}
              message={
                searchQuery || filterType !== 'all'
                  ? 'No se encontraron conversaciones con estos filtros.'
                  : 'Aún no tienes conversaciones. Chatea con las tiendas para empezar.'
              }
              primary={primary}
              textColor={textColor}
              borderColor={borderDynamic}
              cardBg={containerStyle.backgroundColor as string}
              isDarkBg={isDarkBg}
            />
          ) : (
            <div className="space-y-4 max-h-[600px] lg:max-h-[600px] overflow-y-auto pr-2">
              {/* SECCIÓN: ACTIVAS - Sin fondo oscuro */}
              {activeConversations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 opacity-50 flex-shrink-0" style={{ color: textColor }} />
                      <span 
                        className="text-[10px] sm:text-[9px] font-medium uppercase tracking-wider opacity-50" 
                        style={{ color: textColor }}
                      >
                        Activas
                      </span>
                    </div>
                    <span 
                      className="text-[10px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full opacity-40"
                      style={{ 
                        color: textColor,
                        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      {activeConversations.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {activeConversations.map((conv) => (
                      <ConversationCard
                        key={conv.id}
                        conversation={conv}
                        currentUserId={currentUserId}
                        primary={primary}
                        textColor={textColor}
                        textMainClass={textMainClass}
                        textMutedClass={textMutedClass}
                        isDarkBg={isDarkBg}
                        borderDynamic={borderDynamic}
                        onSelect={handleSelectConversation}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SECCIÓN: ARCHIVADAS - Sin fondo oscuro */}
              {archivedConversations.length > 0 && (
                <div className="pt-3 sm:pt-4 border-t" style={{ borderColor: borderDynamic }}>
                  <div className="flex items-center gap-2 mb-2 px-1 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 opacity-50 flex-shrink-0" style={{ color: textColor }} />
                      <span 
                        className="text-[10px] sm:text-[9px] font-medium uppercase tracking-wider opacity-50" 
                        style={{ color: textColor }}
                      >
                        Archivadas
                      </span>
                    </div>
                    <span 
                      className="text-[10px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full opacity-40"
                      style={{ 
                        color: textColor,
                        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      {archivedConversations.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {archivedConversations.map((conv) => (
                      <ConversationCard
                        key={conv.id}
                        conversation={conv}
                        currentUserId={currentUserId}
                        primary={primary}
                        textColor={textColor}
                        textMainClass={textMainClass}
                        textMutedClass={textMutedClass}
                        isDarkBg={isDarkBg}
                        borderDynamic={borderDynamic}
                        onSelect={handleSelectConversation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: Detalle del chat (100% en móvil, 60% en desktop) */}
        <div className="w-full lg:w-[60%] lg:flex-shrink-0">
          {selectedConversation ? (
            <div className="border rounded-2xl overflow-hidden" style={{ borderColor: borderDynamic }}>
              <ConversationDetail
                conversation={selectedConversation}
                adminUserId={currentUserId}
                adminAvatar={currentUserAvatar}
                adminName={currentUserName}
                onBack={handleBackToList}
                onUpdate={handleUpdateConversation}
                onProcessOrder={onProcessOrder}
                onReportPayment={handleReportPayment}
                primary={primary}
                textColor={textColor}
                textMainClass={textMainClass}
                textMutedClass={textMutedClass}
                isDarkBg={isDarkBg}
                isPrimaryLight={isPrimaryLight}
                secondary={secondary}
                isAdmin={false}
              />
            </div>
          ) : (
            // Estado vacío cuando no hay conversación seleccionada
            <div
              className="h-[300px] sm:h-[400px] lg:h-[500px] flex items-center justify-center rounded-2xl border-2 border-dashed"
              style={{
                borderColor: borderDynamic,
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <EmptyState
                icon={<MessageSquare className="w-10 h-10 sm:w-12 sm:h-12" />}
                title="Selecciona una conversación"
                message="Elige un chat de la lista para ver los mensajes"
                primary={primary}
                textColor={textColor}
                borderColor={borderDynamic}
                cardBg={containerStyle.backgroundColor as string}
                isDarkBg={isDarkBg}
                padding="py-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🔥 COMPONENTE ConversationCard (mejorado con responsive)
// ============================================================
function ConversationCard({
  conversation,
  currentUserId,
  primary,
  textColor,
  textMainClass,
  textMutedClass,
  isDarkBg,
  borderDynamic,
  onSelect,
}: {
  conversation: Conversation;
  currentUserId: string | null;
  primary: string;
  textColor: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg: boolean;
  borderDynamic: string;
  onSelect: (conv: Conversation) => void;
}) {
  const lastMessage = conversation.messages?.[conversation.messages.length - 1];
  const unreadCount = conversation.messages?.filter((m) => {
    return currentUserId ? m.sender?.id !== currentUserId && !m.read : false;
  }).length || 0;
  const isArchived = conversation.status === 'archived';
  const isCompleted = conversation.status === 'completed';

  const tenantAvatar = getFullAvatarUrl(
    conversation.tenant?.logoUrl || 
    conversation.tenant?.avatar || 
    conversation.tenant?.image
  );
  const tenantInitials = getInitials(conversation.tenant?.name || 'Tienda');

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`w-full p-3 rounded-xl border transition-all cursor-pointer text-left flex items-center gap-3 hover:opacity-80 ${isArchived ? 'opacity-60' : ''}`}
      style={{
        borderColor: isCompleted ? `${primary}40` : borderDynamic,
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden border flex items-center justify-center relative" style={{ borderColor: borderDynamic }}>
          {tenantAvatar ? (
            <img 
              src={tenantAvatar} 
              alt={conversation.tenant?.name || 'Tienda'} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              {tenantInitials}
            </div>
          )}
          {isArchived && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
              <Archive className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        {unreadCount > 0 && !isArchived && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: primary }}>
            {unreadCount}
          </span>
        )}
        {isCompleted && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#22c55e' }}>
            ✓
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-bold truncate ${textMainClass}`}>
            {conversation.tenant?.name || 'Tienda'}
          </p>
          {lastMessage && (
            <span className={`text-[10px] ${textMutedClass} shrink-0 flex items-center gap-1`}>
              <Clock className="w-3 h-3 hidden xs:inline" />
              {formatDate(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5 gap-2">
          <p className={`text-xs truncate ${textMutedClass}`}>
            {conversation.product?.name ? `${conversation.product.name} - ` : ''}
            {lastMessage?.content || 'Sin mensajes'}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {unreadCount === 0 && lastMessage && (
              <Eye className="w-3 h-3 opacity-40" style={{ color: textColor }} />
            )}
            {isArchived && (
              <span className="text-[8px] opacity-40 hidden sm:inline">Archivado</span>
            )}
            {isCompleted && (
              <span className="text-[8px]" style={{ color: '#22c55e' }}>✓</span>
            )}
          </div>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
    </button>
  );
}