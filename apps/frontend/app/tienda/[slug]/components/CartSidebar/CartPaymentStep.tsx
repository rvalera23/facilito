'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { CheckCircle2, Building2, CreditCard, Upload, X, Truck, MapPin, Package } from 'lucide-react';
import {
  getAvailablePaymentMethods,
  getCheckoutFields,
  validateCheckoutFields,
  PAYMENT_METHODS_CONFIG,
  PaymentMethodType,
  CheckoutField,
} from '../../utils/paymentMethods';
import { useExchangeRateContext } from '@/app/context/ExchangeRateContext';
import { useThemedOptionStyle } from '@/hooks/useThemedOptionStyle';
import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';
import SearchableDropdown from '@/components/ui/SearchableDropdown';

// 🔥 DELIVERY LOCAL (facilito) — coexiste con el legacy de mensajería
import LocalDeliveryBlock, {
  LocalDeliverySelection,
} from '@/components/LocalDeliveryBlock';

// CONSTANTE: Metodos que requieren comprobante
const METHODS_REQUIRING_PROOF = ['pago_movil', 'zelle', 'binance'];

// OPCIONES DE MENSAJERIA - SE SOBREESCRIBEN CON LA CONFIGURACION DEL TENANT
const DEFAULT_DELIVERY_OPTIONS = [
  { id: 'mrw', name: 'MRW', cost: 12.00, days: '2-3 dias habiles' },
  { id: 'domesa', name: 'Domesa', cost: 15.00, days: '1-2 dias habiles' },
  { id: 'tealca', name: 'Tealca', cost: 18.00, days: '1 dia habil' },
  { id: 'zoom', name: 'Zoom', cost: 10.00, days: '2-4 dias habiles' },
];

// LOGOS DE COMPAÑIAS DE MENSAJERIA
const DELIVERY_LOGOS: Record<string, string> = {
  mrw: '/images/mrw.webp',
  domesa: '/images/domesa1.png',
  tealca: '/images/tealca.svg',
  zoom: '/images/zoom.png',
};

interface CartPaymentStepProps {
  createdOrderId: string | null;
  paymentMethod: PaymentMethodType;
  setPaymentMethod: (method: PaymentMethodType) => void;
  bankSource: string;
  setBankSource: (value: string) => void;
  paymentReference: string;
  setPaymentReference: (value: string) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  selectedPagoMovil: any;
  pagoMovilList: any[];
  selectedPagoMovilIndex: number;
  setSelectedPagoMovilIndex: (index: number) => void;
  finalVes: number;
  formatPrice: (num: number) => string;
  isSecondaryLight: boolean;
  isPrimaryLight: boolean;
  safePrimary: string;
  borderDynamic: string;
  resolvedTextMain: string;
  resolvedTextMuted: string;
  getBankName: (code: string) => string;
  copyPaymentData: () => void;
  availablePaymentMethods: Array<{ id: PaymentMethodType; config: any }>;
  tenantConfig: any;
  senderEmail?: string;
  setSenderEmail?: (value: string) => void;
  clientIdNumber?: string;
  setClientIdNumber?: (value: string) => void;
  clientPhone?: string;
  setClientPhone?: (value: string) => void;
  clientAccountType?: string;
  setClientAccountType?: (value: string) => void;
  proofFile?: File | null;
  setProofFile?: (file: File | null) => void;
  proofPreview?: string | null;
  setProofPreview?: (preview: string | null) => void;
  proofError?: string | null;
  setProofError?: (error: string | null) => void;
  isUploadingProof?: boolean;
  setIsUploadingProof?: (uploading: boolean) => void;
  onUploadProof?: () => Promise<void>;
  onDeliveryChange?: (deliveryData: any) => void;
  selectedDelivery?: string;
  setSelectedDelivery?: (value: string) => void;
  textColor?: string;
  customerAddress?: string;
  setCustomerAddress?: (value: string) => void;
  addressPlaceholder?: string;
  ivaPercentage?: number;
  isIvaExempt?: boolean;
  isIvaMixed?: boolean;
  
  ivaAmount?: number;
  subtotalWithIva?: number;
  orderType?: 'product' | 'service';
  workModality?: string;
  deliveryType?: string;
ivaTypeGeneral?: 'included' | 'excluded' | 'exempt' | 'mixed';
  hasDiscount?: boolean;
  cartItems?: any[];
  /** 🔥 Saldo a favor del comprador en este tenant. */
  creditBalance?: number;
  /** 🔥 ¿El comprador quiere aplicar el saldo a favor? */
  applyCredit?: boolean;
  /** 🔥 Callback para togglear el saldo a favor. */
  onApplyCreditChange?: (value: boolean) => void;
  /** Handler que abre el submodal de pago mixto (Fase 2). */
  onOpenMixedPayment?: () => void;
  /** Moneda elegida para el pago en efectivo (VES o USD). */
  cashCurrency?: 'VES' | 'USD';
  /** Callback cuando el comprador cambia la moneda. */
  onCashCurrencyChange?: (value: 'VES' | 'USD') => void;
  /** Monto que el comprador entrega en efectivo (puede ser mayor al total). */
  cashAmount?: number;
  /** Callback cuando el comprador cambia el monto. */
  onCashAmountChange?: (value: number) => void;
  /** 🔥 Callback cuando el comprador elige qué hacer con el vuelto. */
  onChangeResolution?: (resolution: 'credit' | 'pending' | 'rounded') => void;
  /** 🔥 Callback cuando el comprador elige CÓMO quiere el vuelto (método de entrega). */
  onChangeDeliveryPreference?: (preference: {
    method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
    pagoMovilData?: {
      bank: string;
      phone: string;
      clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
      clientIdNumber: string;
    };
    notes?: string;
  }) => void;
  /** 🔥 Datos del comprador para autocompletar Pago Móvil del vuelto. */
  buyerProfileData?: {
    idNumber?: string;
    idType?: 'V' | 'E' | 'J' | 'G' | 'P';
    phone?: string;
  };

