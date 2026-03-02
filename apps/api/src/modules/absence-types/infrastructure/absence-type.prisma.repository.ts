import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { AbsenceType } from '../domain/absence-type.entity';
import type { AbsenceTypeRepositoryPort } from '../domain/ports/absence-type.repository.port';
import { AbsenceTypeMapper } from './absence-type.mapper';

@Injectable()
export class AbsenceTypePrismaRepository implements AbsenceTypeRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: AbsenceTypeMapper
  ) {}

  async findById(id: string): Promise<AbsenceType | null> {
    const record = await this.prisma.absence_type.findUnique({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findAll(): Promise<AbsenceType[]> {
    const records = await this.prisma.absence_type.findMany({
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async findAllActive(): Promise<AbsenceType[]> {
    const records = await this.prisma.absence_type.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async save(absenceType: AbsenceType): Promise<void> {
    await this.prisma.absence_type.create({
      data: {
        id: absenceType.id,
        name: absenceType.name,
        unit: absenceType.unit,
        max_per_year: absenceType.maxPerYear,
        min_duration: absenceType.minDuration,
        max_duration: absenceType.maxDuration,
        requires_validation: absenceType.requiresValidation,
        allow_past_dates: absenceType.allowPastDates,
        min_days_in_advance: absenceType.minDaysInAdvance,
        is_active: absenceType.isActive,
        created_at: absenceType.createdAt,
        updated_at: absenceType.updatedAt,
      },
    });
  }

  async update(absenceType: AbsenceType): Promise<void> {
    await this.prisma.absence_type.update({
      where: { id: absenceType.id },
      data: {
        name: absenceType.name,
        unit: absenceType.unit,
        max_per_year: absenceType.maxPerYear,
        min_duration: absenceType.minDuration,
        max_duration: absenceType.maxDuration,
        requires_validation: absenceType.requiresValidation,
        allow_past_dates: absenceType.allowPastDates,
        min_days_in_advance: absenceType.minDaysInAdvance,
        is_active: absenceType.isActive,
        updated_at: absenceType.updatedAt,
      },
    });
  }
}
