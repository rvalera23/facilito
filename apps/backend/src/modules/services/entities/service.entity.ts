import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantid' })
  tenant: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'numeric', default: 0 })
  price: number;

  @Column({ name: 'durationminutes', type: 'int', default: 60 })
  durationMinutes: number;

  @Column({ name: 'maxcapacity', type: 'int', nullable: true })
  maxCapacity: number;

  @Column({ name: 'minadvancebooking', type: 'int', nullable: true, default: 0 })
  minAdvanceBooking: number;

  @Column({ name: 'servicemodality', type: 'varchar', length: 50, nullable: true })
  serviceModality: string;

  @Column({ name: 'requiresbooking', type: 'boolean', default: true })
  requiresBooking: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 50, default: 'Nuevo' })
  condition: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  warranty: string;

  @Column({ name: 'itemid', type: 'varchar', length: 100, nullable: true })
  itemId: string;

  @Column({ type: 'text', nullable: true })
  includes: string;

  @Column({ name: 'notincludes', type: 'text', nullable: true })
  notIncludes: string;

  @Column({ type: 'text', array: true, nullable: true })
  certifications: string[];

  @Column({ type: 'text', array: true, nullable: true })
  materials: string[];

  @Column({ name: 'clientrequirements', type: 'text', array: true, nullable: true })
  clientRequirements: string[];

  @Column({ name: 'cancellationpolicy', type: 'varchar', length: 50, nullable: true })
  cancellationPolicy: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ name: 'isactive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'availablekiosk', type: 'boolean', default: true })
  availableKiosk: boolean;

  @Column({ name: 'availableonline', type: 'boolean', default: true })
  availableOnline: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  features: string[];

  @Column({ name: 'mediaurls', type: 'text', array: true, default: '{}' })
  mediaUrls: string[];

  @Column({ name: 'coverimage', type: 'text', nullable: true })
  coverImage: string;

  // 🔥 NUEVA COLUMNA - AGREGADA AQUÍ
  @Column({ name: 'professionals', type: 'uuid', array: true, default: '{}' })
  professionals: string[];

  @Column({ type: 'jsonb', default: '{}' })
  metadata: any;

  @Column({ type: 'jsonb', nullable: true })
  attributes: any;

  // 🔥🔥🔥 NUEVOS CAMPOS DE OFERTA Y DESCUENTO 🔥🔥🔥
  // ============================================================
  // Indica si el servicio está activo en oferta
  @Column({ name: 'onsale', type: 'boolean', default: false })
  onSale: boolean;

  // Porcentaje de descuento (0-100)
  @Column({ name: 'discountpercentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number;

  // Fecha de inicio de la oferta (opcional)
  @Column({ name: 'discountstartdate', type: 'timestamp', nullable: true })
  discountStartDate: Date | null;

  // Fecha de fin de la oferta (opcional)
  @Column({ name: 'discountenddate', type: 'timestamp', nullable: true })
  discountEndDate: Date | null;
  // ============================================================

  @CreateDateColumn({ name: 'createdat', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat', type: 'timestamp' })
  updatedAt: Date;
}