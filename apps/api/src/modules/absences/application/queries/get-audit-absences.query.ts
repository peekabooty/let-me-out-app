import type { AbsenceStatus } from '@repo/types';

export class GetAuditAbsencesQuery {
  constructor(
    public readonly cursor: string | undefined,
    public readonly limit: number,
    public readonly filters: {
      status?: AbsenceStatus;
      teamId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {}
}
