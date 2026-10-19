import { IsString, IsNumber, IsOptional, IsArray, ArrayMaxSize, IsBoolean, IsObject, IsIn, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateServiceDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  price: number;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  warranty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7, { message: 'La galería no puede tener más de 7 imágenes.' })
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsIn(['draft', 'published'], { message: 'El estatus debe ser draft o published' })
  status?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  availableKiosk?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  availableOnline?: boolean;

  @IsOptional()
  @IsIn(['Presencial', 'Online / Virtual', 'A Domicilio', 'Híbrido'], {
    message: 'serviceModality debe ser uno de: Presencial, Online / Virtual, A Domicilio, Híbrido',
  })
  serviceModality?: string;

  // 🔥 NUEVO: IDs de profesionales asignados al servicio
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada ID de profesional debe ser un UUID válido' })
  professionals?: string[];  // ✅ CAMBIADO DE professionalIds A professionals
}