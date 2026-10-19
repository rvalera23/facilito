// ARCHIVO: backend/src/modules/notifications/notifications.service.ts

import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { OrderEntity } from '../orders/entities/order.entity';
import { User } from '../auth/entities/user.entity';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // ============================================================
  // 1. CREAR NOTIFICACIÓN
  // ============================================================
  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      ...dto,
      read: dto.read || false,
      metadata: dto.metadata || {},
    });
    const savedNotification = await this.notificationRepository.save(notification);
    if (savedNotification.userId) {
      await this.notificationsGateway.sendNotificationToUser(savedNotification.userId, savedNotification);
    }
    if (savedNotification.tenantId && !savedNotification.userId) {
      await this.notificationsGateway.sendNotificationToTenant(savedNotification.tenantId, savedNotification);
    }
    return savedNotification;
  }

  // ============================================================
  // 2. OBTENER NOTIFICACIONES DE UN USUARIO
  // ============================================================
  async findByUser(
    userId: string,
    options?: { limit?: number; offset?: number; onlyUnread?: boolean }
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number }> {
    const query = this.notificationRepository.createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC');

    if (options?.onlyUnread) {
      query.andWhere('n.read = false');
    }

    const total = await query.getCount();
    const unreadCount = await this.notificationRepository.count({
      where: { userId, read: false },
    });

    if (options?.limit) {
      query.limit(options.limit).offset(options.offset || 0);
    }

    const items = await query.getMany();
    return { items, total, unreadCount };
  }

  // ============================================================
  // 3. OBTENER NOTIFICACIONES DE UNA TIENDA
  // ============================================================
  async findByTenant(
    tenantId: string,
    options?: { limit?: number; offset?: number; onlyUnread?: boolean; source?: 'buyer' | 'seller' }
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number }> {
    const query = this.notificationRepository.createQueryBuilder('n')
      .where('n.tenantId = :tenantId', { tenantId })
      .orderBy('n.createdAt', 'DESC');

    if (options?.onlyUnread) {
      query.andWhere('n.read = false');
    }

    if (options?.source) {
      query.andWhere('n.source = :source', { source: options.source });
    }

    const total = await query.getCount();

    const unreadCountQuery = this.notificationRepository.createQueryBuilder('n')
      .where('n.tenantId = :tenantId', { tenantId })
      .andWhere('n.read = false');
    if (options?.source) {
      unreadCountQuery.andWhere('n.source = :source', { source: options.source });
    }
    const unreadCount = await unreadCountQuery.getCount();

    if (options?.limit) {
      query.limit(options.limit).offset(options.offset || 0);
    }

    const items = await query.getMany();
    return { items, total, unreadCount };
  }

  // ============================================================
  // 4. OBTENER UNA NOTIFICACIÓN POR ID
  // ============================================================
  async findOne(id: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notification;
  }

  // ============================================================
  // 5. MARCAR COMO LEÍDA
  // ============================================================
  async markAsRead(id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id);
    notification.read = true;
    return await this.notificationRepository.save(notification);
  }

  // ============================================================
  // 6. MARCAR TODAS COMO LEÍDAS
  // ============================================================
  async markAllAsRead(userId: string, source?: 'buyer' | 'seller'): Promise<{ count: number }> {
    const criteria: any = { userId, read: false };
    if (source) criteria.source = source;
    const result = await this.notificationRepository.update(criteria, { read: true });
    return { count: result.affected || 0 };
  }

  // ============================================================
  // 6b. 🔥 MARCAR TODAS LAS NOTIFICACIONES DE UN TENANT COMO LEÍDAS
  // ============================================================
  async markAllAsReadByTenant(
    tenantId: string,
    source?: 'buyer' | 'seller'
  ): Promise<{ count: number }> {
    const criteria: any = { tenantId, read: false };
    if (source) criteria.source = source;
    const result = await this.notificationRepository.update(criteria, { read: true });
    return { count: result.affected || 0 };
  }

  // ============================================================
  // 6c. 🔥 MARCAR TODAS LAS NOTIFICACIONES DE UNA ORDEN COMO LEÍDAS
  //     Se usa al abrir una orden desde cualquier lado (auto-read).
  // ============================================================
  async markAllAsReadByOrder(
    orderId: string,
    source?: 'buyer' | 'seller'
  ): Promise<{ count: number }> {
    const criteria: any = { orderId, read: false };
    if (source) criteria.source = source;
    const result = await this.notificationRepository.update(criteria, { read: true });
    return { count: result.affected || 0 };
  }

  // ============================================================
  // 7. CONTAR NO LEÍDAS
  // ============================================================
  async countUnread(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  // ============================================================
  // 8. CONTAR NO LEÍDAS POR SOURCE
  // ============================================================
  async countUnreadBySource(
    userId: string, 
    source: 'buyer' | 'seller'
  ): Promise<number> {
    return await this.notificationRepository.count({
      where: { 
        userId, 
        read: false,
        source: source,
      },
    });
  }

  // ============================================================
  // 9. CONTAR NO LEÍDAS DEL COMPRADOR
  // ============================================================
  async countUnreadBuyerOnly(userId: string): Promise<number> {
    return await this.countUnreadBySource(userId, 'buyer');
  }

  // ============================================================
  // 10. CONTAR NO LEÍDAS DEL VENDEDOR
  // ============================================================
  async countUnreadSellerOnly(userId: string): Promise<number> {
    return await this.countUnreadBySource(userId, 'seller');
  }

  // ============================================================
  // 11. CONTAR NO LEÍDAS DE LA TIENDA
  // ============================================================
  async countUnreadByTenant(tenantId: string, source?: 'buyer' | 'seller'): Promise<number> {
    return await this.notificationRepository.count({
      where: source
        ? { tenantId, read: false, source }
        : { tenantId, read: false },
    });
  }

  // ============================================================
  // 12. ELIMINAR NOTIFICACIÓN
  // ============================================================
  async delete(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }

  // ============================================================
  // 13. ELIMINAR TODAS LAS NOTIFICACIONES DE UN USUARIO
  // ============================================================
  async deleteAllByUser(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepository.delete({
      userId,
    });
    return { count: result.affected || 0 };
  }

  // ============================================================
  // 14. 🔥 DETECTAR SI ES SERVICIO (usa orderType y serviceDetails)
  // ============================================================
  private isServiceOrder(order: OrderEntity): boolean {
    // 1. Si el orderType es 'service'
    if (order.orderType === 'service') return true;
    
    // 2. Si tiene serviceDetails
    if (order.serviceDetails) return true;
    
    // 3. Si los items son de tipo servicio
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if ((item as any).type === 'service') return true;
      }
    }
    
    return false;
  }

  // ============================================================
  // 15. 🔥 OBTENER DATOS DEL SERVICIO
  // ============================================================
  private getServiceData(order: OrderEntity): { serviceDate?: string; serviceTime?: string; serviceName?: string } {
    if (!order.serviceDetails) {
      return {};
    }
    
    const details = order.serviceDetails as any;
    return {
      serviceDate: details.date || details.serviceDate || undefined,
      serviceTime: details.time || details.startTime || details.serviceTime || undefined,
      serviceName: details.name || details.serviceName || undefined,
    };
  }

    // ============================================================
  // 16. 🔥 CREAR / ACTUALIZAR NOTIFICACIONES DE UNA ORDEN
  //     Estándar: 1 notificación por (orden, source) que muta.
  // ============================================================
  async createOrderNotifications(order: OrderEntity): Promise<void> {
    await this.upsertOrderNotification(order, 'buyer');
    await this.upsertOrderNotification(order, 'seller');
  }

  // ============================================================
  // 17. 🔥 NOTIFICACIÓN CUANDO SE CONFIRMA UN PAGO
  // ============================================================
  async createPaymentConfirmedNotification(order: OrderEntity): Promise<void> {
    await this.upsertOrderNotification(order, 'buyer');
    await this.upsertOrderNotification(order, 'seller');
  }

  // ============================================================
  // 18. 🔥 NOTIFICACIÓN CUANDO SE CANCELA UNA ORDEN
  // ============================================================
  async createOrderCancelledNotification(order: OrderEntity): Promise<void> {
    await this.upsertOrderNotification(order, 'buyer');
    await this.upsertOrderNotification(order, 'seller');
  }

  // ============================================================
  // 19. 🔥 NOTIFICACIÓN CUANDO SE COMPLETA UNA ORDEN
  // ============================================================
  async createOrderCompletedNotification(order: OrderEntity): Promise<void> {
    await this.upsertOrderNotification(order, 'buyer');
    await this.upsertOrderNotification(order, 'seller');
  }
  private async getCustomerData(userId?: string): Promise<{ avatarUrl?: string; avatar?: string } | null> {
    if (!userId) return null;
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: { id: true, avatar: true, avatarUrl: true },
      });
      return user ? { avatarUrl: user.avatarUrl, avatar: user.avatar } : null;
    } catch (error) {
      console.error('Error al obtener datos del cliente:', error);
      return null;
    }
  }

  // ============================================================
  // 20. 🔥 MÉTODO AUXILIAR: OBTENER EL DUEÑO DEL TENANT
  // ============================================================
  private async getTenantOwnerId(tenantId: string): Promise<string | null> {
    if (!tenantId) return null;

    try {
      const owner = await this.userRepository.findOne({
        where: { 
          tenantId: tenantId,
          role: 'admin',
        },
        select: { id: true },
      });

      if (owner) return owner.id;

      const anyUser = await this.userRepository.findOne({
        where: { tenantId },
        select: { id: true },
      });

      return anyUser?.id || null;
    } catch (error) {
      console.error('Error al obtener dueño del tenant:', error);
      return null;
    }
  }

  // ============================================================
  // 21. 🆕 UPSERT CONSOLIDADO POR ORDEN + SOURCE
  //     Estándar Shopify: 1 notificación por (orden, source) que muta
  // ============================================================
  private buildOrderNotificationContent(
    order: OrderEntity,
    source: 'buyer' | 'seller',
    isService: boolean
  ): { title: string; message: string } {
    const isBuyer = source === 'buyer';
    const typeLabel = isService ? 'cita' : 'pedido';
    const status = (order.status || 'PENDING').toUpperCase();
    const orderIdShort = order.id.slice(0, 8);
    const totalFormatted = order.totalAmountVes
      ? `Bs. ${Number(order.totalAmountVes).toFixed(2)}`
      : `$${Number(order.totalAmount).toFixed(2)}`;

    const map: Record<string, { buyer: { title: string; message: string }; seller: { title: string; message: string } }> = {
      PENDING: {
        buyer: {
          title: isService ? 'Cita creada' : 'Pedido creado',
          message: isService
            ? `Tu ${typeLabel} #${orderIdShort} ha sido creada. Esperando confirmación del proveedor.`
            : `Tu ${typeLabel} #${orderIdShort} ha sido creado. Estamos preparándolo.`,
        },
        seller: {
          title: isService ? 'Nueva cita recibida' : 'Nuevo pedido recibido',
          message: isService
            ? `${order.customerName} solicitó una cita por ${totalFormatted}.`
            : `${order.customerName} realizó un pedido por ${totalFormatted}.`,
        },
      },
      POR_VERIFICAR: {
        buyer: {
          title: 'Comprobante recibido',
          message: `Estamos verificando tu pago del ${typeLabel} #${orderIdShort}.`,
        },
        seller: {
          title: 'Comprobante por verificar',
          message: `${order.customerName} subió un comprobante del ${typeLabel} #${orderIdShort}. Verificalo para continuar.`,
        },
      },
      PAID: {
        buyer: {
          title: 'Pago confirmado',
          message: `Tu pago del ${typeLabel} #${orderIdShort} fue confirmado. ¡Gracias!`,
        },
        seller: {
          title: 'Pago recibido',
          message: `Confirmaste el pago del ${typeLabel} #${orderIdShort} de ${order.customerName}.`,
        },
      },
      CONFIRMED: {
        buyer: {
          title: 'Pedido confirmado',
          message: `Tu ${typeLabel} #${orderIdShort} fue confirmado por el vendedor.`,
        },
        seller: {
          title: 'Pedido confirmado',
          message: `Confirmaste el ${typeLabel} #${orderIdShort} de ${order.customerName}.`,
        },
      },
      SHIPPED: {
        buyer: {
          title: 'Pedido en camino',
          message: `Tu ${typeLabel} #${orderIdShort} está en camino.`,
        },
        seller: {
          title: 'Pedido despachado',
          message: `Despachaste el ${typeLabel} #${orderIdShort} de ${order.customerName}.`,
        },
      },
      DELIVERED: {
        buyer: {
          title: isService ? 'Cita completada' : 'Pedido entregado',
          message: isService
            ? `Tu cita #${orderIdShort} fue completada. ¡Gracias!`
            : `Tu pedido #${orderIdShort} fue entregado. ¡Disfrútalo!`,
        },
        seller: {
          title: isService ? 'Cita completada' : 'Pedido entregado',
          message: isService
            ? `La cita #${orderIdShort} de ${order.customerName} fue completada.`
            : `Entregaste el pedido #${orderIdShort} a ${order.customerName}.`,
        },
      },
      COMPLETED: {
        buyer: {
          title: isService ? 'Cita completada' : 'Pedido completado',
          message: `${isService ? 'Cita' : 'Pedido'} #${orderIdShort} completado. ¡Gracias por tu compra!`,
        },
        seller: {
          title: isService ? 'Cita completada' : 'Pedido completado',
          message: `${isService ? 'Cita' : 'Pedido'} #${orderIdShort} de ${order.customerName} completado.`,
        },
      },
      CANCELLED: {
        buyer: {
          title: isService ? 'Cita cancelada' : 'Pedido cancelado',
          message: `Tu ${typeLabel} #${orderIdShort} fue cancelado.`,
        },
        seller: {
          title: isService ? 'Cita cancelada' : 'Pedido cancelado',
          message: `El ${typeLabel} #${orderIdShort} de ${order.customerName} fue cancelado.`,
        },
      },
    };

    const entry = map[status] || map.PENDING;
    return isBuyer ? entry.buyer : entry.seller;
  }

  async upsertOrderNotification(
    order: OrderEntity,
    source: 'buyer' | 'seller'
  ): Promise<NotificationEntity | null> {
    const isService = this.isServiceOrder(order);
    const serviceData = this.getServiceData(order);
    const status = (order.status || 'PENDING').toUpperCase();
    const { title, message } = this.buildOrderNotificationContent(order, source, isService);

    // Destinatario según source
    let recipientId: string | null = null;
    if (source === 'buyer') {
      recipientId = order.userId || null;
    } else {
      recipientId = await this.getTenantOwnerId(order.tenantId);
    }
    if (!recipientId) return null;

    // Buscar existente
    const existing = await this.notificationRepository.findOne({
      where: {
        orderId: order.id,
        source,
      },
      order: { createdAt: 'DESC' },
    });

    // Metadata base según source
    const baseMetadata: Record<string, any> = {
      orderId: order.id,
      bookingId: isService ? order.id : undefined,
      orderType: isService ? 'service' : 'product',
      isService,
      status,
      totalAmount: order.totalAmount,
      totalAmountVes: order.totalAmountVes,
      paymentMethod: order.paymentMethodUsed,
      customerName: order.customerName,
      serviceDate: serviceData.serviceDate,
      serviceTime: serviceData.serviceTime,
      serviceName: serviceData.serviceName,
    };

    if (source === 'seller') {
      const customerData = await this.getCustomerData(order.userId);
      baseMetadata.customerId = order.userId;
      baseMetadata.customerPhone = order.customerPhone;
      baseMetadata.customerAddress = order.customerAddress;
      baseMetadata.customerAvatarUrl = customerData?.avatarUrl || customerData?.avatar || null;
      baseMetadata.items = order.items;
      baseMetadata.paymentReference = order.paymentReference;
    } else {
      // 🔥 En notificaciones al comprador, mostramos la tienda.
      // Traemos el tenant completo (el select con objeto falla en algunas versiones de TypeORM).
      try {
        const tenant = await this.tenantRepository.findOne({
          where: { id: order.tenantId },
        });

        if (tenant) {
          baseMetadata.tenantId = tenant.id;
          baseMetadata.tenantName = tenant.name || null;
          baseMetadata.tenantAvatarUrl = tenant.logoUrl || tenant.bannerUrl || null;
        } else {
          console.warn(`⚠️ [upsertOrderNotification] Tenant no encontrado: ${order.tenantId}`);
        }
      } catch (error) {
        console.error(`❌ [upsertOrderNotification] Error al cargar tenant ${order.tenantId}:`, error);
      }
    }

    if (existing) {
      // Actualizar la existente
      const history: any[] = Array.isArray(existing.metadata?.history) ? existing.metadata.history : [];
      const lastStatus = existing.metadata?.status;
      if (lastStatus !== status) {
        history.push({ status, at: new Date().toISOString() });
      }

      existing.title = title;
      existing.message = message;
      existing.type = `${isService ? 'booking' : 'order'}_${status.toLowerCase()}`;
      existing.metadata = {
        ...existing.metadata,
        ...baseMetadata,
        history,
      };
      // Reiniciar read si el estado cambió (para que el badge lo note)
      if (lastStatus !== status) {
        existing.read = false;
      }

      const saved = await this.notificationRepository.save(existing);

      // Emitir por WebSocket
      await this.notificationsGateway.sendNotificationToUser(saved.userId, {
        ...saved,
        event: 'notification_updated',
      });

      return saved;
    }

    // Crear nueva
    const created = await this.create({
      userId: recipientId,
      tenantId: order.tenantId,
      orderId: order.id,
      bookingId: isService ? order.id : undefined,
      type: `${isService ? 'booking' : 'order'}_${status.toLowerCase()}`,
      title,
      message,
      source,
      metadata: {
        ...baseMetadata,
        history: [{ status, at: new Date().toISOString() }],
      },
    });

    return created;
  }

  // ============================================================
  // 22. 🔥 NOTIFICACIONES DE DISPUTAS DE ENVÍO
  //     5 eventos: opened, seller_responded, escalated, resolved, auto_resolved
  // ============================================================
  async createShippingDisputeNotification(
    dispute: {
      id: string;
      orderId: string;
      buyerId?: string | null;
      sellerId?: string | null;
      tenantId: string;
      reason: string;
      status: string;
      resolutionType?: string | null;
      resolutionAmountUsd?: number | null;
      autoResolvedBy?: string | null;
    },
    event:
      | 'opened'
      | 'seller_responded'
      | 'escalated'
      | 'resolved'
      | 'auto_resolved',
    target: 'buyer' | 'seller' | 'both',
  ): Promise<void> {
    const reasonLabels: Record<string, string> = {
      not_received: 'No recibí mi pedido',
      wrong_item: 'Producto equivocado',
      damaged: 'Producto dañado',
      late: 'Llegó tarde',
    };

    const reasonText = reasonLabels[dispute.reason] || dispute.reason;

    const resolveTitle = (): string => {
      switch (event) {
        case 'opened':
          return 'Nuevo reclamo de envío';
        case 'seller_responded':
          return 'El vendedor respondió tu reclamo';
        case 'escalated':
          return 'Reclamo escalado';
        case 'resolved':
          return 'Reclamo resuelto';
        case 'auto_resolved':
          return 'Reclamo resuelto automáticamente';
      }
    };

    const resolveMessage = (): string => {
      switch (event) {
        case 'opened':
          return `El comprador reportó un problema: ${reasonText}.`;
        case 'seller_responded':
          return 'El vendedor envió una respuesta a tu reclamo. Revisá los detalles.';
        case 'escalated':
          return `El comprador escaló el reclamo: ${reasonText}. Tenés 5 días hábiles para resolverlo.`;
        case 'resolved':
          if (dispute.resolutionType === 'refund') {
            return `Se aprobó un reembolso de $${dispute.resolutionAmountUsd?.toFixed(2) ?? '0.00'}.`;
          }
          if (dispute.resolutionType === 'replacement') {
            return 'El vendedor ofreció un reemplazo. Revisá los detalles.';
          }
          return 'El reclamo fue resuelto.';
        case 'auto_resolved':
          return dispute.autoResolvedBy === 'system_seller_timeout'
            ? 'El vendedor no respondió a tiempo. Se procesó el reembolso automático.'
            : 'El reclamo fue resuelto automáticamente.';
      }
    };

    const baseMetadata: Record<string, any> = {
      disputeId: dispute.id,
      orderId: dispute.orderId,
      tenantId: dispute.tenantId,
      reason: dispute.reason,
      status: dispute.status,
      resolutionType: dispute.resolutionType ?? null,
      resolutionAmountUsd: dispute.resolutionAmountUsd ?? null,
      event,
    };

    const title = resolveTitle();
    const message = resolveMessage();

    if (target === 'buyer' || target === 'both') {
      if (dispute.buyerId) {
        await this.create({
          userId: dispute.buyerId,
          tenantId: dispute.tenantId,
          orderId: dispute.orderId,
          type: `shipping_dispute_${event}_buyer`,
          title,
          message,
          source: 'buyer',
          metadata: baseMetadata,
        });
      }
    }

    if (target === 'seller' || target === 'both') {
      const sellerId =
        dispute.sellerId ?? (await this.getTenantOwnerId(dispute.tenantId));
      if (sellerId) {
        await this.create({
          userId: sellerId,
          tenantId: dispute.tenantId,
          orderId: dispute.orderId,
          type: `shipping_dispute_${event}_seller`,
          title,
          message,
          source: 'seller',
          metadata: baseMetadata,
        });
      }
    }
  }

}

