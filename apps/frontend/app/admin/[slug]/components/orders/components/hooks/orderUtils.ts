// frontend/app/admin/[slug]/components/orders/components/hooks/orderUtils.ts

// 🔥 FUNCIÓN PARA REDONDEAR A 2 DECIMALES
export const roundPrice = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// 🔥 FUNCIÓN PARA FORMATEAR PRECIOS CON SEPARADORES DE MILES
export const formatPrice = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return '0,00';
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🔥 MAPEO DE ESTADOS (backend → frontend) - SIN EMOJIS
export const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  'PENDING': { label: 'Pendiente', icon: '●', color: 'text-amber-400' },
  'PENDING_LOCAL': { label: 'Pendiente', icon: '●', color: 'text-amber-400' },
  'por_verificar': { label: 'Verificando', icon: '●', color: 'text-sky-400' },
  'verificando': { label: 'Verificando', icon: '●', color: 'text-sky-400' },
  'CONFIRMED': { label: 'Verificado', icon: '●', color: 'text-emerald-400' },
  'verificado': { label: 'Verificado', icon: '●', color: 'text-emerald-400' },
  'COMPLETED': { label: 'Completado', icon: '●', color: 'text-emerald-500' },
  'CANCELLED': { label: 'Cancelado', icon: '●', color: 'text-red-400' },
};

// 🔥 ESTADOS BLOQUEADOS (no se pueden modificar)
export const LOCKED_STATUSES = ['COMPLETED', 'CANCELLED'];

// 🔥 OBTENER ETIQUETA EN ESPAÑOL
export const getStatusLabel = (status: string): string => {
  if (!status) return 'Desconocido';
  const normalized = status.toUpperCase().trim();
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (key.toUpperCase() === normalized) {
      return value.label;
    }
  }
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

// 🔥 OBTENER ICONO
export const getStatusIcon = (status: string): string => {
  if (!status) return '●';
  const normalized = status.toUpperCase().trim();
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (key.toUpperCase() === normalized) {
      return value.icon;
    }
  }
  return '●';
};

// 🔥 OBTENER COLOR
export const getStatusColor = (status: string): string => {
  if (!status) return 'text-slate-400';
  const normalized = status.toUpperCase().trim();
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (key.toUpperCase() === normalized) {
      return value.color;
    }
  }
  return 'text-slate-400';
};

// 🔥 VERIFICAR SI UN ESTADO ESTÁ BLOQUEADO
export const isStatusLocked = (status: string): boolean => {
  if (!status) return false;
  const normalized = status.toUpperCase().trim();
  return LOCKED_STATUSES.some(locked => normalized === locked);
};

// 🔥 OBTENER MENSAJE DE CONFIRMACIÓN - SIN EMOJIS
export const getStatusConfirmationMessage = (newStatus: string): string => {
  const normalized = newStatus.toUpperCase().trim();
  if (normalized === 'COMPLETED') {
    return '¿Estás seguro de marcar esta orden como COMPLETADA? Esta acción no se puede deshacer.';
  }
  if (normalized === 'CANCELLED') {
    return '¿Estás seguro de CANCELAR esta orden? Esta acción no se puede deshacer.';
  }
  if (normalized === 'por_verificar' || normalized === 'VERIFICANDO') {
    return 'El pago pasará a VERIFICANDO. El vendedor lo confirmará manualmente.';
  }
  if (normalized === 'CONFIRMED') {
    return '¿Confirmar el pago de esta orden? El cliente será notificado.';
  }
  return '';
};

