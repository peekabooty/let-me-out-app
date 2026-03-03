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
import { GetCalendarAbsencesHandler } from './application/queries/get-calendar-absences.handler';
import { GetDashboardHandler } from './application/queries/get-dashboard.handler';
import { AbsencesController } from './infrastructure/absences.controller';
import { DashboardController } from './infrastructure/dashboard.controller';

const commandHandlers = [CreateAbsenceHandler, ValidateAbsenceHandler, CancelAbsenceHandler];
const queryHandlers = [GetCalendarAbsencesHandler, GetDashboardHandler];

@Module({
  imports: [CqrsModule, PrismaModule, AbsenceTypesModule],
  controllers: [AbsencesController, DashboardController],
  providers: [
    ClockService,
    // Repository
    {
      provide: ABSENCE_REPOSITORY_PORT,
      useClass: AbsencePrismaRepository,
    },
    // Mapper
    AbsenceMapper,
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
  exports: [ABSENCE_REPOSITORY_PORT, DurationCalculatorService, AnnualLimitValidatorService],
})
export class AbsencesModule {}
