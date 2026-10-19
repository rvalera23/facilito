'use client';

import React, { useState, useEffect } from 'react';
import { Key, X, Eye, EyeOff } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pin: string) => Promise<boolean>;
  isSettingPin: boolean;
  isLoading: boolean;
  error: string | null;
  tempPin: string;
  pinConfirm: string;
  setTempPin: (value: string) => void;
  setPinConfirm: (value: string) => void;
  primary: string;
  textColor: string;
  cardBg: string;
  cardBorder: string;
}

export default function PinModal({
  isOpen,
  onClose,
  onSave,
  isSettingPin,
  isLoading,
  error,
  tempPin,
  pinConfirm,
  setTempPin,
  setPinConfirm,
  primary,
  textColor,
  cardBg,
  cardBorder,
}: PinModalProps) {
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Limpiar errores al cambiar inputs
  useEffect(() => {
    setLocalError(null);
  }, [tempPin, pinConfirm]);

  const handleSave = async () => {
    // Validar PIN
    if (!tempPin || tempPin.length < 4) {
      setLocalError('El PIN debe tener al menos 4 dígitos');
      return;
    }
    
    if (tempPin.length > 6) {
      setLocalError('El PIN debe tener máximo 6 dígitos');
      return;
    }
    
    if (!/^\d+$/.test(tempPin)) {
      setLocalError('El PIN solo puede contener números');
      return;
    }
    
    if (tempPin !== pinConfirm) {
      setLocalError('Los PIN no coinciden');
      return;
    }
    
    setIsSaving(true);
    const success = await onSave(tempPin);
    setIsSaving(false);
    
    if (success) {
      // El modal se cierra desde el hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4"
        style={{ 
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: textColor 
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: textColor }}>
                {isSettingPin ? 'Configurar PIN' : 'Cambiar PIN'}
              </h3>
              <p className="text-[10px] opacity-60" style={{ color: textColor }}>
                {isSettingPin ? 'Crea un PIN de 4 a 6 dígitos' : 'Ingresa tu nuevo PIN de 4 a 6 dígitos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:opacity-70 transition cursor-pointer"
            style={{ color: textColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ERROR */}
        {(localError || error) && (
          <div className="p-3 rounded-xl text-xs font-semibold text-center" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            {localError || error}
          </div>
        )}

        {/* INPUTS */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold opacity-70 mb-1.5" style={{ color: textColor }}>
              Nuevo PIN (4-6 dígitos)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={tempPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setTempPin(value);
                  }
                }}
                placeholder="Ej: 1234"
                className="w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-widest outline-none border"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: cardBorder,
                  color: textColor,
                }}
                maxLength={6}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition"
                style={{ color: textColor }}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-1 mt-2 justify-center">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-8 h-1 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: i <= tempPin.length ? primary : 'rgba(255,255,255,0.15)',
                    opacity: i <= tempPin.length ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold opacity-70 mb-1.5" style={{ color: textColor }}>
              Confirmar PIN
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={pinConfirm}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setPinConfirm(value);
                  }
                }}
                placeholder="Repite tu PIN"
                className="w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-widest outline-none border"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: cardBorder,
                  color: textColor,
                }}
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition"
                style={{ color: textColor }}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-[9px] opacity-40 text-center" style={{ color: textColor }}>
            {tempPin && pinConfirm && tempPin === pinConfirm ? (
              <span className="text-emerald-500">✓ Los PIN coinciden</span>
            ) : tempPin && pinConfirm ? (
              <span className="text-rose-500">✗ Los PIN no coinciden</span>
            ) : (
              'El PIN debe ser de 4 a 6 dígitos numéricos'
            )}
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-xs font-bold transition hover:opacity-70 cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${cardBorder}`,
              color: textColor,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !tempPin || !pinConfirm || tempPin !== pinConfirm || tempPin.length < 4}
            className="flex-1 py-3 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: primary }}
          >
            {isSaving ? 'Guardando...' : 'Guardar PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}