// ==========================================
// ARCHIVO: apps/backend/src/modules/reviews/reviews.service.ts
// ==========================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ItemReview } from './entities/item-review.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';

// ============================================================
// 🔥 TIPOS DE RESPUESTA
// ============================================================

export interface ReviewWithUser {
  id: string;
  tenantId: string;
  itemType: 'product' | 'service';
  itemId: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  ownerResponse: string | null;
  ownerRespondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(ItemReview)
    private readonly reviewRepository: Repository<ItemReview>,

    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ============================================================
  // 🔥 LISTAR REVIEWS DE UN ITEM (público)
  // ============================================================
  async findByItem(
    tenantId: string,
    itemId: string,
    itemType: 'product' | 'service',
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ reviews: ReviewWithUser[]; total: number }> {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: {
        tenantId,
        itemId,
        itemType,
        isVisible: true,
      },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      reviews: reviews.map((r) => this.toReviewWithUser(r)),
      total,
    };
  }

  // ============================================================
  // 🔥 RESUMEN (promedio, distribución) DE UN ITEM
  // ============================================================
  async getSummaryByItem(
    tenantId: string,
    itemId: string,
    itemType: 'product' | 'service',
  ): Promise<ReviewSummary> {
    const reviews = await this.reviewRepository.find({
      where: { tenantId, itemId, itemType, isVisible: true },
      select: { rating: true },
    });

    const totalCount = reviews.length;

    if (totalCount === 0) {
      return {
        averageRating: 0,
        totalCount: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    let sum = 0;

    for (const r of reviews) {
      sum += r.rating;
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    return {
      averageRating: Math.round((sum / totalCount) * 10) / 10,
      totalCount,
      distribution: distribution as ReviewSummary['distribution'],
    };
  }

  // ============================================================
  // 🔥 VERIFICAR SI UN USUARIO PUEDE RESEÑAR UN ITEM
  // ============================================================
  // Devuelve:
  //   - canReview: si puede dejar review ahora
  //   - reason: por qué no (si canReview=false)
  //   - orderId: la orden que respalda la review (si existe)
  //   - existingReviewId: si ya tiene una review (para editarla)
  async canUserReview(
    userId: string,
    tenantId: string,
    itemId: string,
    itemType: 'product' | 'service',
  ): Promise<{
    canReview: boolean;
    reason?: string;
    orderId?: string;
    existingReviewId?: string;
  }> {
    // 1. ¿Ya tiene una review?
    const existing = await this.reviewRepository.findOne({
      where: { userId, itemId, itemType },
      select: { id: true },
    });

    if (existing) {
      return {
        canReview: false,
        reason: 'Ya has dejado una reseña para este artículo. Podés editarla.',
        existingReviewId: existing.id,
      };
    }

    // 2. ¿Tiene una orden pagada con ese item?
    const orders = await this.orderRepository.find({
      where: {
        userId,
        tenantId,
        status: 'COMPLETED',
      },
      select: { id: true, items: true },
    });

    for (const order of orders) {
      if (!Array.isArray(order.items)) continue;

      for (const item of order.items as any[]) {
        const matchesProduct =
          itemType === 'product' &&
          item.productId === itemId;
        const matchesService =
          itemType === 'service' &&
          item.serviceId === itemId;

        if (matchesProduct || matchesService) {
          return {
            canReview: true,
            orderId: order.id,
          };
        }
      }
    }

    // 3. No cumple ninguna
    return {
      canReview: false,
      reason:
        'Solo podés reseñar artículos que hayas comprado (con la orden completada).',
    };
  }

  // ============================================================
  // 🔥 CREAR REVIEW (solo compradores verificados)
  // ============================================================
  async create(
    userId: string,
    tenantId: string,
    itemId: string,
    itemType: 'product' | 'service',
    rating: number,
    title: string | null,
    comment: string | null,
  ): Promise<ReviewWithUser> {
    // 1. Validar rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('El rating debe ser un número entero entre 1 y 5.');
    }

    // 2. Verificar que puede reseñar
    const check = await this.canUserReview(userId, tenantId, itemId, itemType);

    if (!check.canReview) {
      throw new ForbiddenException(check.reason || 'No podés dejar una reseña para este artículo.');
    }

    // 3. Crear la review
    const review = this.reviewRepository.create({
      tenantId,
      itemType,
      itemId,
      userId,
      orderId: check.orderId || null,
      rating,
      title: title?.trim() || null,
      comment: comment?.trim() || null,
      isVerifiedPurchase: !!check.orderId,
      isVisible: true,
    });

    const saved = await this.reviewRepository.save(review);

    this.logger.log(
      `✅ Review creada: user=${userId} item=${itemId} (${itemType}) rating=${rating}`,
    );

    // 4. Devolver con el user populado
    const withUser = await this.reviewRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    if (!withUser) {
      throw new NotFoundException('No se pudo recuperar la review guardada.');
    }

    return this.toReviewWithUser(withUser);
  }

  // ============================================================
  // 🔥 EDITAR REVIEW PROPIA
  // ============================================================
  async updateOwn(
    userId: string,
    reviewId: string,
    rating: number,
    title: string | null,
    comment: string | null,
  ): Promise<ReviewWithUser> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { user: true },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Solo podés editar tus propias reseñas.');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('El rating debe ser un número entero entre 1 y 5.');
    }

    review.rating = rating;
    review.title = title?.trim() || null;
    review.comment = comment?.trim() || null;

    const saved = await this.reviewRepository.save(review);
    return this.toReviewWithUser(saved);
  }

  // ============================================================
  // 🔥 ELIMINAR REVIEW PROPIA (soft delete con isVisible)
  // ============================================================
  async deleteOwn(userId: string, reviewId: string): Promise<{ success: boolean }> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Solo podés eliminar tus propias reseñas.');
    }

    // Soft delete: mantiene el dato pero lo oculta
    review.isVisible = false;
    await this.reviewRepository.save(review);

    this.logger.log(`🗑️ Review ${reviewId} ocultada por su autor`);

    return { success: true };
  }

  // ============================================================
  // 🔥 HELPER: convertir entity a ReviewWithUser
  // ============================================================
  private toReviewWithUser(review: ItemReview): ReviewWithUser {
    return {
      id: review.id,
      tenantId: review.tenantId,
      itemType: review.itemType,
      itemId: review.itemId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      ownerResponse: review.ownerResponse,
      ownerRespondedAt: review.ownerRespondedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        id: review.user?.id || review.userId,
        name: this.resolveUserName(review.user),
        avatarUrl: this.resolveUserAvatar(review.user),
      },
    };
  }

  // 🔥 Devuelve la primera URL de avatar disponible (avatarUrl > avatar > image)
  private resolveUserAvatar(user?: User | null): string | null {
    if (!user) return null;

    const anyUser = user as any;
    const url = anyUser.avatarUrl || anyUser.avatar || anyUser.image || null;

    return url && typeof url === 'string' && url.trim() !== '' ? url.trim() : null;
  }

  private resolveUserName(user?: User | null): string {
    if (!user) return 'Usuario';

    const anyUser = user as any;
    const full =
      anyUser.name ||
      anyUser.fullName ||
      `${anyUser.firstName || ''} ${anyUser.lastName || ''}`.trim();

    return full || 'Usuario';
  }

  
  // ============================================================
  // 🔥 RESPONDER A UNA REVIEW (solo el dueño del tenant)
  // ============================================================
  async respondToReview(
    reviewId: string,
    userId: string,
    tenantId: string,
    response: string,
  ): Promise<ReviewWithUser> {
    // 1. Validar texto
    const trimmed = (response || '').trim();

    if (!trimmed) {
      throw new BadRequestException('La respuesta no puede estar vacía.');
    }

    if (trimmed.length > 1500) {
      throw new BadRequestException('La respuesta no puede superar los 1500 caracteres.');
    }

    // 2. Buscar la review
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { user: true },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada.');
    }

    // 3. Verificar que sea del tenant correcto
    if (review.tenantId !== tenantId) {
      throw new ForbiddenException('No podés responder reseñas de otra tienda.');
    }

    // 4. Verificar que el usuario sea el dueño del tenant
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    // 🔥 Verificar que el usuario sea el dueño del tenant.
    // El user dueño tiene `users.tenantId === tenant.id`.
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!user || (user as any).tenantId !== tenantId) {
      throw new ForbiddenException(
        'Solo el dueño de la tienda puede responder reseñas.',
      );
    }

    // 5. Guardar respuesta
    review.ownerResponse = trimmed;
    review.ownerRespondedAt = new Date();

    await this.reviewRepository.save(review);

    this.logger.log(
      `💬 Respuesta agregada a review ${reviewId} por user ${userId}`,
    );

    return this.toReviewWithUser(review);
  }

  // ============================================================
  // 🔥 LISTAR TODAS LAS REVIEWS DEL TENANT (para el admin)
  // ============================================================
  async getAllByTenant(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      rating?: number;
      hasResponse?: boolean | null;
      itemId?: string;
      itemType?: 'product' | 'service';
    } = {},
  ): Promise<{ reviews: ReviewWithUser[]; total: number }> {
    const {
      limit = 20,
      offset = 0,
      rating,
      hasResponse = null,
      itemId,
      itemType,
    } = options;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.tenantId = :tenantId', { tenantId });

    // Filtro por rating
    if (rating !== undefined && rating !== null) {
      qb.andWhere('review.rating = :rating', { rating });
    }

    // Filtro por estado de respuesta
    if (hasResponse === true) {
      qb.andWhere('review.ownerResponse IS NOT NULL');
      qb.andWhere("review.ownerResponse != ''");
    } else if (hasResponse === false) {
      qb.andWhere(
        '(review.ownerResponse IS NULL OR review.ownerResponse = :empty)',
        { empty: '' },
      );
    }

    // Filtro por item
    if (itemId) {
      qb.andWhere('review.itemId = :itemId', { itemId });
    }
    if (itemType) {
      qb.andWhere('review.itemType = :itemType', { itemType });
    }

    // 🔥 Solo mostrar reviews visibles (las ocultas no son relevantes para admin)
    qb.andWhere('review.isVisible = :visible', { visible: true });

    qb.orderBy('review.createdAt', 'DESC')
      .take(Math.min(100, Math.max(1, limit)))
      .skip(Math.max(0, offset));

    const [reviews, total] = await qb.getManyAndCount();

    return {
      reviews: reviews.map((r) => this.toReviewWithUser(r)),
      total,
    };
  }

  // ============================================================
  // 🔥 MIS RESEÑAS (para el comprador)
  // ============================================================
  // Devuelve todas las reseñas del usuario logueado, con info
  // del producto/servicio populada para poder mostrarla en la card.
  async findMyReviews(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ reviews: any[]; total: number }> {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { userId, isVisible: true },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
      skip: Math.max(0, offset),
    });

    if (!reviews || reviews.length === 0) {
      return { reviews: [], total: 0 };
    }

    const productIds = reviews
      .filter((r) => r.itemType === 'product')
      .map((r) => r.itemId);

    const serviceIds = reviews
      .filter((r) => r.itemType === 'service')
      .map((r) => r.itemId);

    const products: any[] = productIds.length
      ? await this.reviewRepository.manager
          .createQueryBuilder()
          .select(['p.id AS id', 'p.name AS name', 'p."coverImage" AS "coverImage"', 'p."mediaUrls" AS "mediaUrls"'])
          .from('products', 'p')
          .where('p.id IN (:...ids)', { ids: productIds })
          .getRawMany()
      : [];

    const services: any[] = serviceIds.length
      ? await this.reviewRepository.manager
          .createQueryBuilder()
          .select(['s.id AS id', 's.name AS name', 's."coverImage" AS "coverImage"', 's."mediaUrls" AS "mediaUrls"'])
          .from('services', 's')
          .where('s.id IN (:...ids)', { ids: serviceIds })
          .getRawMany()
      : [];

    const productMap = new Map<string, any>();
    products.forEach((p) => {
      productMap.set(p.id, {
        id: p.id,
        name: p.name,
        coverImage: p.coverImage,
        mediaUrls: p.mediaUrls,
      });
    });

    const serviceMap = new Map<string, any>();
    services.forEach((s) => {
      serviceMap.set(s.id, {
        id: s.id,
        name: s.name,
        coverImage: s.coverImage,
        mediaUrls: s.mediaUrls,
      });
    });

    const enriched = reviews.map((review) => {
      const base = this.toReviewWithUser(review);
      const itemInfo =
        review.itemType === 'product'
          ? productMap.get(review.itemId)
          : serviceMap.get(review.itemId);

      return {
        ...base,
        item: itemInfo
          ? {
              id: itemInfo.id,
              name: itemInfo.name,
              coverImage: itemInfo.coverImage,
              mediaUrls: itemInfo.mediaUrls,
              type: review.itemType,
            }
          : {
              id: review.itemId,
              name: review.itemType === 'product' ? 'Producto' : 'Servicio',
              coverImage: null,
              mediaUrls: [],
              type: review.itemType,
            },
      };
    });

    return { reviews: enriched, total };
  }
}