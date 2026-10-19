// ==========================================
// ARCHIVO: apps/backend/src/common/auth/roles.decorator.ts
// Decorador @Roles('admin', 'seller') para marcar endpoints que
// requieren uno o más roles.
// ==========================================

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type AppRole =
  | 'buyer'
  | 'seller'
  | 'admin'
  | 'repartidor'
  | 'profesional'
  | 'owner';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
