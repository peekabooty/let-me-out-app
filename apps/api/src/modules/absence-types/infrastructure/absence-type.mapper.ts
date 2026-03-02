import { Injectable } from '@nestjs/common';
import type { absence_type as PrismaAbsenceType } from '@prisma/client';
import { AbsenceUnit } from '@repo/types';

import { AbsenceType } from '../domain/absence-type.entity';
import type { AbsenceTypeResponseDto } from '../application/dtos/absence-type-response.dto';

@Injectable()
export class AbsenceTypeMapper {
  toDomain(prismaAbsenceType: PrismaAbsenceType): AbsenceType {
    return new AbsenceType({
      id: prismaAbsenceType.id,
      name: prismaAbsenceType.name,
      unit: prismaAbsenceType.unit as AbsenceUnit,
      maxPerYear: Number(prismaAbsenceType.max_per_year),
      minDuration: Number(prismaAbsenceType.min_duration),
      maxDuration: Number(prismaAbsenceType.max_duration),
      requiresValidation: prismaAbsenceType.requires_validation,
      allowPastDates: prismaAbsenceType.allow_past_dates,
      minDaysInAdvance: prismaAbsenceType.min_days_in_advance,
      isActive: prismaAbsenceType.is_active,
      createdAt: prismaAbsenceType.created_at,
      updatedAt: prismaAbsenceType.updated_at,
    });
  }

  toResponseDto(absenceType: AbsenceType): AbsenceTypeResponseDto {
    return {
      id: absenceType.id,
      name: absenceType.name,
      unit: absenceType.unit,
      maxPerYear: absenceType.maxPerYear,
      minDuration: absenceType.minDuration,
      maxDuration: absenceType.maxDuration,
      requiresValidation: absenceType.requiresValidation,
      allowPastDates: absenceType.allowPastDates,
      minDaysInAdvance: absenceType.minDaysInAdvance,
      isActive: absenceType.isActive,
      createdAt: absenceType.createdAt.toISOString(),
      updatedAt: absenceType.updatedAt.toISOString(),
    };
  }
}
