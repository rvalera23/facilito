// ============================================================
// ARCHIVO: backend/src/modules/account/entities/user-credit.entity.ts
// ============================================================
// Saldo a favor por (userId, tenantId). Cada comerciante maneja
// su propio saldo, sin contaminación cruzada entre tenants.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('user_credits')
@Index('UQ_user_credits_user_tenant', ['userId', 'tenantId'], {
  unique: true,
})
export class UserCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  @Index('IDX_user_credits_tenantId')
  tenantId: string;

  /**
   * Saldo actual del cliente en este comercio.
   * Positivo = el comercio le debe al cliente.
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}