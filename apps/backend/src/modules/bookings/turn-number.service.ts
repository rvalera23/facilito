import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TurnCounterEntity } from './entities/turn-counter.entity';

// ============================================================
// TURN NUMBER SERVICE
// ============================================================
// Asigna turnNumbers correlativos por tenant por día.
//
// Formato: T-001, T-002, ..., T-999, T-1000, ...
//
// Atomicidad:
//   Usa INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING
//   para garantizar que nunca haya duplicados, incluso con
//   múltiples requests concurrentes.
//
// Reset diario:
//   El contador es por (tenantId, date). Al cambiar el día,
//   se crea una fila nueva con lastNumber = 0. El primer turno
//   del día es T-001.
// ============================================================

@Injectable()
export class TurnNumberService {
  private readonly logger = new Logger(TurnNumberService.name);

  private readonly PREFIX = 'T-';
  private readonly PADDING = 3;

  constructor(
    @InjectRepository(TurnCounterEntity)
    private readonly turnCounterRepo: Repository<TurnCounterEntity>,
  ) {}

  /**
   * Asigna el siguiente turnNumber para un tenant en una fecha dada.
   *
   * @param tenantId - UUID del tenant
   * @param date - Fecha en formato YYYY-MM-DD (día local del tenant)
   * @returns turnNumber formateado, ej: "T-001", "T-047", "T-1000"
   */
  async assign(tenantId: string, date: string): Promise<string> {
    if (!tenantId) {
      throw new Error('TurnNumberService.assign: tenantId es requerido');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(
        `TurnNumberService.assign: date debe ser YYYY-MM-DD, recibido: ${date}`,
      );
    }

    // ============================================================
    // INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING
    // ============================================================
    // Una sola query atómica. Postgres garantiza que:
    //   - Si no existe fila para (tenantId, date): la crea con lastNumber = 1.
    //   - Si existe: incrementa lastNumber y devuelve el nuevo valor.
    //   - Si dos requests llegan al mismo tiempo: una gana el INSERT,
    //     la otra cae en el DO UPDATE. Ambas obtienen números distintos.
    // ============================================================
    const result = await this.turnCounterRepo.query(
      `
      INSERT INTO "turn_counters" ("tenantid", "date", "lastnumber")
      VALUES ($1, $2, 1)
      ON CONFLICT ("tenantid", "date")
      DO UPDATE SET
        "lastnumber" = "turn_counters"."lastnumber" + 1,
        "updatedat" = now()
      RETURNING "lastnumber"
      `,
      [tenantId, date],
    );

    const lastNumber = Number(result?.[0]?.lastnumber ?? 0);

    if (!lastNumber || lastNumber < 1) {
      this.logger.error(
        `❌ TurnNumberService.assign: resultado inválido para tenant=${tenantId} date=${date}: ${JSON.stringify(result)}`,
      );
      throw new Error('No se pudo asignar el turnNumber');
    }

    const formatted = this.format(lastNumber);

    this.logger.log(
      `🎫 TurnNumber asignado: ${formatted} (tenant=${tenantId}, date=${date})`,
    );

    return formatted;
  }

  /**
   * Formatea el número crudo al formato público.
   * Ej: 1 → "T-001", 47 → "T-047", 1000 → "T-1000".
   */
  private format(number: number): string {
    const padded = String(number).padStart(this.PADDING, '0');
    return `${this.PREFIX}${padded}`;
  }
}