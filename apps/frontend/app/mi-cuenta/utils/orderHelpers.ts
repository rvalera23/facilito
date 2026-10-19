// utils/orderHelpers.ts

// 🔥 Determinar si una orden es de servicio
export const isServiceOrder = (order: any): boolean => {
  if (!order) return false;
  if (order.orderType === 'service') return true;
  if (order.serviceDetails) return true;
  if (order.items && Array.isArray(order.items)) {
    return order.items.some((item: any) => item.type === 'service');
  }
  return false;
};

// 🔥 Determinar si una orden es de producto
export const isProductOrder = (order: any): boolean => {
  if (!order) return false;
  if (order.orderType === 'delivery') return true;
  if (order.items && Array.isArray(order.items)) {
    return order.items.some((item: any) => item.type === 'product' || !item.type);
  }
  return false;
};

// 🔥 Obtener el tipo principal de la orden
export const getOrderMainType = (order: any): 'product' | 'service' | 'mixed' => {
  if (!order) return 'product';
  
  const hasProduct = order.items?.some((item: any) => item.type === 'product' || !item.type);
  const hasService = order.items?.some((item: any) => item.type === 'service');
  
  if (hasProduct && hasService) return 'mixed';
  if (hasService) return 'service';
  return 'product';
};

// 🔥 Obtener detalles del servicio
export const getServiceDetails = (order: any): {
  date?: string;
  time?: string;
  duration?: number;
  professionalName?: string;
} | null => {
  if (!order) return null;
  
  if (order.serviceDetails) {
    return {
      date: order.serviceDetails.date,
      time: order.serviceDetails.time,
      duration: order.serviceDetails.duration,
      professionalName: order.serviceDetails.professionalName,
    };
  }
  
  if (order.items && Array.isArray(order.items)) {
    const serviceItem = order.items.find((item: any) => item.type === 'service');
    if (serviceItem) {
      return {
        date: serviceItem.appointmentDate,
        time: serviceItem.appointmentTime,
        duration: serviceItem.durationMinutes,
        professionalName: serviceItem.professionalName,
      };
    }
  }
  
  return null;
};

// 🔥 Obtener nombre del servicio
export const getServiceName = (order: any): string => {
  if (!order) return '';
  if (order.items && Array.isArray(order.items)) {
    const serviceItem = order.items.find((item: any) => item.type === 'service');
    if (serviceItem) return serviceItem.name || '';
  }
  return '';
};

// 🔥 Obtener nombres de productos
export const getProductNames = (order: any): string => {
  if (!order) return '';
  if (order.items && Array.isArray(order.items)) {
    const products = order.items.filter((item: any) => item.type === 'product' || !item.type);
    return products.map((item: any) => item.name || '').filter(Boolean).join(', ');
  }
  return '';
};

// 🔥 Etiqueta amigable para el tipo (SIN EMOJIS)
export const getOrderTypeLabel = (type: 'product' | 'service' | 'mixed'): string => {
  const labels = {
    product: 'Producto',
    service: 'Servicio',
    mixed: 'Mixto',
  };
  return labels[type] || 'Producto';
};

// 🔥 Configuración de badge (SIN PUNTO)
export const getOrderTypeBadgeConfig = (type: 'product' | 'service' | 'mixed', isDarkBg: boolean) => {
  const configs = {
    product: {
      style: isDarkBg 
        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
        : 'bg-blue-100 text-blue-800 border-blue-300 font-semibold',
    },
    service: {
      style: isDarkBg 
        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
        : 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
    },
    mixed: {
      style: isDarkBg 
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
        : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
    },
  };
  return configs[type] || configs.product;
};