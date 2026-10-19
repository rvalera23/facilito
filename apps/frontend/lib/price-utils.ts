// frontend/lib/price-utils.ts

/**
 * UTILIDADES DE PRECIOS CON DESCUENTO
 * 
 * 🔥 IMPORTANTE: Estas funciones NO modifican el cálculo del IVA.
 * Solo aplican descuento al precio base y luego calculan el IVA
 * sobre el precio con descuento usando la misma lógica existente.
 * 
 * Esto garantiza que el sistema de IVA siga funcionando exactamente igual.
 */

// ============================================================
// TIPOS
// ============================================================

export interface ProductPrices {
  VES: number;
  USD: number;
  EUR?: number;
  CRYPTO?: number;
  ivaType?: 'included' | 'excluded' | 'exempt';
  ivaRate?: number;
}

export interface IvaInfo {
  ivaType: 'included' | 'excluded' | 'exempt';
  ivaRate: number;
  ivaAmountVES: number;
  ivaAmountUSD: number;
  priceWithIVAVES: number;
  priceWithIVAUSD: number;
  display: string;
  badgeColor: string;
  badgeBg: string;
}

export interface ProductPricesWithDiscount {
  // Precios base (sin descuento)
  originalVES: number;
  originalUSD: number;
  
  // Precios con descuento (sin IVA)
  discountedVES: number;
  discountedUSD: number;
  
  // Precios finales (con IVA aplicado al precio con descuento)
  finalVES: number;
  finalUSD: number;
  
  // IVA calculado sobre el precio con descuento
  ivaAmountVES: number;
  ivaAmountUSD: number;
  
  // Información del descuento
  hasDiscount: boolean;
  discountPercentage: number;
  
  // Información del IVA
  ivaType: 'included' | 'excluded' | 'exempt';
  ivaRate: number;
  displayIVA: string;
  badgeColor: string;
  badgeBg: string;
}

// ============================================================
// FUNCIÓN PRINCIPAL: Obtener precios con descuento
// ============================================================

/**
 * Obtiene los precios de un producto con descuento aplicado (si existe)
 * 
 * 🔥 NO MODIFICA EL CÁLCULO DE IVA - solo aplica descuento al precio base
 * 
 * @param product - El producto o servicio
 * @param exchangeRate - Tasa de cambio actual (USD a VES)
 * @returns ProductPricesWithDiscount - Precios con descuento e IVA calculado
 */
export function getProductPricesWithDiscount(
  product: any,
  exchangeRate: number = 0
): ProductPricesWithDiscount {
  // 1. Obtener precios base (sin descuento) - usando la función existente
  const basePrices = getProductPrices(product, exchangeRate);
  
  // 2. Verificar si tiene descuento
  const hasDiscount = product?.onSale === true && (product?.discountPercentage || 0) > 0;
  
  if (!hasDiscount) {
    // Calcular IVA sobre el precio base
    const ivaInfo = calculateIVAForPrice(
      basePrices.VES,
      basePrices.USD,
      basePrices.ivaType || 'excluded',
      basePrices.ivaRate || 16
    );
    
    return {
      originalVES: basePrices.VES,
      originalUSD: basePrices.USD,
      discountedVES: basePrices.VES,
      discountedUSD: basePrices.USD,
      finalVES: ivaInfo.priceWithIVAVES,
      finalUSD: ivaInfo.priceWithIVAUSD,
      ivaAmountVES: ivaInfo.ivaAmountVES,
      ivaAmountUSD: ivaInfo.ivaAmountUSD,
      hasDiscount: false,
      discountPercentage: 0,
      ivaType: ivaInfo.ivaType,
      ivaRate: ivaInfo.ivaRate,
      displayIVA: ivaInfo.display,
      badgeColor: ivaInfo.badgeColor,
      badgeBg: ivaInfo.badgeBg,
    };
  }
  
  // 3. Obtener el porcentaje de descuento (validado)
  let discount = Number(product.discountPercentage) || 0;
  discount = Math.min(100, Math.max(0, discount));
  
  // 4. Aplicar descuento al precio base (SIN IVA)
  const discountedVES = basePrices.VES * (1 - discount / 100);
  const discountedUSD = basePrices.USD * (1 - discount / 100);
  
  // 5. Recalcular IVA sobre el precio con descuento
  // 🔥 USA LA MISMA LÓGICA DE IVA EXISTENTE
  const ivaInfo = calculateIVAForPrice(
    discountedVES,
    discountedUSD,
    basePrices.ivaType || 'excluded',
    basePrices.ivaRate || 16
  );
  
  return {
    originalVES: Math.round(basePrices.VES * 100) / 100,
    originalUSD: Math.round(basePrices.USD * 100) / 100,
    discountedVES: Math.round(discountedVES * 100) / 100,
    discountedUSD: Math.round(discountedUSD * 100) / 100,
    finalVES: ivaInfo.priceWithIVAVES,
    finalUSD: ivaInfo.priceWithIVAUSD,
    ivaAmountVES: ivaInfo.ivaAmountVES,
    ivaAmountUSD: ivaInfo.ivaAmountUSD,
    hasDiscount: true,
    discountPercentage: discount,
    ivaType: ivaInfo.ivaType,
    ivaRate: ivaInfo.ivaRate,
    displayIVA: ivaInfo.display,
    badgeColor: ivaInfo.badgeColor,
    badgeBg: ivaInfo.badgeBg,
  };
}

