// apps/backend/src/modules/orders/orders.service.ts

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { User } from '../auth/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrencyService } from '../currency/currency.service';
import { PricingService } from '../pricing/pricing.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ExchangeRates } from '../pricing/types/pricing.types';
import { TenantPaymentConfigService } from '../tenants/tenant-payment-config.service';
import { AccountService } from '../account/account.service';
import { GeoService } from '../geo/geo.service';
import {
  CreatePaymentBreakdownDto,
  ResolveChangeDto,
  validateMethodEntries,
  dtoToMethodEntry,
} from './dto/payment-breakdown.dto';
import {
  buildMethodLabelSnapshot,
  computePaymentBreakdown,
  getDefaultCurrencyForMethod,
  normalizePaymentMethodType,
  PaymentBreakdown,
  PaymentMethodEntry,
} from './types/payment-breakdown.type';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,

    private readonly currencyService: CurrencyService,
    private readonly pricingService: PricingService,
    private readonly receiptsService: ReceiptsService,
    private readonly paymentConfigService: TenantPaymentConfigService,
    private readonly accountService: AccountService,
    private readonly geoService: GeoService,
  ) {}
  // ESTADOS BLOQUEADOS
  private readonly LOCKED_STATUSES = ['COMPLETED', 'CANCELLED'];

  private normalizeStatus(status: string): string {
    if (!status) return '';
    const normalized = status.toUpperCase().trim();
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'POR_VERIFICAR': 'POR_VERIFICAR',
      'CONFIRMED': 'CONFIRMED',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED',
    };
    return statusMap[normalized] || normalized;
  }

  private isStatusLocked(status: string): boolean {
    if (!status) return false;
    const normalized = this.normalizeStatus(status);
    const locked = ['COMPLETED', 'CANCELLED'];
    return locked.some(l => normalized === l);
  }

  private getValidNextStatuses(currentStatus: string): string[] {
    const status = this.normalizeStatus(currentStatus);
    const flow: Record<string, string[]> = {
      'PENDING': ['POR_VERIFICAR', 'CANCELLED'],
      'POR_VERIFICAR': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': [],
    };
    return flow[status] || [];
  }

  // ============================================================
  // 🔥 AUDITORÍA EN auth_events (estándar UCP)
  // ============================================================
  // Registra acciones sensibles sobre órdenes en la tabla auth_events.
  // Se usa dataSource.query directo porque AuthEventsService no existe
  // todavía y crear uno excede el alcance de esta fase.
  // ============================================================
  private async auditOrderEvent(
    userId: string | null,
    eventType: string,
    orderId: string,
    metadata: Record<string, any>,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO auth_events ("userId", "eventType", "ip", "userAgent", "metadata", "createdAt")
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          eventType,
          ip || null,
          userAgent || null,
          JSON.stringify({ orderId, ...metadata }),
        ],
      );
    } catch (err) {
      // No rompemos la operación principal si falla la auditoría.
      console.error(`⚠️ [OrdersService] No se pudo auditar ${eventType}:`, err);
    }
  }

  // ============================================================
  // 🔥 RESOLVER COSTO DE DELIVERY (estándar UCP)
  // ============================================================
  // Reglas:
  //   - null      → null  (cobro a destino, el comprador paga al recibir)
  //   - undefined → 0     (no hay delivery seleccionado)
  //   - número    → max(0, número)
  // ============================================================
  private resolveDeliveryCost(raw: any): number | null {
    if (raw === null) return null;
    if (raw === undefined) return 0;
    const n = Number(raw);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, n);
  }

  // OBTENER TASAS DEL DÍA
  private async getRates(): Promise<ExchangeRates> {
    const ratesResult = await this.currencyService.getRates();
    if (!ratesResult || !ratesResult.success || !ratesResult.rates) {
      throw new BadRequestException(
        'No se pudieron obtener las tasas de cambio del día. Intenta más tarde.',
      );
    }
    return {
      USD: Number(ratesResult.rates.USD),
      EUR: Number(ratesResult.rates.EUR) || 0,
      CRYPTO: Number(ratesResult.rates.CRYPTO || ratesResult.rates.USD) || Number(ratesResult.rates.USD),
      IVA: Number(ratesResult.rates.IVA || 16),
    };
  }

  // ENRIQUECER ITEMS CON IMÁGENES (solo visual)
  private async enrichOrderItems(order: OrderEntity): Promise<OrderEntity> {
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return order;
    }

    const enrichedItems: any[] = [];

    for (const item of order.items) {
      const enrichedItem = { ...item };
      const isService = item.type === 'service' || (item as any).itemType === 'service';

      if (item.productId) {
        try {
          const product = await this.productRepository.findOne({
            where: { id: item.productId },
            select: {
              id: true,
              coverImage: true,
              mediaUrls: true,
            },
          });

          if (product) {
            if (!enrichedItem.coverImage) {
              enrichedItem.coverImage = product.coverImage || undefined;
            }
            if (!enrichedItem.mediaUrls || enrichedItem.mediaUrls.length === 0) {
              enrichedItem.mediaUrls = product.mediaUrls || [];
            }
          }
        } catch (error) {
          console.warn(`⚠️ No se pudo obtener el producto ${item.productId} para la orden ${order.id}`);
        }
      }

      if (isService) {
        if (!enrichedItem.ivaType) enrichedItem.ivaType = 'exempt';
        if (!enrichedItem.ivaRate) enrichedItem.ivaRate = 0;
      } else {
        if (!enrichedItem.ivaType) enrichedItem.ivaType = 'excluded';
        if (!enrichedItem.ivaRate) enrichedItem.ivaRate = 16;
      }

      enrichedItems.push(enrichedItem);
    }

    order.items = enrichedItems;
    return order;
  }

  // ============================================================
  // 🔥 CREAR ORDEN - ÚNICO MOTOR: PRICINGSERVICE
  // ============================================================
  async create(createOrderDto: CreateOrderDto): Promise<OrderEntity> {
    const dto = createOrderDto as any;
    const {
      tenantId,
      userId,
      orderType,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      items,
      paymentMethodUsed,
      paymentReference,
      status,
      clientIdNumber,
      clientIdType,
      clientPhone,
      clientAccountType,
      bankSource,
      serviceDetails,
      source,
      delivery,
      buyerLat,
      buyerLng,
      fulfillment,
    } = dto;


    // ============================================================
    // 🔥 VALIDAR COHERENCIA DE FULFILLMENT (estándar UCP)
    // ============================================================
    // Reglas:
    //   - 'pickup' NO puede tener delivery.company (no hay encomienda).
    //   - 'shipping' SÍ debe tener delivery.company (es encomienda).
    // Defensa en profundidad: aunque el frontend lo mande mal, el backend rechaza.
    // ============================================================
    if (fulfillment === 'pickup' && delivery?.company) {
      throw new BadRequestException(
        "No se puede enviar 'delivery.company' cuando fulfillment es 'pickup'. " +
        "Usá fulfillment: 'shipping' si querés encomienda.",
      );
    }

    if (fulfillment === 'shipping' && !delivery?.company) {
      throw new BadRequestException(
        "fulfillment: 'shipping' requiere 'delivery.company' (empresa de encomienda).",
      );
    }

    // ============================================================
    // 🔥 VALIDAR ROL DEL COMPRADOR
    // ============================================================
    // Los repartidores NO pueden realizar compras. Solo entregan.
    // ============================================================
    if (userId) {
      const buyerRoleRow: any[] = await this.dataSource.query(
        `SELECT role FROM users WHERE id = $1 LIMIT 1`,
        [userId],
      );
      const buyerRole = buyerRoleRow?.[0]?.role;
      if (buyerRole === 'repartidor') {
        throw new BadRequestException(
          'Los repartidores no pueden realizar compras.',
        );
      }
    }

    if (!tenantId) {
      throw new BadRequestException(
        'tenantId es obligatorio para crear una orden.',
      );
    }
    const resolvedTenantId = tenantId;
    const isKiosk = source === 'kiosk';
    const isServiceOrder = orderType === 'service' || Boolean(serviceDetails) ||
      (Array.isArray(items) && items.some((item: any) =>
        item?.type === 'service' || item?.itemType === 'service' || item?.serviceId
      ));

    console.log('📦 [OrdersService] ===== NUEVA ORDEN RECIBIDA =====');
    console.log(`📦 [OrdersService] Fuente: ${source || 'web'}`);
    console.log(`📦 [OrdersService] Cliente: ${customerName}`);
    console.log(`📦 [OrdersService] Items recibidos: ${items?.length || 0}`);
    if (items && items.length > 0) {
      console.log(`📦 [OrdersService] Primer item:`, JSON.stringify(items[0], null, 2));
    }

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

    let normalizedPaymentMethod = paymentMethodUsed || '';
    if (normalizedPaymentMethod) {
      normalizedPaymentMethod = normalizedPaymentMethod.toLowerCase().trim();
    }

    const paymentMethodLabel = normalizedPaymentMethod
      ? (methodLabels[normalizedPaymentMethod] || paymentMethodUsed || 'Pago Móvil')
      : 'Pago Móvil';

    console.log(`🔍 [OrdersService] paymentMethodLabel final: "${paymentMethodLabel}"`);

    // ============================================================
    // 🔥 OBTENER TASAS DEL DÍA (única fuente de verdad)
    // ============================================================
    const rates = await this.getRates();
    console.log(`📊 [OrdersService] Tasa de cambio BCV: ${rates.USD}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar estatus de la tienda
      const tenant = await queryRunner.manager.findOne('tenants', {
        where: { id: resolvedTenantId },
      });

      const tenantConfig = (tenant as any)?.specific_config || (tenant as any)?.specificConfig || {};

      if (tenant && Object.keys(tenantConfig).length > 0) {
        if (tenantConfig.is_manually_closed === true) {
          throw new BadRequestException('La tienda se encuentra temporalmente cerrada por el comercio.');
        }

        if (tenantConfig.schedule) {
          const now = new Date();
          const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          const daySchedule = tenantConfig.schedule[currentDay];

          if (daySchedule && daySchedule.closed === true) {
            throw new BadRequestException('La tienda se encuentra cerrada hoy según su horario.');
          }

          if (daySchedule && daySchedule.open && daySchedule.close) {
            const currentTime = now.toTimeString().slice(0, 5);
            if (currentTime < daySchedule.open || currentTime > daySchedule.close) {
              throw new BadRequestException(`La tienda está fuera de su horario de atención (${daySchedule.open} - ${daySchedule.close}).`);
            }
          }
        }
      }

      // ============================================================
      // 🔥 PROCESAR ITEMS - SOLO CON PRICINGSERVICE
      // ============================================================
      // El frontend solo manda {productId, quantity} o {serviceId, quantity}.
      // El backend calcula TODO con PricingService.
      // NO hay flujo viejo. NO hay cálculos duplicados.
      // ============================================================

      const processedItems: any[] = [];
      const itemPricings: any[] = [];

      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestException('La orden debe tener al menos un item');
      }

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const isServiceItem =
          isServiceOrder ||
          item?.type === 'service' ||
          item?.itemType === 'service' ||
          Boolean(item?.serviceId);
        const quantity = Number(item.quantity || 1);

        console.log(`🔍 [OrdersService] Item ${idx + 1}: ${isServiceItem ? 'SERVICIO' : 'PRODUCTO'}`);

        let pricing: any = null;

        if (isServiceItem) {
          if (!item.serviceId) {
            throw new BadRequestException(
              `El item ${idx + 1} es un servicio pero no tiene serviceId`,
            );
          }
          const service = await queryRunner.manager.findOne(ServiceEntity, {
            where: { id: item.serviceId },
          });
          if (!service) {
            throw new BadRequestException(
              `El servicio ${item.serviceId} no existe o fue eliminado`,
            );
          }

          // 🔥 FASE K: kiosk no vende servicios con availableKiosk=false
          if (isKiosk && service.availableKiosk === false) {
            throw new BadRequestException(
              `El servicio "${service.name}" no está disponible para kiosco.`,
            );
          }
          // Defensa en profundidad: tampoco a domicilio ni virtuales
          if (
            isKiosk &&
            (service.serviceModality === 'A Domicilio' ||
             service.serviceModality === 'Online / Virtual')
          ) {
            throw new BadRequestException(
              `El servicio "${service.name}" (${service.serviceModality}) no está disponible en kiosco.`,
            );
          }

          pricing = this.pricingService.computeServicePricing(
            service,
            quantity,
            rates,
          );
        } else {
          if (!item.productId) {
            throw new BadRequestException(
              `El item ${idx + 1} es un producto pero no tiene productId`,
            );
          }
          const product = await queryRunner.manager.findOne(ProductEntity, {
            where: { id: item.productId },
          });
          if (!product) {
            throw new BadRequestException(
              `El producto ${item.productId} no existe o fue eliminado`,
            );
          }

          // 🔥 FASE K: kiosk solo vende productos con availableKiosk=true
          if (isKiosk && product.availableKiosk === false) {
            throw new BadRequestException(
              `El producto "${product.name}" no está disponible para kiosco.`,
            );
          }

          pricing = this.pricingService.computeProductPricing(
            product,
            quantity,
            rates,
          );
        }

        if (!pricing) {
          throw new BadRequestException(
            `No se pudo calcular el precio del item ${idx + 1} (${item.productId || item.serviceId})`,
          );
        }

        itemPricings.push(pricing);

        // Snapshot completo del item
        processedItems.push({
          productId: item.productId,
          serviceId: item.serviceId,
          name: pricing.name,
          type: pricing.kind,
          coverImage: pricing.image,
          sku: pricing.sku,
          quantity: pricing.quantity,

          // Compatibilidad con modelo viejo
          price: pricing.totalPriceUSD,
          priceUsd: pricing.totalPriceUSD,
          priceVes: pricing.totalPriceVES,
          ivaType: pricing.ivaType,
          ivaRate: pricing.ivaRate,
          rateUsd: pricing.exchangeRateUsed,

          // Snapshot completo
          basePriceUSD: pricing.basePriceUSD,
          basePriceVES: pricing.basePriceVES,
          basePriceOriginalUSD: pricing.basePriceOriginalUSD,
          basePriceOriginalVES: pricing.basePriceOriginalVES,

          hasDiscount: pricing.hasDiscount,
          discountPercentage: pricing.discountPercentage,
          discountAmountUSD: pricing.discountAmountUSD,
          discountAmountVES: pricing.discountAmountVES,
          originalPriceUSD: pricing.originalPriceUSD,
          originalPriceVES: pricing.originalPriceVES,

          taxAmountUSD: pricing.taxAmountUSD,
          taxAmountVES: pricing.taxAmountVES,

          totalPriceUSD: pricing.totalPriceUSD,
          totalPriceVES: pricing.totalPriceVES,

          subtotalUSD: pricing.subtotalUSD,
          subtotalVES: pricing.subtotalVES,
          totalUSD: pricing.totalUSD,
          totalVES: pricing.totalVES,

          exchangeRateUsed: pricing.exchangeRateUsed,
          exchangeRateSource: pricing.exchangeRateSource,
          calculatedAt: pricing.calculatedAt,

          ...(pricing.durationMinutes !== undefined && {
            durationMinutes: pricing.durationMinutes,
          }),
        });
      }

      // ============================================================
      // 🔥 CALCULAR TOTALES DESDE EL SNAPSHOT DEL ITEM
      // ============================================================
      // NO se recalcula. Solo se suma lo que ya calculó PricingService.
      // ============================================================

      const cartTotals = this.pricingService.computeCartTotals(itemPricings);

      console.log(`📊 [OrdersService] Totales calculados por PricingService:`);
      console.log(`📊   → subtotalVES: ${cartTotals.subtotalVES}`);
      console.log(`📊   → totalTaxVES: ${cartTotals.totalTaxVES}`);
      console.log(`📊   → totalVES: ${cartTotals.totalVES}`);
      console.log(`📊   → totalUSD: ${cartTotals.totalUSD}`);

      // ============================================================
      // 🔥 DELIVERY LOCAL (facilito)
      // ============================================================
      // Si fulfillment === 'pickup' → fee 0, sin coords.
      // Si fulfillment === 'delivery' y hay coords → calcular con GeoService.
      // Si fulfillment === 'delivery' pero NO hay coords → compatibilidad:
      //   el pedido se crea pero sin delivery local (fee null, dist null, eta null).
      // Si checkDelivery devuelve canDeliver=false → rechazar la orden.
      // ============================================================
      const isPickup = fulfillment === 'pickup';
      const hasBuyerCoords =
        Number.isFinite(Number(buyerLat)) && Number.isFinite(Number(buyerLng));

      let deliveryFeeLocalUsd: number | null = null;
      let deliveryDistanceKm: number | null = null;
      let deliveryEtaMinutes: number | null = null;

      if (!isServiceOrder && !isPickup) {
        if (hasBuyerCoords) {
          // Buscar el tenant por slug para check-delivery
          const tenantRow: any[] = await queryRunner.manager.query(
            `SELECT slug FROM tenants WHERE id = $1 LIMIT 1`,
            [resolvedTenantId],
          );
          const tenantSlug = tenantRow?.[0]?.slug;

          if (!tenantSlug) {
            throw new BadRequestException(
              'No se pudo resolver el tenant para el cálculo de delivery',
            );
          }

          const deliveryCheck = await this.geoService.checkDelivery({
            buyerLat: Number(buyerLat),
            buyerLng: Number(buyerLng),
            tenantSlug,
            orderSubtotal: cartTotals.subtotalUSD,
          });

          if (!deliveryCheck.canDeliver) {
            const reasonMessages: Record<string, string> = {
              no_tenant_coords: 'La tienda no tiene ubicación configurada para envíos',
              no_buyer_coords: 'Falta la ubicación del comprador',
              out_of_range: 'La tienda no entrega en tu zona',
              below_min_order: 'El monto mínimo para envío no se alcanza',
              no_delivery_config: 'La tienda no tiene configurado el envío',
              accepts_pickup_only: 'La tienda solo acepta retiro en local',
            };
            const msg =
              reasonMessages[deliveryCheck.reason || ''] ||
              'No se puede entregar en la ubicación indicada';
            throw new BadRequestException(msg);
          }

          deliveryFeeLocalUsd = deliveryCheck.fee ?? 0;
          deliveryDistanceKm = deliveryCheck.distanceKm;
          deliveryEtaMinutes = deliveryCheck.etaMinutes;
        }
        // Si no hay coords: dejamos los 3 en null y no cobramos.
      }

      console.log(`📦 [OrdersService] Delivery local:`, {
        fulfillment: fulfillment ?? 'delivery',
        feeUsd: deliveryFeeLocalUsd,
        distanceKm: deliveryDistanceKm,
        etaMinutes: deliveryEtaMinutes,
      });
      // Delivery (cargo externo, sin IVA)
      // 🔥 costUsd: null → "cobro a destino" (no se cobra ahora)
      const deliveryCostUsd = !isServiceOrder && delivery?.selected
        ? this.resolveDeliveryCost(delivery.costUsd ?? delivery.cost)
        : 0;
      const deliveryCostVes = !isServiceOrder && delivery?.selected
        ? (
            delivery.costVes != null
              ? this.resolveDeliveryCost(delivery.costVes)
              : (deliveryCostUsd != null ? deliveryCostUsd * rates.USD : null)
          )
        : 0;
      // 🔥 TOTALES FINALES = totales del PricingService + delivery
      const finalSubtotalUsd = cartTotals.subtotalUSD;
      const finalSubtotalVes = cartTotals.subtotalVES;
      const finalTaxUsd = cartTotals.totalTaxUSD;
      const finalTaxVes = cartTotals.totalTaxVES;
      const finalDiscountUsd = cartTotals.totalDiscountUSD;
      const finalDiscountVes = cartTotals.totalDiscountVES;
      const deliveryFeeLocalVes = (deliveryFeeLocalUsd ?? 0) * rates.USD;
      // 🔥 Si deliveryCostUsd/Ves es null → "cobro a destino", NO se suma al total ahora.
      const finalTotalUsd =
        cartTotals.totalUSD + (deliveryCostUsd ?? 0) + (deliveryFeeLocalUsd ?? 0);
      const finalTotalVes =
        cartTotals.totalVES + (deliveryCostVes ?? 0) + deliveryFeeLocalVes;

      console.log(`✅ [OrdersService] TOTALES FINALES:`);
      console.log(`✅   → subtotal USD: ${finalSubtotalUsd} VES: ${finalSubtotalVes}`);
      console.log(`✅   → tax USD: ${finalTaxUsd} VES: ${finalTaxVes}`);
      console.log(`✅   → discount USD: ${finalDiscountUsd} VES: ${finalDiscountVes}`);
      console.log(`✅   → total USD: ${finalTotalUsd} VES: ${finalTotalVes}`);



      // ============================================================
      // 🔥 DESCONTAR STOCK
      // ============================================================
      if (processedItems && Array.isArray(processedItems)) {
        for (const item of processedItems) {
          const isService = item.type === 'service' || item.itemType === 'service' || item.serviceId;

          if (!isService) {
            const productId = (item as any).productId || (item as any).id || (item as any)._id;
            const quantityToBuy = Number(item.quantity || 1);

            if (productId) {
              await queryRunner.manager.decrement(
                ProductEntity,
                { id: productId },
                'stock',
                quantityToBuy,
              );

              const product = await queryRunner.manager.findOne(ProductEntity, {
                where: { id: productId }
              });

              if (product && product.attributes) {
                const attrs = typeof product.attributes === 'string'
                  ? JSON.parse(product.attributes)
                  : product.attributes;

                if (attrs) {
                  attrs.stock = Math.max(0, (attrs.stock || 0) - quantityToBuy);
                  product.attributes = attrs;
                  await queryRunner.manager.save(product);
                }
              }
            }
          }
        }
      }

      // ============================================================
      // 🔥 FULFILLMENT EFECTIVO (estándar UCP)
      // ============================================================
      // Reglas:
      //   - Si fulfillment viene explícito en el DTO → respetarlo.
      //   - Si NO viene pero hay delivery.company → 'shipping' (encomienda).
      //   - Si NO viene y no hay delivery.company → 'pickup' o 'delivery' (legacy).
      // Valores válidos: 'pickup' | 'shipping' | 'delivery' (legacy).
      // ============================================================
      let effectiveFulfillment: string;
      if (isKiosk) {
        // 🔥 Kiosco: siempre pickup. El quiosco es autopago presencial,
        // no tiene delivery ni encomienda.
        effectiveFulfillment = 'pickup';
      } else if (fulfillment) {
        effectiveFulfillment = fulfillment;
      } else if (delivery?.company) {
        effectiveFulfillment = 'shipping';
      } else {
        effectiveFulfillment = isPickup ? 'pickup' : 'delivery';
      }

      console.log(`📦 [OrdersService] fulfillment efectivo: ${effectiveFulfillment}`);

      // ============================================================
      // 🔥 METADATOS DE PAGO
      // ============================================================
      const paymentMetadata: any = {
        paymentMethod: paymentMethodLabel,
        bankSource: bankSource || undefined,
        paymentReference: paymentReference || undefined,
        exchangeRate: rates.USD,
        source: source || 'web',
        fulfillment: effectiveFulfillment,
      };

      // 🔥 Info de delivery local (si aplica)
      if (!isServiceOrder && (deliveryFeeLocalUsd != null || deliveryDistanceKm != null || deliveryEtaMinutes != null)) {
        paymentMetadata.localDelivery = {
          fee: deliveryFeeLocalUsd,
          distanceKm: deliveryDistanceKm,
          etaMinutes: deliveryEtaMinutes,
        };
      }

      if (delivery) {
        paymentMetadata.delivery = {
          ...delivery,
          selectedAt: new Date().toISOString(),
          status: delivery.status || 'pending',
        };
        console.log(`📦 [OrdersService] Delivery guardado:`, paymentMetadata.delivery);
      }

      const isPagoMovilOrder = ['pago_movil', 'pagomovil', 'pago móvil'].includes(normalizedPaymentMethod);

      if (isPagoMovilOrder && !isServiceOrder) {
        paymentMetadata.clientIdNumber = clientIdNumber || undefined;
        paymentMetadata.clientIdType = clientIdType || undefined;
        paymentMetadata.clientPhone = clientPhone || undefined;
      }

      if (paymentMethodUsed === 'pos') {
        paymentMetadata.clientIdNumber = clientIdNumber || undefined;
        paymentMetadata.clientAccountType = clientAccountType || undefined;
      }

      if (paymentMethodUsed === 'biopago') {
        paymentMetadata.clientIdNumber = clientIdNumber || undefined;
      }

      if (paymentMethodUsed === 'zelle') {
        paymentMetadata.senderEmail = dto.senderEmail || undefined;
      }

      let resolvedUserId = userId;
      if (!resolvedUserId && customerEmail) {
        const buyer = await queryRunner.manager.findOne(User, {
          where: { email: customerEmail.trim().toLowerCase() },
          select: { id: true },
        });
        resolvedUserId = buyer?.id;
      }

      
      // ============================================================
      // 🔥 APLICAR SALDO A FAVOR (si el comprador lo pidió)
      // ============================================================
      // El frontend manda `applyCreditBalance: true` cuando el
      // comprador quiere usar su saldo. El backend:
      //   1. Busca el saldo del cliente en este tenant.
      //   2. Lo aplica al total (parcial o totalmente).
      //   3. Debita el saldo aplicado.
      //   4. Guarda el desglose en paymentMetadata.
      // ============================================================

      let creditAppliedVes = 0;
      let creditBalanceAfter = 0;
      let appliedCreditFromUserId: string | undefined;

      const wantsApplyCredit =
        (createOrderDto as any).applyCreditBalance === true;

      if (wantsApplyCredit) {
        const buyerUserId = resolvedUserId;

        if (buyerUserId) {
          appliedCreditFromUserId = buyerUserId;

          try {
            const creditInfo = await this.accountService.getCreditBalance(
              buyerUserId,
              resolvedTenantId,
            );

            if (creditInfo.balance > 0) {
              creditAppliedVes = Math.min(creditInfo.balance, finalTotalVes);
              creditAppliedVes = Math.round(creditAppliedVes * 100) / 100;
              creditBalanceAfter =
                Math.round((creditInfo.balance - creditAppliedVes) * 100) / 100;

              console.log(
                `💳 [OrdersService] Aplicando saldo: Bs. ${creditAppliedVes} (saldo previo Bs. ${creditInfo.balance}, quedará Bs. ${creditBalanceAfter})`,
              );
            }
          } catch (creditLookupError) {
            console.warn(
              `⚠️ [OrdersService] No se pudo consultar el saldo:`,
              creditLookupError,
            );
          }
        } else {
          console.warn(
            `⚠️ [OrdersService] applyCreditBalance=true pero no hay userId resuelto`,
          );
        }
      }

      // ============================================================
      // 🔥 CREAR ORDEN CON SNAPSHOT COMPLETO
      // ============================================================
      // 🔥 Total final en VES, ya descontado el saldo aplicado
      const finalTotalVesAfterCredit =
        Math.round((finalTotalVes - creditAppliedVes) * 100) / 100;
      const finalTotalUsdAfterCredit =
        rates.USD > 0
          ? Math.round((finalTotalVesAfterCredit / rates.USD) * 100) / 100
          : finalTotalUsd;

      // 🔥 Guardar info del crédito aplicado en paymentMetadata
      if (creditAppliedVes > 0) {
        paymentMetadata.creditApplied = {
          amountVes: creditAppliedVes,
          balanceBefore:
            Math.round((creditBalanceAfter + creditAppliedVes) * 100) / 100,
          balanceAfter: creditBalanceAfter,
          userId: appliedCreditFromUserId,
          appliedAt: new Date().toISOString(),
        };
      }

      const orderData = queryRunner.manager.create(OrderEntity, {
        tenantId: resolvedTenantId,
        userId: resolvedUserId || undefined,
        orderType: isServiceOrder ? 'service' : (orderType || 'delivery'),
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        customerAddress: customerAddress || (isKiosk ? 'Terminal Kiosko Autopago' : undefined),
                items: processedItems,

        // Totales desde PricingService (fuente de verdad)
        // 🔥 Si se aplicó saldo a favor, el total ya va descontado
        subtotal: finalSubtotalUsd,
        tax: finalTaxUsd,
        discount: finalDiscountVes,
        totalAmount: finalTotalUsdAfterCredit,
        totalAmountVes: finalTotalVesAfterCredit,

        // 🔥 DELIVERY LOCAL — snapshot del cálculo
        deliveryFeeCalculated: deliveryFeeLocalUsd,
        deliveryDistanceKm: deliveryDistanceKm,
        deliveryEtaMinutes: deliveryEtaMinutes,

        paymentMethodUsed: paymentMethodLabel,
        paymentReference: paymentReference || undefined,
        bankSource: bankSource || undefined,
        status: status || 'PENDING',
        paymentMetadata: paymentMetadata,
        serviceDetails: serviceDetails || undefined,
        source: source || 'web',
      } as Partial<OrderEntity>);

      console.log(`💾 [OrdersService] Guardando orden en base de datos...`);
      const savedOrder = await queryRunner.manager.save(orderData);
      console.log(`✅ [OrdersService] Orden guardada con ID: ${savedOrder.id}`);

      // 🔥 DEBITAR el saldo aplicado (dentro de la misma transacción)
      if (creditAppliedVes > 0 && appliedCreditFromUserId) {
        try {
          await this.accountService.debitUserCredit(
            appliedCreditFromUserId,
            resolvedTenantId,
            creditAppliedVes,
          );
          console.log(
            `✅ [OrdersService] Saldo debitado: Bs. ${creditAppliedVes} al usuario ${appliedCreditFromUserId}`,
          );
        } catch (debitError) {
          console.error(
            `❌ [OrdersService] Error al debitar saldo:`,
            debitError,
          );
          throw debitError;
        }
      }

      // ============================================================
      // 🔥 GENERAR COMPROBANTE
      // ============================================================
      try {
        const tenantFull = await queryRunner.manager.findOne('tenants', {
          where: { id: resolvedTenantId },
        });
        const tenantName = (tenantFull as any)?.name || 'Mi Negocio';
        const tenantRif =
          (tenantFull as any)?.rif ||
          (tenantFull as any)?.taxId ||
          (tenantFull as any)?.tax_id ||
          null;
        const tenantAddress = (tenantFull as any)?.address || null;
        const tenantPhone = (tenantFull as any)?.phone || null;
        const tenantEmail = (tenantFull as any)?.email || null;
        const customPrefix = (tenantFull as any)?.receiptPrefix || null;

        // itemsSnapshot usando el snapshot real del PricingService
        const itemsSnapshot = processedItems.map((item: any) => {
          const quantity = Number(item.quantity || 1);
          const unitPriceVes = Number(item.totalPriceVES || 0); // precio con IVA, con descuento
          const ivaType = item.ivaType || 'excluded';
          const ivaRate = Number(item.ivaRate || 0);
          const totalVes = unitPriceVes * quantity;
          const ivaAmount = Number(item.taxAmountVES || 0) * quantity;
          return {
            name: item.name || 'Item',
            quantity,
            unitPriceVes,
            totalVes,
            ivaType,
            ivaRate,
            ivaAmount,
          };
        });

        // ivaBreakdown
        const ivaMap = new Map<number, { base: number; amount: number }>();
        for (const item of itemsSnapshot) {
          if (item.ivaType === 'exempt' || item.ivaRate === 0) continue;
          const existing = ivaMap.get(item.ivaRate) || { base: 0, amount: 0 };
          const base =
            item.ivaType === 'included'
              ? item.totalVes - item.ivaAmount
              : item.totalVes;
          existing.base += base;
          existing.amount += item.ivaAmount;
          ivaMap.set(item.ivaRate, existing);
        }
        const ivaBreakdown = Array.from(ivaMap.entries()).map(
          ([rate, { base, amount }]) => ({ rate, base, amount }),
        );

        const totalIvaVes = cartTotals.totalTaxVES;
        const totalExemptVes = processedItems
          .filter((i: any) => i.ivaType === 'exempt')
          .reduce((sum: number, i: any) => sum + Number(i.totalPriceVES || 0) * Number(i.quantity || 1), 0);
        const subtotalBaseVes = cartTotals.subtotalVES;

        const totalsSnapshot = {
          subtotalBaseVes,
          ivaBreakdown,
          totalExemptVes,
          totalIvaVes,
          totalVes: finalTotalVes,
          totalUsd: finalTotalUsd,
          exchangeRate: rates.USD,
          deliveryCostVes: (deliveryCostVes ?? 0) > 0 ? (deliveryCostVes ?? 0) : undefined,
        };

        const customerSnapshot = {
          name: customerName || 'Consumidor final',
          idType: clientIdType || null,
          idNumber: clientIdNumber || null,
          phone: customerPhone || null,
          email: customerEmail || null,
          address: customerAddress || null,
        };

        const paymentSnapshot = {
          method: paymentMethodLabel || null,
          reference: paymentReference || null,
          bankSource: bankSource || null,
        };

        const tenantSnapshot = {
          name: tenantName,
          rif: tenantRif,
          address: tenantAddress,
          phone: tenantPhone,
          email: tenantEmail,
        };

        await this.receiptsService.createFromOrder(queryRunner, {
          tenantId: resolvedTenantId,
          orderId: savedOrder.id,
          tenantName,
          customPrefix,
          customerSnapshot,
          itemsSnapshot,
          totalsSnapshot,
          paymentSnapshot,
          tenantSnapshot,
        });
      } catch (receiptError) {
        console.error(
          `❌ [OrdersService] Error al crear comprobante:`,
          receiptError,
        );
      }

      await queryRunner.commitTransaction();

      // Adjuntar receiptNumber
      try {
        const receipt = await this.receiptsService.findByOrderId(savedOrder.id);
        if (receipt) {
          (savedOrder as any).receiptNumber = receipt.receiptNumber;
          (savedOrder as any).receiptIssuedAt = receipt.issuedAt;
        }
      } catch (err) {
        console.warn(
          `⚠️ [OrdersService] No se pudo adjuntar receiptNumber:`,
          err,
        );
      }

      // Notificaciones
      try {
        await this.notificationsService.createOrderNotifications(savedOrder);
        console.log(`✅ Notificaciones creadas para la orden ${savedOrder.id}`);
      } catch (notifError) {
        console.error('❌ Error al crear notificaciones:', notifError);
      }

      console.log(`🎉 [OrdersService] ===== ORDEN COMPLETADA =====`);
      return savedOrder;

    } catch (error) {
      console.error(`❌ [OrdersService] Error en transacción:`, error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Enriquecer items con imágenes del producto
  async findByTenant(tenantId: string, source?: string): Promise<OrderEntity[]> {
    console.log(`🔍 [OrdersService] Buscando órdenes para tenant: ${tenantId}`);
    const orders = await this.orderRepository.find({
      where: source ? { tenantId, source } : { tenantId },
      order: { createdAt: 'DESC' },
    });
    console.log(`✅ [OrdersService] Encontradas ${orders.length} órdenes`);

    const enrichedOrders: OrderEntity[] = [];
    for (const order of orders) {
      const enriched = await this.enrichOrderItems(order);
      try {
        const receipt = await this.receiptsService.findByOrderId(order.id);
        if (receipt) {
          (enriched as any).receiptNumber = receipt.receiptNumber;
          (enriched as any).receiptIssuedAt = receipt.issuedAt;
        }
      } catch (err) {
        // silencioso
      }
      enrichedOrders.push(enriched);
    }

    return enrichedOrders;
  }

  async findByUser(userId: string): Promise<OrderEntity[]> {
    console.log(`🔍 [OrdersService] Buscando órdenes para usuario: ${userId}`);
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    console.log(`✅ [OrdersService] Encontradas ${orders.length} órdenes`);

    const enrichedOrders: OrderEntity[] = [];
    for (const order of orders) {
      const enriched = await this.enrichOrderItems(order);
      try {
        const receipt = await this.receiptsService.findByOrderId(order.id);
        if (receipt) {
          (enriched as any).receiptNumber = receipt.receiptNumber;
          (enriched as any).receiptIssuedAt = receipt.issuedAt;
        }
      } catch (err) {
        // silencioso
      }
      enrichedOrders.push(enriched);
    }

    return enrichedOrders;
  }

  async findOne(id: string): Promise<OrderEntity> {
    console.log(`🔍 [OrdersService] Buscando orden: ${id}`);
    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      console.warn(`⚠️ [OrdersService] Orden no encontrada: ${id}`);
      throw new NotFoundException('Orden no encontrada');
    }

    console.log(`✅ [OrdersService] Orden encontrada: ${order.id}`);
    const enriched = await this.enrichOrderItems(order);

    try {
      const receipt = await this.receiptsService.findByOrderId(order.id);
      if (receipt) {
        (enriched as any).receiptNumber = receipt.receiptNumber;
        (enriched as any).receiptIssuedAt = receipt.issuedAt;
      }
    } catch (err) {
      // silencioso
    }

    return enriched;
  }

  async updateStatus(
    id: string,
    status: string,
    options?: { force?: boolean; user?: { id?: string; role?: string; activeRole?: string; tenantId?: string } },
  ): Promise<OrderEntity> {
    console.log(`🔄 [OrdersService] Actualizando estado de orden ${id} a ${status}`);

    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      console.warn(`⚠️ [OrdersService] Orden no encontrada: ${id}`);
      throw new NotFoundException('Orden no encontrada');
    }

    console.log(`📊 [OrdersService] Estado actual: ${order.status}`);

    await this.enrichOrderItems(order);

    const currentStatus = this.normalizeStatus(order.status);
    const newStatus = this.normalizeStatus(status);

    if (this.isStatusLocked(currentStatus)) {
      console.warn(`⚠️ [OrdersService] Orden bloqueada: ${order.status}`);
      throw new BadRequestException(
        `No se puede modificar una orden con estado "${order.status}". Las órdenes completadas o canceladas son definitivas.`
      );
    }

    const validNextStatuses = this.getValidNextStatuses(currentStatus);
    if (validNextStatuses.length > 0 && !validNextStatuses.includes(newStatus)) {
      console.warn(`⚠️ [OrdersService] Transición inválida: ${order.status} → ${status}`);
      throw new BadRequestException(
        `No se puede cambiar de "${order.status}" a "${status}". Transiciones válidas: ${validNextStatuses.join(', ')}`
      );
    }

    if (newStatus === 'COMPLETED') {
      const hasItems = order.items && Array.isArray(order.items) && order.items.length > 0;
      if (!hasItems) {
        console.warn(`⚠️ [OrdersService] Orden sin items para completar`);
        throw new BadRequestException('La orden no tiene items para marcar como completada');
      }

      // 🔥 COHERENCIA DE ESTADO (Feature 4.d)
      // Una orden con fulfillment='shipping' NO se puede completar si el envío
      // no está 'delivered'. Override con options.force === true (auditado).
      const pm = (order as any).paymentMetadata || {};
      const fulfillment = pm.fulfillment;
      const deliveryStatus = pm?.delivery?.status;

      const isShippingPending =
        fulfillment === 'shipping' &&
        deliveryStatus !== 'delivered';

      if (isShippingPending && !options?.force) {
        console.warn(
          `⚠️ [OrdersService] Bloqueado COMPLETED: envío en estado "${deliveryStatus ?? 'undefined'}"`,
        );
        throw new BadRequestException(
          'No se puede completar la orden: el envío sigue en tránsito o pendiente. ' +
            'Actualizá el estado del envío a "delivered" o forzá el completado con {force: true}.',
        );
      }

      if (isShippingPending && options?.force) {
        // Auditoría del override
        const adminId = options?.user?.id || null;
        await this.auditOrderEvent(
          adminId,
          'order_completed_with_pending_shipping',
          order.id,
          {
            previousStatus: order.status,
            deliveryStatus: deliveryStatus ?? null,
            company: pm?.delivery?.company ?? null,
            trackingNumber: pm?.delivery?.trackingNumber ?? null,
            tenantId: order.tenantId ?? null,
          },
        );
        console.log(
          `⚠️ [OrdersService] Override COMPLETED con envío pendiente. Auditado.`,
        );
      }
    }

    // ============================================================
    // 🔥 VALIDACIÓN DE CANCELACIÓN POR ROL
    // ============================================================
    if (newStatus === 'CANCELLED') {
      const userRole = (options?.user?.role || options?.user?.activeRole || '').toLowerCase();
      const isBuyer = ['buyer', 'comprador'].includes(userRole);
      const isAdmin = ['admin', 'owner', 'seller', 'vendedor'].includes(userRole);

      if (isBuyer && !['PENDING', 'POR_VERIFICAR'].includes(currentStatus)) {
        throw new BadRequestException(
          `Como comprador, solo podés cancelar órdenes en estado PENDING o POR_VERIFICAR. Estado actual: ${currentStatus}`,
        );
      }

      if (!isBuyer && !isAdmin && !options?.force) {
        throw new BadRequestException(
          'Solo compradores o administradores pueden cancelar órdenes.',
        );
      }

      if (isAdmin && currentStatus === 'COMPLETED') {
        throw new BadRequestException(
          'No se puede cancelar una orden COMPLETED. Ya fue entregada.',
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔥 El descuento de stock ya se realiza al CREAR la orden.
      // No se debe volver a descontar aquí para evitar doble descuento.

      order.status = status;

      if (newStatus === 'COMPLETED') {
        order.completedAt = new Date();

        const change = (order.paymentMetadata as any)?.change;
        if (
          change &&
          change.resolution === 'pending' &&
          Number(change.amountVes || 0) > 0
        ) {
          change.resolution = 'delivered';
          change.deliveryMethod = change.deliveryMethod || 'cash_ves';
          change.resolvedAt = new Date().toISOString();
          change.resolvedBy = 'system:auto-on-completed';
          change.resolutionNotes =
            (change.resolutionNotes ? change.resolutionNotes + ' | ' : '') +
            'Auto-resuelto como entregado al completar la orden.';
          order.paymentMetadata = {
            ...(order.paymentMetadata as any),
            change,
          };
          console.log(
            `✅ [OrdersService] Vuelto auto-resuelto como delivered (orden completada ${id})`,
          );
        }
      }
      // ============================================================
      // 🔥 CANCELACIÓN: RESTOCK + REFUND
      // ============================================================
      if (newStatus === 'CANCELLED') {
        order.cancelledAt = new Date();

        // 1. RESTOCK: Devolver stock de cada producto
        const restockLog: Array<{ productId: string; quantity: number }> = [];
        
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          for (const item of order.items) {
            const isService =
              (item as any).type === 'service' ||
              (item as any).itemType === 'service' ||
              (item as any).serviceId;

            if (isService) continue; // Servicios no tienen stock

            const productId =
              (item as any).productId ||
              (item as any).id ||
              (item as any)._id;
            const quantity = Number((item as any).quantity || 1);

            if (!productId || quantity <= 0) continue;

            const product = await queryRunner.manager.findOne(ProductEntity, {
              where: { id: productId },
            });

            if (!product) {
              console.warn(
                `⚠️ [Restock] Producto ${productId} no encontrado al cancelar orden ${id}`,
              );
              continue;
            }

            await queryRunner.manager.increment(
              ProductEntity,
              { id: productId },
              'stock',
              quantity,
            );

            if (product.attributes) {
              const attrs =
                typeof product.attributes === 'string'
                  ? JSON.parse(product.attributes)
                  : product.attributes;
              if (attrs) {
                attrs.stock = (attrs.stock || 0) + quantity;
                product.attributes = attrs;
                await queryRunner.manager.save(product);
              }
            }

            restockLog.push({ productId, quantity });
          }
        }

        console.log(
          `✅ [Cancel] Restock aplicado: ${restockLog.length} producto(s)`,
          restockLog,
        );

        // 2. REFUND: Devolver saldo a favor si se usó
        const creditApplied = (order.paymentMetadata as any)?.creditApplied;
        let refundedAmountVes = 0;

        if (creditApplied?.amountVes > 0 && creditApplied?.userId) {
          try {
            refundedAmountVes = Number(creditApplied.amountVes);
            await this.accountService.creditUser(
              creditApplied.userId,
              order.tenantId,
              refundedAmountVes,
            );
            console.log(
              `✅ [Cancel] Saldo a favor devuelto: Bs. ${refundedAmountVes} al usuario ${creditApplied.userId}`,
            );
          } catch (refundError) {
            console.error(
              `❌ [Cancel] Error devolviendo saldo a favor:`,
              refundError,
            );
          }
        }

        // 3. AUDITORÍA
        try {
          await this.auditOrderEvent(
            options?.user?.id || null,
            'order_cancelled_with_refund',
            order.id,
            {
              previousStatus: currentStatus,
              cancelledBy: (options?.user?.role || 'system').toLowerCase(),
              restockApplied: restockLog,
              creditRefundedVes: refundedAmountVes,
              tenantId: order.tenantId,
            },
          );
        } catch (auditError) {
          console.warn(`⚠️ [Cancel] Error en auditoría:`, auditError);
        }
      }

      const enrichedOrder = await this.enrichOrderItems(order);
      const updatedOrder = await queryRunner.manager.save(enrichedOrder);

      await queryRunner.commitTransaction();

      console.log(`✅ [OrdersService] Estado actualizado: ${updatedOrder.status}`);

      try {
        if (newStatus === 'CONFIRMED') {
          await this.notificationsService.createPaymentConfirmedNotification(updatedOrder);
          console.log(`✅ Notificación de pago confirmado para orden ${updatedOrder.id}`);
        } else if (newStatus === 'COMPLETED') {
          await this.notificationsService.createOrderCompletedNotification(updatedOrder);
          console.log(`✅ Notificación de orden completada para orden ${updatedOrder.id}`);
        } else if (newStatus === 'CANCELLED') {
          await this.notificationsService.createOrderCancelledNotification(updatedOrder);
          console.log(`✅ Notificación de orden cancelada para orden ${updatedOrder.id}`);
        }
      } catch (notifError) {
        console.error('❌ Error al crear notificaciones de estado:', notifError);
      }

      return updatedOrder;

    } catch (error) {
      console.error(`❌ [OrdersService] Error en transacción:`, error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async canModify(orderId: string): Promise<{ canModify: boolean; reason?: string }> {
    console.log(`🔍 [OrdersService] Verificando si orden ${orderId} puede modificarse`);
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      console.warn(`⚠️ [OrdersService] Orden no encontrada: ${orderId}`);
      throw new NotFoundException('Orden no encontrada');
    }

    const currentStatus = order.status.toUpperCase().trim();
    if (this.isStatusLocked(currentStatus)) {
      console.log(`🔒 [OrdersService] Orden bloqueada: ${order.status}`);
      return {
        canModify: false,
        reason: `La orden está "${order.status}" y no puede ser modificada.`
      };
    }
    console.log(`✅ [OrdersService] Orden modificable: ${order.status}`);
    return { canModify: true };
  }

  async updatePaymentDetails(
    id: string,
    paymentData: {
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
  ): Promise<OrderEntity> {
    console.log(`🔄 [OrdersService] Actualizando datos de pago para orden ${id}`);
    console.log(`📊 [OrdersService] Datos recibidos:`, JSON.stringify(paymentData, null, 2));

    const order = await this.orderRepository.findOne({
      where: { id },
    });

    if (!order) {
      console.warn(`⚠️ [OrdersService] Orden no encontrada: ${id}`);
      throw new NotFoundException('Orden no encontrada');
    }

    await this.enrichOrderItems(order);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (paymentData.status === 'CONFIRMED' && order.status === 'PENDING') {
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          for (const item of order.items) {
            const isService = (item as any).type === 'service' || (item as any).type === 'service';

            if (!isService) {
              const productId = (item as any).productId || (item as any).id || (item as any)._id;
              const quantity = Number((item as any).quantity || 1);

              if (productId) {
                const product = await queryRunner.manager.findOne(ProductEntity, {
                  where: { id: productId }
                });

                if (product) {
                  await queryRunner.manager.decrement(
                    ProductEntity,
                    { id: productId },
                    'stock',
                    quantity
                  );

                  if (product.attributes) {
                    const attrs = typeof product.attributes === 'string'
                      ? JSON.parse(product.attributes)
                      : product.attributes;

                    if (attrs) {
                      attrs.stock = Math.max(0, (attrs.stock || 0) - quantity);
                      product.attributes = attrs;
                      await queryRunner.manager.save(product);
                    }
                  }

                  console.log(`✅ Stock descontado por pago confirmado: ${quantity} unidades del producto ${productId}`);
                } else {
                  console.warn(`⚠️ Producto con ID ${productId} no encontrado al descontar stock`);
                }
              } else {
                console.warn('⚠️ Item sin productId:', item);
              }
            }
          }
        }
      }

      if (paymentData.status) order.status = paymentData.status;
      if (paymentData.bankSource) order.bankSource = paymentData.bankSource;
      if (paymentData.paymentReference) order.paymentReference = paymentData.paymentReference;
      if (paymentData.paymentMethod) order.paymentMethodUsed = paymentData.paymentMethod;

      const paymentMetadata: any = order.paymentMetadata || {};
      if (paymentData.clientIdNumber) paymentMetadata.clientIdNumber = paymentData.clientIdNumber;
      if (paymentData.clientIdType) paymentMetadata.clientIdType = paymentData.clientIdType;
      if (paymentData.clientPhone) paymentMetadata.clientPhone = paymentData.clientPhone;
      if (paymentData.clientAccountType) paymentMetadata.clientAccountType = paymentData.clientAccountType;

      // 🔥 Efectivo: guardar moneda y monto entregado
      if (paymentData.cashCurrency) {
        paymentMetadata.cashCurrency = paymentData.cashCurrency;
      }
      if (paymentData.cashAmount !== undefined && paymentData.cashAmount !== null) {
        paymentMetadata.cashAmount = Number(paymentData.cashAmount);
      }

      // ============================================================
      // 🔥 VUELTO: crear el `change` object + acreditar si aplica
      // ============================================================
      const isCashPayment =
        paymentData.cashAmount !== undefined &&
        paymentData.cashAmount !== null &&
        Number(paymentData.cashAmount) > 0;

      if (isCashPayment && order.userId && order.tenantId) {
        const cashCurrency = paymentData.cashCurrency || 'VES';
        const cashAmount = Number(paymentData.cashAmount);

        const exchangeRate = Number(
          (order as any).exchangeRate ||
            paymentMetadata.exchangeRate ||
            0,
        );

        const totalVes = Number(
          (order as any).totalAmountVes ||
            (order as any).totalAmount * exchangeRate ||
            0,
        );

        const cashAmountVes =
          cashCurrency === 'USD'
            ? cashAmount * exchangeRate
            : cashAmount;

        const changeVes = Math.round((cashAmountVes - totalVes) * 100) / 100;

        if (changeVes > 0) {
          const changeVesUsd =
            exchangeRate > 0
              ? Math.round((changeVes / exchangeRate) * 100) / 100
              : 0;

          const resolution = paymentData.changeResolution || 'pending';
          const alreadyCredited =
            paymentMetadata.change?.creditCreated === true;

          paymentMetadata.change = {
            amountVes: changeVes,
            amountUsd: changeVesUsd,
            currency: 'VES' as const,
            resolution,
            resolutionNotes:
              resolution === 'credit'
                ? 'Cliente eligió acreditar el vuelto como saldo a favor (auto)'
                : resolution === 'rounded'
                  ? 'Cliente aceptó el redondeo'
                  : 'Cliente pidió el vuelto',
            deliveryPreference: paymentData.changeDeliveryPreference,
            creditCreated: false,
            resolvedAt:
              resolution === 'credit' || resolution === 'rounded'
                ? new Date().toISOString()
                : undefined,
            resolvedBy:
              resolution === 'credit' || resolution === 'rounded'
                ? 'system:auto'
                : undefined,
          };

          console.log(
            `💰 [OrdersService] Vuelto detectado: Bs. ${changeVes} (${cashCurrency} ${cashAmount} - Bs. ${totalVes}). Resolution: ${resolution}`,
          );

          if (resolution === 'credit' && !alreadyCredited) {
            try {
              const creditResult = await this.accountService.creditUser(
                order.userId,
                order.tenantId,
                changeVes,
              );
              paymentMetadata.change.creditCreated = true;
              console.log(
                `✅ [OrdersService] Saldo acreditado: user=${order.userId} tenant=${order.tenantId} +Bs. ${changeVes}. Nuevo saldo: Bs. ${creditResult.balance}`,
              );
            } catch (creditError) {
              console.error(
                `❌ [OrdersService] Error al acreditar saldo a favor:`,
                creditError,
              );
              paymentMetadata.change.creditError =
                creditError instanceof Error
                  ? creditError.message
                  : 'Error desconocido';
            }
          }
        }
      }

      if (paymentData.clientPhone) {
        order.customerPhone = paymentData.clientPhone;
      }

      if (paymentData.paymentProof) {
        paymentMetadata.paymentProof = paymentData.paymentProof;
        paymentMetadata.proofUploaded = true;
        paymentMetadata.proofUploadedAt = new Date().toISOString();
        console.log(`📎 Comprobante guardado en paymentMetadata para orden ${id}: ${paymentData.paymentProof}`);
      }

      order.paymentMetadata = paymentMetadata;

      const enrichedOrder = await this.enrichOrderItems(order);
      const updatedOrder = await queryRunner.manager.save(enrichedOrder);

      await queryRunner.commitTransaction();

      console.log(`✅ [OrdersService] Datos de pago actualizados para orden ${updatedOrder.id}`);

      try {
        if (paymentData.status === 'CONFIRMED') {
          await this.notificationsService.createPaymentConfirmedNotification(updatedOrder);
          console.log(`✅ Notificación de pago confirmado para orden ${updatedOrder.id}`);
        }
      } catch (notifError) {
        console.error('❌ Error al crear notificaciones de pago:', notifError);
      }

      return updatedOrder;

    } catch (error) {
      console.error(`❌ [OrdersService] Error en transacción:`, error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Actualizar delivery y recalcular totales
  async updateDelivery(id: string, deliveryData: any): Promise<OrderEntity> {
    console.log(`📦 [OrdersService] Actualizando delivery para orden ${id}`);
    console.log(`📦 [OrdersService] Datos de delivery:`, JSON.stringify(deliveryData, null, 2));

    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const currentStatus = this.normalizeStatus(order.status);

    // ============================================================
    // 🔥 REGLA DE NEGOCIO: metadatos vs dinero
    // ============================================================
    // - CANCELLED → siempre bloqueado (definitivo).
    // - COMPLETED → permitir SOLO cambio de metadatos (empresa,
    //   costo, tracking, estimatedDays) + auditar en auth_events.
    //   El recálculo de totales se omite si ya está COMPLETED.
    // - Otros estados → permitir todo (comportamiento actual).
    // ============================================================
    const isCompleted = currentStatus === 'COMPLETED';
    const isCancelled = currentStatus === 'CANCELLED';

    if (isCancelled) {
      throw new BadRequestException(
        `No se puede modificar el delivery de una orden cancelada.`,
      );
    }

    if (isCompleted) {
      // Auditoría + solo metadatos, sin recalcular totales
      await this.auditOrderEvent(
        null,
        'order_delivery_updated_after_completion',
        id,
        {
          before: order.paymentMetadata?.delivery ?? null,
          after: deliveryData,
        },
      );

      const pm: any = order.paymentMetadata || {};
      if (!deliveryData?.selected || !deliveryData?.company) {
        delete pm.delivery;
      } else {
        pm.delivery = {
          ...deliveryData,
          selectedAt: deliveryData.selectedAt || pm.delivery?.selectedAt || new Date().toISOString(),
          status: deliveryData.status || pm.delivery?.status || 'pending',
        };
      }
      order.paymentMetadata = pm;
      const saved = await this.orderRepository.save(order);
      console.log(`✅ [OrdersService] Delivery actualizado (post-COMPLETED) y auditado: ${id}`);
      return saved;
    }

    await this.enrichOrderItems(order);

    // Recalcular totales con delivery
    const previousDelivery = order.paymentMetadata?.delivery;
    const previousCostUsd = previousDelivery?.selected
      ? this.resolveDeliveryCost(previousDelivery.costUsd ?? previousDelivery.cost)
      : 0;
    const previousCostVes = previousDelivery?.selected
      ? (previousDelivery.costVes != null
          ? this.resolveDeliveryCost(previousDelivery.costVes)
          : (previousCostUsd != null ? previousCostUsd * Number((order.paymentMetadata as any)?.exchangeRate ?? 0) : null))
                : 0;

    const newCostUsd = deliveryData?.selected && deliveryData?.company
      ? this.resolveDeliveryCost(deliveryData.costUsd ?? deliveryData.cost)
      : 0;
    const newCostVes = deliveryData?.selected && deliveryData?.company
      ? (deliveryData.costVes != null
          ? this.resolveDeliveryCost(deliveryData.costVes)
          : (newCostUsd != null ? newCostUsd * Number((order.paymentMetadata as any)?.exchangeRate ?? 0) : null))
                : 0;

    const currentTotalUsd = Number(order.totalAmount || 0);
    const currentTotalVes = Number(order.totalAmountVes || 0);

    // 🔥 null → "cobro a destino", no se suma/resta del total
    const recalculatedTotalUsd = Math.max(
      0,
      currentTotalUsd - (previousCostUsd ?? 0) + (newCostUsd ?? 0),
    );
    const recalculatedTotalVes = Math.max(
      0,
      currentTotalVes - (previousCostVes ?? 0) + (newCostVes ?? 0),
    );

    console.log(`💰 [OrdersService] Recalculando totales por delivery:`);
    console.log(`💰   → delivery anterior: USD=${previousCostUsd} VES=${previousCostVes}`);
    console.log(`💰   → delivery nuevo:    USD=${newCostUsd} VES=${newCostVes}`);
    console.log(`💰   → total anterior:    USD=${currentTotalUsd} VES=${currentTotalVes}`);
    console.log(`💰   → total nuevo:       USD=${recalculatedTotalUsd} VES=${recalculatedTotalVes}`);

    const paymentMetadata: any = order.paymentMetadata || {};
    if (!deliveryData?.selected || !deliveryData?.company) {
      // 🔥 Borrar delivery → si fulfillment era 'shipping', volver a 'pickup'
      delete paymentMetadata.delivery;
      if (paymentMetadata.fulfillment === 'shipping') {
        paymentMetadata.fulfillment = paymentMetadata.localDelivery
          ? 'delivery'
          : 'pickup';
      }
      order.paymentMetadata = paymentMetadata;
      order.totalAmount = recalculatedTotalUsd;
      order.totalAmountVes = recalculatedTotalVes;
    } else {
      // 🔥 Agregar delivery → forzar fulfillment = 'shipping' (estándar UCP)
      paymentMetadata.delivery = {
        ...deliveryData,
        selectedAt: deliveryData.selectedAt || new Date().toISOString(),
        status: deliveryData.status || order.paymentMetadata?.delivery?.status || 'pending',
      };
      paymentMetadata.fulfillment = 'shipping';
      order.paymentMetadata = paymentMetadata;
      order.totalAmount = recalculatedTotalUsd;
      order.totalAmountVes = recalculatedTotalVes;
    }

    const updatedOrder = await this.orderRepository.save(order);

    console.log(`✅ [OrdersService] Delivery actualizado y totales recalculados para orden ${id}`);
    return updatedOrder;
  }

  
  // ============================================================
  // 🔥 DELIVERY LOCAL (facilito) — actualizar fulfillment en orden existente
  // ============================================================
  async updateLocalDelivery(
    orderId: string,
    body: {
      fulfillment: 'delivery' | 'pickup';
      buyerLat?: number;
      buyerLng?: number;
      deliveryFeeLocalUsd?: number | null;
      deliveryDistanceKm?: number | null;
      deliveryEtaMinutes?: number | null;
    },
  ): Promise<OrderEntity> {
    console.log(`📦 [OrdersService] updateLocalDelivery para orden ${orderId}`);
    console.log(`📦 [OrdersService] payload:`, JSON.stringify(body, null, 2));

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const currentStatus = this.normalizeStatus(order.status);

    // ============================================================
    // 🔥 REGLA DE NEGOCIO: metadatos vs dinero (idéntica a updateDelivery)
    // ============================================================
    const isCompleted = currentStatus === 'COMPLETED';
    const isCancelled = currentStatus === 'CANCELLED';

    if (isCancelled) {
      throw new BadRequestException(
        `No se puede modificar el delivery de una orden cancelada.`,
      );
    }

    if (isCompleted) {
      await this.auditOrderEvent(
        null,
        'order_local_delivery_updated_after_completion',
        orderId,
        {
          before: {
            fulfillment: (order.paymentMetadata as any)?.fulfillment ?? null,
            localDelivery: (order.paymentMetadata as any)?.localDelivery ?? null,
          },
          after: body,
        },
      );
    }

    const paymentMetadata: any = order.paymentMetadata || {};
    paymentMetadata.fulfillment = body.fulfillment;

    if (body.fulfillment === 'delivery') {
      paymentMetadata.localDelivery = {
        fee: body.deliveryFeeLocalUsd ?? null,
        distanceKm: body.deliveryDistanceKm ?? null,
        etaMinutes: body.deliveryEtaMinutes ?? null,
      };
      paymentMetadata.buyerLat = body.buyerLat;
      paymentMetadata.buyerLng = body.buyerLng;
    } else {
      delete paymentMetadata.localDelivery;
      delete paymentMetadata.buyerLat;
      delete paymentMetadata.buyerLng;
    }

    order.paymentMetadata = paymentMetadata;

    const saved = await this.orderRepository.save(order);
    console.log(`✅ [OrdersService] updateLocalDelivery OK: fulfillment=${body.fulfillment}`);
    return saved;
  }


  // ============================================================
  // 🔥🔥🔥 PAGOS MIXTOS CON VUELTO 🔥🔥🔥
  // ============================================================

  async savePaymentBreakdown(
    orderId: string,
    dto: CreatePaymentBreakdownDto,
    reportedByUserId: string,
  ): Promise<OrderEntity> {
    console.log(
      `💳 [OrdersService] savePaymentBreakdown order=${orderId} user=${reportedByUserId}`,
    );

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const currentStatus = this.normalizeStatus(order.status);
    if (this.isStatusLocked(currentStatus)) {
      throw new BadRequestException(
        `No se puede reportar pago en una orden con estado "${order.status}".`,
      );
    }

    const methodErrors = validateMethodEntries(dto.methods);
    if (methodErrors.length > 0) {
      const detail = methodErrors
        .map(
          (e) =>
            `método #${e.index} (${e.methodType}): faltan ${e.missing.join(', ')}`,
        )
        .join(' | ');
      throw new BadRequestException(
        `Datos incompletos en el desglose: ${detail}`,
      );
    }

    const activeMethods =
      await this.paymentConfigService.getActivePaymentMethodsByTenant(
        order.tenantId,
      );

    const activeByType = new Map<string, typeof activeMethods>();
    for (const pm of activeMethods) {
      const normalized = normalizePaymentMethodType(pm.type);
      if (!normalized) continue;
      const list = activeByType.get(normalized) ?? [];
      list.push(pm);
      activeByType.set(normalized, list);
    }

    for (const [index, entry] of dto.methods.entries()) {
      if (entry.methodType === 'cash') continue;

      const candidates = activeByType.get(entry.methodType) ?? [];
      if (candidates.length === 0) {
        throw new BadRequestException(
          `Método de pago no habilitado para este comercio: ${entry.methodType} (entrada #${index})`,
        );
      }

      if (entry.methodId) {
        const belongs = candidates.some((c) => c.id === entry.methodId);
        if (!belongs) {
          throw new BadRequestException(
            `El método ${entry.methodType} con id ${entry.methodId} no pertenece a este comercio.`,
          );
        }
      }
    }

    const rates = await this.getRates();
    const serverRate = Number(rates.USD);
    if (serverRate <= 0) {
      throw new BadRequestException(
        'No hay tasa BCV disponible. Intenta más tarde.',
      );
    }

    const methodEntries: PaymentMethodEntry[] = dto.methods.map((entry) => {
      const matchedMethod = entry.methodId
        ? activeMethods.find((pm) => pm.id === entry.methodId)
        : activeMethods.find(
            (pm) => normalizePaymentMethodType(pm.type) === entry.methodType,
          );

      const labelSnapshot = buildMethodLabelSnapshot(
        entry.methodType,
        matchedMethod
          ? { bankName: matchedMethod.bankName, phone: matchedMethod.phone }
          : null,
      );

      const finalEntry = dtoToMethodEntry(entry, labelSnapshot);

      if (!finalEntry.currency) {
        finalEntry.currency = getDefaultCurrencyForMethod(entry.methodType);
      }

      if (!finalEntry.methodId && matchedMethod) {
        finalEntry.methodId = matchedMethod.id;
      }

      return finalEntry;
    });

    const totalVes = Number(order.totalAmountVes || 0);
    const computed = computePaymentBreakdown({
      methods: methodEntries,
      totalVes,
      exchangeRate: serverRate,
    });

    let resolution: PaymentBreakdown['change']['resolution'];
    let resolvedAt: string | undefined;
    let resolvedBy: string | undefined;

    if (computed.status !== 'overpaid') {
      resolution = 'delivered';
      resolvedAt = new Date().toISOString();
      resolvedBy = reportedByUserId;
    } else if (dto.changeResolution) {
      resolution = dto.changeResolution;
      resolvedAt = new Date().toISOString();
      resolvedBy = reportedByUserId;
    } else {
      resolution = 'pending';
    }

    const breakdown: PaymentBreakdown = {
      methods: methodEntries,
      totals: computed.totals,
      change: {
        ...computed.change,
        resolution,
        resolutionNotes: dto.changeResolutionNotes,
        resolvedAt,
        resolvedBy,
        creditCreated: false,
        // 🔥 Preferencia de entrega del vuelto (si el comprador la dejó)
        deliveryPreference: dto.changeDeliveryPreference
          ? {
              method: dto.changeDeliveryPreference.method,
              pagoMovilData: dto.changeDeliveryPreference.pagoMovilData,
              notes: dto.changeDeliveryPreference.notes,
            }
          : undefined,
      },
      status: computed.status,
      exchangeRateAtPayment: serverRate,
      reportedAt: new Date().toISOString(),
      reportedBy: reportedByUserId,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.paymentBreakdown = breakdown;

      if (computed.status === 'paid' || computed.status === 'overpaid') {
        if (currentStatus === 'PENDING') {
          order.status = 'POR_VERIFICAR';
        }
      }

      const saved = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      console.log(
        `✅ [OrdersService] paymentBreakdown guardado para orden ${orderId}: status=${computed.status}, resolution=${resolution}`,
      );

      try {
        await this.notificationsService.createPaymentConfirmedNotification(
          saved,
        );
      } catch (notifError) {
        console.error(
          '❌ Error al crear notificación de pago mixto:',
          notifError,
        );
      }

      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(
        `❌ [OrdersService] Error al guardar paymentBreakdown:`,
        error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resolveChange(
    orderId: string,
    dto: ResolveChangeDto,
    adminUserId: string,
  ): Promise<OrderEntity> {
    console.log(
      `🔄 [OrdersService] resolveChange order=${orderId} user=${adminUserId} resolution=${dto.resolution}`,
    );

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // 🔥 Detectar de dónde viene el vuelto:
    //   - Mixto: paymentBreakdown.status === 'overpaid'
    //   - Simple (efectivo): no hay paymentBreakdown, pero
    //     paymentMetadata.change.resolution === 'pending'
    const hasMixedChange =
      !!order.paymentBreakdown &&
      order.paymentBreakdown.status === 'overpaid';

    const simpleChange = (order.paymentMetadata as any)?.change;
    const hasSimpleChange =
      !hasMixedChange &&
      !!simpleChange &&
      simpleChange.resolution === 'pending' &&
      Number(simpleChange.amountVes || 0) > 0;

    if (!hasMixedChange && !hasSimpleChange) {
      throw new BadRequestException('La orden no tiene vuelto que resolver.');
    }

    await this.assertUserIsTenantAdmin(order.tenantId, adminUserId);

    // 🔥 Referencia al objeto `change` que vamos a mutar.
    // Mixto → paymentBreakdown.change
    // Simple → paymentMetadata.change
    const change: any = hasMixedChange
      ? order.paymentBreakdown!.change
      : simpleChange;

    change.resolution = dto.resolution;
    change.resolutionNotes = dto.notes;
    change.resolvedAt = new Date().toISOString();
    change.resolvedBy = adminUserId;

    // 🔥 ENTREGA DEL VUELTO: solo aplica cuando resolution === 'delivered'
    if (dto.resolution === 'delivered') {
      if (dto.deliveryMethod) {
        change.deliveryMethod = dto.deliveryMethod;

        if (dto.deliveryMethod === 'pago_movil' && dto.deliveryPagoMovilData) {
          change.deliveryPagoMovilData = {
            bank: dto.deliveryPagoMovilData.bank,
            phone: dto.deliveryPagoMovilData.phone,
            clientIdType: dto.deliveryPagoMovilData.clientIdType,
            clientIdNumber: dto.deliveryPagoMovilData.clientIdNumber,
            reference: dto.deliveryPagoMovilData.reference,
          };
        }
      }
    }

    // 🔥 RESOLUCIÓN 'credit': acreditar el saldo al cliente
    if (dto.resolution === 'credit') {
      const creditAmount = Number(change.amountVes || 0);
      const creditUserId = order.userId;

      if (!creditUserId) {
        throw new BadRequestException(
          'La orden no tiene un cliente asociado. No se puede acreditar saldo.',
        );
      }

      if (creditAmount > 0) {
        try {
          const result = await this.accountService.creditUser(
            creditUserId,
            order.tenantId,
            creditAmount,
          );

          change.creditCreated = true;
          change.resolutionNotes =
            (change.resolutionNotes ? change.resolutionNotes + ' | ' : '') +
            `Saldo acreditado: Bs. ${creditAmount.toFixed(2)}. Nuevo saldo: Bs. ${result.balance.toFixed(2)}.`;

          console.log(
            `✅ [OrdersService] Saldo acreditado al cliente ${creditUserId}: Bs. ${creditAmount} (nuevo saldo Bs. ${result.balance})`,
          );
        } catch (creditError) {
          console.error(
            `❌ [OrdersService] Error al acreditar saldo:`,
            creditError,
          );
          throw creditError;
        }
      }
    }

    const saved = await this.orderRepository.save(order);

    console.log(
      `✅ [OrdersService] Vuelto resuelto para orden ${orderId}: ${dto.resolution} (${hasMixedChange ? 'mixto' : 'simple'})${
        dto.deliveryMethod ? ` vía ${dto.deliveryMethod}` : ''
      }`,
    );

    return saved;
  }

  private async assertUserIsTenantAdmin(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.dataSource.query(
      `SELECT role FROM user_tenants
       WHERE tenant_id = $1 AND user_id = $2
       LIMIT 1`,
      [tenantId, userId],
    );

    if (!result || result.length === 0) {
      throw new UnauthorizedException(
        'No tienes permiso para modificar esta orden.',
      );
    }

    const role = result[0].role;
    if (role !== 'owner' && role !== 'admin') {
      throw new UnauthorizedException(
        'Solo el propietario o un administrador puede resolver el vuelto.',
      );
    }
  }
}