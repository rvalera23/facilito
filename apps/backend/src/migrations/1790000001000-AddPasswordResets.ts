// ============================================================
// ARCHIVO: backend/src/migrations/1790000001000-AddPasswordResets.ts
// ============================================================
// Fase 2 — Reset de contraseña:
//   - Tabla password_resets para tokens de reset de un solo uso
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResets1790000001000 implements MigrationInterface {
  name = 'AddPasswordResets1790000001000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "usedAt" timestamptz,
        "ip" varchar(45),
        "userAgent" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_resets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_resets_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_password_resets_user"
      ON "password_resets" ("userId", "expiresAt")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_password_resets_hash"
      ON "password_resets" ("tokenHash")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "password_resets"`);
  }
}
