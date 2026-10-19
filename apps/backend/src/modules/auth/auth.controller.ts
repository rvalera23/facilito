  // ARCHIVO: apps/backend/src/modules/auth/auth.controller.ts
  import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Query,
    Param,
    Headers,
    Request,
    Req,
    UseGuards,
    BadRequestException,
    UnauthorizedException,
    HttpCode,
    ValidationPipe,
  } from '@nestjs/common';
  import { Throttle } from '@nestjs/throttler';
  import { AuthGuard } from '@nestjs/passport';
  import type { Request as ExpressRequest } from 'express';
  import { UpdateUserLocationDto } from './dto/update-user-location.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto, LogoutDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IsString, MinLength, MaxLength, Length } from 'class-validator';
  import { AuthService } from './auth.service';

  @Controller(['auth', 'api/auth'])
    export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('check-email')
    async checkEmail(@Query('email') email: string) {
      return this.authService.checkEmail(email);
    }

    @Post('register')
    async register(
      @Body()
      body: {
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
      },
    ) {
      return this.authService.register(body);
    }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(200)
    async login(
      @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: LoginDto,
      @Req() req: ExpressRequest,
    ) {
      return this.authService.login(dto, req);
    }

    // COMPLETAR PERFIL DE COMPRADOR
    @Post('complete-buyer-profile')
    async completeBuyerProfile(@Request() req, @Body() body: any) {
      const userId = body.userId || req.user?.sub || req.user?.id;

      if (!userId) {
        throw new BadRequestException('El ID de usuario es requerido.');
      }

      return this.authService.completeBuyerProfile(userId, body);
    }

    // CREAR TIENDA (Completar perfil de vendedor)
    @Post('complete-seller-profile')
    async completeSellerProfile(@Request() req, @Body() body: any) {
      const userId = body.userId || req.user?.sub || req.user?.id;

      if (!userId) {
        throw new BadRequestException('El ID de usuario es requerido.');
      }

      // Asegurar que el slug esté presente
      if (!body.slug && body.name) {
        const slug = (body.name || '')
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        body.slug = slug;
      }

      return this.authService.completeSellerProfile(userId, body);
    }

    // OBTENER CONTEXTO DEL USUARIO
    @Get('context')
    @UseGuards(AuthGuard('jwt'))
    async getContext(@Request() req) {
      const userId = req.user?.sub || req.user?.id;

      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado.');
      }

      return this.authService.getUserWithContext(userId);
    }

    // ENDPOINT LEGACY (compatibilidad con frontend existente)
    @Post('complete-profile')
    async completeProfile(@Request() req, @Body() body: any) {
      const userId = body.userId || req.user?.sub || req.user?.id;

      if (!userId) {
        throw new BadRequestException('El ID de usuario es requerido.');
      }

      const isSeller = body.role === 'seller' || body.name || body.slug;

      if (isSeller) {
        if (!body.slug && body.name) {
          const slug = (body.name || '')
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
          body.slug = slug;
        }
        return this.authService.completeSellerProfile(userId, body);
      } else {
        return this.authService.completeBuyerProfile(userId, body);
      }
    }
    
  // ============================================================
  // UBICACIÓN DEL USUARIO (descubrimiento por cercanía)
  // ============================================================

  @UseGuards(AuthGuard('jwt'))
  @Get('me/location')
  async getMyLocation(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.getUserLocation(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me/location')
  async updateMyLocation(
    @Request() req: any,
    @Body() dto: UpdateUserLocationDto,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.updateUserLocation(userId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      geoPrecision: dto.geoPrecision,
      geoSource: dto.geoSource,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me/location')
  async clearMyLocation(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.clearUserLocation(userId);
  }

  // ============================================================
  // FASE 1 — REFRESH
  // ============================================================
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: RefreshDto,
    @Req() req: ExpressRequest,
  ) {
    return this.authService.refresh(dto.refreshToken, req);
  }

  // ============================================================
  // FASE 1 — LOGOUT
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: LogoutDto,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.logout(userId, req, dto);
  }

  // ============================================================
  // FASE 2 — FORGOT PASSWORD
  // ============================================================
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async forgotPassword(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ForgotPasswordDto,
    @Req() req: ExpressRequest,
  ) {
    return this.authService.forgotPassword(dto.email, req);
  }

  // ============================================================
  // FASE 2 — RESET PASSWORD
  // ============================================================
  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  async resetPassword(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ResetPasswordDto,
    @Req() req: ExpressRequest,
  ) {
    return this.authService.resetPassword(dto.token, dto.newPassword, req);
  }

  // ============================================================
  // FASE 2 — CHANGE PASSWORD (autenticado)
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ChangePasswordDto,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      req,
    );
  }

  // ============================================================
  // FASE 3 — SEND VERIFICATION (autenticado)
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Post('send-verification')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async sendVerification(@Request() req: any, @Req() expressReq: ExpressRequest) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.authService.sendVerification(userId, expressReq);
  }

  // ============================================================
  // FASE 3 — VERIFY EMAIL (público, con token)
  // ============================================================
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Req() req: ExpressRequest) {
    if (!token) {
      throw new BadRequestException('Falta el token de verificación');
    }
    return this.authService.verifyEmail(token, req);
  }

  // ============================================================
  // FASE 4 — 2FA
  // ============================================================

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/setup')
  @HttpCode(200)
  async setup2FA(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return this.authService.setup2FA(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/verify-setup')
  @HttpCode(200)
  async verifySetup2FA(
    @Request() req: any,
    @Body() body: { code: string },
    @Req() expressReq: ExpressRequest,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    if (!body?.code) throw new BadRequestException('Falta el código');
    return this.authService.verifySetup2FA(userId, body.code, expressReq);
  }

  @Post('2fa/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  async verify2FALogin(
    @Body() body: { tempToken: string; code: string },
    @Req() req: ExpressRequest,
  ) {
    if (!body?.tempToken || !body?.code) {
      throw new BadRequestException('Faltan tempToken o code');
    }
    return this.authService.verify2FALogin(body.tempToken, body.code, req);
  }

  @Post('2fa/backup-code')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  async verifyBackupCode(
    @Body() body: { tempToken: string; backupCode: string },
    @Req() req: ExpressRequest,
  ) {
    if (!body?.tempToken || !body?.backupCode) {
      throw new BadRequestException('Faltan tempToken o backupCode');
    }
    return this.authService.verifyBackupCode(body.tempToken, body.backupCode, req);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/disable')
  @HttpCode(200)
  async disable2FA(
    @Request() req: any,
    @Body() body: { code: string },
    @Req() expressReq: ExpressRequest,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    if (!body?.code) throw new BadRequestException('Falta el código');
    return this.authService.disable2FA(userId, body.code, expressReq);
  }

  // ============================================================
  // FASE 5 — SESIONES ACTIVAS
  // ============================================================
  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async listSessions(
    @Request() req: any,
    @Headers('x-refresh-token') currentRefresh?: string,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return this.authService.listSessions(userId, currentRefresh);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  @HttpCode(200)
  async revokeSession(@Request() req: any, @Param('id') sessionId: string) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return this.authService.revokeSession(userId, sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions')
  @HttpCode(200)
  async revokeOtherSessions(
    @Request() req: any,
    @Headers('x-refresh-token') currentRefresh?: string,
  ) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return this.authService.revokeOtherSessions(userId, currentRefresh);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('2fa/status')
  async get2FAStatus(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Usuario no autenticado');
    return this.authService.get2FAStatus(userId);
  }
  }