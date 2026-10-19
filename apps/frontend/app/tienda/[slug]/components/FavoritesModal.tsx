'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, ShoppingBag, X, Image as ImageIcon, Plus, Minus, Trash2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteProducts: any[];
  onToggleFavorite: (itemId: string, itemType?: 'product' | 'service') => void;
  onToggleFavoriteService?: (serviceId: string, itemType?: 'service') => void;
  onAddToCart?: (product: any) => void;
  updateCartQty?: (productId: string, newQty: number, maxStock: number) => void;
  onOpenPreview?: (product: any) => void;
  cart?: any;
  primary?: string;
  isPrimaryLight?: boolean;
  textMainClass?: string;
  textMutedClass?: string;
  isSecondaryLight?: boolean;
  secondary?: string;
  tenantSlug?: string;
  getImageUrl: (item: any) => string | null; // ✅ AGREGADO
}

export default function FavoritesModal({
  isOpen,
  onClose,
  favoriteProducts = [],
  onToggleFavorite,
  onToggleFavoriteService,
  onAddToCart,
  updateCartQty,
  onOpenPreview,
  cart = {},
  primary = '#10B981',
  isPrimaryLight = false,
  textMainClass,
  textMutedClass,
  isSecondaryLight = false,
  secondary,
  tenantSlug,
  getImageUrl, // ✅ AGREGADO
}: FavoritesModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const resolvedTextMain = textMainClass || (isSecondaryLight ? 'text-slate-900' : 'text-slate-100');
  const resolvedTextMuted = textMutedClass || (isSecondaryLight ? 'text-slate-500' : 'text-slate-400');

  const borderDynamic = isSecondaryLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  
  const containerStyle = { 
    backgroundColor: secondary || (isSecondaryLight ? '#ffffff' : '#0f172a'), 
    borderColor: borderDynamic, 
  };
  
  const dynamicSubCardStyle = {
    backgroundColor: isSecondaryLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: borderDynamic,
  };

  const IVA_PERCENTAGE = 0.16;

  const handleProductClick = (product: any) => {
    const itemId = product.id || product._id;
    const itemType = product._itemType || 'product';
    const productTenantSlug = product.tenantSlug || product.tenant?.slug;
    
    if (!itemId) return;

    onClose();

    // 🔥 Servicios van con ?servicio=, productos con ?producto=
    const queryKey = itemType === 'service' ? 'servicio' : 'producto';

    if (productTenantSlug) {
      router.push(`/tienda/${productTenantSlug}?${queryKey}=${itemId}`);
      return;
    }

    if (tenantSlug) {
      router.push(`/tienda/${tenantSlug}?${queryKey}=${itemId}`);
      return;
    }

    const currentSlug = window.location.pathname.split('/tienda/')[1]?.split('/')[0];
    if (currentSlug) {
      router.push(`/tienda/${currentSlug}?${queryKey}=${itemId}`);
    }
  };

  const isProductInCurrentStore = (product: any) => {
    const productTenantSlug = product.tenantSlug || product.tenant?.slug;
    if (!productTenantSlug || !tenantSlug) return false;
    return productTenantSlug === tenantSlug;
  };

  const getProductPrices = (product: any) => {
    let pricesObj = product?.prices;

    if (typeof pricesObj === 'string') {
      try {
        pricesObj = JSON.parse(pricesObj);
      } catch {
        pricesObj = {};
      }
    }

    const vesVal = Number(
      pricesObj?.VES ?? 
      pricesObj?.ves ?? 
      product?.price ?? 
      product?.precio ?? 
      product?.price_ves ?? 
      0
    );

    let usdVal = Number(
      pricesObj?.USD ?? 
      pricesObj?.usd ?? 
      product?.priceUsd ?? 
      product?.price_usd ?? 
      product?.usd ?? 
      product?.attributes?.prices?.USD ?? 
      0
    );

    const ivaType = product?.ivaType || 
                    product?.attributes?.ivaType || 
                    'excluded';
    const ivaRate = Number(product?.ivaRate || 
                          product?.attributes?.ivaRate || 
                          16);

    return {
      VES: !isNaN(vesVal) ? vesVal : 0,
      USD: !isNaN(usdVal) ? usdVal : 0,
      ivaType: ivaType,
      ivaRate: ivaRate,
    };
  };

const getPriceWithIVA = (product: any) => {
  // ============================================================
  // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
  // ============================================================
  if (product?._pricing && typeof product._pricing === 'object') {
    const p = product._pricing;
    const ivaType = p.ivaType || 'excluded';
    const ivaRate = Number(p.ivaRate || 0);
    const hasDiscount = p.hasDiscount === true;
    const discountPercentage = Number(p.discountPercentage || 0);

    const priceWithIVA = Number(p.totalPriceVES || 0);
    const priceWithIVAUSD = Number(p.totalPriceUSD || 0);
    const ivaAmount = Number(p.taxAmountVES || 0);
    const ivaAmountUSD = Number(p.taxAmountUSD || 0);

    const discountInfo = hasDiscount ? {
      discountPercentage,
      originalPriceVES: Number(p.originalPriceVES || 0),
      originalPriceUSD: Number(p.originalPriceUSD || 0),
    } : null;

    return {
      priceWithIVA: Math.round(priceWithIVA * 100) / 100,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      ivaType,
      ivaRate,
      displayType: ivaType === 'included' ? `IVA ${ivaRate}% Inc.` :
                   ivaType === 'exempt'   ? 'Exento' : `IVA +${ivaRate}%`,
      priceWithIVAUSD: Math.round(priceWithIVAUSD * 100) / 100,
      ivaAmountUSD: Math.round(ivaAmountUSD * 100) / 100,
      hasDiscount,
      discountInfo,
      discountPercentage,
      _pricingSource: 'backend',
    };
  }

  // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
  const prices = getProductPrices(product);
  let basePriceVES = prices.VES;
  let basePriceUSD = prices.USD;
  
  // 🔥 DETECTAR DESCUENTO
  const isOnSale = product?.onSale === true || product?.attributes?.onSale === true;
  let discountPercentage = Number(product?.discountPercentage || product?.attributes?.discountPercentage || 0);
  discountPercentage = Math.min(100, Math.max(0, discountPercentage));
  const hasDiscount = isOnSale && discountPercentage > 0;
  
  // 🔥 APLICAR DESCUENTO AL PRECIO BASE (sin IVA)
  let discountInfo = null;
  let originalPriceVES = basePriceVES;
  let originalPriceUSD = basePriceUSD;
  let finalPriceWithIVAVES = basePriceVES;
  let finalPriceWithIVAUSD = basePriceUSD;
  let ivaAmountVES = 0;
  let ivaAmountUSD = 0;
  let ivaType = prices.ivaType;
  let ivaRate = prices.ivaRate;
  
  if (hasDiscount) {
    // Guardar precio original
    if (ivaType === 'excluded') {
      originalPriceVES = basePriceVES * (1 + ivaRate / 100);
      originalPriceUSD = basePriceUSD * (1 + ivaRate / 100);
    } else if (ivaType === 'included') {
      originalPriceVES = basePriceVES;
      originalPriceUSD = basePriceUSD;
    } else {
      originalPriceVES = basePriceVES;
      originalPriceUSD = basePriceUSD;
    }
    
    // Aplicar descuento a la base
    const discountFactor = 1 - discountPercentage / 100;
    basePriceVES = basePriceVES * discountFactor;
    basePriceUSD = basePriceUSD * discountFactor;
    
    discountInfo = {
      discountPercentage,
      originalPriceVES,
      originalPriceUSD,
    };
  }
  
  // 🔥 CALCULAR IVA SOBRE EL PRECIO CON DESCUENTO
  if (ivaType === 'exempt') {
    finalPriceWithIVAVES = basePriceVES;
    finalPriceWithIVAUSD = basePriceUSD;
    ivaAmountVES = 0;
    ivaAmountUSD = 0;
  } else if (ivaType === 'included') {
    // IVA YA INCLUIDO: el precio base YA incluye IVA
    ivaAmountVES = basePriceVES - (basePriceVES / (1 + ivaRate / 100));
    ivaAmountUSD = basePriceUSD - (basePriceUSD / (1 + ivaRate / 100));
    finalPriceWithIVAVES = basePriceVES;
    finalPriceWithIVAUSD = basePriceUSD;
  } else {
    // IVA EXCLUIDO: se suma al precio base
    ivaAmountVES = basePriceVES * (ivaRate / 100);
    ivaAmountUSD = basePriceUSD * (ivaRate / 100);
    finalPriceWithIVAVES = basePriceVES + ivaAmountVES;
    finalPriceWithIVAUSD = basePriceUSD + ivaAmountUSD;
  }
  
  return {
    priceWithIVA: Math.round(finalPriceWithIVAVES * 100) / 100,
    ivaAmount: Math.round(ivaAmountVES * 100) / 100,
    ivaType: ivaType,
    ivaRate: ivaRate,
    displayType: ivaType === 'included' ? `IVA ${ivaRate}% Inc.` : 
                 ivaType === 'exempt' ? 'Exento' : `IVA +${ivaRate}%`,
    priceWithIVAUSD: Math.round(finalPriceWithIVAUSD * 100) / 100,
    ivaAmountUSD: Math.round(ivaAmountUSD * 100) / 100,
    hasDiscount: hasDiscount,
    discountInfo: discountInfo,
    discountPercentage: discountPercentage,
  };
};

  const formatPrice = (num: number): string => {
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ❌ ELIMINADA: getItemImage (ya no es necesaria)

  const getProductReference = (item: any) => {
    return (
      item?.itemId ||
      item?.sku ||
      item?.code ||
      item?.codigo ||
      item?.inventoryId ||
      item?.reference ||
      item?.referencia ||
      ''
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className={`w-screen max-w-md border-l shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 ${resolvedTextMain}`}
          style={containerStyle}
        >
          
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="p-2.5 rounded-2xl shadow-sm flex items-center justify-center text-rose-500"
                style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
              >
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight ${resolvedTextMain}`}>Mis Favoritos</h2>
                <p className={`text-xs font-medium ${resolvedTextMuted}`}>{favoriteProducts.length} productos guardados</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 ${resolvedTextMain}`}
              style={dynamicSubCardStyle}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(!favoriteProducts || favoriteProducts.length === 0) ? (
              <div className={`text-center py-20 ${resolvedTextMuted}`}>
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-20 text-rose-500 fill-rose-500" />
                <p className={`text-sm font-medium ${resolvedTextMain}`}>No tienes productos en favoritos</p>
              </div>
            ) : (
              favoriteProducts.map((product) => {
                const productId = product.id || product._id;
                const itemType = product._itemType || 'product';
                const isService = itemType === 'service';
                // ✅ USAR getImageUrl DEL PROP
                const resolvedImage = getImageUrl(product);
                const prices = getProductPrices(product);
                const ivaInfo = getPriceWithIVA(product);
                const reference = getProductReference(product);
                const totalStock = Number(product.stock ?? product.existencias ?? 99);
                const currentCart = typeof cart === 'object' && cart !== null ? cart : {};
                const qty = currentCart[productId] || 0;
                
                const isInCurrentStore = isProductInCurrentStore(product);

                const getBadgeStyles = () => {
                  if (ivaInfo.ivaType === 'exempt') {
                    return {
                      bg: 'rgba(100,116,139,0.15)',
                      color: '#64748b',
                      label: 'Exento'
                    };
                  } else if (ivaInfo.ivaType === 'included') {
                    return {
                      bg: 'rgba(34,197,94,0.15)',
                      color: '#22c55e',
                      label: `IVA ${ivaInfo.ivaRate}% Inc.`
                    };
                  } else {
                    return {
                      bg: 'rgba(251,191,36,0.15)',
                      color: '#f59e0b',
                      label: `IVA +${ivaInfo.ivaRate}%`
                    };
                  }
                };

                const badgeStyles = getBadgeStyles();

                return (
                  <div 
                    key={productId}
                    className="border p-4 rounded-3xl transition-all shadow-sm flex flex-col gap-3"
                    style={dynamicSubCardStyle}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div 
                        className="flex items-center space-x-3.5 overflow-hidden flex-1 cursor-pointer group"
                        onClick={() => handleProductClick(product)}
                      >
                        {/* Imagen */}
                        <div 
                          className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border flex items-center justify-center"
                          style={dynamicSubCardStyle}
                        > 
                          {resolvedImage ? (
                            <Image
                              src={resolvedImage}
                              alt={product.name || product.nombre || 'Producto'}
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

                        {/* Info */}
                        <div className="overflow-hidden min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-sm font-bold truncate group-hover:underline ${resolvedTextMain}`}>
                              {product.name || product.nombre || 'Producto'}
                            </h4>
                            {/* 🔥 BADGE DE TIPO */}
                            <span
                              className="text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider"
                              style={{
                                backgroundColor: isService
                                  ? 'rgba(99,102,241,0.15)'
                                  : 'rgba(20,184,166,0.15)',
                                color: isService ? '#6366f1' : '#14b8a6',
                              }}
                            >
                              {isService ? 'Servicio' : 'Producto'}
                            </span>
                            <span 
                              className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0`}
                              style={{
                                backgroundColor: badgeStyles.bg,
                                color: badgeStyles.color
                              }}
                            >
                              {badgeStyles.label}
                            </span>
                          </div>
                          
                          {reference && (
                            <span className={`text-[11px] block font-medium ${resolvedTextMuted}`}>
                              Ref: {reference}
                            </span>
                          )}

<div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
  {ivaInfo.hasDiscount && ivaInfo.discountInfo ? (
    <>
      <span className="text-[11px] line-through opacity-50" style={{ color: resolvedTextMuted }}>
        Bs. {formatPrice(ivaInfo.discountInfo.originalPriceVES)}
      </span>
      <span className="font-black text-sm" style={{ color: primary }}>
        Bs. {formatPrice(ivaInfo.priceWithIVA)}
      </span>
      <span className={`text-[11px] font-semibold`} style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
        (${(ivaInfo.priceWithIVAUSD || 0).toFixed(2)})
      </span>
      <span 
        className="px-1.5 py-0.5 rounded text-[8px] font-bold"
        style={{
          backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
          color: isSecondaryLight ? '#991b1b' : '#f87171',
        }}
      >
        -{ivaInfo.discountPercentage}%
      </span>
    </>
  ) : (
    <>
      <span className="font-black text-sm" style={{ color: primary }}>
        Bs. {formatPrice(ivaInfo.priceWithIVA)}
      </span>
      <span className={`text-[11px] font-semibold`} style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
        (${(ivaInfo.priceWithIVAUSD || 0).toFixed(2)})
      </span>
    </>
  )}
</div>

                          {ivaInfo.ivaType !== 'exempt' && ivaInfo.ivaAmount > 0 && (
                            <span className={`text-[8px] ${resolvedTextMuted} block opacity-60`}>
                              {ivaInfo.ivaType === 'included' 
                                ? `IVA ${ivaInfo.ivaRate}% incluido`
                                : `Base: Bs. ${formatPrice(prices.VES)} + ${ivaInfo.ivaRate}% IVA`
                              }
                            </span>
                          )}
                          {ivaInfo.ivaType === 'exempt' && (
                            <span className={`text-[8px] ${resolvedTextMuted} block opacity-60`}>
                              ✓ Exento de IVA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botón Quitar de Favoritos */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // 🔥 Pasar el tipo explícito
                          if (isService) {
                            (onToggleFavoriteService || onToggleFavorite)(
                              productId,
                              'service',
                            );
                          } else {
                            onToggleFavorite(productId, 'product');
                          }
                        }}
                        className={`p-2.5 rounded-2xl transition border shrink-0 ${
                          isSecondaryLight 
                            ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20'
                        }`}
                        title="Quitar de favoritos"
                      >
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      </button>
                    </div>

                    {/* Botón condicional */}
                    <div 
                      className="pt-2 border-t border-dashed"
                      style={{ borderColor: borderDynamic }}
                    >
                      {isService ? (
                        // 🔥 SERVICIOS: solo "Ver y Reservar"
                        <button
                          onClick={() => handleProductClick(product)}
                          style={{ backgroundColor: primary }}
                          className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                            isPrimaryLight ? 'text-slate-950 font-black' : 'text-slate-100'
                          } hover:opacity-90 active:scale-95`}
                        >
                          <Eye className="w-4 h-4" />
                          Ver y Reservar
                        </button>
                      ) : isInCurrentStore ? (
                        // 🔥 PRODUCTOS EN TIENDA ACTUAL: carrito
                        updateCartQty ? (
                          qty === 0 ? (
                            <button
                              onClick={() => updateCartQty(productId, 1, totalStock)}
                              style={{ backgroundColor: primary }}
                              className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                                isPrimaryLight ? 'text-slate-950 font-black' : 'text-slate-100'
                              } hover:opacity-90 active:scale-95`}
                            >
                              <ShoppingBag className="w-4 h-4" />
                              Añadir al Carrito
                            </button>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}>
                                  En carrito: {qty}
                                </span>
                              </div>
                              <div className="flex items-center rounded-xl p-1 border" style={dynamicSubCardStyle}>
                                <button
                                  onClick={() => updateCartQty(productId, qty - 1, totalStock)}
                                  className={`p-1.5 rounded-lg transition hover:opacity-75 ${resolvedTextMain}`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className={`px-3 text-xs font-black ${resolvedTextMain}`}>
                                  {qty}
                                </span>
                                <button
                                  onClick={() => updateCartQty(productId, qty + 1, totalStock)}
                                  className={`p-1.5 rounded-lg transition hover:opacity-75 ${resolvedTextMain}`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                        ) : onAddToCart ? (
                          <button
                            onClick={() => onAddToCart(product)}
                            style={{ backgroundColor: primary }}
                            className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                              isPrimaryLight ? 'text-slate-950 font-black' : 'text-slate-100'
                            } hover:opacity-90 active:scale-95`}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            Añadir al Carrito
                          </button>
                        ) : null
                      ) : (
                        // 🔥 PRODUCTOS DE OTRA TIENDA: ver producto
                        <button
                          onClick={() => handleProductClick(product)}
                          style={{ backgroundColor: primary }}
                          className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                            isPrimaryLight ? 'text-slate-950 font-black' : 'text-slate-100'
                          } hover:opacity-90 active:scale-95`}
                        >
                          <Eye className="w-4 h-4" />
                          Ver Producto
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div 
            className="p-6 border-t"
            style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <button
              onClick={onClose}
              style={{ backgroundColor: primary }}
              className={`w-full py-3.5 rounded-2xl font-bold transition text-xs shadow-lg flex items-center justify-center gap-2 ${
                isPrimaryLight ? 'text-slate-950 font-black' : 'text-slate-100'
              } hover:opacity-90 active:scale-95`}
            >
              Seguir Comprando
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}