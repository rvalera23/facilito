// apps/backend/src/modules/tenants/tenants.service.ts

import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Not, DataSource, In } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { UserTenant } from './entities/user-tenant.entity';
import { TenantPaymentConfigService } from './tenant-payment-config.service';
import { StoreLike } from './entities/store-like.entity';

import { StoreRating } from './entities/store-rating.entity';

import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';



@Injectable()
export class TenantsService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    @InjectRepository(StoreLike)
    private storeLikeRepository: Repository<StoreLike>,
    @InjectRepository(StoreRating)
    private storeRatingRepository: Repository<StoreRating>,
    private readonly paymentConfigService: TenantPaymentConfigService,
  ) {}

  /**
   * 🔥 NUEVO: Procesa imágenes temporales y las mueve a la carpeta permanente del tenant
   */
  private processTempImage(tenantId: string, imageUrl: string, assetType: 'logo' | 'banner' | 'favicon'): string {
    if (!imageUrl) return imageUrl;

    // Si es base64, procesarlo directamente
    if (imageUrl.startsWith('data:image/')) {
      return this.processBase64Asset(tenantId, imageUrl, assetType);
    }

    // Si es una URL temporal de /uploads/temp/
    if (imageUrl.includes('/uploads/temp/')) {
      try {
        const filename = path.basename(imageUrl);
        const tempPath = path.join(process.cwd(), 'public', 'uploads', 'temp', filename);
        
        // Verificar si el archivo temporal existe
        if (fs.existsSync(tempPath)) {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId, 'brand');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const ext = path.extname(filename);
          const newFilename = `${assetType}-${Date.now()}${ext}`;
          const permanentPath = path.join(uploadDir, newFilename);

          // Mover el archivo (fs.renameSync mueve, no copia)
          fs.renameSync(tempPath, permanentPath);
          console.log(`✅ [TenantsService] Imagen temporal movida: ${filename} -> ${newFilename}`);

          return `/uploads/${tenantId}/brand/${newFilename}`;
        } else {
          console.warn(`⚠️ [TenantsService] Archivo temporal no encontrado: ${tempPath}`);
          return imageUrl;
        }
      } catch (error) {
        console.error(`❌ [TenantsService] Error al mover imagen temporal ${imageUrl}:`, error);
        return imageUrl;
      }
    }

    return imageUrl;
  }

  private processBase64Asset(tenantId: string, assetValue: string, assetType: 'logo' | 'banner' | 'favicon'): string {
    if (!assetValue || !assetValue.startsWith('data:image/')) {
      return assetValue;
    }

    try {
      const matches = assetValue.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return assetValue;
      }

      let ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId, 'brand');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${assetType}-${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.writeFileSync(filePath, buffer);

      return `/uploads/${tenantId}/brand/${fileName}`;
    } catch (error) {
      console.error(`Error al guardar el activo ${assetType}:`, error);
      return assetValue;
    }
  }

  async findAll() {
    return this.tenantsRepository.find();
  }

  async search(searchTerm: string): Promise<any[]> {
    const cleanSearch = searchTerm ? searchTerm.trim() : '';
    
    if (!cleanSearch) {
      return this.findAll();
    }

    const tenants = await this.tenantsRepository
      .createQueryBuilder('tenant')
      .where('tenant.name ILIKE :search OR tenant.slug ILIKE :search', {
        search: `%${cleanSearch}%`,
      })
      .take(5)
      .getMany();

    return tenants.map(tenant => ({
      ...tenant,
      logoUrl: tenant.logoUrl || tenant['logo_url'],
      logo_url: tenant.logoUrl || tenant['logo_url'],
      bannerUrl: tenant.bannerUrl || tenant['banner_url'],
      banner_url: tenant.bannerUrl || tenant['banner_url'],
      faviconUrl: tenant.faviconUrl || tenant['favicon_url'],
      favicon_url: tenant.faviconUrl || tenant['favicon_url'],
    }));
  }

  async create(createTenantDto: any): Promise<Tenant> {
    const baseSlug = createTenantDto.slug || (createTenantDto.name
      ? createTenantDto.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : `tienda-${Date.now()}`);

    const plainPassword = createTenantDto.password || createTenantDto.passwordHash;

    let savedTenant: Tenant | null = null;

    if (createTenantDto.email) {
      const normalizedEmail = createTenantDto.email.toLowerCase();
      const existingByEmail = await this.tenantsRepository.findOne({ 
        where: { email: normalizedEmail } 
      });

      if (existingByEmail) {
        let passwordHash = existingByEmail.passwordHash;
        if (plainPassword) {
          passwordHash = await bcrypt.hash(plainPassword, 10);
        }
        
        const updateData: any = {};
        if (createTenantDto.name !== undefined) updateData.name = createTenantDto.name;
        if (createTenantDto.slogan !== undefined) updateData.slogan = createTenantDto.slogan;
        if (createTenantDto.phone !== undefined) updateData.phone = createTenantDto.phone;
        if (createTenantDto.countryCode !== undefined) updateData.countryCode = createTenantDto.countryCode;
        if (createTenantDto.ownerName !== undefined) updateData.ownerName = createTenantDto.ownerName;
        if (createTenantDto.workModality !== undefined) updateData.workModality = createTenantDto.workModality;
        if (createTenantDto.city !== undefined) updateData.city = createTenantDto.city;
        if (createTenantDto.zone !== undefined) updateData.zone = createTenantDto.zone;
        if (createTenantDto.address !== undefined) updateData.address = createTenantDto.address;
        if (createTenantDto.niche !== undefined) updateData.niche = createTenantDto.niche;
        if (createTenantDto.modelType !== undefined) updateData.modelType = createTenantDto.modelType;
        
        // 🔥 REDES SOCIALES
        if (createTenantDto.instagram !== undefined) updateData.instagram = createTenantDto.instagram;
        if (createTenantDto.facebook !== undefined) updateData.facebook = createTenantDto.facebook;
        if (createTenantDto.tiktok !== undefined) updateData.tiktok = createTenantDto.tiktok;
        if (createTenantDto.whatsapp !== undefined) updateData.whatsapp = createTenantDto.whatsapp;
        if (createTenantDto.telegram !== undefined) updateData.telegram = createTenantDto.telegram;
        if (createTenantDto.xTwitter !== undefined || createTenantDto.x_twitter !== undefined) {
          updateData.xTwitter = createTenantDto.xTwitter ?? createTenantDto.x_twitter;
        }
        if (createTenantDto.threads !== undefined) updateData.threads = createTenantDto.threads;
        if (createTenantDto.linkedin !== undefined) updateData.linkedin = createTenantDto.linkedin;

        if (createTenantDto.primaryColor !== undefined) updateData.primaryColor = createTenantDto.primaryColor;
        if (createTenantDto.secondaryColor !== undefined) updateData.secondaryColor = createTenantDto.secondaryColor;
        if (createTenantDto.accentColor !== undefined) updateData.accentColor = createTenantDto.accentColor;
        if (createTenantDto.backgroundColor !== undefined) updateData.backgroundColor = createTenantDto.backgroundColor;
        if (createTenantDto.fontFamily !== undefined) updateData.fontFamily = createTenantDto.fontFamily;
        if (createTenantDto.currencies !== undefined) updateData.currencies = createTenantDto.currencies;
        if (createTenantDto.specificConfig !== undefined) updateData.specificConfig = createTenantDto.specificConfig;
        
        // 🔥 DELIVERY — configuración de envío
        if (createTenantDto.deliveryBaseFee !== undefined) updateData.deliveryBaseFee = createTenantDto.deliveryBaseFee;
        if (createTenantDto.deliveryPerKmFee !== undefined) updateData.deliveryPerKmFee = createTenantDto.deliveryPerKmFee;
        if (createTenantDto.deliveryMinOrder !== undefined) updateData.deliveryMinOrder = createTenantDto.deliveryMinOrder;
        if (createTenantDto.deliveryMaxRadiusKm !== undefined) updateData.deliveryMaxRadiusKm = createTenantDto.deliveryMaxRadiusKm;
        if (createTenantDto.deliveryPrepTimeMin !== undefined) updateData.deliveryPrepTimeMin = createTenantDto.deliveryPrepTimeMin;
        if (createTenantDto.deliveryAvgSpeedKmh !== undefined) updateData.deliveryAvgSpeedKmh = createTenantDto.deliveryAvgSpeedKmh;
        if (createTenantDto.acceptsPickup !== undefined) updateData.acceptsPickup = createTenantDto.acceptsPickup;
        // 🔥 PROCESAR IMÁGENES - SOPORTE PARA TEMPORALES Y BASE64
        if (createTenantDto.logoUrl) {
          updateData.logoUrl = this.processTempImage(existingByEmail.id, createTenantDto.logoUrl, 'logo');
        }
        if (createTenantDto.bannerUrl) {
          updateData.bannerUrl = this.processTempImage(existingByEmail.id, createTenantDto.bannerUrl, 'banner');
        }
        if (createTenantDto.faviconUrl) {
          updateData.faviconUrl = this.processTempImage(existingByEmail.id, createTenantDto.faviconUrl, 'favicon');
        }

        if (Object.keys(updateData).length > 0 || passwordHash !== existingByEmail.passwordHash) {
          const finalUpdate = {
            ...updateData,
            ...(passwordHash ? { passwordHash } : {}),
          };
          await this.tenantsRepository.update(existingByEmail.id, finalUpdate as any);
        }

        savedTenant = await this.tenantsRepository.findOne({ where: { id: existingByEmail.id } });
      }
    }

    if (!savedTenant) {
      if (createTenantDto.name) {
        let finalName = createTenantDto.name;
        let nameCounter = 1;
        while (await this.tenantsRepository.findOne({ where: { name: finalName } })) {
          finalName = `${createTenantDto.name}-${nameCounter}`;
          nameCounter++;
        }
        createTenantDto.name = finalName;
      }

      let slug = baseSlug;
      let counter = 1;
      while (await this.tenantsRepository.findOne({ where: { slug: slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      let passwordHash: string | undefined = undefined;
      if (plainPassword) {
        passwordHash = await bcrypt.hash(plainPassword, 10);
        console.log(`🔑 [TenantsService] Contraseña hasheada para el nuevo tenant`);
      } else {
        console.log(`⚠️ [TenantsService] No se recibió contraseña para el nuevo tenant`);
      }

      const tenantData: any = {
        name: createTenantDto.name || 'Sin nombre',
        slug: slug,
        email: createTenantDto.email || '',
        slogan: createTenantDto.slogan || '',
        description: createTenantDto.description || '',
        phone: createTenantDto.phone || '',
        countryCode: createTenantDto.countryCode || '+58',
        ownerName: createTenantDto.ownerName || '',
        workModality: createTenantDto.workModality || 'local',
        city: createTenantDto.city || '',
        zone: createTenantDto.zone || '',
        address: createTenantDto.address || '',
        niche: createTenantDto.niche || 'general',
        modelType: createTenantDto.modelType || 'product',

        // 🔥 GEO — ubicación de la tienda para descubrimiento por cercanía
        latitude: (createTenantDto as any).latitude ?? null,
        longitude: (createTenantDto as any).longitude ?? null,
        geoPrecision: (createTenantDto as any).geoPrecision ?? 'pin',
        geoSource: (createTenantDto as any).geoSource ?? 'pin',
        geoUpdatedAt: (createTenantDto as any).latitude != null ? new Date() : null,

        
        // 🔥 DELIVERY — configuración de envío
        deliveryBaseFee: (createTenantDto as any).deliveryBaseFee ?? 0,
        deliveryPerKmFee: (createTenantDto as any).deliveryPerKmFee ?? 0,
        deliveryMinOrder: (createTenantDto as any).deliveryMinOrder ?? 0,
        deliveryMaxRadiusKm: (createTenantDto as any).deliveryMaxRadiusKm ?? null,
        deliveryPrepTimeMin: (createTenantDto as any).deliveryPrepTimeMin ?? 15,
        deliveryAvgSpeedKmh: (createTenantDto as any).deliveryAvgSpeedKmh ?? 20,
        acceptsPickup: (createTenantDto as any).acceptsPickup ?? true,

        // 🔥 REDES SOCIALES
        instagram: createTenantDto.instagram || '',
        facebook: createTenantDto.facebook || '',
        tiktok: createTenantDto.tiktok || '',
        whatsapp: createTenantDto.whatsapp || '',
        telegram: createTenantDto.telegram || '',
        xTwitter: createTenantDto.xTwitter ?? createTenantDto.x_twitter ?? '',
        threads: createTenantDto.threads || '',
        linkedin: createTenantDto.linkedin || '',
        
        primaryColor: createTenantDto.primaryColor || '#ea580c',
        secondaryColor: createTenantDto.secondaryColor || '#0f172a',
        accentColor: createTenantDto.accentColor || '#fbbf24',
        backgroundColor: createTenantDto.backgroundColor || '#0b0f19',
        fontFamily: createTenantDto.fontFamily || 'Quicksand',
        currencies: Array.isArray(createTenantDto.currencies) ? createTenantDto.currencies : ['USD'],
        specificConfig: createTenantDto.specificConfig || {},
        passwordHash: passwordHash,
      };

      const newTenant = this.tenantsRepository.create(tenantData);
      const saved = await this.tenantsRepository.save(newTenant);
      savedTenant = Array.isArray(saved) ? saved[0] : saved;
      console.log(`✅ [TenantsService] Tenant creado: ${savedTenant.id} - ${savedTenant.name}`);

      // 🔥 PROCESAR IMÁGENES DESPUÉS DE CREAR EL TENANT
      if (savedTenant && (createTenantDto.logoUrl || createTenantDto.bannerUrl || createTenantDto.faviconUrl)) {
        const updateNeeded: any = {};
        if (createTenantDto.logoUrl) {
          updateNeeded.logoUrl = this.processTempImage(savedTenant.id, createTenantDto.logoUrl, 'logo');
        }
        if (createTenantDto.bannerUrl) {
          updateNeeded.bannerUrl = this.processTempImage(savedTenant.id, createTenantDto.bannerUrl, 'banner');
        }
        if (createTenantDto.faviconUrl) {
          updateNeeded.faviconUrl = this.processTempImage(savedTenant.id, createTenantDto.faviconUrl, 'favicon');
        }

        if (Object.keys(updateNeeded).length > 0) {
          await this.tenantsRepository.update(savedTenant.id, updateNeeded);
          savedTenant = await this.tenantsRepository.findOne({ where: { id: savedTenant.id } });
          // ✅ CORREGIDO: Verificar que savedTenant no sea null
          if (savedTenant) {
            console.log(`✅ [TenantsService] Imágenes procesadas para tenant: ${savedTenant.id}`);
          }
        }
      }
    }

    // ============================================================
    // 🔥 PROCESAR USUARIO
    // ============================================================
    if (savedTenant) {
      const paymentData = createTenantDto.paymentMethods || createTenantDto.specificConfig;
      if (paymentData) {
        await this.paymentConfigService.saveOrUpdateTenantPaymentMethods(
          savedTenant.id,
          paymentData,
        );
      }

      const userEmail = createTenantDto.email || savedTenant.email;
      const plainPassword = createTenantDto.password || createTenantDto.passwordHash;
      
      if (userEmail) {
        const normalizedEmail = userEmail.toLowerCase();
        let user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
        
        if (!user) {
          console.log(`🔄 [TenantsService] Creando usuario para ${normalizedEmail}`);
          
          let hashedPassword = savedTenant.passwordHash;
          if (!hashedPassword && plainPassword) {
            hashedPassword = await bcrypt.hash(plainPassword, 10);
          }
          
          const userData: any = {
            name: createTenantDto.ownerName || createTenantDto.name || 'Usuario',
            email: normalizedEmail,
            password: hashedPassword,
            provider: 'credentials',
            role: 'seller',
            onboarding_completed: true,
            phone: createTenantDto.phone || '',
            city: createTenantDto.city || '',
            address: createTenantDto.address || '',
            deliveryCity: createTenantDto.deliveryCity || '',
            state: createTenantDto.state || '',
            municipality: createTenantDto.municipality || '',
            latitude: createTenantDto.latitude || 0,
            longitude: createTenantDto.longitude || 0,
            preferredCurrency: Array.isArray(createTenantDto.currencies) ? createTenantDto.currencies[0] : 'USD',
            primary_color: savedTenant.primaryColor || '#ea580c',
            secondary_color: savedTenant.secondaryColor || '#0f172a',
            accent_color: savedTenant.accentColor || '#fbbf24',
            background_color: savedTenant.backgroundColor || '#0b0f19',
            font_family: savedTenant.fontFamily || 'Quicksand',
            tenantId: savedTenant.id,
          };

          const newUser = this.userRepository.create(userData);
          const savedUser = await this.userRepository.save(newUser);
          user = Array.isArray(savedUser) ? savedUser[0] : savedUser;
          
          if (user) {
            console.log(`✅ [TenantsService] Usuario creado: ${user.id} - ${user.email}`);
            console.log(`✅ [TenantsService] Usuario tiene contraseña: ${!!user.password}`);
          }
        } else {
          console.log(`🔄 [TenantsService] Actualizando usuario existente: ${user.email}`);
          
          const userUpdateData: any = {};
          if (createTenantDto.phone) userUpdateData.phone = createTenantDto.phone;
          if (createTenantDto.city) userUpdateData.city = createTenantDto.city;
          if (createTenantDto.address) userUpdateData.address = createTenantDto.address;
          if (createTenantDto.deliveryCity) userUpdateData.deliveryCity = createTenantDto.deliveryCity;
          if (createTenantDto.state !== undefined) userUpdateData.state = createTenantDto.state;
          if (createTenantDto.municipality !== undefined) userUpdateData.municipality = createTenantDto.municipality;
          if (createTenantDto.latitude !== undefined && createTenantDto.latitude !== null) {
            userUpdateData.latitude = createTenantDto.latitude;
          }
          if (createTenantDto.longitude !== undefined && createTenantDto.longitude !== null) {
            userUpdateData.longitude = createTenantDto.longitude;
          }
          if (createTenantDto.preferredCurrency) {
            userUpdateData.preferredCurrency = createTenantDto.preferredCurrency;
          } else if (Array.isArray(createTenantDto.currencies) && createTenantDto.currencies.length > 0) {
            userUpdateData.preferredCurrency = createTenantDto.currencies[0];
          }
          if (createTenantDto.ownerName) userUpdateData.name = createTenantDto.ownerName;
          userUpdateData.role = 'seller';
          userUpdateData.onboarding_completed = true;
          
          if (!user.password && savedTenant.passwordHash) {
            userUpdateData.password = savedTenant.passwordHash;
            console.log(`🔑 [TenantsService] Copiando contraseña del tenant al usuario`);
          }
          
          if (Object.keys(userUpdateData).length > 0) {
            await this.userRepository.update(user.id, userUpdateData);
            console.log(`✅ [TenantsService] Usuario actualizado`);
          }
        }
        
        if (user) {
          await this.userRepository.update(
            { id: user.id },
            { tenantId: savedTenant.id } as any,
          );

          await this.tenantsRepository.manager.query(
            `INSERT INTO user_tenants (user_id, tenant_id, role)
             SELECT $1, $2, $3
             WHERE NOT EXISTS (
                 SELECT 1 FROM user_tenants WHERE user_id = $1 AND tenant_id = $2
             )`,
            [user.id, savedTenant.id, 'owner']
          ).catch(err => console.log('Nota en user_tenants:', err.message));
          
          if (!savedTenant.passwordHash && user.password) {
            await this.tenantsRepository.update(savedTenant.id, {
              passwordHash: user.password,
            });
            console.log(`✅ [TenantsService] Contraseña copiada del usuario al tenant`);
          }
        }
      }
      
      return savedTenant;
    }

    throw new BadRequestException('No se pudo crear o recuperar el comercio.');
  }

  async login(credentials: { email: string; password: string }): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { email: credentials.email.toLowerCase() } });
    if (!tenant || !tenant.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isMatch = await bcrypt.compare(credentials.password, tenant.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return tenant;
  }

  async findBySlugOrId(identifier: string): Promise<Tenant> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let tenant: Tenant | null = null;
    if (isUuid) {
      tenant = await this.tenantsRepository.findOne({ 
        where: { id: identifier },
        relations: { terminals: true },
      });
    } else {
      tenant = await this.tenantsRepository.findOne({ 
        where: { slug: identifier },
        relations: { terminals: true },
      });
    }

    if (!tenant) {
      throw new NotFoundException(`El comercio con identificador '${identifier}' no fue encontrado.`);
    }

    const tenantWithConfig = await this.paymentConfigService.getTenantWithPaymentMethods(tenant.id);
    
    return {
      ...tenantWithConfig,
      x_twitter: tenantWithConfig.xTwitter || tenantWithConfig['x_twitter'] || '',
      terminals: tenant.terminals,
    } as Tenant;
  }

  async findBySlugOrIdWithTerminals(identifier: string): Promise<Tenant> {
    return this.findBySlugOrId(identifier);
  }
  
  async update(id: string, updateData: Record<string, any>): Promise<any> {
    const tenant = await this.findBySlugOrId(id);
    if (!tenant) {
      throw new BadRequestException('Comercio no encontrado.');
    }

    console.log('🔍 [TenantsService.update] updateData recibido:', {
      description: updateData.description,
      niche: updateData.niche,
      slogan: updateData.slogan,
      name: updateData.name,
      allKeys: Object.keys(updateData),
    });
  
    const plainPassword = updateData.password || updateData.passwordHash;
    let passwordHash = tenant.passwordHash;
    if (plainPassword) {
      passwordHash = await bcrypt.hash(plainPassword, 10);
    }

    const updateFields: any = {};

const fields = [
  'name', 'slogan', 'description', 'email', 'phone', 'countryCode',
  'ownerName', 'workModality', 'city', 'zone', 'address', 'niche',
  'modelType',
  'instagram', 'facebook', 'tiktok', 'whatsapp', 'telegram',
  'xTwitter', 'x_twitter', 'threads', 'linkedin',
  'primaryColor', 'secondaryColor',
  'accentColor', 'backgroundColor', 'fontFamily', 'fontWeight',
 'currencies',
  'rif',
  'customFields',
  'heroLayout',
  // 🔥 GEO — ubicación de la tienda para descubrimiento por cercanía
  'latitude', 'longitude',
  'geoPrecision', 'geoSource',
  // 🔥 DELIVERY — configuración de envío
  'deliveryBaseFee', 'deliveryPerKmFee', 'deliveryMinOrder',
  'deliveryMaxRadiusKm', 'deliveryPrepTimeMin', 'deliveryAvgSpeedKmh',
  'acceptsPickup',
  'deliveryLocalEnabled',   // 🔥 nuevo
];

    for (const field of fields) {
      if (updateData[field] !== undefined) {
        const targetField = field === 'x_twitter' ? 'xTwitter' : field;
        updateFields[targetField] = updateData[field];
      }
    }

    if (updateData.specificConfig && typeof updateData.specificConfig === 'object') {
      const existingConfig = (typeof tenant.specificConfig === 'object' && tenant.specificConfig !== null) 
        ? tenant.specificConfig 
        : {};
      updateFields.specificConfig = {
        ...existingConfig,
        ...updateData.specificConfig,
      };
    }

    // 🔥 PROCESAR IMÁGENES - SOPORTE PARA TEMPORALES Y BASE64
    if (updateData.logoUrl) {
      updateFields.logoUrl = this.processTempImage(tenant.id, updateData.logoUrl, 'logo');
    }
    if (updateData.bannerUrl) {
      updateFields.bannerUrl = this.processTempImage(tenant.id, updateData.bannerUrl, 'banner');
    }
    if (updateData.faviconUrl) {
      updateFields.faviconUrl = this.processTempImage(tenant.id, updateData.faviconUrl, 'favicon');
    }

    if (Object.keys(updateFields).length > 0 || passwordHash !== tenant.passwordHash) {
      const finalUpdate = {
        ...updateFields,
        ...(passwordHash !== tenant.passwordHash ? { passwordHash } : {}),
      };

      // 🔥 FASE N2: si cambia el nombre, regenerar el slug (coherencia nombre↔slug).
      // El slug NO es editable manualmente; se deriva del nombre.
      if (finalUpdate.name && finalUpdate.name !== tenant.name) {
        const baseSlug = finalUpdate.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Slugs reservados (defensa en profundidad: evitar que un tenant rompa rutas)
        const RESERVED = ['admin', 'api', 'auth', 'tienda', 'kiosko', 'login', 'register'];
        let candidate = RESERVED.includes(baseSlug) ? `${baseSlug}-tienda` : baseSlug;

        // Resolver colisión (excluyendo el propio tenant)
        const originalCandidate = candidate;
        let counter = 1;
        while (
          await this.tenantsRepository.findOne({
            where: { slug: candidate, id: Not(tenant.id) },
          })
        ) {
          candidate = `${originalCandidate}-${counter}`;
          counter++;
        }
        finalUpdate.slug = candidate;
        console.log(`🔗 [TenantsService.update] Slug regenerado: ${tenant.slug} → ${candidate}`);
      }
      
      await this.tenantsRepository.update(tenant.id, finalUpdate as any);
    }

    if (updateData.primaryColor || updateData.secondaryColor || updateData.accentColor || updateData.backgroundColor) {
      console.log('🔄 [TenantsService.update] Sincronizando tema con el usuario propietario');
      
      const ownerRelation = await this.userTenantRepository
        .createQueryBuilder('ut')
        .leftJoinAndSelect('ut.user', 'user')
        .where('ut.tenant_id = :tenantId', { tenantId: tenant.id })
        .andWhere('ut.role = :role', { role: 'owner' })
        .getOne();

      if (ownerRelation && ownerRelation.user) {
        const userUpdateData: any = {};
        if (updateData.primaryColor) userUpdateData.primary_color = updateData.primaryColor;
        if (updateData.secondaryColor) userUpdateData.secondary_color = updateData.secondaryColor;
        if (updateData.accentColor) userUpdateData.accent_color = updateData.accentColor;
        if (updateData.backgroundColor) userUpdateData.background_color = updateData.backgroundColor;
        
        if (Object.keys(userUpdateData).length > 0) {
          await this.userRepository.update(ownerRelation.user.id, userUpdateData);
          console.log('✅ [TenantsService.update] Usuario actualizado correctamente');
        }
      } else {
        console.log('⚠️ [TenantsService.update] No se encontró usuario propietario para este tenant');
      }
    }

    const paymentData = updateData.paymentMethods || updateData.specificConfig;
    if (paymentData) {
      await this.paymentConfigService.saveOrUpdateTenantPaymentMethods(
        tenant.id,
        paymentData,
      );
    }

    return await this.paymentConfigService.getTenantWithPaymentMethods(tenant.id);
  }

  async getUserTenants(userId: string) {
    return this.userTenantRepository
      .createQueryBuilder('ut')
      .leftJoinAndSelect('ut.tenant', 'tenant')
      .where('ut.user_id = :userId', { userId })
      .getMany();
  }

  async findAllWithUsers(): Promise<any[]> {
    const tenants = await this.tenantsRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.userTenants', 'ut')
      .leftJoinAndSelect('ut.user', 'user')
      .getMany();

    return tenants.map(tenant => ({
      ...tenant,
      users: tenant.userTenants?.map(ut => ({
        id: ut.user.id,
        name: ut.user.name,
        email: ut.user.email,
        role: ut.role,
      })) || [],
    }));
  }

  async findWithUsersById(id: string): Promise<any> {
    const tenant = await this.tenantsRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.userTenants', 'ut')
      .leftJoinAndSelect('ut.user', 'user')
      .where('t.id = :id', { id })
      .getOne();

    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${id} no encontrado`);
    }

    return {
      ...tenant,
      users: tenant.userTenants?.map(ut => ({
        id: ut.user.id,
        name: ut.user.name,
        email: ut.user.email,
        role: ut.role,
      })) || [],
    };
  }

  async addUserToTenant(tenantId: string, userId: string, role: string = 'buyer'): Promise<UserTenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${tenantId} no encontrado`);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const existing = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (existing) {
      throw new BadRequestException('El usuario ya está asociado a este tenant');
    }

    const userTenantData = {
      userId,
      tenantId,
      role,
    };
    const userTenant = this.userTenantRepository.create(userTenantData);
    return this.userTenantRepository.save(userTenant);
  }

  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    const relation = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!relation) {
      throw new NotFoundException('El usuario no está asociado a este tenant');
    }

    if (relation.role === 'owner') {
      const owners = await this.userTenantRepository.count({
        where: { tenantId, role: 'owner' },
      });

      if (owners <= 1) {
        throw new BadRequestException('No se puede remover al único owner del tenant');
      }
    }

    await this.userTenantRepository.remove(relation);
  }

  async updateUserRole(tenantId: string, userId: string, newRole: string): Promise<UserTenant> {
    const relation = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!relation) {
      throw new NotFoundException('El usuario no está asociado a este tenant');
    }

    if (relation.role === 'owner' && newRole !== 'owner') {
      const owners = await this.userTenantRepository.count({
        where: { tenantId, role: 'owner' },
      });

      if (owners <= 1) {
        throw new BadRequestException('No se puede cambiar el rol del único owner');
      }
    }

    relation.role = newRole;
    return this.userTenantRepository.save(relation);
  }

  // ============================================================
  // 🔥 LIKE - DAR/QUITAR ME GUSTA
  // ============================================================
  async toggleLike(tenantId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const existingLike = await this.storeLikeRepository.findOne({
      where: { userId, tenantId },
    });

    if (existingLike) {
      await this.storeLikeRepository.remove(existingLike);
      tenant.likesCount = Math.max(0, (tenant.likesCount || 0) - 1);
      await this.tenantsRepository.save(tenant);
      return { liked: false, likesCount: tenant.likesCount || 0 };
    } else {
      const newLike = this.storeLikeRepository.create({ userId, tenantId });
      await this.storeLikeRepository.save(newLike);
      tenant.likesCount = (tenant.likesCount || 0) + 1;
      await this.tenantsRepository.save(tenant);
      return { liked: true, likesCount: tenant.likesCount || 0 };
    }
  }

  // ============================================================
  // 🔥 OBTENER LIKES DE UNA TIENDA
  // ============================================================
  async getLikes(tenantId: string): Promise<{ likesCount: number }> {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    return { likesCount: tenant.likesCount || 0 };
  }

  // ============================================================
  // 🔥 VALORACIÓN - DAR PUNTUACIÓN
  // ============================================================
  async rateStore(
    tenantId: string,
    userId: string,
    rating: number,
    comment?: string,
  ): Promise<{ rating: number; ratingAvg: number; ratingCount: number }> {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('La valoración debe ser entre 1 y 5 estrellas');
    }

    const existingRating = await this.storeRatingRepository.findOne({
      where: { userId, tenantId },
    });

    if (existingRating) {
      existingRating.rating = rating;
      if (comment !== undefined) existingRating.comment = comment;
      await this.storeRatingRepository.save(existingRating);
    } else {
      const newRating = this.storeRatingRepository.create({ userId, tenantId, rating, comment });
      await this.storeRatingRepository.save(newRating);
    }

    // Recalcular promedio
    const ratings = await this.storeRatingRepository.find({
      where: { tenantId },
      select: { rating: true },
    });

    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
    const avg = totalRatings > 0 ? sumRatings / totalRatings : 0;

    tenant.ratingAvg = Math.round(avg * 100) / 100;
    tenant.ratingCount = totalRatings;
    await this.tenantsRepository.save(tenant);

    return {
      rating,
      ratingAvg: tenant.ratingAvg,
      ratingCount: tenant.ratingCount,
    };
  }

  // ============================================================
  // 🔥 OBTENER VALORACIÓN DE UNA TIENDA
  // ============================================================
  async getRating(tenantId: string): Promise<{ ratingAvg: number; ratingCount: number }> {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    return {
      ratingAvg: tenant.ratingAvg || 0,
      ratingCount: tenant.ratingCount || 0,
    };
  }

  // ============================================================
  // 🔥 VERIFICAR SI EL USUARIO YA DIO LIKE
  // ============================================================
  async getUserLike(tenantId: string, userId: string): Promise<boolean> {
    const like = await this.storeLikeRepository.findOne({
      where: { userId, tenantId },
    });
    return !!like;
  }

  // ============================================================
  // 🔥 OBTENER VALORACIÓN DEL USUARIO
  // ============================================================
  async getUserRating(tenantId: string, userId: string): Promise<number | null> {
    const rating = await this.storeRatingRepository.findOne({
      where: { userId, tenantId },
      select: { rating: true },
    });
    return rating ? rating.rating : null;
  }

  
  // ============================================================
  // MÉTODOS DE PAGO ACTIVOS DEL TENANT
  // ============================================================
  // Endpoint público. Devuelve solo los campos que el comprador
  // necesita ver para pagar (banco, teléfono, cédula/RIF).
  // No expone datos sensibles ni timestamps.
  // ============================================================

  async getActivePaymentMethods(tenantId: string) {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Comercio no encontrado');
    }

    return this.paymentConfigService.getActivePaymentMethodsByTenant(tenantId);
  }


  // ============================================================
