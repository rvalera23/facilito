// ============================================================
// ARCHIVO: backend/src/migrations/1789939000000-CreateUserCredits.ts
// ============================================================
// Crea la tabla `user_credits` para manejar saldos a favor
// por (userId, tenantId). Cada comerciante maneja su propio
// saldo, sin contaminación cruzada entre tenants.
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserCredits1789939000000 implements MigrationInterface {
  name = 'CreateUserCredits1789939000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabla principal
    await queryRunner.query(`
      CREATE TABLE "user_credits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "balance" numeric(14,2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_credits" PRIMARY KEY ("id")
      )
    `);

    // 2. Foreign keys
    await queryRunner.query(`
      ALTER TABLE "user_credits"
      ADD CONSTRAINT "FK_user_credits_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_credits"
      ADD CONSTRAINT "FK_user_credits_tenant"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
    `);

    // 3. Índice único (userId, tenantId) — un solo saldo por par
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_credits_user_tenant"
      ON "user_credits" ("userId", "tenantId")
    `);

    // 4. Índice para consultas por tenant (reportes Fase 6)
    await queryRunner.query(`
      CREATE INDEX "IDX_user_credits_tenantId"
      ON "user_credits" ("tenantId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_credits_tenantId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_user_credits_user_tenant"`);
    await queryRunner.query(`
      ALTER TABLE "user_credits"
      DROP CONSTRAINT IF EXISTS "FK_user_credits_tenant"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_credits"
      DROP CONSTRAINT IF EXISTS "FK_user_credits_user"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_credits"`);
  }
}