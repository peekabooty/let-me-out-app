import { Injectable } from '@nestjs/common';
import type { absence as PrismaAbsence } from '@prisma/client';
import { AbsenceStatus } from '@repo/types';

import { Absence } from '../domain/absence.entity';
import type { AbsenceResponseDto } from '../application/dtos/absence-response.dto';

@Injectable()
export class AbsenceMapper {
  toDomain(prismaAbsence: PrismaAbsence): Absence {
    return new Absence({
      id: prismaAbsence.id,
      userId: prismaAbsence.user_id,
      absenceTypeId: prismaAbsence.absence_type_id,
      startAt: prismaAbsence.start_at,
      endAt: prismaAbsence.end_at,
      duration: Number(prismaAbsence.duration),
      status: prismaAbsence.status as AbsenceStatus | null,
      createdAt: prismaAbsence.created_at,
      updatedAt: prismaAbsence.updated_at,
    });
  }

  toResponseDto(absence: Absence): AbsenceResponseDto {
    return {
      id: absence.id,
      userId: absence.userId,
      absenceTypeId: absence.absenceTypeId,
      startAt: absence.startAt.toISOString(),
      endAt: absence.endAt.toISOString(),
      duration: absence.duration,
      status: absence.status,
      createdAt: absence.createdAt.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
    };
  }
}