// 🔥 PIN DE SEGURIDAD
// ============================================================

async setSecurityPin(tenantId: string, userId: string, pin: string) {
  // Verificar que el tenant exista
  const tenant = await this.tenantsRepository.findOne({
    where: { id: tenantId },
  });
  
  if (!tenant) {
    throw new NotFoundException('Tienda no encontrada');
  }
  
  // Verificar que el usuario sea el owner
const userTenant = await this.userTenantRepository.findOne({
  where: [
    { userId, tenantId, role: 'owner' },
    { userId, tenantId, role: 'admin' },
  ],
});
  
  if (!userTenant) {
    throw new UnauthorizedException('No tienes permiso para modificar este tenant');
  }
  
  // Hashear el PIN
  const hashedPin = await bcrypt.hash(pin, 10);
  
  await this.tenantsRepository.update(
    { id: tenantId },
    { 
      securityPin: hashedPin,
      hasSecurityPin: true,
    }
  );
  
  return { message: 'PIN configurado correctamente' };
}

async getSecurityPin(tenantId: string, userId: string) {
  // Verificar que el tenant exista
  const tenant = await this.tenantsRepository.findOne({
    where: { id: tenantId },
select: { id: true, hasSecurityPin: true },
  });
  
  if (!tenant) {
    throw new NotFoundException('Tienda no encontrada');
  }
  
  return {
    hasPin: tenant.hasSecurityPin || false,
  };
}

