// ARCHIVO: apps/backend/src/modules/account/guards/onboarding.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import * as jwt from 'jsonwebtoken';


@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Extraer el ID de usuario usando tu misma lógica existente
    let userId = request.user?.['sub'] || request.user?.['id'];
    
    if (!userId) {
      const token = request.cookies?.['token'] || request.cookies?.['jwt'] || request.headers['authorization']?.replace('Bearer ', '');
      if (token) {
        try {
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
          if (!decoded) throw new UnauthorizedException('Token inválido');
                    userId = decoded?.sub || decoded?.id;
        } catch (e) {
          throw new ForbiddenException('Token inválido o expirado.');
        }
      }
    }

    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    // 2. Consultar el estado real en la base de datos (PostgreSQL)
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado.');
    }

    // 3. LA REGLA DE NEGOCIO ESTRICTA:
    // Si no ha completado el onboarding O no tiene un rol válido asignado (comprador/vendedor), bloqueamos el acceso.
    // Usamos 'as any' para evitar errores de tipo con role
    if (!user.onboarding_completed || !(user as any).role || (user as any).role === 'null') {
      throw new ForbiddenException({
        message: 'Debe completar el formulario de registro y seleccionar un perfil (comprador o vendedor) para acceder a su cuenta.',
        error_code: 'INCOMPLETE_ONBOARDING',
      });
    }

    return true;
  }
}