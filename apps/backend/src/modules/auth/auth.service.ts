// apps/backend/src/modules/auth/auth.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { User } from './entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserTenant } from '../tenants/entities/user-tenant.entity';
import { TokenService } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuditService } from './audit.service';
import { AccountThrottlerGuard } from './account-throttler.guard';
import { EmailService } from './email.service';
import { PasswordReset } from './entities/password-reset.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { parseUserAgent } from './utils/user-agent';
import { BackupCode } from './entities/backup-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TwoFactorService } from './two-factor.service';
import { PASSWORD_REGEX, PASSWORD_MESSAGE } from './dto/password-policy';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private readonly userTenantRepository: Repository<UserTenant>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(BackupCode)
    private readonly backupCodeRepository: Repository<BackupCode>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly audit: AuditService,
    private readonly accountThrottler: AccountThrottlerGuard,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async checkEmail(email: string) {
    if (!email) return { exists: false };
    const normalizedEmail = email.toLowerCase();
    
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (user) return { exists: true };
    
    const tenant = await this.tenantRepository.findOne({
      where: { email: normalizedEmail },
    });
    return { exists: !!tenant };
  }

  // ============================================================
  // REGISTRO INICIAL (desde el frontend)
  // ============================================================
  async register(registerDto: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
    deliveryCity?: string;
    preferredCurrency?: string;
    state?: string;
    municipality?: string;
    latitude?: number;
    longitude?: number;
    // 🔥 Dirección completa
    address?: string;
    // 🔥 Branding
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    // 🔥 Avatar
    avatarUrl?: string;
    // 🔥 Cédula + Pago Móvil
    id_number?: string;
    id_type?: string;
    pago_movil_same_as_profile?: boolean;
  }) {
    const {
      name,
      email,
      password,
      role,
      phone,
      deliveryCity,
      preferredCurrency,
      state,
      municipality,
      latitude,
      longitude,
      address,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      fontFamily,
      avatarUrl,
      id_number,
      id_type,
      pago_movil_same_as_profile,
    } = registerDto;

    const normalizedEmail = email?.toLowerCase();

    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const existingTenant = await this.tenantRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existingTenant) {
      throw new ConflictException('Este correo ya está registrado como tienda.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User();
    user.name = name;
    user.email = normalizedEmail;
    user.password = hashedPassword;
    user.provider = 'credentials';
    user.role = role || '';
    user.onboarding_completed = false;
    user.phone = phone || '';
    user.deliveryCity = deliveryCity || '';
    user.preferredCurrency = preferredCurrency || '';
    user.state = state || '';
    user.municipality = municipality || '';
    user.latitude = latitude || 0;
    user.longitude = longitude || 0;

    // 🔥 Dirección completa
    if (address !== undefined) user.address = address || '';
    // 🔥 Branding
    if (primaryColor !== undefined) user.primary_color = primaryColor || '#ea580c';
    if (secondaryColor !== undefined) user.secondary_color = secondaryColor || '#0f172a';
    if (accentColor !== undefined) user.accent_color = accentColor || '#fbbf24';
    if (backgroundColor !== undefined) user.background_color = backgroundColor || '#0b0f19';
    if (fontFamily !== undefined) user.font_family = fontFamily || 'Quicksand';

    // 🔥 Avatar
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
      user.avatarUrl = avatarUrl;
      user.avatar = avatarUrl;
      user.image = avatarUrl;
    }

    // 🔥 Cédula + Pago Móvil
    if (id_number !== undefined) user.id_number = id_number || null;
    if (id_type !== undefined) user.id_type = id_type || 'V';
    if (pago_movil_same_as_profile !== undefined) {
      user.pago_movil_same_as_profile = Boolean(pago_movil_same_as_profile);
    }

    await this.userRepository.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hasTenant: false,
      tenantSlug: null,
      onboarding_completed: false,
    };

    return {
      message: 'Usuario registrado exitosamente',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasTenant: false,
        tenantSlug: null,
        onboarding_completed: false,
      },
      tenant: null,
    };
  }

  // ============================================================
  // OBTENER CONTEXTO DEL USUARIO
  // ============================================================
  private async getUserContext(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    const userTenants = await this.userTenantRepository
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.tenant', 'tenant')
      .where('ut.user_id = :userId', { userId: user.id })
      .getMany();

    const ownerRelation = userTenants.find(
      (ut) => ut.role === 'owner' || ut.role === 'seller' || ut.role === 'admin',
    );

    const hasTenant = !!ownerRelation;
    const tenant = ownerRelation?.tenant || null;
    const tenantSlug = tenant?.slug || null;

    let activeRole = user.role || 'buyer';

    if (hasTenant && activeRole !== 'seller' && activeRole !== 'admin') {
      activeRole = 'seller';
    }

    if (!hasTenant && activeRole === 'seller') {
      activeRole = 'buyer';
    }

    return {
      user,
      activeRole,
      hasTenant,
      tenant,
      tenantSlug,
      ownerRelation,
      userTenants,
      primary_color: user.primary_color || '#ea580c',
      secondary_color: user.secondary_color || '#0f172a',
      accent_color: user.accent_color || '#fbbf24',
      background_color: user.background_color || '#0b0f19',
      font_family: user.font_family || 'Quicksand',
    };
  }

  // ============================================================
  // LOGIN UNIFICADO - CORREGIDO
  // ============================================================
  async login(loginDto: { email: string; password: string }, req?: Request) {
    const { email, password } = loginDto;
    const normalizedEmail = email?.toLowerCase();

    // === Fase 1: rate limiting por cuenta (5 intentos / 15 min) ===
    this.accountThrottler.hit('login-account', normalizedEmail ?? '', 5, 15 * 60_000);

    // === Fase 1: chequeo de bloqueo temporal ===
    const preUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (preUser?.lockedUntil && preUser.lockedUntil.getTime() > Date.now()) {
      const remaining = Math.ceil((preUser.lockedUntil.getTime() - Date.now()) / 1000);
      await this.audit.log(preUser.id, 'login_failed', req, {
        reason: 'locked',
        remaining,
      });
      throw new HttpException(
        {
          message: `Cuenta bloqueada. Reintentá en ${Math.ceil(remaining / 60)} min.`,
          retryAfter: remaining,
        },
        HttpStatus.LOCKED,
      );
    }

    // 🔥 PRIMERO: Buscar el tenant (para saber si existe la cuenta)
    const tenant = await this.tenantRepository.findOne({
      where: { email: normalizedEmail },
    });

    // 🔥 SEGUNDO: Buscar el usuario
    let user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    // 🔥 SI EL USUARIO NO EXISTE PERO EL TENANT SÍ, CREAR EL USUARIO AUTOMÁTICAMENTE
    if (!user && tenant) {
      console.log(`🔍 [AuthService] Usuario no encontrado pero tenant existe. Creando usuario para ${normalizedEmail}`);
      
      // Generar contraseña hash para el usuario
      let hashedPassword = tenant.passwordHash;
      if (!hashedPassword) {
        // Si el tenant no tiene contraseña, generar una temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        hashedPassword = await bcrypt.hash(tempPassword, 10);
        console.log(`⚠️ [AuthService] Tenant sin contraseña, generada temporal: ${tempPassword}`);
      }
      
      const newUser = new User();
      newUser.name = tenant.ownerName || tenant.name || 'Usuario';
      newUser.email = normalizedEmail;
      newUser.password = hashedPassword;
      newUser.provider = 'tenant';
      newUser.role = 'seller';
      newUser.onboarding_completed = true;
      newUser.phone = tenant.phone || '';
      newUser.city = tenant.city || '';
      newUser.address = tenant.address || '';
      newUser.deliveryCity = tenant.city || '';
      newUser.preferredCurrency = Array.isArray(tenant.currencies) ? tenant.currencies[0] : 'USD';
      newUser.primary_color = tenant.primaryColor || '#ea580c';
      newUser.secondary_color = tenant.secondaryColor || '#0f172a';
      newUser.accent_color = tenant.accentColor || '#fbbf24';
      newUser.background_color = tenant.backgroundColor || '#0b0f19';
      newUser.font_family = tenant.fontFamily || 'Quicksand';

      user = await this.userRepository.save(newUser);
      console.log(`✅ [AuthService] Usuario creado automáticamente: ${user.id} - ${user.email}`);

      // Crear relación en user_tenants
      const userTenant = new UserTenant();
      userTenant.userId = user.id;
      userTenant.tenantId = tenant.id;
      userTenant.role = 'owner';
      await this.userTenantRepository.save(userTenant);
      console.log(`✅ [AuthService] Relación user_tenants creada`);
    }

    // 🔥 VALIDAR CONTRASEÑA
    let isPasswordValid = false;
    let authSource: 'user' | 'tenant' = 'user';

    // Primero intentar con el usuario
    if (user && user.password) {
      isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) authSource = 'user';
    }

    // Si falla, intentar con el tenant
    if (!isPasswordValid && tenant && tenant.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, tenant.passwordHash);
      if (isPasswordValid) authSource = 'tenant';
    }

    // Si la contraseña del usuario falla pero el usuario existe y el tenant no tiene hash, intentar actualizar
    if (!isPasswordValid && user && user.password) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    // Si aún falla, verificar si es un usuario recién creado con contraseña temporal
    if (!isPasswordValid && user) {
      // Si el usuario fue creado automáticamente, la contraseña es la del tenant
      if (tenant && tenant.passwordHash) {
        isPasswordValid = await bcrypt.compare(password, tenant.passwordHash);
      }
    }

    if (!isPasswordValid) {
      // === Fase 1: contador de intentos + bloqueo tras 5 ===
      if (preUser) {
        preUser.failedLoginAttempts = (preUser.failedLoginAttempts ?? 0) + 1;
        if (preUser.failedLoginAttempts >= 5) {
          preUser.lockedUntil = new Date(Date.now() + 15 * 60_000);
          await this.audit.log(preUser.id, 'account_locked', req, {
            failedLoginAttempts: preUser.failedLoginAttempts,
          });
        }
        await this.userRepository.save(preUser);
        await this.audit.log(preUser.id, 'login_failed', req, {
          reason: 'bad_password',
          failedLoginAttempts: preUser.failedLoginAttempts,
        });
      } else {
        await this.audit.log(null, 'login_failed', req, {
          email: normalizedEmail,
          reason: 'not_found',
        });
      }
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // 🔥 SI EL USUARIO AÚN ES NULL, ERROR
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // 🔥 SI EL TENANT NO TIENE HASH PERO EL USUARIO SÍ, COPIAR AL TENANT
    if (tenant && !tenant.passwordHash && user && user.password) {
      await this.tenantRepository.update(tenant.id, {
        passwordHash: user.password,
      });
      console.log(`✅ [AuthService] Password hash copiado al tenant`);
    }

    // OBTENER CONTEXTO COMPLETO
    const context = await this.getUserContext(user.id);

    // === FASE 4: si tiene 2FA activo, devolvemos requiresTwoFactor ===
    if (user.totpEnabled && user.totpSecret) {
      // Reseteamos intentos (la contraseña fue correcta)
      if (preUser) {
        preUser.failedLoginAttempts = 0;
        preUser.lockedUntil = null;
        await this.userRepository.save(preUser);
      }
      this.accountThrottler.reset('login-account', normalizedEmail ?? '');

      const tempToken = this.buildTempToken(user.id);
      await this.audit.log(user.id, 'login_success', req, {
        step: 'password_ok_awaiting_2fa',
      });

      return {
        requiresTwoFactor: true,
        tempToken,
        message: 'Ingresá el código de tu app de autenticación.',
      };
    }

    // === Fase 1: resetear contadores, actualizar last login ===
    if (preUser) {
      preUser.failedLoginAttempts = 0;
      preUser.lockedUntil = null;
      preUser.lastLoginAt = new Date();
      preUser.lastLoginIp = this.extractIp(req);
      await this.userRepository.save(preUser);
    }

    this.accountThrottler.reset('login-account', normalizedEmail ?? '');

    // === Fase 1: access token (15m) + refresh token (30d) ===
    const accessPayload = {
      sub: context.user.id,
      email: context.user.email,
      role: context.activeRole,
      hasTenant: context.hasTenant,
      tenantSlug: context.tenantSlug,
      tenantId: context.tenant?.id ?? null,
      onboarding_completed: context.user.onboarding_completed,
      emailVerified: !!(context.user as any).emailVerified,
    };
    const access_token = this.tokenService.signAccess(accessPayload);

    const { token: refresh_token } = await this.refreshTokenService.issue(
      context.user.id,
      this.extractIp(req),
      req?.headers?.['user-agent']?.toString(),
    );

    await this.audit.log(context.user.id, 'login_success', req, {
      ip: this.extractIp(req),
    });

    return {
      message: 'Inicio de sesión exitoso',
      access_token,
      refresh_token,
      user: {
        id: context.user.id,
        name: context.user.name,
        email: context.user.email,
        role: context.activeRole,
        hasTenant: context.hasTenant,
        tenantSlug: context.tenantSlug,
        onboarding_completed: context.user.onboarding_completed,
        phone: context.user.phone,
        city: context.user.city,
        address: context.user.address,
        deliveryCity: context.user.deliveryCity,
        preferredCurrency: context.user.preferredCurrency,
        state: context.user.state,
        municipality: context.user.municipality,
        primary_color: context.primary_color,
        secondary_color: context.secondary_color,
        accent_color: context.accent_color,
        background_color: context.background_color,
        font_family: context.font_family,
        // 🔥 Cédula + flag Pago Móvil (para autocompletar checkout)
        id_number: context.user.id_number ?? null,
        id_type: context.user.id_type ?? null,
        pago_movil_same_as_profile: Boolean(context.user.pago_movil_same_as_profile),
        emailVerified: !!(context.user as any).emailVerified,
        // 🔥 Avatar (URL de la foto de perfil)
        avatar: (context.user as any).avatar || (context.user as any).avatarUrl || (context.user as any).image || null,
        avatarUrl: (context.user as any).avatarUrl || (context.user as any).avatar || (context.user as any).image || null,
      },
      tenant: context.tenant
        ? {
            id: context.tenant.id,
            name: context.tenant.name,
            slug: context.tenant.slug,
            modelType: (context.tenant as any).modelType,
            workModality: (context.tenant as any).workModality,
            primary_color: context.tenant.primaryColor || '#ea580c',
            secondary_color: context.tenant.secondaryColor || '#0f172a',
            accent_color: context.tenant.accentColor || '#fbbf24',
            background_color: context.tenant.backgroundColor || '#0b0f19',
            font_family: context.tenant.fontFamily || 'Quicksand',
          }
        : null,
    };
  }

  // ============================================================
  // COMPLETAR PERFIL DE COMPRADOR
  // ============================================================
  async completeBuyerProfile(
    userId: string,
    profileDto: {
      fullName?: string;
      phone?: string;
      deliveryCity?: string;
      address?: string;
      preferredCurrency?: string;
      state?: string;
      municipality?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    if (!userId) {
      throw new BadRequestException('El identificador del usuario es obligatorio.');
    }

    const context = await this.getUserContext(userId);
    const user = context.user;

    if (profileDto.fullName) user.name = profileDto.fullName;
    if (profileDto.phone) user.phone = profileDto.phone;
    if (profileDto.deliveryCity) user.deliveryCity = profileDto.deliveryCity;
    if (profileDto.address) user.address = profileDto.address;
    if (profileDto.preferredCurrency) user.preferredCurrency = profileDto.preferredCurrency;
    if (profileDto.state) user.state = profileDto.state;
    if (profileDto.municipality) user.municipality = profileDto.municipality;
    if (profileDto.latitude !== undefined && profileDto.latitude !== null) user.latitude = profileDto.latitude;
    if (profileDto.longitude !== undefined && profileDto.longitude !== null) user.longitude = profileDto.longitude;

    if (!user.role) {
      user.role = 'buyer';
    }

    user.onboarding_completed = true;
    await this.userRepository.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hasTenant: context.hasTenant,
      tenantSlug: context.tenantSlug,
      onboarding_completed: user.onboarding_completed,
    };

    return {
      message: 'Perfil de comprador completado exitosamente',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasTenant: context.hasTenant,
        tenantSlug: context.tenantSlug,
        onboarding_completed: user.onboarding_completed,
        primary_color: context.primary_color,
        secondary_color: context.secondary_color,
        accent_color: context.accent_color,
        background_color: context.background_color,
        font_family: context.font_family,
        latitude: user.latitude,
        longitude: user.longitude,
        id_number: user.id_number ?? null,
        id_type: user.id_type ?? null,
        pago_movil_same_as_profile: Boolean(user.pago_movil_same_as_profile),
      },
      tenant: context.tenant
        ? {
            id: context.tenant.id,
            name: context.tenant.name,
            slug: context.tenant.slug,
            logoUrl: context.tenant.logoUrl,
            bannerUrl: context.tenant.bannerUrl,
            faviconUrl: context.tenant.faviconUrl,
            instagram: context.tenant.instagram,
            facebook: context.tenant.facebook,
            tiktok: context.tenant.tiktok,
            xTwitter: context.tenant.xTwitter,
            threads: context.tenant.threads,
            linkedin: context.tenant.linkedin,
          }
        : null,
    };
  }

  // ============================================================
  // COMPLETAR PERFIL DE VENDEDOR (Crear tienda)
  // ============================================================
  async completeSellerProfile(userId: string, sellerData: any) {
    if (!userId) {
      throw new BadRequestException('El identificador del usuario es obligatorio.');
    }

    const context = await this.getUserContext(userId);
    const user = context.user;

    if (context.hasTenant) {
      throw new BadRequestException('Este usuario ya tiene una tienda registrada.');
    }

    // Crear el tenant
    const tenant = new Tenant();
    tenant.name = sellerData.name;
    tenant.slug = sellerData.slug;
    tenant.niche = sellerData.niche || 'general';
    tenant.slogan = sellerData.slogan || '';
    tenant.phone = sellerData.phone || user.phone || '';
    tenant.email = sellerData.email || user.email || '';
    tenant.city = sellerData.city || user.city || '';
    tenant.zone = sellerData.zone || '';
    tenant.address = sellerData.address || user.address || '';
    tenant.currencies = Array.isArray(sellerData.currencies)
      ? sellerData.currencies
      : sellerData.currencies?.split(',') || [];
    tenant.primaryColor = sellerData.primaryColor || '#ea580c';
    tenant.secondaryColor = sellerData.secondaryColor || '#0f172a';
    tenant.accentColor = sellerData.accentColor || '#fbbf24';
    tenant.backgroundColor = sellerData.backgroundColor || '#0b0f19';
    tenant.fontFamily = sellerData.fontFamily || 'Quicksand';
    tenant.workModality = sellerData.workModality || 'local';
    tenant.modelType = sellerData.modelType || 'product';
    tenant.ownerName = sellerData.ownerName || user.name || '';
    tenant.countryCode = sellerData.countryCode || '+58';
    tenant.passwordHash = user.password || sellerData.passwordHash || '';
    tenant.specificConfig = sellerData.specificConfig || {};
    tenant.instagram = sellerData.instagram || '';
    tenant.facebook = sellerData.facebook || '';
    tenant.tiktok = sellerData.tiktok || '';
    tenant.whatsapp = sellerData.whatsapp || '';
    tenant.telegram = sellerData.telegram || '';
    tenant.xTwitter = sellerData.x_twitter || '';
    tenant.threads = sellerData.threads || '';
    tenant.linkedin = sellerData.linkedin || '';

    await this.tenantRepository.save(tenant);

    // Actualizar el usuario
    user.role = 'seller';
    user.onboarding_completed = true;

    if (!user.phone && sellerData.phone) user.phone = sellerData.phone;
    if (!user.city && sellerData.city) user.city = sellerData.city;
    if (!user.address && sellerData.address) user.address = sellerData.address;
    if (!user.deliveryCity && sellerData.deliveryCity) user.deliveryCity = sellerData.deliveryCity;
    if (!user.preferredCurrency && sellerData.currencies) {
      user.preferredCurrency = Array.isArray(sellerData.currencies) ? sellerData.currencies[0] : sellerData.currencies;
    }

    await this.userRepository.save(user);

    // Crear relación en user_tenants
    const userTenant = new UserTenant();
    userTenant.userId = user.id;
    userTenant.tenantId = tenant.id;
    userTenant.role = 'owner';
    await this.userTenantRepository.save(userTenant);

    // Actualizar colores del usuario con los del tenant
    user.primary_color = tenant.primaryColor || user.primary_color;
    user.secondary_color = tenant.secondaryColor || user.secondary_color;
    user.accent_color = tenant.accentColor || user.accent_color;
    user.background_color = tenant.backgroundColor || user.background_color;
    user.font_family = tenant.fontFamily || user.font_family;
    await this.userRepository.save(user);

    // SI EL TENANT NO TIENE PASSWORD_HASH PERO EL USUARIO SÍ, COPIAR
    if (!tenant.passwordHash && user.password) {
      await this.tenantRepository.update(tenant.id, {
        passwordHash: user.password,
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hasTenant: true,
      tenantSlug: tenant.slug,
      onboarding_completed: user.onboarding_completed,
    };

    return {
      message: 'Tienda creada exitosamente',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasTenant: true,
        tenantSlug: tenant.slug,
        onboarding_completed: user.onboarding_completed,
        primary_color: user.primary_color,
        secondary_color: user.secondary_color,
        accent_color: user.accent_color,
        background_color: user.background_color,
        font_family: user.font_family,
        latitude: user.latitude,
        longitude: user.longitude,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        modelType: tenant.modelType,
        workModality: tenant.workModality,
        primary_color: tenant.primaryColor,
        secondary_color: tenant.secondaryColor,
        accent_color: tenant.accentColor,
        background_color: tenant.backgroundColor,
        font_family: tenant.fontFamily,
      },
    };
  }

  // ============================================================
  // OBTENER USUARIO CON CONTEXTO
  // ============================================================
  async getUserWithContext(userId: string) {
    const context = await this.getUserContext(userId);

    return {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      emailVerified: !!(context.user as any).emailVerified,
      role: context.activeRole,
      hasTenant: context.hasTenant,
      tenantSlug: context.tenantSlug,
      onboarding_completed: context.user.onboarding_completed,
      phone: context.user.phone,
      city: context.user.city,
      address: context.user.address,
      deliveryCity: context.user.deliveryCity,
      preferredCurrency: context.user.preferredCurrency,
      state: context.user.state,
      municipality: context.user.municipality,
      primary_color: context.primary_color,
      secondary_color: context.secondary_color,
      accent_color: context.accent_color,
      background_color: context.background_color,
      font_family: context.font_family,
      id_number: context.user.id_number ?? null,
      id_type: context.user.id_type ?? null,
      pago_movil_same_as_profile: Boolean(context.user.pago_movil_same_as_profile),
      tenant: context.tenant
        ? {
            id: context.tenant.id,
            name: context.tenant.name,
            slug: context.tenant.slug,
            modelType: (context.tenant as any).modelType,
            workModality: (context.tenant as any).workModality,
            logoUrl: context.tenant.logoUrl,
            bannerUrl: context.tenant.bannerUrl,
            faviconUrl: context.tenant.faviconUrl,
            instagram: context.tenant.instagram,
            facebook: context.tenant.facebook,
            tiktok: context.tenant.tiktok,
            xTwitter: context.tenant.xTwitter,
            threads: context.tenant.threads,
            linkedin: context.tenant.linkedin,
            primary_color: context.tenant.primaryColor || '#ea580c',
            secondary_color: context.tenant.secondaryColor || '#0f172a',
            accent_color: context.tenant.accentColor || '#fbbf24',
            background_color: context.tenant.backgroundColor || '#0b0f19',
            font_family: context.tenant.fontFamily || 'Quicksand',
          }
        : null,
    };
  }

  // ============================================================
  // VALIDAR USUARIO DE TIENDA DE SERVICIO
  // ============================================================
  async validateServiceStoreUser(email: string): Promise<{
    valid: boolean;
    user?: any;
    tenant?: any;
    message?: string;
  }> {
    const normalizedEmail = email?.toLowerCase();

    if (!normalizedEmail) {
      return { valid: false, message: 'Email no proporcionado.' };
    }

    const tenant = await this.tenantRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!tenant) {
      return { valid: false, message: 'Tienda no encontrada.' };
    }

    if ((tenant as any).modelType !== 'service') {
      return { 
        valid: false, 
        message: 'Esta tienda no es de servicios.',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          modelType: (tenant as any).modelType,
        }
      };
    }

    let user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const newUser = new User();
      newUser.name = tenant.ownerName || tenant.name;
      newUser.email = normalizedEmail;
      newUser.password = tenant.passwordHash;
      newUser.provider = 'tenant';
      newUser.role = 'seller';
      newUser.onboarding_completed = true;
      newUser.phone = tenant.phone || '';
      newUser.city = tenant.city || '';
      newUser.address = tenant.address || '';
      newUser.deliveryCity = tenant.city || '';
      newUser.preferredCurrency = Array.isArray(tenant.currencies) ? tenant.currencies[0] : 'USD';
      newUser.primary_color = tenant.primaryColor || '#ea580c';
      newUser.secondary_color = tenant.secondaryColor || '#0f172a';
      newUser.accent_color = tenant.accentColor || '#fbbf24';
      newUser.background_color = tenant.backgroundColor || '#0b0f19';
      newUser.font_family = tenant.fontFamily || 'Quicksand';

      user = await this.userRepository.save(newUser);

      const userTenant = new UserTenant();
      userTenant.userId = user.id;
      userTenant.tenantId = tenant.id;
      userTenant.role = 'owner';
      await this.userTenantRepository.save(userTenant);
    }

    const context = await this.getUserContext(user.id);

    return {
      valid: true,
      user: {
        id: context.user.id,
        name: context.user.name,
        email: context.user.email,
        emailVerified: !!(context.user as any).emailVerified,
        role: context.activeRole,
        hasTenant: context.hasTenant,
        tenantSlug: context.tenantSlug,
        onboarding_completed: context.user.onboarding_completed,
        primary_color: context.primary_color,
        secondary_color: context.secondary_color,
        accent_color: context.accent_color,
        background_color: context.background_color,
        font_family: context.font_family,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        modelType: (tenant as any).modelType,
        workModality: (tenant as any).workModality,
        primary_color: tenant.primaryColor || '#ea580c',
        secondary_color: tenant.secondaryColor || '#0f172a',
        accent_color: tenant.accentColor || '#fbbf24',
        background_color: tenant.backgroundColor || '#0b0f19',
        font_family: tenant.fontFamily || 'Quicksand',
      },
    };
  }
    // ============================================================
  // UBICACIÓN DEL USUARIO (descubrimiento por cercanía)
  // ============================================================

  /**
   * Devuelve la ubicación guardada del usuario o null si no tiene.
   */
  async getUserLocation(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        geoPrecision: true,
        geoSource: true,
        geoUpdatedAt: true,
      },
        });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.latitude === null || user.longitude === null) {
      return null;
    }

    return {
      latitude: Number(user.latitude),
      longitude: Number(user.longitude),
      geoPrecision: user.geoPrecision,
      geoSource: user.geoSource,
      geoUpdatedAt: user.geoUpdatedAt,
    };
  }

  /**
   * Guarda o actualiza la ubicación del usuario.
   */
  async updateUserLocation(
    userId: string,
    data: {
      latitude: number;
      longitude: number;
      geoPrecision: string;
      geoSource?: string;
    },
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.userRepository.update(userId, {
      latitude: data.latitude,
      longitude: data.longitude,
      geoPrecision: data.geoPrecision,
      geoSource: data.geoSource ?? 'manual',
      geoUpdatedAt: new Date(),
    } as any);

    const updated = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        geoPrecision: true,
        geoSource: true,
        geoUpdatedAt: true,
      },
        });

    return {
      latitude: Number(updated?.latitude),
      longitude: Number(updated?.longitude),
      geoPrecision: updated?.geoPrecision,
      geoSource: updated?.geoSource,
      geoUpdatedAt: updated?.geoUpdatedAt,
    };
  }

  /**
   * Borra la ubicación del usuario.
   */
  async clearUserLocation(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.userRepository.update(userId, {
      latitude: null,
      longitude: null,
      geoPrecision: null,
      geoSource: null,
      geoUpdatedAt: null,
    } as any);

    return { ok: true };
  }

  // ============================================================
  // FASE 1 — REFRESH (rotativo)
  // ============================================================
  async refresh(rawRefresh: string, req: Request) {
    const row = await this.refreshTokenService.validate(rawRefresh);

    const user = await this.userRepository.findOne({ where: { id: row.userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const { token: refresh_token } = await this.refreshTokenService.issue(
      user.id,
      this.extractIp(req),
      req?.headers?.['user-agent']?.toString(),
      row.id,
    );

    await this.audit.log(user.id, 'refresh_token_used', req, { oldId: row.id });

    const context = await this.getUserContext(user.id);

    const access_token = this.tokenService.signAccess({
      sub: user.id,
      email: user.email,
      role: context.activeRole,
      hasTenant: context.hasTenant,
      tenantSlug: context.tenantSlug,
      tenantId: context.tenant?.id ?? null,
      onboarding_completed: user.onboarding_completed,
      emailVerified: !!(user as any).emailVerified,
    });

    return { access_token, refresh_token };
  }

  // ============================================================
  // FASE 1 — LOGOUT
  // ============================================================
  async logout(
    userId: string,
    req: Request,
    opts: { refreshToken?: string; all?: boolean },
  ) {
    if (opts.all || !opts.refreshToken) {
      await this.refreshTokenService.revokeAllForUser(userId);
      await this.audit.log(userId, 'logout', req, { scope: 'all' });
      return { ok: true, revoked: 'all' };
    }

    try {
      const row = await this.refreshTokenService.validate(opts.refreshToken);
      if (row.userId !== userId) throw new UnauthorizedException();
      await this.refreshTokenService.revoke(row.id);
      await this.audit.log(userId, 'refresh_token_revoked', req, { id: row.id });
      return { ok: true, revoked: 'one' };
    } catch {
      return { ok: true, revoked: 'none' };
    }
  }

  // ============================================================
  // FASE 1 — Helper
  // ============================================================
  private extractIp(req?: Request): string | null {
    if (!req) return null;
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
    return req.ip ?? null;
  }

  // ============================================================
  // FASE 3 — SEND VERIFICATION (autenticado)
  // ============================================================
  async sendVerification(userId: string, req: Request) {
    this.accountThrottler.hit('verify-account', userId, 3, 60 * 60_000);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (user.emailVerified) {
      return {
        message: 'Tu email ya está verificado.',
        emailVerified: true,
      };
    }

    const token = this.tokenService.signVerify(user.id);
    const tokenHash = this.tokenService.sha256(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

    await this.emailVerificationRepository.insert({
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent']?.toString() ?? null,
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    await this.emailService.sendVerificationEmail(user.email, verifyUrl);

    await this.audit.log(user.id, 'email_verified', req, {
      action: 'verification_sent',
      email: user.email,
    });

    return {
      message: 'Te enviamos un email con el link de verificación.',
      emailVerified: false,
    };
  }

  // ============================================================
  // FASE 3 — VERIFY EMAIL (público, con token)
  // ============================================================
  async verifyEmail(token: string, req: Request) {
    let payload: { sub: string };
    try {
      payload = this.tokenService.verifyEmailToken(token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    const tokenHash = this.tokenService.sha256(token);
    const record = await this.emailVerificationRepository.findOne({
      where: { tokenHash },
    });

    if (!record) throw new BadRequestException('Token inválido');
    if (record.usedAt) throw new BadRequestException('Token ya usado');
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token expirado');
    }
    if (record.userId !== payload.sub) {
      throw new BadRequestException('Token inconsistente');
    }

    const user = await this.userRepository.findOne({ where: { id: record.userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await this.userRepository.save(user);

      await this.audit.log(user.id, 'email_verified', req, {
        email: user.email,
      });
    }

    record.usedAt = new Date();
    await this.emailVerificationRepository.save(record);

    return {
      message: 'Email verificado correctamente.',
      emailVerified: true,
    };
  }

  // ============================================================
  // FASE 3 — Helper interno: enviar verificación sin bloquear
  // ============================================================
  private async sendVerificationInBackground(user: User, req?: Request) {
    if (user.emailVerified) return;

    try {
      const token = this.tokenService.signVerify(user.id);
      const tokenHash = this.tokenService.sha256(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

      await this.emailVerificationRepository.insert({
        userId: user.id,
        tokenHash,
        expiresAt,
        ip: req ? this.extractIp(req) : null,
        userAgent: req?.headers?.['user-agent']?.toString() ?? null,
      });

      const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
      const verifyUrl = `${appUrl}/verify-email?token=${token}`;

      await this.emailService.sendVerificationEmail(user.email, verifyUrl);
    } catch (e) {
      this.logger.error('Fallo al enviar verificación en background', e as any);
    }
  }

  // ============================================================
  // FASE 2 — FORGOT PASSWORD
  // ============================================================
  async forgotPassword(email: string, req: Request) {
    const normalizedEmail = email?.trim().toLowerCase();

    // Rate limit por cuenta: 3 solicitudes/hora
    this.accountThrottler.hit('forgot-account', normalizedEmail ?? '', 3, 60 * 60_000);

    // Siempre respondemos 200, sin revelar si el email existe
    const genericResponse = {
      message: 'Si el email existe, te enviamos un link para restablecer tu contraseña.',
    };

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Email no existe: log de auditoría anónimo, no revelamos nada
      await this.audit.log(null, 'password_reset_requested', req, {
        email: normalizedEmail,
        found: false,
      });
      return genericResponse;
    }

    // Generar token JWT de reset (15 min) + hash en DB
    const token = this.tokenService.signReset(user.id);
    const tokenHash = this.tokenService.sha256(token);
    const expiresAt = new Date(Date.now() + 15 * 60_000);

    await this.passwordResetRepository.insert({
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent']?.toString() ?? null,
    });

    // Armar link
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3001');
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Enviar email (o loguear en dev)
    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    await this.audit.log(user.id, 'password_reset_requested', req, {
      email: normalizedEmail,
      found: true,
    });

    return genericResponse;
  }

  // ============================================================
  // FASE 2 — RESET PASSWORD
  // ============================================================
  async resetPassword(token: string, newPassword: string, req: Request) {
    // Validar JWT
    let payload: { sub: string };
    try {
      payload = this.tokenService.verifyReset(token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Buscar hash en DB
    const tokenHash = this.tokenService.sha256(token);
    const reset = await this.passwordResetRepository.findOne({
      where: { tokenHash },
    });

    if (!reset) throw new BadRequestException('Token inválido');
    if (reset.usedAt) throw new BadRequestException('Token ya usado');
    if (reset.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token expirado');
    }
    if (reset.userId !== payload.sub) {
      throw new BadRequestException('Token inconsistente');
    }

    // Validar password policy
    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new BadRequestException(PASSWORD_MESSAGE);
    }

    // Actualizar password
    const user = await this.userRepository.findOne({ where: { id: reset.userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    // Marcar token como usado
    reset.usedAt = new Date();
    await this.passwordResetRepository.save(reset);

    // Revocar TODOS los refresh tokens (logout global)
    await this.refreshTokenService.revokeAllForUser(user.id);

    await this.audit.log(user.id, 'password_reset_completed', req, {
      email: user.email,
    });

    return {
      message: 'Contraseña actualizada. Iniciá sesión con tu nueva contraseña.',
    };
  }

  // ============================================================
  // FASE 2 — CHANGE PASSWORD (autenticado)
  // ============================================================
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    req: Request,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // Verificar password actual
    const isValid = user.password
      ? await bcrypt.compare(currentPassword, user.password)
      : false;
    if (!isValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // Validar password policy
    if (!PASSWORD_REGEX.test(newPassword)) {
      throw new BadRequestException(PASSWORD_MESSAGE);
    }

    // Actualizar
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    // Revocar todos los refresh tokens (el usuario tiene que volver a loguearse)
    await this.refreshTokenService.revokeAllForUser(user.id);

    await this.audit.log(user.id, 'password_changed', req, {
      email: user.email,
    });

    return {
      message: 'Contraseña actualizada. Iniciá sesión con tu nueva contraseña.',
    };
  }

  // ============================================================
  // FASE 4 — 2FA: SETUP (autenticado)
  // ============================================================
  async setup2FA(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (user.totpEnabled) {
      throw new BadRequestException(
        'El 2FA ya está activo. Desactivalo primero para volver a configurarlo.',
      );
    }

    // Generar secret y encriptarlo
    const secret = this.twoFactorService.generateSecret();
    const encryptedSecret = this.twoFactorService.encryptSecret(secret);

    // Guardar el secret encriptado pero NO activar todavía
    user.totpSecret = encryptedSecret;
    user.totpEnabled = false;
    await this.userRepository.save(user);

    // Generar QR + URL
    const otpauthUrl = this.twoFactorService.generateOtpauthUrl(user.email, secret);
    const qrCodeDataUrl = await this.twoFactorService.generateQrDataUrl(otpauthUrl);

    // Generar backup codes (10) y hashearlos
    const backupCodes = this.twoFactorService.generateBackupCodes(10);

    // Borrar backup codes viejos (si los hubiera)
    await this.backupCodeRepository.delete({ userId: user.id });

    // Guardar los hashes
    const codesToInsert = backupCodes.map((code) => ({
      userId: user.id,
      codeHash: this.twoFactorService.hashBackupCode(code),
    }));
    await this.backupCodeRepository.insert(codesToInsert);

    return {
      message: 'Escaneá el código QR y verificá con el código de 6 dígitos.',
      secret, // devolvemos el secret en claro porque el usuario lo necesita para configurar
      qrCodeDataUrl,
      backupCodes,
    };
  }

  // ============================================================
  // FASE 4 — 2FA: VERIFY SETUP (confirma que el usuario escaneó)
  // ============================================================
  async verifySetup2FA(userId: string, code: string, req: Request) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (!user.totpSecret) {
      throw new BadRequestException(
        'No hay un setup de 2FA en curso. Iniciá el setup primero.',
      );
    }

    if (user.totpEnabled) {
      throw new BadRequestException('El 2FA ya está activo.');
    }

    // Desencriptar secret y verificar código
    const secret = this.twoFactorService.decryptSecret(user.totpSecret);
    const isValid = await this.twoFactorService.verifyTotp(secret, code);

    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    // Activar
    user.totpEnabled = true;
    await this.userRepository.save(user);

    await this.audit.log(user.id, '2fa_enabled', req, { email: user.email });

    return {
      message: '2FA activado correctamente.',
      totpEnabled: true,
    };
  }

  // ============================================================
  // FASE 4 — 2FA: LOGIN (paso 2, con tempToken)
  // ============================================================
  async verify2FALogin(tempToken: string, code: string, req: Request) {
    // El tempToken tiene formato: userId:token:expiresAtMs
    const parsed = this.parseTempToken(tempToken);
    if (!parsed) throw new UnauthorizedException('Temp token inválido');

    const user = await this.userRepository.findOne({ where: { id: parsed.userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA no está activo para este usuario');
    }

    // Desencriptar secret y verificar
    const secret = this.twoFactorService.decryptSecret(user.totpSecret);
    const isValid = await this.twoFactorService.verifyTotp(secret, code);

    if (!isValid) {
      await this.audit.log(user.id, 'login_failed', req, { reason: '2fa_bad_code' });
      throw new UnauthorizedException('Código 2FA inválido');
    }

    await this.audit.log(user.id, '2fa_verified', req, { email: user.email });

    // Resetear intentos fallidos y actualizar last login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = this.extractIp(req);
    await this.userRepository.save(user);

    // Emitir tokens
    const result = await this.issueTokensForUser(user, req);
    await this.audit.log(user.id, 'login_success', req, { via: '2fa' });
    return result;
  }

  // ============================================================
  // FASE 4 — 2FA: BACKUP CODE (alternativa al TOTP)
  // ============================================================
  async verifyBackupCode(tempToken: string, backupCode: string, req: Request) {
    const parsed = this.parseTempToken(tempToken);
    if (!parsed) throw new UnauthorizedException('Temp token inválido');

    const user = await this.userRepository.findOne({ where: { id: parsed.userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (!user.totpEnabled) {
      throw new BadRequestException('2FA no está activo');
    }

    // Hash del código ingresado
    const codeHash = this.twoFactorService.hashBackupCode(backupCode);

    // Buscar un backup code válido, no usado
    const backup = await this.backupCodeRepository.findOne({
      where: { userId: user.id, codeHash, usedAt: null as any },
    });

    if (!backup) {
      await this.audit.log(user.id, 'login_failed', req, {
        reason: '2fa_bad_backup_code',
      });
      throw new UnauthorizedException('Código de respaldo inválido');
    }

    // Marcar como usado
    backup.usedAt = new Date();
    await this.backupCodeRepository.save(backup);

    // Resetear intentos y actualizar last login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = this.extractIp(req);
    await this.userRepository.save(user);

    await this.audit.log(user.id, '2fa_verified', req, { via: 'backup_code' });

    // Emitir tokens
    const result = await this.issueTokensForUser(user, req);
    await this.audit.log(user.id, 'login_success', req, { via: 'backup_code' });
    return result;
  }

  // ============================================================
  // FASE 4 — 2FA: DISABLE (autenticado)
  // ============================================================
  async disable2FA(userId: string, code: string, req: Request) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA no está activo');
    }

    // Verificar el código TOTP antes de desactivar
    const secret = this.twoFactorService.decryptSecret(user.totpSecret);
    const isValid = await this.twoFactorService.verifyTotp(secret, code);

    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }

    // Desactivar y limpiar
    user.totpEnabled = false;
    user.totpSecret = null;
    await this.userRepository.save(user);

    // Borrar backup codes
    await this.backupCodeRepository.delete({ userId: user.id });

    await this.audit.log(user.id, '2fa_disabled', req, { email: user.email });

    return {
      message: '2FA desactivado correctamente.',
      totpEnabled: false,
    };
  }

  // ============================================================
  // FASE 4 — Helpers internos
  // ============================================================
  private buildTempToken(userId: string): string {
    const { token } = this.twoFactorService.generateTempToken();
    const expiresAt = Date.now() + 5 * 60_000; // 5 min
    return `${userId}:${token}:${expiresAt}`;
  }

  private parseTempToken(
    tempToken: string,
  ): { userId: string; token: string; expiresAt: number } | null {
    try {
      const parts = tempToken.split(':');
      if (parts.length !== 3) return null;
      const [userId, token, expiresAtStr] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || expiresAt < Date.now()) return null;
      return { userId, token, expiresAt };
    } catch {
      return null;
    }
  }

  /**
   * Helper interno: emite access + refresh tokens + devuelve user y tenant.
   * Reutilizable por login normal y por verify2FALogin/verifyBackupCode.
   */
  private async issueTokensForUser(user: User, req: Request) {
    const context = await this.getUserContext(user.id);

    const accessPayload = {
      sub: context.user.id,
      email: context.user.email,
      role: context.activeRole,
      hasTenant: context.hasTenant,
      tenantSlug: context.tenantSlug,
      tenantId: context.tenant?.id ?? null,
      onboarding_completed: context.user.onboarding_completed,
      emailVerified: !!(context.user as any).emailVerified,
    };
    const access_token = this.tokenService.signAccess(accessPayload);

    const { token: refresh_token } = await this.refreshTokenService.issue(
      context.user.id,
      this.extractIp(req),
      req?.headers?.['user-agent']?.toString(),
    );

    return {
      message: 'Inicio de sesión exitoso',
      access_token,
      refresh_token,
      user: {
        id: context.user.id,
        name: context.user.name,
        email: context.user.email,
        role: context.activeRole,
        hasTenant: context.hasTenant,
        tenantSlug: context.tenantSlug,
        onboarding_completed: context.user.onboarding_completed,
        phone: context.user.phone,
        city: context.user.city,
        address: context.user.address,
        deliveryCity: context.user.deliveryCity,
        preferredCurrency: context.user.preferredCurrency,
        state: context.user.state,
        municipality: context.user.municipality,
        primary_color: context.primary_color,
        secondary_color: context.secondary_color,
        accent_color: context.accent_color,
        background_color: context.background_color,
        font_family: context.font_family,
        // 🔥 Cédula + flag Pago Móvil (para autocompletar checkout)
        id_number: context.user.id_number ?? null,
        id_type: context.user.id_type ?? null,
        pago_movil_same_as_profile: Boolean(context.user.pago_movil_same_as_profile),
        emailVerified: !!(context.user as any).emailVerified,
      },
      tenant: context.tenant
        ? {
            id: context.tenant.id,
            name: context.tenant.name,
            slug: context.tenant.slug,
            modelType: (context.tenant as any).modelType,
            workModality: (context.tenant as any).workModality,
            primary_color: context.tenant.primaryColor || '#ea580c',
            secondary_color: context.tenant.secondaryColor || '#0f172a',
            accent_color: context.tenant.accentColor || '#fbbf24',
            background_color: context.tenant.backgroundColor || '#0b0f19',
            font_family: context.tenant.fontFamily || 'Quicksand',
          }
        : null,
    };
  }
  // ============================================================
  // FASE 4 — 2FA: STATUS
  // ============================================================
  async get2FAStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return { totpEnabled: !!user.totpEnabled };
  }

  // ============================================================
  // FASE 5 — SESIONES ACTIVAS
  // ============================================================
  async listSessions(userId: string, currentRefreshToken?: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
      },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });

    const now = Date.now();
    const currentHash = currentRefreshToken
      ? this.tokenService.sha256(currentRefreshToken)
      : null;

    return sessions
      .filter((s) => s.expiresAt.getTime() > now)
      .map((s) => {
        const parsed = parseUserAgent(s.userAgent);
        return {
          id: s.id,
          ip: s.ip,
          userAgent: s.userAgent,
          browser: parsed.browser,
          os: parsed.os,
          device: parsed.device,
          label: parsed.label,
          createdAt: s.createdAt,
          lastUsedAt: s.lastUsedAt,
          expiresAt: s.expiresAt,
          isCurrent: currentHash ? s.tokenHash === currentHash : false,
        };
      });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.refreshTokenRepository.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.revokedAt) {
      return { ok: true, message: 'La sesión ya estaba cerrada.' };
    }
    session.revokedAt = new Date();
    await this.refreshTokenRepository.save(session);
    return { ok: true, message: 'Sesión cerrada.' };
  }

  async revokeOtherSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken
      ? this.tokenService.sha256(currentRefreshToken)
      : null;

    // Query builder para no tocar el current
    const qb = this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('"userId" = :userId', { userId })
      .andWhere('"revokedAt" IS NULL');

    if (currentHash) {
      qb.andWhere('"tokenHash" != :currentHash', { currentHash });
    }

    const result = await qb.execute();
    const affected = result.affected ?? 0;

    return {
      ok: true,
      revoked: affected,
      message: `${affected} sesión(es) cerrada(s).`,
    };
  }
}


