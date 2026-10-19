import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from './password-policy';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'La contraseña actual es obligatoria' })
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
