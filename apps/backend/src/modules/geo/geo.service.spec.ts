// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/geo.service.spec.ts
// Tests unitarios de GeoService (haversine + helpers).
// ==========================================

import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { GeoService } from './geo.service';

describe('GeoService (unit)', () => {
  let service: GeoService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GeoService,
        {
          provide: getDataSourceToken(),
          useValue: {} as DataSource,
        },
      ],
    }).compile();

    service = moduleRef.get<GeoService>(GeoService);
  });

  describe('haversineKm', () => {
    it('devuelve 0 para el mismo punto', () => {
      const d = service.haversineKm(10.4776, -66.5342, 10.4776, -66.5342);
      expect(d).toBe(0);
    });

    it('calcula ~111 km para 1 grado de latitud', () => {
      const d = service.haversineKm(10.0, -66.0, 11.0, -66.0);
      // 1 grado latitud ≈ 111.19 km
      expect(d).toBeGreaterThan(110);
      expect(d).toBeLessThan(112);
    });

    it('calcula ~0.11 km para 0.001 grado de latitud', () => {
      const d = service.haversineKm(10.4776, -66.5342, 10.4786, -66.5342);
      expect(d).toBeGreaterThan(0.1);
      expect(d).toBeLessThan(0.12);
    });

    it('calcula distancia Caracas → Maracaibo (~520 km)', () => {
      // Caracas: 10.4806, -66.9036
      // Maracaibo: 10.6666, -71.6124
      const d = service.haversineKm(10.4806, -66.9036, 10.6666, -71.6124);
      expect(d).toBeGreaterThan(500);
      expect(d).toBeLessThan(540);
    });

    it('es simétrico (A→B = B→A)', () => {
      const ab = service.haversineKm(10.4776, -66.5342, 10.5676, -66.5342);
      const ba = service.haversineKm(10.5676, -66.5342, 10.4776, -66.5342);
      expect(ab).toBeCloseTo(ba, 6);
    });
  });
});
