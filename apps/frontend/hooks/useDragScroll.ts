'use client';

import { useRef, useEffect, useCallback } from 'react';

interface UseDragScrollOptions {
  threshold?: number;
}

/**
 * Permite arrastrar un contenedor con overflow horizontal usando el mouse.
 * Usa listeners a nivel del contenedor con capture:true para interceptar el drag
 * antes que los hijos, y evita conflictos con clicks en botones.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseDragScrollOptions = {}
) {
  const { threshold = 5 } = options;
  const ref = useRef<T | null>(null);
  const state = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollStart: 0,
    moved: false,
    pointerId: -1,
  });

  const onPointerDown = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    state.current.isDown = true;
    state.current.startX = e.clientX;
    state.current.startY = e.clientY;
    state.current.scrollStart = el.scrollLeft;
    state.current.moved = false;
    state.current.pointerId = e.pointerId;
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el || !state.current.isDown) return;
    if (e.pointerId !== state.current.pointerId) return;

    const dx = e.clientX - state.current.startX;
    const dy = e.clientY - state.current.startY;

    // Si el movimiento vertical es mayor al horizontal, dejar al scroll de la página
    if (!state.current.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
      state.current.isDown = false;
      return;
    }

    if (!state.current.moved && Math.hypot(dx, dy) < threshold) return;

    if (!state.current.moved) {
      state.current.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    }

    el.scrollLeft = state.current.scrollStart - dx;
    e.preventDefault();
  }, [threshold]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (state.current.pointerId === e.pointerId) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    }
    state.current.isDown = false;
    state.current.pointerId = -1;
    el.style.cursor = '';
    el.style.userSelect = '';
    // Retrasar el reset de moved para que el clickCapture lo vea
    setTimeout(() => {
      state.current.moved = false;
    }, 0);
  }, []);

  const onClickCapture = useCallback((e: MouseEvent) => {
    if (state.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      state.current.moved = false;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('pointerdown', onPointerDown, true);
    el.addEventListener('pointermove', onPointerMove, true);
    el.addEventListener('pointerup', onPointerUp, true);
    el.addEventListener('pointercancel', onPointerUp, true);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown, true);
      el.removeEventListener('pointermove', onPointerMove, true);
      el.removeEventListener('pointerup', onPointerUp, true);
      el.removeEventListener('pointercancel', onPointerUp, true);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [onPointerDown, onPointerMove, onPointerUp, onClickCapture]);

  return ref;
}