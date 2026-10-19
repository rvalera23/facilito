// apps/backend/src/modules/tenants/dto/create-tenant.dto.ts

import { IsString, IsNotEmpty, Matches, IsOptional, IsObject, IsEmail, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  idType?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  accountIdentifier?: string;

  @IsString()
  @IsOptional()
  holderName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateTenantDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la tienda es obligatorio' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El slug es obligatorio para la URL de la tienda' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones (ej. bodega-don-pepe)',
  })
  slug: string;

  @IsString()
  @IsOptional()
  customDomain?: string;

  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  passwordHash?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nicho del negocio es obligatorio' })
  niche: string;

  @IsString()
  @IsOptional()
  slogan?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  modelType?: string;

  @IsString()
  @IsOptional()
  workModality?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  deliveryCity?: string;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  addressType?: string;

  @IsString()
  @IsOptional()
  addressZone?: string;

  @IsString()
  @IsOptional()
  addressStreet?: string;

  @IsString()
  @IsOptional()
  addressNumber?: string;

  @IsString()
  @IsOptional()
  addressReference?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  municipality?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  geoPrecision?: string;

  @IsString()
  @IsOptional()
  geoSource?: string;

  // ============================================================
  // DELIVERY — configuración de envío del negocio
  // ============================================================
  @IsNumber()
  @IsOptional()
  deliveryBaseFee?: number;

  @IsNumber()
  @IsOptional()
  deliveryPerKmFee?: number;

  @IsNumber()
  @IsOptional()
  deliveryMinOrder?: number;

  @IsNumber()
  @IsOptional()
  deliveryMaxRadiusKm?: number | null;

  @IsNumber()
  @IsOptional()
  deliveryPrepTimeMin?: number;

  @IsNumber()
  @IsOptional()
  deliveryAvgSpeedKmh?: number;

  @IsBoolean()
  @IsOptional()
  acceptsPickup?: boolean;

  @IsString()
  @IsNotEmpty({ message: 'El color principal es obligatorio' })
  primaryColor: string;

  @IsString()
  @IsNotEmpty({ message: 'El color secundario es obligatorio' })
  secondaryColor: string;

  @IsString()
  @IsOptional()
  accentColor?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  fontFamily?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @IsString()
@IsOptional()
heroLayout?: string; // ✅ AGREGAR AQUÍ

  // 🔥 REDES SOCIALES - AGREGADAS
  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  tiktok?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsString()
  @IsOptional()
  telegram?: string;

  @IsString()
  @IsOptional()
  xTwitter?: string;

  @IsString()
  @IsOptional()
  x_twitter?: string;

  @IsString()
  @IsOptional()
  threads?: string;

  @IsString()
  @IsOptional()
  linkedin?: string;

  // 🔥 RIF - AGREGADO
  @IsString()
  @IsOptional()
  rif?: string;

  @IsObject({ message: 'La configuración específica debe ser un objeto JSON válido' })
  @IsOptional()
  specificConfig?: Record<string, any>;

  @IsArray()
  @IsOptional()
  currencies?: string[];

  @IsString()
  @IsOptional()
  preferredCurrency?: string;

  @IsObject({ message: 'Las configuraciones (settings) deben ser un objeto JSON válido' })
  @IsOptional()
  settings?: Record<string, any>;

  @IsOptional()
  paymentMethods?: any;

  @IsArray()
  @IsOptional()
  activePaymentMethods?: string[];
}