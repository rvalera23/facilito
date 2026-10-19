  // frontend/app/admin/[slug]/components/conversations/ConversationDetail.tsx

  import React, { useState, useEffect, useRef } from 'react';
  import { 
    ArrowLeft, Send, Archive, Check, Package, 
    MoreVertical, Phone, Mail, MessageCircle, 
    ArchiveRestore, Clock, CreditCard, DollarSign, User
  } from 'lucide-react';
  import { Conversation, Message } from './types';
  import { getFullAvatarUrl, getInitials, formatDate, getDisplayName } from './utils/conversationUtils';
  import { CONVERSATION_STATUS, ORDER_STATUS_LABELS } from './constants';
import { Loader } from '@/components/ui/Loader';
import { formatUsd } from '@/lib/price-utils';
import QuickRepliesPicker from './QuickRepliesPicker';
  // 🔥 CORREGIDO: Usar variable de entorno con fallback a IP correcta
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface ConversationDetailProps {
  conversation: Conversation;
  fullTenant?: any;
  adminUserId: string | null;
  adminAvatar: string | null;
  adminName: string;
  isAdmin: boolean;
  onBack: () => void;
  onUpdate: (updated: Conversation) => void;
  onProcessOrder?: (orderData: any) => Promise<any>;
  primary: string;
  secondary?: string;
  isPrimaryLight: boolean;
  textColor: string;
  cardBgClass: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg?: boolean;
}

