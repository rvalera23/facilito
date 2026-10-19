'use client';

import React, { useState } from 'react';
import { Shield, Key, CheckCircle, XCircle, Trash2, Eye, EyeOff } from 'lucide-react';

interface SecurityPinProps {
  hasPin: boolean;
  pin: string;
  isLoading: boolean;
  onOpenModal: () => void;
  onDelete: () => Promise<boolean>;
  onVerify?: (pin: string) => Promise<boolean>;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  cardBorder: string;
  itemBg: string;
}

export default function SecurityPin({
  hasPin,
  pin,
  isLoading,
  onOpenModal,
  onDelete,
  onVerify,
  primary,
  textColor,
  isDarkBg,
  cardBorder,
  itemBg,
}: SecurityPinProps) {
  const [showPin, setShowPin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const maskedPin = pin ? '•'.repeat(pin.length) : '';

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar el PIN de seguridad?')) return;
    
    setIsDeleting(true);
    const success = await onDelete();
    setIsDeleting(false);
    
    if (success) {
      setVerificationResult(null);
      setVerificationInput('');
    }
  };

  const handleVerify = async () => {
    if (!onVerify || !verificationInput) return;
    
    setIsVerifying(true);
    const result = await onVerify(verificationInput);
    setVerificationResult(result);
    setIsVerifying(false);
  };

  return (
    <div className="space-y-4">
      {/* Estado actual del PIN */}
      <div 
        className="p-4 rounded-2xl border flex items-center justify-between"
        style={{ 
          backgroundColor: itemBg,
          borderColor: cardBorder,
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: hasPin ? `${primary}20` : `${primary}10`,
              color: hasPin ? primary : textColor,
            }}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: textColor }}>
              {hasPin ? 'PIN de seguridad activo' : 'PIN de seguridad no configurado'}
            </p>
            {hasPin && (
              <div className="flex items-center gap-2 mt-0.5">
                <span 
                  className="text-xs font-mono"
                  style={{ color: isDarkBg ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                >
                  {showPin ? pin : maskedPin}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="opacity-40 hover:opacity-80 transition"
                  style={{ color: textColor }}
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasPin && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <Trash2 className="w-3 h-3" />
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
          
          <button
            type="button"
            onClick={onOpenModal}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-lg text-[10px] font-bold text-white transition cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: primary }}
          >
            {hasPin ? 'Cambiar PIN' : 'Configurar PIN'}
          </button>
        </div>
      </div>

      {/* Verificador de PIN (si existe) */}
      {hasPin && onVerify && (
        <div 
          className="p-4 rounded-2xl border"
          style={{ 
            backgroundColor: itemBg,
            borderColor: cardBorder,
          }}
        >
          <p className="text-[10px] font-semibold opacity-60 mb-2" style={{ color: textColor }}>
            Verificar PIN
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={verificationInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 6) {
                  setVerificationInput(value);
                  setVerificationResult(null);
                }
              }}
              placeholder="Ingresa tu PIN"
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none border"
              style={{
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderColor: verificationResult === false ? '#ef4444' : (isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                color: textColor
              }}
              maxLength={6}
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || !verificationInput}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {isVerifying ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
          
          {verificationResult !== null && (
            <div 
              className={`mt-2 text-[10px] font-semibold flex items-center gap-1.5 ${
                verificationResult ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {verificationResult ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  PIN verificado correctamente
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  PIN incorrecto
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}