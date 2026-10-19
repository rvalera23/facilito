import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';
import { IsOptional, IsIn, IsString } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'], {
    message: 'El estatus debe ser pending, confirmed, in_progress, completed, cancelled o no_show',
  })
  status?: string;

  @IsOptional()
  @IsString()
  turnNumber?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;
} 