// frontend/app/mi-cuenta/components/conversations/ConversationDetail.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Send, Archive, Package, MoreVertical, 
  Phone, MessageCircle, ArchiveRestore, 
  CreditCard, Check, Hash, DollarSign
} from 'lucide-react';
import { Conversation, Message, ReportPaymentData } from './types';
import { getFullAvatarUrl, getInitials, formatDate, getDisplayName } from './utils/conversationUtils';
import { CONVERSATION_STATUS } from './constants';
import ReportPaymentModal from './ReportPaymentModal';

// 🔥 CORREGIDO: Usar variable de entorno con fallback a IP correcta
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface ConversationDetailProps {
  conversation: Conversation;
  adminUserId: string | null;
  adminAvatar: string | null;
  adminName: string;
  onBack: () => void;
  onUpdate: (updated: Conversation) => void;
  onProcessOrder?: (orderData: any) => Promise<any>;
  onReportPayment: (conversationId: string, paymentData: ReportPaymentData) => Promise<void>;
  primary: string;
  secondary?: string;
  isPrimaryLight: boolean;
  textColor: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg?: boolean;
  isAdmin?: boolean;
}

export default function ConversationDetail({
  conversation,
  adminUserId,
  adminAvatar,
  adminName,
  onBack,
  onUpdate,
  onProcessOrder,
  onReportPayment,
  primary,
  secondary,
  isPrimaryLight,
  textColor,
  textMainClass,
  textMutedClass,
  isDarkBg = false,
  isAdmin = false,
}: ConversationDetailProps) {
  const [messages, setMessages] = useState<Message[]>(conversation.messages || []);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [detectedPaymentMethod, setDetectedPaymentMethod] = useState<string | null>(null);
  const [paymentReported, setPaymentReported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token') || '';

  const isArchived = conversation.status === 'archived';
  const isCompleted = conversation.status === 'completed';

  // 🔥 OBTENER tenantId Y paymentMethod DE LA CONVERSACIÓN
  const tenantId = conversation.tenant?.id || conversation.tenantId || '';
  const paymentMethod = conversation.paymentMethod || conversation.order?.paymentMethodUsed || '';

  console.log('[ConversationDetail Cliente] tenantId:', tenantId);
  console.log('[ConversationDetail Cliente] paymentMethod:', paymentMethod);

  useEffect(() => {
    setMessages(conversation.messages || []);
    const hasPaymentReport = conversation.messages?.some(m => 
      m.content.toLowerCase().includes('pago') || 
      m.content.toLowerCase().includes('transferencia') ||
      m.content.toLowerCase().includes('reporte')
    );
    setPaymentReported(!!hasPaymentReport);
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
      
      console.log('[ConversationDetail Cliente] Enviando mensaje con tenantId:', tenantId);
      
      const res = await fetch(`${API_BASE}/chat/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          content: messageInput.trim(),
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
        console.error('[ConversationDetail Cliente] Error al enviar mensaje:', errorText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

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
  // 🔥 HANDLE PAYMENT REPORT - CON tenantId Y DATOS DINÁMICOS
  // ============================================================
  const handlePaymentReport = async (data: ReportPaymentData) => {
    try {
      await onReportPayment(conversation.id, data);
      setPaymentReported(true);
      setShowPaymentModal(false);
      
      const token = getToken();
      const methodLabel = data.method || 'No especificado';
      const amountFormatted = data.amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const messageContent = `PAGO REPORTADO\nMetodo: ${methodLabel}\nReferencia: ${data.reference || 'N/A'}\nMonto: Bs. ${amountFormatted}\n\nLa tienda confirmara tu pago en breve.`;
      
      await fetch(`${API_BASE}/chat/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          content: messageContent,
          type: 'payment_report',
          isSystem: true,
          tenantId: tenantId // 🔥 AGREGAR tenantId
        }),
      });
      
      const updated = { ...conversation, status: 'completed' };
      onUpdate(updated);
      
    } catch (error) {
      console.error('Error reporting payment:', error);
    }
  };

  const statusConfig = CONVERSATION_STATUS[conversation.status] || CONVERSATION_STATUS.active;
  const buyerName = getDisplayName(conversation.buyer);
  const avatarUrl = getFullAvatarUrl(conversation.buyer?.avatarUrl || conversation.buyer?.avatar);
  const tenantAvatar = getFullAvatarUrl(
    conversation.tenant?.logoUrl || 
    conversation.tenant?.avatar || 
    conversation.tenant?.image
  );
  const tenantName = conversation.tenant?.name || 'Tienda';

  // 🔥 DETECTAR SI ES PAGO MÓVIL PARA MOSTRAR BOTÓN DE REPORTE
  const isPagoMovil = paymentMethod === 'pago_movil' || paymentMethod === 'Pago Móvil';
  const isEfectivo = paymentMethod === 'efectivo' || paymentMethod === 'cash' || paymentMethod === 'Efectivo';
  const isPos = paymentMethod === 'pos' || paymentMethod === 'punto_venta' || paymentMethod === 'Punto de Venta';

  // 🔥 SOLO MOSTRAR BOTÓN DE REPORTAR PAGO SI ES PAGO MÓVIL Y NO ESTÁ REPORTADO
  const shouldShowPaymentButton = !isAdmin && !isArchived && !isCompleted && !paymentReported && isPagoMovil;

  // BANNER DE CONVERSACIÓN ARCHIVADA
  const ArchivedBanner = () => (
    <div className="mx-4 mt-2 p-3 rounded-xl border flex items-center gap-3" style={{ 
      backgroundColor: isDarkBg ? 'rgba(100,116,139,0.15)' : 'rgba(100,116,139,0.08)',
      borderColor: isDarkBg ? 'rgba(100,116,139,0.3)' : 'rgba(100,116,139,0.2)'
    }}>
      <Archive className="w-5 h-5" style={{ color: isDarkBg ? '#94a3b8' : '#475569' }} />
      <div className="flex-1">
        <p className="text-xs font-medium" style={{ color: isDarkBg ? '#94a3b8' : '#475569' }}>
          Conversación Archivada
        </p>
        <p className="text-[10px]" style={{ color: isDarkBg ? '#64748b' : '#64748b' }}>
          No puedes enviar mensajes hasta que la conversación sea desarchivada
        </p>
      </div>
      <button
        onClick={toggleArchive}
        className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white transition hover:opacity-80"
        style={{ backgroundColor: primary }}
      >
        <ArchiveRestore className="w-3 h-3 inline mr-1" />
        Desarchivar
      </button>
    </div>
  );

  // BANNER DE PAGO REPORTADO
  const PaymentReportedBanner = () => (
    <div className="mx-4 mt-2 p-3 rounded-xl border flex items-center gap-3" style={{ 
      backgroundColor: isDarkBg ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
      borderColor: isDarkBg ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'
    }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isDarkBg ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)' }}>
        <Check className="w-4 h-4" style={{ color: isDarkBg ? '#34d399' : '#059669' }} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color: isDarkBg ? '#34d399' : '#059669' }}>
          Pago Reportado
        </p>
        <p className="text-[10px]" style={{ color: isDarkBg ? '#6ee7b7' : '#047857' }}>
          Tu pago está siendo verificado por la tienda
        </p>
      </div>
    </div>
  );

  // 🔥 BANNER INFORMATIVO PARA EFECTIVO
  const EfectivoBanner = () => (
    <div className="mx-4 mt-2 p-3 rounded-xl border flex items-center gap-3" style={{ 
      backgroundColor: isDarkBg ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
      borderColor: isDarkBg ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'
    }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isDarkBg ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }}>
        <DollarSign className="w-4 h-4" style={{ color: isDarkBg ? '#60a5fa' : '#2563eb' }} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color: isDarkBg ? '#60a5fa' : '#2563eb' }}>
          Pago en Efectivo
        </p>
        <p className="text-[10px]" style={{ color: isDarkBg ? '#93c5fd' : '#1d4ed8' }}>
          Acércate a la tienda con el monto exacto para completar tu compra.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      
      {/* HEADER - FIJO ARRIBA */}
      <div className="flex items-center justify-between p-4 border-b shrink-0 w-full" style={{ borderColor: borderDynamic }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 relative" style={{ borderColor: isArchived ? (isDarkBg ? '#475569' : '#94a3b8') : primary }}>
              {tenantAvatar ? (
                <img src={tenantAvatar} alt={tenantName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ 
                  backgroundColor: isArchived ? (isDarkBg ? 'rgba(71,85,105,0.3)' : 'rgba(148,163,184,0.2)') : `${primary}20`, 
                  color: isArchived ? (isDarkBg ? '#94a3b8' : '#64748b') : primary 
                }}>
                  {getInitials(tenantName)}
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
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-sm truncate ${isArchived ? 'line-through opacity-60' : ''}`} style={{ color: textColor }}>
                {tenantName}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ 
                color: statusConfig.color,
                backgroundColor: isDarkBg ? `${statusConfig.color}20` : `${statusConfig.color}15`,
                border: `1px solid ${isDarkBg ? `${statusConfig.color}30` : `${statusConfig.color}20`}`
              }}>
                {statusConfig.label}
              </span>
              {isArchived && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ 
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

        <div className="flex items-center gap-1 shrink-0">
          {/* 🔥 BOTÓN DE REPORTAR PAGO - SOLO PARA PAGO MÓVIL */}
          {shouldShowPaymentButton && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors relative"
              style={{ color: textColor }}
              title="Reportar pago"
            >
              <CreditCard className="w-4 h-4" style={{ color: primary }} />
            </button>
          )}

          {/* 🔥 INDICADOR DE EFECTIVO */}
          {!isAdmin && !isArchived && !isCompleted && !paymentReported && isEfectivo && (
            <span className="text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{ 
              color: isDarkBg ? '#60a5fa' : '#2563eb',
              backgroundColor: isDarkBg ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${isDarkBg ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`
            }}>
              <DollarSign className="w-3 h-3" />
              Efectivo
            </span>
          )}

          {isCompleted && (
            <span className="text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{ 
              color: isDarkBg ? '#34d399' : '#059669',
              backgroundColor: isDarkBg ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${isDarkBg ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}`
            }}>
              <Check className="w-3 h-3" />
              Pagado
            </span>
          )}

          <div className="relative">
            <button onClick={() => setShowMoreOptions(!showMoreOptions)} className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMoreOptions && (
              <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-xl border shadow-lg z-50" style={{ 
                backgroundColor: isDarkBg ? '#1e293b' : '#ffffff', 
                borderColor: borderDynamic 
              }}>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BANNERS */}
      {isArchived && <ArchivedBanner />}
      {paymentReported && <PaymentReportedBanner />}
      {!isArchived && !paymentReported && isEfectivo && <EfectivoBanner />}

      {/* 🔥 ÁREA DE MENSAJES */}
      <div className="flex-1 overflow-y-auto w-full" style={{ 
        backgroundColor: isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        padding: '16px 16px 80px 16px' 
      }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 opacity-20 mb-3" style={{ color: textColor }} />
            <p className={`text-sm ${textMutedClass}`}>No hay mensajes aún</p>
            <p className={`text-xs ${textMutedClass} mt-1`}>Inicia la conversación con {tenantName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isFromUser = adminUserId ? msg.sender?.id === adminUserId : false;
              
              const senderAvatar = isFromUser ? avatarUrl : tenantAvatar;
              const senderName = isFromUser ? buyerName : tenantName;
              const showAvatar = index === 0 || messages[index - 1]?.sender?.id !== msg.sender?.id;
              const isPaymentReport = msg.content.includes('PAGO REPORTADO') || msg.type === 'payment_report';

              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-2 w-full ${isFromUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center" style={{ borderColor: borderDynamic }}>
                      {senderAvatar ? (
                        <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold" style={{ 
                          backgroundColor: isFromUser ? `${primary}20` : (isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'), 
                          color: isFromUser ? primary : textColor 
                        }}>
                          {getInitials(senderName)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  
                  <div className={`flex-1 max-w-[85%] ${isFromUser ? 'text-right' : 'text-left'}`}>
                    {showAvatar && (
                      <span className={`text-[10px] font-medium block mb-1 ${isFromUser ? 'text-right' : 'text-left'} ${textMutedClass}`}>
                        {senderName}
                      </span>
                    )}
                    
                    {isPaymentReport ? (
                      <div className="rounded-2xl p-4 border w-full" style={{ 
                        backgroundColor: isDarkBg ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
                        borderColor: isDarkBg ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.15)',
                      }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: isDarkBg ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)' }}>
                            <Check className="w-3.5 h-3.5" style={{ color: isDarkBg ? '#34d399' : '#059669' }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: isDarkBg ? '#34d399' : '#059669' }}>
                            PAGO REPORTADO
                          </span>
                        </div>
                        
                        {/* 🔥 MOSTRAR DATOS DINÁMICOS DEL REPORTE */}
                        {msg.content.split('\n').map((line, idx) => {
                          if (line.includes('Metodo:') || line.includes('Referencia:') || line.includes('Monto:')) {
                            const [label, value] = line.split(':').map(s => s.trim());
                            let icon = null;
                            if (label === 'Metodo') icon = <CreditCard className="w-3.5 h-3.5 mt-0.5 opacity-50" style={{ color: textColor }} />;
                            else if (label === 'Referencia') icon = <Hash className="w-3.5 h-3.5 mt-0.5 opacity-50" style={{ color: textColor }} />;
                            else if (label === 'Monto') icon = <DollarSign className="w-3.5 h-3.5 mt-0.5 opacity-50" style={{ color: textColor }} />;
                            
                            return (
                              <div key={idx} className="flex items-start gap-2 opacity-80 text-xs" style={{ color: textColor }}>
                                {icon}
                                <div>
                                  <span className="opacity-50">{label}: </span>
                                  <span className="font-medium">{value}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}

                        <div className="mt-3 pt-2 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <p className="text-xs" style={{ color: isDarkBg ? '#6ee7b7' : '#047857' }}>
                            La tienda confirmara tu pago en breve.
                          </p>
                        </div>

                        <span className={`text-[9px] opacity-40 block mt-3`}>
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    ) : (
                      <div className={`inline-block p-3 rounded-2xl text-xs ${isFromUser ? 'rounded-br-none' : 'rounded-bl-none'} ${isArchived ? 'opacity-60' : ''}`} style={{ 
                        backgroundColor: isFromUser 
                          ? primary 
                          : (isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                        color: isFromUser 
                          ? (isPrimaryLight ? '#0f172a' : '#ffffff') 
                          : textColor,
                        wordBreak: 'break-word',
                        maxWidth: '100%',
                        boxShadow: isFromUser ? `0 2px 8px ${primary}20` : 'none'
                      }}>
                        <p className="whitespace-pre-line break-words">{msg.content}</p>
                        <span className={`text-[9px] opacity-60 block mt-1 ${isFromUser ? 'text-right' : 'text-left'}`}>
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 🔥 FOOTER CON INPUT */}
      <div className="p-4 border-t shrink-0 w-full" style={{ 
        borderColor: borderDynamic, 
        backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)') 
      }}>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={isArchived ? "Conversación archivada - Desarchiva para enviar mensajes" : (isCompleted ? "Conversación completada" : "Escribe tu mensaje...")}
            className={`flex-1 border rounded-full px-5 py-3 text-sm outline-none bg-transparent transition-all focus:border-opacity-100 w-full ${(isArchived || isCompleted) ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              borderColor: borderDynamic, 
              color: textColor, 
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' 
            }}
            disabled={isArchived || isCompleted}
          />
          <button
            type="submit"
            disabled={sending || !messageInput.trim() || isArchived || isCompleted}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer text-white shrink-0 ${(isArchived || isCompleted) ? 'opacity-30' : ''}`}
            style={{ backgroundColor: primary }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        {isArchived && (
          <p className="text-[10px] mt-2 text-center w-full" style={{ color: isDarkBg ? '#64748b' : '#94a3b8' }}>
            <ArchiveRestore className="w-3 h-3 inline mr-1" />
            Esta conversación está archivada. Ve al menú de opciones (⋮) para desarchivarla.
          </p>
        )}
      </div>

      {/* MODAL DE REPORTAR PAGO - SOLO PARA PAGO MÓVIL */}
      <ReportPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onReport={handlePaymentReport}
        primary={primary}
        textColor={textColor}
        textMainClass={textMainClass}
        textMutedClass={textMutedClass}
        isDarkBg={isDarkBg}
        borderDynamic={borderDynamic}
        secondary={secondary}
        buyerName={buyerName}
        productName={conversation.product?.name || 'Producto'}
        totalAmount={conversation.product?.price || 0}
        detectedPaymentMethod={detectedPaymentMethod}
      />
    </div>
  );
}