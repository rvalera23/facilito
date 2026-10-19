'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, Clock, User, Phone, MapPin, FileText, X, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

import CartPaymentStep from './CartSidebar/CartPaymentStep';
import ServiceConfirmModal from './CartSidebar/ServiceConfirmModal';
import ServiceSuccessModal from './CartSidebar/ServiceSuccessModal';

// 🔥 Reutilizar helpers de pago
import {
  getAvailablePaymentMethods,
  getDefaultPaymentMethod,
  hasAnyPaymentMethodAvailable,
  PaymentMethodType,
} from '../utils/paymentMethods';

// ✅ IMPORTAR getImageUrl DESDE imageUtils
import { getImageUrl } from '@/lib/imageUtils';
// 🔥 BANKS - fuente única de verdad
import { getBankLabel } from '@/lib/venezuelanBanks';

// 🔥 URL BASE DEL BACKEND
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface AppointmentCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  textMainClass?: string;
  textMutedClass?: string;
  primary?: string;
  secondary?: string;
  isSecondaryLight?: boolean;
  isPrimaryLight?: boolean;
  selectedService: any;
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  appointmentTime: string;
  setAppointmentTime: (time: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  customerReference: string;
  setCustomerReference: (ref: string) => void;
  onProcessOrder?: (data: any) => Promise<any>;
  pagoMovilData?: any;
  pagoMovilList?: any[];
  tenantId?: string;
  tenant?: any;
    userId?: string;
  tenantConfig?: any;
  currentUser?: any;
  isStoreOpen?: boolean;
  storeClosedMessage?: string;
  getImageUrl?: (item: any) => string | null;
  exchangeRate?: number; // ✅ AGREGAR ESTO
}

// 🔥 FUNCIONES DE PRECIOS (IGUAL QUE CartSidebar)
const getProductPrices = (product: any) => {
  // ============================================================
  // 🔥 PRIORIDAD 1: `_pricing` del backend (Fase 4)
  // Los servicios son `ivaType: 'exempt'`, pero el `_pricing` trae el total final
  // Y los campos de descuento si están activos.
  // ============================================================
  if (product?._pricing && typeof product._pricing === 'object') {
    const p = product._pricing;
    return {
      VES: Number(p.totalPriceVES || 0),
      USD: Number(p.totalPriceUSD || 0),
      // 🔥 Campos de descuento
      hasDiscount: Boolean(p.hasDiscount),
      discountPercentage: Number(p.discountPercentage || 0),
      discountAmountVES: Number(p.discountAmountVES || 0),
      discountAmountUSD: Number(p.discountAmountUSD || 0),
      originalPriceVES: Number(p.originalPriceVES || p.totalPriceVES || 0),
      originalPriceUSD: Number(p.originalPriceUSD || p.totalPriceUSD || 0),
    };
  }

  // 🔴 PRIORIDAD 2: flujo viejo (compatibilidad)
  let pricesObj = product?.prices;

  if (typeof pricesObj === 'string') {
    try {
      pricesObj = JSON.parse(pricesObj);
    } catch {
      pricesObj = {};
    }
  }

  const vesVal = Number(
    pricesObj?.VES ?? 
    pricesObj?.ves ?? 
    product?.price ?? 
    product?.precio ?? 
    product?.price_ves ?? 
    0
  );

  let usdVal = Number(
    pricesObj?.USD ?? 
    pricesObj?.usd ?? 
    product?.priceUsd ?? 
    product?.price_usd ?? 
    product?.usd ?? 
    product?.attributes?.prices?.USD ?? 
    0
  );

  return {
    VES: !isNaN(vesVal) ? vesVal : 0,
    USD: !isNaN(usdVal) ? usdVal : 0,
    hasDiscount: false,
    discountPercentage: 0,
    discountAmountVES: 0,
    discountAmountUSD: 0,
    originalPriceVES: !isNaN(vesVal) ? vesVal : 0,
    originalPriceUSD: !isNaN(usdVal) ? usdVal : 0,
  };
};

