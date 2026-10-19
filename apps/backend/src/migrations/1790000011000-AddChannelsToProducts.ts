import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChannelsToProducts1790000011000 implements MigrationInterface {
  name = 'AddChannelsToProducts1790000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "availableKiosk" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "availableOnline" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "availableKiosk",
        DROP COLUMN IF EXISTS "availableOnline";
    `);
  }
}
