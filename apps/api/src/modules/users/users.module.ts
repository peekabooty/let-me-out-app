import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { USER_REPOSITORY_PORT } from './domain/ports/user.repository.port';
import { UserMapper } from './infrastructure/user.mapper';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserMapper,
    {
      provide: USER_REPOSITORY_PORT,
      useClass: UserPrismaRepository,
    },
  ],
  exports: [USER_REPOSITORY_PORT, UserMapper],
})
export class UsersModule {}