// 🔥 OBTENER OPCIONES DE ESTADOS PARA EL DROPDOWN - CORREGIDO
export const getStatusOptions = (currentStatus: string): { value: string; label: string; icon: string; disabled: boolean }[] => {
  if (!currentStatus) {
    currentStatus = 'PENDING';
  }

  const normalizedCurrent = currentStatus.toLowerCase().trim();
  const isLocked = isStatusLocked(currentStatus);

  if (isLocked) {
    return [{
      value: currentStatus,
      label: getStatusLabel(currentStatus),
      icon: getStatusIcon(currentStatus),
      disabled: true,
    }];
  }

  let validStatuses: string[] = [];
  
  // 🔥 FLUJO CORRECTO:
  // PENDING → SOLO comprador puede mover a por_verificar (el admin NO debe poder)
  // por_verificar → admin puede mover a CONFIRMED o CANCELLED
  // CONFIRMED → admin puede mover a COMPLETED o CANCELLED
  
  if (normalizedCurrent === 'pending') {
    // 🔥 El admin NO puede cambiar PENDING a nada (el comprador debe reportar pago)
    // Solo mostrar el estado actual
    validStatuses = ['PENDING'];
  } else if (normalizedCurrent === 'por_verificar' || normalizedCurrent === 'verificando') {
    // 🔥 Admin puede: Confirmar pago o Cancelar
    validStatuses = ['por_verificar', 'CONFIRMED', 'CANCELLED'];
  } else if (normalizedCurrent === 'confirmed') {
    // 🔥 Admin puede: Completar o Cancelar
    validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
  } else {
    validStatuses = [currentStatus];
  }

  const options: { value: string; label: string; icon: string; disabled: boolean }[] = [];

  for (const key of validStatuses) {
    const statusInfo = STATUS_MAP[key];
    if (statusInfo) {
      options.push({
        value: key,
        label: statusInfo.label,
        icon: statusInfo.icon,
        disabled: key.toLowerCase() === normalizedCurrent,
      });
    }
  }

  return options;
};

// 🔥 EL RESTO DE FUNCIONES (getOrderRate, getItemUnitPriceVes, getOrderTotalVes, etc.) - SIN CAMBIOS
export const getOrderRate = (order: any): number => {
  if (order.rate) return Number(order.rate);
  if (order.exchangeRate) return Number(order.exchangeRate);
  if (order.rateUsd) return Number(order.rateUsd);

  // 🔥 NUEVO: usar exchangeRateUsed del snapshot de los items
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    for (const item of order.items) {
      const rate = Number(item.exchangeRateUsed || 0);
      if (rate > 0) {
        return rate;
      }
    }
  }

  if (order.paymentMetadata?.exchangeRate) {
    return Number(order.paymentMetadata.exchangeRate);
  }
  
  if (order.totalAmount && order.totalAmountVes) {
    const totalAmount = Number(order.totalAmount);
    const totalAmountVes = Number(order.totalAmountVes);
    if (totalAmount > 0 && totalAmountVes > 0) {
      const calculatedRate = totalAmountVes / totalAmount;
      return roundPrice(calculatedRate);
    }
  }
  
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    let totalUsd = 0;
    let totalVes = 0;
    for (const item of order.items) {
      const qty = Number(item.quantity || 1);
      
      let usdPrice = 0;
      if (item.price && Number(item.price) < 1000) usdPrice = Number(item.price);
      else if (item.unitPrice && Number(item.unitPrice) < 1000) usdPrice = Number(item.unitPrice);
      else if (item.prices?.USD) usdPrice = Number(item.prices.USD);
      
      let vesPrice = 0;
      if (item.unitPriceVes) vesPrice = Number(item.unitPriceVes);
      else if (item.priceVes) vesPrice = Number(item.priceVes);
      else if (item.prices?.VES) vesPrice = Number(item.prices.VES);
      
      if (usdPrice > 0 && vesPrice > 0) {
        totalUsd += usdPrice * qty;
        totalVes += vesPrice * qty;
      }
    }
    if (totalUsd > 0 && totalVes > 0) {
      const calculatedRate = totalVes / totalUsd;
      return roundPrice(calculatedRate);
    }
  }
  
  if (order.totalAmount && order.items && order.items.length > 0) {
    const totalItems = order.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
    if (totalItems > 0) {
      const totalVes = order.totalAmountVes || order.totalVes || 0;
      if (totalVes > 0) {
        const calculatedRate = totalVes / Number(order.totalAmount);
        return roundPrice(calculatedRate);
      }
    }
  }
  
  console.warn('⚠️ No se pudo calcular la tasa de cambio para la orden:', order?.id);
  return 0;
};

