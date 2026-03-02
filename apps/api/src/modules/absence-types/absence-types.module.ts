import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ClockService } from '../../common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ABSENCE_TYPE_REPOSITORY_PORT } from './domain/ports/absence-type.repository.port';
import { CreateAbsenceTypeHandler } from './application/commands/create-absence-type.handler';
import { UpdateAbsenceTypeHandler } from './application/commands/update-absence-type.handler';
import { DeactivateAbsenceTypeHandler } from './application/commands/deactivate-absence-type.handler';
import { ListAbsenceTypesHandler } from './application/queries/list-absence-types.handler';
import { GetAbsenceTypeHandler } from './application/queries/get-absence-type.handler';
import { AbsenceTypeMapper } from './infrastructure/absence-type.mapper';
import { AbsenceTypePrismaRepository } from './infrastructure/absence-type.prisma.repository';
import { AbsenceTypesController } from './infrastructure/absence-types.controller';

const commandHandlers = [
  CreateAbsenceTypeHandler,
  UpdateAbsenceTypeHandler,
  DeactivateAbsenceTypeHandler,
];
const queryHandlers = [ListAbsenceTypesHandler, GetAbsenceTypeHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [AbsenceTypesController],
  providers: [
    ClockService,
    AbsenceTypeMapper,
    {
      provide: ABSENCE_TYPE_REPOSITORY_PORT,
      useClass: AbsenceTypePrismaRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [ABSENCE_TYPE_REPOSITORY_PORT, AbsenceTypeMapper],
})
export class AbsenceTypesModule {}
