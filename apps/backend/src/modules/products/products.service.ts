  // apps/backend/src/modules/products/products.service.ts

  import { Injectable, NotFoundException } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, DeepPartial, IsNull, Not, DataSource } from 'typeorm';
  import { ProductEntity } from './entities/product.entity';
  import { InventoryMovementEntity } from './entities/inventory-movement.entity';
  import { CurrencyService } from '../currency/currency.service';
  import { PricingService } from '../pricing/pricing.service';

  import * as fs from 'fs';
  import * as path from 'path';
  import sharp from 'sharp';

  @Injectable()
  export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly inventoryMovementRepository: Repository<InventoryMovementEntity>,
    private readonly dataSource: DataSource,
    private readonly currencyService: CurrencyService,
    private readonly pricingService: PricingService,
  ) {}

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

    private normalizeUrl(url: string, tenantId: string = 'general'): string {
      if (!url) return '';
      let clean = url.trim();

      // 1. Si es URL absoluta, extraer solo el path
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
          clean = new URL(clean).pathname;
        } catch {
          // Fallback: buscar /uploads/ o /api/uploads/
          const idx = clean.indexOf('/uploads/');
          if (idx >= 0) clean = clean.slice(idx);
          const idxApi = clean.indexOf('/api/uploads/');
          if (idxApi >= 0) clean = clean.slice(idxApi + 4); // dejar /uploads/
        }
      }

      // 2. 🔥 FIX CRÍTICO: normalizar /api/uploads/ → /uploads/
      clean = clean.replace(/\/api\/uploads\//g, '/uploads/');

      // 3. Normalizar dobles slash y /uploads/uploads/
      clean = clean.replace(/\/uploads\/uploads\//g, '/uploads/');
      clean = clean.replace(/\/+/g, '/');

      // 4. Asegurar que empiece con /uploads/
      if (!clean.startsWith('/uploads/')) {
        if (clean.startsWith('uploads/')) {
          clean = `/${clean}`;
        } else {
          clean = clean.startsWith('/') ? clean : `/${clean}`;
          if (!clean.includes('/')) {
            clean = `/uploads/${tenantId}/products/general${clean}`;
          }
        }
      }

      return clean;
    }

    /**
     * Elimina físicamente las imágenes del servidor
     */
    private async deletePhysicalImages(imageUrls: string[], tenantId: string, productSlug: string): Promise<void> {
      if (!imageUrls || imageUrls.length === 0) return;

      const uploadsBase = path.join('./public/uploads');
      const specificBase = path.join(uploadsBase, tenantId, 'products', productSlug);

      for (const url of imageUrls) {
        try {
          const fileName = url.split('/').pop();
          if (!fileName) continue;

          const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, '');
          const extensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.avif'];

          // 🔥 ESTRATEGIA 1: buscar en la carpeta del productSlug
          let found = false;
          for (const ext of extensions) {
            const filePath = path.join(specificBase, `${fileNameWithoutExt}${ext}`);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Imagen eliminada: ${filePath}`);
              found = true;
              break;
            }
          }
          if (found) continue;

          // 🔥 ESTRATEGIA 2: buscar en `general/`
          const generalBase = path.join(uploadsBase, tenantId, 'products', 'general');
          for (const ext of extensions) {
            const filePath = path.join(generalBase, `${fileNameWithoutExt}${ext}`);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Imagen eliminada (general): ${filePath}`);
              found = true;
              break;
            }
          }
          if (found) continue;

          // 🔥 ESTRATEGIA 3: búsqueda recursiva en todo uploads/ (última opción)
          const foundPath = this.findFileRecursive(uploadsBase, fileName);
          if (foundPath) {
            fs.unlinkSync(foundPath);
            console.log(`🗑️ Imagen eliminada (recursiva): ${foundPath}`);
          } else {
            console.warn(`⚠️ Imagen no encontrada para borrar: ${url}`);
          }
        } catch (error) {
          console.error(`Error al eliminar imagen ${url}:`, error);
        }
      }
    }

    /**
     * 🔥 Busca un archivo por nombre recursivamente en un directorio.
     */
    private findFileRecursive(dir: string, fileName: string): string | null {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = this.findFileRecursive(fullPath, fileName);
            if (found) return found;
          } else if (entry.name === fileName) {
            return fullPath;
          }
        }
      } catch (e) {
        // ignorar errores de permisos
      }
      return null;
    }

    private async getCurrentRates() {
      const result = await this.currencyService.getRates();
      if (!result.success) {
        throw new Error('No se pudieron obtener las tasas del BCV');
      }
      return result.rates;
    }

    async create(createProductDto: any, files?: Array<Express.Multer.File>): Promise<ProductEntity> {
      const tenantId = createProductDto.tenantId || 'general';
      const productSlug = this.slugify(createProductDto.name || createProductDto.itemId || 'sin-nombre');

      let isActive = true;
      if (createProductDto.status !== undefined) {
        isActive = createProductDto.status === 'published';
      } else if (createProductDto.isActive !== undefined) {
        isActive = String(createProductDto.isActive) === 'true' || createProductDto.isActive === 1;
      }

      const mediaUrls: string[] = [];
      if (files && files.length > 0) {
        const uploadDir = path.join('./public/uploads', tenantId, 'products', productSlug);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        for (const file of files) {
          const filePath = file.path;
          const dir = path.dirname(filePath);
          const ext = path.extname(filePath);
          const basename = path.basename(filePath, ext);
          const webpPath = path.join(dir, `${basename}.webp`);
          
          try {
            await sharp(filePath)
              .resize(1200, 1200, { 
                fit: 'inside',
                withoutEnlargement: true 
              })
              .webp({ quality: 80 })
              .toFile(webpPath);
            
            fs.unlinkSync(filePath);
            mediaUrls.push(`/uploads/${tenantId}/products/${productSlug}/${basename}.webp`);
          } catch (error) {
            console.error(`Error optimizando imagen: ${file.filename}`, error);
            mediaUrls.push(`/uploads/${tenantId}/products/${productSlug}/${file.filename}`);
          }
        }
      }

      const incomingMedia = createProductDto.mediaUrls || [];
      const normalizedMedia = Array.isArray(incomingMedia) 
        ? incomingMedia.map(u => this.normalizeUrl(u, tenantId)).filter(Boolean)
        : [];

  // SOLO guardar WebP (ya que la JPG original se eliminó con fs.unlinkSync)
  const finalMediaUrls = mediaUrls.length > 0 
    ? mediaUrls.filter(url => url.endsWith('.webp')) 
    : normalizedMedia.filter(url => url.endsWith('.webp'));
      let parsedAttributes: Record<string, any> = {};
      const rawMeta = createProductDto.attributes || createProductDto.metadata;
      if (rawMeta) {
        if (typeof rawMeta === 'string') {
          try { parsedAttributes = JSON.parse(rawMeta); } catch { parsedAttributes = {}; }
        } else if (typeof rawMeta === 'object') {
          parsedAttributes = { ...rawMeta };
        }
      }

      if (createProductDto.prices) {
        let incomingPrices = createProductDto.prices;
        if (typeof incomingPrices === 'string') {
          try { incomingPrices = JSON.parse(incomingPrices); } catch {}
        }

        const rates = await this.getCurrentRates();
        
        const ves = Number(incomingPrices.VES || 0);
        const usd = Number(incomingPrices.USD || (rates.USD > 0 ? ves / rates.USD : 0));
        const eur = Number(incomingPrices.EUR || (usd > 0 ? usd / 1.1674 : 0));
        const crypto = Number(incomingPrices.CRYPTO || (rates.USD > 0 ? ves / rates.USD : 0));

        const finalPrices = {
          VES: Math.round(ves * 100) / 100,
          USD: Math.round(usd * 100) / 100,
          EUR: Math.round(eur * 100) / 100,
          CRYPTO: Math.round(crypto * 100) / 100,
        };

        parsedAttributes.prices = finalPrices;
        parsedAttributes.usdReference = Math.round(usd * 100) / 100;
      }

      const product = this.productRepository.create({
        ...createProductDto,
        itemType: createProductDto.itemType || 'product',
        durationMinutes: createProductDto.durationMinutes ? Number(createProductDto.durationMinutes) : null,
        isActive,
        status: createProductDto.status || (isActive ? 'published' : 'draft'),
        mediaUrls: finalMediaUrls,
        coverImage: finalMediaUrls.length > 0 ? finalMediaUrls[0] : null,
        weight: createProductDto.weight !== undefined && createProductDto.weight !== null && createProductDto.weight !== '' ? String(createProductDto.weight) : null,
        ivaType: createProductDto.ivaType || 'excluded',
        ivaRate: createProductDto.ivaRate || 16,
        attributes: parsedAttributes,
      } as DeepPartial<ProductEntity>);

      return await this.productRepository.save(product);
    }

    async findAllByTenant(tenantId: string): Promise<ProductEntity[]> {
      return await this.productRepository.find({
        where: { 
          tenantId,
          deletedAt: IsNull()
        },
        order: { createdAt: 'DESC' },
      });
    }

        /**
     * 🔥 NUEVO: Devuelve TODOS los productos públicos de la plataforma,
     * con filtros opcionales por categoría y búsqueda.
     *
     * Solo devuelve productos:
     * - activos (isActive = true)
     * - publicados (status = 'published')
     * - que no estén eliminados (deletedAt IS NULL)
     * - de tiendas cuyo modelType sea distinto de 'service'
     *
     * Retorna también la lista única de categorías para armar filtros.
     */
    async findAllPublic(options: {
      category?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }): Promise<{
      items: ProductEntity[];
      total: number;
      categories: Array<{ name: string; count: number }>;
    }> {
      const { category, search, sort, limit = 24, offset = 0 } = options;

      const qb = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.tenant', 'tenant')
        .where('product.isActive = :isActive', { isActive: true })
        .andWhere('product.status = :status', { status: 'published' })
        .andWhere('product.itemType = :itemType', { itemType: 'product' })
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.availableOnline = :availableOnline', { availableOnline: true })
        .andWhere("(tenant.modelType IS NULL OR tenant.modelType != :service)", {
          service: 'service',
        });

      if (category && category !== 'todos') {
        qb.andWhere('product.category = :category', { category });
      }

      if (search && search.trim()) {
        qb.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search)',
          { search: `%${search.trim()}%` },
        );
      }

      // 🔥 ORDEN
      switch (sort) {
        case 'price_asc':
          qb.orderBy('product.price', 'ASC');
          break;
        case 'price_desc':
          qb.orderBy('product.price', 'DESC');
          break;
        case 'name_asc':
          qb.orderBy('product.name', 'ASC');
          break;
        case 'discount':
          qb.orderBy('product.discountPercentage', 'DESC');
          break;
        case 'recent':
        default:
          qb.orderBy('product.createdAt', 'DESC');
      }

      qb.take(limit).skip(offset);

      const [items, total] = await qb.getManyAndCount();

      // 🔥 Categorías únicas CON contador (sin filtros de categoría/búsqueda)
      const categoryRows = await this.productRepository
        .createQueryBuilder('product')
        .leftJoin('product.tenant', 'tenant')
        .select('product.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('product.isActive = :isActive', { isActive: true })
        .andWhere('product.status = :status', { status: 'published' })
        .andWhere('product.itemType = :itemType', { itemType: 'product' })
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.availableOnline = :availableOnline', { availableOnline: true })
        .andWhere("(tenant.modelType IS NULL OR tenant.modelType != :service)", {
          service: 'service',
        })
        .andWhere('product.category IS NOT NULL')
        .groupBy('product.category')
        .orderBy('product.category', 'ASC')
        .getRawMany();

      const categories = categoryRows
        .map((r: any) => ({
          name: r.category,
          count: Number(r.count) || 0,
        }))
        .filter((c: any) => c.name && typeof c.name === 'string' && c.name.trim());

      return { items, total, categories };
    }

    /**
     * 🔥 NUEVO: Devuelve TODOS los servicios públicos de la plataforma
     * (ítems con itemType = 'service'), filtrados por categoría / búsqueda.
     *
     * Solo devuelve:
     * - activos (isActive = true)
     * - publicados (status = 'published')
     * - no eliminados (deletedAt IS NULL)
     * - de tiendas con modelType = 'service'
     */
    async findAllPublicServices(options: {
      category?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }): Promise<{
      items: ProductEntity[];
      total: number;
      categories: Array<{ name: string; count: number }>;
    }> {
      const { category, search, sort, limit = 24, offset = 0 } = options;

      const qb = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.tenant', 'tenant')
        .where('product.isActive = :isActive', { isActive: true })
        .andWhere('product.status = :status', { status: 'published' })
        .andWhere('product.deletedAt IS NULL')
        .andWhere('product.availableOnline = :availableOnline', { availableOnline: true })
        .andWhere('tenant.modelType = :modelType', { modelType: 'service' });

      if (category && category !== 'todos') {
        qb.andWhere('product.category = :category', { category });
      }

      if (search && search.trim()) {
        qb.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search)',
          { search: `%${search.trim()}%` },
        );
      }

      switch (sort) {
        case 'price_asc':
          qb.orderBy('product.price', 'ASC');
          break;
        case 'price_desc':
          qb.orderBy('product.price', 'DESC');
          break;
        case 'name_asc':
          qb.orderBy('product.name', 'ASC');
          break;
        case 'discount':
          qb.orderBy('product.discountPercentage', 'DESC');
          break;
        case 'recent':
        default:
          qb.orderBy('product.createdAt', 'DESC');
      }

      qb.take(limit).skip(offset);
      const [items, total] = await qb.getManyAndCount();

      const categoryRows = await this.productRepository
        .createQueryBuilder('product')
        .leftJoin('product.tenant', 'tenant')
        .select('product.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('product.isActive = :isActive', { isActive: true })
        .andWhere('product.status = :status', { status: 'published' })
        .andWhere('product.availableOnline = :availableOnline', { availableOnline: true })
        .andWhere('product.deletedAt IS NULL')
        .andWhere('tenant.modelType = :modelType', { modelType: 'service' })
        .andWhere('product.category IS NOT NULL')
        .groupBy('product.category')
        .orderBy('product.category', 'ASC')
        .getRawMany();

      const categories = categoryRows
        .map((r: any) => ({
          name: r.category,
          count: Number(r.count) || 0,
        }))
        .filter((c: any) => c.name && typeof c.name === 'string' && c.name.trim());

      return { items, total, categories };
    }

    async findDeletedByTenant(tenantId: string): Promise<ProductEntity[]> {
      return await this.productRepository.find({
        where: { 
          tenantId,
          deletedAt: Not(IsNull())
        },
        order: { deletedAt: 'DESC' },
      });
    }

    async findPublicByTenant(tenantId: string): Promise<ProductEntity[]> {
      return await this.productRepository.find({
        where: { 
          tenantId, 
          status: 'published',
          deletedAt: IsNull(),
          availableOnline: true
        },
        order: { createdAt: 'DESC' },
      });
    }

        /**
     * 🔥 NUEVO: Devuelve los productos públicos de un tenant
     * CON el pricing calculado al momento.
     * 
     * No reemplaza a findPublicByTenant. Es un endpoint alternativo
     * que incluye un campo `_pricing` en cada producto.
     * 
     * Si el pricing de un producto falla, se devuelve igual pero sin `_pricing`.
     */
    async findPublicPricedByTenant(tenantId: string): Promise<any[]> {
      const products = await this.findPublicByTenant(tenantId);

      if (!products || products.length === 0) {
        return [];
      }

      // Obtener tasas del día una sola vez
      let rates: { USD: number; EUR: number; CRYPTO: number; IVA: number } | null = null;

      try {
        const ratesResult = await this.currencyService.getRates();
        if (ratesResult && ratesResult.success && ratesResult.rates) {
          rates = {
            USD: Number(ratesResult.rates.USD),
            EUR: Number(ratesResult.rates.EUR) || 0,
            CRYPTO: Number(ratesResult.rates.CRYPTO || ratesResult.rates.USD) || Number(ratesResult.rates.USD),
            IVA: Number(ratesResult.rates.IVA || 16),
          };
        }
      } catch (error) {
        console.error('❌ [ProductsService] No se pudieron obtener las tasas:', error);
      }

      // Si no hay tasas, devolver los productos sin pricing
      if (!rates || rates.USD <= 0) {
        return products;
      }

      // Calcular el pricing de cada producto
      const pricedProducts = products.map((product) => {
        try {
          const pricing = this.pricingService.computeProductPricing(
            product,
            1, // cantidad 1 para el catálogo
            rates!,
            'BCV via DolarApi',
          );

          return {
            ...product,
            _pricing: pricing || null,
          };
        } catch (error) {
          console.warn(`⚠️ [ProductsService] No se pudo calcular pricing para ${product.id}:`, error);
          return {
            ...product,
            _pricing: null,
          };
        }
      });

      return pricedProducts;
    }

    async findOne(id: string): Promise<ProductEntity> {
      const product = await this.productRepository.findOne({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      return product;
    }

    async getBrandsByTenant(tenantId: string): Promise<string[]> {
      const result = await this.productRepository
        .createQueryBuilder('product')
        .select('DISTINCT product.brand', 'brand')
        .where('product.tenantId = :tenantId', { tenantId })
        .andWhere('product.brand IS NOT NULL')
        .andWhere('product.brand != :empty', { empty: '' })
        .andWhere('product.deletedAt IS NULL')
        .orderBy('product.brand', 'ASC')
        .getRawMany();
      
      return result.map(item => item.brand).filter(Boolean);
    }

    async searchGlobal(query: string): Promise<ProductEntity[]> {
      return await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.tenant', 'tenant')
        .where('product.name ILIKE :query', { query: `%${query}%` })
        .orWhere('product.description ILIKE :query', { query: `%${query}%` })
        .orWhere('product.category ILIKE :query', { query: `%${query}%` })
        .orWhere('product.brand ILIKE :query', { query: `%${query}%` })
        .andWhere('product.isActive = true')
        .andWhere('product.status = :status', { status: 'published' })
        .andWhere('product.deletedAt IS NULL')
        .take(10)
        .getMany();
    }

    /**
     * ACTUALIZAR PRODUCTO
     * 🔥🔥🔥 CORREGIDO: El precio en USD ahora es FIJO y NO se recalcula desde VES
     * El USD solo se actualiza si el DTO envía un número positivo explícito
     * El VES se recalcula automáticamente a partir del USD fijo × tasa actual
     */
  async update(id: string, updateProductDto: any, files?: Array<Express.Multer.File>): Promise<ProductEntity> {
    // ✅ PRIMERO: Buscar el producto
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // ✅ AHORA SÍ, usar product
    const tenantId = updateProductDto.tenantId || product.tenantId || 'general';
    const productSlug = this.slugify(updateProductDto.name || product.name || product.itemId || 'sin-nombre');

    // ✅ GUARDAR IMÁGENES ANTIGUAS
    const oldImages = product.mediaUrls || [];

    const { prices, metadata, features, existingImages, files: fList, published, ivaType, ivaRate, ...safeData } = updateProductDto;

    const existingAttributes = product.attributes || {};
    
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try { parsedMetadata = JSON.parse(metadata); } catch { parsedMetadata = {}; }
    }

    let parsedPrices = prices;
    if (typeof prices === 'string') {
      try { parsedPrices = JSON.parse(prices); } catch { parsedPrices = {}; }
    }

    const incomingAttributes = safeData.attributes || {};
    const existingPrices = existingAttributes.prices || {};
    const dtoPrices = parsedPrices || incomingAttributes.prices || {};

    let rates: { USD: number; EUR: number };
    try {
      rates = await this.getCurrentRates();
    } catch (error) {
      console.error('No se pudieron obtener tasas para actualizar el producto:', error);
      rates = { USD: 0, EUR: 0 };
    }

    // ============================================================
    // 🔥🔥🔥 CAMBIO PRINCIPAL: PROCESAMIENTO DE PRECIOS 🔥🔥🔥
    // ============================================================

    // 1. Obtener el USD actual (fijo) del producto
    const existingUsd = existingPrices.USD ?? 0;

    // 2. Determinar el nuevo USD:
    let newUsd: number;
    const dtoUsd = dtoPrices?.USD;
    if (dtoUsd !== undefined && dtoUsd !== null && !isNaN(Number(dtoUsd)) && Number(dtoUsd) > 0) {
      newUsd = Number(dtoUsd);
    } else {
      newUsd = existingUsd;
    }

    // 3. Calcular el VES (y otras monedas) A PARTIR del USD fijo
    const vesFromUsd = newUsd * rates.USD;
    const eurFromUsd = newUsd / 1.1674;
    const cryptoFromUsd = newUsd;

    const finalPrices = {
      VES: rates.USD > 0
        ? Math.round(vesFromUsd * 100) / 100
        : Number(dtoPrices?.VES ?? existingPrices.VES ?? product.price ?? 0),
      USD: Math.round(newUsd * 100) / 100,
      EUR: rates.USD > 0
        ? Math.round(eurFromUsd * 100) / 100
        : Number(dtoPrices?.EUR ?? existingPrices.EUR ?? 0),
      CRYPTO: rates.USD > 0
        ? Math.round(cryptoFromUsd * 100) / 100
        : Number(dtoPrices?.CRYPTO ?? existingPrices.CRYPTO ?? newUsd),
    };

    // ============================================================
    // FIN DEL CAMBIO
    // ============================================================

    let finalFeatures = features;
    if (typeof features === 'string') {
      try { finalFeatures = JSON.parse(features); } catch { finalFeatures = []; }
    }

    const finalAttributes = {
      ...existingAttributes,
      ...(parsedMetadata || {}),
      ...incomingAttributes,
      prices: finalPrices,
      usdReference: Math.round(newUsd * 100) / 100,
      ivaType: ivaType || updateProductDto?.ivaType || 'excluded',
      ivaRate: ivaRate || updateProductDto?.ivaRate || 16,
    };

    let updatedMediaUrls: string[] = [];
    const rawExisting = existingImages || updateProductDto['existingImages[]'];
    const hasImageUpdate = rawExisting !== undefined ||
      updateProductDto.mediaUrls !== undefined ||
      Boolean(files?.length);
    
    if (rawExisting !== undefined && rawExisting !== null) {
      const existingArray = Array.isArray(rawExisting) ? rawExisting : [rawExisting];
      updatedMediaUrls = existingArray
        .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
        .filter(Boolean);
    } else if (updateProductDto.mediaUrls !== undefined && updateProductDto.mediaUrls !== null) {
      const rawImages = updateProductDto.mediaUrls;
      const rawArray = Array.isArray(rawImages) ? rawImages : [rawImages];
      updatedMediaUrls = rawArray
        .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
        .filter(Boolean);
    } else {
      // ✅ FIX: también normalizar las imágenes existentes del producto
      updatedMediaUrls = (product.mediaUrls || [])
        .map((u: string) => this.normalizeUrl(u, tenantId))
        .filter(Boolean);
    }

    if (files && files.length > 0) {
      const uploadDir = path.join('./public/uploads', tenantId, 'products', productSlug);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      
      for (const file of files) {
        const filePath = file.path;
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const basename = path.basename(filePath, ext);
        const webpPath = path.join(dir, `${basename}.webp`);
        
        try {
          await sharp(filePath)
            .resize(1200, 1200, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .webp({ quality: 80 })
            .toFile(webpPath);
          
          fs.unlinkSync(filePath);
          updatedMediaUrls.push(`/uploads/${tenantId}/products/${productSlug}/${basename}.webp`);
        } catch (error) {
          console.error(`Error optimizando imagen: ${file.filename}`, error);
          updatedMediaUrls.push(`/uploads/${tenantId}/products/${productSlug}/${file.filename}`);
        }
      }
    }

    const resolvedPrice = finalPrices.VES || Number(safeData.price || product.price || 0);

    let isActive = product.isActive;
    let status = product.status;
    
    if (safeData.isActive !== undefined) {
      isActive = String(safeData.isActive) === 'true' || safeData.isActive === 1;
      status = isActive ? 'published' : 'draft';
    } else if (safeData.status) {
      status = safeData.status;
      isActive = status === 'published';
    }

    const dataToSave: any = {
      ...safeData,
      price: resolvedPrice,
      isActive,
      status,
      features: finalFeatures,
      prices: finalPrices,
      ivaType: ivaType || updateProductDto?.ivaType || 'excluded',
      ivaRate: ivaRate || updateProductDto?.ivaRate || 16,
      attributes: finalAttributes,
    };

    if (hasImageUpdate) {
      dataToSave.mediaUrls = updatedMediaUrls.length > 0 ? updatedMediaUrls : null;
      dataToSave.coverImage = updatedMediaUrls.length > 0 ? updatedMediaUrls[0] : null;
    }

    // 🔥🔥🔥 ELIMINAR IMÁGENES ANTIGUAS QUE YA NO SE USAN 🔥🔥🔥
    // ✅ FIX: normalizar y comparar por NOMBRE DE ARCHIVO (evita borrar imágenes válidas
    //    cuando una lista tiene /api/uploads/ y la otra /uploads/, o cuando hay http://)
    const getImageKey = (url: string): string => {
      if (!url || typeof url !== 'string') return '';
      let clean = url.trim().split('?')[0].split('#')[0];
      clean = clean.replace(/\/+/g, '/');
      return clean.split('/').pop() || clean;
    };

    const usedImageKeys = new Set(
      updatedMediaUrls.map(getImageKey).filter(Boolean)
    );

    if (oldImages.length > 0 && updatedMediaUrls.length > 0) {
      const imagesToDelete = oldImages.filter((oldUrl: string) => {
        const oldKey = getImageKey(oldUrl);
        return oldKey && !usedImageKeys.has(oldKey);
      });

      if (imagesToDelete.length > 0) {
        console.log(`🗑️ Eliminando ${imagesToDelete.length} imágenes antiguas...`);
        await this.deletePhysicalImages(imagesToDelete, tenantId, productSlug);
      }
    } else if (oldImages.length > 0 && updatedMediaUrls.length === 0) {
      console.log(`🗑️ Eliminando TODAS las imágenes (${oldImages.length})...`);
      await this.deletePhysicalImages(oldImages, tenantId, productSlug);
    }

    Object.assign(product, dataToSave);
    
    delete (product as any).prices;
    delete (product as any).metadata;

    return await this.productRepository.save(product);
  }

    async softDelete(id: string, tenantId: string): Promise<ProductEntity> {
      const product = await this.productRepository.findOne({ where: { id, tenantId } });
      if (!product) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      product.deletedAt = new Date();
      return await this.productRepository.save(product);
    }

    async restore(id: string, tenantId: string): Promise<ProductEntity> {
      const product = await this.productRepository.findOne({ where: { id, tenantId } });
      if (!product) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      product.deletedAt = null;
      return await this.productRepository.save(product);
    }

    async emptyTrash(tenantId: string): Promise<{ count: number }> {
      const products = await this.productRepository.find({
        where: { 
          tenantId,
          deletedAt: Not(IsNull())
        }
      });

          // 🔥 ELIMINAR IMÁGENES DE TODOS LOS PRODUCTOS EN PAPELERA
      for (const product of products) {
        if (product.mediaUrls && product.mediaUrls.length > 0) {
          const productSlug = this.slugify(product.name || product.itemId || 'sin-nombre');
          console.log(`🗑️ Eliminando ${product.mediaUrls.length} imágenes de ${product.name}...`);
          await this.deletePhysicalImages(product.mediaUrls, tenantId, productSlug);
        }
      }

      const count = products.length;
      if (count > 0) {
        await this.productRepository.remove(products);
      }
      return { count };
    }

    async remove(id: string, tenantId: string): Promise<void> {
      const product = await this.productRepository.findOne({ where: { id, tenantId } });
      if (!product) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }

          // 🔥 ELIMINAR IMÁGENES FÍSICAMENTE ANTES DE ELIMINAR EL PRODUCTO
      if (product.mediaUrls && product.mediaUrls.length > 0) {
        const productSlug = this.slugify(product.name || product.itemId || 'sin-nombre');
        console.log(`🗑️ Eliminando ${product.mediaUrls.length} imágenes del producto ${product.name}...`);
        await this.deletePhysicalImages(product.mediaUrls, tenantId, productSlug);
      }

      await this.productRepository.remove(product);
    }

    // 🔥🔥🔥 NUEVO: Ajuste de stock atómico con historial 🔥🔥🔥
    /**
     * Ajusta el stock de un producto de forma atómica y registra el movimiento.
     * 
     * - Bloquea la fila del producto (transacción) para evitar race conditions.
     * - Calcula previousQty y newQty (nunca permite negativos).
     * - Actualiza `stock` y `lastStockUpdate` del producto.
     * - Inserta un registro en `inventory_movements`.
     * 
     * @param productId UUID del producto
     * @param dto { delta, reason, note?, tenantId }
     * @param userId UUID del usuario que hace el ajuste (opcional)
     */
    async adjustStock(
      productId: string,
      dto: { delta: number; reason: string; note?: string; tenantId: string },
      userId: string | null = null,
    ): Promise<{ product: ProductEntity; movement: InventoryMovementEntity }> {
      const delta = Number(dto.delta);
      if (!Number.isFinite(delta) || delta === 0) {
        throw new Error('El delta debe ser un número distinto de 0');
      }

      const reason = (dto.reason || 'adjustment').trim();
      const note = dto.note ? String(dto.note).trim() : null;

      return await this.dataSource.transaction(async (manager) => {
        // 🔒 Bloqueo pesimista para evitar race conditions
        const product = await manager
          .createQueryBuilder(ProductEntity, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: productId })
          .getOne();

        if (!product) {
          throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
        }

        const previousQty = Number(product.stock ?? 0);
        const newQty = Math.max(0, previousQty + delta);

        // Actualizar producto
        product.stock = newQty;
        product.lastStockUpdate = new Date();
        await manager.save(ProductEntity, product);

        // Registrar movimiento
        const movement = manager.create(InventoryMovementEntity, {
          productId: product.id,
          tenantId: dto.tenantId || product.tenantId,
          delta: newQty - previousQty,
          previousQty,
          newQty,
          reason,
          note,
          userId,
        });
        const savedMovement = await manager.save(InventoryMovementEntity, movement);

        return { product, movement: savedMovement };
      });
    }

    // 🔥🔥🔥 NUEVO: Historial de movimientos de stock 🔥🔥🔥
    /**
     * Devuelve el historial de movimientos de un producto, ordenado por fecha DESC.
     * 
     * @param productId UUID del producto
     * @param limit Cantidad máxima de registros (default 50, max 200)
     */
    async getMovements(
      productId: string,
      limit: number = 50,
    ): Promise<InventoryMovementEntity[]> {
      const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

      return await this.inventoryMovementRepository.find({
        where: { productId },
        order: { createdAt: 'DESC' },
        take: safeLimit,
      });
    }
  }