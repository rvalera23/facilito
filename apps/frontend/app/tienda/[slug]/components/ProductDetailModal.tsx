'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Send } from 'lucide-react';
import { useStoreChat } from '../hooks/useStoreChat';
import { PRODUCT_TAG_CATEGORIES } from '@/app/constants/itemCategories';
import { getImageUrl, getAllImages as getImageUrls } from '@/lib/imageUtils';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { getPriceColors } from '@/lib/priceTokens';
import ItemReviewsSection from './ItemReviewsSection';

const useProductPrices = (product: any, exchangeRate: number, eurRate: number) => {
  return useMemo(() => {
    if (!product) return null;

    // ============================================================
    // 🔥 NUEVO: Si el producto trae `_pricing` del backend, usarlo
    // ============================================================
    if (product?._pricing && typeof product._pricing === 'object') {
      const mapped = mapPricingToIvaInfo(product._pricing);
      if (mapped) {
        // Recalcular EUR desde el USD (el backend no lo devuelve)
        mapped.priceWithIVAEur = mapped.priceWithIVAUsd > 0 && eurRate > 0
          ? Math.round((mapped.priceWithIVAUsd) / eurRate * 100) / 100
          : 0;
        return mapped;
      }
    }

    // ✅ FUNCIÓN CORREGIDA - SOLO USA PRECIOS EXPLÍCITOS
    const getProductPriceVes = (item: any): number => {
      if (!item) return 0;
      
      // Buscar VES explícito
      if (item.priceVes && Number(item.priceVes) > 0) {
        return Number(item.priceVes);
      }
      if (item.prices?.VES && Number(item.prices.VES) > 0) {
        return Number(item.prices.VES);
      }
      if (item.attributes?.prices?.VES && Number(item.attributes.prices.VES) > 0) {
        return Number(item.attributes.prices.VES);
      }
      
      // Si solo tiene price, detectar si es VES
      if (item.price && Number(item.price) > 0) {
        const price = Number(item.price);
        const hasExplicitUsd = !!(item.priceUsd || item.prices?.USD || item.attributes?.prices?.USD);
        const hasExplicitVes = !!(item.priceVes || item.prices?.VES || item.attributes?.prices?.VES);
        
        // Si tiene USD explícito, NO tiene VES
        if (hasExplicitUsd && !hasExplicitVes) {
          return 0; // No hay VES disponible
        }
        
        // Si parece VES (precio > 1000) o tiene VES explícito
        if (hasExplicitVes || price > 1000) {
          return price;
        }
        
        // Si es < 1000 y no tiene VES explícito, asumir USD
        return 0;
      }
      
      return 0;
    };

    // ✅ FUNCIÓN CORREGIDA - SOLO USA PRECIOS EXPLÍCITOS
    const getProductPriceUsd = (item: any): number => {
      if (!item) return 0;
      
      // Buscar USD explícito
      if (item.priceUsd && Number(item.priceUsd) > 0) {
        return Number(item.priceUsd);
      }
      if (item.prices?.USD && Number(item.prices.USD) > 0) {
        return Number(item.prices.USD);
      }
      if (item.attributes?.prices?.USD && Number(item.attributes.prices.USD) > 0) {
        return Number(item.attributes.prices.USD);
      }
      
      // Si solo tiene price, detectar si es USD
      if (item.price && Number(item.price) > 0) {
        const price = Number(item.price);
        const hasExplicitUsd = !!(item.priceUsd || item.prices?.USD || item.attributes?.prices?.USD);
        const hasExplicitVes = !!(item.priceVes || item.prices?.VES || item.attributes?.prices?.VES);
        
        // Si tiene VES explícito, NO tiene USD
        if (hasExplicitVes && !hasExplicitUsd) {
          return 0; // No hay USD disponible
        }
        
        // Si parece USD (precio < 1000) o tiene USD explícito
        if (hasExplicitUsd || price < 1000) {
          return price;
        }
        
        // Si es > 1000 y no tiene USD explícito, asumir VES
        return 0;
      }
      
      return 0;
    };

    // ✅ CALCULAR DESCUENTO (si aplica)
    const getDiscountedPrice = (item: any) => {
      if (!item) return null;
      
      const isOnSale = item?.onSale === true || item?.attributes?.onSale === true;
      let discountPercentage = Number(item?.discountPercentage || item?.attributes?.discountPercentage || 0);
      discountPercentage = Math.min(100, Math.max(0, discountPercentage));
      
      if (!isOnSale || discountPercentage === 0) {
        return null;
      }
      
      const originalPriceVes = getProductPriceVes(item);
      const originalPriceUsd = getProductPriceUsd(item);
      
      // Si no hay precios, retornar null
      if (originalPriceVes === 0 && originalPriceUsd === 0) {
        return null;
      }
      
      const discountedPriceVes = originalPriceVes * (1 - discountPercentage / 100);
      const discountedPriceUsd = originalPriceUsd * (1 - discountPercentage / 100);
      
      return {
        discountPercentage,
        originalPriceVes: Math.round(originalPriceVes * 100) / 100,
        originalPriceUsd: Math.round(originalPriceUsd * 100) / 100,
        discountedPriceVes: Math.round(discountedPriceVes * 100) / 100,
        discountedPriceUsd: Math.round(discountedPriceUsd * 100) / 100,
        savingVes: Math.round((originalPriceVes - discountedPriceVes) * 100) / 100,
        savingUsd: Math.round((originalPriceUsd - discountedPriceUsd) * 100) / 100,
      };
    };

    const discountInfo = getDiscountedPrice(product);
    
    // Obtener precios base
    let rawPriceVes = getProductPriceVes(product);
    let rawPriceUsd = getProductPriceUsd(product);
    
    // Aplicar descuento si existe
    if (discountInfo) {
      rawPriceVes = discountInfo.discountedPriceVes;
      rawPriceUsd = discountInfo.discountedPriceUsd;
    }
    
    // Calcular IVA
    const ivaType = product?.ivaType || product?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(product?.ivaRate || product?.attributes?.ivaRate || 16);
    
    let basePriceVes = 0;
    let basePriceUsd = 0;
    let ivaAmountVes = 0;
    let ivaAmountUsd = 0;
    let priceWithIVAVes = 0;
    let priceWithIVAUsd = 0;
    
    if (ivaType === 'excluded') {
      // IVA NO incluido: se suma al precio base
      basePriceVes = rawPriceVes;
      basePriceUsd = rawPriceUsd;
      ivaAmountVes = basePriceVes * (ivaRate / 100);
      ivaAmountUsd = basePriceUsd * (ivaRate / 100);
      priceWithIVAVes = basePriceVes + ivaAmountVes;
      priceWithIVAUsd = basePriceUsd + ivaAmountUsd;
    } else if (ivaType === 'included') {
      // IVA YA incluido: extraer la base
      priceWithIVAVes = rawPriceVes;
      priceWithIVAUsd = rawPriceUsd;
      basePriceVes = priceWithIVAVes / (1 + ivaRate / 100);
      basePriceUsd = priceWithIVAUsd / (1 + ivaRate / 100);
      ivaAmountVes = priceWithIVAVes - basePriceVes;
      ivaAmountUsd = priceWithIVAUsd - basePriceUsd;
    } else {
      // Exento de IVA
      basePriceVes = rawPriceVes;
      basePriceUsd = rawPriceUsd;
      ivaAmountVes = 0;
      ivaAmountUsd = 0;
      priceWithIVAVes = basePriceVes;
      priceWithIVAUsd = basePriceUsd;
    }
    
    return {
      ivaType,
      ivaRate,
      basePriceVes: Math.round(basePriceVes * 100) / 100,
      basePriceUsd: Math.round(basePriceUsd * 100) / 100,
      ivaAmountVes: Math.round(ivaAmountVes * 100) / 100,
      ivaAmountUsd: Math.round(ivaAmountUsd * 100) / 100,
      priceWithIVAVes: Math.round(priceWithIVAVes * 100) / 100,
      priceWithIVAUsd: Math.round(priceWithIVAUsd * 100) / 100,
      // ✅ EUR solo se calcula desde USD (NO desde VES)
priceWithIVAEur: priceWithIVAUsd > 0 ? Math.round((priceWithIVAUsd) / eurRate * 100) / 100 : 0,
      discountInfo,
    };
  }, [product, exchangeRate, eurRate]);
};

