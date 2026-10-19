// frontend/app/admin/[slug]/components/shipping/ShippingActions.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { STATUS_OPTIONS } from './constants';

interface ShippingActionsProps {
  orderId: string;
  currentStatus: string;
  onStatusChange: (orderId: string, status: string) => Promise<void>;
  isUpdating: boolean;
  isDarkBg: boolean;
  textColor: string;
  cardBorder: string;
  // 🔥 NUEVO: prop opcional para heredar el fondo del tema
  cardBg?: string;
  primary?: string;
}

export default function ShippingActions({
  orderId,
  currentStatus,
  onStatusChange,
  isUpdating,
  isDarkBg,
  textColor,
  cardBorder,
  cardBg,
  primary,
}: ShippingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (status: string) => {
    if (status === currentStatus) {
      setIsOpen(false);
      return;
    }
    await onStatusChange(orderId, status);
    setIsOpen(false);
  };

  // Obtener label del estado actual
  const getCurrentLabel = () => {
    const option = STATUS_OPTIONS.find(opt => opt.value === currentStatus);
    return option?.label || currentStatus;
  };

  // 🔥 Fondo del dropdown: heredar del tema, con fallback
  const dropdownBg = useMemo(() => {
    if (cardBg) return cardBg;
    // Fallback: simular el mismo tono de las tarjetas
    return isDarkBg ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  }, [cardBg, isDarkBg]);

  // 🔥 Color del hover según el tema
  const hoverBg = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  // 🔥 Color del ítem activo (usa primary si viene, sino fallback)
  const activeBg = primary
    ? `${primary}20`
    : isDarkBg
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.05)';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="px-3 py-1.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1.5 hover:opacity-70"
        style={{
          borderColor: cardBorder,
          color: textColor,
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        }}
      >
        {isUpdating ? (
          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: textColor }} />
        ) : (
          <>
            {getCurrentLabel()}
            <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 bottom-full mb-1 w-40 rounded-xl border shadow-2xl py-1 z-50"
          style={{
            // 🔥 FONDO HEREDADO DEL TEMA (o fallback adaptativo)
            backgroundColor: dropdownBg,
            borderColor: cardBorder,
          }}
        >
          {STATUS_OPTIONS.map((option) => {
            const isActive = option.value === currentStatus;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusChange(option.value)}
                className="w-full text-left px-3 py-1.5 text-[10px] font-bold transition cursor-pointer"
                style={{
                  color: textColor,
                  // 🔥 Fondo activo vs normal
                  backgroundColor: isActive ? activeBg : 'transparent',
                  opacity: isActive ? 1 : 0.75,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg;
                    (e.currentTarget as HTMLElement).style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.opacity = '0.75';
                  }
                }}
              >
                {isActive && '✓ '}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}