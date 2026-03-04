import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import path from 'node:path';

import { PrismaModule } from '../prisma/prisma.module';
import { ClockService, RequestIdMiddleware, RolesGuard } from '../common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { envValidationSchema } from '../config';
import { AuthModule } from './auth';
import { UsersModule } from './users/users.module';
import { AbsenceTypesModule } from './absence-types/absence-types.module';
import { AbsencesModule } from './absences/absences.module';
import { ObservationsModule } from './observations/observations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), '../..', '.env'),
      validationSchema: envValidationSchema,
    }),
    AuthModule,
    PrismaModule,
    UsersModule,
    AbsenceTypesModule,
    AbsencesModule,
    ObservationsModule,
    NotificationsModule,
    TeamsModule,
  ],
  providers: [
    ClockService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