// ✅ COMPONENTE DE CHAT LAZY LOAD (SOLO CARGA CUANDO SE ACTIVA)
const ChatSection = memo(({
  isAuthenticated,
  chatMessages,
  messageInput,
  setMessageInput,
  isSending,
  handleSendMessage,
  handleStartChat,
  isChatStarted,
  primary,
  textStyle,
  mutedTextStyle,
  borderDynamic,
  dynamicSubCardStyle,
  textMutedClass,
  isLoadingChat,
  hasActiveConversation,
  onViewFullChat,
}: any) => {
  // Si no hay conversación activa y no está autenticado, mostrar versión ligera
  if (!isAuthenticated) {
    return (
      <div className="pt-4 border-t space-y-3" style={{ borderColor: borderDynamic }}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-extrabold uppercase tracking-wide`} style={textStyle}>
            Preguntas sobre el producto
          </span>
          <span className={`text-[10px] opacity-70 ${textMutedClass}`}>
            Inicia sesión
          </span>
        </div>
        <div 
          className="rounded-2xl border p-4 flex items-center justify-center h-20"
          style={dynamicSubCardStyle}
        >
          <p className={`text-xs ${textMutedClass}`}>Inicia sesión para chatear con la tienda</p>
        </div>
      </div>
    );
  }

  // Si no hay conversación activa, mostrar versión con botón "Iniciar conversación"
  if (!hasActiveConversation && !isChatStarted) {
    return (
      <div className="pt-4 border-t space-y-3" style={{ borderColor: borderDynamic }}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-extrabold uppercase tracking-wide`} style={textStyle}>
            Preguntas sobre el producto
          </span>
          <span className={`text-[10px] opacity-70 ${textMutedClass}`}>
            Chatea con la tienda
          </span>
        </div>
        <div 
          className="rounded-2xl border p-4 flex flex-col items-center justify-center h-32 gap-3"
          style={dynamicSubCardStyle}
        >
          <p className={`text-xs text-center ${textMutedClass}`}>
            ¿Tienes dudas sobre este producto?
          </p>
          <button
            type="button"
            onClick={handleStartChat}
            className="w-full max-w-xs py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: primary }}
            disabled={isLoadingChat}
          >
            {isLoadingChat ? 'Cargando...' : 'Iniciar conversación'}
          </button>
        </div>
      </div>
    );
  }

  // ✅ VERSIÓN COMPLETA DEL CHAT (SOLO CUANDO HAY CONVERSACIÓN ACTIVA)
  return (
    <div className="pt-4 border-t space-y-3" style={{ borderColor: borderDynamic }}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-extrabold uppercase tracking-wide`} style={textStyle}>
          Conversación con la tienda
        </span>
        <button
          type="button"
          onClick={onViewFullChat}
          className={`text-[10px] font-medium underline-offset-2 hover:underline ${textMutedClass}`}
        >
          Ver conversación completa →
        </button>
      </div>

      <div 
        className="rounded-2xl border p-3 flex flex-col h-56 overflow-hidden shadow-inner"
        style={dynamicSubCardStyle}
      >
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className={`text-xs ${textMutedClass}`}>No hay mensajes aún</p>
            </div>
          ) : (
            chatMessages.slice(-5).map((msg: any, index: number) => (
              <div 
                key={index}
                className={`p-2.5 rounded-2xl max-w-[90%] border ${
                  msg.sender === 'user' 
                    ? 'ml-auto bg-blue-600/20 border-blue-500/30 text-right' 
                    : 'mr-auto bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5'
                }`}
              >
                <p style={textStyle}>{msg.text}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="mt-2 flex items-center gap-2 pt-2 border-t" style={{ borderColor: borderDynamic }}>
          <input 
            type="text" 
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Escribe tu consulta..."
            className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-xs focus:outline-none"
            style={{ ...textStyle, borderColor: borderDynamic }}
          />
          <button 
            type="submit"
            disabled={!messageInput.trim() || isSending}
            className={`px-3 py-2 rounded-xl text-white text-xs font-bold transition shadow-sm ${!messageInput.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            style={{ backgroundColor: primary }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
});

ChatSection.displayName = 'ChatSection';

// ✅ COMPONENTE DE ZOOM MODAL (MEMOIZADO)
const ZoomModal = memo(({ isOpen, imageUrl, onClose }: any) => {
  if (!isOpen || !imageUrl) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 animate-in fade-in" onClick={onClose}>
            <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
        <button 
          type="button" 
          onClick={onClose} 
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
        >
          ✕
        </button>
        <Image
          src={imageUrl}
          alt="Zoom Imagen Ampliada"
          width={1200}
          height={1200}
          className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-3xl shadow-2xl border border-white/10"
          quality={90}
        />
              </div>
    </div>,
    document.body
  );
});

ZoomModal.displayName = 'ZoomModal';

// ============================================================
// 🔥 MAPPER: convierte `_pricing` del backend al formato del componente
// ============================================================
const mapPricingToIvaInfo = (pricing: any) => {
  if (!pricing || typeof pricing !== 'object') return null;

  const ivaType = pricing.ivaType || 'excluded';
  const ivaRate = Number(pricing.ivaRate || 0);

  const discountInfo = pricing.hasDiscount
    ? {
        discountPercentage: pricing.discountPercentage || 0,
        originalPriceVes: pricing.originalPriceVES || 0,
        originalPriceUsd: pricing.originalPriceUSD || 0,
        discountedPriceVes: pricing.totalPriceVES || 0,
        discountedPriceUsd: pricing.totalPriceUSD || 0,
        savingVes: pricing.discountAmountVES || 0,
        savingUsd: pricing.discountAmountUSD || 0,
      }
    : null;

  return {
    ivaType,
    ivaRate,
    basePriceVes: pricing.basePriceVES || 0,
    basePriceUsd: pricing.basePriceUSD || 0,
    ivaAmountVes: pricing.taxAmountVES || 0,
    ivaAmountUsd: pricing.taxAmountUSD || 0,
    priceWithIVAVes: pricing.totalPriceVES || 0,
    priceWithIVAUsd: pricing.totalPriceUSD || 0,
    priceWithIVAEur: 0, // se calcula en el hook si hace falta
    discountInfo,
    _pricingSource: 'backend',
  };
};


// ✅ COMPONENTE PRINCIPAL
export default React.memo(function ProductDetailModal({
  isOpen,
  onClose,
  product,
  tenant,
  isSecondaryLight,
  textMainClass,
  textMutedClass,
  cardBgClass,
  cardInnerBgClass,
  primary,
  secondary,
  onAddToCart,
  cartQty = 0,
  isAuthenticated = false,
  userId,
}: ProductDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isZoomedModalOpen, setIsZoomedModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showReviews, setShowReviews] = useState(false);
  const [shouldLoadChat, setShouldLoadChat] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [hasActiveConversation, setHasActiveConversation] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const { rates, loading: ratesLoading } = useExchangeRateContext();
  
  // ✅ MEMOIZAR TASA DE CAMBIO
  const exchangeRate = useMemo(() => (rates.USD > 0 ? rates.USD : 1), [rates.USD]);
  const eurRate = useMemo(() => (rates.EUR > 0 ? rates.EUR / exchangeRate : 1.1674), [rates.EUR, exchangeRate]);

  // ✅ HOOK DE CHAT - SOLO SE EJECUTA CUANDO EL USUARIO QUIERE CHATEAR
  const { sendMessage: sendChatMessage, messages: serverMessages, openChat, conversationId } = useStoreChat(
    shouldLoadChat && isOpen ? (tenant?.id || '') : '',
    shouldLoadChat && isOpen ? (product?.id || '') : ''
  );
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'store'; text: string }>>([]);

  // ✅ USAR HOOK DE PRECIOS
  const ivaInfo = useProductPrices(product, exchangeRate, eurRate);

  // ✅ MEMOIZAR IMÁGENES
  const allImages = useMemo(() => getImageUrls(product), [product]);
  const currentImg = useMemo(() => allImages[selectedImageIndex] || allImages[0] || getImageUrl(product), [allImages, selectedImageIndex, product]);

  // ✅ MEMOIZAR TAGS AGRUPADOS
  const groupedTags = useMemo(() => {
    if (!product?.features) return [];
    
    let featuresArray: string[] = [];
    try {
      featuresArray = typeof product.features === 'string' ? JSON.parse(product.features) : (Array.isArray(product.features) ? product.features : []);
    } catch (e) {
      featuresArray = [];
    }

    if (!Array.isArray(featuresArray) || featuresArray.length === 0) return [];

    const grouped: { category: string; label: string; tags: string[] }[] = [];
    
    Object.entries(PRODUCT_TAG_CATEGORIES).forEach(([key, cat]) => {
      const matchedTags = featuresArray.filter((tag: string) => cat.tags.includes(tag));
      if (matchedTags.length > 0) {
        grouped.push({
          category: key,
          label: cat.label,
          tags: matchedTags
        });
      }
    });

    return grouped;
  }, [product?.features]);

  // ✅ MEMOIZAR ATRIBUTOS PARSED
  const parsedAttributes = useMemo(() => {
    try {
      return typeof product?.attributes === 'string' ? JSON.parse(product.attributes) : (product?.attributes || {});
    } catch (e) {
      return {};
    }
  }, [product?.attributes]);

  const maxStock = useMemo(() => product?.stock ?? 999, [product?.stock]);

  // ✅ FORMAT PRICE MEMOIZADO
  const formatPrice = useCallback((num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value) || value === 0) return '0,00';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  // ✅ MEMOIZAR ESTILOS DINÁMICOS
  const borderDynamic = useMemo(() => isSecondaryLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)', [isSecondaryLight]);
  const priceColors = useMemo(
    () => getPriceColors({ primary, isDarkBg: !isSecondaryLight }),
    [primary, isSecondaryLight],
  );
  const priceColor = priceColors.foreign;

  const containerStyle = useMemo(() => ({ 
    backgroundColor: secondary || (isSecondaryLight ? '#ffffff' : '#0f172a'), 
    borderColor: borderDynamic, 
  }), [secondary, isSecondaryLight, borderDynamic]);
  
  const dynamicSubCardStyle = useMemo(() => ({
    backgroundColor: isSecondaryLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: borderDynamic,
  }), [isSecondaryLight, borderDynamic]);

  const textStyle = useMemo(() => ({
    color: isSecondaryLight ? '#1e293b' : '#e2e8f0',
  }), [isSecondaryLight]);

  const mutedTextStyle = useMemo(() => ({
    color: isSecondaryLight ? '#475569' : '#94a3b8',
  }), [isSecondaryLight]);

  // ✅ MONTAJE
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // ✅ RESET ESTADOS AL ABRIR (OPTIMIZADO)
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setQuantity(1);
      setMessageInput('');
      setShowReviews(false);  // ← Resetear reviews al abrir
      setShouldLoadChat(false);  // ← Resetear chat al abrir
      
      // ✅ SOLO VERIFICAR SI HAY CONVERSACIÓN ACTIVA, NO CARGAR MENSAJES
      const checkConversation = async () => {
        if (isAuthenticated && product?.id && tenant?.id) {
          setIsLoadingChat(true);
          try {
            // Aquí podrías hacer un fetch para verificar si hay conversación
            // Simulamos que no hay conversación activa por defecto
            setHasActiveConversation(false);
            setIsChatStarted(false);
          } catch (error) {
            console.error('Error checking conversation:', error);
          } finally {
            setIsLoadingChat(false);
          }
        }
      };
      
      checkConversation();
    }
  }, [isOpen, product?.id, product?.name, isAuthenticated, tenant?.id]);

  // ✅ SINCRONIZAR MENSAJES DEL SERVIDOR (SOLO SI HAY CONVERSACIÓN ACTIVA)
  useEffect(() => {
    if (hasActiveConversation && serverMessages.length > 0) {
      const serverFormatted = serverMessages.map((msg: any) => ({
        sender: msg.sender?.id === userId ? 'user' : 'store',
        text: msg.content,
      }));
      
      setChatMessages(prev => {
        if (JSON.stringify(prev) === JSON.stringify(serverFormatted)) {
          return prev;
        }
        return serverFormatted;
      });
    }
  }, [serverMessages, userId, hasActiveConversation]);

  // ✅ HANDLERS MEMOIZADOS
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!isAuthenticated || !hasActiveConversation) {
      return;
    }

    if (!messageInput.trim() || isSending) return;

    const userText = messageInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setMessageInput('');
    setIsSending(true);

    try {
      await sendChatMessage(userText);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setChatMessages(prev => [
        ...prev,
        { sender: 'store', text: 'Error al enviar el mensaje. Intenta nuevamente.' }
      ]);
    } finally {
      setIsSending(false);
    }
  }, [isAuthenticated, hasActiveConversation, messageInput, isSending, sendChatMessage]);

  const handleStartChat = useCallback(() => {
    setIsLoadingChat(true);
    setShouldLoadChat(true);  // ← Activar carga del chat
    try {
      openChat();
      setIsChatStarted(true);
      setHasActiveConversation(true);
      setChatMessages([
        { sender: 'store', text: 'Conversación iniciada. Pregunta lo que necesites.' }
      ]);
    } catch (error) {
      console.error('Error al iniciar chat:', error);
    } finally {
      setIsLoadingChat(false);
    }
  }, [openChat]);

  const handleViewFullChat = useCallback(() => {
    // Aquí podrías navegar a una página de chat completa o abrir un panel dedicado
    console.log('Abrir panel completo de conversación');
    // onOpenFullChat(); // Podrías pasar esta función como prop
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleAddToCart = useCallback(() => {
    if (onAddToCart && product) {
      onAddToCart(product.id || product._id, quantity, maxStock);
      onClose();
    }
  }, [onAddToCart, product, quantity, maxStock, onClose]);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity(prev => {
      const newQty = prev + delta;
      return Math.max(1, Math.min(maxStock, newQty));
    });
  }, [maxStock]);

  const handleImageSelect = useCallback((idx: number) => {
    setSelectedImageIndex(idx);
  }, []);

  // ✅ RENDERIZADO CONDICIONAL TEMPRANO
  if (!isOpen || !mounted || !product || !ivaInfo) return null;

  const {
    ivaType,
    ivaRate,
    basePriceVes,
    ivaAmountVes,
    priceWithIVAVes,
    priceWithIVAUsd,
    priceWithIVAEur,
  } = ivaInfo;

  return createPortal(
    <>
<div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 animate-in fade-in overflow-y-auto">
<div 
  className={`w-full max-w-5xl rounded-3xl border shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden ${textMainClass}`}
    style={{ ...containerStyle, willChange: 'transform' }}
>
          {/* Header - MEMOIZADO */}
          <MemoizedHeader
            tenant={tenant}
            product={product}
            primary={primary}
            textStyle={textStyle}
            borderDynamic={borderDynamic}
            dynamicSubCardStyle={dynamicSubCardStyle}
            textMainClass={textMainClass}
            onClose={handleClose}
          />

          {/* Contenido - MEMOIZADO */}
          <MemoizedContent
            product={product}
            ivaInfo={ivaInfo}
            allImages={allImages}
            currentImg={currentImg}
            selectedImageIndex={selectedImageIndex}
            isZoomedModalOpen={isZoomedModalOpen}
            setIsZoomedModalOpen={setIsZoomedModalOpen}
            groupedTags={groupedTags}
            parsedAttributes={parsedAttributes}
            maxStock={maxStock}
            quantity={quantity}
            priceWithIVAVes={priceWithIVAVes}
            priceWithIVAUsd={priceWithIVAUsd}
            priceWithIVAEur={priceWithIVAEur}
            ivaType={ivaType}
            ivaRate={ivaRate}
            basePriceVes={basePriceVes}
            ivaAmountVes={ivaAmountVes}
            formatPrice={formatPrice}
            handleQuantityChange={handleQuantityChange}
            handleAddToCart={handleAddToCart}
            handleImageSelect={handleImageSelect}
            onAddToCart={onAddToCart}
            isSecondaryLight={isSecondaryLight}
            
            primary={primary}
            priceColor={priceColor}
            priceColors={priceColors}
            textStyle={textStyle}
            mutedTextStyle={mutedTextStyle}
            borderDynamic={borderDynamic}
            dynamicSubCardStyle={dynamicSubCardStyle}
            textMutedClass={textMutedClass}
            // Chat props
            isAuthenticated={isAuthenticated}
            chatMessages={chatMessages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            isSending={isSending}
            handleSendMessage={handleSendMessage}
            handleStartChat={handleStartChat}
            isChatStarted={isChatStarted}
            hasActiveConversation={hasActiveConversation}
            isLoadingChat={isLoadingChat}
            handleViewFullChat={handleViewFullChat}
            // 🔥 Reviews props
            showReviews={showReviews}
            setShowReviews={setShowReviews}
            tenant={tenant}
            userId={userId}
          />
        </div>
      </div>

      {/* Zoom Modal - MEMOIZADO */}
      <ZoomModal
        isOpen={isZoomedModalOpen}
        imageUrl={currentImg}
        onClose={() => setIsZoomedModalOpen(false)}
      />
    </>,
    document.body
  );
}, (prevProps, nextProps) => {
  // 🔥 React.memo custom: solo re-renderizar si estas props cambian
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.product?.id === nextProps.product?.id &&
    prevProps.tenant?.id === nextProps.tenant?.id &&
    prevProps.primary === nextProps.primary &&
    prevProps.secondary === nextProps.secondary &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    prevProps.userId === nextProps.userId
  );
});

