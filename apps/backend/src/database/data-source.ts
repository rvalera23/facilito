import 'dotenv/config';
import { DataSource } from 'typeorm';

// ============================================================
// ENTIDADES
// ============================================================
// Importadas explícitamente porque el CLI de TypeORM no usa
// `autoLoadEntities`. Si se agrega una entidad nueva al proyecto,
// hay que sumarla también aquí.
// ============================================================

import { User } from '../modules/auth/entities/user.entity';
import { OrderEntity } from '../modules/orders/entities/order.entity';
import { Terminal } from '../modules/terminals/entities/terminal.entity';
import { Conversation } from '../modules/chat/entities/conversation.entity';
import { Message } from '../modules/chat/entities/message.entity';
import { TenantEntity } from '../modules/tenants/entities/tenant.entity';
import { PaymentMethod } from '../modules/tenants/entities/payment-method.entity';
import { StoreRating } from '../modules/tenants/entities/store-rating.entity';
import { StoreLike } from '../modules/tenants/entities/store-like.entity';
import { UserTenant } from '../modules/tenants/entities/user-tenant.entity';
import { ItemReview } from '../modules/reviews/entities/item-review.entity';
import { Favorite } from '../modules/favorites/entities/favorite.entity';
import { ServiceEntity } from '../modules/services/entities/service.entity';
import { ProfessionalEntity } from '../modules/professionals/entities/professional.entity';
import { ProductEntity } from '../modules/products/entities/product.entity';
import { Account } from '../modules/account/entities/account.entity';
import { BookingEntity } from '../modules/bookings/entities/booking.entity';
import { ReceiptEntity } from '../modules/receipts/entities/receipt.entity';
import { NotificationEntity } from '../modules/notifications/entities/notification.entity';
import { UserCredit } from '../modules/account/entities/user-credit.entity';
import { TurnCounterEntity } from '../modules/bookings/entities/turn-counter.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { AuthEvent } from '../modules/auth/entities/auth-event.entity';
import { PasswordReset } from '../modules/auth/entities/password-reset.entity';
import { EmailVerification } from '../modules/auth/entities/email-verification.entity';
import { BackupCode } from '../modules/auth/entities/backup-code.entity';
import { DeliveryDriverEntity } from '../modules/delivery/entities/delivery-driver.entity';

// ============================================================
// DATA SOURCE
// ============================================================
// Punto de entrada del CLI de TypeORM. NO lo usa la aplicación
// en runtime — la app usa `TypeOrmModule` en `app.module.ts`
// con `autoLoadEntities: true`.
//
// Este archivo solo se usa para los comandos:
//   npm run migration:generate
//   npm run migration:run
//   npm run migration:revert
//   npm run migration:show
// ============================================================

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'facilito_db',
  entities: [
    User,
    OrderEntity,
    Terminal,
    Conversation,
    Message,
    TenantEntity,
    PaymentMethod,
    StoreRating,
    StoreLike,
    UserTenant,
    ItemReview,
    Favorite,
    ServiceEntity,
    ProfessionalEntity,
    ProductEntity,
    Account,
    BookingEntity,
        TurnCounterEntity,

    ReceiptEntity,
    NotificationEntity,
    UserCredit, // 🔥 NUEVO: saldo a favor por (userId, tenantId)
    RefreshToken,
    AuthEvent,
    PasswordReset,
    EmailVerification,
    BackupCode,
    DeliveryDriverEntity,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});