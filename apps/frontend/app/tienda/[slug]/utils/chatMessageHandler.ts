// frontend/app/tienda/[slug]/utils/chatMessageHandler.ts

/**
 * MANEJADOR DE MENSAJES AUTOMÁTICOS PARA EL CHAT
 * 
 * Este archivo maneja todos los mensajes automáticos que se envían
 * desde el carrito de compras al chat de la tienda.
 * 
 * ESCENARIOS CUBIERTOS:
 * 1. Pago Movil - Envia instrucciones completas con QR y datos bancarios
 * 2. Zelle - Envia instrucciones de pago
 * 3. Binance Pay - Envia instrucciones de pago
 * 4. PayPal - Envia instrucciones de pago
 * 5. Efectivo - Mensaje de confirmacion con total a pagar en tienda
 * 6. POS / Punto de Venta - Mensaje de confirmacion con total a pagar en tienda
 * 7. Biopago - Mensaje de confirmacion con total a pagar en tienda
 * 8. Pago reportado - Confirmacion con todos los detalles
 * 9. Orden completada - Mensaje de agradecimiento con resumen
 * 10. Orden cancelada - Mensaje de cancelacion
 */

// ============================================================
// IMPORTS
// ============================================================

import {
  PHONE_OPERATORS,
  ID_TYPES,
} from '../../../onboarding/components/step-contact-account/paymentConstants';
import { getBankName } from '@/lib/venezuelanBanks';

// ============================================================
// UTILIDADES DE URL
// ============================================================

