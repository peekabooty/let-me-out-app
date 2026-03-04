import { Injectable } from '@nestjs/common';
import { PassThrough } from 'node:stream';

import type {
  AbsenceAuditRepositoryPort,
  AuditAbsenceFilters,
  AuditAbsencePage,
} from '../../domain/ports/absence-audit.repository.port';

const EXPORT_PAGE_SIZE = 200;

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function toCsvLine(values: string[]): string {
  return `${values.map((value) => escapeCsv(value)).join(',')}\n`;
}

@Injectable()
export class AbsenceCsvExportService {
  exportAuditAbsences(
    repository: AbsenceAuditRepositoryPort,
    filters: AuditAbsenceFilters
  ): PassThrough {
    return this.streamCsv((cursor) =>
      repository.findAuditAbsencesPage({
        ...(cursor ? { cursor } : {}),
        limit: EXPORT_PAGE_SIZE,
        filters,
      })
    );
  }

  exportUserAbsences(
    repository: AbsenceAuditRepositoryPort,
    userId: string,
    filters: Omit<AuditAbsenceFilters, 'teamId'>
  ): PassThrough {
    return this.streamCsv((cursor) =>
      repository.findUserAbsencesPageForExport({
        userId,
        ...(cursor ? { cursor } : {}),
        limit: EXPORT_PAGE_SIZE,
        filters,
      })
    );
  }

  private streamCsv(fetchPage: (cursor?: string) => Promise<AuditAbsencePage>): PassThrough {
    const stream = new PassThrough();
    stream.write(
      toCsvLine([
        'id',
        'user_id',
        'user_name',
        'absence_type_id',
        'absence_type_name',
        'start_at',
        'end_at',
        'duration',
        'status',
        'created_at',
        'updated_at',
      ])
    );

    void (async () => {
      try {
        let cursor: string | undefined;

        while (true) {
          const page = await fetchPage(cursor);

          for (const item of page.items) {
            stream.write(
              toCsvLine([
                item.id,
                item.userId,
                item.userName,
                item.absenceTypeId,
                item.absenceTypeName,
                item.startAt.toISOString(),
                item.endAt.toISOString(),
                item.duration.toString(),
                item.status ?? '',
                item.createdAt.toISOString(),
                item.updatedAt.toISOString(),
              ])
            );
          }

          if (!page.nextCursor) {
            break;
          }

          cursor = page.nextCursor;
        }

        stream.end();
      } catch (error) {
        stream.destroy(error as Error);
      }
    })();

    return stream;
  }
}
