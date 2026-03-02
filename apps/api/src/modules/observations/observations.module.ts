import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ClockService } from '../../common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AbsencesModule } from '../absences/absences.module';
import { OBSERVATION_REPOSITORY_PORT } from './domain/ports/observation.repository.port';
import { ObservationPrismaRepository } from './infrastructure/observation.prisma.repository';
import { ObservationMapper } from './infrastructure/observation.mapper';
import { ObservationsController } from './infrastructure/observations.controller';
import { CreateObservationHandler } from './application/commands/create-observation.handler';
import { ListObservationsHandler } from './application/queries/list-observations.handler';

const commandHandlers = [CreateObservationHandler];
const queryHandlers = [ListObservationsHandler];

@Module({
  imports: [CqrsModule, PrismaModule, AbsencesModule],
  controllers: [ObservationsController],
  providers: [
    ClockService,
    // Repository
    {
      provide: OBSERVATION_REPOSITORY_PORT,
      useClass: ObservationPrismaRepository,
    },
    // Mapper
    ObservationMapper,
    // Handlers
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [OBSERVATION_REPOSITORY_PORT],
})
export class ObservationsModule {}
