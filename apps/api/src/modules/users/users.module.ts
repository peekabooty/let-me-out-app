import { forwardRef, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ClockService } from '../../common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { USER_REPOSITORY_PORT } from './domain/ports/user.repository.port';
import { ActivateAccountHandler } from './application/commands/activate-account.handler';
import { CreateUserHandler } from './application/commands/create-user.handler';
import { ResendActivationHandler } from './application/commands/resend-activation.handler';
import { UpdateUserHandler } from './application/commands/update-user.handler';
import { DeactivateUserHandler } from './application/commands/deactivate-user.handler';
import { ListUsersHandler } from './application/queries/list-users.handler';
import { GetUserHandler } from './application/queries/get-user.handler';
import { UserMapper } from './infrastructure/user.mapper';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository';
import { UsersController } from './infrastructure/users.controller';

const commandHandlers = [
  ActivateAccountHandler,
  CreateUserHandler,
  ResendActivationHandler,
  UpdateUserHandler,
  DeactivateUserHandler,
];
const queryHandlers = [ListUsersHandler, GetUserHandler];

@Module({
  imports: [CqrsModule, PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [UsersController],
  providers: [
    ClockService,
    UserMapper,
    {
      provide: USER_REPOSITORY_PORT,
      useClass: UserPrismaRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [USER_REPOSITORY_PORT, UserMapper],
})
export class UsersModule {}
