// ARCHIVO: apps/backend/src/modules/shipping-disputes/shipping-disputes.scheduler.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ShippingDisputeEntity } from './entities/shipping-dispute.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../auth/audit.service';
import { AccountService } from '../account/account.service';
import { OrdersService } from '../orders/orders.service';
import { addBusinessDays } from '../../common/utils/business-days.util';

// ============================================================
// SCHEDULER: Auto-progresión de disputas de envío
// ============================================================
// Corre cada hora. Aplica 3 reglas de auto-resolución alineadas
// con el estándar de Amazon A-Z:
//
// 1. open > 5 días hábiles sin respuesta del vendedor → escalated
// 2. escalated > 5 días hábiles sin resolución → auto_resolved_buyer + refund
// 3. seller_responded con refund/replacement > 3 días hábiles sin aceptar
//    → auto_resolved_buyer + refund
//
// Todas las transiciones son idempotentes: se chequea el estado y
// los timestamps antes de actuar. Si el cron corre dos veces, la
// segunda no encuentra disputas elegibles.
@Injectable()
export class ShippingDisputesScheduler {
  private readonly logger = new Logger(ShippingDisputesScheduler.name);

  constructor(
    @InjectRepository(ShippingDisputeEntity)
    private readonly disputeRepository: Repository<ShippingDisputeEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly accountService: AccountService,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'autoProgressDisputes' })
  async handleAutoProgress() {
    this.logger.log('⏰ [ShippingDisputesScheduler] Ejecutando auto-progresión...');

    try {
      const escalated = await this.autoEscalateStale();
      const autoResolved = await this.autoResolveEscalated();
      const accepted = await this.autoAcceptSellerOffers();

      this.logger.log(
        `✅ [ShippingDisputesScheduler] Escalados: ${escalated}, Auto-resueltos: ${autoResolved}, Auto-aceptados: ${accepted}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ [ShippingDisputesScheduler] Error: ${error.message}`,
        error.stack,
      );
    }
  }

  // ── Regla 1: open > 5 días hábiles sin respuesta → escalated ──

  private async autoEscalateStale(): Promise<number> {
    const now = new Date();
    const threshold = addBusinessDays(now, -5);

    const stale = await this.disputeRepository.find({
      where: {
        status: 'open',
        createdAt: LessThan(threshold),
      },
    });

    let count = 0;
    for (const dispute of stale) {
      if (dispute.escalatedAt) continue;

      dispute.status = 'escalated';
      dispute.escalatedAt = now;
      dispute.escalatedReason = 'Vendedor no respondió en 5 días hábiles';

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
          autoEscalated: true,
          reason: saved.escalatedReason,
        },
      );

      count++;
    }

    return count;
  }

  // ── Regla 2: escalated > 5 días hábiles sin resolver → auto refund ──

  private async autoResolveEscalated(): Promise<number> {
    const now = new Date();
    const threshold = addBusinessDays(now, -5);

    const stale = await this.disputeRepository.find({
      where: {
        status: 'escalated',
        escalatedAt: LessThan(threshold),
      },
    });

    let count = 0;
    for (const dispute of stale) {
      if (dispute.autoResolvedAt || dispute.resolvedAt) continue;

      const order = await this.ordersService.findOne(dispute.orderId);
      if (!order) {
        this.logger.warn(
          `[autoResolveEscalated] Orden ${dispute.orderId} no encontrada para disputa ${dispute.id}`,
        );
        continue;
      }

      const amountUsd = Number(order.totalAmount) || 0;
      if (amountUsd <= 0) {
        this.logger.warn(
          `[autoResolveEscalated] Orden ${dispute.orderId} sin totalAmount válido`,
        );
        continue;
      }

      dispute.status = 'auto_resolved_buyer';
      dispute.resolutionType = 'refund';
      dispute.resolutionAmountUsd = amountUsd;
      dispute.resolutionNotes = 'Reembolso automático: vendedor no resolvió en 5 días hábiles';
      dispute.autoResolvedAt = now;
      dispute.autoResolvedBy = 'system_seller_timeout';
      dispute.resolvedAt = now;

      const saved = await this.disputeRepository.save(dispute);

      // Refund a la cuenta del comprador
      if (saved.buyerId) {
        await this.accountService.creditUser(
          saved.buyerId,
          saved.tenantId,
          amountUsd,
        );
      }

      await this.notificationsService.createShippingDisputeNotification(
        saved,
        'auto_resolved',
        'both',
      );

      await this.auditService.log(
        saved.buyerId ?? null,
        'dispute_auto_resolved',
        undefined,
        {
          disputeId: saved.id,
          orderId: saved.orderId,
          tenantId: saved.tenantId,
          amountUsd,
          reason: 'seller_timeout',
        },
      );

      count++;
    }

    return count;
  }

  // ── Regla 3: seller_responded con refund/replacement > 3 días hábiles sin aceptar ──

  private async autoAcceptSellerOffers(): Promise<number> {
    const now = new Date();
    const threshold = addBusinessDays(now, -3);

    const stale = await this.disputeRepository.find({
      where: {
        status: 'seller_responded',
        sellerRespondedAt: LessThan(threshold),
      },
    });

    let count = 0;
    for (const dispute of stale) {
      if (dispute.autoResolvedAt || dispute.resolvedAt) continue;
      if (dispute.resolutionAcceptedByBuyer !== null && dispute.resolutionAcceptedByBuyer !== undefined) continue;
      if (dispute.resolutionType !== 'refund' && dispute.resolutionType !== 'replacement') continue;

      dispute.status = 'auto_resolved_buyer';
      dispute.resolutionAcceptedByBuyer = true;
      dispute.resolutionAcceptedAt = now;
      dispute.autoResolvedAt = now;
      dispute.autoResolvedBy = 'system_buyer_no_accept';
      dispute.resolvedAt = now;

      const saved = await this.disputeRepository.save(dispute);

      // Si fue refund, acreditar
      if (saved.resolutionType === 'refund' && saved.resolutionAmountUsd && saved.buyerId) {
        await this.accountService.creditUser(
          saved.buyerId,
          saved.tenantId,
          Number(saved.resolutionAmountUsd),
        );
      }

      await this.notificationsService.createShippingDisputeNotification(
        saved,
        'auto_resolved',
        'both',
      );

      await this.auditService.log(
        saved.buyerId ?? null,
        'dispute_auto_resolved',
        undefined,
        {
          disputeId: saved.id,
          orderId: saved.orderId,
          tenantId: saved.tenantId,
          amountUsd: saved.resolutionAmountUsd,
          reason: 'buyer_no_accept',
        },
      );

      count++;
    }

    return count;
  }
}