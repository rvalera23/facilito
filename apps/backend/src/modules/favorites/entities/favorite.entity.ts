import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export type FavoriteItemType = 'product' | 'service';

@Entity('favorites')
@Unique('favorites_user_item_type_unique', ['userId', 'itemId', 'itemType'])
@Index(['itemId', 'itemType'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'item_type', type: 'varchar', length: 20, default: 'product' })
  itemType: FavoriteItemType;

  // ⚠️ NO hay relación ORM con ProductEntity ni con ServiceEntity.
  // El item (producto o servicio) se carga manualmente en el Service.
  // Esto evita romper con servicios y elimina la necesidad de FK en BD.

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}