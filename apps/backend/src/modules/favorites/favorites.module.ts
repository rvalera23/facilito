import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { PricingModule } from '../pricing/pricing.module';
import { CurrencyModule } from '../currency/currency.module';
import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite, ProductEntity, ServiceEntity]),
    PricingModule,
    CurrencyModule,
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}