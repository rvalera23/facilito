'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================
// 🔥 HOOK: useCartQuote
// ============================================================
// Llama al backend POST /cart/quote para obtener los totales
// reales del carrito, calculados por el PricingService.
//
// El frontend NO calcula nada. Solo muestra lo que el backend
// devuelve. Este hook es la ÚNICA fuente de verdad de precios.
//
// Uso:
//   const { quote, loading, error, refresh } = useCartQuote(items);
//
//   items: [{ productId, quantity }, ...]
//          o [{ serviceId, quantity, appointmentDate, appointmentTime }, ...]
//
// Reglas:
//   - Si items está vacío, NO llama al backend y devuelve quote=null.
//   - Debounce de 300ms para no saturar el backend.
//   - Cancelación de peticiones previas (AbortController).
// ============================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface QuoteItemInput {
  productId?: string;
  serviceId?: string;
  quantity: number;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface QuoteItemSnapshot {
  kind: 'product' | 'service';
  id: string;
  name: string;
  image?: string;
  sku?: string;
  quantity: number;

  basePriceUSD: number;
  basePriceVES: number;
  basePriceOriginalUSD: number;
  basePriceOriginalVES: number;

  hasDiscount: boolean;
  discountPercentage: number;
  discountAmountUSD: number;
  discountAmountVES: number;
  originalPriceUSD: number;
  originalPriceVES: number;

  ivaType: 'included' | 'excluded' | 'exempt';
  ivaRate: number;
  taxAmountUSD: number;
  taxAmountVES: number;

  totalPriceUSD: number;
  totalPriceVES: number;

  subtotalUSD: number;
  subtotalVES: number;
  totalUSD: number;
  totalVES: number;

  exchangeRateUsed: number;
  exchangeRateSource: string;
  calculatedAt: string;

  stock?: number;
  durationMinutes?: number;
}

export interface CartQuote {
  items: QuoteItemSnapshot[];
  subtotalUSD: number;
  subtotalVES: number;
  subtotalOriginalUSD: number;
  subtotalOriginalVES: number;
  totalDiscountUSD: number;
  totalDiscountVES: number;
  totalTaxUSD: number;
  totalTaxVES: number;
  totalUSD: number;
  totalVES: number;
  ivaType: 'included' | 'excluded' | 'exempt' | 'mixed';
  ivaRate: number;
  hasIVA: boolean;
  hasMixedIVA: boolean;
  hasExemptItems: boolean;
  exchangeRateUsed: number;
  exchangeRateSource: string;
  calculatedAt: string;
  warnings?: Array<{
    type: string;
    message: string;
    productId: string;
  }>;
}

interface UseCartQuoteResult {
  quote: CartQuote | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCartQuote(items: QuoteItemInput[]): UseCartQuoteResult {
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referencia para debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AbortController para cancelar peticiones viejas
  const abortRef = useRef<AbortController | null>(null);

  // Contador para forzar refresh manual
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  // Serializar items de forma estable para el useEffect
  const itemsKey = JSON.stringify(
    (items || []).map((i) => ({
      productId: i.productId || null,
      serviceId: i.serviceId || null,
      quantity: Number(i.quantity || 0),
      appointmentDate: i.appointmentDate || null,
      appointmentTime: i.appointmentTime || null,
    })),
  );

  useEffect(() => {
    // Cancelar cualquier petición pendiente
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Si no hay items, no llamamos al backend
    if (!items || items.length === 0) {
      setQuote(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Detectar si es un carrito de servicios o de productos.
        // El backend tiene dos endpoints separados.
        const isServiceCart = items.every((i) => i.serviceId && !i.productId);

        const endpoint = isServiceCart
          ? `${API_BASE}/cart/service-quote`
          : `${API_BASE}/cart/quote`;

        // Payload para productos
        const productsPayload = {
          items: items.map((i) => ({
            productId: i.productId,
            quantity: Number(i.quantity || 1),
          })),
        };

        // Payload para servicio (solo soporta 1 item por ahora)
        const servicePayload = {
          serviceId: items[0].serviceId,
          quantity: Number(items[0].quantity || 1),
          appointmentDate: items[0].appointmentDate || new Date().toISOString().slice(0, 10),
          appointmentTime: items[0].appointmentTime || '09:00',
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isServiceCart ? servicePayload : productsPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          let msg = `Error ${response.status}`;
          try {
            const errBody = await response.json();
            msg = errBody?.message || msg;
          } catch {
            // ignorar
          }
          throw new Error(msg);
        }

        const data = await response.json();

        // El endpoint de productos devuelve CartTotals directamente.
        // El endpoint de servicios devuelve { items, totals, warnings }.
        // Normalizamos ambos al formato CartQuote.
        const normalized: CartQuote = isServiceCart
          ? {
              ...(data.totals || {}),
              items: data.items || [],
              warnings: data.warnings || [],
            }
          : data;

        setQuote(normalized);
        setError(null);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // Ignorar abortos
          return;
        }
        console.error('❌ [useCartQuote] Error:', err);
        setError(err?.message || 'Error al cotizar el carrito');
        setQuote(null);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    }, 300); // debounce 300ms

    // Cleanup
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, refreshToken]);

  return { quote, loading, error, refresh };
}