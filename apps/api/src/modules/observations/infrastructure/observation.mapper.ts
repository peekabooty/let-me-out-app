import { Injectable } from '@nestjs/common';
import type { observation as PrismaObservation } from '@prisma/client';

import { Observation } from '../domain/observation.entity';
import type { ObservationResponseDto } from '../application/dtos/observation-response.dto';

@Injectable()
export class ObservationMapper {
  toDomain(prismaObservation: PrismaObservation): Observation {
    return new Observation({
      id: prismaObservation.id,
      absenceId: prismaObservation.absence_id,
      userId: prismaObservation.user_id,
      content: prismaObservation.content,
      createdAt: prismaObservation.created_at,
    });
  }

  toResponseDto(observation: Observation): ObservationResponseDto {
    return {
      id: observation.id,
      absenceId: observation.absenceId,
      userId: observation.userId,
      content: observation.content,
      createdAt: observation.createdAt.toISOString(),
    };
  }
}