// 🔥 FUNCIÓN PARA FORMATEAR PRECIOS
const formatPrice = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
// 🔥 FUNCIÓN PARA FORMATEAR FECHA LEGIBLE - CORREGIDA
const formatDateReadable = (dateStr: string): string => {
  if (!dateStr) return 'Fecha no seleccionada';
  try {
    // 🔥 DESCOMPONER LA FECHA Y CREARLA EN UTC PARA EVITAR DESFASE
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    // Crear fecha en UTC
    const d = new Date(Date.UTC(year, month, day));
    
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
};
// ✅ FUNCIÓN PARA OBTENER IMAGEN DEL SERVICIO CON getImageUrl
const getServiceImage = (service: any, getImageUrlProp?: (item: any) => string | null): string | null => {
  if (!service) return null;
  
  // ✅ PRIMERO: Intentar usar getImageUrl del padre
  if (getImageUrlProp) {
    const processed = getImageUrlProp(service);
    if (processed) return processed;
  }
  
  // ✅ SEGUNDO: Intentar usar getImageUrl directamente
  try {
    const processed = getImageUrl(service);
    if (processed) return processed;
  } catch (e) {
    // Fallback a la lógica manual
  }
  
  // ✅ TERCERO: Fallback manual
  let rawImg = '';
  
  if (typeof service.coverImage === 'string' && service.coverImage.trim() !== '') {
    rawImg = service.coverImage;
  } else if (typeof service.image === 'string' && service.image.trim() !== '') {
    rawImg = service.image;
  } else if (typeof service.photo === 'string' && service.photo.trim() !== '') {
    rawImg = service.photo;
  } else if (Array.isArray(service.mediaUrls) && service.mediaUrls.length > 0) {
    const first = service.mediaUrls[0];
    if (typeof first === 'string' && first.trim() !== '') rawImg = first;
    else if (first?.url) rawImg = first.url;
    else if (first?.path) rawImg = first.path;
  } else {
    const directImages = service.images || service.existingImages || service.fileUrls || service.photos || service.files;
    if (Array.isArray(directImages) && directImages.length > 0) {
      const first = directImages[0];
      if (typeof first === 'string' && first.trim() !== '') rawImg = first;
      else if (first?.url) rawImg = first.url;
      else if (first?.path) rawImg = first.path;
    }
  }

  if (!rawImg) return null;
  if (typeof rawImg !== 'string') rawImg = String(rawImg);
  rawImg = rawImg.trim();
  if (!rawImg) return null;

  rawImg = rawImg.replace(/\\/g, '/');

  const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
  const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;

  if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
    try {
      const urlObj = new URL(rawImg);
      if (urlObj.port && urlObj.port !== '3000') {
        return `${cleanBase}${urlObj.pathname}`;
      }
      return rawImg;
    } catch (e) {
      return rawImg;
    }
  }

  if (rawImg.startsWith('blob:') || rawImg.startsWith('data:')) {
    return rawImg;
  }

  if (rawImg.includes('uploads/')) {
    const relativePath = rawImg.split('uploads/').pop();
    return `${cleanBase}/uploads/${relativePath}`;
  }

  const cleanPath = rawImg.startsWith('/') ? rawImg.slice(1) : rawImg;
  return `${cleanBase}/uploads/${cleanPath}`;
};

