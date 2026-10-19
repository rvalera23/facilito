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
import { ServiceEntity } from '../../services/entities/service.entity';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantid' })
  tenant: TenantEntity;

  @Column({ name: 'serviceid' })
  serviceId: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceid' })
  service: ServiceEntity;

  @Column({ name: 'professionalid', nullable: true })
  professionalId: string;

  @ManyToOne(() => ProfessionalEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'professionalid' })
  professional: ProfessionalEntity;

  @Column({ name: 'userid', nullable: true })
  userId: string;

  @Column({ name: 'orderid', nullable: true })
  orderId: string;

  @Column({ name: 'customername', type: 'varchar', length: 255 })
  customerName: string;

  @Column({ name: 'customerphone', type: 'varchar', length: 50 })
  customerPhone: string;

  @Column({ name: 'customeremail', type: 'varchar', length: 255, nullable: true })
  customerEmail: string;

  @Column({ name: 'bookingdate', type: 'date' })
  bookingDate: Date;

  @Column({ name: 'starttime', type: 'time' })
  startTime: string;

  @Column({ name: 'endtime', type: 'time' })
  endTime: string;

  @Column({ name: 'durationminutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  // 🔥 Modalidad del servicio: presencial (en local) o domicilio (a casa)
  @Column({
    name: 'service_modality',
    type: 'varchar',
    length: 20,
    default: 'presencial',
  })
  serviceModality: 'presencial' | 'domicilio';

  // 🔥 Fecha del último cambio de status. Para auditoría y para el cron de auto-cierre.
  @Column({ name: 'statusupdatedat', type: 'timestamp', nullable: true })
  statusUpdatedAt: Date;

  @Column({ name: 'turnnumber', type: 'varchar', length: 20, nullable: true })
  turnNumber: string;

  @Column({ name: 'qrcode', type: 'text', nullable: true })
  qrCode: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'mediaurls', type: 'text', array: true, default: '{}' })
  mediaUrls: string[];

  @Column({ name: 'coverimage', type: 'text', nullable: true })
  coverImage: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: any;

  @Column({ type: 'jsonb', nullable: true })
  attributes: any;

  // ============================================================
  // 🔥 SNAPSHOT DE PRICING (Fase 5)
  // ============================================================
  // Guarda el precio al momento de crear la reserva.
  // Nullable para compatibilidad con reservas existentes.
  // Se llena cuando el backend calcula con PricingService.
  @Column({ name: 'pricingsnapshot', type: 'jsonb', nullable: true })
  pricingSnapshot: {
    basePriceUSD?: number;
    basePriceVES?: number;
    totalPriceUSD?: number;
    totalPriceVES?: number;
    taxAmountUSD?: number;
    taxAmountVES?: number;
    ivaType?: string;
    ivaRate?: number;
    durationMinutes?: number;
    exchangeRateUsed?: number;
    exchangeRateSource?: string;
    calculatedAt?: string;
  } | null;

  @CreateDateColumn({ name: 'createdat', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat', type: 'timestamp' })
  updatedAt: Date;
}