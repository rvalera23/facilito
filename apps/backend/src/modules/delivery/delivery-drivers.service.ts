// ==========================================
// ARCHIVO: apps/backend/src/modules/delivery/delivery-drivers.service.ts
// CRUD de drivers + asignación automática de órdenes.
// ==========================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  DeliveryDriverEntity,
  DriverStatus,
  VehicleType,
} from './entities/delivery-driver.entity';
import {
  DeliveryAssignmentEntity,
  AssignmentStatus,
} from './entities/delivery-assignment.entity';
import { DeliveryGateway } from './delivery.gateway';
import { RedisService } from '../../common/redis/redis.service';
import { DeliveryEtaService } from './delivery-eta.service';

export interface CreateDriverInput {
  userId: string;
  tenantId?: string | null;
  vehicleType?: VehicleType | null;
  vehiclePlate?: string | null;
  maxActiveOrders?: number;
}

export interface UpdateDriverInput {
  status?: DriverStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  vehicleType?: VehicleType | null;
  vehiclePlate?: string | null;
  maxActiveOrders?: number;
  isVerified?: boolean;
  // 🔥 NUEVOS: campos del user que se persisten en la tabla users
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
}

export interface UpdateDriverLocationInput {
  lat: number;
  lng: number;
}

export interface AssignOrderInput {
  orderId: string;
  /** Si viene, se asigna a este driver específico (override manual). */
  driverId?: string;
  /** Tenant de la orden. Necesario para filtrar drivers propios. */
  tenantId: string;
  /** Coordenadas del local (para calcular cercanía). */
  tenantLat?: number | null;
  tenantLng?: number | null;
}

@Injectable()
export class DeliveryDriversService {
  private readonly logger = new Logger(DeliveryDriversService.name);

  constructor(
    @InjectRepository(DeliveryDriverEntity)
    private readonly driversRepository: Repository<DeliveryDriverEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignmentsRepository: Repository<DeliveryAssignmentEntity>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly gateway: DeliveryGateway,
    private readonly etaService: DeliveryEtaService,
  ) {}

  /**
   * Limpia un tenant antes de devolverlo al cliente.
   * Elimina passwordHash, securityPin y specificConfig.
   */
  private sanitizeTenant(tenant: any): any {
    if (!tenant || typeof tenant !== 'object') return tenant;

    const {
      passwordHash: _ph,
      securityPin: _sp,
      specificConfig: _sc,
      hasSecurityPin: _hsp,
      ...safeTenant
    } = tenant;

    return safeTenant;
  }

  /**
   * Saca credenciales del user anidado y del tenant anidado
   * antes de devolver el driver.
   * Evita leaks en las respuestas de la API.
   */
  private sanitizeDriver(
    driver: DeliveryDriverEntity | null,
  ): DeliveryDriverEntity | null {
    if (!driver) return null;

    // 1. Limpiar password del user
    if (driver.user && typeof driver.user === 'object') {
      const { password: _omit, ...safeUser } = driver.user as any;
      (driver as any).user = safeUser;
    }

    // 2. Limpiar el tenant anidado
    if ((driver as any).tenant) {
      (driver as any).tenant = this.sanitizeTenant((driver as any).tenant);
    }

    return driver;
  }

  private sanitizeDrivers(
    drivers: DeliveryDriverEntity[],
  ): DeliveryDriverEntity[] {
    return drivers.map((d) => this.sanitizeDriver(d) as DeliveryDriverEntity);
  }

