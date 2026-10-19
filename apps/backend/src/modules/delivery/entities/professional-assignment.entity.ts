// apps/backend/src/modules/delivery/entities/professional-assignment.entity.ts

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
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { ProfessionalEntity } from '../../professionals/entities/professional.entity';


export type AssignmentStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'in_transit'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'rejected';

@Entity('professional_assignments')
export class ProfessionalAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid', unique: true })
  @Index()
  bookingId: string;

  @Column({ name: 'professional_id', type: 'uuid', nullable: true })
  @Index()
  professionalId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: AssignmentStatus;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'in_transit_at', type: 'timestamptz', nullable: true })
  inTransitAt: Date | null;

  @Column({ name: 'in_service_at', type: 'timestamptz', nullable: true })
  inServiceAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // --- RELACIONES ---
  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  @ManyToOne(() => ProfessionalEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalEntity | null;
}