// 🔥 Mock del módulo otplib porque v13 usa ESM y Jest no lo transforma.
// Como mockeamos TwoFactorService completo, no necesitamos otplib real.
jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
  verify: jest.fn().mockResolvedValue({ valid: true }),
  generateURI: jest.fn().mockReturnValue('otpauth://...'),
  generate: jest.fn().mockResolvedValue('123456'),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,...'),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('$2b$10$mockhash'),
  hashSync: jest.fn().mockReturnValue('$2b$10$mockhash'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { HttpException, UnauthorizedException, BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserTenant } from '../tenants/entities/user-tenant.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { BackupCode } from './entities/backup-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenService } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuditService } from './audit.service';
import { AccountThrottlerGuard } from './account-throttler.guard';
import { EmailService } from './email.service';
import { TwoFactorService } from './two-factor.service';

// ============================================================
// MOCKS
// ============================================================

function makeUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-1';
  user.email = 'test@test.com';
  user.name = 'Test User';
  user.password = bcrypt.hashSync('Test1234', 4);
  user.role = 'buyer';
  user.onboarding_completed = true;
  user.emailVerified = true;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.totpEnabled = false;
  user.totpSecret = null;
  user.tenantId = null;
  return Object.assign(user, overrides);
}

function makeRepo<T>(): Partial<Repository<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