const getApiBase = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  const apiHost = window.location.hostname;
  const dynamicBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${apiHost}:3000`;
  const cleanBase = dynamicBase.endsWith('/') ? dynamicBase.slice(0, -1) : dynamicBase;
  return cleanBase;
};

const getApiUrl = (endpoint: string): string => {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};

// ============================================================
// TIPOS
// ============================================================

export type PaymentMethodType = 
  | 'pago_movil' 
  | 'pagomovil' 
  | 'zelle' 
  | 'binance' 
  | 'paypal' 
  | 'efectivo' 
  | 'cash' 
  | 'pos' 
  | 'punto_venta' 
  | 'biopago'
  | 'transferencia_bancaria'
  | 'transferencia';

export interface ProductItem {
  name: string;
  quantity: number;
  priceVes: number;
  priceUsd: number;
  ivaType?: 'included' | 'excluded' | 'exempt';
  ivaRate?: number;
  subtotalVes?: number;
  subtotalUsd?: number;
  totalWithIvaVes?: number;
}

export interface OrderTotals {
  subtotalVes: number;
  subtotalUsd: number;
  ivaVes: number;
  ivaUsd: number;
  totalVes: number;
  totalUsd: number;
  ivaType: 'included' | 'excluded' | 'exempt' | 'mixed';
  ivaRate: number;
  items: ProductItem[];
  exchangeRate: number;
}

export interface ChatMessageHandlerProps {
  orderId: string;
  tenantId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  bankSource?: string;
  totalAmount: number;
  totalAmountVes: number;
  items?: ProductItem[];
  exchangeRate?: number;
  paymentConfig?: {
    pagoMovil?: any;
    zelle?: any;
    binance?: any;
    paypal?: any;
  };
  conversationId?: string;
  token?: string;
  isService?: boolean;
  serviceName?: string;
  serviceDate?: string;
  serviceTime?: string;
}

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

const formatPriceVes = (num: number): string => {
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPriceUsd = (num: number): string => {
  if (isNaN(num) || num === 0) return '0.00';
  return num.toFixed(2);
};



const getOperatorName = (code: string): string => {
  if (!code) return '';
  const operator = PHONE_OPERATORS.find(o => o.code === code);
  return operator ? `${operator.code} ` : '';
};

const getPaymentMethodLabel = (method: PaymentMethodType): string => {
  const labels: Record<PaymentMethodType, string> = {
    pago_movil: 'Pago Movil',
    pagomovil: 'Pago Movil',
    zelle: 'Zelle',
    binance: 'Binance Pay',
    paypal: 'PayPal',
    efectivo: 'Efectivo',
    cash: 'Efectivo',
    pos: 'Punto de Venta',
    punto_venta: 'Punto de Venta',
    biopago: 'Biopago',
    transferencia_bancaria: 'Transferencia Bancaria',
    transferencia: 'Transferencia Bancaria',
  };
  return labels[method] || method;
};

// ============================================================
// CALCULAR TOTALES CON IVA
// ============================================================

function calculateTotals(items: ProductItem[], exchangeRate: number): OrderTotals {
  let subtotalVes = 0;
  let subtotalUsd = 0;
  let ivaVes = 0;
  let ivaUsd = 0;
  let totalVes = 0;
  let totalUsd = 0;
  let hasIncluded = false;
  let hasExcluded = false;
  let hasExempt = false;
  let maxIvaRate = 0;
  const processedItems: ProductItem[] = [];

  (items || []).forEach((item) => {
    const quantity = Number(item.quantity || 1);
    const priceVes = Number(item.priceVes || 0);
    const priceUsd = Number(item.priceUsd || 0);
    const ivaType = item.ivaType || 'excluded';
    const ivaRate = Number(item.ivaRate || 16);

    let itemSubtotalVes = priceVes * quantity;
    let itemSubtotalUsd = priceUsd * quantity;
    let itemIvaVes = 0;
    let itemIvaUsd = 0;
    let itemTotalVes = itemSubtotalVes;
    let itemTotalUsd = itemSubtotalUsd;

    if (ivaType === 'included') {
      itemIvaVes = itemSubtotalVes - (itemSubtotalVes / (1 + ivaRate / 100));
      itemIvaUsd = itemSubtotalUsd - (itemSubtotalUsd / (1 + ivaRate / 100));
      itemTotalVes = itemSubtotalVes;
      itemTotalUsd = itemSubtotalUsd;
      hasIncluded = true;
    } else if (ivaType === 'excluded') {
      itemIvaVes = itemSubtotalVes * (ivaRate / 100);
      itemIvaUsd = itemSubtotalUsd * (ivaRate / 100);
      itemTotalVes = itemSubtotalVes + itemIvaVes;
      itemTotalUsd = itemSubtotalUsd + itemIvaUsd;
      hasExcluded = true;
    } else {
      hasExempt = true;
    }

    if (ivaRate > maxIvaRate) maxIvaRate = ivaRate;

    subtotalVes += itemSubtotalVes;
    subtotalUsd += itemSubtotalUsd;
    ivaVes += itemIvaVes;
    ivaUsd += itemIvaUsd;
    totalVes += itemTotalVes;
    totalUsd += itemTotalUsd;

    processedItems.push({
      ...item,
      quantity,
      subtotalVes: Math.round(itemSubtotalVes * 100) / 100,
      subtotalUsd: Math.round(itemSubtotalUsd * 100) / 100,
      totalWithIvaVes: Math.round(itemTotalVes * 100) / 100,
    });
  });

  // Determinar tipo de IVA
  let ivaType: 'included' | 'excluded' | 'exempt' | 'mixed' = 'excluded';
  if (hasIncluded && hasExcluded) ivaType = 'mixed';
  else if (hasIncluded) ivaType = 'included';
  else if (hasExcluded) ivaType = 'excluded';
  else if (hasExempt) ivaType = 'exempt';

  return {
    subtotalVes: Math.round(subtotalVes * 100) / 100,
    subtotalUsd: Math.round(subtotalUsd * 100) / 100,
    ivaVes: Math.round(ivaVes * 100) / 100,
    ivaUsd: Math.round(ivaUsd * 100) / 100,
    totalVes: Math.round(totalVes * 100) / 100,
    totalUsd: Math.round(totalUsd * 100) / 100,
    ivaType,
    ivaRate: maxIvaRate,
    items: processedItems,
    exchangeRate,
  };
}

// ============================================================
// FUNCION PRINCIPAL: ENVIAR MENSAJE INICIAL
// ============================================================

export async function sendInitialChatMessage(props: ChatMessageHandlerProps): Promise<{ success: boolean; conversationId?: string; message?: string }> {
  const {
    orderId,
    tenantId,
    userId,
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod,
    paymentReference,
    bankSource,
    totalAmount,
    totalAmountVes,
    items = [],
    exchangeRate = 1,
    paymentConfig = {},
    conversationId: existingConversationId,
    token: providedToken,
    isService = false,
    serviceName,
    serviceDate,
    serviceTime,
  } = props;

  console.log('[ChatMessageHandler] Iniciando para orden', orderId, 'metodo:', paymentMethod);

  try {
    let token = providedToken;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    }

    if (!token) {
      console.warn('[ChatMessageHandler] No hay token de autenticacion');
      return { success: false, message: 'No autenticado' };
    }

    let conversationId = existingConversationId;

    if (!conversationId) {
      console.log('[ChatMessageHandler] Creando conversacion para tenant:', tenantId);
      
      const createRes = await fetch(getApiUrl('/chat/conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId: tenantId,
        }),
      });

      if (createRes.ok) {
        const data = await createRes.json();
        conversationId = data.id;
        console.log('[ChatMessageHandler] Conversacion creada:', conversationId);
      } else {
        const errorText = await createRes.text();
        console.error('[ChatMessageHandler] Error al crear conversacion:', errorText);
        return { success: false, message: `Error al crear conversacion: ${errorText}` };
      }
    }

    if (!conversationId) {
      return { success: false, message: 'No se pudo obtener conversacion' };
    }

    // Calcular totales con IVA
    const totals = calculateTotals(items, exchangeRate);

    const message = generateMessage({
      orderId,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      paymentReference,
      bankSource,
      totalAmount,
      totalAmountVes,
      paymentConfig,
      totals,
      isService,
      serviceName,
      serviceDate,
      serviceTime,
    });

    if (!message) {
      console.log('[ChatMessageHandler] No se envio mensaje para', paymentMethod);
      return { success: true, conversationId, message: 'Sin mensaje (metodo sin instrucciones)' };
    }

    console.log('[ChatMessageHandler] Enviando mensaje a conversacion:', conversationId);
    
    const sendRes = await fetch(getApiUrl(`/chat/conversations/${conversationId}/messages`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: message,
        isStoreMessage: true,
        tenantId: tenantId,
      }),
    });

    if (sendRes.ok) {
      console.log('[ChatMessageHandler] Mensaje enviado para orden', orderId);
      return { success: true, conversationId };
    } else {
      const errorText = await sendRes.text();
      console.error('[ChatMessageHandler] Error al enviar mensaje:', errorText);
      return { success: false, message: `Error al enviar mensaje: ${errorText}` };
    }

  } catch (error) {
    console.error('[ChatMessageHandler] Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// ============================================================
// GENERAR MENSAJE SEGUN METODO DE PAGO
// ============================================================

function generateMessage(props: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  bankSource?: string;
  totalAmount: number;
  totalAmountVes: number;
  paymentConfig?: any;
  totals?: OrderTotals;
  isService?: boolean;
  serviceName?: string;
  serviceDate?: string;
  serviceTime?: string;
}): string | null {
  const {
    orderId,
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod,
    paymentReference,
    bankSource,
    totalAmount,
    totalAmountVes,
    paymentConfig = {},
    totals,
    isService = false,
    serviceName,
    serviceDate,
    serviceTime,
  } = props;

  const orderIdShort = orderId.slice(0, 8).toUpperCase();
  const orderType = isService ? 'cita' : 'orden';
  const orderTypeCapital = isService ? 'Cita' : 'Orden';

  // Usar totals calculados o valores por defecto
  const subtotalVes = totals?.subtotalVes || totalAmountVes;
  const ivaVes = totals?.ivaVes || 0;
  const totalVes = totals?.totalVes || totalAmountVes;
  const totalUsd = totals?.totalUsd || totalAmount;
  const ivaType = totals?.ivaType || 'excluded';
  const ivaRate = totals?.ivaRate || 16;
  const items = totals?.items || [];

  const formattedTotalVes = formatPriceVes(totalVes);
  const formattedTotalUsd = formatPriceUsd(totalUsd);
  const formattedSubtotal = formatPriceVes(subtotalVes);
  const formattedIva = formatPriceVes(ivaVes);

  // Iconos en texto plano (sin emojis)
  const ICONS = {
    order: '[ORDEN]',
    payment: '[PAGO]',
    info: '[INFO]',
    warning: '[ADVERTENCIA]',
    success: '[EXITO]',
    bank: '[BANCO]',
    phone: '[TELEFONO]',
    id: '[CEDULA]',
    clock: '[HORA]',
    calendar: '[FECHA]',
    dollar: '[USD]',
    bolivar: '[VES]',
  };

  // ==========================================================
  // 1. PAGO MOVIL
  // ==========================================================
  if (paymentMethod === 'pago_movil' || paymentMethod === 'pagomovil') {
    const pagoMovil = paymentConfig?.pagoMovil || null;
    if (!pagoMovil) {
      console.warn('[ChatMessageHandler] No hay datos de Pago Movil');
      return null;
    }

    const bankName = getBankName(pagoMovil.bank) || 'No especificado';
        const operator = getOperatorName(pagoMovil.operator);
    const phone = pagoMovil.phone || '';
    const idType = pagoMovil.idType || 'V';
    const idNumber = pagoMovil.idNumber || '';

    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `Pago Movil (Opcional):\n`;
    message += `${ICONS.bank} Banco: ${bankName}\n`;
    message += `${ICONS.phone} Telefono: ${operator}${phone}\n`;
    message += `${ICONS.id} Cedula/RIF: ${idType}-${idNumber}\n`;
    message += `${ICONS.bolivar} Monto: Bs. ${formattedTotalVes}\n`;
    message += `\n`;
    
    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        const ivaLabel = item.ivaType === 'included' ? ' (IVA inc.)' : 
                         item.ivaType === 'excluded' ? ' (IVA +)' : '';
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}${ivaLabel}\n`;
      });
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `3. La tienda verificara y confirmara tu pago.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 2. ZELLE
  // ==========================================================
  if (paymentMethod === 'zelle') {
    const zelle = paymentConfig?.zelle || null;
    if (!zelle) {
      console.warn('[ChatMessageHandler] No hay datos de Zelle');
      return null;
    }

    const email = zelle.emailOrPhone || '';
    const holderName = zelle.holderName || '';

    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado Zelle como metodo de pago.\n`;
    message += `\n`;
    message += `DATOS PARA REALIZAR EL PAGO:\n`;
    message += `${ICONS.bank} Email: ${email}\n`;
    message += `Titular: ${holderName || 'No especificado'}\n`;
    message += `${ICONS.dollar} Monto: $${formattedTotalUsd} USD\n`;
    message += `\n`;
    
    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        const ivaLabel = item.ivaType === 'included' ? ' (IVA inc.)' : 
                         item.ivaType === 'excluded' ? ' (IVA +)' : '';
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}${ivaLabel}\n`;
      });
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Realiza el pago Zelle con el monto exacto.\n`;
    message += `2. Reporta el comprobante en esta conversacion.\n`;
    message += `3. La tienda verificara y confirmara tu pago.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 3. BINANCE PAY
  // ==========================================================
  if (paymentMethod === 'binance') {
    const binance = paymentConfig?.binance || null;
    if (!binance) {
      console.warn('[ChatMessageHandler] No hay datos de Binance');
      return null;
    }

    const payId = binance.payId || '';
    const email = binance.email || '';

    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado Binance Pay como metodo de pago.\n`;
    message += `\n`;
    message += `DATOS PARA REALIZAR EL PAGO:\n`;
    message += `Pay ID: ${payId}\n`;
    message += `Email: ${email || 'No especificado'}\n`;
    message += `${ICONS.dollar} Monto: $${formattedTotalUsd} USD\n`;
    message += `\n`;
    
    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        const ivaLabel = item.ivaType === 'included' ? ' (IVA inc.)' : 
                         item.ivaType === 'excluded' ? ' (IVA +)' : '';
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}${ivaLabel}\n`;
      });
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Realiza el pago con Binance Pay usando los datos proporcionados.\n`;
    message += `2. Reporta el comprobante en esta conversacion.\n`;
    message += `3. La tienda verificara y confirmara tu pago.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 4. PAYPAL
  // ==========================================================
  if (paymentMethod === 'paypal') {
    const paypal = paymentConfig?.paypal || null;
    if (!paypal) {
      console.warn('[ChatMessageHandler] No hay datos de PayPal');
      return null;
    }

    const email = paypal.emailOrLink || '';

    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado PayPal como metodo de pago.\n`;
    message += `\n`;
    message += `DATOS PARA REALIZAR EL PAGO:\n`;
    message += `Email: ${email}\n`;
    message += `${ICONS.dollar} Monto: $${formattedTotalUsd} USD\n`;
    message += `\n`;
    
    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        const ivaLabel = item.ivaType === 'included' ? ' (IVA inc.)' : 
                         item.ivaType === 'excluded' ? ' (IVA +)' : '';
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}${ivaLabel}\n`;
      });
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Realiza el pago con PayPal usando los datos proporcionados.\n`;
    message += `2. Reporta el comprobante en esta conversacion.\n`;
    message += `3. La tienda verificara y confirmara tu pago.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 5. EFECTIVO - MENSAJE DE CONFIRMACION
  // ==========================================================
  if (paymentMethod === 'efectivo' || paymentMethod === 'cash') {
    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado EFECTIVO como metodo de pago.\n`;
    message += `\n`;
    message += `MONTO A PAGAR EN TIENDA:\n`;
    message += `${ICONS.bolivar} Total: Bs. ${formattedTotalVes}\n`;
    if (totalUsd > 0) {
      message += `${ICONS.dollar} Total en USD: $${formattedTotalUsd}\n`;
    }
    message += `\n`;
    
    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}\n`;
      });
      message += `\n`;
    }

    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Acercate a la tienda con el monto exacto.\n`;
    message += `2. Nuestra tienda te atendera en el momento.\n`;
    message += `3. Recuerda presentar tu cedula de identidad.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 6. POS / PUNTO DE VENTA
  // ==========================================================
  if (paymentMethod === 'pos' || paymentMethod === 'punto_venta') {
    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado PUNTO DE VENTA (POS) como metodo de pago.\n`;
    message += `\n`;
    message += `MONTO A PAGAR EN TIENDA:\n`;
    message += `${ICONS.bolivar} Total: Bs. ${formattedTotalVes}\n`;
    if (totalUsd > 0) {
      message += `${ICONS.dollar} Total en USD: $${formattedTotalUsd}\n`;
    }
    message += `\n`;
    
    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}\n`;
      });
      message += `\n`;
    }

    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Acercate a la tienda para realizar el pago con tarjeta.\n`;
    message += `2. Nuestra tienda te atendera en el momento.\n`;
    message += `3. Recuerda presentar tu cedula de identidad.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 7. BIOPAGO
  // ==========================================================
  if (paymentMethod === 'biopago') {
    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado BIOPAGO como metodo de pago.\n`;
    message += `\n`;
    message += `MONTO A PAGAR EN TIENDA:\n`;
    message += `${ICONS.bolivar} Total: Bs. ${formattedTotalVes}\n`;
    if (totalUsd > 0) {
      message += `${ICONS.dollar} Total en USD: $${formattedTotalUsd}\n`;
    }
    message += `\n`;
    
    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}\n`;
      });
      message += `\n`;
    }

    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Acercate a la tienda para realizar el pago con Biopago.\n`;
    message += `2. Nuestra tienda te atendera en el momento.\n`;
    message += `3. Recuerda presentar tu cedula de identidad.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 8. TRANSFERENCIA BANCARIA
  // ==========================================================
  if (paymentMethod === 'transferencia_bancaria' || paymentMethod === 'transferencia') {
    let message = `NUEVA ${orderTypeCapital.toUpperCase()} #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, gracias por tu ${orderType}.\n`;
    message += `\n`;
    message += `${ICONS.info} Has seleccionado TRANSFERENCIA BANCARIA como metodo de pago.\n`;
    message += `\n`;
    message += `MONTO A TRANSFERIR:\n`;
    message += `${ICONS.bolivar} Total: Bs. ${formattedTotalVes}\n`;
    if (totalUsd > 0) {
      message += `${ICONS.dollar} Total en USD: $${formattedTotalUsd}\n`;
    }
    message += `\n`;
    
    // Desglose de IVA
    if (ivaVes > 0) {
      message += `DESGLOSE DEL PAGO:\n`;
      message += `Subtotal: Bs. ${formattedSubtotal}\n`;
      if (ivaType === 'included') {
        message += `IVA ${ivaRate}% (incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'excluded') {
        message += `IVA ${ivaRate}% (no incluido): Bs. ${formattedIva}\n`;
      } else if (ivaType === 'mixed') {
        message += `IVA Mixto: Bs. ${formattedIva}\n`;
      }
      message += `Total: Bs. ${formattedTotalVes}\n`;
      message += `\n`;
    }

    // Lista de productos
    if (items.length > 0) {
      message += `PRODUCTOS:\n`;
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}\n`;
      });
      message += `\n`;
    }

    if (isService && serviceDate && serviceTime) {
      message += `DETALLES DE LA CITA:\n`;
      message += `${ICONS.calendar} Fecha: ${formatDateReadable(serviceDate)}\n`;
      message += `${ICONS.clock} Hora: ${serviceTime}\n`;
      message += `Servicio: ${serviceName || 'No especificado'}\n`;
      message += `\n`;
    }

    message += `${ICONS.warning} INSTRUCCIONES:\n`;
    message += `1. Realiza la transferencia al numero de cuenta indicado.\n`;
    message += `2. Reporta el comprobante en esta conversacion.\n`;
    message += `3. La tienda verificara y confirmara tu pago.\n`;
    message += `\n`;
    message += `Si tienes alguna duda, no dudes en preguntar.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Gracias por tu compra.`;

    return message;
  }

  // ==========================================================
  // 9. METODO DESCONOCIDO - MENSAJE GENERICO
  // ==========================================================
  console.log('[ChatMessageHandler] Metodo desconocido:', paymentMethod);
  return null;
}

