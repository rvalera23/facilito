// ARCHIVO: backend/src/modules/shipping-disputes/entities/shipping-dispute.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('shipping_disputes')
export class ShippingDisputeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  @Index()
  orderId: string;

  @Column({ name: 'buyer_id', type: 'uuid', nullable: true })
  @Index()
  buyerId: string | null;

  @Column({ name: 'seller_id', type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ length: 50 })
  reason: string;

  @Column('text', { name: 'buyer_message', nullable: true })
  buyerMessage?: string;

  @Column({ type: 'jsonb', name: 'evidence_urls', default: () => "'[]'::jsonb" })
  evidenceUrls: string[];

  @Column({ length: 30, default: 'open' })
  @Index()
  status: string;

  @Column('text', { name: 'seller_response', nullable: true })
  sellerResponse?: string;

  @Column({ type: 'timestamptz', name: 'seller_responded_at', nullable: true })
  sellerRespondedAt?: Date;

  @Column({ length: 30, name: 'resolution_type', nullable: true })
  resolutionType?: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    name: 'resolution_amount_usd',
    nullable: true,
  })
  resolutionAmountUsd?: number;

  @Column('text', { name: 'resolution_notes', nullable: true })
  resolutionNotes?: string;

  @Column({ type: 'timestamptz', name: 'escalated_at', nullable: true })
  escalatedAt?: Date;

  @Column('text', { name: 'escalated_reason', nullable: true })
  escalatedReason?: string;

  @Column({ type: 'timestamptz', name: 'auto_resolved_at', nullable: true })
  autoResolvedAt?: Date;

  @Column({ length: 30, name: 'auto_resolved_by', nullable: true })
  autoResolvedBy?: string;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'timestamptz', name: 'resolution_accepted_at', nullable: true })
  resolutionAcceptedAt?: Date;

  @Column({
    type: 'boolean',
    name: 'resolution_accepted_by_buyer',
    nullable: true,
  })
  resolutionAcceptedByBuyer?: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}