  // ============================================================
  // CRUD DE DRIVERS
  // ============================================================
  /**
   * Crea un user nuevo con role='repartidor' y su driver asociado.
   * Todo en una transacción: si algo falla, no queda basura.
   */
  async createDriverWithUser(input: {
    name?: string;
    email: string;
    phone?: string | null;
    password?: string | null;
    vehicleType?: VehicleType | null;
    vehiclePlate?: string | null;
    maxActiveOrders?: number;
    tenantId?: string | null;
  }): Promise<DeliveryDriverEntity> {
    const { name, email, phone, password, vehicleType, vehiclePlate, maxActiveOrders, tenantId } = input;

    if (!email?.trim()) {
      throw new BadRequestException('El email es obligatorio');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const effectiveTenantId = tenantId || null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buscar user existente por email
      const existingUser: any[] = await queryRunner.manager.query(
        `SELECT id, role FROM users WHERE email = $1 LIMIT 1`,
        [normalizedEmail],
      );

      let userId: string;
      let reusedUser = false;

      if (existingUser.length) {
        const u = existingUser[0];

        if (u.role !== 'repartidor') {
          throw new BadRequestException(
            `El email ${normalizedEmail} ya está registrado con otro rol (${u.role}). Usá otro email.`,
          );
        }

        // Verificar si ya está vinculado a este tenant (o al pool si tenant=null)
        const existingLink: any[] = await queryRunner.manager.query(
          `SELECT id FROM delivery_drivers
             WHERE user_id = $1
               AND (tenant_id = $2 OR (tenant_id IS NULL AND $2::uuid IS NULL))
             LIMIT 1`,
          [u.id, effectiveTenantId],
        );
        if (existingLink.length) {
          throw new BadRequestException(
            'Este repartidor ya está vinculado a esta tienda',
          );
        }

        userId = u.id;
        reusedUser = true;
      } else {
        // 2. Crear user nuevo
        if (!name?.trim()) {
          throw new BadRequestException(
            'El nombre es obligatorio para crear un usuario nuevo',
          );
        }

        const bcrypt = require('bcrypt');
        const plainPassword = password?.trim() || 'repartidor123';
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        // ⚠️ NO seteamos tenantId en users (users.tenantId es UNIQUE y está
        // reservado para el owner). El vínculo con la tienda vive en
        // delivery_drivers.tenant_id.
        const userInsert: any[] = await queryRunner.manager.query(
          `INSERT INTO users (
             id, name, email, password, provider, role,
             phone, onboarding_completed, "createdAt", "updatedAt"
           ) VALUES (
             uuid_generate_v4(), $1, $2, $3, 'credentials', 'repartidor',
             $4, true, now(), now()
           ) RETURNING id`,
          [name.trim(), normalizedEmail, passwordHash, phone?.trim() || null],
        );
        userId = userInsert[0].id;
      }

      // 3. Crear el vínculo delivery_drivers (nuevo para este tenant)
      const driverInsert: any[] = await queryRunner.manager.query(
        `INSERT INTO delivery_drivers (
           id, user_id, tenant_id, status, vehicle_type, vehicle_plate,
           max_active_orders, rating_avg, rating_count, is_verified,
           created_at, updated_at
         ) VALUES (
           uuid_generate_v4(), $1, $2, 'offline', $3, $4,
           $5, 0, 0, false, now(), now()
         ) RETURNING id`,
        [
          userId,
          effectiveTenantId,
          vehicleType || null,
          vehiclePlate?.trim() || null,
          maxActiveOrders && maxActiveOrders > 0 ? maxActiveOrders : 1,
        ],
      );
      const newDriverId = driverInsert[0].id;

      await queryRunner.commitTransaction();

      // Recargar con relaciones y sanitizar
      const driver = await this.driversRepository.findOne({
        where: { id: newDriverId },
        relations: { user: true, tenant: true },
      });
      if (!driver) {
        throw new BadRequestException('No se pudo cargar el repartidor recién creado');
      }
      if (reusedUser) {
        this.logger.log(
          `Driver creado reusando user existente ${userId} (tenant=${effectiveTenantId ?? 'pool'})`,
        );
      }
      return this.sanitizeDriver(driver) as DeliveryDriverEntity;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
 
  async createDriver(input: CreateDriverInput): Promise<DeliveryDriverEntity> {
    if (!input.userId) {
      throw new BadRequestException('userId es obligatorio');
    }

    const effectiveTenantId = input.tenantId ?? null;

    // 1. Validar que el usuario existe y tiene role='repartidor'.
    const userRow: any[] = await this.dataSource.query(
      `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
      [input.userId],
    );
    if (!userRow.length) {
      throw new BadRequestException(`El usuario ${input.userId} no existe`);
    }
    if (userRow[0].role !== 'repartidor') {
      throw new BadRequestException(
        `El usuario ${input.userId} no tiene rol 'repartidor' (rol actual: ${userRow[0].role})`,
      );
    }

    // 2. Validar que no exista ya un vínculo (user_id, tenant_id).
    //    tenant_id NULL se compara explícitamente por el problema de NULL != NULL.
    const existing: any[] = await this.dataSource.query(
      `SELECT id FROM delivery_drivers
         WHERE user_id = $1
           AND (tenant_id = $2 OR (tenant_id IS NULL AND $2::uuid IS NULL))
         LIMIT 1`,
      [input.userId, effectiveTenantId],
    );
    if (existing.length) {
      throw new BadRequestException(
        'Este repartidor ya está vinculado a esta tienda',
      );
    }

    // 3. Crear el vínculo.
    const driver = this.driversRepository.create({
      userId: input.userId,
      tenantId: effectiveTenantId,
      vehicleType: input.vehicleType ?? null,
      vehiclePlate: input.vehiclePlate ?? null,
      maxActiveOrders: input.maxActiveOrders ?? 1,
      status: 'offline',
    });

    return this.driversRepository.save(driver);
  }

  async listDrivers(params: {
    tenantId?: string | null;
    includePool?: boolean;
    status?: DriverStatus;
  }): Promise<DeliveryDriverEntity[]> {
    const qb = this.driversRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'user');

    if (params.tenantId) {
      if (params.includePool) {
        qb.where('(d.tenant_id = :tenantId OR d.tenant_id IS NULL)', {
          tenantId: params.tenantId,
        });
      } else {
        qb.where('d.tenant_id = :tenantId', { tenantId: params.tenantId });
      }
    } else {
      // Solo el pool
      qb.where('d.tenant_id IS NULL');
    }

    if (params.status) {
      qb.andWhere('d.status = :status', { status: params.status });
    }

    qb.orderBy('d.created_at', 'DESC');
    const drivers = await qb.getMany();
    return this.sanitizeDrivers(drivers);
  }

  async getDriverById(driverId: string): Promise<DeliveryDriverEntity> {
    // Guard: rutas como PATCH /drivers/me pueden llegar acá con driverId="me"
    // y reventar la query con un UUID inválido. Devolvemos 404 claro.
    if (!driverId || driverId === 'me') {
      throw new NotFoundException('Repartidor no encontrado');
    }
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
      relations: { user: true, tenant: true },
    });
    if (!driver) {
      throw new NotFoundException('Repartidor no encontrado');
    }
    return this.sanitizeDriver(driver) as DeliveryDriverEntity;
  }
  /**
   * Busca UN driver por userId, opcionalmente filtrando por tenant.
   *
   * Semántica de `tenantId`:
   *   - undefined → sin filtro (compat con callers viejos). Devuelve el primero
   *     por created_at ASC (determinista).
   *   - null      → busca específicamente en el pool (tenant_id IS NULL).
   *   - 'uuid'    → busca ese tenant.
   *
   * Con multi-tienda, si el user tiene N vínculos, este método devuelve 1.
   * Para obtener todos, usar `getDriversByUserId`.
   */
  async getDriverByUserId(
    userId: string,
    tenantId?: string | null,
  ): Promise<DeliveryDriverEntity | null> {
    const qb = this.driversRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'user')
      .leftJoinAndSelect('d.tenant', 'tenant')
      .where('d.user_id = :userId', { userId });

    if (tenantId === null) {
      qb.andWhere('d.tenant_id IS NULL');
    } else if (typeof tenantId === 'string') {
      qb.andWhere('d.tenant_id = :tenantId', { tenantId });
    }
    // undefined → sin filtro adicional

    qb.orderBy('d.created_at', 'ASC').limit(1);
    const driver = await qb.getOne();
    return this.sanitizeDriver(driver);
  }

  /**
   * Devuelve TODOS los vínculos (drivers) de un mismo user.
   * Usado por el panel del repartidor multi-tienda.
   */
  async getDriversByUserId(
    userId: string,
  ): Promise<DeliveryDriverEntity[]> {
    const drivers = await this.driversRepository.find({
      where: { userId },
      relations: { user: true, tenant: true },
      order: { createdAt: 'ASC' },
    });
    return this.sanitizeDrivers(drivers);
  }

    /**
   * Busca un user por email y devuelve:
   *   - null si no existe
   *   - { user, tenants } si existe (con o sin role='repartidor')
   *
   * Usado por el CreateDriverModal para mostrar el estado antes de submit.
   * NO devuelve password ni datos sensibles.
   */
  async lookupByEmail(email: string): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
    };
    isRepartidor: boolean;
    tenants: Array<{
      driverId: string;
      tenantId: string | null;
      tenantName: string | null;
      tenantSlug: string | null;
      status: DriverStatus;
      vehicleType: VehicleType | null;
    }>;
  } | null> {
    if (!email?.trim()) {
      throw new BadRequestException('El email es obligatorio');
    }
    const normalizedEmail = email.trim().toLowerCase();

    const userRow: any[] = await this.dataSource.query(
      `SELECT id, name, email, role, "avatarUrl"
         FROM users
        WHERE LOWER(email) = $1
        LIMIT 1`,
      [normalizedEmail],
    );
    if (!userRow.length) return null;

    const u = userRow[0];

    const links: any[] = await this.dataSource.query(
      `SELECT d.id AS driver_id,
              d.tenant_id,
              t.name AS tenant_name,
              t.slug AS tenant_slug,
              d.status,
              d.vehicle_type
         FROM delivery_drivers d
         LEFT JOIN tenants t ON t.id = d.tenant_id
        WHERE d.user_id = $1
        ORDER BY d.created_at ASC`,
      [u.id],
    );

    return {
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl ?? null,
      },
      isRepartidor: u.role === 'repartidor',
      tenants: links.map((l) => ({
        driverId: l.driver_id,
        tenantId: l.tenant_id,
        tenantName: l.tenant_name,
        tenantSlug: l.tenant_slug,
        status: l.status,
        vehicleType: l.vehicle_type,
      })),
    };
  }
  
  async updateDriver(
    driverId: string,
    input: UpdateDriverInput,
  ): Promise<DeliveryDriverEntity> {
    const driver = await this.getDriverById(driverId);
    const previousStatus = driver.status;

    if (input.status !== undefined) driver.status = input.status;
    if (input.currentLat !== undefined) driver.currentLat = input.currentLat;
    if (input.currentLng !== undefined) driver.currentLng = input.currentLng;
    if (input.vehicleType !== undefined) driver.vehicleType = input.vehicleType;
    if (input.vehiclePlate !== undefined) driver.vehiclePlate = input.vehiclePlate;
    if (input.maxActiveOrders !== undefined) {
      driver.maxActiveOrders = Math.max(1, input.maxActiveOrders);
    }
    if (input.isVerified !== undefined) driver.isVerified = input.isVerified;

    const saved = await this.driversRepository.save(driver);

    // ============================================================
    // 🔥 NUEVO: persistir name, phone, avatarUrl, notes en users
    // ============================================================
    if (driver.userId) {
      const userUpdates: string[] = [];
      const userParams: any[] = [];
      let i = 1;

      if (input.name !== undefined && input.name !== null) {
        userUpdates.push(`name = $${i++}`);
        userParams.push(String(input.name).trim());
      }
      if (input.phone !== undefined) {
        userUpdates.push(`phone = $${i++}`);
        userParams.push(input.phone || null);
      }
      if (input.avatarUrl !== undefined) {
        userUpdates.push(`"avatarUrl" = $${i++}`);
        userParams.push(input.avatarUrl || null);
      }
      if (input.notes !== undefined) {
        userUpdates.push(`notes = $${i++}`);
        userParams.push(input.notes || null);
      }

      if (userUpdates.length > 0) {
        userUpdates.push(`"updatedAt" = now()`);
        userParams.push(driver.userId);
        await this.dataSource.query(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${i}`,
          userParams,
        );
      }
    }

    // Sincronizar índice de drivers online en Redis
    if (previousStatus !== saved.status) {
      if (saved.status === 'online') {
        await this.redis.markDriverOnline(driverId, saved.tenantId);
      } else if (previousStatus === 'online') {
        await this.redis.markDriverOffline(driverId, saved.tenantId);
      }
    }

    // Si vino con coords, actualizar Redis también
    if (
      input.currentLat != null &&
      input.currentLng != null &&
      Number.isFinite(input.currentLat) &&
      Number.isFinite(input.currentLng)
    ) {
      await this.redis.setDriverLocation(
        driverId,
        input.currentLat,
        input.currentLng,
        30,
      );
    }

    return saved;
  }

