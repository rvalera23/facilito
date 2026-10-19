import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';

export interface AccessPayload {
  sub: string;
  email: string;
  role: string;
  hasTenant: boolean;
  tenantSlug: string | null;
  tenantId: string | null;
  onboarding_completed: boolean;
  emailVerified: boolean;
}

@Injectable()
export class TokenService {
  constructor(private readonly cfg: ConfigService) {}

  private get accessSecret() {
    // 🔥 Fase 6.7: prioriza JWT_SECRET_NEW durante la rotación.
    return (
      this.cfg.get<string>('JWT_SECRET_NEW') ||
      this.cfg.get<string>('JWT_SECRET') ||
      'tu_secreto_super_seguro'
    );
  }

  private get accessSecretOld() {
    // Secreto anterior durante la rotación.
    return this.cfg.get<string>('JWT_SECRET_OLD') || null;
  }
    private get refreshSecret() { return this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET'); }
  private get resetSecret()   { return this.cfg.getOrThrow<string>('JWT_RESET_SECRET'); }
  private get verifySecret()  { return this.cfg.getOrThrow<string>('JWT_VERIFY_SECRET'); }

  private get accessExpires()  { return this.cfg.get<string>('JWT_ACCESS_EXPIRES', '15m'); }
  private get refreshExpires() { return this.cfg.get<string>('JWT_REFRESH_EXPIRES', '30d'); }

  signAccess(payload: AccessPayload): string {
    return jwt.sign(payload, this.accessSecret, {
      algorithm: 'HS256',
      expiresIn: this.accessExpires as any,
    });
  }

  verifyAccess(token: string): AccessPayload & { iat: number; exp: number } {
    // Intento con el nuevo
    try {
      return jwt.verify(token, this.accessSecret) as any;
    } catch {}

    // Fallback al viejo
    const oldSecret = this.accessSecretOld;
    if (oldSecret) {
      try {
        return jwt.verify(token, oldSecret) as any;
      } catch {}
    }

    throw new UnauthorizedException('Token inválido o expirado');
  }

  signRefresh(userId: string): { token: string; jti: string; expiresAt: Date } {
    const jti = randomUUID();
    const token = jwt.sign({ sub: userId, jti }, this.refreshSecret, {
      algorithm: 'HS256',
      expiresIn: this.refreshExpires as any,
    });
    const decoded: any = jwt.decode(token);
    return { token, jti, expiresAt: new Date(decoded.exp * 1000) };
  }

  verifyRefresh(token: string): { sub: string; jti: string; exp: number } {
    try {
      return jwt.verify(token, this.refreshSecret) as any;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  signReset(userId: string): string {
    return jwt.sign({ sub: userId, purpose: 'reset' }, this.resetSecret, {
      algorithm: 'HS256',
      expiresIn: '15m',
    });
  }

  verifyReset(token: string): { sub: string } {
    const p: any = jwt.verify(token, this.resetSecret);
    if (p.purpose !== 'reset') throw new UnauthorizedException();
    return p;
  }

  signVerify(userId: string): string {
    return jwt.sign({ sub: userId, purpose: 'verify' }, this.verifySecret, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });
  }

  verifyEmailToken(token: string): { sub: string } {
    const p: any = jwt.verify(token, this.verifySecret);
    if (p.purpose !== 'verify') throw new UnauthorizedException();
    return p;
  }

  sha256(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
