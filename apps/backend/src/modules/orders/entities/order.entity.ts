// ARCHIVO: backend/src/modules/orders/entities/order.entity.ts

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
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import type { PaymentBreakdown } from '../types/payment-breakdown.type';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerAddress?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalAmountVes: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;

  // ============================================================
  // DELIVERY — snapshot del cálculo al momento del checkout
  // ============================================================
  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'delivery_fee_calculated' })
  deliveryFeeCalculated: number | null;

  @Column('decimal', { precision: 6, scale: 2, nullable: true, name: 'delivery_distance_km' })
  deliveryDistanceKm: number | null;

  @Column({ type: 'int', nullable: true, name: 'delivery_eta_minutes' })
  deliveryEtaMinutes: number | null;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true })
  orderType?: string;

  @Column({ nullable: true })
  paymentMethodUsed?: string;

  @Column({ nullable: true })
  bankSource?: string;

  @Column({ nullable: true })
  paymentReference?: string;

  // 🔥🔥🔥 METADATOS DE PAGO (LEGACY - compatibilidad) 🔥🔥🔥
  // Se mantiene intacto. Órdenes viejas siguen leyendo de aquí.
  // Órdenes nuevas con paymentBreakdown NO dependen de este campo.
  @Column({ type: 'jsonb', nullable: true })
  paymentMetadata?: {
    clientIdNumber?: string;
    clientIdType?: string;
    clientPhone?: string;
    clientAccountType?: string;
    senderEmail?: string;
    paymentProof?: string;
    proofUploaded?: boolean;
    proofUploadedAt?: string;
    bankSource?: string;
    paymentReference?: string;
    delivery?: {
      company?: string;
      companyName?: string;
      cost?: number;
      costUsd?: number;
      costVes?: number;
      exchangeRate?: number;
      estimatedDays?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      address?: string;
      status?: string;
      selected?: boolean;
      selectedAt?: string;
    };
  };

  // 🔥🔥🔥 DESGLOSE DE PAGOS MIXTOS CON VUELTO 🔥🔥🔥
  // Snapshot-first. El backend calcula, el frontend lee.
  // Órdenes viejas quedan en NULL y usan paymentMetadata.
  // Órdenes nuevas usan este campo si existe.
  @Column({ name: 'payment_breakdown', type: 'jsonb', nullable: true })
  paymentBreakdown?: PaymentBreakdown;

  @Column({ type: 'jsonb', nullable: true })
  serviceDetails?: {
    date: string;
    time: string;
    duration: number;
    notes?: string;
    professionalId?: string;
    professionalName?: string;
  };

  // ITEMS DE LA ORDEN - SNAPSHOT COMPLETO
  // Compatible con el formato viejo y con el nuevo.
  // TODOS los campos nuevos son opcionales para no romper nada.
  @Column({ type: 'jsonb' })
  items: Array<{
    productId?: string;
    serviceId?: string;
    name: string;
    type?: string;
    quantity?: number;
    price?: number;
    priceUsd?: number;
    priceVes?: number;
    ivaType?: string;
    ivaRate?: number;
    coverImage?: string;
    mediaUrls?: string[];
    durationMinutes?: number;
    appointmentDate?: string;
    appointmentTime?: string;
    rateUsd?: number;
    basePriceUSD?: number;
    basePriceVES?: number;
    hasDiscount?: boolean;
    discountPercentage?: number;
    discountAmountUSD?: number;
    discountAmountVES?: number;
    originalPriceUSD?: number;
    originalPriceVES?: number;
    taxAmountUSD?: number;
    taxAmountVES?: number;
    totalPriceUSD?: number;
    totalPriceVES?: number;
    subtotalUSD?: number;
    subtotalVES?: number;
    totalUSD?: number;
    totalVES?: number;
    exchangeRateUsed?: number;
    exchangeRateSource?: string;
    calculatedAt?: string;
  }>;

  @Column()
  tenantId: string;

  @Column({ nullable: true, default: 'web' })
  @Index()
  source?: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;
}