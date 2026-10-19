// ============================================================
// ARCHIVO: backend/src/migrations/1790000002000-AddEmailVerifications.ts
// ============================================================
// Fase 3 — Verificación de email:
//   - Tabla email_verifications para tokens de verificación de un solo uso
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerifications1790000002000 implements MigrationInterface {
  name = 'AddEmailVerifications1790000002000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "email_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "usedAt" timestamptz,
        "ip" varchar(45),
        "userAgent" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_verifications_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verifications_user"
      ON "email_verifications" ("userId", "expiresAt")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_email_verifications_hash"
      ON "email_verifications" ("tokenHash")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "email_verifications"`);
  }
}
