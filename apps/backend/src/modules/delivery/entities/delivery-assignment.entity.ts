// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/entities/delivery-assignment.entity.ts
// Asignación de una orden a un repartidor.
// 1 orden = 1 assignment activo (UNIQUE en order_id).
// ==========================================

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
import { OrderEntity } from '../../orders/entities/order.entity';
import { DeliveryDriverEntity } from './delivery-driver.entity';

export type AssignmentStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

@Entity('delivery_assignments')
export class DeliveryAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  @Index()
  orderId: string;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  @Index()
  driverId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: AssignmentStatus;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // --- RELACIONES ---
  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @ManyToOne(() => DeliveryDriverEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver: DeliveryDriverEntity | null;
}
