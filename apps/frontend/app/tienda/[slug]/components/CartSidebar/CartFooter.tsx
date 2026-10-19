'use client';

import React, { useState } from 'react';
import { CreditCard, Mail, ChevronDown, ChevronUp, Package, Receipt } from 'lucide-react';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';

// 🔥 Interfaz para el IVA
interface IvaInfo {
  ivaType: 'included' | 'excluded' | 'exempt';
  ivaRate: number;
  ivaAmount: number;
  basePrice: number;
  priceWithIVA: number;
}

interface CartFooterProps {
  cartItems: any[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setCustomerAddress?: (address: string) => void;
  finalVes: number;
  finalUsd: number;
  formatPrice: (num: number) => string;
  isSecondaryLight: boolean;
  isPrimaryLight: boolean;
  safePrimary: string;
  borderDynamic: string;
  resolvedTextMain: string;
  resolvedTextMuted: string;
  tenantConfig: any;
  isSubmitting: boolean;
  hasValidPaymentMethods: boolean;
  onGenerateOrder: () => void;
  isStoreOpen: boolean;
  storeClosedMessage?: string;
}

export default function CartFooter({
  cartItems,
  customerName,
  customerPhone,
  customerEmail = '',
  customerAddress = '',
  setCustomerName,
  setCustomerPhone,
  setCustomerAddress,
  finalVes,
  finalUsd,
  formatPrice,
  isSecondaryLight,
  isPrimaryLight,
  safePrimary,
  borderDynamic,
  resolvedTextMain,
  resolvedTextMuted,
  tenantConfig,
  isSubmitting,
  hasValidPaymentMethods,
  onGenerateOrder,
  isStoreOpen,
  cartQuote,
  storeClosedMessage = 'La tienda está cerrada en este momento.',
}: CartFooterProps & {
  cartQuote?: any;
}) {

  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
  const { rates, loading: ratesLoading } = useExchangeRateContext();
  
  // 🔥 TASA DE CAMBIO DINÁMICA - NUNCA USAR 784.66
  const exchangeRate = rates.USD > 0 ? rates.USD : 0;

    // 🔥 ESTADO PARA COLLAPSE DEL DESGLOSE
  const [isIvaExpanded, setIsIvaExpanded] = useState(true);

  // ============================================================
  // 🔥 TOTALES DEL BACKEND (fuente de verdad)
  // ============================================================
  // El CartFooter recibe `cartQuote` del padre.
  // NO calcula nada. Solo lee.
  // ============================================================
  const ivaInfo = {
    totalBaseVes: Number(cartQuote?.subtotalVES || 0),
    totalIVA: Number(cartQuote?.totalTaxVES || 0),
    totalWithIVAVes: Number(cartQuote?.totalVES || 0),
    totalIvaType: cartQuote?.ivaType || 'excluded',
    totalIvaRate: Number(cartQuote?.ivaRate || 0),
    hasMixedIVA: Boolean(cartQuote?.hasMixedIVA),
    hasIncluded: cartQuote?.ivaType === 'included',
    hasExcluded: cartQuote?.ivaType === 'excluded',
    hasExemptItems: Boolean(cartQuote?.hasExemptItems),
  };

  const isDisabled = 
    cartItems.length === 0 || 
    !customerName || 
    !customerPhone || 
    !isStoreOpen ||
    isSubmitting;

  const getButtonText = () => {
    if (isSubmitting) return 'Generando Orden...';
    if (!isStoreOpen) return 'Tienda Cerrada';
    if (cartItems.length === 0) return 'Carrito Vacío';
    if (!customerName || !customerPhone) return 'Completa tus datos';
    return 'Generar Orden de Compra';
  };

  // 🔥 Badge de IVA
  const getIvaBadge = () => {
    if (ivaInfo.totalIvaType === 'exempt' || ivaInfo.totalIVA === 0) {
      return 'Exento de IVA';
    }
    if (ivaInfo.totalIvaType === 'included') {
      return `IVA ${ivaInfo.totalIvaRate}% Incluido`;
    }
    if (ivaInfo.hasMixedIVA) {
      return `IVA Mixto (${ivaInfo.totalIvaRate}%)`;
    }
    return `IVA ${ivaInfo.totalIvaRate}% No Incluido`;
  };

  const getIvaBadgeColor = () => {
    if (ivaInfo.totalIvaType === 'exempt' || ivaInfo.totalIVA === 0) {
      return { bg: 'rgba(100,116,139,0.15)', color: '#64748b' };
    }
    if (ivaInfo.totalIvaType === 'included') {
      return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
    }
    if (ivaInfo.hasMixedIVA) {
      return { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' };
    }
    return { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' };
  };

  const ivaBadgeColor = getIvaBadgeColor();

  // 🔥 CONTADOR DE ÍTEMS
  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return (
    <div 
      className="p-6 border-t space-y-4"
      style={{ 
        borderColor: borderDynamic, 
        backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' 
      }}
    >
      {/* 🔥 ENCABEZADO CON CONTADOR DE ÍTEMS */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 opacity-60" style={{ color: safePrimary }} />
          <span className={`text-xs font-bold uppercase tracking-wider ${resolvedTextMain}`}>
            {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'} en tu carrito
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsIvaExpanded(!isIvaExpanded)}
          className="p-1.5 rounded-lg transition hover:opacity-70 flex items-center gap-1 text-xs font-medium"
          style={{ color: safePrimary }}
        >
          {isIvaExpanded ? (
            <>Ocultar desglose <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Ver desglose <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>

      {/* 🔥 DESGLOSE DEL IVA - COLLAPSABLE */}
      {isIvaExpanded && (
        <>
          {/* TOTAL CON IVA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 opacity-60" style={{ color: safePrimary }} />
              <span className={`font-black text-xs uppercase tracking-wider ${resolvedTextMain}`}>
                Total a Pagar:
              </span>
              <span 
                className={`text-[9px] px-2 py-0.5 rounded-full font-medium border inline-block ${resolvedTextMuted}`}
                style={{
                  backgroundColor: ivaBadgeColor.bg,
                  borderColor: `${ivaBadgeColor.color}30`,
                  color: ivaBadgeColor.color
                }}
              >
                {getIvaBadge()}
              </span>
            </div>
            <div className="text-right">
              {cartQuote?.hasDiscount && cartQuote?.originalTotalVES && (
                <span className={`text-xs line-through opacity-50 block ${resolvedTextMuted}`}>
                  Bs. {formatPrice(Number(cartQuote.originalTotalVES))}
                </span>
              )}
              <span className="font-black text-lg tracking-tight block" style={{ color: safePrimary }}>
                Bs. {formatPrice(ivaInfo.totalWithIVAVes)}
              </span>
              <span
                className="text-xs font-bold opacity-75 block"
                style={{ color: isSecondaryLight ? '#065f46' : '#34d399' }}
              >
                (${finalUsd.toFixed(2)})
              </span>
              {cartQuote?.totalDiscountVES > 0 && (
                <span className="text-[10px] font-bold block text-emerald-500">
                  Ahorras Bs. {formatPrice(Number(cartQuote.totalDiscountVES))}
                </span>
              )}
            </div>
          </div>

          {/* 🔥 DESGLOSE DEL IVA */}
          {(ivaInfo.totalIVA > 0 || ivaInfo.totalIvaType === 'included') && (
            <div 
              className="p-3 rounded-xl border text-xs space-y-1 animate-in slide-in-from-top-2 duration-200"
              style={{ 
                borderColor: borderDynamic,
                backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className={`opacity-70 ${resolvedTextMuted}`}>Subtotal (sin IVA):</span>
                <span className={`font-medium ${resolvedTextMain}`}>Bs. {formatPrice(ivaInfo.totalBaseVes)}</span>
              </div>
              {ivaInfo.totalIVA > 0 && (
                <div className="flex items-center justify-between">
                  <span className={`opacity-70 ${resolvedTextMuted}`}>
                    {ivaInfo.hasMixedIVA ? 'IVA (varios)' : `IVA (${ivaInfo.totalIvaRate}%)`}:
                  </span>
                  <span className={`font-medium ${resolvedTextMain}`}>Bs. {formatPrice(ivaInfo.totalIVA)}</span>
                </div>
              )}
              {ivaInfo.totalIvaType === 'included' && ivaInfo.totalIVA === 0 && (
                <div className="flex items-center justify-between">
                  <span className={`opacity-70 ${resolvedTextMuted}`}>IVA ({ivaInfo.totalIvaRate}%):</span>
                  <span className={`font-medium ${resolvedTextMain}`} style={{ color: safePrimary }}>
                    (Incluido en el precio)
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold pt-1 border-t" style={{ borderColor: borderDynamic }}>
                <span className={resolvedTextMain}>Total con IVA:</span>
                <span style={{ color: safePrimary }}>Bs. {formatPrice(ivaInfo.totalWithIVAVes)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 🔥 VERSIÓN SIMPLIFICADA CUANDO ESTÁ COLAPSADO */}
      {!isIvaExpanded && (
        <div className="flex items-center justify-between">
          <span className={`font-black text-xs uppercase tracking-wider ${resolvedTextMain}`}>
            Total a Pagar:
          </span>
          <div className="text-right">
            {cartQuote?.hasDiscount && cartQuote?.originalTotalVES && (
              <span className={`text-xs line-through opacity-50 block ${resolvedTextMuted}`}>
                Bs. {formatPrice(Number(cartQuote.originalTotalVES))}
              </span>
            )}
            <span className="font-black text-lg tracking-tight block" style={{ color: safePrimary }}>
              Bs. {formatPrice(ivaInfo.totalWithIVAVes)}
            </span>
            <span className={`text-xs font-bold opacity-75 block ${resolvedTextMuted}`}>
              (${finalUsd.toFixed(2)})
            </span>
            {cartQuote?.totalDiscountVES > 0 && (
              <span className="text-[10px] font-bold block text-emerald-500">
                Ahorras Bs. {formatPrice(Number(cartQuote.totalDiscountVES))}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <h4 className={`font-black text-xs uppercase tracking-wider ${resolvedTextMain}`}>
          Datos del Cliente
        </h4>
        
        <input 
          type="text"
          placeholder={tenantConfig?.namePlaceholder || "Nombre y Apellido"}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all shadow-inner ${
            isSecondaryLight 
              ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30' 
              : 'bg-white/5 border-white/10 text-white focus:border-white/30'
          }`}
          disabled={!isStoreOpen}
        />

        <input 
          type="text"
          placeholder={tenantConfig?.phonePlaceholder || "Teléfono de Contacto"}
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all shadow-inner ${
            isSecondaryLight 
              ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30' 
              : 'bg-white/5 border-white/10 text-white focus:border-white/30'
          }`}
          disabled={!isStoreOpen}
        />

        {customerEmail && (
          <div 
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border flex items-center gap-2 ${
              isSecondaryLight 
                ? 'bg-slate-100 border-slate-300 text-slate-500' 
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
            style={{ opacity: 0.7 }}
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSecondaryLight ? '#64748b' : '#94a3b8' }} />
            <span className="truncate">{customerEmail}</span>
            <span className="text-[9px] font-medium ml-auto flex-shrink-0" style={{ color: isSecondaryLight ? '#94a3b8' : '#64748b' }}>
              (bloqueado)
            </span>
          </div>
        )}
      </div>

      {!isStoreOpen && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-medium text-center">
          ⚠️ {storeClosedMessage}
        </div>
      )}

      <button
        onClick={onGenerateOrder}
        disabled={isDisabled}
        style={isDisabled ? {} : { backgroundColor: safePrimary }}
        className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
          isDisabled
            ? 'bg-slate-500/30 text-slate-400 cursor-not-allowed border border-white/5'
            : `${isPrimaryLight ? 'text-slate-950 font-black' : 'text-slate-100'} hover:opacity-90 active:scale-95 cursor-pointer`
        }`}
      >
        <CreditCard className="w-4 h-4" />
        {getButtonText()}
      </button>
    </div>
  );
}