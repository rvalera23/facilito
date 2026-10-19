'use client';

import React from 'react';
import { formatPrice } from './hooks/orderUtils';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { getPriceColors } from '@/lib/priceTokens';

interface OrderItemsTableProps {
  items: any[];
  order: any;
  subtotalVes: number;
  textColor: string;
  primary: string;
  priceColor: string;
  borderDynamic: string;
  dynamicSubCardStyle: any;
  getItemImage: (item: any) => string | null;
  isDarkBg?: boolean;
}

export default function OrderItemsTable({
  items,
  order,
  subtotalVes,
  textColor,
  primary,
  priceColor,
  borderDynamic,
  dynamicSubCardStyle,
  getItemImage,
  isDarkBg = false, // 🔥 NUEVO - con valor por defecto
}: OrderItemsTableProps) {
  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
  const { rates, loading: ratesLoading } = useExchangeRateContext();

  // 🔥 COLORES DE PRECIO (token unificado)
  const priceColors = getPriceColors({ primary, isDarkBg });
  
  // 🔥 TASA DE CAMBIO DINÁMICA
  const globalRate = rates.USD > 0 ? rates.USD : 0;

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6 text-xs opacity-50" style={{ color: textColor }}>
        No hay productos en esta orden
      </div>
    );
  }

  // 🔥 FUNCIÓN PARA OBTENER LA TASA DE CAMBIO DE LA ORDEN (CON FALLBACK GLOBAL)
  const getOrderRate = (order: any): number => {
    if (order.rate) return Number(order.rate);
    if (order.exchangeRate) return Number(order.exchangeRate);
    if (order.rateUsd) return Number(order.rateUsd);
    if (order.paymentMetadata?.exchangeRate) return Number(order.paymentMetadata.exchangeRate);
    
    if (order.totalAmount && order.totalAmountVes) {
      const totalAmount = Number(order.totalAmount);
      const totalAmountVes = Number(order.totalAmountVes);
      if (totalAmount > 0 && totalAmountVes > 0) {
        return totalAmountVes / totalAmount;
      }
    }
    
    // 🔥 USAR TASA GLOBAL COMO FALLBACK
    if (globalRate > 0) return globalRate;
    
    return 0;
  };

  // 🔥 FUNCIÓN PARA CALCULAR IVA DE UN ITEM - SIN HARDCODEOS
  const calculateItemIVA = (item: any, orderRate: number) => {
    // 🔥 DETERMINAR PRECIO BASE EN VES
    let basePrice = 0;
    
    // 1. Buscar precio en VES explícito
    if (item.priceVes !== undefined && item.priceVes !== null && Number(item.priceVes) > 0) {
      basePrice = Number(item.priceVes);
    } else if (item.prices?.VES !== undefined && Number(item.prices.VES) > 0) {
      basePrice = Number(item.prices.VES);
    } else if (item.unitPriceVes !== undefined && item.unitPriceVes !== null && Number(item.unitPriceVes) > 0) {
      basePrice = Number(item.unitPriceVes);
    } else if (item.price !== undefined && item.price !== null) {
      const price = Number(item.price);
      if (price > 0) {
        // 🔥 Si hay un precio USD explícito, usarlo para determinar si está en USD
        const hasExplicitUsd = item.priceUsd !== undefined && Number(item.priceUsd) > 0;
        const hasPricesUsd = item.prices?.USD !== undefined && Number(item.prices.USD) > 0;
        
        // Si hay precio USD explícito Y el precio es bajo (< 1000), asumir que está en USD
        if ((hasExplicitUsd || hasPricesUsd) && price < 1000 && orderRate > 0) {
          basePrice = Math.round(price * orderRate * 100) / 100;
        } 
        // Si NO hay precio USD explícito Y el precio es bajo (< 1000), NO asumir USD
        else if (!hasExplicitUsd && !hasPricesUsd && price < 1000) {
          basePrice = price; // Es VES
        } 
        // Si el precio es alto (> 1000), asumir VES
        else if (price > 1000) {
          basePrice = price;
        } 
        // Fallback: si hay tasa, convertir
        else if (orderRate > 0) {
          basePrice = Math.round(price * orderRate * 100) / 100;
        } else {
          basePrice = price;
        }
      }
    }
    
    // 2. Si no hay precio en VES, intentar usar USD
    if (basePrice === 0) {
      let usdPrice = 0;
      if (item.priceUsd !== undefined && Number(item.priceUsd) > 0) {
        usdPrice = Number(item.priceUsd);
      } else if (item.prices?.USD !== undefined && Number(item.prices.USD) > 0) {
        usdPrice = Number(item.prices.USD);
      } else if (item.unitPrice !== undefined && Number(item.unitPrice) > 0) {
        usdPrice = Number(item.unitPrice);
      }
      if (usdPrice > 0 && orderRate > 0) {
        basePrice = Math.round(usdPrice * orderRate * 100) / 100;
      }
    }

    const quantity = Number(item.quantity || item.qty || 1);
    const subtotal = basePrice * quantity;
    
    // 🔥 OBTENER IVA DEL ITEM
    const ivaType = item?.ivaType || item?.attributes?.ivaType || 'excluded';
    const ivaRate = Number(item?.ivaRate || item?.attributes?.ivaRate || 16);
    
    let ivaAmount = 0;
    let priceWithIVA = subtotal;
    let baseForDisplay = subtotal;
    
    if (ivaType === 'excluded') {
      ivaAmount = subtotal * (ivaRate / 100);
      priceWithIVA = subtotal + ivaAmount;
    } else if (ivaType === 'included') {
      ivaAmount = subtotal - (subtotal / (1 + ivaRate / 100));
      priceWithIVA = subtotal;
      baseForDisplay = subtotal - ivaAmount;
    } else {
      // EXENTO
      ivaAmount = 0;
      priceWithIVA = subtotal;
      baseForDisplay = subtotal;
    }
    
    return {
      ivaType,
      ivaRate,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      basePrice: Math.round(subtotal * 100) / 100,
      priceWithIVA: Math.round(priceWithIVA * 100) / 100,
      baseForDisplay: Math.round(baseForDisplay * 100) / 100,
      quantity,
      unitPrice: Math.round(basePrice * 100) / 100,
      display: ivaType === 'included' ? `IVA Incluido (${ivaRate}%)` : 
               ivaType === 'exempt' ? 'Exento de IVA' : `IVA No Incluido (${ivaRate}%)`,
      displayShort: ivaType === 'included' ? 'IVA Inc.' : 
                    ivaType === 'exempt' ? 'Exento' : 'IVA +',
      badgeColor: ivaType === 'included' ? '#22c55e' : 
                   ivaType === 'exempt' ? '#64748b' : '#f59e0b',
      badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' : 
                ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
    };
  };

  // 🔥 FUNCIÓN PARA OBTENER EL PRECIO EN VES
  const getItemPriceVes = (item: any): number => {
    const rate = getOrderRate(order);
    
    if (item.priceVes !== undefined && item.priceVes !== null && Number(item.priceVes) > 0) {
      return Number(item.priceVes);
    }
    if (item.prices?.VES !== undefined && Number(item.prices.VES) > 0) {
      return Number(item.prices.VES);
    }
    if (item.unitPriceVes !== undefined && item.unitPriceVes !== null && Number(item.unitPriceVes) > 0) {
      return Number(item.unitPriceVes);
    }
    if (item.price !== undefined && item.price !== null) {
      const price = Number(item.price);
      if (price <= 0) return 0;
      if (price > 1000) return price;
      if (price < 1000 && rate > 0) {
        if (price * rate > 1000) {
          return Math.round(price * rate * 100) / 100;
        }
        return price;
      }
      if (rate > 0) {
        return Math.round(price * rate * 100) / 100;
      }
      return price;
    }
    if (item.priceUsd !== undefined && item.priceUsd !== null && Number(item.priceUsd) > 0) {
      const priceUsd = Number(item.priceUsd);
      if (rate > 0) {
        return Math.round(priceUsd * rate * 100) / 100;
      }
    }
    return 0;
  };

  // 🔥 FUNCIÓN PARA OBTENER EL PRECIO EN USD
  const getItemPriceUsd = (item: any): number => {
    const rate = getOrderRate(order);
    
    if (item.priceUsd !== undefined && item.priceUsd !== null && Number(item.priceUsd) > 0) {
      return Number(item.priceUsd);
    }
    if (item.prices?.USD !== undefined && Number(item.prices.USD) > 0) {
      return Number(item.prices.USD);
    }
    if (item.unitPrice !== undefined && item.unitPrice !== null && Number(item.unitPrice) > 0) {
      return Number(item.unitPrice);
    }
    if (item.price !== undefined && item.price !== null) {
      const price = Number(item.price);
      if (price <= 0) return 0;
      if (price < 1000) return price;
      if (price > 1000 && rate > 0) {
        return Math.round((price / rate) * 100) / 100;
      }
      if (rate > 0) {
        return Math.round((price / rate) * 100) / 100;
      }
      return price;
    }
    return 0;
  };

  const orderRate = getOrderRate(order);

  return (
    <div className="space-y-2">
<span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block" style={{ color: textColor }}>
  Productos
</span>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
<thead>
  <tr className="border-b" style={{ borderColor: borderDynamic }}>
    <th className="text-left py-2 font-bold opacity-60 text-[10px] uppercase tracking-wider min-w-[200px] pr-2" style={{ color: textColor }}>
      Artículo
    </th>
    <th className="text-center py-2 font-bold opacity-60 text-[10px] uppercase tracking-wider w-[60px] px-1" style={{ color: textColor }}>
      Cant.
    </th>
    <th className="text-right py-2 font-bold opacity-60 text-[10px] uppercase tracking-wider min-w-[160px] px-1" style={{ color: textColor }}>
      Precio
    </th>
  </tr>
</thead>
<tbody>
  {items.map((item, index) => {
    const quantity = Number(item.quantity || item.qty || 1);
    // 🔥 El precio unitario del snapshot es totalPriceVES (ya está con IVA)
    // El total por cantidad es totalPriceVES × quantity
    const priceVesUnit = Number(item.totalPriceVES || item.unitPriceVes || getItemPriceVes(item) || 0);
    const priceVes = priceVesUnit * quantity;
    const priceUsd = Number(item.totalPriceUSD || getItemPriceUsd(item) || 0) * quantity;
    
    // 🔥 CALCULAR IVA DEL ITEM
    const ivaInfo = calculateItemIVA(item, orderRate);
    
    const itemImage = getItemImage(item);
    
    // 🔥 DETERMINAR QUÉ MOSTRAR SEGÚN EL TIPO DE IVA
    let displayPriceVes = priceVes;
    let ivaBadge = '';
    
    if (ivaInfo.ivaType === 'excluded') {
      displayPriceVes = priceVes;
      ivaBadge = `+${ivaInfo.ivaRate}%`;
    } else if (ivaInfo.ivaType === 'included') {
      displayPriceVes = priceVes;
      ivaBadge = `IVA ${ivaInfo.ivaRate}%`;
    } else {
      displayPriceVes = priceVes;
      ivaBadge = 'Exento';
    }
    
    return (
      <tr key={index} className="border-b last:border-b-0 hover:bg-white/5 transition-colors" style={{ borderColor: borderDynamic }}>
        {/* 🔥 COLUMNA 1: Artículo */}
        <td className="py-2.5 pr-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden border shrink-0 bg-black/5 flex items-center justify-center" style={{ borderColor: borderDynamic }}>
              {itemImage ? (
                <img 
                  src={itemImage} 
                  alt={item.name || 'Producto'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-sm opacity-30">📦</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate text-xs" style={{ color: textColor }}>
                  {item.name || item.title || `Item ${index + 1}`}
                </p>
                {/* 🔥 BADGE DE IVA */}
                {ivaInfo.ivaType !== 'exempt' && (
                  <span 
                    className="text-[7px] font-bold px-1.5 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: ivaInfo.badgeBg,
                      borderColor: `${ivaInfo.badgeColor}30`,
                      color: ivaInfo.badgeColor
                    }}
                  >
                    {ivaBadge}
                  </span>
                )}
                {ivaInfo.ivaType === 'exempt' && (
                  <span 
                    className="text-[7px] font-bold px-1.5 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: 'rgba(100,116,139,0.15)',
                      borderColor: 'rgba(100,116,139,0.3)',
                      color: '#64748b'
                    }}
                  >
                    Exento
                  </span>
                )}
              </div>
              {/* 🔥 DESGLOSE DE IVA CHIQUITICO DEBAJO DEL TÍTULO */}
              {ivaInfo.ivaType === 'excluded' && ivaInfo.ivaAmount > 0 && (
                <p className="text-[7px] opacity-50" style={{ color: textColor }}>
                  Base: Bs. {formatPrice(ivaInfo.unitPrice)} + {ivaInfo.ivaRate}% IVA
                </p>
              )}
              {ivaInfo.ivaType === 'included' && ivaInfo.ivaAmount > 0 && (
                <p className="text-[7px] opacity-50" style={{ color: textColor }}>
                  IVA {ivaInfo.ivaRate}% incluido
                </p>
              )}
            </div>
          </div>
        </td>
        
        {/* 🔥 COLUMNA 2: Cantidad */}
        <td className="text-center py-2.5 font-bold text-xs px-1 whitespace-nowrap" style={{ color: textColor }}>
          {quantity}
        </td>
        
<td className="text-right py-2.5 text-xs px-1 whitespace-nowrap">
  {ivaInfo.hasDiscount ? (
    <div className="flex flex-col items-end">
      {/* Precio original SIN descuento (× cantidad) */}
      <span className="line-through opacity-50 text-[10px]" style={{ color: textColor }}>
        Bs. {formatPrice(Number(item.originalPriceVES || 0) * quantity)}
      </span>
      {/* Precio final CON descuento (× cantidad) */}
      <span className="font-bold" style={{ color: '#22c55e' }}>
        Bs. {formatPrice(priceVes)}
      </span>
      {priceUsd > 0 && (
        <span className="text-[8px] font-semibold" style={{ color: priceColors.foreign }}>
                    (${formatPrice(priceUsd)})
        </span>
      )}
      <span 
        className="mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
        style={{
          backgroundColor: isDarkBg ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
          color: isDarkBg ? '#f87171' : '#991b1b',
        }}
      >
        -{Number(item.discountPercentage || 0)}% OFF
      </span>
    </div>
  ) : (
    <>
      {displayPriceVes > 0 ? (
        <>
          <span className="font-bold" style={{ color: priceColors.ves }}>Bs. {formatPrice(displayPriceVes)}</span>
                    {priceUsd > 0 && (
            <span className="text-[8px] font-semibold ml-1 block sm:inline" style={{ color: priceColors.foreign }}>
                            (${formatPrice(priceUsd)})
            </span>
          )}
        </>
      ) : (
        <span className="font-bold" style={{ color: priceColors.foreign }}>${formatPrice(priceUsd)}</span>      )}

    </>
  )}
</td>
      </tr>
    );
  })}
</tbody>
        </table>
      </div>
    </div>
  );
}