// OrdersTableRow.tsx
'use client';

import React from 'react';
import { Calendar, Package, Tag } from 'lucide-react';

interface OrdersTableRowProps {
  order: any;
  index: number;
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  subtleBorderColor: string;
  userProducts?: any[];
  bsRate?: number;
  ivaRate?: number;
}

// 🔥 BACKEND URL FIJA - PUERTO 3000
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// 🔥 FORMATO DE PRECIOS
const formatPrice = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return '0,00';
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🔥 DETECTAR SI ES CITA
const isAppointment = (order: any): boolean => {
  if (!order) return false;
  if (order._sourceType === 'appointment') return true;
  if (order.serviceName || order.serviceId || order.bookingDate) return true;
  if (order.serviceDetails) return true;
  if (order.items && Array.isArray(order.items)) {
    for (const item of order.items) {
      if (item.type === 'service' || item.itemType === 'service' || item.serviceId) {
        return true;
      }
    }
  }
  return false;
};

// 🔥 OBTENER EL TOTAL EN VES
const getTotalVes = (order: any): number => {
  if (isAppointment(order)) {
    if (order.priceVes) return Number(order.priceVes);
    if (order.price) {
      const rate = order.rate || order.exchangeRate || 0;
      return rate > 0 ? Number(order.price) * rate : Number(order.price);
    }
    if (order.totalAmountVes) return Number(order.totalAmountVes);
    if (order.totalVes) return Number(order.totalVes);
    if (order.total) return Number(order.total);
    return 0;
  }

  if (order.totalAmountVes) return Number(order.totalAmountVes);
  if (order.totalVes) return Number(order.totalVes);
  if (order.total) return Number(order.total);
  return 0;
};

// 🔥 OBTENER EL TOTAL EN USD
const getTotalUsd = (order: any): number => {
  if (isAppointment(order)) {
    if (order.price) return Number(order.price);
    if (order.totalAmount) return Number(order.totalAmount);
    if (order.totalUsd) return Number(order.totalUsd);
    return 0;
  }
  return Number(order.totalAmount || 0);
};

// 🔥 OBTENER EL MÉTODO DE PAGO
const getPaymentMethod = (order: any): string => {
  if (isAppointment(order)) {
    return order.paymentMethod || order.paymentMethodUsed || 'No especificado';
  }
  return order.paymentMethodUsed || order.paymentMethod || 'No especificado';
};

// 🔥 OBTENER NOMBRE DEL PRODUCTO/SERVICIO
const getItemName = (order: any): string => {
  if (isAppointment(order)) {
    return order.serviceName || order.name || order.title || order.service?.name || 'Servicio';
  }
  const firstItem = order.items?.[0];
  if (firstItem) {
    return firstItem.name || firstItem.productName || firstItem.title || 'Producto';
  }
  return 'Producto';
};

// 🔥 OBTENER IMAGEN - CON API_BASE FIJO (PUERTO 3000)
const getOrderImage = (order: any, userProducts: any[] = []): string | null => {
  if (!order) return null;
  
  // 1. Si es cita
  if (isAppointment(order)) {
    const img = order.coverImage || order.image || order.photo || '';
    if (img) {
      if (img.startsWith('http')) return img;
      // 🔥 FORZAR AL BACKEND (PUERTO 3000)
      return img.startsWith('/') ? `${API_BASE}${img}` : `${API_BASE}/${img}`;
    }
    return null;
  }
  
  // 2. Si es producto - BUSCAR EN userProducts usando productId
  const firstItem = order.items?.[0];
  if (!firstItem) return null;
  
  // 🔥 2.1 BUSCAR EN userProducts (LA IMAGEN DEL PRODUCTO ORIGINAL)
  if (firstItem.productId && userProducts && userProducts.length > 0) {
    const foundProduct = userProducts.find((p: any) => 
      p.id === firstItem.productId || p._id === firstItem.productId
    );
    if (foundProduct) {
      // Buscar la imagen en el producto
      const img = foundProduct.coverImage || 
                  foundProduct.image || 
                  foundProduct.photo || 
                  foundProduct.img ||
                  (foundProduct.mediaUrls && foundProduct.mediaUrls.length > 0 ? foundProduct.mediaUrls[0] : null) ||
                  (foundProduct.images && foundProduct.images.length > 0 ? foundProduct.images[0] : null) ||
                  '';
      if (img) {
        if (img.startsWith('http')) return img;
        // 🔥 FORZAR AL BACKEND (PUERTO 3000)
        return img.startsWith('/') ? `${API_BASE}${img}` : `${API_BASE}/${img}`;
      }
    }
  }
  
  // 🔥 2.2 BUSCAR DIRECTAMENTE EN EL ITEM
  const directImg = firstItem.coverImage || 
                    firstItem.image || 
                    firstItem.photo || 
                    firstItem.img ||
                    firstItem.picture ||
                    (firstItem.mediaUrls && firstItem.mediaUrls.length > 0 ? firstItem.mediaUrls[0] : null) ||
                    (firstItem.images && firstItem.images.length > 0 ? firstItem.images[0] : null) ||
                    '';
  
  if (directImg) {
    if (directImg.startsWith('http')) return directImg;
    // 🔥 FORZAR AL BACKEND (PUERTO 3000)
    return directImg.startsWith('/') ? `${API_BASE}${directImg}` : `${API_BASE}/${directImg}`;
  }
  
  return null;
};

