// backend/src/modules/notifications/enhanced-notification.service.ts

import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PAYMENT_TEMPLATES, PAYMENT_METHODS_REQUIRING_ACTION } from './payment-templates';
import { OrderEntity } from '../orders/entities/order.entity';

/**
 * 🚀 SERVICIO MEJORADO - NO MODIFICA EL CÓDIGO EXISTENTE
 * Extiende las funcionalidades sin romper nada
 */
@Injectable()
export class EnhancedNotificationService {
  constructor(
    private readonly notificationsService: NotificationsService
  ) {}

  /**
   * Normaliza el método de pago
   */
  private normalizePaymentMethod(method: string): string {
    if (!method) return 'cash';
    
    const normalized = method.toLowerCase().trim();
    
    const map: Record<string, string> = {
      'efectivo': 'cash',
      'cash': 'cash',
      'pago móvil': 'pago_movil',
      'pago movil': 'pago_movil',
      'pago_movil': 'pago_movil',
      'mobile': 'pago_movil',
      'punto de venta': 'punto_de_venta',
      'punto_de_venta': 'punto_de_venta',
      'pos': 'punto_de_venta',
      'tarjeta': 'card',
      'card': 'card',
      'transferencia': 'bank_transfer',
      'transferencia bancaria': 'bank_transfer',
      'bank_transfer': 'bank_transfer',
      'transfer': 'bank_transfer',
      'zelle': 'zelle',
      'biopago': 'biopago',
      'binance': 'binance',
      'binance pay': 'binance',
    };

    return map[normalized] || 'cash';
  }

  /**
   * Verifica si requiere acción
   */
  requiresAction(paymentMethod: string): boolean {
    const method = this.normalizePaymentMethod(paymentMethod);
    return PAYMENT_METHODS_REQUIRING_ACTION.includes(method as any);
  }

  /**
   * Obtiene el template de pago
   */
  getPaymentTemplate(paymentMethod: string) {
    const method = this.normalizePaymentMethod(paymentMethod);
    return PAYMENT_TEMPLATES[method as any] || PAYMENT_TEMPLATES.cash;
  }

  /**
   * 🔥 NUEVO MÉTODO: Crea notificaciones mejoradas SIN TOCAR el método existente
   */
  async createEnhancedOrderNotifications(order: OrderEntity): Promise<void> {
    const buyerId = order.userId;
    const tenantId = order.tenantId;
    const isBooking = this.isBookingOrder(order);
    const orderIdShort = order.id.slice(0, 8);
    const paymentMethod = order.paymentMethodUsed || 'No especificado';
    const template = this.getPaymentTemplate(paymentMethod);
    const requiresAction = this.requiresAction(paymentMethod);
    const typeLabel = isBooking ? 'cita' : 'pedido';
    const orderType = isBooking ? 'booking' : 'order';

    const totalFormatted = order.totalAmountVes 
      ? `Bs. ${Number(order.totalAmountVes).toFixed(2)}` 
      : `$${Number(order.totalAmount).toFixed(2)}`;

    // ============================================================
    // NOTIFICACIÓN MEJORADA PARA COMPRADOR
    // ============================================================
    if (buyerId) {
      await this.notificationsService.create({
        userId: buyerId,
        tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: isBooking ? 'booking_created' : 'order_created',
        title: isBooking 
          ? 'Cita creada' 
          : 'Pedido creado',
        message: isBooking
          ? `Tu cita #${orderIdShort} ha sido creada. ${template.buyer.message}`
          : `Tu pedido #${orderIdShort} ha sido creado. ${template.buyer.message}`,
        source: 'buyer',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: paymentMethod,
          paymentReference: order.paymentReference,
          status: order.status,
          customerName: order.customerName,
          itemsCount: order.items?.length || 0,
          actionRequired: requiresAction,
          instructions: template.buyer.instructions,
          nextSteps: template.buyer.nextSteps,
          bankSource: order.bankSource,
          paymentMetadata: order.paymentMetadata,
          ...this.getBookingData(order),
        },
      });
    }

