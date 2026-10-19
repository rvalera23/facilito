// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery.service.spec.ts
// Tests unitarios de DeliveryService (polygon validation + point-in-polygon).
// ==========================================

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryService } from './delivery.service';
import { DeliveryZoneEntity, GeoPolygon } from './entities/delivery-zone.entity';

describe('DeliveryService (unit)', () => {
  let service: DeliveryService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveryService,
        {
          provide: getRepositoryToken(DeliveryZoneEntity),
          useValue: {} as Repository<DeliveryZoneEntity>,
        },
      ],
    }).compile();

    service = moduleRef.get<DeliveryService>(DeliveryService);
  });

  // ============================================================
  // isPointInPolygon
  // ============================================================

  describe('isPointInPolygon', () => {
    // Cuadrado simple: (10, -67) a (11, -66)
    const square: GeoPolygon = {
      type: 'Polygon',
      coordinates: [[
        [-67, 10],
        [-66, 10],
        [-66, 11],
        [-67, 11],
        [-67, 10],
      ]],
    };

    it('devuelve true para el centro del cuadrado', () => {
      expect(service.isPointInPolygon(10.5, -66.5, square)).toBe(true);
    });

    it('devuelve true para un punto cerca del borde inferior', () => {
      expect(service.isPointInPolygon(10.01, -66.5, square)).toBe(true);
    });

    it('devuelve false para un punto fuera (norte)', () => {
      expect(service.isPointInPolygon(12, -66.5, square)).toBe(false);
    });

    it('devuelve false para un punto fuera (este)', () => {
      expect(service.isPointInPolygon(10.5, -65, square)).toBe(false);
    });

    it('devuelve false para un punto fuera (oeste)', () => {
      expect(service.isPointInPolygon(10.5, -68, square)).toBe(false);
    });

    it('devuelve false si el polygon está vacío', () => {
      const empty: GeoPolygon = { type: 'Polygon', coordinates: [] };
      expect(service.isPointInPolygon(10.5, -66.5, empty)).toBe(false);
    });

    it('funciona con polígono triangular', () => {
      const tri: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-67, 10],
          [-66, 10],
          [-66.5, 11],
          [-67, 10],
        ]],
      };
      // Punto adentro del triángulo
      expect(service.isPointInPolygon(10.5, -66.5, tri)).toBe(true);
      // Punto fuera (lado este, arriba)
      expect(service.isPointInPolygon(11, -66.1, tri)).toBe(false);
    });

    it('devuelve false para point-in-polygon con anillo de 2 puntos', () => {
      const bad: GeoPolygon = {
        type: 'Polygon',
        coordinates: [[[-67, 10], [-66, 10]]],
      };
      expect(service.isPointInPolygon(10.5, -66.5, bad)).toBe(false);
    });
  });
});
