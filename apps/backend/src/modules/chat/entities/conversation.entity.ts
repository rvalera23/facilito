// src/modules/chat/entities/conversation.entity.ts

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,  // 🔥 ESTA ES LA LÍNEA QUE FALTA
  ManyToOne, 
  OneToMany, 
  JoinColumn, 
  Column 
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ProductEntity } from '../../products/entities/product.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenantid' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantid' })
  tenant: Tenant;

  @Column({ name: 'buyerid' })
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerid' })
  buyer: User;

  @Column({ name: 'productid' })
  productId: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'productid' })
  product: ProductEntity;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}