// ============================================================
// FUNCIÓN: Extraer precios base de un producto
// ============================================================

/**
 * Extrae los precios base de un producto (sin IVA)
 * Esta función respeta la misma lógica que el resto del sistema
 */
export function getProductPrices(product: any, exchangeRate: number = 0) {
  if (!product) {
    return {
      VES: 0,
      USD: 0,
      ivaType: 'excluded' as const,
      ivaRate: 16,
    };
  }

  // Buscar en múltiples ubicaciones (igual que en el resto del sistema)
  const attrs = product?.attributes || {};
  let pricesObj = attrs.prices || product?.prices || {};

  if (typeof pricesObj === 'string') {
    try {
      pricesObj = JSON.parse(pricesObj);
    } catch {
      pricesObj = {};
    }
  }

  if (!pricesObj || Object.keys(pricesObj).length === 0) {
    pricesObj = {};
  }

  // Extraer VES
  let vesVal = Number(
    pricesObj?.VES ??
    pricesObj?.ves ??
    attrs.price_ves ??
    product?.price_ves ??
    product?.price ??
    product?.precio ??
    0
  );

  // Extraer USD
  let usdVal = Number(
    pricesObj?.USD ??
    pricesObj?.usd ??
    attrs.priceUsd ??
    attrs.usdReference ??
    product?.priceUsd ??
    product?.price_usd ??
    product?.usd ??
    product?.attributes?.prices?.USD ??
    0
  );

  // Si hay VES pero no USD, convertir con la tasa
  if (usdVal === 0 && vesVal > 0 && exchangeRate > 0) {
    usdVal = vesVal / exchangeRate;
  }

  // Si hay USD pero no VES, convertir con la tasa
  if (vesVal === 0 && usdVal > 0 && exchangeRate > 0) {
    vesVal = usdVal * exchangeRate;
  }

  // Extraer IVA
  const ivaType = product?.ivaType || attrs?.ivaType || 'excluded';
  const ivaRate = Number(product?.ivaRate || attrs?.ivaRate || 16);

  return {
    VES: Math.round(vesVal * 100) / 100,
    USD: Math.round(usdVal * 100) / 100,
    ivaType: ivaType as 'included' | 'excluded' | 'exempt',
    ivaRate: ivaRate,
  };
}

// ============================================================
// FUNCIÓN: Calcular IVA para un precio dado
// ============================================================

/**
 * Calcula el IVA para un precio dado (con o sin descuento)
 * 🔥 USA LA MISMA LÓGICA DE IVA EXISTENTE EN TODO EL SISTEMA
 */
export function calculateIVAForPrice(
  basePriceVES: number,
  basePriceUSD: number,
  ivaType: 'included' | 'excluded' | 'exempt' = 'excluded',
  ivaRate: number = 16
): IvaInfo {
  let ivaAmountVES = 0;
  let priceWithIVAVES = basePriceVES;
  let ivaAmountUSD = 0;
  let priceWithIVAUSD = basePriceUSD;

  if (ivaType === 'excluded') {
    ivaAmountVES = basePriceVES * (ivaRate / 100);
    priceWithIVAVES = basePriceVES + ivaAmountVES;
    ivaAmountUSD = basePriceUSD * (ivaRate / 100);
    priceWithIVAUSD = basePriceUSD + ivaAmountUSD;
  } else if (ivaType === 'included') {
    ivaAmountVES = basePriceVES - (basePriceVES / (1 + ivaRate / 100));
    priceWithIVAVES = basePriceVES;
    ivaAmountUSD = basePriceUSD - (basePriceUSD / (1 + ivaRate / 100));
    priceWithIVAUSD = basePriceUSD;
  } else {
    // EXENTO - sin IVA
    ivaAmountVES = 0;
    priceWithIVAVES = basePriceVES;
    ivaAmountUSD = 0;
    priceWithIVAUSD = basePriceUSD;
  }

  return {
    ivaType,
    ivaRate,
    ivaAmountVES: Math.round(ivaAmountVES * 100) / 100,
    ivaAmountUSD: Math.round(ivaAmountUSD * 100) / 100,
    priceWithIVAVES: Math.round(priceWithIVAVES * 100) / 100,
    priceWithIVAUSD: Math.round(priceWithIVAUSD * 100) / 100,
    display: ivaType === 'included' ? 'IVA Inc.' :
             ivaType === 'exempt' ? 'Exento' : 'IVA +',
    badgeColor: ivaType === 'included' ? '#22c55e' :
                 ivaType === 'exempt' ? '#64748b' : '#f59e0b',
    badgeBg: ivaType === 'included' ? 'rgba(34,197,94,0.15)' :
              ivaType === 'exempt' ? 'rgba(100,116,139,0.15)' : 'rgba(251,191,36,0.15)',
  };
}

