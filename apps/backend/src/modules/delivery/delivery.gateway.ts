// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery.gateway.ts
// Gateway de WebSocket para tracking de delivery en tiempo real.
// Namespace: /delivery
// ==========================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { DeliveryOwnershipService } from './delivery-ownership.service';
import * as jwt from 'jsonwebtoken';
interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    role?: string;
    tenantId?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'delivery',
})
@Injectable()
export class DeliveryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DeliveryGateway.name);

  @WebSocketServer()
  server: Server;

  // Map userId → Set<socketId> para poder emitir a un user desde otro service
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private readonly ownership: DeliveryOwnershipService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway de Delivery inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado a /delivery: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketIds] of this.userSockets.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
    this.logger.log(`Cliente desconectado de /delivery: ${client.id}`);
  }

  /**
   * El cliente se identifica y se une a los rooms que le corresponden:
   *   - user:<userId>          (siempre)
   *   - driver:<driverId>      (si es driver)
   *   - tenant:<tenantId>      (si tiene tenant)
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    client: AuthenticatedSocket,
    payload: {
      token?: string;
      /** @deprecated Se ignora si viene `token`. Solo para tests locales. */
      userId?: string;
      role?: string;
      tenantId?: string;
      driverId?: string;
    },
  ) {
    const { token } = payload;

    let userId: string | null = null;
    let role: string | null = null;
    let tenantId: string | null = null;
    let driverId: string | null = payload.driverId || null;

    // ============================================================
    // 1. Si viene token, validarlo
    // ============================================================
    if (token) {
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET_NEW ||
          process.env.JWT_SECRET ||
          process.env.JWT_SECRET_OLD ||
          'tu_secreto_super_seguro',
                );
        userId = decoded.sub || decoded.id || null;
        role = decoded.role || decoded.activeRole || null;
        tenantId = decoded.tenantId || decoded.tenantSlug || null;
        // driverId queda del payload (el frontend lo manda aparte)
      } catch (err: any) {
        client.emit('error', {
          message: 'Token inválido o expirado',
          detail: err?.message || 'invalid_token',
        });
        // Desconectar tras un pequeño delay para que el cliente reciba el error
        setTimeout(() => client.disconnect(true), 100);
        return;
      }
    } else {
      // ============================================================
      // 2. Fallback para tests locales (sin token).
      //    En producción se rechaza.
      // ============================================================
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        client.emit('error', { message: 'Token requerido' });
        setTimeout(() => client.disconnect(true), 100);
        return;
      }
      userId = payload.userId || null;
      role = payload.role || null;
      tenantId = payload.tenantId || null;
    }

    if (!userId) {
      client.emit('error', { message: 'No se pudo identificar al usuario' });
      setTimeout(() => client.disconnect(true), 100);
      return;
    }

    // ============================================================
    // 3. Registrar el socket y unir a los rooms
    // ============================================================
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    client.join(`user:${userId}`);
    client.data.userId = userId;
    client.data.role = role || undefined;
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
      client.data.tenantId = tenantId;
    }
    if (driverId) {
      client.join(`driver:${driverId}`);
    }

    client.emit('authenticated', {
      userId,
      role: role || null,
      tenantId: tenantId || null,
      driverId: driverId || null,
      success: true,
    });

    this.logger.log(
      `Delivery user autenticado: ${userId} (role: ${role || 'n/a'}, socket: ${client.id})`,
    );
  }

  /**
   * El comprador (o admin) se une al room de una orden específica para
   * seguir su tracking en vivo.
   */
  @SubscribeMessage('track_order')
  async handleTrackOrder(
    client: Socket,
    payload: { orderId: string },
  ) {
    const userId = client.data.userId;
    const role = client.data.role;

    if (!userId) {
      client.emit('error', {
        message: 'Debes autenticarte antes de trackear una orden',
      });
      return;
    }

    if (!payload?.orderId) {
      client.emit('error', { message: 'orderId es requerido' });
      return;
    }

    // Validar permisos sobre la orden
    try {
      const allowed = await this.ownership.canTrackOrder(
        { id: userId, role: role || 'buyer', tenantId: client.data.tenantId },
        payload.orderId,
      );

      if (!allowed) {
        client.emit('error', {
          message: 'No tienes permiso para ver esta orden',
        });
        return;
      }
    } catch (err: any) {
      this.logger.warn(
        `canTrackOrder falló (socket: ${client.id}, order: ${payload.orderId}): ${err?.message || err}`,
      );
      client.emit('error', {
        message: 'Error validando permisos de tracking',
      });
      return;
    }

    client.join(`order:${payload.orderId}`);
    client.emit('tracking', { orderId: payload.orderId, joined: true });
    this.logger.log(
      `Socket ${client.id} (user ${userId}) siguiendo orden ${payload.orderId}`,
    );
  }

  @SubscribeMessage('untrack_order')
  handleUntrackOrder(client: Socket, payload: { orderId: string }) {
    if (!payload?.orderId) return;
    client.leave(`order:${payload.orderId}`);
    client.emit('tracking', { orderId: payload.orderId, joined: false });
  }

  // ============================================================
  // EMISORES (llamados desde DeliveryService / controllers)
  // ============================================================

  /**
   * Nueva posición del driver. Se emite a:
   *   - driver:<driverId>  (el propio driver, por si tiene múltiples dispositivos)
   *   - order:<orderId>    (por cada orden activa del driver)
   */
  emitDriverLocation(
    driverId: string,
    payload: { lat: number; lng: number; at?: string },
    activeOrderIds: string[] = [],
  ) {
    const data = {
      driverId,
      lat: payload.lat,
      lng: payload.lng,
      at: payload.at || new Date().toISOString(),
    };

    this.server.to(`driver:${driverId}`).emit('driver_location', data);

    for (const orderId of activeOrderIds) {
      this.server.to(`order:${orderId}`).emit('driver_location', {
        ...data,
        orderId,
      });
    }
  }

  /**
   * Cambio de estado de una assignment. Se emite a la orden y al driver.
   */
  emitAssignmentUpdate(
    payload: {
      assignmentId: string;
      orderId: string;
      driverId?: string | null;
      status: string;
      at?: string;
    },
  ) {
    const data = {
      ...payload,
      at: payload.at || new Date().toISOString(),
    };

    this.server.to(`order:${payload.orderId}`).emit('assignment_update', data);
    if (payload.driverId) {
      this.server.to(`driver:${payload.driverId}`).emit('assignment_update', data);
    }
  }

  /**
   * Notifica al tenant (admin) que hay una orden nueva lista para asignar.
   */
  emitNewOrderForTenant(
    tenantId: string,
    payload: { orderId: string; distanceKm?: number | null; fee?: number | null },
  ) {
    this.server.to(`tenant:${tenantId}`).emit('new_order_for_delivery', {
      ...payload,
      at: new Date().toISOString(),
    });
  }

  /**
   * Notifica a un user específico (helper por si se necesita puntual).
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ============================================================
  // PROFESSIONAL TRACKING (servicios a domicilio)
  // ============================================================
  emitProfessionalLocation(
    professionalId: string,
    payload: { lat: number; lng: number; at?: string },
    activeBookingIds: string[] = [],
  ): void {
    const data = {
      professionalId,
      lat: payload.lat,
      lng: payload.lng,
      at: payload.at || new Date().toISOString(),
    };

    // Ack al profesional (confirmación)
    this.server
      .to(`professional:${professionalId}`)
      .emit('professional_location', data);

    // Emitir a cada booking activo (para el comprador)
    for (const bookingId of activeBookingIds) {
      this.server.to(`booking:${bookingId}`).emit('professional_location', {
        ...data,
        bookingId,
      });
    }
  }

  emitProfessionalAssignmentUpdate(payload: {
    assignmentId: string;
    bookingId: string;
    professionalId?: string | null;
    status: string;
    at?: string;
  }): void {
    const data = {
      ...payload,
      at: payload.at || new Date().toISOString(),
    };

    // Emitir al room del booking
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('professional_assignment_update', data);

    // Emitir al profesional asignado
    if (payload.professionalId) {
      this.server
        .to(`professional:${payload.professionalId}`)
        .emit('professional_assignment_update', data);
    }
  }
}
