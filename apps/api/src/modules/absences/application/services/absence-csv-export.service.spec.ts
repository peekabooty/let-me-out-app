import type { AbsenceAuditRepositoryPort } from '../../domain/ports/absence-audit.repository.port';
import { AbsenceCsvExportService } from './absence-csv-export.service';

const makeAuditRepository = (
  overrides: Partial<AbsenceAuditRepositoryPort> = {}
): AbsenceAuditRepositoryPort => ({
  findAuditAbsencesPage: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
  findUserAbsencesPageForExport: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
  ...overrides,
});

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.on('end', () => resolve());
    stream.on('error', reject);
  });

  return Buffer.concat(chunks).toString('utf8');
}

describe('AbsenceCsvExportService', () => {
  it('exports CSV header and rows from audit repository', async () => {
    const repository = makeAuditRepository({
      findAuditAbsencesPage: jest.fn().mockResolvedValueOnce({
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
            status: 'accepted',
            createdAt: new Date('2025-01-10T12:00:00.000Z'),
            updatedAt: new Date('2025-01-12T12:00:00.000Z'),
          },
        ],
        nextCursor: null,
      }),
    });

    const service = new AbsenceCsvExportService();
    const stream = service.exportAuditAbsences(repository, {});
    const csv = await readStream(stream);

    expect(csv).toContain('id,user_id,user_name,absence_type_id');
    expect(csv).toContain('01930000-0000-7000-8000-000000000301');
    expect(csv).toContain('Ana García');
    expect(repository.findAuditAbsencesPage).toHaveBeenCalledTimes(1);
  });

  it('uses paginated fetch until nextCursor is null', async () => {
    const repository = makeAuditRepository({
      findUserAbsencesPageForExport: jest
        .fn()
        .mockResolvedValueOnce({
          items: [
            {
              id: 'row-1',
              userId: 'u-1',
              userName: 'User One',
              absenceTypeId: 't-1',
              absenceTypeName: 'Vacation',
              startAt: new Date('2025-01-01T00:00:00.000Z'),
              endAt: new Date('2025-01-02T00:00:00.000Z'),
              duration: 1,
              status: 'accepted',
              createdAt: new Date('2024-12-01T00:00:00.000Z'),
              updatedAt: new Date('2024-12-01T00:00:00.000Z'),
            },
          ],
          nextCursor: 'row-1',
        })
        .mockResolvedValueOnce({
          items: [
            {
              id: 'row-2',
              userId: 'u-1',
              userName: 'User One',
              absenceTypeId: 't-1',
              absenceTypeName: 'Vacation',
              startAt: new Date('2025-01-03T00:00:00.000Z'),
              endAt: new Date('2025-01-04T00:00:00.000Z'),
              duration: 1,
              status: 'accepted',
              createdAt: new Date('2024-12-02T00:00:00.000Z'),
              updatedAt: new Date('2024-12-02T00:00:00.000Z'),
            },
          ],
          nextCursor: null,
        }),
    });

    const service = new AbsenceCsvExportService();
    const stream = service.exportUserAbsences(repository, 'u-1', {});
    const csv = await readStream(stream);

    expect(csv).toContain('row-1');
    expect(csv).toContain('row-2');
    expect(repository.findUserAbsencesPageForExport).toHaveBeenCalledTimes(2);
  });
});
