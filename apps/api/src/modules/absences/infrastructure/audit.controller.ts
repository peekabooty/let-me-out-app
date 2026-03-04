import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import { AbsenceStatus, UserRole } from '@repo/types';

import { Roles } from '../../../common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuditListAbsencesResponseDto } from '../application/dtos/audit-list-absences.dto';
import { AuditListAbsencesQueryDto } from '../application/dtos/audit-list-absences.dto';
import { ExportAbsencesQueryDto } from '../application/dtos/export-absences.dto';
import { AbsenceCsvExportService } from '../application/services/absence-csv-export.service';
import { GetAuditAbsencesQuery } from '../application/queries/get-audit-absences.query';
import {
  ABSENCE_AUDIT_REPOSITORY_PORT,
  type AbsenceAuditRepositoryPort,
} from '../domain/ports/absence-audit.repository.port';

@Controller()
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly csvExportService: AbsenceCsvExportService,
    @Inject(ABSENCE_AUDIT_REPOSITORY_PORT)
    private readonly auditRepository: AbsenceAuditRepositoryPort
  ) {}

  @Get('audit/absences')
  @Roles(UserRole.AUDITOR)
  async listAuditAbsences(
    @Query() query: AuditListAbsencesQueryDto
  ): Promise<AuditListAbsencesResponseDto> {
    const parsed = this.parseFilters(query);
    const limit = query.limit ?? 25;

    return this.queryBus.execute<GetAuditAbsencesQuery, AuditListAbsencesResponseDto>(
      new GetAuditAbsencesQuery(query.cursor, limit, parsed)
    );
  }

  @Get('audit/export')
  @Roles(UserRole.AUDITOR)
  exportAuditCsv(@Query() query: ExportAbsencesQueryDto, @Res() response: Response): void {
    const parsed = this.parseFilters(query);
    const stream = this.csvExportService.exportAuditAbsences(this.auditRepository, parsed);

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="audit-absences.csv"');
    stream.pipe(response);
  }

  @Get('absences/export')
  @Roles(UserRole.STANDARD, UserRole.VALIDATOR)
  exportOwnCsv(
    @Req() request: Request,
    @Query() query: ExportAbsencesQueryDto,
    @Res() response: Response
  ): void {
    const user = request.user as { userId: string };
    const parsed = this.parseFilters(query);
    const { teamId, ...userFilters } = parsed;
    void teamId;

    const stream = this.csvExportService.exportUserAbsences(
      this.auditRepository,
      user.userId,
      userFilters
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="my-absences.csv"');
    stream.pipe(response);
  }

  private parseFilters(query: {
    status?: string;
    teamId?: string;
    startDate?: string;
    endDate?: string;
  }): {
    status?: AbsenceStatus;
    teamId?: string;
    startDate?: Date;
    endDate?: Date;
  } {
    const filters: {
      status?: AbsenceStatus;
      teamId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (query.status) {
      filters.status = query.status as AbsenceStatus;
    }

    if (query.teamId) {
      filters.teamId = query.teamId;
    }

    if (query.startDate) {
      const parsed = new Date(query.startDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid startDate value');
      }
      filters.startDate = parsed;
    }

    if (query.endDate) {
      const parsed = new Date(query.endDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid endDate value');
      }
      filters.endDate = parsed;
    }

    return filters;
  }
}
