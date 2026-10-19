// ARCHIVO: apps/frontend/app/tienda/[slug]/components/AppointmentSidebar.tsx
'use client';

import React from 'react';
import { Calendar, Clock, User, Phone, MapPin, MessageCircle, FileText, X, CreditCard } from 'lucide-react';

interface AppointmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cardBgClass?: string;
  textMainClass?: string;
  textMutedClass?: string;
  selectedService: any;
  primary: string;
  isSecondaryLight: boolean;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerZone: string;
  setCustomerZone: (zone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  customerReference: string;
  setCustomerReference: (ref: string) => void;
  isPrimaryLight: boolean;
  handleWhatsAppCheckout: () => void;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  appointmentTime: string;
  setAppointmentTime: (time: string) => void;
  // 🔥 NUEVO: para cambiar el comportamiento
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
  onCheckout?: () => void;
}

export default function AppointmentSidebar({
  isOpen,
  onClose,
  cardBgClass,
  textMainClass,
  textMutedClass,
  selectedService,
  primary,
  isSecondaryLight,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerZone,
  setCustomerZone,
  customerAddress,
  setCustomerAddress,
  customerReference,
  setCustomerReference,
  isPrimaryLight,
  handleWhatsAppCheckout,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  buttonLabel = 'Confirmar Cita y Pagar',
  buttonIcon,
  onCheckout,
}: AppointmentSidebarProps) {
  
  // 🔥 Si no está abierto, no renderizar nada
  if (!isOpen) return null;

  const resolvedTextMain = textMainClass || (isSecondaryLight ? 'text-slate-900' : 'text-slate-100');
  const resolvedTextMuted = textMutedClass || (isSecondaryLight ? 'text-slate-500' : 'text-slate-400');
  const borderDynamic = isSecondaryLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  const containerStyle = {
    backgroundColor: isSecondaryLight ? '#ffffff' : '#0f172a',
    borderColor: borderDynamic,
  };

  const dynamicSubCardStyle = {
    backgroundColor: isSecondaryLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: borderDynamic,
  };

  // 🔥 Función a ejecutar al hacer clic en el botón
  const handleButtonClick = () => {
    if (onCheckout) {
      onCheckout();
    } else {
      handleWhatsAppCheckout();
    }
  };

  // 🔥 Icono por defecto si no se proporciona uno
  const defaultIcon = buttonIcon || <CreditCard className="w-4 h-4" />;

  // 🔥 Verificar si todos los campos requeridos están llenos
  const isFormValid = selectedService && customerName && customerPhone && appointmentDate && appointmentTime;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className={`w-screen max-w-md border-l shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 ${resolvedTextMain}`}
          style={containerStyle}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="p-2.5 rounded-2xl shadow-sm flex items-center justify-center"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >
                <Calendar className="w-5 h-5" style={{ color: primary }} />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight ${resolvedTextMain}`}>
                  Detalles de tu Cita
                </h2>
                <p className={`text-xs font-medium ${resolvedTextMuted}`}>
                  Resumen del servicio y programación
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 ${resolvedTextMain}`}
              style={dynamicSubCardStyle}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Servicio Seleccionado */}
            <div className="space-y-2.5">
              {!selectedService ? (
                <div className={`rounded-2xl p-6 text-center text-xs italic backdrop-blur-md border ${
                  isSecondaryLight 
                    ? 'bg-white/40 border-slate-200 text-slate-600 shadow-sm' 
                    : 'bg-black/25 border-white/10 text-slate-400 shadow-lg'
                }`}>
                  Aún no has seleccionado ningún servicio. Explora el catálogo y elige uno.
                </div>
              ) : (
<div className={`flex justify-between items-center p-3.5 rounded-2xl text-xs border backdrop-blur-md transition-all overflow-hidden ${
  isSecondaryLight 
    ? 'bg-white/50 border-slate-200/80 shadow-inner' 
    : 'bg-black/30 border-white/15 shadow-inner'
}`}>
  <div className="space-y-0.5 pr-2 flex-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-bold block line-clamp-1 ${resolvedTextMain}`}>{selectedService.name}</span>
      {/* 🔥 BADGE DE DESCUENTO */}
      {selectedService._pricing?.hasDiscount && (
        <span 
          className="px-1.5 py-0.5 rounded text-[8px] font-black"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
          }}
        >
          -{selectedService._pricing.discountPercentage}%
        </span>
      )}
    </div>
    <span className={`text-[11px] flex items-center gap-1 ${resolvedTextMuted}`}>
      <Clock className="w-3 h-3 text-indigo-400" />
      {selectedService.durationMinutes || selectedService.duration || 30} min duración
    </span>
  </div>
  <div className="text-right shrink-0">
    {/* 🔥 PRECIO ORIGINAL TACHADO SI HAY DESCUENTO */}
    {selectedService._pricing?.hasDiscount && selectedService._pricing?.originalPriceUSD && (
      <span className={`text-[9px] line-through opacity-50 block ${resolvedTextMuted}`}>
        ${Number(selectedService._pricing.originalPriceUSD).toFixed(2)}
      </span>
    )}
    <span className="font-black text-sm whitespace-nowrap" style={{ color: primary }}>
      ${Number(selectedService._pricing?.totalPriceUSD || selectedService.price || 0).toFixed(2)}
    </span>
  </div>
