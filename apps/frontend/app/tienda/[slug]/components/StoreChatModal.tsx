// ==========================================
// ARCHIVO: components/StoreChatModal.tsx
// ==========================================
'use client';
import { useState, useRef, useEffect } from 'react';
import { useStoreChat } from '../hooks/useStoreChat';
import { MessageSquare, X, Send, Trash2, CornerUpLeft } from 'lucide-react';

interface StoreChatModalProps {
  tenantId: string;
  tenantName: string;
  productId?: string;
  primary: string;
  isPrimaryLight: boolean;
  cardBgClass: string;
  textMainClass: string;
  textMutedClass: string;
}

export default function StoreChatModal({ 
  tenantId, 
  tenantName, 
  productId,
  primary,
  isPrimaryLight,
  cardBgClass,
  textMainClass,
  textMutedClass
}: StoreChatModalProps) {
  const { isOpen, setIsOpen, openChat, messages: serverMessages, sendMessage, loading } = useStoreChat(tenantId, productId);
  
  // Estado local para permitir eliminar mensajes solo de la vista sin tocar backend
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  // Estado para el mensaje al que se está respondiendo
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string } | null>(null);
  const [inputContent, setInputContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visibleMessages = serverMessages.filter((msg) => !hiddenMessageIds.includes(String(msg.id)));

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    // Si estás respondiendo a un mensaje, puedes anteponer una cita visual o enviarlo con el payload
    const finalContent = replyingTo 
      ? `> En respuesta a: "${replyingTo.content}"\n\n${inputContent}` 
      : inputContent;

    sendMessage(finalContent);
    setInputContent('');
    setReplyingTo(null);
  };

  const handleHideMessageLocally = (id: string) => {
    setHiddenMessageIds((prev) => [...prev, String(id)]);
  };

  return (
    <>
      {/* Botón flotante para abrir chat */}
      <button
        type="button"
        onClick={openChat}
        className="relative p-4 rounded-2xl shadow-2xl flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer border border-white/25"
        style={{ 
          backgroundColor: primary,
          color: isPrimaryLight ? '#0f172a' : '#ffffff' 
        }}
        title={`Chatear con ${tenantName}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Ventana flotante de chat */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-[99999] w-80 md:w-96 rounded-3xl shadow-2xl flex flex-col h-[520px] overflow-hidden border backdrop-blur-2xl ${cardBgClass}`} style={{ borderColor: `${primary}40` }}>
          
          {/* Header */}
          <div className="p-4 flex justify-between items-center border-b border-white/10" style={{ backgroundColor: primary, color: isPrimaryLight ? '#0f172a' : '#ffffff' }}>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{tenantName}</h3>
              <span className="text-[11px] opacity-90 flex items-center gap-1 font-medium">● En línea</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="opacity-80 hover:opacity-100 text-base font-bold p-1 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {loading ? (
              <p className={`text-center text-xs mt-16 ${textMutedClass}`}>Conectando...</p>
            ) : visibleMessages.length === 0 ? (
              <p className={`text-center text-xs mt-16 px-4 ${textMutedClass}`}>
                ¡Escribe tu duda sobre el producto o servicio! Te responderemos directamente.
              </p>
            ) : (
              visibleMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col group relative">
                  <div className={`max-w-[88%] p-3 rounded-2xl shadow-sm text-xs border ${cardBgClass} ${textMainClass} relative`}>
                    
                    {/* Botones de acción flotantes en cada burbuja (Responder / Ocultar localmente) */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/20 dark:bg-white/10 backdrop-blur-sm rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setReplyingTo({ id: String(msg.id), content: msg.content })}
                        title="Responder a este mensaje"
                        className="p-1 hover:text-emerald-400 transition cursor-pointer"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHideMessageLocally(String(msg.id))}
                        title="Ocultar de mi vista (en base de datos se mantiene)"
                        className="p-1 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="whitespace-pre-line pr-10">{msg.content}</p>
                  </div>

                  <span className={`text-[10px] mt-1 px-1 ${textMutedClass}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Banner indicador si se está respondiendo a un mensaje */}
          {replyingTo && (
            <div className="px-3 py-2 bg-black/10 dark:bg-white/5 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="truncate pr-2 opacity-80">
                <span className="font-bold">Respondiendo a:</span> {replyingTo.content}
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input para enviar mensaje */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje..."}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 ${textMainClass}`}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: `${primary}30` }}
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-lg"
              style={{ backgroundColor: primary, color: isPrimaryLight ? '#0f172a' : '#ffffff' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}