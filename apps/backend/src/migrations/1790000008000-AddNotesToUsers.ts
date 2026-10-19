// apps/backend/src/migrations/1790000008000-AddNotesToUsers.ts

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNotesToUsers1790000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'notes',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'notes');
  }
}
