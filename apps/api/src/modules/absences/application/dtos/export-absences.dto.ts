import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AbsenceStatus } from '@repo/types';

export class ExportAbsencesQueryDto {
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsEnum(AbsenceStatus)
  status?: AbsenceStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
