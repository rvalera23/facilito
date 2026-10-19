// backend/src/modules/products/entities/product.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  itemId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'published', nullable: true })
  status: string;

  @Column({ type: 'boolean', default: true })
  availableKiosk: boolean;

  @Column({ type: 'boolean', default: true })
  availableOnline: boolean;

  @Column({ default: 'product' })
  itemType: string;

  @Column({ type: 'integer', nullable: true })
  durationMinutes: number;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ default: 'Nuevo', nullable: true })
  condition: string;

  @Column({ nullable: true })
  warranty: string;

  @Column({ nullable: true })
  dimensions: string;

  @Column('text', { array: true, nullable: true })
  features: string[];

  @Column({ type: 'text', nullable: true })
  coverImage: string;

  @Column('text', { array: true, nullable: true })
  mediaUrls: string[];

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @Column({ type: 'varchar', default: 'excluded' })
  ivaType: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 16 })
  ivaRate: number;

  // ✅ ✅ ✅ NUEVOS CAMPOS DE OFERTA Y DESCUENTO ✅ ✅ ✅
  // ============================================================
  // 🔥 Indica si el producto está activo en oferta
  @Column({ type: 'boolean', default: false })
  onSale: boolean;

  // 🔥 Porcentaje de descuento (0-100)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number;

  // 🔥 Fecha de inicio de la oferta (opcional)
  @Column({ type: 'timestamp', nullable: true })
  discountStartDate: Date | null;

  // 🔥 Fecha de fin de la oferta (opcional)
  @Column({ type: 'timestamp', nullable: true })
  discountEndDate: Date | null;
  // ============================================================

  // 🔥🔥🔥 NUEVOS CAMPOS DE INVENTARIO AVANZADO 🔥🔥🔥
  // ============================================================
  // 💰 Costo unitario del producto (para calcular margen y valor a costo)
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  cost: number | null;

  // ⚠️ Umbral de stock bajo por producto (override del global del tenant)
  @Column({ type: 'int', nullable: true })
  minStock: number | null;

  // 📊 Contador de unidades vendidas (para analytics)
  @Column({ type: 'int', default: 0 })
  totalSold: number;

  // 🕒 Fecha de última modificación manual del stock
  @Column({ type: 'timestamp', nullable: true })
  lastStockUpdate: Date | null;
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}