  /**
   * Actualiza el perfil del repartidor logueado (self-service).
   * - Campos de `users`: name, phone, phone_is_whatsapp, id_number, id_type.
   * - Campos de `delivery_drivers`: vehicleType, vehiclePlate.
   * No permite cambiar email, status, maxActiveOrders ni isVerified.
   */
  async updateMyDriverProfile(
    userId: string,
    input: {
      name?: string;
      phone?: string | null;
      phone_is_whatsapp?: boolean;
      id_number?: string | null;
      id_type?: string | null;
      vehicleType?: VehicleType | null;
      vehiclePlate?: string | null;
    },
  ): Promise<DeliveryDriverEntity> {
    // 1. Buscar driver por userId
    const driver = await this.driversRepository.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!driver) {
      throw new NotFoundException('No estás registrado como repartidor');
    }

    // 2. Update de users (name, phone, phone_is_whatsapp, id_number, id_type)
    const userSets: string[] = [];
    const userParams: any[] = [];
    let i = 1;

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new BadRequestException('El nombre no puede estar vacío');
      }
      userSets.push(`name = $${i++}`);
      userParams.push(input.name.trim());
    }
    if (input.phone !== undefined) {
      userSets.push(`phone = $${i++}`);
      userParams.push(input.phone?.trim() || null);
    }
    if (input.phone_is_whatsapp !== undefined) {
      userSets.push(`phone_is_whatsapp = $${i++}`);
      userParams.push(input.phone_is_whatsapp);
    }
    if (input.id_number !== undefined) {
      userSets.push(`id_number = $${i++}`);
      userParams.push(input.id_number?.trim() || null);
    }
    if (input.id_type !== undefined) {
      userSets.push(`id_type = $${i++}`);
      userParams.push(input.id_type?.trim() || null);
    }

    if (userSets.length > 0) {
      userSets.push(`"updatedAt" = now()`);
      userParams.push(userId);
      try {
        await this.dataSource.query(
          `UPDATE users SET ${userSets.join(', ')} WHERE id = $${i}`,
          userParams,
        );
      } catch (err: any) {
        // Manejar unique violation de id_number
        if (err?.code === '23505' && String(err.message).includes('id_number')) {
          throw new BadRequestException('Esa cédula ya está registrada en otro usuario');
        }
        throw err;
      }
    }

    // 3. Update de delivery_drivers (vehicleType, vehiclePlate)
    if (input.vehicleType !== undefined) driver.vehicleType = input.vehicleType;
    if (input.vehiclePlate !== undefined) {
      driver.vehiclePlate = input.vehiclePlate?.trim() || null;
    }
    await this.driversRepository.save(driver);

    // 4. Recargar con relaciones y sanitizar
    const fresh = await this.driversRepository.findOne({
      where: { id: driver.id },
      relations: { user: true, tenant: true },
    });
    if (!fresh) {
      throw new NotFoundException('No se pudo recargar el repartidor');
    }
    return this.sanitizeDriver(fresh) as DeliveryDriverEntity;
  }

  /**
   * Fase 2.5: self-service del repartidor — SOLO campos de contacto.
   * Permite cambiar únicamente `phone` y `phone_is_whatsapp`.
   * NO permite `name`, `id_number`, `id_type`, `vehicleType`, `vehiclePlate`
   * (esos son contractuales y los edita solo el admin del tenant).
   */
  async updateMyContactInfo(
    userId: string,
    input: {
      phone?: string | null;
      phone_is_whatsapp?: boolean;
    },
  ): Promise<DeliveryDriverEntity> {
    const driver = await this.driversRepository.findOne({
      where: { userId },
      relations: { user: true, tenant: true },
    });
    if (!driver) {
      throw new NotFoundException('No estás registrado como repartidor');
    }

    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (input.phone !== undefined) {
      sets.push(`phone = $${i++}`);
      params.push(input.phone?.trim() || null);
    }
    if (input.phone_is_whatsapp !== undefined) {
      sets.push(`phone_is_whatsapp = $${i++}`);
      params.push(input.phone_is_whatsapp);
    }

    if (sets.length > 0) {
      sets.push(`"updatedAt" = now()`);
      params.push(userId);
      await this.dataSource.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
        params,
      );
    }

    const fresh = await this.driversRepository.findOne({
      where: { id: driver.id },
      relations: { user: true, tenant: true },
    });
    if (!fresh) {
      throw new NotFoundException('No se pudo recargar el repartidor');
    }
    return this.sanitizeDriver(fresh) as DeliveryDriverEntity;
  }

  /**
   * Fase 2.5: self-service del repartidor — avatar.
   * Persiste en users.avatarUrl. Solo el dueño (vía JWT).
   */
  async updateMyAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<{ avatarUrl: string }> {
    const userRow: any[] = await this.dataSource.query(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!userRow.length) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.dataSource.query(
      `UPDATE users SET "avatarUrl" = $1, "updatedAt" = now() WHERE id = $2`,
      [avatarUrl, userId],
    );

    this.logger.log(`Avatar self-service actualizado para user ${userId}`);
    return { avatarUrl };
  }

  async updateDriverLocation(
    driverId: string,
    input: UpdateDriverLocationInput,
  ): Promise<DeliveryDriverEntity> {
    const driver = await this.getDriverById(driverId);

    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      throw new BadRequestException('Coordenadas inválidas');
    }

    driver.currentLat = input.lat;
    driver.currentLng = input.lng;
    driver.lastSeenAt = new Date();

    const saved = await this.driversRepository.save(driver);

    // Cachear en Redis (TTL 30s)
    await this.redis.setDriverLocation(driverId, input.lat, input.lng, 30);

    // Buscar órdenes activas para emitir a cada room
    const activeAssignments = await this.assignmentsRepository.find({
      where: {
        driverId,
        status: In(['assigned', 'accepted', 'picked_up']),
      },
      select: { id: true, orderId: true },
    });
    const activeOrderIds = activeAssignments.map((a) => a.orderId);

    // Emitir por WebSocket
    this.gateway.emitDriverLocation(
      driverId,
      { lat: input.lat, lng: input.lng },
      activeOrderIds,
    );

    // Recalcular ETA en vivo para cada assignment activo + emitir nearby
    for (const a of activeAssignments) {
      try {
        const liveEta = await this.etaService.computeLiveEta(a.id);

        // Emitir al room de la orden
        this.gateway.server.to(`order:${a.orderId}`).emit('eta_update', {
          orderId: a.orderId,
          assignmentId: a.id,
          distanceKm: liveEta.distanceKm,
          etaMinutes: liveEta.etaMinutes,
          at: liveEta.at,
        });

        // Si está cerca, emitir evento especial
        if (liveEta.isNearby) {
          this.gateway.server.to(`order:${a.orderId}`).emit('driver_nearby', {
            orderId: a.orderId,
            assignmentId: a.id,
            distanceM: liveEta.distanceKm
              ? Math.round(liveEta.distanceKm * 1000)
              : null,
            at: liveEta.at,
          });
        }
      } catch (err: any) {
        this.logger.warn(
          `ETA en vivo falló para assignment ${a.id}: ${err?.message || err}`,
        );
      }
    }

    return saved;
  }

    // ============================================================
  // 🔥 NUEVO: cambiar password del repartidor (admin)
  // ============================================================
  async updatePassword(
    driverId: string,
    plainPassword: string,
  ): Promise<{ success: boolean }> {

    

    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
      relations: { user: true },
    });
    if (!driver) {
      throw new NotFoundException(`Repartidor con ID ${driverId} no encontrado`);
    }
    if (!driver.userId) {
      throw new BadRequestException(
        'Este repartidor no tiene usuario asociado. No se puede cambiar la contraseña.',
      );
    }

    const passwordHash = await bcrypt.hash(plainPassword.trim(), 10);

    await this.dataSource.query(
      `UPDATE users SET password = $1, "updatedAt" = now() WHERE id = $2`,
      [passwordHash, driver.userId],
    );

    console.log(
      `✅ [DeliveryDriversService] Password actualizado para driver ${driverId} (user ${driver.userId})`,
    );

    return { success: true };
  }

  /**
   * Actualiza el avatar del user asociado al driver.
   * Persiste en users.avatarUrl (compartido entre tenants del user).
   * Solo lo llama el admin del tenant (POST /delivery/drivers/:id/avatar).
   * El repartidor NO puede cambiar su propio avatar (regla de Fase 2).
   */
  async updateAvatar(
    driverId: string,
    avatarUrl: string,
  ): Promise<DeliveryDriverEntity> {
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
      relations: { user: true },
    });
    if (!driver) {
      throw new NotFoundException(
        `Repartidor con ID ${driverId} no encontrado`,
      );
    }
    if (!driver.userId) {
      throw new BadRequestException(
        'Este repartidor no tiene usuario asociado.',
      );
    }

    await this.dataSource.query(
      `UPDATE users SET "avatarUrl" = $1, "updatedAt" = now() WHERE id = $2`,
      [avatarUrl, driver.userId],
    );

    const fresh = await this.driversRepository.findOne({
      where: { id: driverId },
      relations: { user: true, tenant: true },
    });
    if (!fresh) {
      throw new NotFoundException('No se pudo recargar el repartidor');
    }
    this.logger.log(
      `Avatar actualizado para driver ${driverId} (user ${driver.userId})`,
    );
    return this.sanitizeDriver(fresh) as DeliveryDriverEntity;
  }


  async deleteDriver(driverId: string): Promise<void> {
    const driver = await this.getDriverById(driverId);
    await this.driversRepository.remove(driver);
  }

  // ============================================================
  // ASIGNACIÓN
  // ============================================================

  async assignOrder(
    input: AssignOrderInput,
  ): Promise<DeliveryAssignmentEntity> {
    const { orderId, tenantId, driverId, tenantLat, tenantLng } = input;

    // Validar que la orden existe
    const orderRow: any[] = await this.dataSource.query(
      `SELECT id FROM orders WHERE id = $1 LIMIT 1`,
      [orderId],
    );
    if (!orderRow.length) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Buscar assignment existente (por UNIQUE en order_id)
    let assignment = await this.assignmentsRepository.findOne({
      where: { orderId },
    });

    // Si ya fue entregado o cancelado, no reasignamos
    if (
      assignment &&
      (assignment.status === 'delivered' ||
        assignment.status === 'cancelled')
    ) {
      throw new BadRequestException(
        `La orden ya está ${assignment.status}, no se puede reasignar`,
      );
    }

    // Elegir driver
    let chosenDriver: DeliveryDriverEntity | null = null;

    if (driverId) {
      // Override manual
      chosenDriver = await this.getDriverById(driverId);
      if (chosenDriver.status === 'offline' || chosenDriver.status === 'paused') {
        throw new BadRequestException(
          `El repartidor está ${chosenDriver.status}, no disponible`,
        );
      }
    } else {
      chosenDriver = await this.pickBestDriver(tenantId, tenantLat, tenantLng);
    }

    if (!assignment) {
      assignment = this.assignmentsRepository.create({
        orderId,
        driverId: chosenDriver?.id ?? null,
        status: chosenDriver ? 'assigned' : 'pending',
        assignedAt: chosenDriver ? new Date() : null,
      });
    } else {
      assignment.driverId = chosenDriver?.id ?? null;
      assignment.status = chosenDriver ? 'assigned' : 'pending';
      assignment.assignedAt = chosenDriver ? new Date() : null;
    }

    const saved = await this.assignmentsRepository.save(assignment);
    // Cargar el driver con user para que no se exponga el password
    const fresh = await this.assignmentsRepository.findOne({
      where: { id: saved.id },
      relations: { driver: { user: true } },
    });
    if (fresh?.driver) {
      this.sanitizeDriver(fresh.driver);
    }
    return fresh || saved;
  }

  /**
   * Lista las órdenes de delivery pendientes de asignar a un repartidor.
   * Criterios:
   *   - fulfillment = 'delivery'
   *   - status IN ('PENDING','PENDING_LOCAL','CONFIRMED')
   *   - sin driver asignado (no existe assignment o tiene driver_id NULL)
   * Ordenadas por antigüedad (createdAt ASC).
   */
  async listPendingAssignments(tenantId: string): Promise<
    Array<{
      id: string;
      status: string;
      customerName: string;
      totalAmount: string;
      createdAt: string;
      assignmentId: string | null;
      assignmentStatus: string | null;
    }>
  > {
    if (!tenantId) {
      throw new BadRequestException('tenantId es obligatorio');
    }

    const rows = await this.dataSource.query(
      `SELECT o.id,
              o.status,
              o."customerName" AS "customerName",
              o."totalAmount"::text AS "totalAmount",
              o."createdAt"::text AS "createdAt",
              da.id AS "assignmentId",
              da.status AS "assignmentStatus"
         FROM orders o
         LEFT JOIN delivery_assignments da ON da.order_id = o.id
        WHERE o."tenantId" = $1
          AND o."paymentMetadata"->>'fulfillment' = 'delivery'
          AND o.status IN ('PENDING','PENDING_LOCAL','CONFIRMED')
          AND (da.driver_id IS NULL)
        ORDER BY o."createdAt" ASC`,
      [tenantId],
    );

    return rows;
  }

  /**
   * Elige el mejor driver disponible:
   *   1. Filtra por status = 'online'
   *   2. Filtra por tenant (propios + pool)
   *   3. Filtra por carga (assigned + accepted + picked_up < maxActiveOrders)
   *   4. Ordena por cercanía al local (si hay coords) y luego por carga
   */
  async pickBestDriver(
    tenantId: string,
    tenantLat?: number | null,
    tenantLng?: number | null,
  ): Promise<DeliveryDriverEntity | null> {
    // Query SQL: drivers online del tenant + pool, con conteo de carga activa
    const rows: Array<{
      id: string;
      user_id: string;
      tenant_id: string | null;
      status: DriverStatus;
      current_lat: number | null;
      current_lng: number | null;
      max_active_orders: number;
      active_count: string;
    }> = await this.dataSource.query(
      `SELECT d.id, d.user_id, d.tenant_id, d.status,
              d.current_lat, d.current_lng, d.max_active_orders,
              COALESCE((
                SELECT COUNT(*) FROM delivery_assignments a
                 WHERE a.driver_id = d.id
                   AND a.status IN ('assigned','accepted','picked_up')
              ), 0) AS active_count
         FROM delivery_drivers d
        WHERE d.status = 'online'
          AND (d.tenant_id = $1 OR d.tenant_id IS NULL)`,
      [tenantId],
    );

    if (!rows.length) return null;

    // Filtrar por carga
    const available = rows.filter(
      (r) => Number(r.active_count) < Number(r.max_active_orders),
    );
    if (!available.length) return null;

    // Ordenar por cercanía (si hay coords) y luego por carga
    const hasCoords =
      tenantLat != null &&
      tenantLng != null &&
      Number.isFinite(Number(tenantLat)) &&
      Number.isFinite(Number(tenantLng));

    if (hasCoords) {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const R = 6371;
      const dist = (a: number, b: number, c: number, d: number) => {
        const dLat = toRad(c - a);
        const dLng = toRad(d - b);
        const x =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
      };

      available.sort((a, b) => {
        const aHas = a.current_lat != null && a.current_lng != null;
        const bHas = b.current_lat != null && b.current_lng != null;
        if (aHas && bHas) {
          const da = dist(
            Number(tenantLat),
            Number(tenantLng),
            Number(a.current_lat),
            Number(a.current_lng),
          );
          const db = dist(
            Number(tenantLat),
            Number(tenantLng),
            Number(b.current_lat),
            Number(b.current_lng),
          );
          if (Math.abs(da - db) > 0.1) return da - db;
        } else if (aHas !== bHas) {
          return aHas ? -1 : 1;
        }
        // Empate → menos carga
        return Number(a.active_count) - Number(b.active_count);
      });
    } else {
      available.sort(
        (a, b) => Number(a.active_count) - Number(b.active_count),
      );
    }

    // Cargar la entidad completa del elegido
    return this.getDriverById(available[0].id);
  }

  async getAssignmentByOrder(
    orderId: string,
  ): Promise<DeliveryAssignmentEntity | null> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { orderId },
      relations: { driver: { user: true }, order: true },
    });
    if (assignment?.driver) {
      this.sanitizeDriver(assignment.driver);
    }
    return assignment;
  }

    /**
   * 🔥 Versión SANITIZADA para el comprador.
   * Devuelve solo la info pública del tracking, sin datos internos
   * (driverId, notes, etc.) ni datos sensibles del repartidor
   * (email, teléfono completo).
   *
   * El endpoint que llama a este método valida ANTES con
   * `ownership.canTrackOrder()` que el user tenga permiso.
   */
  async getPublicAssignmentByOrder(
    orderId: string,
  ): Promise<any | null> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { orderId },
      relations: { driver: { user: true }, order: true },
    });
    if (!assignment) return null;

    // Info pública del repartidor (sin email/phone/driverId interno)
    const driverPublic = assignment.driver
      ? {
          // Solo el PRIMER nombre (ej. "Carlos" en vez de "Carlos Pérez")
          firstName: (assignment.driver.user?.name || '').split(' ')[0] || 'Repartidor',
          // Solo lo necesario para mostrar en el mapa / chip
          vehicleType: assignment.driver.vehicleType || null,
          vehiclePlate: assignment.driver.vehiclePlate || null,
          currentLat: assignment.driver.currentLat ?? null,
          currentLng: assignment.driver.currentLng ?? null,
        }
      : null;

    // Solo campos públicos del assignment
    return {
      id: assignment.id,
      orderId: assignment.orderId,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      acceptedAt: assignment.acceptedAt,
      pickedUpAt: assignment.pickedUpAt,
      deliveredAt: assignment.deliveredAt,
      cancelledAt: assignment.cancelledAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      // driverId NO se expone (es interno)
      driver: driverPublic,
      // notes NO se expone (notas privadas del repartidor)
      // order NO se expone (el comprador ya tiene los datos de la orden)
    };
  }
  /**
   * Lista las assignments activas del driver logueado.
   * Solo devuelve pedidos asignados, aceptados o ya retirados.
   */
  async listMyActiveAssignments(
    userId: string,
  ): Promise<DeliveryAssignmentEntity[]> {
    const driver = await this.driversRepository.findOne({
      where: { userId },
    });
    if (!driver) {
      throw new NotFoundException('No estás registrado como repartidor');
    }

    return this.listAssignmentsByDriver(driver.id, [
      'assigned',
      'accepted',
      'picked_up',
    ]);
  }

  /**
   * Lista las assignments del historial del driver logueado.
   * Solo las finalizadas (entregadas, canceladas o rechazadas).
   */
  async listMyHistoryAssignments(
    userId: string,
  ): Promise<DeliveryAssignmentEntity[]> {
    const driver = await this.driversRepository.findOne({
      where: { userId },
    });
    if (!driver) {
      throw new NotFoundException('No estás registrado como repartidor');
    }

    return this.listAssignmentsByDriver(driver.id, [
      'delivered',
      'cancelled',
      'rejected',
    ]);
  }

  async listAssignmentsByDriver(
    driverId: string,
    statuses?: AssignmentStatus[],
  ): Promise<DeliveryAssignmentEntity[]> {
    const qb = this.assignmentsRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.order', 'order')
      .where('a.driver_id = :driverId', { driverId });

    if (statuses && statuses.length > 0) {
      qb.andWhere('a.status IN (:...statuses)', { statuses });
    }

    qb.orderBy('a.created_at', 'DESC');
    const assignments = await qb.getMany();
    assignments.forEach((a) => {
      if (a.driver) this.sanitizeDriver(a.driver);
    });
    return assignments;
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    notes?: string,
  ): Promise<DeliveryAssignmentEntity> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: { driver: { user: true }, order: true },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (assignment.driver) {
      this.sanitizeDriver(assignment.driver);
    }

    assignment.status = status;
    if (notes !== undefined) assignment.notes = notes;

    const now = new Date();
    switch (status) {
      case 'accepted':
        assignment.acceptedAt = now;
        break;
      case 'picked_up':
        assignment.pickedUpAt = now;
        break;
      case 'delivered':
        assignment.deliveredAt = now;
        break;
      case 'cancelled':
        assignment.cancelledAt = now;
        break;
      default:
        break;
    }

    return this.assignmentsRepository.save(assignment);
  }

  // ============================================================
  // 🔥 CAMBIAR ESTADO DEL DRIVER (online/offline/busy/paused)
  // ============================================================
  async setMyStatus(
    userId: string,
    newStatus: DriverStatus,
  ): Promise<DeliveryDriverEntity> {
    const VALID_STATUSES: DriverStatus[] = ['offline', 'online', 'busy', 'paused'];
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new BadRequestException(
        `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`,
      );
    }

    const driver = await this.driversRepository.findOne({
      where: { userId },
    });
    if (!driver) {
      throw new NotFoundException('No estás registrado como repartidor');
    }

    // 🔥 REGLA CRÍTICA: No podés desconectarte con entregas activas.
    if (newStatus === 'offline') {
      const activeAssignments = await this.assignmentsRepository.count({
        where: {
          driverId: driver.id,
          status: In(['assigned', 'accepted', 'picked_up', 'in_transit'] as any),
        },
      });

      if (activeAssignments > 0) {
        throw new BadRequestException(
          `No podés desconectarte: tenés ${activeAssignments} entrega(s) activa(s). ` +
            `Entregá o pedile al administrador que reasigne antes de ponerte offline.`,
        );
      }
    }

    const previousStatus = driver.status;
    driver.status = newStatus;
    driver.lastSeenAt = new Date();
    const saved = await this.driversRepository.save(driver);

    // Sincronizar con Redis (igual que updateDriver)
    if (previousStatus !== saved.status) {
      if (saved.status === 'online') {
        await this.redis.markDriverOnline(driver.id, saved.tenantId);
      } else if (previousStatus === 'online') {
        await this.redis.markDriverOffline(driver.id, saved.tenantId);
      }
    }

    this.logger.log(
      `🔄 Driver ${userId} cambió su estado a "${newStatus}"`,
    );

    return saved;
  }
}
