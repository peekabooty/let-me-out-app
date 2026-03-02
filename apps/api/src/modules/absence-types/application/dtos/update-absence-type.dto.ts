import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAbsenceTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999.99)
  maxPerYear?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999.99)
  minDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999.99)
  maxDuration?: number;

  @IsOptional()
  @IsBoolean()
  requiresValidation?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPastDates?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minDaysInAdvance?: number | null;
}