// ✅ COMPONENTES SUB-MEMOIZADOS
const MemoizedHeader = memo(({ tenant, product, primary, textStyle, borderDynamic, dynamicSubCardStyle, textMainClass, onClose }: any) => (
  <div 
    className="px-6 py-4 border-b flex items-center justify-between shrink-0"
    style={{ borderColor: borderDynamic, backgroundColor: 'rgba(255,255,255,0.01)' }}
  >
    <div>
      <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: primary }}>Detalle del Producto</span>
      <h3 className={`text-sm sm:text-base font-bold`} style={textStyle}>{tenant?.name || 'Tienda Virtual'} - {product.name}</h3>
    </div>
    <button 
      type="button" 
      onClick={onClose} 
      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform cursor-pointer border hover:scale-105 active:scale-95 ${textMainClass}`}
            style={dynamicSubCardStyle}
    >
      ✕
    </button>
  </div>
));

MemoizedHeader.displayName = 'MemoizedHeader';

// ✅ CONTENIDO PRINCIPAL MEMOIZADO
const MemoizedContent = memo(({
  product,
  ivaInfo,
  allImages,
  currentImg,
  selectedImageIndex,
  isZoomedModalOpen,
  setIsZoomedModalOpen,
  groupedTags,
  parsedAttributes,
  maxStock,
  quantity,
  priceWithIVAVes,
  priceWithIVAUsd,
  priceWithIVAEur,
  ivaType,
  ivaRate,
  basePriceVes,
  ivaAmountVes,
  formatPrice,
  handleQuantityChange,
  handleAddToCart,
  handleImageSelect,
  onAddToCart,
  isSecondaryLight,
  primary,
  priceColor,
  priceColors,
  textStyle,
  mutedTextStyle,
  borderDynamic,
  dynamicSubCardStyle,
  textMutedClass,
  // Chat props
  isAuthenticated,
  chatMessages,
  messageInput,
  setMessageInput,
  isSending,
  handleSendMessage,
  handleStartChat,
  isChatStarted,
  hasActiveConversation,
  isLoadingChat,
  handleViewFullChat,
  // 🔥 Reviews props
  showReviews,
  setShowReviews,
  tenant,
  userId,
}: any) => (
<div 
  className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1"
  style={{ contain: 'layout paint' }}
>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      
      {/* Columna Izquierda */}
      <div className="md:col-span-5 space-y-4">
        <MemoizedImageGallery
          currentImg={currentImg}
          product={product}
          ivaInfo={ivaInfo}
          allImages={allImages}
          selectedImageIndex={selectedImageIndex}
          isZoomedModalOpen={isZoomedModalOpen}
          setIsZoomedModalOpen={setIsZoomedModalOpen}
          handleImageSelect={handleImageSelect}
          isSecondaryLight={isSecondaryLight}
          textMutedClass={textMutedClass}
          dynamicSubCardStyle={dynamicSubCardStyle}
          borderDynamic={borderDynamic}
        />

        {/* Chat Section - LAZY LOAD */}
        <ChatSection
          isAuthenticated={isAuthenticated}
          chatMessages={chatMessages}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          isSending={isSending}
          handleSendMessage={handleSendMessage}
          handleStartChat={handleStartChat}
          isChatStarted={isChatStarted}
          hasActiveConversation={hasActiveConversation}
          isLoadingChat={isLoadingChat}
          onViewFullChat={handleViewFullChat}
          primary={primary}
          textStyle={textStyle}
          mutedTextStyle={mutedTextStyle}
          borderDynamic={borderDynamic}
          dynamicSubCardStyle={dynamicSubCardStyle}
          textMutedClass={textMutedClass}
        />
      </div>

      {/* Columna Derecha */}
      <div className="md:col-span-7 space-y-5">
        <MemoizedProductInfo
          product={product}
          ivaInfo={ivaInfo}
          parsedAttributes={parsedAttributes}
          groupedTags={groupedTags}
          maxStock={maxStock}
          quantity={quantity}
          priceWithIVAVes={priceWithIVAVes}
          priceWithIVAUsd={priceWithIVAUsd}
          priceWithIVAEur={priceWithIVAEur}
          ivaType={ivaType}
          ivaRate={ivaRate}
          basePriceVes={basePriceVes}
          ivaAmountVes={ivaAmountVes}
          formatPrice={formatPrice}
          handleQuantityChange={handleQuantityChange}
          handleAddToCart={handleAddToCart}
          onAddToCart={onAddToCart}
          isSecondaryLight={isSecondaryLight}
          primary={primary}
          priceColor={priceColor}
          priceColors={priceColors}
          textStyle={textStyle}
          mutedTextStyle={mutedTextStyle}
          borderDynamic={borderDynamic}
          dynamicSubCardStyle={dynamicSubCardStyle}
          textMutedClass={textMutedClass}
        />

        {/* 🔥 SECCIÓN DE RESEÑAS — LAZY LOAD */}
        {tenant?.id && product?.id && (
          <>
            {showReviews ? (
              <ItemReviewsSection
                tenantId={tenant?.id || tenant?._id || ''}
                itemId={product?.id || product?._id || ''}
                itemType="product"
                primary={primary}
                isSecondaryLight={isSecondaryLight}
                isAuthenticated={isAuthenticated}
                userId={userId}
                inlineLimit={3}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowReviews(true)}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold transition hover:opacity-80 border text-center"
                style={{
                  borderColor: borderDynamic,
                  color: primary,
                  backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                }}
              >
                Ver reseñas y opiniones →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  </div>
));

MemoizedContent.displayName = 'MemoizedContent';

// ✅ COMPONENTE DE GALERÍA DE IMÁGENES MEMOIZADO
const MemoizedImageGallery = memo(({
  currentImg,
  product,
  ivaInfo,
  allImages,
  selectedImageIndex,
  setIsZoomedModalOpen,
  handleImageSelect,
  isSecondaryLight,
  textMutedClass,
  dynamicSubCardStyle,
  borderDynamic,
    primary, // ✅ DEBE ESTAR AQUÍ

}: any) => (
  <>
    <div 
      className="aspect-square rounded-3xl border overflow-hidden flex items-center justify-center relative group cursor-zoom-in shadow-inner"
      style={dynamicSubCardStyle}
      onClick={() => currentImg && setIsZoomedModalOpen(true)}
    >
      {currentImg ? (
        <>
<Image
  src={currentImg}
  alt={product.name || 'Imagen del producto'}
  fill
  sizes="(max-width: 640px) 100vw, 40vw"
  className="object-cover transition-transform duration-500 group-hover:scale-105"
  priority
  quality={80}
  onError={(e) => {
    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Error+Carga+Imagen';
  }}
/>
          {ivaInfo.discountInfo && (
            <div className="absolute top-3 right-3 z-10">
              <span 
                className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border animate-pulse"
                style={{
                  backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.9)' : 'rgba(239,68,68,0.85)',
                  color: '#ffffff',
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
              >
                -{ivaInfo.discountInfo.discountPercentage}% OFF
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/80 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 shadow-lg">
              Clic para ampliar
            </span>
          </div>
        </>
      ) : (
        <span className={`text-xs opacity-40 text-center px-4 ${textMutedClass}`}>
          Sin imagen disponible
        </span>
      )}
    </div>

    {allImages.length > 1 && (
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
        {allImages.map((imgUrl: string, idx: number) => {
          const isSelected = idx === selectedImageIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleImageSelect(idx)}
              className={`w-16 h-16 rounded-2xl shrink-0 relative cursor-pointer transition-all duration-200 p-0 ${
                isSelected
                  ? 'ring-2 shadow-md scale-105'
                  : 'opacity-60 hover:opacity-100 border'
              }`}
              style={{
                borderColor: isSelected ? 'transparent' : borderDynamic,
                ['--tw-ring-color' as any]: isSelected ? primary : undefined,
              } as React.CSSProperties}
            >
              <div className="w-full h-full rounded-2xl overflow-hidden">
                <Image
                  src={imgUrl}
                  alt={`Miniatura ${idx + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  quality={70}
                />
              </div>
            </button>
          );
        })}
      </div>
    )}
  </>
));

