'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, CreditCard, CheckCircle2, Calendar, Clock, User, Phone,
  MapPin, FileText, DollarSign, Building2, Loader2, Copy, Check,
  Smartphone, Banknote, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { useKioskContext } from './KioskStoreLayout';
import { useKioskSession } from '../../contexts/KioskSessionContext';
import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { getPriceColors } from '@/lib/priceTokens';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import KioskoCashPayment from './KioskoCashPayment';

const PHONE_OPERATORS = [
  { code: '0412', name: 'Digitel' },
  { code: '0414', name: 'Movistar' },
  { code: '0416', name: 'Movilnet' },
  { code: '0424', name: 'Movistar' },
  { code: '0426', name: 'Digitel' },
];

const ID_TYPES = [
  { code: 'V', label: 'Venezolano (V)' },
  { code: 'E', label: 'Extranjero (E)' },
  { code: 'J', label: 'Juridico (J)' },
  { code: 'G', label: 'Gobierno (G)' },
];

interface KioskoServicePayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: any;
  appointmentDate: string;
  appointmentTime: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerReference?: string;
  professionalId?: string;
  professionalName?: string;
  totalVes: number;
  totalUsd: number;
  originalVes?: number;
  originalUsd?: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  pagoMovilData: any;
  pagoMovilList?: any[];
  tenantConfig?: any;
  tenantId?: string;
  userId?: string;
  onProcessOrder: (orderData: any) => Promise<any>;
  onSuccessClose: (orderData: any) => void;
  kioskDisplayName?: string;
  kioskDisplayPhone?: string;
  kioskUserId?: string | null;
  isKioskAuthenticated?: boolean;
}

