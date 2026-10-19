  // ARCHIVO: backend/src/modules/orders/orders.controller.ts

  import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Put,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    NotFoundException,
    UseGuards,
    UsePipes,
    ValidationPipe,
    Req,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { extname } from 'path';
  import type { Request } from 'express';
  import { OrdersService } from './orders.service';
  import { CreateOrderDto } from './dto/create-order.dto';
  import { CreatePaymentBreakdownDto, ResolveChangeDto } from './dto/payment-breakdown.dto';

  // 🔥 Función para obtener la URL base del servidor
  function getBaseUrl(): string {
    // 🔥 PRIORIDAD 1: Variable de entorno API_URL (ya configurada)
    const configuredUrl = process.env.API_URL;
    if (configuredUrl) {
      return configuredUrl.endsWith('/') ? configuredUrl.slice(0, -1) : configuredUrl;
    }
    
    // 🔥 PRIORIDAD 2: IP del servidor desde variable de entorno
    // Si SERVER_IP no está definida, lanzar error para forzar configuración correcta
    const host = process.env.SERVER_IP;
    const port = process.env.PORT || 3000;
    if (!host) {
      throw new Error(
        'SERVER_IP no está configurada. Definila en el .env para generar URLs públicas correctamente.'
      );
    }
    return `http://${host}:${port}`;
  }

  @Controller('orders')
  export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post()
    create(@Body() createOrderDto: CreateOrderDto) {
      return this.ordersService.create(createOrderDto);
    }

    @Get('tenant/:tenantId')
    findByTenant(@Param('tenantId') tenantId: string) {
      return this.ordersService.findByTenant(tenantId);
    }

    @Get('tenant/:tenantId/kiosk')
    findKioskServiceOrders(@Param('tenantId') tenantId: string) {
      return this.ordersService.findByTenant(tenantId, 'kiosk');
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
      return this.ordersService.findByUser(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.ordersService.findOne(id);
    }

    @Patch(':id/status')
    updateStatus(
      @Param('id') id: string,
      @Body() body: { status: string; force?: boolean },
      @Req() req: any,
    ) {
      const user = req?.user;
      return this.ordersService.updateStatus(id, body.status, {
        force: body.force === true,
        user: user
          ? {
              id: user.id || user.userId || user.sub,
              role: user.role,
              activeRole: user.activeRole,
              tenantId: user.tenantId,
            }
          : undefined,
      });
    }

    @Get(':id/can-modify')
    canModify(@Param('id') id: string) {
      return this.ordersService.canModify(id);
    }

    @Put(':id/payment')
    updatePayment(
      @Param('id') id: string, 
      @Body() body: { 
        status?: string; 
        bankSource?: string; 
        paymentReference?: string; 
        paymentMethod?: string;
        clientIdNumber?: string;
        clientIdType?: string;
        clientPhone?: string;
        clientAccountType?: string;
        paymentProof?: string;
        // 🔥 Si el pago es en efectivo, incluir moneda + monto entregado
        cashCurrency?: 'VES' | 'USD';
        cashAmount?: number;
        // 🔥 Vuelto: resolución + preferencia del comprador
        changeResolution?: 'credit' | 'pending' | 'rounded';
        changeDeliveryPreference?: {
          method: 'cash_ves' | 'cash_usd' | 'pago_movil' | 'other';
          pagoMovilData?: {
            bank: string;
            phone: string;
            clientIdType: 'V' | 'E' | 'J' | 'G' | 'P';
            clientIdNumber: string;
          };
          notes?: string;
        };
      }
    ) {
      const methodLabels: Record<string, string> = {
        cash: 'Efectivo en Caja',
        efectivo: 'Efectivo en Caja',
        pago_movil: 'Pago Móvil',
        pagomovil: 'Pago Móvil',
        'pago móvil': 'Pago Móvil',
        zelle: 'Zelle',
        pos: 'Punto de Venta',
        punto: 'Punto de Venta',
        biopago: 'Biopago',
        binance: 'Binance Pay',
        paypal: 'PayPal',
      };

      const paymentMethodInSpanish = body.paymentMethod 
        ? methodLabels[body.paymentMethod] || body.paymentMethod 
        : undefined;

      return this.ordersService.updatePaymentDetails(id, {
        status: body.status || 'por_verificar',
        bankSource: body.bankSource,
        paymentReference: body.paymentReference,
        paymentMethod: paymentMethodInSpanish,
        clientIdNumber: body.clientIdNumber,
        clientIdType: body.clientIdType,
        clientPhone: body.clientPhone,
        clientAccountType: body.clientAccountType,
        paymentProof: body.paymentProof,
        cashCurrency: body.cashCurrency,
        cashAmount: body.cashAmount,
        changeResolution: body.changeResolution,
        changeDeliveryPreference: body.changeDeliveryPreference,
      });
    }

    @Post(':id/proof')
    @UseInterceptors(FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/orders/proofs',
        filename: (req, file, callback) => {
          const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = extname(file.originalname);
          callback(null, `proof-${uniqueId}${extension}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/)) {
          return callback(new BadRequestException('Solo se permiten imágenes (JPG, PNG, GIF, WEBP) y PDF'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }))
    async uploadProof(
      @Param('id') id: string,
      @UploadedFile() file: Express.Multer.File,
    ) {
      if (!file) {
        throw new BadRequestException('No se recibió ningún archivo');
      }

      try {
        await this.ordersService.findOne(id);
      } catch (error) {
        throw new NotFoundException('Orden no encontrada');
      }

      const baseUrl = getBaseUrl();
      const fileUrl = `${baseUrl}/uploads/orders/proofs/${file.filename}`;

      console.log(`📎 Comprobante subido para orden ${id}: ${fileUrl}`);

      await this.ordersService.updatePaymentDetails(id, {
        paymentProof: fileUrl,
      });

      return {
        success: true,
        url: fileUrl,
        filename: file.filename,
        message: 'Comprobante subido exitosamente',
      };
    }

    @Patch(':id/delivery')
    async updateDelivery(
      @Param('id') id: string,
      @Body() body: {
        company: string;
        companyName: string;
        cost: number;
        estimatedDays: string;
      }
    ) {
      return this.ordersService.updateDelivery(id, body);
    }

    
  // ============================================================
  // 🔥 DELIVERY LOCAL (facilito) — actualizar fulfillment en orden existente
  // ============================================================
  @Patch(':id/local-delivery')
  async updateLocalDelivery(
    @Param('id') id: string,
    @Body() body: {
      fulfillment: 'delivery' | 'pickup';
      buyerLat?: number;
      buyerLng?: number;
      deliveryFeeLocalUsd?: number | null;
      deliveryDistanceKm?: number | null;
      deliveryEtaMinutes?: number | null;
    },
  ) {
    return this.ordersService.updateLocalDelivery(id, body);
  }


    // ============================================================
    // 🔥🔥🔥 PAGOS MIXTOS CON VUELTO 🔥🔥🔥
    // ============================================================

    @Post(':id/payment-breakdown')
    @UseGuards(AuthGuard('jwt'))
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async reportPaymentBreakdown(
      @Param('id') id: string,
      @Body() dto: CreatePaymentBreakdownDto,
      @Req() req: Request,
    ) {
      const user = (req as any).user;
      const userId = user?.id || user?.userId || user?.sub;

      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      return this.ordersService.savePaymentBreakdown(id, dto, userId);
    }

    @Patch(':id/resolve-change')
    @UseGuards(AuthGuard('jwt'))
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async resolveChange(
      @Param('id') id: string,
      @Body() dto: ResolveChangeDto,
      @Req() req: Request,
    ) {
      const user = (req as any).user;
      const userId = user?.id || user?.userId || user?.sub;

      if (!userId) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      return this.ordersService.resolveChange(id, dto, userId);
    }
  }