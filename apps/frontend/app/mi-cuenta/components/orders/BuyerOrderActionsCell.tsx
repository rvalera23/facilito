'use client';

import React, { useState } from 'react';

interface BuyerOrderActionsCellProps {
  order: any;
  onViewDetails: (order: any) => void;
  onCancelOrder?: (orderId: string) => Promise<void>;
  isCancelling?: boolean;
  primary: string;
  secondary?: string;
  isDarkBg: boolean;
  textColor: string;
  subtleBorderColor: string;
}

export default function BuyerOrderActionsCell({
  order,
  onViewDetails,
  onCancelOrder,
  isCancelling = false,
  primary,
  secondary,
  isDarkBg,
  textColor,
  subtleBorderColor,
}: BuyerOrderActionsCellProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const normalizedStatus = order.status?.toUpperCase().trim() || '';
  const isCompleted = normalizedStatus === 'COMPLETED';
  const isCancelled = normalizedStatus === 'CANCELLED';
  const isLocked = isCompleted || isCancelled;
  
  // 🔥 REGLA DE NEGOCIO: El comprador solo puede cancelar en PENDING o POR_VERIFICAR.
  // Si la orden ya está CONFIRMED (o superior), debe contactar al vendedor.
  const isCancelableStatus = ['PENDING', 'POR_VERIFICAR'].includes(normalizedStatus);
  const canCancel = isCancelableStatus && !isLocked && onCancelOrder;
  
  // 🔥 Mostrar tooltip explicativo si el comprador quiere cancelar pero no puede
  const cancelBlockedReason = !isCancelableStatus && !isLocked
    ? 'El pedido ya fue confirmado. Contactá al vendedor para cancelar.'
    : null;

  const handleCancel = async () => {
    if (!onCancelOrder || !order.id) return;
    setShowCancelConfirm(false);
    try {
      await onCancelOrder(order.id);
    } catch (error) {
      console.error('❌ Error al cancelar:', error);
    }
  };

  const modalBg = secondary || (isDarkBg ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)');
  const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)';
  const borderColor = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <div className="flex items-center justify-end gap-2" style={{ color: textColor }}>
      {canCancel && (
        <>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            disabled={isCancelling}
            className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 border-rose-500/30"
            title="Cancelar orden"
          >
            {isCancelling ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>

          {showCancelConfirm && (
            <div 
              className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
              style={{ backgroundColor: overlayBg }}
              onClick={() => setShowCancelConfirm(false)}
            >
              <div 
                className="w-full max-w-md rounded-2xl border shadow-xl p-6 transition-all duration-200"
                style={{ 
                  backgroundColor: modalBg,
                  borderColor: borderColor,
                  color: textColor
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ 
                      backgroundColor: isDarkBg ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)',
                      color: '#f43f5e'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold" style={{ color: textColor }}>
                      Cancelar orden
                    </h3>
                    <p className="text-sm opacity-70 mt-1 leading-relaxed">
                      ¿Estás seguro de que deseas cancelar esta orden? Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 justify-end border-t pt-4" style={{ borderColor: borderColor }}>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 text-sm font-medium rounded-xl border transition hover:opacity-70"
                    style={{ 
                      borderColor: borderColor,
                      color: textColor,
                      opacity: 0.7
                    }}
                  >
                    No, volver
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="px-4 py-2 text-sm font-bold rounded-xl text-white shadow-lg hover:opacity-90 transition flex items-center gap-2"
                    style={{ backgroundColor: '#f43f5e' }}
                  >
                    {isCancelling ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Cancelando...
                      </>
                    ) : (
                      'Sí, cancelar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => onViewDetails(order)}
        className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm"
        style={{
          color: primary,
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: subtleBorderColor
        }}
        title="Ver detalles de la orden"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    </div>
  );
}