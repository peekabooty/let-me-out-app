import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ClockService, RequestIdMiddleware } from '../common';

@Module({
  imports: [PrismaModule],
  providers: [ClockService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
