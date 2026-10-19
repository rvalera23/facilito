'use client';

  import React, { useState, useEffect } from 'react';
  import { ShoppingBag, X, CheckCircle2, Package, MapPin, Phone, User, Receipt } from 'lucide-react';
  import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
  import { formatPhoneDisplay } from '@/lib/formatPhone';
  import { useThemeBackground } from '@/hooks/useThemeBackground';
  import { getPriceColors } from '@/lib/priceTokens';

  interface CartConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    confirmedData: boolean;
    setConfirmedData: (value: boolean) => void;
    cartItems: any[];
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerEmail?: string;
    selectedDelivery?: string;
    delivery?: {
      selected?: string;
      data?: { name?: string; days?: string };
      costUsd?: number;
      costVes?: number;
      exchangeRate?: number;
    } | null;
    finalVes: number;
    finalUsd: number;
    formatPrice: (num: number) => string;
    isSecondaryLight: boolean;
    safePrimary: string;
    borderDynamic: string;
    resolvedTextMain: string;
    resolvedTextMuted: string;
    containerBgColor?: string;
    overlayColor?: string;
    exchangeRate?: number;
    /** Saldo a favor del cliente en este tenant (en Bs.). 0 = no aplica. */
    creditBalance?: number;
    /** Estado actual: ¿el cliente quiere aplicar el saldo? */
    applyCredit?: boolean;
    /** Callback cuando el cliente cambia la preferencia. */
    onApplyCreditChange?: (value: boolean) => void;
  }

