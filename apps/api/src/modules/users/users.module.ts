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
import { UpdateUserThemeHandler } from './application/commands/update-user-theme.handler';
import { UpdateUserAvatarHandler } from './application/commands/update-user-avatar.handler';
import { DeactivateUserHandler } from './application/commands/deactivate-user.handler';
import { ListUsersHandler } from './application/queries/list-users.handler';
import { GetUserHandler } from './application/queries/get-user.handler';
import { GetUserAvatarHandler } from './application/queries/get-user-avatar.handler';
import { UserMapper } from './infrastructure/user.mapper';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository';
import { UsersController } from './infrastructure/users.controller';
import { FILE_STORAGE_PORT } from '../observations/domain/ports/file-storage.port';
import { LocalFileStorageService } from '../observations/infrastructure/local-file-storage.service';
import { FileValidationService } from '../observations/domain/services/file-validation.service';

const commandHandlers = [
  ActivateAccountHandler,
  CreateUserHandler,
  ResendActivationHandler,
  UpdateUserHandler,
  UpdateUserThemeHandler,
  UpdateUserAvatarHandler,
  DeactivateUserHandler,
];
const queryHandlers = [ListUsersHandler, GetUserHandler, GetUserAvatarHandler];

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
    {
      provide: FILE_STORAGE_PORT,
      useClass: LocalFileStorageService,
    },
    FileValidationService,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [USER_REPOSITORY_PORT, UserMapper],
})
export class UsersModule {}
