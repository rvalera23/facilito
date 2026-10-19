// apps/backend/src/modules/products/products.controller.ts

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
import { ProductsService } from './products.service';

@Controller(['products', 'items', 'api/products', 'api/items'])
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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

    const newMediaUrls: string[] = [];

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
          const productSlug = (req.body?.name || req.body?.itemId || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'products', productSlug);
          
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

    let ivaType = body.ivaType || 'excluded';
    let ivaRate = 16;

    if (body.ivaRate !== undefined && body.ivaRate !== null && body.ivaRate !== '') {
      ivaRate = Number(body.ivaRate);
      if (isNaN(ivaRate) || ivaRate <= 0) ivaRate = 16;
    }

    if (ivaType && typeof ivaType === 'string') {
      ivaType = ivaType.toLowerCase().trim();
      if (!['included', 'excluded', 'exempt'].includes(ivaType)) {
        ivaType = 'excluded';
      }
    }

    // ✅ ✅ ✅ PROCESAR CAMPOS DE OFERTA Y DESCUENTO ✅ ✅ ✅
    // ============================================================
    const onSale = this.parseBoolean(body.onSale) ?? false;
    let discountPercentage = this.parseNumber(body.discountPercentage, 0) ?? 0;
    // Asegurar que el descuento esté entre 0 y 100
    discountPercentage = Math.min(100, Math.max(0, discountPercentage));
    // ============================================================

    // 🔥🔥🔥 NUEVOS CAMPOS DE INVENTARIO AVANZADO 🔥🔥🔥
    // ============================================================
    const cost = this.parseNumber(body.cost, undefined);
    const minStock = this.parseNumber(body.minStock, undefined);
    // ============================================================

    const createDto = {
      ...body,
      tenantId,
      itemType: body.itemType || 'product',
      durationMinutes: body.durationMinutes !== undefined && body.durationMinutes !== '' ? Number(body.durationMinutes) : undefined,
      price: body.price !== undefined ? Number(body.price) : 0,
      stock: body.stock !== undefined ? Number(body.stock) : 0,
      weight: body.weight ? Number(body.weight) : undefined,
      isActive: parsedIsActive,
      status: parsedStatus,
      mediaUrls,
      coverImage,
      features: parsedFeatures,
      ivaType: ivaType,
      ivaRate: ivaRate,
      // ✅ NUEVOS CAMPOS
      onSale: onSale,
      discountPercentage: discountPercentage,
      discountStartDate: body.discountStartDate || null,
      discountEndDate: body.discountEndDate || null,
      // 🔥🔥🔥 NUEVOS CAMPOS DE INVENTARIO AVANZADO 🔥🔥🔥
      ...(cost !== undefined && { cost }),
      ...(minStock !== undefined && { minStock }),
    };

    return this.productsService.create(createDto, files);
  }

  @Get('tenant/:tenantId')
  findAllByTenant(@Param('tenantId') tenantId: string) {
    return this.productsService.findAllByTenant(tenantId);
  }

  // 🔥 NUEVO: Obtener productos en papelera
  @Get('trash/:tenantId')
  findDeletedByTenant(@Param('tenantId') tenantId: string) {
    return this.productsService.findDeletedByTenant(tenantId);
  }

  @Get('public/tenant/:tenantId')
  findPublicByTenant(@Param('tenantId') tenantId: string) {
    return this.productsService.findPublicByTenant(tenantId);
  }

  /**
   * 🔥 NUEVO: Devuelve TODOS los productos públicos de la plataforma.
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
    return this.productsService.findAllPublic({
      category,
      search,
      sort,
      limit: this.parseNumber(limit, 24),
      offset: this.parseNumber(offset, 0),
    });
  }

    /**
   * 🔥 NUEVO: Devuelve TODOS los servicios públicos de la plataforma.
   */
  @Get('public/services')
  findAllPublicServices(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.productsService.findAllPublicServices({
      category,
      search,
      sort,
      limit: this.parseNumber(limit, 24),
      offset: this.parseNumber(offset, 0),
    });
  }

    /**
   * 🔥 NUEVO: Endpoint con pricing calculado al momento.
   * 
   * Devuelve los mismos productos que `GET /products/public/tenant/:id`
   * pero cada uno incluye un campo `_pricing` con el precio calculado
   * usando la tasa del día.
   * 
   * El endpoint viejo sigue funcionando igual. Este es opcional.
   */
  @Get('priced/tenant/:tenantId')
  findPublicPricedByTenant(@Param('tenantId') tenantId: string) {
    return this.productsService.findPublicPricedByTenant(tenantId);
  }

  @Get('tenant/:tenantId/brands')
  async getBrands(@Param('tenantId') tenantId: string) {
    return this.productsService.getBrandsByTenant(tenantId);
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.productsService.searchGlobal(query.trim());
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
    return this.productsService.update(id, body, []);
  }

  // 🔥 NUEVO: Soft delete - mover a papelera
  @Patch(':id/soft-delete/:tenantId')
  softDelete(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.productsService.softDelete(id, tenantId);
  }

  // 🔥 NUEVO: Restaurar desde papelera
  @Patch(':id/restore/:tenantId')
  restore(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.productsService.restore(id, tenantId);
  }

  // 🔥 NUEVO: Vaciar papelera
  @Delete('trash/:tenantId')
  emptyTrash(
    @Param('tenantId') tenantId: string,
  ) {
    return this.productsService.emptyTrash(tenantId);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const productSlug = (req.body?.name || req.body?.itemId || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'products', productSlug);
          
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
    let ivaType = body.ivaType || 'excluded';
    let ivaRate = 16;

    if (body.ivaRate !== undefined && body.ivaRate !== null && body.ivaRate !== '') {
      ivaRate = Number(body.ivaRate);
      if (isNaN(ivaRate) || ivaRate <= 0) ivaRate = 16;
    }

    if (ivaType && typeof ivaType === 'string') {
      ivaType = ivaType.toLowerCase().trim();
      if (!['included', 'excluded', 'exempt'].includes(ivaType)) {
        ivaType = 'excluded';
      }
    }

    console.log('📥 [Backend] UPDATE - IVA recibido:', { ivaType, ivaRate });

    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage, wasFieldSent } = this.extractImages(body, files, tenantId);
    const parsedFeatures = this.extractFeatures(body.features);

    let parsedIsActive: boolean | undefined = undefined;
    if (body.isActive !== undefined && body.isActive !== null && body.isActive !== '') {
      if (typeof body.isActive === 'boolean') {
        parsedIsActive = body.isActive;
      } else {
        const valStr = String(body.isActive).toLowerCase().trim();
        parsedIsActive = valStr === 'true' || valStr === '1' || valStr === 'on';
      }
    }

    let parsedPrices = body.prices;
    if (typeof parsedPrices === 'string') {
      try { parsedPrices = JSON.parse(parsedPrices); } catch { parsedPrices = {}; }
    }

    let parsedMetadata = body.metadata;
    if (typeof parsedMetadata === 'string') {
      try { parsedMetadata = JSON.parse(parsedMetadata); } catch { parsedMetadata = {}; }
    }

    let parsedAttributes = body.attributes;
    if (typeof parsedAttributes === 'string') {
      try { parsedAttributes = JSON.parse(parsedAttributes); } catch { parsedAttributes = {}; }
    }
    if (typeof body.attributes === 'object' && body.attributes !== null && !Array.isArray(body.attributes)) {
      parsedAttributes = body.attributes;
    }

    parsedAttributes = {
      ...parsedAttributes,
      ivaType: ivaType,
      ivaRate: ivaRate,
    };

    // ✅ ✅ ✅ PROCESAR CAMPOS DE OFERTA Y DESCUENTO (UPDATE) ✅ ✅ ✅
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

    // 🔥🔥🔥 NUEVOS CAMPOS DE INVENTARIO AVANZADO 🔥🔥🔥
    // ============================================================
    let cost: number | undefined = undefined;
    if (body.cost !== undefined && body.cost !== null && body.cost !== '') {
      const parsedCost = this.parseNumber(body.cost, undefined);
      if (parsedCost !== undefined && parsedCost >= 0) {
        cost = parsedCost;
      }
    }

    let minStock: number | undefined = undefined;
    if (body.minStock !== undefined && body.minStock !== null && body.minStock !== '') {
      const parsedMinStock = this.parseNumber(body.minStock, undefined);
      if (parsedMinStock !== undefined && parsedMinStock >= 0) {
        minStock = parsedMinStock;
      }
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
      itemType: body.itemType || 'product',
      price: this.parseNumber(body.price, this.parseNumber(parsedPrices?.VES, 0)),
      stock: this.parseNumber(body.stock, 0),
      weight: body.weight !== undefined && body.weight !== '' ? String(body.weight) : null,
      durationMinutes: this.parseNumber(body.durationMinutes),
      isActive: parsedIsActive,
      status: body.status || (parsedIsActive === undefined ? undefined : parsedIsActive ? 'published' : 'draft'),
      prices: parsedPrices,
      metadata: parsedMetadata,
      features: parsedFeatures,
      attributes: parsedAttributes,
      ivaType: ivaType,
      ivaRate: ivaRate,
      // ✅ NUEVOS CAMPOS - solo si están definidos
      ...(onSale !== undefined && { onSale }),
      ...(discountPercentage !== undefined && { discountPercentage }),
      ...(body.discountStartDate !== undefined && { discountStartDate: body.discountStartDate || null }),
      ...(body.discountEndDate !== undefined && { discountEndDate: body.discountEndDate || null }),
      // 🔥🔥🔥 NUEVOS CAMPOS DE INVENTARIO AVANZADO 🔥🔥🔥
      ...(cost !== undefined && { cost }),
      ...(minStock !== undefined && { minStock }),
            // 🔥 FASE K: canales de venta
      ...(body.availableKiosk !== undefined && {
        availableKiosk: this.parseBoolean(body.availableKiosk),
      }),
      ...(body.availableOnline !== undefined && {
        availableOnline: this.parseBoolean(body.availableOnline),
      }),
    };

    if (wasFieldSent || (files && files.length > 0)) {
      updateDto.mediaUrls = mediaUrls || [];
      updateDto.coverImage = coverImage;
    }

    console.log('📤 [Backend] Enviando a service:', {
      ivaType: updateDto.ivaType,
      ivaRate: updateDto.ivaRate,
      attributesIvaType: updateDto.attributes?.ivaType,
      onSale: updateDto.onSale,
      discountPercentage: updateDto.discountPercentage,
    });

    return this.productsService.update(id, updateDto, files);
  }

  // 🔥 Eliminar permanentemente
  @Delete(':id/:tenantId')
  remove(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.productsService.remove(id, tenantId);
  }

  // 🔥🔥🔥 NUEVO: Ajuste de stock atómico con historial 🔥🔥🔥
  @Post(':id/stock-adjustment')
  adjustStock(
    @Param('id') id: string,
    @Body() body: { delta: number; reason: string; note?: string; tenantId: string },
  ) {
    return this.productsService.adjustStock(id, body, null);
  }

  // 🔥🔥🔥 NUEVO: Historial de movimientos de stock 🔥🔥🔥
  @Get(':id/movements')
  getMovements(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getMovements(id, this.parseNumber(limit, 50) ?? 50);
  }
}
