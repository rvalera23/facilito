// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery-eta.service.spec.ts
// Tests unitarios de DeliveryEtaService.
// Los repositorios se mockean para no depender de la DB.
// ==========================================

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryEtaService } from './delivery-eta.service';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { DeliveryDriverEntity } from './entities/delivery-driver.entity';

describe('DeliveryEtaService (unit)', () => {
  let service: DeliveryEtaService;

  // Mocks de repos
  const mockAssignmentsRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as Repository<DeliveryAssignmentEntity>;

  const mockDriversRepo = {
    findOne: jest.fn(),
    manager: {
      query: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryEtaService,
        {
          provide: getRepositoryToken(DeliveryAssignmentEntity),
          useValue: mockAssignmentsRepo,
        },
        {
          provide: getRepositoryToken(DeliveryDriverEntity),
          useValue: mockDriversRepo,
        },
      ],
    }).compile();

    service = moduleRef.get<DeliveryEtaService>(DeliveryEtaService);
  });

  // ============================================================
  // computeLiveEta
  // ============================================================

  describe('computeLiveEta', () => {
    it('devuelve null si la assignment no existe', async () => {
      (mockAssignmentsRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.computeLiveEta('no-existe'),
      ).rejects.toThrow();
    });

    it('calcula ETA para driver en el destino (nearby=true)', async () => {
      (mockAssignmentsRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'a1',
        orderId: 'o1',
        status: 'assigned',
        driver: {
          id: 'd1',
          currentLat: 10.4776,
          currentLng: -66.5342,
        },
        order: { id: 'o1', tenantId: 't1' },
      });
      // getOrderDestination: sin buyer coords → null
      // getTenantCoords: fallback del local
      (mockDriversRepo.manager.query as jest.Mock)
        .mockResolvedValueOnce([]) // getOrderDestination → sin columns
        .mockResolvedValueOnce([
          {
            latitude: 10.4776,
            longitude: -66.5342,
            delivery_avg_speed_kmh: 20,
            delivery_prep_time_min: 15,
          },
        ]);

      const result = await service.computeLiveEta('a1');
      expect(result.distanceKm).toBe(0);
      expect(result.etaMinutes).toBe(15);
      expect(result.isNearby).toBe(true);
    });

    it('calcula ETA para driver a ~10 km (nearby=false)', async () => {
      (mockAssignmentsRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'a2',
        orderId: 'o2',
        status: 'assigned',
        driver: {
          id: 'd1',
          currentLat: 10.5676,
          currentLng: -66.5342,
        },
        order: { id: 'o2', tenantId: 't1' },
      });
      (mockDriversRepo.manager.query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            latitude: 10.4776,
            longitude: -66.5342,
            delivery_avg_speed_kmh: 20,
            delivery_prep_time_min: 15,
          },
        ]);

      const result = await service.computeLiveEta('a2');
      expect(result.distanceKm).toBeGreaterThan(9);
      expect(result.distanceKm).toBeLessThan(11);
      expect(result.etaMinutes).toBeGreaterThan(40);
      expect(result.isNearby).toBe(false);
    });

    it('si driver.status=picked_up, no suma prep_time', async () => {
      (mockAssignmentsRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'a3',
        orderId: 'o3',
        status: 'picked_up',
        driver: {
          id: 'd1',
          currentLat: 10.5676,
          currentLng: -66.5342,
        },
        order: { id: 'o3', tenantId: 't1' },
      });
      (mockDriversRepo.manager.query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            latitude: 10.4776,
            longitude: -66.5342,
            delivery_avg_speed_kmh: 20,
            delivery_prep_time_min: 15,
          },
        ]);

      const result = await service.computeLiveEta('a3');
      // 10km / 20kmh = 30 min. Sin prep_time → etaMinutes ≈ 30
      expect(result.etaMinutes).toBeLessThan(35);
      expect(result.etaMinutes).toBeGreaterThan(28);
    });

    it('devuelve null en coords si driver no tiene posición', async () => {
      (mockAssignmentsRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'a4',
        orderId: 'o4',
        status: 'assigned',
        driver: {
          id: 'd1',
          currentLat: null,
          currentLng: null,
        },
        order: { id: 'o4', tenantId: 't1' },
      });

      const result = await service.computeLiveEta('a4');
      expect(result.distanceKm).toBeNull();
      expect(result.etaMinutes).toBeNull();
      expect(result.isNearby).toBe(false);
    });
  });

  // ============================================================
  // computeRouteForDriver (greedy)
  // ============================================================

  describe('computeRouteForDriver', () => {
    it('devuelve ruta vacía si el driver no existe', async () => {
      (mockDriversRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.computeRouteForDriver('no-existe'),
      ).rejects.toThrow();
    });

    it('ordena paradas por nearest-neighbor (greedy)', async () => {
      (mockDriversRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'd1',
        currentLat: 10.0,
        currentLng: -67.0,
      });
      // 3 assignments con destinos:
      //   - o1 → (10.01, -67.00) → ~1.1 km del driver
      //   - o2 → (10.50, -67.00) → ~55 km
      //   - o3 → (10.05, -67.00) → ~5.5 km
      (mockAssignmentsRepo.find as jest.Mock).mockResolvedValue([
        { id: 'a1', orderId: 'o1', status: 'assigned', order: { tenantId: 't1', customerName: 'C1' } },
        { id: 'a2', orderId: 'o2', status: 'assigned', order: { tenantId: 't1', customerName: 'C2' } },
        { id: 'a3', orderId: 'o3', status: 'assigned', order: { tenantId: 't1', customerName: 'C3' } },
      ]);

      // getOrderDestination: sin buyer coords → null
      // getTenantCoords: para cada order. Tenemos 3 assignments.
      // Vamos a simular una tenant coords DISTINTA por assignment → no podemos (tenantId es igual).
      // Alternativa: devolver el destino desde buyer_lat/lng.
      // Mockeamos: getOrderDestination devuelve un row CON buyer coords.
      (mockDriversRepo.manager.query as jest.Mock)
        .mockImplementation(async (sql: string, params: any[]) => {
          if (sql.includes('FROM orders')) {
            const orderId = params[0];
            const map: Record<string, any> = {
              o1: { buyer_lat: 10.01, buyer_lng: -67.0 },
              o2: { buyer_lat: 10.5, buyer_lng: -67.0 },
              o3: { buyer_lat: 10.05, buyer_lng: -67.0 },
            };
            return map[orderId] ? [map[orderId]] : [];
          }
          if (sql.includes('FROM tenants')) {
            return [];
          }
          return [];
        });

      const result = await service.computeRouteForDriver('d1');
      expect(result.stops.length).toBe(3);
      // Greedy desde (10.0, -67.0):
      //   1° más cerca: o1 (10.01) — ~1.1 km
      //   2° siguiente: o3 (10.05) — ~4.4 km desde o1
      //   3° último: o2 (10.5) — ~50 km desde o3
      expect(result.stops[0].orderId).toBe('o1');
      expect(result.stops[1].orderId).toBe('o3');
      expect(result.stops[2].orderId).toBe('o2');
      expect(result.totalDistanceKm).toBeGreaterThan(50);
      expect(result.totalDistanceKm).toBeLessThan(70);
    });

    it('ignora assignments con status delivered/cancelled', async () => {
      (mockDriversRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'd1',
        currentLat: 10.0,
        currentLng: -67.0,
      });
      (mockAssignmentsRepo.find as jest.Mock).mockResolvedValue([
        { id: 'a1', orderId: 'o1', status: 'assigned', order: { tenantId: 't1' } },
        { id: 'a2', orderId: 'o2', status: 'delivered', order: { tenantId: 't1' } },
        { id: 'a3', orderId: 'o3', status: 'cancelled', order: { tenantId: 't1' } },
      ]);
      (mockDriversRepo.manager.query as jest.Mock).mockResolvedValue([
        { buyer_lat: 10.01, buyer_lng: -67.0 },
      ]);

      const result = await service.computeRouteForDriver('d1');
      expect(result.stops.length).toBe(1);
      expect(result.stops[0].orderId).toBe('o1');
    });
  });
});
