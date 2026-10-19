'use client';

import { useState, useEffect, useCallback } from 'react';

interface ExchangeRates {
  USD: number;
  EUR: number;
  IVA: number;
}

interface RateResponse {
  success: boolean;
  rates: ExchangeRates;
  source: string;
  lastUpdate: number;
  error?: string;
}

export const useExchangeRate = () => {
  const [rates, setRates] = useState<ExchangeRates>({ USD: 0, EUR: 0, IVA: 16 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 🔥 USAR LA IP DEL SERVIDOR - ACCESIBLE DESDE EL NAVEGADOR
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const url = `${baseUrl}/currency/rates`;
      
      console.log('📡 [useExchangeRate] Fetching from:', url);
      
      const response = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
      });

      console.log('📡 [useExchangeRate] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: RateResponse = await response.json();
      console.log('📡 [useExchangeRate] Data received:', data);
      
      if (data.success && data.rates) {
        const usdRate = data.rates.USD || 0;
        const eurRate = data.rates.EUR || 0;
        
        console.log('✅ [useExchangeRate] USD rate:', usdRate);
        console.log('✅ [useExchangeRate] EUR rate:', eurRate);
        
        setRates({
          USD: usdRate,
          EUR: eurRate,
          IVA: data.rates.IVA || 16,
        });
        setLastUpdate(data.lastUpdate || Date.now());
        setError(null);
      } else {
        throw new Error(data.error || 'No se pudieron obtener las tasas');
      }
    } catch (err) {
      console.error('❌ [useExchangeRate] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener tasas de cambio');
      setRates({ USD: 0, EUR: 0, IVA: 16 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  return { rates, loading, error, lastUpdate, refetch: fetchRates };
};