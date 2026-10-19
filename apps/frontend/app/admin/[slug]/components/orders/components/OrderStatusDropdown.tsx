'use client';

import React, { useState } from 'react';
import { getStatusOptions, getStatusConfirmationMessage, isStatusLocked } from './hooks/orderUtils';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface OrderStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => Promise<void>;
  isDarkBg: boolean;
  textColor: string;
  subtleBorderColor: string;
  primary: string;
  secondary?: string;
  onClose: () => void;
}

export default function OrderStatusDropdown({
  currentStatus,
  onStatusChange,
  isDarkBg,
  textColor,
  subtleBorderColor,
  primary,
  secondary,
  onClose,
}: OrderStatusDropdownProps) {
  const options = getStatusOptions(currentStatus);
  const isLocked = isStatusLocked(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isPending = currentStatus?.toLowerCase() === 'pending';

  const handleStatusClick = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      onClose();
      return;
    }

    if (isPending) {
      onClose();
      return;
    }

    const normalized = newStatus.toUpperCase().trim();
    if (normalized === 'COMPLETED' || normalized === 'CANCELLED' || normalized === 'CONFIRMED') {
      setPendingStatus(newStatus);
      setShowConfirmModal(true);
      return;
    }

    await onStatusChange(newStatus);
    onClose();
  };

  const handleConfirm = async () => {
    if (!pendingStatus) return;
    setShowConfirmModal(false);
    await onStatusChange(pendingStatus);
    setPendingStatus(null);
    onClose();
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
  };

  // 🔥 COLORES HEREDADOS
  const dropdownBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');
  const modalBg = secondary || (isDarkBg ? '#0f172a' : '#ffffff');
  const modalBorderColor = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const overlayBg = isDarkBg ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)';
  
  const confirmMessage = pendingStatus ? getStatusConfirmationMessage(pendingStatus) : '';

  if (isPending) {
    return (
      <div 
        className="py-3 px-4 rounded-xl border min-w-[160px] text-center"
        style={{ 
          backgroundColor: dropdownBg,
          borderColor: subtleBorderColor,
          color: textColor
        }}
      >
        <p className="text-xs font-medium opacity-80">
          Pendiente de pago
        </p>
        <p className="text-[10px] opacity-60 mt-1">
          El cliente debe reportar el pago
        </p>
      </div>
    );
  }

  return (
    <>
      <div 
        className="py-1 rounded-xl shadow-xl border overflow-hidden min-w-[160px]"
        style={{ 
          backgroundColor: dropdownBg,
          borderColor: subtleBorderColor,
          color: textColor
        }}
      >
        {isLocked && (
          <div 
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-center border-b opacity-60"
            style={{ 
              borderColor: subtleBorderColor,
              color: textColor
            }}
          >
            Orden finalizada - No se puede modificar
          </div>
        )}

        {options.map((option) => {
          const isCurrent = option.value === currentStatus;
          const isDisabled = option.disabled || isLocked;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusClick(option.value)}
              disabled={isDisabled}
              className={`w-full px-4 py-2.5 text-xs text-left transition flex items-center justify-between ${
                isCurrent 
                  ? 'opacity-70 cursor-default' 
                  : isDisabled 
                    ? 'opacity-40 cursor-not-allowed hover:bg-transparent' 
                    : 'hover:opacity-80 cursor-pointer'
              }`}
              style={{
                backgroundColor: isCurrent ? `${primary}20` : 'transparent',
                color: isCurrent ? primary : textColor,
              }}
              onMouseEnter={(e) => {
                if (!isCurrent && !isDisabled) {
                  e.currentTarget.style.backgroundColor = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent && !isDisabled) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{option.label}</span>
              {isCurrent && (
                <span className="text-[10px]" style={{ color: primary }}>✓</span>
              )}
              {isDisabled && !isCurrent && (
                <span className="text-[9px] opacity-40">●</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 🔥 MODAL DE CONFIRMACIÓN CON FONDO HEREDADO Y SIN EMOJIS */}
      {showConfirmModal && pendingStatus && (
        <div 
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          style={{ 
            backgroundColor: overlayBg,
          }}
          onClick={handleCancelConfirm}
        >
          <div 
            className="w-full max-w-md rounded-2xl border shadow-xl p-6 transition-all duration-200"
            style={{ 
              backgroundColor: modalBg,
              borderColor: modalBorderColor,
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
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold" style={{ color: textColor }}>
                  Confirmar acción
                </h3>
                <p className="text-sm opacity-70 mt-1 leading-relaxed">
                  {confirmMessage || '¿Estás seguro de realizar esta acción?'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 justify-end border-t pt-4" style={{ borderColor: modalBorderColor }}>
              <button
                type="button"
                onClick={handleCancelConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition hover:opacity-70 ${
                  isDarkBg ? 'text-slate-300' : 'text-slate-700'
                }`}
                style={{ 
                  borderColor: modalBorderColor,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-bold rounded-xl text-white shadow-lg hover:opacity-90 transition flex items-center gap-2"
                style={{ backgroundColor: '#f43f5e' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}