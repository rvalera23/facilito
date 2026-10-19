import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEmail,
  IsObject,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateBookingDto {
  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsDateString()
  bookingDate: string;

  @IsString()
  startTime: string;

  @IsNumber()
  @Transform(({ value }) => (value !== '' && value !== null ? Number(value) : undefined))
  durationMinutes: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'confirmed'], { message: 'El estatus debe ser pending o confirmed' })
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['web', 'kiosk', 'admin', 'buyer'], {
    message: 'source debe ser web, kiosk, admin o buyer',
  })
  source?: string;
}