// backend/src/modules/notifications/notifications.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway de Notificaciones inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);

    for (const [userId, socketIds] of this.userSockets.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: { userId: string; tenantId?: string }) {
    const { userId, tenantId } = payload;

    if (!userId) {
      client.emit('error', { message: 'userId es requerido para autenticar' });
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.add(client.id);
    }

    client.join(`user:${userId}`);
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }

    this.logger.log(`Usuario autenticado: ${userId} (socket: ${client.id})`);

    client.emit('authenticated', { userId, success: true });

    this.sendUnreadNotifications(userId, client);
  }

  private async sendUnreadNotifications(userId: string, client: Socket) {
    try {
      const unreadCount = await this.notificationsService.countUnread(userId);
      
      if (unreadCount > 0) {
        const { items } = await this.notificationsService.findByUser(userId, {
          limit: 10,
          onlyUnread: true,
        });

        client.emit('unread_notifications', {
          count: unreadCount,
          notifications: items,
        });

        this.logger.log(`Enviadas ${items.length} notificaciones no leídas a usuario ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error al enviar notificaciones no leídas:', error);
    }
  }

  async sendNotificationToUser(userId: string, notification: any) {
    try {
      // 🔥 Si el payload trae event: 'notification_updated', emitir ese evento
      // para que el frontend actualice (no cree) la notificación existente.
      const eventName = notification?.event === 'notification_updated'
        ? 'notification_updated'
        : 'new_notification';

      this.server.to(`user:${userId}`).emit(eventName, notification);

      this.logger.log(`[${eventName}] Notificación enviada al usuario ${userId}: ${notification.title}`);
    } catch (error) {
      this.logger.error('Error al enviar notificación a usuario:', error);
    }
  }

  async sendNotificationToUsers(userIds: string[], notification: any) {
    for (const userId of userIds) {
      await this.sendNotificationToUser(userId, notification);
    }
  }

  async sendNotificationToTenant(tenantId: string, notification: any) {
    this.server.to(`tenant:${tenantId}`).emit('new_notification', notification);
    this.logger.log(`Notificación enviada al tenant ${tenantId}`);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, payload: { notificationId: string }) {
    const { notificationId } = payload;

    try {
      const notification = await this.notificationsService.markAsRead(notificationId);
      
      client.emit('notification_read', {
        notificationId,
        success: true,
      });

      const userId = notification.userId;
      const unreadCount = await this.notificationsService.countUnread(userId);
      
      this.server.to(`user:${userId}`).emit('unread_count_updated', {
        count: unreadCount,
      });

      this.logger.log(`Notificación ${notificationId} marcada como leída`);
    } catch (error) {
      client.emit('error', {
        message: 'Error al marcar notificación como leída',
        error: error.message,
      });
      this.logger.error('Error al marcar notificación como leída:', error);
    }
  }

  @SubscribeMessage('mark_all_as_read')
  async handleMarkAllAsRead(client: Socket, payload: { userId: string }) {
    const { userId } = payload;

    try {
      const result = await this.notificationsService.markAllAsRead(userId);
      
      client.emit('all_read', {
        count: result.count,
        success: true,
      });

      this.server.to(`user:${userId}`).emit('unread_count_updated', {
        count: 0,
      });

      this.logger.log(`Todas las notificaciones marcadas como leídas para usuario ${userId}`);
    } catch (error) {
      client.emit('error', {
        message: 'Error al marcar todas como leídas',
        error: error.message,
      });
      this.logger.error('Error al marcar todas como leídas:', error);
    }
  }

  @SubscribeMessage('get_recent')
  async handleGetRecent(
    client: Socket,
    payload: { userId: string; limit?: number }
  ) {
    const { userId, limit = 10 } = payload;

    try {
      const { items, total, unreadCount } = await this.notificationsService.findByUser(
        userId,
        { limit }
      );

      client.emit('recent_notifications', {
        items,
        total,
        unreadCount,
        limit,
      });
    } catch (error) {
      client.emit('error', {
        message: 'Error al obtener notificaciones recientes',
        error: error.message,
      });
      this.logger.error('Error al obtener notificaciones recientes:', error);
    }
  }

  emitNotification(userId: string, notification: any) {
    this.sendNotificationToUser(userId, notification);
  }

  // ============================================================
  // 🔥 NOTIFICACIÓN PARA PEDIDO DE PRODUCTO
  // ============================================================
  emitNewOrderNotification(orderData: {
    buyerId: string;
    ownerId: string;
    tenantId: string;
    orderId: string;
    customerName: string;
    totalAmount: number;
    totalAmountVes?: number;
    itemsCount?: number;
  }) {
    const orderIdShort = orderData.orderId.slice(0, 8);

    // Notificación para el COMPRADOR (source: 'buyer')
    this.sendNotificationToUser(orderData.buyerId, {
      type: 'order_created',
      source: 'buyer',
      orderId: orderData.orderId,
      title: 'Pedido confirmado',
      message: `Tu pedido #${orderIdShort} ha sido creado y está en proceso de preparación.`,
      metadata: {
        orderId: orderData.orderId,
        totalAmount: orderData.totalAmount,
        totalAmountVes: orderData.totalAmountVes,
        orderType: 'product',
        isService: false,
        itemsCount: orderData.itemsCount || 0,
        status: 'PENDING',
      },
    });

    // Notificación para el VENDEDOR (source: 'seller')
    const totalFormatted = orderData.totalAmountVes
      ? `Bs. ${Number(orderData.totalAmountVes).toFixed(2)}`
      : `$${Number(orderData.totalAmount).toFixed(2)}`;

    this.sendNotificationToUser(orderData.ownerId, {
      type: 'order_created',
      source: 'seller',
      tenantId: orderData.tenantId,
      orderId: orderData.orderId,
      title: 'Nuevo pedido de producto',
      message: `${orderData.customerName} ha realizado un pedido de productos por ${totalFormatted}`,
      metadata: {
        orderId: orderData.orderId,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount,
        totalAmountVes: orderData.totalAmountVes,
        orderType: 'product',
        isService: false,
        itemsCount: orderData.itemsCount || 0,
        status: 'PENDING',
      },
    });
  }

  // ============================================================
  // 🔥 NOTIFICACIÓN PARA RESERVA DE SERVICIO / CITA
  // ============================================================
  emitNewBookingNotification(bookingData: {
    userId: string;
    ownerId: string;
    tenantId: string;
    bookingId: string;
    serviceName: string;
    customerName: string;
    bookingDate: string;
    startTime: string;
    totalAmount?: number;
    totalAmountVes?: number;
  }) {
    const bookingIdShort = bookingData.bookingId.slice(0, 8);

    // Notificación para el CLIENTE (source: 'buyer')
    this.sendNotificationToUser(bookingData.userId, {
      type: 'booking_created',
      source: 'buyer',
      bookingId: bookingData.bookingId,
      orderId: bookingData.bookingId,
      title: 'Cita confirmada',
      message: `Tu cita para "${bookingData.serviceName}" ha sido confirmada para el ${bookingData.bookingDate} a las ${bookingData.startTime}.`,
      metadata: {
        bookingId: bookingData.bookingId,
        orderId: bookingData.bookingId,
        serviceName: bookingData.serviceName,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        orderType: 'service',
        isService: true,
        totalAmount: bookingData.totalAmount || 0,
        totalAmountVes: bookingData.totalAmountVes || 0,
        status: 'CONFIRMED',
      },
    });

    // Notificación para el VENDEDOR (source: 'seller')
    this.sendNotificationToUser(bookingData.ownerId, {
      type: 'booking_created',
      source: 'seller',
      tenantId: bookingData.tenantId,
      bookingId: bookingData.bookingId,
      orderId: bookingData.bookingId,
      title: 'Nueva reserva de servicio',
      message: `${bookingData.customerName} ha reservado "${bookingData.serviceName}" para el ${bookingData.bookingDate} a las ${bookingData.startTime}`,
      metadata: {
        bookingId: bookingData.bookingId,
        orderId: bookingData.bookingId,
        serviceName: bookingData.serviceName,
        customerName: bookingData.customerName,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        orderType: 'service',
        isService: true,
        totalAmount: bookingData.totalAmount || 0,
        totalAmountVes: bookingData.totalAmountVes || 0,
        status: 'CONFIRMED',
      },
    });
  }

  // ============================================================
  // 🔥 NOTIFICACIÓN PARA CONFIRMACIÓN DE CITA
  // ============================================================
  emitBookingConfirmedNotification(bookingData: {
    userId: string;
    ownerId: string;
    tenantId: string;
    bookingId: string;
    serviceName: string;
    bookingDate: string;
    startTime: string;
  }) {
    const bookingIdShort = bookingData.bookingId.slice(0, 8);

    // Notificación para el CLIENTE (source: 'buyer')
    this.sendNotificationToUser(bookingData.userId, {
      type: 'booking_confirmed',
      source: 'buyer',
      bookingId: bookingData.bookingId,
      orderId: bookingData.bookingId,
      title: 'Cita confirmada por el proveedor',
      message: `Tu cita para "${bookingData.serviceName}" ha sido confirmada para el ${bookingData.bookingDate} a las ${bookingData.startTime}.`,
      metadata: {
        bookingId: bookingData.bookingId,
        orderId: bookingData.bookingId,
        serviceName: bookingData.serviceName,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        orderType: 'service',
        isService: true,
        status: 'CONFIRMED',
      },
    });

    // Notificación para el VENDEDOR (source: 'seller')
    this.sendNotificationToUser(bookingData.ownerId, {
      type: 'booking_confirmed',
      source: 'seller',
      tenantId: bookingData.tenantId,
      bookingId: bookingData.bookingId,
      orderId: bookingData.bookingId,
      title: 'Cita confirmada',
      message: `Has confirmado la cita de "${bookingData.serviceName}" para el ${bookingData.bookingDate} a las ${bookingData.startTime}`,
      metadata: {
        bookingId: bookingData.bookingId,
        orderId: bookingData.bookingId,
        serviceName: bookingData.serviceName,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        orderType: 'service',
        isService: true,
        status: 'CONFIRMED',
      },
    });
  }

  // ============================================================
  // 🔥 NOTIFICACIÓN PARA CANCELACIÓN DE CITA
  // ============================================================
  emitBookingCancelledNotification(bookingData: {
    userId: string;
    ownerId: string;
    tenantId: string;
    bookingId: string;
    serviceName: string;
    bookingDate: string;
    startTime: string;
    cancelledBy?: 'client' | 'provider' | 'system';
  }) {
    const bookingIdShort = bookingData.bookingId.slice(0, 8);
    const cancelledByText = bookingData.cancelledBy === 'client' ? 'el cliente' : 
                           bookingData.cancelledBy === 'provider' ? 'el proveedor' : 'el sistema';

    // Notificación para el CLIENTE (source: 'buyer')
    this.sendNotificationToUser(bookingData.userId, {
      type: 'booking_cancelled',
      source: 'buyer',
      bookingId: bookingData.bookingId,
      orderId: bookingData.bookingId,
      title: 'Cita cancelada',
      message: `Tu cita para "${bookingData.serviceName}" del ${bookingData.bookingDate} a las ${bookingData.startTime} ha sido cancelada por ${cancelledByText}.`,
      metadata: {
        bookingId: bookingData.bookingId,
        orderId: bookingData.bookingId,
        serviceName: bookingData.serviceName,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        cancelledBy: bookingData.cancelledBy || 'system',
        orderType: 'service',
        isService: true,
        status: 'CANCELLED',
      },
    });

    // Notificación para el VENDEDOR (source: 'seller')
    this.sendNotificationToUser(bookingData.ownerId, {
      type: 'booking_cancelled',
      source: 'seller',
      tenantId: bookingData.tenantId,
      bookingId: bookingData.bookingId,
      orderId: bookingData.bookingId,
      title: 'Cita cancelada',
      message: `La cita de "${bookingData.serviceName}" del ${bookingData.bookingDate} a las ${bookingData.startTime} ha sido cancelada por ${cancelledByText}.`,
      metadata: {
        bookingId: bookingData.bookingId,
        orderId: bookingData.bookingId,
        serviceName: bookingData.serviceName,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        cancelledBy: bookingData.cancelledBy || 'system',
        orderType: 'service',
        isService: true,
        status: 'CANCELLED',
      },
    });
  }

  // ============================================================
  // 🔥 NOTIFICACIÓN PARA PAGO CONFIRMADO
  // ============================================================
  emitPaymentConfirmedNotification(paymentData: {
    userId: string;
    ownerId: string;
    tenantId: string;
    orderId: string;
    bookingId?: string;
    customerName: string;
    totalAmount: number;
    totalAmountVes?: number;
    isService: boolean;
  }) {
    const idShort = (paymentData.bookingId || paymentData.orderId).slice(0, 8);
    const typeLabel = paymentData.isService ? 'cita' : 'pedido';

    // Notificación para el CLIENTE (source: 'buyer')
    this.sendNotificationToUser(paymentData.userId, {
      type: 'payment_verified',
      source: 'buyer',
      orderId: paymentData.orderId,
      bookingId: paymentData.bookingId,
      title: `Pago de ${typeLabel} confirmado`,
      message: `El pago para tu ${typeLabel} #${idShort} ha sido confirmado.`,
      metadata: {
        orderId: paymentData.orderId,
        bookingId: paymentData.bookingId,
        totalAmount: paymentData.totalAmount,
        totalAmountVes: paymentData.totalAmountVes,
        orderType: paymentData.isService ? 'service' : 'product',
        isService: paymentData.isService,
        status: 'PAID',
      },
    });

    // Notificación para el VENDEDOR (source: 'seller')
    const totalFormatted = paymentData.totalAmountVes
      ? `Bs. ${Number(paymentData.totalAmountVes).toFixed(2)}`
      : `$${Number(paymentData.totalAmount).toFixed(2)}`;

    this.sendNotificationToUser(paymentData.ownerId, {
      type: 'payment_received',
      source: 'seller',
      tenantId: paymentData.tenantId,
      orderId: paymentData.orderId,
      bookingId: paymentData.bookingId,
      title: `Pago de ${typeLabel} recibido`,
      message: `El cliente ${paymentData.customerName} ha realizado el pago del ${typeLabel} #${idShort} por ${totalFormatted}`,
      metadata: {
        orderId: paymentData.orderId,
        bookingId: paymentData.bookingId,
        customerName: paymentData.customerName,
        totalAmount: paymentData.totalAmount,
        totalAmountVes: paymentData.totalAmountVes,
        orderType: paymentData.isService ? 'service' : 'product',
        isService: paymentData.isService,
        status: 'PAID',
      },
    });
  }

  // ============================================================
  // 🔥 NOTIFICACIÓN PARA CANCELACIÓN DE ORDEN
  // ============================================================
  emitOrderCancelledNotification(orderData: {
    userId: string;
    ownerId: string;
    tenantId: string;
    orderId: string;
    bookingId?: string;
    customerName: string;
    totalAmount: number;
    totalAmountVes?: number;
    isService: boolean;
    cancelledBy?: 'client' | 'provider' | 'system';
  }) {
    const idShort = (orderData.bookingId || orderData.orderId).slice(0, 8);
    const typeLabel = orderData.isService ? 'cita' : 'pedido';
    const cancelledByText = orderData.cancelledBy === 'client' ? 'el cliente' : 
                           orderData.cancelledBy === 'provider' ? 'el proveedor' : 'el sistema';

    // Notificación para el CLIENTE (source: 'buyer')
    this.sendNotificationToUser(orderData.userId, {
      type: orderData.isService ? 'booking_cancelled' : 'order_cancelled',
      source: 'buyer',
      orderId: orderData.orderId,
      bookingId: orderData.bookingId,
      title: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} cancelado`,
      message: `Tu ${typeLabel} #${idShort} ha sido cancelado por ${cancelledByText}.`,
      metadata: {
        orderId: orderData.orderId,
        bookingId: orderData.bookingId,
        totalAmount: orderData.totalAmount,
        totalAmountVes: orderData.totalAmountVes,
        orderType: orderData.isService ? 'service' : 'product',
        isService: orderData.isService,
        cancelledBy: orderData.cancelledBy || 'system',
        status: 'CANCELLED',
      },
    });

    // Notificación para el VENDEDOR (source: 'seller')
    this.sendNotificationToUser(orderData.ownerId, {
      type: orderData.isService ? 'booking_cancelled' : 'order_cancelled',
      source: 'seller',
      tenantId: orderData.tenantId,
      orderId: orderData.orderId,
      bookingId: orderData.bookingId,
      title: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} cancelado`,
      message: `El ${typeLabel} #${idShort} del cliente ${orderData.customerName} ha sido cancelado por ${cancelledByText}.`,
      metadata: {
        orderId: orderData.orderId,
        bookingId: orderData.bookingId,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount,
        totalAmountVes: orderData.totalAmountVes,
        orderType: orderData.isService ? 'service' : 'product',
        isService: orderData.isService,
        cancelledBy: orderData.cancelledBy || 'system',
        status: 'CANCELLED',
      },
    });
  }
}