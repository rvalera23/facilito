// ============================================================
// ARCHIVO: backend/src/migrations/1790000003000-AddBackupCodes.ts
// ============================================================
// Fase 4 — 2FA (TOTP):
//   - Tabla backup_codes para códigos de respaldo hasheados
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackupCodes1790000003000 implements MigrationInterface {
  name = 'AddBackupCodes1790000003000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "backup_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "codeHash" varchar(64) NOT NULL,
        "usedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_backup_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_backup_codes_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_backup_codes_user"
      ON "backup_codes" ("userId")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_backup_codes_hash"
      ON "backup_codes" ("codeHash")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "backup_codes"`);
  }
}
