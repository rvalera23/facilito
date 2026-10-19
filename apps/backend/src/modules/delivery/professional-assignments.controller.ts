// apps/backend/src/modules/delivery/professional-assignments.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ProfessionalAssignmentsService } from './professional-assignments.service';
import type { AssignmentStatus } from './entities/professional-assignment.entity';

@Controller('delivery/professionals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProfessionalAssignmentsController {
  constructor(
    private readonly assignmentsService: ProfessionalAssignmentsService,
  ) {}

  // ============================================================
  // ASIGNAR PROFESIONAL A BOOKING (admin)
  // ============================================================
  @Post('assign')
  @Roles('admin', 'seller', 'owner')
  assignProfessional(
    @Body()
    body: {
      bookingId: string;
      professionalId?: string;
      tenantId: string;
    },
  ) {
    if (!body?.bookingId) {
      throw new BadRequestException('bookingId es obligatorio');
    }
    if (!body?.tenantId) {
      throw new BadRequestException('tenantId es obligatorio');
    }
    return this.assignmentsService.assignProfessional(body);
  }

  // ============================================================
  // MIS ASIGNACIONES ACTIVAS (profesional)
  // ============================================================
  @Get('me/assignments')
  @Roles('profesional', 'admin', 'seller', 'owner')
  listMyActiveAssignments(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    return this.assignmentsService.listMyActiveAssignments(userId);
  }

  // ============================================================
  // MI HISTORIAL (profesional)
  // ============================================================
  @Get('me/assignments/history')
  @Roles('profesional', 'admin', 'seller', 'owner')
  listMyHistoryAssignments(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    return this.assignmentsService.listMyHistoryAssignments(userId);
  }

  // ============================================================
  // CAMBIAR MI ESTADO (online/offline)
  // ============================================================
  @Patch('me/status')
  @Roles('profesional')
  setMyStatus(
    @Body() body: { status: 'online' | 'offline' },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    if (!body?.status || !['online', 'offline'].includes(body.status)) {
      throw new BadRequestException(
        "status debe ser 'online' o 'offline'",
      );
    }
    return this.assignmentsService.setMyStatus(userId, body.status);
  }

  // ============================================================
  // ACTUALIZAR MI UBICACIÓN (tracking en vivo)
  // ============================================================
  @Patch('me/location')
  @Roles('profesional')
  updateMyLocation(
    @Body() body: { lat: number; lng: number },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    if (
      typeof body?.lat !== 'number' ||
      typeof body?.lng !== 'number' ||
      !Number.isFinite(body.lat) ||
      !Number.isFinite(body.lng)
    ) {
      throw new BadRequestException('lat y lng son obligatorios y numéricos');
    }
    return this.assignmentsService.updateMyLocation(userId, body.lat, body.lng);
  }

  // ============================================================
  // CAMBIAR ESTADO DE UNA ASIGNACIÓN (profesional)
  // ============================================================
  @Patch('assignments/:assignmentId/status')
  @Roles('profesional', 'admin', 'seller', 'owner')
  updateAssignmentStatus(
    @Param('assignmentId') assignmentId: string,
    @Body() body: { status: AssignmentStatus; notes?: string },
  ) {
    if (!body?.status) {
      throw new BadRequestException('status es obligatorio');
    }
    return this.assignmentsService.updateAssignmentStatus(
      assignmentId,
      body.status,
      body.notes,
    );
  }

  // ============================================================
  // TRACKING PÚBLICO PARA EL COMPRADOR (booking)
  // ============================================================
  @Get('tracking/booking/:bookingId')
  getPublicTracking(@Param('bookingId') bookingId: string) {
    return this.assignmentsService.getPublicAssignmentByBooking(bookingId);
  }
}
