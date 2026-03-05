import { AbsenceStatus } from '@repo/types';

import type { AbsenceAuditRepositoryPort } from '../../domain/ports/absence-audit.repository.port';
import { GetAuditAbsencesQuery } from './get-audit-absences.query';
import { GetAuditAbsencesHandler } from './get-audit-absences.handler';

const makeAuditRepository = (
  overrides: Partial<AbsenceAuditRepositoryPort> = {}
): AbsenceAuditRepositoryPort => ({
  findAuditAbsencesPage: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
  findUserAbsencesPageForExport: jest.fn(),
  ...overrides,
});

describe('GetAuditAbsencesHandler', () => {
  it('maps page items to flat array response with teamId and teamName', async () => {
    const repository = makeAuditRepository({
      findAuditAbsencesPage: jest.fn().mockResolvedValue({
        items: [
          {
            id: '01930000-0000-7000-8000-000000000301',
            userId: '01930000-0000-7000-8000-000000000010',
            userName: 'Ana García',
            absenceTypeId: '01930000-0000-7000-8000-000000000020',
            absenceTypeName: 'Vacaciones',
            startAt: new Date('2025-02-10T00:00:00.000Z'),
            endAt: new Date('2025-02-11T23:59:59.999Z'),
            duration: 2,
            status: AbsenceStatus.ACCEPTED,
            teamId: 'team-001',
            teamName: 'Engineering',
            createdAt: new Date('2025-01-10T12:00:00.000Z'),
            updatedAt: new Date('2025-01-12T12:00:00.000Z'),
          },
        ],
        nextCursor: '01930000-0000-7000-8000-000000000301',
      }),
    });

    const handler = new GetAuditAbsencesHandler(repository);

    const result = await handler.execute(
      new GetAuditAbsencesQuery(undefined, 25, {
        status: AbsenceStatus.ACCEPTED,
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0].userName).toBe('Ana García');
    expect(result[0].status).toBe(AbsenceStatus.ACCEPTED);
    expect(result[0].teamId).toBe('team-001');
    expect(result[0].teamName).toBe('Engineering');
    expect(result[0].startAt).toBe('2025-02-10T00:00:00.000Z');
  });

  it('returns flat array with null teamId and teamName when user has no team', async () => {
    const repository = makeAuditRepository({
      findAuditAbsencesPage: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'absence-1',
            userId: 'user-1',
            userName: 'Bob Smith',
            absenceTypeId: 'type-1',
            absenceTypeName: 'Sick Leave',
            startAt: new Date('2025-03-01T00:00:00.000Z'),
            endAt: new Date('2025-03-02T23:59:59.999Z'),
            duration: 2,
            status: AbsenceStatus.WAITING_VALIDATION,
            teamId: null,
            teamName: null,
            createdAt: new Date('2025-02-01T12:00:00.000Z'),
            updatedAt: new Date('2025-02-01T12:00:00.000Z'),
          },
        ],
        nextCursor: null,
      }),
    });

    const handler = new GetAuditAbsencesHandler(repository);
    const result = await handler.execute(new GetAuditAbsencesQuery(undefined, 25, {}));

    expect(result).toHaveLength(1);
    expect(result[0].teamId).toBeNull();
    expect(result[0].teamName).toBeNull();
  });

  it('passes cursor and filters to repository', async () => {
    const repository = makeAuditRepository();
    const handler = new GetAuditAbsencesHandler(repository);

    await handler.execute(
      new GetAuditAbsencesQuery('cursor-1', 10, {
        teamId: '01930000-0000-7000-8000-000000000099',
      })
    );

    expect(repository.findAuditAbsencesPage).toHaveBeenCalledWith({
      cursor: 'cursor-1',
      limit: 10,
      filters: {
        teamId: '01930000-0000-7000-8000-000000000099',
      },
    });
  });

  it('returns empty array when no absences found', async () => {
    const repository = makeAuditRepository({
      findAuditAbsencesPage: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    });

    const handler = new GetAuditAbsencesHandler(repository);
    const result = await handler.execute(new GetAuditAbsencesQuery(undefined, 25, {}));

    expect(result).toEqual([]);
  });
});
