import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { User } from '../entities/user.entity';
import { getJwtSecrets } from '../utils/jwt-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Passport requiere un string. Le pasamos el primero, pero
      // usamos authenticate() override para hacer fallback manual.
      secretOrKey: getJwtSecrets()[0],
    });
  }

  /**
   * Fase 6.7 — Override de `authenticate` para doble validación.
   *
   * Passport NO soporta arrays en `secretOrKey`. Acá interceptamos:
   * probamos cada secreto (nuevo → viejo) y, si uno valida, hacemos
   * `this.success()` con el payload. Ese payload va a `validate()`.
   */
  async authenticate(req: any): Promise<void> {
    const authHeader = req.headers?.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return this.fail('No auth token', 401);
    }

    const token = authHeader.substring(7);
    const secrets = getJwtSecrets();

    let payload: any = null;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret);
        break;
      } catch {
        // probar siguiente secreto
      }
    }

    if (!payload) {
      return this.fail('Token inválido o expirado', 401);
    }

    // 🔥 Llamamos a validate() manualmente para cargar el user
    try {
      const user = await this.validate(payload);
      return this.success(user);
    } catch (e) {
      return this.fail('Usuario no encontrado', 401);
    }
  }

  async validate(payload: any) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // 🔥 Devolvemos un objeto plano que combina:
    //   - La entity de User (id, email, name, role, ...)
    //   - Los campos del JWT que NO están en la entity:
    //       * tenantId   → el tenant ACTIVO del user (un user puede tener varios)
    //       * tenantSlug → slug del tenant activo
    //       * role       → el rol del JWT GANA sobre la entity, porque el JWT
    //                      refleja el rol "activo" (un buyer con tienda se
    //                      promueve a seller en el token).
    //       * activeRole → idem.
    //
    // Esto es lo que el resto del proyecto YA espera (`req.user.tenantId`).
    return {
      ...user,
      role: payload.role || user.role,
      activeRole: payload.activeRole || payload.role || user.role,
      tenantId: payload.tenantId || (user as any).tenantId || null,
      tenantSlug: payload.tenantSlug || (user as any).tenantSlug || null,
    };
  }
}