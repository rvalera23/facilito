// ==========================================
// ARCHIVO: components/ScrollToTopButton.tsx (Optimizado)
// ==========================================
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function ScrollToTopButton({ 
  primary, 
  isPrimaryLight 
}: { 
  primary?: string; 
  isPrimaryLight?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ticking = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // 🔥 HANDLER OPTIMIZADO CON REQUESTANIMATIONFRAME
  const handleScroll = useCallback(() => {
    // Si ya hay una actualización pendiente, la saltamos
    if (ticking.current) {
      return;
    }

    // Usamos requestAnimationFrame para sincronizar con el refresco de la pantalla
    ticking.current = true;

    window.requestAnimationFrame(() => {
      const shouldBeVisible = window.scrollY > 300;
      
      // Solo actualizamos el estado si cambió
      setIsVisible(prev => {
        if (prev !== shouldBeVisible) {
          return shouldBeVisible;
        }
        return prev;
      });

      ticking.current = false;
    });
  }, []);

  // 🔥 HANDLER CON DEBOUNCE PARA CUANDO EL USUARIO DEJA DE SCROLLEAR
  const handleScrollWithDebounce = useCallback(() => {
    // Limpiamos el timeout anterior
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Ejecutamos el handler optimizado
    handleScroll();

    // Después de 150ms sin scroll, verificamos de nuevo
    scrollTimeout.current = setTimeout(() => {
      handleScroll();
    }, 150);
  }, [handleScroll]);

  useEffect(() => {
    // Usamos el handler con debounce
    window.addEventListener('scroll', handleScrollWithDebounce, { passive: true });
    
    // Verificamos la posición inicial
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScrollWithDebounce);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleScroll, handleScrollWithDebounce]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  const primaryColor = primary || 'var(--color-primary, #0ea5e9)';
  const textColor = isPrimaryLight ? '#030712' : '#ffffff';

  // ✅ MEMOIZAMOS LOS ESTILOS PARA EVITAR RECALCULOS
  const buttonStyles = {
    backgroundColor: primaryColor,
    color: textColor,
    boxShadow: `0 10px 25px -5px ${primaryColor}66`,
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Volver arriba"
      className={`fixed bottom-6 left-6 z-50 p-3 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer hover:scale-110 ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
      style={buttonStyles}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  );
}