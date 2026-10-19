import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Delete, 
  Body, 
  Param, 
  Req,
  UseGuards,
  UseInterceptors, 
  UploadedFiles, 
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { ProfessionalsService } from './professionals.service';

@Controller(['professionals', 'api/professionals'])
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

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

  private extractImages(body: any, files: Express.Multer.File[], tenantSlugOrId: string = 'general') {
    const professionalSlug = this.slugify(body.name || 'sin-nombre');

    const newMediaUrls = files 
      ? files.map(file => `/uploads/${tenantSlugOrId}/professionals/${professionalSlug}/${file.filename}`) 
      : [];

    const rawExisting = body.existingImages || body['existingImages[]'] || body.mediaUrls || body.images;
    let existingImages: string[] = [];

    const wasFieldSent = body.existingImages !== undefined || 
                         body['existingImages[]'] !== undefined || 
                         body.mediaUrls !== undefined || 
                         body.images !== undefined;

    if (rawExisting) {
      if (Array.isArray(rawExisting)) {
        existingImages = rawExisting
          .map(item => (typeof item === 'string' ? item : item?.url || item?.path))
          .filter(Boolean);
      } else if (typeof rawExisting === 'string') {
        try {
          const parsed = JSON.parse(rawExisting);
          existingImages = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          existingImages = [rawExisting];
        }
      }
    } else if (wasFieldSent) {
      existingImages = [];
    }

    const sanitizedExisting = existingImages.map(img => img.replace(/\/uploads\/uploads\//g, '/uploads/'));

    const mediaUrls = (wasFieldSent || files?.length > 0) ? [...sanitizedExisting, ...newMediaUrls] : undefined;
    const coverImage = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

    return { mediaUrls, coverImage, wasFieldSent };
  }

  private extractFeatures(featuresBody: any) {
    if (!featuresBody) return [];
    if (typeof featuresBody === 'string') {
      try {
        const parsed = JSON.parse(featuresBody);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [featuresBody];
      }
    }
    return Array.isArray(featuresBody) ? featuresBody : [];
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const professionalSlug = (req.body?.name || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'professionals', professionalSlug);
          
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage } = this.extractImages(body, files, tenantId);
    const parsedFeatures = this.extractFeatures(body.features);

    let parsedIsActive = true;
    if (body.isActive !== undefined && body.isActive !== null && body.isActive !== '') {
      if (typeof body.isActive === 'boolean') {
        parsedIsActive = body.isActive;
      } else {
        parsedIsActive = String(body.isActive).toLowerCase() === 'true' || String(body.isActive) === '1';
      }
    }

    if (body.status) {
      parsedIsActive = body.status === 'active';
    }

    let parsedSpecialties = body.specialties;
    if (typeof parsedSpecialties === 'string') {
      try {
        parsedSpecialties = JSON.parse(parsedSpecialties);
      } catch {
        parsedSpecialties = [parsedSpecialties];
      }
    }

    let parsedServiceIds = body.serviceIds;
    if (typeof parsedServiceIds === 'string') {
      try {
        parsedServiceIds = JSON.parse(parsedServiceIds);
      } catch {
        parsedServiceIds = [];
      }
    }

    let parsedSchedule = body.schedule;
    if (typeof parsedSchedule === 'string') {
      try {
        parsedSchedule = JSON.parse(parsedSchedule);
      } catch {
        parsedSchedule = {};
      }
    }

    let parsedBreaks = body.breaks;
    if (typeof parsedBreaks === 'string') {
      try {
        parsedBreaks = JSON.parse(parsedBreaks);
      } catch {
        parsedBreaks = [];
      }
    }

    const createDto = {
      ...body,
      tenantId,
      isActive: parsedIsActive,
      mediaUrls,
      coverImage,
      features: parsedFeatures,
      specialties: parsedSpecialties,
      serviceIds: parsedServiceIds,
      schedule: parsedSchedule,
      breaks: parsedBreaks,
      rating: body.rating !== undefined ? Number(body.rating) : 0,
      reviewsCount: body.reviewsCount !== undefined ? Number(body.reviewsCount) : 0,
    };

    return this.professionalsService.create(createDto, files);
  }

  @Get('tenant/:tenantId')
  findAllByTenant(@Param('tenantId') tenantId: string) {
    return this.professionalsService.findAllByTenant(tenantId);
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return this.professionalsService.searchGlobal(query.trim());
  }

    // ============================================================
  // 🔥 FASE P1 — SELF-SERVICE DEL PROFESIONAL (me/*)
  // ⚠️ Todos estos van ANTES de ':id/*'.
  // ============================================================

  /**
   * GET /professionals/lookup?email=...
   * Devuelve { user, isProfesional, tenants } o null.
   */
  @Get('lookup')
  @UseGuards(AuthGuard('jwt'))
  async lookupByEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('El parámetro email es obligatorio');
    }
    return this.professionalsService.lookupByEmail(email);
  }

  /**
   * GET /professionals/me
   * Perfil del profesional logueado (acepta ?tenantId).
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return null;
    return this.professionalsService.getProfessionalByUserId(userId, tenantId);
  }

  /**
   * GET /professionals/me/all
   * Todos los vínculos del profesional (multi-tienda).
   */
  @Get('me/all')
  @UseGuards(AuthGuard('jwt'))
  async getAllMyProfiles(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return [];
    return this.professionalsService.getProfessionalsByUserId(userId);
  }

  /**
   * GET /professionals/me/bookings
   * Bookings del profesional logueado.
   */
  @Get('me/bookings')
  @UseGuards(AuthGuard('jwt'))
  async getMyBookings(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return [];
    return this.professionalsService.listMyBookings(userId);
  }

  /**
   * PATCH /professionals/me/contact
   * Self-service: solo phone + phone_is_whatsapp.
   */
  @Patch('me/contact')
  @UseGuards(AuthGuard('jwt'))
  async updateMyContact(
    @Req() req: any,
    @Body() body: { phone?: string | null; phone_is_whatsapp?: boolean },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.professionalsService.updateMyContact(userId, body);
  }

  /**
   * POST /professionals/me/avatar
   * Self-service: sube avatar.
   */
  @Post('me/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(
            null,
            join(
              process.cwd(),
              'public',
              'uploads',
              'avatars',
              'professionals',
            ),
          );
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadMyAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const avatarUrl = `/uploads/avatars/professionals/${file.filename}`;
    const userId = req.user?.id || req.user?.sub;
    return this.professionalsService.updateMyAvatar(userId, avatarUrl);
  }

  /**
   * PATCH /professionals/me/status
   * Toggle online/offline del profesional logueado.
   */
  @Patch('me/status')
  @UseGuards(AuthGuard('jwt'))
  async updateMyStatus(
    @Req() req: any,
    @Body() body: { isActive: boolean },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.professionalsService.updateMyStatus(userId, body.isActive);
  }


  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('date') date: string,
  ) {
    return this.professionalsService.getAvailability(id, tenantId, date);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean; status: string; tenantId?: string },
  ) {
    return this.professionalsService.update(id, body, []);
  }

  @Put(':id')
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const tenantFolder = req.body?.tenantId || 'general';
          const professionalSlug = (req.body?.name || 'sin-nombre').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          
          const uploadPath = path.join('./public/uploads', tenantFolder, 'professionals', professionalSlug);
          
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const rawTenantId = body.tenantId;
    const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;

    const { mediaUrls, coverImage, wasFieldSent } = this.extractImages(body, files, tenantId);
    const parsedFeatures = this.extractFeatures(body.features);

    let parsedIsActive: boolean | undefined = undefined;
    if (body.isActive !== undefined && body.isActive !== null && body.isActive !== '') {
      if (typeof body.isActive === 'boolean') {
        parsedIsActive = body.isActive;
      } else {
        const valStr = String(body.isActive).toLowerCase().trim();
        parsedIsActive = valStr === 'true' || valStr === '1' || valStr === 'on';
      }
    }

    if (body.status) {
      parsedIsActive = body.status === 'active';
    }

    let parsedSpecialties = body.specialties;
    if (typeof parsedSpecialties === 'string') {
      try {
        parsedSpecialties = JSON.parse(parsedSpecialties);
      } catch {
        parsedSpecialties = [];
      }
    }

    let parsedServiceIds = body.serviceIds;
    if (typeof parsedServiceIds === 'string') {
      try {
        parsedServiceIds = JSON.parse(parsedServiceIds);
      } catch {
        parsedServiceIds = [];
      }
    }

    let parsedSchedule = body.schedule;
    if (typeof parsedSchedule === 'string') {
      try {
        parsedSchedule = JSON.parse(parsedSchedule);
      } catch {
        parsedSchedule = {};
      }
    }

    let parsedBreaks = body.breaks;
    if (typeof parsedBreaks === 'string') {
      try {
        parsedBreaks = JSON.parse(parsedBreaks);
      } catch {
        parsedBreaks = [];
      }
    }

    const updateDto: any = {
      tenantId,
      name: body.name,
      description: body.description,
      userId: body.userId,
      isActive: parsedIsActive,
      phone: body.phone !== undefined ? body.phone : undefined,
      // 🔥 NUEVOS
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
      features: parsedFeatures,
      specialties: parsedSpecialties,
      serviceIds: parsedServiceIds,
      schedule: parsedSchedule,
      breaks: parsedBreaks,
      rating: body.rating !== undefined ? Number(body.rating) : undefined,
      reviewsCount: body.reviewsCount !== undefined ? Number(body.reviewsCount) : undefined,
    };

    if (wasFieldSent || (files && files.length > 0)) {
      updateDto.mediaUrls = mediaUrls || [];
      updateDto.coverImage = coverImage;
    }

    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] === undefined && key !== 'mediaUrls') {
        delete updateDto[key];
      }
    });

    return this.professionalsService.update(id, updateDto, files);
  }

  // ============================================================
  // 🔥 NUEVO: subir avatar del profesional
  // ============================================================
  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join('./public/uploads', 'avatars', 'professionals');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const name = `professional-${req.params.id}-${Date.now()}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const url = `/uploads/avatars/professionals/${file.filename}`;
    await this.professionalsService.update(id, { avatarUrl: url });
    return { success: true, avatarUrl: url };
  }

  @Delete(':id/:tenantId')
  remove(
    @Param('id') id: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.professionalsService.remove(id, tenantId);
  }

  // ============================================================
  // 🔥 CAMBIAR PASSWORD DEL PROFESIONAL (admin)
  // ============================================================
  @Patch(':id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    if (!body?.password || body.password.trim().length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }
    return this.professionalsService.updatePassword(id, body.password);
  }
}