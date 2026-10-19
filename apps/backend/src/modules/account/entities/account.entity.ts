// apps/backend/src/modules/account/entities/account.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('users')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ unique: true, type: 'varchar', length: 255 })
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  password?: string;

  @Column({ default: 'credentials', type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  role: string | null;

  @Column({ type: 'boolean', default: true })
  onboarding_completed: boolean;

  @Column({ nullable: true, type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  phone: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  city: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  address: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  deliveryCity: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  state: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  municipality: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({ nullable: true, type: 'varchar', length: 20 })
  preferredCurrency: string;

  // 🔥 Cédula / RIF personal (V-12345678, E-..., J-..., G-...)
  @Column({ nullable: true, type: 'varchar', length: 20 })
  id_number: string | null;

  @Column({ nullable: true, type: 'varchar', length: 2 })
  id_type: string | null;

  // 🔥 Si TRUE, en checkout se autocompletan clientPhone + clientIdNumber
  @Column({ type: 'boolean', default: false })
  pago_movil_same_as_profile: boolean;

  // 🔥 CAMPOS DE AVATAR
  @Column({ nullable: true, type: 'varchar', length: 500, name: 'avatarUrl' })
  avatarUrl: string | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  avatar: string | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  image: string | null;

  // --- Campos de diseño ---
  @Column({ nullable: true, type: 'varchar', length: 50 })
  primary_color: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  secondary_color: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  accent_color: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  background_color: string;

  @Column({ nullable: true, type: 'varchar', length: 50 })
  font_family: string;

  // 🔥🔥🔥 AGREGAR fontWeight 🔥🔥🔥
  @Column({ nullable: true, type: 'int', default: 400 })
  fontWeight: number;

  // ✅ Estado de verificación de email (el frontend lo usa para el badge "Verificada")
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}