// ============================================================
// FUNCIÓN: Formatear precios
// ============================================================

/**
 * Formatea un número como moneda en formato venezolano
 * Ejemplo: 1234.56 -> "1.234,56"
 */
export function formatPrice(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return '0,00';
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un número como DIVISA (USD/EUR/USDT) al estilo internacional.
 * Ejemplo: 1234.56 -> "1,234.56"
 * ⚠️ NO incluye el símbolo $ — solo el número.
 * Para el símbolo, concatenar por fuera: `$${formatUsd(amount)}`.
 */
export function formatUsd(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================================
// FUNCIÓN: Formatear precio con símbolo de moneda
// ============================================================

/**
 * Formatea un número como moneda con su símbolo
 */
export function formatCurrency(
  amount: number | string,
  currency: 'VES' | 'USD' | 'EUR' = 'VES'
): string {
  const formatted = formatPrice(amount);
  const symbols = {
    VES: 'Bs. ',
    USD: '$',
    EUR: '€',
  };
  return `${symbols[currency]}${formatted}`;
}

// ============================================================
// FUNCIÓN: Calcular ahorro
// ============================================================

/**
 * Calcula el ahorro entre el precio original y el precio con descuento
 */
export function calculateSavings(
  originalPrice: number,
  discountedPrice: number
): {
  amount: number;
  percentage: number;
} {
  if (originalPrice <= 0 || discountedPrice >= originalPrice) {
    return { amount: 0, percentage: 0 };
  }
  
  const amount = originalPrice - discountedPrice;
  const percentage = (amount / originalPrice) * 100;
  
  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
}

// ============================================================
// FUNCIÓN: Verificar si un producto está en oferta activa
// ============================================================

/**
 * Verifica si un producto está activo en oferta
 * Opcionalmente verifica fechas de inicio y fin
 */
export function isProductOnSale(product: any): boolean {
  if (!product) return false;
  
  const hasDiscount = product.onSale === true && (product.discountPercentage || 0) > 0;
  if (!hasDiscount) return false;
  
  // Verificar fechas si existen
  const startDate = product.discountStartDate;
  const endDate = product.discountEndDate;
  const now = new Date();
  
  if (startDate) {
    const start = new Date(startDate);
    if (start > now) return false; // Aún no ha comenzado
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (end < now) return false; // Ya terminó
  }
  
  return true;
}

// ============================================================
// FUNCIÓN: Obtener badge de descuento
// ============================================================

/**
 * Retorna el texto y color para un badge de descuento
 */
export function getDiscountBadge(discountPercentage: number): {
  text: string;
  color: string;
  bg: string;
} {
  const percentage = Math.min(100, Math.max(0, discountPercentage));
  
  if (percentage === 0) {
    return {
      text: 'Sin oferta',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.15)',
    };
  }
  
  if (percentage >= 50) {
    return {
      text: `🔥 -${percentage}%`,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)',
    };
  }
  
  if (percentage >= 25) {
    return {
      text: `⚡ -${percentage}%`,
      color: '#f59e0b',
      bg: 'rgba(251,191,36,0.15)',
    };
  }
  
  return {
    text: `-${percentage}%`,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
  };
}

// ============================================================
// FUNCIÓN: Obtener precio final de un producto (conveniencia)
// ============================================================

/**
 * Función de conveniencia para obtener el precio final de un producto
 * (con descuento e IVA aplicados)
 */
export function getFinalPrice(
  product: any,
  exchangeRate: number = 0
): {
  ves: number;
  usd: number;
  originalVes: number;
  originalUsd: number;
  hasDiscount: boolean;
  discountPercentage: number;
} {
  const prices = getProductPricesWithDiscount(product, exchangeRate);
  
  return {
    ves: prices.finalVES,
    usd: prices.finalUSD,
    originalVes: prices.originalVES,
    originalUsd: prices.originalUSD,
    hasDiscount: prices.hasDiscount,
    discountPercentage: prices.discountPercentage,
  };
}