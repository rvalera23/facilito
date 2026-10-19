import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Header,
} from '@nestjs/common';
import { TerminalsService } from './terminals.service';
import { CreateTerminalDto } from './dto/create-terminal.dto';
import { CreateKioskOrderDto } from './dto/create-kiosk-order.dto';

@Controller('terminals')
export class TerminalsController {
  constructor(private readonly terminalsService: TerminalsService) {}

  // ==========================================
  // RUTAS PÚBLICAS (Consumidas por el Kiosco Frontend)
  // ==========================================

  @Get('kiosk/:token')
  getKioskConfig(@Param('token') token: string) {
    return this.terminalsService.getKioskConfigByToken(token);
  }

  @Post('kiosk/:token/orders')
  createKioskOrder(@Param('token') token: string, @Body() dto: CreateKioskOrderDto) {
    return this.terminalsService.createOrderFromKiosk(token, dto);
  }

  // ============================================================
  // 🔥 COLA DEL KIOSKO — Endpoint que alimenta la cartelera
  // ============================================================
  // Devuelve los turnos de HOY agrupados en `now`, `next`, `waiting`.
  // Sin nombres de clientes: solo turnNumber y metadata operativa.
  // Es el contrato de la cartelera pública del kiosko.
  //
  // Cache HTTP de 3s: el kiosko hace polling cada 5s, el cache
  // reduce carga sin que el usuario note delay.
  // ============================================================
  @Get('kiosk/:token/queue')
  @Header('Cache-Control', 'public, max-age=3')
  getKioskQueue(@Param('token') token: string) {
    return this.terminalsService.getQueueByToken(token);
  }

  // ==========================================
  // RUTAS PRIVADAS (Gestionadas por el Tenant en su Dashboard)
  // ==========================================

  @Post(':tenantId')
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateTerminalDto) {
    return this.terminalsService.create(tenantId, dto);
  }

  @Get('tenant/:tenantId')
  findAllByTenant(@Param('tenantId') tenantId: string) {
    return this.terminalsService.findAllByTenant(tenantId);
  }

  @Delete(':tenantId/:id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.terminalsService.remove(tenantId, id);
  }
}