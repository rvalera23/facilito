'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  formatPrice, 
  getOrderTotalVes, 
  getOrderRate,
  roundPrice
} from './hooks/orderUtils';
import { Maximize2, X } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/formatPhone';
import { getBankName } from '@/lib/venezuelanBanks';

interface OrderPDFModalProps {
  order: any;
  tenant: any;
  primary: string;
  secondary?: string;
  textColor?: string;
  isDarkBg?: boolean;
  onClose: () => void;
}

// 🔥 FUNCIÓN PARA OBTENER URL DEL COMPROBANTE
const getProofUrl = (proofPath: string, apiBase: string) => {
  if (!proofPath) return null;
  if (proofPath.includes('localhost')) {
    return proofPath.replace(/http:\/\/localhost:\d+/, apiBase).replace(/https:\/\/localhost:\d+/, apiBase);
  }
  if (proofPath.startsWith('http://') || proofPath.startsWith('https://')) return proofPath;
  if (proofPath.startsWith('/')) return `${apiBase}${proofPath}`;
  return `${apiBase}/${proofPath}`;
};

const isImageFile = (url: string) => {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function OrderPDFModal({
  order,
  tenant,
  primary,
  secondary,
  textColor,
  isDarkBg = false,
  onClose,
}: OrderPDFModalProps) {
  const [isProofZoomed, setIsProofZoomed] = useState(false);

  console.log('📄 OrderPDFModal montado', { order, tenant });

  if (!order) {
    console.warn('⚠️ OrderPDFModal: No hay orden');
    return null;
  }

  // 🔥 OBTENER DATOS DEL USUARIO DESDE localStorage
  const getUserData = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          name: user.name || user.fullName || user.nombre || '',
          email: user.email || user.correo || '',
          phone: user.phone || user.telefono || user.celular || user.phoneNumber || ''
        };
      }
    } catch (e) {
      console.error('Error al obtener datos del usuario:', e);
    }
    return {
      name: order.customerName || '',
      email: order.customerEmail || '',
      phone: order.customerPhone || ''
    };
  };

  const userData = getUserData();

  // 🔥 OBTENER DATOS DEL TENANT
  const tenantName = tenant?.name || 'Mi Comercio';
  const tenantSlogan = tenant?.slogan || tenant?.tagline || '';
  const tenantLogo = tenant?.logoUrl || tenant?.logo || tenant?.image || '';
  const tenantPhone = tenant?.phone || tenant?.contactPhone || '';
  const tenantEmail = tenant?.email || tenant?.contactEmail || '';
  const tenantAddress = tenant?.address || tenant?.location || '';

  // 🔥 OBTENER DATOS DEL PAGO REPORTADO (DESDE paymentMetadata)
  const paymentMetadata = order.paymentMetadata || {};
  const orderPaymentProof = paymentMetadata.paymentProof || order.paymentProof;
  const hasPaymentProof = !!orderPaymentProof;
  const paymentBankSource = getBankName(paymentMetadata.bankSource || order.bankSource || '');
    const paymentRef = paymentMetadata.paymentReference || order.paymentReference || '';
  // 🔥 LEER CÉDULA Y TELÉFONO DESDE paymentMetadata
  const clientIdNumber = paymentMetadata.clientIdNumber || order.clientIdNumber || '';
  const clientIdType = paymentMetadata.clientIdType || order.clientIdType || 'V';
  const clientPhoneFromReport = paymentMetadata.clientPhone || order.clientPhone || '';
  const proofUrl = hasPaymentProof ? getProofUrl(orderPaymentProof, API_BASE) : null;

  // 🔥 DETECTAR SI ES PAGO MÓVIL
  const isPagoMovil = order.paymentMethodUsed?.toLowerCase().includes('pago') || 
                       order.paymentMethodUsed?.toLowerCase().includes('movil');

  // 🔥 CALCULAR TOTALES USANDO LAS MISMAS FUNCIONES DEL HOOK
  const orderRate = getOrderRate(order);
  const subtotalVes = getOrderTotalVes(order);
  const shippingVes = order.shippingCost ? Number(order.shippingCost) * orderRate : 0;
  const taxVes = order.tax ? Number(order.tax) * orderRate : 0;
  const totalVes = subtotalVes + shippingVes + taxVes;
  const totalUsd = (order.totalAmount || 0) + (order.shippingCost || 0) + (order.tax || 0);
  const items = Array.isArray(order.items) ? order.items : [];

  // 🔥 FUNCIÓN LOCAL PARA OBTENER PRECIO EN VES (SOLO PARA ESTE MODAL)
  const getItemPriceVes = (item: any): number => {
    if (item.price !== undefined && item.price !== null && item.price !== 0) {
      const price = Number(item.price);
      if (price > 1000) {
        return price;
      }
      const rate = getOrderRate(order);
      if (rate > 0 && price < 1000) {
        return roundPrice(price * rate);
      }
      return price;
    }
    if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== 0) {
      const price = Number(item.unitPrice);
      if (price > 1000) {
        return price;
      }
      const rate = getOrderRate(order);
      if (rate > 0 && price < 1000) {
        return roundPrice(price * rate);
      }
      return price;
    }
    if (item.prices?.VES !== undefined && item.prices?.VES !== null && item.prices?.VES !== 0) {
      return Number(item.prices.VES);
    }
    if (item.priceVes !== undefined && item.priceVes !== null && item.priceVes !== 0) {
      return Number(item.priceVes);
    }
    return 0;
  };

  // 🔥 ESTADO DE LA ORDEN EN ESPAÑOL
  const getStatusLabel = (status: string): string => {
    const normalized = status?.toLowerCase() || '';
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'pending_local': 'Pendiente',
      'por_verificar': 'Verificando',
      'verificando': 'Verificando',
      'confirmed': 'Verificado',
      'verificado': 'Verificado',
      'completed': 'Completado',
      'cancelled': 'Cancelado',
    };
    return statusMap[normalized] || status || 'Desconocido';
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ 
          backgroundColor: secondary || (isDarkBg ? '#0f172a' : '#ffffff'),
          color: textColor || (isDarkBg ? '#f1f5f9' : '#0f172a')
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========== HEADER PROFESIONAL ========== */}
        <div 
          className="p-8 border-b text-center"
          style={{ 
            borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
          }}
        >
          {tenantLogo ? (
            <img 
              src={tenantLogo} 
              alt={tenantName} 
              className="max-h-20 mx-auto object-contain mb-3"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: primary }}>
              {tenantName}
            </h1>
          )}
          
          {tenantSlogan && (
            <p className="text-sm opacity-60 mt-1">{tenantSlogan}</p>
          )}
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs opacity-50 mt-2">
            {tenantPhone && <span>📞 {formatPhoneDisplay(tenantPhone, tenant?.country_code || tenant?.countryCode)}</span>}
                        {tenantEmail && <span>✉️ {tenantEmail}</span>}
            {tenantAddress && <span>📍 {tenantAddress}</span>}
          </div>
          
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-widest" style={{ color: primary }}>
              FACTURA
            </h2>
            <p className="text-xs opacity-50 mt-1 font-mono">
              #{order.id?.slice(0, 12) || 'N/A'} • {new Date(order.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* ========== CONTENIDO ========== */}
        <div className="p-8 space-y-6">
          {/* Datos del cliente y estado */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="opacity-50 text-xs uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-semibold mt-0.5">{userData.name || order.customerName || order.userName || 'Cliente'}</p>
              {userData.email && <p className="opacity-60 text-xs">{userData.email}</p>}
              {userData.phone && <p className="opacity-60 text-xs">Tel: {formatPhoneDisplay(userData.phone)}</p>}
                          </div>
            <div className="text-right">
              <p className="opacity-50 text-xs uppercase font-bold tracking-wider">Estado</p>
              <p className="font-semibold mt-0.5" style={{ color: primary }}>
                {getStatusLabel(order.status)}
              </p>
              <p className="opacity-50 text-xs uppercase font-bold tracking-wider mt-2">Fecha de Emisión</p>
              <p className="font-semibold mt-0.5">
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }) : 'N/A'}
              </p>
            </div>
          </div>

          {/* 🔥 SECCIÓN COMPROBANTE DE PAGO - CON TODOS LOS DATOS DE PAGO MÓVIL */}
          {hasPaymentProof && (
            <div 
              className="p-4 rounded-xl border"
              style={{ 
                borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
              }}
            >
              <p className="opacity-50 text-xs uppercase font-bold tracking-wider mb-2">Comprobante de Pago</p>
              
              {/* 🔥 DATOS DEL REPORTE DE PAGO MÓVIL (TODOS) */}
              {isPagoMovil && (
                <div className="space-y-1 text-sm mb-3">
                  {clientIdNumber && (
                    <div>
                      <span className="opacity-50">Cédula reportada:</span>
                      <span className="font-medium ml-1">{clientIdType}-{clientIdNumber}</span>
                    </div>
                  )}
                  {clientPhoneFromReport && (
                    <div>
                      <span className="opacity-50">Teléfono reportado:</span>
                      <span className="font-medium ml-1">{formatPhoneDisplay(clientPhoneFromReport)}</span>
                    </div>
                  )}
                  {paymentBankSource && (
                    <div>
                      <span className="opacity-50">Banco origen:</span>
                      <span className="font-medium ml-1">{paymentBankSource}</span>
                    </div>
                  )}
                  {paymentRef && (
                    <div>
                      <span className="opacity-50">Referencia:</span>
                      <span className="font-medium ml-1 font-mono">{paymentRef}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Datos del pago para otros métodos */}
              {!isPagoMovil && (paymentBankSource || paymentRef) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                  {paymentBankSource && (
                    <div>
                      <span className="opacity-50">Banco origen:</span>
                      <span className="font-medium ml-1">{paymentBankSource}</span>
                    </div>
                  )}
                  {paymentRef && (
                    <div>
                      <span className="opacity-50">Referencia:</span>
                      <span className="font-medium ml-1 font-mono">{paymentRef}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Imagen del comprobante */}
              {proofUrl && (
                <div 
                  className="rounded-xl overflow-hidden border cursor-pointer transition hover:scale-[1.01]"
                  style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                  onClick={() => setIsProofZoomed(true)}
                >
                  {isImageFile(orderPaymentProof) ? (
                    <div className="relative">
                      <img 
                        src={proofUrl} 
                        alt="Comprobante de pago" 
                        className="w-full max-h-48 object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="text-center p-4">
                                <span class="text-xs opacity-50">Comprobante subido</span>
                                <a href="${proofUrl}" target="_blank" rel="noopener noreferrer" 
                                   class="block mt-1 text-xs font-bold underline" style="color: ${primary}">
                                  Abrir imagen
                                </a>
                              </div>
                            `;
                          }
                        }}
                      />
                      <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-70 hover:opacity-100 transition">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <span className="text-xs opacity-50">Comprobante en PDF</span>
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs font-bold underline" style={{ color: primary }}>
                        Ver PDF
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabla de productos */}
          {items.length > 0 && (
            <div className="mt-4">
              <p className="opacity-50 text-xs uppercase font-bold tracking-wider mb-2">Detalle de Productos</p>
              <div className="border rounded-xl overflow-hidden" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                <table className="w-full text-sm">
                  <thead className="opacity-60 text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left">Cant.</th>
                      <th className="px-4 py-3 text-left">Producto</th>
                      <th className="px-4 py-3 text-right">Precio Unit.</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => {
                      const quantity = Number(item.quantity || item.qty || 1);
                      const priceVes = getItemPriceVes(item);
                      const totalItem = roundPrice(priceVes * quantity);
                      const itemName = item.name || item.productName || item.title || 'Producto';
                      
                      return (
                        <tr key={idx} className="border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <td className="px-4 py-3 font-mono">{quantity}</td>
                          <td className="px-4 py-3">{itemName}</td>
                          <td className="px-4 py-3 text-right font-mono">Bs. {formatPrice(priceVes)}</td>
                          <td className="px-4 py-3 text-right font-bold font-mono" style={{ color: primary }}>
                            Bs. {formatPrice(totalItem)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== TOTALES CON USD DEBAJO ========== */}
          <div className="flex flex-col items-end gap-1 pt-4 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-6 text-sm">
              <span className="opacity-60">Subtotal:</span>
              <span className="font-mono font-semibold">Bs. {formatPrice(subtotalVes)}</span>
            </div>
            {Number(order.shippingCost) > 0 && (
              <div className="flex items-center gap-6 text-sm">
                <span className="opacity-60">Envío:</span>
                <span className="font-mono">Bs. {formatPrice(shippingVes)}</span>
              </div>
            )}
            {Number(order.tax) > 0 && (
              <div className="flex items-center gap-6 text-sm">
                <span className="opacity-60">Impuestos:</span>
                <span className="font-mono">Bs. {formatPrice(taxVes)}</span>
              </div>
            )}
            
            <div className="flex flex-col items-end pt-3 border-t w-full" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-6 text-lg">
                <span className="font-bold">TOTAL:</span>
                <span className="font-extrabold" style={{ color: primary }}>
                  Bs. {formatPrice(totalVes)}
                </span>
              </div>
              <div className="text-xs font-mono opacity-60 mt-0.5">
                ${formatPrice(totalUsd)}
              </div>
            </div>
          </div>

          {/* Método de pago */}
          {order.paymentMethodUsed && (
            <div className="text-sm pt-2">
              <p className="opacity-50 text-xs uppercase font-bold tracking-wider">Método de Pago</p>
              <p className="font-medium capitalize">{order.paymentMethodUsed}</p>
              {order.paymentReference && <p className="opacity-60 text-xs">Referencia: {order.paymentReference}</p>}
            </div>
          )}

          {/* Pie de factura */}
          <div className="text-center text-xs opacity-40 pt-4 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <p>Gracias por tu compra</p>
            <p className="mt-0.5">Este documento es un comprobante de pago válido</p>
          </div>
        </div>

        {/* ========== BOTONES ========== */}
        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border transition hover:opacity-70"
            style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2 text-sm font-bold rounded-xl text-white shadow-lg hover:opacity-90 transition flex items-center gap-2"
            style={{ backgroundColor: primary }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* 🔥 MODAL ZOOM COMPROBANTE */}
      {isProofZoomed && hasPaymentProof && proofUrl && (
        <div 
          className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setIsProofZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <button 
              type="button" 
              onClick={() => setIsProofZoomed(false)} 
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/40 transition cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            {isImageFile(orderPaymentProof) ? (
              <img 
                src={proofUrl} 
                alt="Comprobante Ampliado" 
                className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl border border-white/10" 
              />
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg">
                <div className="text-center">
                  <span className="text-lg font-bold">Comprobante en PDF</span>
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block mt-4 text-sm font-bold underline" style={{ color: primary }}>
                    Abrir PDF
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}