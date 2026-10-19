// ==========================================
// ARCHIVO: apps/backend/src/app.module.ts
// ==========================================
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ProductsModule } from './modules/products/products.module';
import { ServicesModule } from './modules/services/services.module';
import { GeoModule } from './modules/geo/geo.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CartModule } from './modules/cart/cart.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { AccountModule } from './modules/account/account.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { TerminalsModule } from './modules/terminals/terminals.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ShippingDisputesModule } from './modules/shipping-disputes/shipping-disputes.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { QuickRepliesModule } from './modules/quick-replies/quick-replies.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '/opt/facilito/apps/backend/.env'],
    }),
        ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },    // 60 req/min por IP
      { name: 'login',   ttl: 60_000, limit: 5 },     // 5/min en login
      { name: 'forgot',  ttl: 3_600_000, limit: 3 },  // 3/hora (Fase 2)
      { name: 'verify',  ttl: 3_600_000, limit: 3 },  // 3/hora (Fase 3)
    ]),
    ScheduleModule.forRoot(), // 🔥 NUEVO: habilita @Cron, @Interval, @Timeout
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'facilito_db',
      autoLoadEntities: true,
      synchronize: false,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    TenantsModule,
    ProductsModule,
    ServicesModule,
        GeoModule,
    ProfessionalsModule,
    BookingsModule,
    ReviewsModule,
    OrdersModule,
    ShippingDisputesModule,
    AuthModule,
    CurrencyModule,
        PricingModule,
        CartModule,
    AccountModule,
    FavoritesModule,
    TerminalsModule,
    ChatModule,
    NotificationsModule,
    ReceiptsModule,
    QuickRepliesModule,
        DeliveryModule,
    RedisModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'favorites', method: RequestMethod.ALL },
        { path: 'favorites/*', method: RequestMethod.ALL },
        { path: 'chat', method: RequestMethod.ALL },
        { path: 'chat/*', method: RequestMethod.ALL },
        { path: 'notifications', method: RequestMethod.ALL },
        { path: 'notifications/*', method: RequestMethod.ALL },
        { path: 'quick-replies', method: RequestMethod.ALL },
        { path: 'quick-replies/*', method: RequestMethod.ALL }
      );
  }
}