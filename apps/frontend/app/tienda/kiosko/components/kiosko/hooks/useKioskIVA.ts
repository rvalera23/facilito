// app/tienda/[slug]/components/kiosko/hooks/useKioskIVA.ts

import { useMemo } from 'react';

interface IvaInfo {
  ivaType: 'included' | 'excluded' | 'exempt';
  ivaRate: number;
  ivaAmount: number;
  basePrice: number;
  priceWithIVA: number;
  displayShort: string;
  displayFull: string;
}

export function useKioskIVA(items: any[], exchangeRate: number = 1) {
  const ivaInfo = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        totalBaseVes: 0,
        totalIVA: 0,
        totalWithIVAVes: 0,
        displayType: 'Sin IVA',
        badgeBg: 'rgba(100,116,139,0.15)',
        badgeColor: '#64748b',
        totalIvaType: 'exempt' as const,
        totalIvaRate: 0,
        itemsWithIVA: [],
      };
    }

    let totalBaseVes = 0;      // 🔥 Subtotal SIN IVA
    let totalIVA = 0;          // 🔥 Total del IVA
    let totalWithIVAVes = 0;   // 🔥 Total CON IVA
    let hasIncluded = false;
    let hasExcluded = false;
    let maxRate = 0;
    let finalIvaType: 'included' | 'excluded' | 'exempt' = 'exempt';

    const itemsWithIVA = items.map((item: any) => {
      const quantity = Number(item?.quantity || 1);

      // ============================================================
      // 🔥 PRIORIDAD 1: Snapshot guardado en la orden (Fase 3)
      // ============================================================
      if (item.totalPriceVES !== undefined && Number(item.totalPriceVES) > 0) {
        const totalPriceVES = Number(item.totalPriceVES);
        const taxAmountVES = Number(item.taxAmountVES || 0);
        const basePriceVES = Number(item.basePriceVES || 0);
        const ivaType = item.ivaType || 'excluded';
        const ivaRate = Number(item.ivaRate || 0);

        // Acumular
        totalBaseVes += basePriceVES * quantity;
        totalIVA += taxAmountVES * quantity;
        totalWithIVAVes += totalPriceVES * quantity;

        if (ivaType === 'included') hasIncluded = true;
        else if (ivaType === 'excluded') hasExcluded = true;

        if (ivaType !== 'exempt' && ivaRate > maxRate) {
          maxRate = ivaRate;
        }

        return {
          ...item,
          _iva: {
            ivaType,
            ivaRate,
            ivaAmount: Math.round(taxAmountVES * 100) / 100,
            basePrice: Math.round(basePriceVES * 100) / 100,
            priceWithIVA: Math.round(totalPriceVES * 100) / 100,
            totalIVA: Math.round(taxAmountVES * quantity * 100) / 100,
            totalWithIVA: Math.round(totalPriceVES * quantity * 100) / 100,
            displayShort: ivaType === 'included' ? 'IVA Inc.' :
                          ivaType === 'exempt' ? 'Exento' : 'IVA +',
            displayFull: ivaType === 'included' ? `IVA ${ivaRate}% Incluido` :
                          ivaType === 'exempt' ? 'Exento de IVA' : `IVA ${ivaRate}% No Incluido`,
          }
        };
      }

      // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
      let pricesObj = item?.prices || item?.attributes?.prices || {};
      if (typeof pricesObj === 'string') {
        try { pricesObj = JSON.parse(pricesObj); } catch { pricesObj = {}; }
      }

      let basePriceVes = Number(
        pricesObj?.VES ??
        pricesObj?.ves ??
        item?.priceVes ??
        item?.price_ves ??
        item?.priceVES ??
        item?.precio ??
        item?.price ??
        0
      );

      const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
      const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);

      let ivaAmount = 0;
      let priceWithIVA = basePriceVes;
      let baseSinIVA = basePriceVes;

      if (ivaType === 'excluded') {
        ivaAmount = basePriceVes * (ivaRate / 100);
        priceWithIVA = basePriceVes + ivaAmount;
        baseSinIVA = basePriceVes;
        hasExcluded = true;
      } else if (ivaType === 'included') {
        ivaAmount = basePriceVes - (basePriceVes / (1 + ivaRate / 100));
        priceWithIVA = basePriceVes;
        baseSinIVA = basePriceVes - ivaAmount;
        hasIncluded = true;
      } else {
        ivaAmount = 0;
        priceWithIVA = basePriceVes;
        baseSinIVA = basePriceVes;
      }

      totalBaseVes += baseSinIVA * quantity;
      totalIVA += ivaAmount * quantity;
      totalWithIVAVes += priceWithIVA * quantity;

      if (ivaType !== 'exempt' && ivaRate > maxRate) {
        maxRate = ivaRate;
      }

      return {
        ...item,
        _iva: {
          ivaType,
          ivaRate,
          ivaAmount: Math.round(ivaAmount * 100) / 100,
          basePrice: Math.round(baseSinIVA * 100) / 100,
          priceWithIVA: Math.round(priceWithIVA * 100) / 100,
          totalIVA: Math.round(ivaAmount * quantity * 100) / 100,
          totalWithIVA: Math.round(priceWithIVA * quantity * 100) / 100,
          displayShort: ivaType === 'included' ? 'IVA Inc.' :
                        ivaType === 'exempt' ? 'Exento' : 'IVA +',
          displayFull: ivaType === 'included' ? `IVA ${ivaRate}% Incluido` :
                        ivaType === 'exempt' ? 'Exento de IVA' : `IVA ${ivaRate}% No Incluido`,
        }
      };
    });
    // Determinar tipo de IVA final
    let displayType = '';
    let badgeBg = '';
    let badgeColor = '';

    if (hasIncluded && hasExcluded) {
      displayType = `IVA Mixto (${maxRate}%)`;
      badgeBg = 'rgba(139,92,246,0.15)';
      badgeColor = '#8b5cf6';
      finalIvaType = 'included';
    } else if (hasIncluded) {
      displayType = `IVA ${maxRate}% Incluido`;
      badgeBg = 'rgba(34,197,94,0.15)';
      badgeColor = '#22c55e';
      finalIvaType = 'included';
    } else if (hasExcluded && totalIVA > 0) {
      displayType = `IVA ${maxRate}% No Incluido`;
      badgeBg = 'rgba(251,191,36,0.15)';
      badgeColor = '#f59e0b';
      finalIvaType = 'excluded';
    } else if (totalIVA === 0 && totalBaseVes > 0) {
      displayType = 'Exento de IVA';
      badgeBg = 'rgba(100,116,139,0.15)';
      badgeColor = '#64748b';
      finalIvaType = 'exempt';
    } else {
      displayType = 'Sin IVA';
      badgeBg = 'rgba(100,116,139,0.15)';
      badgeColor = '#64748b';
      finalIvaType = 'exempt';
    }

    return {
      totalBaseVes: Math.round(totalBaseVes * 100) / 100,
      totalIVA: Math.round(totalIVA * 100) / 100,
      totalWithIVAVes: Math.round(totalWithIVAVes * 100) / 100,
      displayType,
      badgeBg,
      badgeColor,
      totalIvaType: finalIvaType,
      totalIvaRate: maxRate,
      itemsWithIVA,
    };
  }, [items]);

  return ivaInfo;
}