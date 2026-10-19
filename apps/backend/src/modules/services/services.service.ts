  // apps/backend/src/modules/services/services.service.ts

  import { Injectable, NotFoundException } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, DeepPartial } from 'typeorm';
  import { ServiceEntity } from './entities/service.entity';
  import { CurrencyService } from '../currency/currency.service';
  import { PricingService } from '../pricing/pricing.service';
  import * as fs from 'fs';
  import * as path from 'path';

  @Injectable()
  export class ServicesService {
    constructor(
      @InjectRepository(ServiceEntity)
      private readonly serviceRepository: Repository<ServiceEntity>,
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
      if (clean.startsWith('http')) {
        try {
          clean = new URL(clean).pathname;
        } catch {}
      }
      clean = clean.replace(/\/uploads\/uploads\//g, '/uploads/');
      if (!clean.startsWith('/uploads/')) {
        if (clean.startsWith('uploads/')) {
          clean = `/${clean}`;
        } else {
          clean = clean.startsWith('/') ? clean : `/${clean}`;
          if (!clean.includes('/')) {
            clean = `/uploads/${tenantId}/services/general${clean}`;
          }
        }
      }
      return clean;
    }

    private async getCurrentRates() {
      const result = await this.currencyService.getRates();
      if (!result.success) {
        throw new Error('No se pudieron obtener las tasas del BCV');
      }
      return result.rates;
    }

private sanitizeArray(value: any): any[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'string') {
    if (value === '' || value === '[]') {
      return null;
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  
  if (Array.isArray(value)) {
    // ✅ SIEMPRE devolver el array, incluso si está vacío
    return value;
  }
  
  return null;
}

    async create(createServiceDto: any, files?: Array<Express.Multer.File>): Promise<ServiceEntity> {
      const tenantId = createServiceDto.tenantId || 'general';
      const serviceSlug = this.slugify(createServiceDto.name || createServiceDto.itemId || 'sin-nombre');

      let isActive = true;
      if (createServiceDto.status !== undefined) {
        isActive = createServiceDto.status === 'published';
      } else if (createServiceDto.isActive !== undefined) {
        isActive = String(createServiceDto.isActive) === 'true' || createServiceDto.isActive === 1;
      }

      const mediaUrls: string[] = [];
      if (files && files.length > 0) {
        const uploadDir = path.join('./public/uploads', tenantId, 'services', serviceSlug);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        files.forEach((file) => {
          mediaUrls.push(`/uploads/${tenantId}/services/${serviceSlug}/${file.filename}`);
        });
      }

      const incomingMedia = createServiceDto.mediaUrls || [];
      const normalizedMedia = Array.isArray(incomingMedia) 
        ? incomingMedia.map(u => this.normalizeUrl(u, tenantId)).filter(Boolean)
        : [];

      const finalMediaUrls = mediaUrls.length > 0 ? [...normalizedMedia, ...mediaUrls] : normalizedMedia;

      let parsedAttributes: Record<string, any> = {};
      const rawMeta = createServiceDto.attributes || createServiceDto.metadata;
      if (rawMeta) {
        if (typeof rawMeta === 'string') {
          try { parsedAttributes = JSON.parse(rawMeta); } catch { parsedAttributes = {}; }
        } else if (typeof rawMeta === 'object') {
          parsedAttributes = { ...rawMeta };
        }
      }

      if (createServiceDto.prices) {
        let incomingPrices = createServiceDto.prices;
        if (typeof incomingPrices === 'string') {
          try { incomingPrices = JSON.parse(incomingPrices); } catch {}
        }

        const rates = await this.getCurrentRates();
        
        const ves = Number(incomingPrices.VES || 0);
        const usd = Number(incomingPrices.USD || (rates.USD > 0 ? ves / rates.USD : 0));
        const eur = Number(incomingPrices.EUR || (rates.EUR > 0 ? ves / rates.EUR : 0));
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

      const sanitizedFeatures = this.sanitizeArray(createServiceDto.features);
      const sanitizedCertifications = this.sanitizeArray(createServiceDto.certifications);
      const sanitizedMaterials = this.sanitizeArray(createServiceDto.materials);
      const sanitizedClientRequirements = this.sanitizeArray(createServiceDto.clientRequirements);

      // ✅ EXTRAER PROFESSIONALS DEL DTO O DE ATTRIBUTES
      let professionals: string[] = [];
      if (createServiceDto.professionals) {
        professionals = Array.isArray(createServiceDto.professionals) 
          ? createServiceDto.professionals 
          : JSON.parse(createServiceDto.professionals || '[]');
      } else if (parsedAttributes?.professionalIds) {
        professionals = Array.isArray(parsedAttributes.professionalIds) 
          ? parsedAttributes.professionalIds 
          : JSON.parse(parsedAttributes.professionalIds || '[]');
      } else if (parsedAttributes?.professionals) {
        professionals = Array.isArray(parsedAttributes.professionals) 
          ? parsedAttributes.professionals 
          : JSON.parse(parsedAttributes.professionals || '[]');
      }

      // ✅ Guardar professionals en attributes también para compatibilidad
      parsedAttributes.professionals = professionals;
      parsedAttributes.professionalIds = professionals;

      const service = this.serviceRepository.create({
        ...createServiceDto,
        itemType: createServiceDto.itemType || 'service',
        durationMinutes: createServiceDto.durationMinutes ? Number(createServiceDto.durationMinutes) : 60,
        isActive,
        status: createServiceDto.status || (isActive ? 'published' : 'draft'),
        mediaUrls: finalMediaUrls,
        coverImage: finalMediaUrls.length > 0 ? finalMediaUrls[0] : null,
        features: sanitizedFeatures,
        certifications: sanitizedCertifications,
        materials: sanitizedMaterials,
        clientRequirements: sanitizedClientRequirements,
        professionals: professionals, // ✅ GUARDAR EN LA RAÍZ
        attributes: parsedAttributes,
      } as DeepPartial<ServiceEntity>);

      return await this.serviceRepository.save(service);
    }
    /**
     * 🔥 NUEVO: Devuelve TODOS los servicios públicos de la plataforma,
     * con filtros opcionales por categoría, búsqueda y orden.
     *
     * Solo devuelve:
     * - activos (isActive = true)
     * - publicados (status = 'published')
     */
    async findAllPublic(options: {
      category?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }): Promise<{
      items: ServiceEntity[];
      total: number;
      categories: Array<{ name: string; count: number }>;
    }> {
      const { category, search, sort, limit = 24, offset = 0 } = options;

      const qb = this.serviceRepository
        .createQueryBuilder('service')
        .leftJoinAndSelect('service.tenant', 'tenant')
        .where('service.isActive = :isActive', { isActive: true })
        .andWhere('service.status = :status', { status: 'published' });

      if (category && category !== 'todos') {
        qb.andWhere('service.category = :category', { category });
      }

      if (search && search.trim()) {
        qb.andWhere(
          '(service.name ILIKE :search OR service.description ILIKE :search)',
          { search: `%${search.trim()}%` },
        );
      }

      switch (sort) {
        case 'price_asc':
          qb.orderBy('service.price', 'ASC');
          break;
        case 'price_desc':
          qb.orderBy('service.price', 'DESC');
          break;
        case 'name_asc':
          qb.orderBy('service.name', 'ASC');
          break;
        case 'recent':
        default:
          qb.orderBy('service.createdAt', 'DESC');
      }

      qb.take(limit).skip(offset);

      const [rawItems, total] = await qb.getManyAndCount();

      // ✅ Reducir el payload:
      // 1. `attributes` viene con un JSON gigante mal formado (availability
      //    guardado como objeto indexado { "0": "{", ... }). Ocupa ~30 KB
      //    por servicio y el frontend NO lo usa en las cards.
      // 2. `tenant` viene completo con passwordHash, securityPin,
      //    specificConfig entero, etc. Solo necesitamos slug y name.
      // 3. `certifications`, `materials`, `clientRequirements` son arrays
      //    que el frontend no usa en las cards.
      const items = rawItems.map((s: any) => {
        const {
          attributes,
          certifications,
          materials,
          clientRequirements,
          ...serviceRest
        } = s;

        return {
          ...serviceRest,
          tenant: s.tenant
            ? {
                id: s.tenant.id,
                name: s.tenant.name,
                slug: s.tenant.slug,
                logoUrl: s.tenant.logoUrl,
                primaryColor: s.tenant.primaryColor,
              }
            : null,
        };
      });

      const categoryRows = await this.serviceRepository
        .createQueryBuilder('service')
        .select('service.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('service.isActive = :isActive', { isActive: true })
        .andWhere('service.status = :status', { status: 'published' })
        .andWhere('service.category IS NOT NULL')
        .groupBy('service.category')
        .orderBy('service.category', 'ASC')
        .getRawMany();

      const categories = categoryRows
        .map((r: any) => ({
          name: r.category,
          count: Number(r.count) || 0,
        }))
        .filter((c: any) => c.name && typeof c.name === 'string' && c.name.trim());

      return { items, total, categories };
    }

    
    async findAllByTenant(tenantId: string): Promise<ServiceEntity[]> {
      return await this.serviceRepository.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      });
    }

        /**
     * 🔥 NUEVO: Devuelve los servicios de un tenant
     * CON el pricing calculado al momento.
     * 
     * No reemplaza a findAllByTenant. Es un endpoint alternativo
     * que incluye un campo `_pricing` en cada servicio.
     * 
     * Los servicios SIEMPRE tienen ivaType: 'exempt' (no tienen IVA).
     * El `_pricing` aplica descuentos si el servicio tiene `onSale: true`.
     * 
     * Si el pricing de un servicio falla, se devuelve igual pero sin `_pricing`.
     */
    async findAllPricedByTenant(tenantId: string): Promise<any[]> {
      const services = await this.findAllByTenant(tenantId);

      if (!services || services.length === 0) {
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
        console.error('❌ [ServicesService] No se pudieron obtener las tasas:', error);
      }

      // Si no hay tasas, devolver los servicios sin pricing
      if (!rates || rates.USD <= 0) {
        return services;
      }

      // Calcular el pricing de cada servicio
      const pricedServices = services.map((service) => {
        try {
          const pricing = this.pricingService.computeServicePricing(
            service,
            1, // cantidad 1 para el catálogo
            rates!,
            'BCV via DolarApi',
          );

          return {
            ...service,
            _pricing: pricing || null,
          };
        } catch (error) {
          console.warn(`⚠️ [ServicesService] No se pudo calcular pricing para ${service.id}:`, error);
          return {
            ...service,
            _pricing: null,
          };
        }
      });

      return pricedServices;
    }

    async findOne(id: string): Promise<ServiceEntity> {
      const service = await this.serviceRepository.findOne({ where: { id } });
      if (!service) {
        throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
      }
      return service;
    }

    async searchGlobal(query: string): Promise<ServiceEntity[]> {
      const rawItems = await this.serviceRepository
        .createQueryBuilder('service')
        .leftJoinAndSelect('service.tenant', 'tenant')
        .where('service.name ILIKE :query', { query: `%${query}%` })
        .orWhere('service.description ILIKE :query', { query: `%${query}%` })
        .orWhere('service.category ILIKE :query', { query: `%${query}%` })
        .andWhere('service.isActive = true')
        .andWhere('service.status = :status', { status: 'published' })
        .take(10)
        .getMany();

      return rawItems.map((s: any) => ({
        ...s,
        tenant: s.tenant
          ? {
              id: s.tenant.id,
              name: s.tenant.name,
              slug: s.tenant.slug,
              niche: s.tenant.niche,
              slogan: s.tenant.slogan,
              logoUrl: s.tenant.logoUrl,
              primaryColor: s.tenant.primaryColor,
              secondaryColor: s.tenant.secondaryColor,
              accentColor: s.tenant.accentColor,
              backgroundColor: s.tenant.backgroundColor,
              ratingAvg: s.tenant.ratingAvg,
              ratingCount: s.tenant.ratingCount,
              modelType: s.tenant.modelType,
            }
          : null,
      })) as ServiceEntity[];
    }

    async update(id: string, updateServiceDto: any, files?: Array<Express.Multer.File>): Promise<ServiceEntity> {
      const service = await this.serviceRepository.findOne({ where: { id } });
      if (!service) {
        throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
      }

      const tenantId = updateServiceDto.tenantId || service.tenantId || 'general';
      const serviceSlug = this.slugify(updateServiceDto.name || service.name || service.itemId || 'sin-nombre');

      const { prices, metadata, features, existingImages, files: fList, published, ...safeData } = updateServiceDto;

      const existingAttributes = service.attributes || {};
      
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
        console.error('No se pudieron obtener tasas para actualizar el servicio:', error);
        rates = { USD: 0, EUR: 0 };
      }

      const ves = Number(dtoPrices.VES ?? existingPrices.VES ?? service.price ?? 0);
      const usd = Number(dtoPrices.USD ?? existingPrices.USD ?? (rates.USD > 0 ? ves / rates.USD : 0));
      const eur = Number(dtoPrices.EUR ?? existingPrices.EUR ?? (rates.EUR > 0 ? ves / rates.EUR : 0));
      const crypto = Number(dtoPrices.CRYPTO ?? dtoPrices.USDT ?? existingPrices.CRYPTO ?? (rates.USD > 0 ? ves / rates.USD : 0));

      const finalPrices = {
        VES: Math.round(ves * 100) / 100,
        USD: Math.round(usd * 100) / 100,
        EUR: Math.round(eur * 100) / 100,
        CRYPTO: Math.round(crypto * 100) / 100,
      };

      let finalFeatures = features;
      if (typeof features === 'string') {
        try { finalFeatures = JSON.parse(features); } catch { finalFeatures = []; }
      }

      // ✅ ACTUALIZAR PROFESSIONALS
      let professionals: string[] = service.professionals || [];
      
      // Verificar si viene en el DTO
      if (updateServiceDto.professionals !== undefined) {
        if (Array.isArray(updateServiceDto.professionals)) {
          professionals = updateServiceDto.professionals;
        } else {
          try {
            const parsedProfessionals = JSON.parse(updateServiceDto.professionals || '[]');
            professionals = Array.isArray(parsedProfessionals) ? parsedProfessionals : [];
          } catch {
            professionals = [];
          }
        }
      } else if (incomingAttributes?.professionalIds) {
        professionals = Array.isArray(incomingAttributes.professionalIds) 
          ? incomingAttributes.professionalIds 
          : JSON.parse(incomingAttributes.professionalIds || '[]');
      } else if (incomingAttributes?.professionals) {
        professionals = Array.isArray(incomingAttributes.professionals) 
          ? incomingAttributes.professionals 
          : JSON.parse(incomingAttributes.professionals || '[]');
      }

const finalAttributes = {
  ...existingAttributes,
  ...(parsedMetadata || {}),
  ...incomingAttributes,
  prices: finalPrices,
  usdReference: Math.round(usd * 100) / 100,
  professionals: professionals,
  professionalIds: professionals,
  // 🔥 GUARDAR AVAILABILITY EN ATTRIBUTES TAMBIÉN
  ...(updateServiceDto.availability !== undefined && {
    availability: updateServiceDto.availability,
  }),
};

      if (safeData.durationMinutes !== undefined) {
        safeData.durationMinutes = safeData.durationMinutes ? Number(safeData.durationMinutes) : 60;
      }

      let updatedMediaUrls: string[] = [];
      const rawExisting = existingImages || updateServiceDto['existingImages[]'];
      const hasImageUpdate = rawExisting !== undefined ||
        updateServiceDto.mediaUrls !== undefined ||
        Boolean(files?.length);
      
      if (rawExisting !== undefined && rawExisting !== null) {
        const existingArray = Array.isArray(rawExisting) ? rawExisting : [rawExisting];
        updatedMediaUrls = existingArray
          .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
          .filter(Boolean);
      } else if (updateServiceDto.mediaUrls !== undefined && updateServiceDto.mediaUrls !== null) {
        const rawImages = updateServiceDto.mediaUrls;
        const rawArray = Array.isArray(rawImages) ? rawImages : [rawImages];
        updatedMediaUrls = rawArray
          .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
          .filter(Boolean);
      } else {
        updatedMediaUrls = service.mediaUrls || [];
      }

      if (files && files.length > 0) {
        const uploadDir = path.join('./public/uploads', tenantId, 'services', serviceSlug);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const newFilePaths = files.map(file => `/uploads/${tenantId}/services/${serviceSlug}/${file.filename}`);
        updatedMediaUrls = [...updatedMediaUrls, ...newFilePaths];
      }

      const resolvedPrice = finalPrices.VES || Number(safeData.price || service.price || 0);

      let isActive = service.isActive;
      let status = service.status;
      
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
  attributes: finalAttributes,
  durationMinutes: safeData.durationMinutes ?? service.durationMinutes ?? 60,
  features: this.sanitizeArray(finalFeatures),
  professionals: professionals, // ✅ ACTUALIZAR PROFESSIONALS EN LA RAÍZ
  // 🔥 GUARDAR AVAILABILITY SI VIENE EN EL DTO
  ...(updateServiceDto.availability !== undefined && {
    availability: updateServiceDto.availability,
  }),
};

      if (hasImageUpdate) {
        dataToSave.mediaUrls = updatedMediaUrls.length > 0 ? updatedMediaUrls : null;
        dataToSave.coverImage = updatedMediaUrls.length > 0 ? updatedMediaUrls[0] : null;
      }

      Object.assign(service, dataToSave);
      
      delete (service as any).prices;
      delete (service as any).metadata;

      return await this.serviceRepository.save(service);
    }

    async remove(id: string, tenantId: string): Promise<void> {
      const service = await this.serviceRepository.findOne({ where: { id, tenantId } });
      if (!service) {
        throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
      }
      await this.serviceRepository.remove(service);
    }
  }