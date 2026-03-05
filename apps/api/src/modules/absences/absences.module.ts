import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ClockService } from '../../common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AbsenceTypesModule } from '../absence-types/absence-types.module';
import { ABSENCE_REPOSITORY_PORT } from './domain/ports/absence.repository.port';
import { AbsencePrismaRepository } from './infrastructure/absence.prisma.repository';
import { AbsenceMapper } from './infrastructure/absence.mapper';
import { DurationCalculatorService } from './domain/services/duration-calculator.service';
import { AnnualLimitValidatorService } from './domain/services/annual-limit-validator.service';
import { OverlapValidatorService } from './domain/services/overlap-validator.service';
import { AbsenceStateMachineService } from './domain/services/absence-state-machine.service';
import { CreateAbsenceHandler } from './application/commands/create-absence.handler';
import { ValidateAbsenceHandler } from './application/commands/validate-absence.handler';
import { CancelAbsenceHandler } from './application/commands/cancel-absence.handler';
import { ReconsiderAbsenceHandler } from './application/commands/reconsider-absence.handler';
import { DiscardAbsenceHandler } from './application/commands/discard-absence.handler';
import { GetCalendarAbsencesHandler } from './application/queries/get-calendar-absences.handler';
import { GetDashboardHandler } from './application/queries/get-dashboard.handler';
import { GetAuditAbsencesHandler } from './application/queries/get-audit-absences.handler';
import { GetAbsenceDetailHandler } from './application/queries/get-absence-detail.handler';
import { GetAbsenceStatusHistoryHandler } from './application/queries/get-absence-status-history.handler';
import { ListUserAbsencesHandler } from './application/queries/list-user-absences.handler';
import { ABSENCE_AUDIT_REPOSITORY_PORT } from './domain/ports/absence-audit.repository.port';
import { AbsencesController } from './infrastructure/absences.controller';
import { DashboardController } from './infrastructure/dashboard.controller';
import { AuditController } from './infrastructure/audit.controller';
import { AuditPrismaRepository } from './infrastructure/audit.prisma.repository';
import { AbsenceCsvExportService } from './application/services/absence-csv-export.service';

const commandHandlers = [
  CreateAbsenceHandler,
  ValidateAbsenceHandler,
  CancelAbsenceHandler,
  ReconsiderAbsenceHandler,
  DiscardAbsenceHandler,
];

const queryHandlers = [
  GetCalendarAbsencesHandler,
  GetDashboardHandler,
  GetAuditAbsencesHandler,
  GetAbsenceDetailHandler,
  GetAbsenceStatusHistoryHandler,
  ListUserAbsencesHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, AbsenceTypesModule],
  controllers: [AbsencesController, DashboardController, AuditController],
  providers: [
    ClockService,
    // Repository
    {
      provide: ABSENCE_REPOSITORY_PORT,
      useClass: AbsencePrismaRepository,
    },
    {
      provide: ABSENCE_AUDIT_REPOSITORY_PORT,
      useClass: AuditPrismaRepository,
    },
    // Mapper
    AbsenceMapper,
    AbsenceCsvExportService,
    // Domain services
    DurationCalculatorService,
    AnnualLimitValidatorService,
    OverlapValidatorService,
    AbsenceStateMachineService,
    // Command handlers
    ...commandHandlers,
    // Query handlers
    ...queryHandlers,
  ],
  exports: [
    ABSENCE_REPOSITORY_PORT,
    ABSENCE_AUDIT_REPOSITORY_PORT,
    DurationCalculatorService,
    AnnualLimitValidatorService,
  ],
})
export class AbsencesModule {}
