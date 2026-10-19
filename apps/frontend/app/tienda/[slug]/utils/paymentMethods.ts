// frontend/app/tienda/[slug]/utils/paymentMethods.ts

import { BANK_LIST, getBankLabel } from '@/lib/venezuelanBanks';

/**
 * Tipos de métodos de pago soportados
 */
export type PaymentMethodType = 
  | 'cash' 
  | 'pago_movil' 
  | 'zelle' 
  | 'pos' 
  | 'biopago' 
  | 'binance';

/**
 * Mapeo de etiquetas en español para métodos de pago
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Efectivo',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  pos: 'Punto de Venta',
  biopago: 'Biopago',
  binance: 'Binance Pay',
};

/**
 * Configuración de cada método de pago
 */
export interface PaymentMethodConfig {
  id: PaymentMethodType;
  label: string;
  description: string;
  icon?: React.ReactNode;
  requiredConfigFields: string[];
  checkoutFields: CheckoutField[];
  requiresConfiguration: boolean;
  alwaysAvailable: boolean;
}

export interface CheckoutField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'email' | 'phone';
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export const PAYMENT_METHODS_CONFIG: Record<PaymentMethodType, PaymentMethodConfig> = {
  cash: {
    id: 'cash',
    label: 'Efectivo',
    description: 'Pago en físico al recibir o retirar el pedido',
    requiredConfigFields: [],
    checkoutFields: [],
    requiresConfiguration: false,
    alwaysAvailable: true,
  },
  pago_movil: {
    id: 'pago_movil',
    label: 'Pago Móvil',
    description: 'Transferencias bancarias inmediatas (VES)',
    requiredConfigFields: ['bank', 'phone', 'idType', 'idNumber'],
    checkoutFields: [
  // 🔥 CÉDULA - SOLO NÚMEROS, ENTRE 6 Y 10 DÍGITOS
    {
      key: 'idNumber',
      label: 'Número de Cédula',
      type: 'text',
      placeholder: 'Ej. 18714469',
      required: true,
      minLength: 6,
      maxLength: 10,
      pattern: '^[0-9]{6,10}$',
      help: 'Ingresa tu número de cédula (6-10 dígitos)'
    },

        // 🔥 TELÉFONO DEL COMPRADOR - NUEVO
    {
      key: 'clientPhone',
      label: 'Teléfono Afiliado',
      type: 'phone',
      placeholder: 'Ej. 04141234567',
      required: true,
      help: 'El teléfono registrado en tu banco para PagoMóvil'
    },
      {
        key: 'bankSource',
        label: 'Banco Emisor',
        type: 'select',
        placeholder: 'Selecciona tu banco',
        required: true,
        options: BANK_LIST.map((b) => getBankLabel(b.code)),
      },
    // 🔥 REFERENCIA - EXACTAMENTE 4 DÍGITOS
    {
      key: 'paymentReference',
      label: 'Últimos 4 dígitos de referencia',
      type: 'text',
      placeholder: 'Ej. 1234',
      required: true,
      minLength: 4,
      maxLength: 4,
      pattern: '^[0-9]{4}$',
      help: 'Ingresa solo los últimos 4 números de la transacción'
    },
  ],
    requiresConfiguration: true,
    alwaysAvailable: false,
  },
  zelle: {
    id: 'zelle',
    label: 'Zelle',
    description: 'Pagos internacionales en USD',
    requiredConfigFields: ['email', 'holderName'],
    checkoutFields: [
      {
        key: 'senderEmail',
        label: 'Correo del Remitente',
        type: 'email',
        placeholder: 'tucorreo@ejemplo.com',
        required: true,
      },
      {
        key: 'paymentReference',
        label: 'Número de Referencia',
        type: 'text',
        placeholder: 'ID de la transacción Zelle',
        required: true,
      },
    ],
    requiresConfiguration: true,
    alwaysAvailable: false,
  },
  pos: {
    id: 'pos',
    label: 'Punto de Venta',
    description: 'Pago con tarjeta de débito o crédito',
    requiredConfigFields: [],
    checkoutFields: [
      {
        key: 'idNumber',
        label: 'Número de Cédula',
        type: 'text',
        placeholder: 'Ej. 18714469',
        required: true,
      },
      {
        key: 'accountType',
        label: 'Tipo de Cuenta',
        type: 'select',
        placeholder: 'Selecciona...',
        required: true,
        options: ['Corriente', 'Ahorro'],
      },
    ],
    requiresConfiguration: false,
    alwaysAvailable: false,
  },
  biopago: {
    id: 'biopago',
    label: 'Biopago',
    description: 'Pago biométrico con huella',
    requiredConfigFields: [],
    checkoutFields: [
      {
        key: 'idNumber',
        label: 'Número de Cédula',
        type: 'text',
        placeholder: 'Ej. 18714469',
        required: true,
      },
      {
        key: 'bankSource',
        label: 'Banco',
        type: 'select',
        placeholder: 'Selecciona tu banco',
        required: true,
        options: BANK_LIST.map((b) => getBankLabel(b.code)),
      },
    ],
    requiresConfiguration: false,
    alwaysAvailable: false,
  },
  binance: {
    id: 'binance',
    label: 'Binance Pay',
    description: 'Pagos con criptomonedas (USDT)',
    requiredConfigFields: ['payId', 'email'],
    checkoutFields: [
      {
        key: 'paymentReference',
        label: 'ID de Transacción',
        type: 'text',
        placeholder: 'ID de la transferencia USDT',
        required: true,
      },
    ],
    requiresConfiguration: true,
    alwaysAvailable: false,
  },
};

