// ==========================================
// ARCHIVO: apps/backend/src/modules/reviews/reviews.module.ts
// ==========================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ItemReview } from './entities/item-review.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemReview,
      OrderEntity,
      Tenant,
      User,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}