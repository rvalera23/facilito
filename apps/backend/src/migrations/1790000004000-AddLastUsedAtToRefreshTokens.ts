import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastUsedAtToRefreshTokens1790000004000 implements MigrationInterface {
  name = 'AddLastUsedAtToRefreshTokens1790000004000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "refresh_tokens"
        ADD COLUMN IF NOT EXISTS "lastUsedAt" timestamptz
    `);
    await q.query(`
      UPDATE "refresh_tokens"
        SET "lastUsedAt" = "createdAt"
        WHERE "lastUsedAt" IS NULL
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "lastUsedAt"`);
  }
}
