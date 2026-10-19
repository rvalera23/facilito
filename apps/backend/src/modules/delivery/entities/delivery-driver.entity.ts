// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/entities/delivery-driver.entity.ts
// Perfil de repartidor. Híbrido: pool (tenant_id NULL) o propio (tenant_id seteado).
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
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { TenantEntity } from '../../tenants/entities/tenant.entity';

export type DriverStatus = 'offline' | 'online' | 'busy' | 'paused';
export type VehicleType = 'moto' | 'carro' | 'bici' | 'a_pie';

@Entity('delivery_drivers')
@Unique('UQ_delivery_drivers_user_tenant', ['userId', 'tenantId'])
export class DeliveryDriverEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_delivery_drivers_user')
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'offline' })
  @Index()
  status: DriverStatus;

  @Column({ name: 'current_lat', type: 'double precision', nullable: true })
  currentLat: number | null;

  @Column({ name: 'current_lng', type: 'double precision', nullable: true })
  currentLng: number | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 20, nullable: true })
  vehicleType: VehicleType | null;

  @Column({ name: 'vehicle_plate', type: 'varchar', length: 20, nullable: true })
  vehiclePlate: string | null;

  @Column({ name: 'max_active_orders', type: 'int', default: 1 })
  maxActiveOrders: number;

  @Column({ name: 'rating_avg', type: 'numeric', precision: 3, scale: 2, default: 0 })
  ratingAvg: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // --- RELACIONES ---
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity | null;
}
