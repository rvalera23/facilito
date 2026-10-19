// frontend/app/mi-cuenta/components/conversations/ReportPaymentModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, CreditCard, DollarSign } from 'lucide-react';
import { ReportPaymentData } from './types';
import { PAYMENT_METHODS } from './constants';
import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

interface ReportPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: (data: ReportPaymentData) => void;
  primary: string;
  textColor: string;
  textMainClass: string;
  textMutedClass: string;
  isDarkBg: boolean;
  borderDynamic: string;
  secondary?: string;
  buyerName: string;
  productName: string;
  totalAmount: number;
  detectedPaymentMethod?: string | null;
}

export default function ReportPaymentModal({
  isOpen,
  onClose,
  onReport,
  primary,
  textColor,
  textMainClass,
  textMutedClass,
  isDarkBg,
  borderDynamic,
  secondary,
  buyerName,
  productName,
  totalAmount,
  detectedPaymentMethod,
}: ReportPaymentModalProps) {
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(totalAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState(detectedPaymentMethod || '');
  const [bank, setBank] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (detectedPaymentMethod) {
      setPaymentMethod(detectedPaymentMethod);
    }
  }, [detectedPaymentMethod]);

  // 🔥 SOLO PERMITIR PAGO MÓVIL EN ESTE MODAL
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔥 SOLO PERMITIR REPORTAR SI ES PAGO MÓVIL
    if (paymentMethod !== 'pago_movil') {
      setError('Solo puedes reportar pagos móviles desde esta opción.');
      return;
    }
    
    if (!reference.trim()) {
      setError('Ingresa una referencia de pago');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Ingresa el número de teléfono');
      return;
    }

    onReport({
      method: paymentMethod,
      reference: reference.trim(),
      amount: parseFloat(amount),
      bank: bank.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      date,
      notes: notes.trim() || undefined,
      buyerName,
      productName,
      totalAmount,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95"
        style={{ 
          backgroundColor: secondary || (isDarkBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'), 
          borderColor: borderDynamic, 
          color: textColor 
        }}
      >
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-base flex items-center gap-2" style={{ color: textColor }}>
            <CreditCard className="w-5 h-5" style={{ color: primary }} />
            Reportar Pago Móvil
          </h4>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-opacity-10 hover:bg-gray-500 transition-colors" style={{ color: textColor }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={`text-xs ${textMutedClass}`}>
          Confirma el pago para {productName}.
          <span className="block mt-1" style={{ color: primary }}>
            💳 Método: Pago Móvil
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={`text-xs block mb-1 ${textMutedClass}`}>Número de Teléfono *</label>
            <input 
              type="text" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              placeholder="0412-1234567" 
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
              required 
            />
          </div>

          <div>
            <label className={`text-xs block mb-1 ${textMutedClass}`}>Banco</label>
            <SearchableDropdown
              value={bank}
              onChange={(val) => setBank(val)}
              options={[
                { value: '', label: 'Seleccionar banco' },
                ...BANK_LIST.map((b) => ({
                  value: b.code,
                  label: getBankLabel(b.code),
                })),
              ]}
              placeholder="Seleccionar banco"
              searchPlaceholder="Buscar banco..."
              emptyMessage="No hay bancos"
              primary={primary}
              textColor={textColor}
              isDarkBg={isDarkBg}
              borderColor={borderDynamic}
              searchable={true}
              footerLabel={(n) => `${n} bancos`}
            />
          </div>

          <div>
            <label className={`text-xs block mb-1 ${textMutedClass}`}>Referencia *</label>
            <input 
              type="text" 
              value={reference} 
              onChange={(e) => setReference(e.target.value)} 
              placeholder="REF-123456" 
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
              required 
            />
          </div>

          <div>
            <label className={`text-xs block mb-1 ${textMutedClass}`}>Monto *</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0.00" 
              step="0.01" 
              min="0.01" 
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
              required 
            />
          </div>

          <div>
            <label className={`text-xs block mb-1 ${textMutedClass}`}>Fecha</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full border rounded-xl px-4 py-2.5 text-xs outline-none bg-transparent"
              style={{ borderColor: borderDynamic, color: textColor, backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} 
            />
          </div>

          {error && (
            <div className="p-2 rounded-xl flex items-center gap-2 text-xs" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border" 
              style={{ borderColor: borderDynamic, color: textColor }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2" 
              style={{ backgroundColor: primary }}
            >
              <Check className="w-4 h-4" />
              Reportar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}