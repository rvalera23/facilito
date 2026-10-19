// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery.controller.ts
// CRUD de zonas de delivery por tenant.
// ==========================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * POST /delivery/zones/:tenantId
   * Crea una zona de delivery para el tenant.
   */
  @Post('zones/:tenantId')
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateDeliveryZoneDto,
  ) {
    return this.deliveryService.create(tenantId, dto);
  }

  /**
   * GET /delivery/zones/:tenantId
   * Lista todas las zonas (activas e inactivas) del tenant.
   */
  @Get('zones/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.deliveryService.findAllByTenant(tenantId);
  }

  /**
   * GET /delivery/zones/:tenantId/match?lat=..&lng=..
   * Devuelve la zona activa que contiene el punto, o null si ninguna.
   * OJO: esta ruta va ANTES de /:zoneId para no ser capturada por el param.
   */
  @Get('zones/:tenantId/match')
  async match(
    @Param('tenantId') tenantId: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return { zone: null, reason: 'invalid_coords' };
    }
    const zone = await this.deliveryService.findZoneForPoint(
      tenantId,
      latNum,
      lngNum,
    );
    return { zone };
  }

  /**
   * GET /delivery/zones/:tenantId/:zoneId
   */
  @Get('zones/:tenantId/:zoneId')
  findOne(
    @Param('tenantId') tenantId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.deliveryService.findOne(tenantId, zoneId);
  }

  /**
   * PATCH /delivery/zones/:tenantId/:zoneId
   */
  @Patch('zones/:tenantId/:zoneId')
  update(
    @Param('tenantId') tenantId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateDeliveryZoneDto,
  ) {
    return this.deliveryService.update(tenantId, zoneId, dto);
  }

  /**
   * DELETE /delivery/zones/:tenantId/:zoneId
   */
  @Delete('zones/:tenantId/:zoneId')
  @HttpCode(204)
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('zoneId') zoneId: string,
  ) {
    await this.deliveryService.remove(tenantId, zoneId);
  }
}