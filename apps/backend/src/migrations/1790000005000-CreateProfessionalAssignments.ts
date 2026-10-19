// apps/backend/src/migrations/1790000005000-CreateProfessionalAssignments.ts

import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateProfessionalAssignments1790000005000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear la tabla
    await queryRunner.createTable(
      new Table({
        name: 'professional_assignments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'booking_id',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'professional_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'assigned_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'accepted_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'in_transit_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'in_service_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 2. FKs
    await queryRunner.createForeignKey(
      'professional_assignments',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_prof_assign_booking',
      }),
    );

    await queryRunner.createForeignKey(
      'professional_assignments',
      new TableForeignKey({
        columnNames: ['professional_id'],
        referencedTableName: 'professionals',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_prof_assign_professional',
      }),
    );

    // 3. Índices
    await queryRunner.createIndices('professional_assignments', [
      new TableIndex({
        name: 'IDX_prof_assign_booking_id',
        columnNames: ['booking_id'],
      }),
      new TableIndex({
        name: 'IDX_prof_assign_professional_id',
        columnNames: ['professional_id'],
      }),
      new TableIndex({
        name: 'IDX_prof_assign_status',
        columnNames: ['status'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropear en orden inverso
    await queryRunner.dropTable('professional_assignments', true);
  }
}
