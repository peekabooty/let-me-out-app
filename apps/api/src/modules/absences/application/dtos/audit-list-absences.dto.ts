import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AbsenceStatus } from '@repo/types';

export class AuditListAbsencesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

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

export interface AuditAbsenceItemDto {
  id: string;
  userId: string;
  userName: string;
  absenceTypeId: string;
  absenceTypeName: string;
  startAt: string;
  endAt: string;
  duration: number;
  status: AbsenceStatus | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditListAbsencesResponseDto = AuditAbsenceItemDto[];
