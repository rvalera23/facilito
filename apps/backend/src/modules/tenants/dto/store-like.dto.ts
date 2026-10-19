// ARCHIVO: apps/backend/src/modules/tenants/dto/store-like.dto.ts

import { IsUUID, IsNotEmpty } from 'class-validator';

export class StoreLikeDto {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio' })
  userId: string;
}