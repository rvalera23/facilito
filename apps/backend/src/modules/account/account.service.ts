// apps/backend/src/modules/account/account.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserCredit } from './entities/user-credit.entity';
import * as fs from 'fs';
import * as path from 'path';
import { toPublicUser } from './utils/to-public-user';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(UserCredit)
    private userCreditRepository: Repository<UserCredit>,
  ) {}

  async findById(id: string): Promise<any> {
    console.log('🔍 [Service.findById] Buscando usuario:', id);
    
    const user = await this.accountRepository.findOne({
      where: { id },
      relations: {
        tenant: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`El usuario con ID '${id}' no fue encontrado.`);
    }

    console.log('✅ [Service.findById] Usuario encontrado:', user.id);

    return {
      ...toPublicUser(user),
      store_slug: user.tenant?.slug || null,
      // ✅ El frontend necesita este campo para el badge "Verificada".
      // No se incluye en toPublicUser() por seguridad (evita filtrar
      // emailVerifiedAt, que sí es sensible). El boolean es público.
      emailVerified: (user as any).emailVerified === true,
    };
  }

  async update(id: string, updateData: Record<string, any>): Promise<Account> {
    console.log('🔧 [Service.update] Iniciando para id:', id);
    console.log('🔧 [Service.update] updateData:', JSON.stringify(updateData, null, 2));
    
    const user = await this.findById(id);

    const updatePayload: Record<string, any> = {};

    const fieldMapping: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      city: 'city',
      address: 'address',
      deliveryCity: 'deliveryCity',
      state: 'state',
      municipality: 'municipality',
      preferredCurrency: 'preferredCurrency',
      latitude: 'latitude',
      longitude: 'longitude',
      id_number: 'id_number',
      id_type: 'id_type',
      pago_movil_same_as_profile: 'pago_movil_same_as_profile',
      primary_color: 'primary_color',
      secondary_color: 'secondary_color',
      accent_color: 'accent_color',
      background_color: 'background_color',
      font_family: 'font_family',
      fontWeight: 'fontWeight',
      // 🔥 Avatar: acepta camelCase y snake_case, todos apuntan a `avatarUrl`.
      avatarUrl: 'avatarUrl',
      avatar_url: 'avatarUrl',
      avatar: 'avatarUrl',
      image: 'avatarUrl',

      role: 'role',
      onboarding_completed: 'onboarding_completed',
      tenantId: 'tenantId',
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (updateData[key] !== undefined) {
        updatePayload[dbField] = updateData[key];
        console.log(`✅ Mapeando ${key} -> ${dbField}: ${updateData[key]}`);
      }
    }

    if (updatePayload.email) {
      const normalizedEmail = updatePayload.email.toLowerCase();
      const existingByEmail = await this.accountRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existingByEmail && existingByEmail.id !== user.id) {
        throw new BadRequestException('El correo electrónico ya está en uso por otra cuenta.');
      }
      updatePayload.email = normalizedEmail;
    }

    // 🔥 Validación de cédula única + normalización
    if (updatePayload.id_number !== undefined) {
      const raw = updatePayload.id_number;
      // Permitir null/'' para borrar la cédula
      if (raw === null || raw === '' || raw === undefined) {
        updatePayload.id_number = null;
      } else {
        const digits = String(raw).replace(/\D/g, '');
        if (digits.length < 6 || digits.length > 9) {
          throw new BadRequestException('La cédula debe tener entre 6 y 9 dígitos.');
        }
        const idType = String(updatePayload.id_type || 'V').toUpperCase();
        if (!['V', 'E', 'J', 'G'].includes(idType)) {
          throw new BadRequestException('El tipo de cédula debe ser V, E, J o G.');
        }
        // Verificar unicidad (excluyendo al propio user)
        const existingByIdNumber = await this.accountRepository.findOne({
          where: { id_number: digits },
        });
        if (existingByIdNumber && existingByIdNumber.id !== user.id) {
          throw new BadRequestException('Esa cédula ya está registrada en otra cuenta.');
        }
        updatePayload.id_number = digits;
        updatePayload.id_type = idType;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException('No se enviaron campos válidos para actualizar.');
    }

    console.log('📤 [Service.update] updatePayload final:', JSON.stringify(updatePayload, null, 2));

    await this.accountRepository.update(user.id, updatePayload);

    // 🔥 SINCRONIZACIÓN: Si el usuario tiene tenant y se actualizaron colores, actualizar el tenant
    if (user.tenant && (updateData.primary_color || updateData.secondary_color || updateData.accent_color || updateData.background_color)) {
      console.log('🔄 [Service.update] Sincronizando tema con el tenant:', user.tenant.id);
      
      const tenantUpdateData: Record<string, any> = {};
      
      if (updateData.primary_color) tenantUpdateData.primaryColor = updateData.primary_color;
      if (updateData.secondary_color) tenantUpdateData.secondaryColor = updateData.secondary_color;
      if (updateData.accent_color) tenantUpdateData.accentColor = updateData.accent_color;
      if (updateData.background_color) tenantUpdateData.backgroundColor = updateData.background_color;
      
      console.log('🔄 [Service.update] Actualizando tenant con:', tenantUpdateData);
      
      await this.tenantRepository.update(user.tenant.id, tenantUpdateData);
      console.log('✅ [Service.update] Tenant actualizado correctamente');
    }

    return this.findById(user.id);
  }

  // 🔥 Actualizar avatar
  async updateAvatar(id: string, avatarUrl: string): Promise<Account> {
    console.log('📸 [Service.updateAvatar] Actualizando avatar para:', id);
    console.log('📸 [Service.updateAvatar] avatarUrl:', avatarUrl);
    
    const user = await this.findById(id);

    // Si ya tenía un avatar, eliminar el archivo anterior
    if (user.avatarUrl) {
      const oldAvatarPath = path.join(process.cwd(), 'public', user.avatarUrl);
      try {
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
          console.log(`🗑️ Avatar anterior eliminado: ${oldAvatarPath}`);
        }
      } catch (e) {
        console.warn('⚠️ No se pudo eliminar el avatar anterior:', e);
      }
    }

    await this.accountRepository.update(user.id, {
      avatarUrl: avatarUrl,
      avatar: avatarUrl,
      image: avatarUrl,
    });

    return this.findById(id);
  }

  // 🔥 Eliminar avatar
  async deleteAvatar(id: string): Promise<Account> {
    console.log('🗑️ [Service.deleteAvatar] Eliminando avatar para:', id);
    
    const user = await this.findById(id);

    if (user.avatarUrl) {
      const avatarPath = path.join(process.cwd(), 'public', user.avatarUrl);
      try {
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
          console.log(`🗑️ Avatar eliminado: ${avatarPath}`);
          
          const dirPath = path.dirname(avatarPath);
          if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            if (files.length === 0) {
              fs.rmdirSync(dirPath);
              console.log(`📁 Carpeta vacía eliminada: ${dirPath}`);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ No se pudo eliminar el archivo de avatar:', e);
      }
    }

    await this.accountRepository.update(user.id, {
      avatarUrl: null,
      avatar: null,
      image: null,
    });

    return this.findById(id);
  }

  async findOrdersByUserId(userId: string): Promise<any[]> {
    console.log('📦 [Service.findOrdersByUserId] Buscando órdenes para:', userId);
    
    const user = await this.findById(userId);
    if (!user) return [];

    try {
      const orders = await this.accountRepository.manager.query(
        `SELECT o.*, t.name as "tenantName", t.slug as "tenantSlug"
         FROM orders o
         LEFT JOIN tenants t ON o."tenantId" = t.id
         WHERE (o."userId" = $1 ${user.email ? 'OR LOWER(o."customerEmail") = LOWER($2)' : ''})
           AND COALESCE(o."orderType", '') <> 'service'
           AND NOT EXISTS (
             SELECT 1
             FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) item
             WHERE item->>'type' = 'service'
           )
         ORDER BY o."createdAt" DESC`,
        user.email ? [userId, user.email] : [userId],
      );
      
      console.log(`✅ [Service.findOrdersByUserId] ${orders.length} órdenes encontradas`);
      return orders;
    } catch (err) {
      console.error('Error al buscar órdenes:', err);
      return [];
    }
  }

  async findAppointmentsByUserId(userId: string): Promise<any[]> {
    const user = await this.findById(userId);
    if (!user) return [];

    try {
      return await this.accountRepository.manager.query(
        `SELECT b.*, t.name as "tenantName", t.slug as "tenantSlug",
                row_to_json(s) as service
         FROM bookings b
         LEFT JOIN tenants t ON b.tenantid = t.id
         LEFT JOIN services s ON s.id = b.serviceid
         WHERE (b.userid = $1 ${user.email ? 'OR LOWER(b.customeremail) = LOWER($2)' : ''})
         ORDER BY b.createdat DESC`,
        user.email ? [userId, user.email] : [userId],
      );
    } catch (err) {
      console.error('Error al buscar citas:', err);
      return [];
    }
  }

  // ============================================================
  // 🔥 SALDO A FAVOR (user_credits)
  // ============================================================
  // El saldo es por (userId, tenantId). Cada comerciante maneja
  // su propio saldo, sin contaminación cruzada.
  // ============================================================

  /**
   * Devuelve el saldo actual del usuario en un tenant.
   * Si no existe la fila, la crea con balance 0.
   */
  async getCreditBalance(
    userId: string,
    tenantId: string,
  ): Promise<{ userId: string; tenantId: string; balance: number }> {
    if (!userId) throw new BadRequestException('userId es requerido');
    if (!tenantId) throw new BadRequestException('tenantId es requerido');

    let credit = await this.userCreditRepository.findOne({
      where: { userId, tenantId },
    });

    if (!credit) {
      credit = this.userCreditRepository.create({
        userId,
        tenantId,
        balance: 0,
      });
      credit = await this.userCreditRepository.save(credit);
    }

    return {
      userId: credit.userId,
      tenantId: credit.tenantId,
      balance: Number(credit.balance),
    };
  }

  /**
   * Acredita saldo a favor al usuario en un tenant.
   * Devuelve el nuevo saldo.
   */
  async creditUser(
    userId: string,
    tenantId: string,
    amount: number,
  ): Promise<{ userId: string; tenantId: string; balance: number }> {
    if (!userId) throw new BadRequestException('userId es requerido');
    if (!tenantId) throw new BadRequestException('tenantId es requerido');

    const safeAmount = Number(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      throw new BadRequestException('El monto a acreditar debe ser mayor a 0');
    }

    const existing = await this.getCreditBalance(userId, tenantId);
    const newBalance = Math.round((existing.balance + safeAmount) * 100) / 100;

    await this.userCreditRepository.update(
      { userId, tenantId },
      { balance: newBalance },
    );

    return { userId, tenantId, balance: newBalance };
  }

  /**
   * Debita saldo a favor del usuario en un tenant.
   * Falla si no hay saldo suficiente.
   * Devuelve el saldo restante.
   */
  async debitUserCredit(
    userId: string,
    tenantId: string,
    amount: number,
  ): Promise<{ userId: string; tenantId: string; balance: number }> {
    if (!userId) throw new BadRequestException('userId es requerido');
    if (!tenantId) throw new BadRequestException('tenantId es requerido');

    const safeAmount = Number(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      throw new BadRequestException('El monto a debitar debe ser mayor a 0');
    }

    const existing = await this.getCreditBalance(userId, tenantId);

    if (existing.balance < safeAmount) {
      throw new BadRequestException(
        `Saldo insuficiente. Disponible: Bs. ${existing.balance.toFixed(2)}, requerido: Bs. ${safeAmount.toFixed(2)}`,
      );
    }

    const newBalance = Math.round((existing.balance - safeAmount) * 100) / 100;

    await this.userCreditRepository.update(
      { userId, tenantId },
      { balance: newBalance },
    );

    return { userId, tenantId, balance: newBalance };
  }

  /**
   * Devuelve el total de saldos a favor del tenant y cuántos
   * clientes tienen saldo > 0.
   * Solo para uso del dashboard del admin.
   */
  async getCreditSummary(tenantId: string): Promise<{
    totalBalance: number;
    usersCount: number;
  }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId es requerido');
    }

    const raw = await this.userCreditRepository
      .createQueryBuilder('uc')
      .select('COALESCE(SUM(uc.balance), 0)', 'totalBalance')
      .addSelect(
        'COUNT(CASE WHEN uc.balance > 0 THEN 1 END)',
        'usersCount',
      )
      .where('uc.tenantId = :tenantId', { tenantId })
      .getRawOne<{ totalBalance: string; usersCount: string }>();

    return {
      totalBalance: Math.round(Number(raw?.totalBalance || 0) * 100) / 100,
      usersCount: Number(raw?.usersCount || 0),
    };
  }

  /**
   * Devuelve TODOS los tenants donde el user tiene saldo a favor > 0,
   * junto con el nombre/slug de la tienda para mostrarlo en Mi Cuenta.
   */
  async getCreditTenantsByUser(userId: string): Promise<
    Array<{
      tenantId: string;
      tenantName: string | null;
      tenantSlug: string | null;
      tenantLogo: string | null;
      balance: number;
      updatedAt: Date;
    }>
  > {
    if (!userId) throw new BadRequestException('userId es requerido');

    const rows = await this.userCreditRepository
      .createQueryBuilder('uc')
      .leftJoin('tenants', 't', 't.id = uc.tenantId')
      .select('uc.tenantId', 'tenantId')
      .addSelect('uc.balance', 'balance')
      .addSelect('uc.updatedAt', 'updatedAt')
      .addSelect('t.name', 'tenantName')
      .addSelect('t.slug', 'tenantSlug')
      .addSelect('t.logo_url', 'tenantLogo')
      .where('uc.userId = :userId', { userId })
      .andWhere('uc.balance > 0')
      .orderBy('uc.updatedAt', 'DESC')
      .getRawMany<{
        tenantId: string;
        balance: string;
        updatedAt: Date;
        tenantName: string | null;
        tenantSlug: string | null;
        tenantLogo: string | null;
      }>();

    return rows.map((r) => ({
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      tenantSlug: r.tenantSlug,
      tenantLogo: r.tenantLogo,
      balance: Math.round(Number(r.balance) * 100) / 100,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Devuelve TODOS los users con saldo > 0 en un tenant,
   * con datos básicos del user para mostrarlo en el panel del admin.
   */
  async getCreditUsersByTenant(tenantId: string): Promise<
    Array<{
      userId: string;
      userName: string | null;
      userEmail: string | null;
      balance: number;
      updatedAt: Date;
    }>
  > {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');

    const rows = await this.userCreditRepository
      .createQueryBuilder('uc')
      .leftJoin('users', 'u', 'u.id = uc.userId')
      .select('uc.userId', 'userId')
      .addSelect('uc.balance', 'balance')
      .addSelect('uc.updatedAt', 'updatedAt')
      .addSelect('u.name', 'userName')
      .addSelect('u.email', 'userEmail')
      .where('uc.tenantId = :tenantId', { tenantId })
      .andWhere('uc.balance > 0')
      .orderBy('uc.balance', 'DESC')
      .getRawMany<{
        userId: string;
        balance: string;
        updatedAt: Date;
        userName: string | null;
        userEmail: string | null;
      }>();

    return rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      balance: Math.round(Number(r.balance) * 100) / 100,
      updatedAt: r.updatedAt,
    }));
  }
}