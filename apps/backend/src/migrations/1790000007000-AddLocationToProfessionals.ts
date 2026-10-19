// apps/backend/src/migrations/1790000007000-AddLocationToProfessionals.ts

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLocationToProfessionals1790000007000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('professionals', [
      new TableColumn({
        name: 'currentlat',
        type: 'double precision',
        isNullable: true,
      }),
      new TableColumn({
        name: 'currentlng',
        type: 'double precision',
        isNullable: true,
      }),
      new TableColumn({
        name: 'lastseenat',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('professionals', 'lastseenat');
    await queryRunner.dropColumn('professionals', 'currentlng');
    await queryRunner.dropColumn('professionals', 'currentlat');
  }
}
