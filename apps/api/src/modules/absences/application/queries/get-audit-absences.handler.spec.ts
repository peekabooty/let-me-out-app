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
  it('maps page response and next cursor', async () => {
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

    expect(result.items).toHaveLength(1);
    expect(result.items[0].userName).toBe('Ana García');
    expect(result.items[0].status).toBe(AbsenceStatus.ACCEPTED);
    expect(result.nextCursor).toBe('01930000-0000-7000-8000-000000000301');
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
});
