// ==========================================
// ARCHIVO: apps/backend/src/modules/professionals/professionals-me.controller.ts
// Endpoints "del profesional logueado". Mismo patrón que delivery-drivers.controller.ts.
// ==========================================

import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfessionalsService } from './professionals.service';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';

@Controller('professionals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProfessionalsMeController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  /**
   * POST /professionals/create-with-user
   * Crea un user (role='profesional') + su professional en una transacción.
   * Solo para admins/owners/sellers del tenant.
   */
  @Post('create-with-user')
  @Roles('admin', 'seller', 'owner')
  createWithUser(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string | null;
      password?: string | null;
      tenantId?: string | null;
      specialties?: string[];
      serviceIds?: string[];
      description?: string | null;
    },
  ) {
    return this.professionalsService.createWithUser(body);
  }

  /**
   * GET /professionals/me
   * Devuelve el profesional linkeado al user logueado.
   */
  @Get('me')
  @Roles('profesional', 'admin', 'seller', 'owner')
  async getMe(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return null;
    return this.professionalsService.findByUserId(userId);
  }

  /**
   * GET /professionals/me/bookings
   * Devuelve los bookings (citas) del profesional logueado.
   */
  @Get('me/bookings')
  @Roles('profesional', 'admin', 'seller', 'owner')
  async getMyBookings(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return [];
    return this.professionalsService.listBookingsByUserId(userId);
  }

  /**
   * PATCH /professionals/me/status
   * Cambia el estado online/offline del profesional logueado.
   */
  @Patch('me/status')
  @Roles('profesional', 'admin', 'seller', 'owner')
  async updateMyStatus(
    @Req() req: any,
    @Body() body: { isActive: boolean },
  ) {
    const userId = req.user?.id;
    if (!userId) return null;
    return this.professionalsService.updateMyStatus(userId, !!body.isActive);
  }
}
