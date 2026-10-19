import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('terminals')
export class Terminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantId' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255 })
  token: string;

  @Column({ name: 'kiosk_slug', length: 50, default: 'main' })
  kioskSlug: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ length: 50, default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: object;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}