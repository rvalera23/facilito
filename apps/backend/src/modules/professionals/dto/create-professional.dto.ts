import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProfessionalDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsObject()
  schedule?: Record<string, any>;

  @IsOptional()
  @IsArray()
  breaks?: any[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  reviewsCount?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  // ❌ ELIMINADO: status completamente
}