// ARCHIVO: apps/backend/src/modules/auth/entities/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserTenant } from '../../tenants/entities/user-tenant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', default: 'credentials' })
  provider: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string;

  @Column({ type: 'boolean', default: true })
  onboarding_completed: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ name: 'phone_is_whatsapp', type: 'boolean', default: true })
  phone_is_whatsapp: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  deliveryCity: string;

  @Column({ type: 'varchar', nullable: true })
  preferredCurrency: string;

  // 🔥 Cédula / RIF personal (V-12345678, E-..., J-..., G-...)
  @Column({ type: 'varchar', length: 20, nullable: true })
  id_number: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  id_type: string | null;

  // 🔥 Si TRUE, en checkout se autocompletan clientPhone + clientIdNumber
  @Column({ type: 'boolean', default: false })
  pago_movil_same_as_profile: boolean;

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  municipality: string;

  @Column({ type: 'numeric', nullable: true })
  latitude: number;

  @Column({ type: 'numeric', nullable: true })
  longitude: number;

    @Column({ name: 'geo_precision', type: 'varchar', length: 20, nullable: true })
  geoPrecision: string | null;

  @Column({ name: 'geo_source', type: 'varchar', length: 20, nullable: true })
  geoSource: string | null;

  @Column({ name: 'geo_updated_at', type: 'timestamptz', nullable: true })
  geoUpdatedAt: Date | null;

  @Column({ type: 'varchar', default: '#ea580c' })
  primary_color: string;

  @Column({ type: 'varchar', default: '#0f172a' })
  secondary_color: string;

  @Column({ type: 'varchar', nullable: true, default: '#fbbf24' })
  accent_color: string;

  @Column({ type: 'varchar', nullable: true, default: '#0b0f19' })
  background_color: string;

  @Column({ type: 'varchar', nullable: true, default: 'Quicksand' })
  font_family: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

    // === Fase 1: seguridad ===
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp: string | null;

  @Column({ type: 'varchar', nullable: true })
  totpSecret: string | null;

  @Column({ type: 'boolean', default: false })
  totpEnabled: boolean;

  // 🔥 CORREGIDO: createdAt (coincide con la base de datos)
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // 🔥 CORREGIDO: updatedAt (coincide con la base de datos)
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => UserTenant, (userTenant) => userTenant.user)
  userTenants: UserTenant[];

  // 🔥 DELIVERY — perfil de repartidor (si este user lo es)
  @OneToOne(
    () => require('../../delivery/entities/delivery-driver.entity').DeliveryDriverEntity,
    (driver: any) => driver.user,
  )
  driver?: any;
}