    // ============================================================
    // NOTIFICACIÓN MEJORADA PARA VENDEDOR
    // ============================================================
    const ownerId = await this.getTenantOwnerId(tenantId);
    if (ownerId) {
      await this.notificationsService.create({
        userId: ownerId,
        tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: isBooking ? 'booking_created' : 'order_created',
        title: isBooking 
          ? 'Nueva cita recibida' 
          : 'Nuevo pedido recibido',
        message: isBooking
          ? `${order.customerName} ha solicitado una cita por ${totalFormatted}. ${template.seller.message}`
          : `${order.customerName} ha realizado un pedido por ${totalFormatted}. ${template.seller.message}`,
        source: 'seller',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: paymentMethod,
          paymentReference: order.paymentReference,
          items: order.items,
          status: order.status,
          actionRequired: template.seller.actionRequired,
          instructions: template.seller.instructions,
          verificationSteps: template.seller.verificationSteps,
          bankSource: order.bankSource,
          paymentMetadata: order.paymentMetadata,
          ...this.getBookingData(order),
        },
      });
    }
  }

  /**
   * 🔥 NUEVO MÉTODO: Notificación de pago confirmado mejorada
   */
  async createEnhancedPaymentConfirmedNotification(order: OrderEntity): Promise<void> {
    const buyerId = order.userId;
    const tenantId = order.tenantId;
    const isBooking = this.isBookingOrder(order);
    const idShort = order.id.slice(0, 8);
    const paymentMethod = order.paymentMethodUsed || 'No especificado';
    const template = this.getPaymentTemplate(paymentMethod);
    const typeLabel = isBooking ? 'cita' : 'pedido';
    const orderType = isBooking ? 'booking' : 'order';

    // Notificación para COMPRADOR
    if (buyerId) {
      await this.notificationsService.create({
        userId: buyerId,
        tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: 'payment_verified',
        title: template.buyer.title,
        message: template.buyer.message,
        source: 'buyer',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: paymentMethod,
          paymentReference: order.paymentReference,
          actionRequired: template.buyer.actionRequired,
          instructions: template.buyer.instructions,
          nextSteps: template.buyer.nextSteps,
          bankSource: order.bankSource,
          paymentMetadata: order.paymentMetadata,
          ...this.getBookingData(order),
        },
      });
    }

    // Notificación para VENDEDOR
    const ownerId = await this.getTenantOwnerId(tenantId);
    if (ownerId) {
      await this.notificationsService.create({
        userId: ownerId,
        tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: 'payment_received',
        title: template.seller.title,
        message: isBooking
          ? `${order.customerName} ha realizado el pago de la ${typeLabel} #${idShort}. ${template.seller.message}`
          : `${order.customerName} ha realizado el pago del ${typeLabel} #${idShort}. ${template.seller.message}`,
        source: 'seller',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: paymentMethod,
          paymentReference: order.paymentReference,
          actionRequired: template.seller.actionRequired,
          instructions: template.seller.instructions,
          verificationSteps: template.seller.verificationSteps,
          bankSource: order.bankSource,
          paymentMetadata: order.paymentMetadata,
          ...this.getBookingData(order),
        },
      });
    }
  }

  /**
   * 🔥 NUEVO MÉTODO: Notificación de orden completada
   */
  async createEnhancedOrderCompletedNotification(order: OrderEntity): Promise<void> {
    const buyerId = order.userId;
    const isBooking = this.isBookingOrder(order);
    const orderIdShort = order.id.slice(0, 8);
    const orderType = isBooking ? 'booking' : 'order';

    if (buyerId) {
      await this.notificationsService.create({
        userId: buyerId,
        tenantId: order.tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: isBooking ? 'booking_completed' : 'order_delivered',
        title: isBooking 
          ? 'Cita completada' 
          : 'Pedido entregado',
        message: isBooking
          ? `Tu cita #${orderIdShort} ha sido completada exitosamente.`
          : `Tu pedido #${orderIdShort} ha sido entregado. ¡Disfruta tu compra!`,
        source: 'buyer',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: order.paymentMethodUsed,
          completedAt: order.completedAt || new Date(),
        },
      });
    }

    // Notificación para VENDEDOR (opcional)
    const ownerId = await this.getTenantOwnerId(order.tenantId);
    if (ownerId) {
      await this.notificationsService.create({
        userId: ownerId,
        tenantId: order.tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: isBooking ? 'booking_completed' : 'order_delivered',
        title: isBooking 
          ? 'Cita completada' 
          : 'Pedido entregado',
        message: isBooking
          ? `La cita #${orderIdShort} de ${order.customerName} ha sido completada.`
          : `El pedido #${orderIdShort} de ${order.customerName} ha sido entregado.`,
        source: 'seller',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: order.paymentMethodUsed,
          completedAt: order.completedAt || new Date(),
        },
      });
    }
  }

  /**
   * 🔥 NUEVO MÉTODO: Notificación de orden cancelada
   */
  async createEnhancedOrderCancelledNotification(
    order: OrderEntity,
    cancelledBy: 'client' | 'provider' | 'system' = 'system'
  ): Promise<void> {
    const buyerId = order.userId;
    const tenantId = order.tenantId;
    const isBooking = this.isBookingOrder(order);
    const orderIdShort = order.id.slice(0, 8);
    const typeLabel = isBooking ? 'cita' : 'pedido';
    const orderType = isBooking ? 'booking' : 'order';
    const cancelledByText = cancelledBy === 'client' ? 'el cliente' : 
                           cancelledBy === 'provider' ? 'el proveedor' : 'el sistema';

    // Notificación para COMPRADOR
    if (buyerId) {
      await this.notificationsService.create({
        userId: buyerId,
        tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: isBooking ? 'booking_cancelled' : 'order_cancelled',
        title: isBooking 
          ? 'Cita cancelada' 
          : 'Pedido cancelado',
        message: isBooking
          ? `Tu cita #${orderIdShort} ha sido cancelada por ${cancelledByText}.`
          : `Tu pedido #${orderIdShort} ha sido cancelado por ${cancelledByText}.`,
        source: 'buyer',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: order.paymentMethodUsed,
          cancelledBy: cancelledBy,
          status: 'CANCELLED',
          cancelledAt: order.cancelledAt || new Date(),
        },
      });
    }

    // Notificación para VENDEDOR
    const ownerId = await this.getTenantOwnerId(tenantId);
    if (ownerId) {
      await this.notificationsService.create({
        userId: ownerId,
        tenantId,
        orderId: order.id,
        bookingId: isBooking ? order.id : undefined,
        type: isBooking ? 'booking_cancelled' : 'order_cancelled',
        title: isBooking 
          ? 'Cita cancelada' 
          : 'Pedido cancelado',
        message: isBooking
          ? `La cita #${orderIdShort} del cliente ${order.customerName} ha sido cancelada por ${cancelledByText}.`
          : `El pedido #${orderIdShort} del cliente ${order.customerName} ha sido cancelado por ${cancelledByText}.`,
        source: 'seller',
        metadata: {
          orderId: order.id,
          bookingId: isBooking ? order.id : undefined,
          orderType: orderType,
          isBooking: isBooking,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          totalAmount: order.totalAmount,
          totalAmountVes: order.totalAmountVes,
          paymentMethod: order.paymentMethodUsed,
          cancelledBy: cancelledBy,
          status: 'CANCELLED',
          cancelledAt: order.cancelledAt || new Date(),
        },
      });
    }
  }

  // ============================================================
  // MÉTODOS AUXILIARES
  // ============================================================
  
  /**
   * Determina si la orden es una cita (booking) o un pedido (order)
   */
  private isBookingOrder(order: OrderEntity): boolean {
    // Si el tipo de orden es 'service', es una cita
    if (order.orderType === 'service') return true;
    
    // Si tiene serviceDetails, es una cita
    if (order.serviceDetails) return true;
    
    // Si tiene items, verificar si alguno es de tipo 'service'
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if ((item as any).type === 'service') return true;
      }
    }
    
    // Por defecto, es un pedido de productos
    return false;
  }

  /**
   * Obtiene datos específicos de la cita si existe
   */
  private getBookingData(order: OrderEntity): any {
    if (!order.serviceDetails) return {};
    
    const details = order.serviceDetails as any;
    return {
      serviceDate: details.date || details.serviceDate || undefined,
      serviceTime: details.time || details.startTime || details.serviceTime || undefined,
      serviceName: details.name || details.serviceName || undefined,
      serviceDuration: details.duration || undefined,
      professionalId: details.professionalId || undefined,
      professionalName: details.professionalName || undefined,
      serviceNotes: details.notes || undefined,
    };
  }

  /**
   * Obtiene el ID del dueño del tenant (rol admin)
   */
  private async getTenantOwnerId(tenantId: string): Promise<string | null> {
    if (!tenantId) return null;
    try {
      const userRepository = (this.notificationsService as any).userRepository;
      const owner = await userRepository.findOne({
        where: { tenantId, role: 'admin' },
        select: { id: true },
      });
      if (owner) return owner.id;
      const anyUser = await userRepository.findOne({
        where: { tenantId },
        select: { id: true },
      });
      return anyUser?.id || null;
    } catch (error) {
      console.error('Error al obtener dueño del tenant:', error);
      return null;
    }
  }
}