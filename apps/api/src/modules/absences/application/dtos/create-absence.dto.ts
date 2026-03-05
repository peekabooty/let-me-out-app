import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateAbsenceDto {
  @IsUUID()
  @IsNotEmpty()
  absenceTypeId!: string;

  @IsDateString()
  @IsNotEmpty()
  startAt!: string;

  @IsDateString()
  @IsNotEmpty()
  endAt!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  validatorIds?: string[];
}
