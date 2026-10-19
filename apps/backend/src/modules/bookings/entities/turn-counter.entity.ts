import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('turn_counters')
@Index('UQ_turn_counters_tenant_date', ['tenantId', 'date'], { unique: true })
export class TurnCounterEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantid', type: 'uuid' })
  @Index('IDX_turn_counters_tenantid')
  tenantId: string;

  // Formato YYYY-MM-DD. Un contador por tenant por día.
  // Al cambiar el día, se crea una fila nueva con lastNumber = 0.
  @Column({ name: 'date', type: 'date' })
  date: string;

  // Último número asignado para ese (tenantId, date).
  // Se incrementa atómicamente con cada asignación.
  @Column({ name: 'lastnumber', type: 'int', default: 0 })
  lastNumber: number;

  @CreateDateColumn({ name: 'createdat', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat', type: 'timestamp' })
  updatedAt: Date;
}