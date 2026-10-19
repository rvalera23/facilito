import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notifications')
// 🔥 ELIMINA ESTOS ÍNDICES QUE CAUSAN EL PROBLEMA
// @Index(['userid', 'read'])
// @Index(['tenantid', 'read'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userid' })
  @Index()  // 🔥 Solo el índice individual, no compuesto
  userId: string;

  @Column({ name: 'tenantid', nullable: true })
  @Index()  // 🔥 Solo el índice individual, no compuesto
  tenantId?: string;

  @Column({ name: 'orderid', nullable: true })
  orderId?: string;

  @Column({ name: 'bookingid', nullable: true })
  @Index()
  bookingId?: string;

  @Column({ nullable: true })
  type?: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'source', nullable: true, default: 'buyer' })
  @Index()
  source?: string;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}