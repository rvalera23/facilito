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
import { OrderEntity } from '../../orders/entities/order.entity';

@Entity('receipts')
@Index(['tenantId', 'receiptNumber'], { unique: true })
@Index(['tenantId', 'receiptYear', 'receiptSequence'], { unique: true })
@Index(['orderId'], { unique: true })
export class ReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  orderId: string;

  @Column({ length: 50 })
  receiptNumber: string;

  @Column('int')
  receiptYear: number;

  @Column('int')
  receiptSequence: number;

  @Column({ length: 10, default: 'FC' })
  receiptPrefix: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date;

  // ============================================================
  // SNAPSHOTS (congelados al momento de emitir)
  // ============================================================
  @Column({ type: 'jsonb' })
  customerSnapshot: {
    name: string;
    idType?: string | null;
    idNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };

  @Column({ type: 'jsonb' })
  itemsSnapshot: Array<{
    name: string;
    quantity: number;
    unitPriceVes: number;
    totalVes: number;
    ivaType: string;
    ivaRate: number;
    ivaAmount: number;
  }>;

  @Column({ type: 'jsonb' })
  totalsSnapshot: {
    subtotalBaseVes: number;
    ivaBreakdown: Array<{ rate: number; base: number; amount: number }>;
    totalExemptVes: number;
    totalIvaVes: number;
    totalVes: number;
    totalUsd: number;
    exchangeRate: number;
    deliveryCostVes?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  paymentSnapshot: {
    method?: string | null;
    reference?: string | null;
    bankSource?: string | null;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  tenantSnapshot: {
    name: string;
    rif?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  // ============================================================
  // ESTADO
  // ============================================================
  @Column({ length: 20, default: 'issued' })
  status: 'issued' | 'cancelled' | 'reissued';

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancelledReason: string | null;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: OrderEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}