// 🔥 BADGE DE IVA
const getIvaBadge = (order: any): { display: string; color: string; bg: string } => {
  if (order.ivaInfo) {
    return {
      display: order.ivaInfo.display || 'IVA',
      color: order.ivaInfo.badgeColor || '#64748b',
      bg: order.ivaInfo.badgeBg || 'rgba(100,116,139,0.15)'
    };
  }
  return { display: 'Sin IVA', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
};

// 🔥 BADGE DE DESCUENTO
const getDiscountBadge = (order: any): { hasDiscount: boolean; percentage: number } => {
  let maxDiscount = 0;
  let hasDiscount = false;
  
  if (order.items && Array.isArray(order.items)) {
    for (const item of order.items) {
      if (item.discountInfo && item.discountInfo.discountPercentage > 0) {
        hasDiscount = true;
        const pct = Number(item.discountInfo.discountPercentage);
        if (pct > maxDiscount) maxDiscount = pct;
      }
    }
  }
  
  return { hasDiscount, percentage: maxDiscount };
};

// 🔥 OBTENER ESTADO AMIGABLE
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Pendiente',
    'pendiente': 'Pendiente',
    'por_pagar': 'Por Pagar',
    'por_verificar': 'Por Verificar',
    'verificando': 'Verificando',
    'en_verificacion': 'En Verificación',
    'verificado': 'Verificado',
    'completed': 'Completada',
    'completada': 'Completada',
    'pagado': 'Pagado',
    'aprobado': 'Aprobado',
    'cancelled': 'Cancelada',
    'cancelada': 'Cancelada',
    'rechazado': 'Rechazada',
    'rechazada': 'Rechazada',
    'in_progress': 'En Progreso',
    'en_progreso': 'En Progreso',
    'confirmed': 'Confirmada',
    'confirmada': 'Confirmada',
    'no_show': 'No Asistió',
    'no_asistio': 'No Asistió',
  };
  return statusMap[status?.toLowerCase()] || status || 'Desconocido';
};

