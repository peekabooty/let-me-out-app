import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  ABSENCE_AUDIT_REPOSITORY_PORT,
  type AbsenceAuditRepositoryPort,
} from '../../domain/ports/absence-audit.repository.port';
import type { AuditListAbsencesResponseDto } from '../dtos/audit-list-absences.dto';
import { GetAuditAbsencesQuery } from './get-audit-absences.query';

@QueryHandler(GetAuditAbsencesQuery)
export class GetAuditAbsencesHandler implements IQueryHandler<
  GetAuditAbsencesQuery,
  AuditListAbsencesResponseDto
> {
  constructor(
    @Inject(ABSENCE_AUDIT_REPOSITORY_PORT)
    private readonly auditRepository: AbsenceAuditRepositoryPort
  ) {}

  async execute(query: GetAuditAbsencesQuery): Promise<AuditListAbsencesResponseDto> {
    const page = await this.auditRepository.findAuditAbsencesPage({
      ...(query.cursor ? { cursor: query.cursor } : {}),
      limit: query.limit,
      filters: query.filters,
    });

    return {
      items: page.items.map((absence) => ({
        id: absence.id,
        userId: absence.userId,
        userName: absence.userName,
        absenceTypeId: absence.absenceTypeId,
        absenceTypeName: absence.absenceTypeName,
        startAt: absence.startAt.toISOString(),
        endAt: absence.endAt.toISOString(),
        duration: absence.duration,
        status: absence.status,
        createdAt: absence.createdAt.toISOString(),
        updatedAt: absence.updatedAt.toISOString(),
      })),
      nextCursor: page.nextCursor,
    };
  }
}
