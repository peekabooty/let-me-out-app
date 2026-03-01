import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import path from 'node:path';

import { PrismaModule } from '../prisma/prisma.module';
import { ClockService, RequestIdMiddleware, RolesGuard } from '../common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { envValidationSchema } from '../config';
import { AuthModule } from './auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), '../../..', '.env'),
      validationSchema: envValidationSchema,
    }),
    AuthModule,
    PrismaModule,
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
