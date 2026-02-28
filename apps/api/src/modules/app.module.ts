import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ClockService } from '../common';

@Module({
  imports: [PrismaModule],
  providers: [ClockService],
})
export class AppModule {}