MemoizedImageGallery.displayName = 'MemoizedImageGallery';

// ✅ COMPONENTE DE INFORMACIÓN DEL PRODUCTO MEMOIZADO
const MemoizedProductInfo = memo(({
  product,
  ivaInfo,
  parsedAttributes,
  groupedTags,
  maxStock,
  quantity,
  priceWithIVAVes,
  priceWithIVAUsd,
  priceWithIVAEur,
  ivaType,
  ivaRate,
  basePriceVes,
  ivaAmountVes,
  formatPrice,
  handleQuantityChange,
  handleAddToCart,
  onAddToCart,
  isSecondaryLight,
  primary,
  priceColor,
  priceColors,
  textStyle,
  mutedTextStyle,
  borderDynamic,
  dynamicSubCardStyle,
  textMutedClass,
}: any) => (
  <div className="space-y-3">
<div className="flex items-center gap-2 flex-wrap">
  <span className={`px-3 py-1 rounded-xl text-[10px] font-bold border uppercase tracking-wider ${textMutedClass}`} style={dynamicSubCardStyle}>
    {product.category || 'General'}
  </span>
  {product.brand && (
    <span className="px-3 py-1 rounded-xl text-[10px] font-extrabold text-white shadow-xs" style={{ backgroundColor: primary }}>
      {product.brand}
    </span>
  )}
  {ivaType !== 'exempt' && (
    <span 
      className={`px-2 py-0.5 rounded-lg text-[9px] font-medium border ${
        ivaType === 'included' 
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      }`}
    >
      {ivaType === 'included' ? `IVA Incluido (${ivaRate}%)` : `IVA No Incluido (${ivaRate}%)`}
    </span>
  )}
  {ivaType === 'exempt' && (
    <span className="px-2 py-0.5 rounded-lg text-[9px] font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">
      Exento de IVA
    </span>
  )}
</div>

    <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight break-words`} style={textStyle}>
      {product.name}
    </h1>
    
    {/* Precios */}
    <div className="pt-1">
      <div className="flex items-center justify-between">
        <span className={`text-[9px] uppercase font-bold tracking-wider`} style={mutedTextStyle}>
          PRECIO FINAL
        </span>
        {ivaInfo.discountInfo && (
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-bold animate-pulse"
            style={{
              backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
              color: isSecondaryLight ? '#991b1b' : '#f87171',
            }}
          >
            -{ivaInfo.discountInfo.discountPercentage}% OFF
          </span>
        )}
      </div>
      
      {ivaInfo.discountInfo ? (
        <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
          <span className="text-sm line-through opacity-50" style={mutedTextStyle}>
            Bs. {formatPrice(ivaInfo.discountInfo.originalPriceVes)}
          </span>
<span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: primary }}>
  Bs. {formatPrice(ivaInfo.priceWithIVAVes)}
</span>
          <span className={`text-xs font-medium opacity-70 ${textMutedClass}`}>
            {ivaInfo.ivaType === 'included' ? 'IVA Incluido' : ivaInfo.ivaType === 'exempt' ? 'Exento' : `+ ${ivaInfo.ivaRate}% IVA`}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
          <span className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: primary }}>
            Bs. {formatPrice(ivaInfo.priceWithIVAVes)}
          </span>
          <span className={`text-xs font-medium opacity-70 ${textMutedClass}`}>
            {ivaInfo.ivaType === 'included' ? 'IVA Incluido' : ivaInfo.ivaType === 'exempt' ? 'Exento' : `+ ${ivaInfo.ivaRate}% IVA`}
          </span>
        </div>
      )}
      
      <div className="mt-2 p-3 rounded-xl border bg-transparent" style={{ borderColor: borderDynamic }}>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span style={mutedTextStyle}>Precio base (sin IVA):</span>
            <span style={textStyle}>Bs. {formatPrice(ivaInfo.basePriceVes)}</span>
          </div>
          
          {ivaInfo.ivaType !== 'exempt' && ivaInfo.ivaRate > 0 && (
            <div className="flex items-center justify-between">
<span style={mutedTextStyle}>IVA ({ivaInfo.ivaRate}%):</span>
<span style={textStyle}>
  {ivaInfo.ivaType === 'included' ? `Bs. ${formatPrice(ivaInfo.ivaAmountVes)} (incluido)` : `Bs. ${formatPrice(ivaInfo.ivaAmountVes)}`}
</span>
            </div>
          )}
          
          {ivaInfo.discountInfo && ivaInfo.discountInfo.savingVes > 0 && (
            <div className="flex items-center justify-between text-emerald-500 font-medium">
              <span>Ahorro:</span>
              <span>Bs. {formatPrice(ivaInfo.discountInfo.savingVes)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between font-bold pt-1 border-t" style={{ borderColor: borderDynamic }}>
            <span style={textStyle}>Total con IVA:</span>
            <span style={{ color: primary }}>Bs. {formatPrice(ivaInfo.priceWithIVAVes)}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Precios de referencia */}
    <div className="space-y-1.5 pt-1">
      <span className={`text-[10px] uppercase font-bold tracking-wider block`} style={mutedTextStyle}>
        Precios de referencia (con IVA)
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs" style={dynamicSubCardStyle}>
          <span className={`text-[10px] uppercase font-bold`} style={{ color: priceColors.foreignMuted }}>USD:</span>
          <span className="font-black" style={{ color: priceColors.foreign }}>${formatPrice(priceWithIVAUsd)}</span>
        </div>
        <div className="px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs" style={dynamicSubCardStyle}>
          <span className={`text-[10px] uppercase font-bold`} style={{ color: priceColors.foreignMuted }}>EUR:</span>
          <span className="font-black" style={{ color: priceColors.foreign }}>€{formatPrice(priceWithIVAEur)}</span>
        </div>
        <div className="px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs" style={dynamicSubCardStyle}>
          <span className={`text-[10px] uppercase font-bold`} style={{ color: priceColors.foreignMuted }}>USDT:</span>
          <span className="font-black" style={{ color: priceColors.foreign }}>${formatPrice(priceWithIVAUsd)}</span>
        </div>
      </div>
    </div>

    <div className={`text-xs pt-3 border-t space-y-2`} style={{ ...textStyle, borderColor: borderDynamic }}>
      <p><strong style={textStyle}>Disponibilidad (Stock):</strong> <span style={textStyle}>{maxStock} unidades</span></p>
      {product.warranty && <p><strong style={textStyle}>Garantía:</strong> <span style={textStyle}>{product.warranty}</span></p>}
      {product.dimensions && <p><strong style={textStyle}>Dimensiones:</strong> <span style={textStyle}>{product.dimensions}</span></p>}
      {parsedAttributes.weight && <p><strong style={textStyle}>Peso:</strong> <span style={textStyle}>{parsedAttributes.weight}</span></p>}
    </div>

    {/* Tags agrupados */}
    {groupedTags.length > 0 && (
      <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
        <span className={`text-xs font-extrabold uppercase tracking-wide`} style={textStyle}>
          Características del Producto
        </span>
        {groupedTags.map((group: any) => (
          <div key={group.category} className="space-y-1.5">
            <span className={`text-[10px] font-medium block`} style={mutedTextStyle}>
              {group.label}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag: string) => (
                <span
                  key={tag}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-medium border`}
                  style={{
                    backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                    borderColor: isSecondaryLight ? '#cbd5e1' : '#475569',
                    color: isSecondaryLight ? '#1e293b' : '#e2e8f0',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Descripción */}
    {product.description && (
      <div className="space-y-2 pt-4 border-t" style={{ borderColor: borderDynamic }}>
        <span className={`text-xs font-extrabold uppercase tracking-wide`} style={textStyle}>Descripción:</span>
        <p className={`text-xs leading-relaxed whitespace-pre-line`} style={textStyle}>
          {product.description}
        </p>
      </div>
    )}

    {/* Botón de compra */}
    {onAddToCart && (
      <div className="pt-5 border-t flex items-center gap-3 sm:gap-4" style={{ borderColor: borderDynamic }}>
        <div className="flex items-center border rounded-2xl overflow-hidden shrink-0 shadow-xs" style={dynamicSubCardStyle}>
          <button 
            type="button"
            onClick={() => handleQuantityChange(-1)}
            className={`px-3.5 py-3 text-xs font-bold hover:opacity-75 transition cursor-pointer`}
            style={textStyle}
          >
            -
          </button>
          <span className={`px-3 py-3 text-xs font-black`} style={textStyle}>{quantity}</span>
          <button 
            type="button"
            onClick={() => handleQuantityChange(1)}
            className={`px-3.5 py-3 text-xs font-bold hover:opacity-75 transition cursor-pointer`}
            style={textStyle}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 py-3.5 px-5 rounded-2xl text-white text-xs font-bold shadow-lg transition-transform cursor-pointer hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ backgroundColor: primary }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
          </svg>
          Añadir al Carrito (Bs. {formatPrice(priceWithIVAVes * quantity)})
        </button>
      </div>
    )}
  </div>
));

MemoizedProductInfo.displayName = 'MemoizedProductInfo';

// Tipado (mantén tu tipo existente)
interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  tenant: any;
  isSecondaryLight: boolean;
  textMainClass: string;
  textMutedClass: string;
  cardBgClass: string;
  cardInnerBgClass: string;
  primary: string;
  secondary: string;
  onAddToCart?: (productId: string, quantity: number, maxStock: number) => void;
  cartQty?: number;
  isAuthenticated?: boolean;
  userId?: string;
}