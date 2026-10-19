import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Favorite, FavoriteItemType } from './entities/favorite.entity';
import { PricingService } from '../pricing/pricing.service';
import { CurrencyService } from '../currency/currency.service';
import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly pricingService: PricingService,
    private readonly currencyService: CurrencyService,
  ) {}

  // ============================================================
  // 🔧 HELPERS PRIVADOS
  // ============================================================

  private async getRatesSafe(): Promise<{
    USD: number;
    EUR: number;
    CRYPTO: number;
    IVA: number;
  } | null> {
    try {
      const ratesResult = await this.currencyService.getRates();
      if (ratesResult?.success && ratesResult.rates) {
        return {
          USD: Number(ratesResult.rates.USD),
          EUR: Number(ratesResult.rates.EUR) || 0,
          CRYPTO:
            Number(ratesResult.rates.CRYPTO || ratesResult.rates.USD) ||
            Number(ratesResult.rates.USD),
          IVA: Number(ratesResult.rates.IVA || 16),
        };
      }
    } catch (error: any) {
      this.logger.error(`❌ No se pudieron obtener las tasas: ${error.message}`);
    }
    return null;
  }

  private enrichProduct(product: ProductEntity, rates: any) {
    if (!product) return null;
    try {
      const pricing = this.pricingService.computeProductPricing(
        product,
        1,
        rates,
        'BCV via DolarApi',
      );
      return { ...product, _pricing: pricing || null };
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Pricing falló para producto ${product.id}: ${error.message}`,
      );
      return { ...product, _pricing: null };
    }
  }

  private enrichService(service: ServiceEntity, rates: any) {
    if (!service) return null;
    try {
      const pricing = this.pricingService.computeServicePricing(
        service,
        1,
        rates,
        'BCV via DolarApi',
      );
      return { ...service, _pricing: pricing || null };
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Pricing falló para servicio ${service.id}: ${error.message}`,
      );
      return { ...service, _pricing: null };
    }
  }

  // ============================================================
  // 🔥 findAllByUser
  // ============================================================

  async findAllByUser(userId: string) {
    this.logger.log(`🔍 Buscando favoritos para usuario: ${userId}`);

    if (!userId) {
      this.logger.warn('⚠️ Se intentó buscar favoritos sin userId');
      return [];
    }

    try {
      const favorites = await this.favoriteRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      this.logger.log(`✅ Favoritos encontrados: ${favorites.length}`);

      if (!favorites.length) return [];

      const rates = await this.getRatesSafe();
      if (!rates || rates.USD <= 0) {
        this.logger.warn(
          '⚠️ Sin tasas disponibles, devolviendo favoritos sin pricing',
        );
        return favorites;
      }

      // 🔥 Separar por tipo
      const productFavs = favorites.filter((f) => f.itemType === 'product');
      const serviceFavs = favorites.filter((f) => f.itemType === 'service');

      // 🔥 Cargar productos manualmente
      const productIds = productFavs.map((f) => f.itemId);
      const products = productIds.length
        ? await this.productRepository.find({
            where: { id: In(productIds) },
            relations: { tenant: true },
          })
        : [];
      const productsMap = new Map(products.map((p) => [p.id, p]));

      // 🔥 Cargar servicios manualmente
      const serviceIds = serviceFavs.map((f) => f.itemId);
      const services = serviceIds.length
        ? await this.serviceRepository.find({
            where: { id: In(serviceIds) },
            relations: { tenant: true },
          })
        : [];
      const servicesMap = new Map(services.map((s) => [s.id, s]));

      // 🔥 Enriquecer
      const enriched = favorites.map((fav) => {
        if (fav.itemType === 'service') {
          const service = servicesMap.get(fav.itemId);
          return {
            ...fav,
            product: null,
            service: this.enrichService(service as ServiceEntity, rates),
          };
        }
        const product = productsMap.get(fav.itemId);
        return {
          ...fav,
          service: null,
          product: this.enrichProduct(product as ProductEntity, rates),
        };
      });

      // 🔥 Limpiar huérfanos (item borrado de la BD)
      return enriched.filter((f) => {
        if (f.itemType === 'service' && !f.service) return false;
        if (f.itemType === 'product' && !f.product) return false;
        return true;
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Error en findAllByUser: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================================
  // 🔥 toggleFavorite
  // ============================================================

  async toggleFavorite(
    userId: string,
    itemId: string,
    itemType: FavoriteItemType = 'product',
  ) {
    this.logger.log(
      `🔄 Toggle favorito: User=${userId}, Item=${itemId}, Type=${itemType}`,
    );

    if (!userId) throw new Error('Usuario no autenticado');

    // Validar que el item exista ANTES de guardar
    if (itemType === 'product') {
      const exists = await this.productRepository.findOne({
        where: { id: itemId },
      });
      if (!exists)
        throw new NotFoundException(`Producto ${itemId} no encontrado`);
    } else if (itemType === 'service') {
      const exists = await this.serviceRepository.findOne({
        where: { id: itemId },
      });
      if (!exists)
        throw new NotFoundException(`Servicio ${itemId} no encontrado`);
    } else {
      throw new Error(`Tipo de item inválido: ${itemType}`);
    }

    try {
      const existing = await this.favoriteRepository.findOne({
        where: { userId, itemId, itemType },
      });

      if (existing) {
        this.logger.log('🗑️ Eliminando favorito existente...');
        await this.favoriteRepository.remove(existing);
        return { status: 'removed', message: 'Eliminado de favoritos' };
      }

      this.logger.log('➕ Guardando nuevo favorito...');
      const favorite = this.favoriteRepository.create({
        userId,
        itemId,
        itemType,
      });
      await this.favoriteRepository.save(favorite);
      return {
        status: 'added',
        message: 'Agregado a favoritos',
        favorite,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Error en toggleFavorite: ${error.message}`,
        error.stack,
      );
      throw new Error(`Error al procesar favorito: ${error.message}`);
    }
  }
}