// ============================================================
// FUNCION: FORMATO DE FECHA LEGIBLE
// ============================================================

function formatDateReadable(dateStr: string): string {
  if (!dateStr) return 'Fecha no seleccionada';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-VE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ============================================================
// FUNCION: ENVIAR MENSAJE DE PAGO REPORTADO
// ============================================================

export async function sendPaymentReportedMessage(
  orderId: string,
  conversationId: string,
  paymentData: {
    method: string;
    reference: string;
    amount: number;
    amountVes: number;
    bank?: string;
    clientIdNumber?: string;
    clientIdType?: string;
    clientPhone?: string;
    proofUrl?: string;
    items?: ProductItem[];
    exchangeRate?: number;
  }
): Promise<{ success: boolean }> {
  console.log('[ChatMessageHandler] Enviando mensaje de pago reportado para orden', orderId);

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    if (!token) {
      console.warn('[ChatMessageHandler] No hay token');
      return { success: false };
    }

    const { 
      method, 
      reference, 
      amount, 
      amountVes, 
      bank, 
      clientIdNumber, 
      clientIdType, 
      clientPhone, 
      proofUrl,
      items = [],
      exchangeRate = 1,
    } = paymentData;

    const amountFormatted = amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const methodLabel = getPaymentMethodLabel(method as PaymentMethodType);

    let message = `PAGO REPORTADO\n`;
    message += `\n`;
    message += `Orden: #${orderId.slice(0, 8).toUpperCase()}\n`;
    message += `Metodo: ${methodLabel}\n`;
    message += `Referencia: ${reference || 'N/A'}\n`;
    message += `Monto: Bs. ${amountFormatted}\n`;

    if (bank) message += `Banco: ${bank}\n`;
    if (clientIdNumber) message += `Cedula/RIF: ${clientIdType || 'V'}-${clientIdNumber}\n`;
    if (clientPhone) message += `Telefono: ${clientPhone}\n`;
    if (proofUrl) message += `\nComprobante: ${proofUrl}\n`;

    // Desglose de IVA si hay items
    if (items.length > 0) {
      const totals = calculateTotals(items, exchangeRate);
      message += `\n`;
      message += `DESGLOSE:\n`;
      message += `Subtotal: Bs. ${formatPriceVes(totals.subtotalVes)}\n`;
      if (totals.ivaVes > 0) {
        message += `IVA: Bs. ${formatPriceVes(totals.ivaVes)}\n`;
      }
      message += `Total: Bs. ${formatPriceVes(totals.totalVes)}\n`;
    }

    message += `\n`;

    console.log('[ChatMessageHandler] Enviando mensaje de pago reportado a conversacion:', conversationId);

    const sendRes = await fetch(getApiUrl(`/chat/conversations/${conversationId}/messages`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: message,
        isStoreMessage: false,
      }),
    });

    if (sendRes.ok) {
      console.log('[ChatMessageHandler] Mensaje de pago reportado enviado');
      return { success: true };
    } else {
      const errorText = await sendRes.text();
      console.error('[ChatMessageHandler] Error al enviar mensaje de pago reportado:', errorText);
      return { success: false };
    }

  } catch (error) {
    console.error('[ChatMessageHandler] Error:', error);
    return { success: false };
  }
}

