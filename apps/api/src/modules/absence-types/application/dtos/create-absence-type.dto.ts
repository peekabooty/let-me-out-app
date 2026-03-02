import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { AbsenceUnit } from '@repo/types';

export class CreateAbsenceTypeDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(AbsenceUnit)
  unit!: AbsenceUnit;

  @IsNumber()
  @Min(0)
  @Max(9999.99)
  maxPerYear!: number;

  @IsNumber()
  @Min(0)
  @Max(9999.99)
  minDuration!: number;

  @IsNumber()
  @Min(0)
  @Max(9999.99)
  maxDuration!: number;

  @IsBoolean()
  requiresValidation!: boolean;

  @IsBoolean()
  allowPastDates!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minDaysInAdvance!: number | null;
}
