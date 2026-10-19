import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTurnCounters1789937319126 implements MigrationInterface {
  name = 'CreateTurnCounters1789937319126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // TABLA turn_counters
    // ============================================================
    // Contadores diarios de turnNumber por tenant.
    // Una fila por (tenantId, date). El campo `lastnumber` se
    // incrementa atómicamente con cada asignación.
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE "turn_counters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantid" uuid NOT NULL,
        "date" date NOT NULL,
        "lastnumber" integer NOT NULL DEFAULT 0,
        "createdat" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedat" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_turn_counters" PRIMARY KEY ("id")
      )
    `);

    // ============================================================
    // ÍNDICE SIMPLE en tenantid
    // ============================================================
    await queryRunner.query(`
      CREATE INDEX "IDX_turn_counters_tenantid"
      ON "turn_counters" ("tenantid")
    `);

    // ============================================================
    // ÍNDICE ÚNICO COMPUESTO (tenantid, date)
    // ============================================================
    // Garantiza que solo hay una fila por tenant por día.
    // Es la defensa en profundidad del TurnNumberService:
    // si el servicio falla en atomicidad, la DB lo bloquea aquí.
    // ============================================================
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_turn_counters_tenant_date"
      ON "turn_counters" ("tenantid", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_turn_counters_tenant_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_turn_counters_tenantid"`);
    await queryRunner.query(`DROP TABLE "turn_counters"`);
  }
}