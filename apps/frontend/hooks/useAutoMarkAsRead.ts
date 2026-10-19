// frontend/hooks/useAutoMarkAsRead.ts
import { useEffect, useRef } from 'react';

/**
 * 🔥 Hook que marca una notificación como leída cuando entra al viewport
 * por N milisegundos (default: 2000ms). Estándar Slack/Vinted.
 */
export function useAutoMarkAsRead(
  ref: React.RefObject<HTMLElement | null>,
  isUnread: boolean,
  onMarkAsRead: () => void,
  delayMs: number = 2000
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!ref.current || !isUnread) return;

    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              onMarkAsRead();
            }, delayMs);
          } else {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }
        }
      },
      { threshold: 0.6 } // 60% visible
    );

    observer.observe(el);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      observer.disconnect();
    };
  }, [ref, isUnread, onMarkAsRead, delayMs]);
}