export const getItemUnitPriceVes = (item: any, order: any): number => {
  // 🔥 NUEVO: usar totalPriceVES del snapshot (precio final con descuento + IVA)
  if (item.totalPriceVES !== undefined && Number(item.totalPriceVES) > 0) {
    const quantity = Number(item.quantity || 1);
    return roundPrice(Number(item.totalPriceVES) / quantity);
  }
  if (item.unitPriceVes !== undefined && item.unitPriceVes !== null && item.unitPriceVes !== 0) {
    return Number(item.unitPriceVes);
  }
  if (item.priceVes !== undefined && item.priceVes !== null && item.priceVes !== 0) {
    return Number(item.priceVes);
  }
  if (item.prices?.VES !== undefined && item.prices?.VES !== null && item.prices?.VES !== 0) {
    return Number(item.prices.VES);
  }
  if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== 0) {
    return Number(item.unitPrice);
  }
  if (item.price !== undefined && item.price !== null && item.price !== 0) {
    const price = Number(item.price);
    const rate = getOrderRate(order);
    
    if (rate > 0 && price < 1000) {
      return roundPrice(price * rate);
    }
    if (price > 1000) {
      return price;
    }
    console.warn('⚠️ price sin rate para item:', item.name || item.productName);
    return price;
  }
  return 0;
};

export const getOrderVesTotal = (order: any, globalRate: number = 0): number => {
  // 🔥 PRIORIDAD 1: suma exacta desde el snapshot (evita redondeos del backend)
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    let hasSnapshot = false;
    let totalVes = 0;
    
    for (const item of order.items) {
      if (item.totalPriceVES !== undefined && Number(item.totalPriceVES) > 0) {
        hasSnapshot = true;
        totalVes += Number(item.totalPriceVES) * Number(item.quantity || 1);
      }
    }
    
    if (hasSnapshot && totalVes > 0) {
      return roundPrice(totalVes);
    }
  }

  // 🔴 PRIORIDAD 2: usar totalAmountVes guardado (compatibilidad)
  if (order.totalAmountVes) {
    return Number(order.totalAmountVes);
  }
  if (order.totalVes) {
    return Number(order.totalVes);
  }

  // 🔴 PRIORIDAD 3: recalcular con tasa
  const rate = globalRate > 0 ? globalRate : getOrderRate(order);
  if (order.totalAmount && rate > 0) {
    return roundPrice(Number(order.totalAmount) * rate);
  }
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    let totalVes = 0;
    for (const item of order.items) {
      const quantity = Number(item.quantity || 1);
      const priceVes = getItemUnitPriceVes(item, order);
      totalVes += priceVes * quantity;
    }
    return roundPrice(totalVes);
  }
  return 0;
};

// 🔥 ALIAS: mantener compatibilidad con getOrderTotalVes
export const getOrderTotalVes = getOrderVesTotal;

export const canChangeStatus = async (orderId: string, apiBase: string): Promise<{ canChange: boolean; reason?: string }> => {
  try {
    const response = await fetch(`${apiBase}/orders/${orderId}/can-modify`);
    if (response.ok) {
      return await response.json();
    }
    return { canChange: true };
  } catch (error) {
    console.error('Error verificando si se puede modificar:', error);
    return { canChange: true };
  }
};

export const normalizeStatus = (status: string): string => {
  if (!status) return 'pending';
  return status.toLowerCase().trim();
};

export const isTerminalStatus = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  return ['completed', 'completado', 'pagado', 'aprobado', 'cancelled', 'cancelado', 'rechazado'].includes(normalized);
};

export const getSuggestedNextStatus = (currentStatus: string): string | null => {
  const normalized = normalizeStatus(currentStatus);
  
  if (normalized === 'pending' || normalized === 'pendiente') {
    return null; // 🔥 El admin NO puede sugerir nada, el comprador reporta pago
  }
  if (normalized === 'por_verificar' || normalized === 'verificando') {
    return 'CONFIRMED';
  }
  if (normalized === 'confirmed') {
    return 'COMPLETED';
  }
  return null;
};

export const isBuyerAction = (currentStatus: string, newStatus: string): boolean => {
  const current = normalizeStatus(currentStatus);
  const newSt = normalizeStatus(newStatus);
  
  if (current === 'pending' || current === 'pendiente') {
    return newSt === 'por_verificar' || newSt === 'cancelled';
  }
  return false;
};

export const isSellerAction = (currentStatus: string, newStatus: string): boolean => {
  const current = normalizeStatus(currentStatus);
  const newSt = normalizeStatus(newStatus);
  
  if (current === 'por_verificar' || current === 'verificando') {
    return newSt === 'confirmed' || newSt === 'cancelled';
  }
  if (current === 'confirmed') {
    return newSt === 'completed' || newSt === 'cancelled';
  }
  return false;
};