async deleteSecurityPin(tenantId: string, userId: string) {
  // Verificar que el tenant exista
  const tenant = await this.tenantsRepository.findOne({
    where: { id: tenantId },
  });
  
  if (!tenant) {
    throw new NotFoundException('Tienda no encontrada');
  }
  
  // Verificar que el usuario sea el owner
  const userTenant = await this.userTenantRepository.findOne({
    where: { userId, tenantId, role: 'owner' },
  });
  
  if (!userTenant) {
    throw new UnauthorizedException('No tienes permiso para modificar este tenant');
  }
  
  await this.tenantsRepository.update(
    { id: tenantId },
    { 
      securityPin: null,
      hasSecurityPin: false,
    }
  );
  
  return { message: 'PIN eliminado correctamente' };
}

async verifySecurityPin(tenantId: string, userId: string, pin: string) {
  // Verificar que el tenant exista
  const tenant = await this.tenantsRepository.findOne({
    where: { id: tenantId },
select: { id: true, securityPin: true, hasSecurityPin: true },
  });
  
  if (!tenant) {
    throw new NotFoundException('Tienda no encontrada');
  }
  
  if (!tenant.hasSecurityPin || !tenant.securityPin) {
    return { valid: false, message: 'No hay PIN configurado' };
  }
  
  const isValid = await bcrypt.compare(pin, tenant.securityPin);
  
  return { valid: isValid };
}

  // ============================================================
  // 🔥 FASE Z: Eliminar tienda completa (transacción atómica)
  // ============================================================
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    // 1. Verificar que el tenant exista
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Comercio no encontrado.');
    }

    // 2. Validar que no haya órdenes/bookings activos
    // Estados considerados "activos" (no se puede borrar si hay)
    const activeOrdersCountResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM "orders" WHERE "tenantId" = $1 AND status IN ('PENDING', 'PENDING_LOCAL', 'por_verificar')`, 
      [id]
    );
    const activeOrdersCount = Number(activeOrdersCountResult[0]?.count || 0);

    if (activeOrdersCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la tienda: hay ${activeOrdersCount} orden(es) activa(s). Cancele o complete las órdenes antes de eliminar.`,
      );
    }

    const activeBookingsCountResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM "bookings" WHERE "tenantid" = $1 AND status IN ('pending', 'confirmed', 'in_progress', 'assigned')`, 
      [id]
    );
    const activeBookingsCount = Number(activeBookingsCountResult[0]?.count || 0);

    if (activeBookingsCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la tienda: hay ${activeBookingsCount} reserva(s) activa(s). Cancele o complete las reservas antes de eliminar.`,
      );
    }
    // 3. Ejecutar borrado en cascada en transacción atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener los usuarios asociados al tenant
      const userTenants = await queryRunner.query(
        `SELECT "user_id" FROM "user_tenants" WHERE "tenant_id" = $1`,
        [id],
      );
      const userIds = userTenants.map((ut: any) => ut.user_id);

      // 2. Revocar refresh tokens y limpiar auth_events
      if (userIds.length > 0) {
        await queryRunner.query(
          `DELETE FROM "refresh_tokens" WHERE "userId" = ANY($1)`,
          [userIds],
        );
        await queryRunner.query(
          `DELETE FROM "auth_events" WHERE "userId" = ANY($1)`,
          [userIds],
        );

        // 🔥 Quitar el tenantId y el rol de owner de los usuarios
        await queryRunner.query(
          `UPDATE "users" SET "tenantId" = NULL, role = 'buyer' WHERE "id" = ANY($1)`,
          [userIds],
        );
      }

      // 3. Borrar la relación user_tenants
      await queryRunner.query(`DELETE FROM "user_tenants" WHERE "tenant_id" = $1`, [id]);

      // 4. Borrar tablas con nombres de columna específicos (manualmente)
      await queryRunner.query(`DELETE FROM "item_reviews" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "inventory_movements" WHERE "tenantId" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "receipts" WHERE "tenantId" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "shipping_disputes" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "user_credits" WHERE "tenantId" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "store_likes" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "store_ratings" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "conversations" WHERE "tenantid" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "notifications" WHERE "tenantid" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "quick_replies" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "turn_counters" WHERE "tenantid" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "delivery_drivers" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "delivery_zones" WHERE "tenant_id" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "professionals" WHERE "tenantid" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "bookings" WHERE "tenantid" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "orders" WHERE "tenantId" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "products" WHERE "tenantId" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "services" WHERE "tenantid" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "terminals" WHERE "tenantId" = $1`, [id]);
      await queryRunner.query(`DELETE FROM "payment_methods" WHERE "tenantId" = $1`, [id]);

      // 5. Finalmente, borrar el tenant
      await queryRunner.query(`DELETE FROM "tenants" WHERE "id" = $1`, [id]);

      // 6. Commit
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Tienda "${tenant.name}" eliminada correctamente.`,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('❌ [TenantsService.remove] Error en transacción:', err);
      
      // 🔥 FORZAR EL ERROR EN LA RESPUESTA PARA PODER VERLO
      throw new BadRequestException({
        message: 'Error de DB',
        error: err.message,
        detail: err.detail,
        table: err.table,
        constraint: err.constraint,
      });
    } finally {
      await queryRunner.release();
    }
  }
}