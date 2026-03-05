import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { Observation } from '../domain/observation.entity';
import type { ObservationRepositoryPort } from '../domain/ports/observation.repository.port';
import { ObservationMapper } from './observation.mapper';

@Injectable()
export class ObservationPrismaRepository implements ObservationRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ObservationMapper
  ) {}

  async save(observation: Observation): Promise<void> {
    await this.prisma.observation.create({
      data: {
        id: observation.id,
        absence_id: observation.absenceId,
        user_id: observation.userId,
        content: observation.content,
        created_at: observation.createdAt,
      },
    });
  }

  async findByAbsenceId(absenceId: string): Promise<Observation[]> {
    const records = await this.prisma.observation.findMany({
      where: { absence_id: absenceId },
      orderBy: { created_at: 'asc' },
    });

    return records.map((record) => this.mapper.toDomain(record));
  }

  async findById(id: string): Promise<Observation | null> {
    const record = await this.prisma.observation.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.mapper.toDomain(record);
  }
}
