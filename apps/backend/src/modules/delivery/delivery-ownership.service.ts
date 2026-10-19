// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery-ownership.service.ts
// Validaciones de ownership para endpoints de delivery.
// ==========================================

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DeliveryDriverEntity } from './entities/delivery-driver.entity';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';

export interface AuthUser {
  id: string;
  role: string;
  tenantId?: string | null;
}

@Injectable()
export class DeliveryOwnershipService {
  constructor(
    @InjectRepository(DeliveryDriverEntity)
    private readonly driversRepository: Repository<DeliveryDriverEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignmentsRepository: Repository<DeliveryAssignmentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // HELPERS BÁSICOS
  // ============================================================

  isAdminRole(role: string): boolean {
    return role === 'admin' || role === 'seller' || role === 'owner';
  }

  isDriverRole(role: string): boolean {
    return role === 'repartidor';
  }

  /**
   * Devuelve el driver del user autenticado (si es repartidor).
   */
  async getDriverForUser(userId: string): Promise<DeliveryDriverEntity | null> {
    return this.driversRepository.findOne({
      where: { userId },
    });
  }

  // ============================================================
  // VALIDACIONES
  // ============================================================

  /**
   * Admin puede gestionar drivers del tenant.
   * Si es repartidor, solo puede verse a sí mismo.
   * Si no tiene permiso → 403.
   */
  async assertCanReadDriver(
    user: AuthUser,
    driverId: string,
  ): Promise<DeliveryDriverEntity> {
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    // Admin/seller/owner: solo si es de su tenant o del pool
    if (this.isAdminRole(user.role)) {
      const sameTenant =
        driver.tenantId === user.tenantId || driver.tenantId === null;
      if (!sameTenant) {
        throw new ForbiddenException(
          'No tienes permiso para ver este repartidor',
        );
      }
      return driver;
    }

    // Repartidor: solo si es su propio perfil
    if (this.isDriverRole(user.role)) {
      if (driver.userId !== user.id) {
        throw new ForbiddenException(
          'Solo puedes ver tu propio perfil de repartidor',
        );
      }
      return driver;
    }

    // Otros roles no pueden
    throw new ForbiddenException('Rol sin permiso');
  }

  /**
   * Actualizar driver: admin/seller/owner del tenant, o el mismo driver
   * (pero el driver solo puede cambiar status/location, no otros campos).
   */
  async assertCanUpdateDriver(
    user: AuthUser,
    driverId: string,
  ): Promise<DeliveryDriverEntity> {
    // Guard: rutas como PATCH /drivers/me llegan acá con driverId="me"
    // y revientan la query con un UUID inválido. Devolvemos 404 claro.
    if (!driverId || driverId === 'me') {
      throw new NotFoundException('Repartidor no encontrado');
    }
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    if (this.isAdminRole(user.role)) {
      const sameTenant =
        driver.tenantId === user.tenantId || driver.tenantId === null;
      if (!sameTenant) {
        throw new ForbiddenException(
          'No tienes permiso para modificar este repartidor',
        );
      }
      return driver;
    }

    if (this.isDriverRole(user.role) && driver.userId === user.id) {
      return driver;
    }

    throw new ForbiddenException('Sin permiso para modificar este repartidor');
  }

  /**
   * Actualizar location: SOLO el propio driver.
   * (Los admins no deberían mover a un driver a mano.)
   */
  async assertCanUpdateDriverLocation(
    user: AuthUser,
    driverId: string,
  ): Promise<DeliveryDriverEntity> {
    // Guard: mismo caso que assertCanUpdateDriver — evita 500 en rutas /me/*
    if (!driverId || driverId === 'me') {
      throw new NotFoundException('Repartidor no encontrado');
    }
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    if (this.isDriverRole(user.role) && driver.userId === user.id) {
      return driver;
    }

    throw new ForbiddenException(
      'Solo el propio repartidor puede actualizar su ubicación',
    );
  }

  /**
   * Ver assignment: admin/seller/owner del tenant, o el driver asignado.
   */
  async assertCanReadAssignment(
    user: AuthUser,
    assignmentId: string,
  ): Promise<DeliveryAssignmentEntity> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: { driver: true, order: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (this.isAdminRole(user.role)) {
      const sameTenant =
        assignment.order?.tenantId === user.tenantId;
      if (!sameTenant) {
        throw new ForbiddenException(
          'No tienes permiso para ver esta asignación',
        );
      }
      return assignment;
    }

    if (this.isDriverRole(user.role)) {
      if (assignment.driver?.userId !== user.id) {
        throw new ForbiddenException(
          'Solo puedes ver tus propias asignaciones',
        );
      }
      return assignment;
    }

    throw new ForbiddenException('Sin permiso para ver esta asignación');
  }

  /**
   * Actualizar status de assignment: admin/seller/owner del tenant,
   * o el driver asignado.
   */
  async assertCanUpdateAssignmentStatus(
    user: AuthUser,
    assignmentId: string,
  ): Promise<DeliveryAssignmentEntity> {
    return this.assertCanReadAssignment(user, assignmentId);
  }

  // ============================================================
  // TRACKING DE ORDEN
  // ============================================================

  /**
   * ¿Puede este user trackear esta orden?
   *   - buyer: order.userId === user.id
   *   - admin/seller/owner: order.tenantId === user.tenantId
   *   - repartidor: tiene una assignment con esta order
   *   - otros: false
   */
  async canTrackOrder(user: AuthUser, orderId: string): Promise<boolean> {
    if (!user || !user.id || !orderId) return false;

    // 0. Cargar el user de la DB para tener datos autoritativos
    //    (el JWT puede tener un tenantId desactualizado)
    const userRows: Array<{ role: string | null; tenantId: string | null }> =
      await this.dataSource.query(
        `SELECT role, "tenantId" FROM users WHERE id = $1 LIMIT 1`,
        [user.id],
      );
    if (!userRows.length) return false;

    const dbUser = userRows[0];
    const effectiveRole = dbUser.role || user.role || 'buyer';
    const effectiveTenantId = dbUser.tenantId;

    // 1. Leer la orden
    const rows: Array<{ userId: string | null; tenantId: string }> =
      await this.dataSource.query(
        `SELECT "userId", "tenantId" FROM orders WHERE id = $1 LIMIT 1`,
        [orderId],
      );
    if (!rows.length) return false;

    const order = rows[0];

    // 2. Admin/seller/owner del tenant
    if (this.isAdminRole(effectiveRole)) {
      return order.tenantId === effectiveTenantId;
    }

    // 3. Comprador
    if (effectiveRole === 'buyer') {
      return order.userId === user.id;
    }

    // 4. Repartidor: debe estar asignado
    if (this.isDriverRole(effectiveRole)) {
      const driver = await this.driversRepository.findOne({
        where: { userId: user.id },
      });
      if (!driver) return false;

      const assignment = await this.assignmentsRepository.findOne({
        where: { orderId, driverId: driver.id },
      });
      return !!assignment;
    }

    return false;
  }
}
