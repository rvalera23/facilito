// backend/src/modules/products/dto/create-product.dto.ts

import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsArray, 
  ArrayMaxSize, 
  IsBoolean, 
  IsObject, 
  IsIn, 
  IsUUID,
  Min,
  Max,
  IsDateString
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  // 🛠️ Transformación para asegurar que cadenas vacías o espacios se conviertan en null
  @IsOptional()
  @Transform(({ value }) => (!value || value.trim() === '' ? null : value))
  @IsUUID('4', { message: 'El tenantId debe ser un UUID válido' })
  tenantId?: string;

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
  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  stock?: number;

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
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

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

  // 🔥🔥🔥 IVA 🔥🔥🔥
  @IsOptional()
  @IsString()
  @IsIn(['included', 'excluded', 'exempt'], { message: 'El tipo de IVA debe ser included, excluded o exempt' })
  ivaType?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  ivaRate?: number;

  // ✅ ✅ ✅ NUEVOS CAMPOS DE OFERTA Y DESCUENTO ✅ ✅ ✅
  // ============================================================
  
  // 🔥 Indica si el producto está en oferta
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  onSale?: boolean;

  // 🔥 Porcentaje de descuento (0-100)
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(100, { message: 'El descuento no puede ser mayor a 100%' })
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : 0))
  discountPercentage?: number;

  // 🔥 Fecha de inicio de la oferta (opcional)
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  discountStartDate?: string;

  // 🔥 Fecha de fin de la oferta (opcional)
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  discountEndDate?: string;

  // ============================================================
}