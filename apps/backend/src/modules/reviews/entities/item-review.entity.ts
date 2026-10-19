// ==========================================
// ARCHIVO: apps/backend/src/modules/reviews/entities/item-review.entity.ts
// ==========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

// ============================================================
// 🔥 REVIEWS DE PRODUCTOS Y SERVICIOS
// ============================================================
// Una sola tabla para productos y servicios, diferenciados por `itemType`.
//
// Reglas:
//   - Un usuario solo puede dejar 1 review por item (Unique constraint).
//   - Solo compradores verificados (tienen una orden con ese item).
//   - El dueño del tenant puede responder (ownerResponse).
//   - Soft-delete con isVisible (para moderación sin perder data).

@Entity('item_reviews')
@Unique(['userId', 'itemId', 'itemType'])
@Index(['tenantId', 'itemId', 'itemType'])
export class ItemReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  // 🔥 'product' o 'service'
  @Column({ type: 'varchar', length: 20, name: 'item_type' })
  itemType: 'product' | 'service';

  // 🔥 FK al producto o servicio (según itemType)
  @Column({ type: 'uuid', name: 'item_id' })
  itemId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // 🔥 FK a la orden que verifica la compra (nullable para reviews viejas)
  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  // 🔥 Calificación 1-5
  @Column({ type: 'int' })
  rating: number;

  // 🔥 Título corto opcional
  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  // 🔥 Comentario principal
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // 🔥 Si la compra fue verificada (existe una orden con ese item)
  @Column({ type: 'boolean', name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean;

  // 🔥 Visible públicamente (soft delete / moderación)
  @Column({ type: 'boolean', name: 'is_visible', default: true })
  isVisible: boolean;

  // 🔥 Respuesta del dueño del tenant (Fase 2)
  @Column({ type: 'text', name: 'owner_response', nullable: true })
  ownerResponse: string | null;

  @Column({ type: 'timestamp', name: 'owner_responded_at', nullable: true })
  ownerRespondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ============================================================
  // 🔥 RELACIONES
  // ============================================================
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}