export default function ConversationDetail({
  conversation,
  fullTenant,
  adminUserId,
  adminAvatar,
  adminName,
  isAdmin,
  onBack,
  onUpdate,
  onProcessOrder,
  primary,
  secondary,
  isPrimaryLight,
  textColor,
  cardBgClass,
  textMainClass,
  textMutedClass,
  isDarkBg = false,
}: ConversationDetailProps) {
  const [messages, setMessages] = useState<Message[]>(conversation.messages || []);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔥 Insertar texto desde respuesta rápida
  const handleInsertQuickReply = (text: string) => {
    setMessageInput((prev) => {
      if (!prev.trim()) return text;
      return `${prev.trim()} ${text}`;
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  };
    const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';

    const isArchived = conversation.status === 'archived';
    const isCompleted = conversation.status === 'completed';

    // Obtener estado de la orden si existe
    const order = conversation.order || null;
    const orderStatus = order?.status?.toUpperCase() || '';
    const paymentMethod = conversation.paymentMethod || order?.paymentMethodUsed || '';

    // 🔥 OBTENER tenantId DE LA CONVERSACIÓN
    const tenantId = conversation.tenant?.id || conversation.tenantId || '';
    console.log('[ConversationDetail] tenantId:', tenantId);

    useEffect(() => {
      setMessages(conversation.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [conversation]);

    // ============================================================
    // 🔥 ENVIAR MENSAJE - CON tenantId
    // ============================================================
    const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageInput.trim() || sending || isArchived) return;
      setSending(true);
      try {
        const token = getToken();
        
        console.log('[ConversationDetail] Enviando mensaje con tenantId:', tenantId);
        
        const res = await fetch(`${API_BASE}/chat/conversations/${conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            content: messageInput.trim(), 
            isStoreMessage: isAdmin,
            tenantId: tenantId // 🔥 AGREGAR tenantId
          }),
        });
        if (res.ok) {
          const newMsg = await res.json();
          const updatedMessages = [...messages, newMsg];
          setMessages(updatedMessages);
          onUpdate({ ...conversation, messages: updatedMessages, updatedAt: new Date().toISOString() });
          setMessageInput('');
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          const errorText = await res.text();
          console.error('[ConversationDetail] Error al enviar mensaje:', errorText);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setSending(false);
      }
    };

    // ============================================================
    // 🔥 ARCHIVAR/DESARCHIVAR
    // ============================================================
    const toggleArchive = async () => {
      const newStatus = isArchived ? 'active' : 'archived';
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/chat/conversations/${conversation.id}/archive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ archived: newStatus === 'archived' })
        });
        if (res.ok) {
          const updated = await res.json();
          onUpdate(updated);
        } else {
          onUpdate({ ...conversation, status: newStatus });
        }
      } catch (error) {
        console.error('Error toggling archive:', error);
        onUpdate({ ...conversation, status: newStatus });
      }
      setShowMoreOptions(false);
    };

    // ============================================================
    // 🔥 ENVIAR MENSAJE DEL SISTEMA - CON tenantId
    // ============================================================
    const sendSystemMessage = async (content: string) => {
      try {
        const token = getToken();
        
        const res = await fetch(`${API_BASE}/chat/conversations/${conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            content, 
            isStoreMessage: true,
            tenantId: tenantId // 🔥 AGREGAR tenantId
          }),
        });
        if (res.ok) {
          const newMsg = await res.json();
          const updatedMessages = [...messages, newMsg];
          setMessages(updatedMessages);
          onUpdate({ ...conversation, messages: updatedMessages, updatedAt: new Date().toISOString() });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } catch (error) {
        console.error('Error sending system message:', error);
      }
    };

    // ============================================================
    // 🔥 ACCIÓN: CONFIRMAR PAGO
    // ============================================================
    const handleConfirmPayment = async () => {
      if (!order?.id || isProcessing) return;
      setIsProcessing(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/orders/${order.id}/payment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ status: 'CONFIRMED' }),
        });
        if (res.ok) {
          const updated = await res.json();
          onUpdate({ ...conversation, order: updated });
          await sendSystemMessage('✅ El pago ha sido confirmado. La orden está en proceso.');
        }
      } catch (error) {
        console.error('Error confirming payment:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    // ============================================================
    // 🔥 ACCIÓN: COMPLETAR ORDEN
    // ============================================================
    const handleCompleteOrder = async () => {
      if (!order?.id || isProcessing) return;
      setIsProcessing(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ status: 'COMPLETED' }),
        });
        if (res.ok) {
          const updated = await res.json();
          onUpdate({ ...conversation, order: updated, status: 'completed' });
          await sendSystemMessage('🎉 La orden ha sido completada exitosamente. ¡Gracias por tu compra!');
        }
      } catch (error) {
        console.error('Error completing order:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    // ============================================================
    // 🔥 RENDERIZAR ACCIONES DINÁMICAS SEGÚN ESTADO DE LA ORDEN
    // ============================================================
    const renderOrderActions = () => {
      if (!order) {
        return (
          <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{
            color: isDarkBg ? '#94a3b8' : '#64748b',
            backgroundColor: isDarkBg ? 'rgba(100,116,139,0.2)' : 'rgba(100,116,139,0.1)',
          }}>
            Sin orden
          </span>
        );
      }

      if (orderStatus === 'COMPLETED') {
        return (
          <span className="text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{
            color: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <Check className="w-3 h-3" />
            Completada
          </span>
        );
      }

      if (orderStatus === 'CANCELLED') {
        return (
          <span className="text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{
            color: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            Cancelada
          </span>
        );
      }

      if (orderStatus === 'POR_VERIFICAR' || orderStatus === 'VERIFICANDO') {
        return (
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#22c55e',
              color: '#ffffff',
              borderColor: '#22c55e',
            }}
          >
            {isProcessing ? (
              <Loader size="sm" color="#ffffff" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Confirmar Pago
          </button>
        );
      }

      if (orderStatus === 'CONFIRMED') {
        return (
          <button
            onClick={handleCompleteOrder}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              borderColor: '#8b5cf6',
            }}
          >
            {isProcessing ? (
              <Loader size="sm" color="#ffffff" />
            ) : (
              <Package className="w-3.5 h-3.5" />
            )}
            Completar Orden
          </button>
        );
      }

      if (orderStatus === 'PENDING' && paymentMethod === 'pago_movil') {
        return (
          <span className="text-[10px] px-3 py-1.5 rounded-full font-medium flex items-center gap-2" style={{
            color: '#f59e0b',
            backgroundColor: 'rgba(251,191,36,0.15)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}>
            <Clock className="w-3 h-3" />
            Esperando comprobante
          </span>
        );
      }

      if (orderStatus === 'PENDING' && (paymentMethod === 'efectivo' || paymentMethod === 'cash')) {
        return (
          <span className="text-[10px] px-3 py-1.5 rounded-full font-medium flex items-center gap-2" style={{
            color: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <User className="w-3 h-3" />
            Pago en efectivo
          </span>
        );
      }

      return null;
    };

    // ============================================================
    // 🔥 RENDERIZAR INFORMACIÓN DE PAGO
    // ============================================================
    const renderPaymentInfo = () => {
      if (!order && !paymentMethod) return null;

      const methodLabels: Record<string, string> = {
        pago_movil: 'Pago Móvil',
        efectivo: 'Efectivo',
        cash: 'Efectivo',
        zelle: 'Zelle',
        binance: 'Binance Pay',
        paypal: 'PayPal',
        pos: 'Punto de Venta',
        biopago: 'Biopago',
      };

      const methodLabel = methodLabels[paymentMethod] || paymentMethod || 'No especificado';

      return (
        <div className="p-3 rounded-xl border mt-2 mx-4" style={{
          borderColor: borderDynamic,
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        }}>
          <div className="flex items-center gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5 opacity-60" />
            <span className="opacity-60">Método de pago:</span>
            <span className="font-medium">{methodLabel}</span>
          </div>
          {order?.totalAmount && (
            <div className="flex items-center gap-2 text-xs mt-1">
              <DollarSign className="w-3.5 h-3.5 opacity-60" />
              <span className="opacity-60">Monto:</span>
<span className="font-medium">${formatUsd(Number(order.totalAmount))}</span>
              {order?.totalAmountVes && (
                <span className="text-[10px] opacity-50">
                  (Bs. {Number(order.totalAmountVes).toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                </span>
              )}
            </div>
          )}
          {order?.status && (
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="opacity-60">Estado:</span>
              <span className="font-medium" style={{
                color: ORDER_STATUS_LABELS[orderStatus]?.color || '#64748b',
              }}>
                {ORDER_STATUS_LABELS[orderStatus]?.label || orderStatus}
              </span>
            </div>
          )}
        </div>
      );
    };

    const statusConfig = CONVERSATION_STATUS[conversation.status] || CONVERSATION_STATUS.active;
    const buyerName = getDisplayName(conversation.buyer);
    const avatarUrl = getFullAvatarUrl(conversation.buyer?.avatarUrl || conversation.buyer?.avatar);
    const adminAvatarUrl = getFullAvatarUrl(adminAvatar);

    return (
      <div className="flex flex-col h-full">
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: borderDynamic }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 relative" style={{ borderColor: isArchived ? '#64748b' : primary }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={buyerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: isArchived ? '#64748b20' : `${primary}20`, color: isArchived ? '#64748b' : primary }}>
                    {getInitials(buyerName)}
                  </div>
                )}
                {isArchived && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <Archive className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-bold text-sm truncate ${isArchived ? 'line-through opacity-60' : ''}`} style={{ color: textColor }}>
                  {buyerName}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}>
                  {statusConfig.label}
                </span>
                {isArchived && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{
                    color: isDarkBg ? '#94a3b8' : '#64748b',
                    backgroundColor: isDarkBg ? 'rgba(100,116,139,0.2)' : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${isDarkBg ? 'rgba(100,116,139,0.3)' : 'rgba(100,116,139,0.2)'}`
                  }}>
                    Archivada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: textColor, opacity: 0.6 }}>
                <MessageCircle className="w-3 h-3" />
                <span>{messages.length} mensajes</span>
                {conversation.product && (
                  <>
                    <span>•</span>
                    <Package className="w-3 h-3" />
                    <span className="truncate">{conversation.product.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 flex-wrap">
            {renderOrderActions()}

            <div className="relative">
              <button onClick={() => setShowMoreOptions(!showMoreOptions)} className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-xl border shadow-lg z-50" style={{ backgroundColor: isDarkBg ? '#1e293b' : '#ffffff', borderColor: borderDynamic }}>
                  <button onClick={toggleArchive} className="w-full px-4 py-2 text-xs text-left flex items-center gap-2 hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="w-3 h-3" />
                        Desarchivar conversación
                      </>
                    ) : (
                      <>
                        <Archive className="w-3 h-3" />
                        Archivar conversación
                      </>
                    )}
                  </button>
                  {conversation.buyer?.phone && (
                    <button onClick={() => { window.location.href = `tel:${conversation.buyer?.phone}`; setShowMoreOptions(false); }} className="w-full px-4 py-2 text-xs text-left flex items-center gap-2 hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
                      <Phone className="w-3 h-3" />
                      Llamar
                    </button>
                  )}
                  {conversation.buyer?.email && (
                    <button onClick={() => { window.location.href = `mailto:${conversation.buyer?.email}`; setShowMoreOptions(false); }} className="w-full px-4 py-2 text-xs text-left flex items-center gap-2 hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
                      <Mail className="w-3 h-3" />
                      Enviar email
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* INFORMACIÓN DE PAGO */}
        {renderPaymentInfo()}

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]" style={{ backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 opacity-20 mb-3" style={{ color: textColor }} />
              <p className={`text-sm ${textMutedClass}`}>No hay mensajes aún</p>
              <p className={`text-xs ${textMutedClass} mt-1`}>Inicia la conversación con el cliente</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isFromAdmin = adminUserId ? msg.sender?.id === adminUserId : false;
              const senderAvatar = isFromAdmin ? adminAvatarUrl : avatarUrl;
              const senderName = isFromAdmin ? adminName : buyerName;
              const showAvatar = index === 0 || messages[index - 1]?.sender?.id !== msg.sender?.id;

              return (
                <div key={msg.id} className={`flex gap-2 ${isFromAdmin ? 'flex-row-reverse' : 'flex-row'} ${!showAvatar ? 'mt-1' : 'mt-3'}`}>
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center" style={{ borderColor: borderDynamic }}>
                      {senderAvatar ? (
                        <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: isFromAdmin ? `${primary}20` : 'rgba(255,255,255,0.1)', color: isFromAdmin ? primary : textColor }}>
                          {getInitials(senderName)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className={`flex-1 ${isFromAdmin ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-2xl text-xs max-w-[85%] ${isFromAdmin ? 'rounded-br-none' : 'rounded-bl-none'} ${isArchived ? 'opacity-60' : ''}`} style={{ backgroundColor: isFromAdmin ? primary : (isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'), color: isFromAdmin ? (isPrimaryLight ? '#0f172a' : '#ffffff') : textColor, wordBreak: 'break-word' }}>
                      <p className="whitespace-pre-line break-words">{msg.content}</p>
                      <span className={`text-[9px] opacity-60 block mt-1 ${isFromAdmin ? 'text-right' : 'text-left'}`}>
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

      {/* INPUT */}
      <div className="p-4 border-t shrink-0" style={{ borderColor: borderDynamic }}>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* 🔥 BOTÓN DE RESPUESTAS RÁPIDAS — solo para admin y si no está archivada */}
{isAdmin && !isArchived && (
<QuickRepliesPicker
  tenant={fullTenant || conversation.tenant}
  onPick={handleInsertQuickReply}
  primary={primary}
  secondary={secondary}
  textColor={textColor}
  isDarkBg={isDarkBg}
  borderColor={borderDynamic}
/>
)}

          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={isArchived ? "Conversación archivada - Desarchiva para enviar mensajes" : (isAdmin ? "Escribe tu respuesta..." : "Escribe tu mensaje...")}
            className={`flex-1 border rounded-full px-5 py-3 text-sm outline-none bg-transparent transition-all focus:border-opacity-100 ${isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ borderColor: borderDynamic, color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
            disabled={isArchived}
          />
            <button
              type="submit"
              disabled={sending || !messageInput.trim() || isArchived}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer text-white shrink-0 ${isArchived ? 'opacity-30' : ''}`}
              style={{ backgroundColor: primary }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {isArchived && (
            <p className="text-[10px] mt-2 text-center" style={{ color: isDarkBg ? '#64748b' : '#94a3b8' }}>
              <ArchiveRestore className="w-3 h-3 inline mr-1" />
              Esta conversación está archivada. Ve al menú de opciones (⋮) para desarchivarla.
            </p>
          )}
        </div>
      </div>
    );
  }