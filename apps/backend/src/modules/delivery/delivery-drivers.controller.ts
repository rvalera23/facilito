// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery-drivers.controller.ts
// Endpoints de drivers y assignments.
// ==========================================

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { DeliveryDriversService } from './delivery-drivers.service';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import type {
  DriverStatus,
  VehicleType,
} from './entities/delivery-driver.entity';
import { DeliveryEtaService } from './delivery-eta.service';
import { DeliveryOwnershipService } from './delivery-ownership.service';
import type {
  AssignmentStatus,
} from './entities/delivery-assignment.entity';

@Controller('delivery')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DeliveryDriversController {
  constructor(
    private readonly driversService: DeliveryDriversService,
    private readonly etaService: DeliveryEtaService,
    private readonly ownership: DeliveryOwnershipService,
  ) {}

  // ============================================================
  // DRIVERS
  // ============================================================

  @Post('drivers')
  @Roles('admin', 'seller', 'owner')
  createDriver(
    @Body()
    body: {
      userId: string;
      tenantId?: string | null;
      vehicleType?: VehicleType | null;
      vehiclePlate?: string | null;
      maxActiveOrders?: number;
    },
  ) {
    return this.driversService.createDriver(body);
  }


  /**
   * POST /delivery/drivers/create-with-user
   * Crea un user nuevo (role='repartidor') + su driver en una transacción.
   * Solo para admins del tenant.
   */
  @Post('drivers/create-with-user')
  @Roles('admin', 'seller', 'owner')
  createDriverWithUser(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string | null;
      password?: string | null;
      tenantId?: string | null;
      vehicleType?: VehicleType | null;
      vehiclePlate?: string | null;
      maxActiveOrders?: number;
    },
  ) {
    return this.driversService.createDriverWithUser(body);
  }

  @Get('drivers')
  async listDrivers(
    @Query('tenantId') tenantId: string | undefined,
    @Query('includePool') includePool: string | undefined,
    @Query('status') status: DriverStatus | undefined,
    @Req() req: any,
  ) {
    const isAdmin = this.ownership.isAdminRole(req.user.role);
    const isDriver = this.ownership.isDriverRole(req.user.role);

    if (isAdmin) {
      const effectiveTenantId = req.user.tenantId || tenantId || null;
      return this.driversService.listDrivers({
        tenantId: effectiveTenantId,
        includePool: includePool === 'true',
        status,
      });
    }

    if (isDriver) {
      // Multi-tienda: devolvemos TODOS los vínculos del repartidor.
      // El frontend filtra por tenant si lo necesita.
      return this.driversService.getDriversByUserId(req.user.id);
    }

    return this.driversService.listDrivers({
      tenantId: null,
      includePool: true,
      status,
    });
  }

  /**
   * GET /delivery/drivers/me
   * Devuelve UN driver (compat con frontend actual).
   * - Si viene ?tenantId=... → filtra ese tenant.
   * - Si no, usa req.user.tenantId si está en el JWT.
   * - Si tampoco, devuelve el primero (created_at ASC).
   */
  @Get('drivers/me')
  async getMyDriverProfile(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) return null;
    const effectiveTenant =
      tenantId !== undefined ? tenantId : (req.user.tenantId ?? undefined);
    return this.driversService.getDriverByUserId(userId, effectiveTenant);
  }

  /**
   * GET /delivery/drivers/me/all
   * Devuelve TODOS los vínculos del repartidor (multi-tienda).
   * Fase 3 lo consume el panel del repartidor.
   *
   * ⚠️ Debe ir ANTES de 'drivers/:driverId' para que Nest no matchee 'me' como driverId.
   */
  @Get('drivers/me/all')
  @Roles('repartidor', 'admin', 'seller', 'owner')
  async getAllMyDriverProfiles(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return [];
    return this.driversService.getDriversByUserId(userId);
  }

  /**
   * GET /delivery/drivers/me/assignments
   * Devuelve las assignments activas del driver logueado.
   * Solo rol 'repartidor'.
   */
  @Get('drivers/me/assignments')
  @Roles('repartidor', 'admin', 'seller', 'owner')
  async getMyAssignments(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return [];
    }
    return this.driversService.listMyActiveAssignments(userId);
  }

  
  /**
   * GET /delivery/drivers/me/assignments/history
   * Devuelve el historial de assignments (entregadas/canceladas/rechazadas).
   */
  @Get('drivers/me/assignments/history')
  @Roles('repartidor', 'admin', 'seller', 'owner')
  async getMyAssignmentsHistory(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return [];
    }
    return this.driversService.listMyHistoryAssignments(userId);
  }

  /**
   * GET /delivery/drivers/lookup?email=...
   * Devuelve { user, isRepartidor, tenants } o null si no existe.
   * Solo admin/seller/owner. Usado por CreateDriverModal.
   *
   * ⚠️ Debe ir ANTES de 'drivers/:driverId'.
   */
  @Get('drivers/lookup')
  @Roles('admin', 'seller', 'owner')
  async lookupDriverByEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('El parámetro email es obligatorio');
    }
    return this.driversService.lookupByEmail(email);
  }

  // ============================================================
  // SELF-SERVICE DEL REPARTIDOR (me/*)
  // ⚠️ Todos estos van ANTES de los :driverId genéricos.
  // ============================================================

  /**
   * PATCH /delivery/drivers/me/contact
   * Self-service del repartidor: SOLO phone y phone_is_whatsapp.
   */
  @Patch('drivers/me/contact')
  @Roles('repartidor')
  async updateMyContactInfo(
    @Req() req: any,
    @Body()
    body: {
      phone?: string | null;
      phone_is_whatsapp?: boolean;
    },
  ) {
    return this.driversService.updateMyContactInfo(req.user.id, body);
  }

  /**
   * POST /delivery/drivers/me/avatar
   * Self-service del repartidor: sube su propio avatar.
   */
  @Post('drivers/me/avatar')
  @Roles('repartidor')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(
            process.cwd(),
            'public',
            'uploads',
            'avatars',
            'drivers',
          );
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Solo se permiten imágenes') as any,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadMyAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const avatarUrl = `/uploads/avatars/drivers/${file.filename}`;
    return this.driversService.updateMyAvatar(req.user.id, avatarUrl);
  }

  // ============================================================
  // 🔥 CAMBIAR MI ESTADO (online/offline/busy/paused)
  // ============================================================
  @Patch('drivers/me/status')
  @UseGuards(AuthGuard('jwt'))
  setMyStatus(
    @Body() body: { status: 'offline' | 'online' | 'busy' | 'paused' },
    @Req() req: any,
  ) {
    const user = req.user;
    const userId = user?.id || user?.userId || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.driversService.setMyStatus(userId, body.status);
  }

  // ============================================================
  // ADMIN: gestión de repartidores (:driverId)
  // ============================================================

  /**
   * POST /delivery/drivers/:driverId/avatar
   * Sube el avatar del repartidor. Solo admin/seller/owner.
   */
  @Post('drivers/:driverId/avatar')
  @Roles('admin', 'seller', 'owner')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(
            process.cwd(),
            'public',
            'uploads',
            'avatars',
            'drivers',
          );
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Solo se permiten imágenes') as any,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadDriverAvatar(
    @Param('driverId') driverId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const avatarUrl = `/uploads/avatars/drivers/${file.filename}`;
    return this.driversService.updateAvatar(driverId, avatarUrl);
  }

  /**
   * PATCH /delivery/drivers/:driverId/password
   * Cambia la contraseña del user asociado al repartidor.
   */
  @Patch('drivers/:driverId/password')
  @Roles('admin', 'seller', 'owner')
  async updateDriverPassword(
    @Param('driverId') driverId: string,
    @Body() body: { password: string },
  ) {
    if (!body.password?.trim() || body.password.trim().length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }
    return this.driversService.updatePassword(driverId, body.password);
  }

  @Get('drivers/:driverId')
  async getDriver(@Param('driverId') driverId: string, @Req() req: any) {
    await this.ownership.assertCanReadDriver(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      driverId,
    );
    return this.driversService.getDriverById(driverId);
  }

  /**
   * ⚠️ Fase 2: el repartidor YA NO puede auto-editar name/phone/cédula/vehículo.
   * Esos campos los cambia solo el admin del tenant (PATCH /delivery/drivers/:id).
   * El repartidor solo puede cambiar su status (PATCH /delivery/drivers/me/status)
   * y su password (PATCH /auth/change-password).
   *
   * El método `updateMyDriverProfile` queda en el service pero inalcanzable por HTTP.
   */

  @Patch('drivers/:driverId')
  async updateDriver(
    @Param('driverId') driverId: string,
    @Body()
    body: {
      status?: DriverStatus;
      currentLat?: number | null;
      currentLng?: number | null;
      vehicleType?: VehicleType | null;
      vehiclePlate?: string | null;
      maxActiveOrders?: number;
      isVerified?: boolean;
    },
    @Req() req: any,
  ) {
    await this.ownership.assertCanUpdateDriver(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      driverId,
    );
    return this.driversService.updateDriver(driverId, body);
  }

  @Patch('drivers/:driverId/location')
  async updateDriverLocation(
    @Param('driverId') driverId: string,
    @Body() body: { lat: number; lng: number },
    @Req() req: any,
  ) {
    await this.ownership.assertCanUpdateDriverLocation(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      driverId,
    );
    return this.driversService.updateDriverLocation(driverId, body);
  }

  @Delete('drivers/:driverId')
  @Roles('admin', 'seller', 'owner')
  @HttpCode(204)
  async deleteDriver(@Param('driverId') driverId: string) {
    await this.driversService.deleteDriver(driverId);
  }

  // ============================================================
  // ASSIGNMENTS
  // ============================================================

  @Post('assignments/assign')
  @Roles('admin', 'seller', 'owner')
  assignOrder(
    @Body()
    body: {
      orderId: string;
      driverId?: string;
      tenantId: string;
      tenantLat?: number | null;
      tenantLng?: number | null;
    },
  ) {
    return this.driversService.assignOrder(body);
  }

  @Get('assignments/pending')
  @Roles('admin', 'seller', 'owner')
  listPendingAssignments(@Query('tenantId') tenantId: string) {
    return this.driversService.listPendingAssignments(tenantId);
  }

  @Get('assignments/order/:orderId')
  async getAssignmentByOrder(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const assignment = await this.driversService.getAssignmentByOrder(orderId);
    if (!assignment) return null;

    await this.ownership.assertCanReadAssignment(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      assignment.id,
    );
    return assignment;
  }

    /**
   * 🔥 Endpoint de tracking PÚBLICO para el comprador.
   * Valida con `ownership.canTrackOrder` (buyer dueño, admin del tenant,
   * o repartidor asignado). Devuelve la assignment sanitizada.
   *
   * El endpoint viejo (`assignments/order/:orderId`) sigue intacto
   * para admin/repartidor.
   */
  @Get('tracking/order/:orderId')
  async getOrderTracking(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const canTrack = await this.ownership.canTrackOrder(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      orderId,
    );
    if (!canTrack) {
throw new ForbiddenException(
  'No tienes permiso para ver el tracking de esta orden',
);
    }
    return this.driversService.getPublicAssignmentByOrder(orderId);
  }

    /**
   * 🔥 Endpoint público de ETA en vivo para el comprador.
   * Valida con `ownership.canTrackOrder` (buyer dueño, admin del tenant,
   * o repartidor asignado).
   *
   * El endpoint viejo (`assignments/:assignmentId/eta`) sigue intacto
   * para admin/repartidor.
   */
  @Get('tracking/order/:orderId/eta')
  async getPublicOrderTrackingEta(
    @Param('orderId') orderId: string,
    @Query('thresholdM') thresholdM: string | undefined,
    @Req() req: any,
  ) {
    const canTrack = await this.ownership.canTrackOrder(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      orderId,
    );
    if (!canTrack) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'No tienes permiso para ver el tracking de esta orden',
      );
    }

    // Buscar la assignment por orderId (necesitamos el id para computeLiveEta)
    const assignment = await this.driversService.getAssignmentByOrder(orderId);
    if (!assignment) return null;

    const threshold = thresholdM ? Number(thresholdM) : 500;
    return this.etaService.computeLiveEta(assignment.id, threshold);
  }

  @Get('assignments/driver/:driverId')
  async listAssignmentsByDriver(
    @Param('driverId') driverId: string,
    @Query('status') status: string | undefined,
    @Req() req: any,
  ) {
    await this.ownership.assertCanReadDriver(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      driverId,
    );
    const statuses = status
      ? (status.split(',') as AssignmentStatus[])
      : undefined;
    return this.driversService.listAssignmentsByDriver(driverId, statuses);
  }


  @Patch('assignments/:assignmentId/status')
  async updateAssignmentStatus(
    @Param('assignmentId') assignmentId: string,
    @Body() body: { status: AssignmentStatus; notes?: string },
    @Req() req: any,
  ) {
    await this.ownership.assertCanUpdateAssignmentStatus(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      assignmentId,
    );
    return this.driversService.updateAssignmentStatus(
      assignmentId,
      body.status,
      body.notes,
    );
  }

  // ============================================================
  // ETA EN VIVO + RUTA + TRACKING
  // ============================================================

  /**
   * GET /delivery/assignments/:assignmentId/eta
   * ETA recalculado en base a la posición actual del driver.
   */
  @Get('assignments/:assignmentId/eta')
  async getLiveEta(
    @Param('assignmentId') assignmentId: string,
    @Query('thresholdM') thresholdM: string | undefined,
    @Req() req: any,
  ) {
    await this.ownership.assertCanReadAssignment(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      assignmentId,
    );
    const threshold = thresholdM ? Number(thresholdM) : 500;
    return this.etaService.computeLiveEta(assignmentId, threshold);
  }

  /**
   * GET /delivery/drivers/:driverId/route
   * Ruta greedy (nearest-neighbor) para las órdenes activas del driver.
   */
  @Get('drivers/:driverId/route')
  async getRoute(@Param('driverId') driverId: string, @Req() req: any) {
    await this.ownership.assertCanReadDriver(
      { id: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      driverId,
    );
    return this.etaService.computeRouteForDriver(driverId);
  }

  /**
   * GET /delivery/assignments/:assignmentId/tracking
   * Blob completo: ETA en vivo. (Sin assignment anidado para simplificar.)
   */
  @Get('assignments/:assignmentId/tracking')
  async getTracking(@Param('assignmentId') assignmentId: string) {
    const eta = await this.etaService.computeLiveEta(assignmentId);
    return { eta };
  }
}
