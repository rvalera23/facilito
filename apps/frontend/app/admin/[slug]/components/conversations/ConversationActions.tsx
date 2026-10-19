// frontend/app/admin/[slug]/components/conversations/ConversationActions.tsx

import React from 'react';
import { Phone, Mail, Archive, ArchiveRestore, Check, Package, Clock, CreditCard } from 'lucide-react';
import { Conversation } from './types';
import { getDisplayPhone, getDisplayEmail } from './utils/conversationUtils';
import { Loader } from '@/components/ui/Loader';
interface ConversationActionsProps {
  conversation: Conversation;
  isAdmin: boolean;
  onToggleArchive: () => void;
  onConfirmPayment?: () => void;
  onCompleteOrder?: () => void;
  isArchived: boolean;
  isProcessing?: boolean;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
}

export default function ConversationActions({
  conversation,
  isAdmin,
  onToggleArchive,
  onConfirmPayment,
  onCompleteOrder,
  isArchived,
  isProcessing = false,
  primary,
  textColor,
  isDarkBg,
}: ConversationActionsProps) {
  const phone = getDisplayPhone(conversation.buyer);
  const email = getDisplayEmail(conversation.buyer);
  const order = conversation.order || null;
  const orderStatus = order?.status?.toUpperCase() || '';
  const paymentMethod = conversation.paymentMethod || order?.paymentMethodUsed || '';

  const borderDynamic = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // 🔥 RENDERIZAR ACCIONES DE LA ORDEN
  const renderOrderActions = () => {
    if (!order) return null;

    // Orden completada o cancelada
    if (orderStatus === 'COMPLETED') {
      return (
        <span className="text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{
          color: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <Check className="w-3 h-3" />
          Completada
        </span>
      );
    }

    if (orderStatus === 'CANCELLED') {
      return (
        <span className="text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{
          color: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          Cancelada
        </span>
      );
    }

    // 🔥 BOTÓN: CONFIRMAR PAGO
    if (orderStatus === 'POR_VERIFICAR' || orderStatus === 'VERIFICANDO') {
      return (
        <button
          onClick={onConfirmPayment}
          disabled={isProcessing}
          className="px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#22c55e',
            color: '#ffffff',
            borderColor: '#22c55e',
          }}
        >
          {isProcessing ? (
            <Loader size="sm" color="#ffffff" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Confirmar Pago
        </button>
      );
    }

    // 🔥 BOTÓN: COMPLETAR ORDEN
    if (orderStatus === 'CONFIRMED') {
      return (
        <button
          onClick={onCompleteOrder}
          disabled={isProcessing}
          className="px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            borderColor: '#8b5cf6',
          }}
        >
          {isProcessing ? (
            <Loader size="sm" color="#ffffff" />
          ) : (
            <Package className="w-3.5 h-3.5" />
          )}
          Completar Orden
        </button>
      );
    }

    // 🔥 MENSAJE INFORMATIVO: PAGO MÓVIL PENDIENTE
    if (orderStatus === 'PENDING' && paymentMethod === 'pago_movil') {
      return (
        <span className="text-[10px] px-3 py-1.5 rounded-full font-medium flex items-center gap-2" style={{
          color: '#f59e0b',
          backgroundColor: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}>
          <Clock className="w-3 h-3" />
          Esperando comprobante
        </span>
      );
    }

    // 🔥 MENSAJE INFORMATIVO: EFECTIVO PENDIENTE
    if (orderStatus === 'PENDING' && (paymentMethod === 'efectivo' || paymentMethod === 'cash')) {
      return (
        <span className="text-[10px] px-3 py-1.5 rounded-full font-medium flex items-center gap-2" style={{
          color: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <CreditCard className="w-3 h-3" />
          Pago en efectivo
        </span>
      );
    }

    return null;
  };

  return (
    <div className="flex items-center gap-2">
      {/* ACCIONES DE LA ORDEN */}
      {renderOrderActions()}

      {/* ARCHIVAR/DESARCHIVAR */}
      <button
        onClick={onToggleArchive}
        className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
        style={{ color: textColor }}
        title={isArchived ? "Desarchivar" : "Archivar"}
      >
        {isArchived ? (
          <ArchiveRestore className="w-4 h-4" />
        ) : (
          <Archive className="w-4 h-4" />
        )}
      </button>

      {/* LLAMAR */}
      {phone && (
        <button
          onClick={() => window.location.href = `tel:${phone}`}
          className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
          style={{ color: textColor }}
          title="Llamar"
        >
          <Phone className="w-4 h-4" />
        </button>
      )}

      {/* EMAIL */}
      {email && (
        <button
          onClick={() => window.location.href = `mailto:${email}`}
          className="p-2 rounded-xl hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
          style={{ color: textColor }}
          title="Enviar email"
        >
          <Mail className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}