// ==========================================
// ARCHIVO: apps/backend/src/main.ts
// ==========================================
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import compression = require('compression');
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // 1. Compresión
  app.use(compression());

  // 2. Cookie parser
  app.use(cookieParser());

  // 3. 🔥 HELMET — headers de seguridad HTTP
  // Desactivamos Content-Security-Policy y crossOriginEmbedderPolicy
  // porque rompen apps SPA. El resto queda activo.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 4. 🔥 CORS - PARA TODAS LAS RUTAS
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isProd = process.env.NODE_ENV === 'production';

  // En producción, exigimos CORS_ORIGINS definido.
  if (isProd && corsOrigins.length === 0) {
    console.error('❌ [CORS] CORS_ORIGINS no está definido en producción. Abortando.');
    process.exit(1);
  }

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders:
      'Content-Type, Authorization, Accept, X-Requested-With, X-Refresh-Token',
    exposedHeaders: 'X-Refresh-Token',
  });

  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // 4. 🔥 SERVIDOR DE ARCHIVOS ESTÁTICOS CON HEADERS CORRECTOS
  // 🔥 Usar el primer origen permitido para CORS de assets estáticos
  const staticCorsOrigin = corsOrigins[0] || '*';
  app.useStaticAssets(join(process.cwd(), 'public/uploads'), {
    prefix: '/uploads',
    setHeaders: (res, path, stat) => {
      // 🔥 CORS - FORZAR SIEMPRE
      res.setHeader('Access-Control-Allow-Origin', staticCorsOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'jpe': 'image/jpeg',
        'jfif': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'avif': 'image/avif',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
      };
      if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }
      
      // 🔥 CACHÉ
      res.setHeader('Cache-Control', 'public, max-age=604800');
    },
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`✅ Application is running on: ${await app.getUrl()}`);
}
bootstrap();