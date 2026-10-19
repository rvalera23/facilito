// app/onboarding/components/StepBuyerAddressDetails.tsx
'use client';

import React, { useState } from 'react';

interface StepBuyerAddressDetailsProps {
  data: {
    userId?: string;
    fullName?: string;
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    deliveryCity?: string;
    preferredCurrency?: string;
    address?: string;
    role?: 'buyer' | 'seller';
    state?: string;
    municipality?: string;
    latitude?: number | null;
    longitude?: number | null;
    addressType?: 'Casa' | 'Local' | 'Oficina';
    addressZone?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressReference?: string;
  };
  update: (fields: any) => void;
  next: () => void;
  prev?: () => void;
  back?: () => void;
  isSubmitting?: boolean;
}

export default function StepBuyerAddressDetails({ 
  data, 
  update, 
  next, 
  prev, 
  back, 
  isSubmitting 
}: StepBuyerAddressDetailsProps) {
  // 🔥 ESTADO LOCAL PARA LOS CAMPOS DE DIRECCIÓN
  const [addressType, setAddressType] = useState<'Casa' | 'Local' | 'Oficina'>(data.addressType || 'Casa');
  const [zone, setZone] = useState(data.addressZone || '');
  const [street, setStreet] = useState(data.addressStreet || '');
  const [number, setNumber] = useState(data.addressNumber || '');
  const [reference, setReference] = useState(data.addressReference || '');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const submittingState = isSubmitting !== undefined ? isSubmitting : localSubmitting;

  const handleBack = () => {
    if (prev) prev();
    else if (back) back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalSubmitting(true);

    try {
      // 🔥 CONSTRUIR LA DIRECCIÓN COMPLETA
      // 🔥 Usar el MISMO formato que ProfileTab espera
      // Formato: "Casa: Zona, Calle, Nro - Ref: referencia"
      const zoneVal = zone || '';
      const streetVal = street || '';
      const numberVal = number || '';
      const referenceVal = reference || '';

      const addressParts = [zoneVal, streetVal, numberVal].filter(Boolean);
      const fullAddress = addressParts.length > 0
        ? `${addressType}: ${addressParts.join(', ')}${referenceVal ? ` - Ref: ${referenceVal}` : ''}`
        : `${addressType}: Sin dirección especificada`;

      // 🔥 ACTUALIZAR DATOS PERO MANTENIENDO EL userId
      update({ 
        address: fullAddress,
        addressType: addressType,
        addressZone: zone || null,
        addressStreet: street || null,
        addressNumber: number || null,
        addressReference: reference || null,
        // ✅ Asegurar que el userId NO se pierda
        userId: data.userId,
      });

      // 🔥 AVANZAR AL SIGUIENTE PASO (Branding)
      next();

    } catch (error: any) {
      console.error('Error en StepBuyerAddressDetails:', error);
      alert(error.message || 'Ocurrió un error.');
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn text-xs text-current">
      <div className="text-center space-y-1 mb-2">
        <h2 className="text-xl font-extrabold tracking-tight text-current">
          Ubicación y Entrega
        </h2>
        <p className="text-current/60 text-[11px]">
          Paso 2: Especifica los detalles de tu dirección (opcional) para recibir tus pedidos.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-current/80">
          Tipo de Ubicación (Opcional)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['Casa', 'Local', 'Oficina'] as const).map((type) => {
            const isSelected = addressType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setAddressType(type)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center space-y-1 w-full ${
                  isSelected ? 'ring-1 text-current shadow-sm' : 'hover:opacity-80 text-current/70 bg-current/5'
                }`}
                style={
                  isSelected
                    ? { 
                        borderColor: 'var(--accent-color, #f97316)', 
                        backgroundColor: 'var(--accent-color, #f97316)20', 
                        '--tw-ring-color': 'var(--accent-color, #f97316)' 
                      } as React.CSSProperties
                    : { borderColor: 'rgba(255,255,255,0.1)' }
                }
              >
                <span className="text-[11px] font-bold">
                  {type}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5 pt-1 border-t border-current/10">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-current/80">
            Detalles de la Dirección
          </label>
          <span className="text-[10px] text-current/40 font-medium">
            Todos los campos son opcionales
          </span>
        </div>

        <div className="space-y-2">
          <div className="p-2.5 rounded-xl border border-current/10 flex flex-col gap-1 transition-colors">
            <span className="font-bold text-current/80 text-[11px]">Zona / Urbanización / Sector</span>
             <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ej. Urb. Los Bucares, Urbanización Central... (Opcional)"
              className="w-full bg-transparent border-b border-current/20 focus:border-current text-current py-1 text-xs outline-none placeholder:text-current/30"
            />
          </div>

          <div className="p-2.5 rounded-xl border border-current/10 flex flex-col gap-1 transition-colors">
            <span className="font-bold text-current/80 text-[11px]">Calle / Avenida / Vía Principal</span>
             <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Ej. Av. Principal con Calle 3... (Opcional)"
              className="w-full bg-transparent border-b border-current/20 focus:border-current text-current py-1 text-xs outline-none placeholder:text-current/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl border border-current/10 flex flex-col gap-1 transition-colors">
              <span className="font-bold text-current/80 text-[11px]">Nro. Casa / Local / Apto</span>
               <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ej. Casa #45 o Apto 2B (Opcional)"
                className="w-full bg-transparent border-b border-current/20 focus:border-current text-current py-1 text-xs outline-none placeholder:text-current/30"
              />
            </div>

            <div className="p-2.5 rounded-xl border border-current/10 flex flex-col gap-1 transition-colors">
              <span className="font-bold text-current/80 text-[11px]">Punto de Referencia</span>
               <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. Cerca de la panadería... (Opcional)"
                className="w-full bg-transparent border-b border-current/20 focus:border-current text-current py-1 text-xs outline-none placeholder:text-current/30"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-4 border-t border-current/10">
        <button
          type="button"
          onClick={handleBack}
          disabled={submittingState}
          className="w-1/3 bg-current/10 hover:bg-current/20 text-current font-bold py-3.5 rounded-2xl transition cursor-pointer text-xs border border-current/10 flex items-center justify-center"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={submittingState}
          style={{ 
            backgroundColor: 'var(--accent-color, #f97316)', 
            boxShadow: '0 10px 25px -5px var(--accent-color, #f97316)50' 
          }}
          className="w-2/3 hover:opacity-90 text-white font-bold py-3.5 rounded-2xl shadow-lg transition cursor-pointer text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {submittingState ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <span>Siguiente Paso →</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}