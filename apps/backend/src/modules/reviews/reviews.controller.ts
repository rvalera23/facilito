// ==========================================
// ARCHIVO: apps/backend/src/modules/reviews/reviews.controller.ts
// ==========================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ReviewsService } from './reviews.service';

// ============================================================
// 🔥 CONTROLLER DE REVIEWS DE PRODUCTOS Y SERVICIOS
// ============================================================
// Endpoints públicos (GET) para leer.
// Endpoints autenticados (POST/PATCH/DELETE) para escribir.

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ============================================================
  // 🔥 HELPER: extraer userId del request (JWT)
  // ============================================================
  private getUserId(req: Request): string {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return userId;
  }

  // ============================================================
  // 🔥 GET /reviews/item/:itemId
  // Lista pública de reviews de un producto o servicio
  // Query params:
  //   - tenantId (obligatorio)
  //   - itemType: 'product' | 'service' (obligatorio)
  //   - limit: default 10
  //   - offset: default 0
  // ============================================================
  @Get('item/:itemId')
  async findByItem(
    @Param('itemId') itemId: string,
    @Query('tenantId') tenantId: string,
    @Query('itemType') itemType: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId es requerido');
    }
    if (itemType !== 'product' && itemType !== 'service') {
      throw new BadRequestException('itemType debe ser "product" o "service"');
    }

    const parsedLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const parsedOffset = Math.max(0, Number(offset) || 0);

    return this.reviewsService.findByItem(
      tenantId,
      itemId,
      itemType,
      parsedLimit,
      parsedOffset,
    );
  }

  // ============================================================
  // 🔥 GET /reviews/item/:itemId/summary
  // Promedio y distribución de un producto o servicio
  // ============================================================
  @Get('item/:itemId/summary')
  async getSummary(
    @Param('itemId') itemId: string,
    @Query('tenantId') tenantId: string,
    @Query('itemType') itemType: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId es requerido');
    }
    if (itemType !== 'product' && itemType !== 'service') {
      throw new BadRequestException('itemType debe ser "product" o "service"');
    }

    return this.reviewsService.getSummaryByItem(tenantId, itemId, itemType);
  }

  // ============================================================
  // 🔥 GET /reviews/item/:itemId/can-review
  // Consulta si el usuario logueado puede reseñar el item
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Get('item/:itemId/can-review')
  async canReview(
    @Param('itemId') itemId: string,
    @Query('tenantId') tenantId: string,
    @Query('itemType') itemType: string,
    @Req() req: Request,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId es requerido');
    }
    if (itemType !== 'product' && itemType !== 'service') {
      throw new BadRequestException('itemType debe ser "product" o "service"');
    }

    const userId = this.getUserId(req);

    return this.reviewsService.canUserReview(userId, tenantId, itemId, itemType);
  }

  // ============================================================
  // 🔥 POST /reviews
  // Crear una review (solo compradores verificados)
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body()
    body: {
      tenantId: string;
      itemId: string;
      itemType: 'product' | 'service';
      rating: number;
      title?: string;
      comment?: string;
    },
    @Req() req: Request,
  ) {
    const { tenantId, itemId, itemType, rating, title, comment } = body;

    if (!tenantId || !itemId || !itemType) {
      throw new BadRequestException(
        'tenantId, itemId e itemType son requeridos',
      );
    }
    if (itemType !== 'product' && itemType !== 'service') {
      throw new BadRequestException('itemType debe ser "product" o "service"');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        'El rating debe ser un número entero entre 1 y 5',
      );
    }

    const userId = this.getUserId(req);

    return this.reviewsService.create(
      userId,
      tenantId,
      itemId,
      itemType,
      rating,
      title || null,
      comment || null,
    );
  }

  // ============================================================
  // 🔥 PATCH /reviews/:id
  // Editar una review propia
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(
    @Param('id') reviewId: string,
    @Body()
    body: {
      rating: number;
      title?: string;
      comment?: string;
    },
    @Req() req: Request,
  ) {
    const { rating, title, comment } = body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        'El rating debe ser un número entero entre 1 y 5',
      );
    }

    const userId = this.getUserId(req);

    return this.reviewsService.updateOwn(
      userId,
      reviewId,
      rating,
      title || null,
      comment || null,
    );
  }
  // ============================================================
  // 🔥 DELETE /reviews/:id
  // Eliminar (soft) una review propia
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(
    @Param('id') reviewId: string,
    @Req() req: Request,
  ) {
    const userId = this.getUserId(req);

    return this.reviewsService.deleteOwn(userId, reviewId);
  }

  // ============================================================
  // 🔥 POST /reviews/:id/respond
  // Responder a una review (solo el dueño del tenant)
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/respond')
  async respond(
    @Param('id') reviewId: string,
    @Body() body: { tenantId: string; response: string },
    @Req() req: Request,
  ) {
    const { tenantId, response } = body;

    if (!tenantId) {
      throw new BadRequestException('tenantId es requerido');
    }

    if (!response || !response.trim()) {
      throw new BadRequestException('La respuesta no puede estar vacía');
    }

    const userId = this.getUserId(req);

    return this.reviewsService.respondToReview(
      reviewId,
      userId,
      tenantId,
      response,
    );
  }

  // ============================================================
  // 🔥 GET /reviews/tenant/:tenantId
  // Lista de todas las reviews del tenant (para el admin)
  // Query params opcionales:
  //   - limit, offset
  //   - rating (1-5)
  //   - hasResponse: 'true' | 'false' (sin valor = todas)
  //   - itemId, itemType
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Get('tenant/:tenantId')
  async getByTenant(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('rating') rating?: string,
    @Query('hasResponse') hasResponse?: string,
    @Query('itemId') itemId?: string,
    @Query('itemType') itemType?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId es requerido');
    }

    // Parsear opciones
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const parsedOffset = Math.max(0, Number(offset) || 0);
    const parsedRating =
      rating !== undefined && rating !== null && rating !== ''
        ? Number(rating)
        : undefined;

    let parsedHasResponse: boolean | null = null;
    if (hasResponse === 'true') parsedHasResponse = true;
    else if (hasResponse === 'false') parsedHasResponse = false;

    let parsedItemType: 'product' | 'service' | undefined;
    if (itemType === 'product' || itemType === 'service') {
      parsedItemType = itemType;
    }

    return this.reviewsService.getAllByTenant(tenantId, {
      limit: parsedLimit,
      offset: parsedOffset,
      rating: parsedRating,
      hasResponse: parsedHasResponse,
      itemId: itemId || undefined,
      itemType: parsedItemType,
    });
  }

  // ============================================================
  // 🔥 GET /reviews/user/me
  // Lista de todas las reseñas del usuario logueado (para Mi Cuenta)
  // Query params opcionales:
  //   - limit, offset
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Get('user/me')
  async getMyReviews(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = this.getUserId(req);

    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const parsedOffset = Math.max(0, Number(offset) || 0);

    return this.reviewsService.findMyReviews(userId, parsedLimit, parsedOffset);
  }
}