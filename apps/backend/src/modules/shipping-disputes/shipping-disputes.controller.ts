// ==========================================
// ARCHIVO: apps/backend/src/modules/shipping-disputes/shipping-disputes.controller.ts
// Endpoints del sistema de disputas de encomiendas.
// ==========================================

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ShippingDisputesService } from './shipping-disputes.service';
import { ShippingDisputesScheduler } from './shipping-disputes.scheduler';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import { EscalateDisputeDto } from './dto/escalate-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AcceptResolutionDto } from './dto/accept-resolution.dto';

@Controller(['shipping-disputes', 'api/shipping-disputes'])
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ShippingDisputesController {
  constructor(
    private readonly disputesService: ShippingDisputesService,
    private readonly scheduler: ShippingDisputesScheduler,
  ) {}

  private extractUserId(req: any): string {
    const user = req?.user;
    const userId = user?.id || user?.userId || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return userId;
  }

  // ── Admin (testing) ────────────────────────────────────────
  // Fuerza la ejecución del cron de auto-progresión de disputas.
  // Sirve para testing sin esperar la hora al cron.
  @Post('admin/trigger-cron')
  @Roles('admin', 'seller', 'owner')
  async triggerCron() {
    await this.scheduler.handleAutoProgress();
    return { ok: true, message: 'Cron ejecutado' };
  }

  // ── Comprador ──────────────────────────────────────────────

  // 🔥 SIN @Roles: un buyer con tienda tiene role='seller' en el JWT
  // (activeRole) pero sigue siendo comprador. El service filtra por userId,
  // y los endpoints individuales chequean ownership via dispute.buyerId.
  // Esto evita el falso 403 para buyers con tienda.

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateDisputeDto, @Req() req: any) {
    const buyerId = this.extractUserId(req);
    return this.disputesService.create({
      orderId: dto.orderId,
      buyerId,
      reason: dto.reason,
      buyerMessage: dto.buyerMessage,
    });
  }

  @Get('my-cases')
  async myCases(@Req() req: any) {
    const buyerId = this.extractUserId(req);
    return this.disputesService.findByBuyer(buyerId);
  }

  @Patch(':id/escalate')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async escalate(
    @Param('id') id: string,
    @Body() dto: EscalateDisputeDto,
    @Req() req: any,
  ) {
    const buyerId = this.extractUserId(req);
    const dispute = await this.disputesService.findById(id);
    if (dispute.buyerId !== buyerId) {
      throw new UnauthorizedException('No sos el dueño de esta disputa');
    }
    return this.disputesService.escalate(id, dto.reason);
  }

  @Patch(':id/accept')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async accept(
    @Param('id') id: string,
    @Body() dto: AcceptResolutionDto,
    @Req() req: any,
  ) {
    const buyerId = this.extractUserId(req);
    return this.disputesService.acceptResolution(id, buyerId, dto.accepted);
  }

  // ── Vendedor / Admin ──────────────────────────────────────

  @Get('tenant/:tenantId')
  async byTenant(@Param('tenantId') tenantId: string, @Req() req: any) {
    const user = req.user;
    return this.disputesService.findByTenantForSeller(tenantId, {
      id: user?.id || user?.userId || user?.sub,
      role: user?.role,
      activeRole: user?.activeRole,
      tenantId: user?.tenantId,
    });
  }

  @Patch(':id/respond')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async respond(
    @Param('id') id: string,
    @Body() dto: RespondDisputeDto,
    @Req() req: any,
  ) {
    const sellerId = this.extractUserId(req);
    const user = req.user;
    return this.disputesService.respond(id, sellerId, dto.response, {
      id: sellerId,
      role: user?.role,
      activeRole: user?.activeRole,
      tenantId: user?.tenantId,
    });
  }

  @Patch(':id/resolve')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: any,
  ) {
    const sellerId = this.extractUserId(req);
    const user = req.user;
    return this.disputesService.resolve(
      id,
      sellerId,
      {
        type: dto.type,
        amountUsd: dto.amountUsd,
        notes: dto.notes,
      },
      {
        id: sellerId,
        role: user?.role,
        activeRole: user?.activeRole,
        tenantId: user?.tenantId,
      },
    );
  }

  // ── Común ─────────────────────────────────────────────────

  @Get('can-report/:orderId')
  async canReport(@Param('orderId') orderId: string) {
    return this.disputesService.canReport(orderId);
  }

  @Get('order/:orderId')
  async byOrder(@Param('orderId') orderId: string) {
    return this.disputesService.findByOrder(orderId);
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }
}