  // ARCHIVO: backend/src/modules/notifications/notifications.controller.ts

  import { Controller, Get, Post, Body, Param, Patch, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
  import { NotificationsService } from './notifications.service';
  import { CreateNotificationDto } from './dto/create-notification.dto';
  import { UpdateNotificationDto } from './dto/update-notification.dto';

  @Controller('notifications')
  export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    // ============================================================
    // 1. CREAR NOTIFICACIÓN (uso manual / administración)
    // ============================================================
    @Post()
    create(@Body() createNotificationDto: CreateNotificationDto) {
      return this.notificationsService.create(createNotificationDto);
    }

    // ============================================================
    // 2. OBTENER NOTIFICACIONES DE UN USUARIO (para el comprador)
    // ============================================================
    @Get('user/:userId')
    findByUser(
      @Param('userId', ParseUUIDPipe) userId: string,
      @Query('limit') limit?: string,
      @Query('offset') offset?: string,
      @Query('onlyUnread') onlyUnread?: string,
    ) {
      const options = {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        onlyUnread: onlyUnread === 'true',
      };
      return this.notificationsService.findByUser(userId, options);
    }

    // ============================================================
    // 3. OBTENER NOTIFICACIONES DE UNA TIENDA (para el vendedor)
    // ============================================================
    @Get('tenant/:tenantId')
    findByTenant(
      @Param('tenantId', ParseUUIDPipe) tenantId: string,
      @Query('limit') limit?: string,
      @Query('offset') offset?: string,
      @Query('onlyUnread') onlyUnread?: string,
      @Query('source') source?: string,
    ) {
      const normalizedSource: 'buyer' | 'seller' | undefined =
        (source === 'buyer' || source === 'seller') ? source : undefined;

      const options: {
        limit?: number;
        offset?: number;
        onlyUnread?: boolean;
        source?: 'buyer' | 'seller';
      } = {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        onlyUnread: onlyUnread === 'true',
        source: normalizedSource,
      };
      return this.notificationsService.findByTenant(tenantId, options);
    }

    // ============================================================
    // 4. OBTENER UNA NOTIFICACIÓN POR ID
    // ============================================================
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
      return this.notificationsService.findOne(id);
    }

    // ============================================================
    // 5. CONTAR NOTIFICACIONES NO LEÍDAS (para la campanita) - TODAS
    // ============================================================
    @Get('user/:userId/unread/count')
    countUnread(@Param('userId', ParseUUIDPipe) userId: string) {
      return this.notificationsService.countUnread(userId);
    }

    // ============================================================
    // 5a. 🔥 CONTAR NO LEÍDAS DEL COMPRADOR (source: 'buyer')
    // ============================================================
    @Get('user/:userId/unread/count-buyer')
    countUnreadBuyer(@Param('userId', ParseUUIDPipe) userId: string) {
      return this.notificationsService.countUnreadBuyerOnly(userId);
    }

    // ============================================================
    // 5b. 🔥 CONTAR NO LEÍDAS DEL VENDEDOR (source: 'seller')
    // ============================================================
    @Get('user/:userId/unread/count-seller')
    countUnreadSeller(@Param('userId', ParseUUIDPipe) userId: string) {
      return this.notificationsService.countUnreadSellerOnly(userId);
    }

    // ============================================================
    // 5c. 🔥 CONTAR NO LEÍDAS DE LA TIENDA (por tenantId)
    // ============================================================
    @Get('tenant/:tenantId/unread/count')
    countUnreadTenant(
      @Param('tenantId', ParseUUIDPipe) tenantId: string,
      @Query('source') source?: string,
    ) {
      const normalized = (source === 'buyer' || source === 'seller') ? source : undefined;
      return this.notificationsService.countUnreadByTenant(tenantId, normalized);
    }

    // ============================================================
    // 6. MARCAR UNA NOTIFICACIÓN COMO LEÍDA
    // ============================================================
    @Patch(':id/read')
    markAsRead(@Param('id', ParseUUIDPipe) id: string) {
      return this.notificationsService.markAsRead(id);
    }

    // ============================================================
    // 7. MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS
    // ============================================================
    @Patch('user/:userId/read-all')
    markAllAsRead(
      @Param('userId', ParseUUIDPipe) userId: string,
      @Query('source') source?: string,
    ) {
      const normalized = (source === 'buyer' || source === 'seller') ? source : undefined;
      return this.notificationsService.markAllAsRead(userId, normalized);
    }

    // ============================================================
    // 7b. 🔥 MARCAR TODAS LAS NOTIFICACIONES DE UN TENANT COMO LEÍDAS
    // ============================================================
    @Patch('tenant/:tenantId/read-all')
    markAllAsReadByTenant(
      @Param('tenantId', ParseUUIDPipe) tenantId: string,
      @Query('source') source?: string,
    ) {
      const normalized = (source === 'buyer' || source === 'seller') ? source : undefined;
      return this.notificationsService.markAllAsReadByTenant(tenantId, normalized);
    }

    // ============================================================
    // 7c. 🔥 MARCAR TODAS LAS NOTIFICACIONES DE UNA ORDEN COMO LEÍDAS
    // ============================================================
    @Patch('read-by-order/:orderId')
    markAllAsReadByOrder(
      @Param('orderId', ParseUUIDPipe) orderId: string,
      @Query('source') source?: string,
    ) {
      const normalized = (source === 'buyer' || source === 'seller') ? source : undefined;
      return this.notificationsService.markAllAsReadByOrder(orderId, normalized);
    }

    // ============================================================
    // 8. ELIMINAR UNA NOTIFICACIÓN
    // ============================================================
    @Delete(':id')
    delete(@Param('id', ParseUUIDPipe) id: string) {
      return this.notificationsService.delete(id);
    }

    // ============================================================
    // 9. ELIMINAR TODAS LAS NOTIFICACIONES DE UN USUARIO
    // ============================================================
    @Delete('user/:userId')
    deleteAllByUser(@Param('userId', ParseUUIDPipe) userId: string) {
      return this.notificationsService.deleteAllByUser(userId);
    }
  }