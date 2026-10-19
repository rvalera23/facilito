import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  /**
   * GET /receipts/order/:orderId
   * Devuelve el comprobante de una orden específica.
   */
  @Get('order/:orderId')
  async findByOrder(@Param('orderId') orderId: string) {
    const receipt = await this.receiptsService.findByOrderId(orderId);
    if (!receipt) {
      throw new NotFoundException(
        `No se encontró comprobante para la orden ${orderId}`,
      );
    }
    return receipt;
  }

  /**
   * GET /receipts/tenant/:tenantId
   * Lista los comprobantes de un tenant con filtros opcionales.
   */
  @Get('tenant/:tenantId')
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.receiptsService.findByTenant(tenantId, {
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}