</div>
              )}
            </div>

            {/* Selectores de Fecha y Hora */}
            {selectedService && (
              <div className={`space-y-3 pt-3 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'}`}>
                <h4 className={`text-xs font-black uppercase tracking-wider ${resolvedTextMain}`}>
                  Programación de la Cita
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Fecha</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="date"
                        value={appointmentDate || ''}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className={`w-full pl-8 pr-2.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                          isSecondaryLight 
                            ? 'bg-white/50 border-slate-200/80 text-slate-900 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                            : 'bg-black/25 border-white/15 text-white focus:bg-black/40 focus:border-white/30 shadow-inner'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Hora</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="time"
                        value={appointmentTime || ''}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className={`w-full pl-8 pr-2.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                          isSecondaryLight 
                            ? 'bg-white/50 border-slate-200/80 text-slate-900 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                            : 'bg-black/25 border-white/15 text-white focus:bg-black/40 focus:border-white/30 shadow-inner'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
{/* Total */}
{selectedService && (
  <div className={`pt-3.5 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'}`}>
    <div className={`flex justify-between items-center text-sm font-black ${resolvedTextMain}`}>
      <span>Total Inversión:</span>
      <div className="text-right">
        {/* 🔥 PRECIO ORIGINAL TACHADO SI HAY DESCUENTO */}
        {selectedService._pricing?.hasDiscount && selectedService._pricing?.originalPriceUSD && (
          <span className={`text-xs line-through opacity-50 block ${resolvedTextMuted}`}>
            ${Number(selectedService._pricing.originalPriceUSD).toFixed(2)}
          </span>
        )}
        <span className="text-lg" style={{ color: primary }}>
          ${Number(selectedService._pricing?.totalPriceUSD || selectedService.price || 0).toFixed(2)}
        </span>
      </div>
    </div>
    {/* 🔥 AHORRO SI HAY DESCUENTO */}
    {selectedService._pricing?.hasDiscount && selectedService._pricing?.discountAmountUSD > 0 && (
      <div className={`text-right text-[10px] font-bold mt-0.5`} style={{ color: '#22c55e' }}>
        Ahorras ${Number(selectedService._pricing.discountAmountUSD).toFixed(2)}
      </div>
    )}
  </div>
)}

            {/* Datos del Cliente */}
            <div className={`space-y-3.5 pt-3.5 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'}`}>
              <h4 className={`text-xs font-black uppercase tracking-wider ${resolvedTextMain}`}>Datos del Cliente</h4>

              <div>
                <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Nombre y Apellido</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                      isSecondaryLight 
                        ? 'bg-white/50 border-slate-200/80 text-slate-900 placeholder-slate-500 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                        : 'bg-black/25 border-white/15 text-white placeholder-white/50 focus:bg-black/40 focus:border-white/30 shadow-inner'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Teléfono / WhatsApp</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. 04121234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                      isSecondaryLight 
                        ? 'bg-white/50 border-slate-200/80 text-slate-900 placeholder-slate-500 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                        : 'bg-black/25 border-white/15 text-white placeholder-white/50 focus:bg-black/40 focus:border-white/30 shadow-inner'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Zona o Ciudad</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. Caracas / Chacao"
                    value={customerZone}
                    onChange={(e) => setCustomerZone(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                      isSecondaryLight 
                        ? 'bg-white/50 border-slate-200/80 text-slate-900 placeholder-slate-500 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                        : 'bg-black/25 border-white/15 text-white placeholder-white/50 focus:bg-black/40 focus:border-white/30 shadow-inner'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Dirección Completa</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. Av. Principal, Edif. Central, Piso 2"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                      isSecondaryLight 
                        ? 'bg-white/50 border-slate-200/80 text-slate-900 placeholder-slate-500 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                        : 'bg-black/25 border-white/15 text-white placeholder-white/50 focus:bg-black/40 focus:border-white/30 shadow-inner'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Notas Adicionales (Opcional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Requerimientos específicos del servicio..."
                    value={customerReference}
                    onChange={(e) => setCustomerReference(e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs outline-none rounded-2xl border transition-all ${
                      isSecondaryLight 
                        ? 'bg-white/50 border-slate-200/80 text-slate-900 placeholder-slate-500 focus:bg-white/80 focus:border-slate-400 shadow-inner' 
                        : 'bg-black/25 border-white/15 text-white placeholder-white/50 focus:bg-black/40 focus:border-white/30 shadow-inner'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Botón Confirmar */}
          <div 
            className="p-6 border-t"
            style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <button
              style={{ backgroundColor: primary }}
              className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl transition shadow-xl uppercase text-xs tracking-wider cursor-pointer hover:opacity-90 active:scale-[0.98] ${
                isPrimaryLight ? 'text-slate-950 font-black' : 'text-white'
              } ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleButtonClick}
              disabled={!isFormValid}
            >
              {defaultIcon}
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}