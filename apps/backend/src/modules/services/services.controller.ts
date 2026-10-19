// ARCHIVO: apps/backend/src/modules/services/services.controller.ts

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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { ServicesService } from './services.service';

@Controller(['services', 'api/services'])
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

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
    const serviceSlug = this.slugify(body.name || body.itemId || 'sin-nombre');

    const newMediaUrls = files 
      ? files.map(file => `/uploads/${tenantSlugOrId}/services/${serviceSlug}/${file.filename}`) 
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

  private extractArray(body: any, field: string): string[] | undefined {
    const value = body[field] ?? body[`${field}[]`];
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed];
      } catch {
        return value ? [value] : [];
      }
    }
    return [];
  }

  private parseNumber(value: any, fallback?: number): number | undefined {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase().trim();
    if (str === 'true' || str === '1' || str === 'on') return true;
    if (str === 'false' || str === '0' || str === 'off') return false;
    return undefined;
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const serviceSlug = (req.body?.name || req.body?.itemId || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'services', serviceSlug);
          
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
    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage } = this.extractImages(body, files, tenantId);
    const parsedFeatures = this.extractFeatures(body.features ?? body['features[]']);
    const certifications = this.extractArray(body, 'certifications');
    const materials = this.extractArray(body, 'materials');
    const clientRequirements = this.extractArray(body, 'clientRequirements');

    let parsedIsActive = true;
    if (body.isActive !== undefined && body.isActive !== null && body.isActive !== '') {
      if (typeof body.isActive === 'boolean') {
        parsedIsActive = body.isActive;
      } else {
        parsedIsActive = String(body.isActive).toLowerCase() === 'true' || String(body.isActive) === '1';
      }
    }

    let parsedStatus = body.status;
    if (!parsedStatus) {
      parsedStatus = parsedIsActive ? 'published' : 'draft';
    } else {
      parsedIsActive = parsedStatus === 'published';
    }

    // 🔥🔥🔥 PROCESAR OFERTA Y DESCUENTO 🔥🔥🔥
    // ============================================================
    const onSale = this.parseBoolean(body.onSale) ?? false;
    let discountPercentage = this.parseNumber(body.discountPercentage, 0) ?? 0;
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    // ============================================================

    const createDto = {
      ...body,
      tenantId,
      itemType: body.itemType || 'service',
      durationMinutes: body.durationMinutes !== undefined && body.durationMinutes !== '' ? Number(body.durationMinutes) : 60,
      price: body.price !== undefined ? Number(body.price) : 0,
      isActive: parsedIsActive,
      status: parsedStatus,
      mediaUrls,
      coverImage,
      features: parsedFeatures,
      // 🔥 NUEVOS CAMPOS
      onSale: onSale,
      discountPercentage: discountPercentage,
      discountStartDate: body.discountStartDate || null,
      discountEndDate: body.discountEndDate || null,
    };

    return this.servicesService.create(createDto);
  }

  @Get('tenant/:tenantId')
  findAllByTenant(@Param('tenantId') tenantId: string) {
    return this.servicesService.findAllByTenant(tenantId);
  }

    /**
   * 🔥 NUEVO: Endpoint con pricing calculado al momento para servicios.
   * 
   * Devuelve los mismos servicios que `GET /services/tenant/:id`
   * pero cada uno incluye un campo `_pricing` con el precio calculado
   * usando la tasa del día.
   * 
   * Los servicios siempre son `ivaType: 'exempt'` (no tienen IVA).
   * El `_pricing` aplica descuentos si el servicio tiene `onSale: true`.
   */
  @Get('priced/tenant/:tenantId')
  findAllPricedByTenant(@Param('tenantId') tenantId: string) {
    return this.servicesService.findAllPricedByTenant(tenantId);
  }


  
  /**
   * 🔥 NUEVO: Devuelve TODOS los servicios públicos de la plataforma.
   * Filtros opcionales por categoría, búsqueda y orden.
   */
  @Get('public/all')
  findAllPublic(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parseNumber = (v: any, fallback: number): number => {
      if (v === undefined || v === null || v === '') return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    return this.servicesService.findAllPublic({
      category,
      search,
      sort,
      limit: parseNumber(limit, 24),
      offset: parseNumber(offset, 0),
    });
  }
  
  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.servicesService.searchGlobal(query.trim());
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: {
      isActive?: boolean;
      status?: string;
      tenantId?: string;
      availableKiosk?: boolean;
      availableOnline?: boolean;
    },
  ) {
    return this.servicesService.update(id, body, []);
  }

  // 🔥 CORREGIDO: IGUAL QUE PRODUCTS
  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const serviceSlug = (req.body?.name || req.body?.itemId || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'services', serviceSlug);
          
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
    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage, wasFieldSent } = this.extractImages(body, files, tenantId);
    const parsedFeatures = this.extractFeatures(body.features ?? body['features[]']);
    const certifications = this.extractArray(body, 'certifications');
    const materials = this.extractArray(body, 'materials');
    const clientRequirements = this.extractArray(body, 'clientRequirements');

    let parsedIsActive: boolean | undefined = undefined;
    if (body.isActive !== undefined && body.isActive !== null && body.isActive !== '') {
      if (typeof body.isActive === 'boolean') {
        parsedIsActive = body.isActive;
      } else {
        const valStr = String(body.isActive).toLowerCase().trim();
        parsedIsActive = valStr === 'true' || valStr === '1' || valStr === 'on';
      }
    }

    // 🔥 NUEVO: Procesar prices (IGUAL QUE PRODUCTS)
    let parsedPrices = body.prices;
    if (typeof parsedPrices === 'string') {
      try { parsedPrices = JSON.parse(parsedPrices); } catch { parsedPrices = {}; }
    }

    // 🔥 NUEVO: Procesar metadata (IGUAL QUE PRODUCTS)
    let parsedMetadata = body.metadata;
    if (typeof parsedMetadata === 'string') {
      try { parsedMetadata = JSON.parse(parsedMetadata); } catch { parsedMetadata = {}; }
    }

    // 🔥 NUEVO: Procesar attributes (IGUAL QUE PRODUCTS)
    let parsedAttributes = body.attributes;
    if (typeof parsedAttributes === 'string') {
      try { parsedAttributes = JSON.parse(parsedAttributes); } catch { parsedAttributes = {}; }
    }
    if (typeof body.attributes === 'object' && body.attributes !== null && !Array.isArray(body.attributes)) {
      parsedAttributes = body.attributes;
    }

    // 🔥🔥🔥 PROCESAR OFERTA Y DESCUENTO (UPDATE) 🔥🔥🔥
    // ============================================================
    let onSale: boolean | undefined = undefined;
    if (body.onSale !== undefined && body.onSale !== null && body.onSale !== '') {
      onSale = this.parseBoolean(body.onSale) ?? false;
    }

    let discountPercentage: number | undefined = undefined;
    if (body.discountPercentage !== undefined && body.discountPercentage !== null && body.discountPercentage !== '') {
      discountPercentage = this.parseNumber(body.discountPercentage, 0) ?? 0;
      discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    }
    // ============================================================

    const updateDto: any = {
      tenantId,
      name: body.name,
      description: body.description,
      itemId: body.itemId || body.sku || body.code,
      sku: body.sku || body.itemId || body.code,
      code: body.code || body.itemId || body.sku,
      category: body.category,
      brand: body.brand,
      condition: body.condition,
      warranty: body.warranty,
      dimensions: body.dimensions,
      itemType: body.itemType || 'service',
      price: this.parseNumber(body.price, this.parseNumber(parsedPrices?.VES, 0)),
      maxCapacity: this.parseNumber(body.maxCapacity),
      minAdvanceBooking: this.parseNumber(body.minAdvanceBooking),
      durationMinutes: this.parseNumber(body.durationMinutes, 60),
      serviceModality: body.serviceModality,
      requiresBooking: body.requiresBooking,
      // 🔥 FASE K: canales de venta
      availableKiosk: body.availableKiosk,
      availableOnline: body.availableOnline,
      includes: body.includes,
      notIncludes: body.notIncludes,
      cancellationPolicy: body.cancellationPolicy,
      availability: body.availability,
      isActive: parsedIsActive,
      status: body.status || (parsedIsActive === undefined ? undefined : parsedIsActive ? 'published' : 'draft'),
      prices: parsedPrices,
      metadata: parsedMetadata,
      features: parsedFeatures,
      certifications,
      materials,
      clientRequirements,
      attributes: parsedAttributes,
      professionals: body.professionals,
      // 🔥 NUEVOS CAMPOS - solo si están definidos
      ...(onSale !== undefined && { onSale }),
      ...(discountPercentage !== undefined && { discountPercentage }),
      ...(body.discountStartDate !== undefined && { discountStartDate: body.discountStartDate || null }),
      ...(body.discountEndDate !== undefined && { discountEndDate: body.discountEndDate || null }),
    };

    if (wasFieldSent || (files && files.length > 0)) {
      updateDto.mediaUrls = mediaUrls || [];
      updateDto.coverImage = coverImage;
    }

    // 🔥 NUEVO: Eliminar campos undefined (IGUAL QUE PRODUCTS)
    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] === undefined && key !== 'mediaUrls') {
        delete updateDto[key];
      }
    });

    return this.servicesService.update(id, updateDto, files);
  }

  @Delete(':id/:tenantId')
  remove(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.servicesService.remove(id, tenantId);
  }
}