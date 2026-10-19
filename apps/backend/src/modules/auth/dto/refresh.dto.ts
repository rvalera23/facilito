import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
