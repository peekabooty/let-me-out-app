import { IsString, MinLength, Matches } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres.' })
  @Matches(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula.' })
  @Matches(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula.' })
  @Matches(/[0-9]/, { message: 'La contraseña debe contener al menos un número.' })
  @Matches(/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/]/, {
    message: 'La contraseña debe contener al menos un símbolo.',
  })
  password!: string;
}
