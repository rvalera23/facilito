import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuditService } from './audit.service';
import { AccountThrottlerGuard } from './account-throttler.guard';
import { EmailService } from './email.service';
import { TwoFactorService } from './two-factor.service';
import { BackupCode } from './entities/backup-code.entity';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthEvent } from './entities/auth-event.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserTenant } from '../tenants/entities/user-tenant.entity';

import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Tenant,
      UserTenant,
      RefreshToken,
      AuthEvent,
      PasswordReset,
      EmailVerification,
      BackupCode,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET_NEW ||
        process.env.JWT_SECRET ||
        'tu_secreto_super_seguro',
              signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenService,
    RefreshTokenService,
    AuditService,
    AccountThrottlerGuard,
    EmailService,
    TwoFactorService,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    TokenService,
    AuditService,
    RefreshTokenService,
    EmailService,
    TwoFactorService,
  ],
})
export class AuthModule {}
