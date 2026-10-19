// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/entities/delivery-zone.entity.ts
// Zona de delivery de un tenant.
// El polígono se guarda como GeoJSON en jsonb.
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
import { TenantEntity } from '../../tenants/entities/tenant.entity';

/**
 * Forma GeoJSON de un polígono cerrado:
 *   {
 *     "type": "Polygon",
 *     "coordinates": [[[lng, lat], [lng, lat], ... , [lng, lat]]]
 *   }
 * El primer y último punto deben coincidir (anillo cerrado).
 * Los círculos se representan como polígonos aproximados.
 */
export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lng, lat], ... ] ]
}

@Entity('delivery_zones')
export class DeliveryZoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'jsonb' })
  polygon: GeoPolygon;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ name: 'min_order_amount', type: 'numeric', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // --- RELACIONES ---
  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;
}