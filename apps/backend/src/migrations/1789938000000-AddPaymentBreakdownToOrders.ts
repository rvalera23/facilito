// ============================================================
// ARCHIVO: backend/src/database/migrations/1789938000000-AddPaymentBreakdownToOrders.ts
// ============================================================
// Agrega la columna JSONB `payment_breakdown` a `orders`.
//
// Compatible con `OrderEntity.paymentBreakdown` (name: 'payment_breakdown').
//
// Las órdenes viejas quedan en NULL → el frontend hace fallback
// a la lógica actual (paymentMethodUsed, paymentMetadata, etc.).
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentBreakdownToOrders1789938000000 implements MigrationInterface {
  name = 'AddPaymentBreakdownToOrders1789938000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "payment_breakdown" JSONB NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_payment_breakdown_gin"
      ON "orders"
      USING GIN ("payment_breakdown" jsonb_path_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_payment_breakdown_status"
      ON "orders" (("payment_breakdown"->>'status'))
      WHERE "payment_breakdown" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_payment_breakdown_change_resolution"
      ON "orders" (("payment_breakdown"->'change'->>'resolution'))
      WHERE "payment_breakdown" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_orders_payment_breakdown_change_resolution"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_orders_payment_breakdown_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_orders_payment_breakdown_gin"`);
    await queryRunner.query(`
      ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_breakdown"
    `);
  }
}