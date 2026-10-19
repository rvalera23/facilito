import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptEntity } from './entities/receipt.entity';
import { ReceiptNumberService } from './receipt-number.service';

export interface CreateReceiptData {
  tenantId: string;
  orderId: string;
  tenantName: string;
  customPrefix?: string | null;
  customerSnapshot: ReceiptEntity['customerSnapshot'];
  itemsSnapshot: ReceiptEntity['itemsSnapshot'];
  totalsSnapshot: ReceiptEntity['totalsSnapshot'];
  paymentSnapshot?: ReceiptEntity['paymentSnapshot'];
  tenantSnapshot?: ReceiptEntity['tenantSnapshot'];
}

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepository: Repository<ReceiptEntity>,
    private readonly receiptNumberService: ReceiptNumberService,
  ) {}

  /**
   * Crea un receipt dentro de una transacción existente.
   * Se llama desde OrdersService.create() justo después de guardar la orden.
   */
  async createFromOrder(
    queryRunner: any,
    data: CreateReceiptData,
  ): Promise<ReceiptEntity> {
    this.logger.log(
      `📄 [ReceiptsService] Creando comprobante para orden ${data.orderId}`,
    );

    // 1. Generar el número
    const { receiptNumber, prefix, year, sequence } =
      await this.receiptNumberService.generateNextNumber(
        queryRunner,
        data.tenantId,
        data.tenantName,
        data.customPrefix,
      );

    // 2. Crear la entidad
    const receipt = queryRunner.manager.create(ReceiptEntity, {
      tenantId: data.tenantId,
      orderId: data.orderId,
      receiptNumber,
      receiptYear: year,
      receiptSequence: sequence,
      receiptPrefix: prefix,
      issuedAt: new Date(),
      customerSnapshot: data.customerSnapshot,
      itemsSnapshot: data.itemsSnapshot,
      totalsSnapshot: data.totalsSnapshot,
      paymentSnapshot: data.paymentSnapshot || null,
      tenantSnapshot: data.tenantSnapshot || null,
      status: 'issued',
    });

    // 3. Guardar
    const savedReceipt = await queryRunner.manager.save(receipt);

    this.logger.log(
      `✅ [ReceiptsService] Comprobante guardado: ${savedReceipt.receiptNumber} (id: ${savedReceipt.id})`,
    );

    return savedReceipt;
  }

  /**
   * Busca el receipt de una orden.
   */
  async findByOrderId(orderId: string): Promise<ReceiptEntity | null> {
    return this.receiptRepository.findOne({
      where: { orderId },
    });
  }

  /**
   * Lista los receipts de un tenant.
   */
  async findByTenant(
    tenantId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ receipts: ReceiptEntity[]; total: number }> {
    const qb = this.receiptRepository
      .createQueryBuilder('receipt')
      .where('receipt.tenantId = :tenantId', { tenantId })
      .orderBy('receipt.issuedAt', 'DESC');

    if (options?.fromDate) {
      qb.andWhere('receipt.issuedAt >= :fromDate', {
        fromDate: options.fromDate,
      });
    }
    if (options?.toDate) {
      qb.andWhere('receipt.issuedAt <= :toDate', { toDate: options.toDate });
    }
    if (options?.status) {
      qb.andWhere('receipt.status = :status', { status: options.status });
    }

    const total = await qb.getCount();

    if (options?.limit) {
      qb.take(options.limit);
    }
    if (options?.offset) {
      qb.skip(options.offset);
    }

    const receipts = await qb.getMany();
    return { receipts, total };
  }

  /**
   * Cancela un receipt (por ejemplo, si la orden se cancela).
   */
  async cancel(orderId: string, reason: string): Promise<ReceiptEntity> {
    const receipt = await this.findByOrderId(orderId);
    if (!receipt) {
      throw new NotFoundException(
        `No se encontró comprobante para la orden ${orderId}`,
      );
    }

    if (receipt.status === 'cancelled') {
      this.logger.warn(
        `⚠️ [ReceiptsService] El comprobante ${receipt.receiptNumber} ya estaba cancelado`,
      );
      return receipt;
    }

    receipt.status = 'cancelled';
    receipt.cancelledAt = new Date();
    receipt.cancelledReason = reason;

    const updated = await this.receiptRepository.save(receipt);
    this.logger.log(
      `🗑️ [ReceiptsService] Comprobante cancelado: ${updated.receiptNumber}`,
    );

    return updated;
  }
}