// ============================================================
// FUNCION: ENVIAR MENSAJE DE ORDEN COMPLETADA
// ============================================================

export async function sendOrderCompletedMessage(
  orderId: string,
  conversationId: string,
  customerName: string,
  orderData?: {
    items?: ProductItem[];
    totalVes?: number;
    totalUsd?: number;
    exchangeRate?: number;
  }
): Promise<{ success: boolean }> {
  console.log('[ChatMessageHandler] Enviando mensaje de orden completada', orderId);

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    if (!token) {
      console.warn('[ChatMessageHandler] No hay token');
      return { success: false };
    }

    const orderIdShort = orderId.slice(0, 8).toUpperCase();
    const items = orderData?.items || [];
    const totalVes = orderData?.totalVes || 0;
    const totalUsd = orderData?.totalUsd || 0;

    let message = `ORDEN COMPLETADA\n`;
    message += `\n`;
    message += `Orden: #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, tu orden ha sido completada exitosamente.\n`;
    message += `\n`;
    message += `RESUMEN:\n`;

    if (items.length > 0) {
      items.forEach((item, idx) => {
        const qty = item.quantity || 1;
        const price = item.priceVes || 0;
        const total = price * qty;
        message += `${idx + 1}. ${item.name} x${qty} - Bs. ${formatPriceVes(total)}\n`;
      });
    }

    message += `\n`;
    message += `Total pagado: Bs. ${formatPriceVes(totalVes)}`;
    if (totalUsd > 0) {
      message += ` ($${formatPriceUsd(totalUsd)})`;
    }
    message += `\n`;
    message += `\n`;
    message += `Gracias por confiar en nosotros. Esperamos verte pronto.\n`;
    message += `\n`;
    message += `---\n`;
    message += `Si tienes alguna duda, no dudes en escribirnos.`;

    console.log('[ChatMessageHandler] Enviando mensaje de completada a conversacion:', conversationId);

    const sendRes = await fetch(getApiUrl(`/chat/conversations/${conversationId}/messages`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: message,
        isStoreMessage: true,
      }),
    });

    if (sendRes.ok) {
      console.log('[ChatMessageHandler] Mensaje de orden completada enviado');
      return { success: true };
    } else {
      const errorText = await sendRes.text();
      console.error('[ChatMessageHandler] Error al enviar mensaje de completada:', errorText);
      return { success: false };
    }

  } catch (error) {
    console.error('[ChatMessageHandler] Error:', error);
    return { success: false };
  }
}

