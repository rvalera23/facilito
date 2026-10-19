// ==========================================
// ARCHIVO: apps/backend/src/common/auth/roles.guard.ts
// Guard que valida que el user tenga uno de los roles permitidos.
// Asume que AuthGuard('jwt') corrió antes y dejó req.user cargado.
// ==========================================

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Roles requeridos por el handler
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay @Roles, no restringimos
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Obtener user del request (lo deja AuthGuard('jwt'))
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    // 3. Rol del user
    const userRole: AppRole | undefined = user.role || user.activeRole;

    if (!userRole) {
      throw new ForbiddenException('Usuario sin rol asignado');
    }

    // 4. ¿Está permitido?
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Requiere uno de los roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
