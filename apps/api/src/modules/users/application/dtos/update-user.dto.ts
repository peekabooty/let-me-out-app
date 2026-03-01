import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@repo/types';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