export function getPaymentMethodLabel(methodId: PaymentMethodType): string {
  return PAYMENT_METHOD_LABELS[methodId] || methodId;
}

export function getPaymentMethodConfig(methodId: PaymentMethodType): PaymentMethodConfig | undefined {
  return PAYMENT_METHODS_CONFIG[methodId];
}

export function isPaymentMethodConfigured(
  methodId: PaymentMethodType,
  config: any
): boolean {
  const method = PAYMENT_METHODS_CONFIG[methodId];
  if (!method) return false;
  
  if (!method.requiresConfiguration) return true;
  
  // 🔥 CASO ESPECIAL: Pago Móvil (busca en pagoMovilList)
  if (methodId === 'pago_movil') {
    const pagoMovilList = config?.paymentMethods?.pagoMovilList || [];
    return pagoMovilList.some((pm: any) => {
      return pm.bank && pm.phone && pm.idNumber && 
             pm.bank.trim() !== '' && pm.phone.trim() !== '' && pm.idNumber.trim() !== '';
    });
  }
  
  // 🔥 CASO ESPECIAL: Zelle
  if (methodId === 'zelle') {
    const zelle = config?.paymentMethods?.zelle;
    return zelle && zelle.email && zelle.email.trim() !== '';
  }
  
  // 🔥 CASO ESPECIAL: Binance
  if (methodId === 'binance') {
    const binance = config?.paymentMethods?.binance;
    return binance && binance.payId && binance.payId.trim() !== '';
  }
  
  // Otros métodos
  const methodConfig = config?.paymentMethods?.[methodId];
  if (!methodConfig) return false;
  
  return method.requiredConfigFields.every((field) => {
    const value = methodConfig[field];
    return value && value.toString().trim() !== '';
  });
}

export function getAvailablePaymentMethods(
  activeMethods: string[],
  config: any
): Array<{ id: PaymentMethodType; config: PaymentMethodConfig }> {
  const result: Array<{ id: PaymentMethodType; config: PaymentMethodConfig }> = [];
  
  const methodsToCheck = activeMethods && activeMethods.length > 0
    ? activeMethods
    : ['cash'];
  
  methodsToCheck.forEach((methodId) => {
    const id = methodId as PaymentMethodType;
    const method = PAYMENT_METHODS_CONFIG[id];
    if (!method) return;
    
    if (method.requiresConfiguration && !isPaymentMethodConfigured(id, config)) {
      return;
    }
    
    result.push({ id, config: method });
  });
  
  return result;
}

export function getCheckoutFields(methodId: PaymentMethodType): CheckoutField[] {
  const method = PAYMENT_METHODS_CONFIG[methodId];
  return method?.checkoutFields || [];
}

export function validateCheckoutFields(
  methodId: PaymentMethodType,
  values: Record<string, any>
): { valid: boolean; missingFields: string[] } {
  const fields = getCheckoutFields(methodId);
  const missingFields: string[] = [];
  
  fields.forEach((field) => {
    if (field.required) {
      const value = values[field.key];
      if (!value || value.toString().trim() === '') {
        missingFields.push(field.label);
      }
    }
  });
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function hasAnyPaymentMethodAvailable(activeMethods: string[], config: any): boolean {
  const available = getAvailablePaymentMethods(activeMethods, config);
  return available.length > 0;
}

export function getDefaultPaymentMethod(activeMethods: string[], config: any): PaymentMethodType | null {
  const available = getAvailablePaymentMethods(activeMethods, config);
  return available.length > 0 ? available[0].id : null;
}