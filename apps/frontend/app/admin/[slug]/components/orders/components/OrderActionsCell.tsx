'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import OrderStatusDropdown from './OrderStatusDropdown';

interface OrderActionsCellProps {
  order: any;
  onViewDetails: (order: any) => void;
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  isUpdating?: boolean;
  primary: string;
  secondary?: string;
  isDarkBg: boolean;
  textColor: string;
  subtleBorderColor: string;
  tenantId: string;
}

export default function OrderActionsCell({
  order,
  onViewDetails,
  onStatusChange,
  isUpdating = false,
  primary,
  secondary,
  isDarkBg,
  textColor,
  subtleBorderColor,
  tenantId,
}: OrderActionsCellProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!order || !order.id) {
    return null;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 180 + window.scrollX,
      });
    }
  }, [isDropdownOpen]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order.id) {
      console.error('No se puede cambiar estado: order.id es undefined');
      return;
    }

    if (!tenantId) {
      console.error('No se puede cambiar estado: tenantId es undefined');
      return;
    }

    await onStatusChange(order.id, newStatus);
    setIsDropdownOpen(false);
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'text-slate-400 bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20';
    const st = status.toLowerCase();
    if (st.includes('por_verificar') || st.includes('verificando')) {
      return 'text-sky-400 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20';
    }
    if (st.includes('pend')) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20';
    }
    if (st.includes('canc') || st.includes('rechaz')) {
      return 'text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20';
    }
    if (st.includes('complet') || st.includes('pagado') || st.includes('aprobado')) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20';
    }
    return 'text-slate-400 bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20';
  };

  const portalBg = secondary || (isDarkBg ? '#1e293b' : '#ffffff');

  return (
    <>
      <div className="flex items-center justify-end gap-2" style={{ color: textColor }}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isUpdating}
          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm ${getStatusColor(order.status)}`}
          title="Cambiar estado de la orden"
        >
          {isUpdating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => onViewDetails(order)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border transition cursor-pointer shadow-sm text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
          title="Ver detalles de la orden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

      {isDropdownOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed rounded-xl shadow-2xl border overflow-hidden z-[99999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            minWidth: '180px',
            backgroundColor: portalBg,
            borderColor: subtleBorderColor,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <OrderStatusDropdown
            currentStatus={order.status || 'PENDING'}
            onStatusChange={handleStatusChange}
            isDarkBg={isDarkBg}
            textColor={textColor}
            subtleBorderColor={subtleBorderColor}
            primary={primary}
            secondary={secondary}
            onClose={() => setIsDropdownOpen(false)}
          />
        </div>,
        document.body
      )}
    </>
  );
}