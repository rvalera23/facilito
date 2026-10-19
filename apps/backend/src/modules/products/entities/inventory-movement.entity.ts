// apps/backend/src/modules/products/entities/inventory-movement.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductEntity } from './product.entity';

@Entity('inventory_movements')
@Index(['productId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  tenantId: string;

  @Column({ type: 'int' })
  delta: number; // +10, -3, etc.

  @Column({ type: 'int' })
  previousQty: number;

  @Column({ type: 'int' })
  newQty: number;

  @Column({ type: 'varchar', length: 50 })
  reason: string; // 'sale' | 'restock' | 'adjustment' | 'return' | 'damage' | 'initial'

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ProductEntity;

  @CreateDateColumn()
  createdAt: Date;
}