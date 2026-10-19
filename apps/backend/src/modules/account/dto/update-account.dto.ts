// apps/backend/src/modules/account/dto/update-account.dto.ts

import { IsOptional, IsString, IsEmail, IsNumber, MinLength, Min, Max } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // 🔥 CAMPOS DE UBICACIÓN
  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  municipality?: string;

  @IsOptional()
  @IsString()
  preferredCurrency?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MinLength(6)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;

  @IsOptional()
  @IsString()
  primary_color?: string;

  @IsOptional()
  @IsString()
  secondary_color?: string;

  @IsOptional()
  @IsString()
  accent_color?: string;

  @IsOptional()
  @IsString()
  background_color?: string;

  @IsOptional()
  @IsString()
  font_family?: string;

  // 🔥🔥🔥 AGREGAR fontWeight 🔥🔥🔥
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(900)
  fontWeight?: number;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  onboarding_completed?: boolean;
}