const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function KioskoServicePay({
  isOpen,
  onClose,
  selectedService,
  appointmentDate,
  appointmentTime,
  customerName,
  customerPhone,
  customerAddress = '',
  customerReference = '',
  professionalId = '',
  professionalName = '',
  totalVes,
  totalUsd,
  originalVes = 0,
  originalUsd = 0,
  hasDiscount = false,
  discountPercentage = 0,
  pagoMovilData,
  pagoMovilList: pagoMovilListProp,
  tenantConfig,
  tenantId,
  userId,
  onProcessOrder,
  onSuccessClose,
  kioskDisplayName,
  kioskDisplayPhone,
  kioskUserId,
  isKioskAuthenticated = false,
}: KioskoServicePayProps) {
  const { primary, secondary, backgroundStyle, isSecondaryLight, exchangeRate } = useKioskContext();

  console.log('[KioskoServicePay] ===== INICIALIZACION =====');
  console.log('[KioskoServicePay] selectedService:', selectedService?.name);
  console.log('[KioskoServicePay] totalVes:', totalVes);
  console.log('[KioskoServicePay] totalUsd:', totalUsd);
  console.log('[KioskoServicePay] hasDiscount:', hasDiscount, 'discountPercentage:', discountPercentage);

  const safePrimary = primary || '#F59E0B';

  const textColor = isSecondaryLight ? 'text-slate-900' : 'text-white';
  const mutedText = isSecondaryLight ? 'text-slate-600' : 'text-slate-300';
  const borderColor = isSecondaryLight ? 'border-slate-200/60' : 'border-white/10';
  const bgCard = isSecondaryLight
    ? 'bg-white/90 border-slate-200/70 shadow-xl backdrop-blur-md'
    : 'bg-black/40 border-white/10 shadow-2xl backdrop-blur-md';
  const bgInner = isSecondaryLight
    ? 'bg-white/50 border-slate-200/60'
    : 'bg-black/30 border-white/10';
  const bgModal = 'backdrop-blur-md';
  const modalBackground = backgroundStyle || secondary;

  // 🔥 COLORES DE PRECIO (VES primary, divisas verde)
  const priceColors = useMemo(
    () => getPriceColors({ primary: safePrimary, isDarkBg: !isSecondaryLight }),
    [safePrimary, isSecondaryLight],
  );

  // 🔥 ESTADOS DE PAGO
  const [step, setStep] = useState<'resumen' | 'pago'>('resumen');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'pagomovil' | 'pos'>('efectivo');
  const [bankSource, setBankSource] = useState(BANK_LIST[2]?.name || 'Provincial');
  const [paymentReference, setPaymentReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string } | null>(null);

  // 🔥 ESTADOS DE VUELTO (efectivo)
  const [cashCurrency, setCashCurrency] = useState<'VES' | 'USD'>('VES');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashCoversTotal, setCashCoversTotal] = useState(true);
  const [changeDeliveryPreference, setChangeDeliveryPreference] = useState<{
    method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'credit';
    pagoMovilData?: {
      bank: string;
      phone: string;
      clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
      clientIdNumber: string;
    };
  } | null>(null);

  // 🔥 SESION DEL KIOSCO
  const kioskSession = useKioskSession();

  // 🔥 AUTOCALCULAR valores iniciales desde el perfil
  const initialPhonePartsSvc = (() => {
    const user = kioskSession.user;
    if (!user?.pago_movil_same_as_profile) return { prefix: PHONE_OPERATORS[1]?.code || '0414', number: '' };
    const rawPhone = String(user.phone || '').replace(/\D/g, '');
    const without58 = rawPhone.startsWith('58') ? rawPhone.slice(2) : rawPhone;
    const withZero = without58.startsWith('0') ? without58 : `0${without58}`;
    const prefix = withZero.slice(0, 4);
    const number = withZero.slice(4, 11);
    return { prefix: prefix || '0414', number: number || '' };
  })();

  const [clientPhonePrefix, setClientPhonePrefix] = useState(initialPhonePartsSvc.prefix);
  const [clientPhoneNumber, setClientPhoneNumber] = useState(initialPhonePartsSvc.number);
  const [clientIdType, setClientIdType] = useState(
    kioskSession.user?.pago_movil_same_as_profile
      ? (kioskSession.user?.id_type || ID_TYPES[0]?.code || 'V')
      : (ID_TYPES[0]?.code || 'V')
  );
  const [clientIdNumber, setClientIdNumber] = useState(
    kioskSession.user?.pago_movil_same_as_profile
      ? (kioskSession.user?.id_number || '')
      : ''
  );

  useEffect(() => {
    const user = kioskSession.user;
    if (!user?.pago_movil_same_as_profile) return;

    const rawPhone = String(user.phone || '').replace(/\D/g, '');
    const without58 = rawPhone.startsWith('58') ? rawPhone.slice(2) : rawPhone;
    const withZero = without58.startsWith('0') ? without58 : `0${without58}`;
    const prefix = withZero.slice(0, 4) || '0414';
    const number = withZero.slice(4, 11);

    console.log('[KioskoServicePay] useEffect sincronizando:', {
      prefix,
      number,
      idType: user.id_type,
      idNumber: user.id_number,
    });

    setClientPhonePrefix(prefix);
    setClientPhoneNumber(number);
    setClientIdType(user.id_type || ID_TYPES[0]?.code || 'V');
    setClientIdNumber(user.id_number || '');
  }, [kioskSession.user]);

  const [copied, setCopied] = useState(false);

  const pagoMovilList = pagoMovilListProp ||
    tenantConfig?.paymentMethods?.pagoMovilList ||
    (pagoMovilData ? [pagoMovilData] : []);

  const selectedPagoMovil = pagoMovilList[0] || pagoMovilData || null;

  const activeMethods =
    tenantConfig?.activePaymentMethods ||
    tenantConfig?.specificConfig?.activePaymentMethods ||
    tenantConfig?.specific_config?.activePaymentMethods ||
    tenantConfig?.paymentMethods?.activePaymentMethods ||
    tenantConfig?.specificConfig?.paymentMethods?.activePaymentMethods ||
    tenantConfig?.specific_config?.paymentMethods?.activePaymentMethods ||
    tenantConfig?.paymentMethods ||
    tenantConfig?.specificConfig?.paymentMethods ||
    ['cash', 'pago_movil'];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No seleccionada';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const copyPaymentData = () => {
    if (!selectedPagoMovil) return;

    const textToCopy = `Banco: ${getBankLabel(selectedPagoMovil.bank || selectedPagoMovil.banco || '') || 'No especificado'}\nTelefono: ${formatPhoneDisplay(`${selectedPagoMovil.operator || ''}${selectedPagoMovil.phone || selectedPagoMovil.telefono || ''}`)}\nCedula/RIF: ${selectedPagoMovil.idType || 'V'}-${selectedPagoMovil.idNumber || selectedPagoMovil.cedula || selectedPagoMovil.rif || ''}\nMonto: Bs. ${formatPrice(totalVes)}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = textToCopy;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch (err) {
            console.error('Error al copiar:', err);
          }
          document.body.removeChild(textArea);
        });
    }
  };

  const isPagoMovilValid = useMemo(() => {
    if (paymentMethod !== 'pagomovil') return true;

    const fullPhone = `${clientPhonePrefix}${clientPhoneNumber}`;
    return (
      clientPhoneNumber.length >= 7 &&
      paymentReference.length >= 4 &&
      clientIdNumber.length >= 5
    );
  }, [paymentMethod, clientPhonePrefix, clientPhoneNumber, paymentReference, clientIdNumber]);

  const handlePayment = async () => {
    if (!selectedService) return;

    setIsProcessing(true);

    try {
      const orderPayload: any = {
        action: 'create_order',
        tenantId: tenantId || 'default-tenant',
        userId: userId || null,
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress || '',
        customerReference: customerReference || '',
        paymentMethod: paymentMethod,
        totalUsd: totalUsd,
        totalVes: totalVes,
        orderType: 'service',
        status: paymentMethod === 'pagomovil' ? 'por_verificar' : 'PENDING_LOCAL',
        items: [{
          serviceId: selectedService.id || selectedService._id,
          name: selectedService.name,
          quantity: 1,
          priceUsd: totalUsd,
          priceVes: totalVes,
          type: 'service',
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
          durationMinutes: selectedService.durationMinutes || selectedService.duration || 60,
          professionalId: professionalId || undefined,
          professionalName: professionalName || undefined,
          notes: customerReference || '',
        }],
        serviceDetails: {
          date: appointmentDate,
          time: appointmentTime,
          duration: selectedService.durationMinutes || selectedService.duration || 60,
          professionalId: professionalId || undefined,
          professionalName: professionalName || undefined,
          notes: customerReference || '',
        }
      };

      // 🔥 VUELTO: si paga en efectivo y hay vuelto, incluir preferencia
      if (paymentMethod === 'efectivo' && cashAmount > 0) {
        orderPayload.cashCurrency = cashCurrency;
        orderPayload.cashAmount = cashAmount;

        if (changeDeliveryPreference?.method === 'credit') {
          orderPayload.changeResolution = 'credit';
        } else if (changeDeliveryPreference) {
          orderPayload.changeResolution = 'pending';
          orderPayload.changeDeliveryPreference = {
            method: changeDeliveryPreference.method,
            pagoMovilData:
              changeDeliveryPreference.method === 'pago_movil'
                ? changeDeliveryPreference.pagoMovilData
                : undefined,
          };
        }
      }

      console.log('[KioskoServicePay] Enviando orden:', JSON.stringify(orderPayload, null, 2));

      const result = await onProcessOrder(orderPayload);

      console.log('[KioskoServicePay] Resultado:', result);

      if (!result || !result.success) {
        throw new Error(result?.error || 'No se pudo crear la orden');
      }

      const orderId = result.orderId || result.id || result._id;

      if (!orderId) {
        throw new Error('No se obtuvo ID de la orden');
      }

      setOrderResult({ orderId });

      if (paymentMethod === 'pagomovil') {
        const paymentPayload = {
          action: 'submit_payment',
          orderId: orderId,
          paymentMethod: 'pagomovil',
          bankSource: bankSource,
          paymentReference: paymentReference,
          clientIdType: clientIdType,
          clientIdNumber: clientIdNumber,
          clientPhone: `${clientPhonePrefix}${clientPhoneNumber}`,
          status: 'por_verificar',
        };

        await onProcessOrder(paymentPayload);
      }

      console.log('[KioskoServicePay] Pago completado, orderId:', orderId);
      const orderData = {
        orderId: orderId,
        customerName: customerName,
        customerPhone: customerPhone,
        totalVes: totalVes,
        totalUsd: totalUsd,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        serviceName: selectedService.name,
      };
      onClose();
      onSuccessClose(orderData);

    } catch (error: any) {
      console.error('[KioskoServicePay] Error al procesar el pago:', error);
      alert(error.message || 'Ocurrio un error al procesar tu pago. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const handleBack = () => {
    setStep('resumen');
  };

  const handleGoToPayment = () => {
    setStep('pago');
  };

  const methodBgColor = isSecondaryLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)';

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
        />

        <div className="flex items-center justify-center min-h-screen p-4">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col transform transition-all ${bgModal} ${borderColor} ${textColor}`}
            style={{ background: modalBackground }}
          >
            <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
              <div className="flex items-center space-x-3">
                <div
                  className="p-2.5 rounded-2xl shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: `${safePrimary}15`, color: safePrimary }}
                >
                  {step === 'resumen' ? (
                    <ShieldCheck className="w-5 h-5" style={{ color: safePrimary }} />
                  ) : (
                    <CreditCard className="w-5 h-5" style={{ color: safePrimary }} />
                  )}
                </div>
                <div>
                  <h2 className={`text-lg font-black tracking-tight ${textColor}`}>
                    {step === 'resumen'
                      ? (isKioskAuthenticated
                          ? `Hola, ${(kioskDisplayName || '').split(' ')[0]} - revisa tu cita`
                          : 'Confirmar tu Cita')
                      : (isKioskAuthenticated
                          ? `Hola, ${(kioskDisplayName || '').split(' ')[0]} - elige tu pago`
                          : 'Realizar Pago')}
                  </h2>
                  <p className={`text-xs font-medium ${mutedText}`}>
                    {step === 'resumen'
                      ? 'Revisa los detalles antes de pagar'
                      : `Orden #${orderResult?.orderId?.slice(-6) || 'Generada'}`}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className={`p-2.5 rounded-2xl transition border cursor-pointer hover:scale-105 active:scale-95 ${borderColor} ${textColor}`}
                style={{ backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* PASO 1: RESUMEN */}
              {step === 'resumen' && (
                <>
                  <div className={`space-y-3 p-4 rounded-2xl border ${bgInner}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                      <Calendar className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
                      Resumen de tu Cita
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={mutedText}>Servicio</span>
                        <span className={`font-bold ${textColor}`}>{selectedService?.name || 'N/A'}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className={mutedText}>Fecha</span>
                        <span className={`font-bold ${textColor}`}>{formatDate(appointmentDate)}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className={mutedText}>Hora</span>
                        <span className={`font-bold ${textColor}`}>{appointmentTime || 'No seleccionada'}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className={mutedText}>Duracion</span>
                        <span className={`font-bold ${textColor}`}>
                          {selectedService?.durationMinutes || selectedService?.duration || 30} min
                        </span>
                      </div>

                      {professionalName && (
                        <div className="flex justify-between text-sm">
                          <span className={mutedText}>Profesional</span>
                          <span className={`font-bold ${textColor}`}>{professionalName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`space-y-3 p-4 rounded-2xl border ${bgInner}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                      <User className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
                      {isKioskAuthenticated ? `Hola, ${(kioskDisplayName || '').split(' ')[0]}` : 'Datos del Cliente'}
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={mutedText}>Nombre</span>
                        <span className={`font-bold ${textColor}`}>{customerName || 'No especificado'}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className={mutedText}>Telefono</span>
                        <span className={`font-bold ${textColor}`}>
                          {customerPhone ? formatPhoneDisplay(customerPhone) : 'No especificado'}
                        </span>
                      </div>

                      {customerAddress && (
                        <div className="flex justify-between text-sm">
                          <span className={mutedText}>Direccion</span>
                          <span className={`font-bold ${textColor}`}>{customerAddress}</span>
                        </div>
                      )}

                      {customerReference && (
                        <div className="flex justify-between text-sm">
                          <span className={mutedText}>Notas</span>
                          <span className={`font-bold ${textColor}`}>{customerReference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TOTAL con descuento + divisa verde */}
                  <div className={`pt-3.5 border-t ${borderColor}`}>
                    {hasDiscount && originalVes > 0 && (
                      <div className="flex justify-end mb-1">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            backgroundColor: 'rgba(239,68,68,0.15)',
                            color: isSecondaryLight ? '#b91c1c' : '#f87171',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          -{discountPercentage}% OFF
                        </span>
                      </div>
                    )}
                    <div className={`flex justify-between items-center text-base font-black ${textColor}`}>
                      <span>Total a Pagar:</span>
                      <div className="text-right">
                        {hasDiscount && originalVes > 0 && (
                          <span
                            className="block text-xs line-through opacity-50"
                            style={{ color: textColor }}
                          >
                            Bs. {formatPrice(originalVes)}
                          </span>
                        )}
                        <span className="text-2xl" style={{ color: priceColors.ves }}>
                          Bs. {formatPrice(totalVes)}
                        </span>
                        <span
                          className="block text-xs font-semibold"
                          style={{ color: priceColors.foreign }}
                        >
                          ${totalUsd.toFixed(2)}
                        </span>
                        {hasDiscount && originalUsd > 0 && (
                          <span
                            className="block text-[10px] line-through opacity-50"
                            style={{ color: textColor }}
                          >
                            ${originalUsd.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGoToPayment}
                    className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl transition shadow-xl uppercase text-sm tracking-wider cursor-pointer hover:opacity-90 active:scale-[0.98] ${
                      isSecondaryLight ? 'text-slate-950 font-black' : 'text-white'
                    }`}
                    style={{ backgroundColor: safePrimary }}
                  >
                    <CreditCard className="w-5 h-5" />
                    Continuar al Pago
                  </button>
                </>
              )}

              {/* PASO 2: PAGO */}
              {step === 'pago' && (
                <>
                  <div className={`space-y-3 p-4 rounded-2xl border ${bgInner}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                      <CreditCard className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
                      Selecciona tu Metodo de Pago
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      {activeMethods.includes('cash') && (
                        <button
                          onClick={() => setPaymentMethod('efectivo')}
                          className={`py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                            paymentMethod === 'efectivo'
                              ? 'ring-2 ring-offset-2'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: paymentMethod === 'efectivo' ? `${safePrimary}20` : methodBgColor,
                            border: `1px solid ${paymentMethod === 'efectivo' ? safePrimary : (isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')}`,
                            boxShadow: paymentMethod === 'efectivo' ? `0 0 0 2px ${safePrimary}` : undefined,
                            color: textColor
                          }}
                        >
                          <Banknote className="w-4 h-4" style={{ color: '#fbbf24' }} />
                          <span style={{ color: textColor }}>Efectivo</span>
                        </button>
                      )}

                      {activeMethods.includes('pago_movil') && (
                        <button
                          onClick={() => setPaymentMethod('pagomovil')}
                          className={`py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                            paymentMethod === 'pagomovil'
                              ? 'ring-2 ring-offset-2'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: paymentMethod === 'pagomovil' ? `${safePrimary}20` : methodBgColor,
                            border: `1px solid ${paymentMethod === 'pagomovil' ? safePrimary : (isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')}`,
                            boxShadow: paymentMethod === 'pagomovil' ? `0 0 0 2px ${safePrimary}` : undefined,
                            color: textColor
                          }}
                        >
                          <Smartphone className="w-4 h-4" style={{ color: '#34d399' }} />
                          <span style={{ color: textColor }}>PagoMovil</span>
                        </button>
                      )}

                      {activeMethods.includes('pos') && (
                        <button
                          onClick={() => setPaymentMethod('pos')}
                          className={`py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                            paymentMethod === 'pos'
                              ? 'ring-2 ring-offset-2'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: paymentMethod === 'pos' ? `${safePrimary}20` : methodBgColor,
                            border: `1px solid ${paymentMethod === 'pos' ? safePrimary : (isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')}`,
                            boxShadow: paymentMethod === 'pos' ? `0 0 0 2px ${safePrimary}` : undefined,
                            color: textColor
                          }}
                        >
                          <CreditCard className="w-4 h-4" style={{ color: '#60a5fa' }} />
                          <span style={{ color: textColor }}>Punto de Venta</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* VUELTO: solo si paga en efectivo */}
                  {paymentMethod === 'efectivo' && (
                    <KioskoCashPayment
                      totalVes={totalVes}
                      totalUsd={totalUsd}
                      exchangeRate={exchangeRate || 0}
                      currency={cashCurrency}
                      amount={cashAmount}
                      onCurrencyChange={setCashCurrency}
                      onAmountChange={setCashAmount}
                      onCoversChange={setCashCoversTotal}
                      userProfileData={
                        kioskSession.user
                          ? {
                              phone: kioskSession.user.phone,
                              id_number: kioskSession.user.id_number ?? null,
                              id_type: kioskSession.user.id_type ?? null,
                              pago_movil_same_as_profile:
                                kioskSession.user.pago_movil_same_as_profile,
                            }
                          : null
                      }
                      onChangePreference={setChangeDeliveryPreference}
                      textColor={textColor}
                      mutedTextColor={mutedText}
                      borderColor={borderColor}
                      innerBgColor={isSecondaryLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}
                      isSecondaryLight={isSecondaryLight}
                      safePrimary={safePrimary}
                      formatPrice={formatPrice}
                    />
                  )}

                  {/* DATOS DE PAGOMOVIL */}
                  {paymentMethod === 'pagomovil' && selectedPagoMovil && (
                    <div className={`space-y-4 p-4 rounded-2xl border ${bgInner}`}>
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                          Datos para el PagoMovil
                        </h4>
                        <button
                          onClick={copyPaymentData}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition cursor-pointer ${borderColor}`}
                          style={{
                            backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'transparent',
                            borderColor: copied ? '#22c55e' : borderColor,
                            color: copied ? '#22c55e' : mutedText,
                          }}
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copiado!' : 'Copiar datos'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className={`p-3 rounded-xl border ${bgInner}`}>
                          <span className={`text-[9px] uppercase font-bold block ${mutedText}`}>Banco</span>
                          <span className={`font-black text-sm mt-1 block ${textColor}`}>
                            {getBankLabel(selectedPagoMovil.bank || selectedPagoMovil.banco || '') || 'N/A'}
                          </span>
                        </div>
                        <div className={`p-3 rounded-xl border ${bgInner}`}>
                          <span className={`text-[9px] uppercase font-bold block ${mutedText}`}>Telefono</span>
                          <span className={`font-black text-sm mt-1 block ${textColor}`}>
                            {formatPhoneDisplay(
                              `${selectedPagoMovil.operator || ''}${selectedPagoMovil.phone || selectedPagoMovil.telefono || ''}`
                            ) || 'N/A'}
                          </span>
                        </div>
                        <div className={`p-3 rounded-xl border ${bgInner}`}>
                          <span className={`text-[9px] uppercase font-bold block ${mutedText}`}>Cedula / RIF</span>
                          <span className={`font-black text-sm mt-1 block ${textColor}`}>
                            {selectedPagoMovil.idType || 'V'}-{selectedPagoMovil.idNumber || selectedPagoMovil.cedula || selectedPagoMovil.rif || 'N/A'}
                          </span>
                        </div>
                        <div className={`p-3 rounded-xl border ${bgInner}`}>
                          <span className={`text-[9px] uppercase font-bold block ${mutedText}`}>Monto Exacto</span>
                          <span className="font-black text-sm mt-1 block" style={{ color: priceColors.ves }}>
                            Bs. {formatPrice(totalVes)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t" style={{ borderColor: borderColor }}>
                        <h4 className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>
                          Ingresa los datos de tu pago:
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-[10px] font-bold ${mutedText} mb-1`}>Banco Emisor</label>
                            <SearchableDropdown
                              value={bankSource}
                              onChange={setBankSource}
                              options={BANK_LIST.map((bank) => ({
                                value: bank.name,
                                label: getBankLabel(bank.code),
                              }))}
                              placeholder="Seleccionar banco"
                              searchPlaceholder="Buscar banco..."
                              emptyMessage="No hay bancos"
                              primary={safePrimary}
                              textColor={textColor}
                              isDarkBg={!isSecondaryLight}
                              borderColor={
                                isSecondaryLight
                                  ? 'rgba(0,0,0,0.08)'
                                  : 'rgba(255,255,255,0.08)'
                              }
                              searchable={true}
                              footerLabel={(n) => `${n} bancos`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[10px] font-bold ${mutedText} mb-1`}>N Referencia</label>
                            <input
                              type="text"
                              placeholder="Ej. 4839"
                              maxLength={12}
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value.replace(/\D/g, ''))}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none font-bold tracking-widest ${bgInner} ${textColor}`}
                              style={{ borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-[10px] font-bold ${mutedText} mb-1`}>Tipo Documento</label>
                            <SearchableDropdown
                              value={clientIdType}
                              onChange={setClientIdType}
                              options={ID_TYPES.map((type) => ({
                                value: type.code,
                                label: type.label,
                              }))}
                              placeholder="Seleccionar tipo"
                              searchPlaceholder=""
                              emptyMessage="—"
                              primary={safePrimary}
                              textColor={textColor}
                              isDarkBg={!isSecondaryLight}
                              borderColor={
                                isSecondaryLight
                                  ? 'rgba(0,0,0,0.08)'
                                  : 'rgba(255,255,255,0.08)'
                              }
                              searchable={false}
                            />
                          </div>

                          <div>
                            <label className={`block text-[10px] font-bold ${mutedText} mb-1`}>N Cedula / RIF</label>
                            <input
                              type="text"
                              placeholder="Ej. 18714469"
                              value={clientIdNumber}
                              onChange={(e) => setClientIdNumber(e.target.value.replace(/\D/g, ''))}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none font-medium ${bgInner} ${textColor}`}
                              style={{ borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[10px] font-bold ${mutedText} mb-1`}>Telefono Afiliado</label>
                          <div className="flex gap-2">
                            <select
                              value={clientPhonePrefix}
                              onChange={(e) => setClientPhonePrefix(e.target.value)}
                              className={`w-20 px-2 py-2.5 rounded-xl border text-xs outline-none font-medium ${bgInner} ${textColor}`}
                              style={{ borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}
                            >
                              {PHONE_OPERATORS.map((op) => (
                                <option key={op.code} value={op.code} style={{ backgroundColor: isSecondaryLight ? '#ffffff' : '#0f172a' }}>
                                  {op.code}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="1234567 (7 digitos)"
                              value={clientPhoneNumber}
                              onChange={(e) => setClientPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 7))}
                              className={`flex-1 px-3 py-2.5 rounded-xl border text-xs outline-none font-medium ${bgInner} ${textColor}`}
                              style={{ borderColor: isSecondaryLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TOTAL en paso pago */}
                  <div className={`pt-3.5 border-t ${borderColor}`}>
                    {hasDiscount && originalVes > 0 && (
                      <div className="flex justify-end mb-1">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            backgroundColor: 'rgba(239,68,68,0.15)',
                            color: isSecondaryLight ? '#b91c1c' : '#f87171',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          -{discountPercentage}% OFF
                        </span>
                      </div>
                    )}
                    <div className={`flex justify-between items-center text-base font-black ${textColor}`}>
                      <span>Total a Pagar:</span>
                      <div className="text-right">
                        {hasDiscount && originalVes > 0 && (
                          <span
                            className="block text-xs line-through opacity-50"
                            style={{ color: textColor }}
                          >
                            Bs. {formatPrice(originalVes)}
                          </span>
                        )}
                        <span className="text-2xl" style={{ color: priceColors.ves }}>
                          Bs. {formatPrice(totalVes)}
                        </span>
                        <span
                          className="block text-xs font-semibold"
                          style={{ color: priceColors.foreign }}
                        >
                          ${totalUsd.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BOTONES */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBack}
                      className={`w-1/3 py-3.5 rounded-2xl font-bold text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${borderColor} ${textColor}`}
                      style={{ backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Volver
                    </button>

                    <button
                      onClick={handlePayment}
                      disabled={isProcessing || (paymentMethod === 'pagomovil' && !isPagoMovilValid)}
                      className={`w-2/3 py-3.5 rounded-2xl font-black text-sm transition shadow-xl flex items-center justify-center gap-2 ${
                        isSecondaryLight ? 'text-slate-950' : 'text-white'
                      } ${
                        isProcessing || (paymentMethod === 'pagomovil' && !isPagoMovilValid)
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:opacity-90 active:scale-[0.98]'
                      }`}
                      style={{
                        backgroundColor: isProcessing || (paymentMethod === 'pagomovil' && !isPagoMovilValid)
                          ? 'rgba(100,116,139,0.3)'
                          : safePrimary
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" style={{ color: isSecondaryLight ? '#0f172a' : '#ffffff' }} />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" style={{ color: isSecondaryLight ? '#0f172a' : '#ffffff' }} />
                          {paymentMethod === 'pagomovil' ? 'Reportar Pago' : 'Confirmar y Pagar'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
