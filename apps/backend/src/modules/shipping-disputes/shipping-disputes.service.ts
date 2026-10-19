// ARCHIVO: backend/src/modules/shipping-disputes/shipping-disputes.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingDisputeEntity } from './entities/shipping-dispute.entity';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../auth/audit.service';
import { addBusinessDays, businessDaysBetween } from '../../common/utils/business-days.util';

@Injectable()
export class ShippingDisputesService {
  private readonly logger = new Logger(ShippingDisputesService.name);

  constructor(
    @InjectRepository(ShippingDisputeEntity)
    private readonly disputeRepository: Repository<ShippingDisputeEntity>,
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  // ── Helpers de ownership ───────────────────────────────────

  /**
   * Valida que el user autenticado pueda operar sobre el tenant.
   * - admin/seller/owner: siempre permitido.
   * - buyer con `user.tenantId === tenantId`: permitido (es el dueño).
   * - cualquier otro: ForbiddenException.
   */
  private assertOwnership(
    tenantId: string,
    user: { id?: string; role?: string; activeRole?: string; tenantId?: string },
  ): void {
    const role = (user?.role || user?.activeRole || '').toLowerCase();
    const isAdminLike =
      role === 'admin' || role === 'seller' || role === 'owner';
    const isOwnerOfTenant = user?.tenantId === tenantId;

    if (!isAdminLike && !isOwnerOfTenant) {
      throw new ForbiddenException(
        'No tenés permiso para operar sobre este tenant',
      );
    }
  }

  // ── Queries ────────────────────────────────────────────────

  async findById(id: string): Promise<ShippingDisputeEntity> {
    const dispute = await this.disputeRepository.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');
    return dispute;
  }

  async findByOrder(orderId: string): Promise<ShippingDisputeEntity | null> {
    return this.disputeRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByBuyer(buyerId: string): Promise<ShippingDisputeEntity[]> {
    return this.disputeRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findByTenant(tenantId: string): Promise<ShippingDisputeEntity[]> {
    return this.disputeRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Igual que findByTenant pero valida que el user autenticado tenga permiso
   * sobre ese tenant. Usa el helper privado `assertOwnership`.
   */
  async findByTenantForSeller(
    tenantId: string,
    user: { id?: string; role?: string; activeRole?: string; tenantId?: string },
  ): Promise<ShippingDisputeEntity[]> {
    this.assertOwnership(tenantId, user);
    return this.findByTenant(tenantId);
  }
  // ── Consulta pública: ¿puede reportar? ─────────────────────

  /**
   * Determina si el comprador puede reportar un problema en esta orden.
   * Devuelve un objeto con el motivo si no puede.
   * Usado por el frontend para mostrar/ocultar el botón "Reportar problema".
   */
  async canReport(orderId: string): Promise<{
    canReport: boolean;
    reason?: string;
    availableAt?: string;
  }> {
    const order = await this.ordersService.findOne(orderId);
    if (!order) {
      return { canReport: false, reason: 'Orden no encontrada' };
    }

    const delivery = (order as any)?.paymentMetadata?.delivery;
    if (!delivery) {
      return { canReport: false, reason: 'Sin información de envío' };
    }

    const fulfillment = (order as any)?.paymentMetadata?.fulfillment;
    if (fulfillment !== 'shipping') {
      return { canReport: false, reason: 'No es una encomienda' };
    }

    if (delivery.status === 'delivered') {
      return { canReport: false, reason: 'Ya entregado' };
    }

    const selectedAt = delivery.selectedAt
      ? new Date(delivery.selectedAt)
      : new Date(order.createdAt);

    const estimatedDaysStr: string = delivery.estimatedDays || '';
    const match = estimatedDaysStr.match(/(\d+)(?:\s*-\s*(\d+))?/);
    const maxDays = match ? parseInt(match[2] ?? match[1], 10) : 3;

    const grace = 3;
    const reportAvailableAt = addBusinessDays(selectedAt, maxDays + grace);

    if (new Date() < reportAvailableAt) {
      const diff = businessDaysBetween(new Date(), reportAvailableAt);
      return {
        canReport: false,
        reason: `Faltan ${diff} días hábiles`,
        availableAt: reportAvailableAt.toISOString(),
      };
    }

    return { canReport: true, availableAt: reportAvailableAt.toISOString() };
  }

  // ── Helpers de validación ──────────────────────────────────
  /**
   * Determina si el comprador ya puede reportar un problema en esta orden.
   * Regla: selectedAt + MAX(estimatedDays) + 3 días hábiles de gracia.
   * Si no hay estimatedDays parseable, usa 3 días hábiles por defecto.
   */
  private assertCanReport(order: any): void {
    const delivery = order?.paymentMetadata?.delivery;
    if (!delivery) {
      throw new BadRequestException(
        'La orden no tiene información de envío. No se puede reportar.',
      );
    }

    if (delivery.status === 'delivered') {
      throw new BadRequestException(
        'La encomienda ya figura como entregada. Contactá al vendedor directamente.',
      );
    }

    const selectedAt = delivery.selectedAt
      ? new Date(delivery.selectedAt)
      : new Date(order.createdAt);

    // Parsear "2-3 días hábiles" → 3 (máximo)
    const estimatedDaysStr: string = delivery.estimatedDays || '';
    const match = estimatedDaysStr.match(/(\d+)(?:\s*-\s*(\d+))?/);
    const maxDays = match
      ? parseInt(match[2] ?? match[1], 10)
      : 3;

    const grace = 3;
    const reportAvailableAt = addBusinessDays(selectedAt, maxDays + grace);

    if (new Date() < reportAvailableAt) {
      const diff = businessDaysBetween(new Date(), reportAvailableAt);
      throw new BadRequestException(
        `Todavía no podés reportar. Faltan ${diff} días hábiles para habilitar el reporte.`,
      );
    }
  }

  // ── Mutations ──────────────────────────────────────────────

  async create(params: {
    orderId: string;
    buyerId: string;
    reason: string;
    buyerMessage?: string;
  }): Promise<ShippingDisputeEntity> {
    // 1. Cargar la orden
    const order = await this.ordersService.findOne(params.orderId);
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // 2. Verificar ownership del comprador
    if (order.userId !== params.buyerId) {
      throw new ForbiddenException('Solo el comprador de la orden puede reportar');
    }

    // 3. Verificar fulfillment = shipping
    const fulfillment = (order?.paymentMetadata as any)?.fulfillment;
    if (fulfillment !== 'shipping') {
      throw new BadRequestException(
        'Solo se pueden reportar problemas en órdenes con encomienda.',
      );
    }

    // 4. Verificar ventana de reporte
    this.assertCanReport(order);

    // 5. Verificar que no haya disputa activa
    const existing = await this.findByOrder(params.orderId);
    const activeStatuses = ['open', 'seller_responded', 'escalated'];
    if (existing && activeStatuses.includes(existing.status)) {
      throw new BadRequestException(
        'Ya existe una disputa activa para esta orden',
      );
    }

    // 6. Crear
    const dispute = this.disputeRepository.create({
      orderId: params.orderId,
      buyerId: params.buyerId,
      sellerId: null,
      tenantId: order.tenantId,
      reason: params.reason,
      buyerMessage: params.buyerMessage,
      status: 'open',
      evidenceUrls: [],
      metadata: {},
    });

    const saved = await this.disputeRepository.save(dispute);

    // 7. Notificar al vendedor
    await this.notificationsService.createShippingDisputeNotification(
      saved,
      'opened',
      'seller',
    );

    // 8. Auditar
    await this.auditService.log(params.buyerId, 'dispute_opened', undefined, {
      disputeId: saved.id,
      orderId: saved.orderId,
      tenantId: saved.tenantId,
      reason: saved.reason,
    });

    return saved;
  }

  async respond(
    id: string,
    sellerId: string,
    response: string,
    user: { id?: string; role?: string; activeRole?: string; tenantId?: string },
  ): Promise<ShippingDisputeEntity> {
    const dispute = await this.findById(id);
    this.assertOwnership(dispute.tenantId, user);
    // (ownership validation va acá — ver siguiente bloque)

    if (dispute.status !== 'open' && dispute.status !== 'escalated') {
      throw new BadRequestException(
        `No se puede responder una disputa en estado "${dispute.status}"`,
      );
    }

    dispute.sellerId = sellerId;
    dispute.sellerResponse = response;
    dispute.sellerRespondedAt = new Date();
    dispute.status = 'seller_responded';

    const saved = await this.disputeRepository.save(dispute);

    await this.notificationsService.createShippingDisputeNotification(
      saved,
      'seller_responded',
      'buyer',
    );

    await this.auditService.log(sellerId, 'dispute_responded', undefined, {
      disputeId: saved.id,
      orderId: saved.orderId,
      tenantId: saved.tenantId,
    });

    return saved;
  }

  async escalate(
    id: string,
    reason?: string,
  ): Promise<ShippingDisputeEntity> {
    const dispute = await this.findById(id);

    if (dispute.status !== 'seller_responded' && dispute.status !== 'open') {
      throw new BadRequestException(
        `No se puede escalar una disputa en estado "${dispute.status}"`,
      );
    }

    dispute.status = 'escalated';
    dispute.escalatedAt = new Date();
    dispute.escalatedReason = reason || 'Sin acuerdo';

    const saved = await this.disputeRepository.save(dispute);

    await this.notificationsService.createShippingDisputeNotification(
      saved,
      'escalated',
      'seller',
    );

    await this.auditService.log(
      dispute.buyerId ?? null,
      'dispute_escalated',
      undefined,
      {
        disputeId: saved.id,
        orderId: saved.orderId,
        tenantId: saved.tenantId,
        reason: saved.escalatedReason,
      },
    );

    return saved;
  }

  async resolve(
    id: string,
    sellerId: string,
    resolution: {
      type: 'refund' | 'replacement' | 'proof_of_delivery';
      amountUsd?: number;
      notes?: string;
    },
    user: { id?: string; role?: string; activeRole?: string; tenantId?: string },
  ): Promise<ShippingDisputeEntity> {
    const dispute = await this.findById(id);
    this.assertOwnership(dispute.tenantId, user);

    if (dispute.status !== 'seller_responded' && dispute.status !== 'escalated') {
      throw new BadRequestException(
        `No se puede resolver una disputa en estado "${dispute.status}"`,
      );
    }

    if (resolution.type === 'refund' && !resolution.amountUsd) {
      throw new BadRequestException(
        'Una resolución de tipo "refund" requiere amountUsd',
      );
    }

    dispute.sellerId = sellerId;
    dispute.resolutionType = resolution.type;
    dispute.resolutionAmountUsd = resolution.amountUsd;
    dispute.resolutionNotes = resolution.notes;

    if (resolution.type === 'proof_of_delivery') {
      dispute.status = 'resolved_seller';
      dispute.resolvedAt = new Date();
    } else {
      // refund / replacement → queda pendiente de aceptación del comprador
      dispute.status = 'seller_responded';
    }

    const saved = await this.disputeRepository.save(dispute);

    await this.notificationsService.createShippingDisputeNotification(
      saved,
      'resolved',
      'buyer',
    );

    await this.auditService.log(sellerId, 'dispute_resolved', undefined, {
      disputeId: saved.id,
      orderId: saved.orderId,
      tenantId: saved.tenantId,
      resolutionType: saved.resolutionType,
      resolutionAmountUsd: saved.resolutionAmountUsd,
    });

    return saved;
  }

  async acceptResolution(
    id: string,
    buyerId: string,
    accepted: boolean,
  ): Promise<ShippingDisputeEntity> {
    const dispute = await this.findById(id);

    if (dispute.buyerId !== buyerId) {
      throw new ForbiddenException('Solo el comprador puede aceptar/rechazar');
    }

    dispute.resolutionAcceptedByBuyer = accepted;
    dispute.resolutionAcceptedAt = new Date();

    if (accepted) {
      dispute.status = 'resolved_buyer';
      dispute.resolvedAt = new Date();
    } else {
      dispute.status = 'escalated';
      dispute.escalatedAt = new Date();
      dispute.escalatedReason = 'Comprador rechazó la oferta';
    }

    const saved = await this.disputeRepository.save(dispute);

    await this.notificationsService.createShippingDisputeNotification(
      saved,
      accepted ? 'resolved' : 'escalated',
      'seller',
    );

    await this.auditService.log(buyerId, 'dispute_resolved', undefined, {
      disputeId: saved.id,
      orderId: saved.orderId,
      tenantId: saved.tenantId,
      accepted,
    });

    return saved;
  }
}