import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChannelsToServices1790000011001 implements MigrationInterface {
  name = 'AddChannelsToServices1790000011001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "services"
        ADD COLUMN IF NOT EXISTS "availablekiosk" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "availableonline" boolean NOT NULL DEFAULT true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "services"
        DROP COLUMN IF EXISTS "availablekiosk",
        DROP COLUMN IF EXISTS "availableonline";
    `);
  }
}