// ============================================================
// FUNCION: ENVIAR MENSAJE DE ORDEN CANCELADA
// ============================================================

export async function sendOrderCancelledMessage(
  orderId: string,
  conversationId: string,
  customerName: string,
  reason?: string
): Promise<{ success: boolean }> {
  console.log('[ChatMessageHandler] Enviando mensaje de orden cancelada', orderId);

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    if (!token) {
      console.warn('[ChatMessageHandler] No hay token');
      return { success: false };
    }

    const orderIdShort = orderId.slice(0, 8).toUpperCase();

    let message = `ORDEN CANCELADA\n`;
    message += `\n`;
    message += `Orden: #${orderIdShort}\n`;
    message += `\n`;
    message += `Hola ${customerName}, lamentamos informarte que tu orden ha sido cancelada.`;

    if (reason) {
      message += `\n`;
      message += `\nMotivo: ${reason}`;
    }

    message += `\n`;
    message += `\n`;
    message += `Si tienes alguna pregunta, no dudes en contactarnos.`;

    console.log('[ChatMessageHandler] Enviando mensaje de cancelada a conversacion:', conversationId);

    const sendRes = await fetch(getApiUrl(`/chat/conversations/${conversationId}/messages`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: message,
        isStoreMessage: true,
      }),
    });

    if (sendRes.ok) {
      console.log('[ChatMessageHandler] Mensaje de orden cancelada enviado');
      return { success: true };
    } else {
      const errorText = await sendRes.text();
      console.error('[ChatMessageHandler] Error al enviar mensaje de cancelada:', errorText);
      return { success: false };
    }

  } catch (error) {
    console.error('[ChatMessageHandler] Error:', error);
    return { success: false };
  }
}

// ============================================================
// EXPORTAR TODO
// ============================================================

export default {
  sendInitialChatMessage,
  sendPaymentReportedMessage,
  sendOrderCompletedMessage,
  sendOrderCancelledMessage,
};