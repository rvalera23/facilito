// ============================================================
// ARCHIVO: backend/src/migrations/1790000000000-AddAuthSecurityTables.ts
// ============================================================
// Fase 1 — Fundaciones de seguridad:
//   - Campos nuevos en users (verificación email, lock, 2FA)
//   - Tabla refresh_tokens (rotación de sesiones)
//   - Tabla auth_events (auditoría)
// ============================================================

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSecurityTables1790000000000 implements MigrationInterface {
  name = 'AddAuthSecurityTables1790000000000';

  public async up(q: QueryRunner): Promise<void> {
    // 1) Campos nuevos en users
    await q.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "emailVerifiedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "failedLoginAttempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lockedUntil" timestamptz,
        ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "lastLoginIp" varchar(45),
        ADD COLUMN IF NOT EXISTS "totpSecret" varchar,
        ADD COLUMN IF NOT EXISTS "totpEnabled" boolean NOT NULL DEFAULT false
    `);

    // 2) Tabla refresh_tokens
    await q.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "revokedAt" timestamptz,
        "replacedByTokenId" uuid,
        "ip" varchar(45),
        "userAgent" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_expires"
      ON "refresh_tokens" ("userId", "expiresAt")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_hash"
      ON "refresh_tokens" ("tokenHash")`);

    // 3) Tabla auth_events
    await q.query(`
      CREATE TABLE IF NOT EXISTS "auth_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "eventType" varchar(50) NOT NULL,
        "ip" varchar(45),
        "userAgent" text,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_events_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_events_user_date"
      ON "auth_events" ("userId", "createdAt")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_auth_events_type_date"
      ON "auth_events" ("eventType", "createdAt")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "auth_events"`);
    await q.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await q.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "emailVerified",
        DROP COLUMN IF EXISTS "emailVerifiedAt",
        DROP COLUMN IF EXISTS "failedLoginAttempts",
        DROP COLUMN IF EXISTS "lockedUntil",
        DROP COLUMN IF EXISTS "lastLoginAt",
        DROP COLUMN IF EXISTS "lastLoginIp",
        DROP COLUMN IF EXISTS "totpSecret",
        DROP COLUMN IF EXISTS "totpEnabled"
    `);
  }
}