  // ============================================================
  // 🔥 DELIVERY LOCAL (facilito)
  // ============================================================
  /** Slug del tenant para consultar /geo/check-delivery. */
  tenantSlug?: string | null;
  /** Coordenadas del comprador (desde LocationContext). */
  buyerLat?: number | null;
  buyerLng?: number | null;
  /** Callback cuando el comprador elige delivery local o pickup. */
  onLocalDeliveryChange?: (sel: LocalDeliverySelection | null) => void;
  /** Callback para pedir GPS al navegador. */
  onRequestLocation?: () => void;
  /** 🔥 Callback cuando el comprador elige el método de envío (local / encomienda / ninguno). */
  onDeliveryMethodChange?: (method: 'local' | 'shipping' | null) => void;
}
export default function CartPaymentStep({
  createdOrderId,
  paymentMethod,
  setPaymentMethod,
  bankSource,
  setBankSource,
  paymentReference,
  setPaymentReference,
  isSubmitting,
  onBack,
  onSubmit,
  selectedPagoMovil,
  pagoMovilList,
  selectedPagoMovilIndex,
  setSelectedPagoMovilIndex,
  finalVes,
  formatPrice,
  isSecondaryLight,
  isPrimaryLight,
  safePrimary,
  borderDynamic,
  resolvedTextMain,
  resolvedTextMuted,
  getBankName,
  copyPaymentData,
  availablePaymentMethods,
  tenantConfig,
  senderEmail = '',
  setSenderEmail = () => {},
  clientIdNumber = '',
  setClientIdNumber = () => {},
  clientPhone = '',
  setClientPhone = () => {},
  clientAccountType = '',
  setClientAccountType = () => {},
  proofFile = null,
  setProofFile = () => {},
  proofPreview = null,
  setProofPreview = () => {},
  proofError = null,
  setProofError = () => {},
  isUploadingProof = false,
  setIsUploadingProof = () => {},
  onUploadProof = async () => {},
  onDeliveryChange,
  selectedDelivery: propSelectedDelivery,
  setSelectedDelivery: propSetSelectedDelivery,
  textColor,
  customerAddress = '',
  setCustomerAddress = () => {},
  addressPlaceholder = 'Direccion exacta o zona de delivery',
  ivaPercentage = 0.16,
  isIvaExempt = false,
  isIvaMixed = false,
  ivaAmount = 0,
  subtotalWithIva = 0,
  orderType = 'product',
  workModality: propWorkModality,
  deliveryType: propDeliveryType,
  ivaTypeGeneral = 'excluded',
  hasDiscount = false,
  cartItems = [],
  creditBalance = 0,
  applyCredit = false,
  onApplyCreditChange,
  cartQuote,
  onOpenMixedPayment,
  cashCurrency = 'VES',
  onCashCurrencyChange,
  cashAmount = 0,
  onCashAmountChange,
  onChangeResolution,
  onChangeDeliveryPreference,
  buyerProfileData,
  // 🔥 DELIVERY LOCAL (facilito)
  tenantSlug = null,
  buyerLat = null,
  buyerLng = null,
  onLocalDeliveryChange,
  onRequestLocation,
  onDeliveryMethodChange,
}: CartPaymentStepProps & {
  cartQuote?: any;
}) {
  // 🔥 Estilo dinámico para los <option>.
  const optionStyle = useThemedOptionStyle();

  // 🔥 OBTENER TASAS DEL CONTEXTO GLOBAL
  const { rates, loading: ratesLoading } = useExchangeRateContext();
  
  // 🔥 TASA DE CAMBIO DINÁMICA - NUNCA USAR 784.66
  const exchangeRate = rates.USD > 0 ? rates.USD : 0;

  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [localSelectedDelivery, setLocalSelectedDelivery] = useState<string>('');
  const [showDeliverySelector, setShowDeliverySelector] = useState(false);
  const [wantsDelivery, setWantsDelivery] = useState<boolean | null>(null);

  // 🔥 Estado para el input de efectivo (string, para permitir comas/puntos mientras escribe)
  const [cashAmountInput, setCashAmountInput] = useState<string>(
    cashAmount > 0 ? String(cashAmount) : ''
  );

  // 🔥 Sincronizar cuando el padre cambia cashAmount (ej: al togglear moneda)
  useEffect(() => {
    if (cashAmount > 0 && !cashAmountInput) {
      setCashAmountInput(String(cashAmount));
    }
  }, [cashAmount, cashAmountInput]);

  // 🔥 NUEVO: al cambiar de moneda, resetear el monto para evitar
  // que 26.000 Bs. se conviertan en 26.000 USD.
  const prevCurrencyRef = React.useRef(cashCurrency);
  React.useEffect(() => {
    if (prevCurrencyRef.current !== cashCurrency) {
      prevCurrencyRef.current = cashCurrency;
      setCashAmountInput('');
      if (onCashAmountChange) onCashAmountChange(0);
    }
  }, [cashCurrency, onCashAmountChange]);


  // 🔥 Handler que acepta comas y puntos
  const handleCashAmountChange = (rawValue: string) => {
    // Permitir solo dígitos, comas y puntos
    let cleaned = rawValue.replace(/[^0-9.,]/g, '');

    // Evitar múltiples separadores decimales (solo uno permitido)
    const parts = cleaned.split(/[.,]/);
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limitar a 2 decimales
    const match = cleaned.match(/^(\d*)([.,]?\d{0,2})/);
    if (match) {
      cleaned = match[0];
    }

    setCashAmountInput(cleaned);

    // Convertir a número para el padre
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    onCashAmountChange && onCashAmountChange(Math.round(safe * 100) / 100);
  };
  // 🔥 NUEVO: estado para el selector de método de envío
  const [deliveryMethodChoice, setDeliveryMethodChoice] = useState<'pickup' | 'local' | 'shipping' | null>(null);
const [localDeliveryAvailable, setLocalDeliveryAvailable] = useState<boolean | null>(null);
// 🔥 Trackea si el LocalDeliveryBlock está activo (apretó "Usar")
const [localDeliveryActive, setLocalDeliveryActive] = useState(false);
    const clearShippingDelivery = () => {
    setSelectedDelivery('');
    onDeliveryChange?.({
      selected: '',
      data: null,
      costUsd: 0,
      costVes: 0,
      exchangeRate: Number(exchangeRate) || 0,
    });
  };

  // 🔥 Resolución del vuelto (cuando paga con efectivo y sobra)
  const [changeResolution, setChangeResolution] = useState<'credit' | 'pending' | 'rounded'>('pending');

  // 🔥 Método de entrega del vuelto (preferencia del comprador)
  const [changeDeliveryMethod, setChangeDeliveryMethod] = useState<
    'cash_ves' | 'cash_usd' | 'pago_movil' | 'other'
  >('cash_ves');

  // 🔥 Datos de Pago Móvil (si el comprador elige PM)
  const [changePmBank, setChangePmBank] = useState('');
  const [changePmPhone, setChangePmPhone] = useState('');
  const [changePmIdType, setChangePmIdType] = useState<'V' | 'E' | 'J' | 'G' | 'P'>('V');
  const [changePmIdNumber, setChangePmIdNumber] = useState('');
  const selectedDelivery = propSelectedDelivery !== undefined ? propSelectedDelivery : localSelectedDelivery;
  const setSelectedDelivery = propSetSelectedDelivery || setLocalSelectedDelivery;

  const checkoutFields = getCheckoutFields(paymentMethod);
  const currentMethodLabel = PAYMENT_METHODS_CONFIG[paymentMethod]?.label || paymentMethod;
  const requiresProof = METHODS_REQUIRING_PROOF.includes(paymentMethod);

  // LOGICA DE DECISION DE ENVIO - USANDO PROPS O TENANT CONFIG
  const deliveryConfig = tenantConfig?.delivery || {};
  const workModality = propWorkModality || tenantConfig?.workModality || tenantConfig?.work_modality || 'local';
  const deliveryType = propDeliveryType || tenantConfig?.deliveryType || tenantConfig?.delivery_type || 'retiro_local';

  // OBTENER PRECIOS CONFIGURADOS DESDE DELIVERY SETTINGS
  const getActiveDeliveryOptions = () => {
    const activeCompanies = deliveryConfig.activeCompanies || ['mrw', 'domesa', 'tealca', 'zoom'];
    const costsUSD = deliveryConfig.costsUSD || {};
    const estimatedDays = deliveryConfig.estimatedDays || {};
    
    return DEFAULT_DELIVERY_OPTIONS
      .filter(opt => activeCompanies.includes(opt.id))
      .map(opt => ({
        ...opt,
        cost: costsUSD[opt.id] !== undefined ? costsUSD[opt.id] : opt.cost,
        days: estimatedDays[opt.id] || opt.days,
      }));
  };

  const activeDeliveryOptions = getActiveDeliveryOptions();
  const hasDeliveryCompanies = activeDeliveryOptions.length > 0;

  const isDeliveryAllowed = (() => {
    if (orderType === 'service') return false;
    if (!hasDeliveryCompanies) return false;
    if (workModality === 'local') return false;
    if (workModality === 'remote') return false;
    if (deliveryType === 'retiro_local') return false;
    if (deliveryType === 'online') return false;
    if (workModality === 'delivery') return true;
    if (deliveryType === 'delivery_propio') return true;
    if (workModality === 'hybrid' && deliveryType === 'ambos') return true;
    return false;
  })();

  const isDeliveryMandatory = (() => {
    if (!isDeliveryAllowed) return false;
    if (workModality === 'delivery') return true;
    if (deliveryType === 'delivery_propio') return true;
    return false;
  })();

  const isDeliveryOptional = (() => {
    if (!isDeliveryAllowed) return false;
    if (workModality === 'hybrid' && deliveryType === 'ambos') return true;
    return false;
  })();

  const showDeliveryQuestion = isDeliveryOptional && wantsDelivery === null;

  const getDeliveryPayload = (deliveryId: string) => {
    const option = activeDeliveryOptions.find((delivery) => delivery.id === deliveryId) as any;
    const costUsd = Number(option?.cost) || 0;
    const validExchangeRate = Number(exchangeRate) || 0;

    if (!option || !Number.isFinite(costUsd) || costUsd < 0) return null;

    return {
      selected: option.id,
      data: {
        ...option,
        name: option.name,
        cost: costUsd,
        days: option.days || '2-3 días hábiles',
      },
      costUsd,
      costVes: validExchangeRate > 0 ? costUsd * validExchangeRate : 0,
      exchangeRate: validExchangeRate,
    };
  };

  useEffect(() => {
    if (!isDeliveryOptional) {
      setWantsDelivery(null);
    }
  }, [isDeliveryOptional, workModality, deliveryType]);

  // ============================================================
  // 🔥 TOTALES DEL BACKEND (fuente de verdad)
  // ============================================================
  // El backend calcula TODO. Solo leemos `cartQuote`.
  // ============================================================
  // 🔥 Subtotal de items (del backend, sin envío)
  const itemsTotalVES = Number(cartQuote?.totalVES || 0);
  const itemsTotalUSD = Number(cartQuote?.totalUSD || 0);

  // 🔥 SALDO A FAVOR — se descuenta del total a pagar
  const creditAvailableVES = creditBalance > 0 ? creditBalance : 0;
  const creditAppliedVES = applyCredit && creditAvailableVES > 0
    ? Math.min(creditAvailableVES, itemsTotalVES)
    : 0;
  const creditAppliedUSD = exchangeRate > 0
    ? creditAppliedVES / exchangeRate
    : 0;
  const effectiveIvaAmount = Number(cartQuote?.totalTaxVES || 0);
  const effectiveIvaPercentage = Number(cartQuote?.ivaRate || 0);
  const subtotalSinIVA = Number(cartQuote?.subtotalVES || 0);
  const showIvaDetail = effectiveIvaAmount > 0;
  const ivaLabel = effectiveIvaPercentage > 0 ? `${effectiveIvaPercentage}%` : '';
  const ivaTypeDisplay: 'included' | 'excluded' | 'exempt' | 'mixed' | 'none' =
    cartQuote?.ivaType || 'none';

  // 🔥 ENVÍO (del estado local del componente, calculado con la tasa)
  const deliveryOption = activeDeliveryOptions.find(o => o.id === selectedDelivery);
  const shippingVes = selectedDelivery && deliveryOption
    ? Number(deliveryOption.cost || 0) * exchangeRate
    : 0;
  const shippingUsd = selectedDelivery && deliveryOption
    ? Number(deliveryOption.cost || 0)
    : 0;

  // 🔥 TOTAL FINAL (items + envío - saldo a favor)
  const totalBeforeCredit = itemsTotalVES + shippingVes;
  const totalConIVA = Math.max(0, totalBeforeCredit - creditAppliedVES);
  const totalConIVAUSD = Math.max(0, itemsTotalUSD + shippingUsd - creditAppliedUSD);

  console.log('🔍 [CartPaymentStep] total del backend:', {
    totalConIVA,
    effectiveIvaAmount,
    subtotalSinIVA,
    ivaTypeDisplay,
  });

  console.log('🎯 [CartPaymentStep] DIAGNÓSTICO delivery:', {
  orderType,
  hasOnLocalDeliveryChange: typeof onLocalDeliveryChange === 'function',
  tenantSlug,
  buyerLat,
  buyerLng,
  tenantConfigExists: Boolean(tenantConfig),
  deliveryConfig,
  activeCompanies: deliveryConfig?.activeCompanies,
  hasDeliveryCompanies,
  activeDeliveryOptionsLength: activeDeliveryOptions.length,
  isDeliveryAllowed,
  isDeliveryMandatory,
  isDeliveryOptional,
  localDeliveryAvailable,
  hasShippingOption: isDeliveryAllowed,
  hasLocalOption: localDeliveryAvailable === true,
  hasAnyOption: isDeliveryAllowed || (localDeliveryAvailable === true),
});

  const getOrderTexts = () => {
    if (orderType === 'service') {
      return {
        title: 'Cita reservada con exito',
        description: 'Selecciona tu metodo de pago y confirma el pago para completar la reserva.',
        successMessage: 'Cita generada con exito. Completa el pago para confirmar tu reserva.',
        backLabel: '← Volver a los detalles de la cita',
        submitLabel: 'Confirmar Pago y Reservar',
      };
    }
    return {
      title: 'Orden generada con exito',
      description: 'Selecciona tu metodo y reporta el pago para procesarla.',
      successMessage: 'Orden generada con exito. Selecciona tu metodo y reporta el pago para procesarla.',
      backLabel: '← Volver al carrito',
      submitLabel: 'Reportar Pago y Finalizar',
    };
  };

  const orderTexts = getOrderTexts();

  const getFieldValue = (key: string): string => {
    switch (key) {
      case 'bankSource':
        return bankSource;
      case 'paymentReference':
        return paymentReference;
      case 'senderEmail':
        return senderEmail;
      case 'idNumber':
        return clientIdNumber;
      case 'clientPhone':
        return clientPhone;
      case 'accountType':
        return clientAccountType;
      default:
        return '';
    }
  };

  const setFieldValue = (key: string, value: string) => {
    switch (key) {
      case 'bankSource':
        setBankSource(value);
        break;
      case 'paymentReference':
        setPaymentReference(value);
        break;
      case 'senderEmail':
        setSenderEmail(value);
        break;
      case 'idNumber':
        setClientIdNumber(value);
        break;
      case 'clientPhone':
        setClientPhone(value);
        break;
      case 'accountType':
        setClientAccountType(value);
        break;
      default:
        break;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setProofFile(null);
      setProofPreview(null);
      setProofError(null);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setProofError('Solo se permiten imagenes (JPG, PNG, GIF, WEBP) y PDF');
      setProofFile(null);
      setProofPreview(null);
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProofError('El archivo no debe superar los 5MB');
      setProofFile(null);
      setProofPreview(null);
      e.target.value = '';
      return;
    }

    setProofError(null);
    setProofFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProofPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreview(null);
    setProofError(null);
    const input = document.getElementById('proof-upload') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const formatStorePhone = (operator: string, phone: string): string => {
    const VALID_OPERATORS = ['0412', '0414', '0416', '0422', '0424', '0426'];
    const cleanOperator = (operator || '').replace(/\D/g, '');
    const cleanPhone = (phone || '').replace(/\D/g, '');
    
    if (cleanOperator.length > 0 && cleanPhone.length > 0) {
      if (VALID_OPERATORS.includes(cleanOperator)) {
        const phoneDigits = cleanPhone.length >= 7 
          ? cleanPhone.slice(-7) 
          : cleanPhone.padStart(7, '0');
        return `${cleanOperator}-${phoneDigits}`;
      } else {
        const fullNumber = cleanOperator + cleanPhone;
        for (const validOp of VALID_OPERATORS) {
          if (fullNumber.startsWith(validOp)) {
            const remaining = fullNumber.slice(validOp.length);
            const phoneDigits = remaining.length >= 7 
              ? remaining.slice(-7) 
              : remaining.padStart(7, '0');
            return `${validOp}-${phoneDigits}`;
          }
        }
        const fullNumberClean = cleanOperator + cleanPhone;
        const phoneDigits = fullNumberClean.length >= 7 
          ? fullNumberClean.slice(-7) 
          : fullNumberClean.padStart(7, '0');
        return `0414-${phoneDigits}`;
      }
    }
    
    if (cleanPhone.length > 0) {
      if (cleanPhone.length >= 10) {
        for (const validOp of VALID_OPERATORS) {
          if (cleanPhone.startsWith(validOp)) {
            const remaining = cleanPhone.slice(validOp.length);
            const phoneDigits = remaining.length >= 7 
              ? remaining.slice(-7) 
              : remaining.padStart(7, '0');
            return `${validOp}-${phoneDigits}`;
          }
        }
      }
      if (cleanPhone.length === 7) {
        return `0414-${cleanPhone}`;
      }
      const phoneDigits = cleanPhone.length >= 7 
        ? cleanPhone.slice(-7) 
        : cleanPhone.padStart(7, '0');
      return `0414-${phoneDigits}`;
    }
    
    return 'No especificado';
  };

  const prevDeliveryRef = useRef<string | null>(null);

  useEffect(() => {
    const payload = selectedDelivery ? getDeliveryPayload(selectedDelivery) : null;
    const deliveryKey = payload
      ? `${payload.selected}:${payload.costUsd}:${payload.costVes}:${payload.exchangeRate}`
      : '';

    if (deliveryKey !== prevDeliveryRef.current) {
      prevDeliveryRef.current = deliveryKey;
      onDeliveryChange?.(
        payload || {
          selected: '',
          data: null,
          costUsd: 0,
          costVes: 0,
          exchangeRate: Number(exchangeRate) || 0,
        }
      );
    }
  }, [selectedDelivery, exchangeRate, activeDeliveryOptions, onDeliveryChange]);

  useEffect(() => {
    const values: Record<string, any> = {
      bankSource,
      paymentReference,
      senderEmail,
      idNumber: clientIdNumber,
      clientPhone: clientPhone,
      accountType: clientAccountType,
    };
    const result = validateCheckoutFields(paymentMethod, values);
    const errors = [...result.missingFields];
    setFieldErrors(errors);
  }, [paymentMethod, bankSource, paymentReference, senderEmail, clientIdNumber, clientPhone, clientAccountType]);

const isSubmitDisabled = 
  isSubmitting || 
  isUploadingProof || 
  fieldErrors.length > 0 ||
  // 🔥 Si eligió "Delivery" pero no apretó "Usar", bloquear
  (deliveryMethodChoice === 'local' && !localDeliveryActive);
  // ============================================================
  // 🔥🔥🔥 renderAmount - CORREGIDO CON ivaTypeGeneral 🔥🔥🔥
  // ============================================================
const renderAmount = () => {
  // 🔥 CALCULAR EL PRECIO EN DÓLARES CON IVA
  const totalUsd = exchangeRate > 0 ? totalConIVA / exchangeRate : 0;

  // 🔥 OBTENER EL DESCUENTO (desde el item o desde _pricing)
  const firstItem = cartItems?.[0];
  const discountPct =
    firstItem?.discountInfo?.discountPercentage ||
    firstItem?._pricing?.discountPercentage ||
    0;
  
  // 🔥 DETERMINAR EL TIPO DE IVA PARA EL DISPLAY
  const isIvaIncluded = ivaTypeDisplay === 'included' && effectiveIvaAmount > 0;
  const isIvaExcluded = ivaTypeDisplay === 'excluded' && effectiveIvaAmount > 0;
  const isIvaMixed = ivaTypeDisplay === 'mixed' && effectiveIvaAmount > 0;
  const isIvaExempt = ivaTypeDisplay === 'exempt';

  // 🔥 CASO SERVICIOS
  if (orderType === 'service') {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: resolvedTextMuted }}>
            <span className="font-bold">Monto total a pagar</span>
            {hasDiscount && (
              <span 
                className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold animate-pulse"
                style={{
                  backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
                  color: isSecondaryLight ? '#991b1b' : '#f87171',
                }}
              >
                ¡Oferta aplicada!
              </span>
            )}
            {isIvaExempt ? (
              <span className="ml-1 text-emerald-400">(Exento de IVA)</span>
            ) : isIvaMixed ? (
              <span className="ml-1 text-amber-400">(Mixto - IVA en productos seleccionados)</span>
            ) : isIvaIncluded ? (
              <span className="ml-1" style={{ color: safePrimary }}>(IVA {Math.round(effectiveIvaPercentage)}% incluido)</span>
            ) : isIvaExcluded ? (
              <span className="ml-1">(+ IVA {ivaLabel})</span>
            ) : (
              <span className="ml-1 text-slate-400">(Sin IVA)</span>
            )}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold" style={{ color: safePrimary }}>
              Bs. {formatPrice(totalConIVA)}
            </span>
            {totalUsd > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
                (${totalUsd.toFixed(2)})
              </span>
            )}
          </div>
        </div>
        {isIvaExcluded && showIvaDetail && (
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-500/10">
            <span className="text-[9px]" style={{ color: resolvedTextMuted }}>
              <span>Subtotal: Bs. {formatPrice(subtotalSinIVA)}</span>
              <span className="mx-1">+</span> IVA ({ivaLabel}): Bs. {formatPrice(effectiveIvaAmount)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 🔥 CHECKBOX: Usar saldo a favor
  const creditCheckbox = creditBalance > 0 && onApplyCreditChange ? (
    <label
      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer mt-3 transition hover:opacity-90"
      style={{
        borderColor: `${safePrimary}40`,
        backgroundColor: `${safePrimary}10`,
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(applyCredit)}
        onChange={(e) => onApplyCreditChange(e.target.checked)}
        className="w-4 h-4 cursor-pointer shrink-0"
        style={{ accentColor: safePrimary }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold block" style={{ color: resolvedTextMuted }}>
          Usar saldo a favor
        </span>
        <span className="text-[10px] opacity-70 block" style={{ color: resolvedTextMuted }}>
          Disponible: Bs. {formatPrice(creditBalance)}
        </span>
      </div>
      {applyCredit && creditAppliedVES > 0 && (
        <span className="text-xs font-bold shrink-0" style={{ color: safePrimary }}>
          − Bs. {formatPrice(creditAppliedVES)}
        </span>
      )}
    </label>
  ) : null;

  // 🔥 CASO PRODUCTOS (con IVA incluido, excluido, mixto, exento, oferta)
  return (
    <div>
      {creditCheckbox}
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: resolvedTextMuted }}>
          <span className="font-bold">{creditAppliedVES > 0 ? 'Total con saldo aplicado' : 'Monto total a pagar'}</span>
          {hasDiscount && (
            <span 
              className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold animate-pulse"
              style={{
                backgroundColor: isSecondaryLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.2)',
                color: isSecondaryLight ? '#991b1b' : '#f87171',
              }}
            >
              ¡Oferta aplicada!
            </span>
          )}
          {isIvaExempt ? (
            <span className="ml-1 text-emerald-400">(Exento de IVA)</span>
          ) : isIvaMixed ? (
            <span className="ml-1 text-amber-400">(Mixto - IVA en productos seleccionados)</span>
          ) : isIvaIncluded ? (
            <span className="ml-1" style={{ color: safePrimary }}>(IVA {Math.round(effectiveIvaPercentage)}% incluido)</span>
          ) : isIvaExcluded ? (
            <span className="ml-1">(+ IVA {ivaLabel})</span>
          ) : (
            <span className="ml-1 text-slate-400">(Sin IVA)</span>
          )}
        </span>
              <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold" style={{ color: safePrimary }}>
            Bs. {formatPrice(totalConIVA)}
          </span>
          {totalConIVAUSD > 0 && (
            <span className="text-[11px] font-semibold" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
              (${totalConIVAUSD.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {/* 🔥 LÍNEA DE ENVÍO (solo si hay envío seleccionado) */}
      {shippingVes > 0 && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-500/10">
          <span className="text-[9px]" style={{ color: resolvedTextMuted }}>
            <span className="font-bold">Envío ({activeDeliveryOptions.find(o => o.id === selectedDelivery)?.name || 'Mensajería'})</span>
          </span>
          <span className="text-[9px] font-bold" style={{ color: safePrimary }}>
            Bs. {formatPrice(shippingVes)}
            <span className="font-semibold ml-1" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
              (${shippingUsd.toFixed(2)})
            </span>
          </span>
        </div>
      )}

      {/* 🔥 SALDO A FAVOR APLICADO (si hay) */}
      {creditAppliedVES > 0 && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-500/10">
          <span className="text-[9px]" style={{ color: resolvedTextMuted }}>
            <span className="font-bold">Saldo a favor aplicado</span>
          </span>
          <span className="text-[9px] font-bold text-emerald-500">
            -Bs. {formatPrice(creditAppliedVES)}
            {creditAppliedUSD > 0 && (
              <span className="font-semibold ml-1" style={{ color: isSecondaryLight ? '#15803d' : '#4ade80' }}>
                (-${creditAppliedUSD.toFixed(2)})
              </span>
            )}
          </span>
        </div>
      )}

      {/* 🔥 DESGLOSE PARA IVA EXCLUIDO O MIXTO CON DESCUENTO */}
      {(isIvaExcluded || isIvaMixed) && showIvaDetail && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-500/10">
          <span className="text-[9px]" style={{ color: resolvedTextMuted }}>
            <span>Subtotal: Bs. {formatPrice(subtotalSinIVA)}</span>
            <span className="mx-1">+</span>
            {isIvaMixed ? (
              <span>IVA: Bs. {formatPrice(effectiveIvaAmount)}</span>
            ) : (
              <span>IVA ({ivaLabel}): Bs. {formatPrice(effectiveIvaAmount)}</span>
            )}
          </span>
        </div>
      )}
      
      {/* 🔥 DESGLOSE PARA IVA INCLUIDO CON DESCUENTO */}
      {isIvaIncluded && showIvaDetail && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-500/10">
          <span className="text-[9px]" style={{ color: resolvedTextMuted }}>
            <span>Precio base: Bs. {formatPrice(subtotalSinIVA)}</span>
            <span className="mx-1">+</span>
            <span>IVA ({Math.round(effectiveIvaPercentage)}%): Bs. {formatPrice(effectiveIvaAmount)}</span>
          </span>
        </div>
      )}
      </div>
    </div>
  );
};
  const renderField = (field: CheckoutField) => {
    const baseClass = `w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all shadow-inner ${
      isSecondaryLight 
        ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30' 
        : 'bg-white/5 border-white/10 text-white focus:border-white/30'
    }`;
    const value = getFieldValue(field.key);

    if (field.type === 'phone' || field.key === 'clientPhone') {
      return (
        <input
          key={field.key}
          type="text"
          placeholder={field.placeholder || 'Ej. 0414-1234567'}
          value={clientPhone}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setClientPhone(val);
          }}
          className={baseClass}
        />
      );
    }

    switch (field.type) {
      case 'select':
        return (
          <select
            key={field.key}
            value={value}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
            className={baseClass}
          >
            <option value="" style={optionStyle}>
              {field.placeholder || 'Selecciona...'}
            </option>
            {field.options?.map((option) => (
              <option key={option} value={option} style={optionStyle}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'email':
        return (
          <input
            key={field.key}
            type="email"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
            className={baseClass}
          />
        );

      default:
        return (
          <input
            key={field.key}
            type="text"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => {
              if (field.key === 'idNumber') {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFieldValue(field.key, val);
              } else if (field.key === 'paymentReference') {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFieldValue(field.key, val);
              } else {
                setFieldValue(field.key, e.target.value);
              }
            }}
            className={baseClass}
          />
        );
    }
  };

  const renderDeliverySection = () => {
    if (orderType === 'service') {
      return null;
    }

    if (!isDeliveryAllowed) {
      return (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
          <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-xs" style={{ color: resolvedTextMuted }}>
              <strong>Retiro en tienda</strong> — Esta tienda solo ofrece retiro en el punto fisico.
              {deliveryType === 'online' && ' (Productos digitales)'}
            </span>
          </div>
        </div>
      );
    }

    if (isDeliveryMandatory) {
      return (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
          <div className="flex items-center justify-between">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}>
              <Truck className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
              Envio por mensajeria <span className="text-rose-500 text-[10px]">*Obligatorio</span>
            </label>
            <button
              type="button"
              onClick={() => setShowDeliverySelector(!showDeliverySelector)}
              className={`text-[10px] font-bold px-3 py-1 rounded-xl border transition ${selectedDelivery ? 'border-emerald-500/30 text-emerald-500' : ''}`}
              style={{ 
                borderColor: selectedDelivery ? 'rgba(16,185,129,0.3)' : borderDynamic,
                color: selectedDelivery ? '#10b981' : (textColor || resolvedTextMain),
              }}
            >
              {selectedDelivery ? 'Cambiar' : 'Seleccionar empresa'}
            </button>
          </div>

          {showDeliverySelector && (
            <div className="grid grid-cols-2 gap-2">
              {activeDeliveryOptions.map((opt) => {
                const logoUrl = DELIVERY_LOGOS[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedDelivery(opt.id);
                      setShowDeliverySelector(false);
                      if (onDeliveryChange) {
                        const deliveryPayload = {
                          selected: opt.id,
                          data: {
                            ...opt,
                            cost: Number(opt.cost) || 0,
                            days: opt.days || '2-3 días hábiles',
                          },
                          costUsd: Number(opt.cost) || 0,
                          costVes: exchangeRate > 0 ? (Number(opt.cost) || 0) * exchangeRate : 0,
                          exchangeRate: Number(exchangeRate) || 0,
                        };
                        onDeliveryChange(deliveryPayload);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${selectedDelivery === opt.id ? 'border-2 shadow-md' : 'opacity-60 hover:opacity-100'}`}
                    style={{
                      borderColor: selectedDelivery === opt.id ? safePrimary : borderDynamic,
                      backgroundColor: selectedDelivery === opt.id ? `${safePrimary}10` : 'transparent'
                    }}
                  >
                    {logoUrl && (
                      <div className="flex justify-center mb-1.5">
                        <Image
                          src={logoUrl}
                          alt={opt.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain rounded-lg"
                          quality={80}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <span className="text-xs font-bold block" style={{ color: resolvedTextMain }}>{opt.name}</span>
                    <span className="text-[9px] opacity-60 block" style={{ color: resolvedTextMuted }}>{opt.days}</span>
                    {opt.cost === null ? (
                      <span
                        className="text-[9px] font-bold block px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(251,191,36,0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(251,191,36,0.3)',
                        }}
                      >
                        Cobro a destino
                      </span>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold" style={{ color: safePrimary }}>
                          ${Number(opt.cost || 0).toFixed(2)} USD
                        </span>
                        {exchangeRate > 0 && (
                          <span className="text-[9px] opacity-70 block" style={{ color: resolvedTextMuted }}>
                            Equivalente: Bs. {(Number(opt.cost || 0) * exchangeRate).toFixed(2)}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedDelivery && (
            <>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs" style={{ color: resolvedTextMain }}>
                  Envio con {activeDeliveryOptions.find(o => o.id === selectedDelivery)?.name} seleccionado
                </span>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: borderDynamic }}>
                <label className={`block text-[11px] font-semibold mb-1 ${resolvedTextMuted}`}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
                  Direccion de entrega <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  placeholder={addressPlaceholder || 'Direccion exacta o zona de delivery'}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all shadow-inner ${isSecondaryLight ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30' : 'bg-white/5 border-white/10 text-white focus:border-white/30'}`}
                />
                <p className={`text-[9px] mt-1 ${resolvedTextMuted}`}>
                  Ingresa la direccion exacta donde deseas recibir tu pedido
                </p>
              </div>
            </>
          )}
        </div>
      );
    }
    if (isDeliveryOptional) {
      // 🔥 Ya NO preguntamos "¿Querés envío?" porque el usuario ya eligió
      // "Encomienda" en el selector unificado.

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-[11px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}>
              <Truck className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
              Empresa de encomienda
            </label>
            <button
              type="button"
              onClick={() => setShowDeliverySelector(!showDeliverySelector)}
              className={`text-[10px] font-bold px-3 py-1 rounded-xl border transition ${selectedDelivery ? 'border-emerald-500/30 text-emerald-500' : ''}`}
              style={{
                borderColor: selectedDelivery ? 'rgba(16,185,129,0.3)' : borderDynamic,
                color: selectedDelivery ? '#10b981' : (textColor || resolvedTextMain),
              }}
            >
              {selectedDelivery ? 'Cambiar' : 'Seleccionar'}
            </button>
          </div>

          {showDeliverySelector && (
            <div className="grid grid-cols-2 gap-2">
              {activeDeliveryOptions.map((opt) => {
                const logoUrl = DELIVERY_LOGOS[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedDelivery(opt.id);
                      setShowDeliverySelector(false);
                      if (onDeliveryChange) {
                        const deliveryPayload = {
                          selected: opt.id,
                          data: {
                            ...opt,
                            cost: Number(opt.cost) || 0,
                            days: opt.days || '2-3 días hábiles',
                          },
                          costUsd: Number(opt.cost) || 0,
                          costVes: exchangeRate > 0 ? (Number(opt.cost) || 0) * exchangeRate : 0,
                          exchangeRate: Number(exchangeRate) || 0,
                        };
                        onDeliveryChange(deliveryPayload);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${selectedDelivery === opt.id ? 'border-2 shadow-md' : 'opacity-60 hover:opacity-100'}`}
                    style={{
                      borderColor: selectedDelivery === opt.id ? safePrimary : borderDynamic,
                      backgroundColor: selectedDelivery === opt.id ? `${safePrimary}10` : 'transparent',
                    }}
                  >
                    {logoUrl && (
                      <div className="flex justify-center mb-1.5">
                        <Image
                          src={logoUrl}
                          alt={opt.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain rounded-lg"
                          quality={80}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <span className="text-xs font-bold block" style={{ color: resolvedTextMain }}>{opt.name}</span>
                    <span className="text-[9px] opacity-60 block" style={{ color: resolvedTextMuted }}>{opt.days}</span>
                    {opt.cost === null ? (
                      <span
                        className="text-[9px] font-bold block px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'rgba(251,191,36,0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(251,191,36,0.3)',
                        }}
                      >
                        Cobro a destino
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: safePrimary }}>
                        ${Number(opt.cost || 0).toFixed(2)} USD
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedDelivery && (
            <>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs" style={{ color: resolvedTextMain }}>
                  {activeDeliveryOptions.find(o => o.id === selectedDelivery)?.name} seleccionado
                </span>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: borderDynamic }}>
                <label className={`block text-[11px] font-semibold mb-1 ${resolvedTextMuted}`}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
                  Dirección de entrega <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={addressPlaceholder || 'Dirección exacta o zona de delivery'}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all shadow-inner ${
                    isSecondaryLight
                      ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30'
                      : 'bg-white/5 border-white/10 text-white focus:border-white/30'
                  }`}
                />
              </div>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold text-center">
          {orderTexts.successMessage}
        </div>

        {renderAmount()}

        <h4 className={`font-black text-xs uppercase tracking-wider ${resolvedTextMain}`}>
          Metodo de Pago
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availablePaymentMethods.map(({ id, config }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentMethod(id)}
              className={`p-3 rounded-2xl border text-center font-bold text-xs transition cursor-pointer ${paymentMethod === id ? 'border-2 shadow-md' : `${isSecondaryLight ? 'border-slate-900/10' : 'border-white/10'} opacity-60`} ${resolvedTextMain}`}
              style={{ borderColor: paymentMethod === id ? safePrimary : undefined }}
            >
              {config.label}
            </button>
          ))}
        </div>

        {paymentMethod === 'pago_movil' && (
          <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
            isSecondaryLight 
              ? 'bg-slate-900/5 border-slate-900/10 text-slate-900' 
              : 'bg-white/5 border-white/10 text-white'
          }`}>
            {pagoMovilList.length > 1 && (
              <div className="space-y-1">
                <label className={`font-bold text-[10px] uppercase tracking-wider ${resolvedTextMuted}`}>
                  Selecciona la cuenta de Pago Movil:
                </label>
                <select
                  value={selectedPagoMovilIndex}
                  onChange={(e) => setSelectedPagoMovilIndex(Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all shadow-inner ${
                    isSecondaryLight 
                      ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30' 
                      : 'bg-white/5 border-white/10 text-white focus:border-white/30'
                  }`}
                >
                  {pagoMovilList.map((pm: any, idx: number) => {
                    const bankName = getBankName(pm.bank);
                    const formattedPhone = formatStorePhone(pm.operator || '', pm.phone || '');
                    const label = `Cuenta ${idx + 1}: ${bankName} - ${formattedPhone}`;
                    return (
                      <option key={idx} value={idx} style={optionStyle}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {selectedPagoMovil ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5" style={{ color: safePrimary }}>
                    <Building2 className="w-4 h-4" /> Datos bancarios del Comercio:
                  </div>
                  <button
                    type="button"
                    onClick={copyPaymentData}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition hover:opacity-80 flex items-center gap-1 cursor-pointer"
                    style={{ borderColor: safePrimary, color: safePrimary, backgroundColor: `${safePrimary}10` }}
                  >
                    Copiar Datos
                  </button>
                </div>

                <div className="space-y-1">
                  <p><b>Banco:</b> {getBankName(selectedPagoMovil.bank)}</p>
                  <p><b>Telefono del Comercio:</b> {formatStorePhone(selectedPagoMovil.operator || '', selectedPagoMovil.phone || '')}</p>
                  <p><b>RIF / Cedula del Comercio:</b> {selectedPagoMovil.idType || 'V'}-{selectedPagoMovil.idNumber || ''}</p>
                  <p className="font-bold" style={{ color: safePrimary }}>
                    <b>Monto a Pagar:</b> Bs. {formatPrice(totalConIVA)}
                  </p>
                </div>

                <div className="pt-2 border-t border-dashed flex flex-col items-center justify-center gap-2" style={{ borderColor: borderDynamic }}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}>
                    Escanea para pagar con tu app bancaria
                  </span>
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Image
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        `PAGO MOVIL\nBanco: ${selectedPagoMovil.bank}\nTelefono: ${formatStorePhone(selectedPagoMovil.operator || '', selectedPagoMovil.phone || '')}\nCedula: ${selectedPagoMovil.idType || 'V'}${selectedPagoMovil.idNumber || ''}\nMonto: ${totalConIVA.toFixed(2)}`
                      )}`}
                      alt="QR Pago Movil"
                      width={150}
                      height={150}
                      className="w-32 h-32 object-contain"
                      quality={90}
                      unoptimized
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-rose-500 py-4">
                No hay cuentas de Pago Movil configuradas. Contacta al administrador.
              </div>
            )}
          </div>
        )}

        {paymentMethod !== 'cash' && checkoutFields.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className={`font-black text-xs uppercase tracking-wider ${resolvedTextMain}`}>
              Datos de {currentMethodLabel}
            </h4>
            
            {checkoutFields.map((field) => (
              <div key={field.key}>
                <label className={`block text-[11px] font-semibold mb-1 ${resolvedTextMuted}`}>
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        {/* 🔥 MÉTODO DE ENVÍO — selector unificado */}
        {orderType !== 'service' && onLocalDeliveryChange && (
          <div className="pt-2 border-t space-y-3" style={{ borderColor: borderDynamic }}>
            <label className={`text-[11px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}>
              <Truck className="w-3.5 h-3.5 inline mr-1.5" style={{ color: safePrimary }} />
              ¿Cómo querés recibir tu pedido?
            </label>

            {/* Selector de tipo */}
            <div className="grid grid-cols-3 gap-2">
              {/* Retiro en tienda */}
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethodChoice('pickup');
                  onLocalDeliveryChange(null);
                  onDeliveryMethodChange?.(null);
                  clearShippingDelivery();
                }}
                className="p-2.5 rounded-xl border text-center transition cursor-pointer hover:opacity-90"
                style={{
                  borderColor: deliveryMethodChoice === 'pickup' ? safePrimary : borderDynamic,
                  backgroundColor: deliveryMethodChoice === 'pickup' ? `${safePrimary}10` : 'transparent',
                }}
              >
                <MapPin className="w-4 h-4 mx-auto mb-1" style={{ color: deliveryMethodChoice === 'pickup' ? safePrimary : resolvedTextMuted }} />
                <span className="text-[10px] font-bold block" style={{ color: resolvedTextMain }}>
                  Retiro
                </span>
              </button>

              {/* Delivery local */}
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethodChoice('local');
                  onDeliveryMethodChange?.('local');
                  clearShippingDelivery();
                }}
                className="p-2.5 rounded-xl border text-center transition cursor-pointer hover:opacity-90"
                style={{
                  borderColor: deliveryMethodChoice === 'local' ? safePrimary : borderDynamic,
                  backgroundColor: deliveryMethodChoice === 'local' ? `${safePrimary}10` : 'transparent',
                }}
              >
                <Truck className="w-4 h-4 mx-auto mb-1" style={{ color: deliveryMethodChoice === 'local' ? safePrimary : resolvedTextMuted }} />
                <span className="text-[10px] font-bold block" style={{ color: resolvedTextMain }}>
                  Delivery
                </span>
              </button>

              {/* Encomienda */}
              {isDeliveryAllowed && (
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethodChoice('shipping');
                    onLocalDeliveryChange(null);
                    onDeliveryMethodChange?.('shipping');
                  }}
                  className="p-2.5 rounded-xl border text-center transition cursor-pointer hover:opacity-90"
                  style={{
                    borderColor: deliveryMethodChoice === 'shipping' ? safePrimary : borderDynamic,
                    backgroundColor: deliveryMethodChoice === 'shipping' ? `${safePrimary}10` : 'transparent',
                  }}
                >
                  <Package className="w-4 h-4 mx-auto mb-1" style={{ color: deliveryMethodChoice === 'shipping' ? safePrimary : resolvedTextMuted }} />
                  <span className="text-[10px] font-bold block" style={{ color: resolvedTextMain }}>
                    Encomienda
                  </span>
                </button>
              )}
            </div>

            {/* Bloque desplegable según elección */}
            {deliveryMethodChoice === 'local' && (
              <LocalDeliveryBlock
                tenantSlug={tenantSlug}
                buyerLat={buyerLat}
                buyerLng={buyerLng}
                orderSubtotal={subtotalWithIva || 0}
onChange={(sel) => {
  setLocalDeliveryActive(Boolean(sel?.enabled));
  onLocalDeliveryChange?.(sel);
}}                onRequestLocation={onRequestLocation}
                onAvailabilityChange={setLocalDeliveryAvailable}
                safePrimary={safePrimary}
                resolvedTextMain={resolvedTextMain}
                resolvedTextMuted={resolvedTextMuted}
                borderDynamic={borderDynamic}
                isSecondaryLight={isSecondaryLight}
              />
            )}

            {deliveryMethodChoice === 'shipping' && isDeliveryAllowed && (
              <div>
                {renderDeliverySection()}
              </div>
            )}

            {deliveryMethodChoice === 'pickup' && (
              <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs" style={{ color: resolvedTextMuted }}>
                  Retirás tu pedido en el local.
                </span>
              </div>
            )}
          </div>
        )}

        {requiresProof && (
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: borderDynamic }}>
            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${resolvedTextMuted}`}>
                Comprobante de pago <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploadingProof}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs border outline-none transition-all ${isSecondaryLight ? 'bg-slate-900/5 border-slate-900/10 text-slate-900' : 'bg-white/5 border-white/10 text-white'} ${isUploadingProof ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                />
                
                {proofError && (
                  <p className="text-rose-500 text-[10px] font-medium">{proofError}</p>
                )}

                {proofPreview && (
                  <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: borderDynamic }}>
                    <Image
                      src={proofPreview}
                      alt="Comprobante"
                      width={400}
                      height={160}
                      className="max-h-40 w-full object-contain"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {proofFile && !proofPreview && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: resolvedTextMain }}>{proofFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {proofFile && (
                  <button
                    type="button"
                    onClick={onUploadProof}
                    disabled={isUploadingProof}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 ${isUploadingProof ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    style={{ backgroundColor: safePrimary }}
                  >
                    {isUploadingProof ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Subiendo comprobante...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir comprobante
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'cash' && (() => {
          // 🔥 Cálculo en tiempo real del vuelto/faltante
          // 🔥 En servicios no hay items → totalConIVA = 0. Usar finalVes como fallback.
          const totalVes = totalConIVA > 0 ? totalConIVA : (finalVes || 0);
          const totalUsd = exchangeRate > 0 ? totalVes / exchangeRate : 0;

          const paidEquivalentVes =
            cashCurrency === 'USD'
              ? cashAmount * (exchangeRate > 0 ? exchangeRate : 0)
              : cashAmount;

          const diffVes = paidEquivalentVes - totalVes;
          const changeVes = diffVes > 0 ? diffVes : 0;
          const missingVes = diffVes < 0 ? Math.abs(diffVes) : 0;

          return (
            <div
              className="space-y-3 pt-3 border-t"
              style={{ borderColor: borderDynamic }}
            >
              <div className="flex items-center justify-between">
                <label
                  className={`text-[11px] font-bold uppercase tracking-wider ${resolvedTextMain}`}
                >
                  Pago en Efectivo
                </label>
              </div>

              {/* Selector VES / USD */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${resolvedTextMuted}`}
                >
                  Moneda
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['VES', 'USD'] as const).map((cur) => {
                    const active = cashCurrency === cur;
                    return (
                      <button
                        key={cur}
                        type="button"
                        onClick={() =>
                          onCashCurrencyChange && onCashCurrencyChange(cur)
                        }
                        className={`py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                          active ? 'shadow-md' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          borderColor: active ? safePrimary : borderDynamic,
                          backgroundColor: active
                            ? `${safePrimary}15`
                            : 'transparent',
                          color: active ? safePrimary : resolvedTextMain,
                        }}
                      >
                        {cur === 'VES' ? 'Bolívares (Bs.)' : 'Dólares (USD)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input del monto */}
              <div>
                <label
                  className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${resolvedTextMuted}`}
                >
                  ¿Con cuánto pagas?
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashAmountInput}
                      onChange={(e) => handleCashAmountChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder={cashCurrency === 'VES' ? '0,00' : '0.00'}
                      className={`w-full px-3.5 py-2.5 rounded-2xl text-sm border outline-none transition-all shadow-inner ${
                        isSecondaryLight
                          ? 'bg-slate-900/5 border-slate-900/10 text-slate-900 focus:border-slate-900/30'
                          : 'bg-white/5 border-white/10 text-white focus:border-white/30'
                      }`}
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                      style={{ color: resolvedTextMuted }}
                    >
                      {cashCurrency === 'VES' ? 'Bs.' : 'USD'}
                    </span>
                  </div>

                  {/* 🔥 BOTÓN MONTO EXACTO */}
                  <button
                    type="button"
                    onClick={() => {
                      // Total exacto en la moneda elegida
                      const exactAmount = cashCurrency === 'USD'
                        ? totalUsd
                        : totalVes;
                      const formatted = exactAmount.toFixed(cashCurrency === 'USD' ? 2 : 2);
                      setCashAmountInput(cashCurrency === 'USD' ? formatted : formatted.replace('.', ','));
                      onCashAmountChange &&
                        onCashAmountChange(Math.round(exactAmount * 100) / 100);
                    }}
                    className="px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition cursor-pointer hover:opacity-90 active:scale-95 whitespace-nowrap"
                    style={{
                      backgroundColor: `${safePrimary}15`,
                      borderColor: safePrimary,
                      color: safePrimary,
                    }}
                    title="Pagar con el monto exacto"
                  >
                    Exacto
                  </button>
                </div>
              </div>

              {/* Resumen del pago */}
              <div
                className="p-3 rounded-xl border space-y-1"
                style={{
                  borderColor: borderDynamic,
                  backgroundColor: isSecondaryLight
                    ? 'rgba(0,0,0,0.02)'
                    : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: resolvedTextMuted }}>
                    Total a pagar
                  </span>
                  <span className="font-bold" style={{ color: resolvedTextMain }}>
                    Bs. {formatPrice(totalVes)}
                    {totalUsd > 0 && (
                      <span
                        className="ml-1 text-[10px] font-semibold"
                        style={{
                          color: isSecondaryLight ? '#15803d' : '#4ade80',
                        }}
                      >
                        (${totalUsd.toFixed(2)})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: resolvedTextMuted }}>
                    Entregas
                  </span>
                  <span className="font-bold" style={{ color: resolvedTextMain }}>
                    {cashCurrency === 'VES'
                      ? `Bs. ${formatPrice(cashAmount)}`
                      : `$${cashAmount.toFixed(2)}`}
                  </span>
                </div>

                {changeVes > 0 && (
                  <div
                    className="flex items-center justify-between text-[11px] pt-1 border-t"
                    style={{ borderColor: borderDynamic }}
                  >
                    <span
                      className="font-bold"
                      style={{
                        color: isSecondaryLight ? '#15803d' : '#4ade80',
                      }}
                    >
                      Vuelto estimado
                    </span>
                    <span
                      className="font-black"
                      style={{
                        color: isSecondaryLight ? '#15803d' : '#4ade80',
                      }}
                    >
                      Bs. {formatPrice(changeVes)}
                      {cashCurrency === 'USD' && exchangeRate > 0 && (
                        <span className="ml-1 text-[10px] font-semibold">
                          (${(changeVes / exchangeRate).toFixed(2)})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {missingVes > 0 && (
                  <div
                    className="flex items-center justify-between text-[11px] pt-1 border-t"
                    style={{ borderColor: borderDynamic }}
                  >
                    <span
                      className="font-bold"
                      style={{
                        color: isSecondaryLight ? '#b45309' : '#fbbf24',
                      }}
                    >
                      Falta por pagar
                    </span>
                    <span
                      className="font-black"
                      style={{
                        color: isSecondaryLight ? '#b45309' : '#fbbf24',
                      }}
                    >
                      Bs. {formatPrice(missingVes)}
                    </span>
                  </div>
                )}
              </div>

              {/* 🔥 ¿Qué hacer con el vuelto? */}
              {changeVes > 0 && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: borderDynamic }}>
                  <label
                    className={`block text-[10px] font-bold uppercase tracking-wider ${resolvedTextMuted}`}
                  >
                    ¿Qué hago con tu vuelto de Bs. {formatPrice(changeVes)}?
                  </label>
                  <div className="space-y-1.5">
                    <label
                      className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border transition"
                      style={{
                        borderColor: changeResolution === 'credit' ? safePrimary : borderDynamic,
                        backgroundColor: changeResolution === 'credit' ? `${safePrimary}08` : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="changeResolution"
                        value="credit"
                        checked={changeResolution === 'credit'}
                        onChange={() => {
                          setChangeResolution('credit');
                          onChangeResolution?.('credit');
                        }}
                        className="mt-0.5 cursor-pointer"
                        style={{ accentColor: safePrimary }}
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold block" style={{ color: resolvedTextMain }}>
                          Dejarlo como saldo a favor
                        </span>
                        <span className="text-[9px] block opacity-70" style={{ color: resolvedTextMuted }}>
                          Se acredita a tu cuenta para tu próxima compra
                        </span>
                      </div>
                    </label>

                    <label
                      className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border transition"
                      style={{
                        borderColor: changeResolution === 'pending' ? safePrimary : borderDynamic,
                        backgroundColor: changeResolution === 'pending' ? `${safePrimary}08` : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="changeResolution"
                        value="pending"
                        checked={changeResolution === 'pending'}
                        onChange={() => {
                          setChangeResolution('pending');
                          onChangeResolution?.('pending');
                        }}
                        className="mt-0.5 cursor-pointer"
                        style={{ accentColor: safePrimary }}
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold block" style={{ color: resolvedTextMain }}>
                          Recibirlo en efectivo
                        </span>
                        <span className="text-[9px] block opacity-70" style={{ color: resolvedTextMuted }}>
                          La tienda te lo dará al confirmar tu pedido
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* 🔥 NUEVO: método de entrega del vuelto (solo si eligió "recibirlo") */}
                  {changeResolution === 'pending' && (
                    <div
                      className="mt-2 p-2 rounded-lg border space-y-2"
                      style={{ borderColor: borderDynamic, backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: resolvedTextMuted }}>
                        ¿Cómo querés recibirlo?
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { value: 'cash_ves', label: 'Efectivo' },
                          { value: 'pago_movil', label: 'Pago Móvil' },
                          { value: 'other', label: 'Otro' },
                        ] as const).map((opt) => {
                          const active = changeDeliveryMethod === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setChangeDeliveryMethod(opt.value);
                                onChangeDeliveryPreference?.({
                                  method: opt.value,
                                  pagoMovilData: opt.value === 'pago_movil'
                                    ? {
                                        bank: changePmBank.trim(),
                                        phone: changePmPhone.trim(),
                                        clientIdType: changePmIdType,
                                        clientIdNumber: changePmIdNumber.trim(),
                                      }
                                    : undefined,
                                });
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer"
                              style={{
                                borderColor: active ? safePrimary : borderDynamic,
                                backgroundColor: active ? `${safePrimary}15` : 'transparent',
                                color: active ? safePrimary : resolvedTextMain,
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Campos de Pago Móvil */}
                      {changeDeliveryMethod === 'pago_movil' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* 🔥 Checkbox autocompletar con datos del perfil */}
                          {buyerProfileData?.idNumber && buyerProfileData?.phone && (
                            <div className="col-span-2 flex items-center gap-2 pb-1">
                              <input
                                type="checkbox"
                                id="change-pm-use-profile"
                                checked={
                                  changePmIdNumber === (buyerProfileData.idNumber || '') &&
                                  changePmPhone === (buyerProfileData.phone || '')
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const idNum = buyerProfileData.idNumber || '';
                                    const idTyp = buyerProfileData.idType || 'V';
                                    const ph = buyerProfileData.phone || '';
                                    setChangePmIdNumber(idNum);
                                    setChangePmIdType(idTyp);
                                    setChangePmPhone(ph);
                                    onChangeDeliveryPreference?.({
                                      method: 'pago_movil',
                                      pagoMovilData: {
                                        bank: changePmBank.trim(),
                                        phone: ph,
                                        clientIdType: idTyp,
                                        clientIdNumber: idNum,
                                      },
                                    });
                                  } else {
                                    setChangePmIdNumber('');
                                    setChangePmPhone('');
                                    onChangeDeliveryPreference?.({
                                      method: 'pago_movil',
                                      pagoMovilData: {
                                        bank: changePmBank.trim(),
                                        phone: '',
                                        clientIdType: changePmIdType,
                                        clientIdNumber: '',
                                      },
                                    });
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded cursor-pointer"
                                style={{ accentColor: safePrimary }}
                              />
                              <label
                                htmlFor="change-pm-use-profile"
                                className="text-[10px] font-medium cursor-pointer"
                                style={{ color: resolvedTextMuted }}
                              >
                                Usar mis datos de perfil (cédula y teléfono)
                              </label>
                            </div>
                          )}
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: resolvedTextMuted }}>
                              Banco
                            </label>
                            <SearchableDropdown
                              value={changePmBank}
                              onChange={(val) => {
                                setChangePmBank(val);
                                onChangeDeliveryPreference?.({
                                  method: 'pago_movil',
                                  pagoMovilData: {
                                    bank: val,
                                    phone: changePmPhone.trim(),
                                    clientIdType: changePmIdType,
                                    clientIdNumber: changePmIdNumber.trim(),
                                  },
                                });
                              }}
                              options={BANK_LIST.map((bank) => ({
                                value: bank.code,
                                label: getBankLabel(bank.code),
                              }))}
                              placeholder="Seleccionar banco"
                              searchPlaceholder="Buscar banco..."
                              emptyMessage="No hay bancos"
                              primary={safePrimary}
                              textColor={isSecondaryLight ? '#0f172a' : '#ffffff'}
                              isDarkBg={!isSecondaryLight}
                              borderColor={borderDynamic}
                              searchable={true}
                              footerLabel={(n) => `${n} bancos`}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: resolvedTextMuted }}>
                              Teléfono
                            </label>
                            <input
                              type="tel"
                              value={changePmPhone}
                              onChange={(e) => {
                                setChangePmPhone(e.target.value);
                                onChangeDeliveryPreference?.({
                                  method: 'pago_movil',
                                  pagoMovilData: {
                                    bank: changePmBank.trim(),
                                    phone: e.target.value.trim(),
                                    clientIdType: changePmIdType,
                                    clientIdNumber: changePmIdNumber.trim(),
                                  },
                                });
                              }}
                              placeholder="04141234567"
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none ${isSecondaryLight ? 'bg-slate-900/5 border-slate-900/10 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                              style={{ borderColor: borderDynamic }}
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1" style={{ color: resolvedTextMuted }}>
                              Cédula / RIF
                            </label>
                            <div className="flex gap-1">
                              <div className="w-[80px]">
                                <SearchableDropdown
                                  value={changePmIdType}
                                  onChange={(val) => {
                                    const v = val as 'V' | 'E' | 'J' | 'G' | 'P';
                                    setChangePmIdType(v);
                                    onChangeDeliveryPreference?.({
                                      method: 'pago_movil',
                                      pagoMovilData: {
                                        bank: changePmBank.trim(),
                                        phone: changePmPhone.trim(),
                                        clientIdType: v,
                                        clientIdNumber: changePmIdNumber.trim(),
                                      },
                                    });
                                  }}
                                  options={[
                                    { value: 'V', label: 'V' },
                                    { value: 'E', label: 'E' },
                                    { value: 'J', label: 'J' },
                                    { value: 'G', label: 'G' },
                                    { value: 'P', label: 'P' },
                                  ]}
                                  placeholder="V"
                                  primary={safePrimary}
                                  textColor={isSecondaryLight ? '#0f172a' : '#ffffff'}
                                  isDarkBg={!isSecondaryLight}
                                  borderColor={borderDynamic}
                                  searchable={false}
                                />
                              </div>
                              <input
                                type="text"
                                value={changePmIdNumber}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setChangePmIdNumber(val);
                                  onChangeDeliveryPreference?.({
                                    method: 'pago_movil',
                                    pagoMovilData: {
                                      bank: changePmBank.trim(),
                                      phone: changePmPhone.trim(),
                                      clientIdType: changePmIdType,
                                      clientIdNumber: val.trim(),
                                    },
                                  });
                                }}
                                placeholder="12345678"
                                className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${isSecondaryLight ? 'bg-slate-900/5 border-slate-900/10 text-slate-900' : 'bg-white/5 border-white/10 text-white'}`}
                                style={{ borderColor: borderDynamic }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className={`text-[10px] italic ${resolvedTextMuted}`}>
                El pago en efectivo se procesará al retirar o recibir el
                pedido en el local.
              </p>
            </div>
          );
        })()}

        {fieldErrors.length > 0 && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-medium">
            Campos requeridos: {fieldErrors.join(', ')}
          </div>
        )}
      </div>

      <div 
        className="p-6 border-t space-y-2"
        style={{ 
          borderColor: borderDynamic, 
          backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' 
        }}
      >
        {availablePaymentMethods.length > 1 && onOpenMixedPayment && (
          <div
            className="p-3 rounded-xl border text-center"
            style={{
              borderColor: borderDynamic,
              backgroundColor: isSecondaryLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <p className={`text-[11px] mb-2 ${resolvedTextMuted}`}>
              ¿Necesitas dividir el pago entre varios métodos?
            </p>
            <button
              type="button"
              onClick={onOpenMixedPayment}
              className="text-[11px] font-bold underline transition hover:opacity-80 cursor-pointer"
              style={{ color: safePrimary }}
            >
              Pagar con pago mixto
            </button>
          </div>
        )}

<button
  onClick={onSubmit}
  disabled={isSubmitDisabled}
  style={{ backgroundColor: isSubmitDisabled ? '#64748b' : safePrimary }}
  className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${isPrimaryLight ? 'text-slate-950' : 'text-slate-100'} ${isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95 cursor-pointer'}`}
>
  <CheckCircle2 className="w-4 h-4" />
  {isSubmitting ? 'Enviando...' : orderTexts.submitLabel}
</button>

{/* 🔥 Mensaje: si eligió delivery local pero no activó */}
{deliveryMethodChoice === 'local' && !localDeliveryActive && (
  <p className="text-center text-[10px] font-medium text-amber-500">
    ⚠️ Apretá "Usar" en el bloque de Delivery local para continuar
  </p>
)}

{fieldErrors.length > 0 && (
  <p className={`text-center text-[10px] font-medium ${resolvedTextMuted}`}>
    Completa todos los campos requeridos para continuar
  </p>
)}

        <button
          onClick={onBack}
          className={`w-full py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${isSecondaryLight ? 'text-slate-600 hover:bg-slate-900/5' : 'text-slate-300 hover:bg-white/10'}`}
        >
          {orderTexts.backLabel}
        </button>
      </div>
    </div>
  );
}