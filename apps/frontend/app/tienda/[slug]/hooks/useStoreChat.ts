import { useState } from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: { name?: string };
}

export function useStoreChat(tenantId: string, productId?: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const getApiBase = () => {
    if (typeof window !== 'undefined') {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:3000`;
    }
    return 'http://localhost:3000';
  };
// Iniciar o recuperar la conversación al abrir el chat
const openChat = async () => {
  // 🔥 NO LLAMAR setIsOpen(true) AQUÍ - se maneja desde el modal
  if (!tenantId) {
    console.warn('⚠️ [useStoreChat] tenantId es requerido');
    return;
  }

  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  
  if (!token) {
    console.warn('⚠️ [useStoreChat] Debes iniciar sesión para chatear.');
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    const apiBase = getApiBase();

    // 🔥 INCLUIR productId EN EL PAYLOAD
    const payload: any = { tenantId };
    if (productId) {
      payload.productId = productId;
    }

    console.log(`📡 [useStoreChat] Buscando conversación para tenant: ${tenantId}, productId: ${productId || 'sin producto'}`);

    const res = await fetch(`${apiBase}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log(`📥 [useStoreChat] Respuesta del servidor:`, data);
    
    if (data?.id) {
      setConversationId(data.id);
      // 🔥 CARGAR MENSAJES DE LA CONVERSACIÓN EXISTENTE
      await fetchMessages(data.id);
    } else {
      console.error('Error del servidor al crear/obtener conversación:', data);
    }
  } catch (error) {
    console.error('Error al iniciar chat:', error);
  } finally {
    setLoading(false);
  }
};

  const fetchMessages = async (convId: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const apiBase = getApiBase();

      const res = await fetch(`${apiBase}/chat/conversations/${convId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const apiBase = getApiBase();

      const res = await fetch(`${apiBase}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      const newMessage = await res.json();
      if (newMessage?.id) {
        setMessages((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  return {
    isOpen,
    setIsOpen,
    openChat,
    messages,
    sendMessage,
    loading,
    conversationId
  };
}