export default function AppointmentCheckout({
  isOpen,
  onClose,
  textMainClass,
  textMutedClass,
  primary,
  secondary,
  isSecondaryLight = false,
  isPrimaryLight = false,
  selectedService,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  customerReference,
  setCustomerReference,
  onProcessOrder,
  pagoMovilData,
  pagoMovilList: pagoMovilListProp,
  tenantId,
  tenant,
    userId,
  tenantConfig,
  currentUser,
  isStoreOpen = true,
  storeClosedMessage = 'La tienda está cerrada en este momento.',
  getImageUrl: getImageUrlProp,
}: AppointmentCheckoutProps) {

  // 🔥 SERVICIOS - EXENTOS DE IVA
  const exchangeRate = 0;

  // ... resto del código
  // ============================================================
  // 🔥 SINCRONIZAR DATOS DEL USUARIO (IGUAL QUE CartSidebar)
  // ============================================================
  useEffect(() => {
    if (!isOpen) return;
    if (customerPhone && customerAddress && customerName) return;

    let isMounted = true;

    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        if (!token) return;

        const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
        const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;
        
        const res = await fetch(`${cleanBase}/api/account/profile`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok && isMounted) {
          const account = await res.json();
          if (account) {
            if (!customerName && account.name) setCustomerName(account.name);
            if (!customerPhone && account.phone) setCustomerPhone(account.phone);
            if (!customerAddress) {
              const dir = account.address || '';
              const ciudad = account.city || '';
              let fullAddress = dir;
              if (ciudad && !dir.toLowerCase().includes(ciudad.toLowerCase())) {
                fullAddress = dir ? `${dir}, ${ciudad}` : ciudad;
              }
              if (fullAddress) setCustomerAddress(fullAddress);
            }
          }
        }
      } catch (err) {
        console.error('Error al sincronizar datos de la cuenta:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerPhone, customerAddress, customerName]);

  // ============================================================
  // 🔥 CALCULAR PRECIOS CORRECTAMENTE (IGUAL QUE CartSidebar)
  // ============================================================
  const prices = getProductPrices(selectedService);
  const finalUsd = prices.USD;
  const finalVes = prices.VES;

  // ✅ OBTENER IMAGEN DEL SERVICIO
  const serviceImage = getServiceImage(selectedService, getImageUrlProp);

  // ============================================================
  // ESTADOS - MISMA LÓGICA QUE CartSidebar
  // ============================================================
  const [step, setStep] = useState<'cart' | 'waiting_payment'>('cart');
  // 🔥 Modalidad del servicio (presencial en local o a domicilio)
  // 🔥 FASE N1: modalidad con valores canónicos del admin
  // ('Presencial' | 'Online / Virtual' | 'A Domicilio' | 'Híbrido')
  // El checkout solo distingue entre 'Presencial' y 'A Domicilio'.
  const [serviceModality, setServiceModality] = useState<'Presencial' | 'A Domicilio'>(
    (() => {
      const modality = selectedService?.serviceModality || selectedService?.attributes?.serviceModality;
      if (modality === 'A Domicilio') return 'A Domicilio';
      if (modality === 'Presencial') return 'Presencial';
      return 'Presencial';
    })()
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pago_movil');
  const [bankSource, setBankSource] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [selectedPagoMovilIndex, setSelectedPagoMovilIndex] = useState(0);

  // Estados para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmedData, setConfirmedData] = useState(false);

  // Estados para campos adicionales de métodos
  const [senderEmail, setSenderEmail] = useState('');
  const [clientIdNumber, setClientIdNumber] = useState('');
  const [clientAccountType, setClientAccountType] = useState('');

  // 🔥 Efectivo: moneda + monto entregado (con cálculo de vuelto)
  const [cashCurrency, setCashCurrency] = useState<'VES' | 'USD'>('VES');
  const [cashAmount, setCashAmount] = useState(0);

  // Estados para comprobante
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  // Estados para modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderData, setSuccessOrderData] = useState<any>(null);

  // 🔥 RESETEAR CUANDO SE CIERRA
  useEffect(() => {
    if (!isOpen) {
      setStep('cart');
      setCreatedOrderId(null);
      setProofFile(null);
      setProofPreview(null);
      setProofError(null);
      setProofUrl(null);
      setShowSuccessModal(false);
      setSuccessOrderData(null);
    }
  }, [isOpen]);

  // OBTENER LISTA DE PAGO MÓVIL
  const pagoMovilList = 
    pagoMovilListProp ||
    tenantConfig?.paymentMethods?.pagoMovilList || 
    tenantConfig?.specificConfig?.paymentMethods?.pagoMovilList || 
    (pagoMovilData ? [pagoMovilData] : []);

  const selectedPagoMovil = pagoMovilList[selectedPagoMovilIndex] || null;

  // OBTENER MÉTODOS DE PAGO ACTIVOS
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
    
  const availablePaymentMethods = getAvailablePaymentMethods(activeMethods, tenantConfig || {});
  const hasValidPaymentMethods = hasAnyPaymentMethodAvailable(activeMethods, tenantConfig || {});

  // ESTABLECER MÉTODO POR DEFECTO
  useEffect(() => {
    if (availablePaymentMethods.length > 0) {
      const defaultMethod = getDefaultPaymentMethod(activeMethods, tenantConfig || {});
      if (defaultMethod && paymentMethod !== defaultMethod) {
        const isCurrentAvailable = availablePaymentMethods.some(m => m.id === paymentMethod);
        if (!isCurrentAvailable) {
          setPaymentMethod(defaultMethod);
        }
      }
    }
  }, [availablePaymentMethods, activeMethods, tenantConfig]);

const createBooking = async (orderId: string, serviceId: string) => {
  console.log('📅 [createBooking] ===== INICIO =====');
  console.log('📅 [createBooking] orderId:', orderId);
  console.log('📅 [createBooking] serviceId:', serviceId);
  
  try {
    const token = localStorage.getItem('token') || '';
    const customerEmail = (currentUser as any)?.email || '';

    console.log('📅 [createBooking] Datos disponibles:', {
      appointmentDate,
      appointmentTime,
      selectedService: selectedService ? {
        id: selectedService.id,
        _id: selectedService._id,
        name: selectedService.name,
        durationMinutes: selectedService.durationMinutes,
        tenantId: selectedService.tenantId,
        professionals: selectedService.professionals,
        attributes: selectedService.attributes,
      } : null,
      customerName,
      customerPhone,
      customerAddress,
      customerReference,
      tenantId,
      userId,
      orderId,
      serviceId,
    });

    // 🔥 VALIDAR CAMPOS REQUERIDOS
    const errors: string[] = [];
    
    if (!appointmentDate) errors.push('appointmentDate');
    if (!appointmentTime) errors.push('appointmentTime');
    if (!customerName) errors.push('customerName');
    if (!customerPhone) errors.push('customerPhone');
    
    if (errors.length > 0) {
      console.error('❌ [createBooking] Campos requeridos faltantes:', errors);
      alert(`Faltan campos requeridos: ${errors.join(', ')}`);
      return null;
    }

    // 🔥 OBTENER EL ID CORRECTO DEL SERVICIO
    const realServiceId = selectedService?.id || selectedService?._id || serviceId;
    console.log('📅 [createBooking] realServiceId:', realServiceId);
    
    if (!realServiceId) {
      console.error('❌ [createBooking] No se pudo obtener el serviceId');
      alert('Error: No se pudo identificar el servicio. Contacta al administrador.');
      return null;
    }

    // 🔥 OBTENER EL TENANT ID CORRECTO
    const realTenantId = tenantId || selectedService?.tenantId || 'default-tenant';
    console.log('📅 [createBooking] realTenantId:', realTenantId);

    // 🔥 OBTENER PROFESSIONAL ID DEL SERVICIO - ✅ ESTO ES LO QUE FALTA
    const serviceProfessionals = selectedService?.professionals || 
                                 selectedService?.attributes?.professionals || 
                                 selectedService?.attributes?.professionalIds || 
                                 [];
    const professionalId = Array.isArray(serviceProfessionals) && serviceProfessionals.length > 0 
      ? serviceProfessionals[0] 
      : null;
    console.log('📅 [createBooking] professionalId del servicio:', professionalId);

    // 🔥 CALCULAR DURACIÓN
    const duration = Number(selectedService?.durationMinutes || selectedService?.duration || 60);
    console.log('📅 [createBooking] duration:', duration);

    // 🔥 CALCULAR END TIME
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    console.log('📅 [createBooking] endTime calculado:', endTime);

    // 🔥 CONSTRUIR PAYLOAD - AHORA CON professionalId + serviceModality
    const bookingPayload = {
      tenantId: realTenantId,
      serviceId: realServiceId,
      orderId: orderId,
      userId: userId || null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail || '',
      bookingDate: appointmentDate,
      startTime: appointmentTime,
      endTime: endTime,
      durationMinutes: duration,
      status: 'pending',
      notes: customerReference || '',
      customerAddress: customerAddress || '',
      customerReference: customerReference || '',
      price: finalVes,
      priceUsd: finalUsd,
      professionalId: professionalId,
      // 🔥 NUEVO: modalidad del servicio (presencial en local o a domicilio)
      serviceModality: serviceModality,
    };
    console.log('📅 [createBooking] Payload a enviar:', JSON.stringify(bookingPayload, null, 2));

    const apiUrl = `${API_BASE}/bookings`;
    console.log(`📅 [createBooking] POST ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(bookingPayload),
    });

    console.log(`📅 [createBooking] Response status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log(`📅 [createBooking] Response body (texto):`, responseText);

    let responseData = null;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
      console.log(`📅 [createBooking] Response body (parseado):`, responseData);
    } catch (parseError) {
      console.warn('⚠️ [createBooking] No se pudo parsear como JSON:', parseError);
    }

    if (!response.ok) {
      const errorMessage = responseData?.message || responseData?.error || responseText || `Error ${response.status}`;
      console.error('❌ [createBooking] Error en la respuesta:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        fullResponse: responseData,
        rawResponse: responseText,
      });
      
      alert(`❌ Error al crear la reserva: ${errorMessage}`);
      
      return null;
    }

    console.log('✅ [createBooking] Booking creado exitosamente:', responseData);
    return responseData;

  } catch (error) {
    console.error('❌ [createBooking] Error en la petición:', error);
    alert(`❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return null;
  }
};

  // ============================================================
  // FUNCIONES
  // ============================================================



  const safePrimary = primary || '#10B981';

  // 🔥 SUBIR COMPROBANTE
  const handleUploadProof = async () => {
    if (!proofFile || !createdOrderId) {
      setProofError('No hay archivo seleccionado o orden creada');
      return;
    }

    setIsUploadingProof(true);
    setProofError(null);

    try {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('file', proofFile);

      const response = await fetch(`${API_BASE}/orders/${createdOrderId}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir el comprobante');
      }

      const data = await response.json();
      setProofUrl(data.url);
      setProofFile(null);
      
      const input = document.getElementById('proof-upload') as HTMLInputElement;
      if (input) input.value = '';

    } catch (error: any) {
      console.error('❌ Error al subir comprobante:', error);
      setProofError(error.message || 'Error al subir el comprobante');
    } finally {
      setIsUploadingProof(false);
    }
  };

  // 🔥 GENERAR ORDEN Y BOOKING
  const handleGenerateOrder = async () => {
    if (!onProcessOrder || !selectedService) return;

    setIsSubmitting(true);
    setShowConfirmModal(false);
    
    try {
      // 1. CREAR LA ORDEN
      // 1. CREAR LA ORDEN
      const payloadData = {
        action: 'create_order',
        tenantId: tenantId || 'default-tenant',
        userId: userId,
        paymentMethodUsed: paymentMethod,
        customerName,
        customerPhone,
        customerAddress,
        customerReference,
        items: [{
          serviceId: selectedService.id || selectedService._id,
          name: selectedService.name,
          quantity: 1,
          // 🔥 NO MANDAR priceUsd/priceVes: el backend recalcula con PricingService
          type: 'service',
          appointmentDate,
          appointmentTime,
          notes: customerReference,
        }],
        totalAmount: finalUsd,
        totalUsd: finalUsd,
        totalVes: finalVes,
        status: 'PENDING',
        orderType: 'service',
        serviceDetails: {
          date: appointmentDate,
          time: appointmentTime,
          duration: selectedService.durationMinutes || 60,
          notes: customerReference,
        }
      };
      
      console.log('📤 [AppointmentCheckout] payloadData:', JSON.stringify(payloadData, null, 2));
      const response = await onProcessOrder(payloadData);      const assignedId = 
        response?.id || 
        response?.orderId || 
        response?._id || 
        (typeof response === 'string' ? response : null) || 
        ('ORD-' + Date.now());

      setCreatedOrderId(assignedId);

      // 2. 🔥 CREAR EL BOOKING (con manejo de errores mejorado)
      const serviceId = selectedService.id || selectedService._id;
      if (serviceId && assignedId) {
        console.log('📅 [handleGenerateOrder] Creando booking para serviceId:', serviceId);
        const bookingResult = await createBooking(assignedId, serviceId);
        if (bookingResult) {
          console.log('✅ [handleGenerateOrder] Booking creado:', bookingResult);
        } else {
          console.warn('⚠️ [handleGenerateOrder] No se pudo crear el booking, pero la orden se creó correctamente');
        }
      } else {
        console.warn('⚠️ [handleGenerateOrder] No se pudo crear booking: faltan IDs', { serviceId, assignedId });
      }

      setStep('waiting_payment');
      setConfirmedData(false);
      
      // Resetear comprobante
      setProofFile(null);
      setProofPreview(null);
      setProofError(null);
      setProofUrl(null);
      
    } catch (error) {
      console.error("❌ Error al generar la orden:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 REPORTAR PAGO
  const handleSubmitPaymentReport = async () => {
    if (!onProcessOrder || !createdOrderId) return;

    setIsSubmitting(true);
    try {
      const paymentPayload: any = {
        action: 'submit_payment',
        orderId: createdOrderId,
        paymentMethod,
        bankSource,
        paymentReference,
        status: paymentMethod === 'cash' ? 'PENDING_LOCAL' : 'por_verificar',
        // 🔥 Si es efectivo, incluir moneda + monto entregado
        ...(paymentMethod === 'cash'
          ? {
              cashCurrency,
              cashAmount,
            }
          : {}),
        orderType: 'service',
      };

      if (paymentMethod === 'zelle') {
        paymentPayload.senderEmail = senderEmail;
      }
      if (paymentMethod === 'pos') {
        paymentPayload.clientIdNumber = clientIdNumber;
        paymentPayload.clientAccountType = clientAccountType;
      }
      if (paymentMethod === 'biopago') {
        paymentPayload.clientIdNumber = clientIdNumber;
      }
      if (proofUrl) {
        paymentPayload.paymentProof = proofUrl;
      }

      await onProcessOrder(paymentPayload);
      
      setSuccessOrderData({
        id: createdOrderId,
        customerName,
        customerPhone,
        customerAddress,
        customerReference,
        totalAmount: finalUsd,
        totalAmountVes: finalVes,
        paymentMethodUsed: paymentMethod,
        paymentReference,
        paymentProof: proofUrl,
        // ✅ INCLUIR IMAGEN DEL SERVICIO EN LOS DATOS DE ÉXITO
        serviceImage: serviceImage,
        items: [{
          name: selectedService.name,
          quantity: 1,
          type: 'service',
          notes: customerReference,
          image: serviceImage, // ✅ IMAGEN PROCESADA
        }],
        appointmentDate,
        appointmentTime,
        type: 'service',
        createdAt: new Date().toISOString(),
        notes: customerReference,
        // 🔥 CAMPOS DE DESCUENTO (desde _pricing del servicio)
        hasDiscount: prices.hasDiscount,
        discountPercentage: prices.discountPercentage,
        discountAmountVES: prices.discountAmountVES,
        discountAmountUSD: prices.discountAmountUSD,
        originalPriceVES: prices.originalPriceVES,
        originalPriceUSD: prices.originalPriceUSD,
        // 🔥 Si es efectivo, guardar moneda + monto entregado
        ...(paymentMethod === 'cash'
          ? {
              cashCurrency,
              cashAmount,
            }
          : {}),
      });
      
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error("❌ Error al reportar pago:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPaymentData = () => {
    if (!selectedPagoMovil) return;
    
    const textToCopy = `Banco: ${getBankLabel(selectedPagoMovil.bank)}\nTeléfono: ${selectedPagoMovil.operator || ''}${selectedPagoMovil.phone || ''}\nRIF/Cédula: ${selectedPagoMovil.idType || 'V'}-${selectedPagoMovil.idNumber || ''}\nMonto: Bs. ${formatPrice(finalVes)}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => alert('Datos de pago copiados al portapapeles'))
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
            alert('Datos de pago copiados al portapapeles');
          } catch (err) {
            console.error('Error al copiar:', err);
          }
          document.body.removeChild(textArea);
        });
    }
  };

  if (!isOpen) return null;

  const resolvedTextMain = textMainClass || (isSecondaryLight ? 'text-slate-900' : 'text-slate-100');
  const resolvedTextMuted = textMutedClass || (isSecondaryLight ? 'text-slate-500' : 'text-slate-400');
  const borderDynamic = isSecondaryLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  const containerStyle = { 
    backgroundColor: secondary || (isSecondaryLight ? '#ffffff' : '#0f172a'), 
    borderColor: borderDynamic, 
  };
  
  const dynamicSubCardStyle = {
    backgroundColor: isSecondaryLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
    borderColor: borderDynamic,
  };

  // 🔥 Fecha y hora legibles
  const readableDate = formatDateReadable(appointmentDate);
  const formattedTime = appointmentTime || 'Hora no seleccionada';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className={`w-screen max-w-md border-l shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 ${resolvedTextMain}`}
          style={containerStyle}
        >
          
          {/* HEADER */}
          <div 
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="p-2.5 rounded-2xl shadow-sm flex items-center justify-center"
                style={{ backgroundColor: `${safePrimary}15`, color: safePrimary }}
              >
                <CalendarIcon className="w-5 h-5" style={{ color: safePrimary }} />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight ${resolvedTextMain}`}>
                  {step === 'cart' ? 'Confirmar tu Cita' : 'Realizar Pago'}
                </h2>
                <p className={`text-xs font-medium ${resolvedTextMuted}`}>
                  {step === 'cart' ? 'Detalles de la reserva' : `Orden #${createdOrderId || 'Generada'}`}
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

          {/* FASE 1: CONFIRMAR RESERVA */}
          {step === 'cart' && (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Servicio seleccionado con precios correctos e imagen */}
                <div className="space-y-2.5">
                  {!selectedService ? (
                    <div className={`rounded-2xl p-6 text-center text-xs italic border ${
                      isSecondaryLight 
                        ? 'bg-white/40 border-slate-200 text-slate-600 shadow-sm' 
                        : 'bg-black/25 border-white/10 text-slate-400 shadow-lg'
                    }`}>
                      No has seleccionado ningún servicio.
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl border transition-colors ${
                      isSecondaryLight 
                        ? 'bg-white/50 border-slate-200/80 shadow-inner' 
                        : 'bg-black/30 border-white/15 shadow-inner'
                    }`}>
<div className="flex items-start gap-3">
  {serviceImage && (
    <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border" style={{ borderColor: borderDynamic }}>
      <Image
        src={serviceImage}
        alt={selectedService.name}
        fill
        sizes="56px"
        className="object-cover"
        quality={70}
        loading="lazy"
      />
    </div>
  )}
  <div className="flex-1 min-w-0">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
      <div className="space-y-0.5 min-w-0 flex-1">
        <span className={`font-bold block truncate ${resolvedTextMain}`}>{selectedService.name}</span>
        <span className={`text-[11px] flex items-center gap-1 ${resolvedTextMuted}`}>
          <Clock className="w-3 h-3" />
          {selectedService.durationMinutes || 30} min
        </span>
      </div>
<div className="text-left sm:text-right shrink-0">
  {prices.hasDiscount ? (
    <>
      <span className={`text-[10px] line-through opacity-50 block ${resolvedTextMuted}`}>
        Bs. {formatPrice(prices.originalPriceVES)}
      </span>
      <span className="font-black text-base sm:text-lg block truncate" style={{ color: safePrimary }}>
        Bs. {formatPrice(finalVes)}
      </span>
      <span className="text-[10px] font-semibold block" style={{ 
        color: isSecondaryLight ? '#065f46' : '#34d399' 
      }}>
        (${finalUsd.toFixed(2)} USD)
      </span>
      <span 
        className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5"
        style={{ backgroundColor: safePrimary, color: '#ffffff' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
          <path d="M12 2C9 6 7 10 7 14c0 2.76 2.24 5 5 5s5-2.24 5-5c0-4-2-8-5-12z"/>
        </svg>
        -{prices.discountPercentage}%
      </span>
    </>
  ) : (
    <>
      <span className="font-black text-base sm:text-lg block truncate" style={{ color: safePrimary }}>
        Bs. {formatPrice(finalVes)}
      </span>
      <span className="text-[10px] font-semibold block" style={{ 
        color: isSecondaryLight ? '#065f46' : '#34d399' 
      }}>
        (${finalUsd.toFixed(2)} USD)
      </span>
    </>
  )}
</div>
    </div>
  </div>
</div>
                    </div>
                  )}
                </div>

                {/* 🔥 FECHA Y HORA - PRECARGADAS DEL MODAL (SOLO LECTURA) */}
                {selectedService && appointmentDate && (
                  <div className={`space-y-3 pt-3 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${resolvedTextMain}`}>
                      Programación de la Cita
                    </h4>

                    <div className={`p-3 rounded-2xl border ${isSecondaryLight ? 'bg-slate-50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${safePrimary}15` }}>
                          <Calendar className="w-4 h-4" style={{ color: safePrimary }} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${resolvedTextMain}`}>{readableDate}</p>
                          <p className={`text-[11px] flex items-center gap-1 ${resolvedTextMuted}`}>
                            <Clock className="w-3 h-3" />
                            {formattedTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔥 MODALIDAD DEL SERVICIO (valores canónicos: Presencial / A Domicilio / Online / Híbrido) */}
                {selectedService && (() => {
                  // 🔥 FASE N1: mapear desde los 4 valores canónicos del admin
                  const serviceModalityConfig =
                    selectedService?.serviceModality ||
                    selectedService?.attributes?.serviceModality ||
                    null;

                  // 'Online / Virtual' → no requiere dirección física → no mostrar sección
                  if (serviceModalityConfig === 'Online / Virtual') return null;

                  // Mapeo a los 2 botones del checkout
                  const allowsPresencial =
                    serviceModalityConfig === 'Presencial' ||
                    serviceModalityConfig === 'Híbrido' ||
                    serviceModalityConfig === null ||
                    serviceModalityConfig === undefined ||
                    serviceModalityConfig === '';   // legacy / vacío → ambos

                  const allowsDomicilio =
                    serviceModalityConfig === 'A Domicilio' ||
                    serviceModalityConfig === 'Híbrido' ||
                    serviceModalityConfig === null ||
                    serviceModalityConfig === undefined ||
                    serviceModalityConfig === '';   // legacy / vacío → ambos

                  // Si solo permite un tipo, no mostrar selector (solo confirmar)
                  const bothAllowed = allowsPresencial && allowsDomicilio;

                  if (!allowsDomicilio && !allowsPresencial) return null;

                  return (
                    <div className={`space-y-3 pt-3.5 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'}`}>
                      <h4 className={`text-xs font-black uppercase tracking-wider ${resolvedTextMain}`}>
                        Modalidad del Servicio
                      </h4>

                      {bothAllowed ? (
                        // Selector con 2 opciones
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setServiceModality('presencial')}
                            className={`p-3 rounded-2xl border-2 text-left transition ${
                              serviceModality === 'presencial'
                                ? 'shadow-sm'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{
                              borderColor: serviceModality === 'presencial' ? safePrimary : borderDynamic,
                              backgroundColor: serviceModality === 'presencial' ? `${safePrimary}10` : 'transparent',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4" style={{ color: serviceModality === 'presencial' ? safePrimary : resolvedTextMuted }} />
                              <span className={`text-xs font-bold ${resolvedTextMain}`}>En el local</span>
                            </div>
                            <p className={`text-[10px] ${resolvedTextMuted}`}>
                              Vas al negocio
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setServiceModality('domicilio')}
                            className={`p-3 rounded-2xl border-2 text-left transition ${
                              serviceModality === 'domicilio'
                                ? 'shadow-sm'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{
                              borderColor: serviceModality === 'domicilio' ? safePrimary : borderDynamic,
                              backgroundColor: serviceModality === 'domicilio' ? `${safePrimary}10` : 'transparent',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4" style={{ color: serviceModality === 'domicilio' ? safePrimary : resolvedTextMuted }} />
                              <span className={`text-xs font-bold ${resolvedTextMain}`}>A domicilio</span>
                            </div>
                            <p className={`text-[10px] ${resolvedTextMuted}`}>
                              El profesional va a tu dirección
                            </p>
                          </button>
                        </div>
                      ) : (
                        // Solo un tipo permitido → mostrar info
                        <div className={`p-3 rounded-2xl border ${isSecondaryLight ? 'bg-slate-50' : 'bg-white/5'}`} style={{ borderColor: borderDynamic }}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{ color: safePrimary }} />
                            <span className={`text-xs font-bold ${resolvedTextMain}`}>
                              {allowsDomicilio ? 'Servicio a domicilio' : 'Servicio en el local'}
                            </span>
                          </div>
                          <p className={`text-[10px] mt-1 ${resolvedTextMuted}`}>
                            {allowsDomicilio
                              ? 'El profesional se desplazará a tu dirección.'
                              : 'El servicio se realiza en el local del negocio.'}
                          </p>
                        </div>
                      )}

                      {serviceModality === 'domicilio' && (
                        <div className={`p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10`}>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            📍 Asegurate de completar la dirección en "Datos del Cliente" para que el profesional llegue.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Total con precios correctos */}
                {selectedService && (
                  <div className={`flex justify-between items-center pt-3.5 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'} text-sm font-black ${resolvedTextMain}`}>
                    <span>Total:</span>
                 <div className="text-right">
  {prices.hasDiscount && (
    <span className={`text-xs line-through opacity-50 block ${resolvedTextMuted}`}>
      Bs. {formatPrice(prices.originalPriceVES)}
    </span>
  )}
  <span className="text-lg font-black" style={{ color: safePrimary }}>
    Bs. {formatPrice(finalVes)}
  </span>
  <span className="text-[10px] font-semibold block" style={{ 
    color: isSecondaryLight ? '#065f46' : '#34d399' 
  }}>
    (${finalUsd.toFixed(2)} USD)
  </span>
  {prices.hasDiscount && prices.discountAmountVES > 0 && (
    <span className="text-[10px] font-bold block text-emerald-500">
      Ahorras Bs. {formatPrice(prices.discountAmountVES)}
    </span>
  )}
</div>
                  </div>
                )}

                {/* Datos del Cliente */}
                <div className={`space-y-3.5 pt-3.5 border-t ${isSecondaryLight ? 'border-slate-200/80' : 'border-white/10'}`}>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${resolvedTextMain}`}>Datos del Cliente</h4>

                  <div>
                    <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Nombre y Apellido *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none opacity-60">
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
                    <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Teléfono / WhatsApp *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none opacity-60">
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
                    <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Dirección o Zona</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none opacity-60">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Ej. Caracas / Chacao"
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
                    <label className={`block text-[11px] font-bold ${resolvedTextMuted} mb-1.5`}>Notas (Opcional)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none opacity-60">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Requerimientos específicos..."
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

              {/* FOOTER - Botón Confirmar */}
              <div 
                className="p-6 border-t"
                style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}
              >
                <button
                  style={{ backgroundColor: safePrimary }}
                  className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl transition shadow-xl uppercase text-xs tracking-wider cursor-pointer hover:opacity-90 active:scale-[0.98] ${(
                    isPrimaryLight ? 'text-slate-950 font-black' : 'text-white'
                  )} ${(!selectedService || !customerName || !customerPhone) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (!selectedService || !customerName || !customerPhone) {
                      alert('Completa todos los campos requeridos');
                      return;
                    }
                    if (!hasValidPaymentMethods) {
                      alert('La tienda no tiene métodos de pago configurados. Contacta al administrador.');
                      return;
                    }
                    setShowConfirmModal(true);
                  }}
                  disabled={!selectedService || !customerName || !customerPhone}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Cita y Pagar
                </button>
              </div>
            </>
          )}

          {/* FASE 2: PAGO - 🔥 DESACTIVADO PARA SERVICIOS */}
          {step === 'waiting_payment' && (
            <CartPaymentStep
              createdOrderId={createdOrderId}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              bankSource={bankSource}
              setBankSource={setBankSource}
              paymentReference={paymentReference}
              setPaymentReference={setPaymentReference}
              isSubmitting={isSubmitting}
              onBack={() => setStep('cart')}
              onSubmit={handleSubmitPaymentReport}
              selectedPagoMovil={selectedPagoMovil}
              pagoMovilList={pagoMovilList}
              selectedPagoMovilIndex={selectedPagoMovilIndex}
              setSelectedPagoMovilIndex={setSelectedPagoMovilIndex}
              finalVes={finalVes}
              formatPrice={formatPrice}
              isSecondaryLight={isSecondaryLight}
              isPrimaryLight={isPrimaryLight || false}
              safePrimary={safePrimary}
              borderDynamic={borderDynamic}
              resolvedTextMain={resolvedTextMain}
              resolvedTextMuted={resolvedTextMuted}
              getBankName={getBankLabel}
                            copyPaymentData={copyPaymentData}
              availablePaymentMethods={availablePaymentMethods}
              tenantConfig={tenantConfig}
              senderEmail={senderEmail}
              setSenderEmail={setSenderEmail}
              clientIdNumber={clientIdNumber}
              setClientIdNumber={setClientIdNumber}
                      clientAccountType={clientAccountType}
              setClientAccountType={setClientAccountType}
              // 🔥 Efectivo: moneda + monto entregado
              cashCurrency={cashCurrency}
              onCashCurrencyChange={setCashCurrency}
              cashAmount={cashAmount}
              onCashAmountChange={setCashAmount}
              proofFile={proofFile}
              setProofFile={setProofFile}
              
              proofPreview={proofPreview}
              setProofPreview={setProofPreview}
              proofError={proofError}
              setProofError={setProofError}
              isUploadingProof={isUploadingProof}
              setIsUploadingProof={setIsUploadingProof}
              onUploadProof={handleUploadProof}
              // 🔥 DESACTIVAR IVA PARA SERVICIOS
              orderType="service"
              ivaPercentage={0}
              isIvaExempt={true}
              isIvaMixed={false}
              ivaAmount={0}
              subtotalWithIva={0}
            />
          )}

        </div>
      </div>

      {/* 🔥 MODAL DE CONFIRMACIÓN - SERVICIOS (EXENTO DE IVA) */}
      <ServiceConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmedData(false);
        }}
        onConfirm={handleGenerateOrder}
        isSubmitting={isSubmitting}
        confirmedData={confirmedData}
        setConfirmedData={setConfirmedData}
        selectedService={selectedService}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        customerReference={customerReference}
        appointmentDate={appointmentDate}
        appointmentTime={appointmentTime}
        finalVes={finalVes}
        finalUsd={finalUsd}
        formatPrice={formatPrice}
        isSecondaryLight={isSecondaryLight}
        safePrimary={safePrimary}
        secondary={secondary}
        borderDynamic={borderDynamic}
        textColor={resolvedTextMain}
        mutedColor={resolvedTextMuted}
        overlayBg={isSecondaryLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)'}
        itemBg={isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)'}
      />       

      {/* 🔥 MODAL DE ÉXITO - SERVICIOS (EXENTO DE IVA) */}
      {showSuccessModal && successOrderData && (
        <ServiceSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            onClose();
          }}
          orderData={successOrderData}
          tenant={tenant}
          primary={safePrimary}
          secondary={secondary || (isSecondaryLight ? '#ffffff' : '#0f172a')}
          isSecondaryLight={isSecondaryLight}
          textMainClass={resolvedTextMain}
          textMutedClass={resolvedTextMuted}
          exchangeRate={exchangeRate}
        />
      )}

    </div>
  );
}