import type { AbsenceStatus } from '@repo/types';

export interface AuditAbsenceRecord {
  id: string;
  userId: string;
  userName: string;
  absenceTypeId: string;
  absenceTypeName: string;
  startAt: Date;
  endAt: Date;
  duration: number;
  status: AbsenceStatus | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditAbsencePage {
  items: AuditAbsenceRecord[];
  nextCursor: string | null;
}

export interface AuditAbsenceFilters {
  status?: AbsenceStatus;
  teamId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AbsenceAuditRepositoryPort {
  findAuditAbsencesPage(params: {
    cursor?: string;
    limit: number;
    filters: AuditAbsenceFilters;
  }): Promise<AuditAbsencePage>;

  findUserAbsencesPageForExport(params: {
    userId: string;
    cursor?: string;
    limit: number;
    filters: Omit<AuditAbsenceFilters, 'teamId'>;
  }): Promise<AuditAbsencePage>;
}

export const ABSENCE_AUDIT_REPOSITORY_PORT = Symbol('AbsenceAuditRepositoryPort');
