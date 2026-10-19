import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUniqueUserIdFromDeliveryDrivers1790000009000
  implements MigrationInterface
{
  name = 'RemoveUniqueUserIdFromDeliveryDrivers1790000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Quitar el UNIQUE(user_id) viejo
    await queryRunner.query(
      `ALTER TABLE "delivery_drivers"
         DROP CONSTRAINT IF EXISTS "delivery_drivers_user_id_key"`,
    );

    // 2. UNIQUE(user_id, tenant_id) — para vínculos por tenant
    await queryRunner.query(
      `ALTER TABLE "delivery_drivers"
         ADD CONSTRAINT "UQ_delivery_drivers_user_tenant"
         UNIQUE ("user_id", "tenant_id")`,
    );

    // 3. UNIQUE parcial — evita duplicados de pool (tenant_id IS NULL)
    //    porque en Postgres NULL != NULL y el UNIQUE compuesto no los detecta.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_delivery_drivers_user_pool"
         ON "delivery_drivers" ("user_id")
         WHERE "tenant_id" IS NULL`,
    );

    // 4. (Opcional, pero recomendado) índice de búsqueda por user_id
    //    El índice idx_delivery_drivers_user ya existe; no lo tocamos.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_delivery_drivers_user_pool"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_drivers"
         DROP CONSTRAINT IF EXISTS "UQ_delivery_drivers_user_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_drivers"
         ADD CONSTRAINT "delivery_drivers_user_id_key" UNIQUE ("user_id")`,
    );
  }
}