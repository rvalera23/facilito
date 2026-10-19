import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptEntity } from './entities/receipt.entity';

@Injectable()
export class ReceiptNumberService {
  private readonly logger = new Logger(ReceiptNumberService.name);

  constructor(
    @InjectRepository(ReceiptEntity)
    private readonly receiptRepository: Repository<ReceiptEntity>,
  ) {}

  /**
   * Deriva el prefijo del comprobante a partir del nombre del negocio.
   * Ejemplos:
   *   "Facilitó Store" → "FS"
   *   "Abasto Bolívar" → "AB"
   *   "Joyería María"  → "JM"
   *   "Mi Tienda"      → "MT"
   */
  derivePrefix(tenantName: string, customPrefix?: string | null): string {
    if (customPrefix && customPrefix.trim().length > 0) {
      return customPrefix.trim().toUpperCase().slice(0, 5);
    }
    if (!tenantName || tenantName.trim().length === 0) {
      return 'FC';
    }
    const words = tenantName
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0 && /[a-zA-Z0-9]/.test(w));

    if (words.length === 0) return 'FC';
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /**
   * Genera el siguiente número de comprobante para un tenant dado.
   * Formato: {PREFIX}-{YEAR}-{SEQUENCE:5}
   * Ejemplo: FS-2026-00001
   *
   * IMPORTANTE: usa el queryRunner existente para participar
   * de la transacción del llamador. Esto garantiza atomicidad:
   * si la orden falla, el comprobante no se crea.
   */
  async generateNextNumber(
    queryRunner: any,
    tenantId: string,
    tenantName: string,
    customPrefix?: string | null,
  ): Promise<{
    receiptNumber: string;
    prefix: string;
    year: number;
    sequence: number;
  }> {
    const year = new Date().getFullYear();
    const prefix = this.derivePrefix(tenantName, customPrefix);

    // 🔥 Obtener el último sequence del tenant+año usando LOCK para evitar race conditions
    const lastReceipt = await queryRunner.manager
      .createQueryBuilder(ReceiptEntity, 'receipt')
      .setLock('pessimistic_write')
      .where('receipt.tenantId = :tenantId', { tenantId })
      .andWhere('receipt.receiptYear = :year', { year })
      .orderBy('receipt.receiptSequence', 'DESC')
      .limit(1)
      .getOne();

    const nextSequence = lastReceipt ? lastReceipt.receiptSequence + 1 : 1;
    const sequencePadded = String(nextSequence).padStart(5, '0');
    const receiptNumber = `${prefix}-${year}-${sequencePadded}`;

    this.logger.log(
      `📄 [ReceiptNumber] Generado: ${receiptNumber} (tenant: ${tenantId}, seq: ${nextSequence})`,
    );

    return {
      receiptNumber,
      prefix,
      year,
      sequence: nextSequence,
    };
  }
}