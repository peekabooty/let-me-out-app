import { IsEnum, IsNotEmpty } from 'class-validator';
import { ValidationDecision } from '@repo/types';

export class ValidateAbsenceDto {
  @IsEnum(ValidationDecision)
  @IsNotEmpty()
  decision!: ValidationDecision;
}
