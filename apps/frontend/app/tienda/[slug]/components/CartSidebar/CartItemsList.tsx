'use client';

import React from 'react';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, Image as ImageIcon } from 'lucide-react';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

interface CartItemsListProps {
  cartItems: any[];
  updateCartQty?: (productId: string, newQty: number, maxStock: number) => void;
  removeFromCart?: (productId: string) => void;
  onOpenPreview?: (product: any) => void;
  isSecondaryLight: boolean;
  resolvedTextMain: string;
  resolvedTextMuted: string;
  borderDynamic: string;
  dynamicSubCardStyle: any;
  safePrimary: string;
  getProductPrices: (product: any) => { VES: number; USD: number };
  formatPrice: (num: number) => string;
  getItemImage: (item: any) => string | null;
  getProductReference: (item: any) => string;
}

export default function CartItemsList({
  cartItems,
  updateCartQty,
  removeFromCart,
  onOpenPreview,
  isSecondaryLight,
  resolvedTextMain,
  resolvedTextMuted,
  borderDynamic,
  dynamicSubCardStyle,
  safePrimary,
  getProductPrices,
  formatPrice,
  getItemImage,
  getProductReference,
}: CartItemsListProps) {

  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
  const { rates, loading: ratesLoading } = useExchangeRateContext();
  
// ============================================================
// 🔥 LEER PRICING DEL ITEM (backend = fuente de verdad)
// ============================================================
// El item ya viene con `_pricing` del backend.
// Solo leemos. Cero cálculos. Cero IVA local. Cero conversiones.
// ============================================================
const getProductIva = (item: any) => {
  const p = item?._pricing || {};
  const quantity = Number(item?.quantity || 1);
  const ivaType = p.ivaType || 'excluded';
  const ivaRate = Number(p.ivaRate || 0);

  const basePriceVES = Number(p.basePriceVES || 0);
  const taxAmountVES = Number(p.taxAmountVES || 0);
  const totalPriceVES = Number(p.totalPriceVES || 0);
  const totalPriceUSD = Number(p.totalPriceUSD || 0);

  return {
    ivaType,
    ivaRate,
    ivaAmount: Math.round(taxAmountVES * 100) / 100,
    basePrice: Math.round(basePriceVES * 100) / 100,
    priceWithIVA: Math.round(totalPriceVES * 100) / 100,
    priceWithIVAUsd: Math.round(totalPriceUSD * 100) / 100,
    totalIVA: Math.round(taxAmountVES * quantity * 100) / 100,
    totalWithIVA: Math.round(totalPriceVES * quantity * 100) / 100,
    totalBase: Math.round(basePriceVES * quantity * 100) / 100,
    display: ivaType === 'included' ? `IVA Inc. (${ivaRate}%)` :
             ivaType === 'exempt'   ? 'Exento' : `IVA + (${ivaRate}%)`,
    displayShort: ivaType === 'included' ? 'IVA Inc.' :
                  ivaType === 'exempt'   ? 'Exento' : 'IVA +',
    badgeColor: ivaType === 'included' ? '#22c55e' :
                ivaType === 'exempt'   ? '#64748b' : '#f59e0b',
    badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
             ivaType === 'exempt'   ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
  };
};

  if (cartItems.length === 0) {
    return (
      <div className={`text-center py-20 ${resolvedTextMuted}`}>
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-25" style={{ color: safePrimary }} />
        <p className={`text-sm font-medium ${resolvedTextMain}`}>Tu carrito está vacío</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {cartItems.map((item: any, index: number) => {
        const productId = item.id || item._id || `item-${index}`;
        const stockMax = Number(item.stock ?? item.existencias ?? 99);
        
        const ivaInfo = getProductIva(item);

        const priceWithIVA = ivaInfo.priceWithIVA;
        const totalWithIVA = ivaInfo.totalWithIVA;
        
        const resolvedImage = getItemImage(item);
        const reference = getProductReference(item);
        const qty = Number(item.quantity || 1);

        return (
          <div 
            key={productId}
            className="border p-4 rounded-3xl transition-all shadow-sm flex flex-col gap-3"
            style={dynamicSubCardStyle}
          >
            <div className="flex items-center justify-between gap-3">
              <div 
                className="flex items-center space-x-3.5 overflow-hidden flex-1 cursor-pointer group"
                onClick={() => {
                  if (onOpenPreview) {
                    onOpenPreview(item);
                  }
                }}
                title="Ver detalles del producto"
              >
                <div 
                  className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border flex items-center justify-center"
                  style={dynamicSubCardStyle}
                >
                  {resolvedImage ? (
                    <Image
                      src={resolvedImage}
                      alt={item.name || item.nombre || 'Producto'}
                      fill
                      sizes="64px"
                      className="object-cover group-hover:scale-105 transition-transform"
                      quality={70}
                      onError={(e: any) => {
                        e.target.src = 'https://placehold.co/150?text=Error';
                      }}
                    />
                  ) : (
                    <ImageIcon className={`w-6 h-6 opacity-40 ${resolvedTextMuted}`} />
                  )}
                </div>

                <div className="overflow-hidden min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold truncate group-hover:underline ${resolvedTextMain}`}>
                      {item.name || item.nombre || 'Producto'}
                    </h4>
                    <span 
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border"
                      style={{
                        backgroundColor: ivaInfo.badgeBg,
                        borderColor: `${ivaInfo.badgeColor}30`,
                        color: ivaInfo.badgeColor
                      }}
                    >
                      {ivaInfo.displayShort}
                    </span>
                  </div>
                  
                  {reference && (
                    <span className={`text-[11px] block font-medium ${resolvedTextMuted}`}>
                      Ref: {reference}
                    </span>
                  )}

                  {item._pricing?.hasDiscount ? (
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] line-through opacity-50" style={{ color: resolvedTextMuted }}>
                        Bs. {formatPrice(Number(item._pricing.originalPriceVES || 0))}
                      </span>
                      <span className="font-black text-sm" style={{ color: safePrimary }}>
                        Bs. {formatPrice(ivaInfo.priceWithIVA)}
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
                        (${ivaInfo.priceWithIVAUsd.toFixed(2)})
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                        style={{
                          backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
                          color: isSecondaryLight ? '#991b1b' : '#f87171',
                        }}
                      >
                        -{item._pricing.discountPercentage}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="font-black text-sm" style={{ color: safePrimary }}>
                        Bs. {formatPrice(ivaInfo.priceWithIVA)}
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
                        (${ivaInfo.priceWithIVAUsd.toFixed(2)})
                                              </span>
                    </div>
                  )}

                  {ivaInfo.ivaType === 'excluded' && ivaInfo.ivaRate > 0 && (
                    <div className={`text-[9px] ${resolvedTextMuted} opacity-60`}>
                      Base: Bs. {formatPrice(ivaInfo.basePrice)} + {ivaInfo.ivaRate}% IVA
                    </div>
                  )}
                  {ivaInfo.ivaType === 'included' && ivaInfo.ivaRate > 0 && (
                    <div className={`text-[9px] ${resolvedTextMuted} opacity-60`}>
                      IVA {ivaInfo.ivaRate}% incluido
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (removeFromCart) {
                    removeFromCart(productId);
                  } else if (updateCartQty) {
                    updateCartQty(productId, 0, stockMax);
                  }
                }}
                className={`p-2.5 rounded-2xl transition border shrink-0 text-rose-500 hover:bg-rose-500/10`}
                style={dynamicSubCardStyle}
                title="Eliminar del carrito"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div 
              className="pt-2 border-t border-dashed flex items-center justify-between"
              style={{ borderColor: borderDynamic }}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}>
                  Stock: {stockMax}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full`} style={{ color: safePrimary }}>
                  Total: Bs. {formatPrice(totalWithIVA)}
                </span>
              </div>

              {updateCartQty && (
                <div 
                  className="flex items-center rounded-xl p-1 border"
                  style={dynamicSubCardStyle}
                >
                  <button
                    type="button"
                    onClick={() => updateCartQty(productId, qty - 1, stockMax)}
                    className={`p-1.5 rounded-lg transition hover:opacity-75 ${resolvedTextMain}`}
                    title="Restar"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={`px-3 text-xs font-black ${resolvedTextMain}`}>
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(productId, qty + 1, stockMax)}
                    className={`p-1.5 rounded-lg transition hover:opacity-75 ${resolvedTextMain}`}
                    title="Sumar"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}