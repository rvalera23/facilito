// ARCHIVO: apps/backend/src/modules/tenants/entities/tenant.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { Terminal } from '../../terminals/entities/terminal.entity';
import { UserTenant } from './user-tenant.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 'general' })
  niche: string;

  @Column({ nullable: true })
  slogan: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  currencies: string[];

  @Column({ name: 'primary_color', default: '#ea580c' })
  primaryColor: string;

  @Column({ name: 'secondary_color', default: '#0f172a' })
  secondaryColor: string;

  @Column({ name: 'accent_color', default: '#fbbf24', nullable: true })
  accentColor: string;

  @Column({ name: 'background_color', default: '#0b0f19', nullable: true })
  backgroundColor: string;

  @Column({ name: 'font_family', default: 'Quicksand', nullable: true })
  fontFamily: string;


// 🔥🔥🔥 AGREGAR fontWeight 🔥🔥🔥
@Column({ name: 'font_weight', type: 'int', default: 400, nullable: true })
fontWeight: number;

@Column({ name: 'hero_layout', type: 'varchar', nullable: true, default: 'default' })
heroLayout: string;  // ← Debe ser string, no opcional (porque tiene default)


  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl: string;

  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl: string;

  @Column({ name: 'work_modality', default: 'local', nullable: true })
  workModality: string;

  @Column({ name: 'model_type', default: 'product', nullable: true })
  modelType: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  zone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'owner_name', nullable: true })
  ownerName: string;

  @Column({ name: 'country_code', default: '+58', nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true, nullable: true })
  email: string;

  // 🔥 RIF - CORREGIDO: Ahora usa @Column en lugar de @IsString/@IsOptional
  @Column({ nullable: true })
  rif: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  tiktok: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  telegram: string;

  @Column({ name: 'x_twitter', nullable: true })
  xTwitter: string;

  @Column({ nullable: true })
  threads: string;

  @Column({ nullable: true })
  linkedin: string;

  @Column({ name: 'specific_config', type: 'jsonb', nullable: true })
  specificConfig: object;

  // NUEVOS CAMPOS PARA LIKES Y RATING
  @Column({ name: 'likes_count', type: 'int', default: 0 })
  likesCount: number;

  @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAvg: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  // NUEVOS CAMPOS PARA PIN DE SEGURIDAD
@Column({ name: 'security_pin', type: 'varchar', nullable: true })
securityPin: string | null;

@Column({ name: 'has_security_pin', type: 'boolean', default: false })
hasSecurityPin: boolean;

// ============================================================
// GEO — ubicación del negocio para descubrimiento por cercanía
// ============================================================
@Column({ type: 'double precision', nullable: true })
latitude: number | null;

@Column({ type: 'double precision', nullable: true })
longitude: number | null;

@Column({ name: 'geo_precision', type: 'varchar', length: 20, nullable: true })
geoPrecision: string | null;

@Column({ name: 'geo_source', type: 'varchar', length: 20, nullable: true })
geoSource: string | null;

  @Column({ name: 'geo_updated_at', type: 'timestamptz', nullable: true })
  geoUpdatedAt: Date | null;

  // ============================================================
  // DELIVERY — configuración de envío del negocio
  // ============================================================
  @Column({ name: 'delivery_base_fee', type: 'numeric', precision: 10, scale: 2, default: 0 })
  deliveryBaseFee: number;

  @Column({ name: 'delivery_per_km_fee', type: 'numeric', precision: 10, scale: 2, default: 0 })
  deliveryPerKmFee: number;

  @Column({ name: 'delivery_min_order', type: 'numeric', precision: 10, scale: 2, default: 0 })
  deliveryMinOrder: number;

  @Column({ name: 'delivery_max_radius_km', type: 'numeric', precision: 6, scale: 2, nullable: true })
  deliveryMaxRadiusKm: number | null;

  @Column({ name: 'delivery_prep_time_min', type: 'int', default: 15 })
  deliveryPrepTimeMin: number;

  @Column({ name: 'delivery_avg_speed_kmh', type: 'int', default: 20 })
  deliveryAvgSpeedKmh: number;

  @Column({ name: 'accepts_pickup', type: 'boolean', default: true })
  acceptsPickup: boolean;

  @Column({ name: 'delivery_local_enabled', type: 'boolean', default: false })
  deliveryLocalEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // --- RELACIONES ---
  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.tenant, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Terminal, (terminal) => terminal.tenant, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  terminals: Terminal[];

  @OneToMany(() => UserTenant, (userTenant) => userTenant.tenant, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  userTenants: UserTenant[];
}

export const TenantEntity = Tenant;
export type TenantEntity = Tenant;