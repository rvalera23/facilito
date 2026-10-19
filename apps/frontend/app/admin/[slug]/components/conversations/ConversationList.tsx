// frontend/app/admin/[slug]/components/conversations/ConversationList.tsx

import React, { useState, useRef, useEffect } from 'react';
import ConversationCard from './ConversationCard';
import ConversationFilters from './ConversationFilters';
import EmptyState from './EmptyState';
import { Conversation } from './types';
import { Archive, Inbox } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  adminUserId: string | null;
  onSelect: (conversation: Conversation) => void;
  onRefresh: () => void;
  primary: string;
  secondary?: string;
  isPrimaryLight: boolean;
  textColor: string;
  cardBgClass: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg?: boolean;
}

export default function ConversationList({
  conversations,
  adminUserId,
  onSelect,
  onRefresh,
  primary,
  secondary,
  isPrimaryLight,
  textColor,
  cardBgClass,
  textMainClass,
  textMutedClass,
  isDarkBg = false,
}: ConversationListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived' | 'completed' | 'resolved'>('all');
  const [filterSearch, setFilterSearch] = useState('');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const scrollPositionRef = useRef(0);
  const isProgrammaticScroll = useRef(false);

  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // Separamos activas y archivadas
  const activeConversations = conversations.filter(c => c.status !== 'archived');
  const archivedConversations = conversations.filter(c => c.status === 'archived');

  // Filtro para activas
  const filteredActive = activeConversations.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterSearch.trim()) {
      const query = filterSearch.toLowerCase().trim();
      const matchName = c.buyer?.name?.toLowerCase().includes(query) || false;
      const matchProduct = c.product?.name?.toLowerCase().includes(query) || false;
      const matchMessage = c.messages.some(m => m.content.toLowerCase().includes(query));
      const matchId = c.id.toLowerCase().includes(query);
      if (!matchName && !matchProduct && !matchMessage && !matchId) return false;
    }
    return true;
  });

  // Filtro para archivadas (solo búsqueda)
  const filteredArchived = archivedConversations.filter(c => {
    if (filterSearch.trim()) {
      const query = filterSearch.toLowerCase().trim();
      const matchName = c.buyer?.name?.toLowerCase().includes(query) || false;
      const matchProduct = c.product?.name?.toLowerCase().includes(query) || false;
      const matchMessage = c.messages.some(m => m.content.toLowerCase().includes(query));
      const matchId = c.id.toLowerCase().includes(query);
      if (!matchName && !matchProduct && !matchMessage && !matchId) return false;
    }
    return true;
  });

  // HANDLE SELECT - PREVIENE EL SCROLL AUTOMÁTICO
  const handleSelect = (conversation: Conversation) => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    
    isProgrammaticScroll.current = true;
    setSelectedId(conversation.id);
    onSelect(conversation);
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
    
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 100);
  };

  // EFECTO PARA MARCAR MONTAJE/DESMONTAJE
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // EFECTO PARA DETECTAR SCROLL DEL USUARIO
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!isProgrammaticScroll.current && isMounted.current) {
        scrollPositionRef.current = container.scrollTop;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // EFECTO PARA MANTENER LA POSICIÓN DEL SCROLL
  useEffect(() => {
    if (!selectedId) return;

    const checkScroll = () => {
      if (!isMounted.current || !scrollContainerRef.current) return;
      
      const currentScroll = scrollContainerRef.current.scrollTop;
      const targetScroll = scrollPositionRef.current;
      
      if (Math.abs(currentScroll - targetScroll) > 5) {
        isProgrammaticScroll.current = true;
        scrollContainerRef.current.scrollTop = targetScroll;
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 50);
      }
    };

    const intervalId = setInterval(checkScroll, 50);
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [selectedId]);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="h-full">
        <EmptyState
          title="No hay conversaciones"
          description="Las conversaciones con tus clientes aparecerán aquí"
          textColor={textColor}
          isDarkBg={isDarkBg}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Filtros - más compactos en móvil */}
      <div className="flex-shrink-0">
        <ConversationFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterSearch={filterSearch}
          setFilterSearch={setFilterSearch}
          onRefresh={onRefresh}
          primary={primary}
          textColor={textColor}
          isDarkBg={isDarkBg}
          loading={false}
        />
      </div>

      {/* CONTENEDOR DE SCROLL */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-3"
        style={{
          scrollBehavior: 'auto',
          overscrollBehavior: 'contain',
          scrollSnapType: 'none',
          WebkitOverflowScrolling: 'touch', // Mejor scroll en iOS
        }}
      >
        {/* SECCIÓN: ACTIVAS */}
        {filteredActive.length > 0 && (
          <div>
            {/* Encabezado mejorado - sin fondo oscuro feo */}
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
                {filteredActive.length}
              </span>
            </div>
            
            {/* Grid responsive para móvil y desktop */}
            <div className="space-y-1.5 sm:space-y-2">
              {filteredActive.map((conversation) => {
                const unreadCount = conversation.messages.filter(m => !m.isRead && m.sender !== 'admin').length;
                return (
                  <div key={conversation.id} className="no-scroll-trigger">
                    <ConversationCard
                      conversation={conversation}
                      isSelected={selectedId === conversation.id}
                      onSelect={handleSelect}
                      primary={primary}
                      textColor={textColor}
                      isDarkBg={isDarkBg}
                      unreadCount={unreadCount}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN: ARCHIVADAS */}
        {filteredArchived.length > 0 && (
          <div className="pt-3 sm:pt-4 border-t" style={{ borderColor: borderDynamic }}>
            {/* Encabezado mejorado - sin fondo oscuro feo */}
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
                {filteredArchived.length}
              </span>
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              {filteredArchived.map((conversation) => {
                const unreadCount = conversation.messages.filter(m => !m.isRead && m.sender !== 'admin').length;
                return (
                  <div key={conversation.id} className="no-scroll-trigger">
                    <ConversationCard
                      conversation={conversation}
                      isSelected={selectedId === conversation.id}
                      onSelect={handleSelect}
                      primary={primary}
                      textColor={textColor}
                      isDarkBg={isDarkBg}
                      unreadCount={unreadCount}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay resultados */}
        {filteredActive.length === 0 && filteredArchived.length === 0 && (
          <div className="text-center py-6 sm:py-8">
            <p className={`text-xs ${textMutedClass} px-4`}>
              No hay conversaciones que coincidan con tu búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  );
}