// frontend/app/mi-cuenta/components/notifications/components/EnhancedNotificationItem.tsx

import React from 'react';
import { 
  Eye, 
  Trash2, 
  Clock, 
  Package, 
  Calendar,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
  Store
} from 'lucide-react';
import { EnhancedNotification } from '../types';
import { 
  getPaymentConfig, 
  getStatusBadge, 
  getTypeColor,
  formatDate,
  API_BASE_URL
} from '../utils';
import { getImageUrl } from '@/lib/imageUtils';

interface EnhancedNotificationItemProps {
  notification: EnhancedNotification;
  onMarkAsRead: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onOpenOrder: (notification: EnhancedNotification) => void; // 🔥 ESTA FUNCIÓN ABRE EL MODAL
  primary: string;
  textColor: string;
  isDarkBg: boolean;
  borderDynamic: string;
}

export const EnhancedNotificationItem: React.FC<EnhancedNotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onOpenOrder,
  primary,
  textColor,
  isDarkBg,
  borderDynamic,
}) => {
  const hasOrderId = !!(notification.metadata?.orderId || notification.orderId);
  const isService = notification.metadata?.isService || notification.metadata?.orderType === 'service';
  const paymentMethod = notification.metadata?.paymentMethod || '';
  const requiresAction = notification.metadata?.actionRequired || false;

  const paymentConfig = getPaymentConfig(paymentMethod);
  const statusBadge = getStatusBadge(notification.metadata?.status);
  const typeColor = getTypeColor(notification);
  
  const PaymentIcon = paymentConfig.icon;

  // 🔥 OBTENER NOMBRE DE LA TIENDA DESDE METADATA
  const tenantName = notification.metadata?.tenantName || 'Tienda';
  const tenantLogo = notification.metadata?.tenantLogo || null;

  // 🔥 Delegamos a la utilidad central de imágenes
  const buildLogoUrl = (logoPath?: string | null): string => {
    if (!logoPath) return '';
    return getImageUrl(logoPath) || '';
  };

  // 🔥 Prioridad: metadata.tenantAvatarUrl (viene del backend en cada notificación)
  const finalLogoUrl = notification.metadata?.tenantAvatarUrl
    ? getImageUrl(notification.metadata.tenantAvatarUrl)
    : (tenantLogo ? buildLogoUrl(tenantLogo) : null);

  const getIcon = () => {
    if (isService) return Calendar;
    if (notification.type.includes('cancelled')) return XCircle;
    if (notification.type.includes('payment') || notification.type.includes('verified') || notification.type.includes('received')) 
      return CreditCard;
    if (notification.type.includes('completed') || notification.type.includes('delivered') || notification.type.includes('confirmed')) 
      return CheckCircle;
    return Package;
  };

  const IconComponent = getIcon();

  // 🔥 MANEJAR CLICK - ABRE EL MODAL SI TIENE ORDER ID
  const handleClick = () => {
    if (hasOrderId) {
      onOpenOrder(notification); // 🔥 ESTO ABRE EL BuyerOrderDetailModal
    } else {
      if (!notification.read) {
        onMarkAsRead(notification.id);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group w-full p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
        !notification.read ? 'border shadow-sm' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
      } ${!hasOrderId ? 'opacity-70' : ''} hover:shadow-md hover:-translate-y-[1px]`}
      style={{
        borderColor: !notification.read ? primary : borderDynamic,
        backgroundColor: isDarkBg ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',

      }}
    >
      <div className="flex items-start gap-3">
        {/* 🔥 Barra vertical para no-leídas (estilo Linear) */}
        {!notification.read && (
          <span
            className="self-stretch w-[3px] rounded-full shrink-0"
            style={{ backgroundColor: primary }}
          />
        )}
        {/* 🔥 LOGO DE LA TIENDA */}
        <div className="relative">
          <div 
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 ring-2 transition-all duration-200 group-hover:ring-4"
            style={{ 
              ['--tw-ring-color' as any]: !notification.read ? `${primary}40` : borderDynamic,
              backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }}
          > 
            {finalLogoUrl ? (
              <img 
                src={finalLogoUrl} 
                alt={tenantName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Store className="w-5 h-5" style={{ color: textColor, opacity: 0.6 }} />
            )}
          </div>
          {/* Sin dot: el ring del avatar ya indica no-leída */}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Título y fecha */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-bold truncate ${isDarkBg ? 'text-white' : 'text-slate-900'}`}>
                {notification.title}
              </p>
              {requiresAction && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-500">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Acción requerida
                </span>
              )}
              {hasOrderId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-500">
                  <ArrowRight className="w-2.5 h-2.5" />
                  Ver orden
                </span>
              )}
            </div>
            <span className={`text-[10px] ${isDarkBg ? 'text-slate-400' : 'text-slate-600'} shrink-0 flex items-center gap-1`}>
              <Clock className="w-3 h-3" />
              {formatDate(notification.createdAt)}
            </span>
          </div>

          {/* 🔥 NOMBRE DE LA TIENDA */}
          <div className="flex items-center gap-1.5">
            <Store className="w-3 h-3 opacity-40" style={{ color: textColor }} />
            <span className={`text-[10px] font-medium opacity-60 ${isDarkBg ? 'text-slate-300' : 'text-slate-700'}`}>
              {tenantName}
            </span>
          </div>

          {/* Mensaje */}
          <p className={`text-xs ${isDarkBg ? 'text-slate-300' : 'text-slate-700'} line-clamp-2`}>
            {notification.message}
          </p>

          {/* Badges y metadatos */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {statusBadge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
                backgroundColor: statusBadge.bg,
                color: statusBadge.color,
              }}>
                {statusBadge.label}
              </span>
            )}
            
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
              backgroundColor: `${paymentConfig.color}20`,
              color: paymentConfig.color,
            }}>
              <PaymentIcon className="w-3 h-3" />
              {paymentConfig.label}
            </span>

            {notification.metadata?.itemsCount && notification.metadata.itemsCount > 0 && (
              <span className="text-[9px] opacity-60 flex items-center gap-1" style={{ color: textColor }}>
                <Package className="w-3 h-3" />
                {notification.metadata.itemsCount}
              </span>
            )}

            {notification.metadata?.serviceDate && (
              <span className="text-[9px] opacity-60 flex items-center gap-1" style={{ color: textColor }}>
                <Calendar className="w-3 h-3" />
                {notification.metadata.serviceDate}
              </span>
            )}

            {notification.metadata?.serviceTime && (
              <span className="text-[9px] opacity-60 flex items-center gap-1" style={{ color: textColor }}>
                <Clock className="w-3 h-3" />
                {notification.metadata.serviceTime}
              </span>
            )}

            {notification.metadata?.source && (
              <span className="text-[9px] opacity-40 flex items-center gap-1" style={{ color: textColor }}>
                <span className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: textColor }} />
                {notification.metadata.source === 'kiosk' ? 'Kiosk' : 
                 notification.metadata.source === 'admin' ? 'Admin' : 'Web'}
              </span>
            )}
          </div>

          {requiresAction && notification.metadata?.instructions && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] text-amber-500 flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{notification.metadata.instructions}</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Marcar como leída"
              style={{ color: textColor }}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 transition text-rose-500"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {hasOrderId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenOrder(notification); // 🔥 ESTO ABRE EL MODAL
              }}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 transition"
              style={{ color: primary }}
              title="Ver orden"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};