// ============================================================
// 🔥 LEER PRICING DEL ITEM (backend = fuente de verdad)
// ============================================================
const getItemPrice = (item: any) => {
  const p = item?._pricing || {};
  return {
    ves: Number(p.totalPriceVES || 0),
    usd: Number(p.totalPriceUSD || 0),
    basePrice: Number(p.basePriceVES || 0),
    priceWithIVA: Number(p.totalPriceVES || 0),
    ivaAmount: Number(p.taxAmountVES || 0),
    ivaType: p.ivaType || 'excluded',
    ivaRate: Number(p.ivaRate || 0),
    display: p.ivaType === 'included' ? 'IVA Inc.' :
             p.ivaType === 'exempt'   ? 'Exento' : 'IVA +',
    badgeColor: p.ivaType === 'included' ? '#22c55e' :
                p.ivaType === 'exempt'   ? '#64748b' : '#f59e0b',
    badgeBg: p.ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
             p.ivaType === 'exempt'   ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
  };
};
  export default function CartConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
    confirmedData,
    setConfirmedData,
    cartItems,
    customerName,
    customerPhone,
    customerAddress,
    customerEmail = '',
    selectedDelivery = '',
    delivery = null,
    finalVes,
    finalUsd,
    formatPrice,
    isSecondaryLight,
    safePrimary,
    borderDynamic,
    resolvedTextMain,
    resolvedTextMuted,
    containerBgColor,
    overlayColor,
    exchangeRate: propExchangeRate,
    cartQuote,
    creditBalance = 0,
    applyCredit = false,
    onApplyCreditChange,
  }: CartConfirmModalProps & {
    cartQuote?: any;
  }) {
    const [isVisible, setIsVisible] = useState(false);

    // 🔥 Fondo del modal centralizado (lee --bg-color, reactivo a themeChange).
    const themeBg = useThemeBackground(containerBgColor, !isSecondaryLight);

    const { rates } = useExchangeRateContext();
    
    const exchangeRate = propExchangeRate && propExchangeRate > 0 
      ? propExchangeRate 
      : (rates.USD > 0 ? rates.USD : 0);

    useEffect(() => {
      if (isOpen) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const containerBg = themeBg;
    const overlayBg = overlayColor || (isSecondaryLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)');
    const textColor = isSecondaryLight ? '#0f172a' : '#ffffff';
  const priceColors = getPriceColors({ primary: safePrimary, isDarkBg: !isSecondaryLight });
          const mutedColor = isSecondaryLight ? '#64748b' : '#94a3b8';
    const itemBg = isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';

    // ============================================================
    // 🔥 TOTALES DEL BACKEND (fuente de verdad)
    // ============================================================
    const ivaInfo = {
      totalBaseVes: Number(cartQuote?.subtotalVES || 0),
      totalIVA: Number(cartQuote?.totalTaxVES || 0),
      totalWithIVAVes: Number(cartQuote?.totalVES || 0),
      displayType: cartQuote?.ivaType === 'included' ? `IVA ${cartQuote.ivaRate}% Incluido` :
                   cartQuote?.ivaType === 'excluded' ? `IVA ${cartQuote.ivaRate}% No Incluido` :
                   cartQuote?.ivaType === 'mixed'    ? `IVA Mixto (${cartQuote.ivaRate}%)` :
                   cartQuote?.ivaType === 'exempt'   ? 'Exento de IVA' : 'Sin IVA',
      badgeBg: cartQuote?.ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
               cartQuote?.ivaType === 'excluded' ? 'rgba(251,191,36,0.15)' :
               cartQuote?.ivaType === 'mixed'    ? 'rgba(139,92,246,0.15)' :
                                                    'rgba(100,116,139,0.15)',
      badgeColor: cartQuote?.ivaType === 'included' ? '#22c55e' :
                  cartQuote?.ivaType === 'excluded' ? '#f59e0b' :
                  cartQuote?.ivaType === 'mixed'    ? '#8b5cf6' :
                                                       '#64748b',
      totalIvaType: cartQuote?.ivaType || 'exempt',
      totalIvaRate: Number(cartQuote?.ivaRate || 0),
      hasIncluded: cartQuote?.ivaType === 'included',
      hasExcluded: cartQuote?.ivaType === 'excluded',
      hasExempt: cartQuote?.ivaType === 'exempt',
    };

    const totalConIVA = ivaInfo.totalWithIVAVes;
    const deliveryCostUsd = Number(delivery?.costUsd) >= 0 ? Number(delivery?.costUsd) : 0;
    const deliveryCostVes = Number(delivery?.exchangeRate) > 0 ? Number(delivery?.costVes || 0) : 0;
    const totalOrderVes = totalConIVA + deliveryCostVes;
    const totalOrderUsd = Number(cartQuote?.totalUSD || 0) + (delivery?.selected ? deliveryCostUsd : 0);

    // 🔥 Saldo a favor aplicable
    const hasCredit = creditBalance > 0;
    const creditApplied = applyCredit && hasCredit
      ? Math.min(creditBalance, totalOrderVes)
      : 0;
    const creditAppliedRounded = Math.round(creditApplied * 100) / 100;
    const totalAfterCredit = Math.round((totalOrderVes - creditAppliedRounded) * 100) / 100;
    const usdAfterCredit = exchangeRate > 0
      ? Math.round((totalAfterCredit / exchangeRate) * 100) / 100
      : totalOrderUsd;
    const getItemPriceWithRate = (item: any) => {
      return getItemPrice(item);
    };

    return (
      <div 
        className={`fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          backgroundColor: overlayBg,
          backdropFilter: 'blur(4px)'
        }}
      >
        <style jsx>{`
          @keyframes scaleIn {
            0% { transform: scale(0.85) translateY(20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes slideUp {
            0% { transform: translateY(15px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .modal-enter { animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .item-enter { animation: slideUp 0.35s ease forwards; opacity: 0; }
          .item-enter:nth-child(1) { animation-delay: 0.03s; }
          .item-enter:nth-child(2) { animation-delay: 0.06s; }
          .item-enter:nth-child(3) { animation-delay: 0.09s; }
          .item-enter:nth-child(4) { animation-delay: 0.12s; }
          .item-enter:nth-child(5) { animation-delay: 0.15s; }
          .item-enter:nth-child(6) { animation-delay: 0.18s; }
          .item-enter:nth-child(7) { animation-delay: 0.21s; }
          .item-enter:nth-child(8) { animation-delay: 0.24s; }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px ${safePrimary}40, 0 0 60px ${safePrimary}20; }
            50% { box-shadow: 0 0 40px ${safePrimary}60, 0 0 80px ${safePrimary}30; }
          }
        `}</style>

        <div 
          className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border space-y-5 modal-enter"
          style={{ 
            backgroundColor: containerBg,
            borderColor: borderDynamic,
            color: textColor,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between border-b pb-4 item-enter" style={{ borderColor: borderDynamic }}>
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${safePrimary}15` }}
              >
                <ShoppingBag className="w-5 h-5" style={{ color: safePrimary }} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight" style={{ color: textColor }}>
                  Confirmar Compra
                </h3>
                <p className={`text-xs font-medium`} style={{ color: mutedColor }}>
                  Revisa los detalles de tu pedido
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition hover:scale-105 active:scale-95 ${
                isSecondaryLight ? 'hover:bg-black/5' : 'hover:bg-white/5'
              }`}
              style={{ color: textColor }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DATOS DEL CLIENTE */}
          <div className={`p-4 rounded-xl border space-y-2 item-enter`} style={{ backgroundColor: itemBg, borderColor: borderDynamic }}>
            <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2`} style={{ color: mutedColor }}>
              <User className="w-4 h-4 opacity-40" />
              Datos del Cliente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 opacity-40" />
                <div>
                  <span className={`text-[9px] block`} style={{ color: mutedColor }}>Nombre</span>
                  <span className={`text-sm font-bold`} style={{ color: textColor }}>
                    {customerName || 'No especificado'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 opacity-40" />
                <div>
                  <span className={`text-[9px] block`} style={{ color: mutedColor }}>Teléfono</span>
                <span className={`text-sm font-bold`} style={{ color: textColor }}>
                  {customerPhone ? formatPhoneDisplay(customerPhone) : 'No especificado'}
                </span>
                </div>
              </div>
            </div>
            
            {customerEmail && (
              <div className="flex items-center gap-2 pt-1">
                <div className="w-4 h-4 opacity-40 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className={`text-[9px] block`} style={{ color: mutedColor }}>Correo</span>
                  <span className={`text-sm font-bold`} style={{ color: textColor }}>
                    {customerEmail}
                    <span className={`text-[9px] ml-2 font-normal`} style={{ color: mutedColor }}>(Verificado)</span>
                  </span>
                </div>
              </div>
            )}

            {selectedDelivery && customerAddress && (
              <div className="flex items-start gap-2 pt-2 border-t" style={{ borderColor: borderDynamic }}>
                <MapPin className="w-4 h-4 opacity-40 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className={`text-[9px] block`} style={{ color: mutedColor }}>Dirección de entrega</span>
                  <span className={`text-sm font-bold break-words whitespace-normal`} style={{ color: textColor }}>
                    {customerAddress}
                  </span>
                  <span className={`text-[9px] block mt-0.5`} style={{ color: safePrimary }}>
                    📦 Envío con: {selectedDelivery}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* PRODUCTOS DESGLOSADOS CON IVA */}
          <div className={`p-4 rounded-xl border space-y-3 item-enter`} style={{ backgroundColor: itemBg, borderColor: borderDynamic }}>
            <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2`} style={{ color: mutedColor }}>
              <Package className="w-4 h-4 opacity-40" />
              Productos ({cartItems.length})
            </h4>

            {cartItems.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {cartItems.map((item: any, idx: number) => {
                  const quantity = Number(item.quantity || 1);
                  const priceInfo = getItemPriceWithRate(item);
                  const totalItemVes = priceInfo.priceWithIVA * quantity;

                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm py-1.5 border-b last:border-0"
                      style={{ borderColor: borderDynamic }}
                    >
  <div className="flex-1">
    <span className={`font-medium`} style={{ color: textColor }}>
      {item.name || item.title || 'Producto'} 
      <span className="opacity-60"> × {quantity}</span>
    </span>
    {item.discountInfo && (
      <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{
        backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
        color: isSecondaryLight ? '#991b1b' : '#f87171',
      }}>
        -{item.discountInfo.discountPercentage}%
      </span>
    )}
    {priceInfo.ivaType !== 'exempt' && (
      <span 
        className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-2 inline-block`}
        style={{
          backgroundColor: priceInfo.badgeBg,
          color: priceInfo.badgeColor
        }}
      >
        {priceInfo.display}
      </span>
    )}
  </div>
                      <span className={`font-bold`} style={{ color: safePrimary }}>
                        Bs. {formatPrice(totalItemVes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DESGLOSE DE IVA DEL CARRITO */}
          {cartItems.length > 0 && (
            <div className={`p-4 rounded-xl border space-y-2 item-enter`} style={{ backgroundColor: itemBg, borderColor: borderDynamic }}>
              <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2`} style={{ color: mutedColor }}>
                <Receipt className="w-4 h-4 opacity-40" />
                Desglose del Pago
                <span 
                  className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ml-2`}
                  style={{
                    backgroundColor: ivaInfo.badgeBg,
                    borderColor: `${ivaInfo.badgeColor}30`,
                    color: ivaInfo.badgeColor
                  }}
                >
                  {ivaInfo.displayType}
                </span>
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`opacity-70`} style={{ color: mutedColor }}>Subtotal (sin IVA):</span>
                  <span className={`font-medium`} style={{ color: textColor }}>Bs. {formatPrice(ivaInfo.totalBaseVes)}</span>
                </div>
                {ivaInfo.totalIVA > 0 && (
                  <div className="flex items-center justify-between">
                    <span className={`opacity-70`} style={{ color: mutedColor }}>
                      IVA ({ivaInfo.totalIvaRate}%):
                    </span>
                    <span className={`font-medium`} style={{ color: textColor }}>Bs. {formatPrice(ivaInfo.totalIVA)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between font-bold pt-1 border-t" style={{ borderColor: borderDynamic }}>
                  <span style={{ color: textColor }}>Total con IVA:</span>
                  <span style={{ color: safePrimary }}>Bs. {formatPrice(totalConIVA)}</span>
                </div>
                {delivery?.selected && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: mutedColor }}>Envío / Delivery ({delivery.data?.name || selectedDelivery})</span>
                    {delivery?.costUsd === null ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(251,191,36,0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(251,191,36,0.3)',
                        }}
                      >
                        Cobro a destino
                      </span>
                    ) : (
                      <span style={{ color: priceColors.foreign }}>${deliveryCostUsd.toFixed(2)} USD</span>
                                          )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🔥 SALDO A FAVOR */}
          {hasCredit && (
            <div
              className={`p-3 rounded-xl border item-enter`}
              style={{
                borderColor: applyCredit ? safePrimary : borderDynamic,
                backgroundColor: applyCredit ? `${safePrimary}10` : itemBg,
              }}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyCredit}
                  onChange={(e) =>
                    onApplyCreditChange && onApplyCreditChange(e.target.checked)
                  }
                  className="w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0"
                  style={{ accentColor: safePrimary }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: textColor }}>
                    Aplicar saldo a favor
                  </div>
                  <div className="text-xs" style={{ color: mutedColor }}>
                    Disponible: Bs. {formatPrice(creditBalance)}
                    {applyCredit && creditAppliedRounded > 0 && (
                      <span className="ml-2 font-bold" style={{ color: safePrimary }}>
                        (Aplicado: Bs. {formatPrice(creditAppliedRounded)})
                      </span>
                    )}
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* TOTAL */}
          <div className={`flex items-center justify-between border-t pt-4 item-enter`} style={{ borderColor: borderDynamic }}>
            <span className={`font-bold text-sm`} style={{ color: textColor }}>Total a Pagar</span>
            <div className="text-right">
              {creditAppliedRounded > 0 && (
                <span
                  className="text-xs line-through opacity-50 block"
                  style={{ color: mutedColor }}
                >
                  Bs. {formatPrice(totalOrderVes)}
                </span>
              )}
              <span className="font-black text-xl tracking-tight block" style={{ color: safePrimary }}>
                Bs. {formatPrice(totalAfterCredit)}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: isSecondaryLight ? '#065f46' : '#34d399' }}
              >
                ${usdAfterCredit.toFixed(2)} USD
                {exchangeRate > 0 && (
                  <span className="text-[8px] block opacity-60 font-medium">Tasa: 1 USD = Bs. {exchangeRate.toFixed(2)}</span>
                )}
              </span>
              {creditAppliedRounded > 0 && (
                <span
                  className="text-[10px] font-bold block mt-0.5"
                  style={{ color: safePrimary }}
                >
                  Ahorras Bs. {formatPrice(creditAppliedRounded)} con tu saldo
                </span>
              )}
            </div>
          </div>

          {/* CHECKBOX */}
          <div className="flex items-start gap-3 pt-2 item-enter">
            <input
              type="checkbox"
              id="confirm-data"
              checked={confirmedData}
              onChange={(e) => setConfirmedData(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-2 cursor-pointer flex-shrink-0"
              style={{ accentColor: safePrimary }}
            />
            <label htmlFor="confirm-data" className="text-sm font-medium cursor-pointer leading-relaxed" style={{ color: textColor }}>
              He verificado los datos de la compra y confirmo que deseo realizar el pedido.
            </label>
          </div>

          {/* BOTONES */}
          <div className="flex gap-3 pt-2 item-enter">
            <button
              onClick={onClose}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition hover:opacity-80 active:scale-95 ${
                isSecondaryLight 
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!confirmedData || isSubmitting}
              style={{ 
                backgroundColor: confirmedData && !isSubmitting ? safePrimary : 'rgba(100,116,139,0.3)',
                animation: confirmedData && !isSubmitting ? 'pulseGlow 2s ease-in-out infinite' : 'none',
              }}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 ${
                confirmedData && !isSubmitting ? 'text-white' : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {isSubmitting ? 'Procesando...' : 'Confirmar Compra'}
            </button>
          </div>
        </div>
      </div>
    );
  }