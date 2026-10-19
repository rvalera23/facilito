import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}
  @Post(':slug/upload/:category')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const rawSlug = req.params.slug;
          const rawCategory = req.params.category;
          
          const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug || 'general');
          const category = Array.isArray(rawCategory) ? rawCategory[0] : (rawCategory || 'brand');

          const uploadPath = join(process.cwd(), 'public', 'uploads', slug, category);

          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }

          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|ico|svg\+xml|pdf)$/)) {
          return callback(
            new BadRequestException(
              'Formato de archivo no soportado. Se permiten imágenes (PNG, JPG, WEBP, ICO, SVG) y PDF.',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  uploadFile(
    @Param('slug') slug: string,
    @Param('category') category: string = 'brand',
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha adjuntado ningún archivo');
    }

    const resolvedCategory = Array.isArray(category) ? category[0] : (category || 'brand');
    const resolvedSlug = Array.isArray(slug) ? slug[0] : slug;
    
    const protocol = req.protocol;
    const host = req.get('host');

    return {
      url: `${protocol}://${host}/uploads/${resolvedSlug}/${resolvedCategory}/${file.filename}`,
    };
  }

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Post('login')
  login(@Body() credentials: { email: string; password: string }) {
    return this.tenantsService.login(credentials);
  }



  @Get()
  findAll(@Query('search') search?: string) {
    if (search) {
      return this.tenantsService.search(search);
    }
    return this.tenantsService.findAll();
  }

  @Get(':identifier')
  findOne(@Param('identifier') identifier: string) {
    return this.tenantsService.findBySlugOrIdWithTerminals(identifier);
  }



  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: Record<string, any>) {
    console.log('🔍 [TenantsController.update] updateData recibido:', {
      description: updateData.description,
      niche: updateData.niche,
      slogan: updateData.slogan,
      allKeys: Object.keys(updateData),
    });
    return this.tenantsService.update(id, updateData);
  }

  // ============================================================
  // 🔥 LIKES Y RATINGS
  // ============================================================

  @Post(':id/like')
  async toggleLike(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.tenantsService.toggleLike(id, body.userId);
  }

  @Get(':id/likes')
  async getLikes(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('userId') userId?: string,
  ) {
    const tokenUserId = (req as any).user?.id;
    const finalUserId = userId || tokenUserId;
    const result = await this.tenantsService.getLikes(id);

    if (finalUserId) {
      const userLiked = await this.tenantsService.getUserLike(id, finalUserId);
      return { ...result, userLiked };
    }

    return result;
  }

  @Post(':id/rate')
  async rateStore(
    @Param('id') id: string,
    @Body() body: { userId: string; rating: number; comment?: string },
  ) {
    return this.tenantsService.rateStore(id, body.userId, body.rating, body.comment);
  }

  @Get(':id/rating')
  async getRating(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.tenantsService.getRating(id);

    if (userId) {
      const userRating = await this.tenantsService.getUserRating(id, userId);
      return { ...result, userRating };
    }

    return result;
  }


  // ============================================================
  // MÉTODOS DE PAGO ACTIVOS DEL TENANT
  // ============================================================
  // Endpoint público. El comprador necesita ver las cuentas
  // activas del comercio antes de reportar un pago.
  // ============================================================

  @Get(':id/payment-methods')
  async getActivePaymentMethods(@Param('id') id: string) {
    return this.tenantsService.getActivePaymentMethods(id);
  }

  // ============================================================
  // 🔥 PIN DE SEGURIDAD - CON AUTENTICACIÓN JWT
  // ============================================================

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/security-pin')
  async getSecurityPin(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    
    return this.tenantsService.getSecurityPin(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/security-pin')
  async setSecurityPin(
    @Param('id') id: string,
    @Body() body: { pin: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    
    // Validar PIN (4-6 dígitos)
    if (!/^\d{4,6}$/.test(body.pin)) {
      throw new BadRequestException('El PIN debe tener entre 4 y 6 dígitos numéricos');
    }
    
    return this.tenantsService.setSecurityPin(id, userId, body.pin);
  }

    @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    console.log('🔍 [TenantsController.remove] Eliminando tenant:', id, 'por usuario:', userId);
    return this.tenantsService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/security-pin')
  async deleteSecurityPin(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    
    return this.tenantsService.deleteSecurityPin(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/security-pin/verify')
  async verifySecurityPin(
    @Param('id') id: string,
    @Body() body: { pin: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const userId = user?.id || user?.userId || user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    
    return this.tenantsService.verifySecurityPin(id, userId, body.pin);
  }
}