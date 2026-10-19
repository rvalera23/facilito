import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Delete, 
  Body, 
  Param, 
  UseInterceptors, 
  UploadedFiles, 
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { BookingsService } from './bookings.service';

@Controller(['bookings', 'api/bookings'])
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  private slugify(text: string): string {
    if (!text) return 'general';
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private extractImages(body: any, files: Express.Multer.File[], tenantSlugOrId: string = 'general') {
    const bookingSlug = this.slugify(body.customerName || 'sin-nombre');

    const newMediaUrls = files 
      ? files.map(file => `/uploads/${tenantSlugOrId}/bookings/${bookingSlug}/${file.filename}`) 
      : [];

    const rawExisting = body.existingImages || body['existingImages[]'] || body.mediaUrls || body.images;
    let existingImages: string[] = [];

    const wasFieldSent = body.existingImages !== undefined || 
                         body['existingImages[]'] !== undefined || 
                         body.mediaUrls !== undefined || 
                         body.images !== undefined;

    if (rawExisting) {
      if (Array.isArray(rawExisting)) {
        existingImages = rawExisting
          .map(item => (typeof item === 'string' ? item : item?.url || item?.path))
          .filter(Boolean);
      } else if (typeof rawExisting === 'string') {
        try {
          const parsed = JSON.parse(rawExisting);
          existingImages = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          existingImages = [rawExisting];
        }
      }
    } else if (wasFieldSent) {
      existingImages = [];
    }

    const sanitizedExisting = existingImages.map(img => img.replace(/\/uploads\/uploads\//g, '/uploads/'));

    const mediaUrls = (wasFieldSent || files?.length > 0) ? [...sanitizedExisting, ...newMediaUrls] : undefined;
    const coverImage = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

    return { mediaUrls, coverImage, wasFieldSent };
  }

  private extractFeatures(featuresBody: any) {
    if (!featuresBody) return [];
    if (typeof featuresBody === 'string') {
      try {
        const parsed = JSON.parse(featuresBody);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [featuresBody];
      }
    }
    return Array.isArray(featuresBody) ? featuresBody : [];
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const bookingSlug = (req.body?.customerName || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'bookings', bookingSlug);
          
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // El turnNumber lo asigna el servidor, nunca el cliente.
    // Si viene en el body, se descarta.
    delete body.turnNumber;

    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage } = this.extractImages(body, files, tenantId);

    let parsedMetadata = body.metadata;
    if (typeof parsedMetadata === 'string') {
      try {
        parsedMetadata = JSON.parse(parsedMetadata);
      } catch {
        parsedMetadata = {};
      }
    }

    // 🔥 Asegurar que durationMinutes sea un número
    const durationMinutes = body.durationMinutes !== undefined && body.durationMinutes !== '' 
      ? Number(body.durationMinutes) 
      : 60;

    const createDto = {
      ...body,
      tenantId,
      status: body.status || 'pending',
      durationMinutes: durationMinutes,
      mediaUrls,
      coverImage,
      metadata: parsedMetadata,
    };

    return this.bookingsService.create(createDto, files);
  }

  @Get('tenant/:tenantId')
  findAllByTenant(
    @Param('tenantId') tenantId: string,
    @Query('source') source?: string,
  ) {
    return this.bookingsService.findAllByTenant(tenantId, source);
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.bookingsService.searchGlobal(query.trim());
  }

  @Get('availability')
  getAvailability(
    @Query('tenantId') tenantId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.bookingsService.getAvailability(tenantId, serviceId, date);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; tenantId?: string },
  ) {
    if (!body?.status) {
      throw new BadRequestException('El campo "status" es requerido');
    }
    return this.bookingsService.updateStatus(id, body.tenantId || '', body.status);
  }

  @Patch(':id/confirm')
  confirmBooking(
    @Param('id') id: string,
    @Body() body: { orderId: string; tenantId?: string },
  ) {
    const tenantId = body.tenantId || '';
    const orderId = body.orderId || '';
    return this.bookingsService.confirmBooking(id, tenantId, orderId);
  }

  @Put(':id')
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const bookingSlug = (req.body?.customerName || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'bookings', bookingSlug);
          
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // El turnNumber es inmutable después de asignado.
    // Si viene en el body, se descarta silenciosamente.
    delete body.turnNumber;

    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage, wasFieldSent } = this.extractImages(body, files, tenantId);

    let parsedMetadata = body.metadata;
    if (typeof parsedMetadata === 'string') {
      try {
        parsedMetadata = JSON.parse(parsedMetadata);
      } catch {
        parsedMetadata = {};
      }
    }

    const updateDto: any = {
      tenantId,
      serviceId: body.serviceId,
      professionalId: body.professionalId,
      userId: body.userId,
      orderId: body.orderId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      bookingDate: body.bookingDate,
      startTime: body.startTime,
      endTime: body.endTime,
      durationMinutes: body.durationMinutes !== undefined && body.durationMinutes !== '' ? Number(body.durationMinutes) : undefined,
      // 🔥 REMOVIDO: status se cambia solo por PATCH :id/status con validación
      // 🔥 REMOVIDO: turnNumber es inmutable después de asignado por el servidor
      qrCode: body.qrCode,
      notes: body.notes,
      metadata: parsedMetadata,
    };

    if (wasFieldSent || (files && files.length > 0)) {
      updateDto.mediaUrls = mediaUrls || [];
      updateDto.coverImage = coverImage;
    }

    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] === undefined && key !== 'mediaUrls') {
        delete updateDto[key];
      }
    });

    return this.bookingsService.update(id, updateDto, files);
  }

  @Delete(':id/:tenantId')
  remove(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.bookingsService.remove(id, tenantId);
  }

  // 🔥 Endpoint para forzar el auto-cierre manualmente (útil para testing
  // y para que un admin pueda dispararlo desde la UI si quiere).
  // El cron lo va a llamar automáticamente cada hora, pero este endpoint
  // sirve para no esperar cuando se está probando.
  @Post('admin/auto-close')
  triggerAutoClose() {
    return this.bookingsService.autoCloseStaleBookings();
  }
}