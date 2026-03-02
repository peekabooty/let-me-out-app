import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';

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

  @IsUUID()
  @IsNotEmpty()
  @IsString()
  userId!: string;
}