export default function OrdersTableRow({
  order,
  index,
  primary,
  textColor,
  isDarkBg,
  subtleBorderColor,
  userProducts = [],
}: OrdersTableRowProps) {
  const isServicio = isAppointment(order);
  
  const totalVes = getTotalVes(order);
  const totalUsd = getTotalUsd(order);
  const itemName = getItemName(order);
  const orderImage = getOrderImage(order, userProducts);
  const paymentMethod = getPaymentMethod(order);
  const ivaBadge = getIvaBadge(order);
  const discount = getDiscountBadge(order);
  
  const status = order.status || 'pendiente';
  const statusLabel = getStatusLabel(status);
  
  const orderDate = order.createdAt || order.date || order.scheduledDate || new Date().toISOString();
  const formattedDate = new Date(orderDate).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const rowStyles: React.CSSProperties = {
    borderBottom: `1px solid ${subtleBorderColor}`,
    borderLeft: isServicio ? '3px solid #f59e0b' : '3px solid transparent',
    backgroundColor: isServicio ? (isDarkBg ? 'rgba(251,191,36,0.05)' : 'rgba(251,191,36,0.03)') : 'transparent',
  };

  const typeBadge = isServicio ? (
    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1" style={{
      backgroundColor: 'rgba(251,191,36,0.15)',
      borderColor: 'rgba(251,191,36,0.3)',
      color: '#f59e0b'
    }}>
      <Calendar className="w-2.5 h-2.5" /> Servicio
    </span>
  ) : (
    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1" style={{
      backgroundColor: 'rgba(59,130,246,0.15)',
      borderColor: 'rgba(59,130,246,0.3)',
      color: '#3b82f6'
    }}>
      <Package className="w-2.5 h-2.5" /> Producto
    </span>
  );

  const getStatusColor = (status: string): { color: string; borderColor: string; bgColor: string } => {
    const s = status.toLowerCase();
    if (s.includes('canc') || s.includes('rechaz')) {
      return { color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', bgColor: 'rgba(239,68,68,0.1)' };
    }
    if (s.includes('complet') || s.includes('pagad') || s.includes('aprobado')) {
      return { color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)', bgColor: 'rgba(34,197,94,0.1)' };
    }
    if (s.includes('verif') || s.includes('pend')) {
      return { color: '#f59e0b', borderColor: 'rgba(251,191,36,0.3)', bgColor: 'rgba(251,191,36,0.1)' };
    }
    return { color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', bgColor: 'rgba(59,130,246,0.1)' };
  };

  const statusStyle = getStatusColor(status);

  return (
    <tr style={rowStyles} className="group hover:bg-white/5 transition-colors">
      <td className="py-2.5 px-3 pl-4 font-mono text-[11px] font-bold align-middle" style={{ color: textColor }}>
        #{order.id ? order.id.slice(0, 8) : (order._id ? order._id.slice(0, 8) : `${index + 1}`)}
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {typeBadge}
          {discount.hasDiscount && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 animate-pulse" style={{
              backgroundColor: 'rgba(239,68,68,0.2)',
              borderColor: 'rgba(239,68,68,0.3)',
              color: '#f87171'
            }}>
              <Tag className="w-2.5 h-2.5" /> -{discount.percentage}%
            </span>
          )}
        </div>
      </td>

      <td className="py-2.5 px-2 align-middle text-center">
        <div className="w-10 h-10 rounded-xl overflow-hidden border flex items-center justify-center mx-auto" style={{ borderColor: subtleBorderColor }}>
          {orderImage ? (
            <img
              src={orderImage}
              alt={itemName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).src = '';
              }}
            />
          ) : (
            <span className="text-[8px] opacity-30">Sin foto</span>
          )}
        </div>
      </td>

      <td className="py-2.5 px-3 align-middle">
        <div className="font-medium text-[11px]" style={{ color: textColor }}>
          {itemName}
        </div>
        {isServicio && order.professionalName && (
          <div className="text-[9px] opacity-50">Con {order.professionalName}</div>
        )}
        {!isServicio && order.items && order.items.length > 1 && (
          <div className="text-[9px] opacity-50">+{order.items.length - 1} más</div>
        )}
      </td>

      <td className="py-2.5 px-3 align-middle">
        <div className="font-bold" style={{ color: primary }}>
          Bs. {formatPrice(totalVes)}
        </div>
        <div className="text-[10px] opacity-50">
          ${formatPrice(totalUsd)}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span 
            className="text-[7px] font-bold px-1 py-0.5 rounded-full border"
            style={{
              backgroundColor: ivaBadge.bg,
              borderColor: `${ivaBadge.color}30`,
              color: ivaBadge.color
            }}
          >
            {ivaBadge.display}
          </span>
        </div>
      </td>

      <td className="py-2.5 px-3 align-middle">
        <div className="text-[11px]" style={{ color: textColor }}>
          {paymentMethod}
        </div>
        {order.paymentReference && (
          <div className="text-[9px] opacity-50 font-mono truncate max-w-[100px]">
            Ref: {order.paymentReference}
          </div>
        )}
      </td>

      <td className="py-2.5 px-3 align-middle">
        <span 
          className="text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block capitalize"
          style={{
            color: statusStyle.color,
            borderColor: statusStyle.borderColor,
            backgroundColor: statusStyle.bgColor,
          }}
        >
          {statusLabel}
        </span>
      </td>

      <td className="py-2.5 px-3 pr-4 align-middle">
        <div className="text-[11px] opacity-70" style={{ color: textColor }}>
          {formattedDate}
        </div>
      </td>
    </tr>
  );
}