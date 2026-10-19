// src/modules/quick-replies/entities/quick-reply.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('quick_replies')
@Index(['tenantId'])
export class QuickReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // 🔥 Título corto que ve el admin en el botón del picker
  @Column({ type: 'varchar', length: 80 })
  label: string;

  // 🔥 Texto completo, puede tener variables {{...}}
  @Column({ type: 'text' })
  text: string;

  // 🔥 Agrupación opcional: "General", "Ventas", "Pagos", etc.
  @Column({ type: 'varchar', length: 40, nullable: true })
  category: string | null;

  // 🔥 Si es true, viene del seed inicial (no se puede borrar, solo editar)
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  // 🔥 Orden de aparición en la lista
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}