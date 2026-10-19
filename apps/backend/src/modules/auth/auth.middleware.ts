// ARCHIVO: apps/backend/src/modules/auth/auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      authContext?: {
        userId: string;
        email: string;
        role: string;
        hasTenant: boolean;
        tenantSlug: string | null;
        onboarding_completed: boolean;
      };
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.['token'] || req.cookies?.['access_token'];

    if (token) {
      try {
        // 🔥 Fase 6.7: doble validación durante rotación de secretos.
        const secrets: string[] = [];
        if (process.env.JWT_SECRET_NEW) secrets.push(process.env.JWT_SECRET_NEW);
        if (process.env.JWT_SECRET) secrets.push(process.env.JWT_SECRET);
        if (process.env.JWT_SECRET_OLD) secrets.push(process.env.JWT_SECRET_OLD);
        if (secrets.length === 0) secrets.push('tu_secreto_super_seguro');

        let decoded: any = null;
        for (const secret of secrets) {
          try {
            decoded = jwt.verify(token, secret);
            break;
          } catch {}
        }
        if (!decoded) throw new Error('Token inválido');

        req.user = decoded;

        req.authContext = {
          userId: decoded.sub || decoded.id || '',
          email: decoded.email || '',
          role: decoded.role || 'buyer',
          hasTenant: decoded.hasTenant || false,
          tenantSlug: decoded.tenantSlug || null,
          onboarding_completed: decoded.onboarding_completed || false,
        };
      } catch (e) {
req.user = undefined;
        req.authContext = undefined;
      }
    } else {
req.user = undefined;
      req.authContext = undefined;
    }

    next();
  }
}