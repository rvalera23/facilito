  // apps/backend/src/modules/account/account.controller.ts

  import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Body,
    Req,
    BadRequestException,
    UnauthorizedException,
    UseInterceptors,
    UseGuards,
    UploadedFile,
    Res,
    Param,
    Query,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { AuthGuard } from '@nestjs/passport';
  import { diskStorage } from 'multer';
  import { extname, join } from 'path';
  import * as fs from 'fs';
  import type { Request, Response } from 'express';
  import { AccountService } from './account.service';

  @Controller(['account', 'api/account'])
    @UseGuards(AuthGuard('jwt'))
  export class AccountController {
    constructor(private readonly accountService: AccountService) {}

    private extractUserId(req: Request): string {
      // 🔥 Fase 6.2: usar siempre req.user (ya validado por AuthGuard/Passport).
      // NO decodificar a mano — eso permitía tokens sin verificar firma
      // y tiraba 500 en vez de 401 cuando el token era basura.
      return (
        req.authContext?.userId ||
        (req.user as any)?.['sub'] ||
        (req.user as any)?.['id'] ||
        (req.user as any)?.['userId'] ||
        ''
      );
    }

    @Get('profile')
    async getProfile(@Req() req: Request) {
      const userId = this.extractUserId(req);
      console.log('🔍 [GET /api/account/profile] userId:', userId);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      return this.accountService.findById(userId);
    }

    @Patch('profile')
    async updateProfile(@Req() req: Request, @Body() body: any) {
      const userId = this.extractUserId(req);
      console.log('📥 [PATCH /api/account/profile] userId:', userId);
      console.log('📥 [PATCH /api/account/profile] body:', JSON.stringify(body, null, 2));
      
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      return this.accountService.update(userId, body);
    }

    @Get('orders')
    async getMyOrders(@Req() req: Request) {
      const userId = this.extractUserId(req);
      console.log('🔍 [GET /api/account/orders] userId:', userId);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      return this.accountService.findOrdersByUserId(userId);
    }

    @Get('appointments')
    async getMyAppointments(@Req() req: Request) {
      const userId = this.extractUserId(req);
      console.log('📅 [GET /api/account/appointments] userId:', userId);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      return this.accountService.findAppointmentsByUserId(userId);
    }



    // ============================================================
    // 🔥 SALDO A FAVOR (user_credits)
    // ============================================================

    /**
     * GET /api/account/credit/summary?tenantId=X
     * Devuelve el total de saldos a favor del tenant y cuántos
     * clientes lo tienen. Solo para uso del dashboard del admin.
     */
    @Get('credit/summary')
    async getCreditSummary(
      @Req() req: Request,
      @Query('tenantId') tenantId: string,
    ) {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      if (!tenantId) {
        throw new BadRequestException('tenantId es requerido');
      }

      console.log(
        `💳 [GET /api/account/credit/summary] userId=${userId} tenantId=${tenantId}`,
      );

      return this.accountService.getCreditSummary(tenantId);
    }

    /**
     * GET /api/account/credit?tenantId=X
     * Devuelve el saldo a favor del usuario en un tenant.
     */
    @Get('credit')
    async getCredit(
      @Req() req: Request,
      @Query('tenantId') tenantId: string,
    ) {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      if (!tenantId) {
        throw new BadRequestException('tenantId es requerido');
      }

      console.log(
        `💳 [GET /api/account/credit] userId=${userId} tenantId=${tenantId}`,
      );

      return this.accountService.getCreditBalance(userId, tenantId);
    }

    /**
     * PATCH /api/account/credit
     * Body: { tenantId, delta, reason? }
     * Acredita (delta > 0) o debita (delta < 0) saldo.
     * Solo el propio usuario puede modificar su saldo (no admins por acá;
     * el admin usa el endpoint de resolve-change en orders).
     */
    @Patch('credit')
    async updateCredit(
      @Req() req: Request,
      @Body() body: { tenantId: string; delta: number; reason?: string },
    ) {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      if (!body?.tenantId) {
        throw new BadRequestException('tenantId es requerido');
      }
      const delta = Number(body?.delta);
      if (!Number.isFinite(delta) || delta === 0) {
        throw new BadRequestException('delta debe ser un número distinto de 0');
      }

      console.log(
        `💳 [PATCH /api/account/credit] userId=${userId} tenantId=${body.tenantId} delta=${delta}`,
      );

      if (delta > 0) {
        return this.accountService.creditUser(userId, body.tenantId, delta);
      }

      return this.accountService.debitUserCredit(
        userId,
        body.tenantId,
        Math.abs(delta),
      );
    }

    /**
     * GET /api/account/credit/tenants
     * Devuelve TODOS los tenants donde el user autenticado tiene saldo > 0.
     * Sirve para que el comprador vea en qué tiendas tiene saldo a favor.
     */
    @Get('credit/tenants')
    async getCreditTenants(@Req() req: Request) {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      console.log(
        `💳 [GET /api/account/credit/tenants] userId=${userId}`,
      );
      return this.accountService.getCreditTenantsByUser(userId);
    }

    /**
     * GET /api/account/credit/users?tenantId=X
     * Devuelve TODOS los users con saldo > 0 en un tenant.
     * Solo para uso del panel del admin.
     */
    @Get('credit/users')
    async getCreditUsers(
      @Req() req: Request,
      @Query('tenantId') tenantId: string,
    ) {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
      if (!tenantId) {
        throw new BadRequestException('tenantId es requerido');
      }
      console.log(
        `💳 [GET /api/account/credit/users] userId=${userId} tenantId=${tenantId}`,
      );
      return this.accountService.getCreditUsersByTenant(tenantId);
    }

    // 🔥 POST /api/account/avatar - Subir avatar con ruta ABSOLUTA
    @Post('avatar')
    @UseInterceptors(FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // 🔥 Fase 6.2: req.user ya está seteado por el AuthGuard.
          const userId = (req.user as any)?.['sub'] || (req.user as any)?.['id'];

          if (!userId) {
            return cb(new UnauthorizedException('Usuario no autenticado'), '');
          }

          // 🔥 Ruta ABSOLUTA en el servidor
          const uploadPath = `/opt/facilito/apps/backend/public/uploads/avatars/${userId}`;
          
          console.log(`📁 [destination] Creando directorio: ${uploadPath}`);
          
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log(`📁 Directorio creado: ${uploadPath}`);
          }
          
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `avatar-${uniqueSuffix}${ext}`;
          console.log(`📸 [filename] Generado: ${filename}`);
          cb(null, filename);
        }
      }),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
      fileFilter: (req, file, cb) => {
        console.log(`📸 [fileFilter] Archivo recibido: ${file.originalname}, tipo: ${file.mimetype}`);
        
        // 🔥 Validación case-insensitive y más tolerante
        const validExtensions = /\.(jpg|jpeg|png|gif|webp|jfif)$/i;
        const validMimeTypes = /^image\/(jpeg|jpg|png|gif|webp)$/i;
        
        if (!validExtensions.test(file.originalname) && !validMimeTypes.test(file.mimetype)) {
          console.error(`❌ [fileFilter] Rechazado: ${file.originalname} (${file.mimetype})`);
          return cb(new BadRequestException('Solo se permiten imágenes (jpg, jpeg, png, gif, webp, jfif)'), false);
        }
        
        cb(null, true);
      }
    }))
    async uploadAvatar(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
      console.log('📸 [uploadAvatar] File recibido:', file);
      console.log('📸 [uploadAvatar] File size:', file?.size);
      console.log('📸 [uploadAvatar] File path:', file?.path);
      console.log('📸 [uploadAvatar] File originalname:', file?.originalname);
      
      if (!file) {
        throw new BadRequestException('No se proporcionó ninguna imagen');
      }

      if (file.size === 0) {
        throw new BadRequestException('El archivo está vacío');
      }

      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      // La URL es relativa desde la raíz del servidor
      const avatarUrl = `/uploads/avatars/${userId}/${file.filename}`;
      console.log('📸 [uploadAvatar] avatarUrl:', avatarUrl);
      
      const updatedUser = await this.accountService.updateAvatar(userId, avatarUrl);
      
      return {
        success: true,
        avatarUrl,
        user: updatedUser,
      };
    }

    // 🔥 DELETE /api/account/avatar - Eliminar avatar
    @Delete('avatar')
    async deleteAvatar(@Req() req: Request) {
      const userId = this.extractUserId(req);
      console.log('🗑️ [DELETE /api/account/avatar] userId:', userId);
      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      const updatedUser = await this.accountService.deleteAvatar(userId);
      
      return {
        success: true,
        user: updatedUser,
      };
    }
  }