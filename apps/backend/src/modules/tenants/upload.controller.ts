// apps/backend/src/modules/tenants/upload.controller.ts

import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Body,
  Res,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express'; // ✅ Cambiado a 'type' import
import { TenantsService } from './tenants.service';
// ✅ Eliminado import de AuthGuard - no se usa
// import { AuthGuard } from '@nestjs/passport';
import * as fs from 'fs';
import * as path from 'path';
// ✅ Sharp import con fallback
let sharp: any;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('⚠️ Sharp no disponible, las imágenes no se optimizarán');
  sharp = null;
}

@Controller('upload')
export class UploadController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * 🔥 ENDPOINT TEMPORAL PARA SUBIR IMÁGENES SIN TENANT
   * Útil para el onboarding donde el tenant aún no existe
   */
  @Post('temp')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTempFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Validar tipo de archivo
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif',
      'image/jpg',
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagen no permitido. Solo JPG, PNG, WEBP, SVG y GIF',
      );
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`,
      );
    }

    try {
      // Generar nombre único
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = path.extname(file.originalname);
      const filename = `temp_${timestamp}_${randomStr}${ext}`;

      // Crear carpeta temporal si no existe
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // 🔥 OPTIMIZAR IMAGEN CON SHARP (si está disponible)
      let imageBuffer = file.buffer;
      const isSvg = file.mimetype === 'image/svg+xml';

      if (!isSvg && sharp) {
        try {
          // Optimizar imagen: reducir tamaño y calidad
          const optimized = await sharp(file.buffer)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();

          // Si la imagen optimizada es más pequeña, usarla
          if (optimized.length < file.buffer.length) {
            imageBuffer = optimized;
          }
        } catch (sharpError) {
          console.warn('⚠️ [Upload] Error al optimizar imagen:', sharpError.message);
          // Si falla sharp, usar el buffer original
          imageBuffer = file.buffer;
        }
      }

      // Guardar archivo
      fs.writeFileSync(filePath, imageBuffer);

      // Retornar URL temporal
      const tempUrl = `/uploads/temp/${filename}`;

      console.log(`✅ [Upload] Archivo temporal subido: ${filename} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

      return {
        success: true,
        url: tempUrl,
        filename: filename,
        size: imageBuffer.length,
        mimetype: file.mimetype,
        originalName: file.originalname,
        message: 'Imagen subida temporalmente. Se moverá a la carpeta permanente al crear el tenant.',
      };
    } catch (error) {
      console.error('❌ [Upload] Error al subir archivo temporal:', error);
      throw new BadRequestException(
        `Error al subir el archivo: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  /**
   * 🔥 ELIMINAR IMAGEN TEMPORAL (limpieza)
   */
  @Delete('temp/:filename')
  async deleteTempFile(@Param('filename') filename: string) {
    if (!filename) {
      throw new BadRequestException('Nombre de archivo requerido');
    }

    // Validar que sea un archivo temporal (seguridad)
    if (!filename.startsWith('temp_')) {
      throw new BadRequestException('Solo se pueden eliminar archivos temporales');
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'temp', filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    try {
      fs.unlinkSync(filePath);
      return {
        success: true,
        message: 'Archivo temporal eliminado correctamente',
      };
    } catch (error) {
      console.error('❌ [Upload] Error al eliminar archivo temporal:', error);
      throw new BadRequestException('Error al eliminar el archivo');
    }
  }

  /**
   * 🔥 LIMPIAR ARCHIVOS TEMPORALES ANTIGUOS (más de 24 horas)
   * Este endpoint puede ser llamado por un cron job
   */
  @Delete('temp/cleanup')
  async cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
    
    if (!fs.existsSync(tempDir)) {
      return {
        success: true,
        message: 'No hay archivos temporales para limpiar',
        deleted: 0,
      };
    }

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        try {
          fs.unlinkSync(filePath);
          deleted++;
          console.log(`🗑️ [Upload] Archivo temporal eliminado: ${file} (${Math.round(age / 3600000)}h)`);
        } catch (error) {
          console.warn(`⚠️ [Upload] No se pudo eliminar ${file}:`, error.message);
        }
      }
    }

    return {
      success: true,
      message: `Se eliminaron ${deleted} archivos temporales antiguos`,
      deleted,
    };
  }

  /**
   * 🔥 SUBIR IMAGEN PARA UN TENANT EXISTENTE
   * (endpoint original)
   */
  @Post(':tenantId/upload/:category')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('tenantId') tenantId: string,
    @Param('category') category: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const tenant = await this.tenantsService.findBySlugOrId(tenantId);
    if (!tenant) {
      throw new NotFoundException('Comercio no encontrado');
    }

    const allowedCategories = ['brand', 'product', 'profile'];
    if (!allowedCategories.includes(category)) {
      throw new BadRequestException(
        `Categoría no permitida. Permitidas: ${allowedCategories.join(', ')}`,
      );
    }

    // Validar tipo de archivo
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Formato de imagen no permitido');
    }

    // Validar tamaño
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(`El archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`);
    }

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = path.extname(file.originalname);
      const filename = `${category}_${timestamp}_${randomStr}${ext}`;

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId, category);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // Optimizar imagen
      let imageBuffer = file.buffer;
      const isSvg = file.mimetype === 'image/svg+xml';

      if (!isSvg && sharp) {
        try {
          const optimized = await sharp(file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();

          if (optimized.length < file.buffer.length) {
            imageBuffer = optimized;
          }
        } catch (sharpError) {
          console.warn('⚠️ [Upload] Error al optimizar imagen:', sharpError.message);
          imageBuffer = file.buffer;
        }
      }

      fs.writeFileSync(filePath, imageBuffer);

      const fileUrl = `/uploads/${tenantId}/${category}/${filename}`;

      return {
        success: true,
        url: fileUrl,
        filename: filename,
        size: imageBuffer.length,
        mimetype: file.mimetype,
        originalName: file.originalname,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new BadRequestException(`Error al subir el archivo: ${error.message}`);
    }
  }

  /**
   * 🔥 ELIMINAR IMAGEN
   */
  @Delete(':tenantId/delete/:category/:filename')
  async deleteFile(
    @Param('tenantId') tenantId: string,
    @Param('category') category: string,
    @Param('filename') filename: string,
  ) {
    const tenant = await this.tenantsService.findBySlugOrId(tenantId);
    if (!tenant) {
      throw new NotFoundException('Comercio no encontrado');
    }

    const allowedCategories = ['brand', 'product', 'profile'];
    if (!allowedCategories.includes(category)) {
      throw new BadRequestException('Categoría no permitida');
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', tenantId, category, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    try {
      fs.unlinkSync(filePath);
      return {
        success: true,
        message: 'Archivo eliminado correctamente',
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new BadRequestException('Error al eliminar el archivo');
    }
  }

  /**
   * 🔥 OBTENER IMAGEN
   */
  @Get(':tenantId/:category/:filename')
  async getFile(
    @Param('tenantId') tenantId: string,
    @Param('category') category: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(process.cwd(), 'public', 'uploads', tenantId, category, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return res.sendFile(filePath);
  }

  /**
   * 🔥 OBTENER IMAGEN TEMPORAL
   */
  @Get('temp/:filename')
  async getTempFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'temp', filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo temporal no encontrado');
    }

    return res.sendFile(filePath);
  }
}