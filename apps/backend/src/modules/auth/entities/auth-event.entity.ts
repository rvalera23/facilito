import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

export type AuthEventType =
  | 'login_success' | 'login_failed' | 'logout'
  | 'password_reset_requested' | 'password_reset_completed' | 'password_changed'
  | 'email_verified'
  | 'refresh_token_used' | 'refresh_token_revoked'
  | '2fa_enabled' | '2fa_disabled' | '2fa_verified'
  | 'account_locked'
  | 'dispute_opened' | 'dispute_responded' | 'dispute_escalated'
  | 'dispute_resolved' | 'dispute_auto_resolved'
  | 'order_completed_with_pending_shipping';

@Entity('auth_events')
@Index(['userId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class AuthEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'varchar', length: 50 })
  eventType: AuthEventType;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}