// ==========================================
// ARCHIVO: apps/backend/src/common/interceptors/cache.interceptor.ts
// ==========================================
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // 🔥 SOLO cachear imágenes (archivos estáticos en /uploads/)
    // Excluir cualquier ruta que sea API
    const isImage = 
      request.url.includes('/uploads/') &&
      !request.url.includes('/api/');

    if (isImage) {
      // Imágenes: cache por 1 año (son archivos estáticos que no cambian)
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // TODO lo demás: NO cachear (precios, autenticación, datos de usuario, etc.)
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    }

    return next.handle();
  }
}