// apps/backend/src/modules/currency/currency.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class CurrencyService {
  private lastRates: any = null;
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // 🔥 TASA DE IVA FIJA (definida por ley)
  private readonly IVA_RATE = 16; // 16% en Venezuela

  async getRates() {
    // 🔥 Si el cache es reciente y válido, devolverlo
    if (this.lastRates && (Date.now() - this.lastUpdate) < this.CACHE_DURATION) {
      return this.lastRates;
    }

    let bcvUsd: number | null = null;
    let bcvEur: number | null = null;

    // 🔥 1. OBTENER DÓLAR OFICIAL (BCV) DESDE DOLARAPI
    try {
      const usdResponse = await fetch('https://ve.dolarapi.com/v1/dolares', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (usdResponse.ok) {
        const usdData = await usdResponse.json();
        console.log('📊 Datos de DolarApi (USD) recibidos');

        // 🔥 BUSCAR LA TASA OFICIAL (fuente: "oficial")
        const usdItem = usdData.find((item: any) => 
          item.fuente?.toLowerCase() === 'oficial'
        );

        if (usdItem) {
          bcvUsd = Number(usdItem.promedio || usdItem.precio || 0);
          console.log('✅ USD Oficial (BCV) encontrado:', bcvUsd);
        } else {
          console.error('❌ No se encontró la tasa oficial de USD');
        }
      } else {
        console.log(`❌ Error al obtener USD: ${usdResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Error al obtener USD:', error.message);
    }

    // 🔥 2. OBTENER EURO OFICIAL (BCV) DESDE DOLARAPI
    try {
      const eurResponse = await fetch('https://ve.dolarapi.com/v1/euros', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (eurResponse.ok) {
        const eurData = await eurResponse.json();
        console.log('📊 Datos de DolarApi (EUR) recibidos:', JSON.stringify(eurData));

        // 🔥 BUSCAR LA TASA OFICIAL DEL EURO (fuente: "oficial")
        const eurItem = eurData.find((item: any) => 
          item.fuente?.toLowerCase() === 'oficial' ||
          item.moneda?.toLowerCase() === 'eur'
        );

        if (eurItem) {
          // 🔥 El promedio ya está en VES
          bcvEur = Number(eurItem.promedio || eurItem.precio || 0);
          console.log('✅ EUR Oficial (BCV) encontrado:', bcvEur);
        } else {
          console.error('❌ No se encontró la tasa oficial de EUR');
          console.log('📊 Datos de EUR disponibles:', eurData);
        }
      } else {
        console.log(`❌ Error al obtener EUR: ${eurResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Error al obtener EUR:', error.message);
    }

    // 🔥 3. FALLBACK: Si no se obtiene EUR, estimarlo desde USD
    if (!bcvEur && bcvUsd) {
      // 🔥 Usar la tasa EUR/USD del BCV (de la imagen: 916.008 / 784.663 = 1.1674)
      const EUR_USD_RATE = 1.1674; // Aproximado del BCV
      bcvEur = Math.round(bcvUsd * EUR_USD_RATE * 100) / 100;
      console.log('⚠️ EUR estimado desde USD (tasa BCV):', bcvEur);
    }

    // 🔥 4. SI TODO FALLA, DEVOLVER ERROR
    if (!bcvUsd) {
      console.error('❌ CRÍTICO: No se pudo obtener la tasa USD');
      return {
        success: false,
        error: 'No se pudieron obtener las tasas de cambio. Intenta más tarde.',
        rates: null,
        lastUpdate: Date.now()
      };
    }

    // 🔥🔥🔥 5. CONSTRUIR RESULTADO CON IVA 🔥🔥🔥
    const result = {
      success: true,
      rates: {
        VES: 1,
        USD: Math.round(bcvUsd * 100) / 100,
        EUR: Math.round((bcvEur || bcvUsd * 1.1674) * 100) / 100,
        CRYPTO: Math.round(bcvUsd * 100) / 100,
        // 🔥🔥🔥 NUEVO: TASA DE IVA 🔥🔥🔥
        IVA: this.IVA_RATE, // 16% fijo definido por ley
      },
      source: 'BCV via DolarApi',
      lastUpdate: Date.now()
    };

    // Guardar en cache
    this.lastRates = result;
    this.lastUpdate = Date.now();

    console.log('✅ TASAS FINALES (con IVA):', result.rates);
    return result;
  }

  // 🔥 Método para forzar actualización
  async refreshRates() {
    this.lastUpdate = 0;
    return this.getRates();
  }

  // 🔥🔥🔥 NUEVO: Método para obtener solo la tasa de IVA 🔥🔥🔥
  async getIvaRate() {
    const rates = await this.getRates();
    if (rates.success) {
      return {
        success: true,
        rate: this.IVA_RATE,
        message: 'Tasa de IVA definida por ley (16%)'
      };
    }
    return {
      success: false,
      rate: 16,
      message: 'Tasa de IVA por defecto (no se pudo obtener del servidor)'
    };
  }
}