// ============================================================
// SUITE
// ============================================================

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof makeRepo<User>>;
  let tenantRepo: ReturnType<typeof makeRepo<Tenant>>;
  let userTenantRepo: ReturnType<typeof makeRepo<UserTenant>>;
  let passwordResetRepo: ReturnType<typeof makeRepo<PasswordReset>>;
  let emailVerificationRepo: ReturnType<typeof makeRepo<EmailVerification>>;
  let backupCodeRepo: ReturnType<typeof makeRepo<BackupCode>>;
  let refreshTokenRepo: ReturnType<typeof makeRepo<RefreshToken>>;

  let tokenService: jest.Mocked<Partial<TokenService>>;
  let refreshTokenService: jest.Mocked<Partial<RefreshTokenService>>;
  let auditService: jest.Mocked<Partial<AuditService>>;
  let accountThrottler: jest.Mocked<Partial<AccountThrottlerGuard>>;
  let emailService: jest.Mocked<Partial<EmailService>>;
  let twoFactorService: jest.Mocked<Partial<TwoFactorService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  const req: any = {
    headers: { 'user-agent': 'jest-test' },
    ip: '127.0.0.1',
  };

  beforeEach(async () => {
    userRepo = makeRepo<User>();
    tenantRepo = makeRepo<Tenant>();
    userTenantRepo = makeRepo<UserTenant>();
    passwordResetRepo = makeRepo<PasswordReset>();
    emailVerificationRepo = makeRepo<EmailVerification>();
    backupCodeRepo = makeRepo<BackupCode>();
    refreshTokenRepo = makeRepo<RefreshToken>();

    tokenService = {
      signAccess: jest.fn().mockReturnValue('mock-access-token'),
      signRefresh: jest.fn().mockReturnValue({
        token: 'mock-refresh-token',
        jti: 'mock-jti',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
      }),
      signReset: jest.fn().mockReturnValue('mock-reset-token'),
      signVerify: jest.fn().mockReturnValue('mock-verify-token'),
      verifyReset: jest.fn(),
      verifyEmailToken: jest.fn(),
      sha256: jest.fn().mockReturnValue('mock-hash'),
    };

    refreshTokenService = {
      issue: jest.fn().mockResolvedValue({
        token: 'mock-refresh-token',
        entity: { id: 'rt-1' } as any,
      }),
      validate: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    accountThrottler = {
      hit: jest.fn(),
      reset: jest.fn(),
    };

    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };

    twoFactorService = {
      verifyTotp: jest.fn(),
      decryptSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
      generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
      encryptSecret: jest.fn().mockReturnValue('enc:tag:data'),
      generateOtpauthUrl: jest.fn().mockReturnValue('otpauth://...'),
      generateQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,...'),
      generateBackupCodes: jest.fn().mockReturnValue(['A-1', 'B-2']),
      hashBackupCode: jest.fn().mockReturnValue('mock-hash'),
      generateTempToken: jest.fn().mockReturnValue({
        token: 'mock-temp',
        expiresAt: new Date(Date.now() + 5 * 60_000),
      }),
    };

    configService = {
      get: jest.fn().mockReturnValue('https://test.local'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(UserTenant), useValue: userTenantRepo },
        { provide: getRepositoryToken(PasswordReset), useValue: passwordResetRepo },
        { provide: getRepositoryToken(EmailVerification), useValue: emailVerificationRepo },
        { provide: getRepositoryToken(BackupCode), useValue: backupCodeRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: TokenService, useValue: tokenService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: AuditService, useValue: auditService },
        { provide: AccountThrottlerGuard, useValue: accountThrottler },
        { provide: EmailService, useValue: emailService },
        { provide: TwoFactorService, useValue: twoFactorService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ============================================================
  // LOGIN
  // ============================================================
  describe('login', () => {
    beforeEach(() => {
      const bcryptMock = require('bcrypt');
      (bcryptMock.compare as jest.Mock).mockImplementation((plain: string) => {
        return Promise.resolve(plain === 'Test1234');
      });
    });

    it('con credenciales válidas emite tokens y audita login_success', async () => {
      const user = makeUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (tenantRepo.findOne as jest.Mock).mockResolvedValue(null);
      (userRepo.save as jest.Mock).mockResolvedValue(user);
      // mock getUserContext
      jest.spyOn<any, any>(service as any, 'getUserContext').mockResolvedValue({
        user,
        activeRole: 'buyer',
        hasTenant: false,
        tenant: null,
        tenantSlug: null,
        ownerRelation: null,
        userTenants: [],
        primary_color: '#ea580c',
        secondary_color: '#0f172a',
        accent_color: '#fbbf24',
        background_color: '#0b0f19',
        font_family: 'Quicksand',
      });

      const result = await service.login({ email: user.email, password: 'Test1234' }, req);

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token');
      expect(auditService.log).toHaveBeenCalledWith(
        user.id,
        'login_success',
        req,
        expect.any(Object),
      );
      expect(user.failedLoginAttempts).toBe(0);
    });

    it('con password incorrecto da 401 y aumenta failedLoginAttempts', async () => {
      const user = makeUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (tenantRepo.findOne as jest.Mock).mockResolvedValue(null);
      (userRepo.save as jest.Mock).mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: 'WrongPass1' }, req),
      ).rejects.toThrow(UnauthorizedException);

      expect(user.failedLoginAttempts).toBe(1);
      expect(user.lockedUntil).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith(
        user.id,
        'login_failed',
        req,
        expect.objectContaining({ reason: 'bad_password' }),
      );
    });

    it('tras 5 intentos fallidos bloquea y audita account_locked', async () => {
      const user = makeUser({ failedLoginAttempts: 4 });
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (tenantRepo.findOne as jest.Mock).mockResolvedValue(null);
      (userRepo.save as jest.Mock).mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: 'WrongPass1' }, req),
      ).rejects.toThrow(UnauthorizedException);

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.lockedUntil).toBeInstanceOf(Date);
      expect(auditService.log).toHaveBeenCalledWith(
        user.id,
        'account_locked',
        req,
        expect.any(Object),
      );
    });

    it('con cuenta bloqueada da 423 sin llamar a bcrypt', async () => {
      const user = makeUser({
        lockedUntil: new Date(Date.now() + 10 * 60_000),
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);

      const bcryptMock = require('bcrypt');
      (bcryptMock.compare as jest.Mock).mockClear();

      await expect(
        service.login({ email: user.email, password: 'AnyPass1' }, req),
      ).rejects.toThrow(HttpException);

      expect(bcryptMock.compare).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // REFRESH
  // ============================================================

  describe('refresh', () => {
    it('con refresh válido rota y emite access + refresh nuevos', async () => {
      const user = makeUser();
      (refreshTokenService.validate as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
        revokedAt: null,
      } as any);
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      jest.spyOn<any, any>(service as any, 'getUserContext').mockResolvedValue({
        user,
        activeRole: 'buyer',
        hasTenant: false,
        tenant: null,
        tenantSlug: null,
        ownerRelation: null,
        userTenants: [],
        primary_color: '#ea580c',
        secondary_color: '#0f172a',
        accent_color: '#fbbf24',
        background_color: '#0b0f19',
        font_family: 'Quicksand',
      });

      const result = await service.refresh('old-refresh', req);

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token');
      expect(refreshTokenService.issue).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        expect.any(String),
        'rt-1',
      );
    });

    it('con refresh revocado da 401', async () => {
      (refreshTokenService.validate as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Refresh token revocado'),
      );

      await expect(service.refresh('revoked-refresh', req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  describe('resetPassword', () => {
    it('con token válido cambia password y revoca refresh tokens', async () => {
      const user = makeUser();
      (tokenService.verifyReset as jest.Mock).mockReturnValue({ sub: user.id });
      (passwordResetRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'pr-1',
        userId: user.id,
        tokenHash: 'mock-hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (userRepo.save as jest.Mock).mockResolvedValue(user);
      (passwordResetRepo.save as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resetPassword('valid-token', 'NewPass123', req);

      expect(result.message).toMatch(/contraseña actualizada/i);
      expect(refreshTokenService.revokeAllForUser).toHaveBeenCalledWith(user.id);
      expect(auditService.log).toHaveBeenCalledWith(
        user.id,
        'password_reset_completed',
        req,
        expect.any(Object),
      );
    });

    it('con token ya usado da 400', async () => {
      (tokenService.verifyReset as jest.Mock).mockReturnValue({ sub: 'user-1' });
      (passwordResetRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'pr-1',
        userId: 'user-1',
        tokenHash: 'mock-hash',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });

      await expect(
        service.resetPassword('used-token', 'NewPass123', req),
      ).rejects.toThrow(BadRequestException);
    });

    it('con password débil da 400', async () => {
      (tokenService.verifyReset as jest.Mock).mockReturnValue({ sub: 'user-1' });
      (passwordResetRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'pr-1',
        userId: 'user-1',
        tokenHash: 'mock-hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });

      await expect(
        service.resetPassword('valid-token', 'weak', req),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // 2FA LOGIN
  // ============================================================

  describe('verify2FALogin', () => {
    it('con código válido emite tokens y audita 2fa_verified', async () => {
      const user = makeUser({ totpEnabled: true, totpSecret: 'enc:tag:data' });
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (twoFactorService.verifyTotp as jest.Mock).mockResolvedValue(true);
      jest.spyOn<any, any>(service as any, 'parseTempToken').mockReturnValue({
        userId: user.id,
        token: 'mock',
        expiresAt: Date.now() + 5 * 60_000,
      });
      (userRepo.save as jest.Mock).mockResolvedValue(user);
      jest.spyOn<any, any>(service as any, 'getUserContext').mockResolvedValue({
        user,
        activeRole: 'buyer',
        hasTenant: false,
        tenant: null,
        tenantSlug: null,
        ownerRelation: null,
        userTenants: [],
        primary_color: '#ea580c',
        secondary_color: '#0f172a',
        accent_color: '#fbbf24',
        background_color: '#0b0f19',
        font_family: 'Quicksand',
      });

      const result = await service.verify2FALogin('temp-token', '123456', req);

      expect(result.access_token).toBe('mock-access-token');
      expect(auditService.log).toHaveBeenCalledWith(
        user.id,
        '2fa_verified',
        req,
        expect.any(Object),
      );
    });

    it('con código inválido da 401', async () => {
      const user = makeUser({ totpEnabled: true, totpSecret: 'enc:tag:data' });
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (twoFactorService.verifyTotp as jest.Mock).mockResolvedValue(false);
      jest.spyOn<any, any>(service as any, 'parseTempToken').mockReturnValue({
        userId: user.id,
        token: 'mock',
        expiresAt: Date.now() + 5 * 60_000,
      });

      await expect(
        service.verify2FALogin('temp-token', '000000', req),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
