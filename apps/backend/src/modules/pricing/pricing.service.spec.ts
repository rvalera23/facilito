// apps/backend/src/modules/pricing/pricing.service.spec.ts

import { PricingService } from './pricing.service';
import { ProductEntity } from '../products/entities/product.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { ExchangeRates } from './types/pricing.types';

/**
 * ============================================================
 * 🔥 TESTS DEL PRICING SERVICE
 * ============================================================
 * 
 * Estos tests verifican que la fórmula de precios es correcta
 * en TODOS los casos posibles:
 * 
 * - IVA included / excluded / exempt
 * - Con / sin descuento
 * - Con / sin fechas de descuento
 * - Producto / servicio
 * - Carrito simple / mixto
 * - Diferentes tasas (820, 825, 830)
 * 
 * ============================================================
 */

describe('PricingService', () => {
  let service: PricingService;

  // Tasas de ejemplo
  const RATES_820: ExchangeRates = { USD: 820, EUR: 958, CRYPTO: 820, IVA: 16 };
  const RATES_825: ExchangeRates = { USD: 825, EUR: 963, CRYPTO: 825, IVA: 16 };
  const RATES_830: ExchangeRates = { USD: 830, EUR: 968, CRYPTO: 830, IVA: 16 };

  beforeEach(() => {
    service = new PricingService();
  });

  // ============================================================
  // HELPERS PARA CREAR MOCKS
  // ============================================================

  const makeProduct = (overrides: Partial<ProductEntity> = {}): ProductEntity => {
    return {
      id: 'prod-1',
      name: 'Pan Bimbo',
      itemId: 'SKU-001',
      coverImage: '/uploads/pan.webp',
      price: 1.66,
      stock: 100,
      isActive: true,
      status: 'published',
      itemType: 'product',
      durationMinutes: null,
      category: 'Alimentos',
      brand: '',
      condition: 'Nuevo',
      warranty: '',
      dimensions: '',
      features: [],
      mediaUrls: [],
      attributes: { prices: { USD: 1.66 } },
      ivaType: 'included',
      ivaRate: 16,
      onSale: false,
      discountPercentage: 0,
      discountStartDate: null,
      discountEndDate: null,
      deletedAt: null,
      tenantId: 'tenant-1',
      tenant: undefined as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as ProductEntity;
  };

  const makeService = (overrides: Partial<ServiceEntity> = {}): ServiceEntity => {
    return {
      id: 'svc-1',
      tenantId: 'tenant-1',
      tenant: undefined as any,
      name: 'Corte de pelo',
      description: 'Corte clásico',
      price: 30,
      durationMinutes: 45,
      maxCapacity: null,
      minAdvanceBooking: 0,
      serviceModality: 'presencial',
      requiresBooking: true,
      category: 'Barbería',
      brand: '',
      condition: 'Nuevo',
      warranty: '',
      itemId: 'SVC-001',
      includes: '',
      notIncludes: '',
      certifications: [],
      materials: [],
      clientRequirements: [],
      cancellationPolicy: '',
      status: 'published',
      isActive: true,
      features: [],
      mediaUrls: [],
      coverImage: '/uploads/corte.webp',
      professionals: [],
      metadata: {},
      attributes: { prices: { USD: 30 } },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as ServiceEntity;
  };

  // ============================================================
  // 🔥 TESTS DE PRODUCTO - IVA INCLUDED
  // ============================================================

  describe('Producto con IVA included', () => {
    it('calcula correctamente a tasa 820', () => {
      const product = makeProduct({
        attributes: { prices: { USD: 1.66 } },
        ivaType: 'included',
        ivaRate: 16,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.ivaType).toBe('included');
      expect(result!.ivaRate).toBe(16);

      // Base sin IVA: 1.66 / 1.16 = 1.431...
      expect(result!.basePriceUSD).toBeCloseTo(1.43, 2);

      // IVA: 1.431 × 0.16 = 0.229
      expect(result!.taxAmountUSD).toBeCloseTo(0.23, 2);

      // Total: 1.43 + 0.23 = 1.66 (redondeado)
      expect(result!.totalPriceUSD).toBeCloseTo(1.66, 2);

      // Total en VES: 1.66 × 820 = 1361.20
      expect(result!.totalPriceVES).toBeCloseTo(1361.2, 1);
    });

    it('calcula correctamente a tasa 825', () => {
      const product = makeProduct({ ivaType: 'included', ivaRate: 16 });
      const result = service.computeProductPricing(product, 1, RATES_825);

      expect(result).not.toBeNull();
      expect(result!.totalPriceUSD).toBeCloseTo(1.66, 2);
      expect(result!.totalPriceVES).toBeCloseTo(1369.5, 1);
    });

    it('calcula correctamente a tasa 830', () => {
      const product = makeProduct({ ivaType: 'included', ivaRate: 16 });
      const result = service.computeProductPricing(product, 1, RATES_830);

      expect(result).not.toBeNull();
      expect(result!.totalPriceUSD).toBeCloseTo(1.66, 2);
      expect(result!.totalPriceVES).toBeCloseTo(1377.8, 1);
    });

    it('respeta la cantidad', () => {
      const product = makeProduct({ ivaType: 'included', ivaRate: 16 });
      const result = service.computeProductPricing(product, 3, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.quantity).toBe(3);
      expect(result!.totalUSD).toBeCloseTo(1.66 * 3, 2);
      expect(result!.totalVES).toBeCloseTo(1361.2 * 3, 1);
    });
  });

  // ============================================================
  // 🔥 TESTS DE PRODUCTO - IVA EXCLUDED
  // ============================================================

  describe('Producto con IVA excluded', () => {
    it('suma el IVA al precio base', () => {
      const product = makeProduct({
        attributes: { prices: { USD: 10 } },
        price: 10,
        ivaType: 'excluded',
        ivaRate: 16,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.ivaType).toBe('excluded');

      // Base = 10 (sin IVA)
      expect(result!.basePriceUSD).toBeCloseTo(10, 2);

      // IVA = 10 × 0.16 = 1.60
      expect(result!.taxAmountUSD).toBeCloseTo(1.6, 2);

      // Total = 10 + 1.60 = 11.60
      expect(result!.totalPriceUSD).toBeCloseTo(11.6, 2);

      // VES = 11.60 × 820 = 9512
      expect(result!.totalPriceVES).toBeCloseTo(9512, 0);
    });
  });

  // ============================================================
  // 🔥 TESTS DE PRODUCTO - EXENTO
  // ============================================================

  describe('Producto exento', () => {
    it('no aplica IVA', () => {
      const product = makeProduct({
        attributes: { prices: { USD: 50 } },
        price: 50,
        ivaType: 'exempt',
        ivaRate: 0,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.ivaType).toBe('exempt');
      expect(result!.ivaRate).toBe(0);
      expect(result!.taxAmountUSD).toBe(0);
      expect(result!.totalPriceUSD).toBeCloseTo(50, 2);
      expect(result!.totalPriceVES).toBeCloseTo(50 * 820, 0);
    });
  });

  // ============================================================
  // 🔥 TESTS DE DESCUENTO
  // ============================================================

  describe('Producto con descuento', () => {
    it('aplica descuento 20% sin fechas (activo siempre)', () => {
      const product = makeProduct({
        attributes: { prices: { USD: 10 } },
        price: 10,
        ivaType: 'excluded',
        ivaRate: 16,
        onSale: true,
        discountPercentage: 20,
        discountStartDate: null,
        discountEndDate: null,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.hasDiscount).toBe(true);
      expect(result!.discountPercentage).toBe(20);

      // Base con descuento aplicado: 8
      expect(result!.basePriceUSD).toBeCloseTo(8, 2);

      // IVA sobre 8: 1.28
      expect(result!.taxAmountUSD).toBeCloseTo(1.28, 2);

      // Total: 8 + 1.28 = 9.28
      expect(result!.totalPriceUSD).toBeCloseTo(9.28, 2);

      // Precio original: 10 + 1.60 = 11.60
      expect(result!.originalPriceUSD).toBeCloseTo(11.6, 2);

      // Descuento unitario sobre la BASE (sin IVA): 10 - 8 = 2
      expect(result!.discountAmountUSD).toBeCloseTo(2, 2);
    });

    it('NO aplica descuento si no está activo (onSale false)', () => {
      const product = makeProduct({
        ivaType: 'excluded',
        ivaRate: 16,
        onSale: false,
        discountPercentage: 20,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.hasDiscount).toBe(false);
      expect(result!.discountPercentage).toBe(0);
    });

    it('NO aplica descuento si la fecha de inicio es futura', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);

      const product = makeProduct({
        ivaType: 'excluded',
        ivaRate: 16,
        onSale: true,
        discountPercentage: 20,
        discountStartDate: future,
        discountEndDate: null,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.hasDiscount).toBe(false);
    });

    it('NO aplica descuento si la fecha de fin ya pasó', () => {
      const past = new Date();
      past.setDate(past.getDate() - 10);

      const product = makeProduct({
        ivaType: 'excluded',
        ivaRate: 16,
        onSale: true,
        discountPercentage: 20,
        discountStartDate: null,
        discountEndDate: past,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.hasDiscount).toBe(false);
    });

    it('SÍ aplica descuento si está dentro del rango', () => {
      const start = new Date();
      start.setDate(start.getDate() - 5);
      const end = new Date();
      end.setDate(end.getDate() + 5);

      const product = makeProduct({
        ivaType: 'excluded',
        ivaRate: 16,
        onSale: true,
        discountPercentage: 20,
        discountStartDate: start,
        discountEndDate: end,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.hasDiscount).toBe(true);
      expect(result!.discountPercentage).toBe(20);
    });
  });

  // ============================================================
  // 🔥 TESTS DE SERVICIO
  // ============================================================

  describe('Servicio', () => {
    it('calcula correctamente sin IVA ni descuento', () => {
      const svc = makeService({
        attributes: { prices: { USD: 30 } },
        price: 30,
      });

      const result = service.computeServicePricing(svc, 1, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.kind).toBe('service');
      expect(result!.ivaType).toBe('exempt');
      expect(result!.ivaRate).toBe(0);
      expect(result!.taxAmountUSD).toBe(0);
      expect(result!.totalPriceUSD).toBeCloseTo(30, 2);
      expect(result!.totalPriceVES).toBeCloseTo(30 * 820, 0);
      expect(result!.durationMinutes).toBe(45);
    });

    it('respeta la cantidad (aunque hoy no se usa)', () => {
      const svc = makeService();
      const result = service.computeServicePricing(svc, 2, RATES_820);

      expect(result).not.toBeNull();
      expect(result!.totalUSD).toBeCloseTo(60, 2);
    });
  });

  // ============================================================
  // 🔥 TESTS DE CARRITO
  // ============================================================

describe('Carrito', () => {
    it('suma un carrito con un producto', () => {
      const product = makeProduct({ ivaType: 'included', ivaRate: 16 });
      const item = service.computeProductPricing(product, 2, RATES_820)!;

      const totals = service.computeCartTotals([item]);

      expect(totals.items).toHaveLength(1);
      expect(totals.totalUSD).toBeCloseTo(1.66 * 2, 2);
      expect(totals.totalVES).toBeCloseTo(1361.2 * 2, 0);
      expect(totals.ivaType).toBe('included');
    });

    it('suma un carrito con producto + servicio', () => {
      const product = makeProduct({
        ivaType: 'excluded',
        ivaRate: 16,
        price: 10,
        attributes: { prices: { USD: 10 } },
      });
      const svc = makeService();

      const p = service.computeProductPricing(product, 1, RATES_820)!;
      const s = service.computeServicePricing(svc, 1, RATES_820)!;

      const totals = service.computeCartTotals([p, s]);

      expect(totals.items).toHaveLength(2);
      expect(totals.totalUSD).toBeCloseTo(11.6 + 30, 2);
      // IVA mixto (excluded + exempt)
      expect(totals.ivaType).toBe('mixed');
      expect(totals.hasMixedIVA).toBe(true);
    });

    it('carrito vacío devuelve totales en 0', () => {
      const totals = service.computeCartTotals([]);

      expect(totals.items).toHaveLength(0);
      expect(totals.totalUSD).toBe(0);
      expect(totals.totalVES).toBe(0);
      expect(totals.hasIVA).toBe(false);
    });

    it('carrito con todos exempt → ivaType = exempt', () => {
      const product = makeProduct({ ivaType: 'exempt', ivaRate: 0 });
      const item = service.computeProductPricing(product, 1, RATES_820)!;

      const totals = service.computeCartTotals([item]);

      expect(totals.ivaType).toBe('exempt');
      expect(totals.hasExemptItems).toBe(true);
    });
  });

  // ============================================================
  // 🔥 TESTS DE ERRORES / VALIDACIONES
  // ============================================================

  describe('Casos inválidos', () => {
    it('devuelve null si la tasa USD es 0', () => {
      const product = makeProduct();
      const result = service.computeProductPricing(product, 1, {
        USD: 0,
        EUR: 0,
        CRYPTO: 0,
        IVA: 16,
      });

      expect(result).toBeNull();
    });

    it('devuelve null si el producto no tiene precio USD', () => {
      const product = makeProduct({
        attributes: {},
        price: 0,
      });

      const result = service.computeProductPricing(product, 1, RATES_820);
      expect(result).toBeNull();
    });

    it('devuelve null si el producto es null', () => {
      const result = service.computeProductPricing(
        null as any,
        1,
        RATES_820,
      );
      expect(result).toBeNull();
    });
  });
});