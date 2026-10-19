import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, DataSource } from 'typeorm';
import { ProfessionalEntity } from './entities/professional.entity';
import { User } from '../auth/entities/user.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { CurrencyService } from '../currency/currency.service';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(ProfessionalEntity)
    private readonly professionalRepository: Repository<ProfessionalEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly currencyService: CurrencyService,
    private readonly dataSource: DataSource,
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
          clean = `/uploads/${tenantId}/professionals/general${clean}`;
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

  async create(createProfessionalDto: any, files?: Array<Express.Multer.File>): Promise<ProfessionalEntity> {
    const tenantId = createProfessionalDto.tenantId || 'general';

    // Fase P1: si viene userId, validar role='profesional' y que no esté ya vinculado
    if (createProfessionalDto.userId) {
      const userRow: any[] = await this.dataSource.query(
        `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
        [createProfessionalDto.userId],
      );
      if (!userRow.length) {
        throw new BadRequestException(
          `El usuario ${createProfessionalDto.userId} no existe`,
        );
      }
      if (userRow[0].role !== 'profesional') {
        throw new BadRequestException(
          `El usuario ${createProfessionalDto.userId} no tiene rol 'profesional' (rol actual: ${userRow[0].role})`,
        );
      }
      const existing: any[] = await this.dataSource.query(
        `SELECT id FROM professionals WHERE userid = $1 AND tenantid = $2 LIMIT 1`,
        [createProfessionalDto.userId, tenantId],
      );
      if (existing.length) {
        throw new BadRequestException(
          'Este profesional ya está vinculado a esta tienda',
        );
      }
    }
    const professionalSlug = this.slugify(createProfessionalDto.name || 'sin-nombre');

    // ✅ Solo usar isActive, eliminar status
    let isActive = true;
    if (createProfessionalDto.isActive !== undefined) {
      isActive = String(createProfessionalDto.isActive) === 'true' || createProfessionalDto.isActive === 1;
    } else if (createProfessionalDto.status !== undefined) {
      isActive = createProfessionalDto.status === 'active';
    }

    const mediaUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadDir = path.join('./public/uploads', tenantId, 'professionals', professionalSlug);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      files.forEach((file) => {
        mediaUrls.push(`/uploads/${tenantId}/professionals/${professionalSlug}/${file.filename}`);
      });
    }

    const incomingMedia = createProfessionalDto.mediaUrls || [];
    const normalizedMedia = Array.isArray(incomingMedia) 
      ? incomingMedia.map(u => this.normalizeUrl(u, tenantId)).filter(Boolean)
      : [];

    const finalMediaUrls = mediaUrls.length > 0 ? [...normalizedMedia, ...mediaUrls] : normalizedMedia;

    let parsedAttributes: Record<string, any> = {};
    const rawMeta = createProfessionalDto.attributes || createProfessionalDto.metadata;
    if (rawMeta) {
      if (typeof rawMeta === 'string') {
        try { parsedAttributes = JSON.parse(rawMeta); } catch { parsedAttributes = {}; }
      } else if (typeof rawMeta === 'object') {
        parsedAttributes = { ...rawMeta };
      }
    }

    // ✅ Eliminar 'status' del objeto que se guarda
    const professional = this.professionalRepository.create({
      ...createProfessionalDto,
      isActive,
      // ❌ ELIMINADO: status: createProfessionalDto.status || (isActive ? 'active' : 'inactive'),
      mediaUrls: finalMediaUrls,
      coverImage: finalMediaUrls.length > 0 ? finalMediaUrls[0] : null,
      attributes: parsedAttributes,
    } as DeepPartial<ProfessionalEntity>);

    return await this.professionalRepository.save(professional);
  }

  async findAllByTenant(tenantId: string): Promise<ProfessionalEntity[]> {
    return await this.professionalRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      relations: { user: true },
      select: {
        // Campos del professional (todos los que ya devolvía)
        id: true,
        tenantId: true,
        userId: true,
        name: true,
        description: true,
        specialties: true,
        serviceIds: true,
        schedule: true,
        breaks: true,
        rating: true,
        reviewsCount: true,
        isActive: true,
        status: true,
        currentLat: true,
        currentLng: true,
        lastSeenAt: true,
        mediaUrls: true,
        coverImage: true,
        attributes: true,
        createdAt: true,
        updatedAt: true,
        // 🔥 Campos del user — SOLO los seguros
        user: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          // ❌ NO: password, totpSecret, failedLoginAttempts, lockedUntil,
          //       emailVerifiedAt, lastLoginAt, lastLoginIp
        },
      },
    });
  }
  async findOne(id: string): Promise<ProfessionalEntity> {
    const professional = await this.professionalRepository.findOne({ where: { id } });
    if (!professional) {
      throw new NotFoundException(`Profesional con ID ${id} no encontrado`);
    }
    return professional;
  }

  async searchGlobal(query: string): Promise<ProfessionalEntity[]> {
    return await this.professionalRepository
      .createQueryBuilder('professional')
      .leftJoinAndSelect('professional.tenant', 'tenant')
      .where('professional.name ILIKE :query', { query: `%${query}%` })
      .orWhere('professional.description ILIKE :query', { query: `%${query}%` })
      .orWhere('professional.specialties ILIKE :query', { query: `%${query}%` })
      .andWhere('professional.isActive = true')
      .take(10)
      .getMany();
  }

  async getAvailability(
    id: string,
    tenantId: string,
    date: string,
  ): Promise<{ available: boolean; slots: string[] }> {
    const professional = await this.findOne(id);

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
    }).toLowerCase() as keyof typeof professional.schedule;

    const daySchedule = professional.schedule?.[dayOfWeek] || [];

    const dayBreaks = professional.breaks?.filter(
      (b: any) => b.date === date,
    ) || [];

    const slots: string[] = [];
    for (const slot of daySchedule) {
      let current = slot.start;
      while (current < slot.end) {
        const isBreak = dayBreaks.some(
          (b: any) => current >= b.start && current < b.end,
        );
        if (!isBreak) {
          slots.push(current);
        }
        const [hours, minutes] = current.split(':').map(Number);
        const nextMinutes = minutes + 30;
        const nextHours = hours + Math.floor(nextMinutes / 60);
        current = `${String(nextHours).padStart(2, '0')}:${String(nextMinutes % 60).padStart(2, '0')}`;
      }
    }

    return {
      available: slots.length > 0,
      slots,
    };
  }

  async update(id: string, updateProfessionalDto: any, files?: Array<Express.Multer.File>): Promise<ProfessionalEntity> {
    const professional = await this.professionalRepository.findOne({ where: { id } });
    if (!professional) {
      throw new NotFoundException(`Profesional con ID ${id} no encontrado`);
    }

    const tenantId = updateProfessionalDto.tenantId || professional.tenantId || 'general';
    const professionalSlug = this.slugify(updateProfessionalDto.name || professional.name || 'sin-nombre');

const { metadata, features, existingImages, files: fList, phone: _phone, avatarUrl: _av, notes: _no, ...safeData } = updateProfessionalDto;

    const existingAttributes = professional.attributes || {};
    
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try { parsedMetadata = JSON.parse(metadata); } catch { parsedMetadata = {}; }
    }

    const incomingAttributes = safeData.attributes || {};

    let finalFeatures = features;
    if (typeof features === 'string') {
      try { finalFeatures = JSON.parse(features); } catch { finalFeatures = []; }
    }

    const finalAttributes = {
      ...existingAttributes,
      ...(parsedMetadata || {}),
      ...incomingAttributes,
    };

    let updatedMediaUrls: string[] = [];
    const rawExisting = existingImages || updateProfessionalDto['existingImages[]'];
    
    if (rawExisting !== undefined && rawExisting !== null) {
      const existingArray = Array.isArray(rawExisting) ? rawExisting : [rawExisting];
      updatedMediaUrls = existingArray
        .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
        .filter(Boolean);
    } else if (updateProfessionalDto.mediaUrls !== undefined && updateProfessionalDto.mediaUrls !== null) {
      const rawImages = updateProfessionalDto.mediaUrls;
      const rawArray = Array.isArray(rawImages) ? rawImages : [rawImages];
      updatedMediaUrls = rawArray
        .map(u => (typeof u === 'string' ? this.normalizeUrl(u, tenantId) : ''))
        .filter(Boolean);
    } else {
      updatedMediaUrls = professional.mediaUrls || [];
    }

    if (files && files.length > 0) {
      const uploadDir = path.join('./public/uploads', tenantId, 'professionals', professionalSlug);
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const newFilePaths = files.map(file => `/uploads/${tenantId}/professionals/${professionalSlug}/${file.filename}`);
      updatedMediaUrls = [...updatedMediaUrls, ...newFilePaths];
    }

    // ✅ Solo usar isActive
    let isActive = professional.isActive;
    if (safeData.isActive !== undefined) {
      isActive = String(safeData.isActive) === 'true' || safeData.isActive === 1;
    } else if (safeData.status) {
      isActive = safeData.status === 'active';
    }

    const dataToSave = {
      ...safeData,
      isActive,
      // ❌ ELIMINADO: status,
      attributes: finalAttributes,
      mediaUrls: updatedMediaUrls.length > 0 ? updatedMediaUrls : null,
      coverImage: updatedMediaUrls.length > 0 ? updatedMediaUrls[0] : null,
    };

    Object.assign(professional, dataToSave);
    
    delete (professional as any).metadata;

    const saved = await this.professionalRepository.save(professional);

    // ============================================================
    // 🔥 Persistir name, phone, avatarUrl, notes en la tabla users
    // ============================================================
    if (professional.userId) {
      const userUpdates: string[] = [];
      const userParams: any[] = [];
      let i = 1;

      if (updateProfessionalDto.name !== undefined && updateProfessionalDto.name !== null) {
        userUpdates.push(`name = $${i++}`);
        userParams.push(String(updateProfessionalDto.name).trim());
      }
      if (updateProfessionalDto.phone !== undefined) {
        userUpdates.push(`phone = $${i++}`);
        userParams.push(updateProfessionalDto.phone || null);
      }
      if (updateProfessionalDto.avatarUrl !== undefined) {
        userUpdates.push(`"avatarUrl" = $${i++}`);
        userParams.push(updateProfessionalDto.avatarUrl || null);
      }
      if (updateProfessionalDto.notes !== undefined) {
        userUpdates.push(`notes = $${i++}`);
        userParams.push(updateProfessionalDto.notes || null);
      }

      if (userUpdates.length > 0) {
        userUpdates.push(`"updatedAt" = now()`);
        userParams.push(professional.userId);
        try {
          await this.dataSource.query(
            `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${i}`,
            userParams,
          );
          console.log(
            `✅ [ProfessionalsService] user actualizado (${userUpdates.length - 1} campos) para profesional ${id}`,
          );
        } catch (err) {
          console.warn(
            `⚠️ [ProfessionalsService] No se pudo actualizar user:`,
            err,
          );
        }
      }
    }

    return saved;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const professional = await this.professionalRepository.findOne({ where: { id, tenantId } });
    if (!professional) {
      throw new NotFoundException(`Profesional con ID ${id} no encontrado`);
    }
    await this.professionalRepository.remove(professional);
  }

    // ============================================================
  // 🔥 MÉTODOS NUEVOS — mismo patrón que DeliveryDriversService
  // ============================================================

  /**
   * Crea un User con rol 'profesional' + un ProfessionalEntity en una transacción.
   * Idéntico a createDriverWithUser del módulo delivery.
   */
  async createWithUser(input: {
    name: string;
    email: string;
    phone?: string | null;
    password?: string | null;
    tenantId?: string | null;
    specialties?: string[];
    serviceIds?: string[];
    description?: string | null;
  }): Promise<ProfessionalEntity> {
    const { name, email, phone, password, tenantId, specialties, serviceIds, description } = input;

    if (!name?.trim()) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!email?.trim()) {
      throw new BadRequestException('El email es obligatorio');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fase P1: reusar user si ya existe con role='profesional'
    const existingUser: any[] = await this.dataSource.query(
      `SELECT id, role FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail],
    );

    let userId: string | null = null;

    if (existingUser.length) {
      const u = existingUser[0];
      if (u.role !== 'profesional') {
        throw new BadRequestException(
          `El email ${normalizedEmail} ya está registrado con otro rol (${u.role}). Usá otro email.`,
        );
      }
      // Verificar que no esté ya vinculado a este tenant
      const existingLink: any[] = await this.dataSource.query(
        `SELECT id FROM professionals
           WHERE userid = $1 AND tenantid = $2
           LIMIT 1`,
        [u.id, tenantId || null],
      );
      if (existingLink.length) {
        throw new BadRequestException(
          'Este profesional ya está vinculado a esta tienda',
        );
      }
      userId = u.id;
    }

    // Hash de password (default 'profesional123')
    const plainPassword = password?.trim() || 'profesional123';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Crear el user con role='profesional' (solo si no reusamos)
      let newUserId: string;
      if (userId !== null) {
        newUserId = userId;
      } else {
        const userInsert: any[] = await queryRunner.manager.query(
          `INSERT INTO users (
             id, name, email, password, provider, role,
             phone, onboarding_completed, "createdAt", "updatedAt"
           ) VALUES (
             uuid_generate_v4(), $1, $2, $3, 'credentials', 'profesional',
             $4, true, now(), now()
           ) RETURNING id`,
          [name.trim(), normalizedEmail, passwordHash, phone?.trim() || null],
        );
        newUserId = userInsert[0].id;
      }

      // 2. Crear el professional linkeado al user
      const professionalInsert: any[] = await queryRunner.manager.query(
        `INSERT INTO professionals (
           id, tenantid, userid, name, description,
           specialties, serviceids, schedule, breaks,
           rating, reviews_count, isactive, status,
           mediaurls, createdat, updatedat
                    ) VALUES (
           uuid_generate_v4(), $1, $2, $3, $4,
           $5, $6, '{}', '[]',
           0, 0, true, 'active',
           '{}', now(), now()
         ) RETURNING id`,
        [
          tenantId || null,
          newUserId,
          name.trim(),
          description || null,
          specialties || [],
          serviceIds || [],
        ],
      );
      const newProfessionalId = professionalInsert[0].id;

      await queryRunner.commitTransaction();

      // Devolver el professional completo con relaciones
      const created = await this.professionalRepository.findOne({
        where: { id: newProfessionalId },
        relations: { user: true, tenant: true },
      });
      return created!;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Busca el profesional del user logueado.
   * Idéntico a getDriverByUserId del módulo delivery.
   */
  async findByUserId(userId: string): Promise<ProfessionalEntity | null> {
    return await this.professionalRepository.findOne({
      where: { userId },
      relations: { user: true, tenant: true },
    });
  }

  /**
   * Lista los bookings del profesional logueado.
   * Idéntico a listMyActiveAssignments del módulo delivery.
   */
  async listBookingsByUserId(userId: string): Promise<BookingEntity[]> {
    const professional = await this.findByUserId(userId);
    if (!professional) return [];

    return await this.bookingRepository.find({
      where: { professionalId: professional.id },
      order: { bookingDate: 'DESC', startTime: 'DESC' },
      relations: { service: true, tenant: true },
    });
  }


  /**
   * Actualiza el status del profesional logueado (online/offline).
   * Se usa desde PATCH /professionals/me/status.
   */
  async updateMyStatus(
    userId: string,
    isActive: boolean,
  ): Promise<ProfessionalEntity> {
    const professional = await this.findByUserId(userId);
    if (!professional) {
      throw new NotFoundException('No estás registrado como profesional');
    }

    professional.isActive = isActive;
    professional.status = isActive ? 'active' : 'inactive';

    return await this.professionalRepository.save(professional);
  }

  // ============================================================
  // 🔥 CAMBIAR PASSWORD DEL PROFESIONAL (admin)
  // ============================================================
  async updatePassword(
    id: string,
    plainPassword: string,
  ): Promise<{ success: boolean }> {
    const professional = await this.professionalRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!professional) {
      throw new NotFoundException(`Profesional con ID ${id} no encontrado`);
    }
    if (!professional.userId) {
      throw new BadRequestException(
        'Este profesional no tiene usuario asociado. No se puede cambiar la contraseña.',
      );
    }

    const passwordHash = await bcrypt.hash(plainPassword.trim(), 10);

    await this.dataSource.query(
      `UPDATE users SET password = $1, "updatedAt" = now() WHERE id = $2`,
      [passwordHash, professional.userId],
    );

    console.log(
      `✅ [ProfessionalsService] Password actualizado para profesional ${id} (user ${professional.userId})`,
    );

    return { success: true };
  }
    // ============================================================
  // 🔥 FASE P1 — Multi-tienda (paridad con delivery)
  // ============================================================

  /**
   * Busca user por email y devuelve sus vínculos como profesional.
   * Usado por CreateProfessionalModal antes de submit.
   */
  async lookupByEmail(email: string): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
    };
    isProfesional: boolean;
    tenants: Array<{
      professionalId: string;
      tenantId: string;
      tenantName: string | null;
      tenantSlug: string | null;
      isActive: boolean;
      specialties: string[];
    }>;
  } | null> {
    if (!email?.trim()) {
      throw new BadRequestException('El email es obligatorio');
    }
    const normalizedEmail = email.trim().toLowerCase();

    const userRow: any[] = await this.dataSource.query(
      `SELECT id, name, email, role, "avatarUrl" FROM users
        WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail],
    );
    if (!userRow.length) return null;

    const u = userRow[0];

    const links: any[] = await this.dataSource.query(
      `SELECT p.id AS professional_id,
              p.tenantid,
              t.name AS tenant_name,
              t.slug AS tenant_slug,
              p.isactive,
              p.specialties
         FROM professionals p
         LEFT JOIN tenants t ON t.id = p.tenantid
        WHERE p.userid = $1
        ORDER BY p.createdat ASC`,
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
      isProfesional: u.role === 'profesional',
      tenants: links.map((l) => ({
        professionalId: l.professional_id,
        tenantId: l.tenantid,
        tenantName: l.tenant_name,
        tenantSlug: l.tenant_slug,
        isActive: l.isactive,
        specialties: l.specialties || [],
      })),
    };
  }

  /**
   * Busca UN professional por userId, opcionalmente filtrando por tenant.
   */
  async getProfessionalByUserId(
    userId: string,
    tenantId?: string | null,
  ): Promise<ProfessionalEntity | null> {
    const qb = this.professionalRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.tenant', 'tenant')
      .where('p.userid = :userId', { userId });

    if (typeof tenantId === 'string') {
      qb.andWhere('p.tenantid = :tenantId', { tenantId });
    }

    qb.orderBy('p.createdat', 'ASC').limit(1);
    return await qb.getOne();
  }

  async getProfessionalsByUserId(userId: string): Promise<ProfessionalEntity[]> {
    return await this.professionalRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.tenant', 'tenant')
      .where('p.userid = :userId', { userId })
      .orderBy('p.createdat', 'ASC')
      .getMany();
  }

  /**
   * Self-service: solo phone + phone_is_whatsapp.
   */
  async updateMyContact(
    userId: string,
    input: { phone?: string | null; phone_is_whatsapp?: boolean },
  ): Promise<ProfessionalEntity> {
    const professional = await this.getProfessionalByUserId(userId);
    if (!professional) {
      throw new NotFoundException('No estás registrado como profesional');
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

    const fresh = await this.getProfessionalByUserId(userId);
    return fresh!;
  }

  /**
   * Self-service: sube avatar.
   */
  async updateMyAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<{ avatarUrl: string }> {
    await this.dataSource.query(
      `UPDATE users SET "avatarUrl" = $1, "updatedAt" = now() WHERE id = $2`,
      [avatarUrl, userId],
    );
    return { avatarUrl };
  }

  /**
   * Bookings del profesional logueado (para el panel).
   */
  async listMyBookings(userId: string): Promise<BookingEntity[]> {
    const professional = await this.getProfessionalByUserId(userId);
    if (!professional) return [];

    return await this.bookingRepository.find({
      where: { professionalId: professional.id },
      order: { bookingDate: 'DESC', startTime: 'DESC' },
      relations: { service: true, tenant: true },
    });
  }
}