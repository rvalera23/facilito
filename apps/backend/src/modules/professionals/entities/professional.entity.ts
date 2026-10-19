import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('professionals')
export class ProfessionalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantid' })
  tenant: TenantEntity;

  @Index()
  @Column({ name: 'userid', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userid' })
  user: User | null;
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, default: '{}' })
  specialties: string[];

  @Column({ name: 'serviceids', type: 'uuid', array: true, default: '{}' })
  serviceIds: string[];

  @Column({ type: 'jsonb', default: '{}' })
  schedule: any;

  @Column({ type: 'jsonb', default: '[]' })
  breaks: any[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'reviews_count', type: 'int', default: 0 })
  reviewsCount: number;

  @Column({ name: 'isactive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;



  // 🔥 Ubicación en vivo (para tracking de servicios a domicilio)
  @Column({ name: 'currentlat', type: 'double precision', nullable: true })
  currentLat: number | null;

  @Column({ name: 'currentlng', type: 'double precision', nullable: true })
  currentLng: number | null;

  @Column({ name: 'lastseenat', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @Column({ name: 'mediaurls', type: 'text', array: true, default: '{}' })
  mediaUrls: string[];

  @Column({ name: 'coverimage', type: 'text', nullable: true })
  coverImage: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes: any;

  @CreateDateColumn({ name: 'createdat', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat', type: 'timestamp' })
  updatedAt: Date;
}