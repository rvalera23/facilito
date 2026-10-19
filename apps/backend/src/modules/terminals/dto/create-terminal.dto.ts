import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTerminalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  kioskSlug?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  metadata?: object;
}