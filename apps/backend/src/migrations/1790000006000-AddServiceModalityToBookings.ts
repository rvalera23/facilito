// apps/backend/src/migrations/1790000006000-AddServiceModalityToBookings.ts

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddServiceModalityToBookings1790000006000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'service_modality',
        type: 'varchar',
        length: '20',
        default: "'presencial'",
        isNullable: false,
      }),
    );

    // Índice para filtrar por modalidad (útil para reportes)
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_service_modality" ON "bookings" ("service_modality")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_bookings_service_modality"`,
    );
    await queryRunner.dropColumn('bookings', 'service_modality');
  }
}
