// src/modules/chat/entities/message.entity.ts

import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversationid' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages)
  @JoinColumn({ name: 'conversationid' })
  conversation: Conversation;

  @Column({ name: 'senderid' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderid' })
  sender: User;

  @Column('text')
  content: string;

  // 🔥 NUEVA COLUMNA: isRead
  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}